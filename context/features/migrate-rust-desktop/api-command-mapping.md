# API Command Mapping

阶段：`0-1.current_state_audit`

本文件记录当前 Web API 与未来 Tauri/Rust Commands 的一一映射。命名以稳定、语义清晰为主，后续实现阶段可在不改变 UI service 方法名的前提下微调 Rust command 名称。

## 1. Knowledge

| Web API | 当前行为 | Desktop Command | MVP | 备注 |
| ------- | -------- | --------------- | --- | ---- |
| `GET /api/knowledge` | 分页查询知识；支持 `page`、`pageSize`、`search`、`categoryId`、`tagId`；按热度和更新时间排序 | `list_knowledge(query)` | 是 | 需要返回 `{ entries,total,page,pageSize,totalPages }` |
| `POST /api/knowledge` | 创建知识条目并写入标签关联 | `create_knowledge(payload)` | 是 | 校验标题、分类；建议 Rust 事务包裹条目和标签 |
| `GET /api/knowledge/[id]` | 查询条目详情 | `get_knowledge(id)` | 是 | 当前 UI 暂少直接使用，但服务层应提供 |
| `PUT /api/knowledge/[id]` | 更新知识条目，可同步标签关联 | `update_knowledge(id, payload)` | 是 | `tagIds` 只有是数组时才同步 |
| `DELETE /api/knowledge/[id]` | 删除知识条目 | `delete_knowledge(id)` | 是 | `entry_tags` 依赖级联 |
| `POST /api/knowledge/[id]/click` | 记录点击，60 秒窗口内只计一次 | `record_knowledge_click(id)` | 是 | 需要 `entry_clicks`、`entry_click_windows` |

建议 service 方法：

| Service | Web 分支 | Desktop 分支 |
| ------- | -------- | ------------ |
| `listKnowledge(query)` | `fetch('/api/knowledge?...')` | `invoke('list_knowledge', { query })` |
| `createKnowledge(payload)` | `POST /api/knowledge` | `invoke('create_knowledge', { payload })` |
| `getKnowledge(id)` | `GET /api/knowledge/[id]` | `invoke('get_knowledge', { id })` |
| `updateKnowledge(id,payload)` | `PUT /api/knowledge/[id]` | `invoke('update_knowledge', { id, payload })` |
| `deleteKnowledge(id)` | `DELETE /api/knowledge/[id]` | `invoke('delete_knowledge', { id })` |
| `recordKnowledgeClick(id)` | `POST /api/knowledge/[id]/click` | `invoke('record_knowledge_click', { id })` |

## 2. Categories

| Web API | 当前行为 | Desktop Command | MVP | 备注 |
| ------- | -------- | --------------- | --- | ---- |
| `GET /api/categories` | 查询分类并统计条目数 | `list_categories()` | 是 | 返回字段当前为 snake_case |
| `POST /api/categories` | 创建分类 | `create_category(payload)` | 是 | Web 使用 `randomUUID` |
| `PUT /api/categories/[id]` | 更新分类 | `update_category(id, payload)` | 是 | 当前无存在性检查 |
| `DELETE /api/categories/[id]` | 删除空分类；有条目时返回业务错误 | `delete_category(id)` | 是 | 必须保留错误信息语义 |

建议 service 方法：`listCategories`、`createCategory`、`updateCategory`、`deleteCategory`。

## 3. Tags

| Web API | 当前行为 | Desktop Command | MVP | 备注 |
| ------- | -------- | --------------- | --- | ---- |
| `GET /api/tags` | 查询标签并统计条目数 | `list_tags()` | 是 | 返回 `entry_count` |
| `POST /api/tags` | 创建标签 | `create_tag(payload)` | 是 | 校验 `name` |
| `PUT /api/tags/[id]` | 更新标签 | `update_tag(id, payload)` | 是 | 404: 标签不存在 |
| `DELETE /api/tags/[id]` | 删除标签 | `delete_tag(id)` | 是 | `entry_tags` 依赖级联 |

建议 service 方法：`listTags`、`createTag`、`updateTag`、`deleteTag`。

## 4. Systems

| Web API | 当前行为 | Desktop Command | MVP | 备注 |
| ------- | -------- | --------------- | --- | ---- |
| `GET /api/systems` | 查询系统并统计节点数 | `list_systems()` | 是 | 按 `updated_at DESC` |
| `POST /api/systems` | 创建系统，并自动创建根 topic 节点 | `create_system(payload)` | 是 | 建议 Rust 事务包裹 |
| `PUT /api/systems/[id]` | 更新系统名和描述 | `update_system(id, payload)` | 是 | 当前 UI 只传 `name` |
| `DELETE /api/systems/[id]` | 删除系统、节点、连线 | `delete_system(id)` | 是 | 当前手动删除；也可依赖 FK 但需保持行为 |

