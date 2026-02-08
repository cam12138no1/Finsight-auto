import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { ApiResponse } from '@/types';

// GET: Get recent activity feed
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // Combine recent job events and download events
    const sql = `
      (
        SELECT 
          dj.id,
          CASE dj.status
            WHEN 'completed' THEN 'job_completed'
            WHEN 'failed' THEN 'job_failed'
            WHEN 'running' THEN 'job_created'
            ELSE 'job_created'
          END as type,
          CASE dj.status
            WHEN 'completed' THEN '下载任务 #' || dj.id || ' 已完成 (' || dj.completed_files || '/' || dj.total_files || ' 文件)'
            WHEN 'failed' THEN '下载任务 #' || dj.id || ' 失败: ' || COALESCE(dj.error_message, '未知错误')
            WHEN 'running' THEN '下载任务 #' || dj.id || ' 正在运行 (' || dj.completed_files || '/' || dj.total_files || ')'
            WHEN 'pending' THEN '创建下载任务 #' || dj.id || ' (' || array_length(dj.years, 1) || '年 x ' || array_length(dj.quarters, 1) || '季度)'
            ELSE '下载任务 #' || dj.id || ' ' || dj.status
          END as message,
          COALESCE(dj.completed_at, dj.started_at, dj.created_at) as timestamp
        FROM download_jobs dj
        ORDER BY COALESCE(dj.completed_at, dj.started_at, dj.created_at) DESC
        LIMIT $1
      )
      UNION ALL
      (
        SELECT 
          dl.id,
          CASE dl.status
            WHEN 'success' THEN 'download_success'
            WHEN 'failed' THEN 'download_failed'
            ELSE 'download_started'
          END as type,
          CASE dl.status
            WHEN 'success' THEN '下载成功: ' || COALESCE(c.name, '') || ' ' || dl.year || ' ' || dl.quarter
            WHEN 'failed' THEN '下载失败: ' || COALESCE(c.name, '') || ' ' || dl.year || ' ' || dl.quarter
            ELSE '正在下载: ' || COALESCE(c.name, '') || ' ' || dl.year || ' ' || dl.quarter
          END as message,
          dl.updated_at as timestamp
        FROM download_logs dl
        LEFT JOIN companies c ON dl.company_id = c.id
        WHERE dl.status IN ('success', 'failed')
        ORDER BY dl.updated_at DESC
        LIMIT $1
      )
      ORDER BY timestamp DESC
      LIMIT $1
    `;

    const result = await query(sql, [limit]);

    return NextResponse.json({
      success: true,
      data: result.rows,
    } satisfies ApiResponse<unknown>);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}
