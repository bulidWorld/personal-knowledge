use sqlx::Row;
use tauri::State;
use uuid::Uuid;

use crate::{
    app_state::AppState,
    db,
    error::{CommandError, CommandResult},
    models::category::{Category, CategoryPayload},
};

fn map_category(row: sqlx::postgres::PgRow) -> Category {
    Category {
        id: row.get("id"),
        name: row.get("name"),
        icon: row.get("icon"),
        border_color: row.get("border_color"),
        dot_color: row.get("dot_color"),
        gradient: row.get("gradient"),
        description: row.get("description"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
        entry_count: row.get("entry_count"),
    }
}

async fn get_category_by_id(pool: &sqlx::PgPool, id: &str) -> CommandResult<Category> {
    let row = sqlx::query(
        r#"
        SELECT
          c.id,
          c.name,
          c.icon,
          c.border_color,
          c.dot_color,
          c.gradient,
          c.description,
          to_char(c.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at,
          to_char(c.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as updated_at,
          COUNT(e.id)::bigint as entry_count
        FROM categories c
        LEFT JOIN entries e ON c.id = e.category_id
        WHERE c.id = $1
        GROUP BY c.id
        "#,
    )
    .bind(id)
    .fetch_optional(pool)
    .await
    .map_err(db::clean_query_error)?;

    row.map(map_category)
        .ok_or_else(|| CommandError::not_found("分类不存在"))
}

#[tauri::command]
pub async fn list_categories(state: State<'_, AppState>) -> CommandResult<Vec<Category>> {
    let pool = db::get_pool(&state).await?;
    let rows = sqlx::query(
        r#"
        SELECT
          c.id,
          c.name,
          c.icon,
          c.border_color,
          c.dot_color,
          c.gradient,
          c.description,
          to_char(c.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at,
          to_char(c.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as updated_at,
          COUNT(e.id)::bigint as entry_count
        FROM categories c
        LEFT JOIN entries e ON c.id = e.category_id
        GROUP BY c.id
        ORDER BY c.created_at
        "#,
    )
    .fetch_all(&pool)
    .await
    .map_err(db::clean_query_error)?;

    Ok(rows.into_iter().map(map_category).collect())
}

#[tauri::command]
pub async fn create_category(
    payload: CategoryPayload,
    state: State<'_, AppState>,
) -> CommandResult<Category> {
    let name = payload.name.trim();
    if name.is_empty() {
        return Err(CommandError::validation("分类名称不能为空"));
    }

    let pool = db::get_pool(&state).await?;
    let id = Uuid::new_v4().to_string();

    sqlx::query(
        r#"
        INSERT INTO categories (id, name, icon, border_color, dot_color, gradient, description)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        "#,
    )
    .bind(&id)
    .bind(name)
    .bind(payload.icon.unwrap_or_else(|| "LayoutGrid".to_string()))
    .bind(
        payload
            .border_color
            .unwrap_or_else(|| "border-l-blue-500".to_string()),
    )
    .bind(
        payload
            .dot_color
            .unwrap_or_else(|| "bg-blue-500".to_string()),
    )
    .bind(
        payload
            .gradient
            .unwrap_or_else(|| "bg-gradient-to-r from-blue-400 to-blue-500".to_string()),
    )
    .bind(payload.description.unwrap_or_default())
    .execute(&pool)
    .await
    .map_err(db::clean_query_error)?;

    get_category_by_id(&pool, &id).await
}

#[tauri::command]
pub async fn update_category(
    id: String,
    payload: CategoryPayload,
    state: State<'_, AppState>,
) -> CommandResult<Category> {
    let pool = db::get_pool(&state).await?;

    sqlx::query(
        r#"
        UPDATE categories
        SET name = $1, icon = $2, border_color = $3, dot_color = $4, gradient = $5, description = $6
        WHERE id = $7
        "#,
    )
    .bind(payload.name)
    .bind(payload.icon.unwrap_or_else(|| "LayoutGrid".to_string()))
    .bind(payload.border_color.unwrap_or_default())
    .bind(payload.dot_color.unwrap_or_default())
    .bind(payload.gradient.unwrap_or_default())
    .bind(payload.description.unwrap_or_default())
    .bind(&id)
    .execute(&pool)
    .await
    .map_err(db::clean_query_error)?;

    get_category_by_id(&pool, &id).await
}

#[tauri::command]
pub async fn delete_category(id: String, state: State<'_, AppState>) -> CommandResult<()> {
    let pool = db::get_pool(&state).await?;
    let count: i64 =
        sqlx::query("SELECT COUNT(*)::bigint as count FROM entries WHERE category_id = $1")
            .bind(&id)
            .fetch_one(&pool)
            .await
            .map_err(db::clean_query_error)?
            .get("count");

    if count > 0 {
        return Err(CommandError::validation(format!(
            "该分类下有 {count} 条知识条目，请先移动或删除这些条目后再删除分类"
        )));
    }

    sqlx::query("DELETE FROM categories WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(db::clean_query_error)?;

    Ok(())
}
