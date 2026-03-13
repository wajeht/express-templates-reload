import fs from 'node:fs';
import type { IncomingMessage, Server as HttpServer } from 'node:http';
import type { Server as HttpsServer } from 'node:https';
import type { Duplex } from 'node:stream';
import type { Application, Response } from 'express';
import WebSocket, { WebSocketServer } from 'ws';
import { createClientScript, injectClientScript } from './client-script.js';
import { logger } from './logger.js';

type WatchConfig = { path: string; extensions?: string[] };

export type ExpressTemplatesReloadOptions = {
  quiet?: boolean;
  clientQuiet?: boolean;
};

export type ExpressTemplatesReloadHandle = {
  dispose(): void;
};

type UpgradeServer = HttpServer | HttpsServer;
type UpgradeListener = (
  req: IncomingMessage,
  socket: Duplex,
  head: Buffer,
) => void;
type ResponseSend = (this: Response, body?: any) => Response;
type AppWithResponse = Application & { response: { send: ResponseSend } };

type ReloadState = ExpressTemplatesReloadHandle & {
  quiet: boolean;
  clientQuiet: boolean;
  clientScript: string;
  disposed: boolean;
  wsClients: Set<WebSocket>;
  wsServer: WebSocketServer;
  watchedKeys: Set<string>;
  watchers: fs.FSWatcher[];
  upgradeHandlers: Map<UpgradeServer, UpgradeListener>;
  originalListen?: Application['listen'];
  patchedListen?: Application['listen'];
  originalResponseSend: ResponseSend;
  patchedResponseSend: ResponseSend;
  attachServer(server: UpgradeServer): void;
  registerWatches(watch: WatchConfig[]): void;
  refreshClientScript(): void;
};

const APP_STATES = new WeakMap<Application, ReloadState>();
const NOOP_HANDLE: ExpressTemplatesReloadHandle = { dispose() {} };
const RELOAD_PATH = '/express-templates-reload';

function createWatchKey({ path: watchPath, extensions }: WatchConfig): string {
  return `${watchPath}::${(extensions || []).join(',')}`;
}

function updateStateOptions(
  state: ReloadState,
  options: ExpressTemplatesReloadOptions,
): void {
  if (options.quiet !== undefined) {
    state.quiet = options.quiet;
  }

  if (options.clientQuiet !== undefined) {
    state.clientQuiet = options.clientQuiet;
  } else if (options.quiet !== undefined) {
    state.clientQuiet = options.quiet;
  }

  state.refreshClientScript();
}

function createFileMatcher(isDirectory: boolean, extensions?: string[]) {
  return (filename: string): boolean => {
    if (!filename) return false;
    if (!isDirectory) return true;
    if (!extensions) return false;

    if (
      filename.startsWith('.') ||
      filename.includes('~') ||
      filename.includes('.tmp') ||
      filename.includes('node_modules')
    ) {
      return false;
    }

    return extensions.some((ext) => filename.endsWith(ext));
  };
}

function removeClient(state: ReloadState, client: WebSocket): void {
  state.wsClients.delete(client);
}

function notifyClients(state: ReloadState, changedFile: string): void {
  if (!state.quiet && state.wsClients.size > 0) {
    logger.info(`Reloading browser (${changedFile})`);
  }

  state.wsClients.forEach((client) => {
    try {
      if (client.readyState !== WebSocket.OPEN) {
        removeClient(state, client);
        return;
      }

      client.send('reload');
    } catch {
      removeClient(state, client);
    }
  });
}

function closeQuietly(
  closeable: { close(): void } | { close(): unknown },
): void {
  try {
    closeable.close();
  } catch {}
}

