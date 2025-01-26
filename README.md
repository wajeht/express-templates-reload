# 🔄 express-templates-reload

Automatically reload templates and asset changes in an Express app

## 📚 Features

- 🔄 Auto-reload on template changes
- 📁 Watch single files or entire directories
- 🎯 Filter by file extensions
- ⚡ Lightweight with zero dependencies
- 🔧 Configurable polling interval
- 🤫 Quiet mode option

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
    { path: './views/index.ejs' },
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

## ⚙️ How It Works

1. Watches specified files and directories for changes
2. Injects a small client-side script into your HTML pages
3. Uses a polling mechanism to detect changes
4. Automatically reloads the page when changes are detected

## 📝 Notes

- The package only runs in development mode (`NODE_ENV !== 'development'`)
- When watching directories, you must specify file extensions
- The client script is automatically injected before the closing `</head>` tag

## 📑 Docs

- See [DEVELOPMENT](./docs/development.md) for `development` guide.
- See [CONTRIBUTION](./docs/contribution.md) for `contribution` guide.

## 📜 License

Distributed under the MIT License © [wajeht](https://github.com/wajeht). See [LICENSE](./LICENSE) for more information.
