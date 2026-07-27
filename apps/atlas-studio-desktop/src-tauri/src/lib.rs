use std::{
    env,
    fs::OpenOptions,
    io::{Read, Write},
    net::{TcpListener, TcpStream, ToSocketAddrs},
    path::{Component, Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::{Arc, Mutex},
    thread,
    time::{Duration, Instant},
};

use serde::Deserialize;
use serde_json::Value;
use sha2::{Digest, Sha256};
use tauri::{Manager, WebviewWindow};

const HOST: &str = "127.0.0.1";
const DEFAULT_PORT: u16 = 5198;
const READY_TIMEOUT: Duration = Duration::from_secs(90);

type StudioChild = Arc<Mutex<Option<Child>>>;

struct RuntimeState {
    port: u16,
}

fn atlas_home(app: &tauri::AppHandle) -> Result<PathBuf, tauri::Error> {
    if let Some(value) = env::var_os("CREATE_SOMETHING_ATLAS_HOME") {
        return Ok(PathBuf::from(value));
    }
    app.path().app_data_dir()
}

fn choose_port() -> u16 {
    (DEFAULT_PORT..DEFAULT_PORT + 100)
        .find(|port| TcpListener::bind((HOST, *port)).is_ok())
        .unwrap_or(DEFAULT_PORT)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeManifest {
    schema: String,
    language: String,
    runtime_version: String,
    server_entry: String,
    interaction_entry: String,
    files: Vec<RuntimeManifestFile>,
}

#[derive(Debug, Deserialize)]
struct RuntimeManifestFile {
    path: String,
    sha256: String,
}

fn sha256_file(path: &Path) -> std::io::Result<String> {
    let bytes = std::fs::read(path)?;
    let digest = Sha256::digest(bytes);
    Ok(digest.iter().map(|byte| format!("{byte:02x}")).collect())
}

fn validated_runtime(resource_dir: &Path) -> std::io::Result<(RuntimeManifest, String)> {
    let manifest_path = resource_dir.join("runtime-build.json");
    let manifest_bytes = std::fs::read(&manifest_path)?;
    let manifest: RuntimeManifest = serde_json::from_slice(&manifest_bytes)
        .map_err(|error| std::io::Error::new(std::io::ErrorKind::InvalidData, error.to_string()))?;
    if manifest.schema != "create-something/atlas-studio-runtime@1"
        || manifest.language != "create-something/control"
        || manifest.runtime_version != "0.1.0"
    {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            "The packaged Atlas runtime is incompatible.",
        ));
    }
    for file in &manifest.files {
        let relative = Path::new(&file.path);
        if relative.is_absolute()
            || relative
                .components()
                .any(|component| !matches!(component, Component::Normal(_)))
        {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                "The packaged Atlas runtime manifest contains an invalid path.",
            ));
        }
        let actual = sha256_file(&resource_dir.join(relative))?;
        if actual != file.sha256 {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                format!("Packaged Atlas runtime integrity failed for {}.", file.path),
            ));
        }
    }
    for required in [
        "runtime/bun",
        manifest.server_entry.as_str(),
        manifest.interaction_entry.as_str(),
        "server/client/app.js",
        "server/client/app.css",
    ] {
        if !manifest.files.iter().any(|file| file.path == required) {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                format!("The packaged Atlas runtime is missing {required}."),
            ));
        }
    }
    let manifest_hash = Sha256::digest(manifest_bytes)
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect();
    Ok((manifest, manifest_hash))
}

fn write_runtime_file(
    home: &Path,
    resource_dir: &Path,
    manifest: &RuntimeManifest,
    manifest_hash: &str,
    port: u16,
    process_id: u32,
) {
    let payload = serde_json::json!({
        "host": HOST,
        "port": port,
        "url": format!("http://{HOST}:{port}/"),
        "pid": process_id,
        "runtimeRoot": resource_dir,
        "serverEntry": resource_dir.join(&manifest.server_entry),
        "interactionPath": resource_dir.join(&manifest.interaction_entry),
        "runtimeManifestSha256": manifest_hash,
        "language": manifest.language,
        "runtimeVersion": manifest.runtime_version,
    });
    if let Ok(serialized) = serde_json::to_string_pretty(&payload) {
        let _ = std::fs::write(home.join("runtime.json"), format!("{serialized}\n"));
    }
}

