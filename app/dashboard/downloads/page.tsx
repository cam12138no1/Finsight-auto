'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Download, Plus, Clock, CheckCircle, XCircle, Loader2, RefreshCw,
  FileText, Database, Search, Filter, ExternalLink, HardDrive,
  TrendingUp, Building2, Calendar, ArrowUpRight, ChevronDown,
  BarChart3, Archive, AlertCircle
} from 'lucide-react'

// ================================================================
// Types
// ================================================================
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

const statusConfig: Record<string, { label: string; icon: any; color: string; dotClass: string }> = {
  pending:   { label: '排队中', icon: Clock,       color: 'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40', dotClass: 'bg-amber-500' },
  running:   { label: '下载中', icon: Loader2,     color: 'bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/40', dotClass: 'bg-blue-500' },
  completed: { label: '已完成', icon: CheckCircle, color: 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40', dotClass: 'bg-emerald-500' },
  failed:    { label: '失败',   icon: XCircle,     color: 'bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/40', dotClass: 'bg-rose-500' },
  cancelled: { label: '已取消', icon: XCircle,     color: 'bg-slate-50 text-slate-500 border-slate-200/60 dark:bg-slate-800/30 dark:text-slate-400 dark:border-slate-700/40', dotClass: 'bg-slate-400' },
}

function formatBytes(bytes: number): string {
  if (!bytes) return '--'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins}分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  return `${days}天前`
}

// ================================================================
// Main Page
// ================================================================
export default function DownloadsPage() {
  const [tab, setTab] = useState<'filings' | 'jobs'>('filings')
  const [jobs, setJobs] = useState<DownloadJob[]>([])
  const [filings, setFilings] = useState<SharedFiling[]>([])
  const [filingStats, setFilingStats] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('')

  const fetchData = useCallback(async () => {
    try {
      const [jobsRes, filingsRes] = await Promise.all([
        fetch('/api/downloads'),
        fetch(`/api/filings?${new URLSearchParams(filterCategory ? { category: filterCategory } : {})}`),
      ])
      const jobsData = await jobsRes.json()
      const filingsData = await filingsRes.json()
      if (jobsData.success) setJobs(jobsData.data || [])
      if (filingsData.success) {
        setFilings(filingsData.data || [])
        setFilingStats(filingsData.stats || {})
      }
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [filterCategory])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 8000)
    return () => clearInterval(interval)
  }, [fetchData])

  const runningJobs = jobs.filter(j => j.status === 'running' || j.status === 'pending')
  const filteredFilings = filings.filter(f => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return f.company_name?.toLowerCase().includes(q) ||
           f.company_ticker?.toLowerCase().includes(q) ||
           f.filename?.toLowerCase().includes(q)
  })

  const totalSize = filings.reduce((acc, f) => acc + (f.file_size || 0), 0)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">下载中心</h2>
          <p className="text-sm text-muted-foreground mt-1">
            SEC EDGAR 财报自动采集 <span className="mx-1.5 text-border">|</span> 所有用户共享数据池
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setLoading(true); fetchData() }}
            className="h-9 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Link href="/dashboard/downloads/new">
            <Button size="sm" className="h-9 gradient-primary text-white shadow-sm shadow-blue-600/20 hover:shadow-md hover:shadow-blue-600/30 transition-all cursor-pointer">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              新建下载
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPICard
          icon={Database}
          label="已入库财报"
          value={filingStats.total || 0}
          color="blue"
        />
        <KPICard
          icon={Building2}
          label="覆盖公司"
          value={filingStats.companies || 0}
          color="emerald"
        />
        <KPICard
          icon={Archive}
          label="数据总量"
          value={formatBytes(totalSize)}
          color="violet"
          isText
        />
        <KPICard
          icon={TrendingUp}
          label="进行中任务"
          value={runningJobs.length}
          color="amber"
          pulse={runningJobs.length > 0}
        />
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl border border-border/40">
        <TabButton
          active={tab === 'filings'}
          onClick={() => setTab('filings')}
          icon={HardDrive}
          label="已下载财报"
          count={filings.length}
        />
        <TabButton
          active={tab === 'jobs'}
          onClick={() => setTab('jobs')}
          icon={Download}
          label="下载任务"
          count={jobs.length}
          pulse={runningJobs.length > 0}
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-3">加载数据中...</p>
        </div>
      ) : tab === 'filings' ? (
        <FilingsView
          filings={filteredFilings}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterCategory={filterCategory}
          setFilterCategory={setFilterCategory}
        />
      ) : (
        <JobsView jobs={jobs} onRefresh={fetchData} />
      )}
    </div>
  )
}

