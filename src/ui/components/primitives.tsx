import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import { cn } from '../utils'

/* ── 卡片 ── */
export function Card({
  children,
  accent,
  danger,
  flat,
  className,
  onClick,
}: {
  children: ReactNode
  accent?: boolean
  danger?: boolean
  flat?: boolean
  className?: string
  onClick?: () => void
}) {
  const cls = cn(
    'a-card',
    accent && 'a-card--accent',
    danger && 'a-card--danger',
    flat && 'a-card--flat',
    className,
  )
  if (onClick) {
    return (
      <button type="button" className={cls} style={{ textAlign: 'left', width: '100%' }} onClick={onClick}>
        {children}
      </button>
    )
  }
  return <div className={cls}>{children}</div>
}

export function CardTitle({ children, extra }: { children: ReactNode; extra?: ReactNode }) {
  return (
    <div className="a-card-title">
      <div className="h3">{children}</div>
      {extra}
    </div>
  )
}

/* ── 按钮 ── */
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'quiet' | 'danger'
  size?: 'md' | 'lg' | 'sm'
  block?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  block,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'a-btn',
        variant !== 'primary' && `a-btn--${variant}`,
        size === 'lg' && 'a-btn--lg',
        size === 'sm' && 'a-btn--sm',
        block && 'a-btn--block',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

export function IconButton({
  label,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} className={cn('a-icon-btn', className)} {...rest}>
      {children}
    </button>
  )
}

/* ── 标签 ── */
export function Chip({
  children,
  tone = 'default',
  className,
}: {
  children: ReactNode
  tone?: 'default' | 'accent' | 'success' | 'danger' | 'info'
  className?: string
}) {
  return (
    <span className={cn('a-chip', tone !== 'default' && `a-chip--${tone}`, className)}>{children}</span>
  )
}

/* ── 分段控件 ── */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="a-seg" role="group">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ── 输入 ── */
export function Field({
  label,
  hint,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string }) {
  return (
    <label className="stack" style={{ gap: 6 }}>
      {label ? <span className="caption">{label}</span> : null}
      <input className={cn('a-field', className)} {...rest} />
      {hint ? <span className="caption text-3">{hint}</span> : null}
    </label>
  )
}

export function TextArea({
  label,
  hint,
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; hint?: string }) {
  return (
    <label className="stack" style={{ gap: 6 }}>
      {label ? <span className="caption">{label}</span> : null}
      <textarea className={cn('a-field', className)} {...rest} />
      {hint ? <span className="caption text-3">{hint}</span> : null}
    </label>
  )
}

/* ── 分隔标签 ── */
export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="a-label upper-label">{children}</div>
}

/* ── 空状态 ── */
export function EmptyState({
  icon,
  title,
  desc,
  action,
}: {
  icon?: ReactNode
  title: string
  desc?: string
  action?: ReactNode
}) {
  return (
    <div className="a-empty">
      {icon}
      <div className="h3" style={{ color: 'var(--text-2)' }}>
        {title}
      </div>
      {desc ? (
        <div className="body-sm" style={{ marginTop: 6 }}>
          {desc}
        </div>
      ) : null}
      {action ? <div style={{ marginTop: 16 }}>{action}</div> : null}
    </div>
  )
}

/* ── 可点击列表行 ── */
export function Row({
  children,
  onClick,
  className,
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
}) {
  if (onClick) {
    return (
      <button type="button" className={cn('a-row', className)} onClick={onClick}>
        {children}
      </button>
    )
  }
  return <div className={cn('a-row', className)}>{children}</div>
}

/* ── 键值行 ── */
export function KV({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="row-between body-sm" style={{ padding: '7px 0' }}>
      <span className="text-2">{k}</span>
      <span style={{ textAlign: 'right' }}>{v}</span>
    </div>
  )
}
