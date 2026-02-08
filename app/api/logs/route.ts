import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { ApiResponse } from '@/types';

// GET: List download logs with optional filtering
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const jobId = searchParams.get('job_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let sql = `
      SELECT dl.*, c.name as company_name, c.ticker as company_ticker
      FROM download_logs dl
      LEFT JOIN companies c ON dl.company_id = c.id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (jobId) {
      sql += ` AND dl.job_id = $${paramIndex++}`;
      params.push(parseInt(jobId));
    }

    if (status) {
      sql += ` AND dl.status = $${paramIndex++}`;
      params.push(status);
    }

    if (search) {
      sql += ` AND (LOWER(c.name) LIKE $${paramIndex} OR LOWER(c.ticker) LIKE $${paramIndex} OR LOWER(dl.filename) LIKE $${paramIndex})`;
      params.push(`%${search.toLowerCase()}%`);
      paramIndex++;
    }

    // Count query
    const countSql = sql.replace(/SELECT dl\.\*, c\.name as company_name, c\.ticker as company_ticker/, 'SELECT COUNT(*) as total');
    const countResult = await query(countSql, params);
    const total = parseInt(String(countResult.rows[0]?.total ?? '0'));

    sql += ` ORDER BY dl.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
      meta: { total, limit, offset },
    } satisfies ApiResponse<unknown>);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}
