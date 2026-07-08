// ========================================
// LifeLog — Central Project Registry
// ========================================
// Add a new project here, then run `pnpm run build` to verify.
// Also requires: themes.css block + public/patterns/*.svg

export interface ProjectDef {
  id: string
  label: string
  icon: string
  accentDark: string
  group: 'projetos' | 'estudos' | 'descobertas'
}

export const PROJECTS: ProjectDef[] = [
  { id: 'arachne',     label: 'Arachne',    icon: '🕷️', accentDark: '#7c3aed',  group: 'projetos' },
  { id: 'dogwalk',     label: 'Dogwalk',    icon: '🐶',  accentDark: '#22c55e',  group: 'projetos' },
  { id: 'portfolio',   label: 'Portfólio',  icon: '🚀',  accentDark: '#00d4ff',  group: 'projetos' },
  { id: 'capivara',    label: 'Capivara',   icon: '🐷',  accentDark: '#f59e0b',  group: 'projetos' },
  { id: 'tatuengine',  label: 'TatuEngine', icon: '🌊',  accentDark: '#14b8a6',  group: 'projetos' },
  { id: 'estudos',     label: 'Estudos',    icon: '📚',  accentDark: '#3b82f6',  group: 'estudos' },
  { id: 'descobertas', label: 'Descobertas',icon: '💡',  accentDark: '#38bdf8',  group: 'descobertas' },
]

export function getProject(id: string): ProjectDef | undefined {
  return PROJECTS.find(p => p.id === id)
}

/** Runtime-friendly accent map for JS inline scripts */
export const PROJECT_ACCENTS: Record<string, string> = {}
PROJECTS.forEach(p => { PROJECT_ACCENTS[p.id] = p.accentDark })
