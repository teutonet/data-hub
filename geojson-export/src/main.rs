use std::{collections::{BTreeMap, HashMap}, env, fs::File, io::BufReader, sync::Arc, time::Duration};

use anyhow::Context;
use axum::{
    extract::{Query, State},
    http::{header, HeaderMap, StatusCode},
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use axum_prometheus::{PrometheusMetricLayer, metrics};
use deadpool_postgres::{Manager, ManagerConfig, Pool, RecyclingMethod};
use geojson::{Feature, Geometry};
use prometheus_http_query::response::PromqlResult;
use promql_parser::{
    label::Matcher,
    parser::{
        token::T_EQL_REGEX, AggregateExpr, BinaryExpr, Call, Expr, MatrixSelector, ParenExpr,
        SubqueryExpr, UnaryExpr, VectorSelector,
    },
};
use reqwest::header::HeaderValue;
use rustls::RootCertStore;
use serde::Deserialize;
use tokio::{signal::unix::SignalKind, time::Instant};
use tokio_postgres::config::SslMode;
use tower_http::{compression::CompressionLayer, cors::CorsLayer, trace::TraceLayer};
use tracing::{error, info, warn};
use chrono::prelude::*;

#[tokio::main(flavor = "current_thread")]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();
    info!("starting geojson exporter");
    let db_user = env::var("DB_USERNAME").context("you need to specify DB_USERNAME")?;
    let db_password = env::var("DB_PASSWORD").context("you need to specify DB_PASSWORD")?;
    let db_host = env::var("DB_HOST").context("you need to specify DB_HOST")?;
    let db_name = env::var("DB_NAME").context("you need to specify DB_NAME")?;
    let prometheus_host =
        env::var("PROMETHEUS_HOST").context("you need to specify PROMETHEUS_HOST")?;

    let tls_root_crt_path = env::var("PGSSLROOTCERT")
        .context("you need to specify PGSSLROOTCERT")?;

    // postgres tls init
    let root_cert_store = {
        let mut f = BufReader::new(
            File::open(&tls_root_crt_path)
                .with_context(|| format!("can't open {tls_root_crt_path}"))?,
        );
        let mut root_ca = RootCertStore::empty();
        for cert in rustls_pemfile::certs(&mut f) {
            root_ca.add(cert.context("invalid root certificate")?)?;
        }
        if root_ca.is_empty() {
            anyhow::bail!("no ca certificates!");
        }
        root_ca
    };

    let client_config = rustls::ClientConfig::builder()
        .with_root_certificates(root_cert_store)
        .with_no_client_auth();

    let tls = tokio_postgres_rustls::MakeRustlsConnect::new(client_config);

    let mut client_config = tokio_postgres::Config::new();
    client_config.user(&db_user)
        .password(&db_password)
        .host(&db_host)
        .dbname(&db_name)
        .connect_timeout(Duration::from_secs(10))
        .ssl_mode(SslMode::Require);

    let pool = Pool::builder(
        Manager::from_config(client_config, tls, ManagerConfig {
            recycling_method: RecyclingMethod::Fast
        })
    ).max_size(16).build().context("pool build failed")?;

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(5))
        .build()
        .context("could not create reqwest client")?;

    let prometheus_client = prometheus_http_query::Client::from(client, &prometheus_host)
        .context("could not create prometheus client")?;
    let state = Arc::new(AppState {
        prometheus_client,
        pool,
    });

    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();

    // build our application with a route
    let app = Router::new()
        .route("/geojson", get(geojson_handler))
        .route("/livez", get(live_handler))
        .route("/readyz", get(ready_handler))
        .route("/metrics", get(|| async move { metric_handle.render() }))
        .layer(CompressionLayer::new())
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
        .layer(prometheus_layer)
        .with_state(state);

    // run our app with hyper, listening globally on port 3001
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3001")
        .await
        .context("could not bind tcp listener")?;
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_handler())
        .await
        .context("could not start server")?;
    Ok(())
}

async fn shutdown_handler() {
    let mut quit_sig = tokio::signal::unix::signal(SignalKind::quit()).expect("failed to install signal handler");
    let mut term_sig = tokio::signal::unix::signal(SignalKind::terminate()).expect("failed to install signal handler");
    let mut int_sig = tokio::signal::unix::signal(SignalKind::interrupt()).expect("failed to install signal handler");
    tokio::select! {
        _ = quit_sig.recv() => {}
        _ = term_sig.recv() => {}
        _ = int_sig.recv() => {}
    }
}

