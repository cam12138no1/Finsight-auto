# Finsight 测试说明

## 测试架构

- **TypeScript/Next.js**: Vitest + React Testing Library
- **Python Worker**: pytest

## 运行测试

```bash
# 运行全部 TypeScript 单元测试
npm run test

# 监听模式（开发时）
npm run test:watch

# 覆盖率报告
npm run test:coverage

# 运行 Python Worker 测试
npm run test:python

# 运行全部测试（TS + Python）
npm run test:all
```

## 测试范围

### TypeScript 单元测试 (66 tests)

| 模块 | 文件 | 覆盖内容 |
|------|------|----------|
| `lib/utils` | `utils.test.ts` | cn, formatNumber, formatPercentage, getBeatMissVariant |
| `lib/file-validation` | `file-validation.test.ts` | validateFile (PDF/txt/docx), checkFileContent (安全检测) |
| `lib/fetch-retry` | `fetch-retry.test.ts` | fetchWithRetry (重试逻辑), downloadFile |
| `lib/ai/prompts` | `prompts.test.ts` | getCompanyCategory, getAnalysisPrompt, COMPANY_CATEGORIES |
| `lib/ratelimit` | `ratelimit.test.ts` | checkRateLimit, createRateLimitHeaders |
| `lib/session-validator` | `session-validator.test.ts` | validateDataAccess |
| `lib/export-excel` | `export-excel.test.ts` | exportAnalysisToExcel (中英文 locale) |
| `components/ui/button` | `button.test.tsx` | 渲染、点击、disabled、variant |
| `components/ui/badge` | `badge.test.tsx` | 渲染、profit/loss variant |

### Python Worker 测试

- `test_database.py`: 数据库连接、CRUD、job 管理
- `test_downloader.py`: EDGAR 搜索、IR 页面、内容校验、任务处理
- `test_e2e_download.py`: 需网络，可能因网络/限流失败
- `test_full_coverage.py`: 全公司 EDGAR 可达性，需网络

## 配置

- `vitest.config.ts`: Vitest 配置，jsdom 环境
- `test/setup.ts`: 全局 setup，jest-dom matchers，next/navigation mock
