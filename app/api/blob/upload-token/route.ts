import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/session-validator'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'

export const runtime = 'nodejs'

/**
 * Vercel Blob 客户端上传 Token API
 * 
 * ★★★ 增强的Session验证 ★★★
 * 使用统一的Session验证机制，确保用户身份正确
 */
export async function POST(request: NextRequest) {
  console.log('[Blob Upload Token] ========== 开始处理请求 ==========')
  
  try {
    // 检查环境变量
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN
    if (!blobToken) {
      console.error('[Blob Upload Token] ❌ BLOB_READ_WRITE_TOKEN 未配置')
      return NextResponse.json(
        { error: 'Blob存储未配置，请联系管理员' },
        { status: 500 }
      )
    }
    console.log('[Blob Upload Token] ✓ BLOB_READ_WRITE_TOKEN 已配置')

    // ★★★ 使用增强的Session验证 ★★★
    const sessionResult = await validateSession(request, 'Blob Upload Token')
    if (!sessionResult.valid) {
      return NextResponse.json(
        { error: sessionResult.error, code: sessionResult.code },
        { status: sessionResult.status }
      )
    }

    const userId = sessionResult.session.userId
    const userEmail = sessionResult.session.userEmail
    const sessionId = sessionResult.session.sessionId

    console.log(`[Blob Upload Token] [${sessionId}] 用户验证通过: ${userEmail} (ID: ${userId})`)

    // 解析请求体
    let body: HandleUploadBody
    try {
      const rawBody = await request.text()
      console.log(`[Blob Upload Token] [${sessionId}] 原始请求体长度:`, rawBody.length)
      body = JSON.parse(rawBody)
      console.log(`[Blob Upload Token] [${sessionId}] 请求类型:`, body.type)
      if (body.type === 'blob.generate-client-token') {
        console.log(`[Blob Upload Token] [${sessionId}] pathname:`, (body.payload as any)?.pathname)
      }
    } catch (parseError: any) {
      console.error(`[Blob Upload Token] [${sessionId}] ❌ 请求体解析失败:`, parseError.message)
      return NextResponse.json({ error: '请求体解析失败' }, { status: 400 })
    }

    // 使用 handleUpload 处理上传请求
    console.log(`[Blob Upload Token] [${sessionId}] 调用 handleUpload...`)
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        console.log(`[Blob Upload Token] [${sessionId}] onBeforeGenerateToken - pathname:`, pathname)
        
        // 验证文件类型
        const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt']
        const ext = pathname.toLowerCase().substring(pathname.lastIndexOf('.'))
        
        if (!allowedExtensions.includes(ext)) {
          console.error(`[Blob Upload Token] [${sessionId}] ❌ 不支持的文件类型:`, ext)
          throw new Error(`不支持的文件类型: ${ext}`)
        }

        console.log(`[Blob Upload Token] [${sessionId}] ✓ 文件类型验证通过:`, ext)

        return {
          allowedContentTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
          ],
          maximumSizeInBytes: 500 * 1024 * 1024, // 500MB
          tokenPayload: JSON.stringify({
            userId: userId,
            userEmail: userEmail,
            sessionId: sessionId,
            uploadedAt: new Date().toISOString(),
          }),
        }
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // 文件上传完成后的回调
        console.log(`[Blob Upload Token] ✓ 文件上传完成:`, blob.pathname)
        try {
          const payload = JSON.parse(tokenPayload || '{}')
          console.log(`[Blob Upload Token] 上传用户: ${payload.userEmail} (ID: ${payload.userId})`)
        } catch (e) {
          // ignore parse error
        }
      },
    })

    console.log(`[Blob Upload Token] [${sessionId}] ✓ handleUpload 成功`)
    console.log('[Blob Upload Token] ========== 请求处理完成 ==========')
    return NextResponse.json(jsonResponse)
  } catch (error: any) {
    console.error('[Blob Upload Token] ❌ 错误:', error.message || error)
    console.error('[Blob Upload Token] 错误堆栈:', error.stack)
    
    // 返回更详细的错误信息
    return NextResponse.json(
      { 
        error: error.message || '获取上传token失败',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
