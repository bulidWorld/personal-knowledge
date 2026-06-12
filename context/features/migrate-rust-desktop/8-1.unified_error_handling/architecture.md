# 统一错误处理 — 实现架构

## 前端错误类型

`src/types/api.ts`：

```ts
export type AppErrorCode =
  | 'DB_CONNECTION_FAILED'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'FILE_TOO_LARGE'
  | 'FILE_READ_FAILED'
  | 'FILE_WRITE_FAILED'
  | 'FILE_OPEN_FAILED'
  | 'DUPLICATE_NAME'
  | 'UNKNOWN_ERROR'

export interface AppErrorPayload {
  code: AppErrorCode
  message: string
  details?: unknown
}
```

## Web API 返回结构

错误响应统一为：

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "标题不能为空",
    "details": {
      "field": "title"
    }
  }
}
```

HTTP status 仍按语义返回，例如 400、404、500。

## Rust 错误结构

`src-tauri/src/error.rs`：

```rust
#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppError {
    pub code: String,
    pub message: String,
}
```

Command 返回：

```rust
Result<T, AppError>
```

Tauri 会把错误序列化给前端，`tauri-client.ts` 负责 normalize。

## services normalize

`http-client.ts`：

1. 解析 `{ error: { code, message, details } }`。
2. 如果响应不是标准结构，转换为 `UNKNOWN_ERROR`。
3. 抛出前端统一 `AppError`。

`tauri-client.ts`：

1. 如果 Rust 返回标准错误，保持 code 和 message。
2. 如果返回字符串，转换为 `UNKNOWN_ERROR`。
3. 清洗敏感信息。

## UI 消费方式

页面和组件只关心：

```ts
try {
  await save()
} catch (error) {
  showAppError(error)
}
```

`showAppError` 根据 code 决定 toast、表单错误或页面错误。

## 日志策略

1. 开发环境可以输出完整错误对象。
2. 生产环境只输出必要上下文。
3. 密码、API Key、数据库连接串必须脱敏。

## 风险控制

1. 不把 Rust 原始 `sqlx::Error` 直接展示给用户。
2. 不让前端依赖 HTTP status 来判断业务错误。
3. 不让 Desktop 和 Web 各自定义一套错误文案。
