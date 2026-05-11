import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { format, parseISO } from 'date-fns'
import { TYPE_COLOR, fmtBytes, fmtDuration } from '../utils'

const Tip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs space-y-1">
      <div className="font-mono text-pg-600 font-medium">{d.label}</div>
      <div className="text-slate-500">Type: <span className="text-slate-800 capitalize font-medium">{d.type}</span></div>
      <div className="text-slate-500">DB Size: <span className="text-slate-800">{fmtBytes(d.db_size_bytes)}</span></div>
      <div className="text-slate-500">Delta: <span className="text-slate-800">{fmtBytes(d.delta_bytes)}</span></div>
      <div className="text-slate-500">Duration: <span className="text-slate-800">{fmtDuration(d.duration_sec)}</span></div>
      <div className="text-slate-500">{format(parseISO(d.start), 'MMM d, HH:mm')}</div>
    </div>
  )
}

export default function BackupTimeline({ timeline = [] }) {
  const data = timeline.map(b => ({
    ...b,
    date: format(parseISO(b.start), 'MMM d'),
    delta_gb: +(b.delta_bytes / 1e9).toFixed(2),
  }))

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-700">Backup History</h3>
        <div className="flex gap-3 text-xs text-slate-400">
          {Object.entries(TYPE_COLOR).map(([type, color]) => (
            <span key={type} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm inline-block" style={{ background: color }} />
              {type}
            </span>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => v + ' GB'} width={52} />
          <Tooltip content={<Tip />} cursor={{ fill: 'rgba(51,103,145,0.04)' }} />
          <Bar dataKey="delta_gb" radius={[3, 3, 0, 0]} maxBarSize={32}>
            {data.map((e, i) => <Cell key={i} fill={TYPE_COLOR[e.type] || '#94a3b8'} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
