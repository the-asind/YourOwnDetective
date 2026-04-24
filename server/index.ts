import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { Readable } from 'stream';

import { runMigrations } from './migrate.js';
import { ensureBucket, getFile, S3_BUCKET } from './storage.js';

import squaresRouter from './routes/squares.js';
import usersRouter from './routes/users.js';
import gameRouter from './routes/game.js';
import adminRouter from './routes/admin.js';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3001', 10);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

async function main() {
  // ── Run migrations ──
  console.log('[Server] Running migrations...');
  await runMigrations();

  // ── Ensure S3 bucket ──
  console.log('[Server] Ensuring S3 bucket...');
  await ensureBucket(S3_BUCKET);

  // ── Express app ──
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  // ── API routes ──
  app.use('/api/squares', squaresRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/guess', gameRouter);
  app.use('/api/admin', adminRouter);

  // ── Health check ──
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // ── Serve private MinIO objects through the app ──
  app.get('/media/*', async (req, res) => {
    const key = req.params[0];
    if (!key || key.includes('..')) {
      return res.status(400).json({ error: 'Invalid media key' });
    }

    try {
      const object = await getFile(key);
      if (object.ContentType) res.type(object.ContentType);
      if (object.ContentLength) res.setHeader('Content-Length', String(object.ContentLength));
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

      if (object.Body instanceof Readable) {
        object.Body.pipe(res);
        return;
      }

      res.status(500).json({ error: 'Unsupported media body' });
    } catch (err: any) {
      const status = err?.$metadata?.httpStatusCode === 404 || err?.name === 'NoSuchKey' ? 404 : 500;
      console.error('[Media] GET error:', key, err?.message || err);
      res.status(status).json({ error: status === 404 ? 'Media not found' : 'Media read failed' });
    }
  });

  // ── Serve static frontend in production ──
  if (IS_PRODUCTION) {
    const distPath = path.resolve(import.meta.dirname ?? __dirname, '..', 'dist');
    app.use(express.static(distPath));
    // SPA fallback: all non-API routes serve index.html
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Listening on http://0.0.0.0:${PORT}`);
    console.log(`[Server] Mode: ${IS_PRODUCTION ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  });
}

main().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
