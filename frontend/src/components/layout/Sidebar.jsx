import { useContext } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Pencil, Upload, ChevronLeft, ChevronRight } from 'lucide-react'
import AuthContext from '../../auth/AuthContext'
import { useState } from 'react'

const links = [
  { to: '/dashboard', label: 'Dashboard',      icon: LayoutDashboard },
  { to: '/edit',      label: 'Edit Portfolio',  icon: Pencil },
  { to: '/publish',   label: 'Publish',         icon: Upload },
]

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { user } = useContext(AuthContext)

  const linkClass = (isActive) => {
    const base = 'flex items-center rounded-xl py-2.5 transition-all duration-200 text-sm font-medium overflow-hidden'
    const color = isActive
      ? 'bg-primary/15 text-text-primary border border-primary/20 shadow-[0_0_20px_var(--color-primary-muted)]'
      : 'text-text-dim hover:text-text hover:bg-surface-3'
    const layout = collapsed ? 'justify-center px-2.5' : 'gap-3 px-4'
    return `${base} ${color} ${layout}`
  }

  return (
    <aside className={`h-full flex flex-col sidebar-panel shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out ${collapsed ? 'w-16' : 'w-56'}`}>

      {/* Logo + toggle */}
      <div className={`flex items-center py-6 transition-all duration-300 ${collapsed ? 'justify-center px-2' : 'justify-between px-5'}`}>
        {!collapsed && (
          <span className="flex items-center gap-2 font-bold text-xl tracking-tight whitespace-nowrap text-text-primary">
            <img src="/dzigned_logo.png" alt="" className="w-6 h-6 object-contain" />
            Dzigned
          </span>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex items-center justify-center w-7 h-7 rounded-lg text-text-muted hover:text-text hover:bg-surface-3 transition-colors shrink-0"
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      {/* Divider */}
      <div className="section-divider mb-4" />

      {/* Nav */}
      <nav className="flex flex-col gap-1 px-2 flex-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            className={({ isActive }) => linkClass(isActive)}
          >
            <Icon size={16} className="shrink-0 opacity-80" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User card */}
      <div className="section-divider mt-auto mb-0" />
      <div className={`flex items-center gap-3 px-3 py-4 ${collapsed ? 'justify-center' : ''}`}>
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-white text-xs font-semibold shrink-0">
          {getInitials(user?.name)}
        </div>
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-text truncate">{user?.name ?? 'User'}</span>
            <span className="text-xs text-text-muted truncate">{user?.email ?? ''}</span>
          </div>
        )}
      </div>
    </aside>
  )
}
