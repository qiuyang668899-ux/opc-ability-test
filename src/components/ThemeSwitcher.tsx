import { useEffect } from 'react'
import { Check, Palette, Sparkles, X } from 'lucide-react'
import { THEME_OPTIONS, type HOSTheme } from '../theme'

interface ThemeSwitcherProps {
  theme: HOSTheme
  open: boolean
  onOpenChange: (open: boolean) => void
  onThemeChange: (theme: HOSTheme) => void
}

export default function ThemeSwitcher({ theme, open, onOpenChange, onThemeChange }: ThemeSwitcherProps) {
  const current = THEME_OPTIONS.find((option) => option.id === theme) ?? THEME_OPTIONS[0]

  useEffect(() => {
    if (!open) return undefined
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  return (
    <>
      <button
        type="button"
        className="theme-fab"
        onClick={() => onOpenChange(true)}
        aria-label={`切换视觉风格，当前为${current.name}`}
        aria-expanded={open}
      >
        <Palette size={17} />
        <span>换风格</span>
      </button>

      {open && (
        <div className="theme-layer">
          <button type="button" className="theme-backdrop" onClick={() => onOpenChange(false)} aria-label="关闭风格选择" />
          <section className="theme-sheet" role="dialog" aria-modal="true" aria-labelledby="theme-sheet-title">
            <header className="theme-sheet-header">
              <div className="theme-sheet-mark"><Sparkles size={18} /></div>
              <div>
                <p>VISUAL MOOD</p>
                <h2 id="theme-sheet-title">选择此刻喜欢的界面</h2>
                <span>四套风格功能完全一致，选择会自动记住。</span>
              </div>
              <button type="button" className="theme-sheet-close" onClick={() => onOpenChange(false)} aria-label="关闭">
                <X size={17} />
              </button>
            </header>

            <div className="theme-options" role="radiogroup" aria-label="视觉风格">
              {THEME_OPTIONS.map((option) => {
                const active = option.id === theme
                return (
                  <button
                    type="button"
                    key={option.id}
                    role="radio"
                    aria-checked={active}
                    className={`theme-option ${active ? 'active' : ''}`}
                    onClick={() => onThemeChange(option.id)}
                  >
                    <span className="theme-option-preview" aria-hidden="true">
                      <i style={{ background: option.swatches[0] }} />
                      <i style={{ background: option.swatches[1] }} />
                      <i style={{ background: option.swatches[2] }} />
                    </span>
                    <span className="theme-option-copy">
                      <strong>{option.name}</strong>
                      <small>{option.en}</small>
                      <em>{option.description}</em>
                    </span>
                    <span className="theme-option-check">{active ? <Check size={15} /> : null}</span>
                  </button>
                )
              })}
            </div>

            <button type="button" className="theme-done" onClick={() => onOpenChange(false)}>使用当前风格</button>
          </section>
        </div>
      )}
    </>
  )
}
