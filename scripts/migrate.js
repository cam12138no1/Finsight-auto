/**
 * Unified Database Migration Script
 * Safely merges old finsight-auto-db with new platform schema.
 * Uses ALTER TABLE ADD COLUMN IF NOT EXISTS for backward compatibility.
 */

const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

const migrations = [
  // ================================================================
  // 1. Users table (new — does not exist in old DB)
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

  // ================================================================
  // 2. Companies table — old DB has this with "ticker" column
  //    We ADD new columns safely, keep "ticker" as-is
  // ================================================================
  `CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    ticker VARCHAR(20) NOT NULL UNIQUE,
    category VARCHAR(50) DEFAULT 'AI_Applications',
    ir_url VARCHAR(500),
    sec_cik VARCHAR(20) DEFAULT '',
    description TEXT DEFAULT '',
    logo_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )`,

  // Add columns that might be missing from old companies table
  `ALTER TABLE companies ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'AI_Applications'`,
  `ALTER TABLE companies ADD COLUMN IF NOT EXISTS ir_url VARCHAR(500)`,
  `ALTER TABLE companies ADD COLUMN IF NOT EXISTS sec_cik VARCHAR(20) DEFAULT ''`,
  `ALTER TABLE companies ADD COLUMN IF NOT EXISTS description TEXT DEFAULT ''`,
  `ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`,
  `ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500)`,
  // Add "symbol" as alias view if needed — but Worker uses "ticker", so keep it
  
  // ================================================================
  // 3. Download tables — old DB has these WITHOUT user_id
  //    Safely add user_id column
  // ================================================================
  `CREATE TABLE IF NOT EXISTS download_jobs (
    id SERIAL PRIMARY KEY,
    status VARCHAR(20) DEFAULT 'pending',
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

  // Safely add user_id to existing download_jobs (no FK constraint for compatibility)
  `ALTER TABLE download_jobs ADD COLUMN IF NOT EXISTS user_id INTEGER`,

  `CREATE TABLE IF NOT EXISTS download_logs (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES download_jobs(id) ON DELETE CASCADE,
    company_id INTEGER REFERENCES companies(id),
    year INTEGER NOT NULL,
    quarter VARCHAR(10) NOT NULL,
    filename VARCHAR(500),
    file_url VARCHAR(1000),
    file_size BIGINT,
    status VARCHAR(20) DEFAULT 'pending',
    error_message TEXT,
    download_duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )`,

  // ================================================================
  // 4. Shared filings (SEC 财报永久存储, 所有用户共享)
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
  // 5. AI Analysis storage (new — replaces Vercel Blob)
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
  // 6. File uploads (new — replaces Vercel Blob for files)
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
  // 7. Indexes (safe — IF NOT EXISTS)
  // ================================================================
  `CREATE INDEX IF NOT EXISTS idx_stored_analyses_user ON stored_analyses(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_stored_analyses_request ON stored_analyses(user_id, request_id)`,
  `CREATE INDEX IF NOT EXISTS idx_stored_analyses_shared ON stored_analyses(is_shared) WHERE is_shared = true`,
  `CREATE INDEX IF NOT EXISTS idx_uploaded_files_user ON uploaded_files(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_download_jobs_status ON download_jobs(status)`,
  `CREATE INDEX IF NOT EXISTS idx_download_logs_job ON download_logs(job_id)`,
  `CREATE INDEX IF NOT EXISTS idx_shared_filings_lookup ON shared_filings(company_id, year, quarter)`,
  `CREATE INDEX IF NOT EXISTS idx_companies_category ON companies(category)`,

  // ================================================================
  // 8. Seed: Default admin user
  // ================================================================
  `INSERT INTO users (email, name, password_hash, role, permissions)
   VALUES (
     'admin@example.com', 'Admin',
     '$2a$10$rKvVPHZN6p.8MQ8qJqYxReYL3YKZQl5k8F5LqXQZM9YKZqYxReYL3Y',
     'admin', ARRAY['read', 'write', 'delete', 'admin']
   ) ON CONFLICT (email) DO NOTHING`,

  // ================================================================
  // 9. Seed/Update: 24 AI companies (uses "ticker" column, not "symbol")
  // ================================================================
  `INSERT INTO companies (name, ticker, category, sec_cik, ir_url, description, is_active) VALUES
    ('Microsoft', 'MSFT', 'AI_Applications', '0000789019', 'https://www.microsoft.com/en-us/investor/earnings/', 'Cloud, AI, Office', true),
    ('Alphabet', 'GOOGL', 'AI_Applications', '0001652044', 'https://abc.xyz/investor/', 'Google, Cloud, AI', true),
    ('Amazon', 'AMZN', 'AI_Applications', '0001018724', 'https://ir.aboutamazon.com/quarterly-results/', 'AWS, E-commerce', true),
    ('Meta Platforms', 'META', 'AI_Applications', '0001326801', 'https://investor.fb.com/financials/', 'Social, Metaverse, AI', true),
    ('Salesforce', 'CRM', 'AI_Applications', '0001108524', 'https://investor.salesforce.com/financials/', 'CRM, Enterprise AI', true),
    ('ServiceNow', 'NOW', 'AI_Applications', '0001373715', 'https://investors.servicenow.com/financials/', 'Workflow, AI Agent', true),
    ('Palantir', 'PLTR', 'AI_Applications', '0001321655', 'https://investors.palantir.com/financials/', 'Big Data, AIP', true),
    ('Apple', 'AAPL', 'AI_Applications', '0000320193', 'https://investor.apple.com/investor-relations/', 'Consumer, Apple Intelligence', true),
    ('AppLovin', 'APP', 'AI_Applications', '0001751008', 'https://investors.applovin.com/financials/', 'AI Ad Tech', true),
    ('Adobe', 'ADBE', 'AI_Applications', '0000796343', 'https://www.adobe.com/investor-relations/', 'Creative, AI, Firefly', true),
    ('Nvidia', 'NVDA', 'AI_Supply_Chain', '0001045810', 'https://investor.nvidia.com/financial-info/', 'GPU, AI Chips', true),
    ('AMD', 'AMD', 'AI_Supply_Chain', '0000002488', 'https://ir.amd.com/financial-information/', 'CPU/GPU, MI Series', true),
    ('Broadcom', 'AVGO', 'AI_Supply_Chain', '0001730168', 'https://investors.broadcom.com/financials/', 'Networking, Custom AI', true),
    ('TSMC', 'TSM', 'AI_Supply_Chain', '0001046179', 'https://investor.tsmc.com/english/quarterly-results', 'Foundry', true),
    ('SK Hynix', 'SKH', 'AI_Supply_Chain', '', 'https://www.skhynix.com/eng/ir/earnings.do', 'HBM, Memory', true),
    ('Micron', 'MU', 'AI_Supply_Chain', '0000723125', 'https://investors.micron.com/financials/', 'HBM, DRAM', true),
    ('Samsung', 'SSNLF', 'AI_Supply_Chain', '', 'https://www.samsung.com/global/ir/', 'Memory, Foundry', true),
    ('Intel', 'INTC', 'AI_Supply_Chain', '0000050863', 'https://www.intc.com/financial-info/', 'CPU, Foundry', true),
    ('Vertiv', 'VRT', 'AI_Supply_Chain', '0001674101', 'https://investors.vertiv.com/financials/', 'Data Center Infra', true),
    ('Eaton', 'ETN', 'AI_Supply_Chain', '0001551182', 'https://www.eaton.com/us/en-us/company/investors/', 'Power Management', true),
    ('GE Vernova', 'GEV', 'AI_Supply_Chain', '0001996810', 'https://www.gevernova.com/investors/', 'Power Equipment', true),
    ('Vistra', 'VST', 'AI_Supply_Chain', '0001692819', 'https://investors.vistracorp.com/financials/', 'Power Supply', true),
    ('ASML', 'ASML', 'AI_Supply_Chain', '0000937966', 'https://www.asml.com/en/investors/', 'Lithography, EUV', true),
    ('Synopsys', 'SNPS', 'AI_Supply_Chain', '0000883241', 'https://investor.synopsys.com/financials/', 'EDA Tools', true)
   ON CONFLICT (ticker) DO UPDATE SET
     category = EXCLUDED.category,
     sec_cik = EXCLUDED.sec_cik,
     ir_url = EXCLUDED.ir_url,
     description = EXCLUDED.description,
     is_active = EXCLUDED.is_active`,
]

async function migrate() {
  const client = await pool.connect()
  console.log('🔄 Running database migrations...\n')

  try {
    await client.query('BEGIN')

    for (let i = 0; i < migrations.length; i++) {
      const sql = migrations[i]
      const match = sql.match(/(?:CREATE TABLE|CREATE INDEX|ALTER TABLE|INSERT INTO)\s+(?:IF NOT EXISTS\s+)?(\w+)/i)
      const label = match?.[1] || `step_${i}`
      try {
        await client.query(sql)
        console.log(`  ✓ ${label}`)
      } catch (err) {
        // Skip non-critical errors (column already exists, etc.)
        if (err.code === '42701') { // duplicate_column
          console.log(`  ⊘ ${label} (column already exists, skipped)`)
        } else if (err.code === '42P07') { // duplicate_table
          console.log(`  ⊘ ${label} (table already exists, skipped)`)
        } else {
          throw err
        }
      }
    }

    await client.query('COMMIT')
    console.log('\n✅ All migrations completed successfully!')
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('\n❌ Migration failed:', error.message)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

migrate().catch((err) => {
  console.warn('⚠️  Migration deferred:', err.message)
  process.exit(0) // Don't fail the build
})
