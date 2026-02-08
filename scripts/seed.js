/**
 * Database Seed Script
 * Populates the companies table with the 24 AI companies
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const companies = [
  // AI Applications
  { name: 'Microsoft', ticker: 'MSFT', category: 'AI_Applications', ir_url: 'https://www.microsoft.com/en-us/investor/earnings/', sec_cik: '0000789019', description: 'Cloud, AI, Office生态系统' },
  { name: 'Alphabet', ticker: 'GOOGL', category: 'AI_Applications', ir_url: 'https://abc.xyz/investor/', sec_cik: '0001652044', description: 'Google搜索, 云计算, AI' },
  { name: 'Amazon', ticker: 'AMZN', category: 'AI_Applications', ir_url: 'https://ir.aboutamazon.com/quarterly-results/', sec_cik: '0001018724', description: 'AWS, 电商, AI服务' },
  { name: 'Meta', ticker: 'META', category: 'AI_Applications', ir_url: 'https://investor.fb.com/financials/', sec_cik: '0001326801', description: '社交媒体, 元宇宙, AI' },
  { name: 'Salesforce', ticker: 'CRM', category: 'AI_Applications', ir_url: 'https://investor.salesforce.com/financials/', sec_cik: '0001108524', description: 'CRM, 企业AI, Data Cloud' },
  { name: 'ServiceNow', ticker: 'NOW', category: 'AI_Applications', ir_url: 'https://investors.servicenow.com/financials/', sec_cik: '0001373715', description: '企业工作流, AI Agent' },
  { name: 'Palantir', ticker: 'PLTR', category: 'AI_Applications', ir_url: 'https://investors.palantir.com/financials/', sec_cik: '0001321655', description: '大数据分析, AIP平台' },
  { name: 'Apple', ticker: 'AAPL', category: 'AI_Applications', ir_url: 'https://investor.apple.com/investor-relations/', sec_cik: '0000320193', description: '消费电子, Apple Intelligence' },
  { name: 'AppLovin', ticker: 'APP', category: 'AI_Applications', ir_url: 'https://investors.applovin.com/financials/', sec_cik: '0001751008', description: 'AI广告技术, 移动营销' },
  { name: 'Adobe', ticker: 'ADBE', category: 'AI_Applications', ir_url: 'https://www.adobe.com/investor-relations/earnings.html', sec_cik: '0000796343', description: '创意工具, AI设计, Firefly' },

  // AI Supply Chain
  { name: 'Nvidia', ticker: 'NVDA', category: 'AI_Supply_Chain', ir_url: 'https://investor.nvidia.com/financial-info/', sec_cik: '0001045810', description: 'GPU, AI芯片, 数据中心' },
  { name: 'AMD', ticker: 'AMD', category: 'AI_Supply_Chain', ir_url: 'https://ir.amd.com/financial-information/', sec_cik: '0000002488', description: 'CPU/GPU, AI加速器, MI系列' },
  { name: 'Broadcom', ticker: 'AVGO', category: 'AI_Supply_Chain', ir_url: 'https://investors.broadcom.com/financials/', sec_cik: '0001730168', description: '网络芯片, 定制AI芯片' },
  { name: 'TSMC', ticker: 'TSM', category: 'AI_Supply_Chain', ir_url: 'https://investor.tsmc.com/english/quarterly-results', sec_cik: '0001046179', description: '芯片代工, 先进制程' },
  { name: 'SK Hynix', ticker: 'SKH', category: 'AI_Supply_Chain', ir_url: 'https://www.skhynix.com/eng/ir/earnings.do', sec_cik: '', description: 'HBM内存, AI存储' },
  { name: 'Micron', ticker: 'MU', category: 'AI_Supply_Chain', ir_url: 'https://investors.micron.com/financials/', sec_cik: '0000723125', description: 'HBM, DRAM, 存储解决方案' },
  { name: 'Samsung', ticker: 'SSNLF', category: 'AI_Supply_Chain', ir_url: 'https://www.samsung.com/global/ir/reports-disclosures/financial-information/', sec_cik: '', description: '存储芯片, 代工, HBM' },
  { name: 'Intel', ticker: 'INTC', category: 'AI_Supply_Chain', ir_url: 'https://www.intc.com/financial-info/', sec_cik: '0000050863', description: 'CPU, AI加速器, 代工' },
  { name: 'Vertiv', ticker: 'VRT', category: 'AI_Supply_Chain', ir_url: 'https://investors.vertiv.com/financials/', sec_cik: '0001674101', description: '数据中心基础设施, 散热' },
  { name: 'Eaton', ticker: 'ETN', category: 'AI_Supply_Chain', ir_url: 'https://www.eaton.com/us/en-us/company/investors/financial-results.html', sec_cik: '0001551182', description: '电力管理, 数据中心电力' },
  { name: 'GE Vernova', ticker: 'GEV', category: 'AI_Supply_Chain', ir_url: 'https://www.gevernova.com/investors/financial-information', sec_cik: '0001996810', description: '电力设备, 能源转型' },
  { name: 'Vistra', ticker: 'VST', category: 'AI_Supply_Chain', ir_url: 'https://investors.vistracorp.com/financials/', sec_cik: '0001692819', description: '电力供应, 核能, 清洁能源' },
  { name: 'ASML', ticker: 'ASML', category: 'AI_Supply_Chain', ir_url: 'https://www.asml.com/en/investors/financial-results', sec_cik: '0000937966', description: '光刻机, EUV, 半导体设备' },
  { name: 'Synopsys', ticker: 'SNPS', category: 'AI_Supply_Chain', ir_url: 'https://investor.synopsys.com/financials/', sec_cik: '0000883241', description: 'EDA工具, 芯片设计软件' },
];

async function seed() {
  const client = await pool.connect();
  console.log('🌱 Seeding database...\n');

  try {
    await client.query('BEGIN');

    for (const company of companies) {
      await client.query(
        `INSERT INTO companies (name, ticker, category, ir_url, sec_cik, description)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (ticker) DO UPDATE SET
           name = EXCLUDED.name,
           ir_url = EXCLUDED.ir_url,
           sec_cik = EXCLUDED.sec_cik,
           description = EXCLUDED.description,
           updated_at = NOW()`,
        [company.name, company.ticker, company.category, company.ir_url, company.sec_cik, company.description]
      );
      console.log(`  ✓ ${company.name} (${company.ticker})`);
    }

    await client.query('COMMIT');
    console.log(`\n✅ Seeded ${companies.length} companies successfully!`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Seeding failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.warn('⚠️  Seeding deferred - database may not be configured yet:', err.message);
  console.warn('   Set DATABASE_URL and redeploy to run seeds.');
  process.exit(0); // Don't fail the build
});
