// Endpoint de liberação de post — chama a API do Capivara.
// POST /liberar  body: { slug, password }
import type { APIRoute } from 'astro';

export const prerender = false;

const CAPIVARA_RELEASE_URL = import.meta.env.LIFELOG_RELEASE_API_URL || 'https://capivara.seu.pet/api/lifelog/release';
const PREVIEW_PASSWORD = import.meta.env.LIFELOG_PREVIEW_PASSWORD || '';
const RELEASE_TOKEN = import.meta.env.LIFELOG_RELEASE_TOKEN || '';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const slug = String(body.slug || '').trim();
    const password = String(body.password || '');

    // Validação básica
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      return new Response(JSON.stringify({ ok: false, error: 'slug_invalido' }), {
        status: 400, headers: { 'content-type': 'application/json' },
      });
    }
    if (!PREVIEW_PASSWORD || password !== PREVIEW_PASSWORD) {
      return new Response(JSON.stringify({ ok: false, error: 'senha_invalida' }), {
        status: 403, headers: { 'content-type': 'application/json' },
      });
    }
    if (!RELEASE_TOKEN) {
      return new Response(JSON.stringify({ ok: false, error: 'token_nao_configurado' }), {
        status: 500, headers: { 'content-type': 'application/json' },
      });
    }

    const upstream = await fetch(CAPIVARA_RELEASE_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${RELEASE_TOKEN}`,
      },
      body: JSON.stringify({ slug }),
      signal: AbortSignal.timeout(180_000), // build + sync + push pode demorar
    });

    const data = await upstream.json().catch(() => ({}));
    return new Response(JSON.stringify({ ok: upstream.ok, ...data }), {
      status: upstream.status,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String((err as Error)?.message || err) }), {
      status: 500, headers: { 'content-type': 'application/json' },
    });
  }
};
