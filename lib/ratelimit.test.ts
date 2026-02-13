import { describe, it, expect } from 'vitest'
import {
  checkRateLimit,
  createRateLimitHeaders,
  rateLimitConfigs,
} from './ratelimit'

describe('lib/ratelimit', () => {
  describe('checkRateLimit', () => {
    it('allows requests within limit', async () => {
      const userId = 'user-allow-' + Date.now()
      const result1 = await checkRateLimit(userId, 'analysis')
      expect(result1.success).toBe(true)
      expect(result1.remaining).toBe(4) // 5 - 1
      expect(result1.limit).toBe(5)

      const result2 = await checkRateLimit(userId, 'analysis')
      expect(result2.success).toBe(true)
      expect(result2.remaining).toBe(3)
    })

    it('rejects when limit exceeded', async () => {
      const userId = 'user-exceed-' + Date.now()
      for (let i = 0; i < 5; i++) {
        await checkRateLimit(userId, 'analysis')
      }
      const result = await checkRateLimit(userId, 'analysis')
      expect(result.success).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('returns success for unknown limiter type', async () => {
      const result = await checkRateLimit('user1', 'unknown' as any)
      expect(result.success).toBe(true)
      expect(result.limit).toBe(999)
    })
  })

  describe('createRateLimitHeaders', () => {
    it('returns correct header object', () => {
      const headers = createRateLimitHeaders({
        limit: 5,
        remaining: 3,
        reset: 120,
      })
      expect(headers['X-RateLimit-Limit']).toBe('5')
      expect(headers['X-RateLimit-Remaining']).toBe('3')
      expect(headers['X-RateLimit-Reset']).toBe('120')
    })
  })

  describe('rateLimitConfigs', () => {
    it('has analysis, upload, dashboard configs', () => {
      expect(rateLimitConfigs.analysis).toEqual({
        maxRequests: 5,
        windowMs: 60000,
      })
      expect(rateLimitConfigs.upload.maxRequests).toBe(10)
      expect(rateLimitConfigs.dashboard.maxRequests).toBe(60)
    })
  })
})
