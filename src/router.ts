import { useCallback, useEffect, useState } from 'react'

export type Route = 'today' | 'tree' | 'chain' | 'ledger' | 'diagnose' | 'settings'

const ROUTES: Route[] = ['today', 'tree', 'chain', 'ledger', 'diagnose', 'settings']

function parseHash(): Route {
  if (typeof window === 'undefined') return 'today'
  const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0]
  return (ROUTES as string[]).includes(raw) ? (raw as Route) : 'today'
}

/** hash 路由：GitHub Pages 静态托管下刷新任意路径都能命中 index.html */
export function useRoute(): [Route, (r: Route) => void] {
  const [route, setRoute] = useState<Route>(parseHash)

  useEffect(() => {
    const onChange = () => setRoute(parseHash())
    window.addEventListener('hashchange', onChange)
    if (!window.location.hash) window.location.hash = '#/today'
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  const nav = useCallback((r: Route) => {
    if (parseHash() === r) return
    window.location.hash = `#/${r}`
  }, [])

  return [route, nav]
}
