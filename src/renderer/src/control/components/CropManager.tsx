import React, { useState } from 'react'
import { RotateCcw, Crosshair, Sliders } from 'lucide-react'
import type { CropRegion } from '@shared/types'
import { formatDimensionsWithAspect } from '@renderer/shared/utils/geometry'

interface CropManagerProps {
  activeCrop: CropRegion | null
  onStartSniper: (transparency: number) => void
  onResetCrop: () => void
}

export const CropManager: React.FC<CropManagerProps> = ({
  activeCrop,
  onStartSniper,
  onResetCrop
}) => {
  const [transparency, setTransparency] = useState<number>(() => {
    const saved = localStorage.getItem('sniperTransparency')
    return saved ? Number(saved) : 70
  })

  const handleTransparencyChange = (val: number): void => {
    setTransparency(val)
    localStorage.setItem('sniperTransparency', String(val))
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold text-xs flex items-center justify-center border border-emerald-500/20">
            3
          </span>
          <h2 className="text-xs font-semibold text-slate-200">Área de Recorte (Sniper)</h2>
        </div>
        {activeCrop ? (
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-medium border border-emerald-500/20">
            Recorte Ativo
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px] font-medium">
            Tela Inteira
          </span>
        )}
      </div>

      {/* Regulador de Transparência do Sniper */}
      <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-medium text-[11px]">Transparência da Seleção:</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-mono font-semibold text-xs border border-emerald-500/30">
            {transparency}%
          </span>
        </div>

        <input
          type="range"
          min="10"
          max="95"
          step="5"
          value={transparency}
          onChange={(e) => handleTransparencyChange(Number(e.target.value))}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          title={`Transparência: ${transparency}%`}
        />

        <div className="flex justify-between text-[10px] text-slate-500 font-medium px-0.5">
          <span>10% (Mais escuro)</span>
          <span>50%</span>
          <span>95% (Super transparente)</span>
        </div>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => onStartSniper(transparency)}
          className="w-full py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] transition-all text-white text-xs font-semibold rounded-lg shadow-sm shadow-emerald-500/20 flex items-center justify-center gap-2"
        >
          <Crosshair className="w-4 h-4" />
          <span>Recortar Área da Tela</span>
        </button>

        {activeCrop ? (
          <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs">
            <div className="text-slate-300 font-mono text-[11px] truncate">
              {formatDimensionsWithAspect(activeCrop.width, activeCrop.height)}
            </div>
            <button
              type="button"
              onClick={onResetCrop}
              className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-medium ml-2 shrink-0"
              title="Voltar para tela inteira"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Resetar</span>
            </button>
          </div>
        ) : (
          <p className="text-[11px] text-slate-400 text-center">
            Regule a transparência acima e clique no botão para selecionar
          </p>
        )}
      </div>
    </div>
  )
}
