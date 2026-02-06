/**
 * Database Migration Script
 * Creates all required tables for Finsight Auto
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const migrations = [
  // Companies table
  `CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    ticker VARCHAR(20) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL CHECK (category IN ('AI_Applications', 'AI_Supply_Chain')),
    ir_url VARCHAR(500),
    sec_cik VARCHAR(20) DEFAULT '',
    description TEXT DEFAULT '',
    logo_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )`,

  // Download jobs table
  `CREATE TABLE IF NOT EXISTS download_jobs (
    id SERIAL PRIMARY KEY,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    years INTEGER[] NOT NULL,
    quarters VARCHAR(10)[] NOT NULL,
    company_ids INTEGER[],
    category_filter VARCHAR(50),
    total_files INTEGER DEFAULT 0,
    completed_files INTEGER DEFAULT 0,
    failed_files INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    error_message TEXT
  )`,

  // Download logs table
  `CREATE TABLE IF NOT EXISTS download_logs (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES download_jobs(id) ON DELETE CASCADE,
    company_id INTEGER REFERENCES companies(id),
    year INTEGER NOT NULL,
    quarter VARCHAR(10) NOT NULL,
    filename VARCHAR(500),
    file_url VARCHAR(1000),
    file_size BIGINT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'downloading', 'success', 'failed', 'skipped')),
    error_message TEXT,
    download_duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )`,

  // Indexes
  `CREATE INDEX IF NOT EXISTS idx_download_jobs_status ON download_jobs(status)`,
  `CREATE INDEX IF NOT EXISTS idx_download_jobs_created_at ON download_jobs(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_download_logs_job_id ON download_logs(job_id)`,
  `CREATE INDEX IF NOT EXISTS idx_download_logs_company_id ON download_logs(company_id)`,
  `CREATE INDEX IF NOT EXISTS idx_download_logs_status ON download_logs(status)`,
  `CREATE INDEX IF NOT EXISTS idx_companies_category ON companies(category)`,
  `CREATE INDEX IF NOT EXISTS idx_companies_ticker ON companies(ticker)`,
];

async function migrate() {
  const client = await pool.connect();
  console.log('🔄 Running database migrations...\n');

  try {
    await client.query('BEGIN');

    for (const sql of migrations) {
      const tableName = sql.match(/(?:CREATE TABLE IF NOT EXISTS|CREATE INDEX IF NOT EXISTS)\s+(\w+)/)?.[1] || 'index';
      console.log(`  ✓ ${tableName}`);
      await client.query(sql);
    }

    await client.query('COMMIT');
    console.log('\n✅ All migrations completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
