'use client'

import { Bell, Menu, ChevronRight, TrendingUp } from 'lucide-react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface HeaderProps {
  user: {
    name?: string | null
    email?: string | null
  }
}

const breadcrumbMap: Record<string, string> = {
  '/dashboard': '财报分析',
  '/dashboard/reports': '研报管理',
  '/dashboard/comparison': '对比分析',
  '/dashboard/downloads': '下载中心',
  '/dashboard/downloads/new': '新建下载任务',
}

export default function Header({ user }: HeaderProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const segments = pathname.split('/').filter(Boolean)
  const crumbs: { label: string; path: string }[] = []
  let currentPath = ''
  for (const seg of segments) {
    currentPath += `/${seg}`
    const label = breadcrumbMap[currentPath]
    if (label) crumbs.push({ label, path: currentPath })
  }

  const initials = (user.name || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <>
      <header className="h-[56px] bg-card/60 backdrop-blur-2xl border-b border-border/50 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
        {/* Left: Mobile menu + Breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 min-w-0">
            {crumbs.map((crumb, i) => (
              <div key={crumb.path} className="flex items-center gap-1.5 min-w-0">
                {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />}
                {i < crumbs.length - 1 ? (
                  <Link
                    href={crumb.path}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors truncate cursor-pointer"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-sm font-semibold text-foreground truncate">
                    {crumb.label}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
          >
            <Bell className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-border/60 mx-1 hidden sm:block" />

          <div className="flex items-center gap-2.5 pl-1">
            <div className="text-right hidden sm:block">
              <p className="text-[12px] font-semibold text-foreground leading-none">{user.name || 'User'}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">{user.email}</p>
            </div>
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-600 dark:to-slate-800 flex items-center justify-center text-white text-[11px] font-bold">
              {initials}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-[280px] bg-[hsl(var(--sidebar-bg))] shadow-2xl animate-fade-in">
            {/* Mobile nav header */}
            <div className="h-[64px] flex items-center px-5 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center">
                  <TrendingUp className="h-[18px] w-[18px] text-white" />
                </div>
                <div>
                  <h1 className="text-[15px] font-bold text-white">FinSight</h1>
                  <p className="text-[10px] text-slate-500">AI Financial Intelligence</p>
                </div>
              </div>
            </div>
            <nav className="px-3 py-5 space-y-1">
              {Object.entries(breadcrumbMap)
                .filter(([path]) => !path.includes('/new'))
                .map(([path, label]) => {
                  const isActive = pathname === path || (path !== '/dashboard' && pathname.startsWith(path))
                  return (
                    <Link
                      key={path}
                      href={path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block px-4 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                        isActive ? 'bg-blue-500/10 text-blue-400' : 'text-slate-400 hover:bg-white/[0.04] hover:text-white'
                      }`}
                    >
                      {label}
                    </Link>
                  )
                })}
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
