# Services 适配层

## 业务目标

为 Web 与 Desktop 并存建立统一的前端业务调用层。页面、组件和 hooks 不再直接调用 `/api/*` 或 Tauri `invoke`，统一通过 `src/services` 暴露的方法访问业务能力。

该阶段完成后，UI 代码可以在 Web 浏览器和 Tauri WebView 中共用。

## 使用场景

### Web 用户继续使用原有功能

用户在浏览器中查询、新增、编辑、删除知识时，前端仍然通过 Next.js API Routes 访问 PostgreSQL，使用体验不发生变化。

### Desktop 用户使用同一套 UI

用户在 Desktop 中执行相同操作时，UI 调用相同的 service 方法，service 根据运行环境切换到 Rust Command。

### 开发者新增页面功能

开发者新增页面时，只需要调用领域 service，例如：

```ts
import { listKnowledge } from '@/services/knowledge-service'
```

页面不需要判断当前运行在 Web 还是 Desktop。

## 功能范围

新增以下 service 文件：

| 文件 | 职责 |
| ---- | ---- |
| `src/services/runtime.ts` | 判断 Web 或 Desktop 运行时 |
| `src/services/http-client.ts` | 封装 Web API 请求和错误解析 |
| `src/services/tauri-client.ts` | 封装 Desktop invoke 和错误解析 |
| `src/services/knowledge-service.ts` | 知识列表、详情、CRUD、收藏、置顶 |
| `src/services/category-service.ts` | 分类查询和 CRUD |
| `src/services/tag-service.ts` | 标签查询和 CRUD |
| `src/services/system-service.ts` | 系统查询和 CRUD |
| `src/services/file-service.ts` | 文件上传、打开、导出、删除、关联 |
| `src/services/mindmap-service.ts` | 思维导图查询和保存 |
| `src/services/ai-service.ts` | AI 摘要、标签、Prompt 优化 |
| `src/services/settings-service.ts` | 设置读取、保存和数据库连接测试 |

## 迁移规则

1. UI 层禁止直接调用 `fetch('/api/*')`。
2. UI 层禁止直接调用 `invoke('command')`。
3. service 方法名以业务动作命名，而不是以 HTTP 方法命名。
4. 同一个 service 方法在 Web 和 Desktop 下返回相同 TypeScript 类型。
5. Desktop 分支可以先预留 `invoke`，实际 Rust Command 在后续阶段补齐。

## 验收标准

1. 页面和组件中不存在直接业务性 `/api/*` 请求。
2. 页面和组件中不存在直接业务性 Tauri `invoke`。
3. Web 端原有核心功能正常。
4. services 中具备 Web 分支和 Desktop 分支。
5. 所有 service 方法有明确入参和返回类型。
