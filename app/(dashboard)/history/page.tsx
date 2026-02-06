'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileText, Search, Filter, Download, Calendar,
  CheckCircle2, XCircle, Clock, ArrowUpDown, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function HistoryPage() {
  const [search, setSearch] = React.useState('');

  // Placeholder - will be fetched from API
  const logs: Array<{
    id: number;
    company: string;
    ticker: string;
    year: number;
    quarter: string;
    filename: string;
    status: string;
    fileSize: number;
    downloadedAt: string;
  }> = [];

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
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="text-xs gap-1">
            <Filter className="w-3 h-3" /> 筛选
          </Button>
          <Button variant="outline" size="sm" className="text-xs gap-1">
            <Download className="w-3 h-3" /> 导出
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          {logs.length > 0 ? (
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
                  {logs.map(log => (
                    <tr key={log.id} className="table-row-hover border-b border-border/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{log.company}</span>
                          <span className="text-xs font-mono text-muted-foreground">{log.ticker}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{log.year}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="text-[10px]">{log.quarter}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-muted-foreground">{log.filename}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {(log.fileSize / 1024 / 1024).toFixed(2)} MB
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={log.status === 'success' ? 'success' : 'error'} className="text-[10px]">
                          {log.status === 'success' ? '成功' : '失败'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(log.downloadedAt).toLocaleString('zh-CN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
