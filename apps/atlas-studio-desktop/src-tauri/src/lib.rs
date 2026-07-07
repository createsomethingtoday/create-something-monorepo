use std::{
    env,
    fs::OpenOptions,
    io::{Read, Write},
    net::{TcpListener, TcpStream, ToSocketAddrs},
    path::PathBuf,
    process::{Child, Command, Stdio},
    sync::{Arc, Mutex},
    thread,
    time::{Duration, Instant},
};

use serde_json::Value;
use tauri::{Manager, WebviewWindow};

const HOST: &str = "127.0.0.1";
const DEFAULT_PORT: u16 = 5198;
const READY_TIMEOUT: Duration = Duration::from_secs(90);

type StudioChild = Arc<Mutex<Option<Child>>>;

struct RuntimeState {
    port: u16,
}

fn workspace_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .and_then(|path| path.parent())
        .and_then(|path| path.parent())
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("."))
}

fn atlas_home() -> PathBuf {
    if let Some(value) = env::var_os("CREATE_SOMETHING_ATLAS_HOME") {
        return PathBuf::from(value);
    }

    env::var_os("HOME")
        .map(PathBuf::from)
        .map(|home| {
            home.join("Library")
                .join("Application Support")
                .join("CREATE SOMETHING")
                .join("Atlas Studio")
        })
        .unwrap_or_else(|| workspace_root().join(".atlas-studio"))
}

fn nvm_bin_dirs() -> Vec<PathBuf> {
    let Some(home) = env::var_os("HOME").map(PathBuf::from) else {
        return Vec::new();
    };
    let versions_dir = home.join(".nvm").join("versions").join("node");
    let Ok(entries) = std::fs::read_dir(versions_dir) else {
        return Vec::new();
    };

    let mut versions = entries
        .filter_map(Result::ok)
        .map(|entry| entry.path().join("bin"))
        .filter(|path| path.join("node").exists())
        .collect::<Vec<_>>();
    versions.sort();
    versions.reverse();
    versions
}

fn pnpm_path() -> PathBuf {
    nvm_bin_dirs()
        .into_iter()
        .map(|bin| bin.join("pnpm"))
        .find(|candidate| candidate.exists())
        .or_else(|| {
            [
                "/opt/homebrew/bin/pnpm",
                "/usr/local/bin/pnpm",
                "/usr/bin/pnpm",
            ]
            .iter()
            .map(PathBuf::from)
            .find(|candidate| candidate.exists())
        })
        .unwrap_or_else(|| PathBuf::from("pnpm"))
}

fn node_path() -> PathBuf {
    nvm_bin_dirs()
        .into_iter()
        .map(|bin| bin.join("node"))
        .find(|candidate| candidate.exists())
        .or_else(|| {
            [
                "/opt/homebrew/bin/node",
                "/usr/local/bin/node",
                "/usr/bin/node",
            ]
            .iter()
            .map(PathBuf::from)
            .find(|candidate| candidate.exists())
        })
        .unwrap_or_else(|| PathBuf::from("node"))
}

fn gui_path() -> String {
    let mut paths = pnpm_path()
        .parent()
        .map(|path| vec![path.to_string_lossy().to_string()])
        .unwrap_or_default();

    paths.extend(
        [
            "/opt/homebrew/bin",
            "/usr/local/bin",
            "/usr/bin",
            "/bin",
            "/usr/sbin",
            "/sbin",
        ]
        .iter()
        .map(|path| path.to_string()),
    );

    paths.join(":")
}

fn choose_port() -> u16 {
    (DEFAULT_PORT..DEFAULT_PORT + 100)
        .find(|port| TcpListener::bind((HOST, *port)).is_ok())
        .unwrap_or(DEFAULT_PORT)
}

fn write_runtime_file(home: &std::path::Path, port: u16, process_id: u32) {
    let payload = format!(
        "{{\n  \"host\": \"{HOST}\",\n  \"port\": {port},\n  \"url\": \"http://{HOST}:{port}/\",\n  \"pid\": {process_id}\n}}\n"
    );
    let _ = std::fs::write(home.join("runtime.json"), payload);
}

