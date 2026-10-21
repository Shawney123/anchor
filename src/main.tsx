import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { applyTheme, getTheme } from './data/prefs'
import { initPWA } from './pwa'

const root = document.getElementById('root')
if (!root) throw new Error('找不到 #root 挂载点')

applyTheme(getTheme())
initPWA()

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
