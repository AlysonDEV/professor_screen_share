import type { CropRegion, Point } from '@shared/types'

/**
 * Normalizes two diagonal points into a standard {x, y, width, height} box
 */
export function normalizeRect(x1: number, y1: number, x2: number, y2: number): {
  x: number
  y: number
  width: number
  height: number
} {
  const x = Math.min(x1, x2)
  const y = Math.min(y1, y2)
  const width = Math.abs(x2 - x1)
  const height = Math.abs(y2 - y1)

  return { x, y, width, height }
}

/**
 * Calculates the three points of an arrowhead given start and end points
 */
export function calculateArrowPoints(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  headLength = 18,
  angleOffset = Math.PI / 6
): { tip: Point; left: Point; right: Point } {
  const dx = toX - fromX
  const dy = toY - fromY
  const angle = Math.atan2(dy, dx)

  const tip: Point = { x: toX, y: toY }
  const left: Point = {
    x: toX - headLength * Math.cos(angle - angleOffset),
    y: toY - headLength * Math.sin(angle - angleOffset)
  }
  const right: Point = {
    x: toX - headLength * Math.cos(angle + angleOffset),
    y: toY - headLength * Math.sin(angle + angleOffset)
  }

  return { tip, left, right }
}

/**
 * Formats dimension and aspect ratio string (e.g. "1920x1080 (16:9)")
 */
export function formatDimensionsWithAspect(width: number, height: number): string {
  if (width <= 0 || height <= 0) return '0x0'

  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
  const divisor = gcd(Math.round(width), Math.round(height))
  const aspectX = Math.round(width) / divisor
  const aspectY = Math.round(height) / divisor

  // Simplify common aspect ratios
  const ratio = width / height
  let aspectStr = `${aspectX}:${aspectY}`
  if (Math.abs(ratio - 16 / 9) < 0.02) aspectStr = '16:9'
  else if (Math.abs(ratio - 4 / 3) < 0.02) aspectStr = '4:3'
  else if (Math.abs(ratio - 21 / 9) < 0.02) aspectStr = '21:9'
  else if (Math.abs(ratio - 1) < 0.02) aspectStr = '1:1'

  return `${Math.round(width)} × ${Math.round(height)} (${aspectStr})`
}

/**
 * Clamps coordinates to keep them strictly inside given bounds
 */
export function clampBounds(
  region: CropRegion,
  maxWidth: number,
  maxHeight: number
): CropRegion {
  const x = Math.max(0, Math.min(region.x, maxWidth))
  const y = Math.max(0, Math.min(region.y, maxHeight))
  const width = Math.min(region.width, maxWidth - x)
  const height = Math.min(region.height, maxHeight - y)

  return { x, y, width, height }
}
