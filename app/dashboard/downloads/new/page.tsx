'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Download, CheckCircle, Info, Loader2 } from 'lucide-react'

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4', 'FY'] as const
const YEAR_RANGE = Array.from({ length: new Date().getFullYear() - 2019 }, (_, i) => 2020 + i)

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
    setSelectedCompanies(prev => {
      const rest = prev.filter(s => !symbols.includes(s))
      return [...rest, ...symbols]
    })
  }

  const totalEstimated = selectedYears.length * selectedQuarters.length * (selectedCompanies.length || COMPANIES.length)

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

  return (
    <div className="space-y-6 max-w-3xl">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-slate-500">
        <ArrowLeft className="h-4 w-4 mr-1" /> 返回
      </Button>

      <div>
        <h2 className="text-2xl font-bold">新建下载任务</h2>
        <p className="text-sm text-slate-500 mt-1">选择年份、季度和公司，系统将通过 SEC EDGAR 自动下载</p>
      </div>

      {/* Step 1: Years */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">① 选择年份</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {YEAR_RANGE.map(year => (
              <button key={year} onClick={() => toggleYear(year)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all cursor-pointer ${
                  selectedYears.includes(year)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                }`}>
                {year}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Quarters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">② 选择季度</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {QUARTERS.map(q => (
              <button key={q} onClick={() => toggleQuarter(q)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium border min-w-[80px] transition-all cursor-pointer ${
                  selectedQuarters.includes(q)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                }`}>
                {q}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step 3: Companies */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">③ 选择公司</CardTitle>
          <CardDescription>留空表示下载所有 24 家公司</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedCompanies(COMPANIES.map(c => c.symbol))}>
              全选
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSelectedCompanies([])}>
              清空
            </Button>
            <Button variant="outline" size="sm" onClick={() => selectCategory('AI_Applications')}>
              AI 应用 (10)
            </Button>
            <Button variant="outline" size="sm" onClick={() => selectCategory('AI_Supply_Chain')}>
              AI 供应链 (14)
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {COMPANIES.map(company => {
              const selected = selectedCompanies.includes(company.symbol)
              return (
                <button key={company.symbol} onClick={() => toggleCompany(company.symbol)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg text-left border transition-all cursor-pointer ${
                    selected
                      ? 'bg-blue-50 border-blue-300 text-blue-900'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-blue-200'
                  }`}>
                  <div className={`w-6 h-6 rounded text-[9px] font-bold flex items-center justify-center ${
                    company.category === 'AI_Applications' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'
                  }`}>
                    {company.symbol.slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{company.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{company.symbol}</p>
                  </div>
                  {selected && <CheckCircle className="h-3.5 w-3.5 text-blue-500 ml-auto shrink-0" />}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Summary + Submit */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
      )}

      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <span>年份: <strong>{selectedYears.join(', ') || '未选择'}</strong></span>
              <span>季度: <strong>{selectedQuarters.join(', ') || '未选择'}</strong></span>
              <span>公司: <strong>{selectedCompanies.length || '全部'} 家</strong></span>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Info className="h-3 w-3" /> 预计最多下载 {totalEstimated} 个文件
            </div>
          </div>
          <Button onClick={handleSubmit}
            disabled={selectedYears.length === 0 || selectedQuarters.length === 0 || isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
            {isSubmitting ? '创建中...' : '开始下载'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
