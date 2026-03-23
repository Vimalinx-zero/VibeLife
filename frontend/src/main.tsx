import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'katex/dist/katex.min.css'  // KaTeX 数学公式样式
import { resolveApiOrigin } from './utils/apiOrigin'

window.__VIBELIFE_API_ORIGIN__ = resolveApiOrigin({
  configuredOrigin: import.meta.env.VITE_API_ORIGIN,
  port: window.location.port,
})

const root = createRoot(document.getElementById('root')!)

async function bootstrap() {
  const { default: App } = await import('./App')

  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()
