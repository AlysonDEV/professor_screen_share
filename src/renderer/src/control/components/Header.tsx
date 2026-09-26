import React, { useState, useEffect } from 'react'
import { Sparkles, Minus, Square, Copy, X, HelpCircle } from 'lucide-react'
import appIcon from '@renderer/assets/icon.png'

interface HeaderProps {
  isStreaming?: boolean
  onOpenAbout?: () => void
}

export const Header: React.FC<HeaderProps> = ({ isStreaming = false, onOpenAbout }) => {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    // Check initial maximized state
    window.electronAPI?.isWindowMaximized?.().then((max) => {
      setIsMaximized(max)
    }).catch(() => {})

    // Subscribe to maximized changes
    const unsub = window.electronAPI?.onWindowMaximizedState?.((max) => {
      setIsMaximized(max)
    })

    return (): void => {
      unsub?.()
    }
  }, [])

  const handleMinimize = (): void => {
    window.electronAPI?.minimizeWindow?.()
  }

  const handleMaximizeToggle = (): void => {
    window.electronAPI?.maximizeWindow?.()
  }

  const handleClose = (): void => {
    window.electronAPI?.closeWindow?.()
  }

  const handleHeaderDoubleClick = (e: React.MouseEvent<HTMLElement>): void => {
    // Only toggle if clicked on the header drag region itself, not on buttons or inputs
    if ((e.target as HTMLElement).closest('.app-no-drag')) return
    handleMaximizeToggle()
  }

  return (
    <header
      onDoubleClick={handleHeaderDoubleClick}
      className="app-drag-region h-11 shrink-0 flex items-center justify-between px-3 bg-[#0b0f19]/95 backdrop-blur-md border-b border-slate-800/80 select-none transition-colors z-30"
    >
      {/* Brand & Title */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-lg overflow-hidden border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-sm shadow-indigo-950 bg-slate-900">
          <img src={appIcon} alt="Professor Screen Share" className="w-full h-full object-cover" />
        </div>
        <div className="min-w-0 flex items-baseline gap-2">
          <h1 className="text-xs font-bold text-slate-100 tracking-wide truncate">
            Professor Screen Share
          </h1>
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-slate-400 font-normal truncate">
            <span>Menu & Compartilhamento</span>
            <Sparkles className="w-2.5 h-2.5 text-indigo-400/80 inline shrink-0" />
          </span>
        </div>
      </div>

      {/* Right Section: Status Badge + Window Controls */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Status Pill Badge */}
        <div className="app-no-drag">
          <div
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
              isStreaming
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                : 'bg-slate-800/70 text-slate-400 border-slate-700/60'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isStreaming ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
              }`}
            />
            <span>{isStreaming ? 'Ativo' : 'Pronto'}</span>
          </div>
        </div>

        {/* About / Info Button */}
        {onOpenAbout && (
          <div className="app-no-drag">
            <button
              type="button"
              onClick={onOpenAbout}
              className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-indigo-300 hover:bg-slate-800/80 active:scale-90 transition-all duration-150"
              title="Sobre o Desenvolvedor & Repositório GitHub"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Divider */}
        <div className="w-px h-3.5 bg-slate-800 shrink-0 mx-0.5" />

        {/* Custom Window Control Buttons */}
        <div className="app-no-drag flex items-center gap-0.5">
          <button
            type="button"
            onClick={handleMinimize}
            className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 active:scale-90 transition-all duration-150"
            title="Minimizar"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleMaximizeToggle}
            className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 active:scale-90 transition-all duration-150"
            title={isMaximized ? 'Restaurar tamanho' : 'Maximizar'}
          >
            {isMaximized ? (
              <Copy className="w-3 h-3" />
            ) : (
              <Square className="w-3 h-3" />
            )}
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-200 hover:bg-rose-500/20 active:bg-rose-600 active:text-white active:scale-90 transition-all duration-150 ml-0.5"
            title="Fechar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  )
}
