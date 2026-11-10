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
