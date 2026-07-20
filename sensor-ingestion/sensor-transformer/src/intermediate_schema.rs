use crate::error::AppError;
use serde_json::{json, Value};
use std::sync::LazyLock;

static SCHEMA: LazyLock<jsonschema::Validator> = LazyLock::new(|| {
    let schema = json!({
      "type": "object",
      "properties": {
        "resultTime": { "type": "string", "format": "date-time" },
        "sourcePath": {
          "type": "object",
          "properties": {
            "appid": { "type": "string" },
            "devid": { "type": "string" },
            "deveui": { "type": "string" }
          },
          "required": ["appid", "deveui", "devid"]
        },
        "variables": {
          "type": "object",
          "additionalProperties": {
            "oneOf": [{ "type": "string" }, { "type": "number" }]
          }
        },
        "setLocation": {
          "type": "object",
          "properties": {
            "latitude": { "type": "number" },
            "longitude": { "type": "number" }
          },
          "required": ["latitude", "longitude"]
        },
        "gateways": { "type": "integer" }
      },
      "required": ["resultTime", "sourcePath", "variables"]
    });

    jsonschema::validator_for(&schema).expect("json schema should compile")
});

pub fn validate_intermediate(payload: &Value) -> Result<(), AppError> {
    let mut errors = SCHEMA.iter_errors(payload).peekable();
    if errors.peek().is_some() {
        let details = errors
            .map(|e| e.to_string())
            .collect::<Vec<_>>()
            .join("; ");

        return Err(AppError::BadRequest(format!(
            "invalid Intermediate payload: {details}"
        )));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn validates_valid_payload() {
        let payload = json!({
            "resultTime": "2023-10-21T13:29:11Z",
            "sourcePath": {
                "appid": "owm",
                "devid": "paderborn",
                "deveui": "2855745"
            },
            "variables": {
                "airTemperature": 16.55,
                "relHumidity": 64,
                "status": "ok"
            },
            "setLocation": {
                "latitude": 51.7189,
                "longitude": 8.7575
            },
            "gateways": 2
        });

        let result = validate_intermediate(&payload);

        assert!(result.is_ok());
    }

    #[test]
    fn rejects_invalid_setlocation() {
        let payload = json!({
            "resultTime": "2023-10-21T13:29:11Z",
            "sourcePath": {
                "appid": "owm",
                "devid": "paderborn",
                "deveui": "2855745"
            },
            "variables": {
                "airTemperature": 16.55
            },
            "setLocation": {
                "latitude": 51.7189
            }
        });

        let result = validate_intermediate(&payload);

        assert!(result.is_err());

        match result {
            Err(AppError::BadRequest(msg)) => {
                assert!(msg.contains("longitude"));
            }
            _ => panic!("expected BadRequest error"),
        }
    }

    #[test]
    fn rejects_missing_required_field() {
        let payload = json!({
            "resultTime": "2023-10-21T13:29:11Z",
            "sourcePath": {
                "appid": "owm",
                "devid": "paderborn",
                "deveui": "2855745"
            }
        });

        let result = validate_intermediate(&payload);

        assert!(result.is_err());

        match result {
            Err(AppError::BadRequest(msg)) => {
                assert!(msg.contains("variables"));
            }
            _ => panic!("expected BadRequest error"),
        }
    }
}