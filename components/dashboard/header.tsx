'use client'

import { useTranslations } from 'next-intl'
import { Bell, User } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  user: {
    name?: string | null
    email?: string | null
  }
}

export default function Header({ user }: HeaderProps) {
  const t = useTranslations()

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center space-x-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {t('dashboard.welcomeBack')}, {user.name || '用户'}
        </h2>
      </div>

      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5 text-gray-600" />
        </Button>

        <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-600">{user.email}</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <User className="h-5 w-5 text-white" />
          </div>
        </div>
      </div>
    </header>
  )
}
