import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/session-validator'

// Download a shared filing by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionResult = await validateSession(request, 'Filing Download')
    if (!sessionResult.valid) {
      return NextResponse.json({ error: sessionResult.error }, { status: sessionResult.status })
    }

    // TODO: When DATABASE_URL is configured, query shared_filings and return file_content
    return NextResponse.json({ error: 'Filing download requires database connection' }, { status: 503 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
