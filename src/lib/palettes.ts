// ========================================
// LifeLog — Paletas de Cores
// 6 paletas com cores dark e light mode
// ========================================

export interface Palette {
  id: string
  name: string
  icon: string
  accentDark: string
  accentLight: string
  borderDark: string
  borderLight: string
  glowDark: string
  glowLight: string
  tagBg: string
  particleColorDark: string
  particleColorLight: string
  auraDark: string
  auraLight: string
  cardShadowDark: string
  cardShadowLight: string
}

export const PALETTES: Palette[] = [
  {
    id: "purple",   name: "Roxo",     icon: "🟣",
    accentDark: "#a78bfa",  accentLight: "#7c3aed",
    borderDark: "rgba(167, 139, 250, 0.25)",  borderLight: "rgba(124, 58, 237, 0.2)",
    glowDark: "0 0 30px rgba(167, 139, 250, 0.15)", glowLight: "0 4px 24px rgba(124, 58, 237, 0.12)",
    tagBg: "rgba(167, 139, 250, 0.12)",
    particleColorDark: "rgba(200, 180, 255, 0.6)", particleColorLight: "rgba(124, 58, 237, 0.15)",
    auraDark: "radial-gradient(ellipse at 30% 20%, rgba(167, 139, 250, 0.06) 0%, transparent 60%)",
    auraLight: "radial-gradient(ellipse at 80% 10%, rgba(124, 58, 237, 0.04) 0%, transparent 50%)",
    cardShadowDark: "0 8px 32px rgba(167, 139, 250, 0.06)", cardShadowLight: "0 4px 16px rgba(124, 58, 237, 0.06)",
  },
  {
    id: "cyan",     name: "Ciano",    icon: "🩵",
    accentDark: "#22d3ee",  accentLight: "#0891b2",
    borderDark: "rgba(34, 211, 238, 0.25)",  borderLight: "rgba(8, 145, 178, 0.2)",
    glowDark: "0 0 30px rgba(34, 211, 238, 0.15)", glowLight: "0 4px 24px rgba(8, 145, 178, 0.12)",
    tagBg: "rgba(34, 211, 238, 0.12)",
    particleColorDark: "rgba(150, 230, 255, 0.6)", particleColorLight: "rgba(8, 145, 178, 0.15)",
    auraDark: "radial-gradient(ellipse at 20% 30%, rgba(34, 211, 238, 0.06) 0%, transparent 60%)",
    auraLight: "radial-gradient(ellipse at 70% 15%, rgba(8, 145, 178, 0.04) 0%, transparent 50%)",
    cardShadowDark: "0 8px 32px rgba(34, 211, 238, 0.06)", cardShadowLight: "0 4px 16px rgba(8, 145, 178, 0.06)",
  },
  {
    id: "emerald",  name: "Verde",    icon: "🟢",
    accentDark: "#34d399",  accentLight: "#059669",
    borderDark: "rgba(52, 211, 153, 0.25)", borderLight: "rgba(5, 150, 105, 0.2)",
    glowDark: "0 0 30px rgba(52, 211, 153, 0.15)", glowLight: "0 4px 24px rgba(5, 150, 105, 0.12)",
    tagBg: "rgba(52, 211, 153, 0.12)",
    particleColorDark: "rgba(150, 240, 200, 0.6)", particleColorLight: "rgba(5, 150, 105, 0.15)",
    auraDark: "radial-gradient(ellipse at 40% 20%, rgba(52, 211, 153, 0.05) 0%, transparent 60%)",
    auraLight: "radial-gradient(ellipse at 60% 10%, rgba(5, 150, 105, 0.04) 0%, transparent 50%)",
    cardShadowDark: "0 8px 32px rgba(52, 211, 153, 0.06)", cardShadowLight: "0 4px 16px rgba(5, 150, 105, 0.06)",
  },
  {
    id: "amber",    name: "Âmbar",    icon: "🟡",
    accentDark: "#fbbf24",  accentLight: "#d97706",
    borderDark: "rgba(251, 191, 36, 0.25)",  borderLight: "rgba(217, 119, 6, 0.2)",
    glowDark: "0 0 30px rgba(251, 191, 36, 0.15)", glowLight: "0 4px 24px rgba(217, 119, 6, 0.12)",
    tagBg: "rgba(251, 191, 36, 0.12)",
    particleColorDark: "rgba(255, 220, 150, 0.6)", particleColorLight: "rgba(217, 119, 6, 0.15)",
    auraDark: "radial-gradient(ellipse at 50% 30%, rgba(251, 191, 36, 0.05) 0%, transparent 60%)",
    auraLight: "radial-gradient(ellipse at 85% 10%, rgba(217, 119, 6, 0.06) 0%, transparent 50%)",
    cardShadowDark: "0 8px 32px rgba(251, 191, 36, 0.06)", cardShadowLight: "0 4px 16px rgba(217, 119, 6, 0.06)",
  },
  {
    id: "rose",     name: "Rosa",     icon: "🩷",
    accentDark: "#fb7185",  accentLight: "#e11d48",
    borderDark: "rgba(251, 113, 133, 0.25)", borderLight: "rgba(225, 29, 72, 0.2)",
    glowDark: "0 0 30px rgba(251, 113, 133, 0.15)", glowLight: "0 4px 24px rgba(225, 29, 72, 0.12)",
    tagBg: "rgba(251, 113, 133, 0.12)",
    particleColorDark: "rgba(255, 180, 200, 0.6)", particleColorLight: "rgba(225, 29, 72, 0.12)",
    auraDark: "radial-gradient(ellipse at 30% 40%, rgba(251, 113, 133, 0.05) 0%, transparent 60%)",
    auraLight: "radial-gradient(ellipse at 75% 15%, rgba(225, 29, 72, 0.04) 0%, transparent 50%)",
    cardShadowDark: "0 8px 32px rgba(251, 113, 133, 0.06)", cardShadowLight: "0 4px 16px rgba(225, 29, 72, 0.06)",
  },
  {
    id: "blue",     name: "Azul",     icon: "🔵",
    accentDark: "#60a5fa",  accentLight: "#2563eb",
    borderDark: "rgba(96, 165, 250, 0.25)", borderLight: "rgba(37, 99, 235, 0.2)",
    glowDark: "0 0 30px rgba(96, 165, 250, 0.15)", glowLight: "0 4px 24px rgba(37, 99, 235, 0.12)",
    tagBg: "rgba(96, 165, 250, 0.12)",
    particleColorDark: "rgba(160, 200, 255, 0.6)", particleColorLight: "rgba(37, 99, 235, 0.15)",
    auraDark: "radial-gradient(ellipse at 25% 25%, rgba(96, 165, 250, 0.05) 0%, transparent 60%)",
    auraLight: "radial-gradient(ellipse at 65% 10%, rgba(37, 99, 235, 0.04) 0%, transparent 50%)",
    cardShadowDark: "0 8px 32px rgba(96, 165, 250, 0.06)", cardShadowLight: "0 4px 16px rgba(37, 99, 235, 0.06)",
  },
]

