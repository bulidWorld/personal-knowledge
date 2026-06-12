# Desktop 数据库连接 — 实现架构

## Rust 模块

```txt
src-tauri/src/
├── app_state.rs
├── config.rs
├── db.rs
├── error.rs
├── commands/
│   ├── mod.rs
│   └── settings.rs
└── models/
    ├── mod.rs
    └── settings.rs
```

## 依赖

`src-tauri/Cargo.toml` 建议增加：

```toml
sqlx = { version = "0.8", features = ["runtime-tokio-rustls", "postgres", "uuid", "chrono", "json"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
```

具体版本以项目当前 Tauri/Rust 依赖兼容性为准。

## 数据库连接池

`db.rs`：

```rust
use sqlx::{postgres::PgPoolOptions, PgPool};

pub async fn create_pool(database_url: &str) -> Result<PgPool, sqlx::Error> {
    PgPoolOptions::new()
        .max_connections(10)
        .min_connections(1)
        .connect(database_url)
        .await
}
```

## AppState

`app_state.rs`：

```rust
use sqlx::PgPool;
use tokio::sync::RwLock;

pub struct AppState {
    pub db: RwLock<Option<PgPool>>,
}
```

使用 `Option<PgPool>` 是为了支持首次启动未配置数据库的状态。

## 本地配置

Windows 保存位置：

```txt
%APPDATA%/personal-knowledge-desktop/config.json
```

配置模型：

```rust
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DatabaseConfig {
    pub host: String,
    pub port: u16,
    pub database: String,
    pub username: String,
    pub password: String,
    pub ssl_mode: Option<String>,
}
```

## Commands

| Command | 说明 |
| ------- | ---- |
| `get_database_config` | 读取本地数据库配置，密码按安全策略决定是否返回 |
| `save_database_config` | 保存数据库配置并刷新连接池 |
| `test_database_connection` | 使用传入配置建立临时连接并执行 `SELECT 1` |

## 前端 service

`settings-service.ts`：

```ts
getDatabaseConfig()
saveDatabaseConfig(payload)
testDatabaseConnection(payload)
```

Web 分支不开放数据库配置能力，Desktop 分支调用对应 Commands。

## 错误处理

连接错误统一映射：

| 场景 | 错误码 |
| ---- | ------ |
| 主机不可达 | `DB_CONNECTION_FAILED` |
| 用户名或密码错误 | `DB_CONNECTION_FAILED` |
| 数据库不存在 | `DB_CONNECTION_FAILED` |
| 配置字段缺失 | `VALIDATION_ERROR` |
| 配置文件写入失败 | `FILE_WRITE_FAILED` |

## 风险控制

1. 不在前端拼接完整 `database_url` 后输出日志。
2. Rust 错误消息需要清洗，避免泄露密码。
3. 初始化连接池失败时应用仍可启动，但设置页要显示待配置状态。
