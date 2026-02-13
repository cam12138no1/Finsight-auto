import { describe, it, expect } from 'vitest'
import { cn, formatNumber, formatPercentage, getBeatMissVariant } from './utils'

describe('lib/utils', () => {
  describe('cn', () => {
    it('merges class names correctly', () => {
      expect(cn('foo', 'bar')).toBe('foo bar')
    })

    it('handles conditional classes', () => {
      expect(cn('base', false && 'hidden', true && 'visible')).toBe('base visible')
    })

    it('handles tailwind merge - conflicting utilities', () => {
      expect(cn('p-4', 'p-2')).toBe('p-2')
    })

    it('handles empty input', () => {
      expect(cn()).toBe('')
    })
  })

  describe('formatNumber', () => {
    it('formats billions with $XX.XXB', () => {
      expect(formatNumber(113_830_000_000)).toBe('$113.83B')
      expect(formatNumber(1e9)).toBe('$1.00B')
    })

    it('formats millions with $XX.XXM', () => {
      expect(formatNumber(42_310_000)).toBe('$42.31M')
      expect(formatNumber(1e6)).toBe('$1.00M')
    })

    it('formats thousands with $XX.XXK', () => {
      expect(formatNumber(1500)).toBe('$1.50K')
      expect(formatNumber(1e3)).toBe('$1.00K')
    })

    it('formats small numbers with $XX.XX', () => {
      expect(formatNumber(99.5)).toBe('$99.50')
    })

    it('respects custom decimals', () => {
      expect(formatNumber(1.234, 3)).toBe('$1.234')
    })

    it('handles negative numbers', () => {
      expect(formatNumber(-1e9)).toBe('$-1.00B')
    })
  })

  describe('formatPercentage', () => {
    it('converts decimal to percentage', () => {
      expect(formatPercentage(0.16)).toBe('16.00%')
    })

    it('respects custom decimals', () => {
      expect(formatPercentage(0.1634, 2)).toBe('16.34%')
    })

    it('handles zero', () => {
      expect(formatPercentage(0)).toBe('0.00%')
    })
  })

  describe('getBeatMissVariant', () => {
    it('returns success for positive difference', () => {
      expect(getBeatMissVariant(5)).toBe('success')
      expect(getBeatMissVariant(0.1)).toBe('success')
    })

    it('returns destructive for negative difference', () => {
      expect(getBeatMissVariant(-5)).toBe('destructive')
      expect(getBeatMissVariant(-0.1)).toBe('destructive')
    })

    it('returns secondary for zero', () => {
      expect(getBeatMissVariant(0)).toBe('secondary')
    })
  })
})
