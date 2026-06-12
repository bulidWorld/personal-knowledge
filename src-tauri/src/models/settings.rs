use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseConfigInput {
    pub host: String,
    pub port: u16,
    pub database: String,
    pub username: String,
    pub password: Option<String>,
    pub ssl_mode: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiConfigInput {
    pub provider: Option<String>,
    pub base_url: Option<String>,
    pub model: Option<String>,
    pub api_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiConfig {
    pub provider: String,
    pub base_url: String,
    pub model: String,
    pub api_key: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiConfigStatus {
    pub configured: bool,
    pub provider: Option<String>,
    pub base_url: Option<String>,
    pub model: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopPreferences {
    pub minimize_to_tray: bool,
    pub recent_knowledge_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopRuntimeStatus {
    pub database_configured: bool,
    pub database_connected: bool,
    pub ai_configured: bool,
    pub minimize_to_tray: bool,
    pub recent_knowledge_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseConfig {
    pub host: String,
    pub port: u16,
    pub database: String,
    pub username: String,
    pub password: String,
    pub ssl_mode: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseConfigStatus {
    pub configured: bool,
    pub host: Option<String>,
    pub port: Option<u16>,
    pub database: Option<String>,
    pub username: Option<String>,
    pub ssl_mode: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseConnectionResult {
    pub success: bool,
    pub message: Option<String>,
}

impl DatabaseConfig {
    pub fn status(&self) -> DatabaseConfigStatus {
        DatabaseConfigStatus {
            configured: true,
            host: Some(self.host.clone()),
            port: Some(self.port),
            database: Some(self.database.clone()),
            username: Some(self.username.clone()),
            ssl_mode: Some(self.ssl_mode.clone()),
        }
    }
}

impl DatabaseConfigStatus {
    pub fn unconfigured() -> Self {
        Self {
            configured: false,
            host: None,
            port: None,
            database: None,
            username: None,
            ssl_mode: None,
        }
    }
}

impl AiConfig {
    pub fn status(&self) -> AiConfigStatus {
        AiConfigStatus {
            configured: true,
            provider: Some(self.provider.clone()),
            base_url: Some(self.base_url.clone()),
            model: Some(self.model.clone()),
        }
    }
}

impl AiConfigStatus {
    pub fn unconfigured() -> Self {
        Self {
            configured: false,
            provider: None,
            base_url: None,
            model: None,
        }
    }
}

impl Default for DesktopPreferences {
    fn default() -> Self {
        Self {
            minimize_to_tray: true,
            recent_knowledge_ids: Vec::new(),
        }
    }
}
