import { useEffect, useState } from 'react'
import { fetchInfo, createStanza, deleteStanza, fetchJob } from '../api/pgbackrest'
import { Database, Plus, Trash2, RefreshCw, CheckCircle, AlertTriangle,
         XCircle, ChevronDown, ChevronRight, Archive } from 'lucide-react'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import { fmtBytes, TYPE_BG } from '../utils'

export default function StanzaManager() {
  const [stanzas,     setStanzas]   = useState([])
  const [loading,     setLoading]   = useState(true)
  const [newName,     setNewName]   = useState('')
  const [creating,    setCreating]  = useState(false)
  const [deleteTarget,setDelete]    = useState(null)
  const [deleting,    setDeleting]  = useState(false)
  const [jobLog,      setJobLog]    = useState(null)
  const [toast,       setToast]     = useState(null)
  const [expanded,    setExpanded]  = useState({})

  const load = async () => {
    setLoading(true)
    try {
      const info = await fetchInfo()
      setStanzas(info.stanzas || [])
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const showToast = (type, msg) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 5000)
  }

  const pollJob = async (id) => {
    let attempts = 0
    const interval = setInterval(async () => {
      try {
        const job = await fetchJob(id)
        setJobLog(job)
        if (['success','failed'].includes(job.status) || ++attempts > 30) {
          clearInterval(interval)
          if (job.status === 'success') { showToast('success', 'Operation completed'); load() }
          else showToast('error', `Operation failed: ${job.error || 'see logs'}`)
        }
      } catch { clearInterval(interval) }
    }, 1500)
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true); setJobLog(null)
    try {
      const res = await createStanza(newName.trim())
      setNewName('')
      await pollJob(res.job_id)
    } catch (e) { showToast('error', e.message) }
    finally { setCreating(false) }
  }

  const handleDelete = async () => {
    setDeleting(true); setJobLog(null)
    try {
      const res = await deleteStanza(deleteTarget, true)
      setDelete(null)
      await pollJob(res.job_id)
    } catch (e) { showToast('error', e.message) }
    finally { setDeleting(false) }
  }

  const toggle = (name) => setExpanded(p => ({ ...p, [name]: !p[name] }))

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Stanza Manager</h1>
            <p className="text-slate-400 text-sm mt-0.5">Add, view, and delete pgBackRest stanzas</p>
          </div>
          <button onClick={load}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200
                       text-slate-600 text-sm rounded-lg hover:bg-slate-50 shadow-sm">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {toast && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm border
            ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                       : 'bg-red-50 border-red-200 text-red-800'}`}>
            {toast.type === 'success' ? <CheckCircle size={14}/> : <AlertTriangle size={14}/>}
            {toast.msg}
          </div>
        )}

        {/* create new stanza */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-1">Create New Stanza</h2>
          <p className="text-xs text-slate-400 mb-4">
            The stanza must already be defined in pgbackrest.conf. This runs{' '}
            <code className="bg-slate-100 px-1 rounded">stanza-create</code>.
          </p>
          <div className="flex gap-3">
            <input value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="stanza name e.g. main"
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-pg-200 focus:border-pg-400"/>
            <button onClick={handleCreate} disabled={!newName.trim() || creating}
              className="flex items-center gap-2 px-4 py-2 bg-pg-500 text-white text-sm
                         font-medium rounded-lg hover:bg-pg-600 disabled:opacity-50 transition-colors">
              {creating ? <RefreshCw size={13} className="animate-spin"/> : <Plus size={13}/>}
              Create
            </button>
          </div>
        </div>

        {/* job log */}
        {jobLog && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <RefreshCw size={12} className={jobLog.status === 'running'
                ? 'animate-spin text-blue-500' : 'text-slate-400'} />
              <span className="text-xs font-medium text-slate-600">
                {jobLog.label} · {jobLog.status}
              </span>
            </div>
            <div className="bg-slate-900 p-4 font-mono text-xs text-slate-300 max-h-40 overflow-auto">
              {jobLog.log?.length
                ? jobLog.log.map((l,i) => <div key={i}>{l}</div>)
                : <span className="text-slate-500">Waiting for output…</span>}
            </div>
          </div>
        )}

        {/* stanza list with per-stanza backup details */}
        <div className="space-y-4">
          {loading && stanzas.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-10 flex justify-center">
              <RefreshCw size={20} className="text-pg-400 animate-spin" />
            </div>
          )}
          {stanzas.length === 0 && !loading && (
            <div className="bg-white border border-slate-200 rounded-xl p-10
                            text-center text-slate-400 text-sm">
              No stanzas found.
            </div>
          )}
          {stanzas.map(s => (
            <div key={s.name} className="bg-white border border-slate-200 rounded-xl
                                          overflow-hidden shadow-sm">
              {/* stanza header */}
              <div className="flex items-center justify-between px-5 py-4
                              border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                onClick={() => toggle(s.name)}>
                <div className="flex items-center gap-3">
                  {expanded[s.name]
                    ? <ChevronDown size={14} className="text-slate-400"/>
                    : <ChevronRight size={14} className="text-slate-400"/>}
                  <div className="w-8 h-8 bg-pg-50 rounded-lg flex items-center justify-center">
                    <Database size={14} className="text-pg-500"/>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{s.name}</div>
                    <div className="text-xs text-slate-400">
                      PostgreSQL {s.pg_version} · {s.backup_count} backups
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {s.status?.code === 0
                    ? <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                        <CheckCircle size={12}/> ok
                      </span>
                    : <span className="flex items-center gap-1 text-red-500 text-xs font-medium">
                        <XCircle size={12}/> {s.status?.message}
                      </span>}
                  <button onClick={e => { e.stopPropagation(); setDelete(s.name) }}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50
                               rounded-lg transition-colors">
                    <Trash2 size={14}/>
                  </button>
                </div>
              </div>

              {/* per-stanza backup list */}
              {expanded[s.name] && (
                <div>
                  {/* meta strip */}
                  <div className="grid grid-cols-3 divide-x divide-slate-100
                                  bg-slate-50 border-b border-slate-100">
                    {[
                      { label: 'Last Backup',
                        value: s.last_backup_at
                          ? formatDistanceToNow(parseISO(s.last_backup_at), { addSuffix: true })
                          : '—' },
                      { label: 'Last Type',
                        value: s.last_backup_type
                          ? <span className={`px-2 py-0.5 rounded text-xs font-mono
                              ${TYPE_BG[s.last_backup_type]}`}>
                              {s.last_backup_type}
                            </span>
                          : '—' },
                      { label: 'Total Backups', value: s.backup_count },
                    ].map(({ label, value }) => (
                      <div key={label} className="px-4 py-3">
                        <div className="text-xs text-slate-400 mb-0.5">{label}</div>
                        <div className="text-sm font-medium text-slate-700">{value}</div>
                      </div>
                    ))}
                  </div>

                  {/* backup rows */}
                  {s.timeline?.length === 0 && (
                    <div className="px-5 py-6 text-center text-slate-400 text-sm">
                      No backups yet for this stanza.
                    </div>
                  )}
                  <div className="divide-y divide-slate-100">
                    {[...(s.timeline || [])].reverse().map(b => (
                      <div key={b.label}
                        className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50">
                        <Archive size={13} className="text-slate-400 shrink-0"/>
                        <span className="font-mono text-xs text-slate-700 flex-1">
                          {b.label}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded font-mono font-medium
                          ${TYPE_BG[b.type] || 'bg-slate-100 text-slate-600'}`}>
                          {b.type}
                        </span>
                        <span className="text-xs text-slate-500 w-20 text-right">
                          {fmtBytes(b.delta_bytes)}
                        </span>
                        <span className="text-xs text-slate-400 w-36 text-right font-mono">
                          {b.start ? format(parseISO(b.start), 'MMM d, HH:mm') : '—'}
                        </span>
                        <span className={`text-xs ${b.error ? 'text-red-500' : 'text-emerald-500'}`}>
                          {b.error ? '✗' : '✓'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm mx-4">
            <h3 className="font-semibold text-slate-800 mb-2">
              Delete stanza "{deleteTarget}"?
            </h3>
            <p className="text-red-600 text-sm mb-5">
              ⚠ This permanently deletes all backups in this stanza from the repository.
              This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDelete(null)}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-200
                           rounded-lg hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg
                           hover:bg-red-700 font-medium">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
