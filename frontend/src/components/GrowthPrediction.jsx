import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts'
import { format, parseISO, addDays } from 'date-fns'

function linReg(pts) {
  const n = pts.length
  const sx = pts.reduce((a, p) => a + p.x, 0), sy = pts.reduce((a, p) => a + p.y, 0)
  const sxy = pts.reduce((a, p) => a + p.x * p.y, 0), sxx = pts.reduce((a, p) => a + p.x * p.x, 0)
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx)
  return { slope, intercept: (sy - slope * sx) / n }
}

export default function GrowthPrediction({ timeline = [] }) {
  if (timeline.length < 3) return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-center">
      <p className="text-slate-400 text-sm">Need at least 3 backups for forecast</p>
    </div>
  )

  const sorted = [...timeline].sort((a, b) => new Date(a.start) - new Date(b.start))
  const base = new Date(sorted[0].start).getTime()
  const pts = sorted.map(b => ({
    x: (new Date(b.start).getTime() - base) / 86400000,
    y: b.db_size_bytes / 1e9,
    date: b.start,
  }))

  const { slope, intercept } = linReg(pts)
  const lastDate = new Date(sorted[sorted.length - 1].start)
  const lastX = pts[pts.length - 1].x
  const todayLabel = format(lastDate, 'MMM d')

  const chartData = [
    ...pts.map(p => ({ date: format(parseISO(p.date), 'MMM d'), actual: +p.y.toFixed(1), forecast: null })),
    ...[7, 14, 30].map(d => ({
      date: format(addDays(lastDate, d), 'MMM d'),
      actual: null,
      forecast: +(slope * (lastX + d) + intercept).toFixed(1),
    })),
  ]

  const pred30 = (slope * (lastX + 30) + intercept).toFixed(1)

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-slate-700">DB Size Forecast</h3>
        <span className="text-xs text-slate-400">
          +30d: <span className="text-amber-600 font-mono font-medium">{pred30} GB</span>
        </span>
      </div>
      <p className="text-xs text-slate-400 mb-4">Linear regression · actual vs projected</p>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false}
                 tickFormatter={v => v + ' GB'} width={52} />
          <Tooltip
            contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: '#64748b' }} itemStyle={{ color: '#0f172a' }} />
          <ReferenceLine x={todayLabel} stroke="#e2e8f0" strokeDasharray="3 2"
                         label={{ value: 'now', fill: '#94a3b8', fontSize: 10, position: 'top' }} />
          <Line type="monotone" dataKey="actual"   stroke="#336791" strokeWidth={2}
                dot={{ fill: '#336791', r: 3 }} connectNulls={false} name="Actual (GB)" />
          <Line type="monotone" dataKey="forecast" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 3"
                dot={{ fill: '#f59e0b', r: 3 }} connectNulls={false} name="Forecast (GB)" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
