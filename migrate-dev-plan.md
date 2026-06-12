# personal-knowledge-desktop Web 与 Desktop 并存改造设计文档

## 1. 项目背景

当前项目是一个基于 Web 技术栈实现的个人知识库系统，主要使用 Next.js、React、TypeScript 构建前端和 Web API，数据存储使用远端 PostgreSQL。文件内容也已经迁移到 PostgreSQL 中，不再依赖本地文件目录、MinIO 或 S3。

现在需要在保留 Web 端能力的基础上，新增 Windows Desktop 端。Desktop 端使用 Tauri + Rust 实现桌面应用能力，最终能够打包为 Windows 可执行程序和安装包。

本次改造不是废弃 Web 端，而是实现：

```txt
Web 端和 Desktop 端长期并存
UI 代码共用一套
数据共用同一个远端 PostgreSQL
Web 端继续使用 Next.js API Routes
Desktop 端使用 Tauri invoke + Rust Commands
```

---

## 2. 核心目标

### 2.1 产品目标

实现一个同时支持 Web 浏览器访问和 Windows 桌面安装运行的个人知识库系统。

Web 端适合：

```txt
1. 浏览器访问
2. 远程访问
3. 原有用户继续使用
4. Web 部署环境继续保留
```

Desktop 端适合：

```txt
1. Windows 桌面运行
2. 更好的本地文件选择体验
3. 系统默认程序打开附件
4. 桌面快捷键
5. 系统托盘
6. 后续扩展本地能力
```

### 2.2 技术目标

本次改造需要达成以下技术目标：

```txt
1. UI 页面和组件只维护一套代码。
2. Web 端和 Desktop 端共用 src/app、src/components、src/types。
3. 数据访问通过 src/services 统一封装。
4. Web 端 services 调用 /api/*。
5. Desktop 端 services 调用 Tauri invoke。
6. Web API Routes 保留。
7. Desktop 新增 Rust Commands。
8. Web API 和 Rust Commands 访问同一个远端 PostgreSQL。
9. 文件继续存储在 PostgreSQL 中。
10. Desktop 端可打包为 Windows setup.exe。
```

---

## 3. 总体架构

## 3.1 并存架构总览

```txt
同一套前端 UI
      ↓
src/services 适配层
      ↓
┌───────────────────────┬────────────────────────┐
│ Web 端                 │ Desktop 端              │
│ fetch('/api/*')        │ invoke('command_name')  │
│ Next.js API Routes     │ Rust Commands           │
└───────────────────────┴────────────────────────┘
      ↓
远端 PostgreSQL
      ↓
知识数据 + 分类 + 标签 + 系统 + 文件 BYTEA
```

## 3.2 Web 端运行链路

```txt
Browser
  ↓
Next.js 页面 / React 组件
  ↓
src/services/*
  ↓
fetch('/api/knowledge')
  ↓
src/app/api/*
  ↓
src/lib/db.ts
  ↓
远端 PostgreSQL
```

## 3.3 Desktop 端运行链路

```txt
Windows Desktop App
  ↓
Tauri Window / WebView2
  ↓
Next.js 静态前端
  ↓
src/services/*
  ↓
invoke('list_knowledge')
  ↓
Rust Commands
  ↓
SQLx / PostgreSQL 连接池
  ↓
远端 PostgreSQL
```

## 3.4 代码复用边界

```txt
共用：
1. 页面 UI
2. 组件
3. 表单
4. 列表
5. 弹窗
6. Markdown 渲染
7. TypeScript 类型
8. 前端校验
9. 前端 hooks
10. services 方法名

不共用：
1. Web API Routes
2. Desktop Rust Commands
3. 文件选择底层实现
4. 文件打开底层实现
5. 数据库连接方式
6. 桌面快捷键
7. 托盘
8. Windows 打包配置
```

---

## 4. 最终目录结构设计

