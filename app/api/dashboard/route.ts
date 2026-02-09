import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/session-validator'
import { analysisStore } from '@/lib/store'
import { checkRateLimit, createRateLimitHeaders } from '@/lib/ratelimit'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // ★★★ 使用增强的Session验证 ★★★
    const sessionResult = await validateSession(request, 'Dashboard API')
    if (!sessionResult.valid) {
      return NextResponse.json(
        { error: sessionResult.error, code: sessionResult.code },
        { status: sessionResult.status }
      )
    }

    const userId = sessionResult.session.userId
    const sessionId = sessionResult.session.sessionId

    // 速率限制检查
    const rateLimit = await checkRateLimit(userId, 'dashboard')
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: '请求过于频繁，请稍后再试' },
        { 
          status: 429,
          headers: createRateLimitHeaders(rateLimit),
        }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    // ★★★ 使用用户隔离的方法获取数据 ★★★
    console.log(`[Dashboard API] [${sessionId}] 获取用户 ${userId} 的数据`)
    const allAnalyses = await analysisStore.getAll(userId)
    const analyses = allAnalyses.slice(0, limit)
    
    // 计算统计信息
    const stats = await analysisStore.getUserStats(userId)

    console.log(`[Dashboard API] [${sessionId}] 用户 ${userId}: ${analyses.length} 条记录, ${stats.processing} 处理中`)

    // ★★★ 验证返回的数据确实属于当前用户 ★★★
    const validatedAnalyses = analyses.filter(a => {
      if (a.user_id && a.user_id !== userId) {
        console.error(`[Dashboard API] [${sessionId}] ❌ 数据泄露风险！记录 ${a.id} 属于用户 ${a.user_id}，但当前用户是 ${userId}`)
        return false
      }
      return true
    })

    if (validatedAnalyses.length !== analyses.length) {
      console.error(`[Dashboard API] [${sessionId}] ⚠️ 过滤了 ${analyses.length - validatedAnalyses.length} 条不属于当前用户的记录`)
    }

    return NextResponse.json({ 
      analyses: validatedAnalyses,
      recentAnalyses: validatedAnalyses,
      processingCount: stats.processing,
      totalCount: stats.total,
      completedCount: stats.completed,
      failedCount: stats.failed,
    })
  } catch (error: any) {
    console.error('[Dashboard API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
