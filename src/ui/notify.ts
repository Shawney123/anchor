/** 页内系统通知：静态托管下没有推送服务，这是在页面存活期间的兜底提醒 */

export async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  try {
    const res = await Notification.requestPermission()
    return res === 'granted'
  } catch {
    return false
  }
}

export function notify(title: string, body: string): void {
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, tag: 'anchor-booking', icon: './icons/icon-192.png', badge: './icons/icon-192.png' })
  } catch {
    /* 忽略 */
  }
}
