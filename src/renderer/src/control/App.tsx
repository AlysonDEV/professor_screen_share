import React, { useState, useEffect } from 'react'
import { Header } from './components/Header'
import { SourcePicker } from './components/SourcePicker'
import { DisplaySelector } from './components/DisplaySelector'
import { CropManager } from './components/CropManager'
import { WebViewersPanel } from './components/WebViewersPanel'
import { AnnotationToolbar } from './components/AnnotationToolbar'
import { LogViewerModal } from './components/LogViewerModal'
import { AboutModal } from './components/AboutModal'
import { SplashScreen } from './components/SplashScreen'
import { FileText, Info } from 'lucide-react'
import type { CropRegion, AnnotationTool } from '@shared/types'

export const ControlApp: React.FC = () => {
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)
  const [activeCrop, setActiveCrop] = useState<CropRegion | null>(null)
  const [currentTool, setCurrentTool] = useState<AnnotationTool>('arrow')
  const [currentColor, setCurrentColor] = useState<string>('#ef4444')
  const [strokeWidth, setStrokeWidth] = useState<number>(5)
  const [isLogModalOpen, setIsLogModalOpen] = useState(false)
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false)
  const [isAppReady, setIsAppReady] = useState(false)

  useEffect(() => {
    // Forward window errors to logger
    const handleGlobalError = (event: ErrorEvent): void => {
      window.electronAPI?.log?.('ERROR', `Erro de interface: ${event.message}`, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      })
    }

    const handleRejection = (event: PromiseRejectionEvent): void => {
      window.electronAPI?.log?.('ERROR', `Promessa não tratada na UI: ${String(event.reason)}`)
    }

    window.addEventListener('error', handleGlobalError)
    window.addEventListener('unhandledrejection', handleRejection)

    // Listen for crop changes
    const unsubCrop = window.electronAPI?.onCropUpdated((region) => {
      setActiveCrop(region)
    })

    // Listen for tool changes from viewer
    const unsubTool = window.electronAPI?.onActiveToolChanged?.((settings) => {
      setCurrentTool(settings.tool)
      setCurrentColor(settings.color)
      setStrokeWidth(settings.width)
    })

    // Listen for auto-selected source when cropping another monitor
    const unsubAutoSource = window.electronAPI?.onSourceAutoSelected?.((sourceId: string) => {
      setSelectedSourceId(sourceId)
    })

    // Simulated initial resource readiness check
    const readyTimer = setTimeout(() => {
      setIsAppReady(true)
    }, 1300)

    return (): void => {
      clearTimeout(readyTimer)
      window.removeEventListener('error', handleGlobalError)
      window.removeEventListener('unhandledrejection', handleRejection)
      unsubCrop?.()
      unsubTool?.()
      unsubAutoSource?.()
    }
  }, [])

  // Sync active tool changes to main/viewer
  useEffect(() => {
    window.electronAPI?.setActiveTool?.({
      tool: currentTool,
      color: currentColor,
      width: strokeWidth
    })
  }, [currentTool, currentColor, strokeWidth])

  const handleSelectSource = (id: string): void => {
    setSelectedSourceId(id)
    if (window.electronAPI?.selectSource) {
      window.electronAPI.selectSource(id)
    }
  }

  const handleStartSniper = (transparency?: number): void => {
    if (window.electronAPI?.startSniper) {
      window.electronAPI.startSniper(transparency)
    }
  }

  const handleResetCrop = (): void => {
    if (window.electronAPI?.resetCrop) {
      window.electronAPI.resetCrop()
    }
  }

  const handleUndoAnnotation = (): void => {
    if (window.electronAPI?.undoAnnotation) {
      window.electronAPI.undoAnnotation()
    }
  }

  const handleClearAnnotations = (): void => {
    if (window.electronAPI?.clearAnnotations) {
      window.electronAPI.clearAnnotations()
    }
  }

  return (
    <div className="relative h-screen w-full flex flex-col bg-[#070b14] text-slate-100 overflow-hidden font-sans select-none">
      {/* Subtle Ambient Glow Blobs */}
      <div className="absolute -top-20 -left-20 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-24 w-60 h-60 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 left-1/3 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Unified Custom Titlebar Header */}
      <Header
        isStreaming={Boolean(selectedSourceId)}
        onOpenAbout={() => setIsAboutModalOpen(true)}
      />

      {/* Main Content Dashboard */}
      <main className="relative z-10 flex-1 overflow-y-auto p-3 space-y-2.5">
        <SourcePicker
          selectedSourceId={selectedSourceId}
          onSelectSource={handleSelectSource}
        />

        <DisplaySelector />

        <CropManager
          activeCrop={activeCrop}
          onStartSniper={handleStartSniper}
          onResetCrop={handleResetCrop}
        />

        <WebViewersPanel />

        <AnnotationToolbar
          currentTool={currentTool}
          onSelectTool={setCurrentTool}
          currentColor={currentColor}
          onChangeColor={setCurrentColor}
          strokeWidth={strokeWidth}
          onChangeStrokeWidth={setStrokeWidth}
          onUndo={handleUndoAnnotation}
          onClear={handleClearAnnotations}
        />
      </main>

      {/* Footer Info & Modal Triggers */}
      <footer className="relative z-10 px-3 py-2 bg-[#0b0f19]/90 backdrop-blur-sm border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsLogModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white transition-all border border-slate-700/60 active:scale-95 shadow-sm"
            title="Ver histórico de logs e erros (logs/app.log)"
          >
            <FileText className="w-3 h-3 text-indigo-400" />
            <span>Logs</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAboutModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white transition-all border border-slate-700/60 active:scale-95 shadow-sm"
            title="Sobre o Desenvolvedor e Repositório GitHub"
          >
            <Info className="w-3 h-3 text-indigo-400" />
            <span>Sobre</span>
          </button>
        </div>

        <div className="flex items-center gap-3 text-slate-500 font-mono text-[10px]">
          <span>F11: Tela Cheia</span>
          <span>•</span>
          <span>Ctrl+Z: Desfazer</span>
        </div>
      </footer>

      <LogViewerModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
      />

      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />

      {/* Initial Startup Splash Screen */}
      <SplashScreen isReady={isAppReady} />
    </div>
  )
}
