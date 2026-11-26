// Engajamento — contrato único de eventos de interação para os sites do Samuel.
//
// Fonte: OpenPanel self-hosted (projeto por site desde 13/11). A tabela `events`
// tem colunas `path`/`origin`/`duration` e `properties` (Map<String,String>).
// Este modulo emite APENAS eventos com chaves primitivas — sem PII, sem email,
// sem coordenadas de clique, sem stack de erro.
//
// Contrato dos eventos:
//   scroll_depth   { site, path, pct, lang }
//   section_time   { site, path, section, ms }
//   ui_click       { site, path, id, label }
//   engagement_time{ site, path, ms }
//   web_vital      { site, path, metric, value }
//   js_error       { site, path, message }
//
// Regras duras (medidas 26/11):
// - dedupe por sessao via sessionStorage: um marco de scroll / um botao por sessao;
// - DNT/GPC desligam a coleta (mesma regra do beacon da loja);
// - analytics NUNCA quebra a pagina: todo envio e try/catch silencioso;
// - `post_depth` continua sendo o evento canonico dos posts (post-depth.ts) —
//   este modulo cobre	paginas gerais e interacoes, sem duplicar aquele evento.

export type OpFn = ((...args: unknown[]) => void) & { q?: unknown[] };

export interface EngagementOptions {
  site: string;
  trackSections?: boolean;
  trackClicks?: boolean;
  trackVitals?: boolean;
  trackErrors?: boolean;
  /** Prefixo das chaves de sessionStorage (isolamento por site). */
  keyPrefix?: string;
}

/** Marcos emitidos uma vez por pagina/sessao. */
export const SCROLL_MARKS = [25, 50, 75, 100] as const;

export function scrollPct(scrollTop: number, scrollHeight: number, clientHeight: number): number {
  if (!Number.isFinite(scrollTop) || !Number.isFinite(scrollHeight) || !Number.isFinite(clientHeight)) return 0;
  if (scrollHeight <= clientHeight || scrollHeight <= 0) return 100;
  const raw = (scrollTop / (scrollHeight - clientHeight)) * 100;
  return Math.max(0, Math.min(100, Math.floor(raw)));
}

/** Proximo marco ainda nao atingido; null quando o ultimo foi cruzado. */
export function nextMark(pct: number, already: readonly number[] = []): number | null {
  for (const m of SCROLL_MARKS) {
    if (pct >= m && !already.includes(m)) return m;
  }
  return null;
}

export function engagementKey(prefix: string, kind: string, id: string): string {
  return `${prefix || 'eng'}:${kind}:${id}`;
}

/** Retorna true quando o evento pode ser enviado (ou quando nao ha storage). */
export function shouldSend(key: string): boolean {
  try {
    return sessionStorage.getItem(key) !== '1';
  } catch {
    return null as unknown as boolean; // sem storage: envia (melhor perder dedupe que o dado)
  }
}

export function markSent(key: string): void {
  try { sessionStorage.setItem(key, '1'); } catch { /* silencioso */ }
}

