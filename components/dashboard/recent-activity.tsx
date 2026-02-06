'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityItem {
  id: number;
  type: 'download_started' | 'download_completed' | 'download_failed' | 'job_created';
  message: string;
  timestamp: string;
  company?: string;
}

const iconMap = {
  download_started: Download,
  download_completed: CheckCircle2,
  download_failed: XCircle,
  job_created: Clock,
};

const colorMap = {
  download_started: 'text-blue-500',
  download_completed: 'text-emerald-500',
  download_failed: 'text-red-500',
  job_created: 'text-gold-500',
};

// Placeholder data - will be replaced with real data from API
const placeholderActivities: ActivityItem[] = [
  {
    id: 1,
    type: 'job_created',
    message: '系统就绪，等待首次下载任务',
    timestamp: new Date().toISOString(),
  },
];

export function RecentActivity() {
  const activities = placeholderActivities;

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">最近活动</CardTitle>
        <Badge variant="secondary" className="text-[10px]">
          实时
        </Badge>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Clock className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">暂无活动记录</p>
            <p className="text-xs mt-1">创建第一个下载任务开始使用</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => {
              const Icon = iconMap[activity.type];
              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors duration-150 cursor-pointer"
                >
                  <div className={cn('mt-0.5', colorMap[activity.type])}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{activity.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(activity.timestamp).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground mt-1 shrink-0" />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
