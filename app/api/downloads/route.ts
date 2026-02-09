import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/session-validator'

// GET: List download jobs for current user
export async function GET(request: NextRequest) {
  try {
    const sessionResult = await validateSession(request, 'Downloads API')
    if (!sessionResult.valid) {
      return NextResponse.json({ error: sessionResult.error }, { status: sessionResult.status })
    }

    // TODO: Query download_jobs table filtered by user_id
    return NextResponse.json({ success: true, data: [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Create a new download job
export async function POST(request: NextRequest) {
  try {
    const sessionResult = await validateSession(request, 'Downloads API')
    if (!sessionResult.valid) {
      return NextResponse.json({ error: sessionResult.error }, { status: sessionResult.status })
    }

    const body = await request.json()
    const { years, quarters, company_symbols, category_filter } = body

    if (!years?.length || !quarters?.length) {
      return NextResponse.json({ error: '必须选择至少一个年份和一个季度' }, { status: 400 })
    }

    // TODO: Insert into download_jobs table with user_id from session
    // The Python Worker will pick up pending jobs and process them
    return NextResponse.json({ 
      success: true, 
      message: '下载任务已创建，Worker 将自动处理',
      data: { id: 0, status: 'pending' }
    }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