fn start_studio_server(port: u16) -> std::io::Result<Child> {
    let root = workspace_root();
    let home = atlas_home();
    let _ = std::fs::create_dir_all(&home);
    let log = OpenOptions::new()
        .create(true)
        .append(true)
        .open(home.join("server.log"))?;
    let log_for_stderr = log.try_clone()?;

    let cli_path = root
        .join("packages")
        .join("interaction-atlas-mcp")
        .join("dist")
        .join("studio")
        .join("cli.js");
    let mut command = if cli_path.exists() {
        let mut command = Command::new(node_path());
        command.arg(cli_path);
        command
    } else {
        let mut command = Command::new(pnpm_path());
        command.args([
            "--filter",
            "@create-something/interaction-atlas-mcp",
            "studio",
        ]);
        command
    };

    let child = command
        .current_dir(root)
        .env("CREATE_SOMETHING_ATLAS_HOME", &home)
        .env("PATH", gui_path())
        .args(["serve", "--host", HOST, "--port", &port.to_string()])
        .stdin(Stdio::null())
        .stdout(Stdio::from(log))
        .stderr(Stdio::from(log_for_stderr))
        .spawn()?;

    write_runtime_file(&home, port, child.id());
    Ok(child)
}

fn wait_for_server(port: u16) -> bool {
    let deadline = Instant::now() + READY_TIMEOUT;
    let socket = format!("{HOST}:{port}");

    while Instant::now() < deadline {
        if let Ok(mut addrs) = socket.to_socket_addrs() {
            if let Some(addr) = addrs.next() {
                if TcpStream::connect_timeout(&addr, Duration::from_millis(500)).is_ok() {
                    return true;
                }
            }
        }

        thread::sleep(Duration::from_millis(400));
    }

    false
}

fn redirect_when_ready(window: WebviewWindow, port: u16) {
    thread::spawn(move || {
        if wait_for_server(port) {
            let _ = window.eval(&format!("window.location.replace('http://{HOST}:{port}/')"));
        } else {
            let _ = window.eval("document.dispatchEvent(new CustomEvent('atlas-studio-timeout'))");
        }
    });
}

fn stop_studio_server(child: &StudioChild) {
    let Some(mut process) = child.lock().ok().and_then(|mut guard| guard.take()) else {
        return;
    };

    let _ = process.kill();
    let _ = process.wait();
}

fn encode_path_segment(value: &str) -> String {
    let mut encoded = String::new();
    for byte in value.bytes() {
        let is_unreserved =
            byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'.' | b'_' | b'~');
        if is_unreserved {
            encoded.push(byte as char);
        } else {
            encoded.push_str(&format!("%{byte:02X}"));
        }
    }
    encoded
}

fn studio_json_request(
    port: u16,
    method: &str,
    path: &str,
    body: Option<Value>,
) -> Result<Value, String> {
    let payload = body
        .map(|value| serde_json::to_string(&value).map_err(|error| error.to_string()))
        .transpose()?
        .unwrap_or_default();
    let request = format!(
        "{method} {path} HTTP/1.1\r\nHost: {HOST}:{port}\r\nConnection: close\r\nContent-Type: application/json\r\nContent-Length: {}\r\nX-Atlas-Story-Source: tauri\r\n\r\n{payload}",
        payload.len()
    );
    let mut stream = TcpStream::connect((HOST, port)).map_err(|error| error.to_string())?;
    stream
        .set_read_timeout(Some(Duration::from_secs(30)))
        .map_err(|error| error.to_string())?;
    stream
        .set_write_timeout(Some(Duration::from_secs(30)))
        .map_err(|error| error.to_string())?;
    stream
        .write_all(request.as_bytes())
        .map_err(|error| error.to_string())?;

    let mut response = String::new();
    stream
        .read_to_string(&mut response)
        .map_err(|error| error.to_string())?;
    let (head, body) = response
        .split_once("\r\n\r\n")
        .ok_or_else(|| "Atlas Studio returned a malformed HTTP response.".to_string())?;
    let status = head
        .lines()
        .next()
        .and_then(|line| line.split_whitespace().nth(1))
        .and_then(|value| value.parse::<u16>().ok())
        .ok_or_else(|| "Atlas Studio returned a response without a status code.".to_string())?;
    if status >= 400 {
        return Err(format!("Atlas Studio request failed with {status}: {body}"));
    }
    if body.trim().is_empty() {
        return Ok(Value::Null);
    }
    serde_json::from_str(body).map_err(|error| error.to_string())
}

