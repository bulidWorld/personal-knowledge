use sqlx::{Postgres, QueryBuilder, Row};
use tauri::State;

use crate::{
    app_state::AppState,
    db,
    error::{CommandError, CommandResult},
    models::knowledge::{
        KnowledgeClickResult, KnowledgeEntry, KnowledgePage, KnowledgePayload, KnowledgeQuery,
    },
};

const HOT_SCORE_SQL: &str = r#"
CASE
  WHEN ec.clicked_at >= NOW() - INTERVAL '7 days' THEN 1.0
  WHEN ec.clicked_at <= NOW() - INTERVAL '56 days' THEN 0.1
  ELSE GREATEST(
    0.1,
    1.0 - (
      ((EXTRACT(EPOCH FROM (NOW() - ec.clicked_at)) / 86400.0) - 7)
      * ((1.0 - 0.1) / 49)
    )
  )
END
"#;

fn clamp_page(value: Option<i64>) -> i64 {
    value.unwrap_or(1).max(1)
}

fn clamp_page_size(value: Option<i64>) -> i64 {
    value.unwrap_or(9).clamp(1, 50)
}

fn is_present(value: &Option<String>) -> bool {
    value
        .as_ref()
        .map(|value| !value.trim().is_empty())
        .unwrap_or(false)
}

fn push_filters(builder: &mut QueryBuilder<'_, Postgres>, query: &KnowledgeQuery) {
    let mut has_where = false;

    if is_present(&query.category_id) {
        builder.push(if has_where { " AND " } else { " WHERE " });
        has_where = true;
        builder.push("e.category_id = ");
        builder.push_bind(query.category_id.as_ref().unwrap().clone());
    }

    if is_present(&query.tag_id) {
        builder.push(if has_where { " AND " } else { " WHERE " });
        has_where = true;
        builder.push("e.id IN (SELECT entry_id FROM entry_tags WHERE tag_id = ");
        builder.push_bind(query.tag_id.as_ref().unwrap().clone());
        builder.push(")");
    }

    if is_present(&query.search) {
        let pattern = format!("%{}%", query.search.as_ref().unwrap().trim());
        builder.push(if has_where { " AND " } else { " WHERE " });
        has_where = true;
        builder.push("(");
        builder.push("e.title ILIKE ");
        builder.push_bind(pattern.clone());
        builder.push(" OR e.html_content ILIKE ");
        builder.push_bind(pattern.clone());
        builder.push(" OR e.markdown_content ILIKE ");
        builder.push_bind(pattern.clone());
        builder.push(" OR e.richtext_content ILIKE ");
        builder.push_bind(pattern.clone());
        builder.push(" OR c.name ILIKE ");
        builder.push_bind(pattern.clone());
        builder.push(
            " OR EXISTS (SELECT 1 FROM entry_tags et JOIN tags t ON et.tag_id = t.id WHERE et.entry_id = e.id AND t.name ILIKE ",
        );
        builder.push_bind(pattern.clone());
        builder.push(")");
        builder.push(
            " OR EXISTS (SELECT 1 FROM mindmap_nodes mn JOIN systems s ON mn.system_id = s.id WHERE s.name ILIKE ",
        );
        builder.push_bind(pattern);
        builder.push(
            " AND (mn.title = e.title OR mn.html_content = e.html_content OR mn.markdown_content = e.markdown_content OR mn.richtext_content = e.richtext_content))",
        );
        builder.push(")");
    }

    if is_present(&query.system_id) {
        builder.push(if has_where { " AND " } else { " WHERE " });
        has_where = true;
        builder.push("EXISTS (SELECT 1 FROM mindmap_nodes mn WHERE mn.system_id = ");
        builder.push_bind(query.system_id.as_ref().unwrap().clone());
        builder.push(
            " AND (mn.title = e.title OR mn.html_content = e.html_content OR mn.markdown_content = e.markdown_content OR mn.richtext_content = e.richtext_content))",
        );
    }

    if let Some(favorite) = query.favorite {
        builder.push(if has_where { " AND " } else { " WHERE " });
        has_where = true;
        if favorite {
            builder.push("COALESCE(e.is_favorite, false) = true");
        } else {
            builder.push("COALESCE(e.is_favorite, false) = false");
        }
    }

    if let Some(pinned) = query.pinned {
        builder.push(if has_where { " AND " } else { " WHERE " });
        if pinned {
            builder.push("COALESCE(e.is_pinned, false) = true");
        } else {
            builder.push("COALESCE(e.is_pinned, false) = false");
        }
    }
}

