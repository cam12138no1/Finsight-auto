/**
 * 简化存储方案 - 使用Vercel KV (Redis)替代Postgres
 * 完全无需人工配置数据库，Vercel会自动创建KV存储
 */

import { kv } from '@vercel/kv';

export interface Company {
  id: string;
  symbol: string;
  name: string;
  nameZh: string;
  category: 'AI_APPLICATION' | 'AI_SUPPLY_CHAIN';
  createdAt: string;
}

export interface FinancialReport {
  id: string;
  companyId: string;
  reportPeriod: string;
  fiscalYear: number;
  fiscalQuarter?: number;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface AnalysisResult {
  id: string;
  reportId: string;
  analysisType: string;
  resultData: any;
  createdAt: string;
}

export interface ComparisonResult {
  id: string;
  companyIds: string[];
  category: 'AI_APPLICATION' | 'AI_SUPPLY_CHAIN';
  comparisonContent: string;
  createdAt: string;
  createdBy?: string;
}

export interface CustomQuestion {
  id: string;
  reportId: string;
  questions: string[];
  answers: Array<{ question: string; answer: string }>;
  createdAt: string;
  createdBy?: string;
}

// 预定义公司列表 - 按用户指定分类
const PREDEFINED_COMPANIES: Omit<Company, 'id' | 'createdAt'>[] = [
  // AI应用公司：Microsoft, Google, Amazon, Meta, Salesforce, ServiceNow, Palantir, Apple, AppLovin, Adobe
  { symbol: 'MSFT', name: 'Microsoft', nameZh: '微软', category: 'AI_APPLICATION' },
  { symbol: 'GOOGL', name: 'Alphabet (Google)', nameZh: '谷歌', category: 'AI_APPLICATION' },
  { symbol: 'AMZN', name: 'Amazon', nameZh: '亚马逊', category: 'AI_APPLICATION' },
  { symbol: 'META', name: 'Meta Platforms', nameZh: 'Meta', category: 'AI_APPLICATION' },
  { symbol: 'CRM', name: 'Salesforce', nameZh: 'Salesforce', category: 'AI_APPLICATION' },
  { symbol: 'NOW', name: 'ServiceNow', nameZh: 'ServiceNow', category: 'AI_APPLICATION' },
  { symbol: 'PLTR', name: 'Palantir', nameZh: 'Palantir', category: 'AI_APPLICATION' },
  { symbol: 'AAPL', name: 'Apple', nameZh: '苹果', category: 'AI_APPLICATION' },
  { symbol: 'APP', name: 'AppLovin', nameZh: 'AppLovin', category: 'AI_APPLICATION' },
  { symbol: 'ADBE', name: 'Adobe', nameZh: 'Adobe', category: 'AI_APPLICATION' },
  
  // AI供应链公司：Nvidia, AMD, Broadcom (AVGO), TSMC, SK Hynix, Micron, Samsung, Intel, Vertiv (VRT), Eaton (ETN), GEV, Vistra (VST), ASML, Synopsys (SNPS)
  { symbol: 'NVDA', name: 'Nvidia', nameZh: '英伟达', category: 'AI_SUPPLY_CHAIN' },
  { symbol: 'AMD', name: 'AMD', nameZh: 'AMD', category: 'AI_SUPPLY_CHAIN' },
  { symbol: 'AVGO', name: 'Broadcom', nameZh: '博通', category: 'AI_SUPPLY_CHAIN' },
  { symbol: 'TSM', name: 'TSMC', nameZh: '台积电', category: 'AI_SUPPLY_CHAIN' },
  { symbol: '000660.KS', name: 'SK Hynix', nameZh: 'SK海力士', category: 'AI_SUPPLY_CHAIN' },
  { symbol: 'MU', name: 'Micron', nameZh: '美光', category: 'AI_SUPPLY_CHAIN' },
  { symbol: '005930.KS', name: 'Samsung Electronics', nameZh: '三星电子', category: 'AI_SUPPLY_CHAIN' },
  { symbol: 'INTC', name: 'Intel', nameZh: '英特尔', category: 'AI_SUPPLY_CHAIN' },
  { symbol: 'VRT', name: 'Vertiv', nameZh: 'Vertiv', category: 'AI_SUPPLY_CHAIN' },
  { symbol: 'ETN', name: 'Eaton', nameZh: '伊顿', category: 'AI_SUPPLY_CHAIN' },
  { symbol: 'GEV', name: 'GE Vernova', nameZh: 'GE Vernova', category: 'AI_SUPPLY_CHAIN' },
  { symbol: 'VST', name: 'Vistra', nameZh: 'Vistra', category: 'AI_SUPPLY_CHAIN' },
  { symbol: 'ASML', name: 'ASML', nameZh: '阿斯麦', category: 'AI_SUPPLY_CHAIN' },
  { symbol: 'SNPS', name: 'Synopsys', nameZh: '新思科技', category: 'AI_SUPPLY_CHAIN' },
];

// 自动初始化
export async function initializeStorage() {
  try {
    const initialized = await kv.get('storage:initialized:v2');
    if (!initialized) {
      console.log('初始化存储...');
      
      // 创建预定义公司
      for (const company of PREDEFINED_COMPANIES) {
        const id = `company:${company.symbol}`;
        await kv.set(id, {
          id,
          ...company,
          createdAt: new Date().toISOString(),
        });
      }
      
      // 创建公司索引
      const companyIds = PREDEFINED_COMPANIES.map(c => `company:${c.symbol}`);
      await kv.set('companies:all', companyIds);
      
      // 创建分类索引
      const aiAppCompanies = PREDEFINED_COMPANIES
        .filter(c => c.category === 'AI_APPLICATION')
        .map(c => `company:${c.symbol}`);
      const aiSupplyCompanies = PREDEFINED_COMPANIES
        .filter(c => c.category === 'AI_SUPPLY_CHAIN')
        .map(c => `company:${c.symbol}`);
      
      await kv.set('companies:AI_APPLICATION', aiAppCompanies);
      await kv.set('companies:AI_SUPPLY_CHAIN', aiSupplyCompanies);
      
      await kv.set('storage:initialized:v2', true);
      console.log('存储初始化完成！');
    }
  } catch (error) {
    console.error('存储初始化失败:', error);
  }
}

// 公司操作
export async function getCompanies(): Promise<Company[]> {
  try {
    const companyIds = await kv.get<string[]>('companies:all') || [];
    const companies = await Promise.all(
      companyIds.map(id => kv.get<Company>(id))
    );
    return companies.filter(Boolean) as Company[];
  } catch (error) {
    console.error('获取公司列表失败:', error);
    return [];
  }
}

export async function getCompaniesByCategory(category: 'AI_APPLICATION' | 'AI_SUPPLY_CHAIN'): Promise<Company[]> {
  try {
    const companyIds = await kv.get<string[]>(`companies:${category}`) || [];
    const companies = await Promise.all(
      companyIds.map(id => kv.get<Company>(id))
    );
    return companies.filter(Boolean) as Company[];
  } catch (error) {
    console.error('获取公司列表失败:', error);
    return [];
  }
}

export async function getCompanyBySymbol(symbol: string): Promise<Company | null> {
  try {
    return await kv.get<Company>(`company:${symbol}`);
  } catch (error) {
    console.error('获取公司失败:', error);
    return null;
  }
}

// 财报操作
export async function createReport(report: Omit<FinancialReport, 'id' | 'uploadedAt'>): Promise<FinancialReport> {
  const id = `report:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
  const newReport: FinancialReport = {
    id,
    ...report,
    uploadedAt: new Date().toISOString(),
  };
  
  await kv.set(id, newReport);
  
  // 添加到报告索引
  const reportIds = await kv.get<string[]>('reports:all') || [];
  reportIds.push(id);
  await kv.set('reports:all', reportIds);
  
  // 添加到公司报告索引
  const companyReports = await kv.get<string[]>(`reports:company:${report.companyId}`) || [];
  companyReports.push(id);
  await kv.set(`reports:company:${report.companyId}`, companyReports);
  
  return newReport;
}

export async function getReports(limit = 50): Promise<FinancialReport[]> {
  try {
    const reportIds = await kv.get<string[]>('reports:all') || [];
    const recentIds = reportIds.slice(-limit).reverse();
    const reports = await Promise.all(
      recentIds.map(id => kv.get<FinancialReport>(id))
    );
    return reports.filter(Boolean) as FinancialReport[];
  } catch (error) {
    console.error('获取报告列表失败:', error);
    return [];
  }
}

export async function getReportById(id: string): Promise<FinancialReport | null> {
  try {
    return await kv.get<FinancialReport>(id);
  } catch (error) {
    console.error('获取报告失败:', error);
    return null;
  }
}

export async function getReportsByCompany(companyId: string): Promise<FinancialReport[]> {
  try {
    const reportIds = await kv.get<string[]>(`reports:company:${companyId}`) || [];
    const reports = await Promise.all(
      reportIds.map(id => kv.get<FinancialReport>(id))
    );
    return reports.filter(Boolean) as FinancialReport[];
  } catch (error) {
    console.error('获取公司报告失败:', error);
    return [];
  }
}

export async function updateReportStatus(id: string, status: FinancialReport['status']): Promise<void> {
  const report = await getReportById(id);
  if (report) {
    report.status = status;
    await kv.set(id, report);
  }
}

// 分析结果操作
export async function saveAnalysis(analysis: Omit<AnalysisResult, 'id' | 'createdAt'>): Promise<AnalysisResult> {
  const id = `analysis:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
  const newAnalysis: AnalysisResult = {
    id,
    ...analysis,
    createdAt: new Date().toISOString(),
  };
  
  await kv.set(id, newAnalysis);
  await kv.set(`analysis:report:${analysis.reportId}`, id);
  
  return newAnalysis;
}

export async function getAnalysisByReportId(reportId: string): Promise<AnalysisResult | null> {
  try {
    const analysisId = await kv.get<string>(`analysis:report:${reportId}`);
    if (!analysisId) return null;
    return await kv.get<AnalysisResult>(analysisId);
  } catch (error) {
    console.error('获取分析结果失败:', error);
    return null;
  }
}

// 横向对比操作
export async function saveComparison(comparison: Omit<ComparisonResult, 'id' | 'createdAt'>): Promise<ComparisonResult> {
  const id = `comparison:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
  const newComparison: ComparisonResult = {
    id,
    ...comparison,
    createdAt: new Date().toISOString(),
  };
  
  await kv.set(id, newComparison);
  
  // 添加到对比索引
  const comparisonIds = await kv.get<string[]>('comparisons:all') || [];
  comparisonIds.push(id);
  await kv.set('comparisons:all', comparisonIds);
  
  return newComparison;
}

export async function getComparisons(limit = 20): Promise<ComparisonResult[]> {
  try {
    const comparisonIds = await kv.get<string[]>('comparisons:all') || [];
    const recentIds = comparisonIds.slice(-limit).reverse();
    const comparisons = await Promise.all(
      recentIds.map(id => kv.get<ComparisonResult>(id))
    );
    return comparisons.filter(Boolean) as ComparisonResult[];
  } catch (error) {
    console.error('获取对比列表失败:', error);
    return [];
  }
}

// 自定义问题操作
export async function saveCustomQuestion(question: Omit<CustomQuestion, 'id' | 'createdAt'>): Promise<CustomQuestion> {
  const id = `customq:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
  const newQuestion: CustomQuestion = {
    id,
    ...question,
    createdAt: new Date().toISOString(),
  };
  
  await kv.set(id, newQuestion);
  
  // 添加到问题索引
  const questionIds = await kv.get<string[]>('customquestions:all') || [];
  questionIds.push(id);
  await kv.set('customquestions:all', questionIds);
  
  // 添加到报告问题索引
  const reportQuestions = await kv.get<string[]>(`customquestions:report:${question.reportId}`) || [];
  reportQuestions.push(id);
  await kv.set(`customquestions:report:${question.reportId}`, reportQuestions);
  
  return newQuestion;
}

export async function getCustomQuestions(limit = 20): Promise<CustomQuestion[]> {
  try {
    const questionIds = await kv.get<string[]>('customquestions:all') || [];
    const recentIds = questionIds.slice(-limit).reverse();
    const questions = await Promise.all(
      recentIds.map(id => kv.get<CustomQuestion>(id))
    );
    return questions.filter(Boolean) as CustomQuestion[];
  } catch (error) {
    console.error('获取自定义问题列表失败:', error);
    return [];
  }
}

export async function getCustomQuestionsByReport(reportId: string): Promise<CustomQuestion[]> {
  try {
    const questionIds = await kv.get<string[]>(`customquestions:report:${reportId}`) || [];
    const questions = await Promise.all(
      questionIds.map(id => kv.get<CustomQuestion>(id))
    );
    return questions.filter(Boolean) as CustomQuestion[];
  } catch (error) {
    console.error('获取报告自定义问题失败:', error);
    return [];
  }
}
