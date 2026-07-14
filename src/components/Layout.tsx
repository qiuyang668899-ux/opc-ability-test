import { useEffect, useRef } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { LayoutGrid, MessageSquare, BookOpen, HeartHandshake, Music } from 'lucide-react'
import { UI } from '../utils/i18n'
import MusicPlayer from './MusicPlayer'

const navItems = [
  { to: '/', icon: LayoutGrid, label: UI.home },
  { to: '/architect', icon: MessageSquare, label: UI.architect },
  { to: '/journal', icon: BookOpen, label: UI.journal },
  { to: '/music', icon: Music, label: { zh: '音乐', en: 'Sound' } },
  { to: '/support', icon: HeartHandshake, label: { zh: '共建', en: 'Support' } },
]

export default function Layout() {
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'auto' })
  }, [location.pathname])

  return (
    <div className="app-shell">
      <main ref={mainRef} className="flex-1 overflow-y-auto pb-[92px]">
        <Outlet />
      </main>

      <MusicPlayer />

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[520px] hos-glass z-50">
        <div className="flex justify-around items-center h-[72px] px-1 pb-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `nav-item ${
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
