# 🔄 express-templates-reload

[![Node.js CI](https://github.com/wajeht/express-templates-reload/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/wajeht/express-templates-reload/actions/workflows/ci.yml)
![npm](https://img.shields.io/npm/dw/%40wajeht%2Fexpress-templates-reload)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/wajeht/type/blob/main/LICENSE) [![Open Source Love svg1](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://github.com/wajeht/express-templates-reload)
[![npm](https://img.shields.io/npm/v/%40wajeht%2Fexpress-templates-reload)](https://www.npmjs.com/package/@wajeht/express-templates-reload)

automatically reload the browser for template and public asset changes in an express app using **Server-Sent Events** and **Node.js streams** for instant, efficient reloads

## 🛠️ Installation

```bash
$ npm install @wajeht/express-templates-reload --save-dev
```

## 💻 Usage

```ts
import express from 'express';
import { expressTemplatesReload } from '@wajeht/express-templates-reload';

const app = express();

// Must be placed before any other routes
if (process.env.NODE_ENV === 'development') {
  expressTemplatesReload({
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
      quiet: true, // Suppress console logs
    },
  });
}

app.get('/', (req, res) => res.send('Hello, world!'));

app.listen(80, () => console.log('App is listening on http://localhost'));
```

## 🛠️ API Reference

### expressTemplatesReload(config)

#### Config Options

| Parameter            | Type          | Description                                         |
| -------------------- | ------------- | --------------------------------------------------- |
| `app`                | `Application` | Express application instance                        |
| `watch`              | `Array`       | Array of paths to watch                             |
| `watch[].path`       | `string`      | File or directory path to watch                     |
| `watch[].extensions` | `string[]`    | File extensions to watch (required for directories) |
| `options.quiet`      | `boolean`     | Suppress console logs (default: false)              |

## 📑 Docs

- See [DEVELOPMENT](./docs/development.md) for `development` guide.
- See [CONTRIBUTION](./docs/contribution.md) for `contribution` guide.

## 📜 License

Distributed under the MIT License © [wajeht](https://github.com/wajeht). See [LICENSE](./LICENSE) for more information.
