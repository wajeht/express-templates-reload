## ⚙️ How It Works

1. Watches specified files and directories for changes
2. Injects a small client-side script into your HTML pages
3. Uses a polling mechanism to detect changes
4. Automatically reloads the page when changes are detected

## 📝 Notes

- The package only runs in development mode (`NODE_ENV !== 'production'`)
- When watching directories, you must specify file extensions
- The client script is automatically injected before the closing `</head>` tag
- Creates a `/express-templates-reload` endpoint for polling (ensure this doesn't conflict with your routes)
- Polling connections timeout after 30 seconds to prevent hanging connections
