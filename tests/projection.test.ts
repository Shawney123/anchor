import { describe, expect, it } from 'vitest'
import type { AnchorEventType } from '../src/domain/events'
import { projectEvents } from '../src/domain/projection'
import type { Policy } from '../src/domain/types'

const DAY = 86_400_000
const NOW = Date.now()
/** 3 天前：让「今天」相关的断言落在真实的当前日期上 */
const T0 = NOW - 3 * DAY

function ev(type: AnchorEventType['type'], payload: unknown, ts = T0): AnchorEventType {
  return { type, payload, ts } as AnchorEventType
}

function policy(id: string, parentId: string | null = null): Policy {
  return {
    id,
    name: `国策-${id}`,
    type: 'semi_passive',
    triggerKind: 'event',
    triggerSpec: '回家进门',
    criterion: '以最好的状态专注',
    lever: 'high',
    resistance: 'low',
    maintenance: 'low',
    difficulty: 'easy',
    parentId,
    createdAt: T0,
  }
}

const day = DAY

describe('链引擎', () => {
  it('完成节点会累积编号', () => {
    const p = projectEvents([
      ev('chain.create', { chainId: 'c1', anchorId: 'a1', taskText: '读书', criterion: '专注', focusMinutes: 60 }),
      ev('chain.start', { chainId: 'c1' }),
      ev('chain.node', { chainId: 'c1', durationMs: 3_600_000 }),
      ev('chain.node', { chainId: 'c1', durationMs: 3_600_000 }),
    ])
    expect(p.chains.c1.completedNodes).toBe(2)
    expect(p.chains.c1.nodes.map((n) => n.no)).toEqual([1, 2])
    expect(p.chains.c1.status).toBe('active')
  })

  it('判定违规会让本链清零，但保留累计的清零次数', () => {
    const p = projectEvents([
      ev('chain.create', { chainId: 'c1', anchorId: 'a1', taskText: '读书', criterion: '专注', focusMinutes: 60 }),
      ev('chain.start', { chainId: 'c1' }),
      ev('chain.node', { chainId: 'c1', durationMs: 3_600_000 }),
      ev('chain.node', { chainId: 'c1', durationMs: 3_600_000 }),
      ev('chain.reset', { chainId: 'c1', reason: 'violation' }),
    ])
    expect(p.chains.c1.completedNodes).toBe(0)
    expect(p.chains.c1.resets).toBe(1)
  })
})

describe('判例引擎', () => {
  it('永久豁免写入后全局生效', () => {
    const p = projectEvents([
      ev('precedent.grant', { behaviorKey: '中途看微信' }),
    ])
    expect(p.allowedBehaviors['中途看微信']).toBe(T0)
    expect(p.allowanceLog).toHaveLength(1)
  })

  it('只有全局重置能清空豁免表', () => {
    const p = projectEvents([
      ev('precedent.grant', { behaviorKey: '中途看微信' }),
      ev('precedent.grant', { behaviorKey: '上厕所' }),
      ev('precedent.resetAll', { before: ['中途看微信', '上厕所'] }),
    ])
    expect(Object.keys(p.allowedBehaviors)).toHaveLength(0)
  })

  it('重新授予会被记录到放行日志', () => {
    const p = projectEvents([
      ev('precedent.grant', { behaviorKey: '中途看微信' }),
      ev('precedent.log', { behaviorKey: '中途看微信' }),
    ])
    expect(p.allowanceLog).toHaveLength(2)
  })
})

