'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft, Download, CheckCircle, Info, Loader2,
  Calendar, BarChart3, Building2, Zap, AlertTriangle
} from 'lucide-react'

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4', 'FY'] as const
const YEAR_RANGE = Array.from({ length: new Date().getFullYear() - 2019 }, (_, i) => 2020 + i).reverse()

interface CompanyInfo {
  symbol: string
  name: string
  category: 'AI_Applications' | 'AI_Supply_Chain'
}

const COMPANIES: CompanyInfo[] = [
  { symbol: 'MSFT', name: 'Microsoft', category: 'AI_Applications' },
  { symbol: 'GOOGL', name: 'Alphabet', category: 'AI_Applications' },
  { symbol: 'AMZN', name: 'Amazon', category: 'AI_Applications' },
  { symbol: 'META', name: 'Meta', category: 'AI_Applications' },
  { symbol: 'CRM', name: 'Salesforce', category: 'AI_Applications' },
  { symbol: 'NOW', name: 'ServiceNow', category: 'AI_Applications' },
  { symbol: 'PLTR', name: 'Palantir', category: 'AI_Applications' },
  { symbol: 'AAPL', name: 'Apple', category: 'AI_Applications' },
  { symbol: 'APP', name: 'AppLovin', category: 'AI_Applications' },
  { symbol: 'ADBE', name: 'Adobe', category: 'AI_Applications' },
  { symbol: 'NVDA', name: 'Nvidia', category: 'AI_Supply_Chain' },
  { symbol: 'AMD', name: 'AMD', category: 'AI_Supply_Chain' },
  { symbol: 'AVGO', name: 'Broadcom', category: 'AI_Supply_Chain' },
  { symbol: 'TSM', name: 'TSMC', category: 'AI_Supply_Chain' },
  { symbol: 'SKH', name: 'SK Hynix', category: 'AI_Supply_Chain' },
  { symbol: 'MU', name: 'Micron', category: 'AI_Supply_Chain' },
  { symbol: 'SSNLF', name: 'Samsung', category: 'AI_Supply_Chain' },
  { symbol: 'INTC', name: 'Intel', category: 'AI_Supply_Chain' },
  { symbol: 'VRT', name: 'Vertiv', category: 'AI_Supply_Chain' },
  { symbol: 'ETN', name: 'Eaton', category: 'AI_Supply_Chain' },
  { symbol: 'GEV', name: 'GE Vernova', category: 'AI_Supply_Chain' },
  { symbol: 'VST', name: 'Vistra', category: 'AI_Supply_Chain' },
  { symbol: 'ASML', name: 'ASML', category: 'AI_Supply_Chain' },
  { symbol: 'SNPS', name: 'Synopsys', category: 'AI_Supply_Chain' },
]

