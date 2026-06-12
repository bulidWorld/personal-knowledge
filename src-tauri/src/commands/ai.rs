use serde::{Deserialize, Serialize};
use tauri::State;

use crate::{
    app_state::AppState,
    error::{CommandError, CommandResult},
    models::{
        ai::{
            AiOptimizePromptPayload, AiOptimizePromptResult, AiSuggestTagsPayload,
            AiSuggestTagsResult, AiSummaryPayload, AiSummaryResult,
        },
        settings::AiConfig,
    },
};

const MAX_AI_INPUT_CHARS: usize = 20_000;

#[derive(Debug, Serialize)]
struct ChatCompletionRequest {
    model: String,
    messages: Vec<ChatMessage>,
    temperature: f32,
}

#[derive(Debug, Serialize)]
struct ChatMessage {
    role: &'static str,
    content: String,
}

#[derive(Debug, Deserialize)]
struct ChatCompletionResponse {
    choices: Vec<ChatChoice>,
}

#[derive(Debug, Deserialize)]
struct ChatChoice {
    message: ChatChoiceMessage,
}

#[derive(Debug, Deserialize)]
struct ChatChoiceMessage {
    content: Option<String>,
}

fn validate_text(value: &str, label: &str) -> CommandResult<String> {
    let text = value.trim();
    if text.is_empty() {
        return Err(CommandError::validation(format!("{label}不能为空")));
    }
    if text.chars().count() > MAX_AI_INPUT_CHARS {
        return Err(CommandError::validation(format!(
            "{label}过长，请缩短到 {MAX_AI_INPUT_CHARS} 字以内",
        )));
    }

    Ok(text.to_string())
}

async fn get_ai_config(state: &State<'_, AppState>) -> CommandResult<AiConfig> {
    state
        .ai_config
        .read()
        .await
        .clone()
        .ok_or_else(|| CommandError::validation("请先在 Desktop 设置中保存 AI 配置"))
}

fn sanitize_ai_error(error: reqwest::Error) -> CommandError {
    if error.is_timeout() {
        CommandError::unknown("AI 服务请求超时，请稍后重试")
    } else if error.is_connect() {
        CommandError::unknown("无法连接 AI 服务，请检查网络和 AI 配置")
    } else {
        CommandError::unknown("AI 调用失败，请稍后重试")
    }
}

async fn run_chat_completion(
    config: AiConfig,
    system_prompt: &str,
    user_prompt: String,
) -> CommandResult<String> {
    let endpoint = format!("{}/chat/completions", config.base_url.trim_end_matches('/'));
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(45))
        .build()
        .map_err(|_| CommandError::unknown("初始化 AI 客户端失败"))?;

    let response = client
        .post(endpoint)
        .bearer_auth(config.api_key)
        .json(&ChatCompletionRequest {
            model: config.model,
            messages: vec![
                ChatMessage {
                    role: "system",
                    content: system_prompt.to_string(),
                },
                ChatMessage {
                    role: "user",
                    content: user_prompt,
                },
            ],
            temperature: 0.2,
        })
        .send()
        .await
        .map_err(sanitize_ai_error)?;

    if !response.status().is_success() {
        let status = response.status();
        return Err(CommandError::unknown(format!(
            "AI 服务返回错误 ({status})，请检查模型、额度或 API Key",
        )));
    }

    let body = response
        .json::<ChatCompletionResponse>()
        .await
        .map_err(|_| CommandError::unknown("AI 响应解析失败"))?;
    let content = body
        .choices
        .into_iter()
        .find_map(|choice| choice.message.content)
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .ok_or_else(|| CommandError::unknown("AI 没有返回可用内容"))?;

    Ok(content)
}

fn parse_tags(content: &str) -> Vec<String> {
    content
        .lines()
        .flat_map(|line| line.split([',', '，', ';', '；']))
        .map(|tag| {
            tag.trim()
                .trim_matches(|ch: char| ch == '-' || ch == '*' || ch.is_ascii_digit() || ch == '.')
                .trim()
                .to_string()
        })
        .filter(|tag| !tag.is_empty())
        .take(8)
        .collect()
}

#[tauri::command]
pub async fn ai_summarize(
    payload: AiSummaryPayload,
    state: State<'_, AppState>,
) -> CommandResult<AiSummaryResult> {
    let content = validate_text(&payload.content, "摘要内容")?;
    let config = get_ai_config(&state).await?;
    let summary = run_chat_completion(
        config,
        "你是个人知识库助手。请用中文生成简洁、准确、可直接保存的摘要。",
        content,
    )
    .await?;

    Ok(AiSummaryResult { summary })
}

#[tauri::command]
pub async fn ai_suggest_tags(
    payload: AiSuggestTagsPayload,
    state: State<'_, AppState>,
) -> CommandResult<AiSuggestTagsResult> {
    let content = validate_text(&payload.content, "标签内容")?;
    let title = payload.title.unwrap_or_default();
    let config = get_ai_config(&state).await?;
    let response = run_chat_completion(
        config,
        "你是个人知识库标签助手。只返回 3 到 8 个短标签，使用逗号分隔，不要解释。",
        format!("标题：{}\n\n内容：{}", title.trim(), content),
    )
    .await?;

    Ok(AiSuggestTagsResult {
        tags: parse_tags(&response),
    })
}

#[tauri::command]
pub async fn ai_auto_tags(
    payload: AiSuggestTagsPayload,
    state: State<'_, AppState>,
) -> CommandResult<AiSuggestTagsResult> {
    ai_suggest_tags(payload, state).await
}

#[tauri::command]
pub async fn ai_optimize_prompt(
    payload: AiOptimizePromptPayload,
    state: State<'_, AppState>,
) -> CommandResult<AiOptimizePromptResult> {
    let prompt = validate_text(&payload.prompt, "Prompt")?;
    let config = get_ai_config(&state).await?;
    let prompt = run_chat_completion(
        config,
        "你是 Prompt 优化助手。请保留用户意图，提升清晰度、结构和约束，只返回优化后的 Prompt。",
        prompt,
    )
    .await?;

    Ok(AiOptimizePromptResult { prompt })
}
