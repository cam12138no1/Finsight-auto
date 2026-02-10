'use client'

import {
  BarChart3, Download, LogOut, TrendingUp, Moon, Sun,
  Activity, Shield
} from 'lucide-react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { useState, useEffect } from 'react'

export default function Sidebar() {
  const pathname = usePathname()
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('finsight-theme')
    if (saved === 'dark') {
      setIsDark(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    if (next) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('finsight-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('finsight-theme', 'light')
    }
  }

  const navigation = [
    {
      name: '财报分析',
      href: '/dashboard',
      icon: BarChart3,
      description: 'AI 投委会级分析',
      isActive: (p: string) => p === '/dashboard' || p.startsWith('/dashboard/reports') || p.startsWith('/dashboard/comparison'),
    },
    {
      name: '自动下载',
      href: '/dashboard/downloads',
      icon: Download,
      description: 'SEC EDGAR 财报',
      isActive: (p: string) => p.startsWith('/dashboard/downloads'),
    },
  ]

  return (
    <div className="w-[256px] bg-[hsl(var(--sidebar-bg))] flex flex-col border-r border-white/[0.04] relative shrink-0">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-600/[0.02] to-transparent pointer-events-none" />

      {/* Logo */}
      <div className="relative h-[64px] flex items-center px-5 border-b border-white/[0.06]">
        <Link href="/dashboard" className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-600/20">
              <TrendingUp className="h-[18px] w-[18px] text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[hsl(var(--sidebar-bg))]" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-white tracking-tight leading-none">
              FinSight
            </h1>
            <p className="text-[10px] text-slate-500 mt-0.5 tracking-wide font-medium">
              AI Financial Intelligence
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="relative flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        <p className="px-3 mb-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
          Analysis
        </p>

        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = item.isActive(pathname)

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-blue-500/10 text-blue-400'
                  : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
              }`}
            >
              <div className={`flex items-center justify-center w-8 h-8 rounded-lg mr-3 transition-colors duration-200 ${
                isActive ? 'bg-blue-500/15' : 'bg-white/[0.03] group-hover:bg-white/[0.06]'
              }`}>
                <Icon className={`h-[16px] w-[16px] ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="block text-[13px] leading-tight">{item.name}</span>
                <span className={`text-[10px] leading-tight ${isActive ? 'text-blue-400/50' : 'text-slate-600'}`}>
                  {item.description}
                </span>
              </div>
              {isActive && (
                <div className="w-1 h-5 bg-blue-500 rounded-full ml-2 shadow-[0_0_8px_rgba(59,130,246,0.3)]" />
              )}
            </Link>
          )
        })}

        {/* Worker Status */}
        <div className="!mt-5">
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
            System
          </p>
        </div>
        <div className="px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <div className="flex items-center gap-2 mb-1.5">
            <Activity className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-[11px] font-medium text-slate-400">Worker</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
            <span className="text-[10px] text-emerald-400 font-medium">Online</span>
            <span className="text-[10px] text-slate-600 ml-auto">Render</span>
          </div>
        </div>
      </nav>

      {/* Bottom */}
      <div className="relative p-3 border-t border-white/[0.06] space-y-0.5">
        <button
          onClick={toggleTheme}
          className="flex items-center w-full px-3 py-2 text-[12px] text-slate-500 rounded-lg hover:bg-white/[0.04] hover:text-slate-300 transition-all duration-200 cursor-pointer"
        >
          {isDark ? <Sun className="mr-2.5 h-4 w-4" /> : <Moon className="mr-2.5 h-4 w-4" />}
          {isDark ? '浅色模式' : '深色模式'}
        </button>
        <button
          onClick={() => signOut({ callbackUrl: '/auth/signin' })}
          className="flex items-center w-full px-3 py-2 text-[12px] text-slate-500 rounded-lg hover:bg-rose-500/10 hover:text-rose-400 transition-all duration-200 cursor-pointer"
        >
          <LogOut className="mr-2.5 h-4 w-4" />
          退出登录
        </button>
        <div className="flex items-center justify-center gap-1.5 pt-1.5 pb-0.5">
          <Shield className="h-3 w-3 text-slate-700" />
          <span className="text-[9px] text-slate-700 font-medium tracking-wider">v2.0 INSTITUTIONAL</span>
        </div>
      </div>
    </div>
  )
}
