# 私募基金财报分析平台 - 更新总结

## 更新日期
2026-02-02

## 部署信息
- **生产环境URL**: https://private-fund-analysis.vercel.app
- **GitHub仓库**: https://github.com/cam12138no1/private-fund-analysis
- **Vercel项目**: tapi-57108f62/private-fund-analysis

---

## 主要更新内容

### 1. 公司分类更新

根据用户要求，更新了公司分类为以下两大类：

#### AI应用公司（10家）
| 股票代码 | 公司名称 | 中文名 |
|---------|---------|--------|
| MSFT | Microsoft | 微软 |
| GOOGL | Alphabet (Google) | 谷歌 |
| AMZN | Amazon | 亚马逊 |
| META | Meta Platforms | Meta |
| CRM | Salesforce | Salesforce |
| NOW | ServiceNow | ServiceNow |
| PLTR | Palantir | Palantir |
| AAPL | Apple | 苹果 |
| APP | AppLovin | AppLovin |
| ADBE | Adobe | Adobe |

#### AI供应链公司（14家）
| 股票代码 | 公司名称 | 中文名 |
|---------|---------|--------|
| NVDA | Nvidia | 英伟达 |
| AMD | AMD | AMD |
| AVGO | Broadcom | 博通 |
| TSM | TSMC | 台积电 |
| 000660.KS | SK Hynix | SK海力士 |
| MU | Micron | 美光 |
| 005930.KS | Samsung Electronics | 三星电子 |
| INTC | Intel | 英特尔 |
| VRT | Vertiv | Vertiv |
| ETN | Eaton | 伊顿 |
| GEV | GE Vernova | GE Vernova |
| VST | Vistra | Vistra |
| ASML | ASML | 阿斯麦 |
| SNPS | Synopsys | 新思科技 |

---

### 2. AI分析Prompt更新

#### AI应用公司分析Prompt（新版）

采用用户提供的sell-side分析师风格Prompt，核心特点：

**角色定位**：顶级美股/科技股研究分析师（sell-side写作风格）

**核心问题**：本次财报是否改变了我们对未来2-3年现金流与竞争力的判断？

**输出结构**（6大部分）：
1. **一句话结论** - 正面/中性/负面判断 + 核心驱动 + 影响评估
2. **业绩对市场预期** - Revenue/EPS/Margin等关键指标对比表格
3. **增长驱动拆解**
   - 需求侧（用户/流量）
   - 变现侧（ARPU/客单价）
   - 效率侧（成本/费用率）
4. **投入与ROI**
   - 投入指向：算力？人才？渠道？供应链？并购？
   - ROI证据：2-3个已体现的结果
   - 管理层底线承诺/框架
5. **可持续性与风险**
   - 主要可持续驱动（1-3条）
   - 主要风险（1-3条）
   - 检查点：未来验证/证伪指标
6. **投委会可用判断**
   - 更有信心/更担心什么
   - 接下来要盯什么
   - 对长期叙事的净影响

**写作约束**：
- 必须对比实际 vs 预期
- 必须把AI/技术从"故事"落到指标→机制→财务变量
- 必须识别并剥离一次性因素
- 不允许空泛形容词不带指标

---

### 3. 横向对比功能增强

**更新内容**：
- 按分类选择公司（AI应用/AI供应链）
- 支持选择2-10家公司进行对比
- 生成结构化对比表格
- AI生成投资吸引力排序

**对比维度**：
- Revenue增速
- EPS增速
- Gross Margin
- Operating Margin
- CapEx占比
- FCF
- Beat/Miss/Inline标识

---

### 4. 自定义问题功能增强

**新增评价体系分类**：
- **ROI分析** - 投资回报率如何体现？
- **费用/收入比** - 支出收入比如何界定好坏？
- **CapEx分析** - 资本支出主要投向哪些领域？
- **盈利能力** - 毛利率驱动因素是什么？
- **现金流** - 自由现金流状况如何？

**预设问题模板**：
- ROI表现如何？具体体现在哪些指标上？
- 费用/收入比例是多少？相比行业平均水平如何？
- CapEx主要投向哪些领域？预期回报周期？
- 毛利率变化的主要驱动因素是什么？
- 自由现金流状况如何？是否支持当前估值？

---

## 技术更新

### 依赖更新
- 添加 `@vercel/kv` 用于数据存储

### 文件变更
- `lib/ai/prompts.ts` - 更新Prompt配置
- `lib/ai/analyzer.ts` - 更新分析器逻辑
- `lib/db/simple-storage.ts` - 更新公司列表
- `app/dashboard/comparison/page.tsx` - 更新对比页面
- `app/dashboard/custom-questions/page.tsx` - 更新自定义问题页面
- `app/api/comparison/route.ts` - 更新对比API
- `app/api/custom-questions/route.ts` - 更新自定义问题API

---

## 使用说明

### 登录信息
- **邮箱**: admin@example.com
- **密码**: admin123

### 功能入口
1. **财报分析** - Dashboard → 上传财报 → AI自动分析
2. **横向对比** - Dashboard → 横向对比 → 选择分类和公司
3. **自定义问题** - Dashboard → 自定义问题 → 选择评价体系

---

## 后续建议

1. **配置Vercel KV存储** - 需要在Vercel控制台创建KV存储实例
2. **测试AI分析功能** - 上传真实财报测试分析效果
3. **调整Prompt** - 根据实际分析结果微调Prompt参数

---

## 联系方式

如有问题，请联系开发团队。
