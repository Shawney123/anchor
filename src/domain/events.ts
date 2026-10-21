import type { Anchor, Group, Policy, Settings } from './types'

/**
 * 事件日志：append-only。所有状态都由事件重放投影得出。
 * 这让「崩塌后重建不丢熟练度」「判例永久性」「栈式回滚」成为结构性保证。
 */

export type ExtinguishCause = 'violation' | 'parent' | 'group' | 'manual' | 'expiry'

export interface BaseEvent {
  ts: number
}

export type AnchorEvent =
  | (BaseEvent & { type: 'anchor.create'; payload: Anchor })
  | (BaseEvent & { type: 'anchor.update'; payload: { anchorId: string; patch: Partial<Anchor> } })

export type ChainEvent =
  | (BaseEvent & {
      type: 'chain.create'
      payload: {
        chainId: string
        anchorId: string
        taskText: string
        criterion: string
        focusMinutes: number
      }
    })
  | (BaseEvent & { type: 'chain.start'; payload: { chainId: string } })
  | (BaseEvent & { type: 'chain.node'; payload: { chainId: string; durationMs: number } })
  | (BaseEvent & { type: 'chain.end'; payload: { chainId: string; nodeCount: number } })
  | (BaseEvent & { type: 'chain.reset'; payload: { chainId: string; reason: 'violation' } })

export type BookingEvent =
  | (BaseEvent & {
      type: 'booking.create'
      payload: { bookingId: string; chainId: string; delayMs: number; signal: string }
    })
  | (BaseEvent & { type: 'booking.immediate'; payload: { bookingId: string } })
  | (BaseEvent & { type: 'booking.defer'; payload: { bookingId: string } })
  | (BaseEvent & { type: 'booking.missed'; payload: { bookingId: string } })

export type PrecedentEvent =
  | (BaseEvent & { type: 'precedent.grant'; payload: { behaviorKey: string; chainId?: string } })
  | (BaseEvent & { type: 'precedent.log'; payload: { behaviorKey: string; chainId?: string } })
  | (BaseEvent & { type: 'precedent.resetAll'; payload: { before: string[] } })

export type PolicyEvent =
  | (BaseEvent & { type: 'policy.create'; payload: Policy })
  | (BaseEvent & { type: 'policy.light'; payload: { policyId: string; parentId?: string | null } })
  | (BaseEvent & {
      type: 'policy.extinguish'
      payload: { policyId: string; cause: ExtinguishCause }
    })
  | (BaseEvent & { type: 'policy.freeze'; payload: { policyId: string; until: number } })
  | (BaseEvent & { type: 'policy.thaw'; payload: { policyId: string; satisfied: boolean } })
  | (BaseEvent & { type: 'policy.update'; payload: { policyId: string; patch: Partial<Policy> } })
  | (BaseEvent & { type: 'policy.delete'; payload: { policyId: string } })

export type GroupEvent =
  | (BaseEvent & { type: 'group.create'; payload: Group })
  | (BaseEvent & {
      type: 'group.membership'
      payload: { groupId: string; policyId: string }
    })

export type SystemEvent =
  | (BaseEvent & { type: 'review.set'; payload: { date: string; text: string } })
  | (BaseEvent & { type: 'settings.update'; payload: Partial<Settings> })

export type AnchorEventType = AnchorEvent | ChainEvent | BookingEvent | PrecedentEvent | PolicyEvent | GroupEvent | SystemEvent

export type EventType = AnchorEventType['type']

/** 落库形态：事件 + IndexedDB 自增主键 */
export type StoredEvent = AnchorEventType & { seq?: number }

export type NewEvent =
  | Omit<AnchorEvent, 'ts'> & { ts?: number }
  | Omit<ChainEvent, 'ts'> & { ts?: number }
  | Omit<BookingEvent, 'ts'> & { ts?: number }
  | Omit<PrecedentEvent, 'ts'> & { ts?: number }
  | Omit<PolicyEvent, 'ts'> & { ts?: number }
  | Omit<GroupEvent, 'ts'> & { ts?: number }
  | Omit<SystemEvent, 'ts'> & { ts?: number }

/** 按本地日期（YYYY-MM-DD）分组，用于「每日只点亮一个」的硬约束 */
export function dayKey(ts: number): string {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}
