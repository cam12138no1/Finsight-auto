// lib/ratelimit.ts - API速率限制

/**
 * 简单的内存速率限制器
 * 注意：在 Serverless 环境中，内存不共享，所以这只是一个基础保护
 * 如果需要更严格的限制，应该使用 Upstash Redis
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// 清理过期的条目
function cleanupExpired() {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key)
    }
  }
}

// 每分钟清理一次
setInterval(cleanupExpired, 60000)

export interface RateLimitConfig {
  maxRequests: number  // 最大请求数
  windowMs: number     // 时间窗口（毫秒）
}

export const rateLimitConfigs: Record<string, RateLimitConfig> = {
  analysis: { maxRequests: 5, windowMs: 60000 },    // 每分钟5次分析
  upload: { maxRequests: 10, windowMs: 60000 },     // 每分钟10次上传
  dashboard: { maxRequests: 60, windowMs: 60000 },  // 每分钟60次dashboard请求
}

export async function checkRateLimit(
  userId: string,
  limiterType: keyof typeof rateLimitConfigs
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const config = rateLimitConfigs[limiterType]
  if (!config) {
    console.warn(`[RateLimit] Unknown limiter type: ${limiterType}`)
    return { success: true, limit: 999, remaining: 999, reset: 0 }
  }

  const key = `${limiterType}:${userId}`
  const now = Date.now()
  
  let entry = rateLimitStore.get(key)
  
  // 如果没有条目或已过期，创建新的
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + config.windowMs,
    }
  }
  
  entry.count++
  rateLimitStore.set(key, entry)
  
  const remaining = Math.max(0, config.maxRequests - entry.count)
  const success = entry.count <= config.maxRequests
  
  if (!success) {
    console.warn(`[RateLimit] User ${userId} exceeded ${limiterType} limit: ${entry.count}/${config.maxRequests}`)
  }
  
  return {
    success,
    limit: config.maxRequests,
    remaining,
    reset: Math.ceil((entry.resetAt - now) / 1000),
  }
}

/**
 * 创建速率限制响应头
 */
export function createRateLimitHeaders(result: { limit: number; remaining: number; reset: number }) {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
  }
}
