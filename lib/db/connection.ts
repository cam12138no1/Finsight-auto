/**
 * Unified PostgreSQL connection for Render deployment.
 * Singleton pool pattern — same as the original Finsight-auto db.ts
 */

import { Pool, QueryResult, QueryResultRow } from 'pg'

let pool: Pool | null = null

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set')
    }
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })

    pool.on('error', (err) => {
      console.error('[DB] Unexpected pool error:', err)
    })
  }
  return pool
}

export async function query<T extends QueryResultRow = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const client = await getPool().connect()
  try {
    return await client.query<T>(text, params)
  } finally {
    client.release()
  }
}

export async function transaction<T>(
  callback: (q: (text: string, params?: unknown[]) => Promise<QueryResult>) => Promise<T>
): Promise<T> {
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const result = await callback((text, params) => client.query(text, params))
    await client.query('COMMIT')
    return result
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export function isDatabaseAvailable(): boolean {
  return !!process.env.DATABASE_URL
}
