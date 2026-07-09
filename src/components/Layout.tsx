import { Outlet, NavLink } from 'react-router-dom'
import { LayoutGrid, MessageSquare, BookOpen, Activity } from 'lucide-react'
import { UI } from '../utils/i18n'
import MusicPlayer from './MusicPlayer'

const navItems = [
  { to: '/', icon: LayoutGrid, label: UI.home },
  { to: '/architect', icon: MessageSquare, label: UI.architect },
  { to: '/journal', icon: BookOpen, label: UI.journal },
  { to: '/biosync', icon: Activity, label: UI.bioSync },
]

export default function Layout() {
  return (
    <div className="flex flex-col h-full max-w-[480px] mx-auto relative bg-hos-bg shadow-[0_0_80px_rgba(0,0,0,0.35)]">
      <main className="flex-1 overflow-y-auto pb-[92px]">
        <Outlet />
      </main>

      <MusicPlayer />

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] hos-glass z-50">
        <div className="flex justify-around items-center h-[74px] px-2 pb-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-[3px] px-4 py-2.5 rounded-2xl transition-all duration-200 ${
                  isActive
                    ? 'text-hos-cyan'
                    : 'text-hos-text-muted hover:text-hos-text-dim'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                    {isActive && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-hos-cyan shadow-[0_0_6px_rgba(0,212,245,0.6)]" />
                    )}
                  </div>
                  <span className="text-[10.5px] font-medium leading-tight mt-0.5">{label.zh}</span>
                  <span className="text-[8px] leading-none opacity-50">{label.en}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
