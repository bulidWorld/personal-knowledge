use sqlx::Row;
use tauri::State;

use crate::{
    app_state::AppState,
    db,
    error::{CommandError, CommandResult},
    models::tag::{Tag, TagPayload},
};

fn map_tag(row: sqlx::postgres::PgRow) -> Tag {
    Tag {
        id: row.get("id"),
        name: row.get("name"),
        color: row.get("color"),
        created_at: row.get("created_at"),
        entry_count: row.get("entry_count"),
    }
}

async fn get_tag_by_id(pool: &sqlx::PgPool, id: &str) -> CommandResult<Tag> {
    let row = sqlx::query(
        r#"
        SELECT
          t.id,
          t.name,
          t.color,
          to_char(t.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at,
          COUNT(et.entry_id)::bigint as entry_count
        FROM tags t
        LEFT JOIN entry_tags et ON t.id = et.tag_id
        WHERE t.id = $1
        GROUP BY t.id
        "#,
    )
    .bind(id)
    .fetch_optional(pool)
    .await
    .map_err(db::clean_query_error)?;

    row.map(map_tag)
        .ok_or_else(|| CommandError::not_found("标签不存在"))
}

#[tauri::command]
pub async fn list_tags(state: State<'_, AppState>) -> CommandResult<Vec<Tag>> {
    let pool = db::get_pool(&state).await?;
    let rows = sqlx::query(
        r#"
        SELECT
          t.id,
          t.name,
          t.color,
          to_char(t.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at,
          COUNT(et.entry_id)::bigint as entry_count
        FROM tags t
        LEFT JOIN entry_tags et ON t.id = et.tag_id
        GROUP BY t.id
        ORDER BY t.created_at
        "#,
    )
    .fetch_all(&pool)
    .await
    .map_err(db::clean_query_error)?;

    Ok(rows.into_iter().map(map_tag).collect())
}

#[tauri::command]
pub async fn create_tag(payload: TagPayload, state: State<'_, AppState>) -> CommandResult<Tag> {
    let name = payload.name.trim();
    if name.is_empty() {
        return Err(CommandError::validation("标签名称不能为空"));
    }

    let pool = db::get_pool(&state).await?;
    let id = format!("tag-{}", uuid::Uuid::new_v4().simple());

    sqlx::query("INSERT INTO tags (id, name, color) VALUES ($1, $2, $3)")
        .bind(&id)
        .bind(name)
        .bind(payload.color.unwrap_or_else(|| "#6366f1".to_string()))
        .execute(&pool)
        .await
        .map_err(db::clean_query_error)?;

    get_tag_by_id(&pool, &id).await
}

#[tauri::command]
pub async fn update_tag(
    id: String,
    payload: TagPayload,
    state: State<'_, AppState>,
) -> CommandResult<Tag> {
    let name = payload.name.trim();
    if name.is_empty() {
        return Err(CommandError::validation("标签名称不能为空"));
    }

    let pool = db::get_pool(&state).await?;
    let result = sqlx::query("UPDATE tags SET name = $1, color = $2 WHERE id = $3")
        .bind(name)
        .bind(payload.color.unwrap_or_else(|| "#6366f1".to_string()))
        .bind(&id)
        .execute(&pool)
        .await
        .map_err(db::clean_query_error)?;

    if result.rows_affected() == 0 {
        return Err(CommandError::not_found("标签不存在"));
    }

    get_tag_by_id(&pool, &id).await
}

#[tauri::command]
pub async fn delete_tag(id: String, state: State<'_, AppState>) -> CommandResult<()> {
    let pool = db::get_pool(&state).await?;
    let result = sqlx::query("DELETE FROM tags WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(db::clean_query_error)?;

    if result.rows_affected() == 0 {
        return Err(CommandError::not_found("标签不存在"));
    }

    Ok(())
}
