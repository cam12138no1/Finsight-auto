// scripts/migrate-data.ts - 数据迁移脚本
// 将现有数据迁移到新的用户隔离结构

import { list, put, del } from '@vercel/blob'

/**
 * 将现有数据迁移到新的用户隔离结构
 * 所有现有数据归属到 user_1 (admin@example.com)
 */
async function migrateData() {
  console.log('[Migration] Starting data migration...')
  console.log('[Migration] All existing data will be assigned to user_1 (admin@example.com)')

  const defaultUserId = '1' // admin account
  
  try {
    const { blobs } = await list({ prefix: 'analyses/' })
    console.log(`[Migration] Found ${blobs.length} files in analyses/`)

    let migratedCount = 0
    let skippedCount = 0
    let errorCount = 0

    for (const blob of blobs) {
      // Skip files already in user directories
      if (blob.pathname.includes('/user_')) {
        console.log(`[Migration] Skip (already migrated): ${blob.pathname}`)
        skippedCount++
        continue
      }

      // Skip index files
      if (blob.pathname.endsWith('_index.json')) {
        console.log(`[Migration] Skip (index file): ${blob.pathname}`)
        skippedCount++
        continue
      }

      try {
        // Read file
        console.log(`[Migration] Reading: ${blob.pathname}`)
        const response = await fetch(blob.url)
        if (!response.ok) {
          console.warn(`[Migration] Cannot read: ${blob.pathname} (${response.status})`)
          errorCount++
          continue
        }

        const analysis = await response.json()

        // Add user_id if not present
        if (!analysis.user_id) {
          analysis.user_id = defaultUserId
        }

        // Generate new path
        const fileName = blob.pathname.split('/').pop()
        const newPath = `analyses/user_${defaultUserId}/${fileName}`

        // Write to new location
        console.log(`[Migration] Writing to: ${newPath}`)
        await put(newPath, JSON.stringify(analysis), {
          access: 'public',
          contentType: 'application/json',
        })

        // Delete old file
        console.log(`[Migration] Deleting old: ${blob.pathname}`)
        await del(blob.url)

        migratedCount++
        console.log(`[Migration] ✓ ${blob.pathname} -> ${newPath}`)
      } catch (error: any) {
        console.error(`[Migration] ✗ Failed: ${blob.pathname}`, error.message)
        errorCount++
      }
    }

    console.log('\n' + '='.repeat(50))
    console.log('[Migration] Complete!')
    console.log(`  - Migrated: ${migratedCount} files`)
    console.log(`  - Skipped: ${skippedCount} files`)
    console.log(`  - Errors: ${errorCount} files`)
    console.log('='.repeat(50))

  } catch (error: any) {
    console.error('[Migration] Fatal error:', error.message)
    process.exit(1)
  }
}

// Run migration
migrateData().catch(console.error)
