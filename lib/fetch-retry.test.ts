import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchWithRetry, downloadFile } from './fetch-retry'

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('lib/fetch-retry', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchWithRetry', () => {
    it('returns response on success', async () => {
      const mockResponse = { ok: true, arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)) }
      mockFetch.mockResolvedValue(mockResponse)

      const result = await fetchWithRetry('https://example.com')

      expect(result).toBe(mockResponse)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('retries on 5xx error', async () => {
      const successResponse = { ok: true }
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 503 })
        .mockResolvedValueOnce({ ok: false, status: 503 })
        .mockResolvedValueOnce(successResponse)

      const result = await fetchWithRetry('https://example.com', { maxRetries: 3 })

      expect(result.ok).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('throws on 4xx client error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not Found'),
      })

      await expect(
        fetchWithRetry('https://example.com', { maxRetries: 3 })
      ).rejects.toThrow(/404/)
    })

    it('retries on 429 rate limit', async () => {
      const successResponse = { ok: true }
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 429 })
        .mockResolvedValueOnce(successResponse)

      const result = await fetchWithRetry('https://example.com', { maxRetries: 2 })
      expect(result.ok).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('throws after max retries exceeded', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 503 })

      await expect(
        fetchWithRetry('https://example.com', { maxRetries: 2 })
      ).rejects.toThrow(/Fetch failed/)

      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('downloadFile', () => {
    it('returns Buffer on success', async () => {
      const arr = new Uint8Array([1, 2, 3])
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(arr.buffer),
      })

      const result = await downloadFile('https://example.com/file.pdf')

      expect(Buffer.isBuffer(result)).toBe(true)
      expect(result.length).toBe(3)
      expect(result[0]).toBe(1)
      expect(result[1]).toBe(2)
      expect(result[2]).toBe(3)
    })
  })
})
