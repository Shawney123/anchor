import { useSyncExternalStore } from 'react'
import type { AnchorEventType, NewEvent, StoredEvent } from '../domain/events'
import { dayKey } from '../domain/events'
import { uid } from '../domain/ids'
import {
  emptyProjection,
  projectEvents,
  type Projection,
} from '../domain/projection'
import type { Anchor, Difficulty, Group, Policy, Settings } from '../domain/types'
import {
  appendEvent,
  appendEvents,
  clearEvents,
  clearSnapshot,
  loadEvents,
  saveSnapshot,
} from './db'

type Listener = () => void

const SNAPSHOT_INTERVAL = 400

class AnchorStore {
  private events: StoredEvent[] = []
  private projection: Projection = emptyProjection()
  private listeners = new Set<Listener>()
  private ready = false
  private writes = 0

  /* ── 生命周期 ── */

  async hydrate(): Promise<void> {
    try {
      this.events = await loadEvents()
    } catch {
      this.events = []
    }
    this.projection = projectEvents(this.events)
    this.ready = true
    this.emit()
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = (): Projection => this.projection

  get isReady(): boolean {
    return this.ready
  }

  private emit(): void {
    for (const l of this.listeners) l()
  }

  /** 跨零点时刷新「今天」 */
  refreshDay(): void {
    const today = dayKey(Date.now())
    if (today !== this.projection.today) {
      this.projection = projectEvents(this.events, Date.now())
      this.emit()
    }
  }

  /* ── 写入 ── */

  dispatch(event: NewEvent): void {
    const full = { ...event, ts: event.ts ?? Date.now() } as unknown as StoredEvent
    this.events = [...this.events, full]
    this.projection = projectEvents(this.events)
    this.emit()
    void appendEvent(full)
    this.writes += 1
    if (this.writes % SNAPSHOT_INTERVAL === 0) void this.persistSnapshot()
  }

  dispatchMany(events: NewEvent[]): void {
    if (!events.length) return
    const full = events.map((e) => ({ ...e, ts: e.ts ?? Date.now() }) as unknown as StoredEvent)
    this.events = [...this.events, ...full]
    this.projection = projectEvents(this.events)
    this.emit()
    void appendEvents(full)
  }

  private async persistSnapshot(): Promise<void> {
    try {
      await saveSnapshot({ id: 'current', at: Date.now(), count: this.events.length, events: this.events })
    } catch {
      /* 快照失败不影响主流程 */
    }
  }

  async clearAll(): Promise<void> {
    this.events = []
    this.projection = emptyProjection()
    this.emit()
    await clearEvents()
    await clearSnapshot()
  }

  async importEvents(events: StoredEvent[]): Promise<void> {
    const merged = [...this.events, ...events].sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0))
    this.events = merged
    this.projection = projectEvents(merged)
    this.emit()
    await appendEvents(events)
  }

  /* ── 语义动作 ── */

  createAnchor(name: string, kind: Anchor['kind'], note?: string): string {
    const id = uid('anc')
    const anchor: Anchor = { id, name, kind, note, createdAt: Date.now() }
    this.dispatch({ type: 'anchor.create', payload: anchor })
    return id
  }

  updateSettings(patch: Partial<Settings>): void {
    this.dispatch({ type: 'settings.update', payload: patch })
  }

  setDifficulty(difficulty: Difficulty): void {
    this.updateSettings({ difficulty })
  }

  createPolicy(policy: Omit<Policy, 'id' | 'createdAt'> & { id?: string }): string {
    const id = policy.id ?? uid('pol')
    const full: Policy = { ...policy, id, createdAt: Date.now() }
    this.dispatch({ type: 'policy.create', payload: full })
    return id
  }

  /** 每日点亮硬上限 1 */
  canLightToday(): boolean {
    return this.projection.litToday.length === 0
  }

  lightPolicy(policyId: string, parentId?: string | null): boolean {
    if (!this.canLightToday()) return false
    this.dispatch({ type: 'policy.light', payload: { policyId, parentId } })
    return true
  }

  extinguishPolicy(policyId: string, cause: 'violation' | 'manual' | 'expiry'): void {
    this.dispatch({ type: 'policy.extinguish', payload: { policyId, cause } })
  }

  updatePolicy(policyId: string, patch: Partial<Policy>): void {
    this.dispatch({ type: 'policy.update', payload: { policyId, patch } })
  }

  deletePolicy(policyId: string): void {
    this.dispatch({ type: 'policy.delete', payload: { policyId } })
  }

  createGroup(name: string, faultTolerance: number): string {
    const id = uid('grp')
    const group: Group = { id, name, faultTolerance, createdAt: Date.now() }
    this.dispatch({ type: 'group.create', payload: group })
    return id
  }

  addGroupMember(groupId: string, policyId: string): void {
    this.dispatch({ type: 'group.membership', payload: { groupId, policyId } })
  }

  freezePolicy(policyId: string, until: number): void {
    this.dispatch({ type: 'policy.freeze', payload: { policyId, until } })
  }

  thawPolicy(policyId: string, satisfied: boolean): void {
    this.dispatch({ type: 'policy.thaw', payload: { policyId, satisfied } })
  }

  createChain(input: {
    anchorId: string
    taskText: string
    criterion: string
    focusMinutes: number
  }): string {
    const id = uid('chn')
    this.dispatch({ type: 'chain.create', payload: { chainId: id, ...input } })
    return id
  }

  startChain(chainId: string): void {
    this.dispatch({ type: 'chain.start', payload: { chainId } })
  }

  completeNode(chainId: string, durationMs: number): void {
    this.dispatch({ type: 'chain.node', payload: { chainId, durationMs } })
  }

  endChain(chainId: string): void {
    const chain = this.projection.chains[chainId]
    this.dispatch({ type: 'chain.end', payload: { chainId, nodeCount: chain?.completedNodes ?? 0 } })
  }

  /** 判定违规：本链清零，从 #1 重新开始 */
  resetChain(chainId: string): void {
    this.dispatch({ type: 'chain.reset', payload: { chainId, reason: 'violation' } })
  }

  createBooking(chainId: string, delayMs: number, signal: string): string {
    const id = uid('bkg')
    this.dispatch({ type: 'booking.create', payload: { bookingId: id, chainId, delayMs, signal } })
    return id
  }

  immediateBooking(bookingId: string): void {
    this.dispatch({ type: 'booking.immediate', payload: { bookingId } })
  }

  deferBooking(bookingId: string): void {
    this.dispatch({ type: 'booking.defer', payload: { bookingId } })
  }

  missBooking(bookingId: string): void {
    this.dispatch({ type: 'booking.missed', payload: { bookingId } })
  }

  /** 永久豁免：写入即全局生效，无单条撤销路径 */
  grantPrecedent(behaviorKey: string, chainId?: string): void {
    this.dispatch({ type: 'precedent.grant', payload: { behaviorKey, chainId } })
  }

  logAllowance(behaviorKey: string, chainId?: string): void {
    this.dispatch({ type: 'precedent.log', payload: { behaviorKey, chainId } })
  }

  /** 全局重置：唯一出口，代价是所有判定标准收紧 */
  resetAllPrecedents(): void {
    const before = Object.keys(this.projection.allowedBehaviors)
    if (!before.length) return
    this.dispatch({ type: 'precedent.resetAll', payload: { before } })
  }

  setReview(text: string): void {
    this.dispatch({ type: 'review.set', payload: { date: dayKey(Date.now()), text } })
  }
}

export const store = new AnchorStore()

export function useProjection(): Projection {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}

export function useIsReady(): boolean {
  return useSyncExternalStore(
    (l) => {
      store.subscribe(l)
      return () => {}
    },
    () => store.isReady,
    () => false,
  )
}

export type { AnchorEventType }
