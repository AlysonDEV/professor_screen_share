import React from 'react'
import {
  ArrowUpRight,
  Square,
  Circle,
  Pencil,
  Highlighter,
  Type,
  Undo2,
  Trash2
} from 'lucide-react'
import type { AnnotationTool } from '@shared/types'

interface AnnotationToolbarProps {
  currentTool: AnnotationTool
  onSelectTool: (tool: AnnotationTool) => void
  currentColor: string
  onChangeColor: (color: string) => void
  strokeWidth: number
  onChangeStrokeWidth: (width: number) => void
  onUndo: () => void
  onClear: () => void
}

const COLOR_PRESETS = [
  '#ef4444', // Red
  '#f59e0b', // Amber/Yellow
  '#10b981', // Emerald/Green
  '#06b6d4', // Cyan
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#ffffff'  // White
]

export const AnnotationToolbar: React.FC<AnnotationToolbarProps> = ({
  currentTool,
  onSelectTool,
  currentColor,
  onChangeColor,
  strokeWidth,
  onChangeStrokeWidth,
  onUndo,
  onClear
}) => {
  const tools: { id: AnnotationTool; label: string; icon: React.ReactNode }[] = [
    { id: 'arrow', label: 'Seta', icon: <ArrowUpRight className="w-4 h-4" /> },
    { id: 'rect', label: 'Retângulo', icon: <Square className="w-4 h-4" /> },
    { id: 'circle', label: 'Círculo', icon: <Circle className="w-4 h-4" /> },
    { id: 'pen', label: 'Caneta', icon: <Pencil className="w-4 h-4" /> },
    { id: 'highlighter', label: 'Marca-texto', icon: <Highlighter className="w-4 h-4" /> },
    { id: 'text', label: 'Texto', icon: <Type className="w-4 h-4" /> }
  ]

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-pink-500/10 text-pink-400 font-semibold text-xs flex items-center justify-center border border-pink-500/20">
            5
          </span>
          <h2 className="text-xs font-semibold text-slate-200">Ferramentas de Anotação</h2>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onUndo}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 text-xs flex items-center gap-1"
            title="Desfazer última anotação (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClear}
            className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-400 hover:text-red-200 transition-colors border border-red-800/50 text-xs flex items-center gap-1"
            title="Limpar todos os desenhos"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tool Selection Grid */}
      <div className="grid grid-cols-3 gap-1.5">
        {tools.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelectTool(t.id)}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${
              currentTool === t.id
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-600/30'
                : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Color Palette & Custom Picker */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Cor da anotação:</span>
          <span className="font-mono text-slate-300">{currentColor.toUpperCase()}</span>
        </div>
        <div className="flex items-center gap-1.5 justify-between bg-slate-950/60 p-1.5 rounded-lg border border-slate-800">
          {COLOR_PRESETS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onChangeColor(color)}
              className={`w-6 h-6 rounded-full border-2 transition-transform ${
                currentColor.toLowerCase() === color.toLowerCase()
                  ? 'scale-110 border-white shadow-sm ring-2 ring-indigo-500/50'
                  : 'border-transparent hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
          <label className="relative w-6 h-6 rounded-full overflow-hidden border border-slate-700 cursor-pointer flex items-center justify-center shrink-0">
            <input
              type="color"
              value={currentColor}
              onChange={(e) => onChangeColor(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div
              className="w-full h-full rounded-full"
              style={{
                background: 'conic-gradient(from 0deg, red, yellow, lime, aqua, blue, magenta, red)'
              }}
            />
          </label>
        </div>
      </div>

      {/* Stroke Width Slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Espessura do traço:</span>
          <span className="font-mono text-slate-300">{strokeWidth}px</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="2"
            max="24"
            step="1"
            value={strokeWidth}
            onChange={(e) => onChangeStrokeWidth(Number(e.target.value))}
            className="w-full accent-indigo-500 bg-slate-950 h-1.5 rounded-lg cursor-pointer"
          />
          <div
            className="rounded-full bg-slate-100 shrink-0"
            style={{
              width: `${Math.min(24, Math.max(4, strokeWidth))}px`,
              height: `${Math.min(24, Math.max(4, strokeWidth))}px`,
              backgroundColor: currentColor
            }}
          />
        </div>
      </div>

      {/* Live drawing instructions */}
      <div className="pt-1 border-t border-slate-800/80 flex items-center gap-2 text-[11px] text-indigo-300 bg-indigo-950/30 px-2.5 py-1.5 rounded-lg border border-indigo-500/20">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <span>Clique e arraste com o mouse na janela do <strong>Visualizador</strong> para desenhar em tempo real.</span>
      </div>
    </div>
  )
}
