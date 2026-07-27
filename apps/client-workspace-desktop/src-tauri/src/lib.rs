use std::{
    env,
    fs::OpenOptions,
    net::{TcpListener, TcpStream, ToSocketAddrs},
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

fn choose_port() -> u16 {
    (DEFAULT_PORT..DEFAULT_PORT + 100)
        .find(|port| TcpListener::bind((HOST, *port)).is_ok())
        .unwrap_or(DEFAULT_PORT)
}

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

fn write_runtime_file(app_home: &Path, port: u16, process_id: u32, codex_found: bool) {
    let payload = format!(
        "{{\n  \"host\": \"{HOST}\",\n  \"port\": {port},\n  \"url\": \"http://{HOST}:{port}/\",\n  \"pid\": {process_id},\n  \"codexFound\": {codex_found}\n}}\n"
    );
    let _ = std::fs::write(app_home.join("runtime.json"), payload);
}

fn start_server(resource_dir: &Path, app_home: &Path, port: u16) -> std::io::Result<Child> {
    let bun = resource_dir.join("runtime").join("bun");
    let server_root = resource_dir.join("server");
    let server_entry = server_root.join("index.js");
    let trust_root = resource_dir
        .join("trust")
        .join("client-workspace-signing-public.pem");
    if !bun.is_file() || !server_entry.is_file() || !trust_root.is_file() {
        return Err(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "The packaged workspace runtime is incomplete.",
        ));
    }

    std::fs::create_dir_all(app_home)?;
    let log = OpenOptions::new()
        .create(true)
        .append(true)
        .open(app_home.join("server.log"))?;
    let log_for_stderr = log.try_clone()?;
    let codex = discover_codex();
    let mut command = Command::new(bun);
    command
        .arg(server_entry)
        .current_dir(server_root)
        .env("HOST", HOST)
        .env("PORT", port.to_string())
        .env("ORIGIN", format!("http://{HOST}:{port}"))
        .env("NODE_ENV", "production")
        .env("CLIENT_WORKSPACE_DESKTOP", "1")
        .env("CLIENT_WORKSPACE_STATE_ROOT", app_home.join("state"))
        .env("CLIENT_WORKSPACE_MANAGED_ROOT", app_home.join("workspaces"))
        .env("CLIENT_WORKSPACE_TRUST_PUBLIC_KEY_FILE", trust_root)
        .env("PATH", gui_path(codex.as_deref()))
        .env_remove("OPENAI_API_KEY")
        .stdin(Stdio::null())
        .stdout(Stdio::from(log))
        .stderr(Stdio::from(log_for_stderr));
    if let Some(codex) = codex.as_ref() {
        command.env("CLIENT_WORKSPACE_CODEX_COMMAND", codex);
    }
    let child = command.spawn()?;
    write_runtime_file(app_home, port, child.id(), codex.is_some());
    Ok(child)
}

fn client_workspace_home(app: &tauri::AppHandle) -> Result<PathBuf, tauri::Error> {
    if let Some(configured) = env::var_os("CREATE_SOMETHING_CLIENT_WORKSPACE_HOME") {
        return Ok(PathBuf::from(configured));
    }
    app.path().app_data_dir()
}

fn wait_for_server(port: u16) -> bool {
    let deadline = Instant::now() + READY_TIMEOUT;
    let socket = format!("{HOST}:{port}");
    while Instant::now() < deadline {
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

fn redirect_when_ready(window: WebviewWindow, port: u16) {
    thread::spawn(move || {
        if wait_for_server(port) {
            let _ = window.eval(&format!("window.location.replace('http://{HOST}:{port}/')"));
        } else {
            let _ =
                window.eval("document.dispatchEvent(new CustomEvent('client-workspace-timeout'))");
        }
    });
}

fn stop_server(child: &ServerChild) {
    let Some(mut process) = child.lock().ok().and_then(|mut guard| guard.take()) else {
        return;
    };
    let _ = process.kill();
    let _ = process.wait();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let server_child: ServerChild = Arc::new(Mutex::new(None));
    let setup_child = Arc::clone(&server_child);
    let close_child = Arc::clone(&server_child);
    let exit_child = Arc::clone(&server_child);
    let port = choose_port();

    let app = tauri::Builder::default()
        .setup(move |app| {
            let resource_dir = app.path().resource_dir()?;
            let app_home = client_workspace_home(app.handle())?;
            if let Ok(child) = start_server(&resource_dir, &app_home, port) {
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
}
