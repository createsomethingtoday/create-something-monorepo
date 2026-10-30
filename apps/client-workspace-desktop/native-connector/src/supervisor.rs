use crate::{
    local::{require_private_file, Event, State},
    Config, Result,
};
use std::{
    fs::{self, File, OpenOptions},
    io::{Read, Write},
    net::{SocketAddr, TcpListener, TcpStream},
    os::unix::{fs::MetadataExt, process::CommandExt},
    path::Path,
    process::{Child, Command, Stdio},
    sync::atomic::{AtomicBool, Ordering},
    thread,
    time::{Duration, Instant},
};

pub struct OwnedProcess {
    child: Child,
    stopped: bool,
}
impl OwnedProcess {
    pub fn spawn(command: &mut Command) -> Result<Self> {
        command
            .process_group(0)
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null());
        Ok(Self {
            child: command.spawn().map_err(|_| "child_start_failed")?,
            stopped: false,
        })
    }
    pub fn running(&mut self) -> Result<bool> {
        self.child
            .try_wait()
            .map(|s| s.is_none())
            .map_err(|_| "child_status_failed")
    }
    pub fn id(&self) -> u32 {
        self.child.id()
    }
    pub fn stop(&mut self) -> Result<()> {
        if self.stopped {
            return Ok(());
        }
        let group = -(self.child.id() as i32);
        unsafe {
            libc::kill(group, libc::SIGTERM);
        }
        thread::sleep(Duration::from_millis(100));
        unsafe {
            libc::kill(group, libc::SIGKILL);
        }
        self.child.wait().map_err(|_| "disconnect_unconfirmed")?;
        let deadline = Instant::now() + Duration::from_secs(2);
        loop {
            let remaining = unsafe { libc::kill(group, 0) };
            if remaining == -1
                && std::io::Error::last_os_error().raw_os_error() == Some(libc::ESRCH)
            {
                self.stopped = true;
                return Ok(());
            }
            if Instant::now() >= deadline {
                return Err("disconnect_unconfirmed");
            }
            thread::sleep(Duration::from_millis(25));
        }
    }
}
impl Drop for OwnedProcess {
    fn drop(&mut self) {
        // Never act on persisted PIDs or another application's launchd label.
        let _ = self.stop();
    }
}
fn resource(path: &Path, executable: bool) -> Result<()> {
    let meta = fs::metadata(path).map_err(|_| "release_incomplete")?;
    if !meta.is_file()
        || meta.mode() & 0o022 != 0
        || (executable && meta.mode() & 0o111 == 0)
        || fs::canonicalize(path).map_err(|_| "release_incomplete")? != path
    {
        return Err("release_permissions");
    }
    Ok(())
}
pub fn preflight(c: &Config) -> Result<()> {
    for (path, executable) in [
        (c.resources.join("runtime/bun"), true),
        (c.resources.join("runtime/cloudflared"), true),
        (
            c.resources.join("server/scripts/dual-origin-server.mjs"),
            false,
        ),
        (
            c.resources
                .join("trust/client-workspace-trust-keyring.json"),
            false,
        ),
        (c.codex_bin.clone(), true),
    ] {
        resource(&path, executable)?;
    }
    if let Some(node) = &c.codex_node_bin {
        resource(node, true)?;
    }
    require_private_file(&c.credentials_file)?;
    if !c.client_home.is_dir()
        || fs::canonicalize(&c.client_home).map_err(|_| "home_unavailable")? != c.client_home
    {
        return Err("home_unavailable");
    }
    TcpListener::bind(("127.0.0.1", c.port)).map_err(|_| "origin_port_unavailable")?;
    Ok(())
}

