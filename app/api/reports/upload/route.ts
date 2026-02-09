import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { extractTextFromDocument } from '@/lib/document-parser'
import { analyzeFinancialReport } from '@/lib/ai/analyzer'
import { extractMetadataFromReport } from '@/lib/ai/extractor'
import { analysisStore } from '@/lib/store'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes

/**
 * ★★★ 彻底修复重复任务问题 ★★★
 * 
 * 问题排查：
 * H1: 前端重复触发 - 已通过 isSubmittingRef 防止
 * H2: 并发处理 - 使用 requestId 作为文件名实现原子去重
 * H3: 存储层重复 - 不可能，因为文件名唯一
 * H4: 更新失败 - 添加详细日志追踪
 * 
 * 解决方案：
 * 1. 使用 requestId 作为唯一文件名
 * 2. 创建记录前再次检查是否已存在
 * 3. 添加详细日志追踪整个流程
 */

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let processingId: string | null = null
  let requestId: string | null = null
  
  try {
    console.log('========================================')
    console.log('[上传] 收到新请求', new Date().toISOString())
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.log('[上传] 未授权访问')
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }
    const userId = session.user.id
    console.log('[上传] 用户已认证:', session.user?.email, 'ID:', userId)

    // Parse form data
    let formData: FormData
    try {
      formData = await request.formData()
    } catch (formError: any) {
      console.error('[上传] FormData解析失败:', formError.message)
      return NextResponse.json({ 
        error: `文件上传失败: ${formError.message.includes('body') ? '文件过大或格式错误' : formError.message}` 
      }, { status: 400 })
    }
    
    // 获取请求ID - 这是前端生成的唯一标识
    requestId = formData.get('requestId') as string | null
    
    if (!requestId) {
      requestId = `server_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      console.warn('[上传] ⚠️ 前端未提供requestId，服务端生成:', requestId)
    }
    
    console.log(`[上传] 请求ID: ${requestId}`)
    
    // ★★★ 第一次检查：是否已存在此requestId的记录 ★★★
    console.log('[上传] 检查是否已存在记录...')
    const existingAnalysis = await analysisStore.getByRequestId(userId, requestId)
    
    if (existingAnalysis) {
      console.log(`[上传] ⚠️ 发现已存在的记录!`)
      console.log(`[上传]   - ID: ${existingAnalysis.id}`)
      console.log(`[上传]   - processed: ${existingAnalysis.processed}`)
      console.log(`[上传]   - processing: ${existingAnalysis.processing}`)
      console.log(`[上传]   - error: ${existingAnalysis.error}`)
      console.log(`[上传]   - created_at: ${existingAnalysis.created_at}`)
      
      // 如果已经完成，直接返回结果
      if (existingAnalysis.processed) {
        console.log('[上传] 返回已完成的结果')
        return NextResponse.json({
          success: true,
          analysis_id: existingAnalysis.id,
          analysis: existingAnalysis,
          duplicate: true,
          message: '分析已完成',
        })
      }
      
      // 如果正在处理中，返回等待状态
      if (existingAnalysis.processing && !existingAnalysis.error) {
        console.log('[上传] 返回处理中状态')
        return NextResponse.json({
          success: false,
          analysis_id: existingAnalysis.id,
          message: '请求正在处理中，请稍候',
          duplicate: true,
          processing: true,
        }, { status: 202 })
      }
      
      // 如果有错误，允许重试（删除旧记录）
      if (existingAnalysis.error) {
        console.log(`[上传] 删除失败的旧记录: ${existingAnalysis.id}`)
        await analysisStore.delete(userId, existingAnalysis.id)
      }
    } else {
      console.log('[上传] 未发现已存在的记录，继续处理')
    }
    
    // Get files
    const financialFiles = formData.getAll('financialFiles') as File[]
    const researchFiles = formData.getAll('researchFiles') as File[]
    const category = formData.get('category') as string | null
    const userFiscalYear = formData.get('fiscalYear') as string | null
    const userFiscalQuarter = formData.get('fiscalQuarter') as string | null
    
    // Backward compatibility
    const singleFile = formData.get('file') as File | null
    if (singleFile && financialFiles.length === 0) {
      financialFiles.push(singleFile)
    }

    if (financialFiles.length === 0) {
      return NextResponse.json({ error: '请上传至少一份财报文件' }, { status: 400 })
    }

    console.log(`[上传] 文件: 财报${financialFiles.length}个, 研报${researchFiles.length}个`)

    // Validate files
    for (const file of [...financialFiles, ...researchFiles]) {
      if (file.type !== 'application/pdf') {
        return NextResponse.json({ error: `文件 ${file.name} 不是PDF格式` }, { status: 400 })
      }
    }

    const validCategories = ['AI_APPLICATION', 'AI_SUPPLY_CHAIN']
    const selectedCategory = category && validCategories.includes(category) 
      ? category as 'AI_APPLICATION' | 'AI_SUPPLY_CHAIN'
      : null

    // Extract text from financial reports
    console.log('[上传] 正在提取财报文本...')
    let financialText = ''
    for (const file of financialFiles) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer())
        const text = await extractTextFromDocument(buffer, file.type)
        if (text) {
          financialText += `\n\n=== 财报文件: ${file.name} ===\n\n${text}`
        }
      } catch (extractError: any) {
        console.error(`[上传] 提取文件 ${file.name} 失败:`, extractError.message)
      }
    }

    if (!financialText || financialText.length < 100) {
      return NextResponse.json({ error: '无法从财报PDF中提取足够的文本内容' }, { status: 400 })
    }
    console.log(`[上传] 已提取财报文本 ${financialText.length} 字符`)

    // Extract text from research reports
    let researchText = ''
    if (researchFiles.length > 0) {
      for (const file of researchFiles) {
        try {
          const buffer = Buffer.from(await file.arrayBuffer())
          const text = await extractTextFromDocument(buffer, file.type)
          if (text) {
            researchText += `\n\n=== 研报文件: ${file.name} ===\n\n${text}`
          }
        } catch (extractError: any) {
          console.error(`[上传] 提取研报 ${file.name} 失败:`, extractError.message)
        }
      }
    }

    // Extract metadata
    console.log('[上传] 正在提取元数据...')
    let metadata
    try {
      metadata = await extractMetadataFromReport(financialText)
      console.log('[上传] 元数据:', JSON.stringify(metadata))
    } catch (metadataError: any) {
      console.error('[上传] 元数据提取失败:', metadataError.message)
      return NextResponse.json({ error: `元数据提取失败: ${metadataError.message}` }, { status: 500 })
    }

    const parsedFiscalYear = userFiscalYear ? parseInt(userFiscalYear) : null
    const parsedFiscalQuarter = userFiscalQuarter ? parseInt(userFiscalQuarter) : null
    const finalFiscalYear = parsedFiscalYear || metadata.fiscal_year
    const finalFiscalQuarter = parsedFiscalQuarter || metadata.fiscal_quarter
    const period = finalFiscalQuarter 
      ? `Q${finalFiscalQuarter} ${finalFiscalYear}` 
      : `FY ${finalFiscalYear}`

    // ★★★ 第二次检查：创建记录前再次确认 ★★★
    console.log('[上传] 创建记录前再次检查...')
    const doubleCheck = await analysisStore.getByRequestId(userId, requestId)
    if (doubleCheck) {
      console.log(`[上传] ⚠️ 双重检查发现记录已存在! ID: ${doubleCheck.id}`)
      if (doubleCheck.processed) {
        return NextResponse.json({
          success: true,
          analysis_id: doubleCheck.id,
          analysis: doubleCheck,
          duplicate: true,
        })
      }
      if (doubleCheck.processing) {
        return NextResponse.json({
          success: false,
          analysis_id: doubleCheck.id,
          message: '请求正在处理中',
          duplicate: true,
          processing: true,
        }, { status: 202 })
      }
    }

    // ★★★ 创建处理记录 ★★★
    console.log('[上传] 创建处理记录...')
    const processingEntry = await analysisStore.addWithRequestId(userId, requestId, {
      company_name: metadata.company_name,
      company_symbol: metadata.company_symbol,
      report_type: metadata.report_type,
      fiscal_year: finalFiscalYear,
      fiscal_quarter: finalFiscalQuarter || undefined,
      period: period,
      category: selectedCategory || undefined,
      filing_date: metadata.filing_date,
      created_at: new Date().toISOString(),
      processed: false,
      processing: true,
      has_research_report: researchFiles.length > 0,
    })
    processingId = processingEntry.id
    console.log(`[上传] ✓ 创建处理记录成功: ${processingId}`)

    // ★★★ AI分析 ★★★
    console.log('[上传] 开始AI分析...')
    let analysis
    try {
      analysis = await analyzeFinancialReport(
        financialText, 
        {
          company: metadata.company_name,
          symbol: metadata.company_symbol,
          period: period,
          fiscalYear: finalFiscalYear,
          fiscalQuarter: finalFiscalQuarter || undefined,
          consensus: {
            revenue: metadata.revenue || undefined,
            eps: metadata.eps || undefined,
            operatingIncome: metadata.operating_income || undefined,
          },
          category: selectedCategory,
        },
        researchText || undefined
      )
      console.log('[上传] ✓ AI分析完成')
    } catch (analysisError: any) {
      console.error('[上传] ✗ AI分析失败:', analysisError.message)
      
      await analysisStore.update(userId, processingId, {
        processing: false,
        processed: false,
        error: analysisError.message || 'AI分析失败',
      })
      
      return NextResponse.json({ error: `AI分析失败: ${analysisError.message}` }, { status: 500 })
    }

    // ★★★ 更新记录为完成状态 ★★★
    console.log(`[上传] 更新记录为完成状态: ${processingId}`)
    const storedAnalysis = await analysisStore.update(userId, processingId, {
      processed: true,
      processing: false,
      error: undefined,
      ...analysis,
    })

    const duration = Date.now() - startTime
    console.log(`[上传] ✓ 全部完成! 耗时: ${duration}ms`)
    console.log('========================================')

    return NextResponse.json({
      success: true,
      analysis_id: processingId,
      metadata,
      analysis: storedAnalysis,
    })
  } catch (error: any) {
    console.error('[上传] ✗ 未预期的错误:', error)
    
    // 注意：这里无法获取userId，因为可能在session检查前就失败了
    // 但如果有processingId，说明已经通过了认证，可以尝试更新
    if (processingId && requestId) {
      try {
        const session = await getServerSession(authOptions)
        if (session?.user?.id) {
          await analysisStore.update(session.user.id, processingId, {
            processing: false,
            processed: false,
            error: error.message || '处理失败',
          })
        }
      } catch (updateError) {
        console.error('[上传] 更新错误状态失败:', updateError)
      }
    }
    
    return NextResponse.json({ error: error.message || '处理报告失败' }, { status: 500 })
  }
}
