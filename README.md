# Finsight Auto

AI 行业上市公司财报自动化下载与分析平台，覆盖 24 家 AI 龙头企业。

## 技术架构

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | Next.js 14, TypeScript, Tailwind CSS | 金融级数据仪表盘 |
| UI 组件 | shadcn/ui (Radix UI) | 一致的设计系统 |
| 后端 API | Next.js API Routes | RESTful 接口 |
| 下载引擎 | Python FastAPI | SEC EDGAR API + IR 页面爬取 |
| 数据库 | PostgreSQL 16 (Render) | 任务管理与日志存储 |
| 部署 | Render | Web Service + Worker |

## 功能特性

- **24 家 AI 龙头企业** - 10 家 AI 应用 + 14 家 AI 供应链
- **SEC EDGAR API** - 优先使用官方 API 获取美股财报
- **智能识别** - 自动匹配年份、季度、报告类型
- **批量下载** - 支持多年份、多季度、多公司组合下载
- **实时进度** - 下载任务实时状态追踪
- **专业 UI** - 金融私募基金风格的暗色主题

## 覆盖公司

### AI 应用 (10)
Microsoft, Alphabet, Amazon, Meta, Salesforce, ServiceNow, Palantir, Apple, AppLovin, Adobe

### AI 供应链 (14)
Nvidia, AMD, Broadcom, TSMC, SK Hynix, Micron, Samsung, Intel, Vertiv, Eaton, GE Vernova, Vistra, ASML, Synopsys

## 本地开发

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.local.template .env.local
# 编辑 .env.local 填入数据库连接信息

# 运行数据库迁移
npm run db:migrate

# 填充初始数据
npm run db:seed

# 启动开发服务器
npm run dev
```

## 部署

项目部署在 Render 平台：
- **前端**: Node.js Web Service
- **下载引擎**: Python Web Service
- **数据库**: Render PostgreSQL 16

## 项目结构

```
Finsight-auto/
├── app/                    # Next.js App Router
│   ├── (dashboard)/        # 仪表盘路由组
│   │   ├── page.tsx        # 仪表盘首页
│   │   ├── companies/      # 公司管理
│   │   ├── downloads/      # 下载中心
│   │   ├── history/        # 历史记录
│   │   └── settings/       # 系统设置
│   └── api/                # API 路由
├── components/             # React 组件
│   ├── ui/                 # 基础 UI 组件
│   ├── layout/             # 布局组件
│   ├── dashboard/          # 仪表盘组件
│   └── ...
├── lib/                    # 工具库
├── types/                  # TypeScript 类型
├── worker/                 # Python 下载引擎
│   ├── main.py             # FastAPI 入口
│   ├── downloader.py       # 下载核心逻辑
│   └── database.py         # 数据库操作
└── scripts/                # 数据库迁移脚本
```

## 合并计划

本项目设计为与 [private-fund-analysis](https://github.com/cam12138no1/private-fund-analysis) 合并：
- 共享相同的技术栈 (Next.js 14 + TypeScript + Tailwind)
- 下载功能将作为新的路由组集成
- Python Worker 保持独立微服务架构

## 许可证

MIT License
