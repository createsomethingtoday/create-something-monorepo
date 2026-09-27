use client_workspace_connector::{
    local::{Event, State},
    supervisor, Config,
};
use serde_json::json;
use std::{
    fs,
    net::TcpListener,
    os::unix::fs::{symlink, PermissionsExt},
    path::PathBuf,
    process::Command,
    sync::atomic::{AtomicBool, AtomicU64, Ordering},
    thread,
    time::{Duration, Instant},
};

static SEQUENCE: AtomicU64 = AtomicU64::new(0);
struct Fixture {
    root: PathBuf,
    config: Config,
}
impl Fixture {
    fn new() -> Self {
        let base = std::env::var_os("PAPERCLIP_RUN_SCRATCH_DIR")
            .map(PathBuf::from)
            .unwrap_or_else(std::env::temp_dir);
        let root = base.canonicalize().unwrap().join(format!(
            "connector-test-{}-{}",
            std::process::id(),
            SEQUENCE.fetch_add(1, Ordering::Relaxed)
        ));
        fs::create_dir(&root).unwrap();
        for dir in ["release/runtime", "release/server", "release/trust", "home"] {
            fs::create_dir_all(root.join(dir)).unwrap();
        }
        fs::create_dir_all(root.join("release/server/scripts")).unwrap();
        let port = TcpListener::bind("127.0.0.1:0")
            .unwrap()
            .local_addr()
            .unwrap()
            .port();
        let config = Config::parse(&json!({
            "version":1,"client_id":"synthetic","hostname":"workspace.example.com",
            "access_team":"synthetic","access_audience":"a".repeat(64),"allowed_email":"a@example.com",
            "tunnel_id":"11111111-2222-4333-8444-555555555555", "credentials_file":root.join("credentials.json"),
            "resources":root.join("release"),"codex_bin":root.join("codex"),"client_home":root.join("home"),
            "state_dir":root.join("state"),"port":port
        }).to_string()).unwrap();
        let f = Self { root, config };
        for name in [
            "credentials.json",
            "release/server/index.js",
            "release/server/scripts/dual-origin-server.mjs",
            "release/trust/client-workspace-trust-keyring.json",
        ] {
            f.write(name, "{}", 0o600);
        }
        f.write("codex", "#!/bin/sh\nexit 0\n", 0o700);
        f.write(
            "release/runtime/bun",
            r#"#!/usr/bin/python3
import http.server, os, subprocess
from pathlib import Path
root = Path(os.environ['CLIENT_WORKSPACE_STATE_ROOT']).parent
assert os.environ['CLIENT_WORKSPACE_REMOTE'] == '1'
assert os.environ['CLIENT_WORKSPACE_MANAGED_CONNECTOR'] == '1'
assert 'PAPERCLIP_API_KEY' not in os.environ
assert os.environ['CLIENT_WORKSPACE_DESKTOP'] == '1'
assert os.environ['CLIENT_WORKSPACE_LOOPBACK_ORIGIN'].startswith('http://127.0.0.1:')
assert len(os.environ['CLIENT_WORKSPACE_CAPABILITY_TOKEN']) == 64
assert 'ORIGIN' not in os.environ
child = subprocess.Popen(['/bin/sleep', '60'])
(root / 'runtime.pid').write_text(str(os.getpid()))
(root / 'descendant.pid').write_text(str(child.pid))
class Handler(http.server.BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    def do_GET(self):
        token = os.environ['CLIENT_WORKSPACE_CAPABILITY_TOKEN']
        if self.path == '/?cap=' + token and self.headers.get('Host') == '127.0.0.1:' + os.environ['PORT']:
            self.send_response(200)
            self.send_header('Set-Cookie', 'cs_workspace_capability=' + token + '; Path=/; HttpOnly')
        else:
            self.send_response(403)
        self.send_header('Content-Length', '0')
        self.end_headers()
    def log_message(self, *args): pass
http.server.HTTPServer(('127.0.0.1', int(os.environ['PORT'])), Handler).serve_forever()
"#,
            0o700,
        );
        f.write(
            "release/runtime/cloudflared",
            "#!/bin/sh\nexec /bin/sleep 60\n",
            0o700,
        );
        f
    }
    fn write(&self, name: &str, data: &str, mode: u32) {
        fs::write(self.root.join(name), data).unwrap();
        fs::set_permissions(self.root.join(name), fs::Permissions::from_mode(mode)).unwrap();
    }
}

#[test]
fn unrelated_403_server_does_not_prove_runtime_ownership() {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let port = listener.local_addr().unwrap().port();
    let server = thread::spawn(move || {
        if let Ok((mut stream, _)) = listener.accept() {
            use std::io::{Read, Write};
            let mut request = [0u8; 1024];
            let _ = stream.read(&mut request);
            let _ = stream.write_all(b"HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\n\r\n");
        }
    });
    assert!(!supervisor::owned_runtime_ready(port, &"b".repeat(64)));
    server.join().unwrap();
}
impl Drop for Fixture {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.root);
    }
}
fn wait_for(mut condition: impl FnMut() -> bool) {
    let end = Instant::now() + Duration::from_secs(8);
    while !condition() {
        assert!(Instant::now() < end, "timed out");
        thread::sleep(Duration::from_millis(25));
    }
}
fn dead(pid: i32) -> bool {
    unsafe {
        libc::kill(pid, 0) == -1
            && std::io::Error::last_os_error().raw_os_error() == Some(libc::ESRCH)
    }
}

