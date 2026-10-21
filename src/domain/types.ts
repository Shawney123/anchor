/**
 * 领域类型：全部为纯数据结构，不含任何运行时依赖。
 */

export type PolicyType = 'passive' | 'semi_passive' | 'active' | 'mechanic'

export type TriggerKind = 'event' | 'time' | 'state' | 'place'

export type Grade = 'high' | 'medium' | 'low'

export type Difficulty = 'easy' | 'medium' | 'hard'

/** 国策在树中的状态 */
export type PolicyState = 'candidate' | 'lit' | 'out' | 'frozen'

export interface Policy {
  id: string
  name: string
  type: PolicyType
  /** 触发锚：优先事件锚，其次时间锚，最后状态锚 */
  triggerKind: TriggerKind
  triggerSpec: string
  /** 判定标准 —— 对应原文「以最好的状态」 */
  criterion: string
  lever: Grade
  resistance: Grade
  maintenance: Grade
  /** 为什么这条杠杆高：一句话说明借用了什么力量 / 回溯到了哪个上游节点 */
  rationale?: string
  source?: string
  difficulty: Difficulty
  groupId?: string
  parentId?: string | null
  createdAt: number
}

export interface Anchor {
  id: string
  name: string
  /** object 实物 / place 场所 / ritual 仪式 */
  kind: 'object' | 'place' | 'ritual'
  note?: string
  createdAt: number
}

export interface Group {
  id: string
  name: string
  /** 容错名额：允许熄灭而不导致整组熄灭的成员数 */
  faultTolerance: number
  createdAt: number
}

export interface Settings {
  /** 难度档位自识别结果 */
  difficulty: Difficulty
  /** 轻量模式：隐藏国策树与诊断，只保留今日结算与链 */
  simpleMode: boolean
  /** 页内系统通知 */
  notifications: boolean
  /** 链进行中保持屏幕常亮 */
  keepAwake: boolean
  /** 默认单个专注单元时长（分钟） */
  focusMinutes: number
  /** 预约信号默认延迟（分钟） */
  bookingDelay: number
}

export const DEFAULT_SETTINGS: Settings = {
  difficulty: 'medium',
  simpleMode: false,
  notifications: false,
  keepAwake: true,
  focusMinutes: 60,
  bookingDelay: 15,
}

/** 不可豁免行为：安全加固，出于「永久豁免」机制不得被用来给真实伤害开口子 */
export const NON_NEGOTIABLE: string[] = [
  '开车时使用手机',
  '链进行中饮酒',
  '链进行中入睡',
  '跳过必要的就医或服药',
]

/** 常用中断行为标签（判定弹层的一键选择） */
export const COMMON_BEHAVIORS: string[] = [
  '中途看手机',
  '中途看微信',
  '回复消息',
  '接打电话',
  '上厕所',
  '喝水',
  '起身活动',
  '刷短视频',
  '走神发呆',
  '中途睡着了',
]
