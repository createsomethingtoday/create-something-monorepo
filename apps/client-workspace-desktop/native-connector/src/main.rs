use client_workspace_connector::{
    approval_matches,
    local::{private_read, Event, State},
    supervisor, Config, Result,
};
use std::{
    fs::OpenOptions,
    io::{BufRead, BufReader, Read, Write},
    os::{
        fd::{AsRawFd, FromRawFd},
        unix::net::UnixStream,
        unix::process::CommandExt,
    },
    path::Path,
    process::{Command, Stdio},
    sync::atomic::{AtomicBool, Ordering},
    thread,
    time::{Duration, Instant},
};

static STOP: AtomicBool = AtomicBool::new(false);
extern "C" fn stop(_: libc::c_int) {
    STOP.store(true, Ordering::Relaxed);
}
fn install_signals() {
    unsafe {
        libc::signal(libc::SIGINT, stop as *const () as libc::sighandler_t);
        libc::signal(libc::SIGTERM, stop as *const () as libc::sighandler_t);
        libc::signal(libc::SIGHUP, stop as *const () as libc::sighandler_t);
    }
}
fn guarded_run(config_path: &Path, state: &State) -> Result<()> {
    let (parent, child_socket) = UnixStream::pair().map_err(|_| "guardian_unavailable")?;
    let fd = child_socket.as_raw_fd();
    let mut command = Command::new(std::env::current_exe().map_err(|_| "guardian_unavailable")?);
    command
        .args(["guard", "--config"])
        .arg(config_path)
        .env_clear()
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    unsafe {
        command.pre_exec(move || {
            if libc::dup2(fd, 3) < 0 || libc::fcntl(3, libc::F_SETFD, 0) < 0 {
                return Err(std::io::Error::last_os_error());
            }
            Ok(())
        });
    }
    let mut guardian = command.spawn().map_err(|_| "guardian_unavailable")?;
    drop(child_socket);
    while !STOP.load(Ordering::Relaxed) && !state.revoked()? {
        if guardian
            .try_wait()
            .map_err(|_| "guardian_status_failed")?
            .is_some()
        {
            break;
        }
        thread::sleep(Duration::from_millis(100));
    }
    // EOF is the parent-death signal. SIGKILL also closes this socket in the
    // kernel, while the guardian retains ownership of both child groups.
    drop(parent);
    let deadline = Instant::now() + Duration::from_secs(5);
    loop {
        if let Some(status) = guardian.try_wait().map_err(|_| "guardian_status_failed")? {
            return if status.success()
                && (STOP.load(Ordering::Relaxed) || state.revoked().unwrap_or(false))
            {
                Ok(())
            } else {
                Err("guarded_runtime_failed")
            };
        }
        if Instant::now() >= deadline {
            return Err("guardian_shutdown_unconfirmed");
        }
        thread::sleep(Duration::from_millis(50));
    }
}
fn execute_guard(config_path: &Path) -> Result<()> {
    // The inherited socket is the only control path. There is no HTTP or
    // persisted PID-based authority, and no TTY approval path in this process.
    let mut peer_pid: libc::pid_t = 0;
    let mut length = std::mem::size_of_val(&peer_pid) as libc::socklen_t;
    if unsafe {
        libc::getsockopt(
            3,
            libc::SOL_LOCAL,
            libc::LOCAL_PEERPID,
            (&mut peer_pid as *mut libc::pid_t).cast(),
            &mut length,
        )
    } != 0
        || length as usize != std::mem::size_of_val(&peer_pid)
        || peer_pid != unsafe { libc::getppid() }
    {
        return Err("guardian_unavailable");
    }
    let mut parent = unsafe { UnixStream::from_raw_fd(3) };
    parent.peer_addr().map_err(|_| "guardian_unavailable")?;
    let config = Config::parse(&private_read(config_path)?)?;
    let state = State::open(&config.state_dir)?;
    let _guardian_lock = state.guardian_lock()?;
    state.bind(&config)?;
    state.ensure_enabled()?;
    state.mark_active()?;
    install_signals();
    thread::spawn(move || {
        let mut byte = [0u8; 1];
        let _ = parent.read(&mut byte);
        STOP.store(true, Ordering::Relaxed);
    });
    let result = supervisor::run(&config, &state, &STOP);
    if result == Err("disconnect_unconfirmed") {
        return result;
    }
    // run has verified both owned groups are gone before clearing the marker.
    let cleared = state.clear_active();
    result.and(cleared)
}
fn execute() -> Result<()> {
    let args: Vec<String> = std::env::args().collect();
    if args.len() != 4
        || args[2] != "--config"
        || !["run", "revoke", "guard"].contains(&args[1].as_str())
    {
        return Err(
            "usage: client-workspace-connector <run|revoke> --config /absolute/private/config.json",
        );
    }
    if !Path::new(&args[3]).is_absolute() {
        return Err("absolute_config_required");
    }
    if args[1] == "guard" {
        return execute_guard(Path::new(&args[3]));
    }
    let config = Config::parse(&private_read(Path::new(&args[3]))?)?;
    let state = State::open(&config.state_dir)?;
    if args[1] == "revoke" {
        state.revoke()?;
        let deadline = Instant::now() + Duration::from_secs(5);
        loop {
            if let (Ok(_lock), Ok(_guardian_lock), Ok(())) = (
                state.lock(),
                state.guardian_lock(),
                state.ensure_quiescent(),
            ) {
                println!("Local connector revoked; supervisor lock released. Cloudflare credentials are unchanged.");
                return Ok(());
            }
            if Instant::now() >= deadline {
                return Err("revoked_disconnect_unconfirmed");
            }
            thread::sleep(Duration::from_millis(100));
        }
    }
    let _lock = state.lock()?;
    state.ensure_quiescent()?;
    state.bind(&config)?;
    state.ensure_enabled()?;
    supervisor::preflight(&config)?;
    // No --yes, stdin pipe, browser endpoint, saved approval or automatic startup.
    let mut tty = OpenOptions::new()
        .read(true)
        .write(true)
        .open("/dev/tty")
        .map_err(|_| "local_terminal_required")?;
    writeln!(
        tty,
        "Allow remote workspace access for {} at {} to {}?",
        config.client_id,
        config.origin(),
        config.allowed_email
    )
    .map_err(|_| "approval_unavailable")?;
    if let Some(checkout) = &config.local_checkout {
        writeln!(tty, "Local checkout: {}\nEditable roots: {}\nThe remote Codex can read this checkout while connected.",
            checkout.root.display(), checkout.editable_roots.join(", "))
            .map_err(|_| "approval_unavailable")?;
    }
    writeln!(tty, "Type CONNECT {} to allow this run:", config.client_id)
        .map_err(|_| "approval_unavailable")?;
    let mut answer = String::new();
    BufReader::new(tty)
        .read_line(&mut answer)
        .map_err(|_| "approval_unavailable")?;
    if !approval_matches(&config.client_id, &answer) {
        state.audit(Event::Declined)?;
        return Err("approval_declined");
    }
    state.ensure_enabled()?;
    state.audit(Event::Approved)?;
    install_signals();
    let result = guarded_run(Path::new(&args[3]), &state);
    if result.is_err() {
        let _ = state.audit(Event::Failed);
    }
    result
}
fn main() {
    if let Err(error) = execute() {
        // Deliberately no Debug dumps, config paths, child output or provider errors.
        eprintln!("{error}");
        std::process::exit(1);
    }
}
