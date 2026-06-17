use std::{
    env,
    fs::OpenOptions,
    net::{TcpListener, TcpStream, ToSocketAddrs},
    path::PathBuf,
    process::{Child, Command, Stdio},
    sync::{Arc, Mutex},
    thread,
    time::{Duration, Instant},
};

use tauri::{Manager, WebviewWindow};

const HOST: &str = "127.0.0.1";
const DEFAULT_PORT: u16 = 5198;
const READY_TIMEOUT: Duration = Duration::from_secs(90);

type StudioChild = Arc<Mutex<Option<Child>>>;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let studio_child: StudioChild = Arc::new(Mutex::new(None));
    let setup_child = Arc::clone(&studio_child);
    let close_child = Arc::clone(&studio_child);
    let exit_child = Arc::clone(&studio_child);
    let port = choose_port();

    let app = tauri::Builder::default()
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
