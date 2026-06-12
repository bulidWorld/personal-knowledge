use crate::error::{CommandError, CommandResult};

use super::paths::extension_of;

const IMAGE_FILE_LIMIT: usize = 20 * 1024 * 1024;
const DOCUMENT_FILE_LIMIT: usize = 50 * 1024 * 1024;

const ARCHIVE_MIME_TYPES: &[&str] = &[
    "application/zip",
    "application/x-zip-compressed",
    "application/vnd.rar",
    "application/x-rar-compressed",
    "application/x-7z-compressed",
    "application/gzip",
    "application/x-gzip",
    "application/x-tar",
    "application/x-bzip",
    "application/x-bzip2",
    "application/x-xz",
];

const ARCHIVE_EXTENSIONS: &[&str] = &["zip", "rar", "7z", "tar", "gz", "tgz", "bz", "bz2", "xz"];

pub fn normalize_mime_type(value: Option<String>) -> String {
    value
        .map(|mime_type| mime_type.trim().to_ascii_lowercase())
        .filter(|mime_type| !mime_type.is_empty())
        .unwrap_or_else(|| "application/octet-stream".to_string())
}

pub fn validate_file(filename: &str, mime_type: &str, bytes: &[u8]) -> CommandResult<()> {
    if bytes.is_empty() {
        return Err(CommandError::validation("不能上传空文件"));
    }

    if mime_type.starts_with("video/") {
        return Err(CommandError::validation(
            "暂不建议将视频文件写入数据库，请选择普通文档或图片",
        ));
    }

    let extension = extension_of(filename);
    if ARCHIVE_MIME_TYPES.contains(&mime_type) || ARCHIVE_EXTENSIONS.contains(&extension.as_str()) {
        return Err(CommandError::validation(
            "压缩包默认不写入数据库，请先解压后上传需要保留的文件",
        ));
    }

    let limit = if mime_type.starts_with("image/") {
        IMAGE_FILE_LIMIT
    } else {
        DOCUMENT_FILE_LIMIT
    };

    if bytes.len() > limit {
        let limit_label = if mime_type.starts_with("image/") {
            "20MB"
        } else {
            "50MB"
        };
        return Err(CommandError::file_too_large(format!(
            "文件过大，当前类型限制为 {limit_label}"
        )));
    }

    Ok(())
}
