mod app_state;
mod commands;
mod config;
mod db;
mod desktop;
mod error;
mod files;
mod models;
mod protocols;

use app_state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    protocols::file::register(tauri::Builder::default())
        .menu(desktop::build_menu)
        .on_menu_event(|app, event| desktop::handle_menu_event(app, event.id().0.as_str()))
        .on_window_event(desktop::handle_window_event)
        .setup(|app| {
            let database_config = config::load_database_config(app.handle()).unwrap_or(None);
            let ai_config = config::load_ai_config(app.handle()).unwrap_or(None);
            let desktop_preferences =
                config::load_desktop_preferences(app.handle()).unwrap_or_default();
            app.manage(AppState::new(
                database_config.clone(),
                ai_config,
                desktop_preferences,
            ));
            desktop::setup(app)?;

            if let Some(database_config) = database_config {
                desktop::spawn_database_startup_check(app.handle(), database_config);
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::settings::get_database_config_status,
            commands::settings::test_database_connection,
            commands::settings::save_database_config,
            commands::settings::get_ai_config_status,
            commands::settings::save_ai_config,
            commands::settings::get_desktop_preferences,
            commands::settings::save_desktop_preferences,
            commands::settings::record_recent_knowledge,
            commands::settings::get_desktop_runtime_status,
            commands::desktop::show_main_window,
            commands::desktop::cleanup_temp_files,
            commands::categories::list_categories,
            commands::categories::create_category,
            commands::categories::update_category,
            commands::categories::delete_category,
            commands::tags::list_tags,
            commands::tags::create_tag,
            commands::tags::update_tag,
            commands::tags::delete_tag,
            commands::systems::list_systems,
            commands::systems::create_system,
            commands::systems::update_system,
            commands::systems::delete_system,
            commands::knowledge::list_knowledge,
            commands::knowledge::search_knowledge,
            commands::knowledge::get_knowledge_detail,
            commands::knowledge::create_knowledge,
            commands::knowledge::update_knowledge,
            commands::knowledge::delete_knowledge,
            commands::knowledge::record_knowledge_click,
            commands::knowledge::favorite_knowledge,
            commands::knowledge::pin_knowledge,
            commands::files::list_files,
            commands::files::upload_file_to_postgres,
            commands::files::upload_image,
            commands::files::open_file_from_postgres,
            commands::files::open_file,
            commands::files::export_file_from_postgres,
            commands::files::export_file,
            commands::files::delete_file,
            commands::files::attach_file_to_knowledge,
            commands::files::detach_file_from_knowledge,
            commands::mindmap::get_mindmap,
            commands::mindmap::list_mindmap_nodes,
            commands::mindmap::list_mindmap_connections,
            commands::mindmap::create_mindmap_node,
            commands::mindmap::update_mindmap_node,
            commands::mindmap::delete_mindmap_node,
            commands::mindmap::create_mindmap_connection,
            commands::mindmap::delete_mindmap_connection,
            commands::mindmap::save_mindmap,
            commands::ai::ai_summarize,
            commands::ai::ai_suggest_tags,
            commands::ai::ai_auto_tags,
            commands::ai::ai_optimize_prompt,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
