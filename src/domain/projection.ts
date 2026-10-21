import type { AnchorEventType, ExtinguishCause, StoredEvent } from './events'
import { dayKey } from './events'
import type { Anchor, Group, Policy, Settings } from './types'
import { DEFAULT_SETTINGS } from './types'

/* ──────────────────────────  投影状态结构  ────────────────────────── */

export interface ChainState {
  id: string
  anchorId: string
  taskText: string
  criterion: string
  focusMinutes: number
  status: 'idle' | 'active' | 'ended'
  startedAt?: number
  endedAt?: number
  /** 已完成的专注节点数 */
  completedNodes: number
  /** 被判定违规而清零的次数 */
  resets: number
  nodes: { no: number; durationMs: number; at: number }[]
}

export interface BookingState {
  id: string
  chainId: string
  delayMs: number
  signal: string
  createdAt: number
  dueAt: number
  status: 'pending' | 'immediate' | 'deferred' | 'missed' | 'done'
  deferCount: number
}

export interface PolicyState {
  policy: Policy
  /** candidate 未点亮 / lit 点亮 / out 熄灭 / frozen 冻结 */
  state: 'candidate' | 'lit' | 'out' | 'frozen'
  /** 累计成功点亮天数 */
  litCount: number
  /** 基础等级：由累计天数推导 */
  baseLevel: number
  /** 自身违规扣级次数 */
  ownViolations: number
  /** 有效等级 = baseLevel - ownViolations，0 即熄灭 */
  level: number
  /** 熟练度 0-100，跨崩塌保留 */
  habituation: number
  lastLitAt?: number
  /** 最近一次自身违规的时间 */
  lastViolationAt?: number
  extinguishCause?: ExtinguishCause
}

export interface GroupState {
  group: Group
  memberIds: string[]
  outCount: number
  state: 'lit' | 'out'
}

export interface AllowanceLogEntry {
  behaviorKey: string
  at: number
  chainId?: string
}

export interface Projection {
  today: string
  anchors: Record<string, Anchor>
  chains: Record<string, ChainState>
  activeChainId: string | null
  bookings: Record<string, BookingState>
  activeBookingId: string | null
  /** 永久豁免表：behaviorKey -> 授予时间。不可单条撤销。 */
  allowedBehaviors: Record<string, number>
  /** 今日放行记录 */
  allowanceLog: AllowanceLogEntry[]
  policies: Record<string, PolicyState>
  groups: Record<string, GroupState>
  settings: Settings
  reviews: Record<string, string>
  /** 今日点亮的国策 id（硬上限 1） */
  litToday: string[]
}

export function emptyProjection(now: number = Date.now()): Projection {
  return {
    today: dayKey(now),
    anchors: {},
    chains: {},
    activeChainId: null,
    bookings: {},
    activeBookingId: null,
    allowedBehaviors: {},
    allowanceLog: [],
    policies: {},
    groups: {},
    settings: { ...DEFAULT_SETTINGS },
    reviews: {},
    litToday: [],
  }
}

/* ──────────────────────────  工具  ────────────────────────── */

export const MAX_LEVEL = 3
/** 每累计 7 天成功点亮提升一级 */
export const LEVEL_STEP = 7
/** 每 5 天成功点亮增加 5% 熟练度 */
export const HABITUATION_STEP = 5

export function baseLevelOf(litCount: number): number {
  if (litCount <= 0) return 0
  return Math.min(MAX_LEVEL, 1 + Math.floor(litCount / LEVEL_STEP))
}

export function habituationOf(litCount: number): number {
  return Math.min(100, litCount * HABITUATION_STEP)
}

/* ──────────────────────────  事件应用  ────────────────────────── */

