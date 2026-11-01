// Vercel Function: GET /api/preview?lang=pt|en&slug=<slug>
//
// Serve o HTML do preview de post oculto. NAO e publico: exige o cookie de sessao
// emitido por /api/session (HMAC-SHA256 do ADMIN_SECRET), o mesmo que o painel
// /ocultos usa. Sem cookie valido: 307 para /ocultos/?next=... para o Samuel
// entrar com o segredo e voltar ao preview.
//
// Por que nao e uma pagina estatica (01/11/2026): as rotas /ocultos/preview/**
// eram HTML publico — quem tinha o link lia o post oculto inteiro. Agora o HTML
// vive no bundle desta function (api/preview-data.mjs, gerado no build) e o
// vercel.json reescreve /ocultos/preview/{pt,en}/<slug>/ para ca.
import { createHmac, timingSafeEqual } from 'node:crypto';
import PREVIEWS from './preview-data.mjs';

const NOME_COOKIE = 'lifelog_ocultos';
const MENSAGEM = 'lifelog-ocultos-v1';

function cookieValido(req) {
  const ADMIN_SECRET = process.env.ADMIN_SECRET;
  if (!ADMIN_SECRET) return { ok: false, code: 503, error: 'ADMIN_SECRET nao configurado (env da Vercel)' };
  const header = req.headers.cookie || '';
  const m = header.match(new RegExp('(?:^|;\\s*)' + NOME_COOKIE + '=([^;]+)'));
  if (!m) return { ok: false, code: 401 };
  const recebido = Buffer.from(decodeURIComponent(m[1]));
  const esperado = Buffer.from(createHmac('sha256', ADMIN_SECRET).update(MENSAGEM).digest('hex'));
  if (recebido.length !== esperado.length || !timingSafeEqual(recebido, esperado)) {
    return { ok: false, code: 401 };
  }
  return { ok: true };
}

export default async function handler(req, res) {
  const lang = req.query?.lang === 'en' ? 'en' : 'pt';
  const slug = String(req.query?.slug || '');
  const voltar = `/ocultos/?next=${encodeURIComponent(`/ocultos/preview/${lang}/${slug}/`)}`;

  res.setHeader('Cache-Control', 'no-store');

  const check = cookieValido(req);
  if (!check.ok) {
    res.writeHead(307, { Location: voltar });
    res.end();
    return;
  }

  const html = PREVIEWS[`${lang}/${slug}`];
  if (!html) {
    res.status(404).send('Preview nao encontrado.');
    return;
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.status(200).send(html);
}