export const DEFAULT_PALETTE = "purple"
export const STORAGE_PALETTE_KEY = "lifelog-palette"

/** Get palette by id, fallback to default */
export function getPaletteById(id: string): Palette {
  return PALETTES.find(p => p.id === id) ?? PALETTES.find(p => p.id === DEFAULT_PALETTE)!
}

/** Get saved palette id from localStorage */
export function getSavedPaletteId(): string {
  try {
    const saved = localStorage.getItem(STORAGE_PALETTE_KEY)
    if (saved && PALETTES.some(p => p.id === saved)) return saved
  } catch {}
  return DEFAULT_PALETTE
}

/** Save palette id to localStorage */
export function savePaletteId(id: string) {
  try { localStorage.setItem(STORAGE_PALETTE_KEY, id) } catch {}
}

/** Apply palette CSS variables onto document root */
export function applyPalette(palette: Palette, isDark: boolean) {
  const root = document.documentElement
  const accent = isDark ? palette.accentDark : palette.accentLight
  const border = isDark ? palette.borderDark : palette.borderLight
  const glow = isDark ? palette.glowDark : palette.glowLight

  root.style.setProperty("--color-accent", accent)
  root.style.setProperty("--color-accent-soft", accent.replace(")", ", 0.1)").replace("rgb", "rgba"))
  root.style.setProperty("--color-glow", glow)
  root.style.setProperty("--color-border", border)
}
