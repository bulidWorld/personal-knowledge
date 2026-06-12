# 现状审计

## 业务目标

在开始 Web 与 Desktop 并存改造前，先完整梳理当前 Web 项目的页面、组件、API、数据库、文件与 AI 能力，形成一份可执行的迁移基线。

该阶段不改变现有功能，只产出迁移所需的事实清单，避免后续改造时遗漏调用点、数据结构或隐含业务规则。

## 使用场景

### 开发者查看当前页面能力

开发者可以从审计文档中看到当前 `src/app` 下有哪些页面、每个页面依赖哪些组件、页面是否存在服务端数据加载或浏览器端数据请求。

### 开发者查看后端接口能力

开发者可以从审计文档中看到 `src/app/api` 下所有接口的路径、HTTP 方法、请求参数、响应结构、数据库访问表以及错误处理方式。

### 开发者查看迁移优先级

开发者可以根据审计结果区分：

| 类型 | 说明 |
| ---- | ---- |
| 必须迁移到 Rust Command | Desktop 运行时无法依赖 Web API 的核心业务能力 |
| 可继续保留 Web API | 只服务 Web 端或短期不进入 Desktop MVP 的能力 |
| 需要改造为 services | 当前页面或组件中直接 `fetch('/api/*')` 的调用点 |
| 需要特殊处理 | 文件、AI、数据库配置、静态导出不兼容能力 |

## 审计范围

| 范围 | 内容 |
| ---- | ---- |
| 页面 | `src/app` 下所有页面、动态路由和布局 |
| 组件 | `src/components` 下核心业务组件和通用组件 |
| API | `src/app/api` 下所有 Route Handler |
| 数据库 | PostgreSQL 表、字段、约束、关联关系和种子数据 |
| 文件 | 上传、下载、预览、打开、存储位置和 BYTEA 使用情况 |
| AI | 摘要、自动标签、Prompt 优化等接口和密钥来源 |
| 环境变量 | `.env` 中 Web 运行依赖的数据库和 AI 配置 |
| 构建脚本 | `package.json` 中当前 dev、build、start、lint、typecheck 脚本 |

## 产出物

| 文件 | 说明 |
| ---- | ---- |
| `docs/desktop-migration-audit.md` | 当前系统能力和调用链审计 |
| `docs/api-command-mapping.md` | Web API 与未来 Rust Command 的映射表 |
| `docs/database-permission-guide.md` | Desktop 直连 PostgreSQL 所需账号权限建议 |

## 验收标准

1. 所有页面、API、主要组件都有记录。
2. 所有直接 `fetch('/api/*')` 的调用点都有记录。
3. 明确当前数据库表结构和文件存储方式。
4. 明确 Desktop MVP 必须覆盖的 API 和暂缓迁移的 API。
5. 明确静态导出、文件能力、AI 密钥、数据库直连的已知风险。
