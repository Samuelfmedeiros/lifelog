// Vercel Function: /api/session
// Troca o segredo de administracao por um cookie de sessao para /ocultos/*.
//
// Por que existe (01/11/2026): as rotas /ocultos/preview/** eram HTML estatico
// publico. O middleware da raiz agora exige um cookie; este endpoint emite esse
// cookie so para quem apresenta o ADMIN_SECRET correto.
//
// O cookie NAO guarda o segredo: guarda HMAC-SHA256(ADMIN_SECRET, 'lifelog-ocultos-v1').
//   POST   /api/session   Authorization: Bearer <ADMIN_SECRET>  -> Set-Cookie (12h)
//   DELETE /api/session                                        -> apaga o cookie
import { createHmac, timingSafeEqual } from 'node:crypto';

const NOME_COOKIE = 'lifelog_ocultos';
const MENSAGEM = 'lifelog-ocultos-v1';
const MAX_AGE = 60 * 60 * 12; // 12h

function segredoOk(req) {
  const ADMIN_SECRET = process.env.ADMIN_SECRET;
  if (!ADMIN_SECRET) return { ok: false, code: 500, error: 'ADMIN_SECRET nao configurado (env da Vercel)' };
  const auth = req.headers['authorization'] || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  const a = Buffer.from(token);
  const b = Buffer.from(ADMIN_SECRET);
  if (a.length !== b.length) return { ok: false, code: 401, error: 'Segredo invalido' };
  return timingSafeEqual(a, b)
    ? { ok: true, ADMIN_SECRET }
    : { ok: false, code: 401, error: 'Segredo invalido' };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', `${NOME_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
    return res.status(200).json({ ok: true, sessao: 'encerrada' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, DELETE');
    return res.status(405).json({ error: 'Use POST (abrir sessao) ou DELETE (encerrar)' });
  }

  const check = segredoOk(req);
  if (!check.ok) return res.status(check.code).json({ error: check.error });

  const token = createHmac('sha256', check.ADMIN_SECRET).update(MENSAGEM).digest('hex');
  res.setHeader(
    'Set-Cookie',
    `${NOME_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${MAX_AGE}`,
  );
  return res.status(200).json({ ok: true, expira_em_segundos: MAX_AGE });
}