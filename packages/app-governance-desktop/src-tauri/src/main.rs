// Prevents an extra console window on Windows in release; harmless on macOS.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod events;

use std::time::Duration;

use futures_util::StreamExt;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Manager, Url, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_notification::NotificationExt;

const KEYCHAIN_SERVICE: &str = "app-governance";
const KEYCHAIN_ACCOUNT: &str = "mcp-key";

const REPO_DIR: &str = "/Users/micahjohnson/Code/create-something-monorepo";
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

fn keychain_entry() -> Result<keyring::Entry, String> {
	keyring::Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT).map_err(|e| e.to_string())
}

fn read_key() -> Option<String> {
	let entry = keychain_entry().ok()?;
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
	keychain_entry()?.set_password(key).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_key_present() -> bool {
	read_key().is_some()
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

fn focus_or_build(
	app: &AppHandle,
	label: &str,
	url: WebviewUrl,
	title: &str,
	size: (f64, f64),
) {
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
		(460.0, 340.0),
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
		let mut cmd = tokio::process::Command::new("node");
		cmd.arg(job.script).args(job.args).current_dir(REPO_DIR);

		match cmd.status().await {
			Ok(status) if status.success() => {
				notify(&app, "App Governance", &format!("{} completed successfully.", job.name));
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
		&[&dashboard, &live, &sep1, &admin_sync, &doc_check, &sep2, &settings, &quit],
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
		.invoke_handler(tauri::generate_handler![save_key, get_key_present])
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
			if let tauri::RunEvent::ExitRequested { api, code: None, .. } = event {
				api.prevent_exit();
			}
		});
}
