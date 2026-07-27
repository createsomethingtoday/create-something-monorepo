use std::{
    env,
    fs::{File, OpenOptions},
    io::{Read, Write},
    net::{TcpListener, TcpStream, ToSocketAddrs},
    os::unix::{fs::OpenOptionsExt, process::CommandExt},
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::{Arc, Mutex},
    thread,
    time::{Duration, Instant},
};

use tauri::{Manager, WebviewWindow};

const HOST: &str = "127.0.0.1";
const DEFAULT_PORT: u16 = 5290;
const READY_TIMEOUT: Duration = Duration::from_secs(90);

type ServerChild = Arc<Mutex<Option<Child>>>;

fn home_dir() -> Option<PathBuf> {
    env::var_os("HOME").map(PathBuf::from)
}

fn nvm_bin_dirs() -> Vec<PathBuf> {
    let Some(home) = home_dir() else {
        return Vec::new();
    };
    let versions_dir = home.join(".nvm").join("versions").join("node");
    let Ok(entries) = std::fs::read_dir(versions_dir) else {
        return Vec::new();
    };
    let mut paths = entries
        .filter_map(Result::ok)
        .map(|entry| entry.path().join("bin"))
        .filter(|path| path.is_dir())
        .collect::<Vec<_>>();
    paths.sort();
    paths.reverse();
    paths
}

fn command_dirs() -> Vec<PathBuf> {
    let mut paths = nvm_bin_dirs();
    if let Some(home) = home_dir() {
        paths.push(home.join(".local").join("bin"));
        paths.push(home.join(".bun").join("bin"));
    }
    paths.extend([
        PathBuf::from("/opt/homebrew/bin"),
        PathBuf::from("/usr/local/bin"),
        PathBuf::from("/usr/bin"),
        PathBuf::from("/bin"),
        PathBuf::from("/usr/sbin"),
        PathBuf::from("/sbin"),
    ]);
    paths
}

fn discover_codex() -> Option<PathBuf> {
    if let Some(configured) = env::var_os("CLIENT_WORKSPACE_CODEX_COMMAND") {
        let candidate = PathBuf::from(configured);
        if candidate.is_file() {
            return Some(candidate);
        }
    }
    command_dirs()
        .into_iter()
        .map(|directory| directory.join("codex"))
        .find(|candidate| candidate.is_file())
}

fn gui_path(codex: Option<&Path>) -> String {
    let mut paths = Vec::new();
    if let Some(parent) = codex.and_then(Path::parent) {
        paths.push(parent.to_path_buf());
    }
    paths.extend(command_dirs());
    paths.sort();
    paths.dedup();
    env::join_paths(paths)
        .unwrap_or_default()
        .to_string_lossy()
        .to_string()
}

fn generate_capability() -> std::io::Result<String> {
    let mut bytes = [0_u8; 32];
    File::open("/dev/urandom")?.read_exact(&mut bytes)?;
    Ok(bytes.iter().map(|byte| format!("{byte:02x}")).collect())
}

fn write_runtime_file(
    app_home: &Path,
    port: u16,
    process_id: u32,
    codex_found: bool,
) -> std::io::Result<()> {
    let payload = format!(
        "{{\n  \"host\": \"{HOST}\",\n  \"port\": {port},\n  \"url\": \"http://{HOST}:{port}/\",\n  \"pid\": {process_id},\n  \"codexFound\": {codex_found}\n}}\n"
    );
    let destination = app_home.join("runtime.json");
    let temporary = app_home.join(format!("runtime.json.{process_id}.tmp"));
    let mut file = OpenOptions::new()
        .create_new(true)
        .write(true)
        .mode(0o600)
        .open(&temporary)?;
    file.write_all(payload.as_bytes())?;
    file.sync_all()?;
    std::fs::rename(temporary, destination)?;
    Ok(())
}

fn stop_stale_server(app_home: &Path, server_entry: &Path) {
    let runtime_path = app_home.join("runtime.json");
    let process_id = std::fs::read_to_string(&runtime_path)
        .ok()
        .and_then(|contents| serde_json::from_str::<serde_json::Value>(&contents).ok())
        .and_then(|runtime| runtime.get("pid").and_then(serde_json::Value::as_u64))
        .and_then(|value| i32::try_from(value).ok());
    if let Some(process_id) = process_id {
        let command = Command::new("/bin/ps")
            .args(["-p", &process_id.to_string(), "-o", "command="])
            .output()
            .ok()
            .filter(|output| output.status.success())
            .map(|output| String::from_utf8_lossy(&output.stdout).to_string());
        if command
            .as_deref()
            .is_some_and(|value| value.contains(&server_entry.to_string_lossy().to_string()))
        {
            unsafe {
                libc::kill(-process_id, libc::SIGTERM);
            }
            thread::sleep(Duration::from_millis(250));
            unsafe {
                libc::kill(-process_id, libc::SIGKILL);
            }
        }
    }
    let _ = std::fs::remove_file(runtime_path);
}

