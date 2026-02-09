import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/session-validator'
import { isDatabaseAvailable, query } from '@/lib/db/connection'

// GET: List shared filings from DB (used by download center + upload modal selector)
export async function GET(request: NextRequest) {
  try {
    const sessionResult = await validateSession(request, 'Filings API')
    if (!sessionResult.valid) {
      return NextResponse.json({ error: sessionResult.error }, { status: sessionResult.status })
    }

    if (!isDatabaseAvailable()) {
      return NextResponse.json({ success: true, data: [] })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('company_id')
    const year = searchParams.get('year')
    const quarter = searchParams.get('quarter')
    const category = searchParams.get('category')

    let sql = `
      SELECT sf.id, sf.company_id, sf.year, sf.quarter, sf.filename,
             sf.file_url, sf.content_type, sf.file_size, sf.source, sf.created_at,
             c.name as company_name, c.ticker as company_ticker, c.category
      FROM shared_filings sf
      JOIN companies c ON sf.company_id = c.id
      WHERE 1=1
    `
    const params: unknown[] = []
    let idx = 1

    if (companyId) { sql += ` AND sf.company_id = $${idx++}`; params.push(parseInt(companyId)) }
    if (year) { sql += ` AND sf.year = $${idx++}`; params.push(parseInt(year)) }
    if (quarter) { sql += ` AND sf.quarter = $${idx++}`; params.push(quarter) }
    if (category) { sql += ` AND c.category = $${idx++}`; params.push(category) }

    sql += ' ORDER BY c.name, sf.year DESC, sf.quarter'

    const result = await query(sql, params)

    // Also get summary stats
    const statsResult = await query(`
      SELECT COUNT(*) as total,
             COUNT(DISTINCT sf.company_id) as companies,
             array_agg(DISTINCT sf.year ORDER BY sf.year DESC) as years
      FROM shared_filings sf
    `)

    return NextResponse.json({
      success: true,
      data: result.rows,
      stats: statsResult.rows[0] || { total: 0, companies: 0, years: [] },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
