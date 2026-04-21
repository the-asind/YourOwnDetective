import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

/** ───── GET /api/users ───── */
router.get('/', async (_req, res) => {
  try {
    const { rows } = await query('SELECT name, created_at FROM users ORDER BY created_at ASC');
    res.json(rows.map((r) => r.name));
  } catch (err: any) {
    console.error('[API] GET /users error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** ───── POST /api/users ───── */
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    const cleanName = name.trim();
    await query(
      'INSERT INTO users (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
      [cleanName],
    );

    res.status(201).json({ name: cleanName });
  } catch (err: any) {
    console.error('[API] POST /users error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** ───── DELETE /api/users/:name ───── */
router.delete('/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const { rowCount } = await query('DELETE FROM users WHERE name = $1', [name]);

    if (!rowCount) return res.status(404).json({ error: 'User not found' });
    res.json({ ok: true });
  } catch (err: any) {
    console.error('[API] DELETE /users/:name error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
