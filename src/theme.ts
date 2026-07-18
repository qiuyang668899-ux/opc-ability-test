export type HOSTheme = 'art-bloom' | 'clear-order' | 'apricot-sun' | 'rose-velvet'

export interface ThemeOption {
  id: HOSTheme
  name: string
  en: string
  description: string
  swatches: [string, string, string]
}

export const THEME_STORAGE_KEY = 'hos_visual_theme'
export const DEFAULT_THEME: HOSTheme = 'apricot-sun'

const THEME_META_COLORS: Record<HOSTheme, string> = {
  'art-bloom': '#f4effd',
  'clear-order': '#eef0f2',
  'apricot-sun': '#faf2e7',
  'rose-velvet': '#fff1f6',
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'art-bloom',
    name: '流光艺境',
    en: 'Art Bloom',
    description: '紫罗兰、珊瑚与湖蓝碰撞，造型跳脱，像一本流动的艺术画册。',
    swatches: ['#f4effd', '#7054d6', '#e06a78'],
  },
  {
    id: 'clear-order',
    name: '理性秩序',
    en: 'Clear Order',
    description: '中性灰白与深海军蓝，网格严谨、层级清楚，专注信息本身。',
    swatches: ['#f1f3f4', '#294b5f', '#89949b'],
  },
  {
    id: 'apricot-sun',
    name: '杏林暖阳',
    en: 'Apricot Sun',
    description: '杏仁纸色与柔暖陶橘，更有亲和力，适合阅读与夜间放松。',
    swatches: ['#fbf4ea', '#b9664f', '#e5b786'],
  },
  {
    id: 'rose-velvet',
    name: '蔷薇绒光',
    en: 'Rose Velvet',
    description: '从雾粉、豆沙到深蔷薇的完整粉色体系，柔软治愈，也保留清晰层级与高级质感。',
    swatches: ['#fff1f6', '#b94f79', '#e9a9bd'],
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
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', THEME_META_COLORS[theme])
}

export function saveTheme(theme: HOSTheme) {
  applyTheme(theme)
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // The theme still applies for the current session when storage is unavailable.
  }
}
