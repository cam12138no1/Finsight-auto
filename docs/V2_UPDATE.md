# 新功能更新说明 - V2.0

## 🎯 核心功能升级

### 1. 公司自动分类系统

**功能描述:**
- 自动识别公司类别:AI应用公司 vs AI供应链公司
- 根据公司类别使用对应的专业分析prompt

**支持公司列表:**

**AI应用公司** (10家):
- Microsoft (MSFT)
- Google/Alphabet (GOOGL, GOOG)
- Amazon (AMZN)
- Meta (META)
- Salesforce (CRM)
- ServiceNow (NOW)
- Palantir (PLTR)
- Apple (AAPL)
- AppLovin (APP)
- Adobe (ADBE)

**AI供应链公司** (14家):
- Nvidia (NVDA)
- AMD
- Broadcom (AVGO)
- TSMC (TSM)
- SK Hynix (SKH)
- Micron (MU)
- Samsung (SSNLF)
- Intel (INTC)
- Vertiv (VRT)
- Eaton (ETN)
- GEV
- Vistra (VST)
- ASML
- Synopsys (SNPS)

**技术实现:**
- 文件: `lib/ai/prompts.ts`
- 函数: `getCompanyCategory(symbolOrName)`
- 自动匹配股票代码或公司名称

---

### 2. 双prompt分析系统

#### A. AI应用公司分析prompt

**分析重点:**
- 用户增长与使用量
- ARPU/价格/转化率
- 人效与算力效率
- AI/技术落地到财务指标
- 云订单加速、算力投入ROI

**输出结构:**
0. 一句话结论
1. 业绩vs预期
2. 增长驱动(需求/变现/效率)
3. 投入与ROI
4. 可持续性与风险
5. 模型影响
6. 投委会判断

#### B. AI供应链公司分析prompt

**分析重点:**
- 出货量/ASP/产能利用率
- 定价权与技术代差
- 良率提升与成本优化
- 产能扩张ROI
- 供应链地位评估(新增!)

**特有分析维度:**
- 产能扩张周期(18-24个月lag)
- 先进制程量产进度
- 长期订单锁定情况
- 地缘政治风险量化
- 客户集中度风险

**输出结构:**
0. 一句话结论
1. 业绩vs预期
2. 增长驱动(需求/定价/效率)
3. 投入与ROI
4. 可持续性与风险
5. **供应链地位评估** (特有!)
6. 模型影响
7. 投委会判断

**关键差异:**
- 更关注产能、良率、ASP等硬件指标
- 强调技术护城河(制程领先性、专利壁垒)
- 分析议价能力变化
- 量化地缘政治影响

---

### 3. 横向对比功能

**页面路径:** `/dashboard/comparison`

**功能描述:**
- 选择2家以上同赛道公司
- AI自动生成对比分析
- 包含关键指标对比表格
- 相对表现分析
- 投资吸引力排序

**对比维度:**
- Revenue、EPS、Margin
- YoY/QoQ增长率
- 毛利率、营业利润率
- CapEx投资强度
- 估值倍数(PE、EV/EBITDA)
- 竞争优势识别
- 投资建议排序

**技术实现:**
- API: `/api/comparison`
- 前端: `app/dashboard/comparison/page.tsx`
- 数据库: `comparison_analyses` 表

---

### 4. 自定义问题提取

**页面路径:** `/dashboard/custom-questions`

**功能描述:**
- 用户定义特定问题
- AI基于财报数据回答
- 支持多个问题批量提问
- 保存常用问题模板

**预设问题模板:**
1. ROI如何体现?具体数据是什么?
2. 支出收入比是多少?如何界定好坏?
3. CapEx的主要投向?预期回报周期?
4. 毛利率变化的主要驱动因素?
5. 与竞争对手相比的相对优势?

**回答格式:**
- 问题重述
- 直接答案(1-2句核心结论)
- 详细解释(引用数据+分析逻辑)
- 判断依据(标准和基准)

**技术实现:**
- API: `/api/custom-questions`
- 前端: `app/dashboard/custom-questions/page.tsx`
- 数据库: `custom_questions` 表

---

## 📊 数据库架构更新

### 新增表

**1. comparison_analyses**
```sql
CREATE TABLE comparison_analyses (
  id SERIAL PRIMARY KEY,
  company_ids INTEGER[],        -- 对比公司ID数组
  comparison_content TEXT,      -- AI生成的对比内容
  created_by INTEGER,           -- 创建用户
  created_at TIMESTAMP
);
```

**2. custom_questions**
```sql
CREATE TABLE custom_questions (
  id SERIAL PRIMARY KEY,
  report_id INTEGER,            -- 关联财报
  questions JSONB,              -- 用户问题列表
  answers JSONB,                -- AI回答列表
  created_by INTEGER,           -- 创建用户
  created_at TIMESTAMP
);
```

### 表结构更新

**companies表新增字段:**
- `category VARCHAR(50)` - 公司类别(AI_APPLICATION/AI_SUPPLY_CHAIN)

### 视图和索引