fn story_path(session_id: &str, suffix: &str) -> String {
    format!(
        "/api/sessions/{}/story{suffix}",
        encode_path_segment(session_id)
    )
}

#[tauri::command]
fn atlas_story_get(
    state: tauri::State<'_, RuntimeState>,
    session_id: String,
) -> Result<Value, String> {
    studio_json_request(state.port, "GET", &story_path(&session_id, ""), None)
}

#[tauri::command]
fn atlas_story_focus(
    state: tauri::State<'_, RuntimeState>,
    session_id: String,
    payload: Value,
) -> Result<Value, String> {
    studio_json_request(
        state.port,
        "POST",
        &story_path(&session_id, ""),
        Some(payload),
    )
}

#[tauri::command]
fn atlas_story_clear(
    state: tauri::State<'_, RuntimeState>,
    session_id: String,
) -> Result<Value, String> {
    studio_json_request(state.port, "DELETE", &story_path(&session_id, ""), None)
}

#[tauri::command]
fn atlas_story_question_add(
    state: tauri::State<'_, RuntimeState>,
    session_id: String,
    payload: Value,
) -> Result<Value, String> {
    studio_json_request(
        state.port,
        "POST",
        &story_path(&session_id, "/questions"),
        Some(payload),
    )
}

#[tauri::command]
fn atlas_story_step_activate(
    state: tauri::State<'_, RuntimeState>,
    session_id: String,
    step_id: String,
) -> Result<Value, String> {
    studio_json_request(
        state.port,
        "POST",
        &format!(
            "{}/activate",
            story_path(
                &session_id,
                &format!("/steps/{}", encode_path_segment(&step_id))
            )
        ),
        None,
    )
}

#[tauri::command]
fn atlas_story_step_next(
    state: tauri::State<'_, RuntimeState>,
    session_id: String,
) -> Result<Value, String> {
    studio_json_request(state.port, "POST", &story_path(&session_id, "/next"), None)
}

#[tauri::command]
fn atlas_story_step_previous(
    state: tauri::State<'_, RuntimeState>,
    session_id: String,
) -> Result<Value, String> {
    studio_json_request(
        state.port,
        "POST",
        &story_path(&session_id, "/previous"),
        None,
    )
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let studio_child: StudioChild = Arc::new(Mutex::new(None));
    let setup_child = Arc::clone(&studio_child);
    let close_child = Arc::clone(&studio_child);
    let exit_child = Arc::clone(&studio_child);
    let port = choose_port();

    let app = tauri::Builder::default()
        .manage(RuntimeState { port })
        .invoke_handler(tauri::generate_handler![
            atlas_story_get,
            atlas_story_focus,
            atlas_story_clear,
            atlas_story_question_add,
            atlas_story_step_activate,
            atlas_story_step_next,
            atlas_story_step_previous
        ])
        .setup(move |app| {
            if let Ok(child) = start_studio_server(port) {
                if let Ok(mut slot) = setup_child.lock() {
                    *slot = Some(child);
                }
            }

            if let Some(window) = app.get_webview_window("main") {
                redirect_when_ready(window, port);
            }

            Ok(())
        })
        .on_window_event(move |_window, event| {
            if matches!(event, tauri::WindowEvent::Destroyed) {
                stop_studio_server(&close_child);
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building CREATE SOMETHING Atlas Studio");

    app.run(move |_app_handle, event| {
        if matches!(
            event,
            tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit
        ) {
            stop_studio_server(&exit_child);
        }
    });
}
