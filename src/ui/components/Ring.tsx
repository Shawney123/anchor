import type { ReactNode } from 'react'

export function Ring({
  progress,
  size = 148,
  stroke = 8,
  color = 'var(--accent)',
  trackColor = 'var(--surface-3)',
  children,
}: {
  /** 0-1 */
  progress: number
  size?: number
  stroke?: number
  color?: string
  trackColor?: string
  children?: ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(1, progress))
  return (
    <div className="a-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true">
        <circle
          className="a-ring-track"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          stroke={trackColor}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          stroke={color}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.2,0,0,1)' }}
        />
      </svg>
      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  )
}

/** 熟练度细环：树节点角标用 */
export function MiniRing({ progress, size = 22, stroke = 2 }: { progress: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(1, progress))
  const done = clamped >= 1
  return (
    <div className="a-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          stroke={done ? 'var(--success)' : 'var(--surface-3)'}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          stroke={done ? 'var(--success)' : 'var(--accent)'}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.2,0,0,1)' }}
        />
      </svg>
    </div>
  )
}
