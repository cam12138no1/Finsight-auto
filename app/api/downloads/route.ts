import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import type { DownloadJob, ApiResponse, CreateJobRequest } from '@/types';

// GET: List all download jobs
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let sql = `
      SELECT *, 
        CASE WHEN total_files > 0 
          THEN ROUND((completed_files + failed_files)::numeric / total_files * 100) 
          ELSE 0 
        END as progress_percent
      FROM download_jobs
    `;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (status) {
      sql += ` WHERE status = $${paramIndex++}`;
      params.push(status);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    return NextResponse.json({ success: true, data: result.rows } satisfies ApiResponse<unknown>);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}

// POST: Create a new download job
export async function POST(req: NextRequest) {
  try {
    const body: CreateJobRequest = await req.json();
    const { years, quarters, company_ids, category_filter } = body;

    if (!years?.length || !quarters?.length) {
      return NextResponse.json(
        { success: false, error: '必须选择至少一个年份和一个季度' } satisfies ApiResponse<never>,
        { status: 400 }
      );
    }

    const result = await query<DownloadJob>(
      `INSERT INTO download_jobs (status, years, quarters, company_ids, category_filter)
       VALUES ('pending', $1, $2, $3, $4)
       RETURNING *`,
      [years, quarters, company_ids || null, category_filter || null]
    );

    const job = result.rows[0];
    return NextResponse.json(
      { success: true, data: job, message: '下载任务已创建' } satisfies ApiResponse<DownloadJob>,
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}
