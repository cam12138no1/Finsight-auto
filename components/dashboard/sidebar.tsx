'use client'

import { BarChart3, Download, LogOut, LayoutGrid, TrendingUp, Moon, Sun } from 'lucide-react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
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
      isActive: (p: string) => p === '/dashboard' || p.startsWith('/dashboard/reports') || p.startsWith('/dashboard/comparison')
    },
    {
      name: '自动下载',
      href: '/dashboard/downloads',
      icon: Download,
      description: 'SEC EDGAR 财报',
      isActive: (p: string) => p.startsWith('/dashboard/downloads')
    },
  ]

  return (
    <div className="w-64 bg-[hsl(var(--sidebar-bg))] flex flex-col border-r border-slate-800/50">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-slate-700/30">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">
              FinSight
            </h1>
            <p className="text-[10px] text-slate-400 tracking-wide">AI 财报分析平台</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-1">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          功能
        </p>
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = item.isActive(pathname)

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600/15 text-blue-400 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-700/40 hover:text-slate-200'
              }`}
            >
              <Icon className={`mr-3 h-[18px] w-[18px] ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
              <div className="flex-1 min-w-0">
                <span className="block text-[13px]">{item.name}</span>
                <span className={`text-[10px] ${isActive ? 'text-blue-400/60' : 'text-slate-600'}`}>
                  {item.description}
                </span>
              </div>
              {isActive && <div className="w-1 h-6 bg-blue-500 rounded-full" />}
            </Link>
          )
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-3 border-t border-slate-700/30 space-y-2">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center w-full px-3 py-2 text-xs text-slate-400 rounded-lg hover:bg-slate-700/40 hover:text-slate-200 transition-colors"
        >
          {isDark ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
          {isDark ? '浅色模式' : '深色模式'}
        </button>

        {/* User + Logout */}
        <Button
          variant="ghost"
          className="w-full justify-start text-xs text-slate-400 hover:text-white hover:bg-slate-700/40 h-9"
          onClick={() => signOut({ callbackUrl: '/auth/signin' })}
        >
          <LogOut className="mr-2 h-4 w-4 text-slate-500" />
          退出登录
        </Button>
      </div>
    </div>
  )
}
