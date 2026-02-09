// lib/session-validator.ts - 增强的Session验证
// 解决多用户同时使用时Session串联的问题

import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { NextRequest } from 'next/server'

export interface ValidatedSession {
  userId: string
  userEmail: string
  userName: string
  role: string
  permissions: string[]
  sessionId: string  // 用于追踪的唯一标识
}

/**
 * 增强的Session验证
 * 
 * 1. 验证Session存在且有效
 * 2. 生成唯一的sessionId用于日志追踪
 * 3. 记录详细的验证日志
 */
export interface SessionValidationError {
  valid: false
  error: string
  status: number
  code: 'NOT_LOGGED_IN' | 'SESSION_INVALID' | 'SESSION_EXPIRED' | 'USER_ID_MISSING' | 'AUTH_ERROR'
}

export type SessionValidationResult = 
  | { valid: true; session: ValidatedSession }
  | SessionValidationError

export async function validateSession(
  request: NextRequest,
  apiName: string
): Promise<SessionValidationResult> {
  const requestId = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
  
  console.log(`[${apiName}] [${requestId}] ========== Session验证开始 ==========`)
  
  try {
    // 获取Session
    const session = await getServerSession(authOptions)
    
    // 记录原始Session信息
    console.log(`[${apiName}] [${requestId}] Session原始数据:`, JSON.stringify({
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      expires: session?.expires,
    }))
    
    // 验证Session
    if (!session) {
      console.error(`[${apiName}] [${requestId}] ❌ Session不存在`)
      return { valid: false, error: '未登录，请先登录', status: 401, code: 'NOT_LOGGED_IN' }
    }
    
    if (!session.user) {
      console.error(`[${apiName}] [${requestId}] ❌ Session.user不存在`)
      return { valid: false, error: '会话无效，请重新登录', status: 401, code: 'SESSION_INVALID' }
    }
    
    if (!session.user.id) {
      console.error(`[${apiName}] [${requestId}] ❌ Session.user.id不存在`)
      return { valid: false, error: '用户ID无效，请重新登录', status: 401, code: 'USER_ID_MISSING' }
    }
    
    // 验证Session是否过期
    if (session.expires) {
      const expiresAt = new Date(session.expires).getTime()
      const now = Date.now()
      if (expiresAt < now) {
        console.error(`[${apiName}] [${requestId}] ❌ Session已过期: ${session.expires}`)
        return { valid: false, error: '登录已过期，请重新登录', status: 401, code: 'SESSION_EXPIRED' }
      }
    }
    
    // 生成唯一的sessionId用于追踪
    const sessionId = `sess_${session.user.id}_${requestId}`
    
    const validatedSession: ValidatedSession = {
      userId: session.user.id,
      userEmail: session.user.email || 'unknown',
      userName: session.user.name || 'unknown',
      role: (session.user as any).role || 'user',
      permissions: (session.user as any).permissions || [],
      sessionId,
    }
    
    console.log(`[${apiName}] [${requestId}] ✓ Session验证通过:`, {
      userId: validatedSession.userId,
      userEmail: validatedSession.userEmail,
      sessionId: validatedSession.sessionId,
    })
    console.log(`[${apiName}] [${requestId}] ========== Session验证完成 ==========`)
    
    return { valid: true, session: validatedSession }
    
  } catch (error: any) {
    console.error(`[${apiName}] [${requestId}] ❌ Session验证异常:`, error.message)
    console.error(`[${apiName}] [${requestId}] 错误堆栈:`, error.stack)
    return { valid: false, error: '认证服务异常，请稍后重试', status: 500, code: 'AUTH_ERROR' }
  }
}

/**
 * 验证用户是否有权限访问特定数据
 */
export function validateDataAccess(
  dataUserId: string | undefined,
  currentUserId: string,
  apiName: string
): boolean {
  if (!dataUserId) {
    // 旧数据可能没有user_id，允许访问（向后兼容）
    console.warn(`[${apiName}] 数据没有user_id，允许访问（向后兼容）`)
    return true
  }
  
  if (dataUserId !== currentUserId) {
    console.error(`[${apiName}] ❌ 数据访问被拒绝: 数据属于用户 ${dataUserId}，当前用户是 ${currentUserId}`)
    return false
  }
  
  return true
}
