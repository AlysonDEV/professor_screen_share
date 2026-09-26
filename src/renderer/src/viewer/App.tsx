import React, { useEffect, useRef, useState, useCallback } from 'react'
import type {
  CropRegion,
  Annotation,
  AnnotationTool,
  PenAnnotation,
  ArrowAnnotation,
  RectAnnotation,
  CircleAnnotation,
  TextAnnotation,
  ActiveToolSettings
} from '@shared/types'
import { renderAnnotation } from './engine/drawAnnotations'
import {
  Maximize2,
  Minimize2,
  VideoOff,
  ArrowUpRight,
  Square,
  Circle,
  Pencil,
  Highlighter,
  Type,
  Undo2,
  Trash2,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  ZoomOut,
  Hand
} from 'lucide-react'

const COLOR_PRESETS = [
  '#ef4444', // Red
  '#f59e0b', // Amber/Yellow
  '#10b981', // Emerald/Green
  '#06b6d4', // Cyan
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#ffffff'  // White
]

export const ViewerApp: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [currentSourceId, setCurrentSourceId] = useState<string | null>(null)
  const [cropRegion, setCropRegion] = useState<CropRegion | null>(null)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [streamActive, setStreamActive] = useState(false)
  const [showHud, setShowHud] = useState(true)
  const [hudCollapsed, setHudCollapsed] = useState(false)

  // Active Tool state (synced with Control window and local HUD)
  const [activeTool, setActiveTool] = useState<AnnotationTool>('arrow')
  const [activeColor, setActiveColor] = useState<string>('#ef4444')
  const [activeWidth, setActiveWidth] = useState<number>(5)

  // In-progress drawing state
  const isDrawingRef = useRef(false)
  const currentDrawingRef = useRef<Annotation | null>(null)
  const lastWebBroadcastRef = useRef<number>(0)
  const [textInputPos, setTextInputPos] = useState<{
    canvasX: number
    canvasY: number
    screenX: number
    screenY: number
  } | null>(null)
  const [textValue, setTextValue] = useState('')

  const cropRegionRef = useRef<CropRegion | null>(null)
  const annotationsRef = useRef<Annotation[]>([])
  const activeToolRef = useRef<ActiveToolSettings>({
    tool: activeTool,
    color: activeColor,
    width: activeWidth
  })

  // Zoom and Pan state
  const [zoomLevel, setZoomLevel] = useState<number>(1.0)
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isPanMode, setIsPanMode] = useState<boolean>(false)
  const isPanningRef = useRef(false)
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const zoomLevelRef = useRef(1.0)
  const panOffsetRef = useRef({ x: 0, y: 0 })
  cropRegionRef.current = cropRegion
  annotationsRef.current = annotations
  activeToolRef.current = {
    tool: activeTool,
    color: activeColor,
    width: activeWidth
  }
  zoomLevelRef.current = zoomLevel
  panOffsetRef.current = panOffset

  const resetZoom = (): void => {
    setZoomLevel(1.0)
    setPanOffset({ x: 0, y: 0 })
  }

  const changeZoom = (delta: number): void => {
    setZoomLevel((prev) => {
      const next = Math.max(0.5, Math.min(5.0, Number((prev + delta).toFixed(1))))
      if (next === 1.0) {
        setPanOffset({ x: 0, y: 0 })
      }
      return next
    })
  }

  // 1. Setup Electron IPC listeners
  useEffect(() => {
    const unsubSource = window.electronAPI?.onSetSource((sourceId) => {
      setCurrentSourceId(sourceId)
    })

    const unsubCrop = window.electronAPI?.onApplyCrop((region) => {
      setCropRegion(region)
    })

    const unsubNewAnn = window.electronAPI?.onNewAnnotation((ann) => {
      setAnnotations((prev) => [...prev, ann])
    })

    const unsubClearAnn = window.electronAPI?.onClearAnnotations(() => {
      setAnnotations([])
    })

    const unsubSyncAnn = window.electronAPI?.onSyncAnnotations((list) => {
      setAnnotations(list)
    })

    const unsubToolChanged = window.electronAPI?.onActiveToolChanged?.((settings) => {
      setActiveTool(settings.tool)
      setActiveColor(settings.color)
      setActiveWidth(settings.width)
      activeToolRef.current = settings
    })

    return (): void => {
      unsubSource?.()
      unsubCrop?.()
      unsubNewAnn?.()
      unsubClearAnn?.()
      unsubSyncAnn?.()
      unsubToolChanged?.()
    }
  }, [])

  // 2. Stream Capture when sourceId changes
  useEffect(() => {
    let stream: MediaStream | null = null

    async function initStream(): Promise<void> {
      if (!currentSourceId) return

      try {
        if (stream) {
          stream.getTracks().forEach((t) => t.stop())
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: currentSourceId,
              minFrameRate: 30,
              maxFrameRate: 60
            }
          } as unknown as MediaTrackConstraints
        })

        const videoTrack = mediaStream.getVideoTracks()[0]
        if (videoTrack) {
          videoTrack.onended = (): void => {
            setStreamActive(false)
          }
        }

        stream = mediaStream
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
          await videoRef.current.play()
          setStreamActive(true)
        }
      } catch (err) {
        console.error('Erro ao conectar stream de vídeo:', err)
        setStreamActive(false)
      }
    }

    initStream()

    return (): void => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop())
      }
    }
  }, [currentSourceId])

  // 3. F11 Fullscreen and Ctrl+Z undo Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'F11') {
        e.preventDefault()
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen()
          setIsFullscreen(true)
        } else {
          document.exitFullscreen()
          setIsFullscreen(false)
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        window.electronAPI?.undoAnnotation?.()
      } else if (e.key === 'Escape') {
        if (textInputPos) {
          setTextInputPos(null)
          setTextValue('')
        }
        isDrawingRef.current = false
        currentDrawingRef.current = null
      }
    }

    const handleFullscreenChange = (): void => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }

    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return (): void => {
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [textInputPos])

  // 4. Auto-hide HUD overlay after 4 seconds of inactivity
  useEffect(() => {
    let timeout: NodeJS.Timeout

    const handleMouseMove = (): void => {
      setShowHud(true)
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        setShowHud(false)
      }, 4000)
    }

    window.addEventListener('mousemove', handleMouseMove)
    timeout = setTimeout(() => setShowHud(false), 4000)

    return (): void => {
      window.removeEventListener('mousemove', handleMouseMove)
      clearTimeout(timeout)
    }
  }, [])

  // 5. 60 FPS Render Loop
  useEffect(() => {
    let animationFrameId: number

    const render = (): void => {
      const video = videoRef.current
      const canvas = canvasRef.current

      if (video && canvas && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          const activeCrop = cropRegionRef.current
          const currentAnns = annotationsRef.current
          const inProgressAnn = currentDrawingRef.current

          // Adjust internal canvas resolution to match source or crop
          if (activeCrop && activeCrop.width > 0 && activeCrop.height > 0) {
            let sx = activeCrop.x
            let sy = activeCrop.y
            let sw = activeCrop.width
            let sh = activeCrop.height

            // Calculate DPI scaling between sniper CSS pixels and source video frame pixels
            if (activeCrop.screenWidth && activeCrop.screenHeight) {
              const scaleX = video.videoWidth / activeCrop.screenWidth
              const scaleY = video.videoHeight / activeCrop.screenHeight
              sx = Math.round(activeCrop.x * scaleX)
              sy = Math.round(activeCrop.y * scaleY)
              sw = Math.round(activeCrop.width * scaleX)
              sh = Math.round(activeCrop.height * scaleY)
            }

            // Safe bounding clamp
            sx = Math.max(0, Math.min(sx, video.videoWidth - 1))
            sy = Math.max(0, Math.min(sy, video.videoHeight - 1))
            sw = Math.max(1, Math.min(sw, video.videoWidth - sx))
            sh = Math.max(1, Math.min(sh, video.videoHeight - sy))

            if (canvas.width !== sw || canvas.height !== sh) {
              canvas.width = sw
              canvas.height = sh
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height)
            // Draw cropped segment
            ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
          } else {
            // Full stream display
            if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
              canvas.width = video.videoWidth
              canvas.height = video.videoHeight
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          }

          // Render live saved annotations on top of video frame
          currentAnns.forEach((item) => {
            renderAnnotation(ctx, item)
          })

          // Render in-progress drawing preview in real-time
          if (inProgressAnn) {
            renderAnnotation(ctx, inProgressAnn)
          }

          // Broadcast frame to approved web clients (~30 FPS)
          const now = performance.now()
          if (now - lastWebBroadcastRef.current > 33) {
            lastWebBroadcastRef.current = now
            canvas.toBlob((blob) => {
              if (blob) {
                blob.arrayBuffer().then((buffer) => {
                  window.electronAPI?.broadcastWebFrame?.(buffer)
                }).catch(() => {})
              }
            }, 'image/jpeg', 0.8)
          }
        }
      }

      animationFrameId = requestAnimationFrame(render)
    }

    animationFrameId = requestAnimationFrame(render)

    return (): void => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  // 6. Coordinate mapping taking object-contain letterboxing into account
  const getCanvasCoordinates = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } | null => {
      const canvas = canvasRef.current
      if (!canvas) return null

      const rect = canvas.getBoundingClientRect()
      const clientX = e.clientX - rect.left
      const clientY = e.clientY - rect.top

      const cw = canvas.width
      const ch = canvas.height
      if (!cw || !ch) return null

      const canvasAspect = cw / ch
      const containerAspect = rect.width / rect.height

      let renderWidth = rect.width
      let renderHeight = rect.height
      let offsetX = 0
      let offsetY = 0

      if (containerAspect > canvasAspect) {
        renderWidth = rect.height * canvasAspect
        offsetX = (rect.width - renderWidth) / 2
      } else {
        renderHeight = rect.width / canvasAspect
        offsetY = (rect.height - renderHeight) / 2
      }

      if (
        clientX < offsetX ||
        clientX > offsetX + renderWidth ||
        clientY < offsetY ||
        clientY > offsetY + renderHeight
      ) {
        return null
      }

      const scaleX = cw / renderWidth
      const scaleY = ch / renderHeight

      return {
        x: Math.round((clientX - offsetX) * scaleX),
        y: Math.round((clientY - offsetY) * scaleY)
      }
    },
    []
  )

  // 7. Mouse Event Handlers for Interactive Drawing
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    if (e.button !== 0) return // Only primary click
    const coords = getCanvasCoordinates(e)
    if (!coords) return

    const { tool, color, width } = activeToolRef.current

    if (tool === 'text') {
      setTextInputPos({
        canvasX: coords.x,
        canvasY: coords.y,
        screenX: e.clientX,
        screenY: e.clientY
      })
      setTextValue('')
      return
    }

    isDrawingRef.current = true

    if (tool === 'pen' || tool === 'highlighter') {
      const penAnn: PenAnnotation = {
        id: crypto.randomUUID(),
        tool,
        color,
        width,
        points: [coords]
      }
      currentDrawingRef.current = penAnn
    } else if (tool === 'arrow') {
      const arrowAnn: ArrowAnnotation = {
        id: crypto.randomUUID(),
        tool: 'arrow',
        color,
        width,
        x1: coords.x,
        y1: coords.y,
        x2: coords.x,
        y2: coords.y
      }
      currentDrawingRef.current = arrowAnn
    } else if (tool === 'rect') {
      const rectAnn: RectAnnotation = {
        id: crypto.randomUUID(),
        tool: 'rect',
        color,
        width,
        x1: coords.x,
        y1: coords.y,
        x2: coords.x,
        y2: coords.y
      }
      currentDrawingRef.current = rectAnn
    } else if (tool === 'circle') {
      const circleAnn: CircleAnnotation = {
        id: crypto.randomUUID(),
        tool: 'circle',
        color,
        width,
        x1: coords.x,
        y1: coords.y,
        x2: coords.x,
        y2: coords.y
      }
      currentDrawingRef.current = circleAnn
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    if (!isDrawingRef.current || !currentDrawingRef.current) return
    const coords = getCanvasCoordinates(e)
    if (!coords) return

    const drawing = currentDrawingRef.current

    if (drawing.tool === 'pen' || drawing.tool === 'highlighter') {
      const pen = drawing as PenAnnotation
      const lastPoint = pen.points[pen.points.length - 1]
      // Avoid redundant duplicate points within 2px
      if (!lastPoint || Math.hypot(coords.x - lastPoint.x, coords.y - lastPoint.y) > 2) {
        pen.points.push(coords)
      }
    } else if (drawing.tool === 'arrow' || drawing.tool === 'rect' || drawing.tool === 'circle') {
      ;(drawing as ArrowAnnotation | RectAnnotation | CircleAnnotation).x2 = coords.x
      ;(drawing as ArrowAnnotation | RectAnnotation | CircleAnnotation).y2 = coords.y
    }
  }

  const handleMouseUp = (): void => {
    if (!isDrawingRef.current || !currentDrawingRef.current) {
      isDrawingRef.current = false
      currentDrawingRef.current = null
      return
    }

    const drawing = currentDrawingRef.current
    let isValid = false

    if (drawing.tool === 'pen' || drawing.tool === 'highlighter') {
      isValid = (drawing as PenAnnotation).points.length >= 2
    } else if (drawing.tool === 'arrow' || drawing.tool === 'rect' || drawing.tool === 'circle') {
      const shape = drawing as ArrowAnnotation | RectAnnotation | CircleAnnotation
      isValid = Math.hypot(shape.x2 - shape.x1, shape.y2 - shape.y1) > 4
    }

    if (isValid) {
      window.electronAPI?.sendAnnotation?.(drawing)
    }

    isDrawingRef.current = false
    currentDrawingRef.current = null
  }

  const handleTextSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!textInputPos || !textValue.trim()) {
      setTextInputPos(null)
      setTextValue('')
      return
    }

    const { color } = activeToolRef.current
    const newText: TextAnnotation = {
      id: crypto.randomUUID(),
      tool: 'text',
      color,
      width: 2,
      x: textInputPos.canvasX,
      y: textInputPos.canvasY,
      text: textValue.trim(),
      fontSize: 26
    }

    window.electronAPI?.sendAnnotation?.(newText)
    setTextInputPos(null)
    setTextValue('')
  }

  const changeTool = (tool: AnnotationTool): void => {
    setActiveTool(tool)
    activeToolRef.current = {
      tool,
      color: activeColor,
      width: activeWidth
    }
    window.electronAPI?.setActiveTool?.({
      tool,
      color: activeColor,
      width: activeWidth
    })
  }

  const changeColor = (color: string): void => {
    setActiveColor(color)
    activeToolRef.current = {
      tool: activeTool,
      color,
      width: activeWidth
    }
    window.electronAPI?.setActiveTool?.({
      tool: activeTool,
      color,
      width: activeWidth
    })
  }

  const toggleFullscreen = (): void => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    if (isPanMode || (zoomLevel > 1.0 && (e.button === 1 || e.button === 2 || e.altKey))) {
      isPanningRef.current = true
      panStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y }
      e.preventDefault()
      return
    }
    handleMouseDown(e)
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    if (isPanningRef.current) {
      setPanOffset({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y
      })
      return
    }
    handleMouseMove(e)
  }

  const handleCanvasMouseUp = (): void => {
    if (isPanningRef.current) {
      isPanningRef.current = false
      return
    }
    handleMouseUp()
  }

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>): void => {
    if (e.ctrlKey || isPanMode) {
      e.preventDefault()
      const delta = e.deltaY < 0 ? 0.2 : -0.2
      changeZoom(delta)
    }
  }

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative flex items-center justify-center select-none">
      {/* Hidden Video Source */}
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />

      {/* Main 60 FPS Interactive Output Canvas Container with Zoom & Pan */}
      <div
        className="w-full h-full relative overflow-hidden flex items-center justify-center"
        onWheel={handleWheel}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          className={`w-full h-full object-contain ${
            isPanMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'
          }`}
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
            transformOrigin: 'center center',
            transition: isPanningRef.current ? 'none' : 'transform 0.08s ease-out'
          }}
        />
      </div>

      {/* Floating Text Input Box */}
      {textInputPos && (
        <form
          onSubmit={handleTextSubmit}
          className="absolute z-50 flex items-center gap-1.5 p-1 rounded-lg bg-slate-900/95 border border-indigo-500 shadow-2xl backdrop-blur-md"
          style={{
            left: `${Math.min(textInputPos.screenX, window.innerWidth - 240)}px`,
            top: `${Math.min(textInputPos.screenY, window.innerHeight - 60)}px`
          }}
        >
          <input
            type="text"
            autoFocus
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setTextInputPos(null)
                setTextValue('')
              }
            }}
            placeholder="Digite o texto e tecle Enter..."
            className="px-2.5 py-1 text-sm bg-slate-950 text-white rounded border border-slate-700 outline-none focus:border-indigo-400 w-52 font-medium"
          />
          <button
            type="submit"
            className="px-2 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded transition-colors"
          >
            OK
          </button>
        </form>
      )}

      {/* Empty State when no source is selected or stream is loading */}
      {(!currentSourceId || !streamActive) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-500 bg-slate-950 pointer-events-none">
          <VideoOff className="w-12 h-12 text-slate-600 animate-pulse" />
          <p className="text-sm font-medium">
            {!currentSourceId
              ? 'Aguardando seleção de fonte no Painel de Controle...'
              : 'Conectando à fonte de captura...'}
          </p>
        </div>
      )}

      {/* Floating Top/Bottom HUD Controls */}
      <div
        className={`absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 p-1.5 rounded-2xl bg-slate-950/85 backdrop-blur-xl border border-slate-700/80 text-xs text-slate-200 shadow-2xl transition-all duration-300 z-40 ${
          showHud ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        {/* Toggle Collapse */}
        <button
          onClick={() => setHudCollapsed((prev) => !prev)}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          title={hudCollapsed ? 'Expandir barra de ferramentas' : 'Recolher barra'}
        >
          {hudCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {!hudCollapsed && (
          <>
            {/* Tool Buttons */}
            <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => changeTool('arrow')}
                className={`p-1.5 rounded-lg transition-all ${
                  activeTool === 'arrow'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Seta"
              >
                <ArrowUpRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => changeTool('rect')}
                className={`p-1.5 rounded-lg transition-all ${
                  activeTool === 'rect'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Retângulo"
              >
                <Square className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => changeTool('circle')}
                className={`p-1.5 rounded-lg transition-all ${
                  activeTool === 'circle'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Círculo"
              >
                <Circle className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => changeTool('pen')}
                className={`p-1.5 rounded-lg transition-all ${
                  activeTool === 'pen'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Caneta Livre"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => changeTool('highlighter')}
                className={`p-1.5 rounded-lg transition-all ${
                  activeTool === 'highlighter'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Marca-texto"
              >
                <Highlighter className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => changeTool('text')}
                className={`p-1.5 rounded-lg transition-all ${
                  activeTool === 'text'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Texto (clique na tela para inserir)"
              >
                <Type className="w-4 h-4" />
              </button>
            </div>

            {/* Color Palette */}
            <div className="flex items-center gap-1 px-1">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => changeColor(c)}
                  className={`w-5 h-5 rounded-full border-2 transition-transform ${
                    activeColor.toLowerCase() === c.toLowerCase()
                      ? 'scale-115 border-white ring-2 ring-indigo-500/40'
                      : 'border-transparent hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
              <label
                className="relative w-5 h-5 rounded-full overflow-hidden border border-slate-700 cursor-pointer flex items-center justify-center shrink-0"
                title="Cor personalizada"
              >
                <input
                  type="color"
                  value={activeColor}
                  onChange={(e) => changeColor(e.target.value)}
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

            {/* Undo & Clear */}
            <div className="flex items-center gap-1 border-l border-slate-800 pl-1.5">
              <button
                onClick={() => window.electronAPI?.undoAnnotation?.()}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Desfazer anotação (Ctrl+Z)"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => window.electronAPI?.clearAnnotations?.()}
                className="p-1.5 rounded-lg text-red-400 hover:text-red-200 hover:bg-red-950/60 transition-colors"
                title="Limpar todos os desenhos"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Zoom & Pan Group */}
            <div className="flex items-center gap-0.5 border-l border-slate-800 pl-1.5 bg-slate-900/60 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => changeZoom(-0.2)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Diminuir Zoom (-)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={resetZoom}
                className="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold text-indigo-400 hover:bg-slate-800 transition-colors"
                title="Resetar Zoom (100%)"
              >
                {Math.round(zoomLevel * 100)}%
              </button>

              <button
                type="button"
                onClick={() => changeZoom(0.2)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Aumentar Zoom (+)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsPanMode(!isPanMode)}
                className={`p-1 rounded transition-all ${
                  isPanMode
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title={isPanMode ? 'Modo Mover Ativo (clique para desativar)' : 'Modo Mover (Arraste para mover pela tela)'}
              >
                <Hand className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}

        {/* Resolution info & Fullscreen */}
        <div className="flex items-center gap-2 border-l border-slate-800 pl-2 pr-1">
          <span className="font-mono text-[11px] text-indigo-400 whitespace-nowrap">
            {cropRegion ? `${cropRegion.width}×${cropRegion.height}` : 'Tela Cheia'}
          </span>
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 hover:text-white text-slate-300 transition-colors"
            title="Alternar Tela Cheia (F11)"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="text-[11px]">{isFullscreen ? 'Janela' : 'Tela Cheia'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
