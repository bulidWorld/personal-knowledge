# Services 适配层 — 实现架构

## 总体结构

```txt
src/app、src/components、src/hooks
        ↓
src/services/*
        ↓
┌──────────────────────┬───────────────────────┐
│ Web Runtime           │ Desktop Runtime        │
│ fetch('/api/*')       │ invoke('command_name') │
└──────────────────────┴───────────────────────┘
        ↓
PostgreSQL
```

## 运行时判断

`src/services/runtime.ts`：

```ts
export type RuntimeType = 'web' | 'desktop'

export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export function getRuntimeType(): RuntimeType {
  return isTauriRuntime() ? 'desktop' : 'web'
}
```

## Web 请求封装

`src/services/http-client.ts` 负责：

1. 拼接 query string。
2. 设置 JSON 请求头。
3. 解析 JSON 响应。
4. 将非 2xx 响应转换为统一错误对象。
5. 保留 FormData 上传能力。

建议接口：

```ts
export async function httpGet<T>(url: string, query?: Record<string, unknown>): Promise<T>
export async function httpPost<T>(url: string, body?: unknown): Promise<T>
export async function httpPut<T>(url: string, body?: unknown): Promise<T>
export async function httpDelete<T>(url: string): Promise<T>
```

## Desktop invoke 封装

`src/services/tauri-client.ts` 负责：

1. 延迟加载 `@tauri-apps/api/core`，避免 Web 构建报错。
2. 调用 `invoke<T>(command, args)`。
3. 将 Rust 返回错误转换为前端统一错误对象。

建议接口：

```ts
export async function tauriInvoke<T>(
  command: string,
  args?: Record<string, unknown>
): Promise<T>
```

## Service 领域划分

### 知识服务

`knowledge-service.ts` 暴露：

```ts
listKnowledge(query)
getKnowledgeDetail(id)
createKnowledge(payload)
updateKnowledge(id, payload)
deleteKnowledge(id)
favoriteKnowledge(id, value)
pinKnowledge(id, value)
```

Web 映射 `/api/knowledge`，Desktop 映射 `list_knowledge`、`get_knowledge_detail` 等 Command。

### 元数据服务

分类、标签、系统分别独立 service，避免一个文件过大：

```txt
category-service.ts
tag-service.ts
system-service.ts
```

### 文件服务

`file-service.ts` 是第一个需要运行时差异入参的 service：

| 方法 | Web 行为 | Desktop 行为 |
| ---- | -------- | ------------ |
| `uploadFile` | 使用 `<input type=file>` 得到 File，POST FormData | 打开系统文件选择器或接收路径，Rust 读取文件 |
| `openFile` | `window.open('/api/files/:id')` | `invoke('open_file_from_postgres')` |
| `exportFile` | 浏览器下载 | 系统保存对话框 |

## 类型约束

所有 service 必须复用 `src/types` 中的类型：

```txt
src/types/api.ts
src/types/runtime.ts
src/types/knowledge.ts
src/types/category.ts
src/types/tag.ts
src/types/system.ts
src/types/file.ts
src/types/mindmap.ts
src/types/settings.ts
```

如果 Web API 当前返回结构与目标类型不一致，优先在 service 中做轻量 normalize，并在审计文档中记录后续统一计划。

## 迁移策略

1. 先新增 services，不改页面。
2. 按页面逐步替换直接 `fetch`。
3. 每替换一个页面，验证 Web 端行为。
4. Desktop 分支在 Rust Command 未完成前允许抛出清晰错误，例如 `Desktop command not implemented: list_knowledge`。

## 风险控制

1. 不在该阶段删除 Web API。
2. 不改变数据库结构。
3. 不把 Tauri import 写到服务端组件顶层。
4. 不让 UI 层知道具体 API URL 或 Command 名称。
