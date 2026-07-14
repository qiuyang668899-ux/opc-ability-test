export type HOSTheme = 'warm-jade' | 'morning-mist' | 'apricot-sun'

export interface ThemeOption {
  id: HOSTheme
  name: string
  en: string
  description: string
  swatches: [string, string, string]
}

export const THEME_STORAGE_KEY = 'hos_visual_theme'
export const DEFAULT_THEME: HOSTheme = 'warm-jade'

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'warm-jade',
    name: '暖玉原版',
    en: 'Warm Jade',
    description: '米白纸感与沉静玉绿，温和、耐看，适合长时间使用。',
    swatches: ['#f7f3ec', '#527d70', '#d9b68f'],
  },
  {
    id: 'morning-mist',
    name: '晨雾青绿',
    en: 'Morning Mist',
    description: '清透雾白与湖水青，呼吸感更强，适合专注与晨间使用。',
    swatches: ['#f2f8f6', '#3e817d', '#a9c9c1'],
  },
  {
    id: 'apricot-sun',
    name: '杏林暖阳',
    en: 'Apricot Sun',
    description: '杏仁纸色与柔暖陶橘，更有亲和力，适合阅读与夜间放松。',
    swatches: ['#fbf4ea', '#b9664f', '#e5b786'],
  },
]

export function isHOSTheme(value: unknown): value is HOSTheme {
  return THEME_OPTIONS.some((theme) => theme.id === value)
}

export function getStoredTheme(): HOSTheme {
  if (typeof window === 'undefined') return DEFAULT_THEME
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isHOSTheme(stored) ? stored : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

export function applyTheme(theme: HOSTheme) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.hosTheme = theme
  document.documentElement.style.colorScheme = 'light'
}

export function saveTheme(theme: HOSTheme) {
  applyTheme(theme)
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // The theme still applies for the current session when storage is unavailable.
  }
}
