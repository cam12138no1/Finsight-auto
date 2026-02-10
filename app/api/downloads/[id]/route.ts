import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/session-validator'
import { isDatabaseAvailable, query } from '@/lib/db/connection'

// GET: Get download job details with logs
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionResult = await validateSession(request, 'Download Detail')
    if (!sessionResult.valid) {
      return NextResponse.json({ error: sessionResult.error }, { status: sessionResult.status })
    }

    if (!isDatabaseAvailable()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const id = parseInt(params.id)
    if (isNaN(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 })
    }

    // Get job details
    const jobResult = await query(
      `SELECT *,
        CASE WHEN total_files > 0
          THEN ROUND((completed_files + failed_files)::numeric / total_files * 100)
          ELSE 0
        END as progress_percent
       FROM download_jobs WHERE id = $1`,
      [id]
    )

    if (jobResult.rows.length === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Get download logs for this job
    const logsResult = await query(
      `SELECT dl.*, c.name as company_name, c.ticker as company_ticker, c.category
       FROM download_logs dl
       LEFT JOIN companies c ON dl.company_id = c.id
       WHERE dl.job_id = $1
       ORDER BY dl.created_at`,
      [id]
    )

    return NextResponse.json({
      success: true,
      data: {
        job: jobResult.rows[0],
        logs: logsResult.rows,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: Cancel a download job
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionResult = await validateSession(request, 'Download Cancel')
    if (!sessionResult.valid) {
      return NextResponse.json({ error: sessionResult.error }, { status: sessionResult.status })
    }

    if (!isDatabaseAvailable()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const id = parseInt(params.id)
    if (isNaN(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 })
    }

    // Only cancel pending or running jobs
    const result = await query(
      `UPDATE download_jobs
       SET status = 'cancelled', completed_at = NOW()
       WHERE id = $1 AND status IN ('pending', 'running')
       RETURNING *`,
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: '任务不存在或已完成，无法取消' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: '任务已取消',
      data: result.rows[0],
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
