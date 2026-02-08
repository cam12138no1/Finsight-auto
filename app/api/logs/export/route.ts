import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET: Export download logs as CSV
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('job_id');
    const status = searchParams.get('status');

    let sql = `
      SELECT 
        c.name as company_name,
        c.ticker,
        c.category,
        dl.year,
        dl.quarter,
        dl.filename,
        dl.file_url,
        dl.file_size,
        dl.status,
        dl.error_message,
        dl.download_duration_ms,
        dl.created_at,
        dl.updated_at
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

    sql += ' ORDER BY dl.created_at DESC';

    const result = await query(sql, params);

    // Build CSV
    const headers = [
      '公司名称', 'Ticker', '分类', '年份', '季度',
      '文件名', '文件URL', '文件大小(字节)', '状态',
      '错误信息', '下载耗时(ms)', '创建时间', '更新时间'
    ];

    const rows = result.rows.map((row: Record<string, unknown>) => [
      row.company_name || '',
      row.ticker || '',
      row.category === 'AI_Applications' ? 'AI应用' : 'AI供应链',
      row.year,
      row.quarter,
      row.filename || '',
      row.file_url || '',
      row.file_size || 0,
      row.status,
      row.error_message || '',
      row.download_duration_ms || '',
      row.created_at,
      row.updated_at,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row: unknown[]) =>
        row.map(cell => {
          const str = String(cell);
          // Escape CSV fields containing commas or quotes
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(',')
      ),
    ].join('\n');

    // Add BOM for Excel to recognize UTF-8
    const bom = '\uFEFF';

    return new NextResponse(bom + csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="finsight_download_logs_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
