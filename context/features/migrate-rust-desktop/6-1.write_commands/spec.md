# 写入类 Rust Commands

## 业务目标

Desktop 端支持完整的知识、分类、标签、系统 CRUD，以及收藏、置顶等状态变更。写入 PostgreSQL 后，Web 与 Desktop 两端都能看到一致数据。

## 使用场景

### Desktop 新增知识

用户在 Desktop 中创建知识条目，保存后数据写入远端 PostgreSQL，Web 端刷新后可见。

### Desktop 编辑知识

用户修改标题、内容、分类、标签、系统、收藏或置顶状态，保存后两端展示一致。

### Desktop 删除数据

用户删除知识、分类、标签或系统时，系统按既有业务规则处理关联数据，并显示确认提示。

## 功能范围

实现以下 Commands：

| 功能 | Commands |
| ---- | -------- |
| 分类 | `create_category`、`update_category`、`delete_category` |
| 标签 | `create_tag`、`update_tag`、`delete_tag` |
| 系统 | `create_system`、`update_system`、`delete_system` |
| 知识 | `create_knowledge`、`update_knowledge`、`delete_knowledge` |
| 状态 | `favorite_knowledge`、`pin_knowledge` |

## 写入要求

1. Web API 与 Rust Commands 使用相同表结构和字段语义。
2. 标签、文件等关联关系写入必须使用事务。
3. 更新知识时，标签关联采用明确同步策略。
4. 删除操作遵守数据库外键和业务规则。
5. 所有写操作返回更新后的数据或明确成功状态。

## 验收标准

1. Web 新增的数据 Desktop 可见。
2. Desktop 新增的数据 Web 可见。
3. 两端编辑后的结果一致。
4. 删除操作有确认提示。
5. 写操作失败时 UI 有明确错误提示。
6. 事务失败不会留下半写入数据。
