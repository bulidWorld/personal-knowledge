# 只读类 Rust Commands — 实现架构

## 模块结构

```txt
src-tauri/src/
├── commands/
│   ├── mod.rs
│   ├── categories.rs
│   ├── tags.rs
│   ├── systems.rs
│   ├── knowledge.rs
│   ├── files.rs
│   └── mindmap.rs
└── models/
    ├── mod.rs
    ├── category.rs
    ├── tag.rs
    ├── system.rs
    ├── knowledge.rs
    ├── file.rs
    └── mindmap.rs
```

## Command 注册

`lib.rs` 中注册：

```rust
tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
        commands::categories::list_categories,
        commands::tags::list_tags,
        commands::systems::list_systems,
        commands::knowledge::list_knowledge,
        commands::knowledge::get_knowledge_detail,
        commands::files::list_files,
        commands::mindmap::get_mindmap,
    ])
```

## 查询模型

Rust model 使用 `serde::Serialize` 返回给前端，字段命名建议统一为 camelCase：

```rust
#[derive(Debug, serde::Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeItem {
    pub id: uuid::Uuid,
    pub title: String,
    pub content: Option<String>,
    pub content_type: String,
    pub description: Option<String>,
    pub is_favorite: bool,
    pub is_pinned: bool,
    pub created_at: chrono::NaiveDateTime,
    pub updated_at: chrono::NaiveDateTime,
}
```

如果前端当前类型使用 `createdAt`，Rust 通过 `serde(rename_all = "camelCase")` 保持一致。

## 查询参数

`KnowledgeQuery` 支持：

| 字段 | 说明 |
| ---- | ---- |
| `keyword` | 标题、描述、内容关键词 |
| `categoryId` | 分类筛选 |
| `tagId` | 标签筛选 |
| `systemId` | 系统筛选 |
| `favorite` | 收藏筛选 |
| `pinned` | 置顶筛选 |
| `page` | 页码 |
| `pageSize` | 每页数量 |

## SQL 原则

1. 使用参数化查询，禁止拼接用户输入。
2. 动态筛选可以使用 query builder 或明确的条件组合。
3. 标签、文件等一对多数据使用 JSON 聚合，避免前端二次请求过多。
4. 查询文件列表时排除 `content` 字段。

## services 映射

| Service | Desktop Command |
| ------- | --------------- |
| `listCategories` | `list_categories` |
| `listTags` | `list_tags` |
| `listSystems` | `list_systems` |
| `listKnowledge` | `list_knowledge` |
| `getKnowledgeDetail` | `get_knowledge_detail` |
| `listFiles` | `list_files` |
| `getMindmap` | `get_mindmap` |

## 风险控制

1. 只读阶段不实现任何 `INSERT`、`UPDATE`、`DELETE`。
2. 查询失败返回统一错误，不让页面白屏。
3. `BYTEA` 不经列表接口返回，避免内存风险。
