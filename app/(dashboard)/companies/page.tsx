'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Building2, ExternalLink, Brain, Cpu, Search, Filter,
  TrendingUp, Globe, ChevronRight
} from 'lucide-react';
import { COMPANIES, getCategoryLabel, type CompanyInfo } from '@/lib/companies';
import { cn } from '@/lib/utils';

function CompanyCard({ company }: { company: CompanyInfo }) {
  const isApp = company.category === 'AI_Applications';

  return (
    <div className="group flex items-center gap-4 p-4 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-muted/30 transition-all duration-200 cursor-pointer">
      {/* Logo placeholder */}
      <div className={cn(
        'flex items-center justify-center w-11 h-11 rounded-xl text-sm font-bold shrink-0',
        isApp ? 'bg-blue-500/10 text-blue-500' : 'bg-gold-500/10 text-gold-500'
      )}>
        {company.ticker.slice(0, 2)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold truncate">{company.name}</span>
          <span className="text-xs font-mono text-muted-foreground">{company.ticker}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{company.description}</p>
      </div>

      {/* Category Badge */}
      <Badge variant={isApp ? 'info' : 'warning'} className="hidden sm:inline-flex shrink-0 text-[10px]">
        {isApp ? 'AI应用' : '供应链'}
      </Badge>

      {/* SEC CIK */}
      {company.secCik && (
        <span className="hidden md:inline text-[10px] font-mono text-muted-foreground">
          CIK: {company.secCik.replace(/^0+/, '')}
        </span>
      )}

      {/* Link */}
      <a
        href={company.irUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink className="w-4 h-4" />
      </a>

      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
    </div>
  );
}

export default function CompaniesPage() {
  const [search, setSearch] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all');

  const filteredCompanies = COMPANIES.filter(company => {
    const matchesSearch = !search || 
      company.name.toLowerCase().includes(search.toLowerCase()) ||
      company.ticker.toLowerCase().includes(search.toLowerCase()) ||
      company.description.includes(search);
    const matchesCategory = categoryFilter === 'all' || company.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const aiApps = filteredCompanies.filter(c => c.category === 'AI_Applications');
  const aiSupply = filteredCompanies.filter(c => c.category === 'AI_Supply_Chain');

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜索公司名称或代码..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Category Filter */}
        <div className="flex gap-2">
          {[
            { key: 'all', label: '全部', count: COMPANIES.length },
            { key: 'AI_Applications', label: 'AI 应用', count: COMPANIES.filter(c => c.category === 'AI_Applications').length },
            { key: 'AI_Supply_Chain', label: '供应链', count: COMPANIES.filter(c => c.category === 'AI_Supply_Chain').length },
          ].map(f => (
            <Button
              key={f.key}
              variant={categoryFilter === f.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategoryFilter(f.key)}
              className="text-xs"
            >
              {f.label}
              <span className="ml-1.5 text-[10px] opacity-70">({f.count})</span>
            </Button>
          ))}
        </div>
      </div>

      {/* AI Applications */}
      {aiApps.length > 0 && (
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-blue-500/10">
                <Brain className="w-4 h-4 text-blue-500" />
              </div>
              <CardTitle className="text-base">AI 应用公司</CardTitle>
              <Badge variant="info" className="text-[10px] ml-2">{aiApps.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {aiApps.map(company => (
              <CompanyCard key={company.ticker} company={company} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* AI Supply Chain */}
      {aiSupply.length > 0 && (
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-gold-500/10">
                <Cpu className="w-4 h-4 text-gold-500" />
              </div>
              <CardTitle className="text-base">AI 供应链公司</CardTitle>
              <Badge variant="warning" className="text-[10px] ml-2">{aiSupply.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {aiSupply.map(company => (
              <CompanyCard key={company.ticker} company={company} />
            ))}
          </CardContent>
        </Card>
      )}

      {filteredCompanies.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Search className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">未找到匹配的公司</p>
          <p className="text-xs mt-1">尝试调整搜索条件或筛选器</p>
        </div>
      )}
    </div>
  );
}
