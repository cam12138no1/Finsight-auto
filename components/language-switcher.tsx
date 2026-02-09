'use client'

import { useTransition } from 'react'
import { useLocale } from 'next-intl'
import { Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function LanguageSwitcher() {
  const locale = useLocale()
  const [isPending, startTransition] = useTransition()

  const toggleLocale = () => {
    const newLocale = locale === 'en' ? 'zh' : 'en'
    
    startTransition(() => {
      document.cookie = `locale=${newLocale};path=/;max-age=31536000`
      window.location.reload()
    })
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLocale}
      disabled={isPending}
      className="flex items-center gap-2"
    >
      <Globe className="h-4 w-4" />
      <span>{locale === 'en' ? '中文' : 'English'}</span>
    </Button>
  )
}
