import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { analyzeFinancialReport } from '@/lib/ai/analyzer';
import type { ApiResponse } from '@/types';

export const maxDuration = 300; // 5 minutes for AI analysis

// GET: List analysis results
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('company_id');
    const filingId = searchParams.get('filing_id');

    let sql = `
      SELECT ar.*, c.name as company_name, c.ticker, c.category,
             sf.filename, sf.year as filing_year, sf.quarter as filing_quarter
      FROM analysis_results ar
      LEFT JOIN companies c ON ar.company_id = c.id
      LEFT JOIN shared_filings sf ON ar.filing_id = sf.id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let idx = 1;

    if (companyId) {
      sql += ` AND ar.company_id = $${idx++}`;
      params.push(parseInt(companyId));
    }
    if (filingId) {
      sql += ` AND ar.filing_id = $${idx++}`;
      params.push(parseInt(filingId));
    }
    sql += ' ORDER BY ar.created_at DESC';

    const result = await query(sql, params);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}

// POST: Trigger analysis on a filing from DB
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { filing_id, research_report_id } = body;

    if (!filing_id) {
      return NextResponse.json(
        { success: false, error: '请选择要分析的财报' },
        { status: 400 }
      );
    }

    // Check if already analyzed
    const existingResult = await query(
      `SELECT id, status, result FROM analysis_results WHERE filing_id = $1 AND status = 'completed' LIMIT 1`,
      [filing_id]
    );
    if (existingResult.rows.length > 0) {
      return NextResponse.json({
        success: true,
        data: existingResult.rows[0],
        cached: true,
        message: '已有分析结果，直接返回',
      });
    }

    // Load filing from DB
    const filingResult = await query(
      `SELECT sf.*, c.name as company_name, c.ticker, c.category
       FROM shared_filings sf
       JOIN companies c ON sf.company_id = c.id
       WHERE sf.id = $1`,
      [filing_id]
    );
    if (filingResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '财报不存在' },
        { status: 404 }
      );
    }

    const filing = filingResult.rows[0] as any;
    const fileContent = filing.file_content as Buffer;
    const contentType = filing.content_type as string;
    const companyName = filing.company_name as string;
    const ticker = filing.ticker as string;
    const category = filing.category as string;

    // Create analysis record
    const insertResult = await query(
      `INSERT INTO analysis_results (filing_id, company_id, year, quarter, status)
       VALUES ($1, $2, $3, $4, 'running') RETURNING id`,
      [filing_id, filing.company_id, filing.year, filing.quarter]
    );
    const analysisId = (insertResult.rows[0] as any).id;

    // Extract text from filing
    let reportText: string;
    if (contentType.includes('html') || (filing.filename as string).endsWith('.htm')) {
      // HTML filing — strip tags for text extraction
      const html = fileContent.toString('utf-8');
      reportText = html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();
    } else if (contentType.includes('pdf')) {
      // For PDF, we'd need pdf-parse — for now use raw text extraction
      reportText = fileContent.toString('utf-8');
    } else {
      reportText = fileContent.toString('utf-8');
    }

    // Truncate to avoid token limits (Gemini 3 Pro: 1M tokens)
    if (reportText.length > 200000) {
      reportText = reportText.substring(0, 200000) + '\n\n[内容已截断]';
    }

    // Optionally load research report
    let researchText: string | undefined;
    if (research_report_id) {
      const reportResult = await query(
        'SELECT file_content, content_type, filename FROM user_reports WHERE id = $1',
        [research_report_id]
      );
      if (reportResult.rows.length > 0) {
        const report = reportResult.rows[0] as any;
        const rc = report.file_content as Buffer;
        researchText = rc.toString('utf-8');
        if (researchText.length > 100000) {
          researchText = researchText.substring(0, 100000) + '\n\n[研报内容已截断]';
        }
      }
    }

    const startTime = Date.now();

    // Map category
    const aiCategory = category === 'AI_Applications' ? 'AI_APPLICATION' : 'AI_SUPPLY_CHAIN';

    // Run AI analysis
    const analysisResult = await analyzeFinancialReport(
      reportText,
      {
        company: companyName,
        symbol: ticker,
        period: `${filing.year} ${filing.quarter}`,
        fiscalYear: filing.year,
        fiscalQuarter: parseInt((filing.quarter as string).replace('Q', '')) || undefined,
        category: aiCategory as any,
      },
      researchText
    );

    const durationMs = Date.now() - startTime;

    // Save result
    await query(
      `UPDATE analysis_results SET status = 'completed', result = $1, duration_ms = $2 WHERE id = $3`,
      [JSON.stringify(analysisResult), durationMs, analysisId]
    );

    return NextResponse.json({
      success: true,
      data: {
        id: analysisId,
        filing_id,
        status: 'completed',
        result: analysisResult,
        duration_ms: durationMs,
      },
    });
  } catch (error: any) {
    console.error('[Analysis API] Error:', error);

    return NextResponse.json(
      { success: false, error: error.message || '分析失败' },
      { status: 500 }
    );
  }
}
