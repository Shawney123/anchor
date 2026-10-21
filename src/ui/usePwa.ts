import { useEffect, useState } from 'react'
import { applyUpdate, onPwaEvent } from '../pwa'

/** PWA 更新提示：避免用户卡在旧版本的行为逻辑上 */
export function usePwaUpdate(): { needRefresh: boolean; update: () => void } {
  const [needRefresh, setNeedRefresh] = useState(false)

  useEffect(() => {
    return onPwaEvent((event) => {
      if (event === 'need-refresh') setNeedRefresh(true)
    })
  }, [])

  const update = () => {
    applyUpdate()
    setNeedRefresh(false)
  }

  return { needRefresh, update }
}

/** 安装到主屏幕的引导 */
export function useInstallPrompt(): { canInstall: boolean; install: () => void } {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    const onInstalled = () => setDeferred(null)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = async () => {
    if (!deferred) return
    await deferred.prompt()
    setDeferred(null)
  }

  return { canInstall: !!deferred, install }
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
