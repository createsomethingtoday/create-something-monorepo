use serde_json::{json, Value};
use std::collections::HashMap;
use std::io::{BufRead, BufReader, Read, Write};
use std::os::unix::fs::PermissionsExt;
use std::os::unix::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{mpsc, Mutex, OnceLock};
use std::time::{Duration, Instant};

const MAX_REQUEST: usize = 65_536;
const MAX_RESPONSE: usize = 1_048_576;
const REPLY_TIMEOUT: Duration = Duration::from_secs(60);
static CLOSING: AtomicBool = AtomicBool::new(false);
type WriteRequest = (Vec<u8>, mpsc::SyncSender<Result<(), ()>>);

struct Companion {
    child: Child,
    writer: mpsc::Sender<WriteRequest>,
    replies: mpsc::Receiver<Result<Value, ()>>,
    next_id: u64,
}

fn companions() -> &'static Mutex<HashMap<PathBuf, Companion>> {
    static COMPANIONS: OnceLock<Mutex<HashMap<PathBuf, Companion>>> = OnceLock::new();
    COMPANIONS.get_or_init(|| Mutex::new(HashMap::new()))
}

// Independent of the protocol mutex: shutdown can interrupt pipe waits.
fn cancellation_groups() -> &'static Mutex<HashMap<PathBuf, u32>> {
    static GROUPS: OnceLock<Mutex<HashMap<PathBuf, u32>>> = OnceLock::new();
    GROUPS.get_or_init(|| Mutex::new(HashMap::new()))
}

fn read_reply(reader: &mut impl BufRead) -> Result<Value, ()> {
    let mut line = Vec::new();
    reader
        .take((MAX_RESPONSE + 2) as u64)
        .read_until(b'\n', &mut line)
        .map_err(|_| ())?;
    if line.last() != Some(&b'\n') || line.len() > MAX_RESPONSE + 1 {
        return Err(());
    }
    serde_json::from_slice(&line).map_err(|_| ())
}

fn permitted(operation: &str) -> bool {
    matches!(
        operation,
        "agent.chat.status"
            | "agent.chat.list"
            | "agent.chat.start"
            | "agent.chat.read"
            | "agent.chat.send"
            | "agent.chat.poll"
            | "agent.chat.cancel"
            | "agent.chat.approve"
    )
}

fn executable(path: &Path) -> bool {
    path.is_file() && std::fs::metadata(path).is_ok_and(|m| m.permissions().mode() & 0o111 != 0)
}

fn resolved_executable(path: &Path) -> Option<PathBuf> {
    if !path.is_absolute() {
        return None;
    }
    let resolved = path.canonicalize().ok()?;
    executable(&resolved).then_some(resolved)
}

fn find_codex_in_path(folders: impl IntoIterator<Item = PathBuf>) -> Option<PathBuf> {
    folders.into_iter().find_map(|folder| {
        if !folder.is_absolute() {
            return None;
        }
        resolved_executable(&folder.join("codex"))
    })
}

fn find_codex_in_nvm(home: &Path) -> Option<PathBuf> {
    if !home.is_absolute() {
        return None;
    }
    let versions = home.join(".nvm/versions/node");
    let mut folders: Vec<_> = std::fs::read_dir(versions)
        .ok()?
        .filter_map(Result::ok)
        .filter_map(|entry| {
            let name = entry.file_name().to_string_lossy().into_owned();
            let version = name
                .strip_prefix('v')?
                .split('.')
                .map(str::parse::<u32>)
                .collect::<Result<Vec<_>, _>>()
                .ok()?;
            (version.len() == 3 && entry.path().is_dir())
                .then_some((version, entry.path().join("bin")))
        })
        .collect();
    folders.sort_by(|left, right| right.0.cmp(&left.0));
    find_codex_in_path(folders.into_iter().map(|(_, folder)| folder))
}

