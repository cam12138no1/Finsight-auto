'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Download,
  Calendar,
  Zap,
  FileSearch,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickAction {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  color: string;
}

const actions: QuickAction[] = [
  {
    title: '新建下载任务',
    description: '配置年份、季度和公司进行下载',
    href: '/downloads/new',
    icon: Download,
    color: 'text-blue-500 bg-blue-500/10',
  },
  {
    title: '下载最新季报',
    description: '一键下载所有公司最新季度报告',
    href: '/downloads/new?preset=latest',
    icon: Zap,
    color: 'text-gold-500 bg-gold-500/10',
  },
  {
    title: '按年度批量下载',
    description: '下载指定年度所有公司全年财报',
    href: '/downloads/new?preset=annual',
    icon: Calendar,
    color: 'text-emerald-500 bg-emerald-500/10',
  },
  {
    title: '查看下载日志',
    description: '浏览所有下载记录和文件详情',
    href: '/history',
    icon: FileSearch,
    color: 'text-purple-500 bg-purple-500/10',
  },
];

export function QuickActions() {
  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">快速操作</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {actions.map((action) => (
            <Link key={action.href} href={action.href}>
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-muted/50 transition-all duration-200 cursor-pointer group">
                <div className={cn('p-2 rounded-lg shrink-0', action.color)}>
                  <action.icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium group-hover:text-primary transition-colors duration-200">
                    {action.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