struct AppState {
    prometheus_client: prometheus_http_query::Client,
    pool: Pool,
}

type ArcAppState = Arc<AppState>;

#[derive(Deserialize)]
struct GeojsonHandlerQuery {
    name: Option<String>,
    query: Option<String>,
    project: String,
}

async fn live_handler() -> &'static str {
    "ok"
}

async fn ready_handler(State(state): State<ArcAppState>) -> (StatusCode, Json<BTreeMap<&'static str, &'static str>>) {
    let db_ready_fut = async {
        match state.pool.get().await {
            Ok(postgres_client) => {
                postgres_client.query_one("SELECT 1", &[]).await.inspect_err(|e| warn!(error = ?e, "can't reach database")).is_ok()
            },
            Err(e) => {
                warn!(error = ?e, "could not connect to database");
                false
            }
        }
    };
    let prometheus_ready_fut = async {
        state.prometheus_client.query("1").get_raw().await.inspect_err(|e| warn!(error = ?e, "prometheus is unhealthy")).is_ok()
    };
    let (db_ready, prometheus_ready) = tokio::join!(db_ready_fut, prometheus_ready_fut);
    let ready_list = [("database", db_ready), ("prometheus", prometheus_ready)];
    let code = if ready_list.iter().all(|(_, ready)| *ready) {
        StatusCode::OK
    } else {
        StatusCode::SERVICE_UNAVAILABLE
    };
    let result = BTreeMap::from(ready_list.map(|(name, ready)| (name, if ready { "READY" } else { "NOT READY" })));
    return (code, Json(result))
}

async fn get_public_query_by_name(
    client: &tokio_postgres::Client,
    project: &str,
    name: &str,
) -> Result<Option<String>, tokio_postgres::Error> {
    if let Some(result) = client
        .query_opt(
            "SELECT query FROM sensor.public_queries WHERE project = $1 AND name = $2",
            &[&project, &name],
        )
        .await?
    {
        let query = result.try_get("query")?;
        Ok(Some(query))
    } else {
        Ok(None)
    }
}

async fn geojson_handler(
    Query(query): Query<GeojsonHandlerQuery>,
    State(state): State<ArcAppState>,
) -> Result<impl IntoResponse, (StatusCode, &'static str)> {
    let db_start = Instant::now();
    let Ok(project) = HeaderValue::from_str(&query.project) else {
        warn!(error = "invalid project", project = query.project);
        return Err((StatusCode::BAD_REQUEST, "invalid project"));
    };
    let postgres_client = state.pool.get().await.map_err(|e| {
        error!(error = ?e, "could not connect to database");
        (StatusCode::INTERNAL_SERVER_ERROR, "database problem")
    })?;
    let prom_query = if let Some(query_name) = &query.name {
        match get_public_query_by_name(&postgres_client, &query.project, query_name).await {
            Err(e) => {
                error!(error = ?e, "could not get query");
                return Err((StatusCode::INTERNAL_SERVER_ERROR, "database problem"));
            }
            Ok(None) => {
                warn!(name = query.name, project = query.project, "unknown query");
                return Err((StatusCode::NOT_FOUND, "query not found"));
            }
            Ok(Some(x)) => x,
        }
    } else if let Some(full_query) = query.query {
        let mut parsed_query = promql_parser::parser::parse(&full_query)
            .inspect_err(|e| error!(error = ?e, query = full_query, "invalid query"))
            .map_err(|_| (StatusCode::BAD_REQUEST, "invalid query"))?;
        // collect all metric names first, to check if they're public
        let mut metric_names = Vec::new();
        collect_metric_names(&parsed_query, &mut metric_names)
            .inspect_err(|e| error!(error = ?e, query = full_query, "invalid query"))
            .map_err(|_| (StatusCode::BAD_REQUEST, "invalid query"))?;
        let allowed_result = postgres_client.query("SELECT sensor.id::TEXT, property.metric_name FROM sensor.sensor JOIN sensor.sensor_property ON sensor.id = sensor_property.sensor_id JOIN sensor.property ON sensor_property.property_id = property.id WHERE sensor.project = $1 AND property.metric_name = ANY ($2) AND COALESCE(sensor_property.public, sensor.public)", &[
            &query.project,
            &metric_names
        ]).await.map_err(|e| {
            error!(error = ?e, "database error");
            (StatusCode::INTERNAL_SERVER_ERROR, "database problem")
        })?;
        // metric_name -> list of sensortype ids
        let mut metric_sensortypes: HashMap<&str, Vec<&str>> = HashMap::new();
        for row in &allowed_result {
            let sensortype_id: &str = row.get(0);
            let metric_name: &str = row.get(1);
            metric_sensortypes
                .entry(metric_name)
                .or_default()
                .push(sensortype_id);
        }
        // check that all requested metrics are allowed and make sure, only public sensortypes are used
        make_query_allowed(&mut parsed_query, &metric_sensortypes).map_err(|e| {
            warn!(error = ?e, query = full_query, "bad query");
            (StatusCode::BAD_REQUEST, "invalid query")
        })?;
        let query_string = parsed_query.to_string();
        info!(query = query_string, "query made allowed");
        query_string
    } else {
        return Err((
            StatusCode::BAD_REQUEST,
            "Either \"name\" or \"query\" needs to be given!",
        ));
    };
    metrics::histogram!("geojson_database_time").record(db_start.elapsed());
    let prom_start = Instant::now();
    let result = state
        .prometheus_client
        .query(&prom_query)
        .timeout(3000)
        .header("X-Scope-OrgId", project)
        .get()
        .await
        .inspect_err(|e| error!(error = ?e, "prometheus error"))
        .map_err(|_| (StatusCode::BAD_REQUEST, "underlying server error"))?;
    metrics::histogram!("geojson_prometheus_time").record(prom_start.elapsed());
    info!(
        time = db_start.elapsed().as_secs_f32(),
        query = prom_query,
        project = query.project,
        "query time"
    );
    let mut headers = HeaderMap::new();
    headers.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("application/geo+json"),
    );
    Ok((headers, Json(promql_result_to_geojson(&result)?)))
}

