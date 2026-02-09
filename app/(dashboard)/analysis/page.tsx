'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Search, Download, FileText, Building2, Calendar, ChevronRight,
  Loader2, Brain, Cpu, BarChart3, AlertCircle, Play,
  TrendingUp, TrendingDown, Minus, ShieldAlert, Target, Zap
} from 'lucide-react';
import { cn, formatBytes } from '@/lib/utils';

interface FilingEntry {
  year: number; quarter: string; filing_id: number; filename: string; file_size: number;
}
interface CompanyWithFilings {
  id: number; name: string; ticker: string; category: string; filings: FilingEntry[];
}
interface SummaryData {
  companies: CompanyWithFilings[]; years: number[]; quarters: string[]; total_filings: number;
}

export default function AnalysisPage() {
  const [summary, setSummary] = React.useState<SummaryData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [selectedCompany, setSelectedCompany] = React.useState<CompanyWithFilings | null>(null);
  const [selectedFiling, setSelectedFiling] = React.useState<FilingEntry | null>(null);
  const [analysisResult, setAnalysisResult] = React.useState<any>(null);
  const [analyzing, setAnalyzing] = React.useState(false);
  const [analyzeError, setAnalyzeError] = React.useState<string | null>(null);
  const [filterCategory, setFilterCategory] = React.useState<string>('');
  const [searchQuery, setSearchQuery] = React.useState('');

  React.useEffect(() => {
    fetch('/api/files/summary').then(r => r.json()).then(d => {
      if (d.success) setSummary(d.data);
    }).finally(() => setLoading(false));
  }, []);

  const handleAnalyze = async () => {
    if (!selectedFiling) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    setAnalysisResult(null);
    try {
      const res = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filing_id: selectedFiling.filing_id }),
      });
      const data = await res.json();
      if (data.success) {
        setAnalysisResult(data.cached ? data.data.result : data.data.result);
      } else {
        setAnalyzeError(data.error || '分析失败');
      }
    } catch (err: any) {
      setAnalyzeError(err.message || '网络错误');
    } finally {
      setAnalyzing(false);
    }
  };

  // Also check for existing results when selecting a filing
  const selectFiling = async (filing: FilingEntry) => {
    setSelectedFiling(filing);
    setAnalysisResult(null);
    setAnalyzeError(null);
    // Check for cached result
    try {
      const res = await fetch(`/api/analysis?filing_id=${filing.filing_id}`);
      const data = await res.json();
      if (data.success && data.data?.length > 0) {
        const completed = data.data.find((r: any) => r.status === 'completed');
        if (completed?.result) {
          setAnalysisResult(completed.result);
        }
      }
    } catch {}
  };

  const filteredCompanies = React.useMemo(() => {
    if (!summary) return [];
    return summary.companies.filter(c => {
      if (filterCategory && c.category !== filterCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!c.name.toLowerCase().includes(q) && !c.ticker.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [summary, filterCategory, searchQuery]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!summary || summary.total_filings === 0) {
    return (
      <Card className="glass-card max-w-[800px] mx-auto">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">数据库中暂无财报</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
            请先到「下载中心」创建下载任务，财报存入数据库后即可在此分析。
          </p>
          <a href="/downloads/new"><Button className="gap-2"><Download className="w-4 h-4" /> 去下载财报</Button></a>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Selector */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="glass-card">
            <CardContent className="p-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" placeholder="搜索公司..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-10 pr-3 rounded-lg border border-input bg-background text-sm" />
              </div>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                className="w-full h-9 px-2 rounded-lg border border-input bg-background text-xs cursor-pointer">
                <option value="">全部 ({summary.total_filings}份)</option>
                <option value="AI_Applications">AI 应用</option>
                <option value="AI_Supply_Chain">AI 供应链</option>
              </select>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-2 max-h-[600px] overflow-y-auto">
              {filteredCompanies.map(company => {
                const isSelected = selectedCompany?.id === company.id;
                const isApp = company.category === 'AI_Applications';
                return (
                  <div key={company.id}>
                    <button onClick={() => { setSelectedCompany(isSelected ? null : company); setSelectedFiling(null); setAnalysisResult(null); }}
                      className={cn('flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer',
                        isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50')}>
                      <div className={cn('w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold shrink-0',
                        isApp ? 'bg-blue-500/10 text-blue-500' : 'bg-gold-500/10 text-gold-500')}>
                        {company.ticker.slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{company.name}</p>
                        <p className="text-[10px] text-muted-foreground">{company.ticker} · {company.filings.length} 份</p>
                      </div>
                      <ChevronRight className={cn('w-4 h-4 text-muted-foreground transition-transform', isSelected && 'rotate-90')} />
                    </button>
                    {isSelected && (
                      <div className="ml-11 mb-2 space-y-1">
                        {company.filings.map(f => (
                          <button key={f.filing_id} onClick={() => selectFiling(f)}
                            className={cn('flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-left text-xs transition-all cursor-pointer',
                              selectedFiling?.filing_id === f.filing_id ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted/50')}>
                            <FileText className="w-3 h-3 shrink-0" />
                            <span>{f.year} {f.quarter}</span>
                            <span className="ml-auto text-[10px]">{formatBytes(f.file_size)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right: Analysis */}
        <div className="lg:col-span-9">
          {!selectedFiling ? (
            <Card className="glass-card">
              <CardContent className="flex flex-col items-center justify-center py-20">
                <BarChart3 className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-1">选择财报进行 AI 分析</h3>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  从左侧选择公司和财报，系统将使用 Gemini AI 生成投委会级别的深度分析报告
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Header bar */}
              <Card className="glass-card">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold">
                      {selectedCompany?.name} ({selectedCompany?.ticker}) — {selectedFiling.year} {selectedFiling.quarter}
                    </h3>
                    <p className="text-xs text-muted-foreground">{selectedFiling.filename} · {formatBytes(selectedFiling.file_size)}</p>
                  </div>
                  <div className="flex gap-2">
                    <a href={`/api/files/filing/${selectedFiling.filing_id}`} download>
                      <Button variant="outline" size="sm" className="text-xs gap-1"><Download className="w-3 h-3" /> 原文</Button>
                    </a>
                    <Button variant="gold" size="sm" className="gap-1" onClick={handleAnalyze}
                      disabled={analyzing}>
                      {analyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                      {analyzing ? 'AI 分析中...' : analysisResult ? '重新分析' : '开始 AI 分析'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {analyzeError && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">{analyzeError}</div>
              )}

              {analyzing && (
                <Card className="glass-card">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                    <h3 className="text-base font-semibold mb-1">Gemini AI 正在分析...</h3>
                    <p className="text-xs text-muted-foreground">投委会级别深度分析，预计 1-3 分钟</p>
                  </CardContent>
                </Card>
              )}

              {analysisResult && <AnalysisResultView result={analysisResult} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ================================================================
// Analysis Result Display (投委会级别报告展示)
// ================================================================
function AnalysisResultView({ result }: { result: any }) {
  return (
    <div className="space-y-4">
      {/* 一句话结论 */}
      <Card className="glass-card border-primary/20">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">一句话结论</p>
              <p className="text-sm leading-relaxed">{result.one_line_conclusion}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 结果表 */}
      {result.results_table?.length > 0 && (
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Target className="w-4 h-4 text-primary" /> 核心指标对比</CardTitle>
            {result.results_summary && <CardDescription className="text-xs">{result.results_summary}</CardDescription>}
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-2 font-semibold text-muted-foreground">指标</th>
                  <th className="text-left px-4 py-2 font-semibold text-muted-foreground">实际</th>
                  <th className="text-left px-4 py-2 font-semibold text-muted-foreground">预期</th>
                  <th className="text-left px-4 py-2 font-semibold text-muted-foreground">差异</th>
                  <th className="text-left px-4 py-2 font-semibold text-muted-foreground">判定</th>
                </tr></thead>
                <tbody>
                  {result.results_table.map((row: any, i: number) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="px-4 py-2 font-medium">{row.metric}</td>
                      <td className="px-4 py-2 font-mono">{row.actual}</td>
                      <td className="px-4 py-2 font-mono text-muted-foreground">{row.consensus}</td>
                      <td className="px-4 py-2 font-mono">{row.delta}</td>
                      <td className="px-4 py-2">
                        <Badge variant={row.assessment?.includes('Beat') ? 'success' : row.assessment?.includes('Miss') ? 'error' : 'secondary'} className="text-[10px]">
                          {row.assessment}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 驱动分析 */}
      {result.drivers && (
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-500" /> 驱动分析</CardTitle>
            {result.drivers_summary && <CardDescription className="text-xs">{result.drivers_summary}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-4">
            {['demand', 'monetization', 'efficiency'].map(key => {
              const d = result.drivers[key];
              if (!d) return null;
              return (
                <div key={key} className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs font-semibold mb-1">{d.title}</p>
                  {d.metrics && <p className="text-[10px] text-muted-foreground mb-1">指标: {d.metrics}</p>}
                  <p className="text-xs"><span className="text-primary font-mono">{d.magnitude}</span> — {d.change}</p>
                  <p className="text-xs text-muted-foreground mt-1">原因: {d.reason}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* 投入与ROI */}
      {result.investment_roi && (
        <Card className="glass-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4 text-blue-500" /> 投入与 ROI</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            <p><span className="font-semibold">CapEx:</span> {result.investment_roi.capex_change}</p>
            <p><span className="font-semibold">OpEx:</span> {result.investment_roi.opex_change}</p>
            <p><span className="font-semibold">投入方向:</span> {result.investment_roi.investment_direction}</p>
            {result.investment_roi.roi_evidence?.map((e: string, i: number) => (
              <p key={i} className="text-muted-foreground">• {e}</p>
            ))}
            <p className="mt-2"><span className="font-semibold">管理层承诺:</span> {result.investment_roi.management_commitment}</p>
          </CardContent>
        </Card>
      )}

      {/* 风险 */}
      {result.sustainability_risks && (
        <Card className="glass-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-red-400" /> 可持续性与风险</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <p className="font-semibold text-emerald-500 mb-1">可持续驱动</p>
              {result.sustainability_risks.sustainable_drivers?.map((d: string, i: number) => <p key={i} className="text-muted-foreground">✓ {d}</p>)}
            </div>
            <div>
              <p className="font-semibold text-red-400 mb-1">主要风险</p>
              {result.sustainability_risks.main_risks?.map((r: string | { risk: string }, i: number) => <p key={i} className="text-muted-foreground">⚠ {typeof r === 'string' ? r : r.risk}</p>)}
            </div>
            <div>
              <p className="font-semibold text-blue-400 mb-1">检查点</p>
              {result.sustainability_risks.checkpoints?.map((c: string, i: number) => <p key={i} className="text-muted-foreground">◉ {c}</p>)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 投委会结论 */}
      {result.investment_committee_summary && (
        <Card className="glass-card border-gold-500/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-gold-500" /> 投委会结论</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{result.investment_committee_summary}</p>
          </CardContent>
        </Card>
      )}

      {/* 最终判断 */}
      {result.final_judgment && (
        <Card className="glass-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">最终判断</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            <p><span className="font-semibold text-emerald-500">更有信心:</span> {result.final_judgment.confidence}</p>
            <p><span className="font-semibold text-red-400">更担心:</span> {result.final_judgment.concerns}</p>
            <p><span className="font-semibold text-blue-400">要盯:</span> {result.final_judgment.watch_list}</p>
            <Separator className="my-2" />
            <div className="flex items-center gap-4">
              <Badge variant={result.final_judgment.net_impact?.includes('Beat') ? 'success' : result.final_judgment.net_impact?.includes('Miss') ? 'error' : 'secondary'}>
                {result.final_judgment.net_impact}
              </Badge>
              <span className="text-muted-foreground">{result.final_judgment.recommendation}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
