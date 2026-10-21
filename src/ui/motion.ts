import type { Transition, Variants } from 'motion/react'

/** 弹性：用于点亮、按下回弹 */
export const spring: Transition = { type: 'spring', stiffness: 420, damping: 30, mass: 0.8 }

/** 软弹性：用于页面转场 */
export const springSoft: Transition = { type: 'spring', stiffness: 260, damping: 30, mass: 0.9 }

/** 页面进入：淡入 + 12px 上移 */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.33, 1, 0.68, 1] } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15, ease: [0.4, 0, 1, 1] } },
}

/** 底部弹层 */
export const sheetVariants: Variants = {
  initial: { y: '100%' },
  enter: { y: 0, transition: { type: 'spring', stiffness: 320, damping: 34, mass: 0.9 } },
  exit: { y: '100%', transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } },
}

/** 背板 */
export const scrimVariants: Variants = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
}

/** 卡片进入 */
export const cardVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.24, ease: [0.2, 0, 0, 1] } },
}

/** 列表逐项 */
export function staggerItem(index: number, delayStep = 0.05): Variants {
  return {
    initial: { opacity: 0, y: 8 },
    enter: { opacity: 1, y: 0, transition: { duration: 0.22, delay: index * delayStep } },
  }
}

/** 连锁熄灭：按深度错开 */
export function cascadeDelay(depth: number, step = 0.07): number {
  return depth * step
}

/** 光环扩散（落座 / 结算） */
export const haloVariants: Variants = {
  initial: { scale: 0.8, opacity: 0.9 },
  enter: { scale: 1.5, opacity: 0, transition: { duration: 0.48, ease: [0.2, 0, 0, 1] } },
}

/** 红色描边脉冲：只在选择「永久允许」时触发一次 */
export const pulseOnce: Variants = {
  initial: { scale: 1 },
  animate: { scale: [1, 1.015, 1], transition: { duration: 0.26, ease: 'easeOut' } },
}

/** 逐行淡入：后果文案 */
export function lineReveal(index: number): Variants {
  return {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.2, delay: index * 0.04 } },
  }
}

/** 节点点亮 */
export const nodeLightVariants: Variants = {
  initial: { scale: 0.6, opacity: 0.4 },
  animate: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 460, damping: 24 } },
}

/** 节点熄灭 */
export const nodeOutVariants: Variants = {
  initial: { scale: 1, opacity: 1 },
  animate: { scale: 0.92, opacity: 0.32, y: 6, transition: { duration: 0.24, ease: [0.4, 0, 1, 1] } },
}