export function applyEvent(p: Projection, e: AnchorEventType): void {
  switch (e.type) {
    case 'anchor.create':
      p.anchors[e.payload.id] = e.payload
      break

    case 'anchor.update': {
      const a = p.anchors[e.payload.anchorId]
      if (a) p.anchors[e.payload.anchorId] = { ...a, ...e.payload.patch }
      break
    }

    case 'chain.create':
      p.chains[e.payload.chainId] = {
        id: e.payload.chainId,
        anchorId: e.payload.anchorId,
        taskText: e.payload.taskText,
        criterion: e.payload.criterion,
        focusMinutes: e.payload.focusMinutes,
        status: 'idle',
        completedNodes: 0,
        resets: 0,
        nodes: [],
      }
      break

    case 'chain.start': {
      const c = p.chains[e.payload.chainId]
      if (!c) break
      c.status = 'active'
      c.startedAt = e.ts
      c.endedAt = undefined
      p.activeChainId = c.id
      break
    }

    case 'chain.node': {
      const c = p.chains[e.payload.chainId]
      if (!c) break
      c.completedNodes += 1
      c.nodes.push({ no: c.completedNodes, durationMs: e.payload.durationMs, at: e.ts })
      break
    }

    case 'chain.end': {
      const c = p.chains[e.payload.chainId]
      if (!c) break
      c.status = 'ended'
      c.endedAt = e.ts
      if (p.activeChainId === c.id) p.activeChainId = null
      break
    }

    case 'chain.reset': {
      const c = p.chains[e.payload.chainId]
      if (!c) break
      // 一损俱损：节点清零，从 #1 重新开始（熟练度与判例不受影响）
      c.completedNodes = 0
      c.resets += 1
      break
    }

    case 'booking.create':
      p.bookings[e.payload.bookingId] = {
        id: e.payload.bookingId,
        chainId: e.payload.chainId,
        delayMs: e.payload.delayMs,
        signal: e.payload.signal,
        createdAt: e.ts,
        dueAt: e.ts + e.payload.delayMs,
        status: 'pending',
        deferCount: 0,
      }
      p.activeBookingId = e.payload.bookingId
      break

    case 'booking.immediate': {
      const b = p.bookings[e.payload.bookingId]
      if (b) b.status = 'immediate'
      break
    }

    case 'booking.defer': {
      const b = p.bookings[e.payload.bookingId]
      if (b) {
        b.deferCount += 1
        b.dueAt = e.ts + 5 * 60_000
        b.status = 'deferred'
      }
      break
    }

    case 'booking.missed': {
      const b = p.bookings[e.payload.bookingId]
      if (b) b.status = 'missed'
      if (p.activeBookingId === b?.id) p.activeBookingId = null
      break
    }

    case 'precedent.grant':
      // 永久豁免：写入即生效，全局作用于所有链，无单条撤销路径
      p.allowedBehaviors[e.payload.behaviorKey] = e.ts
      p.allowanceLog.push({ behaviorKey: e.payload.behaviorKey, at: e.ts, chainId: e.payload.chainId })
      break

    case 'precedent.log':
      p.allowanceLog.push({ behaviorKey: e.payload.behaviorKey, at: e.ts, chainId: e.payload.chainId })
      break

    case 'precedent.resetAll':
      // 全局重置是唯一出口：代价是所有判定标准收紧，可能引发连锁崩塌
      for (const key of e.payload.before) delete p.allowedBehaviors[key]
      break

    case 'policy.create':
      p.policies[e.payload.id] = {
        policy: e.payload,
        state: 'candidate',
        litCount: 0,
        baseLevel: 0,
        ownViolations: 0,
        level: 0,
        habituation: 0,
      }
      break

    case 'policy.light': {
      const ps = p.policies[e.payload.policyId]
      if (!ps) break
      ps.litCount += 1
      ps.ownViolations = 0
      ps.lastLitAt = e.ts
      ps.extinguishCause = undefined
      ps.policy.parentId = e.payload.parentId ?? ps.policy.parentId ?? null
      // 每日一点亮的硬约束：一天最多一个节点进入树
      if (dayKey(e.ts) === p.today && p.litToday.length === 0) {
        p.litToday.push(ps.policy.id)
      }
      break
    }

    case 'policy.extinguish': {
      const ps = p.policies[e.payload.policyId]
      if (!ps) break
      if (e.payload.cause === 'violation') {
        // 自身违规不直接熄灭：先扣一级，扣到 L0 才熄灭
        ps.ownViolations += 1
        ps.lastViolationAt = e.ts
      } else {
        ps.extinguishCause = e.payload.cause
      }
      break
    }

    case 'policy.freeze': {
      const ps = p.policies[e.payload.policyId]
      if (ps) ps.state = 'frozen'
      break
    }

    case 'policy.thaw': {
      const ps = p.policies[e.payload.policyId]
      if (!ps) break
      if (e.payload.satisfied) {
        ps.extinguishCause = undefined
        ps.ownViolations = 0
        ps.state = 'lit'
      } else {
        ps.extinguishCause = 'expiry'
        ps.state = 'out'
      }
      break
    }

    case 'policy.update': {
      const ps = p.policies[e.payload.policyId]
      if (ps) ps.policy = { ...ps.policy, ...e.payload.patch }
      break
    }

    case 'policy.delete':
      delete p.policies[e.payload.policyId]
      break

    case 'group.create':
      p.groups[e.payload.id] = {
        group: e.payload,
        memberIds: [],
        outCount: 0,
        state: 'lit',
      }
      break

    case 'group.membership': {
      const g = p.groups[e.payload.groupId]
      if (g && !g.memberIds.includes(e.payload.policyId)) g.memberIds.push(e.payload.policyId)
      break
    }

    case 'review.set':
      p.reviews[e.payload.date] = e.payload.text
      break

    case 'settings.update':
      p.settings = { ...p.settings, ...e.payload }
      break
  }
}

/* ──────────────────────────  派生量重算  ────────────────────────── */

/**
 * 重算等级、熟练度、级联熄灭与组容错。
 * 必须在每次事件后调用 —— 树结构与组容错都是跨节点的派生关系。
 */
