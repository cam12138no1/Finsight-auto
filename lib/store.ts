// lib/store.ts - User-isolated analysis storage
// Uses Render PostgreSQL when DATABASE_URL is set, falls back to in-memory

import { AnalysisResult, ResultsTableRow, DriverDetail } from './ai/analyzer'

export interface StoredAnalysis {
  id: string
  user_id: string
  company_name: string
  company_symbol: string
  report_type: string
  fiscal_year: number
  fiscal_quarter?: number
  period?: string
  category?: string
  request_id?: string
  filing_date: string
  created_at: string
  processed: boolean
  processing?: boolean
  error?: string
  has_research_report?: boolean
  is_shared?: boolean
  one_line_conclusion?: string
  results_summary?: string
  results_table?: ResultsTableRow[]
  results_explanation?: string
  drivers_summary?: string
  drivers?: {
    demand: DriverDetail
    monetization: DriverDetail
    efficiency: DriverDetail
  }
  investment_roi?: {
    capex_change: string
    opex_change: string
    investment_direction: string
    roi_evidence: string[]
    management_commitment: string
  }
  sustainability_risks?: {
    sustainable_drivers: string[]
    main_risks: string[]
    checkpoints: string[]
  }
  model_impact?: {
    upgrade_factors: string[]
    downgrade_factors: string[]
    logic_chain: string
  }
  final_judgment?: {
    confidence: string
    concerns: string
    watch_list: string
    net_impact: string
    long_term_narrative: string
    recommendation: string
  }
  investment_committee_summary?: string
  comparison_snapshot?: {
    core_revenue: string
    core_profit: string
    guidance: string
    beat_miss: string
    core_driver_quantified: string
    main_risk_quantified: string
    recommendation: string
    position_action: string
    next_quarter_focus: string
  }
  research_comparison?: {
    consensus_source: string
    key_differences: string[]
    beat_miss_summary: string
    analyst_blind_spots: string
  }
  metadata?: {
    company_category: string
    analysis_timestamp: string
    prompt_version: string
    has_research_report?: boolean
  }
}

function isDbAvailable(): boolean {
  return !!process.env.DATABASE_URL
}

async function dbQuery(text: string, params?: unknown[]) {
  // Dynamic import to avoid issues when DATABASE_URL is not set
  const { query } = await import('./db/connection')
  return query(text, params)
}

/**
 * User-isolated analysis store.
 * PostgreSQL when DATABASE_URL is configured (Render), in-memory fallback for dev.
 */
class AnalysisStore {
  private memoryStore: Map<string, StoredAnalysis> = new Map()
  private useDb: boolean

  constructor() {
    this.useDb = isDbAvailable()
    console.log(`[Store] Initialized. Using PostgreSQL: ${this.useDb}`)
  }

  private validateAccess(analysis: StoredAnalysis, userId: string): void {
    if (analysis.user_id && analysis.user_id !== userId) {
      throw new Error('Access denied')
    }
  }

  // Serialize analysis fields to JSONB for storage
  private toJsonData(a: Partial<StoredAnalysis>): Record<string, unknown> {
    const data: Record<string, unknown> = {}
    const jsonFields = [
      'one_line_conclusion', 'results_summary', 'results_table', 'results_explanation',
      'drivers_summary', 'drivers', 'investment_roi', 'sustainability_risks',
      'model_impact', 'final_judgment', 'investment_committee_summary',
      'comparison_snapshot', 'research_comparison', 'metadata',
    ]
    for (const key of jsonFields) {
      if ((a as any)[key] !== undefined) {
        data[key] = (a as any)[key]
      }
    }
    return data
  }

  // Deserialize from DB row
  private fromRow(row: Record<string, unknown>): StoredAnalysis {
    const data = (row.analysis_data || {}) as Record<string, unknown>
    return {
      id: row.id as string,
      user_id: row.user_id as string,
      request_id: row.request_id as string,
      company_name: row.company_name as string || '',
      company_symbol: row.company_symbol as string || '',
      report_type: row.report_type as string || '',
      fiscal_year: row.fiscal_year as number || 0,
      fiscal_quarter: row.fiscal_quarter as number,
      period: row.period as string,
      category: row.category as string,
      filing_date: row.filing_date as string || '',
      processed: row.processed as boolean || false,
      processing: row.processing as boolean || false,
      error: row.error as string,
      has_research_report: row.has_research_report as boolean,
      is_shared: row.is_shared as boolean,
      created_at: (row.created_at as Date)?.toISOString() || '',
      // Spread analysis data from JSONB
      ...(data as any),
    }
  }

  async addWithRequestId(
    userId: string, requestId: string,
    analysis: Omit<StoredAnalysis, 'id' | 'user_id'>
  ): Promise<StoredAnalysis> {
    if (!userId || !requestId) throw new Error('userId and requestId required')

    const id = `req_${requestId}`
    const stored: StoredAnalysis = { id, user_id: userId, request_id: requestId, ...analysis }

    if (this.useDb) {
      const jsonData = this.toJsonData(stored)
      await dbQuery(
        `INSERT INTO stored_analyses 
         (id, user_id, request_id, company_name, company_symbol, report_type,
          fiscal_year, fiscal_quarter, period, category, filing_date,
          processed, processing, error, has_research_report, analysis_data)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (id) DO NOTHING`,
        [id, userId, requestId, stored.company_name, stored.company_symbol,
         stored.report_type, stored.fiscal_year, stored.fiscal_quarter || null,
         stored.period, stored.category, stored.filing_date,
         stored.processed || false, stored.processing || false, stored.error || null,
         stored.has_research_report || false, JSON.stringify(jsonData)]
      )
      return stored
    }

    this.memoryStore.set(`${userId}:${id}`, stored)
    return stored
  }