function createReloadState(app: Application): ReloadState {
  const appWithResponse = app as AppWithResponse;
  const wsClients = new Set<WebSocket>();
  const wsServer = new WebSocketServer({ noServer: true });
  const watchedKeys = new Set<string>();
  const watchers: fs.FSWatcher[] = [];
  const upgradeHandlers = new Map<UpgradeServer, UpgradeListener>();
  const originalResponseSend = appWithResponse.response.send;

  const state: ReloadState = {
    quiet: false,
    clientQuiet: false,
    clientScript: '',
    disposed: false,
    wsClients,
    wsServer,
    watchedKeys,
    watchers,
    upgradeHandlers,
    originalListen: undefined,
    patchedListen: undefined,
    originalResponseSend,
    patchedResponseSend(this: Response, body?: any): Response {
      if (state.disposed || typeof body !== 'string') {
        return state.originalResponseSend.call(this, body);
      }

      return state.originalResponseSend.call(
        this,
        injectClientScript(body, state.clientScript),
      );
    },
    refreshClientScript(): void {
      state.clientScript = createClientScript(RELOAD_PATH, state.clientQuiet);
    },
    attachServer(targetServer: UpgradeServer): void {
      if (state.disposed || state.upgradeHandlers.has(targetServer)) {
        return;
      }

      const upgradeListener: UpgradeListener = (req, socket, head) => {
        if (state.disposed) {
          socket.destroy();
          return;
        }

        if ((req.url || '').split('?')[0] !== RELOAD_PATH) {
          return;
        }

        state.wsServer.handleUpgrade(req, socket, head, (client) => {
          state.wsClients.add(client);
          client.send('connected');

          if (!state.quiet) {
            logger.info('Browser connected for auto-reload');
          }

          client.on('close', () => removeClient(state, client));
          client.on('error', () => removeClient(state, client));
        });
      };

      state.upgradeHandlers.set(targetServer, upgradeListener);
      targetServer.on('upgrade', upgradeListener);
    },
    registerWatches(watch: WatchConfig[]): void {
      watch.forEach(({ path: watchPath, extensions }) => {
        const watchKey = createWatchKey({ path: watchPath, extensions });
        if (state.watchedKeys.has(watchKey)) {
          return;
        }

        const isDirectory = fs.statSync(watchPath).isDirectory();

        if (isDirectory && !extensions) {
          throw new Error(
            `Extensions must be provided for directory: ${watchPath}`,
          );
        }

        const shouldProcessFile = createFileMatcher(isDirectory, extensions);

        try {
          const watcher = fs.watch(
            watchPath,
            { recursive: isDirectory },
            (eventType, filename) => {
              if (!filename || !shouldProcessFile(filename)) {
                return;
              }

              if (!state.quiet) {
                logger.info(`File ${eventType}: ${filename}`);
              }

              notifyClients(state, filename);
            },
          );

          watcher.on('error', (error) => {
            if (!state.quiet) {
              logger.error(`Watcher error for ${watchPath}: ${error.message}`);
            }
          });

          state.watchedKeys.add(watchKey);
          state.watchers.push(watcher);
        } catch (error) {
          if (!state.quiet) {
            logger.error(
              `Error watching path: ${watchPath} - ${(error as Error).message}`,
            );
          }
        }
      });
    },
    dispose(): void {
      if (state.disposed) {
        return;
      }

      state.disposed = true;

      state.watchers.forEach((watcher) => {
        closeQuietly(watcher);
      });
      state.watchers.length = 0;
      state.watchedKeys.clear();

      state.wsClients.forEach((client) => {
        closeQuietly(client);
      });
      state.wsClients.clear();

      closeQuietly(state.wsServer);

      state.upgradeHandlers.forEach((listener, targetServer) => {
        targetServer.off('upgrade', listener);
      });
      state.upgradeHandlers.clear();

      if (state.patchedListen && app.listen === state.patchedListen) {
        app.listen = state.originalListen as Application['listen'];
      }

      if (appWithResponse.response.send === state.patchedResponseSend) {
        appWithResponse.response.send = state.originalResponseSend;
      }

      APP_STATES.delete(app);
    },
  };

  state.refreshClientScript();
  appWithResponse.response.send = state.patchedResponseSend;

  return state;
}

/**
 * Enables automatic browser reload for template and public asset changes in an
 * Express app and returns a handle for tearing it down.
 */
export function expressTemplatesReload({
  app,
  server,
  watch,
  options = {},
}: {
  app: Application;
  server?: HttpServer | HttpsServer;
  watch: WatchConfig[];
  options?: ExpressTemplatesReloadOptions;
}): ExpressTemplatesReloadHandle {
  if (process.env.NODE_ENV === 'production') return NOOP_HANDLE;

  const state = APP_STATES.get(app) || createReloadState(app);
  APP_STATES.set(app, state);

  updateStateOptions(state, options);

  if (!state.originalListen) {
    state.originalListen = app.listen.bind(app);
    state.patchedListen = ((...args: any[]) => {
      const startedServer = state.originalListen!.apply(app, args as any);
      state.attachServer(startedServer);
      return startedServer;
    }) as Application['listen'];

    app.listen = state.patchedListen;
  }

  if (server) {
    state.attachServer(server);
  }

  state.registerWatches(watch);

  return state;
}
