// app/api/admin/cleanup/route.ts - 资源清理API

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { list, del } from '@vercel/blob'

export const runtime = 'nodejs'
export const maxDuration = 60 // 1 minute

/**
 * Cleanup API - Delete stale and orphaned records
 * 
 * Permission: Admin only (or via cron secret)
 */
export async function POST(request: NextRequest) {
  try {
    // 检查是否是 cron job 调用
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    let isAuthorized = false
    
    // Cron job 认证
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      console.log('[Cleanup] Authorized via CRON_SECRET')
      isAuthorized = true
    }
    
    // 用户认证
    if (!isAuthorized) {
      const session = await getServerSession(authOptions)
      if (session?.user?.role === 'admin') {
        console.log(`[Cleanup] Authorized via session: ${session.user.email}`)
        isAuthorized = true
      }
    }
    
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const {
      cleanStale = true,
      staleMinutes = 30,
      dryRun = false,
    } = body

    console.log(`[Cleanup] Starting cleanup (dryRun=${dryRun}, staleMinutes=${staleMinutes})`)

    const results = {
      staleDeleted: 0,
      orphanedDeleted: 0,
      totalFreedBytes: 0,
      details: [] as string[],
    }

    // 获取所有分析文件
    const { blobs } = await list({ prefix: 'analyses/' })
    console.log(`[Cleanup] Found ${blobs.length} files`)

    const now = Date.now()
    const staleThreshold = staleMinutes * 60 * 1000

    for (const blob of blobs) {
      try {
        // 跳过索引文件
        if (blob.pathname.endsWith('_index.json')) {
          continue
        }

        // 读取文件内容
        const response = await fetch(blob.url)
        if (!response.ok) continue

        const analysis = await response.json()

        // 检查是否是卡住的任务（processing=true 超过阈值）
        if (cleanStale && analysis.processing === true) {
          const createdAt = new Date(analysis.created_at).getTime()
          const age = now - createdAt

          if (age > staleThreshold) {
            console.log(`[Cleanup] Stale record: ${blob.pathname} (age: ${Math.round(age / 60000)}min)`)
            
            if (!dryRun) {
              await del(blob.url)
              results.totalFreedBytes += blob.size
            }
            
            results.staleDeleted++
            results.details.push(`Stale: ${blob.pathname}`)
          }
        }
      } catch (error: any) {
        console.error(`[Cleanup] Error processing ${blob.pathname}:`, error.message)
      }
    }

    console.log('[Cleanup] Complete!')
    console.log(`  - Stale deleted: ${results.staleDeleted}`)
    console.log(`  - Total freed: ${(results.totalFreedBytes / 1024).toFixed(2)} KB`)

    return NextResponse.json({
      success: true,
      dryRun,
      results,
    })

  } catch (error: any) {
    console.error('[Cleanup] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Cleanup failed' },
      { status: 500 }
    )
  }
}

// GET 方法用于检查清理状态
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { blobs } = await list({ prefix: 'analyses/' })
    
    let totalSize = 0
    let staleCount = 0
    const now = Date.now()
    const staleThreshold = 30 * 60 * 1000 // 30 minutes

    for (const blob of blobs) {
      totalSize += blob.size
      
      try {
        const response = await fetch(blob.url)
        if (response.ok) {
          const analysis = await response.json()
          if (analysis.processing === true) {
            const createdAt = new Date(analysis.created_at).getTime()
            if (now - createdAt > staleThreshold) {
              staleCount++
            }
          }
        }
      } catch {
        // Ignore errors
      }
    }

    return NextResponse.json({
      totalFiles: blobs.length,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
      staleCount,
    })

  } catch (error: any) {
    console.error('[Cleanup] Status check error:', error)
    return NextResponse.json(
      { error: error.message || 'Status check failed' },
      { status: 500 }
    )
  }
}
