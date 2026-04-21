import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db.js';
import { uploadFile, deleteFile, S3_PUBLIC_BASE } from '../storage.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

/** ───── GET /api/squares ───── */
router.get('/', async (req, res) => {
  try {
    const isAdmin = req.query.admin === 'true';

    const { rows } = await query(
      `SELECT id, secret_name, type, content, audio_url, description,
              is_opened, opened_by, opened_at, sort_order, created_at
       FROM squares ORDER BY sort_order ASC, created_at ASC`,
    );

    const squares = rows.map((r) => {
      const sq: any = {
        id: r.id,
        type: r.type,
        content: r.content,
        audioUrl: r.audio_url || undefined,
        description: r.description || undefined,
        isOpened: r.is_opened,
        openedBy: r.opened_by || undefined,
        openedAt: r.opened_at ? new Date(r.opened_at).getTime() : undefined,
      };

      // Only expose secretName if opened or admin request
      if (r.is_opened || isAdmin) {
        sq.secretName = r.secret_name;
      } else {
        sq.secretName = '???';
      }

      return sq;
    });

    res.json(squares);
  } catch (err: any) {
    console.error('[API] GET /squares error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** ───── POST /api/squares ───── */
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { secretName, type, description, contentText } = req.body;

    if (!secretName || !type) {
      return res.status(400).json({ error: 'secretName and type are required' });
    }

    let contentVal = '';
    let audioUrlVal: string | null = null;

    if (type === 'text') {
      contentVal = contentText || '';
    } else if (type === 'image' && req.file) {
      // Compress with sharp → WebP, max 1200px
      const processed = await sharp(req.file.buffer)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      const key = `images/${uuidv4()}.webp`;
      contentVal = await uploadFile(key, processed, 'image/webp');
    } else if (type === 'audio' && req.file) {
      const ext = req.file.originalname.split('.').pop() || 'mp3';
      const key = `audio/${uuidv4()}.${ext}`;
      audioUrlVal = await uploadFile(key, req.file.buffer, req.file.mimetype);
      contentVal = 'Аудиофайл';
    } else {
      return res.status(400).json({ error: 'File or text content required' });
    }

    // Get next sort_order
    const { rows: maxRows } = await query('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM squares');
    const nextOrder = maxRows[0].next;

    const { rows } = await query(
      `INSERT INTO squares (secret_name, type, content, audio_url, description, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [secretName.toLowerCase().trim(), type, contentVal, audioUrlVal, description || null, nextOrder],
    );

    const sq = rows[0];
    res.status(201).json({
      id: sq.id,
      secretName: sq.secret_name,
      type: sq.type,
      content: sq.content,
      audioUrl: sq.audio_url || undefined,
      description: sq.description || undefined,
      isOpened: sq.is_opened,
      openedBy: sq.opened_by || undefined,
      openedAt: sq.opened_at ? new Date(sq.opened_at).getTime() : undefined,
    });
  } catch (err: any) {
    console.error('[API] POST /squares error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** ───── PUT /api/squares/:id ───── */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { isOpened, openedBy, description, secretName } = req.body;

    // Build dynamic SET clause
    const sets: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (isOpened !== undefined) {
      sets.push(`is_opened = $${idx++}`);
      params.push(isOpened);
      if (isOpened) {
        sets.push(`opened_at = $${idx++}`);
        params.push(new Date());
      } else {
        sets.push(`opened_at = NULL`);
        sets.push(`opened_by = NULL`);
      }
    }

    if (openedBy !== undefined) {
      sets.push(`opened_by = $${idx++}`);
      params.push(openedBy || null);
    }

    if (description !== undefined) {
      sets.push(`description = $${idx++}`);
      params.push(description);
    }

    if (secretName !== undefined) {
      sets.push(`secret_name = $${idx++}`);
      params.push(secretName.toLowerCase().trim());
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    const { rows, rowCount } = await query(
      `UPDATE squares SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      params,
    );

    if (!rowCount) return res.status(404).json({ error: 'Square not found' });

    const sq = rows[0];
    res.json({
      id: sq.id,
      secretName: sq.secret_name,
      type: sq.type,
      content: sq.content,
      audioUrl: sq.audio_url || undefined,
      description: sq.description || undefined,
      isOpened: sq.is_opened,
      openedBy: sq.opened_by || undefined,
      openedAt: sq.opened_at ? new Date(sq.opened_at).getTime() : undefined,
    });
  } catch (err: any) {
    console.error('[API] PUT /squares/:id error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** ───── DELETE /api/squares/:id ───── */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get square first to delete associated files
    const { rows } = await query('SELECT content, audio_url, type FROM squares WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Square not found' });

    const sq = rows[0];

    // Delete associated files from S3 if they are our uploads
    if (sq.type === 'image' && sq.content?.startsWith(S3_PUBLIC_BASE)) {
      const key = sq.content.replace(`${S3_PUBLIC_BASE}/`, '');
      await deleteFile(key).catch(() => {});
    }
    if (sq.audio_url?.startsWith(S3_PUBLIC_BASE)) {
      const key = sq.audio_url.replace(`${S3_PUBLIC_BASE}/`, '');
      await deleteFile(key).catch(() => {});
    }

    await query('DELETE FROM squares WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err: any) {
    console.error('[API] DELETE /squares/:id error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