fn companion_path(
    codex: &Path,
    inherited: Option<std::ffi::OsString>,
) -> Result<std::ffi::OsString, String> {
    let mut folders = Vec::new();
    for ancestor in codex.ancestors() {
        if ancestor
            .parent()
            .is_some_and(|parent| parent.ends_with(".nvm/versions/node"))
        {
            folders.push(ancestor.join("bin"));
            break;
        }
    }
    if let Some(parent) = codex.parent() {
        folders.push(parent.to_path_buf());
    }
    if let Some(path) = inherited {
        folders.extend(std::env::split_paths(&path));
    }
    std::env::join_paths(folders).map_err(|_| "Codex executable path unavailable".into())
}

fn find_codex() -> Option<PathBuf> {
    if let Some(value) = std::env::var_os("GIGI_CODEX_BINARY") {
        if let Some(path) = resolved_executable(&PathBuf::from(value)) {
            return Some(path);
        }
    }
    if let Some(paths) = std::env::var_os("PATH") {
        if let Some(path) = find_codex_in_path(std::env::split_paths(&paths)) {
            return Some(path);
        }
    }
    if let Some(home) = std::env::var_os("HOME") {
        let home = PathBuf::from(home);
        for relative in [
            ".local/bin/codex",
            ".bun/bin/codex",
            ".npm-global/bin/codex",
        ] {
            if let Some(path) = resolved_executable(&home.join(relative)) {
                return Some(path);
            }
        }
        if let Some(path) = find_codex_in_nvm(&home) {
            return Some(path);
        }
    }
    for candidate in ["/opt/homebrew/bin/codex", "/usr/local/bin/codex"] {
        if let Some(path) = resolved_executable(Path::new(candidate)) {
            return Some(path);
        }
    }
    None
}

fn spawn(
    resource_dir: &Path,
    data_dir: &Path,
    codex: Option<PathBuf>,
) -> Result<Companion, String> {
    let codex =
        codex.ok_or("Codex executable unavailable. Install or sign in to Codex, then retry.")?;
    let mut command = Command::new(resource_dir.join("gigi-codex"));
    for (key, _) in std::env::vars_os() {
        let name = key.to_string_lossy().to_ascii_uppercase();
        if name.ends_with("_API_KEY")
            || name.ends_with("_ACCESS_TOKEN")
            || name.ends_with("_AUTH_TOKEN")
            || name.ends_with("_SECRET")
            || name.ends_with("_PASSWORD")
            || name.ends_with("_CREDENTIALS")
            || [
                "OPENAI_",
                "ANTHROPIC_",
                "GOOGLE_",
                "GEMINI_",
                "COMPOSIO_",
                "CLOUDFLARE_",
                "LINEAR_",
                "INFISICAL_",
            ]
            .iter()
            .any(|prefix| name.starts_with(prefix))
        {
            command.env_remove(key);
        }
    }
    command
        .env("GIGI_DATA_DIR", data_dir)
        .env("PATH", companion_path(&codex, std::env::var_os("PATH"))?)
        .env("GIGI_CODEX_BINARY", codex)
        .env("GIGI_MCP_BINARY", resource_dir.join("gigi-mcp"))
        .env(
            "GIGI_SKILL_PATH",
            resource_dir.join("agent/gigi/skills/gigi/SKILL.md"),
        )
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .process_group(0);
    let mut child = command
        .spawn()
        .map_err(|_| "Chat companion unavailable. Reinstall the complete GiGi app.".to_string())?;
    let mut stdin = child
        .stdin
        .take()
        .ok_or("Chat companion input unavailable")?;
    let mut stdout = BufReader::new(
        child
            .stdout
            .take()
            .ok_or("Chat companion output unavailable")?,
    );
    let (writer, write_jobs) = mpsc::channel::<(Vec<u8>, mpsc::SyncSender<Result<(), ()>>)>();
    std::thread::spawn(move || {
        for (request, answer) in write_jobs {
            let result = stdin
                .write_all(&request)
                .and_then(|_| stdin.flush())
                .map_err(|_| ());
            let failed = result.is_err();
            let _ = answer.send(result);
            if failed {
                break;
            }
        }
    });
    let (reply_sender, replies) = mpsc::channel();
    std::thread::spawn(move || loop {
        let result = read_reply(&mut stdout);
        let failed = result.is_err();
        if reply_sender.send(result).is_err() || failed {
            break;
        }
    });
    Ok(Companion {
        child,
        writer,
        replies,
        next_id: 1,
    })
}

