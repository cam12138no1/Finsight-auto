'use client'

import { Bell, Menu, ChevronRight, TrendingUp, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'

/* MASTER.md: header-height 56px, glass backdrop, breadcrumb nav, cursor-pointer */

interface HeaderProps {
  user: { name?: string | null; email?: string | null }
}

const crumbLabels: Record<string, string> = {
  '/dashboard': '财报分析',
  '/dashboard/reports': '研报管理',
  '/dashboard/comparison': '对比分析',
  '/dashboard/downloads': '下载中心',
  '/dashboard/downloads/new': '新建下载',
}

export default function Header({ user }: HeaderProps) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  // Build breadcrumbs
  const crumbs: { label: string; path: string }[] = []
  let cur = ''
  for (const seg of pathname.split('/').filter(Boolean)) {
    cur += `/${seg}`
    if (crumbLabels[cur]) crumbs.push({ label: crumbLabels[cur], path: cur })
  }

  const initials = (user.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <>
      <header className="h-14 bg-card/80 backdrop-blur-xl border-b border-border/50 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile hamburger */}
          <button onClick={() => setMenuOpen(true)}
            className="md:hidden p-1.5 -ml-1 rounded-lg text-muted-foreground hover:bg-muted cursor-pointer">
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1 min-w-0" aria-label="Breadcrumb">
            {crumbs.map((c, i) => (
              <div key={c.path} className="flex items-center gap-1 min-w-0">
                {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />}
                {i < crumbs.length - 1 ? (
                  <Link href={c.path} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors truncate cursor-pointer">
                    {c.label}
                  </Link>
                ) : (
                  <span className="text-sm font-semibold text-foreground truncate">{c.label}</span>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 shrink-0">
          <button className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer">
            <Bell className="h-4 w-4" />
          </button>
          <div className="w-px h-5 bg-border hidden sm:block mx-1" />
          <div className="flex items-center gap-2.5">
            <div className="text-right hidden sm:block">
              <p className="text-[12px] font-semibold text-foreground leading-none">{user.name || 'User'}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{user.email}</p>
            </div>
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-500 dark:to-slate-700 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
              {initials}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[280px] bg-[hsl(var(--sidebar-bg))] shadow-2xl flex flex-col animate-fade-in">
            <div className="h-14 flex items-center justify-between px-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-bold text-white">FinSight</span>
              </div>
              <button onClick={() => setMenuOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-white/[0.06] cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {Object.entries(crumbLabels)
                .filter(([p]) => !p.endsWith('/new'))
                .map(([path, label]) => {
                  const active = pathname === path || (path !== '/dashboard' && pathname.startsWith(path))
                  return (
                    <Link key={path} href={path} onClick={() => setMenuOpen(false)}
                      className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                        active ? 'bg-white/[0.08] text-white' : 'text-slate-400 hover:bg-white/[0.04] hover:text-white'
                      }`}>
                      {label}
                    </Link>
                  )
                })}
            </nav>
          </aside>
        </div>
      )}
    </>
  )
}
