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
 * @param {number} [config.options.pollInterval=50] - Interval in milliseconds to poll for file changes.
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
  options?: { pollInterval?: number; quiet?: boolean };
}): void {
  if (process.env.NODE_ENV === 'production') return;

  const pollInterval = options.pollInterval || 50;
  const quiet = options.quiet || false;
  let changeDetected = false;
  const lastContents = new Map<string, string>();

  watch.forEach(({ path: watchPath, extensions }) => {
    const isDirectory = fs.statSync(watchPath).isDirectory();

    if (isDirectory && !extensions) {
      throw new Error(
        `Extensions must be provided for directory: ${watchPath}`,
      );
    }

    fs.watch(
      watchPath,
      { recursive: isDirectory },
      (_: fs.WatchEventType, filename: string | null) => {
        if (!filename) return;

        const fullPath = isDirectory
          ? path.join(watchPath, filename)
          : watchPath;

        // Only check extensions for directories
        if (
          isDirectory &&
          extensions &&
          !extensions.some((ext) => filename.endsWith(ext))
        ) {
          return;
        }

        try {
          const content = fs.readFileSync(fullPath, 'utf8');

          if (content !== lastContents.get(fullPath)) {
            lastContents.set(fullPath, content);

            if (!quiet)
              console.info(
                '[expressTempaltesReload]: File changed: %s',
                filename,
              );
            changeDetected = true;
          }
        } catch {
          if (!quiet)
            console.error(
              '[expressTempaltesReload]: Error reading file: %s',
              filename,
            );
        }
      },
    );
  });

  app.get('/express-templates-reload', (req: Request, res: Response) => {
    const timer = setInterval(() => {
      if (changeDetected) {
        changeDetected = false;
        clearInterval(timer);
        res.send();
      }
    }, pollInterval);

    req.on('close', () => clearInterval(timer));
  });

  const clientScript = `
	<script>
		(async function poll() {
			try {
				await fetch('/express-templates-reload');
				location.reload();
			} catch {
				location.reload();
			}
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
