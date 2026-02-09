// lib/fetch-retry.ts - 网络请求重试机制

export interface FetchRetryOptions extends RequestInit {
  maxRetries?: number
  retryDelay?: number
  timeout?: number
}

/**
 * 带重试机制的 fetch 函数
 */
export async function fetchWithRetry(
  url: string,
  options: FetchRetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    timeout = 30000,
    ...fetchOptions
  } = options

  let lastError: Error | undefined

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[Fetch] Attempt ${attempt + 1}/${maxRetries}: ${url.substring(0, 100)}...`)

      // 创建 AbortController 用于超时控制
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      try {
        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          console.log(`[Fetch] ✓ Success: ${url.substring(0, 50)}...`)
          return response
        }

        // 4xx 客户端错误不重试（除了 429）
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          const errorText = await response.text().catch(() => response.statusText)
          throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`)
        }

        // 5xx 服务器错误或 429 限流，可以重试
        console.warn(`[Fetch] HTTP ${response.status}, will retry...`)
        lastError = new Error(`HTTP ${response.status}`)

      } catch (error: any) {
        clearTimeout(timeoutId)
        throw error
      }

    } catch (error: any) {
      console.error(`[Fetch] Attempt ${attempt + 1} failed:`, error.message)
      lastError = error

      // 如果是中止错误（超时），记录
      if (error.name === 'AbortError') {
        lastError = new Error(`Request timeout after ${timeout}ms`)
      }

      // 最后一次尝试，不等待
      if (attempt === maxRetries - 1) {
        break
      }

      // 指数退避: 1s, 2s, 4s
      const delay = Math.min(retryDelay * Math.pow(2, attempt), 10000)
      console.log(`[Fetch] Waiting ${delay}ms before retry...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw new Error(`Fetch failed after ${maxRetries} retries: ${lastError?.message || url}`)
}

/**
 * 下载文件并返回 Buffer
 */
export async function downloadFile(
  url: string,
  options: FetchRetryOptions = {}
): Promise<Buffer> {
  const response = await fetchWithRetry(url, options)
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
