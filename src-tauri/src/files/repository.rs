use sqlx::{Postgres, Row};

use crate::{
    db,
    error::{CommandError, CommandResult},
    models::file::FileMetadata,
};

use super::{hash::hash_bytes, paths::normalize_file_id};

pub struct StoredFile {
    pub filename: String,
    pub data: Vec<u8>,
}

pub struct ProtocolFile {
    pub mime_type: String,
    pub data: Vec<u8>,
}

pub async fn table_exists(pool: &sqlx::PgPool, table_name: &str) -> CommandResult<bool> {
    let exists = sqlx::query("SELECT to_regclass($1) IS NOT NULL as exists")
        .bind(table_name)
        .fetch_one(pool)
        .await
        .map_err(db::clean_query_error)?
        .get("exists");

    Ok(exists)
}

pub async fn list_files(pool: &sqlx::PgPool) -> CommandResult<Vec<FileMetadata>> {
    let rows = sqlx::query(
        r#"
        SELECT
          id,
          filename,
          mime_type,
          size::bigint as size,
          to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at
        FROM uploads
        ORDER BY created_at DESC
        "#,
    )
    .fetch_all(pool)
    .await
    .map_err(db::clean_query_error)?;

    Ok(rows
        .into_iter()
        .map(|row| FileMetadata {
            id: row.get("id"),
            filename: row.get("filename"),
            mime_type: row.get("mime_type"),
            size: row.get("size"),
            created_at: row.get("created_at"),
        })
        .collect())
}

pub async fn find_duplicate_upload(
    executor: impl sqlx::Executor<'_, Database = Postgres>,
    size: i64,
    sha256: &str,
) -> CommandResult<Option<String>> {
    let rows = sqlx::query(
        r#"
        SELECT id, data
        FROM uploads
        WHERE size::bigint = $1
        ORDER BY created_at ASC
        "#,
    )
    .bind(size)
    .fetch_all(executor)
    .await
    .map_err(db::clean_query_error)?;

    for row in rows {
        let data: Vec<u8> = row.get("data");
        if hash_bytes(&data) == sha256 {
            return Ok(Some(row.get("id")));
        }
    }

    Ok(None)
}

pub async fn insert_upload(
    executor: impl sqlx::Executor<'_, Database = Postgres>,
    id: &str,
    filename: String,
    mime_type: String,
    bytes: Vec<u8>,
    size: i64,
) -> CommandResult<()> {
    sqlx::query(
        r#"
        INSERT INTO uploads (id, filename, mime_type, data, size)
        VALUES ($1, $2, $3, $4, $5)
        "#,
    )
    .bind(id)
    .bind(filename)
    .bind(mime_type)
    .bind(bytes)
    .bind(size)
    .execute(executor)
    .await
    .map_err(db::clean_query_error)?;

    Ok(())
}

pub async fn attach_file_if_supported(
    executor: impl sqlx::Executor<'_, Database = Postgres>,
    knowledge_id: Option<String>,
    file_id: &str,
) -> CommandResult<()> {
    let Some(knowledge_id) = knowledge_id.filter(|value| !value.trim().is_empty()) else {
        return Ok(());
    };

    sqlx::query(
        r#"
        INSERT INTO knowledge_files (knowledge_id, file_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
        "#,
    )
    .bind(knowledge_id)
    .bind(file_id)
    .execute(executor)
    .await
    .map_err(db::clean_query_error)?;

    Ok(())
}

pub async fn fetch_file(pool: &sqlx::PgPool, id_or_url: &str) -> CommandResult<StoredFile> {
    let id = normalize_file_id(id_or_url)?;
    let row = sqlx::query(
        r#"
        SELECT filename, data
        FROM uploads
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(pool)
    .await
    .map_err(db::clean_query_error)?
    .ok_or_else(|| CommandError::not_found("文件不存在"))?;

    Ok(StoredFile {
        filename: row.get("filename"),
        data: row.get("data"),
    })
}

pub async fn fetch_protocol_file(
    pool: &sqlx::PgPool,
    file_id: &str,
) -> Result<Option<ProtocolFile>, sqlx::Error> {
    sqlx::query("SELECT data, mime_type FROM uploads WHERE id = $1")
        .bind(file_id)
        .fetch_optional(pool)
        .await
        .map(|row| {
            row.map(|row| ProtocolFile {
                data: row.get("data"),
                mime_type: row.get("mime_type"),
            })
        })
}

pub async fn delete_upload(pool: &sqlx::PgPool, file_id: &str) -> CommandResult<()> {
    let result = sqlx::query("DELETE FROM uploads WHERE id = $1")
        .bind(file_id)
        .execute(pool)
        .await
        .map_err(db::clean_query_error)?;

    if result.rows_affected() == 0 {
        return Err(CommandError::not_found("文件不存在"));
    }

    Ok(())
}

pub async fn detach_file_from_knowledge(
    pool: &sqlx::PgPool,
    entry_id: String,
    file_id: &str,
) -> CommandResult<()> {
    sqlx::query(
        r#"
        DELETE FROM knowledge_files
        WHERE knowledge_id = $1 AND file_id = $2
        "#,
    )
    .bind(entry_id)
    .bind(file_id)
    .execute(pool)
    .await
    .map_err(db::clean_query_error)?;

    Ok(())
}
