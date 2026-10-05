import express from 'express';
import path from 'node:path';

/** Production files, then genuine asset misses, then client-side routes. */
export function productionFiles(distPath: string) {
  const router = express.Router();
  router.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
      if (filePath.split(path.sep).includes('assets')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }));
  router.use('/assets', (_req, res) => {
    res.set('Cache-Control', 'no-store').status(404).type('text').send('Asset not found.');
  });
  router.get('/{*splat}', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  return router;
}
