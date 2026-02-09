import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { analysisStore } from '@/lib/store'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Use async store methods (用户隔离)
    const allAnalyses = await analysisStore.getAll(userId)
    
    console.log(`[Reports API] Retrieved ${allAnalyses.length} analyses`)
    
    // Group by company
    const companiesMap = new Map<string, any>()
    
    for (const analysis of allAnalyses) {
      const symbol = analysis.company_symbol
      if (!companiesMap.has(symbol)) {
        companiesMap.set(symbol, {
          id: symbol,
          symbol: symbol,
          name: analysis.company_name,
          reports: [],
        })
      }
      
      companiesMap.get(symbol).reports.push({
        id: analysis.id,
        report_type: analysis.report_type,
        fiscal_year: analysis.fiscal_year,
        fiscal_quarter: analysis.fiscal_quarter,
        filing_date: analysis.filing_date,
        processed: analysis.processed,
        processing: analysis.processing,
        error: analysis.error,
        analysis: analysis,
      })
    }

    const companies = Array.from(companiesMap.values())

    return NextResponse.json({ companies })
  } catch (error: any) {
    console.error('Get reports error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch reports' },
      { status: 500 }
    )
  }
}
