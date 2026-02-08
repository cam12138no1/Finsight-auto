'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Bell, Moon, Sun, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { COMPANIES } from '@/lib/companies';

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
  const router = useRouter();
  const [isDark, setIsDark] = React.useState(true);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const pageInfo = pageTitles[pathname] || { title: 'Finsight Auto', description: '' };

  // Persist theme preference
  React.useEffect(() => {
    const saved = localStorage.getItem('finsight-theme');
    if (saved === 'light') {
      setIsDark(false);
    }
  }, []);

  React.useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('finsight-theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('finsight-theme', 'light');
    }
  }, [isDark]);

  // Keyboard shortcut for search
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Search results
  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return COMPANIES.filter(
      c => c.name.toLowerCase().includes(q) ||
           c.ticker.toLowerCase().includes(q) ||
           c.description.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [searchQuery]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

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
        <div className="relative">
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span className="text-xs">搜索公司...</span>
            <kbd className="hidden lg:inline-flex ml-4 text-[10px] bg-background px-1.5 py-0.5 rounded border border-border">
              ⌘K
            </kbd>
          </button>

          {/* Search dropdown */}
          {searchOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50">
              <div className="flex items-center gap-2 p-3 border-b border-border">
                <Search className="w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="搜索公司名称或代码..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  autoFocus
                />
                <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }}>
                  <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
              {searchResults.length > 0 ? (
                <div className="max-h-64 overflow-y-auto py-1">
                  {searchResults.map(company => (
                    <button
                      key={company.ticker}
                      onClick={() => {
                        router.push('/companies');
                        setSearchOpen(false);
                        setSearchQuery('');
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {company.ticker.slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{company.name}</p>
                        <p className="text-xs text-muted-foreground">{company.ticker} · {company.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchQuery && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  未找到匹配公司
                </div>
              )}
            </div>
          )}
        </div>

        {/* Refresh */}
        <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={handleRefresh}>
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
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
