import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

function getSecret(): string {
  return process.env.ADMIN_TOKEN_SECRET || process.env.ADMIN_PASSWORD || 'admin';
}

function base64url(input: string): string {
  return Buffer.from(input).toString('base64url');
}

function signPayload(payload: string): string {
  return crypto
    .createHmac('sha256', getSecret())
    .update(payload)
    .digest('base64url');
}

export function createAdminToken(): string {
  const payload = JSON.stringify({
    role: 'admin',
    exp: Date.now() + TOKEN_TTL_MS,
  });
  const encodedPayload = base64url(payload);
  return `${encodedPayload}.${signPayload(encodedPayload)}`;
}

export function verifyAdminToken(token: string | undefined): boolean {
  if (!token) return false;

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return false;

  const expected = signPayload(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    return payload.role === 'admin' && typeof payload.exp === 'number' && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export function isAdminRequest(req: Request): boolean {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
  return verifyAdminToken(token);
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!isAdminRequest(req)) {
    return res.status(401).json({ error: 'Admin authorization required' });
  }

  next();
}
