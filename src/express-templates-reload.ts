import path from 'node:path';
import fs from 'node:fs';
import type { Application, NextFunction, Response, Request } from 'express';

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
        `Extensions must be provided for directory: ${watchPath}`,
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

          if (!quiet)
            console.info(
              '[expressTemplatesReload]: File changed: %s',
              event.filename,
            );
          notifyClients();
        } catch {
          // File might be deleted or temporarily unavailable
          if (!quiet)
            console.info(
              '[expressTemplatesReload]: File deleted: %s',
              event.filename,
            );
          notifyClients();
        }
      }
    } catch (error) {
      if (!quiet)
        console.error(
          '[expressTemplatesReload]: Error watching path: %s',
          watchPath,
        );
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

  // Function to notify all clients
  const notifyClients = () => {
    sseClients.forEach((client) => {
      try {
        client.write('data: reload\n\n');
      } catch {
        sseClients.delete(client);
      }
    });
  };

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
