import type { Difficulty, Grade, PolicyType, TriggerKind } from '../domain/types'
import { PATTERNS, type Pattern } from '../patterns/library'

/** 候选国策草案：尚未入库，用户点亮后才成为真正的国策 */
export interface PolicyDraft {
  name: string
  type: PolicyType
  triggerKind: TriggerKind
  triggerSpec: string
  criterion: string
  lever: Grade
  resistance: Grade
  maintenance: Grade
  rationale: string
  source: string
  difficulty: Difficulty
}

/* ──────────────────────────  问题画像  ────────────────────────── */

interface Profile {
  id: string
  keywords: string[]
  /** 有效干预节点：自由意志尚可干预的那一处 */
  node: string
  /** 回溯说明 */
  nodeWhy: string
  /** 堵入口：让诱惑物理上不在场 */
  block: { name: string; trigger: string; criterion: string }
  /** 降切换：把一次最难切换拆成阶梯 */
  stair: { name: string; trigger: string; criterion: string }
  /** 借环境：把行为挂靠在必然发生的事件上 */
  borrow: { name: string; trigger: string; criterion: string }
}

const PROFILES: Profile[] = [
  {
    id: 'phone',
    keywords: ['刷手机', '手机', '短视频', '小红书', '抖音', '微博', '朋友圈', '玩手机', '视频号'],
    node: '让手机在你坐下之前就不在手边',
    nodeWhy: '沙发上的每一个刷视频决策都不是独立决策，它们共享同一个「不可逃逸区」',
    block: {
      name: '手机不上沙发',
      trigger: '准备在沙发或床上坐下时',
      criterion: '手机留在玄关或包里，不带进坐下区域',
    },
    stair: {
      name: '先站一分钟',
      trigger: '拿起手机时',
      criterion: '第一次只能站着玩；想坐下时，必须先走到另一个房间站满 1 分钟',
    },
    borrow: {
      name: '客厅不留充电座',
      trigger: '在家时',
      criterion: '充电线只在书桌，沙发与床边不设充电位',
    },
  },
  {
    id: 'lateSleep',
    keywords: ['熬夜', '晚睡', '睡不着', '失眠', '凌晨', '通宵', '两点', '三点'],
    node: '睡前把手机移出卧室',
    nodeWhy: '睡不着的直接原因往往不是「睡不着」，而是「躺下后可以无限刷」',
    block: {
      name: '睡前手机放客厅',
      trigger: '准备睡觉时',
      criterion: '手机留在客厅充电，人不带回卧室',
    },
    stair: {
      name: '睡前三级台阶',
      trigger: '23:00 之后',
      criterion: '23:00 屏幕转黑白 → 23:15 只能站着玩 → 23:30 放下手机躺下',
    },
    borrow: {
      name: '床头留纸笔',
      trigger: '躺下时',
      criterion: '床头只留纸笔，不留电子设备；要记的事写下来',
    },
  },
  {
    id: 'morning',
    keywords: ['起不来', '赖床', '睡懒觉', '闹钟', '早上', '早晨', '起床'],
    node: '起床后前 30 分钟的归属',
    nodeWhy: '起床后做的第一件事，几乎决定了这一整天的基调',
    block: {
      name: '起床 30 分钟不碰手机',
      trigger: '起床后',
      criterion: '前 30 分钟不使用短视频 / 社交 / 游戏类 App',
    },
    stair: {
      name: '起床三级台阶',
      trigger: '闹钟响后',
      criterion: '坐起 → 站立 → 去洗漱；三步都完成才算「起床成功」',
    },
    borrow: {
      name: '闹钟放在必须起身才能关的位置',
      trigger: '睡觉前',
      criterion: '手机不放在床边，闹钟用声音设备或放在两米外',
    },
  },
  {
    id: 'procrastination',
    keywords: ['拖延', '做不下去', '不想开始', '启动困难', '分心', '静不下', '摆烂', '拖延症'],
    node: '把第一次启动的动作缩到 5 分钟',
    nodeWhy: '「不想开始」几乎从来不是动力问题，而是切换成本问题',
    block: {
      name: '侦查任务',
      trigger: '面对一个卡住的大任务时',
      criterion: '只做 5 分钟的最小可交付物即算完成；进入状态可自行延长',
    },
    stair: {
      name: '只做最小可交付物',
      trigger: '开始工作前',
      criterion: '先只完成一个函数 / 一段文字 / 一页笔记，再决定是否继续',
    },
    borrow: {
      name: '先出门走五分钟',
      trigger: '启动阻力过大时',
      criterion: '先出门走 5 分钟，回来再决定做不做',
    },
  },
  {
    id: 'chores',
    keywords: ['洗碗', '打扫', '收拾', '家务', '整理', '倒垃圾', '洗衣', '拖地'],
    node: '在触发的那一刻就把动作做完',
    nodeWhy: '家务拖延几乎全部来自「什么时候做」这个开放问题，而不是动作本身',
    block: {
      name: '吃完立刻收',
      trigger: '吃完饭放下筷子时',
      criterion: '立刻把碗放进水池并开水，不等到「一会儿」',
    },
    stair: {
      name: '家务三级台阶',
      trigger: '站在家务现场时',
      criterion: '先收 1 分钟 → 再洗 1 分钟 → 想停就停下（已算完成）',
    },
    borrow: {
      name: '固定家务时段',
      trigger: '每天固定时间',
      criterion: '固定时段只做家务，不做别的',
    },
  },
  {
    id: 'shower',
    keywords: ['洗澡', '洗漱', '换衣服', '卫生', '收拾自己'],
    node: '回家进门的那 15 分钟',
    nodeWhy: '洗澡拖延的阻力不在洗澡，在于「什么时候去洗」这个决定',
    block: {
      name: '进门 15 分钟内洗澡',
      trigger: '回家进门',
      criterion: '进门后 15 分钟内完成换衣 + 洗漱',
    },
    stair: {
      name: '进门三级台阶',
      trigger: '回家进门',
      criterion: '换鞋 → 换衣 → 进浴室；走完三步就完成了这一整串',
    },
    borrow: {
      name: '浴室常备干净衣物',
      trigger: '洗澡前',
      criterion: '浴室常备一套可立即换洗的衣物，不做「找衣服」这个决定',
    },
  },
  {
    id: 'study',
    keywords: ['学习', '看书', '写作业', '论文', '复习', '背单词', '刷题', '备考', '考试'],
    node: '换一个物理位置',
    nodeWhy: '在家的学习与在自习室的学习，是两个不同的能力问题',
    block: {
      name: '手机不进书桌',
      trigger: '坐到书桌前时',
      criterion: '手机放抽屉或背包，不在视野范围内',
    },
    stair: {
      name: '图书馆 30 分钟',
      trigger: '准备开始长任务时',
      criterion: '先出门到自习室坐满 30 分钟，再决定是否继续',
    },
    borrow: {
      name: '学习仪式',
      trigger: '坐到书桌前时',
      criterion: '开机、倒水、把今天要做的一件事写在纸上，然后开始',
    },
  },
  {
    id: 'work',
    keywords: ['上班', '工作', '摸鱼', '开会', '加班', '项目', '同事', '工位'],
    node: '工位上手机的可见性',
    nodeWhy: '摸鱼不是意志问题，是伸手距离的问题',
    block: {
      name: '手机进抽屉',
      trigger: '进入工位时',
      criterion: '手机放进抽屉或背包，不在视野范围内',
    },
    stair: {
      name: '站起来处理',
      trigger: '想拿手机时',
      criterion: '先站到茶水间走一圈，回来再决定',
    },
    borrow: {
      name: '工位桌面清单',
      trigger: '开始工作时',
      criterion: '桌面只留当前一件事，其余收进抽屉',
    },
  },
  {
    id: 'game',
    keywords: ['游戏', '打游戏', '上号', '开黑', 'steam', '沉迷', '上瘾'],
    node: '开机之前的那个动作',
    nodeWhy: '「打开游戏」几乎是一个不可逆的动作，一旦按下就进入了不可逃逸区',
    block: {
      name: '开机仪式',
      trigger: '想打开游戏时',
      criterion: '先做 15 分钟预备动作（热身 / 拉伸 / 整理桌面）',
    },
    stair: {
      name: '先做一件小事',
      trigger: '想打开游戏时',
      criterion: '先完成一个 5 分钟的小任务（洗一次碗 / 读两页书）',
    },
    borrow: {
      name: '游戏时段化',
      trigger: '每天固定时段',
      criterion: '只在固定时段开机，其他时间不启动游戏',
    },
  },
  {
    id: 'food',
    keywords: ['吃', '零食', '外卖', '减肥', '胖', '奶茶', '火锅', '宵夜'],
    node: '进食发生的位置',
    nodeWhy: '「顺手就吃了」的次数，几乎完全由进食位置决定',
    block: {
      name: '餐桌外不进食',
      trigger: '不在餐桌的地方',
      criterion: '不进食（喝水可以）',
    },
    stair: {
      name: '先吃正餐',
      trigger: '想吃东西时',
      criterion: '先吃一顿完整的正餐，想吃零食必须等正餐结束后 30 分钟',
    },
    borrow: {
      name: '零食进抽屉',
      trigger: '回家时',
      criterion: '所有零食必须放进一个上锁或需要用力的抽屉',
    },
  },
]

