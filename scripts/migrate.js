/**
 * Unified Database Migration Script
 * Sets up ALL tables for the merged Finsight Auto + Private Fund Analysis platform.
 * Uses Render PostgreSQL.
 */

const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

const migrations = [
  // ================================================================
  // Core tables (from private-fund-analysis)
  // ================================================================

  `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'analyst',
    permissions TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,

  // Companies table (extended with SEC EDGAR fields)
  `CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    sector VARCHAR(100),
    market_cap BIGINT,
    category VARCHAR(50) DEFAULT 'AI_Applications',
    ir_url VARCHAR(500),
    sec_cik VARCHAR(20) DEFAULT '',
    description TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,

  // ================================================================
  // AI Analysis storage (replaces Vercel Blob for Render deployment)
  // ================================================================

  `CREATE TABLE IF NOT EXISTS stored_analyses (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    request_id VARCHAR(100),
    company_name VARCHAR(255),
    company_symbol VARCHAR(20),
    report_type VARCHAR(50),
    fiscal_year INTEGER,
    fiscal_quarter INTEGER,
    period VARCHAR(50),
    category VARCHAR(50),
    filing_date VARCHAR(100),
    processed BOOLEAN DEFAULT false,
    processing BOOLEAN DEFAULT false,
    error TEXT,
    has_research_report BOOLEAN DEFAULT false,
    analysis_data JSONB,
    is_shared BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,

  // ================================================================
  // File uploads (replaces Vercel Blob for file storage)
  // ================================================================

  `CREATE TABLE IF NOT EXISTS uploaded_files (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    request_id VARCHAR(100),
    original_name VARCHAR(500) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    file_content BYTEA NOT NULL,
    file_type VARCHAR(20) DEFAULT 'financial',
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  // ================================================================
  // Auto-download module (from Finsight-auto)
  // ================================================================

  `CREATE TABLE IF NOT EXISTS download_jobs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
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

  // Shared filings (SEC 财报永久存储, 所有用户共享)
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
  // Indexes
  // ================================================================
  `CREATE INDEX IF NOT EXISTS idx_stored_analyses_user ON stored_analyses(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_stored_analyses_request ON stored_analyses(user_id, request_id)`,
  `CREATE INDEX IF NOT EXISTS idx_stored_analyses_shared ON stored_analyses(is_shared) WHERE is_shared = true`,
  `CREATE INDEX IF NOT EXISTS idx_uploaded_files_user ON uploaded_files(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_uploaded_files_request ON uploaded_files(user_id, request_id)`,
  `CREATE INDEX IF NOT EXISTS idx_download_jobs_status ON download_jobs(status)`,
  `CREATE INDEX IF NOT EXISTS idx_download_jobs_user ON download_jobs(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_download_logs_job ON download_logs(job_id)`,
  `CREATE INDEX IF NOT EXISTS idx_shared_filings_lookup ON shared_filings(company_id, year, quarter)`,
  `CREATE INDEX IF NOT EXISTS idx_companies_category ON companies(category)`,
  `CREATE INDEX IF NOT EXISTS idx_companies_symbol ON companies(symbol)`,

  // ================================================================
  // Seed: Default admin user (password: admin123)
  // ================================================================
  `INSERT INTO users (email, name, password_hash, role, permissions)
   VALUES (
     'admin@example.com', 'Admin', 
     '$2a$10$rKvVPHZN6p.8MQ8qJqYxReYL3YKZQl5k8F5LqXQZM9YKZqYxReYL3Y',
     'admin', ARRAY['read', 'write', 'delete', 'admin']
   ) ON CONFLICT (email) DO NOTHING`,

  // ================================================================
  // Seed: 24 AI companies
  // ================================================================
  `INSERT INTO companies (symbol, name, sector, category, sec_cik, ir_url, description, is_active) VALUES
    ('MSFT', 'Microsoft', 'Technology', 'AI_Applications', '0000789019', 'https://www.microsoft.com/en-us/investor/earnings/', 'Cloud, AI, Office', true),
    ('GOOGL', 'Alphabet', 'Technology', 'AI_Applications', '0001652044', 'https://abc.xyz/investor/', 'Google, Cloud, AI', true),
    ('AMZN', 'Amazon', 'Technology', 'AI_Applications', '0001018724', 'https://ir.aboutamazon.com/quarterly-results/', 'AWS, E-commerce', true),
    ('META', 'Meta Platforms', 'Technology', 'AI_Applications', '0001326801', 'https://investor.fb.com/financials/', 'Social, Metaverse, AI', true),
    ('CRM', 'Salesforce', 'Technology', 'AI_Applications', '0001108524', 'https://investor.salesforce.com/financials/', 'CRM, Enterprise AI', true),
    ('NOW', 'ServiceNow', 'Technology', 'AI_Applications', '0001373715', 'https://investors.servicenow.com/financials/', 'Workflow, AI Agent', true),
    ('PLTR', 'Palantir', 'Technology', 'AI_Applications', '0001321655', 'https://investors.palantir.com/financials/', 'Big Data, AIP', true),
    ('AAPL', 'Apple', 'Technology', 'AI_Applications', '0000320193', 'https://investor.apple.com/investor-relations/', 'Consumer, Apple Intelligence', true),
    ('APP', 'AppLovin', 'Technology', 'AI_Applications', '0001751008', 'https://investors.applovin.com/financials/', 'AI Ad Tech', true),
    ('ADBE', 'Adobe', 'Technology', 'AI_Applications', '0000796343', 'https://www.adobe.com/investor-relations/', 'Creative, AI, Firefly', true),
    ('NVDA', 'Nvidia', 'Technology', 'AI_Supply_Chain', '0001045810', 'https://investor.nvidia.com/financial-info/', 'GPU, AI Chips', true),
    ('AMD', 'AMD', 'Technology', 'AI_Supply_Chain', '0000002488', 'https://ir.amd.com/financial-information/', 'CPU/GPU, MI Series', true),
    ('AVGO', 'Broadcom', 'Technology', 'AI_Supply_Chain', '0001730168', 'https://investors.broadcom.com/financials/', 'Networking, Custom AI', true),
    ('TSM', 'TSMC', 'Technology', 'AI_Supply_Chain', '0001046179', 'https://investor.tsmc.com/english/quarterly-results', 'Foundry', true),
    ('SKH', 'SK Hynix', 'Technology', 'AI_Supply_Chain', '', 'https://www.skhynix.com/eng/ir/earnings.do', 'HBM, Memory', true),
    ('MU', 'Micron', 'Technology', 'AI_Supply_Chain', '0000723125', 'https://investors.micron.com/financials/', 'HBM, DRAM', true),
    ('SSNLF', 'Samsung', 'Technology', 'AI_Supply_Chain', '', 'https://www.samsung.com/global/ir/', 'Memory, Foundry', true),
    ('INTC', 'Intel', 'Technology', 'AI_Supply_Chain', '0000050863', 'https://www.intc.com/financial-info/', 'CPU, Foundry', true),
    ('VRT', 'Vertiv', 'Technology', 'AI_Supply_Chain', '0001674101', 'https://investors.vertiv.com/financials/', 'Data Center Infra', true),
    ('ETN', 'Eaton', 'Industrials', 'AI_Supply_Chain', '0001551182', 'https://www.eaton.com/us/en-us/company/investors/', 'Power Management', true),
    ('GEV', 'GE Vernova', 'Industrials', 'AI_Supply_Chain', '0001996810', 'https://www.gevernova.com/investors/', 'Power Equipment', true),
    ('VST', 'Vistra', 'Utilities', 'AI_Supply_Chain', '0001692819', 'https://investors.vistracorp.com/financials/', 'Power Supply', true),
    ('ASML', 'ASML', 'Technology', 'AI_Supply_Chain', '0000937966', 'https://www.asml.com/en/investors/', 'Lithography, EUV', true),
    ('SNPS', 'Synopsys', 'Technology', 'AI_Supply_Chain', '0000883241', 'https://investor.synopsys.com/financials/', 'EDA Tools', true)
   ON CONFLICT (symbol) DO UPDATE SET
     category = EXCLUDED.category,
     sec_cik = EXCLUDED.sec_cik,
     ir_url = EXCLUDED.ir_url,
     description = EXCLUDED.description,
     is_active = EXCLUDED.is_active`,
]

async function migrate() {
  const client = await pool.connect()
  console.log('🔄 Running database migrations...\\n')

  try {
    await client.query('BEGIN')

    for (const sql of migrations) {
      const match = sql.match(/(?:CREATE TABLE IF NOT EXISTS|CREATE INDEX IF NOT EXISTS|INSERT INTO)\s+(\w+)/)
      const label = match?.[1] || 'migration'
      console.log(`  ✓ ${label}`)
      await client.query(sql)
    }

    await client.query('COMMIT')
    console.log('\\n✅ All migrations completed successfully!')
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('\\n❌ Migration failed:', error.message)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

migrate().catch((err) => {
  console.warn('⚠️  Migration deferred:', err.message)
  process.exit(0)
})
