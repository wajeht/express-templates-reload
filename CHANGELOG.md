# @wajeht/express-templates-reload

## 3.0.0

### Major Changes

- **BREAKING**: Replaced SSE with WebSocket for browser reload communication
- **BREAKING**: Added `ws` as a runtime dependency
- **BREAKING**: New optional `server` parameter for apps using `http.createServer(app)` directly
- **BREAKING**: New `clientQuiet` option to silence client-side console logs

### Features

- WebSocket-based reload via `ws` library with `noServer: true` mode
- Auto-captures server from `app.listen()` — no config needed for most setups
- Optional explicit `server` param for `http.createServer(app)` usage
- `dispose()` handle for cleanup of watchers, WebSocket clients, and patched methods
- Extracted client script into `src/client-script.ts` with deduplication via marker attribute
- Extracted logger into `src/logger.ts`

### Internal

- Migrated from tsup to vite-plus (`vp pack`)
- Migrated from prettier/eslint to vite-plus (`vp check`)
- Replaced changesets with manual `release.sh`
- Rewrote test suite with 13 tests covering WebSocket e2e

### Migration Guide

```js
// Before (v2.x) — no changes needed if using app.listen()
expressTemplatesReload({ app, watch: [{ path: './views' }] });

// If using http.createServer(app), pass server explicitly:
import http from 'node:http';
const server = http.createServer(app);
expressTemplatesReload({ app, server, watch: [{ path: './views' }] });
```

## 2.0.5

### Patch Changes

- d8cb679: chore(deps): update and upgrades

## 2.0.4

### Patch Changes

- 5c6d9c0: chore(deps): update and upgrade packages
- b25f0fb: chore(deps): update and upgrade packages

## 2.0.3

### Patch Changes

- 8e17bde: feat: refactor logger to use node utils

## 2.0.2

### Patch Changes

- 15602a9: perf: Improved file watching with `fs.watch`, added reconnection limits, and enhanced error handling

## 2.0.1

### Patch Changes

- 917133b: feat: add color console output

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
