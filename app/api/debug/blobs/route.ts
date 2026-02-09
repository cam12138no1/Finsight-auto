import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { list } from '@vercel/blob'

export const dynamic = 'force-dynamic'

// Debug API to list all blobs
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { blobs } = await list({ prefix: 'analyses/' })
    
    const blobInfo = blobs.map(blob => ({
      pathname: blob.pathname,
      size: blob.size,
      uploadedAt: blob.uploadedAt,
      url: blob.url,
    }))

    return NextResponse.json({ 
      count: blobs.length,
      blobs: blobInfo,
    })
  } catch (error: any) {
    console.error('Debug blobs error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to list blobs' },
      { status: 500 }
    )
  }
}
