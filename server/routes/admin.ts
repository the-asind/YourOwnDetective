import { Router } from 'express';
import dotenv from 'dotenv';

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
    return res.json({ success: true });
  }

  return res.status(401).json({ success: false, error: 'Неверный пароль' });
});

export default router;
