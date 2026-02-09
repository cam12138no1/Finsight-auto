import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/session-validator'

// Shared filings are stored in Vercel Blob or PostgreSQL
// For now, this returns an empty list — filings will be populated by the Worker
export async function GET(request: NextRequest) {
  try {
    const sessionResult = await validateSession(request, 'Filings API')
    if (!sessionResult.valid) {
      return NextResponse.json({ error: sessionResult.error }, { status: sessionResult.status })
    }

    // TODO: When DATABASE_URL is configured, query shared_filings table
    // For now return empty — the Worker service populates this
    return NextResponse.json({ 
      success: true, 
      data: [],
      message: 'Shared filings will be populated after running download jobs via the Worker service'
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
