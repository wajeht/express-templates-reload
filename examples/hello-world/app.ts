import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import express from 'express';
import { expressTemplatesReload } from '../../src/express-templates-reload.js';

const app = express();
const server = http.createServer(app);
const rootDir = process.cwd();
const publicDir = path.join(rootDir, 'public');
const viewsDir = path.join(rootDir, 'views');

app.use(express.static(publicDir));

if (process.env.NODE_ENV !== 'production') {
  // Custom server pattern: pass `server` so upgrades attach correctly.
  expressTemplatesReload({
    app,
    server,
    watch: [
      // Watch a specific file
      { path: path.join(publicDir, 'style.css') },
      { path: path.join(publicDir, 'script.js') },

      // Watch a directory with specific extensions
      {
        path: viewsDir,
        extensions: ['.html'],
      },
    ],

    // Optional settings
    options: {
      quiet: false, // Set to true to suppress server and browser logs
    },
  });
}

app.get('/', (_req: express.Request, res: express.Response) => {
  res.send(fs.readFileSync(path.join(viewsDir, 'hello-world.html'), 'utf8'));
});

server.listen(80, () => {
  console.log('App was started on http://localhost');
});
