# 搜索、思维导图和 AI 迁移

## 业务目标

完成 Desktop 端高级能力迁移，包括知识搜索、多条件筛选、思维导图读写和 AI 能力，使 Desktop 不只具备基础 CRUD，也能覆盖 Web 端主要知识工作流。

## 使用场景

### Desktop 搜索知识

用户输入关键词后，Desktop 通过 Rust Command 在 PostgreSQL 中搜索标题、描述、内容等字段，并返回与 Web 端一致的结果。

### Desktop 使用思维导图

用户打开思维导图视图，系统读取图数据。用户编辑后保存，数据写入 PostgreSQL，Web 端可见。

### Desktop 使用 AI 能力

用户在 Desktop 中触发摘要、自动标签或 Prompt 优化时，Rust Command 使用本地保存的 AI 配置发起请求，前端不直接接触 API Key。

## 功能范围

实现以下 Commands：

| Command | 说明 |
| ------- | ---- |
| `search_knowledge` | 知识搜索 |
| `get_mindmap` | 思维导图读取 |
| `save_mindmap` | 思维导图保存 |
| `ai_summarize` | AI 摘要 |
| `ai_auto_tags` | AI 自动标签 |
| `ai_optimize_prompt` | AI 优化 Prompt |

筛选能力需覆盖：

1. 分类筛选。
2. 标签筛选。
3. 系统筛选。
4. 收藏筛选。
5. 置顶筛选。
6. 关键词搜索。

## 安全要求

1. AI API Key 不传给普通 UI 组件。
2. Desktop AI 请求由 Rust 后端发起。
3. 错误提示不暴露完整密钥或请求头。
4. AI 配置保存遵守设置页安全策略。

## 验收标准

1. Web 和 Desktop 搜索结果一致。
2. 分类、标签、系统、收藏、置顶筛选结果一致。
3. 思维导图读写正常。
4. AI 设置可保存和读取。
5. AI 调用不暴露密钥到前端。
6. AI 调用失败时显示清楚错误。
