'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Download,
  History,
  Settings,
  TrendingUp,
  Zap,
  ChevronLeft,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const mainNav: NavItem[] = [
  { title: '仪表盘', href: '/', icon: LayoutDashboard },
  { title: '公司管理', href: '/companies', icon: Building2 },
  { title: '下载中心', href: '/downloads', icon: Download },
  { title: '财报/研报', href: '/reports', icon: FileText },
  { title: '历史记录', href: '/history', icon: History },
];

const secondaryNav: NavItem[] = [
  { title: '设置', href: '/settings', icon: Settings },
];

function SystemStatus() {
  const [status, setStatus] = React.useState<'checking' | 'ok' | 'error'>('checking');

  React.useEffect(() => {
    async function check() {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          setStatus('ok');
        } else {
          setStatus('error');
        }
      } catch {
        setStatus('error');
      }
    }
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-lg bg-muted/50">
      <Zap className={cn('w-3.5 h-3.5', status === 'ok' ? 'text-emerald-500' : status === 'error' ? 'text-red-500' : 'text-muted-foreground')} />
      <span className="text-xs text-muted-foreground">
        {status === 'ok' ? '系统运行正常' : status === 'error' ? '系统异常' : '检查中...'}
      </span>
      <span className={cn('ml-auto w-2 h-2 rounded-full', status === 'ok' ? 'bg-emerald-500 animate-pulse-slow' : status === 'error' ? 'bg-red-500' : 'bg-muted-foreground')} />
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-card border-r border-border transition-all duration-300 ease-in-out',
        collapsed ? 'w-[68px]' : 'w-[260px]'
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold tracking-tight truncate">Finsight Auto</span>
              <span className="text-[10px] text-muted-foreground truncate">AI 财报分析平台</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        <div className={cn('mb-2', collapsed ? 'px-0' : 'px-2')}>
          {!collapsed && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              主要功能
            </span>
          )}
        </div>
        {mainNav.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer group',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                collapsed && 'justify-center px-0'
              )}
            >
              <item.icon className={cn(
                'w-[18px] h-[18px] shrink-0 transition-colors duration-200',
                isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
              )} />
              {!collapsed && <span className="truncate">{item.title}</span>}
              {!collapsed && item.badge && (
                <span className="ml-auto text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        <Separator className="my-4" />

        <div className={cn('mb-2', collapsed ? 'px-0' : 'px-2')}>
          {!collapsed && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              系统
            </span>
          )}
        </div>
        {secondaryNav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer group',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                collapsed && 'justify-center px-0'
              )}
            >
              <item.icon className={cn(
                'w-[18px] h-[18px] shrink-0 transition-colors duration-200',
                isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
              )} />
              {!collapsed && <span className="truncate">{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      {/* System Status & Collapse */}
      <div className="border-t border-border p-3">
        {!collapsed && (
          <SystemStatus />
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full py-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-200 cursor-pointer"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
