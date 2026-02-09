'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Download, Plus, Clock, CheckCircle, XCircle, Loader2, RefreshCw,
  FileText, Database, Search, Filter, ExternalLink, HardDrive
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

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: '等待中', color: 'bg-amber-100 text-amber-800' },
  running: { label: '下载中', color: 'bg-blue-100 text-blue-800' },
  completed: { label: '已完成', color: 'bg-green-100 text-green-800' },
  failed: { label: '失败', color: 'bg-red-100 text-red-800' },
  cancelled: { label: '已取消', color: 'bg-slate-100 text-slate-600' },
}

function formatBytes(bytes: number): string {
  if (!bytes) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

// ================================================================
// Main Page
// ================================================================
export default function DownloadsPage() {
  const [tab, setTab] = useState<'jobs' | 'filings'>('filings')
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">下载中心</h2>
          <p className="text-sm text-slate-500 mt-1">SEC EDGAR 财报自动下载 · 所有用户共享</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { setLoading(true); fetchData() }}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> 刷新
          </Button>
          <Link href="/dashboard/downloads/new">
            <Button size="sm"><Plus className="h-4 w-4 mr-1.5" /> 新建下载</Button>
          </Link>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-blue-500 rounded-xl"><Database className="h-5 w-5 text-white" /></div>
            <div>
              <p className="text-2xl font-bold text-blue-900">{filingStats.total || 0}</p>
              <p className="text-xs text-blue-600">已下载财报</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500 rounded-xl"><CheckCircle className="h-5 w-5 text-white" /></div>
            <div>
              <p className="text-2xl font-bold text-emerald-900">{filingStats.companies || 0}</p>
              <p className="text-xs text-emerald-600">覆盖公司</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 rounded-xl"><Clock className="h-5 w-5 text-white" /></div>
            <div>
              <p className="text-2xl font-bold text-amber-900">{runningJobs.length}</p>
              <p className="text-xs text-amber-600">进行中任务</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
        <button onClick={() => setTab('filings')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            tab === 'filings' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}>
          <HardDrive className="h-4 w-4" /> 已下载财报 ({filings.length})
        </button>
        <button onClick={() => setTab('jobs')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            tab === 'jobs' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}>
          <Download className="h-4 w-4" /> 下载任务 ({jobs.length})
          {runningJobs.length > 0 && (
            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          )}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : tab === 'filings' ? (
        <FilingsView filings={filteredFilings} searchQuery={searchQuery}
          setSearchQuery={setSearchQuery} filterCategory={filterCategory}
          setFilterCategory={setFilterCategory} />
      ) : (
        <JobsView jobs={jobs} />
      )}
    </div>
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
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="p-4 bg-slate-100 rounded-full mb-4">
            <Database className="h-10 w-10 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold mb-1">暂无已下载财报</h3>
          <p className="text-sm text-slate-500 mb-6 text-center max-w-sm">
            创建下载任务后，Worker 会自动从 SEC EDGAR 下载财报并存入数据库
          </p>
          <Link href="/dashboard/downloads/new">
            <Button><Plus className="h-4 w-4 mr-1.5" /> 创建下载任务</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder="搜索公司或文件名..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-10 pr-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300" />
        </div>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm cursor-pointer">
          <option value="">全部类别</option>
          <option value="AI_Applications">AI 应用</option>
          <option value="AI_Supply_Chain">AI 供应链</option>
        </select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-500">公司</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">年份</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">季度</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">文件</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">大小</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">来源</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">操作</th>
                </tr>
              </thead>
              <tbody>
                {filings.map(f => (
                  <tr key={f.id} className="border-b last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                          f.category === 'AI_Applications' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                        }`}>{f.company_ticker?.slice(0, 2)}</div>
                        <div>
                          <p className="font-medium text-slate-900">{f.company_name}</p>
                          <p className="text-xs text-slate-400 font-mono">{f.company_ticker}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{f.year}</td>
                    <td className="px-4 py-3"><Badge variant="secondary">{f.quarter}</Badge></td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{f.filename}</td>
                    <td className="px-4 py-3 text-slate-500">{formatBytes(f.file_size)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        f.source === 'sec_edgar' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'
                      }`}>{f.source === 'sec_edgar' ? 'SEC' : 'IR'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {f.file_url && (
                          <a href={f.file_url} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
                            title="查看 SEC 原始链接">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <a href={`/api/filings/${f.id}`}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-green-600 transition-colors"
                          title="下载文件">
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
            <div className="text-center py-8 text-sm text-slate-400">无匹配结果</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ================================================================
// Jobs View (下载任务)
// ================================================================
function JobsView({ jobs }: { jobs: DownloadJob[] }) {
  if (jobs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="p-4 bg-slate-100 rounded-full mb-4">
            <Download className="h-10 w-10 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold mb-1">暂无下载任务</h3>
          <p className="text-sm text-slate-500 mb-6">创建下载任务，系统将通过 SEC EDGAR 自动获取财报</p>
          <Link href="/dashboard/downloads/new">
            <Button><Plus className="h-4 w-4 mr-1.5" /> 创建下载任务</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {jobs.map(job => {
        const config = statusConfig[job.status] || statusConfig.pending
        const progress = job.progress_percent || 0
        return (
          <Card key={job.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    job.status === 'running' ? 'bg-blue-100' : job.status === 'completed' ? 'bg-green-100' : 'bg-slate-100'
                  }`}>
                    {job.status === 'running' ? <Loader2 className="h-4 w-4 text-blue-600 animate-spin" /> :
                     job.status === 'completed' ? <CheckCircle className="h-4 w-4 text-green-600" /> :
                     job.status === 'failed' ? <XCircle className="h-4 w-4 text-red-600" /> :
                     <Clock className="h-4 w-4 text-slate-500" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">下载任务 #{job.id}</p>
                    <p className="text-xs text-slate-400">{new Date(job.created_at).toLocaleString('zh-CN')}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
                  {config.label}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                  年份: {job.years?.join(', ')}
                </span>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                  季度: {job.quarters?.join(', ')}
                </span>
              </div>

              {/* Progress */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">{job.completed_files + job.failed_files} / {job.total_files} 文件</span>
                  <span className="font-mono font-medium text-slate-700">{progress}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className={`h-2 rounded-full transition-all duration-500 ${
                    job.status === 'failed' ? 'bg-red-400' : job.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                  }`} style={{ width: `${progress}%` }} />
                </div>
              </div>

              <div className="flex items-center gap-4 mt-3 pt-3 border-t text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" /> {job.completed_files} 成功
                </span>
                <span className="flex items-center gap-1">
                  <XCircle className="h-3 w-3 text-red-500" /> {job.failed_files} 失败
                </span>
                {job.error_message && (
                  <span className="text-red-400 truncate max-w-xs" title={job.error_message}>
                    {job.error_message}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
