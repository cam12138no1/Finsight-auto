'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Upload, FileText, Download, Trash2, Loader2,
  Search, User, Calendar, Building2, Plus, X, FileUp
} from 'lucide-react';
import { cn, formatBytes, formatDate } from '@/lib/utils';
import { COMPANIES } from '@/lib/companies';

interface UserReport {
  id: number;
  uploader_name: string;
  company_id: number | null;
  company_name: string | null;
  company_ticker: string | null;
  title: string;
  description: string;
  year: number | null;
  quarter: string | null;
  filename: string;
  content_type: string;
  file_size: number;
  created_at: string;
}

interface SharedFiling {
  id: number;
  company_id: number;
  company_name: string;
  company_ticker: string;
  category: string;
  year: number;
  quarter: string;
  filename: string;
  content_type: string;
  file_size: number;
  source: string;
  created_at: string;
}

export default function ReportsPage() {
  const [tab, setTab] = React.useState<'filings' | 'reports'>('filings');
  const [filings, setFilings] = React.useState<SharedFiling[]>([]);
  const [reports, setReports] = React.useState<UserReport[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showUpload, setShowUpload] = React.useState(false);

  const fetchFilings = React.useCallback(async () => {
    try {
      const res = await fetch('/api/files');
      const data = await res.json();
      if (data.success) setFilings(data.data || []);
    } catch {}
  }, []);

  const fetchReports = React.useCallback(async () => {
    try {
      const res = await fetch('/api/reports');
      const data = await res.json();
      if (data.success) setReports(data.data || []);
    } catch {}
  }, []);

  React.useEffect(() => {
    setLoading(true);
    Promise.all([fetchFilings(), fetchReports()]).finally(() => setLoading(false));
  }, [fetchFilings, fetchReports]);

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此研报？')) return;
    await fetch(`/api/reports/${id}`, { method: 'DELETE' });
    fetchReports();
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">共享财报 &amp; 个人研报管理</p>
        </div>
        <Button className="gap-2" onClick={() => setShowUpload(true)}>
          <Upload className="w-4 h-4" /> 上传研报
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('filings')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all border cursor-pointer',
            tab === 'filings'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background border-border text-muted-foreground hover:border-primary/50'
          )}
        >
          共享财报 ({filings.length})
        </button>
        <button
          onClick={() => setTab('reports')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all border cursor-pointer',
            tab === 'reports'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background border-border text-muted-foreground hover:border-primary/50'
          )}
        >
          用户研报 ({reports.length})
        </button>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={() => { fetchReports(); setShowUpload(false); setTab('reports'); }}
        />
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : tab === 'filings' ? (
        <FilingsTable filings={filings} />
      ) : (
        <ReportsTable reports={reports} onDelete={handleDelete} />
      )}
    </div>
  );
}