/* ──────────────────────────  打分  ────────────────────────── */

const W_TYPE: Record<PolicyType, number> = {
  mechanic: 1,
  passive: 0.95,
  semi_passive: 0.85,
  active: 0.4,
}

const W_RESISTANCE: Record<Grade, number> = { low: 1, medium: 0.7, high: 0.35 }
const W_LEVER: Record<Grade, number> = { high: 1, medium: 0.7, low: 0.45 }

export function scoreDraft(d: PolicyDraft): number {
  return W_TYPE[d.type] * W_RESISTANCE[d.resistance] * W_LEVER[d.lever]
}

/* ──────────────────────────  主入口  ────────────────────────── */

function detectProfile(text: string): Profile | null {
  let best: Profile | null = null
  let bestHits = 0
  for (const p of PROFILES) {
    let hits = 0
    for (const kw of p.keywords) {
      if (text.includes(kw)) hits += 1
    }
    if (hits > bestHits) {
      bestHits = hits
      best = p
    }
  }
  return bestHits > 0 ? best : null
}

function patternMatches(text: string): Pattern[] {
  const scored: { p: Pattern; hits: number }[] = []
  for (const p of PATTERNS) {
    let hits = 0
    for (const tag of p.tags) {
      if (text.includes(tag)) hits += 1
    }
    if (hits > 0) scored.push({ p, hits })
  }
  scored.sort((a, b) => b.hits - a.hits)
  return scored.map((s) => s.p)
}

