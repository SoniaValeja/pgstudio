import { useEffect, useState } from 'react'
import { fetchConfig, saveConfigRaw } from '../api/pgbackrest'
import { useSettings } from '../context/SettingsContext'
import { Edit2, Save, RefreshCw, FileText, AlertTriangle, CheckCircle, Lock } from 'lucide-react'

export default function ConfigEditor() {
  const [raw,       setRaw]      = useState('')         // raw file text shown in editor
  const [edited,    setEdited]   = useState('')         // user's edits
  const [filePath,  setFilePath] = useState('')
  const [loading,   setLoading]  = useState(true)
  const [editing,   setEditing]  = useState(false)      // is editor unlocked?
  const [confirm,   setConfirm]  = useState(false)      // show edit-confirmation popup?
  const [saving,    setSaving]   = useState(false)
  const [toast,     setToast]    = useState(null)
  const [error,     setError]    = useState(null)
  const { settings }             = useSettings()

  const load = async () => {
    setLoading(true); setError(null); setEditing(false)
    try {
      const data = await fetchConfig()
      if (data.error) { setError(data.error); return }
      setRaw(data.raw || '')
      setEdited(data.raw || '')
      setFilePath(data.path || '')
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const isDirty = edited !== raw

  const showToast = (type, msg) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 5000)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await saveConfigRaw(edited)
      setRaw(edited)
      setEditing(false)
      showToast('success', `Saved! Backup created: ${res.backup}`)
    } catch (e) {
      showToast('error', e.response?.data?.detail || e.message)
    } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <RefreshCw size={22} className="text-pg-500 animate-spin" />
    </div>
  )

  if (error) return (
    <div className="flex-1 p-8">
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-lg">
        <div className="flex gap-3">
          <AlertTriangle size={20} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-red-800 font-medium text-sm">Cannot load config</p>
            <p className="text-red-600 text-xs mt-1 font-mono">{error}</p>
            <p className="text-red-600 text-xs mt-2">
              Make sure the agent is running with{' '}
              <code className="bg-red-100 px-1 rounded">PGBACKREST_CONFIG</code> set.
            </p>
            <button onClick={load}
              className="mt-3 px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700">
              Retry
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">

        {/* header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Config Editor</h1>
            <p className="text-slate-400 text-xs mt-0.5 font-mono">{filePath}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200
                         text-slate-600 text-sm rounded-lg hover:bg-slate-50 shadow-sm">
              <RefreshCw size={13} /> Reload
            </button>
            {!editing && !settings.readOnly && (
              <button onClick={() => setConfirm(true)}
                className="flex items-center gap-2 px-4 py-1.5 bg-pg-500 text-white text-sm
                           font-medium rounded-lg hover:bg-pg-600 shadow-sm transition-colors">
                <Edit2 size={13} /> Edit
              </button>
            )}
            {!editing && settings.readOnly && (
              <span className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50
                               border border-amber-200 px-3 py-1.5 rounded-lg">
                <Lock size={12} /> Read-only mode
              </span>
            )}
            {editing && (
              <>
                <button onClick={() => { setEdited(raw); setEditing(false) }}
                  className="px-3 py-1.5 text-sm text-slate-600 border border-slate-200
                             rounded-lg hover:bg-slate-50">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={!isDirty || saving}
                  className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-lg
                    transition-colors shadow-sm
                    ${isDirty ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                  {saving
                    ? <><RefreshCw size={13} className="animate-spin"/> Saving…</>
                    : <><Save size={13}/> Save</>}
                </button>
              </>
            )}
          </div>
        </div>

        {/* toast */}
        {toast && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm border
            ${toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'}`}>
            {toast.type === 'success' ? <CheckCircle size={14}/> : <AlertTriangle size={14}/>}
            {toast.msg}
          </div>
        )}

        {/* edit mode banner */}
        {editing && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3
                          flex items-center gap-2 text-sm text-amber-800">
            <Edit2 size={13} className="text-amber-500 shrink-0"/>
            Editing mode — modify the content below then click Save.
            A backup of the original file will be created automatically.
          </div>
        )}

        {/* dirty banner */}
        {editing && isDirty && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2
                          text-xs text-blue-700 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"/>
            Unsaved changes
          </div>
        )}

        {/* file editor */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {/* editor toolbar */}
          <div className="flex items-center justify-between px-4 py-2.5
                          bg-slate-800 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-400"/>
                <span className="w-3 h-3 rounded-full bg-amber-400"/>
                <span className="w-3 h-3 rounded-full bg-emerald-400"/>
              </div>
              <span className="text-slate-400 text-xs font-mono ml-2">pgbackrest.conf</span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded font-medium
              ${editing ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-700 text-slate-400'}`}>
              {editing ? 'EDITING' : 'READ ONLY'}
            </span>
          </div>

          {/* line numbers + content */}
          <div className="flex bg-slate-900">
            {/* line numbers */}
            <div className="select-none px-3 py-4 text-right bg-slate-800/50
                            border-r border-slate-700 min-w-[3rem]">
              {(editing ? edited : raw).split('\n').map((_, i) => (
                <div key={i} className="text-slate-600 text-xs font-mono leading-6">
                  {i + 1}
                </div>
              ))}
            </div>

            {/* content area */}
            {editing ? (
              <textarea
                className="flex-1 bg-slate-900 text-slate-100 font-mono text-sm
                           px-4 py-4 focus:outline-none resize-none leading-6
                           min-h-64"
                value={edited}
                onChange={e => setEdited(e.target.value)}
                spellCheck={false}
                rows={(edited.split('\n').length) + 2}
                autoFocus
              />
            ) : (
              <pre className="flex-1 px-4 py-4 font-mono text-sm text-slate-100
                              leading-6 overflow-x-auto whitespace-pre">
                {raw.split('\n').map((line, i) => {
                  // syntax highlight sections, keys, comments
                  if (line.startsWith('['))
                    return <div key={i} className="text-amber-300">{line}</div>
                  if (line.startsWith('#') || line.startsWith(';'))
                    return <div key={i} className="text-slate-500 italic">{line}</div>
                  if (line.includes('=')) {
                    const [k, ...v] = line.split('=')
                    return (
                      <div key={i}>
                        <span className="text-blue-300">{k}</span>
                        <span className="text-slate-400">=</span>
                        <span className="text-emerald-300">{v.join('=')}</span>
                      </div>
                    )
                  }
                  return <div key={i} className="text-slate-300">{line || ' '}</div>
                })}
              </pre>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-400 text-right">
          {raw.split('\n').length} lines · {new Blob([raw]).size} bytes
        </p>
      </div>

      {/* edit confirmation modal */}
      {confirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md mx-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
                <Edit2 size={18} className="text-amber-500" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Edit pgbackrest.conf?</h3>
                <p className="text-slate-500 text-sm mt-1">
                  Before saving, pgStudio will automatically create a backup of the
                  current file named:
                </p>
                <div className="mt-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                  <code className="text-xs text-slate-600 font-mono">
                    pgbackrest_{new Date().toISOString().slice(0,16).replace(/[-:T]/g, (m) =>
                      m === 'T' ? '' : m)}.conf
                  </code>
                </div>
                <p className="text-slate-500 text-xs mt-2">
                  The backup is saved in the same directory as the config file.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirm(false)}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-200
                           rounded-lg hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={() => { setConfirm(false); setEditing(true) }}
                className="px-4 py-2 text-sm bg-pg-500 text-white rounded-lg
                           hover:bg-pg-600 font-medium">
                Continue to Edit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
