'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Plus, Download, Clock, CheckCircle2, XCircle,
  Loader2, ArrowRight, FileText, Calendar, Trash2, RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DownloadJob, JobStatus } from '@/types';

const statusConfig: Record<JobStatus, { icon: React.ElementType; label: string; color: string; badge: 'info' | 'warning' | 'success' | 'error' | 'secondary' }> = {
  pending: { icon: Clock, label: '等待中', color: 'text-gold-500', badge: 'warning' },
  running: { icon: Loader2, label: '下载中', color: 'text-blue-500', badge: 'info' },
  completed: { icon: CheckCircle2, label: '已完成', color: 'text-emerald-500', badge: 'success' },
  failed: { icon: XCircle, label: '失败', color: 'text-red-500', badge: 'error' },
  cancelled: { icon: XCircle, label: '已取消', color: 'text-muted-foreground', badge: 'secondary' },
};

function JobCard({
  job,
  onCancel,
}: {
  job: DownloadJob & { progress_percent: number };
  onCancel: (id: number) => void;
}) {
  const config = statusConfig[job.status];
  const StatusIcon = config.icon;
  const progress = job.progress_percent;

  return (
    <div className="group p-4 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-muted/30 transition-all duration-200">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', `${config.color} bg-current/10`)}>
              <StatusIcon className={cn('w-4 h-4', config.color, job.status === 'running' && 'animate-spin')} />
            </div>
            <div>
              <p className="text-sm font-semibold">下载任务 #{job.id}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(job.created_at).toLocaleString('zh-CN')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={config.badge} className="text-[10px]">{config.label}</Badge>
            {(job.status === 'pending' || job.status === 'running') && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onCancel(job.id);
                }}
                className="p-1 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                title="取消任务"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>{job.years?.join(', ')}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <FileText className="w-3 h-3" />
            <span>{job.quarters?.join(', ')}</span>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {job.completed_files + job.failed_files} / {job.total_files} 文件
            </span>
            <span className="font-mono font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {job.completed_files} 成功
          </span>
          <span className="flex items-center gap-1">
            <XCircle className="w-3 h-3 text-red-500" /> {job.failed_files} 失败
          </span>
          {job.error_message && (
            <span className="text-red-400 truncate ml-auto max-w-[200px]" title={job.error_message}>
              {job.error_message}
            </span>
          )}
          <ArrowRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        </div>
      </div>
    </div>
  );
}

export default function DownloadsPage() {
  const [jobs, setJobs] = React.useState<(DownloadJob & { progress_percent: number })[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<string>('');

  const fetchJobs = React.useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      params.set('limit', '50');

      const res = await fetch(`/api/downloads?${params}`);
      const data = await res.json();
      if (data.success) {
        setJobs(data.data || []);
        setError(null);
      } else {
        setError(data.error || '加载失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  React.useEffect(() => {
    fetchJobs();
    // Auto-refresh every 5 seconds if there are running jobs
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  const handleCancel = async (jobId: number) => {
    if (!confirm('确定要取消此下载任务吗？')) return;
    try {
      const res = await fetch(`/api/downloads/${jobId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchJobs();
      }
    } catch (err) {
      console.error('Cancel failed:', err);
    }
  };

  const statusFilters = [
    { value: '', label: '全部' },
    { value: 'pending', label: '等待中' },
    { value: 'running', label: '进行中' },
    { value: 'completed', label: '已完成' },
    { value: 'failed', label: '失败' },
  ];

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">管理所有财报下载任务</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={fetchJobs} title="刷新">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </Button>
          <Link href="/downloads/new">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              新建下载任务
            </Button>
          </Link>
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2">
        {statusFilters.map(f => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border cursor-pointer',
              statusFilter === f.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background border-border text-muted-foreground hover:border-primary/50'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && jobs.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : jobs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map(job => (
            <JobCard key={job.id} job={job} onCancel={handleCancel} />
          ))}
        </div>
      ) : (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-2xl bg-muted/50 mb-4">
              <Download className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">暂无下载任务</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
              创建第一个下载任务，开始自动化获取 AI 行业龙头企业的财务报告
            </p>
            <Link href="/downloads/new">
              <Button variant="gold" className="gap-2">
                <Plus className="w-4 h-4" />
                创建下载任务
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
