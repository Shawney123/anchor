import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { sheetVariants, scrimVariants } from '../motion'

/* ── 全局返回栈：Android 物理返回键优先关闭最上层的浮层 ── */
type Handler = { close: () => void }
const stack: Handler[] = []
let listening = false

function ensureListener(): void {
  if (listening || typeof window === 'undefined') return
  listening = true
  window.addEventListener('popstate', () => {
    const top = stack[stack.length - 1]
    if (!top) return
    stack.pop()
    top.close()
  })
}

/**
 * 浮层打开时向历史栈压入一条记录：
 * 用户按返回键 → 关闭浮层，而不是退出页面。
 */
export function useBackGuard(active: boolean, close: () => void): void {
  const closeRef = useRef(close)
  closeRef.current = close

  useEffect(() => {
    if (!active || typeof window === 'undefined') return
    ensureListener()
    const handler: Handler = { close: () => closeRef.current() }
    stack.push(handler)
    window.history.pushState({ __anchorSheet: true }, '')

    return () => {
      const i = stack.indexOf(handler)
      if (i >= 0) stack.splice(i, 1)
      // 若是主动关闭（而非用户按返回键），把自己压入的历史条目撤掉
      if ((window.history.state as { __anchorSheet?: boolean } | null)?.__anchorSheet) {
        window.history.back()
      }
    }
  }, [active])
}

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}) {
  useBackGuard(open, onClose)

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="a-sheet-backdrop"
          variants={scrimVariants}
          initial="initial"
          animate="enter"
          exit="exit"
          onClick={onClose}
        >
          <motion.div
            className="a-sheet"
            variants={sheetVariants}
            initial="initial"
            animate="enter"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="a-sheet-handle" />
            {title ? <div className="h2" style={{ marginBottom: 14 }}>{title}</div> : null}
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
