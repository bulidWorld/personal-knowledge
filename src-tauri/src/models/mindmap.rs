use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MindMapNode {
    pub id: String,
    pub system_id: String,
    pub title: String,
    pub html_content: String,
    pub markdown_content: String,
    pub richtext_content: String,
    pub content_type: String,
    pub node_type: String,
    pub parent_id: Option<String>,
    pub x: f64,
    pub y: f64,
    pub color: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MindMapConnection {
    pub id: String,
    pub system_id: String,
    pub source_node_id: String,
    pub target_node_id: String,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MindMap {
    pub nodes: Vec<MindMapNode>,
    pub connections: Vec<MindMapConnection>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateMindMapNodePayload {
    pub system_id: String,
    pub title: String,
    pub node_type: String,
    pub parent_id: Option<String>,
    pub x: Option<f64>,
    pub y: Option<f64>,
    pub color: Option<String>,
    pub html_content: Option<String>,
    pub markdown_content: Option<String>,
    pub richtext_content: Option<String>,
    pub content_type: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateMindMapNodePayload {
    pub title: Option<String>,
    pub html_content: Option<String>,
    pub markdown_content: Option<String>,
    pub richtext_content: Option<String>,
    pub content_type: Option<String>,
    pub node_type: Option<String>,
    pub parent_id: Option<String>,
    pub x: Option<f64>,
    pub y: Option<f64>,
    pub color: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateMindMapConnectionPayload {
    pub system_id: String,
    pub source_node_id: String,
    pub target_node_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveMindMapPayload {
    pub system_id: String,
    pub nodes: Vec<SaveMindMapNode>,
    pub connections: Vec<SaveMindMapConnection>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveMindMapNode {
    pub id: String,
    pub title: String,
    pub html_content: Option<String>,
    pub markdown_content: Option<String>,
    pub richtext_content: Option<String>,
    pub content_type: Option<String>,
    pub node_type: String,
    pub parent_id: Option<String>,
    pub x: Option<f64>,
    pub y: Option<f64>,
    pub color: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveMindMapConnection {
    pub id: String,
    pub source_node_id: String,
    pub target_node_id: String,
}
