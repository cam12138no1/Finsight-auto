import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/session-validator'
import { isDatabaseAvailable, query } from '@/lib/db/connection'

// GET: Download a shared filing by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionResult = await validateSession(request, 'Filing Download')
    if (!sessionResult.valid) {
      return NextResponse.json({ error: sessionResult.error }, { status: sessionResult.status })
    }

    if (!isDatabaseAvailable()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const id = parseInt(params.id)
    if (isNaN(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const result = await query(
      'SELECT filename, content_type, file_content FROM shared_filings WHERE id = $1',
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Filing not found' }, { status: 404 })
    }

    const row = result.rows[0] as any
    const content = row.file_content as Buffer
    if (!content || content.length === 0) {
      return NextResponse.json({ error: 'File content is empty' }, { status: 404 })
    }

    const body = new Uint8Array(content)
    return new NextResponse(body, {
      headers: {
        'Content-Type': row.content_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(row.filename || 'filing')}"`,
        'Content-Length': String(body.length),
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
