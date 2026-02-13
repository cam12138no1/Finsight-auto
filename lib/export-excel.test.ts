import { describe, it, expect, vi, beforeEach } from 'vitest'
import { exportAnalysisToExcel, type AnalysisData } from './export-excel'
import * as XLSX from 'xlsx'

vi.mock('xlsx', async (importOriginal) => {
  const actual = await importOriginal<typeof XLSX>()
  return {
    ...actual,
    writeFile: vi.fn(),
  }
})

const mockAnalysisData: AnalysisData = {
  company_name: 'Apple Inc.',
  company_symbol: 'AAPL',
  report_type: '10-Q',
  fiscal_year: 2024,
  fiscal_quarter: 1,
  one_line_conclusion: 'Revenue beat, EPS in line.',
  results_vs_expectations: {
    revenue: { actual: 90000, consensus: 89500, difference: 500 },
    eps: { actual: 1.52, consensus: 1.50, difference: 0.02 },
    operating_income: { actual: 25000, consensus: 24800, difference: 200 },
    guidance: 'FY24 revenue growth 5-7%',
  },
  key_drivers: {
    demand: { metrics: 'iPhone units', changes: '+5%', reasons: 'Strong China' },
    monetization: { metrics: 'Services ARPU', changes: '+8%', reasons: 'App Store' },
    efficiency: { metrics: 'Gross margin', changes: '+1.2%', reasons: 'Mix shift' },
  },
  investment_roi: {
    investments: 'CapEx $10B',
    direction: 'Data centers',
    roi_evidence: 'ROI improving',
    management_commitment: 'Continue investing',
  },
  sustainability_risks: {
    sustainable_drivers: ['Services growth'],
    main_risks: ['China dependence'],
    checkpoints: ['Q2 Services margin'],
  },
  model_impact: {
    assumption_changes: 'Raised FY24 revenue',
    logic_chain: 'Beat -> Upgrade',
  },
  final_judgment: 'Maintain overweight.',
}

describe('lib/export-excel', () => {
  beforeEach(() => {
    vi.mocked(XLSX.writeFile).mockClear()
  })

  it('calls XLSX.writeFile with correct filename', () => {
    exportAnalysisToExcel(mockAnalysisData)

    expect(XLSX.writeFile).toHaveBeenCalledTimes(1)
    const [wb, filename] = (XLSX.writeFile as any).mock.calls[0]
    expect(filename).toContain('AAPL')
    expect(filename).toContain('2024')
    expect(filename).toContain('Q1')
    expect(filename.endsWith('.xlsx')).toBe(true)
  })

  it('creates workbook with multiple sheets', () => {
    exportAnalysisToExcel(mockAnalysisData)

    const [wb] = (XLSX.writeFile as any).mock.calls[0]
    expect(wb.SheetNames.length).toBeGreaterThanOrEqual(5)
  })

  it('uses Chinese labels when locale is zh', () => {
    exportAnalysisToExcel(mockAnalysisData, 'zh')

    const [wb] = (XLSX.writeFile as any).mock.calls[0]
    expect(wb.SheetNames.some((n: string) => n === '执行摘要')).toBe(true)
  })

  it('uses English labels when locale is en', () => {
    exportAnalysisToExcel(mockAnalysisData, 'en')

    const [wb] = (XLSX.writeFile as any).mock.calls[0]
    expect(wb.SheetNames.some((n: string) => n === 'Summary')).toBe(true)
  })
})