#[test]
fn private_state_lock_binding_and_sticky_revocation() {
    let f = Fixture::new();
    let s = State::open(&f.config.state_dir).unwrap();
    let lock = s.lock().unwrap();
    assert!(s.lock().is_err());
    s.bind(&f.config).unwrap();
    s.bind(&f.config).unwrap();
    let mut other = Config::parse(&serde_json::to_string(&f.config).unwrap()).unwrap();
    other.client_id = "other".into();
    assert!(s.bind(&other).is_err());
    s.revoke().unwrap();
    assert!(s.ensure_enabled().is_err());
    drop(lock);
    assert!(State::open(&f.config.state_dir)
        .unwrap()
        .ensure_enabled()
        .is_err());
}

#[test]
fn rejects_unsafe_permissions_and_symlinks_without_overwriting_targets() {
    let f = Fixture::new();
    fs::create_dir(&f.config.state_dir).unwrap();
    fs::set_permissions(&f.config.state_dir, fs::Permissions::from_mode(0o755)).unwrap();
    assert!(State::open(&f.config.state_dir).is_err());
    fs::set_permissions(&f.config.state_dir, fs::Permissions::from_mode(0o700)).unwrap();
    let s = State::open(&f.config.state_dir).unwrap();
    symlink(
        f.root.join("credentials.json"),
        f.config.state_dir.join("audit.jsonl"),
    )
    .unwrap();
    assert!(s.audit(Event::Approved).is_err());
    assert_eq!(
        fs::read_to_string(f.root.join("credentials.json")).unwrap(),
        "{}"
    );
    fs::set_permissions(
        &f.config.credentials_file,
        fs::Permissions::from_mode(0o644),
    )
    .unwrap();
    assert!(supervisor::preflight(&f.config).is_err());
}

#[test]
fn revocation_stops_owned_runtime_and_descendant_but_not_unrelated_process() {
    let f = Fixture::new();
    let s = State::open(&f.config.state_dir).unwrap();
    let _lock = s.lock().unwrap();
    let stop = AtomicBool::new(false);
    let mut unrelated =
        supervisor::OwnedProcess::spawn(Command::new("/bin/sleep").arg("60")).unwrap();
    thread::scope(|scope| {
        let task = scope.spawn(|| supervisor::run(&f.config, &s, &stop));
        wait_for(|| {
            fs::read_to_string(f.config.state_dir.join("audit.jsonl"))
                .unwrap_or_default()
                .contains("children_started")
        });
        s.revoke().unwrap();
        assert_eq!(task.join().unwrap(), Ok(()));
    });
    for name in ["runtime.pid", "descendant.pid"] {
        let pid = fs::read_to_string(f.config.state_dir.join(name))
            .unwrap()
            .parse()
            .unwrap();
        wait_for(|| dead(pid));
    }
    assert!(unrelated.running().unwrap());
    drop(unrelated);
    assert!(supervisor::run(&f.config, &s, &stop).is_err());
    let audit = fs::read_to_string(f.config.state_dir.join("audit.jsonl")).unwrap();
    assert!(!audit.contains("example.com"));
    assert!(!audit.contains("credentials"));
    assert!(audit.contains("stopped"));
}

