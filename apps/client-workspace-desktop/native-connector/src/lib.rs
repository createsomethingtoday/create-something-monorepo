//! Local supervisor policy. No HTTP control API and no credential parsing.
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    collections::BTreeMap,
    path::{Component, Path, PathBuf},
};

pub mod local;
pub mod supervisor;

pub type Result<T> = std::result::Result<T, &'static str>;

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct Config {
    pub version: u8,
    pub client_id: String,
    pub hostname: String,
    pub access_team: String,
    pub access_audience: String,
    pub allowed_email: String,
    pub tunnel_id: String,
    pub credentials_file: PathBuf,
    pub resources: PathBuf,
    pub codex_bin: PathBuf,
    #[serde(default)]
    pub codex_node_bin: Option<PathBuf>,
    pub client_home: PathBuf,
    pub state_dir: PathBuf,
    pub port: u16,
}

fn label(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 63
        && value
            .bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
        && !value.starts_with('-')
        && !value.ends_with('-')
}
fn hostname(value: &str) -> bool {
    value.len() <= 253
        && value.contains('.')
        && value.split('.').all(label)
        && !value.bytes().all(|b| b.is_ascii_digit() || b == b'.')
}
fn absolute(path: &Path) -> bool {
    path.is_absolute()
        && path != Path::new("/")
        && path
            .components()
            .all(|c| matches!(c, Component::RootDir | Component::Normal(_)))
        && path
            .to_str()
            .is_some_and(|s| !s.chars().any(char::is_control))
}
impl Config {
    pub fn parse(input: &str) -> Result<Self> {
        if input.len() > 16384 {
            return Err("invalid_config");
        }
        let c: Self = serde_json::from_str(input).map_err(|_| "invalid_config")?;
        let email: Vec<_> = c.allowed_email.split('@').collect();
        let uuid = c.tunnel_id.as_bytes();
        if c.version != 1
            || !label(&c.client_id)
            || !hostname(&c.hostname)
            || !label(&c.access_team)
            || c.access_audience.len() != 64
            || !c.access_audience.bytes().all(|b| b.is_ascii_hexdigit())
            || email.len() != 2
            || email[0].is_empty()
            || !hostname(email[1])
            || !email[0]
                .bytes()
                .all(|b| b.is_ascii_alphanumeric() || b"._+-".contains(&b))
            || uuid.len() != 36
            || !uuid.iter().enumerate().all(|(i, b)| {
                if [8, 13, 18, 23].contains(&i) {
                    *b == b'-'
                } else {
                    b.is_ascii_hexdigit()
                }
            })
            || c.port < 1024
            || [
                &c.credentials_file,
                &c.resources,
                &c.codex_bin,
                &c.client_home,
                &c.state_dir,
            ]
            .iter()
            .any(|p| !absolute(p))
            || c.state_dir.starts_with(&c.resources)
            || c.resources.starts_with(&c.state_dir)
            || c.client_home.starts_with(&c.state_dir)
            || c.credentials_file.starts_with(&c.state_dir)
            || c.codex_node_bin.as_ref().is_some_and(|path| {
                !absolute(path) || path.file_name().is_none_or(|name| name != "node")
            })
        {
            return Err("invalid_config");
        }
        Ok(c)
    }
    pub fn origin(&self) -> String {
        format!("https://{}", self.hostname)
    }
    pub fn tunnel_config(&self) -> Value {
        json!({
            "tunnel": self.tunnel_id,
            "credentials-file": self.credentials_file,
            "ingress": [{
                "hostname": self.hostname,
                "service": format!("http://127.0.0.1:{}", self.port),
                "originRequest": {"access": {
                    "required": true, "teamName": self.access_team, "audTag": [self.access_audience]
                }}
            }, {"service": "http_status:404"}]
        })
    }
    pub fn runtime_env(&self, capability: &str) -> BTreeMap<String, String> {
        let text = |p: PathBuf| p.to_string_lossy().into_owned();
        let mut path_dirs = Vec::new();
        if let Some(node) = &self.codex_node_bin {
            path_dirs.push(node.parent().unwrap().display().to_string());
        }
        path_dirs.push(self.codex_bin.parent().unwrap().display().to_string());
        path_dirs.extend(["/usr/bin", "/bin", "/usr/sbin", "/sbin"].map(str::to_string));
        [
            ("HOST", "127.0.0.1".into()),
            ("PORT", self.port.to_string()),
            ("NODE_ENV", "production".into()),
            ("CLIENT_WORKSPACE_DESKTOP", "1".into()),
            ("CLIENT_WORKSPACE_REMOTE", "1".into()),
            ("CLIENT_WORKSPACE_MANAGED_CONNECTOR", "1".into()),
            (
                "CLIENT_WORKSPACE_LOOPBACK_ORIGIN",
                format!("http://127.0.0.1:{}", self.port),
            ),
            ("CLIENT_WORKSPACE_CAPABILITY_TOKEN", capability.into()),
            ("CLIENT_WORKSPACE_REMOTE_ORIGIN", self.origin()),
            (
                "CLIENT_WORKSPACE_ACCESS_TEAM_DOMAIN",
                format!("https://{}.cloudflareaccess.com", self.access_team),
            ),
            ("CLIENT_WORKSPACE_ACCESS_AUD", self.access_audience.clone()),
            ("CLIENT_WORKSPACE_ACCESS_EMAIL", self.allowed_email.clone()),
            (
                "CLIENT_WORKSPACE_STATE_ROOT",
                text(self.state_dir.join("workspace-state")),
            ),
            (
                "CLIENT_WORKSPACE_MANAGED_ROOT",
                text(self.state_dir.join("workspaces")),
            ),
            (
                "CLIENT_WORKSPACE_TRUST_KEYRING_FILE",
                text(
                    self.resources
                        .join("trust/client-workspace-trust-keyring.json"),
                ),
            ),
            (
                "CLIENT_WORKSPACE_CODEX_COMMAND",
                text(self.codex_bin.clone()),
            ),
            ("HOME", text(self.client_home.clone())),
            ("PATH", path_dirs.join(":")),
        ]
        .into_iter()
        .map(|(k, v)| (k.into(), v))
        .collect()
    }
}

pub fn approval_matches(client: &str, answer: &str) -> bool {
    answer.strip_suffix('\n').unwrap_or(answer) == format!("CONNECT {client}")
}
