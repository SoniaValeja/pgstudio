import { LayoutDashboard, ShieldCheck, Activity,
         FileText, Database, Archive, RotateCcw, ChevronRight } from 'lucide-react'
import { useSettings } from '../context/SettingsContext'

const NAV = [
  { icon: LayoutDashboard, label: 'Dashboard',  page: 'dashboard' },
  {
    icon: ShieldCheck, label: 'pgBackRest', page: null,
    children: [
      { icon: FileText,  label: 'Config Editor',  page: 'config'   },
      { icon: Database,  label: 'Stanza Manager', page: 'stanzas'  },
      { icon: Archive,   label: 'Backup Manager', page: 'backups'  },
      { icon: Archive,   label: 'Backup Browser', page: 'browser'  },
      { icon: RotateCcw, label: 'Verify Backups', page: 'restore'  },
    ],
  },
  { icon: Activity, label: 'Monitoring', page: 'monitoring' },
]

export default function Sidebar({ current, onNav }) {
  const { settings } = useSettings()

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0">
      {/* logo */}
      <div className="px-5 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-pg-500 flex items-center justify-center">
            <span className="text-white font-mono font-bold text-xs">pg</span>
          </div>
          <span className="font-semibold text-slate-800 text-sm">pgStudio</span>
        </div>
      </div>

      {/* read-only badge */}
      {settings.readOnly && (
        <div className="mx-3 mt-3 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg
                        text-xs text-amber-700 font-medium text-center">
          🔒 Read-only mode
        </div>
      )}

      {/* nav */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {NAV.map(item => (
          <div key={item.label}>
            <button
              onClick={() => item.page && onNav(item.page)}
              disabled={!item.page && !item.children}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors
                ${item.page === current ? 'bg-pg-50 text-pg-600 font-medium' : ''}
                ${!item.page ? 'text-slate-400 cursor-default' : ''}
                ${item.page && item.page !== current
                  ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 cursor-pointer' : ''}`}>
              <span className="flex items-center gap-2.5">
                <item.icon size={15} />
                {item.label}
              </span>
              {item.page === current && <ChevronRight size={13} />}
            </button>

            {item.children && (
              <div className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-100 pl-3">
                {item.children.map(child => (
                  <button key={child.page} onClick={() => onNav(child.page)}
                    className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs transition-colors
                      ${child.page === current
                        ? 'bg-pg-50 text-pg-600 font-medium'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                    <child.icon size={13} />
                    {child.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-slate-100">
        <div className="text-slate-400 text-xs">pgStudio v0.3.0 · PoC</div>
      </div>
    </aside>
  )
}