fn query_uses_favorite_filters(query: &KnowledgeQuery) -> bool {
    query.favorite.is_some() || query.pinned.is_some()
}

fn map_entry(row: sqlx::postgres::PgRow) -> KnowledgeEntry {
    KnowledgeEntry {
        id: row.get("id"),
        title: row.get("title"),
        html_content: row.get("html_content"),
        markdown_content: row.get("markdown_content"),
        richtext_content: row.get("richtext_content"),
        content_type: row.get("content_type"),
        category_id: row.get("category_id"),
        iframe_url: row.get("iframe_url"),
        image_url: row.get("image_url"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
        category_name: row.get("category_name"),
        icon: row.get("icon"),
        border_color: row.get("border_color"),
        dot_color: row.get("dot_color"),
        gradient: row.get("gradient"),
        hot_score: row.get("hot_score"),
        click_count: row.get("click_count"),
        tags: row.get("tags"),
    }
}

async fn table_exists(pool: &sqlx::PgPool, table_name: &str) -> CommandResult<bool> {
    let exists = sqlx::query("SELECT to_regclass($1) IS NOT NULL as exists")
        .bind(table_name)
        .fetch_one(pool)
        .await
        .map_err(db::clean_query_error)?
        .get("exists");

    Ok(exists)
}

async fn column_exists(
    pool: &sqlx::PgPool,
    table_name: &str,
    column_name: &str,
) -> CommandResult<bool> {
    let exists = sqlx::query(
        r#"
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = $1
            AND column_name = $2
        ) as exists
        "#,
    )
    .bind(table_name)
    .bind(column_name)
    .fetch_one(pool)
    .await
    .map_err(db::clean_query_error)?
    .get("exists");

    Ok(exists)
}

fn validate_content_type(value: Option<String>) -> CommandResult<String> {
    let content_type = value.unwrap_or_else(|| "html".to_string());
    match content_type.as_str() {
        "html" | "markdown" | "richtext" => Ok(content_type),
        _ => Err(CommandError::validation("内容类型无效")),
    }
}

