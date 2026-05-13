import { useEffect, useState, useRef } from 'react'
import { fetchInfo } from '../api/pgbackrest'
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { format, parseISO } from 'date-fns'
import BackupScheduleChart from '../components/BackupScheduleChart'

const _trendPoints = []

export default function Monitoring() {
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [trend,     setTrend]     = useState([..._trendPoints])
  const [selStanza, setSelStanza] = useState(null)
  const timerRef = useRef(null)

  const load = async () => {
    setLoading(true)
    try {
      const info = await fetchInfo()
      setData(info)
      const totalRepo = info.stanzas?.reduce((s, st) => {
        const last = st.timeline?.at(-1)
        return s + (last?.repo_size_bytes || 0)
      }, 0) || 0
      const point = { ts: new Date().toISOString(), repo_gb: +(totalRepo / 1e9).toFixed(3) }
      _trendPoints.push(point)
      if (_trendPoints.length > 60) _trendPoints.shift()
      setTrend([..._trendPoints])
      if (!selStanza && info.stanzas?.length) setSelStanza(info.stanzas[0].name)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    timerRef.current = setInterval(load, 60000)
    return () => clearInterval(timerRef.current)
  }, [])

  const selectedStanza = data?.stanzas?.find(s => s.name === selStanza)

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Monitoring</h1>
            <p className="text-slate-400 text-sm mt-0.5">WAL archiving health, storage trends, backup schedule</p>
          </div>
          <button onClick={load}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200
                       text-slate-600 text-sm rounded-lg hover:bg-slate-50 shadow-sm">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* WAL archiving status */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <h2 className="text-sm font-semibold text-slate-700">WAL Archiving Status</h2>
          </div>
          {!data ? (
            <div className="p-8 flex justify-center"><RefreshCw size={18} className="text-pg-400 animate-spin" /></div>
          ) : data.stanzas?.length === 0 ? (
            <div className="px-5 py-8 text-center text-slate-400 text-sm">No stanzas found.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.stanzas?.map(s => {
                const ok = s.status?.code === 0
                const lastBk = s.timeline?.at(-1)
                return (
                  <div key={s.name} className="px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${ok ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      <div>
                        <div className="text-sm font-medium text-slate-800">{s.name}</div>
                        <div className="text-xs text-slate-400">PostgreSQL {s.pg_version}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-10 text-right">
                      <div>
                        <div className="text-xs text-slate-400 mb-0.5">Status</div>
                        <div className={`text-xs font-medium flex items-center gap-1 justify-end ${ok ? 'text-emerald-600' : 'text-red-500'}`}>
                          {ok ? <CheckCircle size={11}/> : <XCircle size={11}/>}
                          {s.status?.message || '—'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 mb-0.5">Last Backup</div>
                        <div className="text-xs font-mono text-slate-700">{lastBk?.label || '—'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 mb-0.5">Total Backups</div>
                        <div className="text-sm font-semibold text-slate-800">{s.backup_count}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* storage trend */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-700">Storage Trend</h2>
              <p className="text-xs text-slate-400 mt-0.5">Total repo size — sampled each refresh (session only)</p>
            </div>
            {trend.length > 0 && (
              <span className="text-xs text-slate-400 font-mono">Latest: {trend.at(-1)?.repo_gb} GB</span>
            )}
          </div>
          {trend.length < 2 ? (
            <div className="h-40 flex items-center justify-center text-slate-400 text-sm">
              Collecting data — refresh a few times to see the trend.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={trend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="ts" tick={{ fill: '#94a3b8', fontSize: 10 }}
                  tickFormatter={v => format(parseISO(v), 'HH:mm')} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false}
                  tickLine={false} tickFormatter={v => v + ' GB'} width={56} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                  labelFormatter={v => format(parseISO(v), 'HH:mm:ss')}
                  formatter={v => [v + ' GB', 'Repo Size']} />
                <Line type="monotone" dataKey="repo_gb" stroke="#336791" strokeWidth={2}
                  dot={{ fill: '#336791', r: 3 }} name="Repo Size (GB)" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* backup schedule */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
            <div>
              <h2 className="text-sm font-semibold text-slate-700">Backup Schedule</h2>
              <p className="text-xs text-slate-400 mt-0.5">Duration, time and size per backup — colour coded by type</p>
            </div>
            {data?.stanzas?.length > 1 && (
              <select value={selStanza || ''} onChange={e => setSelStanza(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700
                           focus:outline-none focus:ring-2 focus:ring-pg-200">
                {data.stanzas.map(s => <option key={s.name}>{s.name}</option>)}
              </select>
            )}
          </div>
          <div className="p-5">
            {!data
              ? <div className="flex justify-center py-8"><RefreshCw size={18} className="text-pg-400 animate-spin" /></div>
              : <BackupScheduleChart timeline={selectedStanza?.timeline || []} />
            }
          </div>
        </div>

      </div>
    </div>
  )
}
