import React, { useState, useEffect } from 'react'
import { Sparkles } from 'lucide-react'
import appIcon from '@renderer/assets/icon.png'

interface SplashScreenProps {
  isReady: boolean
  onFinish?: () => void
}

const LOADING_STEPS = [
  'Inicializando módulos da aplicação...',
  'Detectando monitores e fontes de vídeo...',
  'Iniciando servidor local de transmissão...',
  'Preparando ambiente de anotações...',
  'Tudo pronto!'
]

export const SplashScreen: React.FC<SplashScreenProps> = ({ isReady, onFinish }) => {
  const [stepIndex, setStepIndex] = useState(0)
  const [progress, setProgress] = useState(15)
  const [isVisible, setIsVisible] = useState(true)
  const [isFadingOut, setIsFadingOut] = useState(false)

  useEffect(() => {
    // Step progression timer
    const stepInterval = setInterval(() => {
      setStepIndex((prev) => {
        if (prev < LOADING_STEPS.length - 2) {
          return prev + 1
        }
        return prev
      })
    }, 400)

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 85) {
          return prev + Math.floor(Math.random() * 15 + 10)
        }
        return prev
      })
    }, 300)

    return (): void => {
      clearInterval(stepInterval)
      clearInterval(progressInterval)
    }
  }, [])

  useEffect(() => {
    if (isReady) {
      // Fast-forward to ready state
      setStepIndex(LOADING_STEPS.length - 1)
      setProgress(100)

      // Allow user to appreciate the ready state before smooth fade-out
      const fadeTimer = setTimeout(() => {
        setIsFadingOut(true)
      }, 600)

      const unmountTimer = setTimeout(() => {
        setIsVisible(false)
        onFinish?.()
      }, 1200)

      return (): void => {
        clearTimeout(fadeTimer)
        clearTimeout(unmountTimer)
      }
    }
    return undefined
  }, [isReady, onFinish])

  if (!isVisible) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070b14] text-slate-100 select-none overflow-hidden transition-opacity duration-600 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background Ambient Glow */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Center Content Box */}
      <div className="relative z-10 flex flex-col items-center max-w-sm px-6 text-center space-y-6">
        {/* Glowing App Icon with pulse ring */}
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl overflow-hidden border-2 border-indigo-500/40 shadow-[0_0_40px_rgba(99,102,241,0.35)] p-0.5 bg-slate-900 animate-in zoom-in-75 duration-500">
            <img
              src={appIcon}
              alt="Professor Screen Share"
              className="w-full h-full object-cover rounded-2xl"
            />
          </div>
          <span className="absolute -inset-1 rounded-3xl border border-indigo-400/20 animate-ping pointer-events-none" />
        </div>

        {/* Title & Tagline */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-center gap-1.5">
            <h1 className="text-xl font-extrabold text-white tracking-tight">
              Professor Screen Share
            </h1>
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 animate-bounce" />
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Espelhamento, Recorte e Anotações Interativas
          </p>
        </div>

        {/* Sleek Progress Bar */}
        <div className="w-56 space-y-2 pt-2">
          <div className="w-full h-1.5 bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 rounded-full transition-all duration-300 ease-out shadow-sm"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Dynamic Status Text */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span className="truncate pr-2">{LOADING_STEPS[stepIndex]}</span>
            <span className="text-indigo-300 font-semibold shrink-0">{progress}%</span>
          </div>
        </div>

        {/* Developer Attribution & Version */}
        <div className="pt-4 text-[10px] text-slate-500 font-medium flex items-center gap-2">
          <span>v1.0.1</span>
          <span>•</span>
          <span>Por AlysonDEV</span>
        </div>
      </div>
    </div>
  )
}
