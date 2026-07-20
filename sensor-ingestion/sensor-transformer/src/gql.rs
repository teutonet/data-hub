use serde::Deserialize;
use serde_json::json;
use crate::{error::AppError, model::AppState};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransformCfg {
    #[allow(dead_code)]
    pub id: String,
    #[allow(dead_code)]
    pub project: String,
    pub jsonata_expression: String,
    pub active: bool,
}

#[derive(Debug, Deserialize)]
struct GraphQlResponse<T> {
    data: Option<T>,
    errors: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
struct DataRoot {
    #[serde(rename = "transformConfig")]
    transform_config: Option<TransformCfg>,
}

#[derive(Debug, Deserialize)]
struct DataRootByName {
    #[serde(rename = "transformConfigs")]
    all_transform_configs: Vec<TransformCfg>,
}

pub async fn fetch_transform_by_id(
    state: &AppState,
    token: &str,
    transform_id: &str,
) -> Result<TransformCfg, AppError> {
    let query = r#"
      query($id: UUID!) {
        transformConfig(id: $id) {
          id
          project
          jsonataExpression
          active
        }
      }
    "#;

    let resp = state.client
        .post(&state.graphql_url)
        .bearer_auth(token)
        .json(&json!({
            "query": query,
            "variables": { "id": transform_id }
        }))
        .send()
        .await
        .map_err(AppError::Http)?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(AppError::BadRequest(format!("graphql request failed: {} body: {}", status, body)));
    }

    let body: GraphQlResponse<DataRoot> = resp.json().await.map_err(AppError::Http)?;

    if let Some(err) = body.errors {
        return Err(AppError::BadRequest(format!("graphql errors: {err}")));
    }

    let cfg = body.data
        .and_then(|d| d.transform_config)
        .ok_or_else(|| AppError::NotFound("transform config not found".into()))?;

    if !cfg.active {
        return Err(AppError::Forbidden("transform config inactive".into()));
    }

    Ok(cfg)
}

pub async fn fetch_transform_by_name(
    state: &AppState,
    token: &str,
    project: &str,
    name: &str,
) -> Result<TransformCfg, AppError> {
    let query = r#"
      query($project: String!, $name: String!) {
        transformConfigs(condition: { project: $project, name: $name }, first: 1) {
          id
          project
          jsonataExpression
          active
        }
      }
    "#;

    let resp = state.client
        .post(&state.graphql_url)
        .bearer_auth(token)
        .json(&json!({
            "query": query,
            "variables": { "project": project, "name": name }
        }))
        .send()
        .await
        .map_err(AppError::Http)?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(AppError::BadRequest(format!("graphql request failed: {} body: {}", status, body)));
    }

    let body: GraphQlResponse<DataRootByName> = resp.json().await.map_err(AppError::Http)?;

    if let Some(err) = body.errors {
        return Err(AppError::BadRequest(format!("graphql errors: {err}")));
    }

    let cfg = body.data
        .and_then(|d| d.all_transform_configs.into_iter().next())
        .ok_or_else(|| AppError::NotFound("transform config not found".into()))?;

    if !cfg.active {
        return Err(AppError::Forbidden("transform config inactive".into()));
    }

    Ok(cfg)
}