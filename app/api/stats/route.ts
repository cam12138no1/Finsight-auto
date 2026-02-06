import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { DashboardStats, ApiResponse } from '@/types';

export async function GET() {
  try {
    interface StatsRow { total: string; active: string; running: string; total_downloaded: string; total_size: string; success_rate: string }

    const [companiesRes, jobsRes, filesRes] = await Promise.all([
      query<StatsRow>(`SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true) as active
        FROM companies`),
      query<StatsRow>(`SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'running') as running
        FROM download_jobs`),
      query<StatsRow>(`SELECT 
        COUNT(*) FILTER (WHERE status = 'success') as total_downloaded,
        COALESCE(SUM(file_size) FILTER (WHERE status = 'success'), 0) as total_size,
        CASE WHEN COUNT(*) > 0
          THEN ROUND(COUNT(*) FILTER (WHERE status = 'success')::numeric / COUNT(*) * 100, 1)
          ELSE 0
        END as success_rate
        FROM download_logs`),
    ]);

    const cr = companiesRes.rows[0];
    const jr = jobsRes.rows[0];
    const fr = filesRes.rows[0];

    const stats: DashboardStats = {
      total_companies: parseInt(String(cr?.total ?? '0')),
      active_companies: parseInt(String(cr?.active ?? '0')),
      total_jobs: parseInt(String(jr?.total ?? '0')),
      running_jobs: parseInt(String(jr?.running ?? '0')),
      total_files_downloaded: parseInt(String(fr?.total_downloaded ?? '0')),
      total_download_size: parseInt(String(fr?.total_size ?? '0')),
      success_rate: parseFloat(String(fr?.success_rate ?? '0')),
    };

    return NextResponse.json({ success: true, data: stats } satisfies ApiResponse<DashboardStats>);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}
