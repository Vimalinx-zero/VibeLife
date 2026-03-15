import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'katex/dist/katex.min.css'  // KaTeX 数学公式样式
import App from './App'

const defaultApiOrigin =
  window.location.port === '49173'
    ? 'http://127.0.0.1:49174'
    : 'http://localhost:8000'

window.__VIBELIFE_API_ORIGIN__ = (
  import.meta.env.VITE_API_ORIGIN || defaultApiOrigin
).replace(/\/+$/, '')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
