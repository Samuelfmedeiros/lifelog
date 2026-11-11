// ═══════════════════════════════════════════════
// LifeLog — Consentimento de analytics (LGPD)
// Fonte única da chave e dos valores. Importado
// pelo banner, pelo loader do OpenPanel e pelos
// testes. NUNCA duplicar a string 'lifelog-analytics-consent'
// em outro arquivo: o guard scripts/check-consent-gate.mjs
// depende de existir UM lugar só.
// ═══════════════════════════════════════════════

export const CONSENT_KEY = 'lifelog-analytics-consent'

export type ConsentValue = 'accepted' | 'declined'

/** Lê o consentimento salvo. Storage bloqueado/ausente => null (sem consent). */
export function readConsent(storage: Storage | null | undefined): ConsentValue | null {
  if (!storage) return null
  try {
    const v = storage.getItem(CONSENT_KEY)
    return v === 'accepted' || v === 'declined' ? v : null
  } catch {
    return null
  }
}

/** Persiste a escolha. Storage bloqueado não deve quebrar a página. */
export function writeConsent(storage: Storage | null | undefined, value: ConsentValue): void {
  if (!storage) return
  try {
    storage.setItem(CONSENT_KEY, value)
  } catch {
    /* modo restritivo / cota cheia: a escolha vale só para esta página */
  }
}

/** Remove a escolha — usado pelo link "rever preferências" do footer. */
export function clearConsent(storage: Storage | null | undefined): void {
  if (!storage) return
  try {
    storage.removeItem(CONSENT_KEY)
  } catch {
    /* idem */
  }
}

/** Nome do evento disparado na window quando a escolha muda. */
export const CONSENT_EVENT = 'lifelog-consent'

/**
 * Quantos cliques o botão "Recusar" exige até a recusa valer.
 *
 * Decisão de produto (Samuel, 10/11/2026): o primeiro impulso é recusar no
 * automático; exigir confirmação repetida evita recusa reflexa. O contador é
 * mostrado no próprio botão — sem feedback, o clique "que não faz nada" é
 * lido como bug e o usuário abandona a página.
 *
 * Nota de conformidade: a LGPD exige que recusar seja possível, não que seja
 * imediato. O caminho existe e é anunciado (aria-live); "Aceitar" segue em um
 * clique. Se algum dia a revisão jurídica exigir paridade, este é o número a
 * mudar — e o teste em consent.test.ts quebra junto, de propósito.
 */
export const DECLINE_CLICKS = 6

export interface DeclineStep {
  /** Cliques contabilizados depois desta chamada. */
  count: number
  /** Cliques que ainda faltam (0 quando já recusou). */
  remaining: number
  /** true quando a recusa deve ser efetivada. */
  done: boolean
}

/** Avança um clique na confirmação de recusa. Função pura: sem DOM, sem storage. */
export function declineStep(count: number): DeclineStep {
  const next = (Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0) + 1
  const remaining = Math.max(0, DECLINE_CLICKS - next)
  return { count: next, remaining, done: remaining === 0 }
}