/** Respeita DNT/GPC — mesmo contrato do beacon de visita da loja. */
export function trackingDisabled(nav?: Navigator): boolean {
  const n = nav ?? (typeof navigator === 'undefined' ? undefined : navigator);
  if (!n) return true;
  const dnt = (n as Navigator & { doNotTrack?: string | null }).doNotTrack;
  const gpc = (n as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl;
  return dnt === '1' || gpc === true;
}

export function emit(name: string, properties: Record<string, string | number>): void {
  if (typeof window === 'undefined') return;
  try {
    const w = window as unknown as { op?: OpFn };
    if (typeof w.op === 'function') w.op('track', name, properties);
  } catch { /* analytics nunca quebra a pagina */ }
}

/** Instala os observadores. Retorna funcao de limpeza (uteis em SPA/hidratação). */
export function initEngagement(opts: EngagementOptions): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};
  if (trackingDisabled()) return () => {};

  const site = opts.site;
  const prefix = opts.keyPrefix || 'eng';
  const path = location.pathname;
  const lang = document.documentElement.lang || 'pt-BR';
  const cleanups: Array<() => void> = [];
  const base = (): Record<string, string | number> => ({ site, path, lang });

  // --- scroll: marcos por pagina/sessao ---------------------------------
  const reached: number[] = [];
  const onScroll = (): void => {
    const pct = scrollPct(window.scrollY, document.documentElement.scrollHeight, window.innerHeight);
    const mark = nextMark(pct, reached);
    if (mark === null) return;
    const key = engagementKey(prefix, 'scroll', `${path}:${mark}`);
    if (!shouldSend(key)) return;
    reached.push(mark);
    markSent(key);
    emit('scroll_depth', { ...base(), pct: mark });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  cleanups.push(() => window.removeEventListener('scroll', onScroll));
  onScroll();

  // --- secoes: tempo de permanencia por bloco ---------------------------
  if (opts.trackSections !== false && typeof IntersectionObserver !== 'undefined') {
    const entered = new Map<Element, number>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const el = e.target;
        const id = el.getAttribute('data-track-section');
        if (!id) continue;
        if (e.isIntersecting) {
          entered.set(el, Date.now());
        } else {
          const t0 = entered.get(el);
          entered.delete(el);
          if (!t0) continue;
          const ms = Date.now() - t0;
          if (ms < 1000) continue; // ruido de passagem rapida
          const key = engagementKey(prefix, 'section', `${path}:${id}`);
          if (!shouldSend(key)) continue;
          markSent(key);
          emit('section_time', { ...base(), section: id, ms });
        }
      }
    }, { threshold: 0.5 });
    document.querySelectorAll('[data-track-section]').forEach((el) => io.observe(el));
    cleanups.push(() => io.disconnect());
  }

  // --- cliques em botoes com data-analytics-id --------------------------
  if (opts.trackClicks !== false) {
    const onClick = (ev: MouseEvent): void => {
      const target = ev.target;
      if (!(target instanceof Element)) return;
      const el = target.closest<HTMLElement>('[data-analytics-id]');
      if (!el) return;
      const id = el.dataset.analyticsId || '';
      if (!id) return;
      const key = engagementKey(prefix, 'click', id);
      if (!shouldSend(key)) return;
      markSent(key);
      const label = (el.dataset.analyticsLabel || el.textContent || '').trim().slice(0, 60);
      emit('ui_click', { ...base(), id, label });
    };
    document.addEventListener('click', onClick, true);
    cleanups.push(() => document.removeEventListener('click', onClick, true));
  }

  // --- tempo de pagina (somente visivel) --------------------------------
  let visibleSince = document.visibilityState === 'visible' ? Date.now() : 0;
  let total = 0;
  const flush = (): void => {
    if (visibleSince) { total += Date.now() - visibleSince; visibleSince = 0; }
    if (total < 1000) return;
    const key = engagementKey(prefix, 'time', path);
    if (!shouldSend(key)) return;
    markSent(key);
    emit('engagement_time', { ...base(), ms: total });
  };
  const onVisibility = (): void => {
    if (document.visibilityState === 'hidden') flush();
    else if (!visibleSince) visibleSince = Date.now();
  };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', flush);
  cleanups.push(() => {
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', flush);
  });

  // --- Web Vitals e erros de JS -----------------------------------------
  if (opts.trackVitals !== false && typeof PerformanceObserver !== 'undefined') {
    try {
      const po = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const name = entry.name.startsWith('largest-contentful-paint') ? 'LCP'
            : entry.name.startsWith('layout-shift') ? 'CLS' : null;
          if (!name) continue;
          const value = name === 'CLS'
            ? Math.round((entry as PerformanceEntry & { hadRecentInput?: boolean }).hadRecentInput ? 0 : (entry as PerformanceEntry & { value?: number }).value! * 1000)
            : Math.round(entry.startTime);
          emit('web_vital', { ...base(), metric: name, value });
        }
      });
      po.observe({ type: 'largest-contentful-paint', buffered: true });
      po.observe({ type: 'layout-shift', buffered: true });
      cleanups.push(() => po.disconnect());
    } catch { /* navegador sem suporte: segue sem vital */ }
  }
  if (opts.trackErrors !== false) {
    const onError = (ev: ErrorEvent): void => {
      const msg = String(ev.message || '').slice(0, 120);
      if (!msg) return;
      emit('js_error', { ...base(), message: msg });
    };
    window.addEventListener('error', onError);
    cleanups.push(() => window.removeEventListener('error', onError));
  }

  return () => cleanups.forEach((fn) => fn());
}
