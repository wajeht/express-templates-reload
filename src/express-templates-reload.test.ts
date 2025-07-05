import express from 'express';
import request from 'supertest';
import { expressTemplatesReload } from './express-templates-reload.js';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

describe('expressTemplatesReload', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    delete process.env.NODE_ENV;
  });

  afterEach(() => vi.restoreAllMocks());

  it('should not initialize in production environment', () => {
    process.env.NODE_ENV = 'production';

    const stdoutSpy = vi.spyOn(process.stdout, 'write');

    expressTemplatesReload({ app, watch: [{ path: './test' }] });

    expect(stdoutSpy).not.toHaveBeenCalled();
  });

  it('should create SSE endpoint with correct headers', async () => {
    const mockStatSync = vi.spyOn(require('fs'), 'statSync');
    const mockWatch = vi.spyOn(require('fs'), 'watch');

    mockStatSync.mockReturnValue({ isDirectory: () => false });
    mockWatch.mockReturnValue({
      on: vi.fn(),
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
    const mockWatch = vi.spyOn(require('fs'), 'watch');

    mockStatSync.mockReturnValue({ isDirectory: () => false });
    mockWatch.mockReturnValue({
      on: vi.fn(),
    });

    expressTemplatesReload({ app, watch: [{ path: './test.txt' }] });

    app.get('/test', (_req, res) => {
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
    const mockWatch = vi.spyOn(require('fs'), 'watch');

    mockStatSync.mockReturnValue({ isDirectory: () => false });
    mockWatch.mockReturnValue({
      on: vi.fn(),
    });

    expressTemplatesReload({ app, watch: [{ path: './test.txt' }] });

    app.get('/api', (_req, res) => {
      res.json({ message: 'API response' });
    });

    const response = await request(app).get('/api').expect(200);

    expect(response.text).not.toContain('EventSource');
    expect(response.text).not.toContain('<script>');

    mockStatSync.mockRestore();
    mockWatch.mockRestore();
  });

  it('should throw error when watching directory without extensions', () => {
    const mockStatSync = vi.spyOn(require('fs'), 'statSync');
    mockStatSync.mockReturnValue({ isDirectory: () => true });

    expect(() => {
      expressTemplatesReload({ app, watch: [{ path: './views' }] });
    }).toThrow('Extensions must be provided for directory: ./views');

    mockStatSync.mockRestore();
  });

  it('should accept quiet option', () => {
    const mockStatSync = vi.spyOn(require('fs'), 'statSync');
    const mockWatch = vi.spyOn(require('fs'), 'watch');
    const stdoutSpy = vi.spyOn(process.stdout, 'write');

    mockStatSync.mockReturnValue({ isDirectory: () => false });
    mockWatch.mockReturnValue({
      on: vi.fn(),
    });

    expressTemplatesReload({
      app,
      watch: [{ path: './test.txt' }],
      options: { quiet: true },
    });

    expect(stdoutSpy).not.toHaveBeenCalled();

    mockStatSync.mockRestore();
    mockWatch.mockRestore();
  });

  it('should handle multiple watch paths', () => {
    const mockStatSync = vi.spyOn(require('fs'), 'statSync');
    const mockWatch = vi.spyOn(require('fs'), 'watch');

    mockStatSync.mockImplementation((path: any) => ({
      isDirectory: () => path === './views',
    }));

    mockWatch.mockReturnValue({
      on: vi.fn(),
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

  it('should log with colored output and timestamps', async () => {
    const mockStatSync = vi.spyOn(require('fs'), 'statSync');
    const mockWatch = vi.spyOn(require('fs'), 'watch');
    const stdoutSpy = vi.spyOn(process.stdout, 'write');

    mockStatSync.mockReturnValue({ isDirectory: () => false });

    let watchCallback:
      | ((eventType: string, filename: string) => void)
      | undefined;
    mockWatch.mockImplementation((_path, _options, callback) => {
      watchCallback = callback as (eventType: string, filename: string) => void;
      return { on: vi.fn() };
    });

    expressTemplatesReload({ app, watch: [{ path: './test.txt' }] });

    expect(watchCallback).toBeDefined();
    watchCallback!('change', 'test.txt');

    expect(stdoutSpy).toHaveBeenCalled();
    const logCall = stdoutSpy.mock.calls[0];
    if (logCall && logCall.length > 0) {
      const logMessage = logCall[0] as string;
      expect(logMessage).toContain('[expressTemplatesReload]');
      expect(logMessage).toContain('File change: test.txt');
      expect(logMessage).toMatch(/\d{1,2}:\d{2}:\d{2}/); // timestamp pattern
    }

    mockStatSync.mockRestore();
    mockWatch.mockRestore();
  });
});
