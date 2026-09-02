// Vercel Function: GET /api/ocultos
// Lista posts ocultos (hidden: true) — dados gerados no build por scripts/gen-ocultos.mjs
// (não depende do filesystem do deploy — roda em bundle Vercel/Astro)
// Requer ADMIN_SECRET (env na Vercel) via header Authorization: Bearer ***
import { timingSafeEqual } from 'node:crypto';
import OCULTOS from './ocultos-data.mjs';

function secretOk(req) {
  const ADMIN_SECRET = process.env.ADMIN_SECRET;
  if (!ADMIN_SECRET) return { ok: false, error: 'ADMIN_SECRET nao configurado (env da Vercel)' };
  const auth = req.headers['authorization'] || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  const a = Buffer.from(token);
  const b = Buffer.from(ADMIN_SECRET);
  if (a.length !== b.length) return { ok: false, error: 'Segredo invalido' };
  return { ok: timingSafeEqual(a, b), error: 'Segredo invalido' };
}

export default async function handler(req, res) {
  const check = secretOk(req);
  if (!check.ok) {
    res.status(401).json({ error: check.error || 'Segredo invalido' });
    return;
  }
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ ok: true, posts: OCULTOS });
}