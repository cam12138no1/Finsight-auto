'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Calendar, FileText, Building2, Download, ArrowLeft,
  CheckCircle2, Brain, Cpu, Zap, Info
} from 'lucide-react';
import { COMPANIES, type CompanyInfo } from '@/lib/companies';
import { QUARTERS, YEAR_RANGE } from '@/types';
import { cn } from '@/lib/utils';

export default function NewDownloadPage() {
  const router = useRouter();
  const [selectedYears, setSelectedYears] = React.useState<number[]>([new Date().getFullYear()]);
  const [selectedQuarters, setSelectedQuarters] = React.useState<string[]>(['Q1', 'Q2', 'Q3', 'Q4']);
  const [selectedCompanies, setSelectedCompanies] = React.useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const toggleYear = (year: number) => {
    setSelectedYears(prev =>
      prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year].sort()
    );
  };

  const toggleQuarter = (quarter: string) => {
    setSelectedQuarters(prev =>
      prev.includes(quarter) ? prev.filter(q => q !== quarter) : [...prev, quarter]
    );
  };

  const toggleCompany = (ticker: string) => {
    setSelectedCompanies(prev =>
      prev.includes(ticker) ? prev.filter(t => t !== ticker) : [...prev, ticker]
    );
  };

  const selectAllCompanies = () => {
    const filtered = COMPANIES.filter(c =>
      categoryFilter === 'all' || c.category === categoryFilter
    );
    setSelectedCompanies(filtered.map(c => c.ticker));
  };

  const clearCompanies = () => setSelectedCompanies([]);

  const selectCategory = (category: string) => {
    const filtered = COMPANIES.filter(c => c.category === category);
    setSelectedCompanies(prev => {
      const existing = prev.filter(t => !filtered.find(c => c.ticker === t));
      return [...existing, ...filtered.map(c => c.ticker)];
    });
  };

  const filteredCompanies = COMPANIES.filter(c =>
    categoryFilter === 'all' || c.category === categoryFilter
  );

  const totalEstimatedFiles = selectedYears.length * selectedQuarters.length * 
    (selectedCompanies.length || COMPANIES.length);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/downloads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          years: selectedYears,
          quarters: selectedQuarters,
          company_tickers: selectedCompanies.length > 0 ? selectedCompanies : undefined,
          category_filter: categoryFilter !== 'all' ? categoryFilter : undefined,
        }),
      });
      if (res.ok) {
        router.push('/downloads');
      }
    } catch (error) {
      console.error('Failed to create job:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[900px] mx-auto">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-muted-foreground">
        <ArrowLeft className="w-4 h-4 mr-1" /> 返回
      </Button>

      {/* Step 1: Years */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 text-sm font-bold">1</div>
            <div>
              <CardTitle className="text-base">选择年份</CardTitle>
              <CardDescription>选择需要下载的财报年份</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {YEAR_RANGE.map(year => (
              <button
                key={year}
                onClick={() => toggleYear(year)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer border',
                  selectedYears.includes(year)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                )}
              >
                {year}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Quarters */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gold-500/10 text-gold-500 text-sm font-bold">2</div>
            <div>
              <CardTitle className="text-base">选择季度</CardTitle>
              <CardDescription>选择需要下载的报告季度</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {QUARTERS.map(quarter => (
              <button
                key={quarter}
                onClick={() => toggleQuarter(quarter)}
                className={cn(
                  'px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer border min-w-[80px]',
                  selectedQuarters.includes(quarter)
                    ? 'bg-gold-500 text-white border-gold-500'
                    : 'bg-background border-border text-muted-foreground hover:border-gold-500/50 hover:text-foreground'
                )}
              >
                {quarter}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step 3: Companies */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 text-sm font-bold">3</div>
            <div>
              <CardTitle className="text-base">选择公司</CardTitle>
              <CardDescription>留空表示下载所有 24 家公司</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick select */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={selectAllCompanies} className="text-xs">
              全选
            </Button>
            <Button variant="outline" size="sm" onClick={clearCompanies} className="text-xs">
              清空
            </Button>
            <Separator orientation="vertical" className="h-8" />
            <Button variant="outline" size="sm" onClick={() => selectCategory('AI_Applications')} className="text-xs gap-1">
              <Brain className="w-3 h-3 text-blue-500" /> AI 应用
            </Button>
            <Button variant="outline" size="sm" onClick={() => selectCategory('AI_Supply_Chain')} className="text-xs gap-1">
              <Cpu className="w-3 h-3 text-gold-500" /> AI 供应链
            </Button>
          </div>

          {/* Company grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {COMPANIES.map(company => {
              const isSelected = selectedCompanies.includes(company.ticker);
              const isApp = company.category === 'AI_Applications';
              return (
                <button
                  key={company.ticker}
                  onClick={() => toggleCompany(company.ticker)}
                  className={cn(
                    'flex items-center gap-2 p-2.5 rounded-lg text-left transition-all duration-200 cursor-pointer border',
                    isSelected
                      ? 'bg-primary/10 border-primary/50 text-foreground'
                      : 'bg-background border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground'
                  )}
                >
                  <div className={cn(
                    'w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold shrink-0',
                    isApp ? 'bg-blue-500/10 text-blue-500' : 'bg-gold-500/10 text-gold-500'
                  )}>
                    {company.ticker.slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{company.name}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">{company.ticker}</p>
                  </div>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary ml-auto shrink-0" />}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Summary & Submit */}
      <Card className="glass-card border-primary/20">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">
                  年份: <span className="text-foreground font-medium">{selectedYears.join(', ') || '未选择'}</span>
                </span>
                <span className="text-muted-foreground">
                  季度: <span className="text-foreground font-medium">{selectedQuarters.join(', ') || '未选择'}</span>
                </span>
                <span className="text-muted-foreground">
                  公司: <span className="text-foreground font-medium">{selectedCompanies.length || '全部'} 家</span>
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Info className="w-3 h-3" />
                预计最多下载 {totalEstimatedFiles} 个文件
              </div>
            </div>
            <Button
              variant="gold"
              size="lg"
              className="gap-2"
              disabled={selectedYears.length === 0 || selectedQuarters.length === 0 || isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting ? (
                <Loader2Icon className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {isSubmitting ? '创建中...' : '开始下载'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Loader2Icon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
  );
}