fn start_server(
    resource_dir: &Path,
    app_home: &Path,
    port: u16,
    capability: &str,
) -> std::io::Result<Child> {
    let bun = resource_dir.join("runtime").join("bun");
    let server_root = resource_dir.join("server");
    let server_entry = server_root.join("index.js");
    let trust_keyring = resource_dir
        .join("trust")
        .join("client-workspace-trust-keyring.json");
    if !bun.is_file() || !server_entry.is_file() || !trust_keyring.is_file() {
        return Err(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "The packaged workspace runtime is incomplete.",
        ));
    }

    std::fs::create_dir_all(app_home)?;
    stop_stale_server(app_home, &server_entry);
    let log = OpenOptions::new()
        .create(true)
        .append(true)
        .mode(0o600)
        .open(app_home.join("server.log"))?;
    let log_for_stderr = log.try_clone()?;
    let codex = discover_codex();
    let mut command = Command::new(bun);
    command
        .env_clear()
        .arg(server_entry)
        .current_dir(server_root)
        .env("HOST", HOST)
        .env("PORT", port.to_string())
        .env("ORIGIN", format!("http://{HOST}:{port}"))
        .env("NODE_ENV", "production")
        .env("CLIENT_WORKSPACE_DESKTOP", "1")
        .env("CLIENT_WORKSPACE_CAPABILITY_TOKEN", capability)
        .env(
            "CLIENT_WORKSPACE_LOOPBACK_ORIGIN",
            format!("http://{HOST}:{port}"),
        )
        .env("CLIENT_WORKSPACE_STATE_ROOT", app_home.join("state"))
        .env("CLIENT_WORKSPACE_MANAGED_ROOT", app_home.join("workspaces"))
        .env("CLIENT_WORKSPACE_TRUST_KEYRING_FILE", trust_keyring)
        .env("PATH", gui_path(codex.as_deref()))
        .process_group(0)
        .stdin(Stdio::null())
        .stdout(Stdio::from(log))
        .stderr(Stdio::from(log_for_stderr));
    for name in [
        "HOME",
        "TMPDIR",
        "USER",
        "LOGNAME",
        "LANG",
        "LC_ALL",
        "CODEX_HOME",
        "CODEX_INTERNAL_ORIGINATOR_OVERRIDE",
    ] {
        if let Some(value) = env::var_os(name) {
            command.env(name, value);
        }
    }
    if let Some(codex) = codex.as_ref() {
        command.env("CLIENT_WORKSPACE_CODEX_COMMAND", codex);
    }
    let mut child = command.spawn()?;
    if let Err(error) = write_runtime_file(app_home, port, child.id(), codex.is_some()) {
        let _ = child.kill();
        let _ = child.wait();
        return Err(error);
    }
    Ok(child)
}

fn client_workspace_home(app: &tauri::AppHandle) -> Result<PathBuf, tauri::Error> {
    if let Some(configured) = env::var_os("CREATE_SOMETHING_CLIENT_WORKSPACE_HOME") {
        return Ok(PathBuf::from(configured));
    }
    app.path().app_data_dir()
}

fn wait_for_server(process: &mut Child, port: u16) -> bool {
    let deadline = Instant::now() + READY_TIMEOUT;
    let socket = format!("{HOST}:{port}");
    while Instant::now() < deadline {
        if process.try_wait().ok().flatten().is_some() {
            return false;
        }
        if let Ok(mut addresses) = socket.to_socket_addrs() {
            if let Some(address) = addresses.next() {
                if TcpStream::connect_timeout(&address, Duration::from_millis(400)).is_ok() {
                    return true;
                }
            }
        }
        thread::sleep(Duration::from_millis(250));
    }
    false
}

fn redirect_ready(window: &WebviewWindow, port: u16, capability: &str) {
    let _ = window.eval(&format!(
        "window.location.replace('http://{HOST}:{port}/?cap={capability}')"
    ));
}

fn stop_server(child: &ServerChild) {
    let Some(mut process) = child.lock().ok().and_then(|mut guard| guard.take()) else {
        return;
    };
    let process_group = -(process.id() as i32);
    unsafe {
        libc::kill(process_group, libc::SIGTERM);
    }
    let deadline = Instant::now() + Duration::from_secs(3);
    while Instant::now() < deadline {
        if process.try_wait().ok().flatten().is_some() {
            return;
        }
        thread::sleep(Duration::from_millis(50));
    }
    unsafe {
        libc::kill(process_group, libc::SIGKILL);
    }
    let _ = process.wait();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let server_child: ServerChild = Arc::new(Mutex::new(None));
    let setup_child = Arc::clone(&server_child);
    let close_child = Arc::clone(&server_child);
    let exit_child = Arc::clone(&server_child);

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .setup(move |app| {
            let resource_dir = app.path().resource_dir()?;
            let app_home = client_workspace_home(app.handle())?;
            let capability = generate_capability()?;
            let mut ready_port = None;
            for port in DEFAULT_PORT..DEFAULT_PORT + 100 {
                if TcpListener::bind((HOST, port)).is_err() {
                    continue;
                }
                let Ok(mut child) = start_server(&resource_dir, &app_home, port, &capability)
                else {
                    continue;
                };
                if wait_for_server(&mut child, port) {
                    if let Ok(mut slot) = setup_child.lock() {
                        *slot = Some(child);
                    }
                    ready_port = Some(port);
                    break;
                }
            }
            if let Some(window) = app.get_webview_window("main") {
                if let Some(port) = ready_port {
                    redirect_ready(&window, port, &capability);
                } else {
                    let _ = window.eval(
                        "document.dispatchEvent(new CustomEvent('client-workspace-timeout'))",
                    );
                }
            }
            Ok(())
        })
        .on_window_event(move |_window, event| {
            if matches!(event, tauri::WindowEvent::Destroyed) {
                stop_server(&close_child);
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building CREATE SOMETHING Client Workspace");

    app.run(move |_app_handle, event| {
        if matches!(
            event,
            tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit
        ) {
            stop_server(&exit_child);
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn gui_path_contains_system_command_locations_without_credentials() {
        let path = gui_path(None);
        assert!(path.contains("/usr/bin"));
        assert!(!path.contains("auth.json"));
    }

    #[test]
    fn launch_capability_is_256_bits_of_lowercase_hex() {
        let capability = generate_capability().expect("capability");
        assert_eq!(capability.len(), 64);
        assert!(capability.chars().all(|value| value.is_ascii_hexdigit()));
        assert_eq!(capability, capability.to_lowercase());
    }
}
