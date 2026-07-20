use axum::{
    body::Body,
    extract::{Path, State},
    http::{HeaderMap, Request, StatusCode},
    routing::post,
    Json, Router,
};
use httpmock::prelude::*;
use serde_json::{json, Value};
use std::sync::Arc;
use tower::ServiceExt;

use sensor_transformer::{auth, forward, gql, intermediate_schema, model::AppState, transform};

async fn test_transform_handler(
    State(state): State<Arc<AppState>>,
    Path(transform_id): Path<String>,
    headers: HeaderMap,
    Json(body): Json<Value>,
) -> Result<Json<Value>, sensor_transformer::error::AppError> {
    let token = auth::extract_basic_auth(&state.client, &state.oidc_token_url, &headers).await?;
    let cfg = gql::fetch_transform_by_id(&state, &token, &transform_id).await?;
    let transformed = transform::apply_jsonata(&state, &cfg.jsonata_expression, &body).await?;
    intermediate_schema::validate_intermediate(&transformed)?;
    forward::forward_to_write_targets(&state.client, &state.write_targets, &token, &transformed).await?;
    Ok(Json(json!({ "status": "SUCCESS" })))
}

#[tokio::test]
async fn transform_success_forwards_and_returns_200() {
    let gql_server = MockServer::start();
    let jsonata_server = MockServer::start();
    let keycloak_server = MockServer::start();
    let write_server = MockServer::start();

    let _gql = gql_server.mock(|when, then| {
        when.method(POST).path("/");
        then.status(200)
            .header("content-type", "application/json")
            .json_body(json!({
                "data": {
                    "transformConfig": {
                        "id": "tr-1",
                        "project": "tenant:project",
                        "jsonataExpression": "{...}",
                        "active": true
                    }
                }
            }));
    });

    let _jsonata = jsonata_server.mock(|when, then| {
        when.method(POST).path("/transform");
        then.status(200)
            .header("content-type", "application/json")
            .json_body(json!({
                "resultTime": "2026-01-01T00:00:00Z",
                "sourcePath": { "appid":"a","devid":"d","deveui":"e" },
                "variables": { "temperature": 21.5 },
                "gateways": 1
            }));
    });

    let _token = keycloak_server.mock(|when, then| {
        when.method(POST).path("/token");
        then.status(200)
            .header("content-type", "application/json")
            .json_body(json!({ "access_token": "abc.def.ghi" }));
    });

    let write_mock = write_server.mock(|when, then| {
        when.method(POST).path("/write");
        then.status(200).body("ok");
    });

    let state = Arc::new(AppState {
        graphql_url: format!("{}/", gql_server.base_url()),
        jsonata_url: jsonata_server.base_url(),
        oidc_token_url: format!("{}/token", keycloak_server.base_url()),
        write_targets: vec![format!("{}/write", write_server.base_url())],
        client: reqwest::Client::new(),
        prometheus_url: "http://prom".into(),
        prometheus_ready_path: "/-/ready".into(),
    });

    let app = Router::new()
        .route("/transform/{transformId}", post(test_transform_handler))
        .with_state(state);

    let req = Request::builder()
        .method("POST")
        .uri("/transform/tr-1")
        .header("Authorization", "Basic dGVzdDp0ZXN0")
        .header("content-type", "application/json")
        .body(Body::from(json!({"foo":"bar"}).to_string()))
        .unwrap();

    let res = app.oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    write_mock.assert();
}

