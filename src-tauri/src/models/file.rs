use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileMetadata {
    pub id: String,
    pub filename: String,
    pub mime_type: String,
    pub size: i64,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadFilePayload {
    pub file_name: String,
    pub mime_type: Option<String>,
    pub bytes: Vec<u8>,
    pub knowledge_id: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadFileResponse {
    pub id: String,
    pub url: String,
    pub reused: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportFileResponse {
    pub path: String,
}
