use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub category_id: Option<String>,
    pub tag_id: Option<String>,
    pub system_id: Option<String>,
    pub favorite: Option<bool>,
    pub pinned: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgePayload {
    pub id: Option<String>,
    pub title: String,
    pub html_content: Option<String>,
    pub markdown_content: Option<String>,
    pub richtext_content: Option<String>,
    pub content_type: Option<String>,
    pub category_id: String,
    pub iframe_url: Option<String>,
    pub image_url: Option<String>,
    pub tag_ids: Option<Vec<String>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeEntry {
    pub id: String,
    pub title: String,
    pub html_content: String,
    pub markdown_content: String,
    pub richtext_content: String,
    pub content_type: String,
    pub category_id: String,
    pub iframe_url: Option<String>,
    pub image_url: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub category_name: String,
    pub icon: String,
    pub border_color: String,
    pub dot_color: String,
    pub gradient: String,
    pub hot_score: f64,
    pub click_count: i64,
    pub tags: Value,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgePage {
    pub entries: Vec<KnowledgeEntry>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
    pub total_pages: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeClickResult {
    pub success: bool,
    pub counted: bool,
}
