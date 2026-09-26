import React, { useState } from 'react'
import { X, ExternalLink, Copy, Check, Code2, Heart, Award } from 'lucide-react'
import appIcon from '@renderer/assets/icon.png'

interface AboutModalProps {
  isOpen: boolean
  onClose: () => void
}

const GITHUB_REPO_URL = 'https://github.com/AlysonDEV/professor_screen_share'

const GithubIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
)

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const handleOpenGitHub = (): void => {
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(GITHUB_REPO_URL)
    } else {
      window.open(GITHUB_REPO_URL, '_blank')
    }
  }

  const handleCopyLink = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(GITHUB_REPO_URL)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Ignore
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0b0f19] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Sobre o Software
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Fechar (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-5 space-y-4">
          {/* Logo & Title */}
          <div className="text-center space-y-2">
            <div className="relative inline-block">
              <div className="w-20 h-20 mx-auto rounded-2xl overflow-hidden border-2 border-indigo-500/40 shadow-xl shadow-indigo-500/20 bg-slate-900 p-0.5">
                <img
                  src={appIcon}
                  alt="Professor Screen Share"
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
              <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-600 text-white border border-indigo-400/50 shadow">
                v1.0.2
              </span>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-100">Professor Screen Share</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed mt-1">
                Espelhamento de tela de alta fluidez, recorte Sniper e anotações interativas para aulas e apresentações.
              </p>
            </div>
          </div>

          {/* Developer Card */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>Desenvolvedor Principal</span>
              </span>
              <span className="font-semibold text-slate-200">AlysonDEV</span>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Organização / Time</span>
              </span>
              <span className="text-slate-300">Aincrad Development</span>
            </div>
          </div>

          {/* GitHub Repository Card */}
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-900/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-200">
                <GithubIcon className="w-4 h-4 text-white" />
                <span>Repositório Oficial no GitHub</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                Código Aberto
              </span>
            </div>

            <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-300 truncate select-all">
              {GITHUB_REPO_URL}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleOpenGitHub}
                className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm shadow-indigo-600/30 active:scale-95"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir no GitHub</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium border transition-all active:scale-95 ${
                  copied
                    ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/80'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar Link'}</span>
              </button>
            </div>
          </div>

          {/* Technical Specs Footer Info */}
          <div className="text-[10px] text-slate-400 text-center space-y-1">
            <p>Construído com Electron, React, TypeScript, Vite e Tailwind CSS</p>
            <p className="text-slate-400 flex items-center justify-center gap-1">
              <span>Feito com dedicação para a educação</span>
              <Heart className="w-2.5 h-2.5 text-rose-500 fill-rose-500 inline" />
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2.5 bg-slate-900/80 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