export function recomputeDerived(p: Projection): void {
  const policies = p.policies

  // 1) 基础等级、熟练度、有效等级
  for (const ps of Object.values(policies)) {
    ps.baseLevel = baseLevelOf(ps.litCount)
    ps.habituation = habituationOf(ps.litCount)
    ps.level = Math.max(0, ps.baseLevel - ps.ownViolations)
  }

  // 2) 直接熄灭：硬性原因（手动放回 / 冻结到期），或有效等级被违规扣到 0
  const directOut = new Map<string, ExtinguishCause | undefined>()
  for (const ps of Object.values(policies)) {
    const hard = ps.extinguishCause
    if (hard === 'manual' || hard === 'expiry') {
      directOut.set(ps.policy.id, hard)
    } else if (ps.litCount > 0 && ps.level === 0) {
      // 分级降级的下限：扣到 L0 才算熄灭
      directOut.set(ps.policy.id, 'violation')
    } else {
      directOut.set(ps.policy.id, undefined)
    }
  }

  // 3) 组容错：组内直接熄灭数超过容错名额 → 整组熄灭
  const groupOut = new Map<string, boolean>()
  for (const g of Object.values(p.groups)) {
    const out = g.memberIds.filter((id) => directOut.get(id)).length
    g.outCount = out
    g.state = out > g.group.faultTolerance ? 'out' : 'lit'
    groupOut.set(g.group.id, g.state === 'out')
  }

  // 4) 父节点级联：父熄灭 → 子孙熄灭
  const childrenOf = new Map<string, string[]>()
  for (const ps of Object.values(policies)) {
    const parent = ps.policy.parentId
    if (!parent) continue
    const arr = childrenOf.get(parent) ?? []
    arr.push(ps.policy.id)
    childrenOf.set(parent, arr)
  }

  const cascadeOut = new Map<string, ExtinguishCause>()
  const visit = (id: string) => {
    for (const child of childrenOf.get(id) ?? []) {
      cascadeOut.set(child, 'parent')
      visit(child)
    }
  }
  for (const [id, cause] of directOut) {
    if (cause) visit(id)
  }
  for (const g of Object.values(p.groups)) {
    if (!groupOut.get(g.group.id)) continue
    for (const id of g.memberIds) {
      if (directOut.get(id)) continue
      cascadeOut.set(id, 'group')
      visit(id)
    }
  }

  // 5) 最终状态
  for (const ps of Object.values(policies)) {
    const id = ps.policy.id
    const own = directOut.get(id)
    const cascaded = cascadeOut.get(id)
    const groupFailed = ps.policy.groupId ? groupOut.get(ps.policy.groupId) : false

    if (ps.state === 'frozen') continue

    if (own) {
      ps.state = 'out'
      ps.extinguishCause = own
    } else if (cascaded) {
      ps.state = 'out'
      ps.extinguishCause = cascaded
    } else if (groupFailed) {
      ps.state = 'out'
      ps.extinguishCause = 'group'
    } else if (ps.litCount > 0 && ps.level === 0) {
      // 分级降级的下限：有效等级归零才算熄灭
      ps.state = 'out'
      ps.extinguishCause = ps.extinguishCause ?? 'violation'
    } else if (ps.litCount > 0) {
      ps.state = 'lit'
      ps.extinguishCause = undefined
    } else {
      ps.state = 'candidate'
    }
  }
}

/* ──────────────────────────  便捷入口  ────────────────────────── */

export function projectEvents(events: StoredEvent[], now: number = Date.now()): Projection {
  const p = emptyProjection(now)
  for (const e of events) applyEvent(p, e)
  recomputeDerived(p)
  return p
}

/** 找到当前进行中的链 */
export function currentChain(p: Projection): ChainState | null {
  if (p.activeChainId && p.chains[p.activeChainId]?.status === 'active') {
    return p.chains[p.activeChainId]
  }
  const actives = Object.values(p.chains).filter((c) => c.status === 'active')
  if (!actives.length) return null
  actives.sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0))
  return actives[0]
}

/** 找到当前待触发的预约 */
export function currentBooking(p: Projection): BookingState | null {
  const candidates = Object.values(p.bookings).filter(
    (b) => b.status === 'pending' || b.status === 'deferred' || b.status === 'immediate',
  )
  if (!candidates.length) return null
  candidates.sort((a, b) => b.createdAt - a.createdAt)
  return candidates[0]
}

/** 今日点亮的国策（最多一个） */
export function todayPolicy(p: Projection): PolicyState | null {
  if (!p.litToday.length) return null
  return p.policies[p.litToday[0]] ?? null
}

/** 树的根节点（无 parentId 或 parent 不存在） */
export function rootPolicies(p: Projection): PolicyState[] {
  return Object.values(p.policies).filter(
    (ps) => !ps.policy.parentId || !p.policies[ps.policy.parentId],
  )
}

/** 某国策的全部子孙 */
export function descendantsOf(p: Projection, policyId: string): string[] {
  const out: string[] = []
  const walk = (id: string) => {
    for (const ps of Object.values(p.policies)) {
      if (ps.policy.parentId === id) {
        out.push(ps.policy.id)
        walk(ps.policy.id)
      }
    }
  }
  walk(policyId)
  return out
}
