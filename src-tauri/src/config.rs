use std::{fs, path::PathBuf};

use tauri::{AppHandle, Manager};

use crate::{
    error::{CommandError, CommandResult},
    models::settings::{
        AiConfig, AiConfigInput, DatabaseConfig, DatabaseConfigInput, DesktopPreferences,
    },
};

const CONFIG_FILE_NAME: &str = "config.json";
const AI_CONFIG_FILE_NAME: &str = "ai-config.json";
const DESKTOP_PREFERENCES_FILE_NAME: &str = "desktop-preferences.json";

fn app_config_path(app: &AppHandle, filename: &str) -> CommandResult<PathBuf> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|error| CommandError::file_read(format!("无法定位应用配置目录: {error}")))?;

    Ok(dir.join(filename))
}

fn config_path(app: &AppHandle) -> CommandResult<PathBuf> {
    app_config_path(app, CONFIG_FILE_NAME)
}

fn normalize_ssl_mode(value: Option<String>) -> CommandResult<String> {
    let mode = value
        .unwrap_or_else(|| "prefer".to_string())
        .trim()
        .to_ascii_lowercase();

    match mode.as_str() {
        "disable" | "prefer" | "require" => Ok(mode),
        _ => Err(CommandError::validation(
            "SSL 模式仅支持 disable、prefer 或 require",
        )),
    }
}

pub fn validate_database_config(config: &DatabaseConfig) -> CommandResult<()> {
    if config.host.trim().is_empty() {
        return Err(CommandError::validation("请填写数据库主机"));
    }
    if config.port == 0 {
        return Err(CommandError::validation("请填写有效的数据库端口"));
    }
    if config.database.trim().is_empty() {
        return Err(CommandError::validation("请填写数据库名"));
    }
    if config.username.trim().is_empty() {
        return Err(CommandError::validation("请填写数据库用户名"));
    }
    if config.password.is_empty() {
        return Err(CommandError::validation("请填写数据库密码"));
    }

    Ok(())
}

pub fn merge_database_config(
    input: DatabaseConfigInput,
    existing: Option<&DatabaseConfig>,
) -> CommandResult<DatabaseConfig> {
    let password = match input.password {
        Some(value) if !value.is_empty() => value,
        _ => existing
            .map(|config| config.password.clone())
            .unwrap_or_default(),
    };

    let config = DatabaseConfig {
        host: input.host.trim().to_string(),
        port: input.port,
        database: input.database.trim().to_string(),
        username: input.username.trim().to_string(),
        password,
        ssl_mode: normalize_ssl_mode(input.ssl_mode)?,
    };

    validate_database_config(&config)?;
    Ok(config)
}

pub fn load_database_config(app: &AppHandle) -> CommandResult<Option<DatabaseConfig>> {
    let path = config_path(app)?;
    if !path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(&path)
        .map_err(|error| CommandError::file_read(format!("读取数据库配置失败: {error}")))?;
    let config = serde_json::from_str::<DatabaseConfig>(&content)
        .map_err(|error| CommandError::file_read(format!("解析数据库配置失败: {error}")))?;
    validate_database_config(&config)?;
    Ok(Some(config))
}

pub fn save_database_config(app: &AppHandle, config: &DatabaseConfig) -> CommandResult<()> {
    let path = config_path(app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| CommandError::file_write(format!("创建配置目录失败: {error}")))?;
    }

    let content = serde_json::to_string_pretty(config)
        .map_err(|error| CommandError::file_write(format!("序列化数据库配置失败: {error}")))?;
    fs::write(&path, content)
        .map_err(|error| CommandError::file_write(format!("保存数据库配置失败: {error}")))?;

    Ok(())
}

fn normalize_ai_provider(value: Option<String>) -> String {
    value
        .unwrap_or_else(|| "openai".to_string())
        .trim()
        .to_ascii_lowercase()
}

fn normalize_ai_base_url(value: Option<String>) -> String {
    value
        .map(|value| value.trim().trim_end_matches('/').to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "https://api.openai.com/v1".to_string())
}

pub fn merge_ai_config(
    input: AiConfigInput,
    existing: Option<&AiConfig>,
) -> CommandResult<AiConfig> {
    let provider = normalize_ai_provider(input.provider);
    if provider != "openai" && provider != "compatible" {
        return Err(CommandError::validation(
            "AI Provider 仅支持 openai 或 compatible",
        ));
    }

    let model = input
        .model
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .or_else(|| existing.map(|config| config.model.clone()))
        .unwrap_or_else(|| "gpt-5-nano".to_string());

    let api_key = match input.api_key {
        Some(value) if !value.trim().is_empty() => value.trim().to_string(),
        _ => existing
            .map(|config| config.api_key.clone())
            .unwrap_or_default(),
    };

    if api_key.is_empty() {
        return Err(CommandError::validation("请填写 AI API Key"));
    }

    Ok(AiConfig {
        provider,
        base_url: normalize_ai_base_url(input.base_url),
        model,
        api_key,
    })
}

pub fn load_ai_config(app: &AppHandle) -> CommandResult<Option<AiConfig>> {
    let path = app_config_path(app, AI_CONFIG_FILE_NAME)?;
    if !path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(&path)
        .map_err(|error| CommandError::file_read(format!("读取 AI 配置失败: {error}")))?;
    let config = serde_json::from_str::<AiConfig>(&content)
        .map_err(|error| CommandError::file_read(format!("解析 AI 配置失败: {error}")))?;

    if config.api_key.trim().is_empty() {
        return Ok(None);
    }

    Ok(Some(config))
}

pub fn save_ai_config(app: &AppHandle, config: &AiConfig) -> CommandResult<()> {
    let path = app_config_path(app, AI_CONFIG_FILE_NAME)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| CommandError::file_write(format!("创建配置目录失败: {error}")))?;
    }

    let content = serde_json::to_string_pretty(config)
        .map_err(|error| CommandError::file_write(format!("序列化 AI 配置失败: {error}")))?;
    fs::write(&path, content)
        .map_err(|error| CommandError::file_write(format!("保存 AI 配置失败: {error}")))?;

    Ok(())
}

pub fn load_desktop_preferences(app: &AppHandle) -> CommandResult<DesktopPreferences> {
    let path = app_config_path(app, DESKTOP_PREFERENCES_FILE_NAME)?;
    if !path.exists() {
        return Ok(DesktopPreferences::default());
    }

    let content = fs::read_to_string(&path)
        .map_err(|error| CommandError::file_read(format!("读取桌面偏好失败: {error}")))?;
    let preferences = serde_json::from_str::<DesktopPreferences>(&content)
        .map_err(|error| CommandError::file_read(format!("解析桌面偏好失败: {error}")))?;

    Ok(preferences)
}

pub fn save_desktop_preferences(
    app: &AppHandle,
    preferences: &DesktopPreferences,
) -> CommandResult<()> {
    let path = app_config_path(app, DESKTOP_PREFERENCES_FILE_NAME)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| CommandError::file_write(format!("创建配置目录失败: {error}")))?;
    }

    let content = serde_json::to_string_pretty(preferences)
        .map_err(|error| CommandError::file_write(format!("序列化桌面偏好失败: {error}")))?;
    fs::write(&path, content)
        .map_err(|error| CommandError::file_write(format!("保存桌面偏好失败: {error}")))?;

    Ok(())
}
