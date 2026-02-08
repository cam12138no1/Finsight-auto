export interface CompanyInfo {
  name: string;
  ticker: string;
  category: 'AI_Applications' | 'AI_Supply_Chain';
  irUrl: string;
  secCik: string;
  description: string;
}

export const COMPANIES: CompanyInfo[] = [
  // AI Applications (10)
  { name: 'Microsoft', ticker: 'MSFT', category: 'AI_Applications', irUrl: 'https://www.microsoft.com/en-us/investor/earnings/', secCik: '0000789019', description: 'Cloud, AI, Office生态系统' },
  { name: 'Alphabet', ticker: 'GOOGL', category: 'AI_Applications', irUrl: 'https://abc.xyz/investor/', secCik: '0001652044', description: 'Google搜索, 云计算, AI' },
  { name: 'Amazon', ticker: 'AMZN', category: 'AI_Applications', irUrl: 'https://ir.aboutamazon.com/quarterly-results/', secCik: '0001018724', description: 'AWS, 电商, AI服务' },
  { name: 'Meta', ticker: 'META', category: 'AI_Applications', irUrl: 'https://investor.fb.com/financials/', secCik: '0001326801', description: '社交媒体, 元宇宙, AI' },
  { name: 'Salesforce', ticker: 'CRM', category: 'AI_Applications', irUrl: 'https://investor.salesforce.com/financials/', secCik: '0001108524', description: 'CRM, 企业AI, Data Cloud' },
  { name: 'ServiceNow', ticker: 'NOW', category: 'AI_Applications', irUrl: 'https://investors.servicenow.com/financials/', secCik: '0001373715', description: '企业工作流, AI Agent' },
  { name: 'Palantir', ticker: 'PLTR', category: 'AI_Applications', irUrl: 'https://investors.palantir.com/financials/', secCik: '0001321655', description: '大数据分析, AIP平台' },
  { name: 'Apple', ticker: 'AAPL', category: 'AI_Applications', irUrl: 'https://investor.apple.com/investor-relations/', secCik: '0000320193', description: '消费电子, Apple Intelligence' },
  { name: 'AppLovin', ticker: 'APP', category: 'AI_Applications', irUrl: 'https://investors.applovin.com/financials/', secCik: '0001751008', description: 'AI广告技术, 移动营销' },
  { name: 'Adobe', ticker: 'ADBE', category: 'AI_Applications', irUrl: 'https://www.adobe.com/investor-relations/earnings.html', secCik: '0000796343', description: '创意工具, AI设计, Firefly' },

  // AI Supply Chain (14)
  { name: 'Nvidia', ticker: 'NVDA', category: 'AI_Supply_Chain', irUrl: 'https://investor.nvidia.com/financial-info/', secCik: '0001045810', description: 'GPU, AI芯片, 数据中心' },
  { name: 'AMD', ticker: 'AMD', category: 'AI_Supply_Chain', irUrl: 'https://ir.amd.com/financial-information/', secCik: '0000002488', description: 'CPU/GPU, AI加速器, MI系列' },
  { name: 'Broadcom', ticker: 'AVGO', category: 'AI_Supply_Chain', irUrl: 'https://investors.broadcom.com/financials/', secCik: '0001730168', description: '网络芯片, 定制AI芯片' },
  { name: 'TSMC', ticker: 'TSM', category: 'AI_Supply_Chain', irUrl: 'https://investor.tsmc.com/english/quarterly-results', secCik: '0001046179', description: '芯片代工, 先进制程' },
  { name: 'SK Hynix', ticker: 'SKH', category: 'AI_Supply_Chain', irUrl: 'https://www.skhynix.com/eng/ir/earnings.do', secCik: '', description: 'HBM内存, AI存储' },
  { name: 'Micron', ticker: 'MU', category: 'AI_Supply_Chain', irUrl: 'https://investors.micron.com/financials/', secCik: '0000723125', description: 'HBM, DRAM, 存储解决方案' },
  { name: 'Samsung', ticker: 'SSNLF', category: 'AI_Supply_Chain', irUrl: 'https://www.samsung.com/global/ir/reports-disclosures/financial-information/', secCik: '', description: '存储芯片, 代工, HBM' },
  { name: 'Intel', ticker: 'INTC', category: 'AI_Supply_Chain', irUrl: 'https://www.intc.com/financial-info/', secCik: '0000050863', description: 'CPU, AI加速器, 代工' },
  { name: 'Vertiv', ticker: 'VRT', category: 'AI_Supply_Chain', irUrl: 'https://investors.vertiv.com/financials/', secCik: '0001674101', description: '数据中心基础设施, 散热' },
  { name: 'Eaton', ticker: 'ETN', category: 'AI_Supply_Chain', irUrl: 'https://www.eaton.com/us/en-us/company/investors/financial-results.html', secCik: '0001551182', description: '电力管理, 数据中心电力' },
  { name: 'GE Vernova', ticker: 'GEV', category: 'AI_Supply_Chain', irUrl: 'https://www.gevernova.com/investors/financial-information', secCik: '0001996810', description: '电力设备, 能源转型' },
  { name: 'Vistra', ticker: 'VST', category: 'AI_Supply_Chain', irUrl: 'https://investors.vistracorp.com/financials/', secCik: '0001692819', description: '电力供应, 核能, 清洁能源' },
  { name: 'ASML', ticker: 'ASML', category: 'AI_Supply_Chain', irUrl: 'https://www.asml.com/en/investors/financial-results', secCik: '0000937966', description: '光刻机, EUV, 半导体设备' },
  { name: 'Synopsys', ticker: 'SNPS', category: 'AI_Supply_Chain', irUrl: 'https://investor.synopsys.com/financials/', secCik: '0000883241', description: 'EDA工具, 芯片设计软件' },
];

export const AI_APPLICATION_COMPANIES = COMPANIES.filter(c => c.category === 'AI_Applications');
export const AI_SUPPLY_CHAIN_COMPANIES = COMPANIES.filter(c => c.category === 'AI_Supply_Chain');

export function getCompanyByTicker(ticker: string): CompanyInfo | undefined {
  return COMPANIES.find(c => c.ticker === ticker);
}

export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    AI_Applications: 'AI 应用',
    AI_Supply_Chain: 'AI 供应链',
  };
  return labels[category] || category;
}
