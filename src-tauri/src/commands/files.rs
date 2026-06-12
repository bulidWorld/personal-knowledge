use tauri::State;
use uuid::Uuid;

use crate::{
    app_state::AppState,
    db,
    error::{CommandError, CommandResult},
    files::{
        hash::hash_bytes,
        paths::{clean_filename, normalize_file_id},
        policy::{normalize_mime_type, validate_file},
        repository, storage,
        system_open::open_with_default_app,
    },
    models::file::{ExportFileResponse, FileMetadata, UploadFilePayload, UploadFileResponse},
};

#[tauri::command]
pub async fn list_files(state: State<'_, AppState>) -> CommandResult<Vec<FileMetadata>> {
    let pool = db::get_pool(&state).await?;
    repository::list_files(&pool).await
}

#[tauri::command]
pub async fn upload_file_to_postgres(
    payload: UploadFilePayload,
    state: State<'_, AppState>,
) -> CommandResult<UploadFileResponse> {
    let pool = db::get_pool(&state).await?;
    let filename = clean_filename(&payload.file_name);
    let mime_type = normalize_mime_type(payload.mime_type);
    let should_attach = payload
        .knowledge_id
        .as_ref()
        .map(|value| !value.trim().is_empty())
        .unwrap_or(false);

    validate_file(&filename, &mime_type, &payload.bytes)?;

    if should_attach && !repository::table_exists(&pool, "knowledge_files").await? {
        return Err(CommandError::not_implemented(
            "当前数据库表结构尚未包含文件关联表",
        ));
    }

    let size = payload.bytes.len() as i64;
    let sha256 = hash_bytes(&payload.bytes);
    let mut transaction = pool.begin().await.map_err(db::clean_query_error)?;
    let duplicate_id = repository::find_duplicate_upload(&mut *transaction, size, &sha256).await?;

    let (id, reused) = if let Some(existing_id) = duplicate_id {
        (existing_id, true)
    } else {
        let id = Uuid::new_v4().to_string();
        repository::insert_upload(
            &mut *transaction,
            &id,
            filename,
            mime_type,
            payload.bytes,
            size,
        )
        .await?;
        (id, false)
    };

    if should_attach {
        repository::attach_file_if_supported(&mut *transaction, payload.knowledge_id, &id).await?;
    }

    transaction.commit().await.map_err(db::clean_query_error)?;

    Ok(UploadFileResponse {
        url: format!("/api/files/{id}"),
        id,
        reused,
    })
}

#[tauri::command]
pub async fn upload_image(
    payload: UploadFilePayload,
    state: State<'_, AppState>,
) -> CommandResult<UploadFileResponse> {
    upload_file_to_postgres(payload, state).await
}

#[tauri::command]
#[allow(non_snake_case)]
pub async fn open_file_from_postgres(
    idOrUrl: String,
    state: State<'_, AppState>,
) -> CommandResult<()> {
    let pool = db::get_pool(&state).await?;
    let file_id = normalize_file_id(&idOrUrl)?;
    let file = repository::fetch_file(&pool, &file_id).await?;
    let path = storage::write_temp_file(&file_id, &file.filename, file.data)?;

    open_with_default_app(&path)
}

#[tauri::command]
#[allow(non_snake_case)]
pub async fn open_file(idOrUrl: String, state: State<'_, AppState>) -> CommandResult<()> {
    open_file_from_postgres(idOrUrl, state).await
}

#[tauri::command]
#[allow(non_snake_case)]
pub async fn export_file_from_postgres(
    idOrUrl: String,
    targetPath: Option<String>,
    state: State<'_, AppState>,
) -> CommandResult<ExportFileResponse> {
    let pool = db::get_pool(&state).await?;
    let file = repository::fetch_file(&pool, &idOrUrl).await?;
    let target_path = storage::export_file(&file.filename, file.data, targetPath)?;

    Ok(ExportFileResponse {
        path: target_path.to_string_lossy().to_string(),
    })
}

#[tauri::command]
#[allow(non_snake_case)]
pub async fn export_file(
    idOrUrl: String,
    targetPath: Option<String>,
    state: State<'_, AppState>,
) -> CommandResult<ExportFileResponse> {
    export_file_from_postgres(idOrUrl, targetPath, state).await
}

#[tauri::command]
pub async fn delete_file(id: String, state: State<'_, AppState>) -> CommandResult<()> {
    let pool = db::get_pool(&state).await?;
    let file_id = normalize_file_id(&id)?;
    repository::delete_upload(&pool, &file_id).await
}

#[tauri::command]
#[allow(non_snake_case)]
pub async fn attach_file_to_knowledge(
    entryId: String,
    fileId: String,
    state: State<'_, AppState>,
) -> CommandResult<()> {
    let pool = db::get_pool(&state).await?;

    if !repository::table_exists(&pool, "knowledge_files").await? {
        return Err(CommandError::not_implemented(
            "当前数据库表结构尚未包含文件关联表",
        ));
    }

    let file_id = normalize_file_id(&fileId)?;
    let mut transaction = pool.begin().await.map_err(db::clean_query_error)?;
    repository::attach_file_if_supported(&mut *transaction, Some(entryId), &file_id).await?;
    transaction.commit().await.map_err(db::clean_query_error)?;

    Ok(())
}

#[tauri::command]
#[allow(non_snake_case)]
pub async fn detach_file_from_knowledge(
    entryId: String,
    fileId: String,
    state: State<'_, AppState>,
) -> CommandResult<()> {
    let pool = db::get_pool(&state).await?;

    if !repository::table_exists(&pool, "knowledge_files").await? {
        return Err(CommandError::not_implemented(
            "当前数据库表结构尚未包含文件关联表",
        ));
    }

    let file_id = normalize_file_id(&fileId)?;
    repository::detach_file_from_knowledge(&pool, entryId, &file_id).await
}
