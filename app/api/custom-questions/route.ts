import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { openrouter } from '@/lib/openrouter'
import { CUSTOM_EXTRACTION_PROMPT, EVALUATION_SYSTEM_PROMPT } from '@/lib/ai/prompts'
import { analysisStore } from '@/lib/store'

/**
 * Custom Questions Extraction API
 * Extract specific information based on user-defined questions
 */

export const runtime = 'nodejs'
export const maxDuration = 180

interface CustomQuestionsRequest {
  companySymbol: string
  companyName: string
  category: 'AI_APPLICATION' | 'AI_SUPPLY_CHAIN'
  questions: string[]
  evaluationCategory?: string
}

// In-memory Q&A history (fallback when KV is not available)
let qaHistory: any[] = []

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const body = await request.json()
    const { companySymbol, companyName, category, questions, evaluationCategory } = body as CustomQuestionsRequest

    if (!companySymbol || !questions || questions.length === 0) {
      return NextResponse.json(
        { error: 'Please select a company and enter questions' },
        { status: 400 }
      )
    }

    console.log(`[CustomQ] Processing ${questions.length} questions for ${companySymbol}`)

    // Get the latest analysis data for this company from our store (用户隔离)
    const allAnalyses = await analysisStore.getAll(userId)
    const companyAnalyses = allAnalyses.filter(a => 
      a.company_symbol === companySymbol || 
      a.company_symbol?.toUpperCase() === companySymbol.toUpperCase()
    )
    
    const latestAnalysis = companyAnalyses.length > 0 ? companyAnalyses[0] : null

    // Select appropriate system prompt
    const systemPrompt = evaluationCategory 
      ? EVALUATION_SYSTEM_PROMPT 
      : CUSTOM_EXTRACTION_PROMPT

    const categoryName = category === 'AI_APPLICATION' ? 'AI Application Company' : 'AI Supply Chain Company'

    // Generate answer for each question
    const answers = []

    for (const question of questions) {
      const userContent = latestAnalysis && latestAnalysis.processed
        ? `Company: ${companyName} (${companySymbol})
Category: ${categoryName}
Report Period: ${latestAnalysis.fiscal_quarter ? `Q${latestAnalysis.fiscal_quarter} ${latestAnalysis.fiscal_year}` : `FY ${latestAnalysis.fiscal_year}`}

Financial Report Analysis Data:
- One-line Conclusion: ${latestAnalysis.one_line_conclusion || 'N/A'}
- Results Summary: ${latestAnalysis.results_summary || 'N/A'}
- Results Table: ${JSON.stringify(latestAnalysis.results_table || [], null, 2)}
- Drivers: ${JSON.stringify(latestAnalysis.drivers || {}, null, 2)}
- Investment ROI: ${JSON.stringify(latestAnalysis.investment_roi || {}, null, 2)}
- Sustainability & Risks: ${JSON.stringify(latestAnalysis.sustainability_risks || {}, null, 2)}
- Final Judgment: ${JSON.stringify(latestAnalysis.final_judgment || {}, null, 2)}

User Question: ${question}

Please answer this question in detail, citing specific data and metrics.`
        : `Company: ${companyName} (${companySymbol})
Category: ${categoryName}

Note: No analyzed financial report data available for this company. Please answer based on public market information and industry knowledge.

User Question: ${question}

Please answer this question as thoroughly as possible based on public information.`

      const response = await openrouter.chat({
        model: 'google/gemini-3-pro-preview',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userContent
          }
        ],
        temperature: 0.3
      })

      answers.push({
        question,
        answer: response.choices[0].message.content
      })
    }

    // Save Q&A record
    const qaId = `customq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const qaData = {
      id: qaId,
      companySymbol,
      company_name: companyName,
      category,
      questions,
      answers,
      evaluationCategory,
      created_at: new Date().toISOString(),
      created_by: (session.user as any)?.id || 'anonymous'
    }
    
    // Store in memory
    qaHistory.unshift(qaData)
    if (qaHistory.length > 50) {
      qaHistory = qaHistory.slice(0, 50)
    }

    console.log(`[CustomQ] Generated answers: ${qaId}`)

    return NextResponse.json({
      success: true,
      qa_id: qaId,
      company: companyName,
      symbol: companySymbol,
      category,
      answers
    })

  } catch (error: any) {
    console.error('[CustomQ] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Question processing failed' },
      { status: 500 }
    )
  }
}

// Get saved Q&A history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companySymbol = searchParams.get('companySymbol')
    const limit = parseInt(searchParams.get('limit') || '10')

    let qas = qaHistory.slice(0, limit)
    
    // Filter by company if specified
    if (companySymbol) {
      qas = qas.filter(qa => qa.companySymbol === companySymbol)
    }

    return NextResponse.json({ qas })
  } catch (error: any) {
    console.error('[CustomQ] Get error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Q&A' },
      { status: 500 }
    )
  }
}
