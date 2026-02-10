'use client'

import { Bell, User } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  user: {
    name?: string | null
    email?: string | null
  }
}

export default function Header({ user }: HeaderProps) {
  return (
    <header className="h-14 bg-card/80 backdrop-blur-xl border-b border-border flex items-center justify-between px-6">
      <div className="flex items-center space-x-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          欢迎回来，<span className="text-foreground font-semibold">{user.name || '用户'}</span>
        </h2>
      </div>

      <div className="flex items-center space-x-3">
        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
          <Bell className="h-4 w-4" />
        </Button>

        <div className="flex items-center space-x-3 pl-3 border-l border-border">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-medium text-foreground">{user.name}</p>
            <p className="text-[10px] text-muted-foreground">{user.email}</p>
          </div>
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
            {(user.name || 'U')[0].toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  )
}
