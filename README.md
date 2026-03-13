# express-templates-reload

[![Node.js CI](https://github.com/wajeht/express-templates-reload/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/wajeht/express-templates-reload/actions/workflows/ci.yml)
![npm](https://img.shields.io/npm/dw/%40wajeht%2Fexpress-templates-reload)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/wajeht/type/blob/main/LICENSE) [![Open Source Love svg1](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://github.com/wajeht/express-templates-reload)
[![npm](https://img.shields.io/npm/v/%40wajeht%2Fexpress-templates-reload)](https://www.npmjs.com/package/@wajeht/express-templates-reload)

automatically reload the browser for template and public asset changes in an express app using **WebSockets** for instant reloads

## 🛠️ Installation

```bash
$ npm install @wajeht/express-templates-reload --save-dev
```

## Usage

### `app.listen()` apps

```ts
import express from 'express';
import { expressTemplatesReload } from '@wajeht/express-templates-reload';

const app = express();

// Must be placed before any other routes
if (process.env.NODE_ENV === 'development') {
  const reload = expressTemplatesReload({
    app,
    watch: [
      // Watch a specific file
      { path: './public/style.css' },
      { path: './public/script.js' },

      // Watch a directory with specific extensions
      {
        path: './views',
        extensions: ['.ejs', '.html'],
      },
    ],

    // Optional
    options: {
      quiet: true, // Suppress server and browser console logs
    },
  });

  process.on('SIGTERM', () => reload.dispose());
}

app.get('/', (req, res) => res.send('Hello, world!'));

app.listen(80, () => console.log('App is listening on http://localhost'));
```

### Custom `http.createServer(app)` apps

If you create the HTTP server yourself, pass it in so the WebSocket upgrade handler can attach to that server:

```ts
import http from 'node:http';
import express from 'express';
import { expressTemplatesReload } from '@wajeht/express-templates-reload';

const app = express();
const server = http.createServer(app);

expressTemplatesReload({
  app,
  server,
  watch: [{ path: './views', extensions: ['.html'] }],
});

server.listen(80);
```

### Dynamic import in an app factory

This pattern works too. If the app later starts with `app.listen(...)`, passing `app` is enough. If it later starts with a custom server, pass `server` at that point instead.

```ts
import path from 'node:path';
import express from 'express';

export async function createApp() {
  const app = express();

  if (process.env.NODE_ENV === 'development') {
    try {
      const { expressTemplatesReload } =
        await import('@wajeht/express-templates-reload');

      expressTemplatesReload({
        app,
        watch: [
          {
            path: path.join(process.cwd(), 'src/public'),
            extensions: ['.css', '.js'],
          },
          {
            path: path.join(process.cwd(), 'src/routes'),
            extensions: ['.html'],
          },
        ],
        options: { quiet: true },
      });
    } catch (error) {
      console.warn('Express templates reload could not be initialized', error);
    }
  }

  return app;
}
```

## API Reference

### expressTemplatesReload(config)

Returns an `ExpressTemplatesReloadHandle` with a `dispose()` method for closing watchers, WebSocket state, and restoring patched app methods.

#### Config Options

| Parameter             | Type          | Description                                         |
| --------------------- | ------------- | --------------------------------------------------- |
| `app`                 | `Application` | Express application instance                        |
| `server`              | `Server`      | Optional HTTP/HTTPS server for custom server setups |
| `watch`               | `Array`       | Array of paths to watch                             |
| `watch[].path`        | `string`      | File or directory path to watch                     |
| `watch[].extensions`  | `string[]`    | File extensions to watch (required for directories) |
| `options.quiet`       | `boolean`     | Suppress server logs and browser logs by default    |
| `options.clientQuiet` | `boolean`     | Override browser console logging behavior           |

`watch[].path` is resolved from the current process working directory. If your app can start from different directories, prefer absolute paths.

## Docs

- See [DEVELOPMENT](./docs/development.md) for `development` guide.
- See [CONTRIBUTION](./docs/contribution.md) for `contribution` guide.

## License

Distributed under the MIT License © [wajeht](https://github.com/wajeht). See [LICENSE](./LICENSE) for more information.
