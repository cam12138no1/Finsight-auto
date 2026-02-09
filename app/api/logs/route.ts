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
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    // Build WHERE clause (shared between data and count query)
    let whereClause = ' WHERE 1=1';
    const filterParams: unknown[] = [];
    let paramIndex = 1;

    if (jobId) {
      whereClause += ` AND dl.job_id = $${paramIndex++}`;
      filterParams.push(parseInt(jobId));
    }
    if (status) {
      whereClause += ` AND dl.status = $${paramIndex++}`;
      filterParams.push(status);
    }
    if (search) {
      whereClause += ` AND (LOWER(c.name) LIKE $${paramIndex} OR LOWER(c.ticker) LIKE $${paramIndex} OR LOWER(dl.filename) LIKE $${paramIndex})`;
      filterParams.push(`%${search.toLowerCase()}%`);
      paramIndex++;
    }

    const fromClause = `FROM download_logs dl LEFT JOIN companies c ON dl.company_id = c.id`;

    // Count query (separate, not regex-replaced)
    const countResult = await query(
      `SELECT COUNT(*) as total ${fromClause} ${whereClause}`,
      filterParams
    );
    const total = parseInt(String(countResult.rows[0]?.total ?? '0'));

    // Data query with pagination
    const dataParams = [...filterParams, limit, offset];
    const result = await query(
      `SELECT dl.*, c.name as company_name, c.ticker as company_ticker
       ${fromClause} ${whereClause}
       ORDER BY dl.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      dataParams
    );

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
