import { NextRequest, NextResponse } from 'next/server'
import { list, del } from '@vercel/blob'

export const dynamic = 'force-dynamic'

// 紧急清理API - 删除所有数据
// 警告：这个API没有认证保护，仅用于紧急情况
export async function DELETE(request: NextRequest) {
  try {
    // 简单的密钥验证
    const url = new URL(request.url)
    const key = url.searchParams.get('key')
    
    if (key !== 'emergency_clear_2026') {
      return NextResponse.json({ error: 'Invalid key' }, { status: 403 })
    }

    console.log('[Admin] Starting emergency clear...')
    
    const { blobs } = await list({ prefix: 'analyses/' })
    console.log(`[Admin] Found ${blobs.length} blobs to delete`)
    
    const deleted: string[] = []
    for (const blob of blobs) {
      try {
        await del(blob.url)
        deleted.push(blob.pathname)
        console.log(`[Admin] Deleted: ${blob.pathname}`)
      } catch (e: any) {
        console.error(`[Admin] Failed to delete ${blob.pathname}:`, e.message)
      }
    }
    
    console.log(`[Admin] Emergency clear complete. Deleted ${deleted.length} blobs.`)
    
    return NextResponse.json({ 
      success: true, 
      deletedCount: deleted.length,
      deleted: deleted,
    })
  } catch (error: any) {
    console.error('[Admin] Emergency clear error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to clear' },
      { status: 500 }
    )
  }
}

// 列出所有数据
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const key = url.searchParams.get('key')
    
    if (key !== 'emergency_clear_2026') {
      return NextResponse.json({ error: 'Invalid key' }, { status: 403 })
    }

    const { blobs } = await list({ prefix: 'analyses/' })
    
    return NextResponse.json({ 
      count: blobs.length,
      blobs: blobs.map(b => ({
        pathname: b.pathname,
        size: b.size,
        uploadedAt: b.uploadedAt,
      })),
    })
  } catch (error: any) {
    console.error('[Admin] List error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to list' },
      { status: 500 }
    )
  }
}
