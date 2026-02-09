# 自动化部署指南

很抱歉，Vercel的Storage API（Postgres和Blob）需要通过Web界面或者特定的集成权限才能创建，无法通过普通API Token自动化。

但我可以为您提供**最简单的点击流程**，只需3-5分钟：

## 方案A: 通过Vercel Dashboard (推荐，最快)

### 1. 创建Postgres数据库 (2分钟)
```
1. 打开: https://vercel.com/tapi-57108f62/private-fund-analysis/stores
2. 点击 "Create Database"
3. 选择 "Postgres"  
4. 名称输入: private-fund-analysis-db
5. 区域选择: US East (iad1)
6. 点击 "Create" 按钮
```

✅ **完成后**: 环境变量会自动添加（POSTGRES_URL等）

### 2. 创建Blob存储 (1分钟)
```
1. 仍在 Stores 页面
2. 点击 "Create Store"
3. 选择 "Blob"
4. 名称输入: financial-reports  
5. 点击 "Create"
```

✅ **完成后**: 环境变量会自动添加（BLOB_READ_WRITE_TOKEN）

### 3. 执行数据库迁移 (2分钟)
```
1. 在 Stores 页面点击刚创建的 "private-fund-analysis-db"
2. 点击左侧菜单 "Data" 
3. 点击 "Query" 标签
4. 复制以下SQL并粘贴到查询框
5. 点击 "Run Query"
```

**SQL迁移脚本** (复制整个下方代码块):

```sql
-- 创建companies表
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) DEFAULT 'ai_application',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建financial_reports表
CREATE TABLE IF NOT EXISTS financial_reports (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    report_period VARCHAR(50) NOT NULL,
    fiscal_year INTEGER NOT NULL,
    fiscal_quarter INTEGER,
    file_url TEXT,
    file_name VARCHAR(255),
    file_size INTEGER,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending'
);

-- 创建financial_data表
CREATE TABLE IF NOT EXISTS financial_data (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES financial_reports(id),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(20, 2),
    period_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建analysis_results表
CREATE TABLE IF NOT EXISTS analysis_results (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES financial_reports(id),
    analysis_type VARCHAR(50) DEFAULT 'standard',
    result_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建comparison_analyses表
CREATE TABLE IF NOT EXISTS comparison_analyses (
    id SERIAL PRIMARY KEY,
    company_ids INTEGER[] NOT NULL,
    category VARCHAR(50),
    comparison_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建custom_questions表
CREATE TABLE IF NOT EXISTS custom_questions (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES financial_reports(id),
    question TEXT NOT NULL,
    answer TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建user_analyses表
CREATE TABLE IF NOT EXISTS user_analyses (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    report_id INTEGER REFERENCES financial_reports(id),
    notes TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入预定义公司（AI应用类 - 10家）
INSERT INTO companies (symbol, name, category) VALUES
('META', 'Meta Platforms', 'ai_application'),
('GOOGL', 'Alphabet (Google)', 'ai_application'),
('MSFT', 'Microsoft', 'ai_application'),
('AMZN', 'Amazon', 'ai_application'),
('AAPL', 'Apple', 'ai_application'),
('TSLA', 'Tesla', 'ai_application'),
('NFLX', 'Netflix', 'ai_application'),
('UBER', 'Uber', 'ai_application'),
('SNOW', 'Snowflake', 'ai_application'),
('CRM', 'Salesforce', 'ai_application')
ON CONFLICT (symbol) DO NOTHING;

-- 插入预定义公司（AI供应链类 - 14家）
INSERT INTO companies (symbol, name, category) VALUES
('NVDA', 'Nvidia', 'ai_supply_chain'),
('AMD', 'AMD', 'ai_supply_chain'),
('AVGO', 'Broadcom', 'ai_supply_chain'),
('TSM', 'TSMC', 'ai_supply_chain'),
('005930.KS', 'SK Hynix', 'ai_supply_chain'),
('MU', 'Micron', 'ai_supply_chain'),
('005930', 'Samsung Electronics', 'ai_supply_chain'),
('INTC', 'Intel', 'ai_supply_chain'),
('VRT', 'Vertiv', 'ai_supply_chain'),
('ETN', 'Eaton', 'ai_supply_chain'),
('GEV', 'GE Vernova', 'ai_supply_chain'),
('VST', 'Vistra', 'ai_supply_chain'),
('ASML', 'ASML', 'ai_supply_chain'),
('SNPS', 'Synopsys', 'ai_supply_chain')
ON CONFLICT (symbol) DO NOTHING;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_reports_company ON financial_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_reports_period ON financial_reports(fiscal_year, fiscal_quarter);
CREATE INDEX IF NOT EXISTS idx_financial_data_report ON financial_data(report_id);
CREATE INDEX IF NOT EXISTS idx_analysis_report ON analysis_results(report_id);
CREATE INDEX IF NOT EXISTS idx_comparison_category ON comparison_analyses(category);
CREATE INDEX IF NOT EXISTS idx_custom_questions_report ON custom_questions(report_id);

-- 创建视图：最新财报
CREATE OR REPLACE VIEW latest_company_reports AS
SELECT DISTINCT ON (c.id) 
    c.id as company_id,
    c.symbol,
    c.name,
    c.category,
    fr.id as report_id,
    fr.report_period,
    fr.fiscal_year,
    fr.fiscal_quarter,
    fr.uploaded_at
FROM companies c
LEFT JOIN financial_reports fr ON c.id = fr.company_id
ORDER BY c.id, fr.fiscal_year DESC, fr.fiscal_quarter DESC NULLS LAST;

-- 创建视图：分类汇总
CREATE OR REPLACE VIEW category_summary AS
SELECT 
    category,
    COUNT(*) as company_count,
    COUNT(DISTINCT fr.id) as report_count
FROM companies c
LEFT JOIN financial_reports fr ON c.id = fr.company_id
GROUP BY category;
```

