import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { openrouter } from '@/lib/openrouter'
import { COMPARISON_PROMPT } from '@/lib/ai/prompts'
import { analysisStore } from '@/lib/store'

/**
 * Cross-company comparison API
 * Compares multiple companies in the same sector
 */

export const runtime = 'nodejs'
export const maxDuration = 300

interface ComparisonRequest {
  category: 'AI_APPLICATION' | 'AI_SUPPLY_CHAIN'
  companySymbols: string[]
  metrics?: string[]
}

// Company info mapping
const COMPANY_INFO: Record<string, { name: string; nameZh: string }> = {
  // AI Application Companies
  'MSFT': { name: 'Microsoft', nameZh: '微软' },
  'GOOGL': { name: 'Alphabet (Google)', nameZh: '谷歌' },
  'AMZN': { name: 'Amazon', nameZh: '亚马逊' },
  'META': { name: 'Meta Platforms', nameZh: 'Meta' },
  'CRM': { name: 'Salesforce', nameZh: 'Salesforce' },
  'NOW': { name: 'ServiceNow', nameZh: 'ServiceNow' },
  'PLTR': { name: 'Palantir', nameZh: 'Palantir' },
  'AAPL': { name: 'Apple', nameZh: '苹果' },
  'APP': { name: 'AppLovin', nameZh: 'AppLovin' },
  'ADBE': { name: 'Adobe', nameZh: 'Adobe' },
  // AI Supply Chain Companies
  'NVDA': { name: 'Nvidia', nameZh: '英伟达' },
  'AMD': { name: 'AMD', nameZh: 'AMD' },
  'AVGO': { name: 'Broadcom', nameZh: '博通' },
  'TSM': { name: 'TSMC', nameZh: '台积电' },
  '000660.KS': { name: 'SK Hynix', nameZh: 'SK海力士' },
  'MU': { name: 'Micron', nameZh: '美光' },
  '005930.KS': { name: 'Samsung Electronics', nameZh: '三星电子' },
  'INTC': { name: 'Intel', nameZh: '英特尔' },
  'VRT': { name: 'Vertiv', nameZh: 'Vertiv' },
  'ETN': { name: 'Eaton', nameZh: '伊顿' },
  'GEV': { name: 'GE Vernova', nameZh: 'GE Vernova' },
  'VST': { name: 'Vistra', nameZh: 'Vistra' },
  'ASML': { name: 'ASML', nameZh: '阿斯麦' },
  'SNPS': { name: 'Synopsys', nameZh: '新思科技' },
}

// In-memory comparison history (fallback when KV is not available)
let comparisonHistory: any[] = []

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const body = await request.json()
    const { category, companySymbols, metrics } = body as ComparisonRequest

    if (!companySymbols || companySymbols.length < 2) {
      return NextResponse.json(
        { error: 'Please select at least 2 companies for comparison' },
        { status: 400 }
      )
    }

    console.log(`[Comparison] Comparing ${companySymbols.length} companies in ${category}`)

    // Get analysis data from our store for each company (用户隔离)
    const allAnalyses = await analysisStore.getAll(userId)
    
    const companiesData = companySymbols.map((symbol) => {
      const companyInfo = COMPANY_INFO[symbol] || { name: symbol, nameZh: symbol }
      
      // Find latest analysis for this company
      const companyAnalyses = allAnalyses.filter(a => 
        a.company_symbol === symbol || 
        a.company_symbol?.toUpperCase() === symbol.toUpperCase()
      )
      
      const latestAnalysis = companyAnalyses.length > 0 ? companyAnalyses[0] : null
      
      return {
        symbol,
        name: companyInfo.name,
        nameZh: companyInfo.nameZh,
        category,
        analysis: latestAnalysis,
      }
    })

    // Build comparison request content
    const categoryName = category === 'AI_APPLICATION' ? 'AI Application Companies' : 'AI Supply Chain Companies'
    
    // Build company info list
    const companyListText = companiesData.map((c, i) => {
      if (c.analysis && c.analysis.processed) {
        return `
Company ${i + 1}: ${c.name} (${c.symbol}) - ${c.nameZh}
Category: ${categoryName}
Report Period: ${c.analysis.fiscal_quarter ? `Q${c.analysis.fiscal_quarter} ${c.analysis.fiscal_year}` : `FY ${c.analysis.fiscal_year}`}
Financial Analysis Data:
- One-line Conclusion: ${c.analysis.one_line_conclusion || 'N/A'}
- Results Summary: ${c.analysis.results_summary || 'N/A'}
- Results Table: ${JSON.stringify(c.analysis.results_table || [], null, 2)}
- Investment ROI: ${JSON.stringify(c.analysis.investment_roi || {}, null, 2)}
- Final Judgment: ${JSON.stringify(c.analysis.final_judgment || {}, null, 2)}`
      } else {
        return `
Company ${i + 1}: ${c.name} (${c.symbol}) - ${c.nameZh}
Category: ${categoryName}
Note: No analyzed financial report data available for this company. Please compare based on public information.`
      }
    }).join('\n---\n')

    // Call AI to generate comparison analysis
    const response = await openrouter.chat({
      model: 'google/gemini-3-pro-preview',
      messages: [
        {
          role: 'system',
          content: COMPARISON_PROMPT
        },
        {
          role: 'user',
          content: `Please perform a cross-company comparison analysis for the following ${categoryName}:

${companyListText}

${metrics && metrics.length > 0 ? `Focus on these metrics: ${metrics.join(', ')}` : ''}

Please output a detailed cross-company comparison analysis including:
1. Key metrics comparison table (Markdown format)
2. Relative performance analysis
3. Competitive advantage identification
4. Investment recommendation ranking

Note: If some companies lack detailed financial report data, please make reasonable inferences based on public market information and industry knowledge.`
        }
      ],
      temperature: 0.3
    })

    const comparisonContent = response.choices[0].message.content

    // Create comparison record
    const comparisonId = `comparison_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const comparisonData = {
      id: comparisonId,
      category,
      companySymbols,
      comparison_content: comparisonContent,
      companies: companiesData.map(c => ({
        symbol: c.symbol,
        name: c.name,
        nameZh: c.nameZh,
        period: c.analysis?.fiscal_quarter ? `Q${c.analysis.fiscal_quarter} ${c.analysis.fiscal_year}` : 'Latest'
      })),
      created_at: new Date().toISOString(),
      created_by: (session.user as any)?.id || 'anonymous'
    }
    
    // Store in memory (will be lost on restart, but KV can be used when available)
    comparisonHistory.unshift(comparisonData)
    if (comparisonHistory.length > 50) {
      comparisonHistory = comparisonHistory.slice(0, 50)
    }

    console.log(`[Comparison] Generated comparison: ${comparisonId}`)

    return NextResponse.json({
      success: true,
      comparison_id: comparisonId,
      comparison_content: comparisonContent,
      category,
      companies: comparisonData.companies
    })

  } catch (error: any) {
    console.error('[Comparison] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Comparison analysis failed' },
      { status: 500 }
    )
  }
}

// Get comparison history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    return NextResponse.json({ 
      comparisons: comparisonHistory.slice(0, limit)
    })
  } catch (error: any) {
    console.error('[Comparison] Get error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch comparisons' },
      { status: 500 }
    )
  }
}
