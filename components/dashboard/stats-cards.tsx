'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Building2,
  Download,
  HardDrive,
  Activity,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { cn, formatBytes } from '@/lib/utils';
import type { DashboardStats } from '@/types';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: { value: number; label: string };
  color?: 'blue' | 'gold' | 'emerald' | 'purple';
  loading?: boolean;
}

function StatCard({ title, value, subtitle, icon: Icon, trend, color = 'blue', loading }: StatCardProps) {
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
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mt-1" />
            ) : (
              <span className="stat-number text-foreground">{value}</span>
            )}
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
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        if (data.success) {
          setStats(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const cards: StatCardProps[] = [
    {
      title: '跟踪公司',
      value: stats?.total_companies ?? 24,
      subtitle: `${stats?.active_companies ?? 24} 家活跃`,
      icon: Building2,
      color: 'blue',
      loading,
    },
    {
      title: '下载任务',
      value: stats?.total_jobs ?? 0,
      subtitle: `${stats?.running_jobs ?? 0} 进行中`,
      icon: Download,
      color: 'gold',
      loading,
    },
    {
      title: '已下载文件',
      value: stats?.total_files_downloaded ?? 0,
      subtitle: stats ? `${formatBytes(stats.total_download_size)} 总大小` : '0 B 总大小',
      icon: HardDrive,
      color: 'emerald',
      loading,
    },
    {
      title: '成功率',
      value: stats?.success_rate ? `${stats.success_rate}%` : '--',
      subtitle: stats?.success_rate ? '基于所有下载任务' : '暂无数据',
      icon: Activity,
      color: 'purple',
      loading,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((stat, i) => (
        <StatCard key={i} {...stat} />
      ))}
    </div>
  );
}
