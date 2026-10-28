import { defineConfig } from 'vite';
import path from 'node:path';
import { discoverThemes } from './scripts/catalog';

export default defineConfig({
  build: { target: 'es2022' },
  server: { host: '127.0.0.1', port: 5173, strictPort: true, fs: { strict: true } },
  plugins: [{ name: 'local-theme-catalog', configureServer(server) {
    server.middlewares.use('/__themes', async (req, res) => {
      if (req.method !== 'GET') { res.statusCode = 405; res.end(); return; }
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(await discoverThemes(path.resolve('themes'))));
    });
  } }]
});