function FilingsTable({ filings }: { filings: SharedFiling[] }) {
  if (filings.length === 0) {
    return (
      <Card className="glass-card">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <FileText className="w-10 h-10 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-1">暂无共享财报</h3>
          <p className="text-sm text-muted-foreground">创建下载任务后，财报将自动存储到数据库</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">公司</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">年份</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">季度</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">文件</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">大小</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">来源</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {filings.map(f => (
                <tr key={f.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{f.company_name}</span>
                      <span className="text-xs font-mono text-muted-foreground">{f.company_ticker}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{f.year}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="text-[10px]">{f.quarter}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-muted-foreground">{f.filename}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{formatBytes(f.file_size)}</td>
                  <td className="px-4 py-3">
                    <Badge variant="info" className="text-[10px]">
                      {f.source === 'sec_edgar' ? 'SEC' : 'IR'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <a href={`/api/files/filing/${f.id}`} download>
                      <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
                        <Download className="w-3 h-3" /> 下载
                      </Button>
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function ReportsTable({ reports, onDelete }: { reports: UserReport[]; onDelete: (id: number) => void }) {
  if (reports.length === 0) {
    return (
      <Card className="glass-card">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <FileUp className="w-10 h-10 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-1">暂无用户研报</h3>
          <p className="text-sm text-muted-foreground">点击「上传研报」按钮上传您的研究报告</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">标题</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">上传者</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">公司</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">文件</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">大小</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">时间</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(r => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium">{r.title}</p>
                    {r.description && <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{r.uploader_name}</td>
                  <td className="px-4 py-3 text-sm">
                    {r.company_name ? `${r.company_name} (${r.company_ticker})` : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-muted-foreground">{r.filename}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{formatBytes(r.file_size)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(r.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <a href={`/api/files/report/${r.id}`} download>
                        <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
                          <Download className="w-3 h-3" />
                        </Button>
                      </a>
                      <Button variant="ghost" size="sm" className="text-xs h-7 text-red-400 hover:text-red-300"
                        onClick={() => onDelete(r.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function UploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [title, setTitle] = React.useState('');
  const [uploaderName, setUploaderName] = React.useState('');
  const [companyId, setCompanyId] = React.useState('');
  const [year, setYear] = React.useState('');
  const [quarter, setQuarter] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) { setError('请填写标题并选择文件'); return; }
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      if (uploaderName) formData.append('uploader_name', uploaderName);
      if (companyId) formData.append('company_id', companyId);
      if (year) formData.append('year', year);
      if (quarter) formData.append('quarter', quarter);
      if (description) formData.append('description', description);

      const res = await fetch('/api/reports', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        onSuccess();
      } else {
        setError(data.error || '上传失败');
      }
    } catch (err) {
      setError('网络错误');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-lg mx-4 glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">上传研报</CardTitle>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
          <CardDescription>上传您的研究报告，存储在服务器数据库中</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">标题 *</label>
              <input type="text" required value={title} onChange={e => setTitle(e.target.value)}
                className="w-full h-9 mt-1 px-3 rounded-lg border border-input bg-background text-sm"
                placeholder="例: NVDA 2024 Q3 深度分析" />
            </div>

            {/* File */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">文件 *</label>
              <div className="mt-1 flex items-center gap-2">
                <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-border bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {file ? file.name : '选择文件'}
                  </span>
                  <input type="file" className="hidden" accept=".pdf,.doc,.docx,.xlsx,.pptx,.html,.htm"
                    onChange={e => setFile(e.target.files?.[0] || null)} />
                </label>
                {file && <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>}
              </div>
            </div>

            {/* Uploader name */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">您的名字</label>
              <input type="text" value={uploaderName} onChange={e => setUploaderName(e.target.value)}
                className="w-full h-9 mt-1 px-3 rounded-lg border border-input bg-background text-sm"
                placeholder="留空则显示为 anonymous" />
            </div>

            {/* Company + Year + Quarter */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">关联公司</label>
                <select value={companyId} onChange={e => setCompanyId(e.target.value)}
                  className="w-full h-9 mt-1 px-2 rounded-lg border border-input bg-background text-sm cursor-pointer">
                  <option value="">不关联</option>
                  {COMPANIES.map((c, i) => (
                    <option key={c.ticker} value={String(i + 1)}>{c.ticker} - {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">年份</label>
                <input type="number" value={year} onChange={e => setYear(e.target.value)}
                  className="w-full h-9 mt-1 px-3 rounded-lg border border-input bg-background text-sm"
                  placeholder="2024" min="2020" max="2030" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">季度</label>
                <select value={quarter} onChange={e => setQuarter(e.target.value)}
                  className="w-full h-9 mt-1 px-2 rounded-lg border border-input bg-background text-sm cursor-pointer">
                  <option value="">不指定</option>
                  <option value="Q1">Q1</option>
                  <option value="Q2">Q2</option>
                  <option value="Q3">Q3</option>
                  <option value="Q4">Q4</option>
                  <option value="FY">FY</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">描述</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none"
                rows={2} placeholder="简要描述研报内容..." />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 text-red-500 text-sm">{error}</div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>取消</Button>
              <Button type="submit" disabled={uploading} className="gap-2">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? '上传中...' : '上传'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
