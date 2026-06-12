use std::{
    fs,
    path::{Path, PathBuf},
    time::{Duration, SystemTime},
};

use crate::error::{CommandError, CommandResult};

use super::paths::clean_filename;

const TEMP_FOLDER: &str = "personal-knowledge-desktop/files";
const EXPORT_FOLDER: &str = "personal-knowledge-desktop/exports";
const TEMP_ROOT_FOLDER: &str = "personal-knowledge-desktop";
const DEFAULT_MAX_TEMP_AGE: Duration = Duration::from_secs(60 * 60 * 24 * 7);

fn temp_file_path(file_id: &str, filename: &str) -> CommandResult<PathBuf> {
    let directory = std::env::temp_dir().join(TEMP_FOLDER);
    fs::create_dir_all(&directory).map_err(|_| CommandError::file_write("创建临时文件目录失败"))?;

    Ok(directory.join(format!(
        "{}-{}",
        clean_filename(file_id),
        clean_filename(filename)
    )))
}

fn default_export_path(filename: &str) -> CommandResult<PathBuf> {
    let directory = std::env::temp_dir().join(EXPORT_FOLDER);
    fs::create_dir_all(&directory).map_err(|_| CommandError::file_write("创建导出目录失败"))?;
    Ok(directory.join(clean_filename(filename)))
}

pub fn write_temp_file(file_id: &str, filename: &str, data: Vec<u8>) -> CommandResult<PathBuf> {
    let path = temp_file_path(file_id, filename)?;
    fs::write(&path, data).map_err(|_| CommandError::file_write("写入临时文件失败"))?;
    Ok(path)
}

pub fn export_file(
    filename: &str,
    data: Vec<u8>,
    target_path: Option<String>,
) -> CommandResult<PathBuf> {
    let target_path = target_path
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(PathBuf::from)
        .unwrap_or(default_export_path(filename)?);

    if let Some(parent) = target_path.parent() {
        fs::create_dir_all(parent).map_err(|_| CommandError::file_write("创建导出目录失败"))?;
    }

    fs::write(&target_path, data).map_err(|_| CommandError::file_write("导出文件失败"))?;

    Ok(target_path)
}

fn remove_old_files(directory: &Path, max_age: Duration) -> CommandResult<u64> {
    if !directory.exists() {
        return Ok(0);
    }

    let now = SystemTime::now();
    let mut removed = 0;

    for entry in fs::read_dir(directory)
        .map_err(|_| CommandError::file_read("读取临时目录失败"))?
        .flatten()
    {
        let path = entry.path();
        if path.is_dir() {
            removed += remove_old_files(&path, max_age)?;
            let _ = fs::remove_dir(&path);
            continue;
        }

        let should_remove = entry
            .metadata()
            .ok()
            .and_then(|metadata| metadata.modified().ok())
            .and_then(|modified| now.duration_since(modified).ok())
            .map(|age| age > max_age)
            .unwrap_or(false);

        if should_remove && fs::remove_file(&path).is_ok() {
            removed += 1;
        }
    }

    Ok(removed)
}

pub fn cleanup_old_temp_files() -> CommandResult<u64> {
    let root = std::env::temp_dir().join(TEMP_ROOT_FOLDER);
    let files_dir = root.join("files");
    remove_old_files(&files_dir, DEFAULT_MAX_TEMP_AGE)
}
