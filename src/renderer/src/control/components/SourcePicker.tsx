import React, { useState, useEffect } from 'react'
import { Monitor, AppWindow, RefreshCw, Info } from 'lucide-react'
import type { DesktopSourceInfo } from '@shared/types'

interface SourcePickerProps {
  selectedSourceId: string | null
  onSelectSource: (id: string) => void
}

export const SourcePicker: React.FC<SourcePickerProps> = ({
  selectedSourceId,
  onSelectSource
}) => {
  const [sources, setSources] = useState<DesktopSourceInfo[]>([])
  const [activeTab, setActiveTab] = useState<'screen' | 'window'>('screen')
  const [isLoading, setIsLoading] = useState(false)

  const fetchSources = async (): Promise<void> => {
    setIsLoading(true)
    try {
      if (window.electronAPI?.getSources) {
        const list = await window.electronAPI.getSources()
        setSources(list)
        if (!selectedSourceId && list.length > 0) {
          onSelectSource(list[0].id)
        }
      }
    } catch (err) {
      console.error('Falha ao carregar fontes:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSources()
  }, [])

  const handleTabChange = (tab: 'screen' | 'window'): void => {
    setActiveTab(tab)
    const matchingSources = sources.filter((s) => (tab === 'screen' ? s.isScreen : !s.isScreen))
    if (matchingSources.length > 0) {
      // If current selection is not in this tab, pick the first one
      const isCurrentInTab = matchingSources.some((s) => s.id === selectedSourceId)
      if (!isCurrentInTab) {
        onSelectSource(matchingSources[0].id)
      }
    }
  }

  const filteredSources = sources.filter((s) =>
    activeTab === 'screen' ? s.isScreen : !s.isScreen
  )

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 font-semibold text-xs flex items-center justify-center border border-indigo-500/20">
            1
          </span>
          <h2 className="text-xs font-semibold text-slate-200">Fonte de Captura</h2>
        </div>

        <button
          onClick={fetchSources}
          disabled={isLoading}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors border border-slate-700/60 text-xs flex items-center gap-1"
          title="Atualizar lista de fontes"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
        </button>
      </div>

      {/* Tabs Screen vs Window */}
      <div className="grid grid-cols-2 gap-1.5 bg-slate-950/60 p-1 rounded-lg border border-slate-800/50">
        <button
          type="button"
          onClick={() => handleTabChange('screen')}
          className={`flex items-center justify-center gap-1.5 py-1 text-xs font-medium rounded-md transition-all ${
            activeTab === 'screen'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>Telas ({sources.filter((s) => s.isScreen).length})</span>
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('window')}
          className={`flex items-center justify-center gap-1.5 py-1 text-xs font-medium rounded-md transition-all ${
            activeTab === 'window'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <AppWindow className="w-3.5 h-3.5" />
          <span>Janelas ({sources.filter((s) => !s.isScreen).length})</span>
        </button>
      </div>

      {/* Alert / Tip for Windows Capture */}
      {activeTab === 'window' && (
        <div className="flex items-start gap-2 p-2 rounded-lg bg-indigo-950/40 border border-indigo-800/40 text-[11px] text-indigo-300/90 leading-relaxed">
          <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-indigo-200">Menus e Caixas Suspensas:</span> No modo de captura de Janela, menus suspensos (dropdowns do Excel, popups e botões flutuantes) são janelas Win32 separadas pelo Windows. Para capturá-los com 100% de precisão, vá na aba <span className="font-semibold text-indigo-200">Telas</span> e use o <span className="font-semibold text-indigo-200">Recortar Área da Tela (Sniper)</span> em volta do programa!
          </div>
        </div>
      )}

      {/* Source Select Dropdown & Preview */}
      <div className="space-y-1.5">
        <select
          value={selectedSourceId || ''}
          onChange={(e) => onSelectSource(e.target.value)}
          className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 truncate"
        >
          {filteredSources.map((src) => (
            <option key={src.id} value={src.id} className="bg-slate-900 text-slate-200 py-1">
              {src.name}
            </option>
          ))}
          {filteredSources.length === 0 && (
            <option value="" disabled>
              Nenhuma fonte encontrada nesta aba
            </option>
          )}
        </select>

        {/* Selected Thumbnail Mini Preview */}
        {selectedSourceId && (
          <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-800/80 bg-slate-950 flex items-center justify-center">
            {sources.find((s) => s.id === selectedSourceId)?.thumbnail ? (
              <img
                src={sources.find((s) => s.id === selectedSourceId)?.thumbnail}
                alt="Thumbnail"
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="text-[11px] text-slate-500">Sem preview disponível</span>
            )}
            <div className="absolute bottom-1 right-1.5 px-1.5 py-0.5 rounded bg-slate-900/80 backdrop-blur-sm text-[10px] text-slate-300 border border-slate-700/50">
              60 FPS Direct
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
