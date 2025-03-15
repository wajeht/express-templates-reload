import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { expressTemplatesReload } from '../../src/express-templates-reload.js';

const app = express();

app.use(express.static('./public'));

if (process.env.NODE_ENV !== 'production') {
  expressTemplatesReload({
    app,
    watch: [
      // Watch a specific file
      { path: './public/style.css' },
      { path: './public/script.js' },

      // Watch a directory with specific extensions
      {
        path: './views',
        extensions: ['.html'],
      },
    ],
  });
}

app.get('/', (req: express.Request, res: express.Response) => {
  res.send(
    fs.readFileSync(
      path.join(process.cwd(), 'views', 'hello-world.html'),
      'utf8',
    ),
  );
});

app.listen(80, () => {
  console.log('App was started on http://localhost');
});
