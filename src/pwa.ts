import { registerSW } from 'virtual:pwa-register'

export type PwaEvent = 'need-refresh' | 'offline-ready'

type Listener = (event: PwaEvent) => void

const listeners = new Set<Listener>()
let offlineReady = false

/**
 * 注册 Service Worker，并把「有新版本 / 已可离线」广播给 UI 层。
 *
 * 更新流程走标准的 SKIP_WAITING + controllerchange：
 * 新 SW 装好后发消息让它立刻接管，接管完成再刷新页面。
 * 首次安装时页面没有 controller，那一次 controllerchange 不刷新，避免开屏就重载。
 */
export function initPWA(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

  const hadController = !!navigator.serviceWorker.controller

  registerSW({
    immediate: true,
    onNeedRefresh() {
      // 首次安装时，新 SW 同样处于 waiting 状态 —— 那不是「发现了新版本」，
      // 只有在页面本来就有 controller（说明这是一次更新而非首装）时才提示。
      if (!hadController) return
      listeners.forEach((l) => l('need-refresh'))
    },
    onOfflineReady() {
      offlineReady = true
      listeners.forEach((l) => l('offline-ready'))
    },
  })

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return
    window.location.reload()
  })
}

export function onPwaEvent(fn: Listener): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
/** 让等待中的新 SW 立刻接管 */
export function applyUpdate(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  void navigator.serviceWorker
    .getRegistration()
    .then((reg) => {
      reg?.waiting?.postMessage({ type: 'SKIP_WAITING' })
    })
    .catch(() => {
      /* 忽略 */
    })
}

export function isOfflineReady(): boolean {
  return offlineReady
}
