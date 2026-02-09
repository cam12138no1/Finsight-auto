-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'analyst',
  permissions TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  sector VARCHAR(100),
  market_cap BIGINT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create financial_reports table
CREATE TABLE IF NOT EXISTS financial_reports (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  report_type VARCHAR(20) NOT NULL,
  fiscal_year INTEGER NOT NULL,
  fiscal_quarter INTEGER,
  filing_date DATE NOT NULL,
  document_url VARCHAR(500),
  document_size BIGINT,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create financial_data table
CREATE TABLE IF NOT EXISTS financial_data (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  report_id INTEGER REFERENCES financial_reports(id) ON DELETE CASCADE,
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(20,2) NOT NULL,
  metric_unit VARCHAR(10) DEFAULT 'USD',
  period_type VARCHAR(20) NOT NULL,
  period_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create analysis_results table
CREATE TABLE IF NOT EXISTS analysis_results (
  id SERIAL PRIMARY KEY,
  report_id INTEGER REFERENCES financial_reports(id) ON DELETE CASCADE,
  analysis_type VARCHAR(50) NOT NULL,
  analysis_content JSONB NOT NULL,
  key_insights JSONB,
  risk_factors JSONB,
  model_impact JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create user_analyses table
CREATE TABLE IF NOT EXISTS user_analyses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  analysis_result_id INTEGER REFERENCES analysis_results(id) ON DELETE CASCADE,
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_companies_symbol ON companies(symbol);
CREATE INDEX IF NOT EXISTS idx_financial_reports_company_id ON financial_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_financial_reports_fiscal ON financial_reports(fiscal_year, fiscal_quarter);
CREATE INDEX IF NOT EXISTS idx_financial_data_company_id ON financial_data(company_id);
CREATE INDEX IF NOT EXISTS idx_financial_data_report_id ON financial_data(report_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_report_id ON analysis_results(report_id);
CREATE INDEX IF NOT EXISTS idx_user_analyses_user_id ON user_analyses(user_id);

-- Insert default admin user (password: admin123)
-- Note: In production, you should change this password immediately
INSERT INTO users (email, name, password_hash, role, permissions)
VALUES (
  'admin@example.com',
  'Admin User',
  '$2a$10$rKvVPHZN6p.8MQ8qJqYxReYL3YKZQl5k8F5LqXQZM9YKZqYxReYL3Y',
  'admin',
  ARRAY['read', 'write', 'delete', 'admin']
)
ON CONFLICT (email) DO NOTHING;
