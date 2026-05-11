import { useEffect, useState } from 'react'
import { Database, Archive, Clock, ServerCrash, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { fetchInfo } from '../api/pgbackrest'
import StatCard from '../components/StatCard'
import StanzaCard from '../components/StanzaCard'
import { fmtBytes } from '../utils'
import { formatDistanceToNow, parseISO } from 'date-fns'

const SOURCE_LABEL = {
  agent: { label: 'Remote Agent', color: 'text-emerald-600 bg-emerald-50' },
  local: { label: 'Local CLI',    color: 'text-pg-600 bg-pg-50' },
  mock:  { label: 'Demo Mode',    color: 'text-amber-600 bg-amber-50' },
}

export default function Dashboard() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const d = await fetchInfo()
      setData(d)
      setLastRefresh(new Date())
    } catch (e) {
      setError(e.message || 'Failed to fetch backup data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // ── loading ──
  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-3">
        <RefreshCw size={24} className="text-pg-500 animate-spin mx-auto" />
        <p className="text-slate-500 text-sm">Loading backup data…</p>
      </div>
    </div>
  )

  // ── error ──
  if (error) return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md text-center space-y-3">
        <ServerCrash size={28} className="text-red-400 mx-auto" />
        <p className="text-red-700 font-medium text-sm">Could not load data</p>
        <p className="text-red-500 text-xs font-mono">{error}</p>
        <button onClick={load}
          className="mt-2 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors">
          Retry
        </button>
      </div>
    </div>
  )

  const src = SOURCE_LABEL[data._source] || SOURCE_LABEL.mock
  const totalRepoSize = data.stanzas.reduce((sum, s) => {
    const last = s.timeline?.at(-1)
    return sum + (last?.repo_size_bytes || 0)
  }, 0)

  const lastBackupAt = data.stanzas
    .map(s => s.last_backup_at)
    .filter(Boolean)
    .sort()
    .at(-1)

  const unhealthy = data.stanzas.filter(s => s.status?.code !== 0).length

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">

        {/* ── top bar ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Dashboard</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              {lastRefresh && `Last refreshed ${formatDistanceToNow(lastRefresh, { addSuffix: true })}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* data source badge */}
            <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${src.color}`}>
              {data._source === 'mock' ? <WifiOff size={11} /> : <Wifi size={11} />}
              {src.label}
            </span>
            <button onClick={load}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600
                         text-sm rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
              <RefreshCw size={13} />
              Refresh
            </button>
          </div>
        </div>

        {/* ── demo mode banner ── */}
        {data._source === 'mock' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-start gap-3">
            <span className="text-amber-500 text-lg leading-none mt-0.5">⚠</span>
            <div>
              <p className="text-amber-800 text-sm font-medium">Running in Demo Mode</p>
              <p className="text-amber-700 text-xs mt-0.5">
                pgbackrest was not found and no agent is configured. Showing mock data.
                Set <code className="bg-amber-100 px-1 rounded font-mono">PGVAULT_AGENT_URL</code> in{' '}
                <code className="bg-amber-100 px-1 rounded font-mono">.env</code> to connect to a real server.
              </p>
            </div>
          </div>
        )}

        {/* ── stat cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Stanzas"       value={data.stanza_count}         icon={Database} color="blue" />
          <StatCard label="Total Backups" value={data.total_backups}         icon={Archive}  color="green" />
          <StatCard label="Repo Size"     value={fmtBytes(totalRepoSize)}    icon={Archive}  color="blue"
                    sub="across all stanzas" />
          <StatCard label="Unhealthy"     value={unhealthy}
                    sub={unhealthy === 0 ? 'All stanzas OK' : `${unhealthy} stanza(s) need attention`}
                    icon={ServerCrash}
                    color={unhealthy > 0 ? 'red' : 'green'} />
        </div>

        {/* ── per-stanza cards ── */}
        <div className="space-y-4">
          {data.stanzas.map(stanza => (
            <StanzaCard key={stanza.name} stanza={stanza} />
          ))}
        </div>

      </div>
    </div>
  )
}
