import type { StoredEvent } from '../domain/events'
import type { Projection } from '../domain/projection'

export const EXPORT_VERSION = 1

export interface ExportFile {
  app: 'anchor'
  v: number
  exportedAt: number
  events: StoredEvent[]
}

export function buildExport(events: StoredEvent[]): ExportFile {
  return {
    app: 'anchor',
    v: EXPORT_VERSION,
    exportedAt: Date.now(),
    events,
  }
}

export function serializeExport(events: StoredEvent[]): string {
  return JSON.stringify(buildExport(events), null, 2)
}

export interface ImportResult {
  ok: boolean
  events: StoredEvent[]
  error?: string
  count?: number
}

export function parseImport(text: string): ImportResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, events: [], error: '不是合法的 JSON 文件' }
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, events: [], error: '文件内容不是对象' }
  }
  const file = parsed as Partial<ExportFile>
  if (file.app !== 'anchor') {
    return { ok: false, events: [], error: '这不是 Anchor 的备份文件' }
  }
  if (typeof file.v !== 'number' || file.v > EXPORT_VERSION) {
    return { ok: false, events: [], error: `备份版本 ${String(file.v)} 高于当前支持的 ${EXPORT_VERSION}` }
  }
  if (!Array.isArray(file.events)) {
    return { ok: false, events: [], error: '备份文件缺少事件列表' }
  }
  const events: StoredEvent[] = []
  for (const e of file.events) {
    if (!e || typeof e !== 'object') continue
    const ev = e as StoredEvent
    if (typeof ev.type !== 'string' || typeof ev.ts !== 'number') continue
    if (!ev.payload || typeof ev.payload !== 'object') continue
    events.push(ev)
  }
  if (!events.length) {
    return { ok: false, events: [], error: '备份文件里没有可恢复的事件' }
  }
  return { ok: true, events, count: events.length }
}

export function downloadText(filename: string, text: string, mime = 'application/json'): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function exportFilename(now = new Date()): string {
  const pad = (n: number) => `${n}`.padStart(2, '0')
  return `anchor-backup-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.json`
}

/** 备份状态：用于设置页提醒用户定期导出 */
export function backupAgeDays(lastExportAt: number | null, now = Date.now()): number | null {
  if (!lastExportAt) return null
  return Math.floor((now - lastExportAt) / 86_400_000)
}

export function summarize(projection: Projection): string {
  const lit = Object.values(projection.policies).filter((p) => p.state === 'lit').length
  const out = Object.values(projection.policies).filter((p) => p.state === 'out').length
  const nodes = Object.values(projection.chains).reduce((s, c) => s + c.completedNodes, 0)
  return `国策 ${lit} 点亮 / ${out} 熄灭 · 专注节点累计 ${nodes} · 永久豁免 ${Object.keys(projection.allowedBehaviors).length} 条`
}
