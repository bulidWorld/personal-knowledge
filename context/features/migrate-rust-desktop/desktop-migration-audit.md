# Desktop Migration Audit

阶段：`0-1.current_state_audit`

审计时间：2026-06-12

## 1. 当前结论

当前项目是一个 Next.js App Router 单页知识库应用，UI 入口集中在 `src/app/page.tsx`，全局壳在 `src/components/AppShell.tsx`。数据访问全部经 Next.js API Routes 连接远端 PostgreSQL；前端尚未有 `src/services` 适配层，页面、hooks 和部分工具函数直接调用 `/api/*`。

Desktop MVP 必须覆盖的动态能力包括：

| 能力 | 当前实现 | Desktop 迁移判断 |
| ---- | -------- | ---------------- |
| 知识条目 CRUD、分页、搜索、分类/标签过滤 | `src/app/api/knowledge*` | 必须迁移为 Rust Commands |
| 分类 CRUD | `src/app/api/categories*` | 必须迁移为 Rust Commands |
| 标签 CRUD | `src/app/api/tags*` | 必须迁移为 Rust Commands |
| 系统建模 CRUD | `src/app/api/systems*` | 必须迁移为 Rust Commands |
| 思维导图节点/连线 CRUD | `src/app/api/mindmap/*` | 必须迁移为 Rust Commands |
| 图片上传到 PostgreSQL BYTEA | `src/app/api/upload` | 必须迁移，Desktop 入参不同 |
| 图片读取/预览 | `src/app/api/files/[id]` | 必须迁移，Desktop 需要 blob/temp file 策略 |
| 热度点击统计 | `src/app/api/knowledge/[id]/click` | 建议进入 Desktop MVP |
| AI 能力 | 目前无实际 API Route | 暂缓，后续按计划新增 |

## 2. 页面与布局清单

| 文件 | 类型 | 作用 | 数据访问 |
| ---- | ---- | ---- | -------- |
| `src/app/layout.tsx` | Root Layout | 设置 metadata，包裹 `AppShell` | 无直接请求 |
| `src/app/page.tsx` | Client Page | 知识列表、详情、内联编辑、思维导图画布、系统卡片入口 | 通过 hooks 获取数据；另有 `PUT /api/knowledge/[id]` 直接请求 |
| `src/app/globals.css` | 全局样式 | Tailwind/全局样式 | 无 |

当前没有其他 App Router 页面或动态页面。所有主要交互都挂在首页和全局壳内。

## 3. 组件清单

| 文件 | 作用 | 后端依赖 |
| ---- | ---- | -------- |
| `src/components/AppShell.tsx` | 全局应用壳、侧栏、弹窗、创建/编辑/删除调度 | 通过 `knowledge-context`、`mindmap-context` 调用 API；另有 `PUT /api/systems/[id]` 直接请求 |
| `src/components/AppSidebar.tsx` | 分类、标签、系统导航 | 由 props 接收数据 |
| `src/components/SearchBar.tsx` | 搜索输入 | 由 props 回调 |
| `src/components/KnowledgeGrid.tsx` | 知识卡片网格 | 由 props 接收数据 |
| `src/components/KnowledgeCard.tsx` | 单个知识卡片 | 由 props 接收数据 |
| `src/components/KnowledgeForm.tsx` | 创建/编辑知识表单，含富文本/Markdown/HTML | Markdown 粘贴图片通过 `paste-image` 上传；富文本粘贴图片使用 data URL |
| `src/components/Pagination.tsx` | 分页控件 | 由 props 回调 |
| `src/components/Modal.tsx` | 通用弹窗 | 无 |
| `src/components/IframeEmbed.tsx` | iframe 内容展示 | 使用条目 `iframeUrl` |
| `src/components/SystemCardGrid.tsx` | 系统卡片列表 | 由 props 接收数据 |
| `src/components/SystemCard.tsx` | 单个系统卡片 | 由 props 接收数据 |
| `src/components/MindMapCanvas.tsx` | 思维导图画布、拖拽、新增节点入口 | 由 props 回调 |
| `src/components/MindMapNode.tsx` | 思维导图节点 | 由 props 回调 |
| `src/components/MindMapConnection.tsx` | 节点连线 | 由 props 接收数据 |
| `src/components/NodeContextMenu.tsx` | 节点右键菜单 | 由 props 回调 |

