use tauri::{AppHandle, Manager};

use crate::{
    error::{CommandError, CommandResult},
    files::storage,
};

#[tauri::command]
pub async fn show_main_window(app: AppHandle) -> CommandResult<()> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| CommandError::unknown("主窗口不可用"))?;
    window
        .show()
        .map_err(|_| CommandError::unknown("显示主窗口失败"))?;
    window
        .set_focus()
        .map_err(|_| CommandError::unknown("聚焦主窗口失败"))?;
    Ok(())
}

#[tauri::command]
pub async fn cleanup_temp_files() -> CommandResult<u64> {
    storage::cleanup_old_temp_files()
}
