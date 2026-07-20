use crate::error::AppError;
use reqwest::Client;
use serde_json::Value;

pub async fn forward_to_write_targets(
    client: &Client,
    targets: &[String],
    token: &str,
    msg: &Value,
) -> Result<(), AppError> {
    for t in targets {
        let resp = client.post(t).bearer_auth(token).json(msg).send().await.map_err(AppError::Http)?;
        if !resp.status().is_success() {
            let txt = resp.text().await.unwrap_or_default();
            return Err(AppError::BadRequest(format!("write target {} failed: {}", t, txt)));
        }
    }
    Ok(())
}