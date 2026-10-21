import { describe, expect, it } from 'vitest'
import { generateCandidates, interventionNode, scoreDraft } from '../src/domain/candidate'
import { diagnose, type DayProfile } from '../src/domain/diagnose'

describe('本地候选引擎', () => {
  it('能识别刷手机类问题并给出三个候选', () => {
    const cands = generateCandidates('晚上躺床上总要刷一小时手机', 3)
    expect(cands).toHaveLength(3)
    expect(cands[0].resistance).toBe('low')
  })

  it('主动型国策的排序权重低于被动型', () => {
    const passive = scoreDraft({
      name: 'a',
      type: 'passive',
      triggerKind: 'event',
      triggerSpec: '',
      criterion: '',
      lever: 'high',
      resistance: 'low',
      maintenance: 'low',
      rationale: '',
      source: '',
      difficulty: 'easy',
    })
    const active = scoreDraft({
      name: 'b',
      type: 'active',
      triggerKind: 'event',
      triggerSpec: '',
      criterion: '',
      lever: 'high',
      resistance: 'low',
      maintenance: 'low',
      rationale: '',
      source: '',
      difficulty: 'easy',
    })
    expect(passive).toBeGreaterThan(active)
  })

  it('空输入也能给出兜底候选', () => {
    expect(generateCandidates('', 3).length).toBe(3)
  })

  it('能定位到有效干预节点', () => {
    const node = interventionNode('总是熬夜，两三点才睡')
    expect(node).not.toBeNull()
    expect(node?.title).toContain('卧室')
  })
})

function day(over: Partial<DayProfile> = {}): DayProfile {
  return {
    sleepHour: 23,
    wakeHour: 7.5,
    sofaScrolling: false,
    phoneInBed: false,
    hasDdl: true,
    focusBlocks: 2,
    exercise: false,
    mood: 'flat',
    ...over,
  }
}

describe('规则版稳态诊断', () => {
  it('晚睡 + 躺刷识别为沙发放纵剧本', () => {
    const report = diagnose([day({ sleepHour: 24.5, sofaScrolling: true, phoneInBed: true, focusBlocks: 0 })])
    expect(report.daily.title).toContain('沙发')
  })

  it('无 DDL 且低产出识别为全天摆烂剧本', () => {
    const report = diagnose([day({ sleepHour: 24.5, hasDdl: false, focusBlocks: 0, mood: 'low' })])
    expect(report.daily.title).toContain('摆烂')
  })

  it('有 DDL 且高产出识别为考前抱佛脚剧本', () => {
    const report = diagnose([day({ hasDdl: true, focusBlocks: 4 })])
    expect(report.daily.title).toContain('抱佛脚')
  })

  it('一周多数晚睡识别为周级持续性循环', () => {
    const days = Array.from({ length: 7 }, () => day({ sleepHour: 24.5, focusBlocks: 0 }))
    const report = diagnose(days)
    expect(report.weekly.title).toContain('循环')
  })

  it('能从信号里抽出有效干预节点', () => {
    const days = Array.from({ length: 4 }, () => day({ sleepHour: 24.5, phoneInBed: true, sofaScrolling: true }))
    const report = diagnose(days)
    expect(report.nodes.length).toBeGreaterThan(0)
  })
})
