'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Search, Database, FileText, Download, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

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

function formatBytes(bytes: number): string {
  if (!bytes) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

export default function FilingSelector({ isOpen, onClose, onSelect }: FilingSelectorProps) {
  const [filings, setFilings] = useState<SharedFiling[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const fetchFilings = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterCategory) params.set('category', filterCategory)
      if (filterYear) params.set('year', filterYear)
      const res = await fetch(`/api/filings?${params}`)
      const data = await res.json()
      if (data.success) setFilings(data.data || [])
    } catch (err) {
      console.error('Failed to fetch filings:', err)
    } finally {
      setLoading(false)
    }
  }, [filterCategory, filterYear])

  useEffect(() => {
    if (isOpen) fetchFilings()
  }, [isOpen, fetchFilings])

  if (!isOpen) return null

  const filtered = filings.filter(f => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return f.company_name?.toLowerCase().includes(q) ||
           f.company_ticker?.toLowerCase().includes(q) ||
           f.filename?.toLowerCase().includes(q)
  })

  // Group by company
  const grouped = new Map<string, SharedFiling[]>()
  for (const f of filtered) {
    const key = f.company_ticker || 'OTHER'
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(f)
  }

  const years = Array.from(new Set(filings.map(f => f.year))).sort((a, b) => b - a)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-card rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col border border-border/60">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-950/40 rounded-lg">
              <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">选择已下载财报</h3>
              <p className="text-xs text-muted-foreground">从数据库中选择财报进行 AI 分析</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-5 sm:px-6 py-3 border-b border-border bg-muted/20 flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <input type="text" placeholder="搜索公司..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-9 pr-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40" />
          </div>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="h-8 px-2 rounded-lg border border-border bg-card text-xs cursor-pointer">
            <option value="">全部类别</option>
            <option value="AI_Applications">AI 应用</option>
            <option value="AI_Supply_Chain">AI 供应链</option>
          </select>
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
            className="h-8 px-2 rounded-lg border border-border bg-card text-xs cursor-pointer">
            <option value="">全部年份</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* Filing List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : grouped.size === 0 ? (
            <div className="text-center py-12">
              <Database className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">暂无已下载财报</p>
              <p className="text-xs text-muted-foreground/60 mt-1">请先到下载中心创建下载任务</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Array.from(grouped.entries()).map(([ticker, companyFilings]) => {
                const first = companyFilings[0]
                const isApp = first.category === 'AI_Applications'
                return (
                  <div key={ticker} className="space-y-1">
                    <div className="flex items-center gap-2 px-1 mb-1">
                      <div className={`w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold ${
                        isApp ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                      }`}>{ticker.slice(0, 2)}</div>
                      <span className="text-sm font-semibold text-foreground">{first.company_name}</span>
                      <span className="text-xs text-muted-foreground font-mono">{ticker}</span>
                    </div>
                    {companyFilings.map(f => (
                      <button key={f.id} onClick={() => setSelectedId(f.id === selectedId ? null : f.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all duration-200 cursor-pointer ${
                          selectedId === f.id
                            ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20 ring-2 ring-blue-200/50 dark:ring-blue-800/30'
                            : 'border-border/60 bg-card hover:border-border hover:bg-muted/30'
                        }`}>
                        <FileText className={`h-4 w-4 shrink-0 ${selectedId === f.id ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground/50'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{f.year} {f.quarter}</span>
                            <Badge variant="secondary" className="text-[10px]">{f.quarter === 'FY' ? '年报' : '季报'}</Badge>
                          </div>
                          <p className="text-xs text-slate-400 truncate">{f.filename} · {formatBytes(f.file_size)}</p>
                        </div>
                        {selectedId === f.id && <CheckCircle2 className="h-5 w-5 text-blue-500 shrink-0" />}
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {selectedId ? '已选择 1 份财报' : `共 ${filings.length} 份可选`}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="cursor-pointer">取消</Button>
            <Button size="sm" disabled={!selectedId}
              className="gradient-primary text-white cursor-pointer disabled:opacity-50"
              onClick={() => {
                const filing = filings.find(f => f.id === selectedId)
                if (filing) onSelect(filing)
              }}>
              选择并分析
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
