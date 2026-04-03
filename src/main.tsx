import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import VideoPipelineAppRefactored from './VideoPipelineAppRefactored'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <VideoPipelineAppRefactored />
  </StrictMode>,
)
