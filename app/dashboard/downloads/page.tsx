'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Download, Plus, Clock, CheckCircle, XCircle, Loader2, RefreshCw, FileText } from 'lucide-react'

interface DownloadJob {
  id: number
  status: string
  years: number[]
  quarters: string[]
  total_files: number
  completed_files: number
  failed_files: number
  created_at: string
  error_message: string | null
  progress_percent: number
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' }> = {
  pending: { label: '等待中', variant: 'secondary' },
  running: { label: '下载中', variant: 'default' },
  completed: { label: '已完成', variant: 'success' },
  failed: { label: '失败', variant: 'destructive' },
  cancelled: { label: '已取消', variant: 'outline' },
}

export default function DownloadsPage() {
  const [jobs, setJobs] = useState<DownloadJob[]>([])
  const [loading, setLoading] = useState(true)

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/downloads')
      const data = await res.json()
      if (data.success) setJobs(data.data || [])
    } catch (err) {
      console.error('Failed to fetch jobs:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs()
    const interval = setInterval(fetchJobs, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">下载中心</h2>
          <p className="text-sm text-slate-500 mt-1">自动下载 24 家 AI 龙头企业的 SEC 财报</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchJobs}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Link href="/dashboard/downloads/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              新建下载任务
            </Button>
          </Link>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-blue-900">自动财报下载</h3>
              <p className="text-xs text-blue-700 mt-1">
                系统通过 SEC EDGAR API 自动下载美股上市公司的 10-Q/10-K 财报，
                下载后的文件存入数据库，所有用户共享。您也可以在分析时直接选择已下载的财报。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jobs List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : jobs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map(job => {
            const config = statusConfig[job.status] || statusConfig.pending
            return (
              <Card key={job.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold">下载任务 #{job.id}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {new Date(job.created_at).toLocaleString('zh-CN')}
                      </p>
                    </div>
                    <Badge variant={config.variant}>{config.label}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3 text-xs text-slate-500">
                    <span>年份: {job.years?.join(', ')}</span>
                    <span>·</span>
                    <span>季度: {job.quarters?.join(', ')}</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">
                        {job.completed_files + job.failed_files} / {job.total_files} 文件
                      </span>
                      <span className="font-mono">{job.progress_percent || 0}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${job.progress_percent || 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" /> {job.completed_files} 成功
                    </span>
                    <span className="flex items-center gap-1">
                      <XCircle className="h-3 w-3 text-red-500" /> {job.failed_files} 失败
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 bg-slate-100 rounded-full mb-4">
              <Download className="h-10 w-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold mb-1">暂无下载任务</h3>
            <p className="text-sm text-slate-500 mb-6 text-center max-w-sm">
              创建第一个下载任务，系统将通过 SEC EDGAR 自动获取 AI 行业龙头企业的财报
            </p>
            <Link href="/dashboard/downloads/new">
              <Button>
                <Plus className="h-4 w-4 mr-1.5" />
                创建下载任务
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