export default function NewDownloadPage() {
  const router = useRouter()
  const [selectedYears, setSelectedYears] = useState<number[]>([new Date().getFullYear()])
  const [selectedQuarters, setSelectedQuarters] = useState<string[]>(['Q1', 'Q2', 'Q3', 'Q4'])
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const toggleYear = (year: number) => {
    setSelectedYears(prev => prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year].sort())
  }

  const toggleQuarter = (q: string) => {
    setSelectedQuarters(prev => prev.includes(q) ? prev.filter(x => x !== q) : [...prev, q])
  }

  const toggleCompany = (symbol: string) => {
    setSelectedCompanies(prev => prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol])
  }

  const selectCategory = (cat: string) => {
    const symbols = COMPANIES.filter(c => c.category === cat).map(c => c.symbol)
    const allSelected = symbols.every(s => selectedCompanies.includes(s))
    if (allSelected) {
      setSelectedCompanies(prev => prev.filter(s => !symbols.includes(s)))
    } else {
      setSelectedCompanies(prev => {
        const rest = prev.filter(s => !symbols.includes(s))
        return [...rest, ...symbols]
      })
    }
  }

  const totalEstimated = selectedYears.length * selectedQuarters.length * (selectedCompanies.length || COMPANIES.length)
  const isValid = selectedYears.length > 0 && selectedQuarters.length > 0

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/downloads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          years: selectedYears,
          quarters: selectedQuarters,
          company_symbols: selectedCompanies.length > 0 ? selectedCompanies : undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        router.push('/dashboard/downloads')
      } else {
        setError(data.error || '创建失败')
      }
    } catch (err: any) {
      setError(err.message || '网络错误')
    } finally {
      setIsSubmitting(false)
    }
  }

  const aiAppCompanies = COMPANIES.filter(c => c.category === 'AI_Applications')
  const supplyChainCompanies = COMPANIES.filter(c => c.category === 'AI_Supply_Chain')

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="text-muted-foreground hover:text-foreground -ml-2 cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4 mr-1.5" /> 返回下载中心
      </Button>

      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">新建下载任务</h2>
        <p className="text-sm text-muted-foreground mt-1">
          选择目标年份、季度和公司，系统将通过 SEC EDGAR API 自动下载财务报告
        </p>
      </div>

      {/* Step 1: Years */}
      <Card className="metric-card">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-[15px]">选择年份</CardTitle>
              <CardDescription className="text-[12px]">支持多年批量下载</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {YEAR_RANGE.map(year => (
              <button
                key={year}
                onClick={() => toggleYear(year)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-all duration-200 cursor-pointer ${
                  selectedYears.includes(year)
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/20'
                    : 'bg-card text-muted-foreground border-border hover:border-blue-300 hover:text-foreground'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Quarters */}
      <Card className="metric-card">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
              <BarChart3 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-[15px]">选择季度</CardTitle>
              <CardDescription className="text-[12px]">FY = 年度报告 (10-K)，Q1-Q3 = 季度报告 (10-Q)，Q4 = 年报/10-K覆盖</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {QUARTERS.map(q => (
              <button
                key={q}
                onClick={() => toggleQuarter(q)}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold border min-w-[80px] transition-all duration-200 cursor-pointer ${
                  selectedQuarters.includes(q)
                    ? q === 'FY'
                      ? 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/20'
                      : 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/20'
                    : 'bg-card text-muted-foreground border-border hover:border-blue-300 hover:text-foreground'
                }`}
              >
                {q}
              </button>
            ))}
          </div>
          {selectedQuarters.includes('Q4') && (
            <div className="flex items-start gap-2 mt-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200/40 dark:border-amber-800/20">
              <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[12px] text-amber-700 dark:text-amber-400 leading-relaxed">
                Q4 季度报告通常包含在年度 10-K 报告中，系统会自动查找对应的年度报告作为 Q4 数据来源。
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 3: Companies */}
      <Card className="metric-card">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-50 dark:bg-violet-950/30">
              <Building2 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <CardTitle className="text-[15px]">选择公司</CardTitle>
              <CardDescription className="text-[12px]">留空表示下载全部 {COMPANIES.length} 家公司</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Quick Select */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedCompanies(COMPANIES.map(c => c.symbol))}
              className="h-8 text-[12px] cursor-pointer"
            >
              全选
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedCompanies([])}
              className="h-8 text-[12px] cursor-pointer"
            >
              清空
            </Button>
            <div className="w-px h-8 bg-border mx-1" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectCategory('AI_Applications')}
              className={`h-8 text-[12px] cursor-pointer ${
                aiAppCompanies.every(c => selectedCompanies.includes(c.symbol))
                  ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400'
                  : ''
              }`}
            >
              AI 应用层 ({aiAppCompanies.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectCategory('AI_Supply_Chain')}
              className={`h-8 text-[12px] cursor-pointer ${
                supplyChainCompanies.every(c => selectedCompanies.includes(c.symbol))
                  ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400'
                  : ''
              }`}
            >
              AI 供应链 ({supplyChainCompanies.length})
            </Button>
          </div>

          {/* AI Applications */}
          <div>
            <p className="data-label mb-2.5">AI 应用层</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {aiAppCompanies.map(company => (
                <CompanyChip
                  key={company.symbol}
                  company={company}
                  selected={selectedCompanies.includes(company.symbol)}
                  onClick={() => toggleCompany(company.symbol)}
                />
              ))}
            </div>
          </div>

          {/* AI Supply Chain */}
          <div>
            <p className="data-label mb-2.5">AI 供应链</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {supplyChainCompanies.map(company => (
                <CompanyChip
                  key={company.symbol}
                  company={company}
                  selected={selectedCompanies.includes(company.symbol)}
                  onClick={() => toggleCompany(company.symbol)}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2.5 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/30 rounded-xl text-rose-700 dark:text-rose-400 text-sm animate-fade-in">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Summary + Submit */}
      <Card className="border-primary/20 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 dark:from-blue-950/10 dark:to-indigo-950/10">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center flex-wrap gap-x-5 gap-y-1 text-sm text-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  年份: <strong className="font-mono">{selectedYears.join(', ') || '未选择'}</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                  季度: <strong className="font-mono">{selectedQuarters.join(', ') || '未选择'}</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  公司: <strong className="font-mono">{selectedCompanies.length || '全部 ' + COMPANIES.length} 家</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <Zap className="h-3.5 w-3.5" />
                预计最多下载 <strong className="font-mono text-foreground">{totalEstimated}</strong> 个文件
                <span className="mx-1">·</span>
                SEC EDGAR API + 自动去重
              </div>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!isValid || isSubmitting}
              className="gradient-primary text-white shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 transition-all h-11 px-6 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {isSubmitting ? '创建中...' : '开始下载'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ================================================================
// Company Chip Component
// ================================================================
function CompanyChip({ company, selected, onClick }: {
  company: CompanyInfo; selected: boolean; onClick: () => void
}) {
  const isApp = company.category === 'AI_Applications'

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 p-2.5 rounded-lg text-left border transition-all duration-200 cursor-pointer ${
        selected
          ? isApp
            ? 'bg-blue-50 border-blue-300 dark:bg-blue-950/30 dark:border-blue-700'
            : 'bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:border-amber-700'
          : 'bg-card border-border hover:border-primary/30 hover:bg-muted/30'
      }`}
    >
      <div className={`w-7 h-7 rounded-lg text-[9px] font-bold flex items-center justify-center shrink-0 ${
        selected
          ? isApp
            ? 'bg-blue-600 text-white'
            : 'bg-amber-600 text-white'
          : isApp
            ? 'bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'
            : 'bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400'
      }`}>
        {company.symbol.slice(0, 2)}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-[11px] font-medium truncate ${selected ? 'text-foreground' : 'text-muted-foreground'}`}>
          {company.name}
        </p>
        <p className="text-[9px] text-muted-foreground/60 font-mono">{company.symbol}</p>
      </div>
      {selected && (
        <CheckCircle className={`h-3.5 w-3.5 shrink-0 ${
          isApp ? 'text-blue-500' : 'text-amber-500'
        }`} />
      )}
    </button>
  )
}
