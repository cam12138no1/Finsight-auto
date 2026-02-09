import { NextResponse } from 'next/server'
import { list, del } from '@vercel/blob'

export async function POST(request: Request) {
  try {
    // Get authorization from header
    const authHeader = request.headers.get('authorization')
    
    // Simple auth check - in production, use proper authentication
    if (authHeader !== 'Bearer admin-clear-data-2026') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // List all blobs with the analyses prefix
    const { blobs } = await list({ prefix: 'analyses/' })
    
    let deletedCount = 0
    const errors: string[] = []
    
    // Delete each blob
    for (const blob of blobs) {
      try {
        await del(blob.url)
        deletedCount++
        console.log(`Deleted: ${blob.pathname}`)
      } catch (error) {
        console.error(`Failed to delete ${blob.pathname}:`, error)
        errors.push(blob.pathname)
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Cleared ${deletedCount} items from storage`,
      deletedCount,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    console.error('Error clearing data:', error)
    return NextResponse.json(
      { error: 'Failed to clear data', details: String(error) },
      { status: 500 }
    )
  }
}

// Also support GET for easy testing
export async function GET(request: Request) {
  try {
    // List all blobs to show what would be deleted
    const { blobs } = await list({ prefix: 'analyses/' })
    
    return NextResponse.json({
      message: 'Use POST with authorization header to clear data',
      currentItems: blobs.length,
      items: blobs.map(b => ({
        pathname: b.pathname,
        size: b.size,
        uploadedAt: b.uploadedAt
      }))
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to list data', details: String(error) },
      { status: 500 }
    )
  }
}
