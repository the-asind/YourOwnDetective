import { Router } from 'express';
import dotenv from 'dotenv';
import { query } from '../db.js';
import { createAdminToken, requireAdmin } from '../lib/adminAuth.js';

dotenv.config();

const router = Router();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

/** POST /api/admin/login — проверка пароля админки */
router.post('/login', (req, res) => {
  const { password } = req.body;

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'password is required' });
  }

  if (password === ADMIN_PASSWORD) {
    return res.json({ success: true, token: createAdminToken() });
  }

  return res.status(401).json({ success: false, error: 'Неверный пароль' });
});

router.use(requireAdmin);

/** POST /api/admin/reset-progress — hide all squares and remove players */
router.post('/reset-progress', async (_req, res) => {
  try {
    await query('BEGIN');
    try {
      await query(`
        UPDATE squares
        SET is_opened = FALSE,
            opened_by = NULL,
            opened_at = NULL
      `);
      await query('DELETE FROM users');
      await query('COMMIT');
    } catch (err) {
      await query('ROLLBACK');
      throw err;
    }

    res.json({ ok: true });
  } catch (err: any) {
    console.error('[API] POST /admin/reset-progress error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function fetchLogs(afterId: number, limit: number) {
  if (afterId <= 0) {
    const { rows } = await query(
      `SELECT id, player_name, query_text, is_match, hint_level, hint_label, created_at
       FROM guess_logs
       ORDER BY id DESC
       LIMIT $1`,
      [limit],
    );

    return rows.reverse().map((row) => ({
      id: Number(row.id),
      playerName: row.player_name,
      query: row.query_text,
      isMatch: row.is_match,
      hintLevel: row.hint_level || undefined,
      hintLabel: row.hint_label || undefined,
      createdAt: new Date(row.created_at).getTime(),
    }));
  }

  const { rows } = await query(
    `SELECT id, player_name, query_text, is_match, hint_level, hint_label, created_at
     FROM guess_logs
     WHERE id > $1
     ORDER BY id ASC
     LIMIT $2`,
    [afterId, limit],
  );

  return rows.map((row) => ({
    id: Number(row.id),
    playerName: row.player_name,
    query: row.query_text,
    isMatch: row.is_match,
    hintLevel: row.hint_level || undefined,
    hintLabel: row.hint_label || undefined,
    createdAt: new Date(row.created_at).getTime(),
  }));
}

/** GET /api/admin/guess-logs — short long-poll for new guess logs */
router.get('/guess-logs', async (req, res) => {
  const afterId = Number(req.query.after || 0);
  const wait = req.query.wait === 'true';
  const limit = Math.min(Number(req.query.limit || 80), 200);
  const startedAt = Date.now();
  const timeoutMs = 25_000;
  const intervalMs = 1_000;

  try {
    while (true) {
      const logs = await fetchLogs(Number.isFinite(afterId) ? afterId : 0, limit);
      if (logs.length || !wait || Date.now() - startedAt >= timeoutMs) {
        return res.json({ logs });
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  } catch (err: any) {
    console.error('[API] GET /admin/guess-logs error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
