use serde_json::{json, Value};
use crate::{error::AppError, model::AppState};

pub async fn apply_jsonata(
    state: &AppState,
    expression: &str,
    input: &Value,
) -> Result<Value, AppError> {
    let response = state.client
        .post(format!("{}/transform", state.jsonata_url))
        .json(&json!({
            "expression": expression,
            "input": input
        }))
        .timeout(std::time::Duration::from_millis(700))
        .send()
        .await
        .map_err(AppError::Http)?;

    if !response.status().is_success() {
        return Err(AppError::BadRequest(format!("jsonata sidecar error: {}", response.status())));
    }

    response.json::<Value>().await.map_err(AppError::Http)
}