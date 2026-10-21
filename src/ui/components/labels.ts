import type { PolicyType } from '../../domain/types'

/** 展示用文案与色彩语义（与组件分开，避免 Fast Refresh 失效） */

export const TYPE_LABEL: Record<PolicyType, string> = {
  passive: '被动',
  semi_passive: '半被动',
  active: '主动',
  mechanic: '机制',
}

export const GRADE_LABEL = { high: '高', medium: '中', low: '低' } as const

export function gradeTone(g: 'high' | 'medium' | 'low'): 'accent' | 'info' | 'default' {
  if (g === 'high') return 'accent'
  if (g === 'medium') return 'info'
  return 'default'
}
