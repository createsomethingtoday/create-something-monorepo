//! Optional AI connection for GiGi's free, open-source local macOS offering.
//! Separate from source identity and installed-Codex authentication.
use create_something_chatgpt_connection::Controller;
use serde_json::{json, Value};
use std::sync::OnceLock;

const ENABLED: bool = cfg!(target_os = "macos");
static CONNECTION: OnceLock<Result<Controller, String>> = OnceLock::new();
fn controller() -> Result<&'static Controller, String> {
    CONNECTION
        .get_or_init(|| {
            Controller::new("GiGi", "agency.createsomething.gigi.chatgpt", ENABLED)
                .map_err(|e| e.to_string())
        })
        .as_ref()
        .map_err(Clone::clone)
}
fn field<'a>(input: &'a Value, name: &str, limit: usize) -> Result<&'a str, String> {
    input
        .get(name)
        .and_then(Value::as_str)
        .filter(|s| !s.trim().is_empty() && s.len() <= limit)
        .ok_or_else(|| "invalid_request".into())
}
fn browser(url: &str) -> Result<(), String> {
    // Only the shared controller's generated authorization URL reaches this function.
    std::process::Command::new("/usr/bin/open")
        .arg(url)
        .status()
        .map_err(|_| "browser_unavailable".to_string())?
        .success()
        .then_some(())
        .ok_or_else(|| "browser_unavailable".into())
}
async fn run(c: &Controller, operation: &str, input: Value) -> Result<Value, String> {
    if !input.is_object() {
        return Err("invalid_request".into());
    }
    let status = match operation {
        "ai.connection.status" => c.status().await,
        "ai.connection.connect" => {
            let selected = if input.get("clientId").is_some() {
                Some(field(&input, "clientId", 512)?.to_string())
            } else {
                None
            };
            c.connect(browser, selected)
                .await
                .map_err(|e| e.to_string())?
        }
        "ai.connection.usage" => {
            browser("https://chatgpt.com/#settings")?;
            c.status().await
        }
        "ai.connection.cancel" => {
            c.cancel();
            c.status().await
        }
        "ai.connection.select" => c
            .select(field(&input, "clientId", 512)?)
            .await
            .map_err(|e| e.to_string())?,
        "ai.connection.disconnect" => c
            .disconnect(field(&input, "clientId", 512)?)
            .await
            .map_err(|e| e.to_string())?,
        "ai.connection.models" => {
            return serde_json::to_value(c.models().await.map_err(|e| e.to_string())?)
                .map_err(|_| "invalid_response".into())
        }
        "ai.connection.ask" => {
            return Ok(
                json!({"text":c.respond(field(&input,"model",200)?,field(&input,"text",65536)?).await.map_err(|e|e.to_string())?}),
            )
        }
        _ => return Err("unsupported_operation".into()),
    };
    serde_json::to_value(status).map_err(|_| "invalid_response".into())
}
pub fn cancel_if_initialized() {
    if let Some(Ok(c)) = CONNECTION.get() {
        c.cancel();
    }
}
pub async fn dispatch(operation: &str, input: Value) -> Result<Value, String> {
    run(controller()?, operation, input).await
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn invalid_input_and_unknown_operations_do_not_open_auth_or_inference() {
        tauri::async_runtime::block_on(async {
            let c = Controller::new("GiGi fixture", "agency.createsomething.gigi.fixture", false)
                .unwrap();
            assert_eq!(
                run(&c, "ai.connection.status", json!({})).await.unwrap()["available"],
                false
            );
            assert!(run(&c, "ai.connection.enable", json!({"enabled":true}))
                .await
                .is_err());
            assert!(run(&c, "ai.connection.ask", json!({"text":"hello"}))
                .await
                .is_err());
            assert!(run(&c, "ai.connection.select", json!({"clientId":""}))
                .await
                .is_err());
            assert!(run(&c, "ai.connection.status", Value::Null).await.is_err());
        });
    }
}
