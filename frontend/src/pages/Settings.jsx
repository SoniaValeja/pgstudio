import { useState } from 'react'
import { useSettings } from '../context/SettingsContext'
import { Save, Sun, Moon, Lock, Unlock, Bell, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react'

function Section({ title, description, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
      <div className="p-5 space-y-5">{children}</div>
    </div>
  )
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-medium text-slate-700">{label}</div>
        {description && <div className="text-xs text-slate-400 mt-0.5">{description}</div>}
      </div>
      <button onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200
          ${checked ? 'bg-pg-500' : 'bg-slate-200'}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow
          transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  )
}

export default function Settings() {
  const { settings, update } = useSettings()
  const [toast, setToast]    = useState(null)
  const [testing, setTesting] = useState(false)

  const showToast = (type, msg) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  const testWebhook = async () => {
    if (!settings.webhookUrl) return
    setTesting(true)
    try {
      await fetch(settings.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: '✅ pgStudio webhook test — connection successful!',
          source: 'pgStudio',
        }),
      })
      showToast('success', 'Webhook test sent successfully')
    } catch (e) {
      showToast('error', `Webhook failed: ${e.message}`)
    } finally {
      setTesting(false) }
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto px-6 py-6 space-y-5">

        <div>
          <h1 className="text-xl font-semibold text-slate-800">Settings</h1>
          <p className="text-slate-400 text-sm mt-0.5">Preferences are saved locally in your browser</p>
        </div>

        {toast && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm border
            ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                       : 'bg-red-50 border-red-200 text-red-800'}`}>
            {toast.type === 'success' ? <CheckCircle size={14}/> : <AlertTriangle size={14}/>}
            {toast.msg}
          </div>
        )}

        {/* Theme */}
        <Section title="Display" description="Visual preferences">
          <div>
            <div className="text-sm font-medium text-slate-700 mb-3">Theme</div>
            <div className="flex gap-3">
              {[
                { value: 'light', icon: Sun,  label: 'Light' },
                { value: 'dark',  icon: Moon, label: 'Dark'  },
              ].map(({ value, icon: Icon, label }) => (
                <button key={value} onClick={() => update('theme', value)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium
                    transition-colors flex-1 justify-center
                    ${settings.theme === value
                      ? 'bg-pg-500 text-white border-pg-500'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
            {settings.theme === 'dark' && (
              <p className="text-xs text-amber-600 mt-2 bg-amber-50 border border-amber-200
                            rounded-lg px-3 py-2">
                Dark mode is saved — full CSS implementation coming in next release.
                UI will apply dark styles on refresh once implemented.
              </p>
            )}
          </div>
        </Section>

        {/* Safety */}
        <Section title="Safety"
          description="Prevent accidental changes to your backup configuration">
          <Toggle
            checked={settings.readOnly}
            onChange={v => {
              update('readOnly', v)
              showToast('info' , v ? 'Read-only mode enabled — write actions are locked'
                                   : 'Read-only mode disabled — write actions are unlocked')
            }}
            label={
              <span className="flex items-center gap-1.5">
                {settings.readOnly ? <Lock size={13} className="text-amber-500"/> 
                                   : <Unlock size={13} className="text-slate-400"/>}
                Read-only mode
              </span>
            }
            description="Disables Save config, Trigger backup, Delete stanza, and Run verify across all screens"
          />
          {settings.readOnly && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3
                            flex items-center gap-2 text-sm text-amber-800">
              <Lock size={13} className="text-amber-500 shrink-0" />
              Read-only mode is active. All write actions are disabled.
            </div>
          )}
        </Section>

        {/* Notifications */}
        <Section title="Notifications"
          description="Get notified when backups fail or are overdue">
          <Toggle
            checked={settings.notifyOnFail}
            onChange={v => update('notifyOnFail', v)}
            label="Notify on backup failure"
            description="Send a webhook/email when a backup job fails or a stanza becomes unhealthy"
          />

          <div className="space-y-3 pt-1">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1.5">
                Webhook URL
                <span className="text-slate-400 font-normal ml-1">(Slack, Teams, or any HTTP endpoint)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={settings.webhookUrl}
                  onChange={e => update('webhookUrl', e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-pg-200 focus:border-pg-400"
                />
                <button onClick={testWebhook}
                  disabled={!settings.webhookUrl || testing}
                  className="px-3 py-2 bg-white border border-slate-200 text-slate-600 text-sm
                             rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors">
                  {testing ? <RefreshCw size={13} className="animate-spin" /> : 'Test'}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1.5">
                Email address
                <span className="text-slate-400 font-normal ml-1">(coming soon — requires SMTP setup)</span>
              </label>
              <input
                type="email"
                value={settings.webhookEmail}
                onChange={e => update('webhookEmail', e.target.value)}
                placeholder="you@example.com"
                disabled
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm
                           bg-slate-50 text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>
        </Section>

        {/* Agent info */}
        <Section title="Agent Connection" description="Current data source configuration">
          <div className="space-y-3">
            {[
              { label: 'Agent URL',    value: import.meta.env.VITE_AGENT_URL || 'http://host.docker.internal:9731 (via backend)' },
              { label: 'API Base',     value: window.location.origin + '/api/v1' },
              { label: 'Preferences', value: 'Stored in browser localStorage' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start justify-between gap-4">
                <span className="text-sm text-slate-500 shrink-0">{label}</span>
                <span className="text-sm font-mono text-slate-700 text-right">{value}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 pt-1">
            To change the agent URL, update <code className="bg-slate-100 px-1 rounded">PGVAULT_AGENT_URL</code> in
            docker-compose.yml and restart the backend container.
          </p>
        </Section>

        {/* reset */}
        <div className="flex justify-end pb-4">
          <button onClick={() => {
            localStorage.removeItem('pgstudio_settings')
            window.location.reload()
          }}
            className="text-xs text-slate-400 hover:text-red-500 transition-colors">
            Reset all settings to defaults
          </button>
        </div>

      </div>
    </div>
  )
}
