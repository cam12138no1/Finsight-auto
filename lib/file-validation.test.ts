import { describe, it, expect, vi } from 'vitest'
import { validateFile, checkFileContent } from './file-validation'

// Suppress console.log during tests
vi.spyOn(console, 'log').mockImplementation(() => {})
vi.spyOn(console, 'warn').mockImplementation(() => {})

describe('lib/file-validation', () => {
  describe('validateFile', () => {
    it('accepts valid PDF with correct signature', async () => {
      const pdfBuffer = Buffer.from([
        0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, // %PDF-1.4
        ...Array(1000).fill(0x20),
      ])
      const result = await validateFile(pdfBuffer, 'report.pdf')
      expect(result.valid).toBe(true)
      expect(result.detectedType).toBe('application/pdf')
    })

    it('rejects file exceeding 500MB', async () => {
      const hugeBuffer = Buffer.alloc(500 * 1024 * 1024 + 1)
      const result = await validateFile(hugeBuffer, 'huge.pdf')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('文件过大')
    })

    it('rejects unsupported file extension', async () => {
      const buffer = Buffer.from([0x25, 0x50, 0x44, 0x46])
      const result = await validateFile(buffer, 'file.exe')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('不支持的文件类型')
    })

    it('rejects PDF extension with wrong content', async () => {
      const buffer = Buffer.from('This is not a PDF ' + 'x'.repeat(500))
      const result = await validateFile(buffer, 'fake.pdf')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('文件类型不匹配')
    })

    it('accepts valid txt file (no signature check)', async () => {
      const txtBuffer = Buffer.from('Plain text content ' + 'x'.repeat(500), 'utf-8')
      const result = await validateFile(txtBuffer, 'readme.txt')
      expect(result.valid).toBe(true)
      expect(result.detectedType).toBe('text/plain')
    })

    it('accepts valid docx with ZIP signature', async () => {
      const docxBuffer = Buffer.from([
        0x50, 0x4b, 0x03, 0x04, // PK..
        ...Array(500).fill(0),
      ])
      const result = await validateFile(docxBuffer, 'document.docx')
      expect(result.valid).toBe(true)
    })
  })

  describe('checkFileContent', () => {
    it('returns safe for clean content', () => {
      const buffer = Buffer.from('Clean financial report content', 'utf-8')
      const result = checkFileContent(buffer)
      expect(result.safe).toBe(true)
      expect(result.warnings).toHaveLength(0)
    })

    it('detects script tag', () => {
      const buffer = Buffer.from('<html><script>alert(1)</script></html>', 'utf-8')
      const result = checkFileContent(buffer)
      expect(result.safe).toBe(false)
      expect(result.warnings.some((w) => w.includes('script'))).toBe(true)
    })

    it('detects javascript protocol', () => {
      const buffer = Buffer.from('Link: javascript:void(0)', 'utf-8')
      const result = checkFileContent(buffer)
      expect(result.safe).toBe(false)
    })

    it('detects eval function', () => {
      const buffer = Buffer.from('code: eval("malicious")', 'utf-8')
      const result = checkFileContent(buffer)
      expect(result.safe).toBe(false)
    })
  })
})
