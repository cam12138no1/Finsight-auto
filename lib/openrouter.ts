export class OpenRouterClient {
  private apiKey: string
  private baseURL: string = 'https://openrouter.ai/api/v1'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async chat(params: {
    model: string
    messages: Array<{ role: string; content: string }>
    response_format?: any
    temperature?: number
    max_tokens?: number
  }) {
    // Create AbortController for timeout - 5 minutes for large documents
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minutes timeout
    
    try {
      const totalChars = params.messages.reduce((acc, m) => acc + m.content.length, 0)
      console.log(`[OpenRouter] 发送请求到模型: ${params.model}`)
      console.log(`[OpenRouter] 消息总长度: ${totalChars} 字符 (~${Math.round(totalChars / 4)} tokens)`)
      
      // Gemini 3 Pro has 1M token context (~4M chars), but we'll warn at 800k chars
      if (totalChars > 800000) {
        console.warn(`[OpenRouter] 消息过长 (${totalChars} 字符)，可能超出模型限制`)
      }
      
      const requestBody = {
        model: params.model,
        messages: params.messages,
        response_format: params.response_format,
        temperature: params.temperature ?? 0.7,
        max_tokens: params.max_tokens ?? 16000,
      }
      
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      console.log(`[OpenRouter] 响应状态: ${response.status} ${response.statusText}`)

      // Read response body first
      let responseText: string
      try {
        responseText = await response.text()
      } catch (readError) {
        console.error('[OpenRouter] 无法读取响应体')
        throw new Error('AI服务响应读取失败，请稍后重试')
      }
      
      console.log(`[OpenRouter] 响应长度: ${responseText.length} 字符`)
      
      // Check for empty response
      if (!responseText || responseText.trim() === '') {
        console.error('[OpenRouter] 收到空响应')
        throw new Error('AI服务返回空响应，请稍后重试')
      }

      // Handle non-OK responses
      if (!response.ok) {
        console.error(`[OpenRouter] 错误响应: ${responseText.substring(0, 500)}`)
        
        // Try to parse error as JSON
        let errorMessage = response.statusText
        try {
          const errorData = JSON.parse(responseText)
          errorMessage = errorData.error?.message || errorData.message || errorMessage
        } catch {
          // If not JSON, check for common error patterns
          if (responseText.includes('Request Entity Too Large') || responseText.includes('413')) {
            errorMessage = '请求内容过大，请减少上传的文件数量或大小'
          } else if (responseText.includes('rate limit') || responseText.includes('429')) {
            errorMessage = 'API请求频率限制，请稍后重试'
          } else if (responseText.includes('timeout') || responseText.includes('504')) {
            errorMessage = 'AI服务响应超时，请稍后重试'
          } else {
            errorMessage = responseText.substring(0, 100)
          }
        }
        
        // Handle specific error codes
        if (response.status === 429) {
          throw new Error('API请求频率限制，请稍后重试')
        } else if (response.status === 503 || response.status === 502 || response.status === 504) {
          throw new Error('AI服务暂时不可用，请稍后重试')
        } else if (response.status === 413) {
          throw new Error('文档内容过大，请尝试上传较小的文件')
        } else if (response.status === 400) {
          throw new Error(`请求格式错误: ${errorMessage}`)
        }
        
        throw new Error(`AI服务错误 (${response.status}): ${errorMessage}`)
      }
      
      // Try to parse JSON response
      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error(`[OpenRouter] JSON解析失败，响应开头: ${responseText.substring(0, 200)}`)
        
        // Check for common non-JSON responses
        if (responseText.startsWith('Request')) {
          throw new Error('AI服务请求被拒绝，可能是内容过大或格式问题')
        } else if (responseText.startsWith('<!DOCTYPE') || responseText.startsWith('<html')) {
          throw new Error('AI服务返回了HTML错误页面，请稍后重试')
        }
        
        throw new Error(`AI响应格式错误，无法解析JSON`)
      }
      
      // Validate response structure
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error(`[OpenRouter] 响应结构无效，完整响应:`, JSON.stringify(data, null, 2))
        
        // Check for specific error patterns in the response
        if (data.error) {
          const errorMsg = data.error.message || data.error.code || JSON.stringify(data.error)
          throw new Error(`AI服务错误: ${errorMsg}`)
        }
        
        // Check if it's a rate limit or quota issue
        if (data.message?.includes('rate') || data.message?.includes('quota')) {
          throw new Error(`AI服务限制: ${data.message}`)
        }
        
        throw new Error(`AI服务返回了无效的响应格式: ${JSON.stringify(data).substring(0, 200)}`)
      }

      // Check for finish reason
      const finishReason = data.choices[0].finish_reason
      if (finishReason === 'length') {
        console.warn('[OpenRouter] 响应被截断 (finish_reason: length)')
      }
      
      // Check if content is empty
      const content = data.choices[0].message.content
      if (!content || content.trim() === '') {
        console.error('[OpenRouter] AI返回空内容')
        throw new Error('AI分析返回空结果，请重试')
      }
      
      console.log(`[OpenRouter] 成功获取响应，内容长度: ${content.length} 字符`)

      return data
    } catch (error: any) {
      clearTimeout(timeoutId)
      
      if (error.name === 'AbortError') {
        throw new Error('AI分析超时（5分钟），请尝试减少上传的文件数量或稍后重试')
      }
      
      // Re-throw with better message
      if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
        throw new Error('无法连接到AI服务，请检查网络或稍后重试')
      }
      
      throw error
    }
  }
}

// Validate API key on initialization
const apiKey = process.env.OPENROUTER_API_KEY
if (!apiKey) {
  console.warn('[OpenRouter] ⚠️ OPENROUTER_API_KEY 未设置! AI分析功能将不可用。请在 Render/Vercel 环境变量中设置。')
}

export const openrouter = new OpenRouterClient(apiKey || '')
