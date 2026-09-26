import type { Annotation } from '@shared/types'
import { calculateArrowPoints } from '@renderer/shared/utils/geometry'

export function renderAnnotation(ctx: CanvasRenderingContext2D, item: Annotation): void {
  ctx.save()

  switch (item.tool) {
    case 'arrow': {
      ctx.strokeStyle = item.color
      ctx.fillStyle = item.color
      ctx.lineWidth = item.width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      const { tip, left, right } = calculateArrowPoints(item.x1, item.y1, item.x2, item.y2)

      // Main line
      ctx.beginPath()
      ctx.moveTo(item.x1, item.y1)
      ctx.lineTo(tip.x, tip.y)
      ctx.stroke()

      // Arrow head triangle
      ctx.beginPath()
      ctx.moveTo(tip.x, tip.y)
      ctx.lineTo(left.x, left.y)
      ctx.lineTo(right.x, right.y)
      ctx.closePath()
      ctx.fill()
      break
    }

    case 'rect': {
      ctx.strokeStyle = item.color
      ctx.lineWidth = item.width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      const x = Math.min(item.x1, item.x2)
      const y = Math.min(item.y1, item.y2)
      const w = Math.abs(item.x2 - item.x1)
      const h = Math.abs(item.y2 - item.y1)

      ctx.strokeRect(x, y, w, h)
      break
    }

    case 'circle': {
      ctx.strokeStyle = item.color
      ctx.lineWidth = item.width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      const radius = Math.hypot(item.x2 - item.x1, item.y2 - item.y1)
      ctx.beginPath()
      ctx.arc(item.x1, item.y1, radius, 0, Math.PI * 2)
      ctx.stroke()
      break
    }

    case 'pen': {
      if (!item.points || item.points.length < 2) break

      ctx.strokeStyle = item.color
      ctx.lineWidth = item.width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      ctx.beginPath()
      ctx.moveTo(item.points[0].x, item.points[0].y)
      for (let i = 1; i < item.points.length; i++) {
        ctx.lineTo(item.points[i].x, item.points[i].y)
      }
      ctx.stroke()
      break
    }

    case 'highlighter': {
      if (!item.points || item.points.length < 2) break

      ctx.strokeStyle = item.color
      ctx.lineWidth = item.width * 2
      ctx.globalAlpha = 0.35
      ctx.lineCap = 'square'
      ctx.lineJoin = 'miter'

      ctx.beginPath()
      ctx.moveTo(item.points[0].x, item.points[0].y)
      for (let i = 1; i < item.points.length; i++) {
        ctx.lineTo(item.points[i].x, item.points[i].y)
      }
      ctx.stroke()
      break
    }

    case 'text': {
      ctx.fillStyle = item.color
      ctx.font = `bold ${item.fontSize || 24}px Inter, sans-serif`
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
      ctx.shadowBlur = 4
      ctx.fillText(item.text, item.x, item.y)
      break
    }
  }

  ctx.restore()
}
