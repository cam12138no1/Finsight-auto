'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, CheckCircle, Info, Loader2, Calendar, BarChart3, Building2, Zap, AlertTriangle } from 'lucide-react'

/* MASTER.md: buttons radius 8px, inputs radius 8px, cards radius 12px
   Spacing: --space-md 16px, --space-lg 24px
   Transitions: 200ms ease, cursor-pointer on all clickables */

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4', 'FY'] as const
const YEARS = Array.from({ length: new Date().getFullYear() - 2019 }, (_, i) => 2020 + i).reverse()

interface Co { symbol: string; name: string; category: 'AI_Applications' | 'AI_Supply_Chain' }
const COS: Co[] = [
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
  const [years, setYears] = useState<number[]>([new Date().getFullYear()])
  const [quarters, setQuarters] = useState<string[]>(['Q1', 'Q2', 'Q3', 'Q4'])
  const [selected, setSelected] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const toggle = <T,>(arr: T[], v: T, set: (a: T[]) => void) =>
    set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v])

  const selectCat = (cat: string) => {
    const syms = COS.filter(c => c.category === cat).map(c => c.symbol)
    const all = syms.every(s => selected.includes(s))
    setSelected(all ? selected.filter(s => !syms.includes(s)) : [...new Set([...selected, ...syms])])
  }

  const total = years.length * quarters.length * (selected.length || COS.length)
  const valid = years.length > 0 && quarters.length > 0

  const submit = async () => {
    setSubmitting(true); setError('')
    try {
      const r = await fetch('/api/downloads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ years, quarters, company_symbols: selected.length > 0 ? selected : undefined }),
      })
      const d = await r.json()
      if (d.success) router.push('/dashboard/downloads')
      else setError(d.error || '创建失败')
    } catch (e: any) { setError(e.message || '网络错误') }
    finally { setSubmitting(false) }
  }

  const apps = COS.filter(c => c.category === 'AI_Applications')
  const supply = COS.filter(c => c.category === 'AI_Supply_Chain')

  return (
    <div className="space-y-5 max-w-4xl animate-fade-in">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2 text-muted-foreground">
        <ArrowLeft className="h-4 w-4 mr-1.5" /> 返回
      </Button>

      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">新建下载任务</h1>
        <p className="text-sm text-muted-foreground mt-1">选择年份、季度和公司，Worker 将通过 SEC EDGAR API 自动下载</p>
      </div>

      {/* Step 1 — Years */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center shrink-0">
              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div><CardTitle className="text-[15px]">选择年份</CardTitle><CardDescription className="text-[12px]">支持多年批量下载</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {YEARS.map(y => (
              <button key={y} onClick={() => toggle(years, y, setYears)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200 cursor-pointer ${
                  years.includes(y) ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary/40'
                }`}>{y}</button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step 2 — Quarters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center shrink-0">
              <BarChart3 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div><CardTitle className="text-[15px]">选择季度</CardTitle><CardDescription className="text-[12px]">Q4 = 10-K年报覆盖 · FY = 年度报告</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {QUARTERS.map(q => (
              <button key={q} onClick={() => toggle(quarters, q, setQuarters)}
                className={`px-5 py-2 rounded-lg text-sm font-semibold border min-w-[72px] transition-all duration-200 cursor-pointer ${
                  quarters.includes(q)
                    ? q === 'FY' ? 'bg-amber-500 text-white border-amber-500' : 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-muted-foreground border-border hover:border-primary/40'
                }`}>{q}</button>
            ))}
          </div>
          {quarters.includes('Q4') && (
            <div className="flex items-start gap-2 mt-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200/40 dark:border-amber-800/20">
              <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[12px] text-amber-700 dark:text-amber-400 leading-relaxed">Q4 通常包含在 10-K 年度报告中，系统会自动回退查找。</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 3 — Companies */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center shrink-0">
              <Building2 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div><CardTitle className="text-[15px]">选择公司</CardTitle><CardDescription className="text-[12px]">留空 = 全部 {COS.length} 家</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelected(COS.map(c => c.symbol))}>全选</Button>
            <Button variant="outline" size="sm" onClick={() => setSelected([])}>清空</Button>
            <div className="w-px h-8 bg-border" />
            <Button variant="outline" size="sm" onClick={() => selectCat('AI_Applications')}
              className={apps.every(c => selected.includes(c.symbol)) ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/30' : ''}>AI 应用 ({apps.length})</Button>
            <Button variant="outline" size="sm" onClick={() => selectCat('AI_Supply_Chain')}
              className={supply.every(c => selected.includes(c.symbol)) ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30' : ''}>AI 供应链 ({supply.length})</Button>
          </div>

          {[{ label: 'AI 应用层', list: apps }, { label: 'AI 供应链', list: supply }].map(group => (
            <div key={group.label}>
              <p className="data-label mb-2">{group.label}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {group.list.map(co => {
                  const on = selected.includes(co.symbol)
                  const isApp = co.category === 'AI_Applications'
                  return (
                    <button key={co.symbol} onClick={() => toggle(selected, co.symbol, setSelected)}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all duration-200 cursor-pointer ${
                        on ? (isApp ? 'bg-blue-50 border-blue-300 dark:bg-blue-950/20' : 'bg-amber-50 border-amber-300 dark:bg-amber-950/20') : 'bg-card border-border hover:border-primary/30'
                      }`}>
                      <div className={`w-6 h-6 rounded text-[9px] font-bold flex items-center justify-center shrink-0 ${
                        on ? (isApp ? 'bg-blue-600 text-white' : 'bg-amber-600 text-white') : (isApp ? 'bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400')
                      }`}>{co.symbol.slice(0, 2)}</div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[11px] font-medium truncate ${on ? 'text-foreground' : 'text-muted-foreground'}`}>{co.name}</p>
                        <p className="text-[9px] text-muted-foreground/60 font-mono">{co.symbol}</p>
                      </div>
                      {on && <CheckCircle className={`h-3.5 w-3.5 shrink-0 ${isApp ? 'text-blue-500' : 'text-amber-500'}`} />}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/30 rounded-lg text-rose-700 dark:text-rose-400 text-sm animate-fade-in">
          <AlertTriangle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      {/* Summary */}
      <Card className="border-primary/20 bg-primary/[0.02]">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                <span>年份: <strong className="font-mono">{years.join(', ') || '—'}</strong></span>
                <span>季度: <strong className="font-mono">{quarters.join(', ') || '—'}</strong></span>
                <span>公司: <strong className="font-mono">{selected.length || '全部'}</strong></span>
              </div>
              <div className="flex items-center gap-1 text-[12px] text-muted-foreground">
                <Zap className="h-3.5 w-3.5" />
                预计 <strong className="font-mono text-foreground">{total}</strong> 个文件 · PDF优先 · 自动去重
              </div>
            </div>
            <Button variant="cta" onClick={submit} disabled={!valid || submitting} className="h-11 px-6 shrink-0">
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              {submitting ? '创建中...' : '开始下载'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
