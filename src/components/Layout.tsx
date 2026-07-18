import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { BookOpen, BrainCircuit, Grid3X3, Home, Music2 } from 'lucide-react'
import MusicPlayer from './MusicPlayer'
import ThemeSwitcher from './ThemeSwitcher'
import VoiceCompanion from './VoiceCompanion'
import { getStoredTheme, saveTheme, type HOSTheme } from '../theme'

const navItems = [
  { to: '/', icon: Home, label: '首页' },
  { to: '/architect', icon: BrainCircuit, label: '教练' },
  { to: '/tools', icon: Grid3X3, label: '全部工具' },
  { to: '/journal', icon: BookOpen, label: '日志' },
  { to: '/music', icon: Music2, label: '音乐' },
]

export default function Layout() {
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const [theme, setTheme] = useState<HOSTheme>(getStoredTheme)
  const [themeOpen, setThemeOpen] = useState(false)

  const changeTheme = useCallback((nextTheme: HOSTheme) => {
    setTheme(nextTheme)
    saveTheme(nextTheme)
  }, [])

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'auto' })
  }, [location.pathname])

  return (
    <div className="app-shell">
      <main ref={mainRef} className="flex-1 overflow-y-auto pb-[92px]">
        <Suspense fallback={<div className="hos-page page-loading"><span /><p>正在展开这一页…</p></div>}>
          <Outlet />
        </Suspense>
      </main>

      <MusicPlayer />
      <ThemeSwitcher theme={theme} open={themeOpen} onOpenChange={setThemeOpen} onThemeChange={changeTheme} />
      <VoiceCompanion />

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[520px] hos-glass z-50">
        <div className="flex justify-around items-center h-[68px] px-1 pb-1">
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
                  <span className="text-[10.5px] font-medium leading-tight mt-0.5">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
