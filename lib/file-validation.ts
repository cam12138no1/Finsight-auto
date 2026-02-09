// lib/file-validation.ts - 文件上传安全验证

/**
 * 通过文件头（Magic Number）验证真实文件类型
 */

interface FileType {
  mime: string
  extension: string
  signature: number[]
}

const ALLOWED_FILE_TYPES: FileType[] = [
  {
    mime: 'application/pdf',
    extension: 'pdf',
    signature: [0x25, 0x50, 0x44, 0x46], // %PDF
  },
  {
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    extension: 'docx',
    signature: [0x50, 0x4B, 0x03, 0x04], // PK (ZIP format)
  },
  {
    mime: 'application/msword',
    extension: 'doc',
    signature: [0xD0, 0xCF, 0x11, 0xE0], // DOC format
  },
  {
    mime: 'text/plain',
    extension: 'txt',
    signature: [], // Text files don't have fixed signature
  },
]

function checkSignature(buffer: Buffer, signature: number[]): boolean {
  if (signature.length === 0) return true // Skip signature check (e.g., txt)
  
  if (buffer.length < signature.length) return false
  
  for (let i = 0; i < signature.length; i++) {
    if (buffer[i] !== signature[i]) {
      return false
    }
  }
  return true
}

export async function validateFile(
  buffer: Buffer,
  filename: string
): Promise<{ valid: boolean; error?: string; detectedType?: string }> {
  // 1. Check file size
  const MAX_SIZE = 500 * 1024 * 1024 // 500MB
  if (buffer.length > MAX_SIZE) {
    return {
      valid: false,
      error: `文件过大: ${(buffer.length / 1024 / 1024).toFixed(2)}MB (最大 500MB)`,
    }
  }

  // 2. Extract extension from filename
  const ext = filename.toLowerCase().split('.').pop() || ''

  // 3. Check if extension is in allowed list
  const allowedType = ALLOWED_FILE_TYPES.find(t => t.extension === ext)
  if (!allowedType) {
    return {
      valid: false,
      error: `不支持的文件类型: .${ext}`,
    }
  }

  // 4. Verify file signature
  if (!checkSignature(buffer, allowedType.signature)) {
    return {
      valid: false,
      error: `文件类型不匹配: 扩展名是 .${ext} 但内容不是有效的 ${allowedType.mime}`,
    }
  }

  // 5. Additional validation for specific types
  if (ext === 'pdf') {
    const header = buffer.slice(0, 20).toString('utf-8')
    if (!header.startsWith('%PDF-')) {
      return { valid: false, error: '无效的 PDF 格式' }
    }
  }

  console.log(`[FileValidation] ✓ ${filename} validated as ${allowedType.mime}`)

  return {
    valid: true,
    detectedType: allowedType.mime,
  }
}

/**
 * Check if file content is safe (heuristic check)
 */
export function checkFileContent(buffer: Buffer): {
  safe: boolean
  warnings: string[]
} {
  const warnings: string[] = []

  // Check for suspicious script content
  const content = buffer.toString('utf-8', 0, Math.min(10000, buffer.length))

  const suspiciousPatterns = [
    { pattern: /<script/i, name: 'script tag' },
    { pattern: /javascript:/i, name: 'javascript protocol' },
    { pattern: /eval\s*\(/i, name: 'eval function' },
    { pattern: /exec\s*\(/i, name: 'exec function' },
    { pattern: /__import__/i, name: 'python import' },
  ]

  for (const { pattern, name } of suspiciousPatterns) {
    if (pattern.test(content)) {
      warnings.push(`检测到可疑内容: ${name}`)
    }
  }

  if (warnings.length > 0) {
    console.warn(`[FileValidation] Warnings:`, warnings)
  }

  return {
    safe: warnings.length === 0,
    warnings,
  }
}
