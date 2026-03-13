import fs from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import type { Server as HttpServer } from 'node:http';
import express from 'express';
import request from 'supertest';
import WebSocket, { WebSocketServer } from 'ws';
import {
  describe,
  expect,
  it,
  vi,
  beforeEach,
  afterEach,
} from 'vite-plus/test';
import { CLIENT_MARKER } from './client-script.js';
import {
  expressTemplatesReload,
  type ExpressTemplatesReloadHandle,
} from './express-templates-reload.js';

type AppWithResponse = express.Application & {
  response: { send: typeof express.response.send };
};

function createMockServer(): HttpServer {
  return new EventEmitter() as HttpServer;
}

function createMockClient() {
  const client = new EventEmitter() as EventEmitter & {
    readyState: number;
    send: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  };

  client.readyState = WebSocket.OPEN;
  client.send = vi.fn();
  client.close = vi.fn(() => {
    client.emit('close');
  });

  return client;
}

function createMockWatcher() {
  return {
    on: vi.fn(),
    close: vi.fn(),
  } as any;
}

function setupFileWatchMocks(
  options: {
    isDirectory?: boolean;
    watcher?: ReturnType<typeof createMockWatcher>;
    implementation?: (...args: any[]) => any;
  } = {},
) {
  const {
    isDirectory = false,
    watcher = createMockWatcher(),
    implementation,
  } = options;
  const statSpy = vi.spyOn(fs, 'statSync');
  const watchSpy = vi.spyOn(fs, 'watch');

  statSpy.mockReturnValue({ isDirectory: () => isDirectory } as fs.Stats);

  if (implementation) {
    watchSpy.mockImplementation(implementation as any);
  } else {
    watchSpy.mockReturnValue(watcher);
  }

  return { statSpy, watchSpy, watcher };
}

function installUpgradeMock(fakeClient = createMockClient()) {
  const handleUpgradeSpy = vi
    .spyOn(WebSocketServer.prototype, 'handleUpgrade')
    .mockImplementation((_req, _socket, _head, callback) => {
      callback(fakeClient as any, {} as any);
    });

  return { fakeClient, handleUpgradeSpy };
}

function emitUpgrade(fakeServer: HttpServer): void {
  fakeServer.emit(
    'upgrade',
    {
      url: '/express-templates-reload',
    },
    {} as any,
    Buffer.alloc(0),
  );
}

function mountHtmlRoute(
  app: express.Application,
  html: string,
  routePath = '/test',
): void {
  app.get(routePath, (_req, res) => {
    res.send(html);
  });
}

async function requestOk(app: express.Application, routePath = '/test') {
  return await request(app).get(routePath).expect(200);
}

async function listenForTest(server: http.Server): Promise<boolean> {
  return await new Promise<boolean>((resolve, reject) => {
    const onError = (error: NodeJS.ErrnoException) => {
      server.off('listening', onListening);
      if (error.code === 'EPERM' || error.code === 'EACCES') {
        resolve(false);
        return;
      }

      reject(error);
    };

    const onListening = () => {
      server.off('error', onError);
      resolve(true);
    };

    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(0, '127.0.0.1');
  });
}

async function closeServer(server: http.Server): Promise<void> {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
}

