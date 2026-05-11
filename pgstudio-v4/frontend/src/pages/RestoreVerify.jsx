import { useEffect, useState } from 'react'
import { fetchInfo, verifyBackup, fetchJob } from '../api/pgbackrest'
import { ShieldCheck, RefreshCw, CheckCircle, AlertTriangle, Clock } from 'lucide-react'

export default function RestoreVerify() {
  const [stanzas, setStanzas]   = useState([])
  const [stanza, setStanza]     = useState('')
  const [running, setRunning]   = useState(false)
  const [job, setJob]           = useState(null)
  const [toast, setToast]       = useState(null)

  useEffect(() => {
    fetchInfo().then(info => {
      const names = info.stanzas?.map(s => s.name) || []
      setStanzas(names)
      if (names.length) setStanza(names[0])
    }).catch(() => {})
  }, [])

  const pollJob = async (id) => {
    let attempts = 0
    const interval = setInterval(async () => {
      try {
        const j = await fetchJob(id)
        setJob(j)
        if (['success','failed'].includes(j.status) || ++attempts > 60) {
          clearInterval(interval)
          setRunning(false)
          setToast(j.status === 'success'
            ? { type: 'success', msg: 'Verification passed — all backups are valid' }
            : { type: 'error',   msg: 'Verification failed — check logs below' })
          setTimeout(() => setToast(null), 6000)
        }
      } catch { clearInterval(interval); setRunning(false) }
    }, 2000)
  }

  const handleVerify = async () => {
    setRunning(true); setJob(null)
    try {
      const res = await verifyBackup(stanza)
      await pollJob(res.job_id)
    } catch (e) {
      setRunning(false)
      setToast({ type: 'error', msg: e.message })
    }
  }

  const statusColor = {
    success: 'text-emerald-600', failed: 'text-red-500',
    running: 'text-blue-500',    queued: 'text-amber-500',
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Verify Backups</h1>
          <p className="text-slate-400 text-sm mt-0.5">Verify backup integrity and plan point-in-time recovery</p>
        </div>

        {toast && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm border
            ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                       : 'bg-red-50 border-red-200 text-red-800'}`}>
            {toast.type === 'success' ? <CheckCircle size={14}/> : <AlertTriangle size={14}/>}
            {toast.msg}
          </div>
        )}

        {/* verify panel */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-pg-50 rounded-xl flex items-center justify-center shrink-0">
              <ShieldCheck size={18} className="text-pg-500" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-slate-700 mb-1">Verify Backup Integrity</h2>
              <p className="text-xs text-slate-400 mb-4">
                Runs <code className="bg-slate-100 px-1 rounded font-mono">pgbackrest verify</code> — checks
                that all backup files and WAL segments are present and uncorrupted.
                This may take several minutes for large repositories.
              </p>
              <div className="flex gap-3 items-center">
                <select value={stanza} onChange={e => setStanza(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700
                             focus:outline-none focus:ring-2 focus:ring-pg-200">
                  {stanzas.map(s => <option key={s}>{s}</option>)}
                </select>
                <button onClick={handleVerify} disabled={running || !stanza}
                  className="flex items-center gap-2 px-4 py-2 bg-pg-500 text-white text-sm font-medium
                             rounded-lg hover:bg-pg-600 disabled:opacity-50 transition-colors">
                  {running ? <RefreshCw size={13} className="animate-spin"/> : <ShieldCheck size={13}/>}
                  {running ? 'Verifying…' : 'Run Verify'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* live job output */}
        {job && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {job.status === 'running'
                  ? <RefreshCw size={12} className="animate-spin text-blue-500"/>
                  : job.status === 'success'
                    ? <CheckCircle size={12} className="text-emerald-500"/>
                    : <AlertTriangle size={12} className="text-red-500"/>}
                <span className={`text-xs font-medium ${statusColor[job.status]}`}>
                  {job.label} · {job.status}
                </span>
              </div>
              <span className="text-xs text-slate-400 font-mono">{job.id}</span>
            </div>
            <div className="bg-slate-900 p-4 font-mono text-xs text-slate-300 max-h-72 overflow-auto">
              {job.log?.length
                ? job.log.map((line, i) => (
                    <div key={i} className={
                      line.includes('error') || line.includes('WARN') ? 'text-amber-400' :
                      line.includes('completed') ? 'text-emerald-400' : ''}>
                      {line}
                    </div>
                  ))
                : <span className="text-slate-500">Waiting for output…</span>}
            </div>
          </div>
        )}

        {/* PITR info box */}
        <div className="bg-pg-50 border border-pg-100 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-pg-700 mb-2 flex items-center gap-2">
            <Clock size={14}/> Point-in-Time Recovery (PITR)
          </h2>
          <p className="text-xs text-pg-600 mb-3">
            To restore to a specific point in time, run this on the database server:
          </p>
          <div className="bg-white border border-pg-100 rounded-lg p-3 font-mono text-xs text-slate-700 space-y-1">
            <div className="text-slate-400"># restore to latest</div>
            <div>pgbackrest --stanza={stanza || 'main'} restore</div>
            <div className="mt-2 text-slate-400"># restore to specific time</div>
            <div>pgbackrest --stanza={stanza || 'main'} \</div>
            <div className="pl-4">--type=time \</div>
            <div className="pl-4">--target="2026-03-23 17:05:47" restore</div>
          </div>
          <p className="text-xs text-pg-500 mt-3">
            ⚠ Restore must be run directly on the database server, not through pgStudio.
            Stop PostgreSQL first and ensure the data directory is empty or backed up.
          </p>
        </div>
      </div>
    </div>
  )
}
