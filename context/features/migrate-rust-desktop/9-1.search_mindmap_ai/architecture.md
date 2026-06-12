# 搜索、思维导图和 AI 迁移 — 实现架构

## 模块结构

```txt
src-tauri/src/
├── commands/
│   ├── knowledge.rs
│   ├── mindmap.rs
│   ├── ai.rs
│   └── settings.rs
├── models/
│   ├── knowledge.rs
│   ├── mindmap.rs
│   ├── ai.rs
│   └── settings.rs
└── config.rs
```

## 搜索 Command

`search_knowledge` 可复用 `list_knowledge` 的查询模型，也可以独立实现。

搜索字段建议：

1. `knowledge_items.title`
2. `knowledge_items.description`
3. `knowledge_items.content`
4. 分类名称
5. 标签名称
6. 系统名称

SQL 使用参数化查询，关键词使用 `ILIKE` 或 PostgreSQL full-text search。MVP 可以先使用 `ILIKE`，后续再升级全文索引。

## 思维导图 Commands

| Command | 输入 | 输出 |
| ------- | ---- | ---- |
| `get_mindmap` | 查询条件或根节点 id | 思维导图数据 |
| `save_mindmap` | 节点和边数据 | 保存后的版本或成功状态 |

保存需要事务，确保节点和边不会出现部分更新。

## AI Commands

| Command | 输入 | 行为 |
| ------- | ---- | ---- |
| `ai_summarize` | 文本或知识 id | 返回摘要 |
| `ai_auto_tags` | 文本或知识 id | 返回标签建议 |
| `ai_optimize_prompt` | Prompt 文本 | 返回优化结果 |

AI 配置来自 Desktop 本地配置或数据库设置，不由普通 UI 直接传入 API Key。

## 前端 services

```txt
mindmap-service.ts
├── getMindmap()
└── saveMindmap()

ai-service.ts
├── summarize()
├── autoTags()
└── optimizePrompt()
```

Web 分支继续调用 `/api/mindmap`、`/api/ai/*`，Desktop 分支调用 Rust Commands。

## 错误处理

| 场景 | 错误码 |
| ---- | ------ |
| AI Key 未配置 | `VALIDATION_ERROR` |
| AI 服务不可用 | `UNKNOWN_ERROR` |
| 思维导图数据不存在 | `NOT_FOUND` |
| 保存冲突或校验失败 | `VALIDATION_ERROR` |

## 风险控制

1. 不在前端日志打印 AI Key。
2. 大文本输入要限制长度，避免请求过大。
3. AI 超时需要可恢复错误。
4. 思维导图保存使用事务。
5. 搜索行为与 Web API 对齐，避免两端结果排序差异过大。
