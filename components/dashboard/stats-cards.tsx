'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Building2,
  Download,
  CheckCircle2,
  TrendingUp,
  HardDrive,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: { value: number; label: string };
  color?: 'blue' | 'gold' | 'emerald' | 'purple';
}

function StatCard({ title, value, subtitle, icon: Icon, trend, color = 'blue' }: StatCardProps) {
  const colorMap = {
    blue: 'text-blue-500 bg-blue-500/10',
    gold: 'text-gold-500 bg-gold-500/10',
    emerald: 'text-emerald-500 bg-emerald-500/10',
    purple: 'text-purple-500 bg-purple-500/10',
  };

  return (
    <Card className="glass-card-hover">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {title}
            </span>
            <span className="stat-number text-foreground">{value}</span>
            {subtitle && (
              <span className="text-xs text-muted-foreground">{subtitle}</span>
            )}
          </div>
          <div className={cn('p-2.5 rounded-xl', colorMap[color])}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        {trend && (
          <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border/50">
            <TrendingUp className={cn('w-3 h-3', trend.value >= 0 ? 'text-emerald-500' : 'text-red-500')} />
            <span className={cn('text-xs font-medium', trend.value >= 0 ? 'text-emerald-500' : 'text-red-500')}>
              {trend.value >= 0 ? '+' : ''}{trend.value}%
            </span>
            <span className="text-xs text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function StatsCards() {
  const stats: StatCardProps[] = [
    {
      title: '跟踪公司',
      value: 24,
      subtitle: '10 AI应用 + 14 供应链',
      icon: Building2,
      color: 'blue',
    },
    {
      title: '下载任务',
      value: 0,
      subtitle: '0 进行中',
      icon: Download,
      color: 'gold',
    },
    {
      title: '已下载文件',
      value: 0,
      subtitle: '0 MB 总大小',
      icon: HardDrive,
      color: 'emerald',
    },
    {
      title: '成功率',
      value: '--',
      subtitle: '暂无数据',
      icon: Activity,
      color: 'purple',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <StatCard key={i} {...stat} />
      ))}
    </div>
  );
}
