'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Download, Plus, Clock, CheckCircle, XCircle, Loader2, RefreshCw,
  FileText, Database, Search, ExternalLink, HardDrive,
  Building2, Calendar, BarChart3, Archive, AlertCircle
} from 'lucide-react'

/* ================================================================
   MASTER.md: Financial Dashboard · Data-Dense · fin-table · fin-card
   Responsive: 375 / 768 / 1024 / 1440
   ================================================================ */

interface DownloadJob {
  id: number; status: string; years: number[]; quarters: string[]
  total_files: number; completed_files: number; failed_files: number
  created_at: string; error_message: string | null; progress_percent: number
}
interface SharedFiling {
  id: number; company_id: number; year: number; quarter: string
  filename: string; file_url: string; content_type: string; file_size: number
  source: string; created_at: string
  company_name: string; company_ticker: string; category: string
}

const STATUS: Record<string, { label: string; dot: string }> = {
  pending:   { label: '排队', dot: 'bg-amber-500' },
  running:   { label: '下载中', dot: 'bg-blue-500' },
  completed: { label: '完成', dot: 'bg-emerald-500' },
  failed:    { label: '失败', dot: 'bg-rose-500' },
  cancelled: { label: '取消', dot: 'bg-slate-400' },
}

function fmtBytes(b: number) {
  if (!b) return '--'
  if (b < 1024) return b + ' B'
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'
  return (b / 1048576).toFixed(1) + ' MB'
}
function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m}分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}小时前`
  return `${Math.floor(h / 24)}天前`
}

export default function DownloadsPage() {
  const [tab, setTab] = useState<'filings' | 'jobs'>('filings')
  const [jobs, setJobs] = useState<DownloadJob[]>([])
  const [filings, setFilings] = useState<SharedFiling[]>([])
  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')

  const fetch_ = useCallback(async () => {
    try {
      const [jr, fr] = await Promise.all([
        fetch('/api/downloads'),
        fetch(`/api/filings?${new URLSearchParams(catFilter ? { category: catFilter } : {})}`),
      ])
      const jd = await jr.json(), fd = await fr.json()
      if (jd.success) setJobs(jd.data || [])
      if (fd.success) { setFilings(fd.data || []); setStats(fd.stats || {}) }
    } catch { } finally { setLoading(false) }
  }, [catFilter])

  useEffect(() => { fetch_(); const i = setInterval(fetch_, 8000); return () => clearInterval(i) }, [fetch_])

  const running = jobs.filter(j => j.status === 'running' || j.status === 'pending')
  const filtered = filings.filter(f => {
    if (!search) return true
    const q = search.toLowerCase()
    return f.company_name?.toLowerCase().includes(q) || f.company_ticker?.toLowerCase().includes(q) || f.filename?.toLowerCase().includes(q)
  })
  const totalSize = filings.reduce((a, f) => a + (f.file_size || 0), 0)

  const cancelJob = async (id: number) => {
    try { const r = await fetch(`/api/downloads/${id}`, { method: 'DELETE' }); const d = await r.json(); if (d.success) fetch_() } catch {}
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">下载中心</h1>
          <p className="text-sm text-muted-foreground mt-1">SEC EDGAR 财报自动采集 · 全用户共享数据池</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => { setLoading(true); fetch_() }}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> 刷新
          </Button>
          <Link href="/dashboard/downloads/new">
            <Button variant="cta" size="sm"><Plus className="h-3.5 w-3.5 mr-1.5" /> 新建下载</Button>
          </Link>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Database, label: '已入库', value: stats.total || 0, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30' },
          { icon: Building2, label: '公司数', value: stats.companies || 0, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
          { icon: Archive, label: '总数据量', value: fmtBytes(totalSize), color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/30' },
          { icon: BarChart3, label: '进行中', value: running.length, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30' },
        ].map(k => (
          <div key={k.label} className="fin-card p-4 sm:p-5">
            <div className={`w-8 h-8 rounded-lg ${k.bg} flex items-center justify-center mb-3`}>
              <k.icon className={`h-4 w-4 ${k.color}`} />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-foreground font-mono tabular-nums">{k.value}</p>
            <p className="data-label mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg border border-border/40">
        {(['filings', 'jobs'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer ${
              tab === t ? 'bg-card text-foreground shadow-[var(--shadow-sm)]' : 'text-muted-foreground hover:text-foreground'
            }`}>
            {t === 'filings' ? <HardDrive className="h-4 w-4" /> : <Download className="h-4 w-4" />}
            {t === 'filings' ? `财报 (${filings.length})` : `任务 (${jobs.length})`}
            {t === 'jobs' && running.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse-soft" />}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center py-20 gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      ) : tab === 'filings' ? (
        /* ============ FILINGS ============ */
        filtered.length === 0 && !search && !catFilter ? (
          <div className="fin-card border-dashed border-2 flex flex-col items-center py-16 sm:py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Database className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <h3 className="text-lg font-semibold mb-1">暂无财报数据</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">创建下载任务后，Worker 将自动从 SEC EDGAR 采集财报</p>
            <Link href="/dashboard/downloads/new"><Button variant="cta">创建第一个下载任务</Button></Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                <input type="text" placeholder="搜索公司或文件名..." value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-card text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all duration-200" />
              </div>
              <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
                className="h-9 px-3 rounded-lg border border-border bg-card text-sm cursor-pointer focus:ring-2 focus:ring-ring/20">
                <option value="">全部类别</option>
                <option value="AI_Applications">AI 应用层</option>
                <option value="AI_Supply_Chain">AI 供应链</option>
              </select>
            </div>

            {/* Table */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="fin-table">
                    <thead><tr>
                      <th>公司</th><th>报告期</th><th className="hidden sm:table-cell">文件</th><th>大小</th><th className="hidden md:table-cell">来源</th><th className="hidden lg:table-cell">时间</th><th className="text-right">操作</th>
                    </tr></thead>
                    <tbody>
                      {filtered.map(f => (
                        <tr key={f.id}>
                          <td>
                            <div className="flex items-center gap-2.5">
                              <div className={`w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                f.category === 'AI_Applications' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                              }`}>{f.company_ticker?.slice(0, 3)}</div>
                              <div className="min-w-0">
                                <p className="text-[13px] font-medium text-foreground truncate">{f.company_name}</p>
                                <p className="text-[11px] text-muted-foreground font-mono">{f.company_ticker}</p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="font-mono text-foreground text-[13px]">{f.year}</span>{' '}
                            <Badge variant={f.quarter === 'FY' ? 'profit' : 'secondary'}>{f.quarter}</Badge>
                          </td>
                          <td className="hidden sm:table-cell">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <FileText className="h-3.5 w-3.5 shrink-0 opacity-40" />
                              <span className="font-mono text-[11px] truncate max-w-[160px]">{f.filename}</span>
                            </div>
                          </td>
                          <td><span className="font-mono text-[12px] text-muted-foreground">{fmtBytes(f.file_size)}</span></td>
                          <td className="hidden md:table-cell">
                            <Badge variant="secondary">{f.source === 'sec_edgar' ? 'SEC' : 'IR'}</Badge>
                          </td>
                          <td className="hidden lg:table-cell">
                            <span className="text-[12px] text-muted-foreground">{timeAgo(f.created_at)}</span>
                          </td>
                          <td>
                            <div className="flex items-center justify-end gap-1">
                              {f.file_url && (
                                <a href={f.file_url} target="_blank" rel="noopener noreferrer"
                                  className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground/50 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors cursor-pointer"
                                  title="SEC 原文"><ExternalLink className="h-3.5 w-3.5" /></a>
                              )}
                              <a href={`/api/filings/${f.id}`}
                                className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground/50 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors cursor-pointer"
                                title="下载"><Download className="h-3.5 w-3.5" /></a>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filtered.length === 0 && (search || catFilter) && (
                  <div className="py-12 text-center text-sm text-muted-foreground">未找到匹配结果</div>
                )}
              </CardContent>
            </Card>
          </div>
        )
      ) : (
        /* ============ JOBS ============ */
        jobs.length === 0 ? (
          <div className="fin-card border-dashed border-2 flex flex-col items-center py-16 sm:py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Download className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <h3 className="text-lg font-semibold mb-1">暂无下载任务</h3>
            <p className="text-sm text-muted-foreground mb-6">创建任务后系统将自动获取 SEC EDGAR 财报</p>
            <Link href="/dashboard/downloads/new"><Button variant="cta">创建下载任务</Button></Link>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map(job => {
              const s = STATUS[job.status] || STATUS.pending
              const pct = job.progress_percent || 0
              const active = job.status === 'running' || job.status === 'pending'
              return (
                <div key={job.id} className="fin-card overflow-hidden">
                  {active && <div className="h-0.5 bg-muted"><div className="h-full bg-blue-500 transition-all duration-700" style={{ width: `${pct}%` }} /></div>}
                  <div className="p-5">
                    {/* row 1 */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                          job.status === 'running' ? 'bg-blue-50 dark:bg-blue-950/30' : job.status === 'completed' ? 'bg-emerald-50 dark:bg-emerald-950/30' : job.status === 'failed' ? 'bg-rose-50 dark:bg-rose-950/30' : 'bg-muted'
                        }`}>
                          {job.status === 'running' ? <Loader2 className="h-4 w-4 text-blue-600 animate-spin" /> : job.status === 'completed' ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : job.status === 'failed' ? <XCircle className="h-4 w-4 text-rose-600" /> : <Clock className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">任务 <span className="font-mono text-muted-foreground">#{job.id}</span></p>
                          <p className="text-[11px] text-muted-foreground">{new Date(job.created_at).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {active && <Button variant="outline" size="sm" onClick={() => cancelJob(job.id)} className="h-7 text-[11px]">取消</Button>}
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold bg-muted text-muted-foreground border border-border/50">
                          <span className={`w-1.5 h-1.5 rounded-full ${s.dot} ${active ? 'animate-pulse-soft' : ''}`} />
                          {s.label}
                        </span>
                      </div>
                    </div>
                    {/* params */}
                    <div className="flex flex-wrap gap-2 mb-3 text-[11px]">
                      <span className="inline-flex items-center gap-1 bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-md border border-border/30">
                        <Calendar className="h-3 w-3" />{job.years?.join(', ')}
                      </span>
                      <span className="inline-flex items-center gap-1 bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-md border border-border/30">
                        <BarChart3 className="h-3 w-3" />{job.quarters?.join(', ')}
                      </span>
                    </div>
                    {/* progress */}
                    <div className="flex justify-between text-[12px] mb-1.5">
                      <span className="text-muted-foreground">{job.completed_files + job.failed_files}/{job.total_files}</span>
                      <span className="font-mono font-semibold text-foreground">{pct}%</span>
                    </div>
                    <div className="progress-track"><div className={`progress-fill ${job.status === 'failed' ? 'bg-rose-500' : job.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} /></div>
                    {/* footer */}
                    <div className="flex items-center gap-5 mt-3 pt-3 border-t border-border/30 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-emerald-500" /><span className="font-mono text-emerald-600 dark:text-emerald-400">{job.completed_files}</span> 成功</span>
                      <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-rose-500" /><span className="font-mono text-rose-600 dark:text-rose-400">{job.failed_files}</span> 失败</span>
                      {job.error_message && <span className="flex items-center gap-1 text-rose-500 truncate ml-auto max-w-xs"><AlertCircle className="h-3 w-3 shrink-0" />{job.error_message}</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
