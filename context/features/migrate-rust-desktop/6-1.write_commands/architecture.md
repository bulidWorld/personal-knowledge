# 写入类 Rust Commands — 实现架构

## 模块延续

在只读 Commands 的基础上，扩展：

```txt
src-tauri/src/commands/
├── categories.rs
├── tags.rs
├── systems.rs
└── knowledge.rs
```

每个模块同时包含查询和写入 Command，但要按函数职责清晰分组。

## Payload 模型

示例：

```rust
#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateKnowledgePayload {
    pub title: String,
    pub content: Option<String>,
    pub content_type: String,
    pub description: Option<String>,
    pub url: Option<String>,
    pub system_id: Option<uuid::Uuid>,
    pub category_id: Option<uuid::Uuid>,
    pub tag_ids: Vec<uuid::Uuid>,
}
```

前端 payload 字段要与 `src/types` 保持一致。

## 事务边界

需要事务的操作：

1. 创建知识并写入标签关联。
2. 更新知识并全量同步标签关联。
3. 删除知识并依赖外键清理关联。
4. 删除标签、分类、系统时如果需要处理关联数据。

示例流程：

```txt
begin transaction
  update knowledge_items
  delete knowledge_tags where knowledge_id = $1
  insert knowledge_tags
commit
```

## 校验规则

Rust Commands 需要复刻 Web API 的核心校验：

| 字段 | 校验 |
| ---- | ---- |
| `title` | 必填，去除首尾空格后不能为空 |
| `contentType` | 必须是允许类型 |
| `tagIds` | 必须引用存在标签 |
| `categoryId` | 如果传入必须存在 |
| `systemId` | 如果传入必须存在 |

校验失败返回 `VALIDATION_ERROR`。

## Command 返回

建议：

| 操作 | 返回 |
| ---- | ---- |
| create | 新建后的完整对象 |
| update | 更新后的完整对象 |
| delete | `{ success: true }` 或空结果 |
| favorite / pin | 更新后的知识条目或状态对象 |

## services 映射

| Service | Desktop Command |
| ------- | --------------- |
| `createKnowledge` | `create_knowledge` |
| `updateKnowledge` | `update_knowledge` |
| `deleteKnowledge` | `delete_knowledge` |
| `favoriteKnowledge` | `favorite_knowledge` |
| `pinKnowledge` | `pin_knowledge` |
| `createCategory` | `create_category` |
| `updateCategory` | `update_category` |
| `deleteCategory` | `delete_category` |
| `createTag` | `create_tag` |
| `updateTag` | `update_tag` |
| `deleteTag` | `delete_tag` |
| `createSystem` | `create_system` |
| `updateSystem` | `update_system` |
| `deleteSystem` | `delete_system` |

## 风险控制

1. 所有 SQL 使用参数化查询。
2. 写入逻辑加事务。
3. Rust 与 Web 的默认值保持一致，例如 `is_favorite=false`。
4. 删除前端继续使用确认弹窗，不在 Rust 内做 UI 假设。
