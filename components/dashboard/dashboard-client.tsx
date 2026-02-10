'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Plus, Upload, Loader2, TrendingUp, TrendingDown, Minus, ChevronRight, FileText, Building2, Cpu, Trash2, Filter, X, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'
import UploadModal from './upload-modal'
import AnalysisModal from './analysis-modal'
import FilingSelector from './filing-selector'

interface Analysis {
  id: string
  company_name: string
  company_symbol: string
  period: string
  category: string
  fiscal_year?: number
  fiscal_quarter?: number
  processed: boolean
  processing?: boolean
  error?: string
  created_at: string
  one_line_conclusion?: string
  results_summary?: string
  results_table?: Array<{
    metric: string
    actual: string
    consensus: string
    delta: string
    assessment: string
    importance?: string
  }>
  results_explanation?: string
  drivers_summary?: string
  drivers?: {
    demand?: {
      title: string
      metrics: string
      change: string
      magnitude: string
      reason: string
    }
    monetization?: {
      title: string
      metrics: string
      change: string
      magnitude: string
      reason: string
    }
    efficiency?: {
      title: string
      metrics: string
      change: string
      magnitude: string
      reason: string
    }
  }
  investment_roi?: {
    capex_change: string
    opex_change: string
    investment_direction: string
    roi_evidence: string[]
    management_commitment: string
  }
  sustainability_risks?: {
    sustainable_drivers: string[]
    main_risks: string[]
    checkpoints: string[]
  }
  model_impact?: {
    upgrade_factors: string[]
    downgrade_factors: string[]
    logic_chain: string
  }
  final_judgment?: {
    confidence: string
    concerns: string
    watch_list: string
    net_impact: string
    long_term_narrative: string
    recommendation: string
  }
  investment_committee_summary?: string
  comparison_snapshot?: {
    core_revenue?: string
    core_profit?: string
    guidance?: string
    beat_miss?: string
    core_driver_quantified?: string
    main_risk_quantified?: string
    recommendation?: string
    position_action?: string
    next_quarter_focus?: string
  }
  research_comparison?: {
    consensus_source?: string
    key_differences?: string[]
    beat_miss_summary?: string
    analyst_blind_spots?: string
  }
}

type CategoryFilter = 'ALL' | 'AI_APPLICATION' | 'AI_SUPPLY_CHAIN'

const CATEGORY_OPTIONS = [
  { value: 'ALL' as CategoryFilter, label: '全部', icon: null },
  { value: 'AI_APPLICATION' as CategoryFilter, label: 'AI应用', icon: Building2 },
  { value: 'AI_SUPPLY_CHAIN' as CategoryFilter, label: 'AI供应链', icon: Cpu },
]

