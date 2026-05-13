import { formatDistanceToNow, parseISO } from 'date-fns'
import { Database, CheckCircle, AlertCircle } from 'lucide-react'
import BackupTimeline from './BackupTimeline'
import GrowthPrediction from './GrowthPrediction'
import { fmtDuration, TYPE_BG } from '../utils'

export default function StanzaCard({ stanza }) {
  const ok = stanza.status?.code === 0
  const lastAgo = stanza.last_backup_at
    ? formatDistanceToNow(parseISO(stanza.last_backup_at), { addSuffix: true })
    : '—'

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">

      {/* ── header ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-pg-50 flex items-center justify-center">
            <Database size={15} className="text-pg-500" />
          </div>
          <div>
            <div className="font-semibold text-slate-800 text-sm">{stanza.name}</div>
            <div className="text-slate-400 text-xs">PostgreSQL {stanza.pg_version}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {ok
            ? <><CheckCircle size={14} className="text-emerald-500" /><span className="text-emerald-600 text-xs font-medium">Healthy</span></>
            : <><AlertCircle size={14} className="text-red-500"     /><span className="text-red-500     text-xs font-medium">{stanza.status?.message || 'Error'}</span></>
          }
        </div>
      </div>

      {/* ── meta strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50">
        {[
          { label: 'Total Backups', value: stanza.backup_count },
          { label: 'Last Backup',   value: lastAgo },
          { label: 'Last Type',
            value: stanza.last_backup_type
              ? <span className={`px-2 py-0.5 rounded text-xs font-mono font-medium ${TYPE_BG[stanza.last_backup_type]}`}>
                  {stanza.last_backup_type}
                </span>
              : '—'
          },
          { label: 'Duration', value: fmtDuration(stanza.last_duration_sec) },
        ].map(({ label, value }) => (
          <div key={label} className="px-4 py-3">
            <div className="text-slate-400 text-xs mb-1">{label}</div>
            <div className="text-slate-800 text-sm font-medium">{value}</div>
          </div>
        ))}
      </div>

      {/* ── charts ── */}
      <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BackupTimeline timeline={stanza.timeline} />
        <GrowthPrediction timeline={stanza.timeline} />
      </div>
    </div>
  )
}