**新增视图:**
- `latest_company_reports` - 每个公司的最新财报
- `category_summary` (物化视图) - 分类统计汇总

**新增索引:**
- `idx_companies_category` - 公司类别索引
- `idx_comparison_created_at` - 对比分析时间索引
- `idx_custom_questions_report` - 问题关联财报索引

---

## 🎨 UI更新

### 导航栏新增

**Sidebar新增菜单项:**
- 横向对比 (带NEW标签)
- 自定义问题 (带NEW标签)

**图标:**
- 横向对比: GitCompare图标
- 自定义问题: MessageSquarePlus图标

### 页面样式

**对比页面:**
- 公司选择卡片网格
- 类别筛选按钮
- 选中状态高亮
- Markdown格式渲染对比结果

**自定义问题页面:**
- 左右分栏布局
- 左侧:财报选择+常用问题
- 右侧:问题输入+提示
- 动态添加/删除问题
- Markdown格式渲染答案

---

## 🚀 部署步骤

### 1. 更新代码
```bash
cd /home/user/private-fund-analysis
git pull origin main
```

### 2. 安装新依赖
```bash
npm install
```

新增依赖:
- `react-markdown@^9.0.0` - Markdown渲染
- `remark-gfm@^4.0.0` - GitHub风格Markdown支持

### 3. 数据库迁移
```bash
# 执行新的schema更新
psql $DATABASE_URL -f lib/db/schema_update.sql
```

或在Vercel Dashboard执行:
```sql
-- 复制 lib/db/schema_update.sql 的内容
-- 在Vercel Postgres Query Editor中执行
```

### 4. 更新现有公司分类
```sql
-- 自动分类已有公司
UPDATE companies SET category = 'AI_APPLICATION' 
WHERE symbol IN ('MSFT', 'GOOGL', 'GOOG', 'AMZN', 'META', 'CRM', 'NOW', 'PLTR', 'AAPL', 'APP', 'ADBE');

UPDATE companies SET category = 'AI_SUPPLY_CHAIN' 
WHERE symbol IN ('NVDA', 'AMD', 'AVGO', 'TSM', 'MU', 'INTC', 'VRT', 'ETN', 'GEV', 'VST', 'ASML', 'SNPS');
```

### 5. 推送到GitHub
```bash
git add .
git commit -m "feat: Add company categorization, comparison and custom questions features"
git push origin main
```

### 6. Vercel自动部署
- Vercel会自动检测到代码更新
- 触发新的部署
- 等待部署完成

---

## 📝 使用说明

### 横向对比功能

1. 进入"横向对比"页面
2. 选择类别过滤(可选)
3. 勾选2家以上公司
4. 点击"开始对比"按钮
5. 等待AI分析(约30-60秒)
6. 查看对比结果表格和分析

### 自定义问题功能

1. 进入"自定义问题"页面
2. 左侧选择一份已分析的财报
3. 右侧输入问题(或使用常用问题模板)
4. 可添加多个问题
5. 点击"获取答案"按钮
6. 等待AI回答(每个问题约10-20秒)
7. 查看详细答案

---

## 🔧 技术细节

### Prompt工程

**两套prompt的设计原则:**
1. 结构一致性:保持相同的输出框架
2. 指标差异化:根据行业特点调整关键指标
3. 风险识别:AI供应链特别关注产能周期、地缘政治
4. 时间维度:供应链强调18-24个月投资lag

### API设计

**RESTful接口:**
- `POST /api/comparison` - 创建对比分析
- `GET /api/comparison` - 获取历史对比
- `POST /api/custom-questions` - 提交问题
- `GET /api/custom-questions` - 获取历史Q&A

**安全性:**
- 所有API需要身份验证
- Session验证
- SQL注入防护(参数化查询)

---

## 📈 性能优化

### 数据库查询优化
- 使用索引加速类别查询
- 物化视图缓存统计数据
- 定期刷新物化视图

### AI调用优化
- 批量问题合并调用
- 温度参数0.3提高一致性
- 超时设置300秒防止卡死

---

## 🐛 已知限制

1. **对比功能**
   - 一次最多对比5家公司(避免响应过长)
   - 需要公司有已分析的财报数据

2. **自定义问题**
   - 单次最多10个问题(避免超时)
   - 答案质量依赖财报数据完整性

3. **公司分类**
   - 仅支持预定义的24家公司
   - 新公司需要手动添加到分类列表

---

## 🔮 未来规划

### V2.1
- [ ] 支持更多公司自动分类
- [ ] 对比结果导出Excel
- [ ] 问题模板库用户自定义

### V2.2
- [ ] 时间序列趋势对比
- [ ] 行业平均值基准线
- [ ] 智能问题推荐

### V3.0
- [ ] 实时财报监控
- [ ] 多维度相关性分析
- [ ] 预测模型集成

---

## 📞 技术支持

如有问题,请查看:
1. GitHub Issues
2. 技术文档: `/home/user/private-fund-analysis/README.md`
3. API文档: 各API route文件的注释

---

**更新日期:** 2026-02-02
**版本:** V2.0
**状态:** ✅ 已完成并推送到GitHub
