import fs from 'node:fs';
import { styleText } from 'node:util';
import type { Application, NextFunction, Response, Request } from 'express';

/**
 * Colored logger object for better console output visibility
 *
 * @type {Object}
 * @property {Function} info - Log an info message
 * @property {Function} warn - Log a warning message
 * @property {Function} error - Log an error message
 * @property {Function} success - Log a success message
 *
 * @returns {void}
 */
const logger = {
  /**
   *
   * Log an info message
   *
   * @param {string} message - The message to log
   * @param {any} data - Optional data to include in the log
   *
   * @returns {void}
   */
  info: (message: string, data?: any): void => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `${timestamp} ${styleText('cyan', '[expressTemplatesReload]')}`;
    data !== undefined
      ? process.stdout.write(`${prefix} ${message} ${data}\n`)
      : process.stdout.write(`${prefix} ${message}\n`);
  },

  /**
   *
   * Log a warning message
   *
   * @param {string} message - The message to log
   * @param {any} data - Optional data to include in the log
   *
   * @returns {void}
   */
  warn: (message: string, data?: any): void => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `${timestamp} ${styleText('yellow', '[expressTemplatesReload]')}`;
    data !== undefined
      ? process.stdout.write(`${prefix} ${message} ${data}\n`)
      : process.stdout.write(`${prefix} ${message}\n`);
  },

  /**
   *
   * Log an error message
   *
   * @param {string} message - The message to log
   * @param {any} data - Optional data to include in the log
   *
   * @returns {void}
   */
  error: (message: string, data?: any): void => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `${timestamp} ${styleText('red', '[expressTemplatesReload]')}`;
    data !== undefined
      ? process.stderr.write(`${prefix} ${message} ${data}\n`)
      : process.stderr.write(`${prefix} ${message}\n`);
  },

  /**
   *
   * Log a success message
   *
   * @param {string} message - The message to log
   * @param {any} data - Optional data to include in the log
   *
   * @returns {void}
   */
  success: (message: string, data?: any): void => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `${timestamp} ${styleText('green', '[expressTemplatesReload]')}`;
    data !== undefined
      ? process.stdout.write(`${prefix} ${message} ${data}\n`)
      : process.stdout.write(`${prefix} ${message}\n`);
  },
};

/**
 * Enables automatic browser reload for template and public asset changes in an Express app.
 *
 * @param {Object} config - Configuration options.
 * @param {Application} config.app - The Express app instance.
 * @param {Array<Object>} config.watch - An array of files or directories to watch for changes.
 * @param {string} config.watch[].path - Path to the file or directory to watch.
 * @param {Array<string>} [config.watch[].extensions] - Extensions to monitor for changes when watching a directory.
 * @param {Object} [config.options] - Optional configuration for the watcher.
 * @param {boolean} [config.options.quiet=false] - Suppress logs if set to true.
 *
 * @returns {void}
 */
export function expressTemplatesReload({
  app,
  watch,
  options = {},
}: {
  app: Application;
  watch: { path: string; extensions?: string[] }[];
  options?: { quiet?: boolean };
}): void {
  if (process.env.NODE_ENV === 'production') return;

  const quiet = options.quiet || false;
  const sseClients = new Set<Response>();

  function notifyClients(changedFile?: string) {
    if (sseClients.size > 0) {
      if (!quiet) {
        logger.info(`Reloading browser (${changedFile || 'file changed'})`);
      }

      sseClients.forEach((client) => {
        try {
          client.write('data: reload\n\n');
        } catch {
          sseClients.delete(client);
        }
      });
    }
  }

  watch.forEach(({ path: watchPath, extensions }) => {
    const isDirectory = fs.statSync(watchPath).isDirectory();

    if (isDirectory && !extensions) {
      throw new Error(
        `Extensions must be provided for directory: ${watchPath}`,
      );
    }

    const shouldProcessFile = (filename: string): boolean => {
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

    try {
      const watcher = fs.watch(
        watchPath,
        { recursive: isDirectory },
        (eventType, filename) => {
          if (!filename || !shouldProcessFile(filename)) {
            return;
          }

          if (!quiet) {
            logger.info(`File ${eventType}: ${filename}`);
          }

          notifyClients(filename);
        },
      );

      watcher.on('error', (error) => {
        if (!quiet) {
          logger.error(`Watcher error for ${watchPath}: ${error.message}`);
        }
      });
    } catch (error) {
      if (!quiet) {
        logger.error(
          `Error watching path: ${watchPath} - ${(error as Error).message}`,
        );
      }
    }
  });

  app.get('/express-templates-reload', (req: Request, res: Response) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    res.write('data: connected\n\n');
    sseClients.add(res);

    if (!quiet) {
      logger.info('Browser connected for auto-reload');
    }

    req.on('close', () => {
      sseClients.delete(res);
    });

    req.on('error', () => {
      sseClients.delete(res);
    });
  });

  const clientScript = `
    <script>
        (function() {
            let source = null;
            let reconnectAttempts = 0;
            const MAX_RECONNECT_ATTEMPTS = 3;

            function connect() {
                if (source) source.close();

                if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                    console.log('[express-templates-reload] Max reconnection attempts reached. Stopping auto-reload.');
                    return;
                }

                source = new EventSource('/express-templates-reload');
                console.log('[express-templates-reload] Browser connected for auto-reload');

                source.onmessage = function(event) {
                    if (event.data === 'reload') {
                        console.log('[express-templates-reload] Reloading browser');
                        location.reload();
                    }
                };

                source.onerror = function() {
                    console.log('[express-templates-reload] Connection lost, reconnecting... (attempt ' + (reconnectAttempts + 1) + ' of ' + MAX_RECONNECT_ATTEMPTS + ')');
                    reconnectAttempts++;
                    setTimeout(connect, 1000);
                };

                source.onopen = function() {
                    reconnectAttempts = 0;
                };
            }

            connect();

            window.addEventListener('beforeunload', function() {
                if (source) source.close();
            });
        })();
    </script>\n\t`;

  app.use((_req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send.bind(res);

    res.send = function (body: string): Response {
      if (typeof body === 'string' && body.includes('</head>')) {
        body = body.replace('</head>', clientScript + '</head>');
      }
      return originalSend(body);
    };

    next();
  });
}
