use sqlx::PgPool;
use tokio::sync::RwLock;

use crate::models::settings::{AiConfig, DatabaseConfig, DesktopPreferences};

pub struct AppState {
    pub db: RwLock<Option<PgPool>>,
    pub database_config: RwLock<Option<DatabaseConfig>>,
    pub ai_config: RwLock<Option<AiConfig>>,
    pub desktop_preferences: RwLock<DesktopPreferences>,
}

impl AppState {
    pub fn new(
        database_config: Option<DatabaseConfig>,
        ai_config: Option<AiConfig>,
        desktop_preferences: DesktopPreferences,
    ) -> Self {
        Self {
            db: RwLock::new(None),
            database_config: RwLock::new(database_config),
            ai_config: RwLock::new(ai_config),
            desktop_preferences: RwLock::new(desktop_preferences),
        }
    }
}