fn terminate(mut companion: Companion) {
    let group = companion.child.id() as i32;
    unsafe {
        libc::kill(-group, libc::SIGTERM);
    }
    let deadline = Instant::now() + Duration::from_millis(500);
    while Instant::now() < deadline {
        if matches!(companion.child.try_wait(), Ok(Some(_))) {
            break;
        }
        std::thread::sleep(Duration::from_millis(20));
    }
    unsafe {
        libc::kill(-group, libc::SIGKILL);
    }
    let _ = companion.child.kill();
    let _ = companion.child.wait();
}

pub fn cancel_all() {
    CLOSING.store(true, Ordering::SeqCst);
    let groups: Vec<_> = cancellation_groups()
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .drain()
        .map(|(_, group)| group)
        .collect();
    for group in groups {
        // These are only process groups created by spawn above. Kill descendants
        // too, so inherited pipe descriptors cannot keep the request blocked.
        unsafe {
            libc::kill(-(group as i32), libc::SIGTERM);
            libc::kill(-(group as i32), libc::SIGKILL);
        }
    }
    let mut guard = companions().lock().unwrap_or_else(|e| e.into_inner());
    for (_, companion) in guard.drain() {
        terminate(companion);
    }
}

pub fn dispatch(
    resource_dir: &Path,
    data_dir: &Path,
    operation: &str,
    input: Value,
) -> Result<Value, String> {
    dispatch_with_timeout(resource_dir, data_dir, operation, input, REPLY_TIMEOUT)
}

