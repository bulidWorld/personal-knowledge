use sqlx::{postgres::PgPoolOptions, PgPool};
use tauri::State;

use crate::{
    app_state::AppState,
    error::{CommandError, CommandResult},
    models::settings::DatabaseConfig,
};

fn encode_component(value: &str) -> String {
    let mut encoded = String::new();

    for byte in value.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'.' | b'_' | b'~' => {
                encoded.push(byte as char);
            }
            _ => encoded.push_str(&format!("%{byte:02X}")),
        }
    }

    encoded
}

fn database_url(config: &DatabaseConfig) -> String {
    format!(
        "postgres://{}:{}@{}:{}/{}?sslmode={}",
        encode_component(&config.username),
        encode_component(&config.password),
        config.host,
        config.port,
        encode_component(&config.database),
        config.ssl_mode
    )
}

fn clean_db_error(error: sqlx::Error) -> String {
    match error {
        sqlx::Error::PoolTimedOut => "数据库连接超时，请检查主机、端口和网络连接".to_string(),
        sqlx::Error::Database(database_error) => {
            let message = database_error.message().to_string();
            if message.is_empty() {
                "数据库返回错误，请检查数据库名、账号和权限".to_string()
            } else {
                message
            }
        }
        sqlx::Error::Io(_) | sqlx::Error::Tls(_) => {
            "无法连接数据库，请检查主机、端口、SSL 模式和网络连接".to_string()
        }
        _ => "数据库连接失败，请检查配置后重试".to_string(),
    }
}

pub async fn create_pool(config: &DatabaseConfig) -> CommandResult<PgPool> {
    PgPoolOptions::new()
        .max_connections(10)
        .min_connections(0)
        .connect(&database_url(config))
        .await
        .map_err(|error| CommandError::db_connection(clean_db_error(error)))
}

pub async fn test_connection(config: &DatabaseConfig) -> CommandResult<()> {
    let pool = create_pool(config).await?;
    sqlx::query_scalar::<_, i32>("SELECT 1")
        .fetch_one(&pool)
        .await
        .map_err(|error| CommandError::db_connection(clean_db_error(error)))?;
    pool.close().await;
    Ok(())
}

pub async fn get_pool(state: &State<'_, AppState>) -> CommandResult<PgPool> {
    let pool = state.db.read().await;
    pool.clone()
        .ok_or_else(CommandError::database_not_configured)
}

pub fn clean_query_error(error: sqlx::Error) -> CommandError {
    match error {
        sqlx::Error::RowNotFound => CommandError::not_found("查询的数据不存在"),
        sqlx::Error::Database(database_error) => match database_error.code().as_deref() {
            Some("23505") => CommandError::duplicate_name("数据已存在，请检查名称或标识是否重复"),
            Some("42501") => CommandError::permission_denied("数据库权限不足，请检查账号权限"),
            _ => CommandError::db_query("数据库查询失败，请检查数据库结构和连接状态"),
        },
        _ => CommandError::db_query("数据库查询失败，请检查数据库结构和连接状态"),
    }
}
