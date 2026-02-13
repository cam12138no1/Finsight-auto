import { getRequestConfig } from 'next-intl/server'

// Only support Chinese now
export const locales = ['zh'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'zh'

export default getRequestConfig(async () => {
  // Always use Chinese
  return {
    locale: 'zh',
    messages: (await import(`../messages/zh.json`)).default,
  }
})
