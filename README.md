# 🔄 express-templates-reload

Automatically reload templates and asset changes in an Express app

## 💻 Usage

```ts
import express from 'express';
import { expressTemplatesReload } from 'express-templates-reload';

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
