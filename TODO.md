# Finsight Auto - 待办事项 (TODO)

> 更新日期: 2026-02-08
> 上次开发内容: 全功能实现 + 单元测试 + SEC EDGAR 爬取验证

---

## ✅ 已完成

### 后端修复
- [x] 修复前后端字段不匹配 (`company_tickers` vs `company_ids`)，API 现在同时支持两种格式
- [x] 修复 Python Worker `database.py` async/sync 混用，改为同步方法 + `ThreadedConnectionPool`
- [x] Worker `main.py` 使用 `run_in_executor` 在线程池中运行 DB 操作，不再阻塞事件循环
- [x] 修正 3 家公司 CIK：AppLovin (`0001751008`)、Broadcom (`0001730168`)、GE Vernova (`0001996810`)
- [x] 添加 20-F / 6-K 表单支持（TSMC、ASML 等外国私人发行人）
- [x] 改进季度匹配算法，支持非标准财年（MSFT 6月、AAPL 9月、MU 8月等）

### 下载引擎增强
- [x] 并发下载：`asyncio.Semaphore(3)` 控制并发
- [x] 重试机制：3 次重试 + 指数退避 (2s, 4s, 8s)
- [x] 速率限制：异步锁实现 1.2s 请求间隔
- [x] 内容验证：PDF 魔数、文件大小检测、HTML 错误页检测
- [x] 优雅关闭：Worker 支持 graceful shutdown

### 前端功能
- [x] 下载中心 (`downloads/page.tsx`) 接入 API，支持状态筛选、5s 自动刷新、取消任务
- [x] 历史记录 (`history/page.tsx`) 接入 API，支持搜索、分页、状态筛选
- [x] 仪表盘 `StatsCards` 接入 `/api/stats`，10s 自动刷新
- [x] 仪表盘 `RecentActivity` 接入 `/api/activity`
- [x] Header 搜索：⌘K 快捷键、公司模糊搜索
- [x] Settings 页面：实时检测数据库和 Worker 健康状态
- [x] Sidebar 系统状态指示灯接入 `/api/health`
- [x] 主题偏好持久化 (localStorage)
- [x] 新建下载页面：错误反馈、Loader2 修复

### 新增 API
- [x] `GET /api/logs` - 下载日志查询（搜索/筛选/分页）
- [x] `GET /api/logs/export` - CSV 导出（UTF-8 BOM，Excel 兼容）
- [x] `GET /api/activity` - 最近活动 Feed

### 测试
- [x] 59 个 Python 单元测试全部通过
- [x] 8 个 E2E 测试（真实 SEC EDGAR API）全部通过
- [x] 22 家美股公司 EDGAR 访问验证通过
- [x] 多年度多季度搜索验证（2023-2024 × Q1-Q3+FY）

---

## 🔲 未完成 - 需要继续开发

### 高优先级

- [ ] **重新运行全量覆盖验证**
  - 已修复 CIK + 20-F/6-K 支持 + 季度匹配算法，但尚未重新跑完整矩阵验证
  - 运行 `cd worker && python -m pytest tests/test_full_coverage.py -v -s`
  - 目标：命中率从 72.7% 提升到 85%+

- [ ] **AppLovin (APP) 特殊处理**
  - CIK `0001751008` 的 recent filings 只有 `4` 和 `144` 表单（内部人交易）
  - 10-Q/10-K 可能在 `filings.files` 的额外文件中，需要加载分页数据
  - 参考: `https://data.sec.gov/submissions/CIK0001751008.json` 中 `filings.files` 字段

- [ ] **Broadcom (AVGO) 验证**
  - 新 CIK `0001730168` 的 recent filings 也只有少量 10-K
  - 同样可能需要加载 `filings.files` 中的额外分页数据

- [ ] **SK Hynix / Samsung IR 页面爬取**
  - 无 SEC CIK（韩国上市），完全依赖 IR 页面
  - SK Hynix: `https://www.skhynix.com/eng/ir/earnings.do` 需要测试爬取
  - Samsung: `https://www.samsung.com/global/ir/...` 需要测试爬取
  - 可能需要特殊适配这两个页面的 HTML 结构

### 中优先级

- [ ] **EDGAR `filings.files` 分页加载**
  - 部分公司的 10-Q/10-K 不在 `recent` 中，而是在 `filings.files` 数组引用的额外 JSON 文件中
  - 需要在 `_search_edgar` 中添加：如果 `recent` 中找不到，遍历 `filings.files` 加载更多数据
  - 参考格式: `https://data.sec.gov/submissions/CIK{cik}-submissions-001.json`

- [ ] **下载文件实际存储**
  - 当前只记录 URL 和元数据到数据库，不保存文件到磁盘
  - 需要添加实际文件写入（本地或云存储）
  - 需求文档要求的目录结构：`earnings_reports/AI_Applications/Microsoft/2024_Q1_MSFT.pdf`

- [ ] **Next.js 前端测试**
  - 目前无前端组件测试或 API 路由测试
  - 建议用 Jest + React Testing Library
  - 重点测试: API 路由的请求/响应、组件的数据加载

- [ ] **下载任务详情页**
  - 路由 `downloads/[id]/page.tsx` 尚未创建
  - 应展示单个任务的所有下载日志、进度、错误详情
  - API `GET /api/downloads/[id]` 已就绪

### 低优先级

- [ ] **数据分析功能（扩展需求）**
  - 自动提取财报关键指标
  - 趋势对比图表
  - 营收/利润同比分析

- [ ] **通知功能**
  - 下载完成通知
  - 失败重试提醒

- [ ] **Excel 汇总报告**
  - 需求文档要求下载完成后生成 Excel
  - 当前只支持 CSV 导出

- [ ] **断点续传**
  - 已下载文件自动跳过
  - 中断后继续未完成的下载

- [ ] **磁盘空间检查**
  - 下载前检查剩余空间
  - 空间不足时预警

---

## 📋 测试运行方法

```bash
# Python Worker 全部测试 (59 个单元测试 + 8 个 E2E + 10 个全量覆盖)
cd worker
python -m pytest tests/ -v

# 仅单元测试（不需要网络）
python -m pytest tests/test_database.py tests/test_downloader.py tests/test_main.py -v

# 仅 E2E 测试（需要网络，访问 SEC EDGAR）
python -m pytest tests/test_e2e_download.py -v -s

# 全量 24 公司覆盖验证（需要网络，耗时 ~3 分钟）
python -m pytest tests/test_full_coverage.py -v -s
```

---

## 🏗️ 本地开发

```bash
# 前端
npm install
cp .env.local.template .env.local  # 编辑填入 DATABASE_URL
npm run db:migrate
npm run db:seed
npm run dev

# Worker
cd worker
pip install -r requirements.txt
DATABASE_URL="postgresql://..." python main.py
```
