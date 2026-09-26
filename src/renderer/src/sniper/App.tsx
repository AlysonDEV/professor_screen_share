import React, { useState, useEffect, useRef } from 'react'
import { Sliders } from 'lucide-react'
import { normalizeRect, formatDimensionsWithAspect } from '@renderer/shared/utils/geometry'

export const SniperApp: React.FC = () => {
  const [isSelecting, setIsSelecting] = useState(false)
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null)
  const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null)
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)
  const [monitorName, setMonitorName] = useState<string>('Monitor')
  const [targetDisplayId, setTargetDisplayId] = useState<number | undefined>(undefined)
  const [transparency, setTransparency] = useState<number>(() => {
    const rawHash = window.location.hash
    const queryStr = rawHash.includes('?') ? rawHash.split('?')[1] : ''
    const params = new URLSearchParams(queryStr)
    const tParam = params.get('transparency')
    if (tParam) return Number(tParam)
    const saved = localStorage.getItem('sniperTransparency')
    return saved ? Number(saved) : 70
  })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const rawHash = window.location.hash
    const queryStr = rawHash.includes('?') ? rawHash.split('?')[1] : ''
    const params = new URLSearchParams(queryStr)
    const name = params.get('name')
    if (name) setMonitorName(decodeURIComponent(name))
    const dId = params.get('displayId')
    if (dId) setTargetDisplayId(Number(dId))
    const tParam = params.get('transparency')
    if (tParam) setTransparency(Number(tParam))
  }, [])

  useEffect(() => {
    const unsub = window.electronAPI?.onSniperTransparencyChanged?.((val: number) => {
      setTransparency(val)
    })
    return (): void => {
      unsub?.()
    }
  }, [])

  const handleTransparencyChange = (val: number): void => {
    setTransparency(val)
    localStorage.setItem('sniperTransparency', String(val))
    window.electronAPI?.setSniperTransparency?.(val)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setIsSelecting(false)
        setStartPoint(null)
        setCurrentPoint(null)
        window.electronAPI?.cancelSniper?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return (): void => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const handleMouseDown = (e: React.MouseEvent): void => {
    if (e.button !== 0) return // Only primary click
    setIsSelecting(true)
    const point = { x: e.clientX, y: e.clientY }
    setStartPoint(point)
    setCurrentPoint(point)
  }

  const handleMouseMove = (e: React.MouseEvent): void => {
    setCursorPos({ x: e.clientX, y: e.clientY })
    if (!isSelecting) return
    setCurrentPoint({ x: e.clientX, y: e.clientY })
  }

  const handleMouseUp = (): void => {
    if (!isSelecting || !startPoint || !currentPoint) {
      setIsSelecting(false)
      return
    }

    setIsSelecting(false)
    const box = normalizeRect(startPoint.x, startPoint.y, currentPoint.x, currentPoint.y)

    // Clear state
    setStartPoint(null)
    setCurrentPoint(null)

    if (box.width > 20 && box.height > 20) {
      window.electronAPI?.regionSelected?.({
        ...box,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        displayId: targetDisplayId
      })
    } else {
      window.electronAPI?.cancelSniper?.()
    }
  }

  const currentBox =
    startPoint && currentPoint
      ? normalizeRect(startPoint.x, startPoint.y, currentPoint.x, currentPoint.y)
      : null

  // Transparency ranges from 10% (darker) to 95% (almost fully transparent)
  const overlayAlpha = Math.max(0.02, Math.min(0.95, (100 - transparency) / 100))

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => setCursorPos(null)}
      className="w-screen h-screen cursor-crosshair select-none overflow-hidden relative"
      style={{
        backgroundColor: currentBox ? 'transparent' : `rgba(0, 0, 0, ${overlayAlpha})`
      }}
    >
      {/* Top Banner Guide with live transparency slider */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-slate-950/90 backdrop-blur-md border border-slate-700/80 text-xs text-slate-200 shadow-2xl flex items-center gap-3 z-50 pointer-events-auto"
      >
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        <span className="font-semibold text-white">Modo Recorte (Sniper)</span>
        <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 font-medium text-[11px] border border-cyan-500/30">
          {monitorName}
        </span>
        <span className="text-slate-500">|</span>

        {/* Live Transparency adjustment right in the Sniper HUD */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-1 rounded-full border border-slate-700/60">
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[11px] text-slate-300">Transparência:</span>
          <input
            type="range"
            min="10"
            max="95"
            step="5"
            value={transparency}
            onChange={(e) => handleTransparencyChange(Number(e.target.value))}
            className="w-20 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <span className="font-mono text-cyan-300 text-[11px] font-semibold min-w-[30px]">
            {transparency}%
          </span>
        </div>

        <span className="text-slate-500">|</span>
        <span className="text-slate-300">Clique e arraste para selecionar</span>
        <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-mono border border-slate-700">
          ESC para Cancelar
        </span>
      </div>

      {/* Crosshair guidelines while moving before selection */}
      {!currentBox && cursorPos && (
        <>
          <div
            className="absolute top-0 bottom-0 w-px bg-cyan-400/25 pointer-events-none"
            style={{ left: `${cursorPos.x}px` }}
          />
          <div
            className="absolute left-0 right-0 h-px bg-cyan-400/25 pointer-events-none"
            style={{ top: `${cursorPos.y}px` }}
          />
        </>
      )}

      {/* Selection Box Overlay (Crystal clear inside, user-regulated transparent outside) */}
      {currentBox && (
        <div
          className="absolute border-2 border-cyan-400 pointer-events-none transition-none"
          style={{
            left: `${currentBox.x}px`,
            top: `${currentBox.y}px`,
            width: `${currentBox.width}px`,
            height: `${currentBox.height}px`,
            backgroundColor: 'transparent',
            boxShadow: `0 0 0 9999px rgba(0, 0, 0, ${overlayAlpha})`
          }}
        >
          {/* Subtle outer glow on selection border */}
          <div className="absolute inset-0 shadow-[0_0_12px_rgba(6,182,212,0.45)] pointer-events-none" />

          {/* Precision Corner Accents */}
          <div className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 border-t-2 border-l-2 border-cyan-300" />
          <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 border-t-2 border-r-2 border-cyan-300" />
          <div className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 border-b-2 border-l-2 border-cyan-300" />
          <div className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 border-b-2 border-r-2 border-cyan-300" />

          {/* Dimension Tag */}
          <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-slate-900/90 text-cyan-300 font-mono text-xs border border-cyan-500/40 shadow-xl backdrop-blur-sm flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>{formatDimensionsWithAspect(currentBox.width, currentBox.height)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
