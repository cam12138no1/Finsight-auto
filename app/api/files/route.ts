import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { ApiResponse } from '@/types';

// GET: List shared filings (财报 - 所有用户共享)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('company_id');
    const year = searchParams.get('year');
    const quarter = searchParams.get('quarter');

    let sql = `
      SELECT sf.id, sf.company_id, sf.year, sf.quarter, sf.filename,
             sf.file_url, sf.content_type, sf.file_size, sf.source, sf.created_at,
             c.name as company_name, c.ticker as company_ticker, c.category
      FROM shared_filings sf
      LEFT JOIN companies c ON sf.company_id = c.id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let idx = 1;

    if (companyId) {
      sql += ` AND sf.company_id = $${idx++}`;
      params.push(parseInt(companyId));
    }
    if (year) {
      sql += ` AND sf.year = $${idx++}`;
      params.push(parseInt(year));
    }
    if (quarter) {
      sql += ` AND sf.quarter = $${idx++}`;
      params.push(quarter);
    }
    sql += ' ORDER BY sf.year DESC, sf.quarter, c.name';

    const result = await query(sql, params);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}