## 4. Hooks 与工具清单

| 文件 | 作用 | 迁移影响 |
| ---- | ---- | -------- |
| `src/hooks/knowledge-context.tsx` | 知识、分类、标签数据状态和 CRUD | 阶段 1 需要替换为 services 调用 |
| `src/hooks/mindmap-context.tsx` | 系统、节点、连线状态和 CRUD | 阶段 1 需要替换为 services 调用 |
| `src/hooks/app-context.tsx` | UI 动作上下文 | 无直接 API，但承载调用链 |
| `src/hooks/use-debounce.ts` | 防抖 hook | 无 API 依赖 |
| `src/lib/db.ts` | Web API PostgreSQL Pool | Web 保留；Desktop 不复用 |
| `src/lib/hot-card.ts` | 热度分数 SQL、点击统计表懒创建 | Rust 需要复刻 SQL 和 schema 初始化策略 |
| `src/lib/paste-image.ts` | Markdown 图片粘贴上传 | 阶段 1 需要进入 file service |
| `src/lib/content-render.ts` | 内容渲染和图片 referrer 处理 | Desktop 可复用 |

## 5. API Route 清单

| 路径 | 方法 | 请求 | 返回 | 表 |
| ---- | ---- | ---- | ---- | -- |
| `/api/knowledge` | GET | `page`、`pageSize`、`search`、`categoryId`、`tagId` | `{ entries,total,page,pageSize,totalPages }` | `entries`、`categories`、`entry_tags`、`tags`、`entry_clicks` |
| `/api/knowledge` | POST | `KnowledgeFormData` | 新建条目 | `entries`、`entry_tags` |
| `/api/knowledge/[id]` | GET | path `id` | 条目详情 | `entries`、`categories`、`entry_tags`、`tags` |
| `/api/knowledge/[id]` | PUT | `KnowledgeFormData` | 更新后条目 | `entries`、`entry_tags` |
| `/api/knowledge/[id]` | DELETE | path `id` | `{ success:true }` | `entries` |
| `/api/knowledge/[id]/click` | POST | path `id` | `{ success,counted }` | `entries`、`entry_clicks`、`entry_click_windows` |
| `/api/categories` | GET | 无 | 分类列表，含 `entry_count` | `categories`、`entries` |
| `/api/categories` | POST | name/icon/color/description | `{ id,...body }` | `categories` |
| `/api/categories/[id]` | PUT | name/icon/color/description | `{ id,...body }` | `categories` |
| `/api/categories/[id]` | DELETE | path `id` | `{ success:true }` 或错误 | `categories`、`entries` |
| `/api/tags` | GET | 无 | 标签列表，含 `entry_count` | `tags`、`entry_tags` |
| `/api/tags` | POST | `name`、`color` | 新标签 | `tags` |
| `/api/tags/[id]` | PUT | `name`、`color` | 更新后标签 | `tags` |
| `/api/tags/[id]` | DELETE | path `id` | `{ success:true }` | `tags` |
| `/api/systems` | GET | 无 | 系统列表，含 `node_count` | `systems`、`mindmap_nodes` |
| `/api/systems` | POST | `name` 等可选样式字段 | 新系统，自动创建根节点 | `systems`、`mindmap_nodes` |
| `/api/systems/[id]` | PUT | `name`、`description` | 更新后系统 | `systems` |
| `/api/systems/[id]` | DELETE | path `id` | `{ success:true }` | `systems`、`mindmap_nodes`、`mindmap_connections` |
| `/api/mindmap/nodes` | GET | `systemId` | 节点列表 | `mindmap_nodes` |
| `/api/mindmap/nodes` | POST | 节点 payload | 新节点 | `mindmap_nodes` |
| `/api/mindmap/nodes/[id]` | PUT | 节点部分字段 | 更新后节点 | `mindmap_nodes` |
| `/api/mindmap/nodes/[id]` | DELETE | path `id` | `{ success:true }` | `mindmap_nodes`、`mindmap_connections` |
| `/api/mindmap/connections` | GET | `systemId` | 连线列表 | `mindmap_connections` |
| `/api/mindmap/connections` | POST | `systemId`、`sourceNodeId`、`targetNodeId` | 新连线 | `mindmap_connections` |
| `/api/mindmap/connections/[id]` | DELETE | path `id` | `{ success:true }` | `mindmap_connections` |
| `/api/upload` | POST | multipart `file` | `{ url,id }` | `uploads` |
| `/api/files/[id]` | GET | path `id` | 二进制响应 | `uploads` |

