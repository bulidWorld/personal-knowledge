use sqlx::Row;
use tauri::State;

use crate::{
    app_state::AppState,
    db,
    error::{CommandError, CommandResult},
    models::system::{CreateSystemPayload, System, UpdateSystemPayload},
};

fn map_system(row: sqlx::postgres::PgRow) -> System {
    System {
        id: row.get("id"),
        name: row.get("name"),
        description: row.get("description"),
        icon: row.get("icon"),
        border_color: row.get("border_color"),
        dot_color: row.get("dot_color"),
        gradient: row.get("gradient"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
        node_count: row.get("node_count"),
    }
}

async fn get_system_by_id(pool: &sqlx::PgPool, id: &str) -> CommandResult<System> {
    let row = sqlx::query(
        r#"
        SELECT
          s.id,
          s.name,
          s.description,
          s.icon,
          s.border_color,
          s.dot_color,
          s.gradient,
          to_char(s.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at,
          to_char(s.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as updated_at,
          COUNT(mn.id)::bigint as node_count
        FROM systems s
        LEFT JOIN mindmap_nodes mn ON s.id = mn.system_id
        WHERE s.id = $1
        GROUP BY s.id
        "#,
    )
    .bind(id)
    .fetch_optional(pool)
    .await
    .map_err(db::clean_query_error)?;

    row.map(map_system)
        .ok_or_else(|| CommandError::not_found("系统不存在"))
}

#[tauri::command]
pub async fn list_systems(state: State<'_, AppState>) -> CommandResult<Vec<System>> {
    let pool = db::get_pool(&state).await?;
    let rows = sqlx::query(
        r#"
        SELECT
          s.id,
          s.name,
          s.description,
          s.icon,
          s.border_color,
          s.dot_color,
          s.gradient,
          to_char(s.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at,
          to_char(s.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as updated_at,
          COUNT(mn.id)::bigint as node_count
        FROM systems s
        LEFT JOIN mindmap_nodes mn ON s.id = mn.system_id
        GROUP BY s.id
        ORDER BY s.updated_at DESC
        "#,
    )
    .fetch_all(&pool)
    .await
    .map_err(db::clean_query_error)?;

    Ok(rows.into_iter().map(map_system).collect())
}

#[tauri::command]
pub async fn create_system(
    payload: CreateSystemPayload,
    state: State<'_, AppState>,
) -> CommandResult<System> {
    let name = payload.name.trim();
    if name.is_empty() {
        return Err(CommandError::validation("系统名称不能为空"));
    }

    let pool = db::get_pool(&state).await?;
    let mut tx = pool.begin().await.map_err(db::clean_query_error)?;
    let id = format!("system-{}", uuid::Uuid::new_v4().simple());
    let root_id = format!("node-{}", uuid::Uuid::new_v4().simple());

    sqlx::query(
        r#"
        INSERT INTO systems (id, name, description, icon, border_color, dot_color, gradient, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        "#,
    )
    .bind(&id)
    .bind(name)
    .bind(payload.description.unwrap_or_default())
    .bind(payload.icon.unwrap_or_else(|| "Network".to_string()))
    .bind(payload.border_color.unwrap_or_else(|| "border-l-teal-500".to_string()))
    .bind(payload.dot_color.unwrap_or_else(|| "bg-teal-500".to_string()))
    .bind(payload.gradient.unwrap_or_else(|| "bg-gradient-to-r from-teal-400 to-teal-500".to_string()))
    .execute(&mut *tx)
    .await
    .map_err(db::clean_query_error)?;

    sqlx::query(
        r#"
        INSERT INTO mindmap_nodes
          (id, system_id, title, html_content, markdown_content, richtext_content, content_type, node_type, parent_id, x, y, color, created_at, updated_at)
        VALUES ($1, $2, $3, '', '', '', 'html', 'topic', NULL, 400, 250, '#10b981', NOW(), NOW())
        "#,
    )
    .bind(&root_id)
    .bind(&id)
    .bind(name)
    .execute(&mut *tx)
    .await
    .map_err(db::clean_query_error)?;

    tx.commit().await.map_err(db::clean_query_error)?;
    get_system_by_id(&pool, &id).await
}

#[tauri::command]
pub async fn update_system(
    id: String,
    payload: UpdateSystemPayload,
    state: State<'_, AppState>,
) -> CommandResult<System> {
    let name = payload.name.trim();
    if name.is_empty() {
        return Err(CommandError::validation("系统名称不能为空"));
    }

    let pool = db::get_pool(&state).await?;
    let result = sqlx::query(
        "UPDATE systems SET name = $1, description = $2, updated_at = NOW() WHERE id = $3",
    )
    .bind(name)
    .bind(payload.description.unwrap_or_default())
    .bind(&id)
    .execute(&pool)
    .await
    .map_err(db::clean_query_error)?;

    if result.rows_affected() == 0 {
        return Err(CommandError::not_found("系统不存在"));
    }

    get_system_by_id(&pool, &id).await
}

#[tauri::command]
pub async fn delete_system(id: String, state: State<'_, AppState>) -> CommandResult<()> {
    let pool = db::get_pool(&state).await?;
    let mut tx = pool.begin().await.map_err(db::clean_query_error)?;

    sqlx::query("DELETE FROM mindmap_connections WHERE system_id = $1")
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(db::clean_query_error)?;
    sqlx::query("DELETE FROM mindmap_nodes WHERE system_id = $1")
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(db::clean_query_error)?;
    sqlx::query("DELETE FROM systems WHERE id = $1")
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(db::clean_query_error)?;

    tx.commit().await.map_err(db::clean_query_error)?;
    Ok(())
}
