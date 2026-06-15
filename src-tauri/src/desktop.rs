use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    plugin::TauriPlugin,
    tray::TrayIconBuilder,
    App, Emitter, Manager, Runtime, WindowEvent,
};
use tauri_plugin_global_shortcut::ShortcutState;

use crate::{app_state::AppState, db, files::storage};

const EVENT_QUICK_SEARCH: &str = "desktop:quick-search";
const EVENT_NEW_KNOWLEDGE: &str = "desktop:new-knowledge";
const EVENT_CLIPBOARD_SAVE: &str = "desktop:clipboard-save";
const EVENT_OPEN_SETTINGS: &str = "desktop:open-settings";
const EVENT_DB_OFFLINE: &str = "desktop:db-offline";
const SHOW_MAIN_SHORTCUT: &str = "Ctrl+Alt+K";

fn show_main_window<R: Runtime>(app: &tauri::AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn emit_menu_event<R: Runtime>(app: &tauri::AppHandle<R>, id: &str) {
    match id {
        "quick-search" => {
            let _ = app.emit(EVENT_QUICK_SEARCH, ());
        }
        "new-knowledge" => {
            let _ = app.emit(EVENT_NEW_KNOWLEDGE, ());
        }
        "clipboard-save" => {
            let _ = app.emit(EVENT_CLIPBOARD_SAVE, ());
        }
        "open-settings" => {
            let _ = app.emit(EVENT_OPEN_SETTINGS, ());
        }
        "show-main" => show_main_window(app),
        "quit" => app.exit(0),
        _ => {}
    }
}

pub fn build_global_shortcut_plugin<R: Runtime>() -> TauriPlugin<R> {
    tauri_plugin_global_shortcut::Builder::new()
        .with_shortcut(SHOW_MAIN_SHORTCUT)
        .expect("failed to configure global show-main shortcut")
        .with_handler(|app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                show_main_window(app);
            }
        })
        .build()
}

pub fn build_menu<R: Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<Menu<R>> {
    let new_knowledge = MenuItem::with_id(app, "new-knowledge", "新建知识", true, Some("Ctrl+N"))?;
    let quick_search =
        MenuItem::with_id(app, "quick-search", "快速搜索", true, Some("Ctrl+Shift+K"))?;
    let clipboard_save = MenuItem::with_id(
        app,
        "clipboard-save",
        "保存剪贴板",
        true,
        Some("Ctrl+Shift+V"),
    )?;
    let open_settings =
        MenuItem::with_id(app, "open-settings", "数据库设置", true, Some("Ctrl+,"))?;
    let upload_attachment =
        MenuItem::with_id(app, "upload-attachment", "上传附件", false, None::<&str>)?;

    let file_menu = Submenu::with_items(
        app,
        "文件",
        true,
        &[
            &new_knowledge,
            &upload_attachment,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::quit(app, Some("退出"))?,
        ],
    )?;
    let edit_menu = Submenu::with_items(
        app,
        "编辑",
        true,
        &[
            &PredefinedMenuItem::copy(app, Some("复制"))?,
            &PredefinedMenuItem::paste(app, Some("粘贴"))?,
            &PredefinedMenuItem::separator(app)?,
            &clipboard_save,
        ],
    )?;
    let view_menu = Submenu::with_items(app, "视图", true, &[&quick_search, &open_settings])?;

    Menu::with_items(app, &[&file_menu, &edit_menu, &view_menu])
}

fn build_tray<R: Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<()> {
    let show_main = MenuItem::with_id(
        app,
        "show-main",
        "打开 Personal Knowledge",
        true,
        None::<&str>,
    )?;
    let quick_search = MenuItem::with_id(app, "quick-search", "快速搜索", true, None::<&str>)?;
    let new_knowledge = MenuItem::with_id(app, "new-knowledge", "新建知识", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let tray_menu = Menu::with_items(
        app,
        &[
            &show_main,
            &quick_search,
            &new_knowledge,
            &PredefinedMenuItem::separator(app)?,
            &quit,
        ],
    )?;

    TrayIconBuilder::with_id("main-tray")
        .tooltip("Personal Knowledge Desktop")
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&tray_menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| emit_menu_event(app, event.id().0.as_str()))
        .build(app)?;

    Ok(())
}

pub fn setup(app: &mut App) -> tauri::Result<()> {
    build_tray(app.handle())?;
    let _ = storage::cleanup_old_temp_files();

    Ok(())
}

pub fn handle_menu_event<R: Runtime>(app: &tauri::AppHandle<R>, id: &str) {
    emit_menu_event(app, id);
}

pub fn handle_window_event<R: Runtime>(window: &tauri::Window<R>, event: &WindowEvent) {
    if let WindowEvent::CloseRequested { api, .. } = event {
        let app = window.app_handle();
        if let Some(state) = app.try_state::<AppState>() {
            let minimize_to_tray = tauri::async_runtime::block_on(async {
                state.desktop_preferences.read().await.minimize_to_tray
            });

            if minimize_to_tray {
                api.prevent_close();
                let _ = window.hide();
            }
        }
    }
}

pub fn spawn_database_startup_check(
    app: &tauri::AppHandle,
    database_config: crate::models::settings::DatabaseConfig,
) {
    let app_handle = app.clone();
    tauri::async_runtime::spawn(async move {
        match db::create_pool(&database_config).await {
            Ok(pool) => {
                let state = app_handle.state::<AppState>();
                let mut db = state.db.write().await;
                *db = Some(pool);
            }
            Err(error) => {
                let _ = app_handle.emit(EVENT_DB_OFFLINE, error.message);
            }
        }
    });
}
