import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { createProxyMiddleware } from 'http-proxy-middleware';

import { runMigrations } from './migrate.js';
import { ensureBucket, S3_BUCKET } from './storage.js';

import squaresRouter from './routes/squares.js';
import usersRouter from './routes/users.js';
import gameRouter from './routes/game.js';
import adminRouter from './routes/admin.js';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3001', 10);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const S3_ENDPOINT = process.env.S3_ENDPOINT || 'http://localhost:9000';

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

  // ── Proxy /media/* to MinIO for serving uploaded files ──
  app.use(
    '/media',
    createProxyMiddleware({
      target: S3_ENDPOINT,
      changeOrigin: true,
      pathRewrite: (_path, req) => {
        // /media/images/abc.webp → /squares-media/images/abc.webp
        const objectPath = req.url || '';
        return `/${S3_BUCKET}${objectPath}`;
      },
      logger: console,
    }),
  );

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