```txt
personal-knowledge-desktop/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   │
│   │   ├── knowledge/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   │
│   │   ├── categories/
│   │   │   └── page.tsx
│   │   │
│   │   ├── tags/
│   │   │   └── page.tsx
│   │   │
│   │   ├── systems/
│   │   │   └── page.tsx
│   │   │
│   │   ├── files/
│   │   │   └── page.tsx
│   │   │
│   │   ├── settings/
│   │   │   └── page.tsx
│   │   │
│   │   └── api/
│   │       ├── knowledge/
│   │       ├── categories/
│   │       ├── tags/
│   │       ├── systems/
│   │       ├── files/
│   │       ├── upload/
│   │       ├── mindmap/
│   │       └── ai/
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── Toolbar.tsx
│   │   │
│   │   ├── knowledge/
│   │   │   ├── KnowledgeList.tsx
│   │   │   ├── KnowledgeCard.tsx
│   │   │   ├── KnowledgeEditor.tsx
│   │   │   ├── KnowledgeDetail.tsx
│   │   │   └── KnowledgeSearchBar.tsx
│   │   │
│   │   ├── files/
│   │   │   ├── FilePicker.tsx
│   │   │   ├── FileList.tsx
│   │   │   ├── FilePreview.tsx
│   │   │   └── FileActions.tsx
│   │   │
│   │   ├── settings/
│   │   │   ├── SettingsLayout.tsx
│   │   │   ├── DatabaseSettingsPanel.tsx
│   │   │   ├── AiSettingsPanel.tsx
│   │   │   └── DesktopSettingsPanel.tsx
│   │   │
│   │   └── common/
│   │       ├── Button.tsx
│   │       ├── Dialog.tsx
│   │       ├── ConfirmDialog.tsx
│   │       ├── Loading.tsx
│   │       └── ErrorMessage.tsx
│   │
│   ├── services/
│   │   ├── runtime.ts
│   │   ├── http-client.ts
│   │   ├── tauri-client.ts
│   │   ├── knowledge-service.ts
│   │   ├── category-service.ts
│   │   ├── tag-service.ts
│   │   ├── system-service.ts
│   │   ├── file-service.ts
│   │   ├── mindmap-service.ts
│   │   ├── ai-service.ts
│   │   └── settings-service.ts
│   │
│   ├── hooks/
│   │   ├── useKnowledge.ts
│   │   ├── useCategories.ts
│   │   ├── useTags.ts
│   │   ├── useSystems.ts
│   │   ├── useFiles.ts
│   │   └── useRuntime.ts
│   │
│   ├── types/
│   │   ├── api.ts
│   │   ├── runtime.ts
│   │   ├── knowledge.ts
│   │   ├── category.ts
│   │   ├── tag.ts
│   │   ├── system.ts
│   │   ├── file.ts
│   │   ├── mindmap.ts
│   │   └── settings.ts
│   │
│   └── lib/
│       ├── db.ts
│       ├── utils.ts
│       ├── validators.ts
│       └── constants.ts
│
├── src-tauri/
│   ├── src/
│   │   ├── main.rs
│   │   ├── lib.rs
│   │   ├── app_state.rs
│   │   ├── db.rs
│   │   ├── config.rs
│   │   ├── error.rs
│   │   │
│   │   ├── models/
│   │   │   ├── mod.rs
│   │   │   ├── knowledge.rs
│   │   │   ├── category.rs
│   │   │   ├── tag.rs
│   │   │   ├── system.rs
│   │   │   ├── file.rs
│   │   │   ├── mindmap.rs
│   │   │   └── settings.rs
│   │   │
│   │   ├── commands/
│   │   │   ├── mod.rs
│   │   │   ├── knowledge.rs
│   │   │   ├── categories.rs
│   │   │   ├── tags.rs
│   │   │   ├── systems.rs
│   │   │   ├── files.rs
│   │   │   ├── mindmap.rs
│   │   │   ├── ai.rs
│   │   │   └── settings.rs
│   │   │
│   │   └── utils/
│   │       ├── mod.rs
│   │       ├── hash.rs
│   │       ├── temp_file.rs
│   │       └── path.rs
│   │
│   ├── capabilities/
│   │   └── default.json
│   │
│   ├── icons/
│   │   ├── icon.ico
│   │   ├── 32x32.png
│   │   └── 128x128.png
│   │
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── docs/
│   ├── desktop-migration-design.md
│   ├── desktop-build-guide.md
│   ├── api-command-mapping.md
│   └── database-permission-guide.md
│
├── next.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

## 5. 前端共用设计

## 5.1 UI 共用原则

Web 和 Desktop 共用一套 UI 代码。

以下目录中的代码默认同时服务 Web 和 Desktop：

```txt
src/app/*
src/components/*
src/hooks/*
src/types/*
src/lib/utils.ts
src/lib/validators.ts
```

例如修改：

```txt
src/components/knowledge/KnowledgeCard.tsx
```

则 Web 端和 Desktop 端都会生效。

## 5.2 UI 层禁止直接访问后端

页面和组件中禁止直接写：

```ts
fetch('/api/knowledge')
```

也禁止直接写：

```ts
invoke('list_knowledge')
```

必须统一通过 services 调用：

```ts
import { listKnowledge } from '@/services/knowledge-service'

const data = await listKnowledge()
```

这样 UI 层不感知运行环境。

## 5.3 运行环境判断

```ts
// src/services/runtime.ts

export type RuntimeType = 'web' | 'desktop'

export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export function getRuntimeType(): RuntimeType {
  return isTauriRuntime() ? 'desktop' : 'web'
}
```

## 5.4 services 适配层

以知识列表为例：

```ts
// src/services/knowledge-service.ts

import { invoke } from '@tauri-apps/api/core'
import { isTauriRuntime } from './runtime'
import type {
  KnowledgeItem,
  KnowledgeQuery,
  CreateKnowledgePayload,
  UpdateKnowledgePayload
} from '@/types/knowledge'

export async function listKnowledge(query?: KnowledgeQuery): Promise<KnowledgeItem[]> {
  if (isTauriRuntime()) {
    return invoke<KnowledgeItem[]>('list_knowledge', { query })
  }

  const params = new URLSearchParams(query as any).toString()
  const res = await fetch(`/api/knowledge?${params}`)
  if (!res.ok) {
    throw new Error('查询知识列表失败')
  }
  return res.json()
}

export async function createKnowledge(payload: CreateKnowledgePayload): Promise<KnowledgeItem> {
  if (isTauriRuntime()) {
    return invoke<KnowledgeItem>('create_knowledge', { payload })
  }

  const res = await fetch('/api/knowledge', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!res.ok) {
    throw new Error('创建知识失败')
  }

  return res.json()
}

export async function updateKnowledge(payload: UpdateKnowledgePayload): Promise<KnowledgeItem> {
  if (isTauriRuntime()) {
    return invoke<KnowledgeItem>('update_knowledge', { payload })
  }

  const res = await fetch(`/api/knowledge/${payload.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!res.ok) {
    throw new Error('更新知识失败')
  }

  return res.json()
}

export async function deleteKnowledge(id: string): Promise<void> {
  if (isTauriRuntime()) {
    return invoke<void>('delete_knowledge', { id })
  }

  const res = await fetch(`/api/knowledge/${id}`, {
    method: 'DELETE'
  })

  if (!res.ok) {
    throw new Error('删除知识失败')
  }
}
```

---

## 6. Web 端设计

## 6.1 Web 端职责

Web 端继续保留当前 Next.js 能力：

```txt
1. 浏览器访问
2. Next.js 页面渲染
3. Next.js API Routes
4. 连接远端 PostgreSQL
5. 文件上传到 PostgreSQL
6. 文件下载或浏览器预览
7. AI 接口调用
```

## 6.2 Web 端后端结构

```txt
src/app/api/
├── knowledge/
├── categories/
├── tags/
├── systems/
├── files/
├── upload/
├── mindmap/
└── ai/
```

## 6.3 Web 端数据库访问

继续保留：

```txt
src/lib/db.ts
```

示例：

```ts
// src/lib/db.ts

import { Pool } from 'pg'

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
})
```

## 6.4 Web 端文件上传流程

```txt
用户在浏览器选择文件
  ↓
<input type="file" />
  ↓
前端调用 uploadFile()
  ↓
services 判断为 Web
  ↓
POST /api/upload
  ↓
Next.js API Route 读取 FormData
  ↓
写入 PostgreSQL files.content BYTEA
  ↓
返回文件元数据
```

## 6.5 Web 端部署方式

```txt
npm run build:web
npm run start:web
```

或部署到支持 Next.js Node Runtime 的服务器。

---

## 7. Desktop 端设计

## 7.1 Desktop 端职责

Desktop 端由 Tauri + Rust 提供：

```txt
1. Windows 桌面窗口
2. 加载 Next.js 静态前端
3. Rust 连接远端 PostgreSQL
4. Rust Commands 替代 /api/*
5. 系统文件选择器
6. 从 PostgreSQL 读取文件并写入临时目录
7. 调用系统默认程序打开文件
8. 数据库连接配置保存
9. AI 配置保存
10. 桌面快捷键、托盘、菜单栏
11. Windows 安装包打包
```

## 7.2 Desktop 前端构建方式

Desktop 端使用 Next.js 静态导出：

```txt
Next.js build
  ↓
out/
  ↓
Tauri 打包 out/
  ↓
Windows exe / setup.exe
```

## 7.3 Desktop 后端 Rust 结构

```txt
src-tauri/src/
├── db.rs
├── config.rs
├── app_state.rs
├── error.rs
├── commands/
└── models/
```

## 7.4 Rust 数据库连接

```rust
// src-tauri/src/db.rs

use sqlx::{PgPool, postgres::PgPoolOptions};

pub async fn create_pool(database_url: &str) -> Result<PgPool, sqlx::Error> {
    PgPoolOptions::new()
        .max_connections(10)
        .min_connections(1)
        .connect(database_url)
        .await
}
```

## 7.5 Rust AppState

```rust
// src-tauri/src/app_state.rs

use sqlx::PgPool;

pub struct AppState {
    pub db: PgPool,
}
```

## 7.6 Rust Command 示例

```rust
// src-tauri/src/commands/knowledge.rs

use tauri::State;
use crate::app_state::AppState;
use crate::models::knowledge::{KnowledgeItem, KnowledgeQuery};

#[tauri::command]
pub async fn list_knowledge(
    query: Option<KnowledgeQuery>,
    state: State<'_, AppState>,
) -> Result<Vec<KnowledgeItem>, String> {
    let items = sqlx::query_as::<_, KnowledgeItem>(
        r#"
        SELECT id, title, content, content_type, created_at, updated_at
        FROM knowledge_items
        ORDER BY updated_at DESC
        "#
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(items)
}
```

---

## 8. 数据库设计

## 8.1 数据库共用原则

Web 和 Desktop 共用同一个 PostgreSQL 数据库。

```txt
Web API Routes 访问 PostgreSQL
Desktop Rust Commands 访问 PostgreSQL
```

两端必须遵守同一套表结构、字段含义、校验规则和删除策略。

## 8.2 核心表

### 8.2.1 知识表

```sql
CREATE TABLE knowledge_items (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  content_type TEXT NOT NULL,
  description TEXT,
  url TEXT,
  system_id UUID,
  category_id UUID,
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 8.2.2 分类表

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 8.2.3 标签表

```sql
CREATE TABLE tags (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 8.2.4 知识标签关联表

```sql
CREATE TABLE knowledge_tags (
  knowledge_id UUID NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (knowledge_id, tag_id)
);
```

### 8.2.5 系统表

```sql
CREATE TABLE systems (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 8.2.6 文件表

文件内容继续存储在 PostgreSQL 中：

```sql
CREATE TABLE files (
  id UUID PRIMARY KEY,
  original_name TEXT NOT NULL,
  mime_type TEXT,
  size BIGINT NOT NULL,
  sha256 TEXT,
  content BYTEA NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 8.2.7 知识文件关联表

推荐支持一条知识关联多个文件：

```sql
CREATE TABLE knowledge_files (
  knowledge_id UUID NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (knowledge_id, file_id)
);
```

## 8.3 文件存储注意事项

因为文件存在 PostgreSQL 中，需要注意：

```txt
1. 限制单文件大小。
2. 使用 sha256 去重。
3. 数据库备份体积会增加。
4. 避免大文件 Base64 传给前端。
5. Desktop 打开文件时应由 Rust 写临时文件。
6. Web 下载文件时可由 API Route 返回流。
```

建议限制：

```txt
图片：20MB
普通文档：50MB
压缩包：默认禁止或单独确认
视频文件：不建议入库
```

---

## 9. 文件模块设计

## 9.1 文件模块共用接口

前端统一调用：

```ts
uploadFile(params)
openFile(fileId)
exportFile(fileId)
deleteFile(fileId)
attachFileToKnowledge(knowledgeId, fileId)
detachFileFromKnowledge(knowledgeId, fileId)
```

## 9.2 Web 文件上传

```txt
Web 端：
用户选择文件
  ↓
FilePicker 使用 input file
  ↓
services/file-service.ts
  ↓
POST /api/upload
  ↓
Next.js API Route
  ↓
PostgreSQL BYTEA
```

## 9.3 Desktop 文件上传

```txt
Desktop 端：
用户点击上传
  ↓
Tauri dialog.open()
  ↓
获得本地文件路径
  ↓
invoke('upload_file_to_postgres')
  ↓
Rust 读取文件
  ↓
计算 sha256
  ↓
写入 PostgreSQL BYTEA
```

## 9.4 Web 文件打开

```txt
用户点击打开文件
  ↓
services 判断 Web
  ↓
window.open('/api/files/:id')
  ↓
浏览器下载或预览
```

## 9.5 Desktop 文件打开

```txt
用户点击打开文件
  ↓
services 判断 Desktop
  ↓
invoke('open_file_from_postgres')
  ↓
Rust 查询 files.content
  ↓
写入系统临时目录
  ↓
调用系统默认程序打开
```

## 9.6 FilePicker 组件设计

```tsx
// src/components/files/FilePicker.tsx

import { isTauriRuntime } from '@/services/runtime'
import { uploadFile } from '@/services/file-service'

export function FilePicker({ knowledgeId }: { knowledgeId: string }) {
  async function handleUpload() {
    await uploadFile({ knowledgeId })
  }

  return (
    <button onClick={handleUpload}>
      上传附件
    </button>
  )
}
```

底层差异放在 `file-service.ts` 中，不放在页面组件中。

---

## 10. API 与 Command 映射设计

| 功能           | Web API                                   | Desktop Command              |
| ------------ | ----------------------------------------- | ---------------------------- |
| 查询知识列表       | `GET /api/knowledge`                      | `list_knowledge`             |
| 查询知识详情       | `GET /api/knowledge/:id`                  | `get_knowledge_detail`       |
| 新建知识         | `POST /api/knowledge`                     | `create_knowledge`           |
| 更新知识         | `PUT /api/knowledge/:id`                  | `update_knowledge`           |
| 删除知识         | `DELETE /api/knowledge/:id`               | `delete_knowledge`           |
| 收藏知识         | `POST /api/knowledge/:id/favorite`        | `favorite_knowledge`         |
| 置顶知识         | `POST /api/knowledge/:id/pin`             | `pin_knowledge`              |
| 查询分类         | `GET /api/categories`                     | `list_categories`            |
| 新建分类         | `POST /api/categories`                    | `create_category`            |
| 更新分类         | `PUT /api/categories/:id`                 | `update_category`            |
| 删除分类         | `DELETE /api/categories/:id`              | `delete_category`            |
| 查询标签         | `GET /api/tags`                           | `list_tags`                  |
| 新建标签         | `POST /api/tags`                          | `create_tag`                 |
| 删除标签         | `DELETE /api/tags/:id`                    | `delete_tag`                 |
| 查询系统         | `GET /api/systems`                        | `list_systems`               |
| 新建系统         | `POST /api/systems`                       | `create_system`              |
| 更新系统         | `PUT /api/systems/:id`                    | `update_system`              |
| 删除系统         | `DELETE /api/systems/:id`                 | `delete_system`              |
| 上传文件         | `POST /api/upload`                        | `upload_file_to_postgres`    |
| 打开文件         | `GET /api/files/:id`                      | `open_file_from_postgres`    |
| 导出文件         | `GET /api/files/:id/download`             | `export_file_from_postgres`  |
| 删除文件         | `DELETE /api/files/:id`                   | `delete_file`                |
| 关联文件         | `POST /api/knowledge/:id/files`           | `attach_file_to_knowledge`   |
| 取消关联         | `DELETE /api/knowledge/:id/files/:fileId` | `detach_file_from_knowledge` |
| 搜索           | `GET /api/search`                         | `search_knowledge`           |
| 思维导图查询       | `GET /api/mindmap`                        | `get_mindmap`                |
| 思维导图保存       | `POST /api/mindmap`                       | `save_mindmap`               |
| AI 摘要        | `POST /api/ai/summarize`                  | `ai_summarize`               |
| AI 标签        | `POST /api/ai/tags`                       | `ai_auto_tags`               |
| AI 优化 Prompt | `POST /api/ai/optimize-prompt`            | `ai_optimize_prompt`         |

---

## 11. 构建配置设计

## 11.1 package.json 脚本

```json
{
  "scripts": {
    "dev:web": "next dev -p 3006",
    "build:web": "cross-env BUILD_TARGET=web next build",
    "start:web": "next start -p 3006",

    "dev:desktop": "tauri dev",
    "build:next:desktop": "cross-env BUILD_TARGET=desktop next build",
    "build:desktop": "tauri build",

    "typecheck": "tsc --noEmit",
    "lint": "next lint"
  }
}
```

## 11.2 next.config.ts

Web 和 Desktop 使用不同构建模式。

```ts
import type { NextConfig } from 'next'

const isDesktop = process.env.BUILD_TARGET === 'desktop'

const nextConfig: NextConfig = {
  ...(isDesktop
    ? {
        output: 'export',
        images: {
          unoptimized: true
        },
        trailingSlash: true
      }
    : {})
}

export default nextConfig
```

## 11.3 tauri.conf.json

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "Personal Knowledge Desktop",
  "version": "0.1.0",
  "identifier": "com.bulidworld.personal-knowledge-desktop",
  "build": {
    "beforeDevCommand": "npm run dev:web",
    "devUrl": "http://localhost:3006",
    "beforeBuildCommand": "npm run build:next:desktop",
    "frontendDist": "../out"
  },
  "app": {
    "windows": [
      {
        "title": "Personal Knowledge Desktop",
        "width": 1280,
        "height": 800,
        "minWidth": 1024,
        "minHeight": 700,
        "resizable": true,
        "fullscreen": false
      }
    ]
  },
  "bundle": {
    "active": true,
    "targets": ["nsis", "msi"],
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/icon.ico"
    ],
    "windows": {
      "nsis": {
        "installerMode": "perUser",
        "displayLanguageSelector": true
      }
    }
  }
}
```

---

## 12. 设置页设计

## 12.1 设置页共用结构

```txt
设置
├── 通用设置
├── 主题设置
├── AI 设置
├── 数据库设置
└── 桌面设置
```

## 12.2 Web 端显示

Web 端显示：

```txt
1. 通用设置
2. 主题设置
3. AI 设置
```

Web 端不显示：

```txt
1. 数据库连接配置
2. 桌面快捷键
3. 开机启动
4. 托盘设置
```

## 12.3 Desktop 端显示

Desktop 端显示：

```txt
1. 通用设置
2. 主题设置
3. AI 设置
4. 数据库连接配置
5. 桌面快捷键
6. 启动行为
7. 临时文件清理
```

示例：

```tsx
import { isTauriRuntime } from '@/services/runtime'

export function SettingsPage() {
  const isDesktop = isTauriRuntime()

  return (
    <SettingsLayout>
      <GeneralSettingsPanel />
      <ThemeSettingsPanel />
      <AiSettingsPanel />

      {isDesktop && <DatabaseSettingsPanel />}
      {isDesktop && <DesktopSettingsPanel />}
    </SettingsLayout>
  )
}
```

---

## 13. 安全设计

## 13.1 数据库账号

Desktop 端如果直连 PostgreSQL，不应使用超级管理员账号。

建议创建专用账号：

```sql
CREATE USER pk_desktop_user WITH PASSWORD '强密码';

GRANT CONNECT ON DATABASE personal_knowledge TO pk_desktop_user;
GRANT USAGE ON SCHEMA public TO pk_desktop_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pk_desktop_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pk_desktop_user;
```

## 13.2 数据库访问范围

建议限制：

```txt
1. 数据库仅允许内网 IP 访问。
2. 不向公网直接暴露 PostgreSQL。
3. 如果必须公网访问，应开启 SSL。
4. 使用强密码。
5. 禁止使用 postgres 超级用户。
```

## 13.3 Desktop 本地配置

Desktop 端需要保存：

```txt
1. 数据库地址
2. 数据库端口
3. 数据库名称
4. 数据库用户
5. 数据库密码
6. SSL 模式
7. AI API Key
```

保存位置建议：

```txt
Windows:
%APPDATA%/personal-knowledge-desktop/config.json
```

密码处理建议：

```txt
第一阶段：加密保存到本地配置
第二阶段：接入 Windows Credential Manager
第三阶段：如果改成 API Server，则改为保存 Token
```

---

## 14. 多阶段实施计划

# 阶段 0：现状审计

## 目标

完整梳理当前 Web 项目的页面、API、数据库、文件存储和数据流，为并存改造做准备。

## 任务

```txt
1. 梳理 src/app 页面。
2. 梳理 src/components 组件。
3. 梳理 src/app/api 下所有接口。
4. 梳理每个页面直接调用 fetch 的位置。
5. 梳理 PostgreSQL 表结构。
6. 梳理文件表和 bytea 字段。
7. 梳理上传、下载、打开文件流程。
8. 梳理 AI 相关接口。
9. 梳理当前 package.json 脚本。
10. 梳理环境变量。
```

## 产出

```txt
docs/desktop-migration-audit.md
docs/api-command-mapping.md
```

## 验收标准

```txt
1. 所有页面都有记录。
2. 所有 API 都有记录。
3. 所有 fetch 调用点都有记录。
4. 明确哪些功能需要 Rust Command。
5. 明确哪些功能继续由 Web API 提供。
```

---

# 阶段 1：新增 services 适配层

## 目标

让 UI 层不再直接关心 Web 或 Desktop，统一通过 services 调用业务能力。

## 任务

```txt
1. 新建 src/services/runtime.ts。
2. 新建 src/services/knowledge-service.ts。
3. 新建 src/services/category-service.ts。
4. 新建 src/services/tag-service.ts。
5. 新建 src/services/system-service.ts。
6. 新建 src/services/file-service.ts。
7. 新建 src/services/mindmap-service.ts。
8. 新建 src/services/ai-service.ts。
9. 页面中的 fetch('/api/*') 逐步替换为 services 调用。
```

## 验收标准

```txt
1. 页面组件不直接 fetch。
2. 页面组件不直接 invoke。
3. Web 端功能保持正常。
4. services 中保留 Web 调用逻辑。
5. services 中预留 Desktop invoke 调用逻辑。
```

---

# 阶段 2：接入 Tauri 桌面壳

## 目标

在不破坏 Web 端的情况下，新增 Tauri 桌面运行能力。

## 任务

```txt
1. 安装 @tauri-apps/cli。
2. 安装 @tauri-apps/api。
3. 初始化 src-tauri。
4. 配置 tauri.conf.json。
5. 增加 dev:desktop 脚本。
6. 增加 build:desktop 脚本。
7. 跑通 npm run dev:desktop。
```

## 验收标准

```txt
1. Web 端 npm run dev:web 正常。
2. Desktop 端 npm run dev:desktop 正常。
3. Tauri 窗口可以打开现有前端页面。
4. 不影响原有 Web 开发流程。
```

---

# 阶段 3：配置 Web / Desktop 双构建

## 目标

Web 端继续使用普通 Next.js 构建，Desktop 端使用静态导出供 Tauri 打包。

## 任务

```txt
1. 修改 next.config.ts。
2. 通过 BUILD_TARGET 区分 web 和 desktop。
3. Web 构建不启用 output: 'export'。
4. Desktop 构建启用 output: 'export'。
5. 配置 build:next:desktop。
6. 配置 Tauri frontendDist 为 ../out。
```

## 验收标准

```txt
1. npm run build:web 成功。
2. npm run start:web 成功。
3. npm run build:next:desktop 成功生成 out。
4. npm run build:desktop 可以进入 Tauri 打包流程。
```

---

# 阶段 4：Rust 连接远端 PostgreSQL

## 目标

Desktop 端 Rust 后端具备访问远端 PostgreSQL 的能力。

## 任务

```txt
1. Cargo.toml 增加 sqlx postgres 依赖。
2. 新建 src-tauri/src/db.rs。
3. 新建 src-tauri/src/app_state.rs。
4. 新建 src-tauri/src/config.rs。
5. 新建 test_database_connection command。
6. 实现数据库连接池初始化。
7. Desktop 设置页增加数据库连接配置。
```

## 验收标准

```txt
1. Desktop 端可以填写数据库配置。
2. 可以测试数据库连接。
3. Rust 可以执行 SELECT 1。
4. 连接失败时有明确错误提示。
5. 数据库配置可以保存。
```

---

# 阶段 5：迁移只读类 Command

## 目标

先实现 Desktop 端只读查询能力，降低风险。

## 任务

```txt
1. 实现 list_categories。
2. 实现 list_tags。
3. 实现 list_systems。
4. 实现 list_knowledge。
5. 实现 get_knowledge_detail。
6. 实现 list_files。
7. 实现 get_mindmap。
8. services 中 Desktop 分支改为 invoke。
```

## 验收标准

```txt
1. Web 端继续通过 /api 查询。
2. Desktop 端通过 Rust Commands 查询。
3. 两端展示结果一致。
4. 知识列表正常。
5. 分类、标签、系统筛选正常。
6. 详情页正常。
```

---

# 阶段 6：迁移写入类 Command

## 目标

Desktop 端支持完整 CRUD。

## 任务

```txt
1. create_category。
2. update_category。
3. delete_category。
4. create_tag。
5. delete_tag。
6. create_system。
7. update_system。
8. delete_system。
9. create_knowledge。
10. update_knowledge。
11. delete_knowledge。
12. favorite_knowledge。
13. pin_knowledge。
```

## 验收标准

```txt
1. Web 端新增的数据 Desktop 可见。
2. Desktop 新增的数据 Web 可见。
3. 两端数据一致。
4. 写操作有错误提示。
5. 删除操作有确认提示。
6. 数据库事务正确。
```

---

# 阶段 7：迁移 Desktop 文件模块

## 目标

Desktop 端支持从 PostgreSQL 上传、打开、导出和删除文件。

## 任务

```txt
1. 实现 upload_file_to_postgres。
2. 实现 open_file_from_postgres。
3. 实现 export_file_from_postgres。
4. 实现 delete_file。
5. 实现 attach_file_to_knowledge。
6. 实现 detach_file_from_knowledge。
7. 实现 sha256 去重。
8. 实现文件大小限制。
9. 实现临时文件写入。
10. 实现临时文件清理策略。
```

## 验收标准

```txt
1. Desktop 可以选择本地文件上传。
2. 文件成功写入 PostgreSQL。
3. Web 可以看到 Desktop 上传的文件。
4. Desktop 可以打开 Web 上传的文件。
5. Desktop 可以导出文件。
6. Desktop 可以删除文件关联。
7. 重复文件可以复用。
```

---

# 阶段 8：统一错误处理和返回结构

## 目标

保证 Web 和 Desktop 在前端体验上保持一致。

## 任务

```txt
1. 定义统一错误码。
2. 定义统一错误消息。
3. Web API 按统一格式返回错误。
4. Rust Commands 按统一格式返回错误。
5. 前端 services 统一捕获异常。
6. UI 统一展示错误。
```

## 推荐错误码

```txt
DB_CONNECTION_FAILED
VALIDATION_ERROR
NOT_FOUND
PERMISSION_DENIED
FILE_TOO_LARGE
FILE_READ_FAILED
FILE_WRITE_FAILED
FILE_OPEN_FAILED
DUPLICATE_NAME
UNKNOWN_ERROR
```

## 验收标准

```txt
1. Web 和 Desktop 错误展示一致。
2. 数据库连接失败提示清楚。
3. 文件过大提示清楚。
4. 未找到数据提示清楚。
5. 未知错误不会导致页面白屏。
```

---

# 阶段 9：搜索、思维导图和 AI 迁移

## 目标

完成高级能力在 Desktop 端的迁移。

## 任务

```txt
1. search_knowledge。
2. 按分类筛选。
3. 按标签筛选。
4. 按系统筛选。
5. 按收藏筛选。
6. 按置顶筛选。
7. get_mindmap。
8. save_mindmap。
9. ai_summarize。
10. ai_auto_tags。
11. ai_optimize_prompt。
```

## 验收标准

```txt
1. Web 和 Desktop 搜索结果一致。
2. 思维导图读写正常。
3. AI 设置可用。
4. AI 调用不暴露密钥到前端。
```

---

# 阶段 10：Desktop 专属能力增强

## 目标

增强桌面体验，让 Desktop 不只是网页套壳。

## 任务

```txt
1. 应用菜单栏。
2. 系统托盘。
3. 全局快捷键。
4. 拖拽文件上传。
5. 剪贴板快速保存。
6. 最近打开知识。
7. 启动时检查数据库连接。
8. 离线状态提示。
9. 临时文件清理。
```

## 推荐快捷键

```txt
Ctrl + Shift + K：快速搜索
Ctrl + N：新建知识
Ctrl + Shift + V：保存剪贴板
Ctrl + ,：打开设置
```

## 验收标准

```txt
1. 菜单栏可用。
2. 托盘可用。
3. 快捷键可用。
4. 拖拽上传可用。
5. 数据库断开时提示清楚。
```

---

# 阶段 11：Windows 打包发布

## 目标

生成 Windows 可安装程序。

## 任务

```txt
1. 配置应用图标。
2. 配置产品名称。
3. 配置应用版本。
4. 配置 NSIS 安装包。
5. 配置 MSI 安装包。
6. 执行 npm run build:desktop。
7. 在干净 Windows 环境测试。
8. 测试安装。
9. 测试卸载。
10. 测试首次启动配置数据库。
```

## 验收标准

```txt
1. 生成 setup.exe。
2. 安装后可以启动。
3. 不要求用户安装 Node.js。
4. 不要求用户安装浏览器。
5. 可以连接远端 PostgreSQL。
6. 可以正常查询、新增、编辑、删除知识。
7. 可以上传、打开、导出文件。
8. 可以正常卸载。
```

---

## 15. 开发命令设计

## 15.1 Web 开发

```bash
npm run dev:web
```

访问：

```txt
http://localhost:3006
```

## 15.2 Web 构建

```bash
npm run build:web
npm run start:web
```

## 15.3 Desktop 开发

```bash
npm run dev:desktop
```

## 15.4 Desktop 打包

```bash
npm run build:desktop
```

## 15.5 预期打包产物

```txt
src-tauri/target/release/
└── personal-knowledge-desktop.exe

src-tauri/target/release/bundle/nsis/
└── Personal Knowledge Desktop_0.1.0_x64-setup.exe

src-tauri/target/release/bundle/msi/
└── Personal Knowledge Desktop_0.1.0_x64_en-US.msi
```

---

## 16. MVP 范围

第一版 Desktop MVP 建议只做必要功能。

## 16.1 MVP 必做

```txt
1. Web 和 Desktop 并存。
2. UI 共用一套。
3. services 适配层。
4. Tauri 桌面壳。
5. Rust 连接远端 PostgreSQL。
6. 知识列表。
7. 知识详情。
8. 新增知识。
9. 编辑知识。
10. 删除知识。
11. 分类、标签、系统查询。
12. 文件上传到 PostgreSQL。
13. 从 PostgreSQL 打开文件。
14. 文件导出。
15. Windows setup.exe 打包。
```

## 16.2 MVP 暂缓

```txt
1. 系统托盘。
2. 全局快捷键。
3. 拖拽上传。
4. 剪贴板快速保存。
5. 自动更新。
6. 本地缓存。
7. AI 高级能力。
8. 多用户权限。
9. API Server 独立化。
```

---

## 17. 后续演进方向

## 17.1 当前推荐架构

```txt
Web:
Next.js API Routes → PostgreSQL

Desktop:
Rust Commands → PostgreSQL
```

优点：

```txt
1. 改造成本低。
2. Web 可继续使用。
3. Desktop 可逐步上线。
4. UI 共用。
5. 数据天然同步。
```

缺点：

```txt
1. Web API 和 Rust Commands 有重复逻辑。
2. 校验规则要维护两份。
3. Desktop 直连数据库存在安全风险。
```

## 17.2 后续理想架构

如果后续要面向多人、外网、权限复杂场景，建议演进为统一 API Server：

```txt
Web 前端
  ↓
统一 API Server
  ↓
PostgreSQL

Desktop 前端
  ↓
统一 API Server
  ↓
PostgreSQL
```

优势：

```txt
1. 业务逻辑只有一份。
2. 权限控制集中。
3. Desktop 不暴露数据库密码。
4. Web 和 Desktop 行为完全一致。
5. 更适合多用户和公网部署。
```

---

## 18. 风险与应对

## 18.1 UI 没有通过 services 调用

风险：

```txt
页面直接 fetch 或 invoke，导致 Web 和 Desktop 不能共用。
```

应对：

```txt
强制页面只调用 services。
代码评审时重点检查。
```

## 18.2 Web 和 Desktop 行为不一致

风险：

```txt
Web API 和 Rust Commands 查询条件、校验规则不同。
```

应对：

```txt
1. 定义统一接口文档。
2. 定义统一类型。
3. 定义统一错误码。
4. 编写对照测试用例。
```

## 18.3 Desktop 直连数据库安全问题

风险：

```txt
数据库账号保存在用户电脑，存在泄露风险。
```

应对：

```txt
1. 使用低权限账号。
2. 限制数据库访问 IP。
3. 启用 SSL。
4. 密码加密保存。
5. 后续演进为 API Server。
```

## 18.4 PostgreSQL 文件过大

风险：

```txt
文件存储在 BYTEA 中，数据库体积快速增长。
```

应对：

```txt
1. 限制文件大小。
2. 使用 sha256 去重。
3. 定期数据库备份。
4. 定期 VACUUM。
5. 大文件后续可迁移对象存储。
```

## 18.5 Desktop 构建失败

风险：

```txt
Next.js 页面使用了不支持静态导出的能力。
```

应对：

```txt
1. Desktop 构建使用 BUILD_TARGET=desktop。
2. 页面数据加载放到客户端。
3. 服务端逻辑迁移到 Rust Commands。
4. 避免 Desktop 构建依赖 API Routes。
```

---

## 19. 最终结论

本项目推荐采用 Web 与 Desktop 并存架构：

```txt
一套 UI
一套类型
一套 services
两套后端适配
一个 PostgreSQL
```

具体为：

```txt
Web 端：
Next.js 页面 → services → Next.js API Routes → PostgreSQL

Desktop 端：
Tauri 窗口 → 同一套页面 → services → Rust Commands → PostgreSQL
```

这种方式可以保证：

```txt
1. UI 修改只需要改一套代码。
2. Web 端继续可用。
3. Desktop 端可以逐步迁移。
4. 数据共用远端 PostgreSQL。
5. 文件继续存在 PostgreSQL 中。
6. 最终可以打包 Windows exe / setup.exe。
```

第一阶段应优先完成 services 适配层和 Tauri 壳接入。只要 UI 层和数据访问层分离清楚，后续 Web 和 Desktop 就可以长期并存，并且大部分界面改动都只需要改一个地方。
