import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/session-validator'
import { isDatabaseAvailable, query } from '@/lib/db/connection'
import { extractTextFromDocument } from '@/lib/document-parser'
import { analyzeFinancialReport } from '@/lib/ai/analyzer'
import { extractMetadataFromReport } from '@/lib/ai/extractor'
import { analysisStore } from '@/lib/store'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes

/**
 * Analyze a filing directly from the shared_filings database.
 * This enables the "选择已有财报" flow without re-uploading.
 * 
 * POST body: { filingId: number, category?: string }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let processingId: string | null = null
  let userId: string | null = null

  try {
    // 1. Validate session
    const sessionResult = await validateSession(request, 'Analyze Filing API')
    if (!sessionResult.valid) {
      return NextResponse.json({ error: sessionResult.error }, { status: sessionResult.status })
    }
    userId = sessionResult.session.userId

    if (!isDatabaseAvailable()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    // 2. Parse request
    const body = await request.json()
    const { filingId, category } = body

    if (!filingId || typeof filingId !== 'number') {
      return NextResponse.json({ error: '请选择一份财报' }, { status: 400 })
    }

    // 3. Fetch filing from database (including content)
    console.log(`[AnalyzeFiling] Fetching filing #${filingId} from database...`)
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

    console.log(`[AnalyzeFiling] Filing: ${filing.company_name} ${filing.year} ${filing.quarter} (${filing.content_type}, ${(fileContent.length / 1024).toFixed(0)} KB)`)

    // 4. Generate a unique request ID for deduplication
    const requestId = `db_filing_${filingId}_${Date.now()}`

    // 5. Check if this filing has already been analyzed recently
    // (simple dedup: check by company + period in last 10 minutes)
    
    // 6. Extract text from the filing content
    console.log('[AnalyzeFiling] Extracting text...')
    const contentType = filing.content_type || 'application/pdf'
    const filename = filing.filename || 'filing.pdf'
    
    // Determine the correct type hint for the parser
    let typeHint = contentType
    if (filename.endsWith('.htm') || filename.endsWith('.html')) {
      typeHint = 'text/html'
    } else if (filename.endsWith('.pdf')) {
      typeHint = 'application/pdf'
    }

    let financialText: string
    try {
      financialText = await extractTextFromDocument(Buffer.from(fileContent), typeHint)
    } catch (parseError: any) {
      console.error(`[AnalyzeFiling] Text extraction failed: ${parseError.message}`)
      return NextResponse.json({ error: `文本提取失败: ${parseError.message}` }, { status: 500 })
    }

    if (!financialText || financialText.length < 100) {
      return NextResponse.json({ error: '无法从财报中提取足够的文本内容' }, { status: 400 })
    }

    console.log(`[AnalyzeFiling] Extracted ${financialText.length} characters`)

    // 7. Extract metadata
    console.log('[AnalyzeFiling] Extracting metadata...')
    const metadata = await extractMetadataFromReport(financialText)

    const finalFiscalYear = filing.year || metadata.fiscal_year || new Date().getFullYear()
    const quarterNum = filing.quarter === 'FY' ? null : parseInt(filing.quarter?.replace('Q', '') || '0')
    const finalFiscalQuarter = quarterNum || metadata.fiscal_quarter || 4
    const period = filing.quarter === 'FY' ? `FY ${finalFiscalYear}` : `Q${finalFiscalQuarter} ${finalFiscalYear}`

    // Use company info from the filing record
    const companyName = filing.company_name || metadata.company_name
    const companySymbol = filing.company_ticker || metadata.company_symbol
    const filingCategory = category || filing.company_category || undefined

    // 8. Create processing record
    console.log(`[AnalyzeFiling] Creating analysis record for ${companyName} ${period}...`)
    const processingEntry = await analysisStore.addWithRequestId(userId, requestId, {
      company_name: companyName,
      company_symbol: companySymbol,
      report_type: metadata.report_type,
      fiscal_year: finalFiscalYear,
      fiscal_quarter: finalFiscalQuarter || undefined,
      period: period,
      category: filingCategory,
      filing_date: metadata.filing_date,
      created_at: new Date().toISOString(),
      processed: false,
      processing: true,
    })
    processingId = processingEntry.id

    // 9. AI Analysis
    console.log(`[AnalyzeFiling] Starting AI analysis for ${companyName} ${period}...`)
    const analysis = await analyzeFinancialReport(
      financialText,
      {
        company: companyName,
        symbol: companySymbol,
        period: period,
        fiscalYear: finalFiscalYear,
        fiscalQuarter: finalFiscalQuarter || undefined,
        category: filingCategory,
      }
    )
    console.log('[AnalyzeFiling] AI analysis complete')

    // 10. Update record
    const storedAnalysis = await analysisStore.update(userId, processingId, {
      processed: true,
      processing: false,
      error: undefined,
      ...analysis,
    })

    const duration = Date.now() - startTime
    console.log(`[AnalyzeFiling] Done in ${duration}ms`)

    return NextResponse.json({
      success: true,
      analysis_id: processingId,
      metadata: {
        company_name: companyName,
        company_symbol: companySymbol,
        period: period,
      },
      analysis: storedAnalysis,
    })

  } catch (error: any) {
    console.error('[AnalyzeFiling] Error:', error.message)

    if (processingId && userId) {
      try {
        await analysisStore.update(userId, processingId, {
          processing: false,
          error: error.message,
        })
      } catch (updateError) {
        console.error('[AnalyzeFiling] Failed to update error state:', updateError)
      }
    }

    return NextResponse.json({ error: error.message || '分析失败' }, { status: 500 })
  }
}