function toDraft(p: Pattern): PolicyDraft {
  return {
    name: p.name,
    type: p.type,
    triggerKind: p.triggerKind,
    triggerSpec: p.triggerSpec,
    criterion: p.criterion,
    lever: p.lever,
    resistance: p.resistance,
    maintenance: p.maintenance,
    rationale: p.rationale,
    source: p.source,
    difficulty: p.difficulty,
  }
}

function profileDrafts(p: Profile): PolicyDraft[] {
  return [
    {
      name: p.block.name,
      type: 'passive',
      triggerKind: 'event',
      triggerSpec: p.block.trigger,
      criterion: p.block.criterion,
      lever: 'high',
      resistance: 'low',
      maintenance: 'low',
      rationale: `回溯到上游节点：${p.nodeWhy}`,
      source: '本地引擎 · 堵入口',
      difficulty: 'easy',
    },
    {
      name: p.stair.name,
      type: 'semi_passive',
      triggerKind: 'event',
      triggerSpec: p.stair.trigger,
      criterion: p.stair.criterion,
      lever: 'high',
      resistance: 'low',
      maintenance: 'low',
      rationale: '降切换：把一次最难切换拆成几段都能走完的阶梯',
      source: '本地引擎 · 降切换难度',
      difficulty: 'easy',
    },
    {
      name: p.borrow.name,
      type: 'semi_passive',
      triggerKind: 'event',
      triggerSpec: p.borrow.trigger,
      criterion: p.borrow.criterion,
      lever: 'medium',
      resistance: 'low',
      maintenance: 'low',
      rationale: '借环境力量：把行为挂靠在必然发生的事件上，消灭「什么时候做」的纠结',
      source: '本地引擎 · 借环境力量',
      difficulty: 'easy',
    },
  ]
}

/**
 * 本地候选引擎：完全离线、零成本、可解释。
 * 三类分解对应原文 §19：堵入口 / 降切换难度 / 借环境力量。
 */
export function generateCandidates(problem: string, limit = 3): PolicyDraft[] {
  const text = (problem ?? '').trim()
  const profile = detectProfile(text)

  const drafts: PolicyDraft[] = []

  if (profile) {
    drafts.push(...profileDrafts(profile))
  }

  for (const pat of patternMatches(text).slice(0, 4)) {
    drafts.push(toDraft(pat))
  }

  // 没有任何信号时给出三个最稳的傻瓜国策（熊市里也能存活的那种）
  if (!drafts.length) {
    drafts.push(toDraft(PATTERNS[0]), toDraft(PATTERNS[1]), toDraft(PATTERNS[8]))
  }

  const seen = new Set<string>()
  const unique = drafts.filter((d) => {
    const key = `${d.name}|${d.triggerSpec}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return unique
    .map((d) => ({ d, s: scoreDraft(d) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.d)
}

/** 供诊断页使用：返回该问题对应的有效干预节点 */
export function interventionNode(problem: string): { title: string; why: string } | null {
  const profile = detectProfile((problem ?? '').trim())
  if (!profile) return null
  return { title: profile.node, why: profile.nodeWhy }
}