## 6. UI 直接请求清单

| 文件 | 调用点 | 当前 API | 阶段 1 目标 service |
| ---- | ------ | -------- | ------------------- |
| `src/hooks/knowledge-context.tsx` | `fetchEntries` | `GET /api/knowledge?...` | `knowledge-service.listKnowledge` |
| `src/hooks/knowledge-context.tsx` | `fetchCategories` | `GET /api/categories` | `category-service.listCategories` |
| `src/hooks/knowledge-context.tsx` | `fetchTags` | `GET /api/tags` | `tag-service.listTags` |
| `src/hooks/knowledge-context.tsx` | `createEntry` | `POST /api/knowledge` | `knowledge-service.createKnowledge` |
| `src/hooks/knowledge-context.tsx` | `updateEntry` | `PUT /api/knowledge/[id]` | `knowledge-service.updateKnowledge` |
| `src/hooks/knowledge-context.tsx` | `deleteEntry` | `DELETE /api/knowledge/[id]` | `knowledge-service.deleteKnowledge` |
| `src/hooks/knowledge-context.tsx` | `createCategory` | `POST /api/categories` | `category-service.createCategory` |
| `src/hooks/knowledge-context.tsx` | `updateCategory` | `PUT /api/categories/[id]` | `category-service.updateCategory` |
| `src/hooks/knowledge-context.tsx` | `deleteCategory` | `DELETE /api/categories/[id]` | `category-service.deleteCategory` |
| `src/hooks/knowledge-context.tsx` | `createTag` | `POST /api/tags` | `tag-service.createTag` |
| `src/hooks/knowledge-context.tsx` | `updateTag` | `PUT /api/tags/[id]` | `tag-service.updateTag` |
| `src/hooks/knowledge-context.tsx` | `deleteTag` | `DELETE /api/tags/[id]` | `tag-service.deleteTag` |
| `src/hooks/knowledge-context.tsx` | `recordEntryClick` | `POST /api/knowledge/[id]/click` | `knowledge-service.recordEntryClick` |
| `src/hooks/mindmap-context.tsx` | `fetchSystems` | `GET /api/systems` | `system-service.listSystems` |
| `src/hooks/mindmap-context.tsx` | `createSystem` | `POST /api/systems` | `system-service.createSystem` |
| `src/hooks/mindmap-context.tsx` | `deleteSystem` | `DELETE /api/systems/[id]` | `system-service.deleteSystem` |
| `src/hooks/mindmap-context.tsx` | `fetchNodes` | `GET /api/mindmap/nodes?systemId=...` | `mindmap-service.listNodes` |
| `src/hooks/mindmap-context.tsx` | `createNode` | `POST /api/mindmap/nodes` | `mindmap-service.createNode` |
| `src/hooks/mindmap-context.tsx` | `updateNode` | `PUT /api/mindmap/nodes/[id]` | `mindmap-service.updateNode` |
| `src/hooks/mindmap-context.tsx` | `deleteNode` | `DELETE /api/mindmap/nodes/[id]` | `mindmap-service.deleteNode` |
| `src/hooks/mindmap-context.tsx` | `fetchConnections` | `GET /api/mindmap/connections?systemId=...` | `mindmap-service.listConnections` |
| `src/hooks/mindmap-context.tsx` | `createConnection` | `POST /api/mindmap/connections` | `mindmap-service.createConnection` |
| `src/hooks/mindmap-context.tsx` | `deleteConnection` | `DELETE /api/mindmap/connections/[id]` | `mindmap-service.deleteConnection` |
| `src/app/page.tsx` | `saveEntryEdit` | `PUT /api/knowledge/[id]` | `knowledge-service.updateKnowledge` 或复用 context |
| `src/components/AppShell.tsx` | `doRenameSystem` | `PUT /api/systems/[id]` | `system-service.updateSystem` |
| `src/lib/paste-image.ts` | `handleMarkdownImagePaste` | `POST /api/upload` | `file-service.uploadImage` |

