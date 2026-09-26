import { describe, it, expect, vi } from 'vitest'
import { renderAnnotation } from './drawAnnotations'
import type { ArrowAnnotation, RectAnnotation, CircleAnnotation, TextAnnotation } from '@shared/types'

function createMockContext(): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    strokeRect: vi.fn(),
    arc: vi.fn(),
    fillText: vi.fn(),
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    globalAlpha: 1,
    font: '',
    shadowColor: '',
    shadowBlur: 0
  } as unknown as CanvasRenderingContext2D
}

describe('renderAnnotation engine', () => {
  it('renders arrow annotations correctly', () => {
    const ctx = createMockContext()
    const arrow: ArrowAnnotation = {
      id: '1',
      tool: 'arrow',
      color: '#ff0000',
      width: 4,
      x1: 10,
      y1: 10,
      x2: 100,
      y2: 100
    }

    renderAnnotation(ctx, arrow)
    expect(ctx.save).toHaveBeenCalled()
    expect(ctx.beginPath).toHaveBeenCalled()
    expect(ctx.stroke).toHaveBeenCalled()
    expect(ctx.fill).toHaveBeenCalled()
    expect(ctx.restore).toHaveBeenCalled()
  })

  it('renders rect annotations correctly', () => {
    const ctx = createMockContext()
    const rect: RectAnnotation = {
      id: '2',
      tool: 'rect',
      color: '#00ff00',
      width: 3,
      x1: 50,
      y1: 50,
      x2: 150,
      y2: 100
    }

    renderAnnotation(ctx, rect)
    expect(ctx.strokeRect).toHaveBeenCalledWith(50, 50, 100, 50)
  })

  it('renders circle annotations correctly', () => {
    const ctx = createMockContext()
    const circle: CircleAnnotation = {
      id: '3',
      tool: 'circle',
      color: '#0000ff',
      width: 2,
      x1: 100,
      y1: 100,
      x2: 150,
      y2: 100
    }

    renderAnnotation(ctx, circle)
    expect(ctx.arc).toHaveBeenCalledWith(100, 100, 50, 0, Math.PI * 2)
  })

  it('renders text annotations correctly', () => {
    const ctx = createMockContext()
    const text: TextAnnotation = {
      id: '4',
      tool: 'text',
      color: '#ffffff',
      width: 1,
      x: 200,
      y: 200,
      text: 'Exemplo de Aula',
      fontSize: 24
    }

    renderAnnotation(ctx, text)
    expect(ctx.fillText).toHaveBeenCalledWith('Exemplo de Aula', 200, 200)
  })

  it('renders pen annotations correctly', () => {
    const ctx = createMockContext()
    const pen = {
      id: '5',
      tool: 'pen' as const,
      color: '#f59e0b',
      width: 4,
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 25 },
        { x: 35, y: 40 }
      ]
    }

    renderAnnotation(ctx, pen)
    expect(ctx.beginPath).toHaveBeenCalled()
    expect(ctx.moveTo).toHaveBeenCalledWith(10, 10)
    expect(ctx.lineTo).toHaveBeenCalledWith(20, 25)
    expect(ctx.lineTo).toHaveBeenCalledWith(35, 40)
    expect(ctx.stroke).toHaveBeenCalled()
    expect(ctx.strokeStyle).toBe('#f59e0b')
  })

  it('renders highlighter annotations with alpha transparency', () => {
    const ctx = createMockContext()
    const highlighter = {
      id: '6',
      tool: 'highlighter' as const,
      color: '#10b981',
      width: 5,
      points: [
        { x: 50, y: 50 },
        { x: 100, y: 50 }
      ]
    }

    renderAnnotation(ctx, highlighter)
    expect(ctx.beginPath).toHaveBeenCalled()
    expect(ctx.moveTo).toHaveBeenCalledWith(50, 50)
    expect(ctx.lineTo).toHaveBeenCalledWith(100, 50)
    expect(ctx.stroke).toHaveBeenCalled()
    expect(ctx.globalAlpha).toBe(0.35)
  })
})
