-- ================================================================
-- Finsight Auto Download Module - Database Schema Extension
-- Adds SEC EDGAR auto-download capabilities to the platform
-- ================================================================

-- Extend companies table with category and SEC metadata
ALTER TABLE companies ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'AI_Applications';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ir_url VARCHAR(500);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS sec_cik VARCHAR(20) DEFAULT '';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Download jobs table (tracks batch download tasks)
CREATE TABLE IF NOT EXISTS download_jobs (
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
);

-- Download logs table (tracks individual file downloads)
CREATE TABLE IF NOT EXISTS download_logs (
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
);

-- Shared filings (财报永久存储, 所有用户共享, 按公司/年/季度去重)
CREATE TABLE IF NOT EXISTS shared_filings (
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
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_download_jobs_status ON download_jobs(status);
CREATE INDEX IF NOT EXISTS idx_download_jobs_user ON download_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_download_logs_job ON download_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_download_logs_company ON download_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_shared_filings_lookup ON shared_filings(company_id, year, quarter);
CREATE INDEX IF NOT EXISTS idx_companies_category ON companies(category);

-- Seed AI companies (24 companies)
INSERT INTO companies (symbol, name, sector, category, sec_cik, ir_url, description, is_active) VALUES
  ('MSFT', 'Microsoft', 'Technology', 'AI_Applications', '0000789019', 'https://www.microsoft.com/en-us/investor/earnings/', 'Cloud, AI, Office', true),
  ('GOOGL', 'Alphabet', 'Technology', 'AI_Applications', '0001652044', 'https://abc.xyz/investor/', 'Google, Cloud, AI', true),
  ('AMZN', 'Amazon', 'Technology', 'AI_Applications', '0001018724', 'https://ir.aboutamazon.com/quarterly-results/', 'AWS, E-commerce', true),
  ('META', 'Meta Platforms', 'Technology', 'AI_Applications', '0001326801', 'https://investor.fb.com/financials/', 'Social, Metaverse, AI', true),
  ('CRM', 'Salesforce', 'Technology', 'AI_Applications', '0001108524', 'https://investor.salesforce.com/financials/', 'CRM, Enterprise AI', true),
  ('NOW', 'ServiceNow', 'Technology', 'AI_Applications', '0001373715', 'https://investors.servicenow.com/financials/', 'Workflow, AI Agent', true),
  ('PLTR', 'Palantir', 'Technology', 'AI_Applications', '0001321655', 'https://investors.palantir.com/financials/', 'Big Data, AIP', true),
  ('AAPL', 'Apple', 'Technology', 'AI_Applications', '0000320193', 'https://investor.apple.com/investor-relations/', 'Consumer, Apple Intelligence', true),
  ('APP', 'AppLovin', 'Technology', 'AI_Applications', '0001751008', 'https://investors.applovin.com/financials/', 'AI Ad Tech', true),
  ('ADBE', 'Adobe', 'Technology', 'AI_Applications', '0000796343', 'https://www.adobe.com/investor-relations/earnings.html', 'Creative, AI, Firefly', true),
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
  is_active = EXCLUDED.is_active;
