import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/session-validator'
import { isDatabaseAvailable, query } from '@/lib/db/connection'

// GET: List download jobs
export async function GET(request: NextRequest) {
  try {
    const sessionResult = await validateSession(request, 'Downloads API')
    if (!sessionResult.valid) {
      return NextResponse.json({ error: sessionResult.error }, { status: sessionResult.status })
    }

    if (!isDatabaseAvailable()) {
      return NextResponse.json({ success: true, data: [] })
    }

    const result = await query(
      `SELECT *, 
        CASE WHEN total_files > 0 
          THEN ROUND((completed_files + failed_files)::numeric / total_files * 100) 
          ELSE 0 
        END as progress_percent
       FROM download_jobs ORDER BY created_at DESC LIMIT 50`
    )
    return NextResponse.json({ success: true, data: result.rows })
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

    if (!isDatabaseAvailable()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const body = await request.json()
    const { years, quarters, company_symbols, category_filter } = body

    if (!years?.length || !quarters?.length) {
      return NextResponse.json({ error: '必须选择至少一个年份和一个季度' }, { status: 400 })
    }

    // Resolve company symbols to IDs if provided
    let companyIds: number[] | null = null
    if (company_symbols?.length) {
      const symbolResult = await query(
        `SELECT id FROM companies WHERE ticker = ANY($1) AND is_active = true`,
        [company_symbols]
      )
      companyIds = symbolResult.rows.map((r: any) => r.id)
    }

    const result = await query(
      `INSERT INTO download_jobs (status, years, quarters, company_ids, category_filter, user_id)
       VALUES ('pending', $1, $2, $3, $4, $5) RETURNING *`,
      [years, quarters, companyIds, category_filter || null, parseInt(sessionResult.session.userId) || null]
    )

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: '下载任务已创建，Worker 将自动处理',
    }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
