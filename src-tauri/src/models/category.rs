use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Category {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub border_color: String,
    pub dot_color: String,
    pub gradient: String,
    pub description: String,
    pub created_at: String,
    pub updated_at: String,
    pub entry_count: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoryPayload {
    pub name: String,
    pub icon: Option<String>,
    pub description: Option<String>,
    pub border_color: Option<String>,
    pub dot_color: Option<String>,
    pub gradient: Option<String>,
}
