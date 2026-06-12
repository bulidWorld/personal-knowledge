use tauri::{Manager, Runtime};

use crate::{app_state::AppState, files::repository};

fn normalize_protocol_file_id(path: &str) -> Option<String> {
    let file_id = path
        .trim()
        .trim_start_matches('/')
        .split(['?', '#'])
        .next()
        .unwrap_or_default()
        .trim();

    if file_id.is_empty() {
        None
    } else {
        Some(file_id.to_string())
    }
}

fn file_protocol_response(
    status: tauri::http::StatusCode,
    content_type: &str,
    body: Vec<u8>,
) -> tauri::http::Response<Vec<u8>> {
    tauri::http::Response::builder()
        .status(status)
        .header(tauri::http::header::CONTENT_TYPE, content_type)
        .header(
            tauri::http::header::CACHE_CONTROL,
            "public, max-age=31536000, immutable",
        )
        .body(body)
        .unwrap_or_else(|_| tauri::http::Response::new(Vec::new()))
}

async fn fetch_protocol_file<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    file_id: String,
) -> tauri::http::Response<Vec<u8>> {
    let state = app_handle.state::<AppState>();
    let pool = {
        let db = state.db.read().await;
        db.clone()
    };

    let Some(pool) = pool else {
        return file_protocol_response(
            tauri::http::StatusCode::SERVICE_UNAVAILABLE,
            "text/plain; charset=utf-8",
            "数据库尚未配置".as_bytes().to_vec(),
        );
    };

    match repository::fetch_protocol_file(&pool, &file_id).await {
        Ok(Some(file)) => {
            file_protocol_response(tauri::http::StatusCode::OK, &file.mime_type, file.data)
        }
        Ok(None) => file_protocol_response(
            tauri::http::StatusCode::NOT_FOUND,
            "text/plain; charset=utf-8",
            "文件不存在".as_bytes().to_vec(),
        ),
        Err(_) => file_protocol_response(
            tauri::http::StatusCode::INTERNAL_SERVER_ERROR,
            "text/plain; charset=utf-8",
            "读取文件失败".as_bytes().to_vec(),
        ),
    }
}

pub fn register<R: Runtime>(builder: tauri::Builder<R>) -> tauri::Builder<R> {
    builder.register_asynchronous_uri_scheme_protocol("pk-file", |context, request, responder| {
        let app_handle = context.app_handle().clone();
        let file_id = normalize_protocol_file_id(request.uri().path());

        tauri::async_runtime::spawn(async move {
            let response = match file_id {
                Some(file_id) => fetch_protocol_file(app_handle, file_id).await,
                None => file_protocol_response(
                    tauri::http::StatusCode::BAD_REQUEST,
                    "text/plain; charset=utf-8",
                    "文件 ID 不能为空".as_bytes().to_vec(),
                ),
            };
            responder.respond(response);
        });
    })
}
