export function fmtBytes(bytes) {
  if (!bytes && bytes !== 0) return '—'
  if (bytes >= 1e12) return (bytes / 1e12).toFixed(1) + ' TB'
  if (bytes >= 1e9)  return (bytes / 1e9).toFixed(1)  + ' GB'
  if (bytes >= 1e6)  return (bytes / 1e6).toFixed(1)  + ' MB'
  return bytes + ' B'
}

export function fmtDuration(sec) {
  if (!sec) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

export const TYPE_COLOR = {
  full: '#336791',
  diff: '#10b981',
  incr: '#f59e0b',
}

export const TYPE_BG = {
  full: 'bg-pg-100 text-pg-600',
  diff: 'bg-emerald-50 text-emerald-700',
  incr: 'bg-amber-50 text-amber-700',
}