## 7. 数据库表结构

结构来源：`scripts/migrate-sqlite-to-pg.ts`、`scripts/migrate-tags.ts`、`scripts/migrate-entry-clicks.ts`、`src/lib/hot-card.ts`。

| 表 | 字段 | 说明 |
| -- | ---- | ---- |
| `categories` | `id` PK, `name`, `icon`, `border_color`, `dot_color`, `gradient`, `description`, `created_at` | 知识分类 |
| `entries` | `id` PK, `title`, `html_content`, `markdown_content`, `richtext_content`, `content_type`, `category_id` FK, `iframe_url`, `image_url`, `created_at`, `updated_at` | 知识条目 |
| `tags` | `id` PK, `name`, `color`, `created_at` | 标签 |
| `entry_tags` | `entry_id` FK, `tag_id` FK, composite PK | 条目和标签多对多 |
| `systems` | `id` PK, `name`, `description`, `icon`, `border_color`, `dot_color`, `gradient`, `created_at`, `updated_at` | 系统建模空间 |
| `mindmap_nodes` | `id` PK, `system_id` FK, `title`, 三种内容字段, `content_type`, `node_type`, `parent_id`, `x`, `y`, `color`, `created_at`, `updated_at` | 思维导图节点 |
| `mindmap_connections` | `id` PK, `system_id` FK, `source_node_id` FK, `target_node_id` FK, `created_at` | 思维导图连线 |
| `uploads` | `id` PK, `filename`, `mime_type`, `data BYTEA`, `size`, `created_at` | 已迁移到 PostgreSQL 的图片文件 |
| `entry_clicks` | `id BIGSERIAL` PK, `entry_id` FK, `clicked_at` | 热度点击明细 |
| `entry_click_windows` | `entry_id` PK/FK, `last_counted_at` | 60 秒点击限流窗口 |

索引：

| 索引 | 表 | 说明 |
| ---- | -- | ---- |
| `idx_entries_category_id` | `entries(category_id)` | 分类过滤 |
| `idx_entries_updated_at` | `entries(updated_at DESC)` | 更新时间排序 |
| `idx_mindmap_nodes_system_id` | `mindmap_nodes(system_id)` | 系统节点查询 |
| `idx_mindmap_nodes_parent_id` | `mindmap_nodes(parent_id)` | 父子节点查询 |
| `idx_mindmap_connections_system_id` | `mindmap_connections(system_id)` | 系统连线查询 |
| `idx_mindmap_connections_source_node_id` | `mindmap_connections(source_node_id)` | 源节点查询 |
| `idx_mindmap_connections_target_node_id` | `mindmap_connections(target_node_id)` | 目标节点查询 |
| `idx_entry_clicks_entry_id_clicked_at` | `entry_clicks(entry_id, clicked_at DESC)` | 热度统计 |

注意：`entry_clicks` 与 `entry_click_windows` 会被 `src/lib/hot-card.ts` 在 API 调用时懒创建。Rust 侧如果继续使用热度排序，应在连接初始化或 command 调用前保证 schema 存在。

## 8. 文件能力链路

当前文件能力仅覆盖图片：

1. Markdown 粘贴图片走 `src/lib/paste-image.ts`。
2. 前端构造 `FormData`，字段名为 `file`。
3. `POST /api/upload` 校验 MIME 白名单和 10MB 大小上限。
4. API 将文件读成 `Buffer`，写入 `uploads.data BYTEA`。
5. 返回 `{ url: "/api/files/{id}", id }`。
6. Markdown 内容保存 `/api/files/{id}` URL。
7. `GET /api/files/[id]` 从 `uploads` 读取 `data` 和 `mime_type`，返回二进制响应，设置长期缓存。

MIME 白名单：`image/png`、`image/jpeg`、`image/webp`、`image/gif`、`image/svg+xml`、`image/bmp`。

特殊点：

