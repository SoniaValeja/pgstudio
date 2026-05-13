export default function StatCard({ label, value, sub, icon: Icon, color = 'blue' }) {
  const colors = {
    blue:   { bg: 'bg-pg-50',       icon: 'text-pg-500',      border: 'border-pg-100' },
    green:  { bg: 'bg-emerald-50',  icon: 'text-emerald-600', border: 'border-emerald-100' },
    amber:  { bg: 'bg-amber-50',    icon: 'text-amber-600',   border: 'border-amber-100' },
    red:    { bg: 'bg-red-50',      icon: 'text-red-500',     border: 'border-red-100' },
  }
  const c = colors[color] || colors.blue
  return (
    <div className={`bg-white border ${c.border} rounded-xl p-5`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-slate-500 text-xs font-medium uppercase tracking-wide">{label}</span>
        {Icon && (
          <div className={`w-7 h-7 ${c.bg} rounded-lg flex items-center justify-center`}>
            <Icon size={14} className={c.icon} />
          </div>
        )}
      </div>
      <div className="text-2xl font-semibold text-slate-800">{value}</div>
      {sub && <div className="text-slate-400 text-xs mt-1">{sub}</div>}
    </div>
  )
}