### 4. 重新部署 (1分钟)
```
1. 打开: https://vercel.com/tapi-57108f62/private-fund-analysis/deployments
2. 点击最新的部署记录
3. 点击右上角 "..." 菜单
4. 选择 "Redeploy"
5. 等待2-3分钟
```

---

## 方案B: 使用Neon直接连接 (替代方案)

如果Vercel Postgres有问题，可以使用Neon（免费且更稳定）：

### 1. 创建Neon数据库 (免费)
```
1. 访问: https://console.neon.tech/signup
2. 注册/登录
3. 点击 "Create Project"
4. 项目名: private-fund-analysis
5. 区域: US East (Ohio)
6. 点击 "Create Project"
7. 复制连接字符串（格式: postgresql://user:pass@host/db）
```

### 2. 添加到Vercel环境变量
```
1. 打开: https://vercel.com/tapi-57108f62/private-fund-analysis/settings/environment-variables
2. 添加新变量:
   - Key: POSTGRES_URL
   - Value: [粘贴Neon连接字符串]
   - 选择: Production + Preview + Development
3. 点击 "Save"
```

### 3. 执行迁移（在Neon Console）
```
1. 在Neon控制台点击 "SQL Editor"
2. 粘贴上面的SQL迁移脚本
3. 点击 "Run"
```

### 4. Blob存储（仍需Vercel Dashboard）
```
按照方案A的步骤2创建Blob存储
```

---

## ✅ 验证部署成功

完成上述步骤后，访问: https://private-fund-analysis-tapi-57108f62.vercel.app

### 测试清单:
- [ ] 能成功登录 (admin@example.com / admin123)
- [ ] 界面显示为中文
- [ ] 右上角能切换语言
- [ ] 侧边栏显示蓝色Logo
- [ ] 上传财报时显示进度条
- [ ] 能查看分析结果
- [ ] 横向对比功能正常
- [ ] 自定义问题功能正常

---

## 🆘 遇到问题？

### 错误: "Database connection failed"
- 检查 POSTGRES_URL 环境变量是否正确
- 确认数据库迁移已执行
- 在Vercel项目页面点击 "Redeploy"

### 错误: "Blob upload failed"  
- 检查 BLOB_READ_WRITE_TOKEN 环境变量
- 确认Blob存储已创建并连接到项目

### 错误: "OpenRouter API error"
- 检查 OPENROUTER_API_KEY 是否有效
- 访问 https://openrouter.ai/keys 确认余额

---

## 📊 当前配置状态

✅ **已完成**:
- GitHub仓库: https://github.com/cam12138no1/private-fund-analysis
- Vercel项目: 已创建并连接
- 环境变量: OPENROUTER_API_KEY, NEXTAUTH_SECRET, JWT_SECRET, NEXTAUTH_URL
- 代码部署: 最新版本已推送

⏳ **待完成** (需您操作):
- [ ] Postgres数据库创建
- [ ] 数据库迁移执行
- [ ] Blob存储创建
- [ ] 最终重新部署

预计完成时间: **5分钟**

---

## 💡 温馨提示

1. **Postgres创建很简单**: 只需在网页上点击3次，不需要任何配置
2. **SQL复制粘贴**: 迁移脚本已经写好，直接粘贴运行即可
3. **环境变量自动**: Vercel会自动添加连接字符串，无需手动配置
4. **遇到问题随时问**: 我会立即帮您解决

开始操作吧！有任何疑问随时告诉我 🚀