#[test]
fn tunnel_failure_stops_runtime_and_failure_to_audit_prevents_start() {
    let f = Fixture::new();
    let s = State::open(&f.config.state_dir).unwrap();
    f.write("release/runtime/cloudflared", "#!/bin/sh\nexit 1\n", 0o700);
    assert_eq!(
        supervisor::run(&f.config, &s, &AtomicBool::new(false)),
        Err("child_exited")
    );
    let pid = fs::read_to_string(f.config.state_dir.join("runtime.pid"))
        .unwrap()
        .parse()
        .unwrap();
    wait_for(|| dead(pid));
    fs::remove_file(f.config.state_dir.join("audit.jsonl")).unwrap();
    fs::create_dir(f.config.state_dir.join("audit.jsonl")).unwrap();
    assert!(supervisor::run(&f.config, &s, &AtomicBool::new(false)).is_err());
}

#[test]
fn missing_runtime_and_occupied_port_do_not_start_a_tunnel() {
    let f = Fixture::new();
    let s = State::open(&f.config.state_dir).unwrap();
    let _occupied = TcpListener::bind(("127.0.0.1", f.config.port)).unwrap();
    assert_eq!(
        supervisor::run(&f.config, &s, &AtomicBool::new(false)),
        Err("origin_port_unavailable")
    );
    assert!(!f.config.state_dir.join("tunnel.json").exists());
    fs::remove_file(f.root.join("release/server/scripts/dual-origin-server.mjs")).unwrap();
    assert_eq!(supervisor::preflight(&f.config), Err("release_incomplete"));
}

#[test]
fn removing_or_replacing_state_cannot_clear_revocation_checks() {
    let f = Fixture::new();
    let s = State::open(&f.config.state_dir).unwrap();
    fs::remove_dir(&f.config.state_dir).unwrap();
    assert!(s.ensure_enabled().is_err());
    fs::create_dir(&f.config.state_dir).unwrap();
    fs::set_permissions(&f.config.state_dir, fs::Permissions::from_mode(0o700)).unwrap();
    assert!(s.ensure_enabled().is_err());
}

#[test]
fn cli_requires_a_local_terminal_and_revocation_survives_another_invocation() {
    use std::os::unix::process::CommandExt;
    let f = Fixture::new();
    f.write(
        "enrollment.json",
        &serde_json::to_string(&f.config).unwrap(),
        0o600,
    );
    let invoke = |action: &str| {
        let mut command = Command::new(env!("CARGO_BIN_EXE_client-workspace-connector"));
        command
            .args([action, "--config"])
            .arg(f.root.join("enrollment.json"));
        // Isolate from any controlling terminal, even when tests run interactively.
        unsafe {
            command.pre_exec(|| {
                if libc::setsid() < 0 {
                    return Err(std::io::Error::last_os_error());
                }
                Ok(())
            });
        }
        command.output().unwrap()
    };
    let first = invoke("run");
    assert!(!first.status.success());
    assert_eq!(
        String::from_utf8_lossy(&first.stderr).trim(),
        "local_terminal_required"
    );
    assert!(!f.config.state_dir.join("runtime.pid").exists());
    assert!(invoke("revoke").status.success());
    let second = invoke("run");
    assert!(!second.status.success());
    assert_eq!(
        String::from_utf8_lossy(&second.stderr).trim(),
        "connector_revoked"
    );
    assert!(!f.config.state_dir.join("runtime.pid").exists());
}
