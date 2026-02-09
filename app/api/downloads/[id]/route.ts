import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/session-validator'

// GET: Get download job details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionResult = await validateSession(request, 'Download Detail')
    if (!sessionResult.valid) {
      return NextResponse.json({ error: sessionResult.error }, { status: sessionResult.status })
    }

    // TODO: Query download_jobs + download_logs tables
    return NextResponse.json({ success: true, data: null })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: Cancel a download job
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionResult = await validateSession(request, 'Download Cancel')
    if (!sessionResult.valid) {
      return NextResponse.json({ error: sessionResult.error }, { status: sessionResult.status })
    }

    // TODO: Update download_jobs status to 'cancelled'
    return NextResponse.json({ success: true, message: '任务已取消' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
