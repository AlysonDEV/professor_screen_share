import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import './assets/main.css'

import { ControlApp } from './control/App'
import { SniperApp } from './sniper/App'
import { ViewerApp } from './viewer/App'

const RootRouter: React.FC = () => {
  const [route, setRoute] = useState<string>(() => {
    const raw = window.location.hash.replace('#', '')
    return raw.split('?')[0] || 'control'
  })

  useEffect(() => {
    const handleHashChange = (): void => {
      const raw = window.location.hash.replace('#', '')
      setRoute(raw.split('?')[0] || 'control')
    }

    window.addEventListener('hashchange', handleHashChange)
    return (): void => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  switch (route) {
    case 'sniper':
      return <SniperApp />
    case 'viewer':
    case 'screen_shared':
      return <ViewerApp />
    case 'menu':
    case 'control':
    default:
      return <ControlApp />
  }
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RootRouter />
  </React.StrictMode>
)
