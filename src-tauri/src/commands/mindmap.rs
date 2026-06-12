use sqlx::{Postgres, Row};
use tauri::State;
use uuid::Uuid;

use crate::{
    app_state::AppState,
    db,
    error::{CommandError, CommandResult},
    models::mindmap::{
        CreateMindMapConnectionPayload, CreateMindMapNodePayload, MindMap, MindMapConnection,
        MindMapNode, SaveMindMapPayload, UpdateMindMapNodePayload,
    },
};

fn validate_content_type(value: Option<String>) -> CommandResult<String> {
    let content_type = value.unwrap_or_else(|| "html".to_string());
    match content_type.as_str() {
        "html" | "markdown" | "richtext" => Ok(content_type),
        _ => Err(CommandError::validation("内容类型无效")),
    }
}

fn validate_node_type(value: String) -> CommandResult<String> {
    match value.as_str() {
        "topic" | "concept" | "operation" | "article" => Ok(value),
        _ => Err(CommandError::validation("节点类型无效")),
    }
}

async fn fetch_node_by_id(
    executor: impl sqlx::Executor<'_, Database = Postgres>,
    id: &str,
) -> CommandResult<MindMapNode> {
    let row = sqlx::query(
        r#"
        SELECT
          id,
          system_id,
          title,
          html_content,
          markdown_content,
          richtext_content,
          content_type,
          node_type,
          parent_id,
          x::float8 as x,
          y::float8 as y,
          color,
          to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at,
          to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as updated_at
        FROM mindmap_nodes
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(executor)
    .await
    .map_err(db::clean_query_error)?;

    row.map(map_node)
        .ok_or_else(|| CommandError::not_found("节点不存在"))
}

async fn fetch_connection_by_id(
    executor: impl sqlx::Executor<'_, Database = Postgres>,
    id: &str,
) -> CommandResult<MindMapConnection> {
    let row = sqlx::query(
        r#"
        SELECT
          id,
          system_id,
          source_node_id,
          target_node_id,
          to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at
        FROM mindmap_connections
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(executor)
    .await
    .map_err(db::clean_query_error)?;

    row.map(map_connection)
        .ok_or_else(|| CommandError::not_found("连线不存在"))
}

fn map_node(row: sqlx::postgres::PgRow) -> MindMapNode {
    MindMapNode {
        id: row.get("id"),
        system_id: row.get("system_id"),
        title: row.get("title"),
        html_content: row.get("html_content"),
        markdown_content: row.get("markdown_content"),
        richtext_content: row.get("richtext_content"),
        content_type: row.get("content_type"),
        node_type: row.get("node_type"),
        parent_id: row.get("parent_id"),
        x: row.get("x"),
        y: row.get("y"),
        color: row.get("color"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    }
}

fn map_connection(row: sqlx::postgres::PgRow) -> MindMapConnection {
    MindMapConnection {
        id: row.get("id"),
        system_id: row.get("system_id"),
        source_node_id: row.get("source_node_id"),
        target_node_id: row.get("target_node_id"),
        created_at: row.get("created_at"),
    }
}

#[tauri::command]
pub async fn list_mindmap_nodes(
    #[allow(non_snake_case)] systemId: String,
    state: State<'_, AppState>,
) -> CommandResult<Vec<MindMapNode>> {
    if systemId.trim().is_empty() {
        return Err(CommandError::validation("缺少 systemId"));
    }

    let pool = db::get_pool(&state).await?;
    let rows = sqlx::query(
        r#"
        SELECT
          id,
          system_id,
          title,
          html_content,
          markdown_content,
          richtext_content,
          content_type,
          node_type,
          parent_id,
          x::float8 as x,
          y::float8 as y,
          color,
          to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at,
          to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as updated_at
        FROM mindmap_nodes
        WHERE system_id = $1
        ORDER BY created_at ASC
        "#,
    )
    .bind(systemId)
    .fetch_all(&pool)
    .await
    .map_err(db::clean_query_error)?;

    Ok(rows.into_iter().map(map_node).collect())
}

#[tauri::command]
pub async fn list_mindmap_connections(
    #[allow(non_snake_case)] systemId: String,
    state: State<'_, AppState>,
) -> CommandResult<Vec<MindMapConnection>> {
    if systemId.trim().is_empty() {
        return Err(CommandError::validation("缺少 systemId"));
    }

    let pool = db::get_pool(&state).await?;
    let rows = sqlx::query(
        r#"
        SELECT
          id,
          system_id,
          source_node_id,
          target_node_id,
          to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at
        FROM mindmap_connections
        WHERE system_id = $1
        ORDER BY created_at ASC
        "#,
    )
    .bind(systemId)
    .fetch_all(&pool)
    .await
    .map_err(db::clean_query_error)?;

    Ok(rows.into_iter().map(map_connection).collect())
}

#[tauri::command]
pub async fn get_mindmap(
    #[allow(non_snake_case)] systemId: String,
    state: State<'_, AppState>,
) -> CommandResult<MindMap> {
    let nodes = list_mindmap_nodes(systemId.clone(), state.clone()).await?;
    let connections = list_mindmap_connections(systemId, state).await?;

    Ok(MindMap { nodes, connections })
}

#[tauri::command]
pub async fn create_mindmap_node(
    payload: CreateMindMapNodePayload,
    state: State<'_, AppState>,
) -> CommandResult<MindMapNode> {
    let title = payload.title.trim();
    if title.is_empty() {
        return Err(CommandError::validation("节点标题不能为空"));
    }
    if payload.system_id.trim().is_empty() {
        return Err(CommandError::validation("缺少 systemId"));
    }

    let node_type = validate_node_type(payload.node_type)?;
    let content_type = validate_content_type(payload.content_type)?;
    let pool = db::get_pool(&state).await?;
    let id = format!("node-{}", Uuid::new_v4().simple());

    sqlx::query(
        r#"
        INSERT INTO mindmap_nodes
          (id, system_id, title, html_content, markdown_content, richtext_content, content_type, node_type, parent_id, x, y, color, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        "#,
    )
    .bind(&id)
    .bind(payload.system_id)
    .bind(title)
    .bind(payload.html_content.unwrap_or_default())
    .bind(payload.markdown_content.unwrap_or_default())
    .bind(payload.richtext_content.unwrap_or_default())
    .bind(content_type)
    .bind(node_type)
    .bind(payload.parent_id.filter(|value| !value.trim().is_empty()))
    .bind(payload.x.unwrap_or(400.0))
    .bind(payload.y.unwrap_or(300.0))
    .bind(payload.color.unwrap_or_default())
    .execute(&pool)
    .await
    .map_err(db::clean_query_error)?;

    fetch_node_by_id(&pool, &id).await
}

#[tauri::command]
pub async fn update_mindmap_node(
    id: String,
    payload: UpdateMindMapNodePayload,
    state: State<'_, AppState>,
) -> CommandResult<MindMapNode> {
    let pool = db::get_pool(&state).await?;
    let current = fetch_node_by_id(&pool, &id).await?;

    let title = payload
        .title
        .map(|value| value.trim().to_string())
        .unwrap_or(current.title);
    if title.is_empty() {
        return Err(CommandError::validation("节点标题不能为空"));
    }

    let content_type = validate_content_type(payload.content_type.or(Some(current.content_type)))?;
    let node_type = validate_node_type(payload.node_type.unwrap_or(current.node_type))?;

    sqlx::query(
        r#"
        UPDATE mindmap_nodes
        SET title = $1,
            html_content = $2,
            markdown_content = $3,
            richtext_content = $4,
            content_type = $5,
            node_type = $6,
            parent_id = $7,
            x = $8,
            y = $9,
            color = $10,
            updated_at = NOW()
        WHERE id = $11
        "#,
    )
    .bind(title)
    .bind(payload.html_content.unwrap_or(current.html_content))
    .bind(payload.markdown_content.unwrap_or(current.markdown_content))
    .bind(payload.richtext_content.unwrap_or(current.richtext_content))
    .bind(content_type)
    .bind(node_type)
    .bind(payload.parent_id.or(current.parent_id))
    .bind(payload.x.unwrap_or(current.x))
    .bind(payload.y.unwrap_or(current.y))
    .bind(payload.color.unwrap_or(current.color))
    .bind(&id)
    .execute(&pool)
    .await
    .map_err(db::clean_query_error)?;

    fetch_node_by_id(&pool, &id).await
}

#[tauri::command]
pub async fn delete_mindmap_node(id: String, state: State<'_, AppState>) -> CommandResult<()> {
    let pool = db::get_pool(&state).await?;
    let mut tx = pool.begin().await.map_err(db::clean_query_error)?;

    sqlx::query("DELETE FROM mindmap_connections WHERE source_node_id = $1 OR target_node_id = $1")
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(db::clean_query_error)?;
    sqlx::query("DELETE FROM mindmap_nodes WHERE parent_id = $1")
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(db::clean_query_error)?;
    let result = sqlx::query("DELETE FROM mindmap_nodes WHERE id = $1")
        .bind(id)
        .execute(&mut *tx)
        .await
        .map_err(db::clean_query_error)?;

    if result.rows_affected() == 0 {
        return Err(CommandError::not_found("节点不存在"));
    }

    tx.commit().await.map_err(db::clean_query_error)?;
    Ok(())
}

#[tauri::command]
pub async fn create_mindmap_connection(
    payload: CreateMindMapConnectionPayload,
    state: State<'_, AppState>,
) -> CommandResult<MindMapConnection> {
    if payload.system_id.trim().is_empty() {
        return Err(CommandError::validation("缺少 systemId"));
    }
    if payload.source_node_id.trim().is_empty() {
        return Err(CommandError::validation("缺少 sourceNodeId"));
    }
    if payload.target_node_id.trim().is_empty() {
        return Err(CommandError::validation("缺少 targetNodeId"));
    }

    let pool = db::get_pool(&state).await?;
    let id = format!("conn-{}", Uuid::new_v4().simple());

    sqlx::query(
        r#"
        INSERT INTO mindmap_connections (id, system_id, source_node_id, target_node_id, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        "#,
    )
    .bind(&id)
    .bind(payload.system_id)
    .bind(payload.source_node_id)
    .bind(payload.target_node_id)
    .execute(&pool)
    .await
    .map_err(db::clean_query_error)?;

    fetch_connection_by_id(&pool, &id).await
}

#[tauri::command]
pub async fn delete_mindmap_connection(
    id: String,
    state: State<'_, AppState>,
) -> CommandResult<()> {
    let pool = db::get_pool(&state).await?;
    let result = sqlx::query("DELETE FROM mindmap_connections WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(db::clean_query_error)?;

    if result.rows_affected() == 0 {
        return Err(CommandError::not_found("连线不存在"));
    }

    Ok(())
}

#[tauri::command]
pub async fn save_mindmap(
    payload: SaveMindMapPayload,
    state: State<'_, AppState>,
) -> CommandResult<MindMap> {
    if payload.system_id.trim().is_empty() {
        return Err(CommandError::validation("缺少 systemId"));
    }

    let pool = db::get_pool(&state).await?;
    let mut tx = pool.begin().await.map_err(db::clean_query_error)?;

    sqlx::query("DELETE FROM mindmap_connections WHERE system_id = $1")
        .bind(&payload.system_id)
        .execute(&mut *tx)
        .await
        .map_err(db::clean_query_error)?;
    sqlx::query("DELETE FROM mindmap_nodes WHERE system_id = $1")
        .bind(&payload.system_id)
        .execute(&mut *tx)
        .await
        .map_err(db::clean_query_error)?;

    for node in payload.nodes {
        let id = if node.id.trim().is_empty() {
            format!("node-{}", Uuid::new_v4().simple())
        } else {
            node.id
        };
        let title = node.title.trim();
        if title.is_empty() {
            return Err(CommandError::validation("节点标题不能为空"));
        }

        sqlx::query(
            r#"
            INSERT INTO mindmap_nodes
              (id, system_id, title, html_content, markdown_content, richtext_content, content_type, node_type, parent_id, x, y, color, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
            "#,
        )
        .bind(id)
        .bind(&payload.system_id)
        .bind(title)
        .bind(node.html_content.unwrap_or_default())
        .bind(node.markdown_content.unwrap_or_default())
        .bind(node.richtext_content.unwrap_or_default())
        .bind(validate_content_type(node.content_type)?)
        .bind(validate_node_type(node.node_type)?)
        .bind(node.parent_id.filter(|value| !value.trim().is_empty()))
        .bind(node.x.unwrap_or(400.0))
        .bind(node.y.unwrap_or(300.0))
        .bind(node.color.unwrap_or_default())
        .execute(&mut *tx)
        .await
        .map_err(db::clean_query_error)?;
    }

    for connection in payload.connections {
        let id = if connection.id.trim().is_empty() {
            format!("conn-{}", Uuid::new_v4().simple())
        } else {
            connection.id
        };

        sqlx::query(
            r#"
            INSERT INTO mindmap_connections (id, system_id, source_node_id, target_node_id, created_at)
            VALUES ($1, $2, $3, $4, NOW())
            "#,
        )
        .bind(id)
        .bind(&payload.system_id)
        .bind(connection.source_node_id)
        .bind(connection.target_node_id)
        .execute(&mut *tx)
        .await
        .map_err(db::clean_query_error)?;
    }

    tx.commit().await.map_err(db::clean_query_error)?;
    get_mindmap(payload.system_id, state).await
}
