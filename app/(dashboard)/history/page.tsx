'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileText, Search, Filter, Download, Calendar,
  CheckCircle2, XCircle, Clock, Loader2, ChevronLeft, ChevronRight
} from 'lucide-react';
import { cn, formatBytes, formatDate } from '@/lib/utils';
import type { DownloadLog, FileStatus } from '@/types';

const statusBadge: Record<string, { variant: 'success' | 'error' | 'warning' | 'info' | 'secondary'; label: string }> = {
  success: { variant: 'success', label: '成功' },
  failed: { variant: 'error', label: '失败' },
  pending: { variant: 'warning', label: '等待' },
  downloading: { variant: 'info', label: '下载中' },
  skipped: { variant: 'secondary', label: '跳过' },
};

export default function HistoryPage() {
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [logs, setLogs] = React.useState<DownloadLog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(0);
  const pageSize = 50;

  const fetchLogs = React.useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      params.set('limit', String(pageSize));
      params.set('offset', String(page * pageSize));

      const res = await fetch(`/api/logs?${params}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data || []);
        setTotal(data.meta?.total || 0);
        setError(null);
      } else {
        setError(data.error || '加载失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  React.useEffect(() => {
    const debounceTimer = setTimeout(fetchLogs, 300);
    return () => clearTimeout(debounceTimer);
  }, [fetchLogs]);

  const handleExport = async () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    window.open(`/api/logs/export?${params}`, '_blank');
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜索公司、文件名..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            className="h-10 px-3 rounded-lg border border-input bg-background text-sm cursor-pointer"
          >
            <option value="">全部状态</option>
            <option value="success">成功</option>
            <option value="failed">失败</option>
            <option value="pending">等待中</option>
            <option value="downloading">下载中</option>
          </select>
          <Button variant="outline" size="sm" className="text-xs gap-1 h-10" onClick={handleExport}>
            <Download className="w-3 h-3" /> 导出 CSV
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          {loading && logs.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">公司</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">年份</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">季度</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">文件名</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">大小</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">状态</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(log => {
                      const badge = statusBadge[log.status] || statusBadge.pending;
                      return (
                        <tr key={log.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{log.company_name || '-'}</span>
                              <span className="text-xs font-mono text-muted-foreground">{log.company_ticker || ''}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">{log.year}</td>
                          <td className="px-4 py-3">
                            <Badge variant="secondary" className="text-[10px]">{log.quarter}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            {log.file_url ? (
                              <a
                                href={log.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-mono text-blue-400 hover:text-blue-300 hover:underline"
                              >
                                {log.filename || 'Link'}
                              </a>
                            ) : (
                              <span className="text-sm font-mono text-muted-foreground">
                                {log.filename || '-'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {log.file_size ? formatBytes(log.file_size) : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={badge.variant} className="text-[10px]">
                              {badge.label}
                            </Badge>
                            {log.error_message && (
                              <p className="text-[10px] text-red-400 mt-0.5 max-w-[200px] truncate" title={log.error_message}>
                                {log.error_message}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {formatDate(log.updated_at || log.created_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    共 {total} 条记录，第 {page + 1}/{totalPages} 页
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => setPage(p => p - 1)}
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage(p => p + 1)}
                    >
                      <ChevronRight className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="p-4 rounded-2xl bg-muted/50 mb-4">
                <FileText className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">暂无下载记录</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                当您开始下载财报后，所有下载记录将在此处显示
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
