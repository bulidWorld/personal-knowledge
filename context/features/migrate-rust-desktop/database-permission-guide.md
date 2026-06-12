# Database Permission Guide

阶段：`0-1.current_state_audit`

目标：为 Desktop 端 Rust 直连远端 PostgreSQL 提供最小权限建议。本文只记录权限模型，不包含任何实际密码或连接值。

## 1. 当前数据库访问方式

Web API 通过 `src/lib/db.ts` 使用 `pg.Pool` 连接 PostgreSQL，依赖以下环境变量：

| 变量 | 说明 |
| ---- | ---- |
| `DB_HOST` | PostgreSQL host |
| `DB_PORT` | PostgreSQL port |
| `DB_USER` | PostgreSQL user |
| `DB_PASS` | PostgreSQL password |
| `DB_NAME` | PostgreSQL database |

Desktop 端未来会由 Rust 使用 SQLx 连接同一个远端 PostgreSQL。建议不要复用开发者个人超级用户账号，应创建专用应用账号。

## 2. 必要表

Desktop MVP 需要访问：

| 表 | 权限 |
| -- | ---- |
| `categories` | `SELECT, INSERT, UPDATE, DELETE` |
| `entries` | `SELECT, INSERT, UPDATE, DELETE` |
| `tags` | `SELECT, INSERT, UPDATE, DELETE` |
| `entry_tags` | `SELECT, INSERT, UPDATE, DELETE` |
| `systems` | `SELECT, INSERT, UPDATE, DELETE` |
| `mindmap_nodes` | `SELECT, INSERT, UPDATE, DELETE` |
| `mindmap_connections` | `SELECT, INSERT, UPDATE, DELETE` |
| `uploads` | `SELECT, INSERT, UPDATE, DELETE` |
| `entry_clicks` | `SELECT, INSERT`，如需清理历史可加 `DELETE` |
| `entry_click_windows` | `SELECT, INSERT, UPDATE, DELETE` |

序列：

| 序列 | 权限 |
| ---- | ---- |
| `entry_clicks_id_seq` | `USAGE, SELECT` |

## 3. 推荐角色

建议在数据库中拆分两个角色：

| 角色 | 用途 | 权限 |
| ---- | ---- | ---- |
| `personal_knowledge_owner` | 部署迁移、建表、建索引 | schema owner 或迁移权限 |
| `personal_knowledge_app` | Web API 和 Desktop 日常运行 | 仅业务表 DML 权限 |

Desktop 安装包内不应包含 owner 凭据。

## 4. 示例授权 SQL

以下 SQL 是模板，需要替换数据库名、schema 和角色名后执行：

```sql
CREATE ROLE personal_knowledge_app LOGIN PASSWORD 'replace-with-strong-password';

GRANT CONNECT ON DATABASE personal_knowledge_db TO personal_knowledge_app;
GRANT USAGE ON SCHEMA public TO personal_knowledge_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  categories,
  entries,
  tags,
  entry_tags,
  systems,
  mindmap_nodes,
  mindmap_connections,
  uploads,
  entry_click_windows
TO personal_knowledge_app;

GRANT SELECT, INSERT ON entry_clicks TO personal_knowledge_app;
GRANT USAGE, SELECT ON SEQUENCE entry_clicks_id_seq TO personal_knowledge_app;
```

如果 Desktop 需要执行热度表懒创建，则还需要 `CREATE` 权限。但更推荐在部署迁移阶段提前创建 `entry_clicks`、`entry_click_windows` 和索引，运行时账号不授予 DDL 权限。

## 5. 最小权限建议

| 能力 | 是否授予运行时账号 |
| ---- | ------------------ |
| `CREATE TABLE` | 不建议 |
| `ALTER TABLE` | 不建议 |
| `DROP TABLE` | 禁止 |
| `CREATE INDEX` | 不建议 |
| `SELECT` | 必须 |
| `INSERT` | 必须 |
| `UPDATE` | 必须 |
| `DELETE` | 必须，至少业务表需要 |
| `TRUNCATE` | 禁止 |
| `SUPERUSER` | 禁止 |

## 6. 连接安全

建议：

1. 使用强密码和专用账号。
2. PostgreSQL 开启 TLS，Rust SQLx 连接字符串启用 SSL 模式。
3. 限制数据库防火墙入站来源。
4. Desktop 本地保存配置时使用系统安全存储或加密文件，不写入前端静态资源。
5. 日志中禁止打印完整连接字符串和密码。
6. `test_database_connection` 返回成功/失败和简短原因，不返回敏感配置。

## 7. 运行时迁移策略

当前 Web 代码中 `src/lib/hot-card.ts` 会在调用知识列表或点击统计时懒创建热度表。Desktop 直连时建议改为显式迁移：

| 选项 | 推荐度 | 说明 |
| ---- | ------ | ---- |
| 部署前执行迁移脚本 | 高 | 运行时账号无需 DDL 权限 |
| Desktop 启动时检查并创建表 | 中 | 需要 DDL 权限，安全边界变宽 |
| 每个 command 调用前懒创建 | 低 | 行为隐蔽，错误排查困难 |

建议阶段 4-1 或 5-1 引入 Rust 侧 schema check，只检查必需表是否存在，并给出可读错误；真正 DDL 由迁移脚本完成。

## 8. Desktop 配置字段

Desktop 本地配置建议拆成非敏感和敏感两类：

| 字段 | 敏感 | 说明 |
| ---- | ---- | ---- |
| `host` | 否 | 数据库地址 |
| `port` | 否 | 默认 5432 |
| `database` | 否 | 数据库名 |
| `username` | 低 | 可以展示 |
| `password` | 是 | 不明文展示 |
| `ssl_mode` | 否 | `prefer`、`require` 等 |

UI 设置页只展示连接状态和掩码字段，避免泄露密码。