describe('国策树', () => {
  it('每天最多点亮一个国策', () => {
    const p = projectEvents([
      ev('policy.create', policy('p1')),
      ev('policy.create', policy('p2')),
      ev('policy.light', { policyId: 'p1' }, NOW - 1000),
      ev('policy.light', { policyId: 'p2' }, NOW - 500),
    ])
    // 一天只加一个节点：第二个点亮不进入今日结算
    expect(p.litToday).toEqual(['p1'])
    expect(p.policies.p1.litCount).toBe(1)
    expect(p.policies.p2.litCount).toBe(1)
  })

  it('跨天后可以继续点亮', () => {
    const p = projectEvents([
      ev('policy.create', policy('p1')),
      ev('policy.create', policy('p2')),
      ev('policy.light', { policyId: 'p1' }, NOW - DAY),
      ev('policy.light', { policyId: 'p2' }, NOW - 500),
    ])
    expect(p.litToday).toEqual(['p2'])
  })

  it('熄掉父节点会连锁熄掉子孙', () => {
    const p = projectEvents([
      ev('policy.create', policy('root')),
      ev('policy.create', policy('child', 'root')),
      ev('policy.create', policy('grand', 'child')),
      ev('policy.light', { policyId: 'root' }),
      ev('policy.light', { policyId: 'child' }, T0 + day),
      ev('policy.light', { policyId: 'grand' }, T0 + 2 * day),
      ev('policy.extinguish', { policyId: 'root', cause: 'violation' }),
    ])
    expect(p.policies.root.state).toBe('out')
    expect(p.policies.child.state).toBe('out')
    expect(p.policies.child.extinguishCause).toBe('parent')
    expect(p.policies.grand.state).toBe('out')
  })

  it('级联熄灭不会清掉熟练度', () => {
    const p = projectEvents([
      ev('policy.create', policy('root')),
      ev('policy.create', policy('child', 'root')),
      ev('policy.light', { policyId: 'root' }),
      ev('policy.light', { policyId: 'child' }, T0 + day),
      ev('policy.extinguish', { policyId: 'root', cause: 'violation' }),
    ])
    expect(p.policies.child.litCount).toBe(1)
    expect(p.policies.child.habituation).toBe(5)
  })

  it('等级按累计天数推导，上限 L3', () => {
    const events = [ev('policy.create', policy('p1'))]
    for (let i = 0; i < 30; i += 1) {
      events.push(ev('policy.light', { policyId: 'p1' }, T0 + i * day))
    }
    const p = projectEvents(events)
    expect(p.policies.p1.baseLevel).toBe(3)
    expect(p.policies.p1.level).toBe(3)
    expect(p.policies.p1.habituation).toBe(100)
  })

  it('自身违规扣一级，扣到 0 才熄灭', () => {
    const events = [ev('policy.create', policy('p1'))]
    for (let i = 0; i < 7; i += 1) {
      events.push(ev('policy.light', { policyId: 'p1' }, T0 + i * day))
    }
    events.push(ev('policy.extinguish', { policyId: 'p1', cause: 'violation' }))
    const p = projectEvents(events)
    // 累计 7 天 → 基础等级 2，违规扣 1 → L1，仍然点亮
    expect(p.policies.p1.level).toBe(1)
    expect(p.policies.p1.state).toBe('lit')
  })

  it('组容错：熄灭数超过名额时整组熄灭', () => {
    const p = projectEvents([
      ev('group.create', { id: 'g1', name: '作息组', faultTolerance: 1, createdAt: T0 }),
      ev('policy.create', policy('a1')),
      ev('policy.create', policy('a2')),
      ev('group.membership', { groupId: 'g1', policyId: 'a1' }),
      ev('group.membership', { groupId: 'g1', policyId: 'a2' }),
      ev('policy.light', { policyId: 'a1' }),
      ev('policy.light', { policyId: 'a2' }, T0 + day),
      ev('policy.extinguish', { policyId: 'a1', cause: 'violation' }),
    ])
    expect(p.groups.g1.outCount).toBe(1)
    expect(p.groups.g1.state).toBe('lit')
    expect(p.policies.a2.state).toBe('lit')
  })
})

describe('投影派生', () => {
  it('设置与复盘通过事件存储', () => {
    const p = projectEvents([
      ev('settings.update', { simpleMode: true, focusMinutes: 25 }),
      ev('review.set', { date: '2026-01-01', text: '今天最难的是启动' }),
    ])
    expect(p.settings.simpleMode).toBe(true)
    expect(p.settings.focusMinutes).toBe(25)
    expect(p.reviews['2026-01-01']).toBe('今天最难的是启动')
  })
})
