# Markdown 图片粘贴 — 内部实现架构

## 架构总览

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                         │
│                                                                 │
│  ┌──────────────────────┐    ┌────────────────────────────────┐ │
│  │  Markdown <textarea>  │    │  Content Renderer              │ │
│  │                      │    │  (content-render.ts)           │ │
│  │  onPaste ──────────┐ │    │                                │ │
│  │                    │ │    │  marked.parse(md) → HTML        │ │
│  └────────────────────┼─┘    │  + referrerpolicy injection     │ │
│                       │      └────────────────────────────────┘ │
│                       ▼                                         │
│  ┌──────────────────────────────────────┐                       │
│  │  paste-image.ts                       │                       │
│  │  handleMarkdownImagePaste()           │                       │
│  │                                      │                       │
│  │  1. 检测剪贴板 image/*               │                       │
│  │  2. 上传至 POST /api/upload          │                       │
│  │  3. 插入 ![](url) 到光标位置         │                       │
│  └───────────────────┬──────────────────┘                       │
│                      │                                          │
└──────────────────────┼──────────────────────────────────────────┘
                       │ HTTP POST (multipart/form-data)
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Server (Next.js API)                        │
│                                                                  │
│  POST /api/upload                   Static File Serving          │
│  src/app/api/upload/route.ts        public/uploads/              │
│                                                                  │
│  1. 解析 FormData                   /uploads/paste-{ts}-{rnd}.png │
│  2. 校验 MIME image/*                                           │
│  3. 生成唯一文件名                                              │
│  4. 写入 public/uploads/                                        │
│  5. 返回 { url }                                                │
└──────────────────────────────────────────────────────────────────┘
```

## 关键文件

### 1. `src/app/api/upload/route.ts` — 图片上传 API

**职责**: 接收 multipart 图片上传，保存到文件系统，返回可访问 URL。

| 关注点           | 实现细节                                                     |
| ---------------- | ------------------------------------------------------------ |
| 文件存储位置     | `public/uploads/` (Next.js 静态文件目录)                     |
| 文件命名         | `paste-{Date.now()}-{Math.random().toString(36).slice(2,8)}.{ext}` |
| MIME 映射        | 内置 `MIME_TO_EXT` 字典，支持 png/jpeg/webp/gif/svg/bmp     |
| 错误处理         | 400 (无文件/非图片) / 500 (写入失败)                        |

### 2. `src/lib/paste-image.ts` — 共享粘贴处理工具

**职责**: 封装 Markdown textarea 中图片粘贴的通用逻辑，供所有编辑器复用。

```typescript
async function handleMarkdownImagePaste(
  e: React.ClipboardEvent<HTMLTextAreaElement>,
  textarea: HTMLTextAreaElement,
  onValueChange: (newValue: string) => void
): Promise<boolean>
```

**流程**:
1. 遍历 `e.clipboardData.items`，查找 `image/*` 类型
2. 找到图片 → `e.preventDefault()`，继续处理
3. 未找到 → 返回 `false`，浏览器执行默认文本粘贴
4. 在光标位置插入占位文本 `![](正在上传图片...)`
5. `fetch('/api/upload', { body: formData })` 上传
6. 成功后替换占位文本为 `![](/uploads/xxx.png)`
7. `requestAnimationFrame` 恢复光标位置
8. 失败则移除占位文本，恢复原内容

**注意**: 该文件标记了 `'use client'`，因为使用了浏览器 API（`ClipboardEvent`、`FormData`、`fetch`）。

### 3. `src/lib/content-render.ts` — 内容渲染增强

**职责**: 在 Markdown → HTML 渲染管线中注入 `referrerpolicy="no-referrer"`。

**修改点** (line 80-81):
```typescript
htmlOut = htmlOut.replace(/<img /g, '<img referrerpolicy="no-referrer" ')
```

此修改影响所有使用 `marked` 渲染的 Markdown 内容，确保外部引用图片不受防盗链影响。

### 4. 编辑器组件修改

四个 Markdown textarea 均采用相同模式接入粘贴处理：

| 文件                                       | 编辑器场景         | ref                     | onPaste handler             |
| ------------------------------------------ | ------------------ | ----------------------- | --------------------------- |
| `src/components/KnowledgeForm.tsx`         | 弹窗表单           | `mdTextareaRef`         | `onMarkdownPaste`           |
| `src/app/page.tsx` (入口编辑器)            | 条目内联编辑       | `entryMdTextareaRef`    | `onEntryMarkdownPaste`      |
| `src/app/page.tsx` (节点编辑器)            | 思维导图节点编辑   | `nodeMdTextareaRef`     | `onNodeMarkdownPaste`       |
| `src/components/AppShell.tsx`              | 节点弹窗编辑       | `nodeModalMdRef`        | `onNodeModalMarkdownPaste`  |

每个编辑器的接入模式完全一致：

```tsx
// 1. 声明 ref
const mdTextareaRef = useRef<HTMLTextAreaElement | null>(null)

// 2. 定义 paste handler（委托给共享工具）
function onMarkdownPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
  if (mdTextareaRef.current) {
    handleMarkdownImagePaste(e, mdTextareaRef.current, (newValue) => {
      setForm((prev) => ({ ...prev, markdownContent: newValue }))
    })
  }
}

// 3. 绑定到 textarea
<textarea ref={mdTextareaRef} onPaste={onMarkdownPaste} ... />
```

## 数据流

```
用户按下 Ctrl+V
      │
      ▼
浏览器触发 paste 事件
      │
      ▼
handleMarkdownImagePaste() 检查剪贴板
      │
      ├── 无图片 → 返回 false → 浏览器默认行为（粘贴纯文本）
      │
      └── 有图片
            │
            ├── 1. preventDefault()
            ├── 2. 在光标处插入占位文本 "![](正在上传图片...)"
            ├── 3. 更新 React state → textarea 显示占位文本
            ├── 4. fetch POST /api/upload (FormData)
            │         │
            │         ▼
            │   Server: 保存到 public/uploads/
            │   返回 { url: "/uploads/xxx.png" }
            │         │
            ├── 5. 替换占位文本 → "![](/uploads/xxx.png)"
            ├── 6. 更新 React state → textarea 显示最终 URL
            └── 7. requestAnimationFrame 恢复光标位置
```

## 设计决策

### 为什么图片存储到文件系统而非数据库？

- SQLite 数据库存储二进制 BLOB 会导致文件快速膨胀
- 图片文件独立存储便于清理和管理
- 放在 `public/uploads/` 可直接利用 Next.js 静态文件服务，无需额外 API

### 为什么上传失败时使用占位文本策略？

- 上传是异步操作，需要时间，不能同步返回结果
- 先插入占位文本让用户知道系统正在处理
- 失败时自动回滚，不留残留文本

### 为什么使用 `referrerpolicy="no-referrer"`？

- 大量外部图片源（如 geekbang.org）有防盗链机制
- 后端代理所有图片会增加服务器负载
- 只需给 `<img>` 标签加 `referrerpolicy` 属性即可绕过，零成本

### 为什么不在 `useCallback` 中 wrap `handleMarkdownImagePaste`？

- `handleMarkdownImagePaste` 是纯函数（接收 event + textarea + callback），不依赖组件状态
- 只在 KnowledgeForm 和 AppShell 的 handler 中使用了 `useCallback`（因为内部访问了 useState setter）
- page.tsx 中使用普通函数（避免不必要的 memo 开销）
