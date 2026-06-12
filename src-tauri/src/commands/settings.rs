use tauri::{AppHandle, State};

use crate::{
    app_state::AppState,
    config, db,
    error::CommandResult,
    models::settings::{
        AiConfigInput, AiConfigStatus, DatabaseConfigInput, DatabaseConfigStatus,
        DatabaseConnectionResult, DesktopPreferences, DesktopRuntimeStatus,
    },
};

#[tauri::command]
pub async fn get_database_config_status(
    state: State<'_, AppState>,
) -> CommandResult<DatabaseConfigStatus> {
    let config = state.database_config.read().await;
    Ok(config
        .as_ref()
        .map(|config| config.status())
        .unwrap_or_else(DatabaseConfigStatus::unconfigured))
}

#[tauri::command]
pub async fn test_database_connection(
    config: DatabaseConfigInput,
    state: State<'_, AppState>,
) -> CommandResult<DatabaseConnectionResult> {
    let existing = state.database_config.read().await;
    let config = config::merge_database_config(config, existing.as_ref())?;
    drop(existing);

    db::test_connection(&config).await?;
    Ok(DatabaseConnectionResult {
        success: true,
        message: Some("数据库连接可用".to_string()),
    })
}

#[tauri::command]
pub async fn save_database_config(
    config: DatabaseConfigInput,
    app: AppHandle,
    state: State<'_, AppState>,
) -> CommandResult<()> {
    let existing = state.database_config.read().await;
    let config = config::merge_database_config(config, existing.as_ref())?;
    drop(existing);

    let pool = db::create_pool(&config).await?;
    config::save_database_config(&app, &config)?;

    let mut db = state.db.write().await;
    if let Some(old_pool) = db.replace(pool) {
        old_pool.close().await;
    }
    drop(db);

    let mut stored_config = state.database_config.write().await;
    *stored_config = Some(config);

    Ok(())
}

#[tauri::command]
pub async fn get_ai_config_status(state: State<'_, AppState>) -> CommandResult<AiConfigStatus> {
    let config = state.ai_config.read().await;
    Ok(config
        .as_ref()
        .map(|config| config.status())
        .unwrap_or_else(AiConfigStatus::unconfigured))
}

#[tauri::command]
pub async fn save_ai_config(
    config: AiConfigInput,
    app: AppHandle,
    state: State<'_, AppState>,
) -> CommandResult<()> {
    let existing = state.ai_config.read().await;
    let config = config::merge_ai_config(config, existing.as_ref())?;
    drop(existing);

    config::save_ai_config(&app, &config)?;

    let mut stored_config = state.ai_config.write().await;
    *stored_config = Some(config);

    Ok(())
}

#[tauri::command]
pub async fn get_desktop_preferences(
    state: State<'_, AppState>,
) -> CommandResult<DesktopPreferences> {
    Ok(state.desktop_preferences.read().await.clone())
}

#[tauri::command]
pub async fn save_desktop_preferences(
    preferences: DesktopPreferences,
    app: AppHandle,
    state: State<'_, AppState>,
) -> CommandResult<()> {
    config::save_desktop_preferences(&app, &preferences)?;

    let mut stored_preferences = state.desktop_preferences.write().await;
    *stored_preferences = preferences;

    Ok(())
}

#[tauri::command]
#[allow(non_snake_case)]
pub async fn record_recent_knowledge(
    id: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> CommandResult<DesktopPreferences> {
    if id.trim().is_empty() {
        return get_desktop_preferences(state).await;
    }

    let mut preferences = state.desktop_preferences.write().await;
    preferences
        .recent_knowledge_ids
        .retain(|existing_id| existing_id != &id);
    preferences.recent_knowledge_ids.insert(0, id);
    preferences.recent_knowledge_ids.truncate(10);
    config::save_desktop_preferences(&app, &preferences)?;

    Ok(preferences.clone())
}

#[tauri::command]
pub async fn get_desktop_runtime_status(
    state: State<'_, AppState>,
) -> CommandResult<DesktopRuntimeStatus> {
    let database_configured = state.database_config.read().await.is_some();
    let database_connected = state.db.read().await.is_some();
    let ai_configured = state.ai_config.read().await.is_some();
    let preferences = state.desktop_preferences.read().await.clone();

    Ok(DesktopRuntimeStatus {
        database_configured,
        database_connected,
        ai_configured,
        minimize_to_tray: preferences.minimize_to_tray,
        recent_knowledge_ids: preferences.recent_knowledge_ids,
    })
}
