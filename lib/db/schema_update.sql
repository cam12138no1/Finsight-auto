-- Add category column to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS category VARCHAR(50);

-- Add index for category queries
CREATE INDEX IF NOT EXISTS idx_companies_category ON companies(category);

-- Create comparison_analyses table
CREATE TABLE IF NOT EXISTS comparison_analyses (
  id SERIAL PRIMARY KEY,
  company_ids INTEGER[] NOT NULL,
  comparison_content TEXT NOT NULL,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comparison_created_at ON comparison_analyses(created_at DESC);

-- Create custom_questions table
CREATE TABLE IF NOT EXISTS custom_questions (
  id SERIAL PRIMARY KEY,
  report_id INTEGER REFERENCES financial_reports(id) ON DELETE CASCADE,
  questions JSONB NOT NULL,
  answers JSONB NOT NULL,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_questions_report ON custom_questions(report_id);
CREATE INDEX IF NOT EXISTS idx_custom_questions_created_at ON custom_questions(created_at DESC);

-- Update existing companies with categories
UPDATE companies SET category = 'AI_APPLICATION' 
WHERE symbol IN ('MSFT', 'GOOGL', 'GOOG', 'AMZN', 'META', 'CRM', 'NOW', 'PLTR', 'AAPL', 'APP', 'ADBE');

UPDATE companies SET category = 'AI_SUPPLY_CHAIN' 
WHERE symbol IN ('NVDA', 'AMD', 'AVGO', 'TSM', 'MU', 'INTC', 'VRT', 'ETN', 'GEV', 'VST', 'ASML', 'SNPS');

-- Create view for latest company reports
CREATE OR REPLACE VIEW latest_company_reports AS
SELECT DISTINCT ON (c.id)
  c.id as company_id,
  c.name as company_name,
  c.symbol as company_symbol,
  c.category,
  fr.id as report_id,
  fr.fiscal_year,
  fr.fiscal_quarter,
  fr.filing_date,
  fr.processed,
  ar.analysis_content
FROM companies c
LEFT JOIN financial_reports fr ON c.id = fr.company_id
LEFT JOIN analysis_results ar ON fr.id = ar.report_id
ORDER BY c.id, fr.fiscal_year DESC, fr.fiscal_quarter DESC NULLS LAST;

-- Create materialized view for category summaries
CREATE MATERIALIZED VIEW IF NOT EXISTS category_summary AS
SELECT 
  category,
  COUNT(DISTINCT c.id) as company_count,
  COUNT(fr.id) as report_count,
  COUNT(ar.id) as analyzed_count,
  MAX(fr.filing_date) as latest_filing_date
FROM companies c
LEFT JOIN financial_reports fr ON c.id = fr.company_id
LEFT JOIN analysis_results ar ON fr.id = ar.report_id
WHERE category IS NOT NULL
GROUP BY category;

CREATE UNIQUE INDEX IF NOT EXISTS idx_category_summary_category ON category_summary(category);

-- Refresh materialized view function
CREATE OR REPLACE FUNCTION refresh_category_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY category_summary;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE comparison_analyses IS 'Stores cross-company comparison analyses';
COMMENT ON TABLE custom_questions IS 'Stores user-defined questions and AI-generated answers for specific reports';
COMMENT ON COLUMN companies.category IS 'Company category: AI_APPLICATION or AI_SUPPLY_CHAIN';
COMMENT ON VIEW latest_company_reports IS 'Shows the most recent report for each company';
COMMENT ON MATERIALIZED VIEW category_summary IS 'Summary statistics by company category, refresh periodically';
