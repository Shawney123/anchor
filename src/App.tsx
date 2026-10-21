import { AnimatePresence, motion } from 'motion/react'
import { Compass, Network, Scale, Sun } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { store, useProjection } from './data/store'
import { useRoute, type Route } from './router'
import { pageVariants } from './ui/motion'
import { ToastHost } from './ui/components/toast'
import { useInstallPrompt, usePwaUpdate } from './ui/usePwa'
import { cn } from './ui/utils'
import { ChainPage } from './ui/pages/Chain'
import { DiagnosePage } from './ui/pages/Diagnose'
import { LedgerPage } from './ui/pages/Ledger'
import { SettingsPage } from './ui/pages/Settings'
import { TodayPage } from './ui/pages/Today'
import { TreePage } from './ui/pages/Tree'
import './ui/tokens.css'
import './ui/global.css'
import './ui/components.css'
import './ui/pages.css'

const NAV: { route: Route; label: string; icon: typeof Sun }[] = [
  { route: 'today', label: '今日', icon: Sun },
  { route: 'tree', label: '国策树', icon: Network },
  { route: 'ledger', label: '判例', icon: Scale },
  { route: 'diagnose', label: '诊断', icon: Compass },
]

export default function App() {
  const [route, nav] = useRoute()
  const p = useProjection()
  const { needRefresh, update } = usePwaUpdate()
  const { canInstall, install } = useInstallPrompt()

  useEffect(() => {
    void store.hydrate()
  }, [])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') store.refreshDay()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  const simple = p.settings.simpleMode
  const navItems = useMemo(
    () => (simple ? NAV.filter((n) => n.route !== 'tree' && n.route !== 'diagnose') : NAV),
    [simple],
  )
  const half = Math.ceil(navItems.length / 2)
  const left = navItems.slice(0, half)
  const right = navItems.slice(half)

  const isChain = route === 'chain'

  return (
    <div className="app-shell">
      {needRefresh ? (
        <div className="update-bar">
          <span className="body-sm">发现新版本</span>
          <button type="button" className="a-btn a-btn--sm" onClick={update}>
            立即更新
          </button>
        </div>
      ) : null}

      <main className={cn('app-main', isChain && 'app-main--full')}>
        <AnimatePresence mode="wait">
          <motion.div
            key={route}
            variants={pageVariants}
            initial="initial"
            animate="enter"
            exit="exit"
            className="page-wrap"
          >
            {route === 'today' ? <TodayPage onNavigate={nav} /> : null}
            {route === 'chain' ? <ChainPage onClose={() => nav('today')} /> : null}
            {route === 'tree' ? <TreePage /> : null}
            {route === 'ledger' ? <LedgerPage /> : null}
            {route === 'diagnose' ? <DiagnosePage /> : null}
            {route === 'settings' ? <SettingsPage /> : null}
          </motion.div>
        </AnimatePresence>
      </main>

      {!isChain ? (
        <nav className="app-nav" aria-label="主导航">
          {left.map((item) => (
            <NavButton key={item.route} item={item} active={route === item.route} onClick={() => nav(item.route)} />
          ))}

          <button type="button" className="nav-fab" aria-label="进入链" onClick={() => nav('chain')}>
            <span className="nav-fab__dot" />
            <span className="nav-fab__label">链</span>
          </button>

          {right.map((item) => (
            <NavButton key={item.route} item={item} active={route === item.route} onClick={() => nav(item.route)} />
          ))}
        </nav>
      ) : null}

      {canInstall && !simple ? (
        <div className="install-tip">
          <span className="body-sm grow">把 Anchor 添加到主屏幕，用起来更顺手</span>
          <button type="button" className="a-btn a-btn--sm" onClick={() => void install()}>
            添加
          </button>
        </div>
      ) : null}

      <ToastHost />
    </div>
  )
}

function NavButton({
  item,
  active,
  onClick,
}: {
  item: { route: Route; label: string; icon: typeof Sun }
  active: boolean
  onClick: () => void
}) {
  const Icon = item.icon
  return (
    <button type="button" className={cn('nav-btn', active && 'nav-btn--active')} onClick={onClick}>
      <motion.span
        className="nav-btn__icon"
        animate={{ scale: active ? 1 : 0.88 }}
        transition={{ type: 'spring', stiffness: 420, damping: 26 }}
      >
        <Icon size={21} strokeWidth={1.75} />
      </motion.span>
      <span className="nav-btn__label">{item.label}</span>
    </button>
  )
}
