use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct System {
    pub id: String,
    pub name: String,
    pub description: String,
    pub icon: String,
    pub border_color: String,
    pub dot_color: String,
    pub gradient: String,
    pub created_at: String,
    pub updated_at: String,
    pub node_count: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSystemPayload {
    pub name: String,
    pub description: Option<String>,
    pub icon: Option<String>,
    pub border_color: Option<String>,
    pub dot_color: Option<String>,
    pub gradient: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSystemPayload {
    pub name: String,
    pub description: Option<String>,
}
