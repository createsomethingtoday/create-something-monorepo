use client_workspace_connector::{
    approval_matches,
    local::{private_read, Event, State},
    supervisor, Config, Result,
};
use std::{
    fs::OpenOptions,
    io::{BufRead, BufReader, Write},
    path::Path,
    sync::atomic::{AtomicBool, Ordering},
    thread,
    time::{Duration, Instant},
};

static STOP: AtomicBool = AtomicBool::new(false);
extern "C" fn stop(_: libc::c_int) {
    STOP.store(true, Ordering::Relaxed);
}
fn execute() -> Result<()> {
    let args: Vec<String> = std::env::args().collect();
    if args.len() != 4 || args[2] != "--config" || !["run", "revoke"].contains(&args[1].as_str()) {
        return Err(
            "usage: client-workspace-connector <run|revoke> --config /absolute/private/config.json",
        );
    }
    if !Path::new(&args[3]).is_absolute() {
        return Err("absolute_config_required");
    }
    let config = Config::parse(&private_read(Path::new(&args[3]))?)?;
    let state = State::open(&config.state_dir)?;
    if args[1] == "revoke" {
        state.revoke()?;
        let deadline = Instant::now() + Duration::from_secs(5);
        loop {
            if let Ok(_lock) = state.lock() {
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
        "Allow remote workspace access for {} at {} to {}?\nType CONNECT {} to allow this run:",
        config.client_id,
        config.origin(),
        config.allowed_email,
        config.client_id
    )
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
    unsafe {
        libc::signal(libc::SIGINT, stop as *const () as libc::sighandler_t);
        libc::signal(libc::SIGTERM, stop as *const () as libc::sighandler_t);
        libc::signal(libc::SIGHUP, stop as *const () as libc::sighandler_t);
    }
    let result = supervisor::run(&config, &state, &STOP);
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