  async getAll(userId: string): Promise<StoredAnalysis[]> {
    if (!userId) return []

    if (this.useDb) {
      const result = await dbQuery(
        `SELECT * FROM stored_analyses WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId]
      )
      return result.rows.map((row: any) => this.fromRow(row))
    }

    return Array.from(this.memoryStore.values())
      .filter(a => a.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  async get(userId: string, id: string): Promise<StoredAnalysis | null> {
    if (this.useDb) {
      const result = await dbQuery(
        `SELECT * FROM stored_analyses WHERE id = $1 AND user_id = $2`,
        [id, userId]
      )
      return result.rows[0] ? this.fromRow(result.rows[0] as any) : null
    }
    const item = this.memoryStore.get(`${userId}:${id}`)
    return item || null
  }

  async getByRequestId(userId: string, requestId: string): Promise<StoredAnalysis | null> {
    return this.get(userId, `req_${requestId}`)
  }

  async update(userId: string, id: string, updates: Partial<StoredAnalysis>): Promise<StoredAnalysis | null> {
    if (this.useDb) {
      const jsonData = this.toJsonData(updates)
      const existingResult = await dbQuery(
        `SELECT analysis_data FROM stored_analyses WHERE id = $1 AND user_id = $2`,
        [id, userId]
      )
      const existingData = (existingResult.rows[0] as any)?.analysis_data || {}
      const mergedData = { ...existingData, ...jsonData }

      await dbQuery(
        `UPDATE stored_analyses SET
          processed = COALESCE($3, processed),
          processing = COALESCE($4, processing),
          error = $5,
          analysis_data = $6,
          updated_at = NOW()
         WHERE id = $1 AND user_id = $2`,
        [id, userId,
         updates.processed ?? null,
         updates.processing ?? null,
         updates.error ?? null,
         JSON.stringify(mergedData)]
      )
      return this.get(userId, id)
    }

    const key = `${userId}:${id}`
    const existing = this.memoryStore.get(key)
    if (!existing) return null
    const updated = { ...existing, ...updates }
    this.memoryStore.set(key, updated)
    return updated
  }

  async delete(userId: string, id: string): Promise<boolean> {
    if (this.useDb) {
      const result = await dbQuery(
        `DELETE FROM stored_analyses WHERE id = $1 AND user_id = $2`,
        [id, userId]
      )
      return (result.rowCount ?? 0) > 0
    }
    return this.memoryStore.delete(`${userId}:${id}`)
  }

  async deleteStale(userId: string, maxAgeMs: number = 600000): Promise<number> {
    if (this.useDb) {
      const result = await dbQuery(
        `DELETE FROM stored_analyses 
         WHERE user_id = $1 AND processing = true 
         AND created_at < NOW() - INTERVAL '${Math.floor(maxAgeMs / 1000)} seconds'`,
        [userId]
      )
      return result.rowCount ?? 0
    }

    let deleted = 0
    const cutoff = Date.now() - maxAgeMs
    for (const [key, val] of this.memoryStore) {
      if (val.user_id === userId && val.processing && new Date(val.created_at).getTime() < cutoff) {
        this.memoryStore.delete(key)
        deleted++
      }
    }
    return deleted
  }

  async getUserStats(userId: string): Promise<{ total: number; processing: number; completed: number; failed: number }> {
    if (this.useDb) {
      const result = await dbQuery(
        `SELECT
           COUNT(*) as total,
           COUNT(*) FILTER (WHERE processing = true) as processing,
           COUNT(*) FILTER (WHERE processed = true AND error IS NULL) as completed,
           COUNT(*) FILTER (WHERE error IS NOT NULL) as failed
         FROM stored_analyses WHERE user_id = $1`,
        [userId]
      )
      const row = result.rows[0] as any
      return {
        total: parseInt(row?.total || '0'),
        processing: parseInt(row?.processing || '0'),
        completed: parseInt(row?.completed || '0'),
        failed: parseInt(row?.failed || '0'),
      }
    }

    const all = Array.from(this.memoryStore.values()).filter(a => a.user_id === userId)
    return {
      total: all.length,
      processing: all.filter(a => a.processing).length,
      completed: all.filter(a => a.processed && !a.error).length,
      failed: all.filter(a => !!a.error).length,
    }
  }

  async clearUser(userId: string): Promise<number> {
    if (this.useDb) {
      const result = await dbQuery(
        `DELETE FROM stored_analyses WHERE user_id = $1`,
        [userId]
      )
      return result.rowCount ?? 0
    }

    let deleted = 0
    for (const [key, val] of this.memoryStore) {
      if (val.user_id === userId) {
        this.memoryStore.delete(key)
        deleted++
      }
    }
    return deleted
  }

  // Get all shared analyses (visible to all users)
  async getShared(): Promise<StoredAnalysis[]> {
    if (this.useDb) {
      const result = await dbQuery(
        `SELECT * FROM stored_analyses WHERE is_shared = true ORDER BY created_at DESC`
      )
      return result.rows.map((row: any) => this.fromRow(row))
    }
    return Array.from(this.memoryStore.values()).filter(a => a.is_shared)
  }

  // Toggle share status
  async setShared(userId: string, id: string, shared: boolean): Promise<boolean> {
    if (this.useDb) {
      const result = await dbQuery(
        `UPDATE stored_analyses SET is_shared = $3, updated_at = NOW()
         WHERE id = $1 AND user_id = $2`,
        [id, userId, shared]
      )
      return (result.rowCount ?? 0) > 0
    }
    const item = this.memoryStore.get(`${userId}:${id}`)
    if (item) { item.is_shared = shared; return true }
    return false
  }
}

export const analysisStore = new AnalysisStore()
