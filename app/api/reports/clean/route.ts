import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/session-validator'
import { analysisStore } from '@/lib/store'

export const dynamic = 'force-dynamic'

// Clean stale processing reports (用户只能清理自己的)
export async function POST(request: NextRequest) {
  try {
    // ★★★ 使用增强的Session验证 ★★★
    const sessionResult = await validateSession(request, 'Clean API POST')
    if (!sessionResult.valid) {
      return NextResponse.json(
        { error: sessionResult.error, code: sessionResult.code },
        { status: sessionResult.status }
      )
    }

    const userId = sessionResult.session.userId
    const sessionId = sessionResult.session.sessionId

    // Get optional maxAgeMinutes from request body
    let maxAgeMinutes = 10 // Default: 10 minutes
    try {
      const body = await request.json()
      if (body.maxAgeMinutes && typeof body.maxAgeMinutes === 'number') {
        maxAgeMinutes = body.maxAgeMinutes
      }
    } catch {
      // Use default if no body
    }

    // ★ 传入userId，只清理用户自己的数据
    const deletedCount = await analysisStore.deleteStale(userId, maxAgeMinutes)
    
    console.log(`[Clean API] [${sessionId}] 用户 ${userId} 删除了 ${deletedCount} 条过期报告`)
    
    return NextResponse.json({ 
      success: true, 
      deletedCount,
      message: `Cleaned ${deletedCount} stale processing reports`
    })
  } catch (error: any) {
    console.error('[Clean API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to clean reports' },
      { status: 500 }
    )
  }
}

// Clear ALL user's reports (use with caution)
export async function DELETE(request: NextRequest) {
  try {
    // ★★★ 使用增强的Session验证 ★★★
    const sessionResult = await validateSession(request, 'Clean API DELETE')
    if (!sessionResult.valid) {
      return NextResponse.json(
        { error: sessionResult.error, code: sessionResult.code },
        { status: sessionResult.status }
      )
    }

    const userId = sessionResult.session.userId
    const sessionId = sessionResult.session.sessionId

    // ★ 只清理用户自己的数据
    const deletedCount = await analysisStore.clearUser(userId)
    
    console.log(`[Clean API] [${sessionId}] 用户 ${userId} 清空了 ${deletedCount} 条报告`)
    
    return NextResponse.json({ 
      success: true, 
      deletedCount,
      message: `All ${deletedCount} reports cleared`
    })
  } catch (error: any) {
    console.error('[Clean API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to clear reports' },
      { status: 500 }
    )
  }
}

// Get count of stale reports (用户只能查看自己的)
export async function GET(request: NextRequest) {
  try {
    // ★★★ 使用增强的Session验证 ★★★
    const sessionResult = await validateSession(request, 'Clean API GET')
    if (!sessionResult.valid) {
      return NextResponse.json(
        { error: sessionResult.error, code: sessionResult.code },
        { status: sessionResult.status }
      )
    }

    const userId = sessionResult.session.userId

    // ★ 只获取用户自己的数据
    const all = await analysisStore.getAll(userId)
    const now = Date.now()
    
    const staleReports = all.filter(analysis => {
      if (analysis.processing) {
        const createdAt = new Date(analysis.created_at).getTime()
        const ageMinutes = (now - createdAt) / (1000 * 60)
        return ageMinutes > 10 // Stale if processing for more than 10 minutes
      }
      return false
    })
    
    return NextResponse.json({ 
      staleCount: staleReports.length,
      staleReports: staleReports.map(r => ({
        id: r.id,
        company_name: r.company_name,
        created_at: r.created_at,
        ageMinutes: Math.round((now - new Date(r.created_at).getTime()) / (1000 * 60))
      }))
    })
  } catch (error: any) {
    console.error('[Clean API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get stale reports' },
      { status: 500 }
    )
  }
}
