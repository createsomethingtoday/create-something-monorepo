// Prevents an extra console window on Windows in release; harmless on macOS.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod events;

use std::env;
use std::ffi::OsString;
use std::path::{Path, PathBuf};
use std::time::Duration;

use futures_util::StreamExt;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Manager, Url, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_notification::NotificationExt;

const KEYCHAIN_SERVICE: &str = "app-governance";
const KEYCHAIN_KEY_ACCOUNT: &str = "mcp-key";
const KEYCHAIN_REPO_ACCOUNT: &str = "repo-dir";

const REPO_DIR_ENV: &str = "APP_GOVERNANCE_REPO_DIR";
const ADMIN_SYNC_SCRIPT: &str = "packages/app-governance-db/scripts/sync-admin-apps.playwright.mjs";
const DOC_CHECK_SCRIPT: &str = "packages/app-governance-db/scripts/check-doc-changes.mjs";

const DASHBOARD_URL: &str = "https://app-governance-dash.createsomething.agency";
const LIVE_URL: &str = "https://app-governance.mcp.createsomething.agency/live";
const PRESENCE_WS_URL: &str = "wss://app-governance.mcp.createsomething.agency/presence";

const BACKOFF_INITIAL_SECS: u64 = 5;
const BACKOFF_CAP_SECS: u64 = 60;
const NO_KEY_RETRY_SECS: u64 = 60;

// ---------------------------------------------------------------------------
// Keychain
// ---------------------------------------------------------------------------

fn keychain_entry(account: &str) -> Result<keyring::Entry, String> {
    keyring::Entry::new(KEYCHAIN_SERVICE, account).map_err(|e| e.to_string())
}

fn read_key() -> Option<String> {
    let entry = keychain_entry(KEYCHAIN_KEY_ACCOUNT).ok()?;
    entry
        .get_password()
        .ok()
        .map(|k| k.trim().to_string())
        .filter(|k| !k.is_empty())
}