#[tokio::test]
async fn transform_invalid_intermediate_returns_400() {
    let gql_server = MockServer::start();
    let jsonata_server = MockServer::start();
    let keycloak_server = MockServer::start();
    let write_server = MockServer::start();

    let _gql = gql_server.mock(|when, then| {
        when.method(POST).path("/");
        then.status(200)
            .header("content-type", "application/json")
            .json_body(json!({
                "data": {
                    "transformConfig": {
                        "id": "tr-2",
                        "project": "tenant:project",
                        "jsonataExpression": "{...}",
                        "active": true
                    }
                }
            }));
    });

    let _jsonata = jsonata_server.mock(|when, then| {
        when.method(POST).path("/transform");
        then.status(200)
            .header("content-type", "application/json")
            .json_body(json!({ "foo": "bar" }));
    });

    let _token = keycloak_server.mock(|when, then| {
        when.method(POST).path("/token");
        then.status(200)
            .header("content-type", "application/json")
            .json_body(json!({ "access_token": "abc.def.ghi" }));
    });

    let write_mock = write_server.mock(|when, then| {
        when.method(POST).path("/write");
        then.status(200);
    });

    let state = Arc::new(AppState {
        graphql_url: format!("{}/", gql_server.base_url()),
        jsonata_url: jsonata_server.base_url(),
        oidc_token_url: format!("{}/token", keycloak_server.base_url()),
        write_targets: vec![format!("{}/write", write_server.base_url())],
        client: reqwest::Client::new(),
        prometheus_url: "http://prom".into(),
        prometheus_ready_path: "/-/ready".into(),
    });

    let app = Router::new()
        .route("/transform/{transformId}", post(test_transform_handler))
        .with_state(state);

    let req = Request::builder()
        .method("POST")
        .uri("/transform/tr-2")
        .header("Authorization", "Basic dGVzdDp0ZXN0")
        .header("content-type", "application/json")
        .body(Body::from(json!({"x":1}).to_string()))
        .unwrap();

    let res = app.oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::BAD_REQUEST);
    assert_eq!(write_mock.calls(), 0);
}

#[tokio::test]
async fn transform_write_target_error_returns_400() {
    let gql_server = MockServer::start();
    let jsonata_server = MockServer::start();
    let keycloak_server = MockServer::start();
    let write_server = MockServer::start();

    let _gql = gql_server.mock(|when, then| {
        when.method(POST).path("/");
        then.status(200)
            .header("content-type", "application/json")
            .json_body(json!({
                "data": {
                    "transformConfig": {
                        "id": "tr-3",
                        "project": "tenant:project",
                        "jsonataExpression": "{...}",
                        "active": true
                    }
                }
            }));
    });

    let _jsonata = jsonata_server.mock(|when, then| {
        when.method(POST).path("/transform");
        then.status(200)
            .header("content-type", "application/json")
            .json_body(json!({
                "resultTime": "2026-01-01T00:00:00Z",
                "sourcePath": { "appid":"a","devid":"d","deveui":"e" },
                "variables": { "temperature": 21.5 }
            }));
    });

    let _token = keycloak_server.mock(|when, then| {
        when.method(POST).path("/token");
        then.status(200)
            .header("content-type", "application/json")
            .json_body(json!({ "access_token": "abc.def.ghi" }));
    });

    let write_mock = write_server.mock(|when, then| {
        when.method(POST).path("/write");
        then.status(500).body("db error");
    });

    let state = Arc::new(AppState {
        graphql_url: format!("{}/", gql_server.base_url()),
        jsonata_url: jsonata_server.base_url(),
        oidc_token_url: format!("{}/token", keycloak_server.base_url()),
        write_targets: vec![format!("{}/write", write_server.base_url())],
        client: reqwest::Client::new(),
        prometheus_url: "http://prom".into(),
        prometheus_ready_path: "/-/ready".into(),
    });

    let app = Router::new()
        .route("/transform/{transformId}", post(test_transform_handler))
        .with_state(state);

    let req = Request::builder()
        .method("POST")
        .uri("/transform/tr-3")
        .header("Authorization", "Basic dGVzdDp0ZXN0")
        .header("content-type", "application/json")
        .body(Body::from(json!({"x":1}).to_string()))
        .unwrap();

    let res = app.oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::BAD_REQUEST);
    assert_eq!(write_mock.calls(), 1);
}
