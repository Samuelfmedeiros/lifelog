// ═══════════════════════════════════════════════
// LifeLog — i18n Engine
// Works both at build time (SSG) and client side
// ═══════════════════════════════════════════════

import pt from './locales/pt.json'
import en from './locales/en.json'

const LOCALES = { pt, en }

/** Detect locale from URL path — '/en/*' → 'en', else 'pt' */
export function detectLocale(url) {
  return url.pathname.startsWith('/en/') || url.pathname === '/en' ? 'en' : 'pt'
}

/** For Astro components: get locale translations object */
export function getTranslations(locale) {
  return LOCALES[locale] || LOCALES.pt
}

/** Client-side: read locale from <html data-locale> and translate */
export function clientI18n() {
  const root = document.documentElement
  const locale = (root.getAttribute('data-locale') || 'pt')
  const dict = LOCALES[locale] || LOCALES.pt

  // Translate all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n')
    const keys = key.split('.')
    let val = dict
    for (const k of keys) {
      if (val && typeof val === 'object') val = val[k]
      else break
    }
    if (typeof val === 'string') {
      if (el instanceof HTMLInputElement && el.placeholder !== undefined) {
        el.placeholder = val
      } else {
        el.textContent = val
      }
    }
  })

  // Update HTML lang attribute
  root.setAttribute('lang', locale === 'en' ? 'en' : 'pt-BR')
}

/** For building locale-specific paths */
export function localizedPath(path, locale) {
  if (locale === 'pt') return path
  const clean = path.replace(/^\//, '')
  return `/en/${clean}`
}

export { LOCALES }
