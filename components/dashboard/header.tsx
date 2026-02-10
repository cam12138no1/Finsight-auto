'use client'

import { Bell, Search, User, ChevronRight, Globe } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'

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

  // Build breadcrumbs
  const segments = pathname.split('/').filter(Boolean)
  const crumbs: { label: string; path: string }[] = []
  let currentPath = ''
  for (const seg of segments) {
    currentPath += `/${seg}`
    const label = breadcrumbMap[currentPath]
    if (label) {
      crumbs.push({ label, path: currentPath })
    }
  }

  const initials = (user.name || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <header className="h-[60px] bg-card/60 backdrop-blur-2xl border-b border-border/50 flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        {crumbs.map((crumb, i) => (
          <div key={crumb.path} className="flex items-center gap-2 min-w-0">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 shrink-0" />}
            <span className={`text-sm truncate ${
              i === crumbs.length - 1
                ? 'font-semibold text-foreground'
                : 'font-medium text-muted-foreground'
            }`}>
              {crumb.label}
            </span>
          </div>
        ))}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
        >
          <div className="relative">
            <Bell className="h-4 w-4" />
          </div>
        </Button>

        {/* Divider */}
        <div className="w-px h-6 bg-border/60 mx-1" />

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-1">
          <div className="text-right hidden sm:block">
            <p className="text-[12px] font-semibold text-foreground leading-none">{user.name || 'User'}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">{user.email}</p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-600 dark:to-slate-800 flex items-center justify-center text-white text-[11px] font-bold shadow-sm">
            {initials}
          </div>
        </div>
      </div>
    </header>
  )
}