fn promql_result_to_geojson(
    result: &PromqlResult,
) -> Result<geojson::FeatureCollection, (StatusCode, &'static str)> {
    let mut features: Vec<Feature> = Vec::new();

    fn get_props_for_metric(
        metric: &HashMap<String, String>,
    ) -> Option<(geojson::JsonObject, Geometry)> {
        if let Some(geometry) = metric
            .get("geohash")
            // the library only accepts geohashs up to 12 characters
            .and_then(|hash| geohash::decode(&hash[..12]).ok())
            .map(|(coord, _, _)| {
                geojson::Geometry::new(geojson::GeometryValue::new_point([coord.x, coord.y]))
            })
        {
            let properties: geojson::JsonObject = metric
                .iter()
                .map(|(label, value)| (label.clone(), serde_json::Value::String(value.clone())))
                .collect();
            Some((properties, geometry))
        } else {
            None
        }
    }

    fn format_datetime(timestamp: f64) -> serde_json::Value {
        DateTime::from_timestamp(timestamp as i64, (timestamp.fract() * 1_000_000_000f64) as u32).map_or(serde_json::Value::Null, |d| d.to_rfc3339_opts(SecondsFormat::Millis, true).into())
    }

    match result.data() {
        prometheus_http_query::response::Data::Vector(vector_resp) => {
            features.reserve(vector_resp.len());
            for inst in vector_resp {
                // only collect features that have a geolocation
                if let Some((mut properties, geometry)) = get_props_for_metric(inst.metric()) {
                    // for example: `value: 1.234`
                    properties.insert(
                        "value".to_string(),
                        serde_json::Value::from(inst.sample().value()),
                    );
                    // for example: `timestamp: "2024-01-01T10:00:00.123Z"`
                    properties.insert("timestamp".to_string(), format_datetime(inst.sample().timestamp()));
                    features.push(Feature {
                        geometry: Some(geometry),
                        properties: Some(properties),
                        ..Default::default()
                    })
                }
            }
        }
        prometheus_http_query::response::Data::Matrix(matrix_resp) => {
            features.reserve(matrix_resp.len());
            for inst in matrix_resp {
                // only collect features that have a geolocation
                if let Some((mut properties, geometry)) = get_props_for_metric(inst.metric()) {
                    // for example: `values: [["2018-01-26T18:30:09.453Z",0.3],["2018-01-26T18:32:09.453Z",0.8]]`
                    properties.insert(
                        "values".to_string(),
                        serde_json::Value::Array(
                            inst.samples()
                                .iter()
                                .map(|sample| {
                                    serde_json::Value::Array(vec![
                                        format_datetime(sample.timestamp()),
                                        sample.value().into(),
                                    ])
                                })
                                .collect(),
                        ),
                    );
                    features.push(Feature {
                        geometry: Some(geometry),
                        properties: Some(properties),
                        ..Default::default()
                    })
                }
            }
        }
        prometheus_http_query::response::Data::Scalar(_) => {
            return Err((StatusCode::BAD_REQUEST, "Query returned a scalar"));
        }
    }

    Ok(geojson::FeatureCollection {
        features,
        bbox: None,
        foreign_members: None,
    })
}