建议 service 方法：`listSystems`、`createSystem`、`updateSystem`、`deleteSystem`。

## 5. Mind Map

### Nodes

| Web API | 当前行为 | Desktop Command | MVP | 备注 |
| ------- | -------- | --------------- | --- | ---- |
| `GET /api/mindmap/nodes?systemId=...` | 查询系统下节点 | `list_mindmap_nodes(system_id)` | 是 | 缺少 `systemId` 返回 400 |
| `POST /api/mindmap/nodes` | 创建节点 | `create_mindmap_node(payload)` | 是 | 校验 `title`、`systemId`、`nodeType` |
| `PUT /api/mindmap/nodes/[id]` | 部分更新节点 | `update_mindmap_node(id, payload)` | 是 | 当前先读旧值再合并 |
| `DELETE /api/mindmap/nodes/[id]` | 删除相关连线、直接子节点和自身 | `delete_mindmap_node(id)` | 是 | 当前不是递归删除全部后代 |

### Connections

| Web API | 当前行为 | Desktop Command | MVP | 备注 |
| ------- | -------- | --------------- | --- | ---- |
| `GET /api/mindmap/connections?systemId=...` | 查询系统下连线 | `list_mindmap_connections(system_id)` | 是 | 缺少 `systemId` 返回 400 |
| `POST /api/mindmap/connections` | 创建连线 | `create_mindmap_connection(payload)` | 是 | 校验三项 id |
| `DELETE /api/mindmap/connections/[id]` | 删除连线 | `delete_mindmap_connection(id)` | 是 | 返回 `{ success:true }` |

建议 service 文件：`mindmap-service.ts`，集中暴露 nodes 和 connections 方法。

## 6. Files

| Web API | 当前行为 | Desktop Command | MVP | 备注 |
| ------- | -------- | --------------- | --- | ---- |
| `POST /api/upload` | 上传图片到 `uploads.data BYTEA`，返回 `/api/files/{id}` | `upload_image(payload)` | 是 | Desktop 不能直接传 `FormData` 给 Rust；可传 path 或 byte array |
| `GET /api/files/[id]` | 返回二进制图片响应 | `get_file_bytes(id)` 或 `open_file(id)` | 是 | Desktop 需要决定 blob URL、data URL、临时文件路径 |

建议 service 方法：

| Service | Web 分支 | Desktop 分支 |
| ------- | -------- | ------------ |
| `uploadImage(file)` | multipart `POST /api/upload` | `invoke('upload_image', { fileName,mimeType,bytes })` 或 native file picker path |
| `resolveFileUrl(idOrUrl)` | 保留 `/api/files/{id}` | `invoke('get_file_bytes')` 后生成 blob/data URL |
| `openFile(id)` | 浏览器打开 URL | `invoke('open_file', { id })` |

## 7. Settings And Diagnostics

当前 Web 项目没有设置 API，但 Desktop 需要新增：

| 能力 | Desktop Command | MVP | 备注 |
| ---- | --------------- | --- | ---- |
| 测试数据库连接 | `test_database_connection(config)` | 是 | 阶段 4-1 |
| 保存数据库配置 | `save_database_config(config)` | 是 | 不写入前端 bundle |
| 读取数据库配置摘要 | `get_database_config_status()` | 是 | 不返回密码明文 |
| 获取运行时信息 | `get_runtime_info()` | 可选 | 便于诊断 |

## 8. AI

当前没有已实现 Web API。后续如果落地 `docs/ai-integration-plan.md`，建议映射：

| 计划能力 | Web API | Desktop Command | MVP |
| -------- | ------- | --------------- | --- |
| 摘要 | `POST /api/ai/summarize` | `ai_summarize(payload)` | 否 |
| 自动标签 | `POST /api/ai/tags` | `ai_suggest_tags(payload)` | 否 |
| Prompt 优化 | `POST /api/ai/optimize-prompt` | `ai_optimize_prompt(payload)` | 否 |

## 9. 返回字段兼容策略

当前 PostgreSQL 查询返回多为 snake_case，前端 hooks 使用 normalize 函数转为 camelCase。迁移时有两种可选策略：

| 策略 | 优点 | 风险 |
| ---- | ---- | ---- |
| Rust Commands 直接返回 camelCase | UI 和 TypeScript 类型更干净 | 需要仔细对齐所有字段 |
| Services 对 Web 和 Desktop 返回统一 normalize | 保留 Web API 行为，降低一次性变更 | service 层代码稍多 |

建议阶段 1 先把 normalize 逻辑移入 services 或复用现有 hooks normalize，保证 UI 之后只消费 camelCase。
