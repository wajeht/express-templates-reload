import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { expressTemplatesReload } from './express-templates-reload.js';

describe('expressTemplatesReload', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    delete process.env.NODE_ENV;
  });

  afterEach(() => vi.restoreAllMocks());

  it('should not initialize in production environment', () => {
    process.env.NODE_ENV = 'production';

    const consoleSpy = vi.spyOn(console, 'info');

    expressTemplatesReload({ app, watch: [{ path: './test' }] });

    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should create SSE endpoint with correct headers', async () => {
    const mockStatSync = vi.spyOn(require('fs'), 'statSync');
    const mockWatch = vi.spyOn(require('fs').promises, 'watch');

    mockStatSync.mockReturnValue({ isDirectory: () => false });
    mockWatch.mockReturnValue({
      [Symbol.asyncIterator]: async function* () {},
    });

    expressTemplatesReload({ app, watch: [{ path: './test.txt' }] });

    return new Promise<void>((resolve) => {
      const server = app.listen(0, () => {
        const port = (server.address() as any).port;
        const req = require('http').request(
          {
            hostname: 'localhost',
            port: port,
            path: '/express-templates-reload',
            method: 'GET',
          },
          (res: any) => {
            expect(res.headers['content-type']).toBe('text/event-stream');
            expect(res.headers['cache-control']).toBe('no-cache');
            expect(res.headers['connection']).toBe('keep-alive');

            res.on('data', (chunk: Buffer) => {
              const data = chunk.toString();
              if (data.includes('data: connected')) {
                req.destroy();
                server.close();
                mockStatSync.mockRestore();
                mockWatch.mockRestore();
                resolve();
              }
            });
          },
        );

        req.end();
      });
    });
  });

  it('should inject client script into HTML responses', async () => {
    const mockStatSync = vi.spyOn(require('fs'), 'statSync');
    const mockWatch = vi.spyOn(require('fs').promises, 'watch');

    mockStatSync.mockReturnValue({ isDirectory: () => false });
    mockWatch.mockReturnValue({
      [Symbol.asyncIterator]: async function* () {},
    });

    expressTemplatesReload({ app, watch: [{ path: './test.txt' }] });

    app.get('/test', (req, res) => {
      res.send('<html><head></head><body>Test</body></html>');
    });

    const response = await request(app).get('/test').expect(200);

    expect(response.text).toContain("EventSource('/express-templates-reload')");
    expect(response.text).toContain('<script>');
    expect(response.text).toContain('location.reload()');

    mockStatSync.mockRestore();
    mockWatch.mockRestore();
  });

  it('should not inject script into non-HTML responses', async () => {
    const mockStatSync = vi.spyOn(require('fs'), 'statSync');
    const mockWatch = vi.spyOn(require('fs').promises, 'watch');

    mockStatSync.mockReturnValue({ isDirectory: () => false });
    mockWatch.mockReturnValue({
      [Symbol.asyncIterator]: async function* () {},
    });

    expressTemplatesReload({ app, watch: [{ path: './test.txt' }] });

    app.get('/api', (req, res) => {
      res.json({ message: 'API response' });
    });

    const response = await request(app).get('/api').expect(200);

    expect(response.text).not.toContain('EventSource');
    expect(response.text).not.toContain('<script>');

    mockStatSync.mockRestore();
    mockWatch.mockRestore();
  });

  it('should throw error when watching directory without extensions', async () => {
    const mockStatSync = vi.spyOn(require('fs'), 'statSync');

    mockStatSync.mockReturnValue({ isDirectory: () => true });

    const originalOnUnhandledRejection =
      process.listeners('unhandledRejection');
    let caughtError: any = null;

    process.removeAllListeners('unhandledRejection');
    process.on('unhandledRejection', (reason) => (caughtError = reason));

    expressTemplatesReload({ app, watch: [{ path: './views' }] });

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(caughtError).toBeInstanceOf(Error);
    expect(caughtError.message).toBe(
      'Extensions must be provided for directory: ./views',
    );

    process.removeAllListeners('unhandledRejection');
    originalOnUnhandledRejection.forEach((listener) =>
      process.on('unhandledRejection', listener as any),
    );

    mockStatSync.mockRestore();
  });

  it('should accept quiet option', () => {
    const mockStatSync = vi.spyOn(require('fs'), 'statSync');
    const mockWatch = vi.spyOn(require('fs').promises, 'watch');
    const consoleSpy = vi.spyOn(console, 'info');

    mockStatSync.mockReturnValue({ isDirectory: () => false });
    mockWatch.mockReturnValue({
      [Symbol.asyncIterator]: async function* () {},
    });

    expressTemplatesReload({
      app,
      watch: [{ path: './test.txt' }],
      options: { quiet: true },
    });

    expect(consoleSpy).not.toHaveBeenCalled();

    mockStatSync.mockRestore();
    mockWatch.mockRestore();
  });

  it('should handle multiple watch paths', () => {
    const mockStatSync = vi.spyOn(require('fs'), 'statSync');
    const mockWatch = vi.spyOn(require('fs').promises, 'watch');

    mockStatSync.mockImplementation((path: any) => ({
      isDirectory: () => path === './views',
    }));

    mockWatch.mockReturnValue({
      [Symbol.asyncIterator]: async function* () {},
    });

    expect(() => {
      expressTemplatesReload({
        app,
        watch: [
          { path: './public/style.css' },
          { path: './public/script.js' },
          { path: './views', extensions: ['.html', '.ejs'] },
        ],
      });
    }).not.toThrow();

    mockStatSync.mockRestore();
    mockWatch.mockRestore();
  });
});
