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

  // Download logs table (metadata only, no file content)
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

  // ================================================================
  // Shared filings: 财报文件永久存储，按公司/年/季度唯一，所有用户共享
  // ================================================================
  `CREATE TABLE IF NOT EXISTS shared_filings (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) NOT NULL,
    year INTEGER NOT NULL,
    quarter VARCHAR(10) NOT NULL,
    filename VARCHAR(500) NOT NULL,
    file_url VARCHAR(1000),
    content_type VARCHAR(100) DEFAULT 'text/html',
    file_size BIGINT NOT NULL,
    file_content BYTEA NOT NULL,
    source VARCHAR(50) DEFAULT 'sec_edgar',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, year, quarter)
  )`,

  // ================================================================
  // User reports: 用户上传的研报，每人独立
  // ================================================================
  `CREATE TABLE IF NOT EXISTS user_reports (
    id SERIAL PRIMARY KEY,
    uploader_name VARCHAR(100) DEFAULT 'anonymous',
    company_id INTEGER REFERENCES companies(id),
    title VARCHAR(500) NOT NULL,
    description TEXT DEFAULT '',
    year INTEGER,
    quarter VARCHAR(10),
    filename VARCHAR(500) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    file_content BYTEA NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )`,

  // ================================================================
  // AI Analysis results (AI 财报分析结果)
  // ================================================================
  `CREATE TABLE IF NOT EXISTS analysis_results (
    id SERIAL PRIMARY KEY,
    filing_id INTEGER REFERENCES shared_filings(id),
    company_id INTEGER REFERENCES companies(id),
    year INTEGER,
    quarter VARCHAR(10),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    result JSONB,
    error_message TEXT,
    model VARCHAR(100) DEFAULT 'google/gemini-3-pro-preview',
    duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )`,

  // Indexes
  `CREATE INDEX IF NOT EXISTS idx_analysis_results_filing ON analysis_results(filing_id)`,
  `CREATE INDEX IF NOT EXISTS idx_analysis_results_company ON analysis_results(company_id)`,
  `CREATE INDEX IF NOT EXISTS idx_download_jobs_status ON download_jobs(status)`,
  `CREATE INDEX IF NOT EXISTS idx_download_jobs_created_at ON download_jobs(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_download_logs_job_id ON download_logs(job_id)`,
  `CREATE INDEX IF NOT EXISTS idx_download_logs_company_id ON download_logs(company_id)`,
  `CREATE INDEX IF NOT EXISTS idx_download_logs_status ON download_logs(status)`,
  `CREATE INDEX IF NOT EXISTS idx_companies_category ON companies(category)`,
  `CREATE INDEX IF NOT EXISTS idx_companies_ticker ON companies(ticker)`,
  `CREATE INDEX IF NOT EXISTS idx_shared_filings_company ON shared_filings(company_id, year, quarter)`,
  `CREATE INDEX IF NOT EXISTS idx_user_reports_company ON user_reports(company_id)`,
  `CREATE INDEX IF NOT EXISTS idx_user_reports_created ON user_reports(created_at DESC)`,

  // Migration: drop old columns that are no longer needed
  `DO $$ BEGIN
    ALTER TABLE download_logs DROP COLUMN IF EXISTS file_path;
    ALTER TABLE download_logs DROP COLUMN IF EXISTS file_content;
  EXCEPTION WHEN undefined_column THEN NULL;
  END $$`,
];

async function migrate() {
  const client = await pool.connect();
  console.log('🔄 Running database migrations...\\n');

  try {
    await client.query('BEGIN');

    for (const sql of migrations) {
      const tableName = sql.match(/(?:CREATE TABLE IF NOT EXISTS|CREATE INDEX IF NOT EXISTS)\s+(\w+)/)?.[1] || 'migration';
      console.log(`  ✓ ${tableName}`);
      await client.query(sql);
    }

    await client.query('COMMIT');
    console.log('\\n✅ All migrations completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\\n❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.warn('⚠️  Migration deferred - database may not be configured yet:', err.message);
  console.warn('   Set DATABASE_URL and redeploy to run migrations.');
  process.exit(0); // Don't fail the build
});
