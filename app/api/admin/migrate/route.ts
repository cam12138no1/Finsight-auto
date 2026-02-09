// app/api/admin/migrate/route.ts - 数据迁移API
// 将现有数据迁移到用户隔离结构

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { list, put, del } from '@vercel/blob'

export const runtime = 'nodejs'
export const maxDuration = 60

const DEFAULT_USER_ID = '1' // admin@example.com

export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const { dryRun = true } = body

    console.log(`[Migration] Starting (dryRun=${dryRun})...`)

    const { blobs } = await list({ prefix: 'analyses/' })
    console.log(`[Migration] Found ${blobs.length} files`)

    const results = {
      total: blobs.length,
      migrated: 0,
      skipped: 0,
      errors: 0,
      details: [] as string[],
    }

    for (const blob of blobs) {
      // 跳过已经在用户目录下的文件
      if (blob.pathname.includes('/user_')) {
        results.skipped++
        results.details.push(`Skip (already migrated): ${blob.pathname}`)
        continue
      }

      // 跳过索引文件
      if (blob.pathname.endsWith('_index.json')) {
        results.skipped++
        continue
      }

      try {
        // 读取文件
        const response = await fetch(blob.url)
        if (!response.ok) {
          results.errors++
          results.details.push(`Error reading: ${blob.pathname}`)
          continue
        }

        const analysis = await response.json()

        // 添加 user_id
        if (!analysis.user_id) {
          analysis.user_id = DEFAULT_USER_ID
        }

        // 生成新路径
        const fileName = blob.pathname.split('/').pop()
        const newPath = `analyses/user_${DEFAULT_USER_ID}/${fileName}`

        if (!dryRun) {
          // 写入新位置
          await put(newPath, JSON.stringify(analysis), {
            access: 'public',
            contentType: 'application/json',
          })

          // 删除旧文件
          await del(blob.url)
        }

        results.migrated++
        results.details.push(`${dryRun ? '[DRY RUN] ' : ''}Migrate: ${blob.pathname} -> ${newPath}`)

      } catch (error: any) {
        results.errors++
        results.details.push(`Error: ${blob.pathname} - ${error.message}`)
      }
    }

    console.log('[Migration] Complete!')
    console.log(`  - Migrated: ${results.migrated}`)
    console.log(`  - Skipped: ${results.skipped}`)
    console.log(`  - Errors: ${results.errors}`)

    return NextResponse.json({
      success: true,
      dryRun,
      results,
    })

  } catch (error: any) {
    console.error('[Migration] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Migration failed' },
      { status: 500 }
    )
  }
}

// GET 方法用于检查迁移状态
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { blobs } = await list({ prefix: 'analyses/' })

    let needsMigration = 0
    let alreadyMigrated = 0

    for (const blob of blobs) {
      if (blob.pathname.endsWith('_index.json')) continue
      
      if (blob.pathname.includes('/user_')) {
        alreadyMigrated++
      } else {
        needsMigration++
      }
    }

    return NextResponse.json({
      total: blobs.length,
      needsMigration,
      alreadyMigrated,
      migrationRequired: needsMigration > 0,
    })

  } catch (error: any) {
    console.error('[Migration] Status check error:', error)
    return NextResponse.json(
      { error: error.message || 'Status check failed' },
      { status: 500 }
    )
  }
}
