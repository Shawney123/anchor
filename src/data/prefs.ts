/** 轻量偏好：只存 UI 偏好与摘要，不存行为数据 */

const KEY_DIAGNOSIS = 'anchor.lastDiagnosis'
const KEY_EXPORT = 'anchor.lastExportAt'
const KEY_ONBOARDED = 'anchor.onboarded'

export interface DiagnosisSummary {
  dailyTitle: string
  weeklyTitle: string
  at: number
}

export function getLastDiagnosis(): DiagnosisSummary | null {
  try {
    const raw = localStorage.getItem(KEY_DIAGNOSIS)
    if (!raw) return null
    return JSON.parse(raw) as DiagnosisSummary
  } catch {
    return null
  }
}

export function setLastDiagnosis(value: DiagnosisSummary): void {
  try {
    localStorage.setItem(KEY_DIAGNOSIS, JSON.stringify(value))
  } catch {
    /* 忽略 */
  }
}

export function getLastExportAt(): number | null {
  try {
    const raw = localStorage.getItem(KEY_EXPORT)
    return raw ? Number(raw) : null
  } catch {
    return null
  }
}

export function setLastExportAt(ts: number): void {
  try {
    localStorage.setItem(KEY_EXPORT, String(ts))
  } catch {
    /* 忽略 */
  }
}

export function isOnboarded(): boolean {
  try {
    return localStorage.getItem(KEY_ONBOARDED) === '1'
  } catch {
    return false
  }
}

export function setOnboarded(): void {
  try {
    localStorage.setItem(KEY_ONBOARDED, '1')
  } catch {
    /* 忽略 */
  }
}

/* ── 主题 ── */

export type ThemePref = 'system' | 'dark' | 'light'

const KEY_THEME = 'anchor.theme'

export function getTheme(): ThemePref {
  try {
    const raw = localStorage.getItem(KEY_THEME)
    return raw === 'dark' || raw === 'light' ? raw : 'system'
  } catch {
    return 'system'
  }
}

export function applyTheme(pref: ThemePref): void {
  try {
    localStorage.setItem(KEY_THEME, pref)
  } catch {
    /* 忽略 */
  }
  if (typeof document === 'undefined') return
  if (pref === 'system') {
    delete document.documentElement.dataset.theme
  } else {
    document.documentElement.dataset.theme = pref
  }
  const meta = document.querySelector('meta[name="theme-color"]:not([media])')
  const dark = pref === 'dark' || (pref === 'system' && !matchDark())
  meta?.setAttribute('content', dark ? '#0B0E14' : '#FBFAF7')
}

function matchDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}
