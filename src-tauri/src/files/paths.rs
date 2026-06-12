use std::path::Path;

use crate::error::{CommandError, CommandResult};

pub fn normalize_file_id(id_or_url: &str) -> CommandResult<String> {
    let value = id_or_url.trim();

    if value.is_empty() {
        return Err(CommandError::validation("文件 ID 不能为空"));
    }

    let without_query = value.split(['?', '#']).next().unwrap_or(value);
    let id = without_query
        .trim_end_matches('/')
        .rsplit('/')
        .next()
        .unwrap_or(without_query)
        .trim();

    if id.is_empty() {
        return Err(CommandError::validation("文件 ID 不能为空"));
    }

    Ok(id.to_string())
}

pub fn clean_filename(value: &str) -> String {
    let name = value
        .trim()
        .chars()
        .map(|character| match character {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            character if character.is_control() => '_',
            character => character,
        })
        .collect::<String>();

    let name = name.trim_matches(['.', ' ']);

    if name.is_empty() {
        "upload.bin".to_string()
    } else {
        name.to_string()
    }
}

pub(crate) fn extension_of(filename: &str) -> String {
    Path::new(filename)
        .extension()
        .and_then(|extension| extension.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase()
}
