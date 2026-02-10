'use client'

import { BarChart3, Download, LogOut, TrendingUp, Moon, Sun, Activity, Shield } from 'lucide-react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { useState, useEffect } from 'react'

/* MASTER.md: sidebar-bg #0F172A, IBM Plex Sans, 200ms transitions, cursor-pointer */

export default function Sidebar() {
  const pathname = usePathname()
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('finsight-theme') === 'dark') {
      setIsDark(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('finsight-theme', next ? 'dark' : 'light')
  }

  const nav = [
    { name: '财报分析', href: '/dashboard', icon: BarChart3, desc: 'AI 投委会级分析',
      active: (p: string) => p === '/dashboard' || p.startsWith('/dashboard/reports') || p.startsWith('/dashboard/comparison') },
    { name: '自动下载', href: '/dashboard/downloads', icon: Download, desc: 'SEC EDGAR 财报',
      active: (p: string) => p.startsWith('/dashboard/downloads') },
  ]

  return (
    <aside className="w-[248px] bg-[hsl(var(--sidebar-bg))] flex flex-col shrink-0 border-r border-white/[0.06] relative select-none">
      {/* Brand */}
      <Link href="/dashboard" className="h-16 flex items-center gap-3 px-5 border-b border-white/[0.06] cursor-pointer">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-600/20 shrink-0">
          <TrendingUp className="h-[18px] w-[18px] text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-bold text-white leading-none tracking-tight">FinSight</p>
          <p className="text-[10px] text-slate-500 mt-0.5 font-medium tracking-wide">AI Financial Intelligence</p>
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex-1 px-3 pt-5 pb-3 space-y-1 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600">功能</p>
        {nav.map(item => {
          const Icon = item.icon
          const isActive = item.active(pathname)
          return (
            <Link key={item.href} href={item.href}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer ${
                isActive ? 'bg-white/[0.08] text-white' : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
              }`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-200 ${
                isActive ? 'bg-blue-500/20' : 'bg-white/[0.04] group-hover:bg-white/[0.06]'
              }`}>
                <Icon className={`h-4 w-4 ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-tight truncate">{item.name}</p>
                <p className={`text-[11px] leading-tight truncate ${isActive ? 'text-slate-400' : 'text-slate-600'}`}>{item.desc}</p>
              </div>
              {isActive && <div className="w-1 h-4 rounded-full bg-blue-500 shrink-0" />}
            </Link>
          )
        })}

        {/* Status */}
        <div className="!mt-5 px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span className="text-[11px] text-slate-400 font-medium">Worker</span>
            <span className="ml-auto flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
              <span className="text-[10px] text-emerald-400">Online</span>
            </span>
          </div>
        </div>
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-white/[0.06] space-y-0.5">
        <button onClick={toggleTheme}
          className="flex items-center gap-2.5 w-full px-3 py-2 text-[12px] text-slate-500 rounded-lg hover:bg-white/[0.04] hover:text-slate-300 transition-all duration-200 cursor-pointer">
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {isDark ? '浅色模式' : '深色模式'}
        </button>
        <button onClick={() => signOut({ callbackUrl: '/auth/signin' })}
          className="flex items-center gap-2.5 w-full px-3 py-2 text-[12px] text-slate-500 rounded-lg hover:bg-rose-500/10 hover:text-rose-400 transition-all duration-200 cursor-pointer">
          <LogOut className="h-4 w-4" />
          退出登录
        </button>
        <div className="flex items-center justify-center gap-1.5 pt-1">
          <Shield className="h-3 w-3 text-slate-700" />
          <span className="text-[9px] text-slate-700 tracking-wider font-medium">INSTITUTIONAL v2.0</span>
        </div>
      </div>
    </aside>
  )
}
