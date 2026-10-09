import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initPrivacyMode } from './lib/use-privacy-mode'
import { initErrorReporting } from './lib/error-reporting'

initPrivacyMode()
void initErrorReporting()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