| 点 | 影响 |
| -- | ---- |
| 富文本粘贴图片在 `src/app/page.tsx` 和 `KnowledgeForm` 中使用 `FileReader.readAsDataURL` | 不经 `uploads` 表，可能导致内容字段存储大块 base64 |
| 旧文件迁移脚本 `scripts/migrate-files-to-db.ts` 会把 `/uploads/{filename}` 替换为 `/api/files/{id}` | Desktop 不能直接依赖 `/api/files` URL |
| Desktop 静态前端无法由 Next API 提供二进制 URL | 需要 `file-service` 在 Desktop 下生成 blob URL、data URL、或通过 Rust 写临时文件 |

## 9. AI 能力链路

当前运行代码中没有 `src/app/api/ai/*`，也没有 OpenAI SDK 依赖。`docs/ai-integration-plan.md` 是计划文档，不是已实现功能。

运行代码里与 AI 相关的实际行为：

| 文件 | 行为 |
| ---- | ---- |
| `src/lib/content-render.ts` | 渲染内容时识别 `prompt:`、`promptResponse:` 文字并上色 |

因此 Desktop MVP 可暂缓 AI Command；后续阶段如果新增 AI 能力，需要同时处理 Web API、Rust Command、密钥存储与错误规范。

## 10. 构建脚本与环境变量

`package.json` 当前脚本：

| 脚本 | 命令 | 说明 |
| ---- | ---- | ---- |
| `dev` | `next dev -p 3006` | Web 开发服务器 |
| `build` | `next build` | Web 构建 |
| `start` | `next start -p 3006` | Web 生产服务器 |
| `lint` | `next lint` | 当前 Next 15 项目可能不再支持该命令 |
| `migrate:pg` | `npx tsx scripts/migrate-sqlite-to-pg.ts` | SQLite 到 PostgreSQL 迁移 |

环境变量键名：

| 变量 | 用途 |
| ---- | ---- |
| `DB_HOST` | PostgreSQL host |
| `DB_PORT` | PostgreSQL port |
| `DB_USER` | PostgreSQL user |
| `DB_PASS` | PostgreSQL password |
| `DB_NAME` | PostgreSQL database |

`next.config.ts` 当前为空配置，没有 `output: 'export'`。Desktop 静态导出阶段需要专门调整并验证 API Route 不参与 Desktop 构建链路。

## 11. Desktop 迁移风险

| 风险 | 说明 | 建议阶段 |
| ---- | ---- | -------- |
| UI 直接 `fetch('/api/*')` | Desktop 静态前端没有 Next API | 1-1 services adapter |
| API 返回 snake_case，前端 normalize 为 camelCase | Rust models 需要保持兼容或 services 做统一 normalize | 1-1、5-1 |
| 数据库 schema 没有统一迁移系统 | Rust 直连需要确认表已存在，热度表当前懒创建 | 4-1、5-1 |
| `scripts/*` 中存在默认连接值 | 不应复制到 Desktop 配置 | 4-1 |
| `uploads` 只支持图片且 URL 是 `/api/files/{id}` | Desktop 需要替代 URL 策略 | 7-1 |
| 富文本图片可能以 base64 存在内容字段 | 大内容会影响性能和同步 | 7-1 |
| 分类删除业务规则依赖 API 检查 | Rust 需要复刻“分类下有条目不可删” | 6-1 |
| 系统创建自动创建根节点 | Rust 需要复刻事务语义 | 6-1 |
| 节点删除手动删除一级子节点 | 当前只删除直接子节点，不递归；Rust 应保持兼容或明确修复 | 6-1 |
| `lint` 脚本可能在 Next 15 下失败 | 阶段验证不能只依赖 `npm run lint` | 3-1 |

## 12. MVP 范围建议

Desktop MVP 建议包含：

1. 服务适配层：知识、分类、标签、系统、思维导图、文件上传/读取。
2. Tauri shell 能加载现有 UI。
3. Rust 连接远端 PostgreSQL 并提供只读 Commands。
4. Rust 写 Commands 覆盖 CRUD、点击统计和图片上传。
5. 统一错误结构，保证 Web 与 Desktop UI 看到相同错误语义。
6. Windows 打包前解决 `/api/files/{id}` 静态前端不可用问题。

暂缓：

1. AI 摘要、自动标签、Prompt 优化。
2. 系统托盘、全局快捷键、原生菜单。
3. 通用附件管理和系统默认程序打开非图片附件。
