import { useEffect, useState, useRef } from 'react'
import { fetchInfo, fetchJobs, fetchJob, triggerBackup } from '../api/pgbackrest'
import { useSettings } from '../context/SettingsContext'
import { Play, RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'

const STATUS_STYLE = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  failed:  'bg-red-50 text-red-700 border-red-100',
  running: 'bg-blue-50 text-blue-700 border-blue-200',
  queued:  'bg-amber-50 text-amber-700 border-amber-200',
}
const STATUS_ICON = {
  success: <CheckCircle size={13} />,
  failed:  <XCircle size={13} />,
  running: <RefreshCw size={13} className="animate-spin" />,
  queued:  <Clock size={13} />,
}

export default function BackupManager() {
  const [stanzas, setStanzas]     = useState([])
  const [jobs, setJobs]           = useState([])
  const [selectedJob, setJob]     = useState(null)
  const [stanza, setStanza]       = useState('')
  const [btype, setBtype]         = useState('full')
  const [triggering, setTriggering] = useState(false)
  const [confirm, setConfirm]     = useState(false)
  const [toast, setToast]         = useState(null)
  const { settings } = useSettings()
  const pollRef                   = useRef(null)

  const loadStanzas = async () => {
    try {
      const info = await fetchInfo()
      const names = info.stanzas?.map(s => s.name) || []
      setStanzas(names)
      if (names.length && !stanza) setStanza(names[0])
    } catch {}
  }

  const loadJobs = async () => {
    try { setJobs(await fetchJobs()) } catch {}
  }

  const loadJob = async (id) => {
    try { setJob(await fetchJob(id)) } catch {}
  }

  useEffect(() => {
    loadStanzas(); loadJobs()
    pollRef.current = setInterval(loadJobs, 4000)
    return () => clearInterval(pollRef.current)
  }, [])

  const handleTrigger = async () => {
    setTriggering(true); setConfirm(false)
    try {
      const res = await triggerBackup(stanza, btype)
      setToast({ type: 'success', msg: `Job started: ${res.job_id}` })
      await loadJobs()
    } catch (e) {
      setToast({ type: 'error', msg: e.message })
    } finally {
      setTriggering(false)
      setTimeout(() => setToast(null), 5000)
    }
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">

        <div>
          <h1 className="text-xl font-semibold text-slate-800">Backup Manager</h1>
          <p className="text-slate-400 text-sm mt-0.5">Trigger backups and monitor job status</p>
        </div>

        {toast && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm border
            ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                       : 'bg-red-50 border-red-200 text-red-800'}`}>
            {toast.type === 'success' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
            {toast.msg}
          </div>
        )}

        {/* trigger panel */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Trigger Backup</h2>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Stanza</label>
              <select value={stanza} onChange={e => setStanza(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700
                           focus:outline-none focus:ring-2 focus:ring-pg-200 focus:border-pg-400">
                {stanzas.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Type</label>
              <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                {['full','diff','incr'].map(t => (
                  <button key={t} onClick={() => setBtype(t)}
                    className={`px-4 py-2 text-sm font-medium transition-colors
                      ${btype === t ? 'bg-pg-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => setConfirm(true)} disabled={!stanza || triggering || settings.readOnly}
              className="flex items-center gap-2 px-5 py-2 bg-pg-500 text-white text-sm font-medium
                         rounded-lg hover:bg-pg-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {triggering ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
              Run Backup
            </button>
          </div>
        </div>

        {/* jobs list */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Recent Jobs</h2>
            <button onClick={loadJobs}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600">
              <RefreshCw size={12} /> Refresh
            </button>
          </div>

          {jobs.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-400 text-sm">
              No jobs yet — trigger a backup above.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {jobs.map(job => (
                <div key={job.id}
                  onClick={() => loadJob(job.id).then(() => {})}
                  className="flex items-center justify-between px-5 py-3 hover:bg-slate-50
                             cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border font-medium
                      ${STATUS_STYLE[job.status] || STATUS_STYLE.queued}`}>
                      {STATUS_ICON[job.status]} {job.status}
                    </span>
                    <span className="text-sm text-slate-700">{job.label}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400 font-mono">{job.id}</div>
                    <div className="text-xs text-slate-400">{job.created_at?.slice(0,19).replace('T',' ')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* job log drawer */}
        {selectedJob && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3">
                <span className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border font-medium
                  ${STATUS_STYLE[selectedJob.status]}`}>
                  {STATUS_ICON[selectedJob.status]} {selectedJob.status}
                </span>
                <span className="text-sm font-medium text-slate-700">{selectedJob.label}</span>
              </div>
              <button onClick={() => setJob(null)} className="text-slate-400 hover:text-slate-600 text-xs">
                Close
              </button>
            </div>
            <div className="bg-slate-900 p-4 font-mono text-xs text-slate-300 max-h-64 overflow-auto">
              {selectedJob.log?.length
                ? selectedJob.log.map((line, i) => <div key={i}>{line}</div>)
                : <span className="text-slate-500">No output yet…</span>}
            </div>
          </div>
        )}
      </div>

      {/* confirm modal */}
      {confirm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm mx-4">
            <h3 className="font-semibold text-slate-800 mb-2">Run {btype} backup?</h3>
            <p className="text-slate-500 text-sm mb-5">
              This will trigger a <strong>{btype}</strong> backup on stanza <strong>{stanza}</strong>.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirm(false)}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={handleTrigger}
                className="px-4 py-2 text-sm bg-pg-500 text-white rounded-lg hover:bg-pg-600 font-medium">
                Run
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