describe('expressTemplatesReload', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return a noop handle in production environment', () => {
    process.env.NODE_ENV = 'production';

    const handle = expressTemplatesReload({ app, watch: [{ path: './test' }] });

    expect(handle).toBeDefined();
    expect(() => handle.dispose()).not.toThrow();
  });

  it('should be idempotent for the same app', async () => {
    const { watchSpy } = setupFileWatchMocks();

    const firstHandle = expressTemplatesReload({
      app,
      watch: [{ path: './test.txt' }],
      options: { quiet: true },
    });
    const secondHandle = expressTemplatesReload({
      app,
      watch: [{ path: './test.txt' }],
      options: { quiet: true },
    });

    mountHtmlRoute(app, '<html><head></head><body>Test</body></html>');
    const response = await requestOk(app);

    expect(firstHandle).toBe(secondHandle);
    expect(watchSpy).toHaveBeenCalledTimes(1);
    expect(
      response.text.match(/data-express-templates-reload/g)?.length || 0,
    ).toBe(1);
  });

  it('should attach WebSocket upgrade handling when using app.listen', () => {
    setupFileWatchMocks();
    const fakeServer = createMockServer();
    const originalListen = vi.fn(() => fakeServer);
    const { fakeClient, handleUpgradeSpy } = installUpgradeMock();
    app.listen = originalListen as any;

    expressTemplatesReload({
      app,
      watch: [{ path: './test.txt' }],
      options: { quiet: true },
    });

    const returnedServer = app.listen();

    emitUpgrade(fakeServer);

    expect(returnedServer).toBe(fakeServer);
    expect(originalListen).toHaveBeenCalled();
    expect(handleUpgradeSpy).toHaveBeenCalledTimes(1);
    expect(fakeClient.send).toHaveBeenCalledWith('connected');
  });

  it('should attach WebSocket upgrade handling to a provided server', () => {
    setupFileWatchMocks();
    const fakeServer = createMockServer();
    const { fakeClient, handleUpgradeSpy } = installUpgradeMock();

    expressTemplatesReload({
      app,
      server: fakeServer,
      watch: [{ path: './test.txt' }],
      options: { quiet: true },
    });

    emitUpgrade(fakeServer);

    expect(handleUpgradeSpy).toHaveBeenCalledTimes(1);
    expect(fakeClient.send).toHaveBeenCalledWith('connected');
  });

  it('should send reload messages to connected WebSocket clients', () => {
    const fakeServer = createMockServer();
    let watchCallback:
      | ((eventType: string, filename: string) => void)
      | undefined;

    const { fakeClient, handleUpgradeSpy } = installUpgradeMock();
    setupFileWatchMocks({
      implementation: (
        _path: fs.PathLike,
        optionsOrListener: fs.WatchOptions | fs.WatchListener<string>,
        callback?: fs.WatchListener<string>,
      ) => {
        const resolvedCallback =
          typeof optionsOrListener === 'function'
            ? optionsOrListener
            : callback;
        watchCallback = resolvedCallback as
          | ((eventType: string, filename: string) => void)
          | undefined;
        return createMockWatcher();
      },
    });

    expressTemplatesReload({
      app,
      server: fakeServer,
      watch: [{ path: './test.txt' }],
      options: { quiet: true },
    });

    emitUpgrade(fakeServer);

    expect(handleUpgradeSpy).toHaveBeenCalledTimes(1);
    expect(watchCallback).toBeDefined();

    watchCallback!('change', 'test.txt');

    expect(fakeClient.send).toHaveBeenNthCalledWith(1, 'connected');
    expect(fakeClient.send).toHaveBeenNthCalledWith(2, 'reload');
  });

  it('should inject client script into HTML responses with case-insensitive head matching', async () => {
    setupFileWatchMocks();

    expressTemplatesReload({ app, watch: [{ path: './test.txt' }] });
    mountHtmlRoute(app, '<HTML><HEAD></HEAD><BODY>Test</BODY></HTML>');
    const response = await requestOk(app);

    expect(response.text).toContain('new WebSocket(');
    expect(response.text).toContain(CLIENT_MARKER);
  });

  it('should inject before body when head is missing', async () => {
    setupFileWatchMocks();

    expressTemplatesReload({ app, watch: [{ path: './test.txt' }] });
    mountHtmlRoute(app, '<html><body>Test</body></html>');
    const response = await requestOk(app);

    expect(response.text).toContain('new WebSocket(');
    expect(response.text.indexOf(CLIENT_MARKER)).toBeLessThan(
      response.text.indexOf('</body>'),
    );
  });

  it('should not inject script into non-HTML responses', async () => {
    setupFileWatchMocks();

    expressTemplatesReload({ app, watch: [{ path: './test.txt' }] });

    app.get('/api', (_req, res) => {
      res.json({ message: 'API response' });
    });

    const response = await request(app).get('/api').expect(200);

    expect(response.text).not.toContain('WebSocket');
    expect(response.text).not.toContain('<script');
  });

  it('should suppress client logs when quiet is enabled', async () => {
    setupFileWatchMocks();

    expressTemplatesReload({
      app,
      watch: [{ path: './test.txt' }],
      options: { quiet: true },
    });

    mountHtmlRoute(app, '<html><head></head><body>Test</body></html>');
    const response = await requestOk(app);

    expect(response.text).toContain('const quiet = true;');
  });

  it('should allow client logs to be enabled separately from server quiet mode', async () => {
    setupFileWatchMocks();

    expressTemplatesReload({
      app,
      watch: [{ path: './test.txt' }],
      options: { quiet: true, clientQuiet: false },
    });

    mountHtmlRoute(app, '<html><head></head><body>Test</body></html>');
    const response = await requestOk(app);

    expect(response.text).toContain('const quiet = false;');
  });

  it('should throw error when watching directory without extensions', () => {
    setupFileWatchMocks({ isDirectory: true });

    expect(() => {
      expressTemplatesReload({ app, watch: [{ path: './views' }] });
    }).toThrow('Extensions must be provided for directory: ./views');
  });

  it('should dispose watchers and restore app methods', async () => {
    const watcher = createMockWatcher();
    const wsServerCloseSpy = vi
      .spyOn(WebSocketServer.prototype, 'close')
      .mockImplementation(function (this: WebSocketServer) {
        return this;
      });
    const originalSend = (app as AppWithResponse).response.send;

    setupFileWatchMocks({ watcher });

    const handle = expressTemplatesReload({
      app,
      watch: [{ path: './test.txt' }],
      options: { quiet: true },
    });

    mountHtmlRoute(app, '<html><head></head><body>Test</body></html>');

    const beforeDispose = await requestOk(app);
    handle.dispose();
    const afterDispose = await requestOk(app);

    expect(beforeDispose.text).toContain(CLIENT_MARKER);
    expect(afterDispose.text).not.toContain(CLIENT_MARKER);
    expect(watcher.close).toHaveBeenCalledTimes(1);
    expect(wsServerCloseSpy).toHaveBeenCalledTimes(1);
    expect(typeof app.listen).toBe('function');
    expect((app as AppWithResponse).response.send).toBe(originalSend);
    expect(() => handle.dispose()).not.toThrow();
  });

  it('should establish a real WebSocket connection and send reload when sockets are available', async () => {
    const tmpFile = path.join(
      os.tmpdir(),
      `express-templates-reload-${Date.now()}-${Math.random()}.txt`,
    );
    fs.writeFileSync(tmpFile, 'before');

    const server = http.createServer(app);
    let handle: ExpressTemplatesReloadHandle | undefined;

    try {
      handle = expressTemplatesReload({
        app,
        server,
        watch: [{ path: tmpFile }],
        options: { quiet: true },
      });

      const didListen = await listenForTest(server);
      if (!didListen) {
        return;
      }

      const port = (server.address() as AddressInfo).port;
      const messages = await new Promise<string[]>((resolve, reject) => {
        const socket = new WebSocket(
          `ws://127.0.0.1:${port}/express-templates-reload`,
        );
        const seen: string[] = [];
        const timeout = setTimeout(() => {
          socket.terminate();
          reject(new Error('Timed out waiting for WebSocket reload'));
        }, 5_000);

        socket.on('message', (data) => {
          const message = String(data as unknown);
          seen.push(message);

          if (message === 'connected') {
            fs.writeFileSync(tmpFile, `after-${Date.now()}`);
            return;
          }

          if (message === 'reload') {
            clearTimeout(timeout);
            socket.close();
            resolve(seen);
          }
        });

        socket.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      expect(messages).toEqual(expect.arrayContaining(['connected', 'reload']));
    } finally {
      handle?.dispose();
      if (server.listening) {
        await closeServer(server);
      }
      fs.rmSync(tmpFile, { force: true });
    }
  });
});
