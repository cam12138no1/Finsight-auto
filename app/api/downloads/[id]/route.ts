import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { ApiResponse } from '@/types';

// GET: Get a specific download job with its logs
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = parseInt(params.id);

    const jobResult = await query(
      `SELECT *, 
        CASE WHEN total_files > 0 
          THEN ROUND((completed_files + failed_files)::numeric / total_files * 100) 
          ELSE 0 
        END as progress_percent
       FROM download_jobs WHERE id = $1`,
      [jobId]
    );

    if (jobResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '任务不存在' } satisfies ApiResponse<never>,
        { status: 404 }
      );
    }

    const logsResult = await query(
      `SELECT dl.*, c.name as company_name, c.ticker as company_ticker
       FROM download_logs dl
       LEFT JOIN companies c ON dl.company_id = c.id
       WHERE dl.job_id = $1
       ORDER BY dl.created_at DESC`,
      [jobId]
    );

    return NextResponse.json({
      success: true,
      data: {
        job: jobResult.rows[0],
        logs: logsResult.rows,
      },
    } satisfies ApiResponse<unknown>);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}

// DELETE: Cancel a download job
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = parseInt(params.id);

    const result = await query(
      `UPDATE download_jobs 
       SET status = 'cancelled', completed_at = NOW()
       WHERE id = $1 AND status IN ('pending', 'running')
       RETURNING *`,
      [jobId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '任务不存在或无法取消' } satisfies ApiResponse<never>,
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: '任务已取消',
    } satisfies ApiResponse<unknown>);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}
