# 只读类 Rust Commands

## 业务目标

先在 Desktop 端实现只读查询能力，让用户可以通过 Rust Commands 查看 PostgreSQL 中的知识库数据，并与 Web 端展示结果保持一致。

该阶段优先降低风险：只查询不写入，不改变数据库内容。

## 使用场景

### Desktop 查看知识列表

用户在 Desktop 中打开首页或知识列表页，系统通过 `list_knowledge` 从 PostgreSQL 查询数据并展示。

### Desktop 查看知识详情

用户点击某条知识，系统通过 `get_knowledge_detail` 查询完整内容、分类、标签、系统和关联文件信息。

### Desktop 使用元数据筛选

用户查看分类、标签、系统筛选项时，Desktop 通过 Rust Commands 查询元数据。

## 功能范围

实现以下 Commands：

| Command | 说明 |
| ------- | ---- |
| `list_categories` | 查询分类列表 |
| `list_tags` | 查询标签列表 |
| `list_systems` | 查询系统列表 |
| `list_knowledge` | 查询知识列表，支持基础筛选 |
| `get_knowledge_detail` | 查询知识详情 |
| `list_files` | 查询文件元数据列表，不返回 BYTEA 内容 |
| `get_mindmap` | 查询思维导图数据 |

services 中 Desktop 分支从预留状态改为调用对应 `invoke`。

## 查询要求

1. 查询结果字段与 Web API 返回类型保持一致。
2. 列表查询支持分页、关键词、分类、标签、系统、收藏、置顶等已有筛选参数。
3. 文件列表只返回元数据，不直接返回大体积 `content BYTEA`。
4. 日期、UUID、JSON 字段序列化格式要与前端类型兼容。

## 验收标准

1. Web 端继续通过 `/api/*` 查询。
2. Desktop 端通过 Rust Commands 查询。
3. 两端知识列表展示结果一致。
4. 分类、标签、系统筛选正常。
5. 详情页正常展示。
6. 文件元数据可展示，但不会把文件二进制内容传到前端列表。
