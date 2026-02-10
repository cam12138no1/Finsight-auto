'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Search, Database, FileText, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

/* MASTER.md Modal: bg white, radius 16px, padding 32px, shadow-xl, backdrop blur 4px
   max-width 500px → we use 640px for filing list */

interface SharedFiling {
  id: number; company_id: number; year: number; quarter: string
  filename: string; file_size: number; content_type: string
  company_name: string; company_ticker: string; category: string
}

interface FilingSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (filing: SharedFiling) => void
}

function fmtBytes(b: number) {
  if (!b) return '--'
  if (b < 1024) return b + ' B'
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'
  return (b / 1048576).toFixed(1) + ' MB'
}

export default function FilingSelector({ isOpen, onClose, onSelect }: FilingSelectorProps) {
  const [filings, setFilings] = useState<SharedFiling[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (catFilter) p.set('category', catFilter)
      if (yearFilter) p.set('year', yearFilter)
      const r = await fetch(`/api/filings?${p}`)
      const d = await r.json()
      if (d.success) setFilings(d.data || [])
    } catch {} finally { setLoading(false) }
  }, [catFilter, yearFilter])

  useEffect(() => { if (isOpen) { load(); setSelectedId(null); setSubmitting(false) } }, [isOpen, load])

  if (!isOpen) return null

  const filtered = filings.filter(f => {
    if (!search) return true
    const q = search.toLowerCase()
    return f.company_name?.toLowerCase().includes(q) || f.company_ticker?.toLowerCase().includes(q)
  })

  const grouped = new Map<string, SharedFiling[]>()
  for (const f of filtered) {
    const k = f.company_ticker || 'OTHER'
    if (!grouped.has(k)) grouped.set(k, [])
    grouped.get(k)!.push(f)
  }

  const years = Array.from(new Set(filings.map(f => f.year))).sort((a, b) => b - a)

  const handleSelect = () => {
    const filing = filings.find(f => f.id === selectedId)
    if (filing) {
      setSubmitting(true)
      onSelect(filing)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Overlay — MASTER.md: bg black/50, backdrop blur 4px */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal — MASTER.md: radius 16px, shadow-xl */}
      <div className="relative w-full max-w-[640px] bg-card rounded-2xl shadow-[var(--shadow-xl)] border border-border/50 overflow-hidden max-h-[85vh] flex flex-col animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
              <Database className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">选择已下载财报</h2>
              <p className="text-[12px] text-muted-foreground">从数据库选择并直接 AI 分析</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-border bg-muted/20 flex flex-wrap items-center gap-2 shrink-0">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
            <input type="text" placeholder="搜索公司..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full h-8 pl-9 pr-3 rounded-lg border border-border bg-card text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all duration-200" />
          </div>
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
            className="h-8 px-2 rounded-lg border border-border bg-card text-[12px] cursor-pointer">
            <option value="">全部类别</option>
            <option value="AI_Applications">AI 应用</option>
            <option value="AI_Supply_Chain">AI 供应链</option>
          </select>
          <select value={yearFilter} onChange={e => setYearFilter(e.target.value)}
            className="h-8 px-2 rounded-lg border border-border bg-card text-[12px] cursor-pointer">
            <option value="">全部年份</option>
            {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
          </select>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : grouped.size === 0 ? (
            <div className="text-center py-16">
              <Database className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">暂无可选财报</p>
              <p className="text-[12px] text-muted-foreground/60 mt-1">请先到下载中心创建下载任务</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Array.from(grouped.entries()).map(([ticker, items]) => {
                const first = items[0]
                const isApp = first.category === 'AI_Applications'
                return (
                  <div key={ticker}>
                    {/* Company header */}
                    <div className="flex items-center gap-2 px-1 mb-1.5">
                      <div className={`w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold ${
                        isApp ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                      }`}>{ticker.slice(0, 2)}</div>
                      <span className="text-sm font-semibold text-foreground">{first.company_name}</span>
                      <span className="text-[11px] text-muted-foreground font-mono">{ticker}</span>
                    </div>
                    {/* Filing items */}
                    <div className="space-y-1">
                      {items.map(f => {
                        const on = selectedId === f.id
                        return (
                          <button key={f.id} onClick={() => setSelectedId(on ? null : f.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all duration-200 cursor-pointer ${
                              on ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-950/20 ring-1 ring-blue-300/50 dark:ring-blue-700/30'
                                 : 'border-border/50 bg-card hover:bg-muted/30 hover:border-border'
                            }`}>
                            <FileText className={`h-4 w-4 shrink-0 ${on ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground/40'}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground">{f.year} {f.quarter}</span>
                                <Badge variant="secondary">{f.quarter === 'FY' ? '年报' : '季报'}</Badge>
                              </div>
                              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                {f.filename} · {fmtBytes(f.file_size)}
                              </p>
                            </div>
                            {on && <CheckCircle2 className="h-5 w-5 text-blue-500 dark:text-blue-400 shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between shrink-0">
          <p className="text-[12px] text-muted-foreground">
            {selectedId ? '已选择 1 份财报' : `共 ${filings.length} 份可选`}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>取消</Button>
            <Button variant="cta" size="sm" disabled={!selectedId || submitting} onClick={handleSelect}>
              {submitting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
              {submitting ? '分析中...' : '选择并分析'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
