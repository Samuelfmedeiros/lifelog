// Profundidade de leitura por post (métrica pedida em 04/11).
//
// Regra de desenho medida em 04/11 no ClickHouse: o evento `post_depth` NÃO
// existia — todo post aparecia "sem evento" e a coluna de profundidade do
// relatório ficava vazia com dado na tabela. Este módulo é o produtor do
// evento; o consumidor é `~/.hermes/scripts/seupet-metricas-por-post.py`.
//
// Contrato do evento (o script Python lê `properties.__title` e a
// profundidade em %):
//   name      = 'post_depth'
//   path      = location.pathname (o normalizador de slug vive no Python)
//   properties = { __title, path, pct, ms, locale }

/** Percentual de leitura da página, 0-100, arredondado para baixo. */
export function computePct(scrollTop: number, scrollHeight: number, clientHeight: number): number {
  if (!Number.isFinite(scrollTop) || !Number.isFinite(scrollHeight) || !Number.isFinite(clientHeight)) {
    return 0;
  }
  if (scrollHeight <= clientHeight || scrollHeight <= 0) {
    // Documento mais curto que a janela = 100% lido (não existe "metade").
    return 100;
  }
  const raw = (scrollTop / (scrollHeight - clientHeight)) * 100;
  return Math.max(0, Math.min(100, Math.floor(raw)));
}

/** Chave estável de dedupe: um evento por post por sessão de aba. */
export function depthKey(path: string): string {
  return 'll:post-depth:' + path;
}

/**
 * Payload do evento. `slug` é o id do post sem data nem prefixo `en/`, para
 * cruzar com o relatório do Python sem depender do formato da URL.
 */
export function buildPayload(input: {
  path: string;
  title: string;
  slug: string;
  locale: string;
  pct: number;
  ms: number;
}): { name: string; path: string; properties: Record<string, string | number> } {
  const pct = Math.max(0, Math.min(100, Math.floor(input.pct)));
  // Mesmo contrato do JSON-LD do post (PostLayout.astro): 'pt-BR' ou 'en'.
  // Antes saia 'pt' (locale do roteador), que nao casa com o schema da pagina.
  const locale = input.locale === 'en' ? 'en' : 'pt-BR';
  return {
    name: 'post_depth',
    path: input.path,
    properties: {
      __title: input.title,
      path: input.path,
      slug: input.slug,
      locale,
      pct,
      ms: Math.max(0, Math.floor(input.ms)),
    },
  };
}

/**
 * Já emitido nesta aba? Usa sessionStorage quando disponível; se estiver
 * bloqueada (modo restritivo), `null` = "não sei" e o evento sai assim mesmo
 * (perder a métrica é pior que métrica duplicada em visitante raro).
 */
export function alreadySent(key: string): boolean | null {
  try {
    const v = sessionStorage.getItem(key);
    return v === '1';
  } catch {
    return null;
  }
}

export function markSent(key: string): void {
  try {
    sessionStorage.setItem(key, '1');
  } catch {
    /* silencioso: sem storage, sem dedupe */
  }
}
