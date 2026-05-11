import { createContext, useContext, useState, useEffect } from 'react'

const SettingsContext = createContext({})

const DEFAULTS = {
  readOnly:     false,
  theme:        'light',
  webhookUrl:   '',
  webhookEmail: '',
  notifyOnFail: true,
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('pgstudio_settings')
      return saved ? { ...DEFAULTS, ...JSON.parse(saved) } : DEFAULTS
    } catch { return DEFAULTS }
  })

  useEffect(() => {
    localStorage.setItem('pgstudio_settings', JSON.stringify(settings))
    document.documentElement.setAttribute('data-theme', settings.theme)
  }, [settings])

  const update = (key, value) => setSettings(prev => ({ ...prev, [key]: value }))

  return (
    <SettingsContext.Provider value={{ settings, update }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => useContext(SettingsContext)
