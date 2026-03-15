import { Outlet, NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/voids', label: 'Opportunity Gaps' },
  { to: '/alerts', label: 'Alerts' },
  { to: '/reports', label: 'Reports' },
  { to: '/methodology', label: 'Methodology' },
]

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Top navigation bar */}
      <header className="bg-slate-900 border-b border-slate-800">
        <div className="flex items-center justify-between px-6 py-3">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-accent to-emerald-500 flex items-center justify-center">
              <span className="text-slate-950 font-bold text-sm">EP</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">EconPulse</h1>
              <p className="text-xs text-slate-400">Economic Intelligence Platform</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-800 text-teal-accent'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Status indicator */}
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <div className="w-2 h-2 rounded-full bg-teal-accent animate-pulse" />
            <span>Live</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="h-[calc(100vh-60px)]">
        <Outlet />
      </main>
    </div>
  )
}
