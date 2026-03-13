## ⚙️ How It Works

1. **File watching**: Uses `fs.watch()` to monitor template and asset changes
2. **Script injection**: Automatically injects minimal client-side code into HTML responses
3. **WebSockets**: Establishes a persistent connection between browser and server
4. **Real-time notifications**: Changes are pushed immediately when detected
5. **Auto-reconnection**: Client automatically reconnects if the WebSocket connection is lost

## 📝 Notes

- The package only runs in development mode (`NODE_ENV !== 'production'`)
- When watching directories, you must specify file extensions
- Watch paths are resolved from `process.cwd()`, so absolute paths are safer in larger apps
- The client script is automatically injected before the closing `</head>` tag
- Uses a `/express-templates-reload` WebSocket upgrade path on the attached server
- Attaches the upgrade handler to the server returned by `app.listen()`, or to a provided `server`
- Returns a handle with `dispose()` for tearing down watchers and restoring patched app methods
- `options.quiet` suppresses browser logs too unless `options.clientQuiet` overrides it
