import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/session-validator'
import { isDatabaseAvailable, query } from '@/lib/db/connection'
import { extractTextFromDocument } from '@/lib/document-parser'
import { analyzeFinancialReport } from '@/lib/ai/analyzer'
import { extractMetadataFromReport } from '@/lib/ai/extractor'
import { analysisStore } from '@/lib/store'

export const runtime = 'nodejs'
export const maxDuration = 300

/**
 * Analyze a filing from shared_filings DB, optionally with a research report.
 * Supports two content types:
 *   - application/json: { filingId, category }
 *   - multipart/form-data: filingId + category + researchFile (optional)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let processingId: string | null = null
  let userId: string | null = null

  try {
    const sessionResult = await validateSession(request, 'AnalyzeFiling')
    if (!sessionResult.valid) {
      return NextResponse.json({ error: sessionResult.error }, { status: sessionResult.status })
    }
    userId = sessionResult.session.userId

    if (!isDatabaseAvailable()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    // Parse request — supports JSON or FormData
    let filingId: number
    let category: string | undefined
    let researchBuffer: Buffer | null = null
    let researchName: string | null = null

    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      filingId = parseInt(formData.get('filingId') as string)
      category = (formData.get('category') as string) || undefined
      const researchFile = formData.get('researchFile') as File | null
      if (researchFile && researchFile.size > 0) {
        researchBuffer = Buffer.from(await researchFile.arrayBuffer())
        researchName = researchFile.name
        console.log(`[AnalyzeFiling] Research report: ${researchName} (${(researchBuffer.length / 1024).toFixed(0)} KB)`)
      }
    } else {
      const body = await request.json()
      filingId = body.filingId
      category = body.category
    }

    if (!filingId || isNaN(filingId)) {
      return NextResponse.json({ error: '请选择一份财报' }, { status: 400 })
    }

    // Fetch filing from DB
    console.log(`[AnalyzeFiling] Fetching filing #${filingId}...`)
    const result = await query(
      `SELECT sf.*, c.name as company_name, c.ticker as company_ticker, c.category as company_category
       FROM shared_filings sf
       JOIN companies c ON sf.company_id = c.id
       WHERE sf.id = $1`,
      [filingId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: '财报不存在' }, { status: 404 })
    }

    const filing = result.rows[0] as any
    const fileContent = filing.file_content as Buffer
    if (!fileContent || fileContent.length === 0) {
      return NextResponse.json({ error: '财报内容为空' }, { status: 404 })
    }

    console.log(`[AnalyzeFiling] ${filing.company_name} ${filing.year} ${filing.quarter} (${filing.content_type}, ${(fileContent.length / 1024).toFixed(0)} KB)`)

    // Extract financial text
    let typeHint = filing.content_type || 'application/pdf'
    if (filing.filename?.endsWith('.htm') || filing.filename?.endsWith('.html')) typeHint = 'text/html'
    else if (filing.filename?.endsWith('.pdf')) typeHint = 'application/pdf'

    let financialText: string
    try {
      financialText = await extractTextFromDocument(Buffer.from(fileContent), typeHint)
    } catch (e: any) {
      return NextResponse.json({ error: `文本提取失败: ${e.message}` }, { status: 500 })
    }

    if (!financialText || financialText.length < 100) {
      return NextResponse.json({ error: '无法从财报中提取足够的文本内容' }, { status: 400 })
    }
    console.log(`[AnalyzeFiling] Financial text: ${financialText.length} chars`)

    // Extract research report text (optional)
    let researchText: string | undefined
    if (researchBuffer) {
      try {
        researchText = await extractTextFromDocument(researchBuffer, researchName || 'report.pdf')
        console.log(`[AnalyzeFiling] Research text: ${researchText.length} chars`)
      } catch (e: any) {
        console.warn(`[AnalyzeFiling] Research report extraction failed: ${e.message}`)
        // Continue without research report
      }
    }

    // Extract metadata
    const metadata = await extractMetadataFromReport(financialText)
    const finalYear = filing.year || metadata.fiscal_year || new Date().getFullYear()
    const qNum = filing.quarter === 'FY' ? null : parseInt(filing.quarter?.replace('Q', '') || '0')
    const finalQuarter = qNum || metadata.fiscal_quarter || 4
    const period = filing.quarter === 'FY' ? `FY ${finalYear}` : `Q${finalQuarter} ${finalYear}`
    const companyName = filing.company_name || metadata.company_name
    const companySymbol = filing.company_ticker || metadata.company_symbol
    const filingCategory = category || filing.company_category || undefined

    // Create processing record
    const requestId = `db_filing_${filingId}_${Date.now()}`
    const entry = await analysisStore.addWithRequestId(userId, requestId, {
      company_name: companyName,
      company_symbol: companySymbol,
      report_type: metadata.report_type,
      fiscal_year: finalYear,
      fiscal_quarter: finalQuarter || undefined,
      period,
      category: filingCategory,
      filing_date: metadata.filing_date,
      created_at: new Date().toISOString(),
      processed: false,
      processing: true,
      has_research_report: !!researchText,
    })
    processingId = entry.id

    // AI Analysis
    console.log(`[AnalyzeFiling] AI analysis for ${companyName} ${period}${researchText ? ' (with research report)' : ''}...`)
    const analysis = await analyzeFinancialReport(
      financialText,
      {
        company: companyName,
        symbol: companySymbol,
        period,
        fiscalYear: finalYear,
        fiscalQuarter: finalQuarter || undefined,
        category: filingCategory,
      },
      researchText
    )

    const stored = await analysisStore.update(userId, processingId, {
      processed: true, processing: false, error: undefined,
      ...analysis,
    })

    console.log(`[AnalyzeFiling] Done in ${Date.now() - startTime}ms`)
    return NextResponse.json({
      success: true, analysis_id: processingId,
      metadata: { company_name: companyName, company_symbol: companySymbol, period },
      analysis: stored,
    })

  } catch (error: any) {
    console.error('[AnalyzeFiling] Error:', error.message)
    if (processingId && userId) {
      try { await analysisStore.update(userId, processingId, { processing: false, error: error.message }) } catch {}
    }
    return NextResponse.json({ error: error.message || '分析失败' }, { status: 500 })
  }
}
