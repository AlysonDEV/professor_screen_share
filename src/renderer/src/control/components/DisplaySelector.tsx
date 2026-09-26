import React, { useState, useEffect } from 'react'
import { Maximize2, ExternalLink } from 'lucide-react'
import type { DisplayInfo } from '@shared/types'

export const DisplaySelector: React.FC = () => {
  const [displays, setDisplays] = useState<DisplayInfo[]>([])
  const [selectedDisplayId, setSelectedDisplayId] = useState<number | null>(null)

  const loadDisplays = async (): Promise<void> => {
    try {
      if (window.electronAPI?.getDisplays) {
        const list = await window.electronAPI.getDisplays()
        setDisplays(list)
        // Default to secondary display if available
        const secondary = list.find((d) => !d.isPrimary)
        if (secondary) {
          setSelectedDisplayId(secondary.id)
        } else if (list.length > 0) {
          setSelectedDisplayId(list[0].id)
        }
      }
    } catch (err) {
      console.error('Falha ao obter monitores:', err)
    }
  }

  useEffect(() => {
    loadDisplays()
  }, [])

  const handleSendToDisplay = (fullscreen: boolean): void => {
    if (selectedDisplayId !== null && window.electronAPI?.moveViewerToDisplay) {
      window.electronAPI.moveViewerToDisplay(selectedDisplayId, fullscreen)
    }
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-cyan-500/10 text-cyan-400 font-semibold text-xs flex items-center justify-center border border-cyan-500/20">
            2
          </span>
          <h2 className="text-xs font-semibold text-slate-200">Destino (2º Monitor / Projetor)</h2>
        </div>
        <span className="text-[11px] text-slate-400">
          {displays.length} monitor(es)
        </span>
      </div>

      <div className="space-y-2">
        <select
          value={selectedDisplayId ?? ''}
          onChange={(e) => setSelectedDisplayId(Number(e.target.value))}
          className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 truncate"
        >
          {displays.map((disp) => (
            <option key={disp.id} value={disp.id}>
              {disp.name}
            </option>
          ))}
        </select>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleSendToDisplay(false)}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] transition-all text-xs font-medium text-slate-200 rounded-lg border border-slate-700"
          >
            <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
            <span>Mover Janela</span>
          </button>

          <button
            type="button"
            onClick={() => handleSendToDisplay(true)}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 active:scale-[0.98] transition-all text-xs font-semibold text-white rounded-lg shadow-sm shadow-cyan-500/20"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Tela Cheia (F11)</span>
          </button>
        </div>
      </div>
    </div>
  )
}
