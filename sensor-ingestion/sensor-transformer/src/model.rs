use reqwest::Client;
use std::time::Duration;
use url::Url;

#[derive(Clone)]
pub struct AppState {
    pub graphql_url: String,
    pub jsonata_url: String,
    pub oidc_token_url: String,
    pub write_targets: Vec<String>,

    pub client: Client,
    pub prometheus_url: String,
    pub prometheus_ready_path: String,
}

impl AppState {
    pub fn from_env() -> anyhow::Result<Self> {
        let issuer = std::env::var("AUTH_ISSUER")?;
        let token_path = std::env::var("AUTH_TOKEN_PATH")?;

        let targets_raw = std::env::var("TARGETS")?;
        let write_targets: Vec<String> = serde_json::from_str(&targets_raw)
            .map_err(|e| anyhow::anyhow!("failed to parse TARGETS as JSON array: {e}"))?;

        let oidc_token_url = Url::parse(&(issuer + "/"))?
            .join(&token_path)?
            .to_string();

        let mut client_builder = Client::builder();
        if std::env::var("INSECURE_SSL_SKIP_VERIFY").as_deref() == Ok("true") {
            client_builder = client_builder.danger_accept_invalid_certs(true);
        }

        client_builder = client_builder.timeout(Duration::from_secs(10));

        Ok(Self {
            graphql_url: std::env::var("GRAPHQL_URL")?,
jsonata_url: std::env::var("JSONATA_URL")
    .unwrap_or_else(|_| "http://localhost:3001".into()),
            oidc_token_url,
            write_targets,

            client: client_builder.build().expect("valid reqwest client"),
            prometheus_url: std::env::var("PROMETHEUS_URL")?,
            prometheus_ready_path: std::env::var("PROMETHEUS_READY_PATH")
                .unwrap_or_else(|_| "/-/ready".into()),
        })
    }
}