# 标签功能 — 实现架构

## 数据模型

### 表结构

```sql
-- 标签表
CREATE TABLE tags (
  id         VARCHAR PRIMARY KEY,           -- 例: tag-design, tag-custom-xxx
  name       VARCHAR NOT NULL,              -- 标签名称
  color      VARCHAR NOT NULL DEFAULT '#6366f1', -- HEX 颜色值
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 条目-标签关联表（多对多）
CREATE TABLE entry_tags (
  entry_id   VARCHAR NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  tag_id     VARCHAR NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_id, tag_id)
);
```

### 查询时标签聚合

条目列表查询使用 PostgreSQL 子查询 + `json_agg` 聚合标签：

```sql
COALESCE(
  (SELECT json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color))
   FROM entry_tags et
   JOIN tags t ON et.tag_id = t.id
   WHERE et.entry_id = e.id),
  '[]'::json
) as tags
```

返回格式：`[{id: "tag-dev", name: "开发", color: "#10b981"}]`

## API 架构

### 新增端点

```
/api/tags
├── GET     — 列出所有标签，LEFT JOIN entry_tags 统计 entry_count
├── POST    — 创建标签，需要 name（必填）和 color（选填）
└── [id]
    ├── PUT    — 更新标签名称/颜色
    └── DELETE — 删除标签（CASCADE 自动清理 entry_tags 关联）
```

### 已有端点改动

**GET /api/knowledge** — 新增查询参数：
- `tagId` — 过滤方式：`e.id IN (SELECT entry_id FROM entry_tags WHERE tag_id = $N)`

**POST /api/knowledge** — 新增请求体字段：
- `tagIds: string[]` — 创建条目后批量插入 `entry_tags`（使用 `ON CONFLICT DO NOTHING`）

**PUT /api/knowledge/[id]** — 新增请求体字段：
- `tagIds: string[]` — 先 `DELETE FROM entry_tags WHERE entry_id = $1`，再逐个 INSERT，实现全量同步

**GET /api/knowledge/[id]** — 响应中新增 `tags` 字段

### 错误处理
- 创建/更新标签时验证 name 非空，否则返回 400
- 操作不存在的标签返回 404
- 标签 CRUD 失败返回 500 + 通用错误消息

## 前端架构

### 类型定义 (`src/types/knowledge.ts`)

```typescript
interface Tag {
  id: string          // 标签唯一标识
  name: string        // 标签名称
  color: string       // HEX 颜色值
  entryCount?: number // 使用该标签的条目数（从API获取）
}

// KnowledgeEntry 新增字段
tags?: Tag[]

// KnowledgeFormData 新增字段
tagIds?: string[]
```

### 状态管理 (`src/hooks/knowledge-context.tsx`)

标签状态全部集中在 `KnowledgeProvider` 中：

| 状态 | 类型 | 说明 |
|------|------|------|
| `tagsData` | `Tag[]` | 所有标签列表 |
| `selectedTagId` | `string \| null` | 当前选中的过滤标签 |

| 方法 | 说明 |
|------|------|
| `fetchTags()` | 从 `/api/tags` 获取标签列表 |
| `selectTag(id)` | 设置标签过滤（传 null 清除） |
| `createTag({name, color})` | 创建新标签并刷新列表 |
| `updateTag(id, {name, color})` | 更新标签并刷新列表 |
| `deleteTag(id)` | 删除标签，如已选中则自动清除过滤 |

选中标签后 `fetchEntries` 自动在请求中携带 `tagId` 参数，切换标签或清除标签时重置到第一页。

### 组件树

```
AppShell (标签CRUD状态 + 模态框)
├── AppSidebar (标签列表 + 过滤入口)
│   └── 标签区域: 显示所有标签、计数、hover编辑/删除、点击过滤
├── page.tsx (标签过滤指示器 + 详情展示)
│   ├── 过滤指示: 当前激活标签的彩色徽章 + 清除按钮
│   └── 条目详情: 查看/编辑模式下均显示标签
├── KnowledgeCard (标签徽章)
│   └── 标题下方展示彩色标签小徽章
└── KnowledgeForm (标签选择器)
    └── 标签多选 chips，点击切换，选中时背景变为标签颜色
```

### 标签颜色渲染策略

- **徽章背景** = `tag.color + '18'`（约 10% 不透明度）
- **徽章文字** = `tag.color`
- **徽章边框** = `tag.color + '33'`（约 20% 不透明度）
- **选中状态** = 标签颜色作为实色背景，文字白色

这样确保不同颜色标签在暗色/亮色背景下都有足够的对比度。

### 编辑时的标签同步

1. `AppShell.handleEdit()` — 从 `entry.tags` 提取 `id` 数组传入 `tagIds`
2. `KnowledgeForm` — 通过 `toggleTag()` 维护本地 `tagIds` 数组
3. 表单提交时 `tagIds` 随请求体发送到 API
4. API 端先删后插实现全量同步

## 种子数据

`scripts/migrate-tags.ts` — 独立的迁移脚本，使用 `pg` 直连数据库：
- 创建 `tags` 和 `entry_tags` 表（`IF NOT EXISTS`，幂等）
- 检测 `tags` 表是否为空，为空时插入 5 个默认标签
- 可重复执行，不会重复插入
