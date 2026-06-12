use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandError {
    pub code: String,
    pub message: String,
}

impl CommandError {
    pub fn new(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
        }
    }

    pub fn validation(message: impl Into<String>) -> Self {
        Self::new("VALIDATION_ERROR", message)
    }

    pub fn db_connection(message: impl Into<String>) -> Self {
        Self::new("DB_CONNECTION_FAILED", message)
    }

    pub fn file_read(message: impl Into<String>) -> Self {
        Self::new("FILE_READ_FAILED", message)
    }

    pub fn file_write(message: impl Into<String>) -> Self {
        Self::new("FILE_WRITE_FAILED", message)
    }

    pub fn file_too_large(message: impl Into<String>) -> Self {
        Self::new("FILE_TOO_LARGE", message)
    }

    pub fn file_open(message: impl Into<String>) -> Self {
        Self::new("FILE_OPEN_FAILED", message)
    }

    pub fn not_found(message: impl Into<String>) -> Self {
        Self::new("NOT_FOUND", message)
    }

    pub fn permission_denied(message: impl Into<String>) -> Self {
        Self::new("PERMISSION_DENIED", message)
    }

    pub fn duplicate_name(message: impl Into<String>) -> Self {
        Self::new("DUPLICATE_NAME", message)
    }

    pub fn unknown(message: impl Into<String>) -> Self {
        Self::new("UNKNOWN_ERROR", message)
    }

    pub fn database_not_configured() -> Self {
        Self::db_connection("请先在数据库设置中保存连接配置")
    }

    pub fn db_query(message: impl Into<String>) -> Self {
        Self::unknown(message)
    }

    pub fn not_implemented(message: impl Into<String>) -> Self {
        Self::new("NOT_IMPLEMENTED", message)
    }
}

pub type CommandResult<T> = Result<T, CommandError>;
