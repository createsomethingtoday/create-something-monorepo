//! Separate from source identity and installed-Codex authentication.
//! No live authentication is admitted in this fixture-only build.
use create_something_chatgpt_connection::Controller;
use serde_json::Value;

pub async fn dispatch(operation: &str) -> Result<Value, String> {
    // Deliberately compile-time false; renderer flags and environment variables
    // cannot enable a private/paid offering without reviewed provider admission.
    let controller = Controller::new("GiGi", "agency.createsomething.gigi.chatgpt", false)
        .map_err(|_| "ChatGPT connection is unavailable in this build".to_string())?;
    match operation {
        "ai.connection.status" => serde_json::to_value(controller.status().await)
            .map_err(|_| "Connection status could not be displayed".to_string()),
        _ => Err("App-owned ChatGPT sign-in requires provider eligibility confirmation; use the installed Codex connection".to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn admission_gate_is_closed_and_cannot_be_enabled_through_operations() {
        tauri::async_runtime::block_on(async {
            let status = dispatch("ai.connection.status").await.unwrap();
            assert_eq!(status["available"], false);
            assert_eq!(status["accounts"], serde_json::json!([]));
            assert_eq!(status["busy"], false);
            assert!(dispatch("ai.connection.connect").await.is_err());
            assert!(dispatch("ai.connection.respond").await.is_err());
            assert!(dispatch("ai.connection.enable").await.is_err());
        });
    }
}
