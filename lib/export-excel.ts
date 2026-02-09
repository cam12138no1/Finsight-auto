import * as XLSX from 'xlsx'

export interface AnalysisData {
  company_name: string
  company_symbol: string
  report_type: string
  fiscal_year: number
  fiscal_quarter?: number
  one_line_conclusion: string
  results_vs_expectations: {
    revenue: { actual: number; consensus: number; difference: number }
    eps: { actual: number; consensus: number; difference: number }
    operating_income: { actual: number; consensus: number; difference: number }
    guidance: string
  }
  key_drivers: {
    demand: { metrics: string; changes: string; reasons: string }
    monetization: { metrics: string; changes: string; reasons: string }
    efficiency: { metrics: string; changes: string; reasons: string }
  }
  investment_roi: {
    investments: string
    direction: string
    roi_evidence: string
    management_commitment: string
  }
  sustainability_risks: {
    sustainable_drivers: string[]
    main_risks: string[]
    checkpoints: string[]
  }
  model_impact: {
    assumption_changes: string
    logic_chain: string
  }
  final_judgment: string
}

export function exportAnalysisToExcel(analysis: AnalysisData, locale: string = 'en') {
  const isZh = locale === 'zh'
  
  // Create workbook
  const wb = XLSX.utils.book_new()
  
  // Sheet 1: Executive Summary
  const summaryData = [
    [isZh ? '执行摘要' : 'Executive Summary'],
    [''],
    [isZh ? '公司' : 'Company', `${analysis.company_name} (${analysis.company_symbol})`],
    [isZh ? '报告期' : 'Period', `${analysis.fiscal_quarter ? `Q${analysis.fiscal_quarter} ` : ''}${analysis.fiscal_year}`],
    [isZh ? '报告类型' : 'Report Type', analysis.report_type],
    [''],
    [isZh ? '一句话结论' : 'One-Line Conclusion'],
    [analysis.one_line_conclusion],
    [''],
    [isZh ? '投委会结论' : 'Investment Committee Conclusion'],
    [analysis.final_judgment],
  ]
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 80 }]
  XLSX.utils.book_append_sheet(wb, summarySheet, isZh ? '执行摘要' : 'Summary')
  
  // Sheet 2: Results vs Expectations
  const resultsData = [
    [isZh ? '业绩 vs 市场预期' : 'Results vs Market Expectations'],
    [''],
    [isZh ? '指标' : 'Metric', isZh ? '实际' : 'Actual', isZh ? '共识' : 'Consensus', isZh ? '差异' : 'Difference'],
    [isZh ? '收入 (百万)' : 'Revenue (M)', 
      analysis.results_vs_expectations.revenue.actual,
      analysis.results_vs_expectations.revenue.consensus,
      analysis.results_vs_expectations.revenue.difference
    ],
    ['EPS', 
      analysis.results_vs_expectations.eps.actual,
      analysis.results_vs_expectations.eps.consensus,
      analysis.results_vs_expectations.eps.difference
    ],
    [isZh ? '营业利润 (百万)' : 'Operating Income (M)', 
      analysis.results_vs_expectations.operating_income.actual,
      analysis.results_vs_expectations.operating_income.consensus,
      analysis.results_vs_expectations.operating_income.difference
    ],
    [''],
    [isZh ? '业绩指引' : 'Guidance'],
    [analysis.results_vs_expectations.guidance],
  ]
  const resultsSheet = XLSX.utils.aoa_to_sheet(resultsData)
  resultsSheet['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }]
  XLSX.utils.book_append_sheet(wb, resultsSheet, isZh ? '业绩对比' : 'Results')
  
  // Sheet 3: Key Drivers
  const driversData = [
    [isZh ? '关键增长驱动因素' : 'Key Growth Drivers'],
    [''],
    [isZh ? 'A. 需求/量' : 'A. Demand / Volume'],
    [isZh ? '指标' : 'Metrics', analysis.key_drivers.demand.metrics],
    [isZh ? '变化' : 'Changes', analysis.key_drivers.demand.changes],
    [isZh ? '原因' : 'Reasons', analysis.key_drivers.demand.reasons],
    [''],
    [isZh ? 'B. 变现/定价' : 'B. Monetization / Pricing'],
    [isZh ? '指标' : 'Metrics', analysis.key_drivers.monetization.metrics],
    [isZh ? '变化' : 'Changes', analysis.key_drivers.monetization.changes],
    [isZh ? '原因' : 'Reasons', analysis.key_drivers.monetization.reasons],
    [''],
    [isZh ? 'C. 运营效率' : 'C. Operational Efficiency'],
    [isZh ? '指标' : 'Metrics', analysis.key_drivers.efficiency.metrics],
    [isZh ? '变化' : 'Changes', analysis.key_drivers.efficiency.changes],
    [isZh ? '原因' : 'Reasons', analysis.key_drivers.efficiency.reasons],
  ]
  const driversSheet = XLSX.utils.aoa_to_sheet(driversData)
  driversSheet['!cols'] = [{ wch: 15 }, { wch: 80 }]
  XLSX.utils.book_append_sheet(wb, driversSheet, isZh ? '驱动因素' : 'Drivers')
  
  // Sheet 4: Investment & ROI
  const roiData = [
    [isZh ? '投资与ROI分析' : 'Investment & ROI Analysis'],
    [''],
    [isZh ? '投资' : 'Investments', analysis.investment_roi.investments],
    [isZh ? '方向' : 'Direction', analysis.investment_roi.direction],
    [isZh ? 'ROI证据' : 'ROI Evidence', analysis.investment_roi.roi_evidence],
    [isZh ? '管理层承诺' : 'Management Commitment', analysis.investment_roi.management_commitment],
  ]
  const roiSheet = XLSX.utils.aoa_to_sheet(roiData)
  roiSheet['!cols'] = [{ wch: 25 }, { wch: 80 }]
  XLSX.utils.book_append_sheet(wb, roiSheet, isZh ? '投资ROI' : 'Investment ROI')
  
  // Sheet 5: Risks & Checkpoints
  const risksData = [
    [isZh ? '风险与检查点' : 'Risks & Checkpoints'],
    [''],
    [isZh ? '可持续驱动因素' : 'Sustainable Drivers'],
    ...analysis.sustainability_risks.sustainable_drivers.map((d, i) => [`${i + 1}. ${d}`]),
    [''],
    [isZh ? '主要风险' : 'Main Risks'],
    ...analysis.sustainability_risks.main_risks.map((r, i) => [`${i + 1}. ${r}`]),
    [''],
    [isZh ? '未来检查点' : 'Future Checkpoints'],
    ...analysis.sustainability_risks.checkpoints.map((c, i) => [`${i + 1}. ${c}`]),
  ]
  const risksSheet = XLSX.utils.aoa_to_sheet(risksData)
  risksSheet['!cols'] = [{ wch: 100 }]
  XLSX.utils.book_append_sheet(wb, risksSheet, isZh ? '风险检查点' : 'Risks')
  
  // Sheet 6: Model Impact
  const modelData = [
    [isZh ? '模型影响与建议' : 'Model Impact & Recommendations'],
    [''],
    [isZh ? '假设变化' : 'Assumption Changes'],
    [analysis.model_impact.assumption_changes],
    [''],
    [isZh ? '逻辑链' : 'Logic Chain'],
    [analysis.model_impact.logic_chain],
  ]
  const modelSheet = XLSX.utils.aoa_to_sheet(modelData)
  modelSheet['!cols'] = [{ wch: 100 }]
  XLSX.utils.book_append_sheet(wb, modelSheet, isZh ? '模型影响' : 'Model Impact')
  
  // Generate filename
  const filename = `${analysis.company_symbol}_${analysis.fiscal_year}${analysis.fiscal_quarter ? `Q${analysis.fiscal_quarter}` : ''}_Analysis.xlsx`
  
  // Write file and trigger download
  XLSX.writeFile(wb, filename)
}
