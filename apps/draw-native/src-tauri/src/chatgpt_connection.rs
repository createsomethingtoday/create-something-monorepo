//! Optional model connection. No canvas, pairing, grant, or native edit authority.
use create_something_chatgpt_connection::{
    AccountSummary, ConnectionError, ConnectionStatus, Controller, Model,
};
use std::sync::Arc;

pub(crate) struct ChatGptState {
    controller: Option<Arc<Controller>>,
}
impl ChatGptState {
    pub(crate) fn new() -> Self {
        // A missing/locked credential store must never prevent offline drawing.
        Self {
            controller: Controller::new(
                "Draw",
                "agency.createsomething.draw.chatgpt",
                cfg!(target_os = "macos"),
            )
            .ok()
            .map(Arc::new),
        }
    }
    fn controller(&self) -> Result<Arc<Controller>, String> {
        self.controller.clone().ok_or_else(|| "UNAVAILABLE".into())
    }
}
fn public_error(error: ConnectionError) -> String {
    error.to_string()
}
fn unavailable() -> ConnectionStatus {
    ConnectionStatus {
        available: false,
        busy: false,
        active_client_id: None,
        accounts: Vec::<AccountSummary>::new(),
        pending_client_ids: vec![],
        disconnect_outcome: None,
        error: Some("UNAVAILABLE".into()),
    }
}

fn allowed_browser_url(url: &str) -> bool {
    reqwest::Url::parse(url).is_ok_and(|url| {
        url.scheme() == "https"
            && url.host_str() == Some("auth.openai.com")
            && url.port_or_known_default() == Some(443)
            && url.path() == "/api/accounts/authorize"
            && url.username().is_empty()
            && url.password().is_none()
            && url.fragment().is_none()
            && url.query().is_some()
    })
}
const USAGE_URL: &str = "https://chatgpt.com/settings/usage";
fn open_system_url(url: &str) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use std::process::{Command, Stdio};
        let status = Command::new("/usr/bin/open")
            .arg(url)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map_err(|_| "BROWSER_OPEN_FAILED".to_owned())?;
        if status.success() {
            Ok(())
        } else {
            Err("BROWSER_OPEN_FAILED".into())
        }
    }
    #[cfg(not(target_os = "macos"))]
    Err("UNAVAILABLE".into())
}

fn open_browser(url: &str) -> Result<(), String> {
    if !allowed_browser_url(url) {
        return Err("BROWSER_OPEN_FAILED".into());
    }
    open_system_url(url)
}
#[tauri::command]
pub(crate) fn draw_chatgpt_open_usage() -> Result<(), String> {
    open_system_url(USAGE_URL)
}

#[tauri::command]
pub(crate) async fn draw_chatgpt_status(
    state: tauri::State<'_, ChatGptState>,
) -> Result<ConnectionStatus, String> {
    let controller = state.controller.clone();
    Ok(match controller {
        Some(controller) => controller.status().await,
        None => unavailable(),
    })
}
#[tauri::command]
pub(crate) async fn draw_chatgpt_connect(
    state: tauri::State<'_, ChatGptState>,
    selected_client_id: Option<String>,
) -> Result<ConnectionStatus, String> {
    state
        .controller()?
        .connect(open_browser, selected_client_id)
        .await
        .map_err(public_error)
}
#[tauri::command]
pub(crate) fn draw_chatgpt_cancel(state: tauri::State<'_, ChatGptState>) -> Result<(), String> {
    state.controller()?.cancel();
    Ok(())
}
#[tauri::command]
pub(crate) async fn draw_chatgpt_disconnect(
    state: tauri::State<'_, ChatGptState>,
    client_id: String,
) -> Result<ConnectionStatus, String> {
    state
        .controller()?
        .disconnect(&client_id)
        .await
        .map_err(public_error)
}
#[tauri::command]
pub(crate) async fn draw_chatgpt_select(
    state: tauri::State<'_, ChatGptState>,
    client_id: String,
) -> Result<ConnectionStatus, String> {
    state
        .controller()?
        .select(&client_id)
        .await
        .map_err(public_error)
}
#[tauri::command]
pub(crate) async fn draw_chatgpt_models(
    state: tauri::State<'_, ChatGptState>,
) -> Result<Vec<Model>, String> {
    state.controller()?.models().await.map_err(public_error)
}
#[tauri::command]
pub(crate) async fn draw_chatgpt_respond(
    state: tauri::State<'_, ChatGptState>,
    model: String,
    input: String,
) -> Result<String, String> {
    if input.trim().is_empty() || input.len() > 16_000 {
        return Err("INVALID_INPUT".into());
    }
    state
        .controller()?
        .respond(&model, &input)
        .await
        .map_err(public_error)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn only_opens_the_official_authorization_endpoint() {
        assert_eq!(USAGE_URL, "https://chatgpt.com/settings/usage");
        assert!(allowed_browser_url(
            "https://auth.openai.com/api/accounts/authorize?state=synthetic"
        ));
        for url in [
            "http://auth.openai.com/api/accounts/authorize?x=1",
            "https://auth.openai.com.attacker.example/api/accounts/authorize?x=1",
            "https://user:pass@auth.openai.com/api/accounts/authorize?x=1",
            "https://auth.openai.com/api/accounts/authorize?x=1#leak",
            "file:///tmp/anything",
            "https://auth.openai.com/other?x=1",
            "https://auth.openai.com:444/api/accounts/authorize?x=1",
        ] {
            assert!(!allowed_browser_url(url));
        }
    }
}
