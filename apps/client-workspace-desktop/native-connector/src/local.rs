use crate::{Config, Result};
use sha2::{Digest, Sha256};
use std::{
    fs::{self, File, OpenOptions},
    io::{Read, Write},
    os::{
        fd::AsRawFd,
        unix::fs::{DirBuilderExt, MetadataExt, OpenOptionsExt},
    },
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

fn owner(meta: &fs::Metadata) -> bool {
    meta.uid() == unsafe { libc::geteuid() }
}
pub fn private_read(path: &Path) -> Result<String> {
    let mut file = private_file(path, false)?;
    if file
        .metadata()
        .map_err(|_| "private_file_unavailable")?
        .len()
        > 16384
    {
        return Err("private_file_too_large");
    }
    let mut data = String::new();
    file.read_to_string(&mut data)
        .map_err(|_| "private_file_unreadable")?;
    Ok(data)
}
fn private_file(path: &Path, create: bool) -> Result<File> {
    let file = OpenOptions::new()
        .read(true)
        .append(create)
        .create(create)
        .mode(0o600)
        .custom_flags(libc::O_NOFOLLOW | libc::O_CLOEXEC)
        .open(path)
        .map_err(|_| "private_file_unavailable")?;
    let meta = file.metadata().map_err(|_| "private_file_unavailable")?;
    if !meta.is_file() || !owner(&meta) || meta.mode() & 0o077 != 0 || meta.nlink() != 1 {
        return Err("private_file_permissions");
    }
    Ok(file)
}
pub fn require_private_file(path: &Path) -> Result<()> {
    private_file(path, false).map(|_| ())
}

/// State must already be under a client-owned directory; never adopt a symlink.
pub struct State {
    root: PathBuf,
    directory: File,
}
impl State {
    pub fn open(root: &Path) -> Result<Self> {
        match fs::DirBuilder::new().mode(0o700).create(root) {
            Ok(()) => (),
            Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => (),
            Err(_) => return Err("state_unavailable"),
        }
        let meta = fs::symlink_metadata(root).map_err(|_| "state_unavailable")?;
        if !meta.is_dir()
            || !owner(&meta)
            || meta.mode() & 0o077 != 0
            || fs::canonicalize(root).map_err(|_| "state_unavailable")? != root
        {
            return Err("state_permissions");
        }
        let directory = OpenOptions::new()
            .read(true)
            .custom_flags(libc::O_DIRECTORY | libc::O_NOFOLLOW | libc::O_CLOEXEC)
            .open(root)
            .map_err(|_| "state_unavailable")?;
        let state = Self {
            root: root.into(),
            directory,
        };
        state.check_directory()?;
        Ok(state)
    }
    fn check_directory(&self) -> Result<()> {
        let actual = fs::symlink_metadata(&self.root).map_err(|_| "state_unavailable")?;
        let held = self.directory.metadata().map_err(|_| "state_unavailable")?;
        if !actual.is_dir()
            || !owner(&actual)
            || actual.mode() & 0o077 != 0
            || actual.dev() != held.dev()
            || actual.ino() != held.ino()
        {
            return Err("state_replaced");
        }
        Ok(())
    }
    pub fn lock(&self) -> Result<File> {
        self.lock_named("supervisor.lock")
    }
    pub fn guardian_lock(&self) -> Result<File> {
        self.lock_named("guardian.lock")
    }
    fn lock_named(&self, name: &str) -> Result<File> {
        self.check_directory()?;
        let file = private_file(&self.root.join(name), true)?;
        if unsafe { libc::flock(file.as_raw_fd(), libc::LOCK_EX | libc::LOCK_NB) } != 0 {
            return Err("connector_already_running");
        }
        Ok(file)
    }
    pub fn ensure_quiescent(&self) -> Result<()> {
        self.check_directory()?;
        match fs::symlink_metadata(self.root.join("active")) {
            Ok(_) => Err("previous_disconnect_unconfirmed"),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(_) => Err("previous_disconnect_unconfirmed"),
        }
    }
    pub fn mark_active(&self) -> Result<()> {
        self.ensure_quiescent()?;
        self.create("active", b"guardian-owned\n")
    }
    /// Call only after all owned children have stopped. A crash leaves the
    /// marker in place so restart/revocation cannot assert a clean disconnect.
    pub fn clear_active(&self) -> Result<()> {
        self.check_directory()?;
        require_private_file(&self.root.join("active"))?;
        fs::remove_file(self.root.join("active")).map_err(|_| "state_write_failed")?;
        self.directory.sync_all().map_err(|_| "state_write_failed")
    }
    pub fn bind(&self, config: &Config) -> Result<()> {
        let bytes = serde_json::to_vec(config).map_err(|_| "invalid_config")?;
        let digest = format!("{:x}", Sha256::digest(bytes));
        let path = self.root.join("enrollment.sha256");
        match self.create("enrollment.sha256", digest.as_bytes()) {
            Ok(()) => Ok(()),
            Err(_) if private_read(&path)? == digest => Ok(()),
            Err(_) => Err("enrollment_mismatch"),
        }
    }
    fn create(&self, name: &str, data: &[u8]) -> Result<()> {
        self.check_directory()?;
        let mut file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .mode(0o600)
            .custom_flags(libc::O_NOFOLLOW | libc::O_CLOEXEC)
            .open(self.root.join(name))
            .map_err(|_| "state_write_failed")?;
        file.write_all(data)
            .and_then(|_| file.sync_all())
            .map_err(|_| "state_write_failed")?;
        File::open(&self.root)
            .and_then(|f| f.sync_all())
            .map_err(|_| "state_write_failed")
    }
    pub fn revoked(&self) -> Result<bool> {
        self.check_directory()?;
        match fs::symlink_metadata(self.root.join("revoked")) {
            Ok(_) => Ok(true), // Even an invalid marker must disable access.
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(false),
            Err(_) => Err("revocation_unreadable"),
        }
    }
    pub fn ensure_enabled(&self) -> Result<()> {
        if self.revoked()? {
            Err("connector_revoked")
        } else {
            Ok(())
        }
    }
    pub fn revoke(&self) -> Result<()> {
        if !self.revoked()? {
            self.create("revoked", b"revoked\n")?;
        }
        self.audit(Event::Revoked)
    }
    pub fn audit(&self, event: Event) -> Result<()> {
        self.check_directory()?;
        let mut file = private_file(&self.root.join("audit.jsonl"), true)?;
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|_| "clock_invalid")?
            .as_secs();
        // One append per event; only fixed enum values and a timestamp, never child output.
        let line = format!(
            "{{\"timestamp\":{timestamp},\"event\":\"{}\"}}\n",
            event.name()
        );
        file.write_all(line.as_bytes())
            .and_then(|_| file.sync_all())
            .map_err(|_| "audit_failed")
    }
    pub fn write_tunnel_config(&self, config: &Config) -> Result<PathBuf> {
        let path = self.root.join("tunnel.json");
        // Removal unlinks the entry, never follows a potentially planted symlink.
        match fs::remove_file(&path) {
            Ok(()) => (),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => (),
            Err(_) => return Err("state_write_failed"),
        }
        self.create(
            "tunnel.json",
            &serde_json::to_vec(&config.tunnel_config()).map_err(|_| "invalid_config")?,
        )?;
        Ok(path)
    }
}
#[derive(Clone, Copy)]
pub enum Event {
    Approved,
    Declined,
    Starting,
    ChildrenStarted,
    Stopped,
    Failed,
    Revoked,
}
impl Event {
    fn name(self) -> &'static str {
        match self {
            Self::Approved => "approved",
            Self::Declined => "declined",
            Self::Starting => "starting",
            Self::ChildrenStarted => "children_started",
            Self::Stopped => "stopped",
            Self::Failed => "failed",
            Self::Revoked => "revoked",
        }
    }
}