async fn fetch_knowledge_by_id(pool: &sqlx::PgPool, id: &str) -> CommandResult<KnowledgeEntry> {
    let row = sqlx::query(
        r#"
        SELECT
          e.id,
          e.title,
          e.html_content,
          e.markdown_content,
          e.richtext_content,
          e.content_type,
          e.category_id,
          e.iframe_url,
          e.image_url,
          to_char(e.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at,
          to_char(e.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as updated_at,
          c.name as category_name,
          c.icon,
          c.border_color,
          c.dot_color,
          c.gradient,
          0::float8 as hot_score,
          0::bigint as click_count,
          COALESCE(
            (
              SELECT jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'color', t.color) ORDER BY t.created_at)
              FROM entry_tags et
              JOIN tags t ON et.tag_id = t.id
              WHERE et.entry_id = e.id
            ),
            '[]'::jsonb
          ) as tags
        FROM entries e
        JOIN categories c ON e.category_id = c.id
        WHERE e.id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(pool)
    .await
    .map_err(db::clean_query_error)?;

    row.map(map_entry)
        .ok_or_else(|| CommandError::not_found("条目不存在"))
}

async fn ensure_category_exists(
    executor: impl sqlx::Executor<'_, Database = Postgres>,
    category_id: &str,
) -> CommandResult<()> {
    let exists: bool =
        sqlx::query("SELECT EXISTS(SELECT 1 FROM categories WHERE id = $1) as exists")
            .bind(category_id)
            .fetch_one(executor)
            .await
            .map_err(db::clean_query_error)?
            .get("exists");

    if !exists {
        return Err(CommandError::validation("请选择有效分类"));
    }

    Ok(())
}

async fn sync_entry_tags(
    tx: &mut sqlx::Transaction<'_, Postgres>,
    entry_id: &str,
    tag_ids: &[String],
) -> CommandResult<()> {
    sqlx::query("DELETE FROM entry_tags WHERE entry_id = $1")
        .bind(entry_id)
        .execute(&mut **tx)
        .await
        .map_err(db::clean_query_error)?;

    for tag_id in tag_ids {
        let exists: bool = sqlx::query("SELECT EXISTS(SELECT 1 FROM tags WHERE id = $1) as exists")
            .bind(tag_id)
            .fetch_one(&mut **tx)
            .await
            .map_err(db::clean_query_error)?
            .get("exists");

        if !exists {
            return Err(CommandError::validation("包含不存在的标签"));
        }

        sqlx::query(
            "INSERT INTO entry_tags (entry_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        )
        .bind(entry_id)
        .bind(tag_id)
        .execute(&mut **tx)
        .await
        .map_err(db::clean_query_error)?;
    }

    Ok(())
}

#[tauri::command]
pub async fn list_knowledge(
    query: Option<KnowledgeQuery>,
    state: State<'_, AppState>,
) -> CommandResult<KnowledgePage> {
    let query = query.unwrap_or(KnowledgeQuery {
        page: None,
        page_size: None,
        search: None,
        category_id: None,
        tag_id: None,
        system_id: None,
        favorite: None,
        pinned: None,
    });
    let page = clamp_page(query.page);
    let page_size = clamp_page_size(query.page_size);
    let offset = (page - 1) * page_size;
    let pool = db::get_pool(&state).await?;
    let has_entry_clicks = table_exists(&pool, "entry_clicks").await?;
    if query_uses_favorite_filters(&query) {
        if query.favorite.is_some() && !column_exists(&pool, "entries", "is_favorite").await? {
            return Err(CommandError::not_implemented(
                "当前数据库表结构尚未包含收藏字段",
            ));
        }
        if query.pinned.is_some() && !column_exists(&pool, "entries", "is_pinned").await? {
            return Err(CommandError::not_implemented(
                "当前数据库表结构尚未包含置顶字段",
            ));
        }
    }

    let mut count_builder = QueryBuilder::<Postgres>::new(
        "SELECT COUNT(*)::bigint as total FROM entries e JOIN categories c ON e.category_id = c.id",
    );
    push_filters(&mut count_builder, &query);
    let total: i64 = count_builder
        .build()
        .fetch_one(&pool)
        .await
        .map_err(db::clean_query_error)?
        .get("total");

    let hot_join_sql = if has_entry_clicks {
        format!(
            r#"
        LEFT JOIN LATERAL (
          SELECT
            COALESCE(SUM({HOT_SCORE_SQL}), 0)::float8 as hot_score,
            COUNT(ec.id)::bigint as click_count
          FROM entry_clicks ec
          WHERE ec.entry_id = e.id
        ) h ON true
        "#
        )
    } else {
        r#"
        LEFT JOIN LATERAL (
          SELECT 0::float8 as hot_score, 0::bigint as click_count
        ) h ON true
        "#
        .to_string()
    };

    let mut list_builder = QueryBuilder::<Postgres>::new(format!(
        r#"
        SELECT
          e.id,
          e.title,
          e.html_content,
          e.markdown_content,
          e.richtext_content,
          e.content_type,
          e.category_id,
          e.iframe_url,
          e.image_url,
          to_char(e.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at,
          to_char(e.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as updated_at,
          c.name as category_name,
          c.icon,
          c.border_color,
          c.dot_color,
          c.gradient,
          COALESCE(h.hot_score, 0)::float8 as hot_score,
          COALESCE(h.click_count, 0)::bigint as click_count,
          COALESCE(
            (
              SELECT jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'color', t.color) ORDER BY t.created_at)
              FROM entry_tags et
              JOIN tags t ON et.tag_id = t.id
              WHERE et.entry_id = e.id
            ),
            '[]'::jsonb
          ) as tags
        FROM entries e
        JOIN categories c ON e.category_id = c.id
        {hot_join_sql}
        "#,
    ));
    push_filters(&mut list_builder, &query);
    list_builder.push(" ORDER BY h.hot_score DESC, h.click_count DESC, e.updated_at DESC LIMIT ");
    list_builder.push_bind(page_size);
    list_builder.push(" OFFSET ");
    list_builder.push_bind(offset);

    let entries = list_builder
        .build()
        .fetch_all(&pool)
        .await
        .map_err(db::clean_query_error)?
        .into_iter()
        .map(map_entry)
        .collect::<Vec<_>>();

    Ok(KnowledgePage {
        entries,
        total,
        page,
        page_size,
        total_pages: if total == 0 {
            0
        } else {
            (total + page_size - 1) / page_size
        },
    })
}

#[tauri::command]
pub async fn search_knowledge(
    query: Option<KnowledgeQuery>,
    state: State<'_, AppState>,
) -> CommandResult<KnowledgePage> {
    list_knowledge(query, state).await
}

#[tauri::command]
pub async fn get_knowledge_detail(
    id: String,
    state: State<'_, AppState>,
) -> CommandResult<KnowledgeEntry> {
    let pool = db::get_pool(&state).await?;
    fetch_knowledge_by_id(&pool, &id).await
}

#[tauri::command]
pub async fn create_knowledge(
    payload: KnowledgePayload,
    state: State<'_, AppState>,
) -> CommandResult<KnowledgeEntry> {
    let title = payload.title.trim();
    if title.is_empty() {
        return Err(CommandError::validation("标题不能为空"));
    }
    if payload.category_id.trim().is_empty() {
        return Err(CommandError::validation("请选择分类"));
    }

    let content_type = validate_content_type(payload.content_type)?;
    let pool = db::get_pool(&state).await?;
    let mut tx = pool.begin().await.map_err(db::clean_query_error)?;
    ensure_category_exists(&mut *tx, &payload.category_id).await?;

    let id = payload
        .id
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| format!("entry-{}", uuid::Uuid::new_v4().simple()));

    sqlx::query(
        r#"
        INSERT INTO entries
          (id, title, html_content, markdown_content, richtext_content, content_type, category_id, iframe_url, image_url, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        "#,
    )
    .bind(&id)
    .bind(title)
    .bind(payload.html_content.unwrap_or_default())
    .bind(payload.markdown_content.unwrap_or_default())
    .bind(payload.richtext_content.unwrap_or_default())
    .bind(content_type)
    .bind(&payload.category_id)
    .bind(payload.iframe_url.filter(|value| !value.is_empty()))
    .bind(payload.image_url.filter(|value| !value.is_empty()))
    .execute(&mut *tx)
    .await
    .map_err(db::clean_query_error)?;

    sync_entry_tags(&mut tx, &id, &payload.tag_ids.unwrap_or_default()).await?;
    tx.commit().await.map_err(db::clean_query_error)?;

    fetch_knowledge_by_id(&pool, &id).await
}

#[tauri::command]
pub async fn update_knowledge(
    id: String,
    payload: KnowledgePayload,
    state: State<'_, AppState>,
) -> CommandResult<KnowledgeEntry> {
    let title = payload.title.trim();
    if title.is_empty() {
        return Err(CommandError::validation("标题不能为空"));
    }
    if payload.category_id.trim().is_empty() {
        return Err(CommandError::validation("请选择分类"));
    }

    let content_type = validate_content_type(payload.content_type)?;
    let pool = db::get_pool(&state).await?;
    let mut tx = pool.begin().await.map_err(db::clean_query_error)?;
    ensure_category_exists(&mut *tx, &payload.category_id).await?;

    let result = sqlx::query(
        r#"
        UPDATE entries
        SET title = $1,
            html_content = $2,
            markdown_content = $3,
            richtext_content = $4,
            content_type = $5,
            category_id = $6,
            iframe_url = $7,
            image_url = $8,
            updated_at = NOW()
        WHERE id = $9
        "#,
    )
    .bind(title)
    .bind(payload.html_content.unwrap_or_default())
    .bind(payload.markdown_content.unwrap_or_default())
    .bind(payload.richtext_content.unwrap_or_default())
    .bind(content_type)
    .bind(&payload.category_id)
    .bind(payload.iframe_url.filter(|value| !value.is_empty()))
    .bind(payload.image_url.filter(|value| !value.is_empty()))
    .bind(&id)
    .execute(&mut *tx)
    .await
    .map_err(db::clean_query_error)?;

    if result.rows_affected() == 0 {
        return Err(CommandError::not_found("条目不存在"));
    }

    if let Some(tag_ids) = payload.tag_ids {
        sync_entry_tags(&mut tx, &id, &tag_ids).await?;
    }

    tx.commit().await.map_err(db::clean_query_error)?;
    fetch_knowledge_by_id(&pool, &id).await
}

#[tauri::command]
pub async fn delete_knowledge(id: String, state: State<'_, AppState>) -> CommandResult<()> {
    let pool = db::get_pool(&state).await?;
    let result = sqlx::query("DELETE FROM entries WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(db::clean_query_error)?;

    if result.rows_affected() == 0 {
        return Err(CommandError::not_found("条目不存在"));
    }

    Ok(())
}

#[tauri::command]
pub async fn favorite_knowledge(
    id: String,
    value: bool,
    state: State<'_, AppState>,
) -> CommandResult<KnowledgeEntry> {
    let pool = db::get_pool(&state).await?;
    if !column_exists(&pool, "entries", "is_favorite").await? {
        return Err(CommandError::not_implemented(
            "当前数据库表结构尚未包含收藏字段",
        ));
    }

    let result =
        sqlx::query("UPDATE entries SET is_favorite = $1, updated_at = NOW() WHERE id = $2")
            .bind(value)
            .bind(&id)
            .execute(&pool)
            .await
            .map_err(db::clean_query_error)?;

    if result.rows_affected() == 0 {
        return Err(CommandError::not_found("条目不存在"));
    }

    fetch_knowledge_by_id(&pool, &id).await
}

#[tauri::command]
pub async fn pin_knowledge(
    id: String,
    value: bool,
    state: State<'_, AppState>,
) -> CommandResult<KnowledgeEntry> {
    let pool = db::get_pool(&state).await?;
    if !column_exists(&pool, "entries", "is_pinned").await? {
        return Err(CommandError::not_implemented(
            "当前数据库表结构尚未包含置顶字段",
        ));
    }

    let result = sqlx::query("UPDATE entries SET is_pinned = $1, updated_at = NOW() WHERE id = $2")
        .bind(value)
        .bind(&id)
        .execute(&pool)
        .await
        .map_err(db::clean_query_error)?;

    if result.rows_affected() == 0 {
        return Err(CommandError::not_found("条目不存在"));
    }

    fetch_knowledge_by_id(&pool, &id).await
}

#[tauri::command]
pub async fn record_knowledge_click(
    id: String,
    state: State<'_, AppState>,
) -> CommandResult<KnowledgeClickResult> {
    let pool = db::get_pool(&state).await?;
    let exists: bool = sqlx::query("SELECT EXISTS(SELECT 1 FROM entries WHERE id = $1) as exists")
        .bind(&id)
        .fetch_one(&pool)
        .await
        .map_err(db::clean_query_error)?
        .get("exists");

    if !exists {
        return Err(CommandError::not_found("条目不存在"));
    }

    if !table_exists(&pool, "entry_clicks").await?
        || !table_exists(&pool, "entry_click_windows").await?
    {
        return Ok(KnowledgeClickResult {
            success: true,
            counted: false,
        });
    }

    let counted: bool = sqlx::query(
        r#"
        WITH counted_window AS (
          INSERT INTO entry_click_windows (entry_id, last_counted_at)
          VALUES ($1, NOW())
          ON CONFLICT (entry_id) DO UPDATE
          SET last_counted_at = NOW()
          WHERE entry_click_windows.last_counted_at < NOW() - INTERVAL '60 seconds'
          RETURNING entry_id
        ),
        inserted_click AS (
          INSERT INTO entry_clicks (entry_id)
          SELECT entry_id FROM counted_window
          RETURNING id
        )
        SELECT EXISTS(SELECT 1 FROM inserted_click) as counted
        "#,
    )
    .bind(id)
    .fetch_one(&pool)
    .await
    .map_err(db::clean_query_error)?
    .get("counted");

    Ok(KnowledgeClickResult {
        success: true,
        counted,
    })
}
