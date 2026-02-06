'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Search, Bell, Moon, Sun, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const pageTitles: Record<string, { title: string; description: string }> = {
  '/': { title: '仪表盘', description: '系统概览与实时监控' },
  '/companies': { title: '公司管理', description: '管理 AI 行业上市公司' },
  '/downloads': { title: '下载中心', description: '创建和管理财报下载任务' },
  '/downloads/new': { title: '新建下载', description: '配置并启动财报下载任务' },
  '/history': { title: '历史记录', description: '查看下载历史与日志' },
  '/settings': { title: '设置', description: '系统配置与偏好设置' },
};

export function Header() {
  const pathname = usePathname();
  const [isDark, setIsDark] = React.useState(true);

  const pageInfo = pageTitles[pathname] || { title: 'Finsight Auto', description: '' };

  React.useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <header className="sticky top-0 z-30 flex items-center h-16 px-6 bg-background/80 backdrop-blur-xl border-b border-border">
      {/* Page Title */}
      <div className="flex flex-col min-w-0">
        <h1 className="text-lg font-semibold tracking-tight truncate">{pageInfo.title}</h1>
        {pageInfo.description && (
          <p className="text-xs text-muted-foreground truncate">{pageInfo.description}</p>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-muted-foreground">
          <Search className="w-4 h-4" />
          <span className="text-xs">搜索公司...</span>
          <kbd className="hidden lg:inline-flex ml-4 text-[10px] bg-background px-1.5 py-0.5 rounded border border-border">
            ⌘K
          </kbd>
        </div>

        {/* Refresh */}
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <RefreshCw className="w-4 h-4" />
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="text-muted-foreground relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-gold-500" />
        </Button>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground"
          onClick={() => setIsDark(!isDark)}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </div>
    </header>
  );
}
