import { describe, it, expect } from 'vitest'
import {
  normalizeRect,
  calculateArrowPoints,
  formatDimensionsWithAspect,
  clampBounds
} from './geometry'

describe('geometry utils', () => {
  describe('normalizeRect', () => {
    it('should correctly normalize standard top-left to bottom-right coordinates', () => {
      const result = normalizeRect(10, 20, 110, 220)
      expect(result).toEqual({ x: 10, y: 20, width: 100, height: 200 })
    })

    it('should correctly normalize inverted bottom-right to top-left drag coordinates', () => {
      const result = normalizeRect(110, 220, 10, 20)
      expect(result).toEqual({ x: 10, y: 20, width: 100, height: 200 })
    })

    it('should handle zero dimension points', () => {
      const result = normalizeRect(50, 50, 50, 50)
      expect(result).toEqual({ x: 50, y: 50, width: 0, height: 0 })
    })
  })

  describe('calculateArrowPoints', () => {
    it('should calculate valid arrow points with tip at destination', () => {
      const { tip, left, right } = calculateArrowPoints(0, 0, 100, 0, 20, Math.PI / 6)
      expect(tip).toEqual({ x: 100, y: 0 })
      expect(left.x).toBeLessThan(100)
      expect(right.x).toBeLessThan(100)
      expect(left.y).not.toBe(right.y)
    })
  })

  describe('formatDimensionsWithAspect', () => {
    it('should format 16:9 standard resolution', () => {
      expect(formatDimensionsWithAspect(1920, 1080)).toContain('16:9')
    })

    it('should format 4:3 resolution', () => {
      expect(formatDimensionsWithAspect(800, 600)).toContain('4:3')
    })

    it('should format 1:1 square ratio', () => {
      expect(formatDimensionsWithAspect(500, 500)).toContain('1:1')
    })

    it('should handle invalid or zero dimensions', () => {
      expect(formatDimensionsWithAspect(0, 0)).toBe('0x0')
    })
  })

  describe('clampBounds', () => {
    it('should clamp out-of-bound coordinates', () => {
      const region = { x: -10, y: -20, width: 2000, height: 1200 }
      const clamped = clampBounds(region, 1920, 1080)
      expect(clamped.x).toBe(0)
      expect(clamped.y).toBe(0)
      expect(clamped.width).toBeLessThanOrEqual(1920)
      expect(clamped.height).toBeLessThanOrEqual(1080)
    })
  })
})