fn dispatch_with_timeout(
    resource_dir: &Path,
    data_dir: &Path,
    operation: &str,
    input: Value,
    timeout: Duration,
) -> Result<Value, String> {
    if !permitted(operation) {
        return Err("Unsupported chat operation".into());
    }
    // Check size before starting or touching a companion. The ID adds at most 20 decimal digits.
    let input_size = serde_json::to_vec(&input)
        .map_err(|_| "Invalid chat request")?
        .len();
    if input_size
        .saturating_add(operation.len())
        .saturating_add(64)
        > MAX_REQUEST
    {
        return Err("Chat request exceeds limit".into());
    }
    let mut guard = companions().lock().unwrap_or_else(|e| e.into_inner());
    if CLOSING.load(Ordering::SeqCst) {
        return Err("Chat companion is shutting down".into());
    }
    if !guard.contains_key(data_dir) {
        #[cfg(test)]
        let codex = resolved_executable(&resource_dir.join("codex")).or_else(find_codex);
        #[cfg(not(test))]
        let codex = find_codex();
        let companion = spawn(resource_dir, data_dir, codex)?;
        let mut groups = cancellation_groups()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        if CLOSING.load(Ordering::SeqCst) {
            drop(groups);
            terminate(companion);
            return Err("Chat companion is shutting down".into());
        }
        groups.insert(data_dir.to_path_buf(), companion.child.id());
        guard.insert(data_dir.to_path_buf(), companion);
    }
    let result: Result<Result<Value, String>, String> = (|| {
        let companion = guard
            .get_mut(data_dir)
            .ok_or("Chat companion unavailable")?;
        if companion
            .child
            .try_wait()
            .map_err(|_| "Chat companion unavailable")?
            .is_some()
        {
            return Err("Chat companion exited. Check chat status before retrying.".into());
        }
        let id = companion.next_id;
        companion.next_id = companion
            .next_id
            .checked_add(1)
            .ok_or("Chat request ID exhausted")?;
        let mut request = serde_json::to_vec(&json!({"id":id,"operation":operation,"input":input}))
            .map_err(|_| "Invalid chat request")?;
        if request.len() > MAX_REQUEST {
            return Err("Chat request exceeds limit".into());
        }
        request.push(b'\n');
        let deadline = Instant::now() + timeout;
        let (ack_sender, ack_receiver) = mpsc::sync_channel(1);
        companion
            .writer
            .send((request, ack_sender))
            .map_err(|_| "Chat request could not be delivered")?;
        match ack_receiver.recv_timeout(deadline.saturating_duration_since(Instant::now())) {
            Ok(Ok(())) => {}
            Ok(Err(())) => return Err("Chat request could not be delivered".into()),
            Err(_) => {
                return Err("Chat operation timed out. Read the session before retrying.".into())
            }
        }
        let response = companion
            .replies
            .recv_timeout(deadline.saturating_duration_since(Instant::now()))
            .map_err(|_| "Chat operation timed out. Read the session before retrying.")?
            .map_err(|_| "Chat companion returned an invalid or oversized reply")?;
        if response.get("id").and_then(Value::as_u64) != Some(id) {
            return Err("Chat companion reply ID mismatch".into());
        }
        match response.get("ok").and_then(Value::as_bool) {
            Some(true) => Ok(Ok(response.get("value").cloned().unwrap_or(Value::Null))),
            Some(false) => Ok(Err(response
                .get("error")
                .and_then(|e| e.get("reason"))
                .and_then(Value::as_str)
                .unwrap_or("Chat operation failed")
                .chars()
                .take(500)
                .collect())),
            None => Err("Chat companion returned an invalid reply".into()),
        }
    })();
    if result.is_err() {
        // Protocol, delivery, and timeout failures leave the stream in uncertain state.
        if let Some(companion) = guard.remove(data_dir) {
            cancellation_groups()
                .lock()
                .unwrap_or_else(|e| e.into_inner())
                .remove(data_dir);
            terminate(companion);
        }
    }
    result?
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::os::unix::fs::PermissionsExt;
    fn test_lock() -> std::sync::MutexGuard<'static, ()> {
        static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
        let guard = LOCK.get_or_init(|| Mutex::new(())).lock().unwrap();
        CLOSING.store(false, Ordering::SeqCst);
        guard
    }
    fn fixture(script: &str) -> PathBuf {
        let root = std::env::temp_dir().join(format!("gigi-chat-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&root).unwrap();
        let binary = root.join("gigi-codex");
        std::fs::write(&binary, script).unwrap();
        std::fs::set_permissions(binary, std::fs::Permissions::from_mode(0o700)).unwrap();
        let codex = root.join("codex");
        std::fs::write(&codex, "#!/bin/sh\nexit 0\n").unwrap();
        std::fs::set_permissions(codex, std::fs::Permissions::from_mode(0o700)).unwrap();
        root
    }
    #[test]
    fn persistent_child_matches_ids_and_profile() {
        let _guard = test_lock();
        let root = fixture("#!/bin/sh\nwhile IFS= read -r line; do\n id=$(printf '%s' \"$line\" | sed -n 's/.*\"id\":\\([0-9]*\\).*/\\1/p')\n printf '{\"id\":%s,\"ok\":true,\"value\":{\"pid\":%s,\"data\":\"%s\"}}\\n' \"$id\" \"$$\" \"$GIGI_DATA_DIR\"\ndone\n");
        let first = dispatch(&root, &root, "agent.chat.status", json!({})).unwrap();
        let second = dispatch(&root, &root, "agent.chat.list", json!({})).unwrap();
        assert_eq!(first["pid"], second["pid"]);
        assert_eq!(first["data"], root.to_string_lossy().as_ref());
        cancel_all();
        std::fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn reply_id_mismatch_discards_child() {
        let _guard = test_lock();
        let root = fixture("#!/bin/sh\nwhile IFS= read -r line; do printf '%s\\n' '{\"id\":99,\"ok\":true,\"value\":1}'; done\n");
        let result = dispatch(&root, &root, "agent.chat.status", json!({}));
        assert!(result.unwrap_err().contains("ID mismatch"));
        assert!(!companions().lock().unwrap().contains_key(&root));
        std::fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn timeout_kills_process_group_and_descendants() {
        let _guard = test_lock();
        let root = fixture("#!/bin/sh\n(sleep 1; touch \"$GIGI_DATA_DIR/leaked\") &\nwhile IFS= read -r line; do sleep 4; done\n");
        let start = Instant::now();
        let result = dispatch_with_timeout(
            &root,
            &root,
            "agent.chat.send",
            json!({"message":"hi"}),
            Duration::from_millis(100),
        );
        assert!(result.unwrap_err().contains("timed out"));
        assert!(start.elapsed() < Duration::from_secs(3));
        std::thread::sleep(Duration::from_millis(1200));
        assert!(!root.join("leaked").exists());
        std::fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn rejects_large_requests_before_write() {
        let _guard = test_lock();
        let root = fixture("#!/bin/sh\nexit 0\n");
        let result = dispatch(
            &root,
            &root,
            "agent.chat.send",
            json!({"message":"x".repeat(MAX_REQUEST)}),
        );
        assert!(result.unwrap_err().contains("exceeds limit"));
        assert!(!companions().lock().unwrap().contains_key(&root));
        std::fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn business_rejection_preserves_companion() {
        let _guard = test_lock();
        let root = fixture("#!/bin/sh\nwhile IFS= read -r line; do\n id=$(printf '%s' \"$line\" | sed -n 's/.*\"id\":\\([0-9]*\\).*/\\1/p')\n case \"$id\" in 1) printf '{\"id\":1,\"ok\":false,\"error\":{\"reason\":\"approval unavailable\"}}\\n';; *) printf '{\"id\":%s,\"ok\":true,\"value\":{\"live\":true}}\\n' \"$id\";; esac\ndone\n");
        assert_eq!(
            dispatch(&root, &root, "agent.chat.approve", json!({})).unwrap_err(),
            "approval unavailable"
        );
        assert_eq!(
            dispatch(&root, &root, "agent.chat.status", json!({})).unwrap()["live"],
            true
        );
        cancel_all();
        std::fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn oversized_reply_discards_child() {
        let _guard = test_lock();
        let root = fixture("#!/bin/sh\nwhile IFS= read -r line; do head -c 1100000 /dev/zero | tr '\\000' x; printf '\\n'; done\n");
        let result = dispatch(&root, &root, "agent.chat.status", json!({}));
        assert!(result.unwrap_err().contains("oversized reply"));
        assert!(!companions().lock().unwrap().contains_key(&root));
        std::fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn concurrent_callers_share_one_serial_stream() {
        let _guard = test_lock();
        let root = fixture("#!/bin/sh\nwhile IFS= read -r line; do\n id=$(printf '%s' \"$line\" | sed -n 's/.*\"id\":\\([0-9]*\\).*/\\1/p')\n printf '{\"id\":%s,\"ok\":true,\"value\":{\"pid\":%s}}\\n' \"$id\" \"$$\"\ndone\n");
        let mut handles = Vec::new();
        for _ in 0..6 {
            let resource = root.clone();
            handles.push(std::thread::spawn(move || {
                dispatch(&resource, &resource, "agent.chat.poll", json!({})).unwrap()["pid"].clone()
            }));
        }
        let pids: Vec<_> = handles
            .into_iter()
            .map(|handle| handle.join().unwrap())
            .collect();
        assert!(pids.iter().all(|pid| pid == &pids[0]));
        cancel_all();
        std::fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn codex_discovery_ignores_relative_path_entries() {
        let _guard = test_lock();
        let root = fixture("#!/bin/sh\nexit 0\n");
        let source = root.join("gigi-codex");
        let codex = root.join("codex");
        std::fs::copy(source, &codex).unwrap();
        std::fs::set_permissions(&codex, std::fs::Permissions::from_mode(0o700)).unwrap();
        assert!(find_codex_in_path([PathBuf::from("."), PathBuf::from("relative/bin")]).is_none());
        assert_eq!(
            find_codex_in_path([root.clone()]),
            Some(codex.canonicalize().unwrap())
        );
        std::fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn missing_codex_fails_before_companion_launch() {
        let _guard = test_lock();
        let root = fixture("#!/bin/sh\ntouch \"$GIGI_DATA_DIR/started\"\n");
        let result = spawn(&root, &root, None);
        assert!(
            matches!(result, Err(ref message) if message.contains("Codex executable unavailable"))
        );
        assert!(!root.join("started").exists());
        std::fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn nvm_discovery_selects_numeric_version_and_supplies_its_node_path() {
        let _guard = test_lock();
        let root = fixture("#!/bin/sh\nexit 0\n");
        for version in ["v9.0.0", "v22.3.0"] {
            let version_root = root.join(".nvm/versions/node").join(version);
            let bin = version_root.join("bin");
            let target = version_root.join("lib/node_modules/codex/codex.js");
            std::fs::create_dir_all(&bin).unwrap();
            std::fs::create_dir_all(target.parent().unwrap()).unwrap();
            std::fs::write(&target, "#!/usr/bin/env node\n").unwrap();
            std::fs::set_permissions(&target, std::fs::Permissions::from_mode(0o700)).unwrap();
            std::os::unix::fs::symlink(&target, bin.join("codex")).unwrap();
            std::fs::write(bin.join("node"), "#!/bin/sh\nprintf 'synthetic-node'\n").unwrap();
            std::fs::set_permissions(bin.join("node"), std::fs::Permissions::from_mode(0o700))
                .unwrap();
        }
        let codex = find_codex_in_nvm(&root).unwrap();
        assert!(codex.starts_with(
            root.join(".nvm/versions/node/v22.3.0")
                .canonicalize()
                .unwrap()
        ));
        let output = Command::new(&codex)
            .env(
                "PATH",
                companion_path(&codex, Some("/usr/bin:/bin".into())).unwrap(),
            )
            .output()
            .unwrap();
        assert!(output.status.success());
        assert_eq!(output.stdout, b"synthetic-node");
        assert!(find_codex_in_nvm(Path::new("relative")).is_none());
        std::fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn buffered_reply_accepts_large_unicode_transcript_and_preserves_next_frame() {
        let value = json!({"id":1,"ok":true,"value":{"text":"🎸".repeat(120_000)}});
        let mut bytes = serde_json::to_vec(&value).unwrap();
        bytes.extend_from_slice(b"\n{\"id\":2}\n");
        let mut reader = BufReader::new(std::io::Cursor::new(bytes));
        assert_eq!(read_reply(&mut reader).unwrap(), value);
        assert_eq!(read_reply(&mut reader).unwrap(), json!({"id":2}));
    }
    #[test]
    fn shutdown_interrupts_in_flight_request_and_prevents_relaunch() {
        let _guard = test_lock();
        let root = fixture("#!/bin/sh\ntrap '' TERM\nwhile IFS= read -r line; do touch \"$GIGI_DATA_DIR/waiting\"; (sleep 2; touch \"$GIGI_DATA_DIR/leaked\") & sleep 10; done\n");
        let worker_root = root.clone();
        let worker = std::thread::spawn(move || {
            dispatch_with_timeout(
                &worker_root,
                &worker_root,
                "agent.chat.send",
                json!({"message":"hi"}),
                Duration::from_secs(10),
            )
        });
        let deadline = Instant::now() + Duration::from_secs(3);
        while !root.join("waiting").exists() && Instant::now() < deadline {
            std::thread::sleep(Duration::from_millis(10));
        }
        assert!(root.join("waiting").exists());
        let started = Instant::now();
        cancel_all();
        assert!(started.elapsed() < Duration::from_secs(2));
        assert!(worker.join().unwrap().is_err());
        assert!(dispatch(&root, &root, "agent.chat.status", json!({}))
            .unwrap_err()
            .contains("shutting down"));
        std::thread::sleep(Duration::from_millis(2200));
        assert!(!root.join("leaked").exists());
        std::fs::remove_dir_all(root).unwrap();
    }
}
