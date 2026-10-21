import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'

type ToastFn = (message: string) => void

let emit: ToastFn = () => {}
let timer: number | undefined

export function toast(message: string): void {
  emit(message)
  if (timer) window.clearTimeout(timer)
  timer = window.setTimeout(() => emit(''), 2200)
}

export function ToastHost() {
  const [message, setMessage] = useState('')

  useEffect(() => {
    emit = (m: string) => setMessage(m)
    return () => {
      emit = () => {}
    }
  }, [])

  return (
    <AnimatePresence>
      {message ? (
        <motion.div
          key="toast"
          className="a-toast"
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 420, damping: 30 } }}
          exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
          role="status"
        >
          {message}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
