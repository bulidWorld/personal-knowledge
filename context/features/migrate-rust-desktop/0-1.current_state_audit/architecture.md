# 现状审计 — 实现架构

## 审计方式

使用只读方式扫描当前代码，不修改业务逻辑。

建议按以下顺序审计：

1. 扫描 `src/app`，建立页面和路由清单。
2. 扫描 `src/app/api`，建立接口清单。
3. 搜索 `fetch(`、`axios`、`/api/`，定位 UI 直接访问后端的位置。
4. 搜索数据库访问入口，例如 `src/lib/db.ts`、`pg`、`Pool`、`sql`。
5. 梳理文件相关代码，例如上传、下载、预览、BYTEA、临时文件。
6. 梳理 AI 相关代码和环境变量。
7. 对照 `migrate-dev-plan.md` 输出 Desktop Command 迁移映射。

## 推荐命令

```bash
rg --files src/app src/components src/hooks src/lib src/types
rg "fetch\\(|axios|/api/" src
rg "Pool|pg|sqlx|BYTEA|bytea|FormData|upload|download|file" src
rg "OPENAI|AI_|apiKey|summarize|optimize|tag" src .env*
```

## 审计文档结构

`docs/desktop-migration-audit.md` 建议包含：

```txt
1. 页面清单
2. 组件清单
3. API 清单
4. UI 直接请求清单
5. 数据库表结构
6. 文件能力链路
7. AI 能力链路
8. 构建脚本与环境变量
9. Desktop 迁移风险
10. MVP 范围建议
```

`docs/api-command-mapping.md` 建议按功能域维护：

| 功能域 | Web API | Desktop Command | MVP | 备注 |
| ------ | ------- | --------------- | --- | ---- |
| 知识 | `GET /api/knowledge` | `list_knowledge` | 是 | 列表查询 |
| 文件 | `POST /api/upload` | `upload_file_to_postgres` | 是 | Web 与 Desktop 入参不同 |
| AI | `POST /api/ai/summarize` | `ai_summarize` | 否 | MVP 可暂缓 |

## 判断规则

### 需要进入 services 的调用

页面、组件、hook 中出现以下逻辑时，需要在阶段 1 改为 services：

```ts
fetch('/api/knowledge')
fetch(`/api/knowledge/${id}`)
fetch('/api/tags')
```

### 需要 Rust Command 的能力

Desktop 静态前端不能依赖 Next.js API Routes，因此以下能力需要 Rust Command：

1. 查询知识、分类、标签、系统。
2. 新增、更新、删除知识和元数据。
3. 文件上传、打开、导出、删除和关联。
4. 搜索、思维导图和 AI 能力。
5. 数据库连接测试和本地配置保存。

### 需要特殊风险记录的能力

1. 使用服务端渲染或动态 API 的页面，可能影响 `output: 'export'`。
2. 直接读取 `.env` 的前端代码，可能导致 Desktop 构建或密钥暴露问题。
3. 大文件经前端 Base64 传输，可能导致内存占用过高。
4. Web API 与 Rust Command 可能出现校验规则不一致。

## 不做事项

1. 不重构代码。
2. 不新增 Tauri。
3. 不修改数据库表。
4. 不改变 Web 端运行方式。
