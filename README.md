# 🔄 express-templates-reload

[![Node.js CI](https://github.com/wajeht/express-templates-reload/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/wajeht/express-templates-reload/actions/workflows/ci.yml)
![npm](https://img.shields.io/npm/dw/%40wajeht%2Fexpress-templates-reload)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/wajeht/type/blob/main/LICENSE) [![Open Source Love svg1](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://github.com/wajeht/express-templates-reload)
[![npm](https://img.shields.io/npm/v/%40wajeht%2Fexpress-templates-reload)](https://www.npmjs.com/package/@wajeht/express-templates-reload)

automatically reload template and public asset changes in an express app

## 🛠️ Installation

```bash
$ npm install @wajeht/express-templates-reload --save-dev
```

## 💻 Usage

```ts
import express from 'express';
import { expressTemplatesReload } from '@wajeht/express-templates-reload';

const app = express();

// Basic setup
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
});

// With options
expressTemplatesReload({
  app,
  watch: [{ path: './views', extensions: ['.ejs'] }],
  options: {
    pollInterval: 100, // Check for changes every 100ms (default: 50ms)
    quiet: true, // Suppress console logs
  },
});
```

## 🛠️ API Reference

### expressTemplatesReload(config)

#### Config Options

| Parameter              | Type          | Description                                         |
| ---------------------- | ------------- | --------------------------------------------------- |
| `app`                  | `Application` | Express application instance                        |
| `watch`                | `Array`       | Array of paths to watch                             |
| `watch[].path`         | `string`      | File or directory path to watch                     |
| `watch[].extensions`   | `string[]`    | File extensions to watch (required for directories) |
| `options.pollInterval` | `number`      | Polling interval in milliseconds (default: 50)      |
| `options.quiet`        | `boolean`     | Suppress console logs (default: false)              |

## 📑 Docs

- See [DEVELOPMENT](./docs/development.md) for `development` guide.
- See [CONTRIBUTION](./docs/contribution.md) for `contribution` guide.

## 📜 License

Distributed under the MIT License © [wajeht](https://github.com/wajeht). See [LICENSE](./LICENSE) for more information.
