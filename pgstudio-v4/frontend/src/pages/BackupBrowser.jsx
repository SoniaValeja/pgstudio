import { useEffect, useState } from 'react'
import { browseBackups, fetchInfo } from '../api/pgbackrest'
import { ChevronDown, ChevronRight, Archive, RefreshCw } from 'lucide-react'
import { format, fromUnixTime } from 'date-fns'
import { fmtBytes, TYPE_BG } from '../utils'

export default function BackupBrowser() {
  const [stanzas, setStanzas]   = useState([])
  const [stanza, setStanza]     = useState('')
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(false)
  const [expanded, setExpanded] = useState({})
  const [error, setError]       = useState(null)

  useEffect(() => {
    fetchInfo().then(info => {
      const list = (info.stanzas || []).map(s => s.name)
      setStanzas(list)
      if (list.length) { setStanza(list[0]); load(list[0]) }
    }).catch(() => {})
  }, [])

  const load = async (s) => {
    setLoading(true); setError(null)
    try {
      const res = await browseBackups(s || stanza)
      setData(res.data || [])
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const toggle = (label) => setExpanded(prev => ({ ...prev, [label]: !prev[label] }))

  const stanzaData = data?.find(s => s.name === stanza)

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Backup Browser</h1>
            <p className="text-slate-400 text-sm mt-0.5">Explore individual backups and WAL archive info</p>
          </div>
          <div className="flex items-center gap-3">
            <select value={stanza} onChange={e => { setStanza(e.target.value); load(e.target.value) }}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700
                         focus:outline-none focus:ring-2 focus:ring-pg-200">
              {stanzas.map(s => <option key={s}>{s}</option>)}
            </select>
            <button onClick={() => load()} className="flex items-center gap-1.5 px-3 py-2 bg-white
              border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 shadow-sm">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
        )}

        {/* WAL archive strip */}
        {stanzaData?.archive && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex gap-8">
            <div>
              <div className="text-xs text-slate-400 mb-1">WAL Archive Min</div>
              <div className="font-mono text-xs text-slate-700">
                {stanzaData.archive[0]?.min || '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">WAL Archive Max</div>
              <div className="font-mono text-xs text-slate-700">
                {stanzaData.archive[0]?.max || '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">PostgreSQL Version</div>
              <div className="text-sm text-slate-700 font-medium">
                {stanzaData.db?.[0]?.version || '—'}
              </div>
            </div>
          </div>
        )}

        {/* backup list */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <span className="text-sm font-semibold text-slate-700">
              Backups ({stanzaData?.backup?.length || 0})
            </span>
          </div>

          {loading && !stanzaData && (
            <div className="flex items-center justify-center py-12">
              <RefreshCw size={20} className="text-pg-500 animate-spin" />
            </div>
          )}

          <div className="divide-y divide-slate-100">
            {[...(stanzaData?.backup || [])].reverse().map(b => (
              <div key={b.label}>
                {/* row */}
                <div onClick={() => toggle(b.label)}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 cursor-pointer transition-colors">
                  <span className="text-slate-400">
                    {expanded[b.label] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </span>
                  <Archive size={14} className="text-slate-400 shrink-0" />
                  <span className="font-mono text-sm text-slate-700 flex-1">{b.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded font-mono font-medium ${TYPE_BG[b.type] || 'bg-slate-100 text-slate-600'}`}>
                    {b.type}
                  </span>
                  <span className="text-sm text-slate-500 w-28 text-right">
                    {fmtBytes(b.info?.size)}
                  </span>
                  <span className="text-xs text-slate-400 w-40 text-right">
                    {b.timestamp?.start
                      ? format(fromUnixTime(b.timestamp.start), 'MMM d yyyy, HH:mm')
                      : '—'}
                  </span>
                </div>

                {/* expanded detail */}
                {expanded[b.label] && (
                  <div className="bg-slate-50 border-t border-slate-100 px-8 py-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {[
                      { label: 'DB Size',      value: fmtBytes(b.info?.size) },
                      { label: 'Delta',        value: fmtBytes(b.info?.delta) },
                      { label: 'Repo Size',    value: fmtBytes(b.info?.repository?.size) },
                      { label: 'Repo Delta',   value: fmtBytes(b.info?.repository?.delta) },
                      { label: 'WAL Start',    value: b.archive?.start || '—' },
                      { label: 'WAL Stop',     value: b.archive?.stop || '—' },
                      { label: 'pgBackRest',   value: b.backrest?.version || '—' },
                      { label: 'Error',        value: b.error ? 'Yes' : 'None' },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div className="text-xs text-slate-400 mb-0.5">{label}</div>
                        <div className="font-mono text-xs text-slate-700">{value}</div>
                      </div>
                    ))}
                    {b.reference?.length > 0 && (
                      <div className="col-span-2 md:col-span-4">
                        <div className="text-xs text-slate-400 mb-0.5">References</div>
                        <div className="font-mono text-xs text-slate-700">{b.reference.join(', ')}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
