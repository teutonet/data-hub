use axum::http::HeaderMap;
use crate::error::AppError;
use base64::{engine::general_purpose, Engine as _};
use reqwest::Client;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub(crate) struct TokenResponse {
    pub(crate) access_token: String,
}

pub async fn extract_basic_auth(
    client: &Client,
    token_url: &str,
    headers: &HeaderMap,
) -> Result<String, AppError> {
    let auth = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| AppError::Unauthorized("missing Authorization header".into()))?;

    if !auth.starts_with("Basic ") {
        return Err(AppError::Unauthorized("Authorization must be Basic".into()));
    }

    let base64_part = &auth[6..];

    let decoded = general_purpose::STANDARD
        .decode(base64_part)
        .map_err(|_| AppError::Unauthorized("invalid base64".into()))?;

    let decoded = String::from_utf8(decoded)
        .map_err(|_| AppError::Unauthorized("invalid utf8".into()))?;

    let (username, password) = decoded.split_once(':')
        .ok_or_else(|| AppError::Unauthorized("invalid basic auth".into()))?;

    let token = fetch_token(client, token_url, username, password).await?;

    Ok(token.access_token)
}

pub(crate) async fn fetch_token(
    client: &Client,
    token_url: &str,
    username: &str,
    password: &str,
) -> Result<TokenResponse, AppError> {

    let token = client
        .post(token_url)
        .basic_auth(username, Some(password))
        .form(&[("grant_type", "client_credentials")])
        .send()
        .await?
        .json::<TokenResponse>()
        .await?;

    Ok(token)
}