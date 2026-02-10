import pdf from 'pdf-parse'
import * as XLSX from 'xlsx'

// Maximum text length to send to AI (to avoid token limits)
// Gemini 3 Pro has 1M token context, so we can use much larger limits
const MAX_TEXT_LENGTH = 300000 // ~75k tokens

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    console.log(`[PDF解析] 开始解析PDF, 文件大小: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`)
    
    // Options for pdf-parse
    const options = {
      // Limit pages for very large documents
      max: 200, // Max 200 pages
    }
    
    const data = await pdf(buffer, options)
    
    console.log(`[PDF解析] 成功提取 ${data.numpages} 页, ${data.text.length} 字符`)
    
    // Clean up extracted text
    let text = data.text
    
    // Remove excessive whitespace
    text = text.replace(/\s+/g, ' ')
    
    // Remove common PDF artifacts
    text = text.replace(/\f/g, '\n') // Form feed to newline
    text = text.replace(/\x00/g, '') // Null characters
    
    // Truncate if too long
    if (text.length > MAX_TEXT_LENGTH) {
      console.log(`[PDF解析] 文本过长 (${text.length} 字符), 截断至 ${MAX_TEXT_LENGTH} 字符`)
      text = text.substring(0, MAX_TEXT_LENGTH) + '\n\n[文档内容已截断，仅显示前300,000字符]'
    }
    
    return text
  } catch (error: any) {
    console.error('[PDF解析] 错误:', error.message)
    
    // Try alternative parsing approach for problematic PDFs
    try {
      console.log('[PDF解析] 尝试备用解析方法...')
      const data = await pdf(buffer, { max: 50 }) // Try with fewer pages
      if (data.text && data.text.length > 100) {
        console.log(`[PDF解析] 备用方法成功, 提取 ${data.text.length} 字符`)
        return data.text.substring(0, MAX_TEXT_LENGTH)
      }
    } catch (fallbackError) {
      console.error('[PDF解析] 备用方法也失败:', fallbackError)
    }
    
    throw new Error(`PDF解析失败: ${error.message}`)
  }
}

export async function extractTextFromExcel(buffer: Buffer): Promise<string> {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    let text = ''
    
    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName]
      text += `\n\n=== ${sheetName} ===\n\n`
      text += XLSX.utils.sheet_to_txt(sheet)
    })
    
    // Truncate if too long
    if (text.length > MAX_TEXT_LENGTH) {
      text = text.substring(0, MAX_TEXT_LENGTH) + '\n\n[文档内容已截断]'
    }
    
    return text
  } catch (error) {
    console.error('Excel parsing error:', error)
    throw new Error('Failed to parse Excel document')
  }
}

/**
 * 从文档中提取文本
 * @param buffer 文件内容
 * @param fileNameOrMimeType 文件名或MIME类型
 */
export async function extractTextFromDocument(
  buffer: Buffer,
  fileNameOrMimeType: string
): Promise<string> {
  // 支持文件名或MIME类型
  const input = fileNameOrMimeType.toLowerCase()
  
  // 检查是否是PDF
  if (input === 'application/pdf' || input.endsWith('.pdf')) {
    return extractTextFromPDF(buffer)
  }
  
  // 检查是否是Excel
  if (
    input === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    input === 'application/vnd.ms-excel' ||
    input.endsWith('.xlsx') ||
    input.endsWith('.xls')
  ) {
    return extractTextFromExcel(buffer)
  }
  
  // 检查是否是HTML文件 (SEC EDGAR filings are often HTML)
  if (
    input === 'text/html' ||
    input.endsWith('.htm') ||
    input.endsWith('.html')
  ) {
    let html = buffer.toString('utf-8')
    // Strip HTML tags to extract plain text
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')  // Remove scripts
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')      // Remove styles
      .replace(/<[^>]+>/g, ' ')                              // Remove HTML tags
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#\d+;/gi, '')
      .replace(/\s+/g, ' ')                                 // Collapse whitespace
      .trim()
    
    if (text.length > MAX_TEXT_LENGTH) {
      text = text.substring(0, MAX_TEXT_LENGTH) + '\n\n[文档内容已截断]'
    }
    console.log(`[HTML解析] 提取文本 ${text.length} 字符`)
    return text
  }
  
  // 检查是否是文本文件
  if (input.startsWith('text/') || input.endsWith('.txt')) {
    let text = buffer.toString('utf-8')
    if (text.length > MAX_TEXT_LENGTH) {
      text = text.substring(0, MAX_TEXT_LENGTH) + '\n\n[文档内容已截断]'
    }
    return text
  }
  
  // 检查是否是Word文档
  if (
    input === 'application/msword' ||
    input === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    input.endsWith('.doc') ||
    input.endsWith('.docx')
  ) {
    // Word文档暂时不支持，返回提示
    throw new Error('Word文档解析暂不支持，请转换为PDF后上传')
  }
  
  throw new Error(`不支持的文件类型: ${fileNameOrMimeType}`)
}
