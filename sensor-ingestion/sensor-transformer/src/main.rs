mod auth;
mod error;
mod gql;
mod intermediate_schema;
mod model;
mod transform;
mod forward;

use axum::{
    extract::{Path, State},
    http::HeaderMap,
    routing::{post, any},
    Json, Router,
};
use error::AppError;
use model::AppState;
use reqwest::Client;
use serde_json::{json, Value};
use std::{net::SocketAddr, sync::Arc};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let state = Arc::new(AppState::from_env()?);

    let app = Router::new()
        .route("/livez", any(|| async { "ok" }))
        .route("/readyz", any(readyz))
        .route("/transform/{transformId}", post(transform_handler))
        .route("/transform/{transformId}/preview", post(transform_preview_handler))
        .route("/transform/{project}/{name}", post(transform_handler_by_name))
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8088));
    println!("sensor-transformer listening on {}", addr);

    axum::serve(tokio::net::TcpListener::bind(addr).await?, app).await?;
    Ok(())
}

async fn transform_handler(
    State(state): State<Arc<AppState>>,
    Path(transform_id): Path<String>,
    headers: HeaderMap,
    Json(body): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, AppError> {
    let token = auth::extract_basic_auth(&state.client, &state.oidc_token_url, &headers).await?;

    let cfg = gql::fetch_transform_by_id(&state, &token, &transform_id).await?;
    let transformed = transform::apply_jsonata(&state, &cfg.jsonata_expression, &body).await?;

    intermediate_schema::validate_intermediate(&transformed)?;

    forward::forward_to_write_targets(&state.client, &state.write_targets, &token, &transformed).await?;

    Ok(Json(json!({ "status": "SUCCESS" })))
}

async fn transform_handler_by_name(
    State(state): State<Arc<AppState>>,
    Path((project, name)): Path<(String, String)>,
    headers: HeaderMap,
    Json(body): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, AppError> {
    let token = auth::extract_basic_auth(&state.client, &state.oidc_token_url, &headers).await?;

    let cfg = gql::fetch_transform_by_name(&state, &token, &project, &name).await?;
    let transformed = transform::apply_jsonata(&state, &cfg.jsonata_expression, &body).await?;

    intermediate_schema::validate_intermediate(&transformed)?;

    forward::forward_to_write_targets(&state.client, &state.write_targets, &token, &transformed).await?;

    Ok(Json(json!({ "status": "SUCCESS" })))
}

async fn transform_preview_handler(
    State(state): State<Arc<AppState>>,
    Path(transform_id): Path<String>,
    headers: HeaderMap,
    Json(body): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, AppError> {
    let token = auth::extract_basic_auth(&state.client, &state.oidc_token_url, &headers).await?;

    let cfg = gql::fetch_transform_by_id(&state, &token, &transform_id).await?;
    let transformed = transform::apply_jsonata(&state, &cfg.jsonata_expression, &body).await?;

    intermediate_schema::validate_intermediate(&transformed)?;

    Ok(Json(transformed))
}

async fn ready(client: &Client, base_url: &str, path: &str) -> bool {
    let url = url::Url::parse(base_url)
        .and_then(|u| u.join(path))
        .expect("invalid base_url or path configuration")
        .to_string();

    match client.get(url).send().await {
        Ok(resp) => resp.status().is_success(),
        _ => false,
    }
}

async fn readyz(
    State(state): State<Arc<AppState>>,
) -> (axum::http::StatusCode, Json<Value>) {
    let mdb_ready = ready(
        &state.client,
        &state.graphql_url,
        "/readyz",
    )
    .await;

    let prometheus_ready = ready(
        &state.client,
        &state.prometheus_url,
        &state.prometheus_ready_path,
    )
    .await;

    let jsonata_ready = ready(
        &state.client,
        &state.jsonata_url,
        "/readyz",
    )
    .await;

    let all_ready = mdb_ready && prometheus_ready && jsonata_ready;

    let body = json!({
        "mdb": if mdb_ready { "READY" } else { "NOT READY" },
        "prometheus": if prometheus_ready { "READY" } else { "NOT READY" },
        "jsonata": if jsonata_ready { "READY" } else { "NOT READY" },
    });

    (
        if all_ready {
            axum::http::StatusCode::OK
        } else {
            axum::http::StatusCode::SERVICE_UNAVAILABLE
        },
        Json(body),
    )
}