# @wajeht/express-templates-reload

## 2.0.0

### Major Changes

- **BREAKING**: Removed `pollInterval` option - now uses Server-Sent Events for instant reloads
- **BREAKING**: Removed `debounceMs` option - no longer needed with new architecture
- **BREAKING**: `/express-templates-reload` endpoint now serves SSE stream instead of HTTP polling

### Features

- ✨ **Server-Sent Events**: Instant push notifications instead of polling
- ⚡ **Stream-based file watching**: Uses `fs.promises.watch()` with async iterators for better performance
- 🔄 **Auto-reconnection**: Client automatically reconnects if connection is lost
- 🐳 **Better Docker support**: More efficient in containerized environments
- 📈 **Performance improvements**: Eliminated polling overhead, reduced CPU usage, faster reload times

### Migration Guide

If you were using the removed options:

```js
// Before (v1.x)
expressTemplatesReload({
  app,
  watch: [...],
  options: {
    pollInterval: 100,  // ❌ Remove this
    debounceMs: 150,    // ❌ Remove this
    quiet: false
  }
});

// After (v2.x)
expressTemplatesReload({
  app,
  watch: [...],
  options: {
    quiet: false  // ✅ Only this option remains
  }
});
```

## 1.0.4

### Patch Changes

- c430d3e: fix: long hanging connection
  fix: exmaple code was not running properly

## 1.0.3

### Patch Changes

- 816a58c: docs: update types defination

## 1.0.2

### Patch Changes

- 683e612: fix: return on production env

## 1.0.1

### Patch Changes

- 67951c3: initial release
