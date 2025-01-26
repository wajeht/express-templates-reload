import express from 'express';
import path from 'node:path';
import { expressTemplatesReload } from '../../src/express-templates-reload.js';

const app = express();

app.use(express.static('./public'));

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

app.get('/', (req: express.Request, res: express.Response) => {
  return res.sendFile(path.join(process.cwd(), 'views', 'hello-world.html'));
});

app.listen(80, () => {
  console.log('App was started on http://localhost');
});
