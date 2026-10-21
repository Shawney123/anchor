import { useEffect, useState } from 'react'

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

/** 触感反馈：只在崩塌、熟练度满、结算完成三处使用 */
export function haptic(pattern: number | number[] = 12): void {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return
  try {
    navigator.vibrate(pattern)
  } catch {
    /* 静默失败 */
  }
}

/** 是否为低端机：用于动效降级 */
export function isLowEndDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const nav = navigator as Navigator & { deviceMemory?: number; hardwareConcurrency?: number }
  if (nav.deviceMemory !== undefined && nav.deviceMemory <= 4) return true
  if (nav.hardwareConcurrency !== undefined && nav.hardwareConcurrency <= 4) return true
  return false
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function fmtDuration(ms: number): string {
  if (ms < 0) ms = 0
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}:${`${m}`.padStart(2, '0')}:${`${s}`.padStart(2, '0')}`
  return `${m}:${`${s}`.padStart(2, '0')}`
}

export function fmtClock(ts: number): string {
  const d = new Date(ts)
  return `${`${d.getHours()}`.padStart(2, '0')}:${`${d.getMinutes()}`.padStart(2, '0')}`
}

export function fmtDateLabel(ts = Date.now()): string {
  const d = new Date(ts)
  const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]
  return `${d.getMonth() + 1}月${d.getDate()}日 ${week}`
}

/** 每秒滴答的时钟，用于倒计时 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

export function relativeTime(ts: number, now = Date.now()): string {
  const diff = now - ts
  const min = Math.floor(diff / 60_000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} 小时前`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d} 天前`
  return `${Math.floor(d / 30)} 个月前`
}

/** 简易中文分句，用于摘要展示 */
export function firstSentence(text: string, max = 60): string {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}
