'use client'

import { useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Download, 
  CheckCircle2,
  ArrowUpRight,
  Target,
  DollarSign,
  Users,
  Zap,
  Calendar,
  FileText,
  Loader2,
  Eye,
  BarChart3,
  Shield,
  Lightbulb
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface AnalysisViewProps {
  analysis: any
  onBack: () => void
}

export default function AnalysisView({ analysis, onBack }: AnalysisViewProps) {
  const t = useTranslations('analysis')
  const locale = useLocale()
  const reportRef = useRef<HTMLDivElement>(null)

  const [isExporting, setIsExporting] = useState(false)

  const handleExportPdf = async () => {
    if (!reportRef.current || isExporting) return
    
    setIsExporting(true)
    
    try {
      const [html2canvasModule, jspdfModule] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ])
      
      const html2canvas = html2canvasModule.default
      const { jsPDF } = jspdfModule
      
      const element = reportRef.current
      
      // 创建临时容器
      const container = document.createElement('div')
      container.style.cssText = `
        position: fixed;
        left: -9999px;
        top: 0;
        width: 800px;
        background: white;
        padding: 40px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      `
      
      container.innerHTML = buildPdfHtml(analysis)
      document.body.appendChild(container)
      
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: true,
        windowWidth: 800,
      })
      
      document.body.removeChild(container)
      
      const imgData = canvas.toDataURL('image/png', 1.0)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })
      
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pdfWidth - 20
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      let heightLeft = imgHeight
      let position = 10
      
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight)
      heightLeft -= (pdfHeight - 20)
      
      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight)
        heightLeft -= (pdfHeight - 20)
      }
      
      const filename = `${analysis.company_symbol || 'Report'}_${analysis.fiscal_year || 'FY'}${analysis.fiscal_quarter ? `Q${analysis.fiscal_quarter}` : ''}_投委会分析报告.pdf`
      pdf.save(filename)
    } catch (error) {
      console.error('PDF导出失败:', error)
      alert('PDF导出失败，请尝试使用浏览器的打印功能 (Ctrl+P / Cmd+P)')
    } finally {
      setIsExporting(false)
    }
  }

  // 构建PDF专用HTML
  const buildPdfHtml = (data: any) => {
    const styles = `
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1f2937; line-height: 1.6; font-size: 13px; }
        .header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #e5e7eb; }
        .logo { width: 48px; height: 48px; background: linear-gradient(135deg, #3b82f6, #4f46e5); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px; }
        .company-info h1 { font-size: 22px; font-weight: 700; color: #111827; }
        .company-info p { font-size: 13px; color: #6b7280; margin-top: 2px; }
        .section { margin-bottom: 20px; background: white; border-radius: 10px; border: 1px solid #e5e7eb; overflow: hidden; }
        .section-header { padding: 12px 16px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; gap: 10px; }
        .section-icon { width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 14px; }
        .section-title { font-size: 14px; font-weight: 600; color: #111827; }
        .section-content { padding: 16px; }
        .conclusion-box { background: linear-gradient(135deg, #3b82f6, #4f46e5); color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
        .conclusion-box h3 { font-size: 12px; color: rgba(255,255,255,0.8); margin-bottom: 6px; }
        .conclusion-box p { font-size: 15px; font-weight: 500; line-height: 1.5; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
        td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; }
        .text-right { text-align: right; }
        .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; }
        .badge-green { background: #dcfce7; color: #166534; }
        .badge-red { background: #fee2e2; color: #991b1b; }
        .badge-gray { background: #f3f4f6; color: #4b5563; }
        .text-green { color: #16a34a; }
        .text-red { color: #dc2626; }
        .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .card { padding: 12px; border-radius: 8px; border: 1px solid #e5e7eb; }
        .card-green { background: #f0fdf4; border-color: #bbf7d0; }
        .card-blue { background: #eff6ff; border-color: #bfdbfe; }
        .card-amber { background: #fffbeb; border-color: #fde68a; }
        .card-title { font-size: 12px; font-weight: 600; margin-bottom: 6px; }
        .card-text { font-size: 11px; color: #4b5563; line-height: 1.5; }
        .final-section { background: linear-gradient(135deg, #1e293b, #0f172a); color: white; padding: 20px; border-radius: 10px; }
        .final-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 12px; }
        .final-card { background: rgba(255,255,255,0.1); padding: 12px; border-radius: 6px; }
        .final-label { font-size: 11px; color: rgba(255,255,255,0.7); margin-bottom: 4px; }
        .final-value { font-size: 12px; }
        .list-item { display: flex; align-items: flex-start; gap: 6px; margin-bottom: 6px; font-size: 12px; }
        .list-dot { width: 5px; height: 5px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; }
        .dot-green { background: #22c55e; }
        .dot-red { background: #ef4444; }
        .dot-blue { background: #3b82f6; }
        .summary-box { background: #fef3c7; border: 1px solid #fde68a; padding: 16px; border-radius: 8px; margin-top: 16px; }
        .summary-title { font-size: 13px; font-weight: 600; color: #92400e; margin-bottom: 8px; }
        .summary-text { font-size: 12px; color: #78350f; line-height: 1.6; }
      </style>
    `
    
    // 构建结果表格
    let resultsTableHtml = ''
    if (data.results_table && data.results_table.length > 0) {
      const rows = data.results_table.map((row: any) => {
        const deltaClass = row.delta?.startsWith('-') ? 'text-red' : (row.delta?.startsWith('+') ? 'text-green' : '')
        const assessmentClass = row.assessment?.toLowerCase().includes('beat') || row.assessment?.includes('超预期') ? 'badge-green' : 
                               row.assessment?.toLowerCase().includes('miss') || row.assessment?.includes('不及') ? 'badge-red' : 'badge-gray'
        return `
          <tr>
            <td style="font-weight: 500;">${row.metric || '-'}</td>
            <td class="text-right" style="font-weight: 600;">${row.actual || '-'}</td>
            <td class="text-right" style="color: #6b7280;">${row.consensus || '-'}</td>
            <td class="text-right ${deltaClass}" style="font-weight: 600;">${row.delta || '-'}</td>
            <td><span class="badge ${assessmentClass}">${row.assessment || '-'}</span></td>
          </tr>
        `
      }).join('')
      
      resultsTableHtml = `
        <div class="section">
          <div class="section-header">
            <div class="section-icon" style="background: #dbeafe; color: #2563eb;">📊</div>
            <div class="section-title">1) 业绩与指引 vs 市场预期</div>
          </div>
          <div class="section-content">
            ${data.results_summary ? `<p style="color: #6b7280; margin-bottom: 12px; font-size: 12px;">${data.results_summary}</p>` : ''}
            <table>
              <thead>
                <tr>
                  <th>指标</th>
                  <th class="text-right">实际值</th>
                  <th class="text-right">市场预期</th>
                  <th class="text-right">差异</th>
                  <th>评估</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            ${data.results_explanation ? `
              <div style="margin-top: 12px; padding: 12px; background: #eff6ff; border-radius: 6px; border: 1px solid #bfdbfe;">
                <div style="font-weight: 600; color: #1e40af; margin-bottom: 4px; font-size: 12px;">关键解读</div>
                <div style="font-size: 11px; color: #1e3a8a;">${data.results_explanation}</div>
              </div>
            ` : ''}
          </div>
        </div>
      `
    }
    
    // 构建驱动因素
    let driversHtml = ''
    if (data.drivers) {
      driversHtml = `
        <div class="section">
          <div class="section-header">
            <div class="section-icon" style="background: #f3e8ff; color: #7c3aed;">⚡</div>
            <div class="section-title">2) 增长驱动拆解</div>
          </div>
          <div class="section-content">
            ${data.drivers_summary ? `<p style="color: #6b7280; margin-bottom: 12px; font-size: 12px;">${data.drivers_summary}</p>` : ''}
            <div class="grid-3">
              <div class="card card-green">
                <div class="card-title" style="color: #166534;">${data.drivers.demand?.title || 'A. 需求/量'}</div>
                ${data.drivers.demand?.metrics ? `<div class="card-text"><strong>指标：</strong>${data.drivers.demand.metrics}</div>` : ''}
                <div class="card-text"><strong>变化：</strong>${data.drivers.demand?.change || '-'}</div>
                <div class="card-text"><strong>幅度：</strong><span class="text-green">${data.drivers.demand?.magnitude || '-'}</span></div>
                <div class="card-text"><strong>原因：</strong>${data.drivers.demand?.reason || '-'}</div>
              </div>
              <div class="card card-blue">
                <div class="card-title" style="color: #1e40af;">${data.drivers.monetization?.title || 'B. 变现/单价'}</div>
                ${data.drivers.monetization?.metrics ? `<div class="card-text"><strong>指标：</strong>${data.drivers.monetization.metrics}</div>` : ''}
                <div class="card-text"><strong>变化：</strong>${data.drivers.monetization?.change || '-'}</div>
                <div class="card-text"><strong>幅度：</strong><span style="color: #2563eb;">${data.drivers.monetization?.magnitude || '-'}</span></div>
                <div class="card-text"><strong>原因：</strong>${data.drivers.monetization?.reason || '-'}</div>
              </div>
              <div class="card card-amber">
                <div class="card-title" style="color: #92400e;">${data.drivers.efficiency?.title || 'C. 内部效率'}</div>
                ${data.drivers.efficiency?.metrics ? `<div class="card-text"><strong>指标：</strong>${data.drivers.efficiency.metrics}</div>` : ''}
                <div class="card-text"><strong>变化：</strong>${data.drivers.efficiency?.change || '-'}</div>
                <div class="card-text"><strong>幅度：</strong><span style="color: #d97706;">${data.drivers.efficiency?.magnitude || '-'}</span></div>
                <div class="card-text"><strong>原因：</strong>${data.drivers.efficiency?.reason || '-'}</div>
              </div>
            </div>
          </div>
        </div>
      `
    }
    
    // 构建投入与ROI
    let investmentHtml = ''
    if (data.investment_roi) {
      const roiEvidence = (data.investment_roi.roi_evidence || []).map((e: string) => 
        `<div class="list-item"><div class="list-dot dot-green"></div><span>${e}</span></div>`
      ).join('')
      
      investmentHtml = `
        <div class="section">
          <div class="section-header">
            <div class="section-icon" style="background: #e0e7ff; color: #4f46e5;">💰</div>
            <div class="section-title">3) 投入与ROI分析</div>
          </div>
          <div class="section-content">
            <div class="grid-2" style="margin-bottom: 12px;">
              <div class="card"><strong>CapEx变化：</strong>${data.investment_roi.capex_change || '-'}</div>
              <div class="card"><strong>Opex变化：</strong>${data.investment_roi.opex_change || '-'}</div>
            </div>
            <div class="card" style="margin-bottom: 12px;"><strong>投入方向：</strong>${data.investment_roi.investment_direction || '-'}</div>
            ${roiEvidence ? `
              <div class="card card-green" style="margin-bottom: 12px;">
                <div class="card-title" style="color: #166534;">已体现的ROI证据</div>
                ${roiEvidence}
              </div>
            ` : ''}
            <div class="card card-amber">
              <div class="card-title" style="color: #92400e;">管理层底线框架</div>
              <div class="card-text">${data.investment_roi.management_commitment || '-'}</div>
            </div>
          </div>
        </div>
      `
    }
    
    // 构建可持续性与风险
    let risksHtml = ''
    if (data.sustainability_risks) {
      const sustainableDrivers = (data.sustainability_risks.sustainable_drivers || []).map((d: string) => 
        `<div class="list-item"><div class="list-dot dot-green"></div><span>${d}</span></div>`
      ).join('')
      const mainRisks = (data.sustainability_risks.main_risks || []).map((r: string) => 
        `<div class="list-item"><div class="list-dot dot-red"></div><span>${r}</span></div>`
      ).join('')
      // checkpoints removed - only show objective facts
      
      risksHtml = `
        <div class="section">
          <div class="section-header">
            <div class="section-icon" style="background: #fef3c7; color: #d97706;">⚠️</div>
            <div class="section-title">4) 可持续性与风险</div>
          </div>
          <div class="section-content">
            <div class="grid-2">
              <div class="card card-green">
                <div class="card-title" style="color: #166534;">可持续驱动</div>
                ${sustainableDrivers || '<span style="color: #9ca3af;">-</span>'}
              </div>
              <div class="card" style="background: #fef2f2; border-color: #fecaca;">
                <div class="card-title" style="color: #991b1b;">主要风险</div>
                ${mainRisks || '<span style="color: #9ca3af;">-</span>'}
              </div>

            </div>
          </div>
        </div>
      `
    }
    
    // 构建模型影响
    let modelImpactHtml = ''
    if (data.model_impact) {
      const upgradeFactors = (data.model_impact.upgrade_factors || []).map((f: string) => 
        `<div class="list-item"><div class="list-dot dot-green"></div><span>${f}</span></div>`
      ).join('')
      const downgradeFactors = (data.model_impact.downgrade_factors || []).map((f: string) => 
        `<div class="list-item"><div class="list-dot dot-red"></div><span>${f}</span></div>`
      ).join('')
      
      modelImpactHtml = `
        <div class="section">
          <div class="section-header">
            <div class="section-icon" style="background: #e0e7ff; color: #4f46e5;">📈</div>
            <div class="section-title">5) 模型影响（估值假设变化）</div>
          </div>
          <div class="section-content">
            <div class="grid-2" style="margin-bottom: 12px;">
              <div class="card card-green">
                <div class="card-title" style="color: #166534;">上调</div>
                ${upgradeFactors || '<span style="color: #9ca3af;">-</span>'}
              </div>
              <div class="card" style="background: #fef2f2; border-color: #fecaca;">
                <div class="card-title" style="color: #991b1b;">下调</div>
                ${downgradeFactors || '<span style="color: #9ca3af;">-</span>'}
              </div>
            </div>
            ${data.model_impact.logic_chain ? `
              <div class="card card-blue">
                <div class="card-title" style="color: #1e40af;">逻辑链</div>
                <div class="card-text">${data.model_impact.logic_chain}</div>
              </div>
            ` : ''}
          </div>
        </div>
      `
    }
    
    // 投委会判断和投委会总结已删除 - 只保留客观事实对比
    
    return `
      ${styles}
      <div class="header">
        <div class="logo">${(data.company_symbol || '??').slice(0, 2)}</div>
        <div class="company-info">
          <h1>${data.company_name || '未知公司'}</h1>
          <p>${data.company_symbol || ''} · ${data.fiscal_quarter ? `Q${data.fiscal_quarter}` : 'FY'} ${data.fiscal_year || ''} · 投委会分析报告</p>
        </div>
      </div>
      
      <div class="conclusion-box">
        <h3>📌 一句话结论</h3>
        <p>${data.one_line_conclusion || '暂无结论'}</p>
      </div>
      
      ${resultsTableHtml}
      ${driversHtml}
      ${investmentHtml}
      ${risksHtml}
      ${modelImpactHtml}
    `
  }

  const getAssessmentColor = (assessment: string) => {
    const lower = (assessment || '').toLowerCase()
    if (lower.includes('beat') || lower.includes('超预期') || lower.includes('strong')) return 'text-green-600 bg-green-50'
    if (lower.includes('miss') || lower.includes('不及') || lower.includes('shock')) return 'text-red-600 bg-red-50'
    return 'text-gray-600 bg-gray-50'
  }

  const getDeltaColor = (delta: string) => {
    if (!delta) return 'text-gray-600'
    if (delta.startsWith('-')) return 'text-red-600'
    if (delta.startsWith('+') || parseFloat(delta) > 0) return 'text-green-600'
    return 'text-gray-600'
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-white">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
              {analysis.company_symbol?.slice(0, 2) || '??'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {analysis.company_name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-gray-500">{analysis.company_symbol}</span>
                <span className="text-gray-300">•</span>
                <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                  <Calendar className="h-3.5 w-3.5" />
                  {analysis.fiscal_quarter ? `Q${analysis.fiscal_quarter}` : 'FY'} {analysis.fiscal_year}
                </span>
                <span className="text-gray-300">•</span>
                <span className="text-sm text-indigo-600 font-medium">投委会分析报告</span>
              </div>
            </div>
          </div>
        </div>
        <Button 
          onClick={handleExportPdf} 
          disabled={isExporting}
          className="bg-gradient-to-r from-blue-600 to-indigo-600"
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              导出中...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              导出PDF
            </>
          )}
        </Button>
      </div>

      {/* Report Content */}
      <div ref={reportRef} className="space-y-6">
        {/* 一句话结论 */}
        <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-blue-100 mb-2">0) 一句话结论</h3>
                <p className="text-lg font-medium leading-relaxed">
                  {analysis.one_line_conclusion || '暂无结论'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 业绩与市场预期对比 */}
        {analysis.results_table && analysis.results_table.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">1) 业绩与指引 vs 市场预期</CardTitle>
                  {analysis.results_summary && (
                    <p className="text-sm text-gray-500 mt-1">{analysis.results_summary}</p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">指标</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">实际值</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">市场预期</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">差异</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">评估</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {analysis.results_table.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4">
                          <div className="font-medium text-gray-900">{row.metric}</div>
                          {row.importance && (
                            <div className="text-xs text-gray-500 mt-1">{row.importance}</div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right font-semibold text-gray-900">{row.actual}</td>
                        <td className="px-4 py-4 text-right text-gray-500">{row.consensus}</td>
                        <td className={`px-4 py-4 text-right font-semibold ${getDeltaColor(row.delta)}`}>
                          {row.delta}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${getAssessmentColor(row.assessment)}`}>
                            {row.assessment}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {analysis.results_explanation && (
                <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <h4 className="font-medium text-blue-900 mb-1 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    关键解读
                  </h4>
                  <p className="text-sm text-blue-800">{analysis.results_explanation}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 增长驱动拆解 */}
        {analysis.drivers && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">2) 增长驱动拆解</CardTitle>
                  {analysis.drivers_summary && (
                    <p className="text-sm text-gray-500 mt-1">{analysis.drivers_summary}</p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* 需求/量 */}
                <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-4 w-4 text-green-600" />
                    <h4 className="font-semibold text-green-900">{analysis.drivers.demand?.title || 'A. 需求/量'}</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    {analysis.drivers.demand?.metrics && (
                      <p className="text-gray-700">
                        <span className="font-medium text-gray-900">指标：</span> {analysis.drivers.demand.metrics}
                      </p>
                    )}
                    <p className="text-gray-700">
                      <span className="font-medium text-gray-900">变化：</span> {analysis.drivers.demand?.change || '-'}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-medium text-gray-900">幅度：</span>
                      <span className="text-green-600 font-medium"> {analysis.drivers.demand?.magnitude || '-'}</span>
                    </p>
                    <p className="text-gray-700">
                      <span className="font-medium text-gray-900">原因：</span> {analysis.drivers.demand?.reason || '-'}
                    </p>
                  </div>
                </div>
                
                {/* 变现/单价 */}
                <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                    <h4 className="font-semibold text-blue-900">{analysis.drivers.monetization?.title || 'B. 变现/单价'}</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    {analysis.drivers.monetization?.metrics && (
                      <p className="text-gray-700">
                        <span className="font-medium text-gray-900">指标：</span> {analysis.drivers.monetization.metrics}
                      </p>
                    )}
                    <p className="text-gray-700">
                      <span className="font-medium text-gray-900">变化：</span> {analysis.drivers.monetization?.change || '-'}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-medium text-gray-900">幅度：</span>
                      <span className="text-blue-600 font-medium"> {analysis.drivers.monetization?.magnitude || '-'}</span>
                    </p>
                    <p className="text-gray-700">
                      <span className="font-medium text-gray-900">原因：</span> {analysis.drivers.monetization?.reason || '-'}
                    </p>
                  </div>
                </div>
                
                {/* 内部效率 */}
                <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="h-4 w-4 text-amber-600" />
                    <h4 className="font-semibold text-amber-900">{analysis.drivers.efficiency?.title || 'C. 内部效率'}</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    {analysis.drivers.efficiency?.metrics && (
                      <p className="text-gray-700">
                        <span className="font-medium text-gray-900">指标：</span> {analysis.drivers.efficiency.metrics}
                      </p>
                    )}
                    <p className="text-gray-700">
                      <span className="font-medium text-gray-900">变化：</span> {analysis.drivers.efficiency?.change || '-'}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-medium text-gray-900">幅度：</span>
                      <span className="text-amber-600 font-medium"> {analysis.drivers.efficiency?.magnitude || '-'}</span>
                    </p>
                    <p className="text-gray-700">
                      <span className="font-medium text-gray-900">原因：</span> {analysis.drivers.efficiency?.reason || '-'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 投入与ROI分析 */}
        {analysis.investment_roi && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-indigo-600" />
                </div>
                <CardTitle className="text-lg">3) 投入与ROI分析</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs font-medium text-gray-500 mb-1">CapEx变化</p>
                  <p className="text-gray-900">{analysis.investment_roi.capex_change || '-'}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs font-medium text-gray-500 mb-1">Opex变化</p>
                  <p className="text-gray-900">{analysis.investment_roi.opex_change || '-'}</p>
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-xl mb-4">
                <p className="text-xs font-medium text-gray-500 mb-1">投入方向</p>
                <p className="text-gray-900">{analysis.investment_roi.investment_direction || '-'}</p>
              </div>
              
              {analysis.investment_roi.roi_evidence && analysis.investment_roi.roi_evidence.length > 0 && (
                <div className="p-4 bg-green-50 rounded-xl border border-green-100 mb-4">
                  <p className="text-xs font-medium text-green-700 mb-2">已体现的ROI证据</p>
                  <ul className="space-y-1">
                    {analysis.investment_roi.roi_evidence.map((evidence: string, idx: number) => (
                      <li key={idx} className="text-sm text-green-800 flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        {evidence}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-xs font-medium text-amber-700 mb-1">管理层底线框架</p>
                <p className="text-amber-900 font-medium">{analysis.investment_roi.management_commitment || '-'}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 可持续性与风险 */}
        {analysis.sustainability_risks && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 可持续驱动 */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  可持续驱动
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.sustainability_risks.sustainable_drivers?.map((driver: string, idx: number) => (
                    <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                      {driver}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* 主要风险 */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  主要风险
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.sustainability_risks.main_risks?.map((risk: string, idx: number) => (
                    <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                      {risk}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 模型影响 */}
        {analysis.model_impact && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <ArrowUpRight className="h-5 w-5 text-purple-600" />
                </div>
                <CardTitle className="text-lg">5) 模型影响（估值假设变化）</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* 上调因素 */}
                <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                  <p className="text-xs font-medium text-green-700 mb-2 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    上调
                  </p>
                  <ul className="space-y-1">
                    {analysis.model_impact.upgrade_factors?.map((factor: string, idx: number) => (
                      <li key={idx} className="text-sm text-green-800 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* 下调因素 */}
                <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                  <p className="text-xs font-medium text-red-700 mb-2 flex items-center gap-1">
                    <TrendingDown className="h-3 w-3" />
                    下调
                  </p>
                  <ul className="space-y-1">
                    {analysis.model_impact.downgrade_factors?.map((factor: string, idx: number) => (
                      <li key={idx} className="text-sm text-red-800 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              {analysis.model_impact.logic_chain && (
                <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                  <p className="text-xs font-medium text-purple-700 mb-1">逻辑链</p>
                  <p className="text-purple-900">{analysis.model_impact.logic_chain}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 研报对比分析 (如果有) */}
        {analysis.research_comparison && (
          <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-50 to-purple-50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <CardTitle className="text-lg text-indigo-900">研报对比分析</CardTitle>
                  {analysis.research_comparison.consensus_source && (
                    <p className="text-sm text-indigo-700 mt-1">
                      预期来源: {analysis.research_comparison.consensus_source}
                    </p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {analysis.research_comparison.beat_miss_summary && (
                <div className="p-4 bg-white/70 rounded-xl mb-4">
                  <p className="text-xs font-medium text-indigo-700 mb-1">Beat/Miss 总结</p>
                  <p className="text-indigo-900 font-medium">{analysis.research_comparison.beat_miss_summary}</p>
                </div>
              )}
              
              {analysis.research_comparison.key_differences && analysis.research_comparison.key_differences.length > 0 && (
                <div className="p-4 bg-white/70 rounded-xl mb-4">
                  <p className="text-xs font-medium text-indigo-700 mb-2">关键差异点</p>
                  <ul className="space-y-1">
                    {analysis.research_comparison.key_differences.map((diff: string, idx: number) => (
                      <li key={idx} className="text-sm text-indigo-800 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-2 flex-shrink-0" />
                        {diff}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {analysis.research_comparison.analyst_blind_spots && (
                <div className="p-4 bg-indigo-100/50 rounded-xl border border-indigo-200">
                  <p className="text-xs font-medium text-indigo-700 mb-1">分析师盲点</p>
                  <p className="text-indigo-900">{analysis.research_comparison.analyst_blind_spots}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
// Force rebuild 1770200309