export default function DashboardClient() {
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [isFilingSelectorOpen, setIsFilingSelectorOpen] = useState(false)
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null)
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastFetchRef = useRef<number>(0)

  // 筛选状态
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL')
  const [yearFilter, setYearFilter] = useState<number | null>(null)
  const [quarterFilter, setQuarterFilter] = useState<number | null>(null)

  // 加载数据
  const loadDashboardData = useCallback(async (force: boolean = false) => {
    // 防止频繁请求（至少间隔1秒）
    const now = Date.now()
    if (!force && now - lastFetchRef.current < 1000) {
      return
    }
    lastFetchRef.current = now

    try {
      const response = await fetch('/api/dashboard')
      const data = await response.json()
      
      if (data.analyses) {
        // 过滤掉超过10分钟仍在处理的任务（视为卡住）
        const validAnalyses = data.analyses.filter((a: Analysis) => {
          if (a.processing && !a.processed) {
            const createdAt = new Date(a.created_at).getTime()
            const ageMinutes = (Date.now() - createdAt) / (1000 * 60)
            // 超过10分钟的处理中任务视为无效
            if (ageMinutes > 10) {
              console.log(`[Dashboard] 过滤掉卡住的任务: ${a.id}, 已运行 ${ageMinutes.toFixed(1)} 分钟`)
              return false
            }
          }
          return true
        })
        setAnalyses(validAnalyses)
      }
      
      setIsLoading(false)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      setIsLoading(false)
    }
  }, [])

  // 删除单个任务
  const deleteAnalysis = async (id: string) => {
    try {
      const response = await fetch(`/api/reports/${id}`, { method: 'DELETE' })
      if (response.ok) {
        setAnalyses(prev => prev.filter(a => a.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete analysis:', error)
    }
  }

  // 清理所有卡住的任务
  const cleanupStaleAnalyses = async () => {
    try {
      const response = await fetch('/api/reports/clean', { method: 'POST' })
      if (response.ok) {
        await loadDashboardData(true)
      }
    } catch (error) {
      console.error('Failed to cleanup stale analyses:', error)
    }
  }

  // 初始加载
  useEffect(() => {
    loadDashboardData(true)
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [loadDashboardData])

  // 轮询处理中的任务
  useEffect(() => {
    const processingAnalyses = analyses.filter(a => a.processing && !a.processed)
    
    if (processingAnalyses.length > 0) {
      // 有处理中的任务，开始轮询
      if (!pollIntervalRef.current) {
        pollIntervalRef.current = setInterval(() => {
          loadDashboardData()
        }, 3000)
      }
    } else {
      // 没有处理中的任务，停止轮询
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [analyses, loadDashboardData])

  // 获取完成的分析（已处理且无错误）
  const completedAnalyses = analyses.filter(a => a.processed && !a.error)
  // 获取正在处理的分析（处理中且未超时）
  const processingAnalyses = analyses.filter(a => {
    if (!a.processing || a.processed) return false
    const createdAt = new Date(a.created_at).getTime()
    const ageMinutes = (Date.now() - createdAt) / (1000 * 60)
    return ageMinutes <= 10 // 只显示10分钟内的处理中任务
  })
  // 获取卡住的任务（超过10分钟仍在处理）
  const staleAnalyses = analyses.filter(a => {
    if (!a.processing || a.processed) return false
    const createdAt = new Date(a.created_at).getTime()
    const ageMinutes = (Date.now() - createdAt) / (1000 * 60)
    return ageMinutes > 10
  })

  // 获取可用的年份和季度选项
  const availableYears = useMemo(() => {
    const years = new Set<number>()
    completedAnalyses.forEach(a => {
      if (a.fiscal_year) {
        years.add(a.fiscal_year)
      } else {
        // 从period字段解析年份，如 "Q4 2025"
        const match = a.period?.match(/(\d{4})/)
        if (match) {
          years.add(parseInt(match[1]))
        }
      }
    })
    return Array.from(years).sort((a, b) => b - a)
  }, [completedAnalyses])

  const availableQuarters = useMemo(() => {
    const quarters = new Set<number>()
    completedAnalyses.forEach(a => {
      if (a.fiscal_quarter) {
        quarters.add(a.fiscal_quarter)
      } else {
        // 从period字段解析季度，如 "Q4 2025"
        const match = a.period?.match(/Q(\d)/)
        if (match) {
          quarters.add(parseInt(match[1]))
        }
      }
    })
    return Array.from(quarters).sort((a, b) => a - b)
  }, [completedAnalyses])

  // 应用筛选
  const filteredAnalyses = useMemo(() => {
    return completedAnalyses.filter(a => {
      // 分类筛选
      if (categoryFilter !== 'ALL') {
        if (a.category !== categoryFilter) return false
      }
      
      // 年份筛选
      if (yearFilter !== null) {
        const year = a.fiscal_year || parseInt(a.period?.match(/(\d{4})/)?.[1] || '0')
        if (year !== yearFilter) return false
      }
      
      // 季度筛选
      if (quarterFilter !== null) {
        const quarter = a.fiscal_quarter || parseInt(a.period?.match(/Q(\d)/)?.[1] || '0')
        if (quarter !== quarterFilter) return false
      }
      
      return true
    })
  }, [completedAnalyses, categoryFilter, yearFilter, quarterFilter])

  // 按分类分组
  const groupedAnalyses = useMemo(() => {
    const aiApp = filteredAnalyses.filter(a => a.category === 'AI_APPLICATION')
    const aiSupply = filteredAnalyses.filter(a => a.category === 'AI_SUPPLY_CHAIN')
    const other = filteredAnalyses.filter(a => !a.category || (a.category !== 'AI_APPLICATION' && a.category !== 'AI_SUPPLY_CHAIN'))
    return { aiApp, aiSupply, other }
  }, [filteredAnalyses])

  // 是否有任何筛选条件
  const hasFilters = categoryFilter !== 'ALL' || yearFilter !== null || quarterFilter !== null

  // 清除所有筛选
  const clearFilters = () => {
    setCategoryFilter('ALL')
    setYearFilter(null)
    setQuarterFilter(null)
  }

  // 获取Beat/Miss图标
  const getBeatMissIcon = (beatMiss?: string) => {
    if (!beatMiss) return <Minus className="h-4 w-4 text-gray-400" />
    const lower = beatMiss.toLowerCase()
    if (lower.includes('beat')) {
      return <TrendingUp className="h-4 w-4 text-green-500" />
    } else if (lower.includes('miss')) {
      return <TrendingDown className="h-4 w-4 text-red-500" />
    }
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  // 获取推荐颜色
  const getRecommendationColor = (rec?: string) => {
    if (!rec) return 'bg-gray-100 text-gray-600'
    if (rec.includes('超配')) return 'bg-green-100 text-green-700'
    if (rec.includes('低配')) return 'bg-red-100 text-red-700'
    return 'bg-blue-100 text-blue-700'
  }

  // 提取核心结论 - 只保留客观事实，删除主观判断
  const getThreeConclusions = (analysis: Analysis) => {
    const conclusions: string[] = []
    
    // 1. 一句话结论（客观事实）
    if (analysis.one_line_conclusion) {
      conclusions.push(analysis.one_line_conclusion)
    }
    
    // 2. 可持续驱动（客观事实）
    if (analysis.sustainability_risks?.sustainable_drivers?.[0]) {
      conclusions.push(`✓ ${analysis.sustainability_risks.sustainable_drivers[0]}`)
    }
    
    // 3. 主要风险（客观事实）
    if (analysis.sustainability_risks?.main_risks?.[0]) {
      conclusions.push(`⚠ ${analysis.sustainability_risks.main_risks[0]}`)
    }
    
    return conclusions.slice(0, 3)
  }

  // 渲染分析卡片
  const renderAnalysisCard = (analysis: Analysis) => {
    const conclusions = getThreeConclusions(analysis)
    const beatMiss = analysis.comparison_snapshot?.beat_miss || analysis.final_judgment?.net_impact
    // recommendation 已删除 - 只保留客观数据对比

    return (
      <button
        key={analysis.id}
        onClick={() => setSelectedAnalysis(analysis)}
        className="p-6 bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/10 transition-all text-left group"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center font-bold text-slate-600 text-sm">
              {analysis.company_symbol?.slice(0, 4) || 'N/A'}
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                {analysis.company_name}
              </h3>
              <div className="flex items-center gap-2">
                <p className="text-xs text-slate-500">{analysis.period}</p>
                {analysis.category && (
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    analysis.category === 'AI_APPLICATION' 
                      ? 'bg-blue-50 text-blue-600' 
                      : 'bg-purple-50 text-purple-600'
                  }`}>
                    {analysis.category === 'AI_APPLICATION' ? '应用' : '供应链'}
                  </span>
                )}
              </div>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
        </div>

        {/* Beat/Miss & Recommendation */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100">
            {getBeatMissIcon(beatMiss)}
            <span className="text-xs font-medium text-slate-600">
              {beatMiss?.replace('Strong ', '').replace('Moderate ', '') || 'Inline'}
            </span>
          </div>
{/* 投资建议已删除 - 只保留客观数据对比 */}
        </div>

        {/* 3 Key Conclusions */}
        <div className="space-y-2">
          {conclusions.map((conclusion, idx) => (
            <p 
              key={idx} 
              className="text-sm text-slate-600 line-clamp-2 leading-relaxed"
            >
              {conclusion}
            </p>
          ))}
          {conclusions.length === 0 && (
            <p className="text-sm text-slate-400 italic">分析结果加载中...</p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            {new Date(analysis.created_at).toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </div>
      </button>
    )
  }

  // 渲染分类区块
  const renderCategorySection = (title: string, icon: React.ReactNode, analyses: Analysis[], bgColor: string) => {
    if (analyses.length === 0) return null
    
    return (
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className={`h-8 w-8 rounded-lg ${bgColor} flex items-center justify-center`}>
            {icon}
          </div>
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          <span className="text-sm text-slate-500">({analyses.length})</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {analyses.map(renderAnalysisCard)}
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Page Header — MASTER.md: spacing-lg, consistent hierarchy */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">财报分析</h1>
          <p className="text-sm text-muted-foreground mt-1">AI 投委会级深度分析 · 上传或选择已有财报</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setIsFilingSelectorOpen(true)}>
            <Database className="mr-2 h-4 w-4" />
            已有财报
          </Button>
          <Button variant="cta" size="sm" onClick={() => setIsUploadOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            上传财报
          </Button>
        </div>
      </div>

      <div>
        {/* Processing Banner - 只在有有效处理中任务时显示 */}
        {processingAnalyses.length > 0 && (
          <div className="mb-6 fin-card bg-amber-50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-800/30 !p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <Loader2 className="h-5 w-5 text-amber-600 dark:text-amber-400 animate-spin" />
              </div>
              <div>
                <p className="font-semibold text-amber-900 dark:text-amber-200">正在分析 {processingAnalyses.length} 份财报</p>
                <p className="text-amber-700/70 dark:text-amber-400/70 text-sm">AI 正在深度分析内容，请稍候...</p>
              </div>
            </div>
          </div>
        )}

        {/* Stale Tasks Warning */}
        {staleAnalyses.length > 0 && (
          <div className="mb-6 fin-card bg-rose-50 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-800/30 !p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shrink-0">
                  <Trash2 className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <p className="font-medium text-rose-800 dark:text-rose-200">发现 {staleAnalyses.length} 个卡住的任务</p>
                  <p className="text-sm text-rose-600/70 dark:text-rose-400/70">超过10分钟未完成，建议清理</p>
                </div>
              </div>
              <Button variant="outline" size="sm"
                className="border-rose-300 text-rose-700 hover:bg-rose-100 dark:border-rose-700 dark:text-rose-400"
                onClick={cleanupStaleAnalyses}
              >
                清理无效任务
              </Button>
            </div>
          </div>
        )}

        {/* Stats & Filters — MASTER.md: spacing-lg between sections */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Stats */}
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground font-mono tabular-nums">{completedAnalyses.length}</p>
                <p className="data-label">已分析</p>
              </div>
            </div>
            <div className="stat-divider" />
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground font-mono tabular-nums">
                  {new Set(completedAnalyses.map(a => a.company_symbol)).size}
                </p>
                <p className="data-label">公司</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
            </div>
            <div className="flex rounded-lg bg-muted p-0.5 border border-border/40">
              {CATEGORY_OPTIONS.map((opt) => (
                <button key={opt.value} onClick={() => setCategoryFilter(opt.value)}
                  className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-all duration-200 cursor-pointer ${
                    categoryFilter === opt.value ? 'bg-card text-foreground shadow-[var(--shadow-sm)]' : 'text-muted-foreground hover:text-foreground'
                  }`}>{opt.label}</button>
              ))}
            </div>
            {availableYears.length > 0 && (
              <select value={yearFilter ?? ''} onChange={(e) => setYearFilter(e.target.value ? parseInt(e.target.value) : null)}
                className="px-3 py-1.5 rounded-lg bg-muted text-[13px] font-medium text-foreground border border-border/40 cursor-pointer focus:ring-2 focus:ring-ring/20">
                <option value="">全部年份</option>
                {availableYears.map(y => <option key={y} value={y}>{y}年</option>)}
              </select>
            )}
            {availableQuarters.length > 0 && (
              <select value={quarterFilter ?? ''} onChange={(e) => setQuarterFilter(e.target.value ? parseInt(e.target.value) : null)}
                className="px-3 py-1.5 rounded-lg bg-muted text-[13px] font-medium text-foreground border border-border/40 cursor-pointer focus:ring-2 focus:ring-ring/20">
                <option value="">全部季度</option>
                {availableQuarters.map(q => <option key={q} value={q}>Q{q}</option>)}
              </select>
            )}
            {hasFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors duration-200">
                <X className="h-3.5 w-3.5" /> 清除
              </button>
            )}
          </div>
        </div>

        {hasFilters && (
          <p className="mb-4 text-sm text-muted-foreground">
            {filteredAnalyses.length} / {completedAnalyses.length} 条结果
          </p>
        )}

        {/* Upload Area (when empty) */}
        {completedAnalyses.length === 0 && processingAnalyses.length === 0 && !isLoading && (
          <div className="mb-8">
            <button onClick={() => setIsUploadOpen(true)}
              className="w-full py-16 sm:py-20 fin-card border-dashed border-2 flex flex-col items-center cursor-pointer group hover:border-primary/40 hover:bg-accent/5">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors duration-200 mb-4">
                <Plus className="h-7 w-7 text-muted-foreground group-hover:text-primary" />
              </div>
              <p className="text-lg font-semibold text-foreground">上传第一份财报</p>
              <p className="text-sm text-muted-foreground mt-1">支持 PDF / HTML 格式，可同时上传研报进行对比</p>
            </button>
          </div>
        )}

        {/* Company Cards - Grouped by Category */}
        {(filteredAnalyses.length > 0 || processingAnalyses.length > 0) && (
          <>
            {/* Processing Cards */}
            {processingAnalyses.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-amber-600 animate-spin" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-800">处理中</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {processingAnalyses.map((analysis) => (
                    <div key={analysis.id} className="fin-card animate-pulse min-h-[200px] flex flex-col">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground text-sm">{analysis.company_name || '分析中...'}</h3>
                          <p className="text-[11px] text-muted-foreground">{analysis.period}</p>
                        </div>
                      </div>
                      <div className="flex-1 flex items-center justify-center">
                        <p className="text-sm text-muted-foreground">AI 正在分析中...</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add New Card + Grouped Analysis Cards */}
            {categoryFilter === 'ALL' ? (
              <>
                {/* AI Application Companies */}
                {renderCategorySection(
                  'AI应用公司',
                  <Building2 className="h-4 w-4 text-blue-600" />,
                  groupedAnalyses.aiApp,
                  'bg-blue-100'
                )}

                {/* AI Supply Chain Companies */}
                {renderCategorySection(
                  'AI供应链公司',
                  <Cpu className="h-4 w-4 text-purple-600" />,
                  groupedAnalyses.aiSupply,
                  'bg-purple-100'
                )}

                {/* Other/Uncategorized */}
                {groupedAnalyses.other.length > 0 && renderCategorySection(
                  '其他',
                  <FileText className="h-4 w-4 text-slate-600" />,
                  groupedAnalyses.other,
                  'bg-slate-100'
                )}
              </>
            ) : (
              // Filtered view - show as flat grid
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAnalyses.map(renderAnalysisCard)}
              </div>
            )}

            {/* Empty Filter Results */}
            {filteredAnalyses.length === 0 && completedAnalyses.length > 0 && (
              <div className="text-center py-12">
                <p className="text-slate-500">没有符合筛选条件的分析结果</p>
                <button
                  onClick={clearFilters}
                  className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
                >
                  清除筛选条件
                </button>
              </div>
            )}
          </>
        )}

        {/* Add New Button - Fixed Position */}
        {completedAnalyses.length > 0 && (
          <button onClick={() => setIsUploadOpen(true)}
            className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 flex items-center justify-center transition-all duration-200 cursor-pointer z-20"
            aria-label="上传财报">
            <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => {
          loadDashboardData(true)
        }}
      />

      {/* Filing Selector Modal (从数据库选择已下载财报) */}
      <FilingSelector
        isOpen={isFilingSelectorOpen}
        onClose={() => setIsFilingSelectorOpen(false)}
        onSelect={async (filing) => {
          setIsFilingSelectorOpen(false)
          // Directly trigger analysis from database filing
          try {
            const res = await fetch('/api/reports/analyze-filing', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                filingId: filing.id,
                category: filing.category === 'AI_Applications' ? 'AI_APPLICATION' : 'AI_SUPPLY_CHAIN',
              }),
            })
            const data = await res.json()
            if (data.success) {
              // Refresh dashboard to show the new analysis
              loadDashboardData(true)
            } else {
              console.error('Analysis failed:', data.error)
              alert(data.error || '分析失败，请重试')
            }
          } catch (err: any) {
            console.error('Analysis request failed:', err)
            alert('网络错误，请重试')
          }
        }}
      />

      {/* Analysis Detail Modal */}
      {selectedAnalysis && (
        <AnalysisModal
          analysis={selectedAnalysis}
          onClose={() => setSelectedAnalysis(null)}
        />
      )}
    </div>
  )
}
