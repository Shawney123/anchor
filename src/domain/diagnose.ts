import { generateCandidates, type PolicyDraft } from './candidate'

/**
 * 规则版稳态诊断。
 * 输入：一周的真实时间线；输出：日级 / 周级稳态剧本 + 有效干预节点 + 候选国策。
 * 全部离线、零成本、可解释 —— 刻意不接入 LLM。
 */

export interface DayProfile {
  /** 就寝时刻，23.5 = 23:30，1.5 = 次日 01:30 */
  sleepHour: number
  /** 起床时刻 */
  wakeHour: number
  /** 躺着刷手机 */
  sofaScrolling: boolean
  /** 手机带上床 / 进卧室 */
  phoneInBed: boolean
  /** 有明确 DDL 或任务压力 */
  hasDdl: boolean
  /** 完成的专注块数量 */
  focusBlocks: number
  exercise: boolean
  mood: 'good' | 'flat' | 'low'
}

export interface Scale {
  title: string
  desc: string
  confidence: number
}

export interface Diagnosis {
  daily: Scale
  weekly: Scale
  nodes: { title: string; why: string }[]
  signals: string[]
  candidates: PolicyDraft[]
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

function isLate(p: DayProfile): boolean {
  return p.sleepHour >= 23.5 || p.sleepHour <= 5
}

/** 日级稳态：看最近一天 */
function diagnoseDaily(days: DayProfile[]): Scale {
  if (!days.length) {
    return { title: '尚无数据', desc: '填满一周的真实时间线，才能看出你在哪个尺度上被锁死。', confidence: 0 }
  }
  const d = days[days.length - 1]

  if (d.phoneInBed && d.sofaScrolling && isLate(d)) {
    return {
      title: '《沙发放纵剧本》',
      desc: '躺下即开始刷，短视频的每个微观节点都指向下一个节点，整晚不需要任何意志力就能走完——你只是从躺下的那一刻起就已经驶离了。',
      confidence: clamp01(0.62 + (isLate(d) ? 0.2 : 0) + (d.focusBlocks === 0 ? 0.12 : 0)),
    }
  }

  if (!d.hasDdl && d.focusBlocks <= 1 && isLate(d)) {
    return {
      title: '《全天摆烂剧本》',
      desc: '没有压力就没有方向，睡眠不足再叠加低能量，于是白天在短视频与游戏之间交替，靠高刺激维持清醒。',
      confidence: clamp01(0.58 + (d.focusBlocks === 0 ? 0.2 : 0) + (d.mood === 'low' ? 0.1 : 0)),
    }
  }

  if (d.hasDdl && d.focusBlocks >= 3) {
    return {
      title: '《考前抱佛脚剧本》',
      desc: '压力把远期价值撑到足够大，前期摆烂、临期突击——你并不是缺自律，你只是缺一个必须存在的时间锚。',
      confidence: clamp01(0.6 + Math.min(0.25, d.focusBlocks * 0.04)),
    }
  }

  if (isLate(d)) {
    return {
      title: '《深夜补偿循环》',
      desc: '夜越晚，第二天越难启动，注意力被睡眠债切成碎片，于是更早地累、更早地躺下。',
      confidence: clamp01(0.5 + (d.focusBlocks === 0 ? 0.18 : 0)),
    }
  }

  if (d.focusBlocks >= 2) {
    return {
      title: '《惯性稳态》',
      desc: '作息与产出都在可控区间，当前稳态是良性的——此时适合加一条高杠杆国策，而不是修修补补。',
      confidence: clamp01(0.55 + Math.min(0.25, d.focusBlocks * 0.05)),
    }
  }

  return {
    title: '《低能量循环》',
    desc: '没到失控，但也远谈不上推进；注意力没有被任何高价值行为占据，正在缓慢滑向惯性。',
    confidence: clamp01(0.5),
  }
}

/** 周级稳态：看一周的整体分布 */
function diagnoseWeekly(days: DayProfile[]): Scale {
  if (days.length < 2) {
    return { title: '样本不足', desc: '至少需要两天的记录才能看出周级趋势。', confidence: 0.2 }
  }
  const lateDays = days.filter(isLate).length
  const avgFocus = days.reduce((s, d) => s + d.focusBlocks, 0) / days.length
  const lowMood = days.filter((d) => d.mood === 'low').length

  if (lateDays >= Math.ceil(days.length * 0.6)) {
    return {
      title: '《作息颠倒 — 持续性摆烂循环》',
      desc: '晚睡 → 疲惫 → 没精神 → 靠高刺激提神 → 更晚睡。这个循环的每一环都在把下一环焊得更牢，单点反抗必然失败。',
      confidence: clamp01(0.55 + (lateDays / days.length) * 0.3),
    }
  }

  if (avgFocus >= 1.8) {
    return {
      title: '《日级惯性稳态》',
      desc: '这一周整体处在良性稳态里，适合以「零敲牛皮糖」的方式持续累积小国策，让联动效应慢慢把上限抬起来。',
      confidence: clamp01(0.5 + Math.min(0.3, avgFocus * 0.07)),
    }
  }

  if (lowMood >= Math.ceil(days.length * 0.5)) {
    return {
      title: '《周级低能量循环》',
      desc: '情绪低落的比例过高，说明问题不在方法论层面；先处理身体与节奏，再谈国策。',
      confidence: clamp01(0.5 + (lowMood / days.length) * 0.2),
    }
  }

  return {
    title: '《摇摆期》',
    desc: '这一周处在两种稳态之间来回摆动，还没有固化——这是加国策的窗口期，一旦固化成型，代价会高得多。',
    confidence: clamp01(0.45),
  }
}

/** 从信号里抽有效干预节点 */
function diagnoseNodes(days: DayProfile[]): { title: string; why: string }[] {
  const nodes: { title: string; why: string }[] = []
  if (!days.length) return nodes

  const sofaDays = days.filter((d) => d.sofaScrolling).length
  const bedPhoneDays = days.filter((d) => d.phoneInBed).length
  const lateWakeDays = days.filter((d) => d.wakeHour >= 9).length
  const avgFocus = days.reduce((s, d) => s + d.focusBlocks, 0) / days.length
  const noDdlLowFocus = days.filter((d) => !d.hasDdl && d.focusBlocks <= 1).length

  if (bedPhoneDays >= 2) {
    nodes.push({
      title: '睡前把手机移出卧室',
      why: `${days.length} 天里有 ${bedPhoneDays} 天把手机带上了床。躺下后的每一次刷视频都不是独立决策。`,
    })
  }
  if (sofaDays >= 2) {
    nodes.push({
      title: '让手机不上沙发',
      why: `${sofaDays} 天里沙发成了刷视频的默认位置。不可逃逸区是从「坐下」那一刻开始的。`,
    })
  }
  if (lateWakeDays >= 2) {
    nodes.push({
      title: '起床后 30 分钟不碰手机',
      why: `${lateWakeDays} 天起床过晚。起床后做的第一件事，几乎决定了这一整天的基调。`,
    })
  }
  if (noDdlLowFocus >= 2) {
    nodes.push({
      title: '把第一次启动缩到 5 分钟',
      why: '「不想开始」几乎从来不是动力问题，而是切换成本问题。侦查任务的阻力最低。',
    })
  }
  if (avgFocus < 1 && days.length >= 3) {
    nodes.push({
      title: '先动身体，再动脑',
      why: '专注块长期偏低且缺少压力锚，先用身体状态撬动认知状态，比加更多目标有用。',
    })
  }

  return nodes
}

export function diagnose(days: DayProfile[]): Diagnosis {
  const daily = diagnoseDaily(days)
  const weekly = diagnoseWeekly(days)
  const nodes = diagnoseNodes(days)

  const signals: string[] = []
  const lateDays = days.filter(isLate).length
  if (days.length) {
    signals.push(`晚睡 ${lateDays}/${days.length} 天`)
    signals.push(`平均专注块 ${(days.reduce((s, d) => s + d.focusBlocks, 0) / days.length).toFixed(1)} 个/天`)
    signals.push(`无 DDL 且低产出的天数 ${days.filter((d) => !d.hasDdl && d.focusBlocks <= 1).length} 天`)
  }

  // 候选国策：优先从识别出的问题画像生成
  const problemText = days
    .filter((d) => d.sofaScrolling || d.phoneInBed || d.focusBlocks <= 1)
    .map((d) => {
      const tags: string[] = []
      if (d.sofaScrolling) tags.push('沙发 刷手机 手机')
      if (d.phoneInBed) tags.push('熬夜 晚睡 睡前 手机')
      if (d.wakeHour >= 9) tags.push('起不来 起床 早上')
      if (d.focusBlocks <= 1) tags.push('拖延 启动困难 分心')
      return tags.join(' ')
    })
    .join(' ')

  const candidates = generateCandidates(problemText, 3)

  return { daily, weekly, nodes, signals, candidates }
}
