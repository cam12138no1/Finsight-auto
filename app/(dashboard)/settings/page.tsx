'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Settings, Database, Globe, Shield,
  CheckCircle2, AlertTriangle, ExternalLink, Loader2, XCircle
} from 'lucide-react';

interface HealthStatus {
  database: 'connected' | 'disconnected' | 'checking';
  worker: 'healthy' | 'degraded' | 'offline' | 'checking';
  dbVersion?: string;
}

export default function SettingsPage() {
  const [health, setHealth] = React.useState<HealthStatus>({
    database: 'checking',
    worker: 'checking',
  });

  React.useEffect(() => {
    async function checkHealth() {
      // Check Next.js API health (database)
      try {
        const res = await fetch('/api/health');
        const data = await res.json();
        if (data.success !== false) {
          setHealth(prev => ({
            ...prev,
            database: data.database?.status === 'connected' ? 'connected' : 'disconnected',
            dbVersion: data.database?.version,
          }));
        }
      } catch {
        setHealth(prev => ({ ...prev, database: 'disconnected' }));
      }

      // Check Python Worker health
      try {
        const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL || 'http://localhost:8000';
        const res = await fetch(`${workerUrl}/health`, { signal: AbortSignal.timeout(5000) });
        const data = await res.json();
        setHealth(prev => ({
          ...prev,
          worker: data.status === 'healthy' ? 'healthy' : 'degraded',
        }));
      } catch {
        setHealth(prev => ({ ...prev, worker: 'offline' }));
      }
    }
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const dbStatusIcon = {
    connected: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
    disconnected: <XCircle className="w-5 h-5 text-red-500" />,
    checking: <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />,
  };

  const workerStatusIcon = {
    healthy: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
    degraded: <AlertTriangle className="w-5 h-5 text-gold-500" />,
    offline: <XCircle className="w-5 h-5 text-red-500" />,
    checking: <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />,
  };

  const dbStatusLabel = {
    connected: '连接正常',
    disconnected: '连接失败',
    checking: '检查中...',
  };

  const workerStatusLabel = {
    healthy: '运行正常',
    degraded: '服务降级',
    offline: '离线',
    checking: '检查中...',
  };

  return (
    <div className="space-y-6 max-w-[800px] mx-auto">
      {/* System Info */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" /> 系统信息
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <span className="text-xs text-muted-foreground">版本</span>
              <p className="text-sm font-mono font-medium mt-1">v1.0.0</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <span className="text-xs text-muted-foreground">运行环境</span>
              <p className="text-sm font-medium mt-1">Render</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <span className="text-xs text-muted-foreground">前端框架</span>
              <p className="text-sm font-medium mt-1">Next.js 14</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <span className="text-xs text-muted-foreground">下载引擎</span>
              <p className="text-sm font-medium mt-1">Python FastAPI</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Database Status */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" /> 数据库
          </CardTitle>
          <CardDescription>PostgreSQL 连接状态</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            {dbStatusIcon[health.database]}
            <div>
              <p className="text-sm font-medium">{dbStatusLabel[health.database]}</p>
              <p className="text-xs text-muted-foreground">
                {health.dbVersion || 'PostgreSQL 16 - Render'}
              </p>
            </div>
            <Badge
              variant={health.database === 'connected' ? 'success' : health.database === 'checking' ? 'secondary' : 'error'}
              className="ml-auto text-[10px]"
            >
              {health.database === 'connected' ? '在线' : health.database === 'checking' ? '检查中' : '离线'}
            </Badge>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            {workerStatusIcon[health.worker]}
            <div>
              <p className="text-sm font-medium">下载引擎: {workerStatusLabel[health.worker]}</p>
              <p className="text-xs text-muted-foreground">Python FastAPI Worker</p>
            </div>
            <Badge
              variant={health.worker === 'healthy' ? 'success' : health.worker === 'checking' ? 'secondary' : 'error'}
              className="ml-auto text-[10px]"
            >
              {health.worker === 'healthy' ? '在线' : health.worker === 'checking' ? '检查中' : '离线'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Download Settings */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" /> 下载设置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">并发下载数</p>
              <p className="text-xs text-muted-foreground">同时下载的最大任务数</p>
            </div>
            <span className="text-sm font-mono">3 个</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">请求间隔</p>
              <p className="text-xs text-muted-foreground">每次下载请求之间的延迟</p>
            </div>
            <span className="text-sm font-mono">1.2 秒</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">重试次数</p>
              <p className="text-xs text-muted-foreground">下载失败后的自动重试次数（指数退避）</p>
            </div>
            <span className="text-sm font-mono">3 次</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">超时时间</p>
              <p className="text-xs text-muted-foreground">单次下载的最大等待时间</p>
            </div>
            <span className="text-sm font-mono">30 秒</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">数据源</p>
              <p className="text-xs text-muted-foreground">优先使用 SEC EDGAR API，回退到 IR 页面爬取</p>
            </div>
            <Badge variant="info" className="text-[10px]">SEC EDGAR + IR</Badge>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" /> 关于
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Finsight Auto 是 AI 行业财报自动化下载平台，覆盖 24 家 AI 龙头企业。
            系统使用 SEC EDGAR API 和公司投资者关系页面获取公开财报数据，
            支持并发下载、自动重试、内容验证等功能，仅用于研究和分析目的。
          </p>
          <div className="flex gap-2 mt-4">
            <a href="https://github.com/cam12138no1/Finsight-auto" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="text-xs gap-1">
                <ExternalLink className="w-3 h-3" /> GitHub
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
