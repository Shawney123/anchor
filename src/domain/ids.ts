let counter = 0

/** 短 ID：时间戳 + 自增 + 随机，足以在本地事件日志中唯一定位 */
export function uid(prefix = 'id'): string {
  counter = (counter + 1) % 1_000_000
  const t = Date.now().toString(36)
  const c = counter.toString(36).padStart(4, '0')
  const r = Math.random().toString(36).slice(2, 6)
  return `${prefix}_${t}${c}${r}`
}