// ================================================================
// KPI Card
// ================================================================
function KPICard({ icon: Icon, label, value, color, isText, pulse }: {
  icon: any; label: string; value: string | number; color: string; isText?: boolean; pulse?: boolean
}) {
  const colorMap: Record<string, { bg: string; icon: string; text: string }> = {
    blue:    { bg: 'bg-blue-50 dark:bg-blue-950/30', icon: 'text-blue-600 dark:text-blue-400', text: 'text-blue-900 dark:text-blue-100' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', icon: 'text-emerald-600 dark:text-emerald-400', text: 'text-emerald-900 dark:text-emerald-100' },
    violet:  { bg: 'bg-violet-50 dark:bg-violet-950/30', icon: 'text-violet-600 dark:text-violet-400', text: 'text-violet-900 dark:text-violet-100' },
    amber:   { bg: 'bg-amber-50 dark:bg-amber-950/30', icon: 'text-amber-600 dark:text-amber-400', text: 'text-amber-900 dark:text-amber-100' },
  }
  const c = colorMap[color] || colorMap.blue

  return (
    <Card className="metric-card group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2 rounded-lg ${c.bg}`}>
            <Icon className={`h-4 w-4 ${c.icon}`} />
          </div>
          {pulse && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse-soft" />}
        </div>
        <p className={`${isText ? 'text-lg' : 'text-2xl'} font-bold ${c.text} font-mono tabular-nums tracking-tight`}>
          {value}
        </p>
        <p className="data-label mt-1">{label}</p>
      </CardContent>
    </Card>
  )
}

// ================================================================
// Tab Button
// ================================================================
function TabButton({ active, onClick, icon: Icon, label, count, pulse }: {
  active: boolean; onClick: () => void; icon: any; label: string; count: number; pulse?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
        active
          ? 'bg-card text-foreground shadow-sm border border-border/40'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      <span className={`text-xs font-mono ${active ? 'text-muted-foreground' : 'text-muted-foreground/60'}`}>
        {count}
      </span>
      {pulse && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse-soft" />}
    </button>
  )
}

// ================================================================
// Filings View (已下载财报)
// ================================================================
function FilingsView({ filings, searchQuery, setSearchQuery, filterCategory, setFilterCategory }: {
  filings: SharedFiling[]; searchQuery: string; setSearchQuery: (v: string) => void
  filterCategory: string; setFilterCategory: (v: string) => void
}) {
  if (filings.length === 0 && !searchQuery && !filterCategory) {
    return (
      <Card className="border-dashed border-2 border-border/60">
        <CardContent className="flex flex-col items-center justify-center py-20">
          <div className="p-5 bg-muted/50 rounded-2xl mb-5">
            <Database className="h-10 w-10 text-muted-foreground/40" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1.5">数据库暂无财报</h3>
          <p className="text-sm text-muted-foreground mb-6 text-center max-w-md leading-relaxed">
            创建下载任务后，Worker 将自动通过 SEC EDGAR API 抓取上市公司财报并存入共享数据库
          </p>
          <Link href="/dashboard/downloads/new">
            <Button className="gradient-primary text-white shadow-sm cursor-pointer">
              <Plus className="h-4 w-4 mr-1.5" /> 创建第一个下载任务
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  // Group filings by company for better organization
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <input
            type="text"
            placeholder="搜索公司名称、Ticker、文件名..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-10 pr-3 rounded-lg border border-border bg-card text-sm
                       placeholder:text-muted-foreground/40
                       focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40
                       transition-all duration-200"
          />
        </div>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="h-9 px-3 rounded-lg border border-border bg-card text-sm cursor-pointer
                     focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
        >
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
              <thead>
                <tr>
                  <th>公司</th>
                  <th>报告期</th>
                  <th>文件</th>
                  <th>大小</th>
                  <th>来源</th>
                  <th>入库时间</th>
                  <th className="text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {filings.map(f => (
                  <tr key={f.id}>
                    {/* Company */}
                    <td>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold tracking-tight ${
                          f.category === 'AI_Applications'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                        }`}>
                          {f.company_ticker?.slice(0, 3)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-[13px] leading-tight">{f.company_name}</p>
                          <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{f.company_ticker}</p>
                        </div>
                      </div>
                    </td>

                    {/* Period */}
                    <td>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-foreground text-[13px]">{f.year}</span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          f.quarter === 'FY'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {f.quarter}
                        </span>
                      </div>
                    </td>

                    {/* Filename */}
                    <td>
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                        <span className="text-muted-foreground font-mono text-[11px] truncate max-w-[180px]">
                          {f.filename}
                        </span>
                      </div>
                    </td>

                    {/* Size */}
                    <td>
                      <span className="font-mono text-[12px] text-muted-foreground">{formatBytes(f.file_size)}</span>
                    </td>

                    {/* Source */}
                    <td>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                        f.source === 'sec_edgar'
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200/60 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800/40'
                          : 'bg-slate-50 text-slate-600 border-slate-200/60 dark:bg-slate-800/30 dark:text-slate-400 dark:border-slate-700/40'
                      }`}>
                        {f.source === 'sec_edgar' ? 'SEC EDGAR' : 'IR Page'}
                      </span>
                    </td>

                    {/* Time */}
                    <td>
                      <span className="text-[12px] text-muted-foreground">{timeAgo(f.created_at)}</span>
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        {f.file_url && (
                          <a
                            href={f.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg
                                       text-muted-foreground/60 hover:text-blue-600 hover:bg-blue-50
                                       dark:hover:text-blue-400 dark:hover:bg-blue-950/30
                                       transition-all duration-200"
                            title="查看 SEC 原始链接"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <a
                          href={`/api/filings/${f.id}`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg
                                     text-muted-foreground/60 hover:text-emerald-600 hover:bg-emerald-50
                                     dark:hover:text-emerald-400 dark:hover:bg-emerald-950/30
                                     transition-all duration-200"
                          title="下载文件"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filings.length === 0 && (searchQuery || filterCategory) && (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <Search className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">未找到匹配结果</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ================================================================
// Jobs View (下载任务)
// ================================================================
function JobsView({ jobs, onRefresh }: { jobs: DownloadJob[]; onRefresh: () => void }) {
  const handleCancel = async (jobId: number) => {
    try {
      const res = await fetch(`/api/downloads/${jobId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) onRefresh()
    } catch (err) {
      console.error('Cancel error:', err)
    }
  }

  if (jobs.length === 0) {
    return (
      <Card className="border-dashed border-2 border-border/60">
        <CardContent className="flex flex-col items-center justify-center py-20">
          <div className="p-5 bg-muted/50 rounded-2xl mb-5">
            <Download className="h-10 w-10 text-muted-foreground/40" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1.5">暂无下载任务</h3>
          <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
            创建下载任务后，系统将自动通过 SEC EDGAR API 获取上市公司财务报告
          </p>
          <Link href="/dashboard/downloads/new">
            <Button className="gradient-primary text-white shadow-sm cursor-pointer">
              <Plus className="h-4 w-4 mr-1.5" /> 创建下载任务
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3 animate-fade-in">
      {jobs.map(job => {
        const config = statusConfig[job.status] || statusConfig.pending
        const StatusIcon = config.icon
        const progress = job.progress_percent || 0
        const isActive = job.status === 'running' || job.status === 'pending'

        return (
          <Card key={job.id} className="metric-card overflow-hidden">
            <CardContent className="p-0">
              {/* Progress bar at top */}
              {isActive && (
                <div className="h-0.5 bg-muted">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-700 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}

              <div className="p-5">
                {/* Header row */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${
                      job.status === 'running' ? 'bg-blue-50 dark:bg-blue-950/30'
                      : job.status === 'completed' ? 'bg-emerald-50 dark:bg-emerald-950/30'
                      : job.status === 'failed' ? 'bg-rose-50 dark:bg-rose-950/30'
                      : 'bg-muted/50'
                    }`}>
                      <StatusIcon className={`h-4 w-4 ${
                        job.status === 'running' ? 'text-blue-600 dark:text-blue-400 animate-spin'
                        : job.status === 'completed' ? 'text-emerald-600 dark:text-emerald-400'
                        : job.status === 'failed' ? 'text-rose-600 dark:text-rose-400'
                        : 'text-muted-foreground'
                      }`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        下载任务 <span className="font-mono text-muted-foreground">#{job.id}</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {new Date(job.created_at).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancel(job.id)}
                        className="h-7 text-[11px] text-muted-foreground hover:text-rose-600 hover:border-rose-200 cursor-pointer"
                      >
                        取消
                      </Button>
                    )}
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${config.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass} ${isActive ? 'animate-pulse-soft' : ''}`} />
                      {config.label}
                    </span>
                  </div>
                </div>

                {/* Params */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="inline-flex items-center gap-1 text-[11px] bg-muted/50 text-muted-foreground px-2.5 py-1 rounded-lg border border-border/40">
                    <Calendar className="h-3 w-3" />
                    {job.years?.join(', ')}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] bg-muted/50 text-muted-foreground px-2.5 py-1 rounded-lg border border-border/40">
                    <BarChart3 className="h-3 w-3" />
                    {job.quarters?.join(', ')}
                  </span>
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[12px]">
                    <span className="text-muted-foreground">
                      {job.completed_files + job.failed_files} / {job.total_files} 文件
                    </span>
                    <span className="font-mono font-semibold text-foreground">{progress}%</span>
                  </div>
                  <div className="progress-track">
                    <div
                      className={`progress-fill ${
                        job.status === 'failed' ? 'bg-rose-400' : job.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-5 mt-4 pt-3 border-t border-border/40">
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <CheckCircle className="h-3 w-3 text-emerald-500" />
                    <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">{job.completed_files}</span>
                    成功
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <XCircle className="h-3 w-3 text-rose-500" />
                    <span className="font-mono font-medium text-rose-600 dark:text-rose-400">{job.failed_files}</span>
                    失败
                  </span>
                  {job.error_message && (
                    <span className="flex items-center gap-1 text-[11px] text-rose-500 truncate max-w-xs ml-auto" title={job.error_message}>
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {job.error_message}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
