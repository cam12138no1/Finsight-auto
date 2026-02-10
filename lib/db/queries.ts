/**
 * Database queries — uses lib/db/connection.ts (pg) instead of @vercel/postgres
 * Compatible with Render PostgreSQL deployment
 */

import { query } from './connection'

export interface Company {
  id: number
  symbol: string
  name: string
  sector?: string
  market_cap?: number
  created_at: Date
}

export interface FinancialReport {
  id: number
  company_id: number
  report_type: string
  fiscal_year: number
  fiscal_quarter?: number
  filing_date: Date
  document_url?: string
  document_size?: number
  processed: boolean
  created_at: Date
}

export interface AnalysisResultRecord {
  id: number
  report_id: number
  analysis_type: string
  analysis_content: any
  key_insights?: any
  risk_factors?: any
  model_impact?: any
  created_at: Date
}

export async function getCompanyBySymbol(symbol: string): Promise<Company | null> {
  const result = await query('SELECT * FROM companies WHERE ticker = $1', [symbol])
  return (result.rows[0] as Company) || null
}

export async function createCompany(data: {
  symbol: string; name: string; sector?: string; market_cap?: number
}): Promise<Company> {
  const result = await query(
    'INSERT INTO companies (ticker, name, category) VALUES ($1, $2, $3) RETURNING *',
    [data.symbol, data.name, data.sector || 'AI_Applications']
  )
  return result.rows[0] as Company
}

export async function createFinancialReport(data: {
  company_id: number; report_type: string; fiscal_year: number
  fiscal_quarter?: number; filing_date: Date; document_url?: string; document_size?: number
}): Promise<FinancialReport> {
  const result = await query(
    `INSERT INTO financial_reports (company_id, report_type, fiscal_year, fiscal_quarter, filing_date, document_url, document_size, processed)
     VALUES ($1, $2, $3, $4, $5, $6, $7, false) RETURNING *`,
    [data.company_id, data.report_type, data.fiscal_year, data.fiscal_quarter || null,
     data.filing_date.toISOString(), data.document_url || null, data.document_size || null]
  )
  return result.rows[0] as FinancialReport
}

export async function createAnalysisResult(data: {
  report_id: number; analysis_type: string; analysis_content: any
  key_insights?: any; risk_factors?: any; model_impact?: any
}): Promise<AnalysisResultRecord> {
  const result = await query(
    `INSERT INTO analysis_results (report_id, analysis_type, analysis_content, key_insights, risk_factors, model_impact)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [data.report_id, data.analysis_type, JSON.stringify(data.analysis_content),
     JSON.stringify(data.key_insights || null), JSON.stringify(data.risk_factors || null),
     JSON.stringify(data.model_impact || null)]
  )
  return result.rows[0] as AnalysisResultRecord
}

export async function getReportsByCompany(companyId: number): Promise<FinancialReport[]> {
  const result = await query(
    'SELECT * FROM financial_reports WHERE company_id = $1 ORDER BY fiscal_year DESC, fiscal_quarter DESC',
    [companyId]
  )
  return result.rows as FinancialReport[]
}

export async function getAnalysisByReportId(reportId: number): Promise<AnalysisResultRecord | null> {
  const result = await query(
    'SELECT * FROM analysis_results WHERE report_id = $1 ORDER BY created_at DESC LIMIT 1',
    [reportId]
  )
  return (result.rows[0] as AnalysisResultRecord) || null
}

export async function updateReportProcessed(reportId: number, processed: boolean): Promise<void> {
  await query('UPDATE financial_reports SET processed = $1 WHERE id = $2', [processed, reportId])
}

export async function getAllCompanies(): Promise<Company[]> {
  const result = await query('SELECT * FROM companies ORDER BY name ASC')
  return result.rows as Company[]
}

export async function getRecentAnalyses(limit: number = 10): Promise<any[]> {
  const result = await query(
    `SELECT ar.*, fr.report_type, fr.fiscal_year, fr.fiscal_quarter,
            c.name as company_name, c.ticker as company_symbol
     FROM analysis_results ar
     JOIN financial_reports fr ON ar.report_id = fr.id
     JOIN companies c ON fr.company_id = c.id
     ORDER BY ar.created_at DESC LIMIT $1`,
    [limit]
  )
  return result.rows
}