fn make_query_allowed(
    query: &mut Expr,
    // metric_name -> list of sensortype ids
    allow_list: &HashMap<&str, Vec<&str>>,
) -> Result<(), String> {
    match query {
        Expr::Unary(UnaryExpr { expr })
        | Expr::Paren(ParenExpr { expr })
        | Expr::Subquery(SubqueryExpr {
            expr,
            at: _,
            offset: _,
            range: _,
            step: _,
        }) => {
            make_query_allowed(expr, allow_list)?;
        }
        Expr::Aggregate(AggregateExpr {
            expr,
            param,
            modifier: _,
            op: _,
        }) => {
            make_query_allowed(expr, allow_list)?;
            if let Some(param) = param {
                make_query_allowed(param, allow_list)?;
            };
        }
        Expr::Binary(BinaryExpr {
            lhs,
            rhs,
            modifier: _,
            op: _,
        }) => {
            make_query_allowed(lhs, allow_list)?;
            make_query_allowed(rhs, allow_list)?;
        }
        Expr::NumberLiteral(_) => (),
        Expr::StringLiteral(_) => (),
        Expr::VectorSelector(VectorSelector {
            name,
            at: _,
            offset: _,
            matchers,
        })
        | Expr::MatrixSelector(MatrixSelector {
            vs:
                VectorSelector {
                    name,
                    at: _,
                    offset: _,
                    matchers,
                },
            range: _,
        }) => {
            let Some(name) = name else {
                return Err("no name".to_string());
            };
            let Some(allowed_types) = allow_list.get(name.as_str()) else {
                return Err(name.to_string());
            };
            if !matchers.or_matchers.is_empty() {
                return Err("or matchers not supported".to_string());
            }
            matchers.matchers.push(
                Matcher::new_matcher(
                    T_EQL_REGEX,
                    "sensortype_id".to_string(),
                    allowed_types.join("|"),
                )
                .unwrap(),
            );
        }
        Expr::Call(Call { args, func: _ }) => {
            for arg in &mut args.args {
                make_query_allowed(arg, allow_list)?
            }
        }
        // TODO: this shouldn't happen
        Expr::Extension(_) => return Err("extension".to_string()),
    }
    Ok(())
}

fn collect_metric_names<'a>(
    query: &'a Expr,
    metric_names: &mut Vec<&'a str>,
) -> Result<(), String> {
    match query {
        Expr::Unary(UnaryExpr { expr })
        | Expr::Paren(ParenExpr { expr })
        | Expr::Subquery(SubqueryExpr {
            expr,
            at: _,
            offset: _,
            range: _,
            step: _,
        }) => {
            collect_metric_names(expr, metric_names)?;
        }
        Expr::Aggregate(AggregateExpr {
            expr,
            param,
            modifier: _,
            op: _,
        }) => {
            collect_metric_names(expr, metric_names)?;
            if let Some(param) = param {
                collect_metric_names(param, metric_names)?;
            };
        }
        Expr::Binary(BinaryExpr {
            lhs,
            rhs,
            modifier: _,
            op: _,
        }) => {
            collect_metric_names(lhs, metric_names)?;
            collect_metric_names(rhs, metric_names)?;
        }
        Expr::NumberLiteral(_) => (),
        Expr::StringLiteral(_) => (),
        Expr::VectorSelector(VectorSelector {
            name,
            at: _,
            offset: _,
            matchers: _,
        })
        | Expr::MatrixSelector(MatrixSelector {
            vs:
                VectorSelector {
                    name,
                    at: _,
                    offset: _,
                    matchers: _,
                },
            range: _,
        }) => {
            let Some(name) = name else {
                return Err("no name".to_string());
            };
            metric_names.push(name);
        }
        Expr::Call(Call { args, func: _ }) => {
            for arg in &args.args {
                collect_metric_names(arg, metric_names)?
            }
        }
        // TODO: this shouldn't happen
        Expr::Extension(_) => return Err("extension".to_string()),
    }
    Ok(())
}
