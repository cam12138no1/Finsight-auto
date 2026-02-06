'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, Cpu, Brain } from 'lucide-react';
import { COMPANIES, getCategoryLabel } from '@/lib/companies';
import { cn } from '@/lib/utils';

export function CompanyOverview() {
  const aiApps = COMPANIES.filter(c => c.category === 'AI_Applications');
  const aiSupply = COMPANIES.filter(c => c.category === 'AI_Supply_Chain');

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">公司概览</CardTitle>
        <Link href="/companies">
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
            查看全部 <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* AI Applications */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-md bg-blue-500/10">
                <Brain className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <span className="text-sm font-medium">AI 应用</span>
              <Badge variant="secondary" className="text-[10px] ml-auto">{aiApps.length}</Badge>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {aiApps.map(company => (
                <span
                  key={company.ticker}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors duration-150 cursor-pointer"
                >
                  {company.ticker}
                </span>
              ))}
            </div>
          </div>

          {/* AI Supply Chain */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-md bg-gold-500/10">
                <Cpu className="w-3.5 h-3.5 text-gold-500" />
              </div>
              <span className="text-sm font-medium">AI 供应链</span>
              <Badge variant="secondary" className="text-[10px] ml-auto">{aiSupply.length}</Badge>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {aiSupply.map(company => (
                <span
                  key={company.ticker}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors duration-150 cursor-pointer"
                >
                  {company.ticker}
                </span>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
