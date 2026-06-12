# Desktop 数据库连接

## 业务目标

Desktop 端通过 Rust 后端连接远端 PostgreSQL，并提供数据库连接配置、连接测试和本地保存能力，为后续 Rust Commands 访问数据打基础。

## 使用场景

### 首次启动配置数据库

用户首次打开 Desktop 应用时，如果本地没有数据库配置，可以进入设置页填写数据库地址、端口、数据库名、用户名、密码和 SSL 模式。

### 测试数据库连接

用户填写配置后点击测试连接。系统通过 Rust Command 执行 `SELECT 1`，成功时提示连接可用，失败时展示明确错误。

### 保存数据库配置

用户确认配置后保存。Desktop 下次启动时读取本地配置并初始化 PostgreSQL 连接池。

## 功能范围

1. Rust 增加 `sqlx` PostgreSQL 连接能力。
2. 新增 `src-tauri/src/db.rs` 创建连接池。
3. 新增 `src-tauri/src/config.rs` 管理本地配置文件。
4. 新增 `src-tauri/src/app_state.rs` 保存连接池和配置状态。
5. 新增 `test_database_connection` Command。
6. 新增读取、保存数据库配置的 Commands。
7. 设置页 Desktop 端展示数据库配置面板。

## 配置项

| 字段 | 必填 | 说明 |
| ---- | ---- | ---- |
| host | 是 | PostgreSQL 主机 |
| port | 是 | 默认 `5432` |
| database | 是 | 数据库名 |
| username | 是 | 数据库用户 |
| password | 是 | 数据库密码 |
| sslMode | 否 | disable / prefer / require |

## 安全要求

1. Desktop 不使用 PostgreSQL 超级管理员账号。
2. 推荐使用只授予业务表读写权限的专用账号。
3. 密码不得出现在前端日志、错误提示或普通调试输出中。
4. 本地配置第一阶段可加密保存，后续可迁移到 Windows Credential Manager。

## 验收标准

1. Desktop 设置页可以填写数据库配置。
2. 可以测试数据库连接。
3. Rust 能执行 `SELECT 1`。
4. 连接失败时有明确错误提示。
5. 数据库配置可以保存并在下次启动读取。
6. Web 端不显示数据库连接配置。
