import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/session-validator'
import { analysisStore } from '@/lib/store'

export const dynamic = 'force-dynamic'

// Delete a specific report (用户只能删除自己的报告)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ★★★ 使用增强的Session验证 ★★★
    const sessionResult = await validateSession(request, 'Reports DELETE')
    if (!sessionResult.valid) {
      return NextResponse.json(
        { error: sessionResult.error, code: sessionResult.code },
        { status: sessionResult.status }
      )
    }

    const userId = sessionResult.session.userId
    const sessionId = sessionResult.session.sessionId
    const { id } = params
    
    if (!id) {
      return NextResponse.json({ error: 'Report ID is required' }, { status: 400 })
    }

    // ★ 传入userId，确保只能删除自己的数据
    const deleted = await analysisStore.delete(userId, id)
    
    if (deleted) {
      console.log(`[Reports API] [${sessionId}] 用户 ${userId} 删除报告: ${id}`)
      return NextResponse.json({ success: true, message: `Report ${id} deleted` })
    } else {
      return NextResponse.json({ error: 'Report not found or access denied' }, { status: 404 })
    }
  } catch (error: any) {
    console.error('[Reports API] Delete error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete report' },
      { status: 500 }
    )
  }
}

// Get a specific report (用户只能查看自己的报告)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ★★★ 使用增强的Session验证 ★★★
    const sessionResult = await validateSession(request, 'Reports GET')
    if (!sessionResult.valid) {
      return NextResponse.json(
        { error: sessionResult.error, code: sessionResult.code },
        { status: sessionResult.status }
      )
    }

    const userId = sessionResult.session.userId
    const sessionId = sessionResult.session.sessionId
    const { id } = params
    
    if (!id) {
      return NextResponse.json({ error: 'Report ID is required' }, { status: 400 })
    }

    // ★ 传入userId，确保只能查看自己的数据
    const report = await analysisStore.get(userId, id)
    
    if (report) {
      // ★★★ 双重验证：确保返回的数据确实属于当前用户 ★★★
      if (report.user_id && report.user_id !== userId) {
        console.error(`[Reports API] [${sessionId}] ❌ 数据访问被拒绝: 报告属于用户 ${report.user_id}，当前用户是 ${userId}`)
        return NextResponse.json({ error: 'Report not found or access denied' }, { status: 404 })
      }
      return NextResponse.json({ report })
    } else {
      return NextResponse.json({ error: 'Report not found or access denied' }, { status: 404 })
    }
  } catch (error: any) {
    console.error('[Reports API] Get error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get report' },
      { status: 500 }
    )
  }
}
