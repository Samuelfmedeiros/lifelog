// ═══════════════════════════════════════════════
// LifeLog — loader do OpenPanel condicionado a consentimento
// Contrato: NENHUMA requisição a /api/op antes de consent === 'accepted'.
// Guard de regressão: scripts/check-consent-gate.mjs
// ═══════════════════════════════════════════════
import { CONSENT_EVENT, CONSENT_KEY, readConsent } from './consent'

/** clientId público do OpenPanel (self-host). Público por design — não é segredo. */
const CLIENT_ID = 'a3c3b6a8-a751-461a-88f9-8317f6760360'
const SCRIPT_SRC = '/analytics/op1.js'

type OpFn = ((...args: unknown[]) => void) & { q?: unknown[] }

declare global {
  interface Window {
    op?: OpFn
    __lifelogAnalyticsLoaded?: boolean
  }
}

/** Fila mínima do OpenPanel (mesmo stub oficial) — roda antes do script real chegar. */
function queueStub(): void {
  if (window.op) return
  window.op = (function () {
    const q: unknown[] = []
    const fn = function (...args: unknown[]) {
      if (args.length) q.push(args)
    } as OpFn
    fn.q = q
    return new Proxy(fn, {
      get(target, prop) {
        if (prop === 'q') return q
        return (...args: unknown[]) => {
          q.push([prop, ...args])
        }
      },
      has(target, prop) {
        return prop === 'q'
      },
    }) as OpFn
  })()
}

/** Injeta o script de analytics. Idempotente — chamar 2x não duplica. */
function loadAnalytics(): void {
  if (window.__lifelogAnalyticsLoaded) return
  window.__lifelogAnalyticsLoaded = true

  queueStub()
  window.op!('init', {
    apiUrl: '/api/op',
    clientId: CLIENT_ID,
    trackScreenViews: true,
    trackOutgoingLinks: true,
    trackAttributes: true,
  })

  const s = document.createElement('script')
  s.src = SCRIPT_SRC
  s.defer = true
  s.async = true
  s.setAttribute('data-lifelog-analytics', '')
  document.head.appendChild(s)
}

/** Remove o rastro do OpenPanel quando o titular revoga o consentimento. */
function unloadAnalytics(): void {
  document.querySelectorAll('script[data-lifelog-analytics]').forEach((el) => el.remove())
  delete window.op
  window.__lifelogAnalyticsLoaded = false
}

/**
 * Ponto de entrada único — chamado uma vez por página pelo BaseLayout.
 * Carrega só se já houver consent 'accepted'; depois segue reagindo ao banner.
 */
export function initAnalyticsGate(): void {
  if (readConsent(safeStorage()) === 'accepted') loadAnalytics()

  window.addEventListener(CONSENT_EVENT, (ev) => {
    const detail = (ev as CustomEvent<{ value?: string }>).detail
    if (detail?.value === 'accepted') loadAnalytics()
    else unloadAnalytics()
  })

  // Escolha feita em outra aba do mesmo site
  window.addEventListener('storage', (ev) => {
    if (ev.key !== CONSENT_KEY) return
    if (ev.newValue === 'accepted') loadAnalytics()
    else if (ev.newValue === null || ev.newValue === 'declined') unloadAnalytics()
  })
}

function safeStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}