fn write_runtime_error(home: &Path, error: &std::io::Error) {
    let payload = serde_json::json!({
        "code": "PACKAGED_RUNTIME_INVALID",
        "error": error.to_string(),
    });
    let _ = std::fs::create_dir_all(home);
    if let Ok(serialized) = serde_json::to_string_pretty(&payload) {
        let _ = std::fs::write(
            home.join("runtime-error.json"),
            format!("{serialized}\n"),
        );
    }
}

fn start_studio_server(resource_dir: &Path, home: &Path, port: u16) -> std::io::Result<Child> {
    let (manifest, manifest_hash) = validated_runtime(resource_dir)?;
    let bun = resource_dir.join("runtime").join("bun");
    let server_entry = resource_dir.join(&manifest.server_entry);
    let server_root = server_entry.parent().ok_or_else(|| {
        std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            "Atlas server entry has no parent.",
        )
    })?;
    let interaction_path = resource_dir.join(&manifest.interaction_entry);
    std::fs::create_dir_all(home)?;
    let log = OpenOptions::new()
        .create(true)
        .append(true)
        .open(home.join("server.log"))?;
    let log_for_stderr = log.try_clone()?;

    let child = Command::new(bun)
        .arg(&server_entry)
        .current_dir(server_root)
        .env("CREATE_SOMETHING_ATLAS_HOME", home)
        .env("PATH", "/usr/bin:/bin")
        .env_remove("OPENAI_API_KEY")
        .args([
            "serve",
            "--host",
            HOST,
            "--port",
            &port.to_string(),
            "--governed-interaction",
            &interaction_path.to_string_lossy(),
        ])
        .stdin(Stdio::null())
        .stdout(Stdio::from(log))
        .stderr(Stdio::from(log_for_stderr))
        .spawn()?;

    write_runtime_file(
        home,
        resource_dir,
        &manifest,
        &manifest_hash,
        port,
        child.id(),
    );
    let _ = std::fs::remove_file(home.join("runtime-error.json"));
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
            if let Ok(url) = tauri::Url::parse(&format!("http://{HOST}:{port}/")) {
                let _ = window.navigate(url);
            }
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
            let resource_dir = app.path().resource_dir()?;
            let home = atlas_home(app.handle())?;
            match start_studio_server(&resource_dir, &home, port) {
                Ok(child) => {
                    if let Ok(mut slot) = setup_child.lock() {
                        *slot = Some(child);
                    }
                }
                Err(error) => {
                    write_runtime_error(&home, &error);
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn packaged_runtime_integrity_fails_closed_after_tampering() {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock")
            .as_nanos();
        let root = env::temp_dir().join(format!(
            "atlas-runtime-integrity-{}-{nonce}",
            std::process::id()
        ));
        let required = [
            "runtime/bun",
            "server/cli.js",
            "interactions/marketplace/governed-interaction.json",
            "server/client/app.js",
            "server/client/app.css",
        ];
        let mut files = Vec::new();
        for relative in required {
            let path = root.join(relative);
            std::fs::create_dir_all(path.parent().expect("fixture parent"))
                .expect("fixture directory");
            std::fs::write(&path, format!("fixture:{relative}")).expect("fixture file");
            files.push(serde_json::json!({
                "path": relative,
                "sha256": sha256_file(&path).expect("fixture digest"),
                "bytes": std::fs::metadata(&path).expect("fixture metadata").len(),
            }));
        }
        let manifest = serde_json::json!({
            "schema": "create-something/atlas-studio-runtime@1",
            "platform": "test",
            "architecture": "test",
            "language": "create-something/control",
            "runtimeVersion": "0.1.0",
            "serverEntry": "server/cli.js",
            "interactionEntry": "interactions/marketplace/governed-interaction.json",
            "files": files,
        });
        std::fs::write(
            root.join("runtime-build.json"),
            serde_json::to_vec_pretty(&manifest).expect("fixture manifest"),
        )
        .expect("manifest file");

        assert!(validated_runtime(&root).is_ok());
        std::fs::write(root.join("server/cli.js"), "tampered").expect("tampered fixture");
        let error = validated_runtime(&root).expect_err("tampered runtime must fail");
        assert_eq!(error.kind(), std::io::ErrorKind::InvalidData);
        assert!(error.to_string().contains("integrity failed"));

        std::fs::remove_dir_all(root).expect("fixture cleanup");
    }
}
