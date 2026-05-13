import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, LabelList
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { TYPE_COLOR, fmtBytes } from '../utils'

function fmtDuration(sec) {
  if (!sec) return '0s'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs space-y-1.5">
      <div className="font-mono text-pg-600 font-medium">{d.label}</div>
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-sm" style={{ background: TYPE_COLOR[d.type] }} />
        <span className="text-slate-500 capitalize">{d.type}</span>
      </div>
      <div className="text-slate-500">Started: <span className="text-slate-800">
        {format(parseISO(d.start), 'MMM d, HH:mm')}
      </span></div>
      <div className="text-slate-500">Duration: <span className="text-slate-800">{fmtDuration(d.duration_sec)}</span></div>
      <div className="text-slate-500">DB Size: <span className="text-slate-800">{fmtBytes(d.db_size_bytes)}</span></div>
      <div className="text-slate-500">Delta: <span className="text-slate-800">{fmtBytes(d.delta_bytes)}</span></div>
    </div>
  )
}

export default function BackupScheduleChart({ timeline = [] }) {
  if (!timeline.length) return (
    <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
      No backup history available.
    </div>
  )

  const data = [...timeline]
    .sort((a, b) => new Date(a.start) - new Date(b.start))
    .map(b => ({
      ...b,
      date:     format(parseISO(b.start), 'MMM d'),
      time:     format(parseISO(b.start), 'HH:mm'),
      duration: b.duration_sec || 0,
      size_mb:  +(b.delta_bytes / 1e6).toFixed(1),
    }))

  return (
    <div className="space-y-6">
      {/* Duration chart */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-slate-600">Duration per backup (seconds)</span>
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
          <BarChart data={data} margin={{ top: 16, right: 4, left: 0, bottom: 0 }}>
            <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false}
              tickLine={false} tickFormatter={v => v + 's'} width={40} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(51,103,145,0.04)' }} />
            <Bar dataKey="duration" radius={[3, 3, 0, 0]} maxBarSize={36}>
              <LabelList dataKey="time" position="top"
                style={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }} />
              {data.map((e, i) => (
                <Cell key={i} fill={TYPE_COLOR[e.type] || '#94a3b8'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Size chart */}
      <div>
        <span className="text-xs font-medium text-slate-600">Delta size per backup (MB)</span>
        <ResponsiveContainer width="100%" height={160} className="mt-3">
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false}
              tickLine={false} tickFormatter={v => v + ' MB'} width={52} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(51,103,145,0.04)' }} />
            <Bar dataKey="size_mb" radius={[3, 3, 0, 0]} maxBarSize={36}>
              {data.map((e, i) => (
                <Cell key={i} fill={TYPE_COLOR[e.type] || '#94a3b8'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
