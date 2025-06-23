import fs from 'node:fs';
import path from 'node:path';
import type { Application, NextFunction, Response, Request } from 'express';

/**
 *
 * ANSI color codes for terminal output
 *
 */
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
} as const;

/**
 *
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
    const prefix = `${colors.dim}${timestamp}${colors.reset} ${colors.cyan}${colors.bright}[expressTemplatesReload]${colors.reset}`;
    data !== undefined
      ? console.info(`${prefix}: ${message}`, data)
      : console.info(`${prefix}: ${message}`);
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
    const prefix = `${colors.dim}${timestamp}${colors.reset} ${colors.yellow}${colors.bright}[expressTemplatesReload]${colors.reset}`;
    data !== undefined
      ? console.warn(`${prefix}: ${message}`, data)
      : console.warn(`${prefix}: ${message}`);
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
    const prefix = `${colors.dim}${timestamp}${colors.reset} ${colors.red}${colors.bright}[expressTemplatesReload]${colors.reset}`;
    data !== undefined
      ? console.error(`${prefix}: ${message}`, data)
      : console.error(`${prefix}: ${message}`);
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
    const prefix = `${colors.dim}${timestamp}${colors.reset} ${colors.green}${colors.bright}[expressTemplatesReload]${colors.reset}`;
    data !== undefined
      ? console.log(`${prefix}: ${message}`, data)
      : console.log(`${prefix}: ${message}`);
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

  watch.forEach(async ({ path: watchPath, extensions }) => {
    const isDirectory = fs.statSync(watchPath).isDirectory();

    if (isDirectory && !extensions) {
      throw new Error(
        `[expressTemplatesReload]: Extensions must be provided for directory: ${watchPath}`,
      );
    }

    try {
      const watcher = fs.promises.watch(watchPath, { recursive: isDirectory });

      for await (const event of watcher) {
        if (!event.filename) continue;

        const fullPath = isDirectory
          ? path.join(watchPath, event.filename)
          : watchPath;

        // Only check extensions for directories
        if (
          isDirectory &&
          extensions &&
          !extensions.some((ext) => event.filename!.endsWith(ext))
        ) {
          continue;
        }

        try {
          // Check if file exists (it might be deleted)
          await fs.promises.access(fullPath);

          if (!quiet) logger.info('File changed: %s', event.filename);
          notifyClients();
        } catch {
          // File might be deleted or temporarily unavailable
          if (!quiet) logger.info('File deleted: %s', event.filename);
          notifyClients();
        }
      }
    } catch (error) {
      if (!quiet) logger.error('Error watching path: %s', watchPath);
    }
  });

  const sseClients = new Set<Response>();

  app.get('/express-templates-reload', (req: Request, res: Response) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // Send initial connection event
    res.write('data: connected\n\n');

    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  function notifyClients() {
    sseClients.forEach((client) => {
      try {
        client.write('data: reload\n\n');
      } catch {
        sseClients.delete(client);
      }
    });
  }

  const clientScript = `
	<script>
		(function() {
			function connect() {
				const eventSource = new EventSource('/express-templates-reload');

				eventSource.onmessage = function(event) {
					if (event.data === 'reload') {
						location.reload();
					}
				};

				eventSource.onerror = function() {
					console.log('[express-templates-reload] Connection lost, reconnecting...');
					eventSource.close();
					setTimeout(connect, 1000);
				};
			}
			connect();
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
