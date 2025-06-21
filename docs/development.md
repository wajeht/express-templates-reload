## ⚙️ How It Works

1. **Stream-based file watching**: Uses `fs.promises.watch()` with async iterators for efficient file monitoring
2. **Script injection**: Automatically injects minimal client-side code into HTML responses
3. **Server-Sent Events**: Establishes persistent connection between browser and server
4. **Real-time notifications**: Changes are pushed immediately when detected
5. **Auto-reconnection**: Client automatically reconnects if connection is lost

## 📝 Notes

- The package only runs in development mode (`NODE_ENV !== 'production'`)
- When watching directories, you must specify file extensions
- The client script is automatically injected before the closing `</head>` tag
- Creates a `/express-templates-reload` SSE endpoint (ensure this doesn't conflict with your routes)
- Uses modern async streams and EventSource for optimal performance
