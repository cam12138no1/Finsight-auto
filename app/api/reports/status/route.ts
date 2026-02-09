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
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    // If specific ID requested, return that analysis status (用户隔离)
    if (id) {
      const analysis = await analysisStore.get(userId, id)
      if (!analysis) {
        return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
      }
      return NextResponse.json({
        id: analysis.id,
        company_name: analysis.company_name,
        company_symbol: analysis.company_symbol,
        status: analysis.error ? 'error' : analysis.processed ? 'completed' : analysis.processing ? 'processing' : 'pending',
        error: analysis.error,
        processed: analysis.processed,
        processing: analysis.processing,
      })
    }

    // Return all processing/recent analyses (用户隔离)
    const allAnalyses = await analysisStore.getAll(userId)
    
    // Get processing items
    const processing = allAnalyses
      .filter(a => a.processing)
      .map(a => ({
        id: a.id,
        company_name: a.company_name,
        company_symbol: a.company_symbol,
        status: 'processing' as const,
        created_at: a.created_at,
      }))

    // Get recently completed (last 10)
    const completed = allAnalyses
      .filter(a => a.processed && !a.processing)
      .slice(0, 10)
      .map(a => ({
        id: a.id,
        company_name: a.company_name,
        company_symbol: a.company_symbol,
        status: 'completed' as const,
        created_at: a.created_at,
      }))

    // Get errors (last 5)
    const errors = allAnalyses
      .filter(a => a.error)
      .slice(0, 5)
      .map(a => ({
        id: a.id,
        company_name: a.company_name,
        company_symbol: a.company_symbol,
        status: 'error' as const,
        error: a.error,
        created_at: a.created_at,
      }))

    return NextResponse.json({
      processing,
      completed,
      errors,
      processingCount: processing.length,
      totalCount: allAnalyses.length,
    })
  } catch (error: any) {
    console.error('[Status API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch status' },
      { status: 500 }
    )
  }
}
