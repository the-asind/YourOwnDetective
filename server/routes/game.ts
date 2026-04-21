import { Router } from 'express';
import { query } from '../db.js';
import { isMatch } from '../lib/match.js';

const router = Router();

/** ───── POST /api/guess ─────
 *  Body: { query: string, playerName: string }
 *  - Validates the guess server-side (Levenshtein)
 *  - If correct: opens the square, returns { success: true, square }
 *  - If wrong: returns { success: false }
 */
router.post('/', async (req, res) => {
  try {
    const { query: guessQuery, playerName } = req.body;

    if (!guessQuery || !playerName) {
      return res.status(400).json({ error: 'query and playerName are required' });
    }

    const cleanQuery = guessQuery.trim().toLowerCase();

    // Get all locked squares with their secret names
    const { rows: lockedSquares } = await query(
      `SELECT id, secret_name FROM squares WHERE is_opened = FALSE`,
    );

    // Find a match
    const matched = lockedSquares.find((sq) => isMatch(cleanQuery, sq.secret_name));

    if (!matched) {
      return res.json({ success: false });
    }

    // Ensure user exists
    await query(
      'INSERT INTO users (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
      [playerName],
    );

    // Open the square
    const { rows: updated } = await query(
      `UPDATE squares
       SET is_opened = TRUE, opened_by = $1, opened_at = NOW()
       WHERE id = $2 AND is_opened = FALSE
       RETURNING *`,
      [playerName, matched.id],
    );

    if (updated.length === 0) {
      // Race condition: someone else opened it
      return res.json({ success: false, reason: 'already_opened' });
    }

    const sq = updated[0];
    res.json({
      success: true,
      square: {
        id: sq.id,
        secretName: sq.secret_name,
        type: sq.type,
        content: sq.content,
        audioUrl: sq.audio_url || undefined,
        description: sq.description || undefined,
        isOpened: true,
        openedBy: sq.opened_by,
        openedAt: new Date(sq.opened_at).getTime(),
      },
    });
  } catch (err: any) {
    console.error('[API] POST /guess error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
