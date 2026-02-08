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
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityItem {
  id: number;
  type: 'download_started' | 'download_completed' | 'download_failed' |
        'download_success' | 'job_created' | 'job_completed' | 'job_failed';
  message: string;
  timestamp: string;
}

const iconMap: Record<string, React.ElementType> = {
  download_started: Download,
  download_completed: CheckCircle2,
  download_success: CheckCircle2,
  download_failed: XCircle,
  job_created: Clock,
  job_completed: CheckCircle2,
  job_failed: XCircle,
};

const colorMap: Record<string, string> = {
  download_started: 'text-blue-500',
  download_completed: 'text-emerald-500',
  download_success: 'text-emerald-500',
  download_failed: 'text-red-500',
  job_created: 'text-gold-500',
  job_completed: 'text-emerald-500',
  job_failed: 'text-red-500',
};

export function RecentActivity() {
  const [activities, setActivities] = React.useState<ActivityItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchActivity() {
      try {
        const res = await fetch('/api/activity?limit=10');
        const data = await res.json();
        if (data.success && data.data?.length > 0) {
          setActivities(data.data);
        }
      } catch (err) {
        // Silently fail - activity is not critical
        console.debug('Failed to fetch activity:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchActivity();
    const interval = setInterval(fetchActivity, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">最近活动</CardTitle>
        <Badge variant="secondary" className="text-[10px]">
          实时
        </Badge>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Clock className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">暂无活动记录</p>
            <p className="text-xs mt-1">创建第一个下载任务开始使用</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => {
              const Icon = iconMap[activity.type] || Clock;
              const color = colorMap[activity.type] || 'text-muted-foreground';
              return (
                <div
                  key={`${activity.type}-${activity.id}`}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors duration-150"
                >
                  <div className={cn('mt-0.5', color)}>
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
