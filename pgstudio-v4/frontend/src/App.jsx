import { useState } from 'react'
import { SettingsProvider } from './context/SettingsContext'
import Sidebar       from './components/Sidebar'
import Dashboard     from './pages/Dashboard'
import ConfigEditor  from './pages/ConfigEditor'
import StanzaManager from './pages/StanzaManager'
import BackupManager from './pages/BackupManager'
import BackupBrowser from './pages/BackupBrowser'
import RestoreVerify from './pages/RestoreVerify'
import Monitoring    from './pages/Monitoring'
import Settings      from './pages/Settings'

const PAGES = {
  dashboard: Dashboard,
  config:    ConfigEditor,
  stanzas:   StanzaManager,
  backups:   BackupManager,
  browser:   BackupBrowser,
  restore:   RestoreVerify,
  monitoring:Monitoring,
  settings:  Settings,
}

export default function App() {
  const [page, setPage] = useState('dashboard')
  const Page = PAGES[page] || Dashboard

  return (
    <SettingsProvider>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar current={page} onNav={setPage} />
        <Page />
      </div>
    </SettingsProvider>
  )
}
