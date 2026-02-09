'use client'

import { useSession, signOut } from 'next-auth/react'
import { useEffect, useCallback, useRef } from 'react'
import { toast } from '@/components/ui/toaster'

interface UseSessionMonitorOptions {
  /** 检查间隔（毫秒），默认 60 秒 */
  checkInterval?: number
  /** 是否在Session过期时自动登出，默认 true */
  autoSignOut?: boolean
  /** Session过期前多少秒开始警告，默认 300 秒（5分钟） */
  warningBeforeExpiry?: number
  /** 是否启用监控，默认 true */
  enabled?: boolean
}

interface SessionMonitorResult {
  /** Session是否有效 */
  isValid: boolean
  /** Session是否即将过期 */
  isExpiringSoon: boolean
  /** 距离过期的秒数 */
  secondsUntilExpiry: number | null
  /** 手动刷新Session */
  refreshSession: () => Promise<void>
  /** 手动检查Session状态 */
  checkSession: () => Promise<boolean>
}

/**
 * Session状态监控Hook
 * 
 * 功能：
 * 1. 定期检查Session状态
 * 2. 在Session即将过期时发出警告
 * 3. 在Session过期时自动登出或提示用户
 * 4. 提供手动刷新和检查方法
 */
export function useSessionMonitor(options: UseSessionMonitorOptions = {}): SessionMonitorResult {
  const {
    checkInterval = 60000, // 默认60秒检查一次
    autoSignOut = true,
    warningBeforeExpiry = 300, // 默认5分钟前警告
    enabled = true,
  } = options

  const { data: session, status, update } = useSession()
  const lastWarningRef = useRef<number>(0)
  const hasShownExpiryWarning = useRef(false)

  // 计算距离过期的秒数
  const getSecondsUntilExpiry = useCallback((): number | null => {
    if (!session?.expires) return null
    const expiresAt = new Date(session.expires).getTime()
    const now = Date.now()
    return Math.max(0, Math.floor((expiresAt - now) / 1000))
  }, [session?.expires])

  // 检查Session是否有效
  const checkSession = useCallback(async (): Promise<boolean> => {
    try {
      // 调用服务端API验证Session
      const response = await fetch('/api/auth/session')
      if (!response.ok) {
        console.error('[SessionMonitor] Session验证失败:', response.status)
        return false
      }
      
      const data = await response.json()
      
      // 检查Session是否存在且有用户信息
      if (!data || !data.user || !data.user.id) {
        console.warn('[SessionMonitor] Session无效或已过期')
        return false
      }
      
      // 检查是否过期
      if (data.expires) {
        const expiresAt = new Date(data.expires).getTime()
        if (expiresAt < Date.now()) {
          console.warn('[SessionMonitor] Session已过期')
          return false
        }
      }
      
      return true
    } catch (error) {
      console.error('[SessionMonitor] 检查Session时出错:', error)
      return false
    }
  }, [])

  // 刷新Session
  const refreshSession = useCallback(async () => {
    try {
      console.log('[SessionMonitor] 刷新Session...')
      await update()
      console.log('[SessionMonitor] Session已刷新')
    } catch (error) {
      console.error('[SessionMonitor] 刷新Session失败:', error)
    }
  }, [update])

  // 处理Session过期
  const handleSessionExpired = useCallback(() => {
    console.warn('[SessionMonitor] Session已过期')
    
    toast({
      title: '登录已过期',
      description: '您的登录状态已过期，请重新登录',
      variant: 'destructive',
    })
    
    if (autoSignOut) {
      // 延迟1秒后登出，让用户看到提示
      setTimeout(() => {
        signOut({ callbackUrl: '/auth/signin?expired=true' })
      }, 1000)
    }
  }, [autoSignOut])

  // 处理Session即将过期警告
  const handleExpiryWarning = useCallback((secondsLeft: number) => {
    const now = Date.now()
    // 防止频繁警告（至少间隔60秒）
    if (now - lastWarningRef.current < 60000) return
    lastWarningRef.current = now

    const minutesLeft = Math.ceil(secondsLeft / 60)
    
    toast({
      title: '登录即将过期',
      description: `您的登录状态将在 ${minutesLeft} 分钟后过期，请保存工作并重新登录`,
      variant: 'default',
    })
  }, [])

  // 定期检查Session状态
  useEffect(() => {
    if (!enabled || status !== 'authenticated') return

    const checkAndWarn = async () => {
      const secondsLeft = getSecondsUntilExpiry()
      
      if (secondsLeft === null) return
      
      // Session已过期
      if (secondsLeft <= 0) {
        handleSessionExpired()
        return
      }
      
      // Session即将过期（在警告阈值内）
      if (secondsLeft <= warningBeforeExpiry && !hasShownExpiryWarning.current) {
        hasShownExpiryWarning.current = true
        handleExpiryWarning(secondsLeft)
      }
      
      // 验证Session是否真的有效（防止JWT被篡改或服务端已失效）
      const isValid = await checkSession()
      if (!isValid) {
        handleSessionExpired()
      }
    }

    // 立即检查一次
    checkAndWarn()

    // 设置定期检查
    const intervalId = setInterval(checkAndWarn, checkInterval)

    return () => {
      clearInterval(intervalId)
    }
  }, [
    enabled,
    status,
    checkInterval,
    warningBeforeExpiry,
    getSecondsUntilExpiry,
    checkSession,
    handleSessionExpired,
    handleExpiryWarning,
  ])

  // 重置警告状态（当Session更新时）
  useEffect(() => {
    hasShownExpiryWarning.current = false
  }, [session?.expires])

  const secondsUntilExpiry = getSecondsUntilExpiry()
  const isExpiringSoon = secondsUntilExpiry !== null && secondsUntilExpiry <= warningBeforeExpiry
  const isValid = status === 'authenticated' && (secondsUntilExpiry === null || secondsUntilExpiry > 0)

  return {
    isValid,
    isExpiringSoon,
    secondsUntilExpiry,
    refreshSession,
    checkSession,
  }
}

/**
 * 在执行敏感操作前验证Session
 * 
 * 使用示例：
 * ```tsx
 * const { validateBeforeAction } = useSessionGuard()
 * 
 * const handleUpload = async () => {
 *   const isValid = await validateBeforeAction()
 *   if (!isValid) return // 用户会被提示重新登录
 *   
 *   // 继续上传操作...
 * }
 * ```
 */
export function useSessionGuard() {
  const { checkSession } = useSessionMonitor({ enabled: false })

  const validateBeforeAction = useCallback(async (): Promise<boolean> => {
    const isValid = await checkSession()
    
    if (!isValid) {
      toast({
        title: '登录已过期',
        description: '请重新登录后再进行此操作',
        variant: 'destructive',
      })
      
      // 延迟后跳转到登录页
      setTimeout(() => {
        signOut({ callbackUrl: '/auth/signin?expired=true' })
      }, 1500)
      
      return false
    }
    
    return true
  }, [checkSession])

  return { validateBeforeAction }
}