#[tauri::command]
fn save_key(key: String) -> Result<(), String> {
    let key = key.trim();
    if key.is_empty() {
        return Err("Key is empty".to_string());
    }
    keychain_entry(KEYCHAIN_KEY_ACCOUNT)?
        .set_password(key)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_key_present() -> bool {
    read_key().is_some()
}

fn home_dir() -> Option<PathBuf> {
    env::var_os("HOME")
        .filter(|home| !home.is_empty())
        .map(PathBuf::from)
}

fn path_from_input(input: &str, home: Option<&Path>) -> Option<PathBuf> {
    let input = input.trim();
    if input.is_empty() {
        return None;
    }
    if input == "~" {
        return home
            .map(PathBuf::from)
            .or_else(|| Some(PathBuf::from(input)));
    }
    if let Some(rest) = input.strip_prefix("~/") {
        return home
            .map(|home| home.join(rest))
            .or_else(|| Some(PathBuf::from(input)));
    }
    Some(PathBuf::from(input))
}

fn path_from_env_value(value: OsString, home: Option<&Path>) -> Option<PathBuf> {
    let value = value.to_string_lossy();
    path_from_input(&value, home)
}

fn read_stored_repo_dir() -> Option<String> {
    let entry = keychain_entry(KEYCHAIN_REPO_ACCOUNT).ok()?;
    entry
        .get_password()
        .ok()
        .map(|path| path.trim().to_string())
        .filter(|path| !path.is_empty())
}

fn repo_dir_candidate(
    env_dir: Option<OsString>,
    stored_dir: Option<String>,
    home: Option<PathBuf>,
) -> Option<PathBuf> {
    let home_ref = home.as_deref();
    if let Some(path) = env_dir.and_then(|value| path_from_env_value(value, home_ref)) {
        return Some(path);
    }
    if let Some(path) = stored_dir.and_then(|value| path_from_input(&value, home_ref)) {
        return Some(path);
    }
    home.map(|home| home.join("Code").join("create-something-monorepo"))
}

fn configured_repo_dir() -> Option<PathBuf> {
    repo_dir_candidate(
        env::var_os(REPO_DIR_ENV),
        read_stored_repo_dir(),
        home_dir(),
    )
}

fn validate_repo_dir(repo_dir: &Path) -> Result<(), String> {
    if !repo_dir.is_dir() {
        return Err(format!(
            "Repo path does not exist: {}. Set {REPO_DIR_ENV} or update Settings.",
            repo_dir.display()
        ));
    }

    for script in [ADMIN_SYNC_SCRIPT, DOC_CHECK_SCRIPT] {
        if !repo_dir.join(script).is_file() {
            return Err(format!(
                "Repo path is missing {script}: {}. Set {REPO_DIR_ENV} or update Settings.",
                repo_dir.display()
            ));
        }
    }

    Ok(())
}

fn require_repo_dir() -> Result<PathBuf, String> {
    let repo_dir = configured_repo_dir().ok_or_else(|| {
        format!("No repo path configured. Set {REPO_DIR_ENV} or update Settings.")
    })?;
    validate_repo_dir(&repo_dir)?;
    Ok(repo_dir)
}

#[tauri::command]
fn save_repo_dir(repo_dir: String) -> Result<String, String> {
    let repo_dir = path_from_input(&repo_dir, home_dir().as_deref())
        .ok_or_else(|| "Repo path is empty".to_string())?;
    validate_repo_dir(&repo_dir)?;
    let repo_dir = repo_dir
        .canonicalize()
        .map_err(|e| format!("Repo path could not be resolved: {e}"))?;
    let repo_dir = repo_dir.to_string_lossy().to_string();
    keychain_entry(KEYCHAIN_REPO_ACCOUNT)?
        .set_password(&repo_dir)
        .map_err(|e| e.to_string())?;
    Ok(repo_dir)
}

#[tauri::command]
fn get_repo_dir() -> Option<String> {
    configured_repo_dir().map(|repo_dir| repo_dir.to_string_lossy().to_string())
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

fn notify(app: &AppHandle, title: &str, body: &str) {
    if let Err(e) = app.notification().builder().title(title).body(body).show() {
        eprintln!("notification failed: {e}");
    }
}

// ---------------------------------------------------------------------------
// Windows
// ---------------------------------------------------------------------------

fn focus_or_build(app: &AppHandle, label: &str, url: WebviewUrl, title: &str, size: (f64, f64)) {
    if let Some(window) = app.get_webview_window(label) {
        let _ = window.show();
        let _ = window.set_focus();
        return;
    }
    if let Err(e) = WebviewWindowBuilder::new(app, label, url)
        .title(title)
        .inner_size(size.0, size.1)
        .build()
    {
        eprintln!("failed to open {label} window: {e}");
    }
}

fn open_settings(app: &AppHandle) {
    focus_or_build(
        app,
        "settings",
        WebviewUrl::App("settings.html".into()),
        "App Governance — Settings",
        (500.0, 420.0),
    );
}

fn open_dashboard(app: &AppHandle) {
    let url: Url = DASHBOARD_URL.parse().expect("static dashboard url");
    focus_or_build(
        app,
        "dashboard",
        WebviewUrl::External(url),
        "App Governance — Dashboard",
        (1280.0, 860.0),
    );
}

fn open_live_feed(app: &AppHandle) {
    let Some(key) = read_key() else {
        notify(
            app,
            "App Governance",
            "No operator key stored — open Settings and paste your MCP key first.",
        );
        open_settings(app);
        return;
    };
    let mut url: Url = LIVE_URL.parse().expect("static live url");
    url.query_pairs_mut().append_pair("key", &key);
    focus_or_build(
        app,
        "live",
        WebviewUrl::External(url),
        "App Governance — Live Feed",
        (1100.0, 800.0),
    );
}

// ---------------------------------------------------------------------------
// Script runner (tray -> node script -> exit notification)
// ---------------------------------------------------------------------------

struct ScriptJob {
    /// Human name used in notifications.
    name: &'static str,
    script: &'static str,
    args: &'static [&'static str],
    /// Admin sync exits 2 when the saved session is stale.
    login_hint_on_exit_2: bool,
}

const ADMIN_SYNC: ScriptJob = ScriptJob {
    name: "Admin Sync",
    script: ADMIN_SYNC_SCRIPT,
    args: &[],
    login_hint_on_exit_2: true,
};

const DOC_CHECK: ScriptJob = ScriptJob {
    name: "Doc Check",
    script: DOC_CHECK_SCRIPT,
    args: &["--pull"],
    login_hint_on_exit_2: false,
};

fn run_script(app: AppHandle, job: &'static ScriptJob) {
    tauri::async_runtime::spawn(async move {
        let repo_dir = match require_repo_dir() {
            Ok(repo_dir) => repo_dir,
            Err(e) => {
                notify(&app, "App Governance", &e);
                return;
            }
        };

        let mut cmd = tokio::process::Command::new("node");
        cmd.arg(job.script).args(job.args).current_dir(repo_dir);

        match cmd.status().await {
            Ok(status) if status.success() => {
                notify(
                    &app,
                    "App Governance",
                    &format!("{} completed successfully.", job.name),
                );
            }
            Ok(status) => {
                let code = status.code();
                let mut body = match code {
                    Some(c) => format!("{} failed (exit {c}).", job.name),
                    None => format!("{} was killed by a signal.", job.name),
                };
                if job.login_hint_on_exit_2 && code == Some(2) {
                    body.push_str(" Session expired — run the script with --login to refresh.");
                }
                notify(&app, "App Governance", &body);
            }
            Err(e) => {
                notify(
                    &app,
                    "App Governance",
                    &format!("{} failed to start: {e}", job.name),
                );
            }
        }
    });
}

// ---------------------------------------------------------------------------
// Presence WebSocket task
// ---------------------------------------------------------------------------

async fn presence_loop(app: AppHandle) {
    let mut backoff = BACKOFF_INITIAL_SECS;

    loop {
        // No key stored: idle and retry every minute.
        let Some(key) = read_key() else {
            tokio::time::sleep(Duration::from_secs(NO_KEY_RETRY_SECS)).await;
            continue;
        };

        let mut url: Url = PRESENCE_WS_URL.parse().expect("static presence url");
        url.query_pairs_mut().append_pair("key", &key);

        match tokio_tungstenite::connect_async(url.as_str()).await {
            Ok((mut stream, _response)) => {
                eprintln!("presence: connected");
                backoff = BACKOFF_INITIAL_SECS;

                while let Some(message) = stream.next().await {
                    match message {
                        Ok(msg) if msg.is_text() => {
                            let Ok(text) = msg.into_text() else { continue };
                            if let Some(n) = events::notification_for_event(&text) {
                                notify(&app, &n.title, &n.body);
                            }
                        }
                        Ok(_) => {} // binary / ping / pong / close frames
                        Err(e) => {
                            eprintln!("presence: stream error: {e}");
                            break;
                        }
                    }
                }
                eprintln!("presence: disconnected, reconnecting in {backoff}s");
            }
            Err(e) => {
                eprintln!("presence: connect failed ({e}), retrying in {backoff}s");
            }
        }

        tokio::time::sleep(Duration::from_secs(backoff)).await;
        backoff = (backoff * 2).min(BACKOFF_CAP_SECS);
    }
}

// ---------------------------------------------------------------------------
// Tray
// ---------------------------------------------------------------------------

fn build_tray(app: &tauri::App) -> tauri::Result<()> {
    let dashboard = MenuItem::with_id(app, "dashboard", "Open Dashboard", true, None::<&str>)?;
    let live = MenuItem::with_id(app, "live", "Open Live Feed", true, None::<&str>)?;
    let admin_sync = MenuItem::with_id(app, "admin-sync", "Run Admin Sync", true, None::<&str>)?;
    let doc_check = MenuItem::with_id(app, "doc-check", "Run Doc Check", true, None::<&str>)?;
    let settings = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let sep2 = PredefinedMenuItem::separator(app)?;

    let menu = Menu::with_items(
        app,
        &[
            &dashboard,
            &live,
            &sep1,
            &admin_sync,
            &doc_check,
            &sep2,
            &settings,
            &quit,
        ],
    )?;

    let mut tray = TrayIconBuilder::with_id("app-governance-tray")
        .menu(&menu)
        .tooltip("App Governance");

    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    } else {
        tray = tray.title("AG");
    }

    tray.on_menu_event(|app, event| match event.id.as_ref() {
        "dashboard" => open_dashboard(app),
        "live" => open_live_feed(app),
        "admin-sync" => run_script(app.clone(), &ADMIN_SYNC),
        "doc-check" => run_script(app.clone(), &DOC_CHECK),
        "settings" => open_settings(app),
        "quit" => app.exit(0),
        other => eprintln!("unknown tray menu id: {other}"),
    })
    .build(app)?;

    Ok(())
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            save_key,
            get_key_present,
            save_repo_dir,
            get_repo_dir
        ])
        .setup(|app| {
            build_tray(app)?;

            // First run: no key stored yet -> show settings.
            if read_key().is_none() {
                open_settings(app.handle());
            }

            tauri::async_runtime::spawn(presence_loop(app.handle().clone()));
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building App Governance")
        .run(|_app, event| {
            // Tray app: stay alive when all windows are closed.
            if let tauri::RunEvent::ExitRequested {
                api, code: None, ..
            } = event
            {
                api.prevent_exit();
            }
        });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn repo_dir_prefers_env_then_saved_then_home_default() {
        let home = Some(PathBuf::from("/Users/operator"));

        assert_eq!(
            repo_dir_candidate(
                Some(OsString::from("/tmp/repo")),
                Some("/saved/repo".to_string()),
                home.clone(),
            ),
            Some(PathBuf::from("/tmp/repo"))
        );
        assert_eq!(
            repo_dir_candidate(None, Some("/saved/repo".to_string()), home.clone()),
            Some(PathBuf::from("/saved/repo"))
        );
        assert_eq!(
            repo_dir_candidate(None, None, home),
            Some(PathBuf::from(
                "/Users/operator/Code/create-something-monorepo"
            ))
        );
    }

    #[test]
    fn repo_dir_expands_home_prefix() {
        let home = PathBuf::from("/Users/operator");
        assert_eq!(
            path_from_input("~/src/create-something-monorepo", Some(&home)),
            Some(PathBuf::from(
                "/Users/operator/src/create-something-monorepo"
            ))
        );
        assert_eq!(path_from_input("  ", Some(&home)), None);
    }
}