fn anonymous_denied(port: u16, host: &str) -> bool {
    let address = SocketAddr::from(([127, 0, 0, 1], port));
    let Ok(mut stream) = TcpStream::connect_timeout(&address, Duration::from_millis(200)) else {
        return false;
    };
    let timeout = Some(Duration::from_millis(200));
    if stream.set_read_timeout(timeout).is_err() || stream.set_write_timeout(timeout).is_err() {
        return false;
    }
    if write!(
        stream,
        "GET / HTTP/1.1\r\nHost: {host}\r\nConnection: close\r\n\r\n"
    )
    .is_err()
    {
        return false;
    }
    let mut prefix = [0u8; 13];
    stream.read_exact(&mut prefix).is_ok() && &prefix == b"HTTP/1.1 403 "
}
/// A denied request is not ownership proof: another loopback process can return
/// 403 after the preflight bind is released. Only this child knows the one-run
/// capability, and its bootstrap response echoes it in an HttpOnly cookie.
pub fn owned_runtime_ready(port: u16, capability: &str) -> bool {
    let address = SocketAddr::from(([127, 0, 0, 1], port));
    let Ok(mut stream) = TcpStream::connect_timeout(&address, Duration::from_millis(200)) else {
        return false;
    };
    if stream
        .set_read_timeout(Some(Duration::from_millis(200)))
        .is_err()
        || stream
            .set_write_timeout(Some(Duration::from_millis(200)))
            .is_err()
    {
        return false;
    }
    if write!(
        stream,
        "GET /?cap={capability} HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\nConnection: close\r\n\r\n"
    )
    .is_err()
    {
        return false;
    }
    let mut buffer = [0u8; 16384];
    let mut used = 0;
    while used < buffer.len() {
        let Ok(n) = stream.read(&mut buffer[used..]) else {
            return false;
        };
        if n == 0 {
            return false;
        }
        used += n;
        if let Some(end) = buffer[..used]
            .windows(4)
            .position(|part| part == b"\r\n\r\n")
        {
            let Ok(headers) = std::str::from_utf8(&buffer[..end]) else {
                return false;
            };
            let mut lines = headers.split("\r\n");
            if lines.next() != Some("HTTP/1.1 200 OK") {
                return false;
            }
            let expected = format!("cs_workspace_capability={capability};");
            return lines.any(|line| {
                line.split_once(':').is_some_and(|(name, value)| {
                    name.eq_ignore_ascii_case("set-cookie")
                        && value.trim_start().starts_with(&expected)
                })
            });
        }
    }
    false
}
fn fresh_capability() -> Result<String> {
    let mut bytes = [0u8; 32];
    File::open("/dev/urandom")
        .and_then(|mut source| source.read_exact(&mut bytes))
        .map_err(|_| "capability_unavailable")?;
    Ok(bytes.iter().map(|byte| format!("{byte:02x}")).collect())
}
fn enabled(state: &State, stop: &AtomicBool) -> Result<()> {
    if stop.load(Ordering::Relaxed) {
        return Err("stop_requested");
    }
    state.ensure_enabled()
}

/// Caller holds the state lock and has collected explicit local approval.
/// A child failure terminates its peer; no restart or cached approval exists.
pub fn run(c: &Config, state: &State, stop: &AtomicBool) -> Result<()> {
    enabled(state, stop)?;
    preflight(c)?;
    let capability = fresh_capability()?;
    let tunnel_config = state.write_tunnel_config(c)?;
    state.audit(Event::Starting)?;
    let mut runtime: Option<OwnedProcess> = None;
    let mut tunnel: Option<OwnedProcess> = None;
    let outcome = (|| {
        let mut server = Command::new(c.resources.join("runtime/bun"));
        server
            .env_clear()
            .envs(c.runtime_env(&capability))
            .arg(c.resources.join("server/scripts/dual-origin-server.mjs"))
            .current_dir(c.resources.join("server"));
        runtime = Some(OwnedProcess::spawn(&mut server)?);
        let deadline = Instant::now() + Duration::from_secs(30);
        loop {
            enabled(state, stop)?;
            if !runtime.as_mut().unwrap().running()? {
                return Err("runtime_exited");
            }
            if owned_runtime_ready(c.port, &capability) && anonymous_denied(c.port, &c.hostname) {
                break;
            }
            if Instant::now() >= deadline {
                return Err("origin_not_ready");
            }
            thread::sleep(Duration::from_millis(100));
        }
        enabled(state, stop)?;
        if !runtime.as_mut().unwrap().running()? {
            return Err("runtime_exited");
        }
        if let Ok(mut tty) = OpenOptions::new().write(true).open("/dev/tty") {
            writeln!(
                tty,
                "Local workspace: http://127.0.0.1:{}/?cap={capability}",
                c.port
            )
            .map_err(|_| "local_terminal_unavailable")?;
        }
        let mut command = Command::new(c.resources.join("runtime/cloudflared"));
        command
            .env_clear()
            .env("HOME", &c.client_home)
            .env("PATH", "/usr/bin:/bin")
            .args(["tunnel", "--no-autoupdate", "--config"])
            .arg(tunnel_config)
            .arg("run")
            .arg(&c.tunnel_id);
        tunnel = Some(OwnedProcess::spawn(&mut command)?);
        state.audit(Event::ChildrenStarted)?;
        loop {
            if stop.load(Ordering::Relaxed) || state.revoked()? {
                break;
            }
            if !runtime.as_mut().unwrap().running()? || !tunnel.as_mut().unwrap().running()? {
                return Err("child_exited");
            }
            thread::sleep(Duration::from_millis(200));
        }
        Ok(())
    })();
    // Tunnel closes before origin/Codex. A failed teardown keeps the guardian's
    // activity marker so revoke cannot report a verified disconnect.
    let tunnel_stopped = tunnel.as_mut().map(OwnedProcess::stop).unwrap_or(Ok(()));
    let runtime_stopped = runtime.as_mut().map(OwnedProcess::stop).unwrap_or(Ok(()));
    if tunnel_stopped.is_err() || runtime_stopped.is_err() {
        return Err("disconnect_unconfirmed");
    }
    outcome?;
    state.audit(Event::Stopped)
}
