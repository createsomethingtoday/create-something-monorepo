//! Loom Configuration
//!
//! Handles multi-repo configuration, similar to Beads' config.yaml pattern.
//! Allows hydrating from multiple repositories while routing writes correctly.
//!
//! ## Example config.toml
//!
//! ```toml
//! # .loom/config.toml
//!
//! # Repository identifier (used in unified views)
//! repo-id = "csm"
//! repo-name = "CREATE SOMETHING"
//!
//! # Issue prefix for this repository
//! issue-prefix = "lm"
//!
//! # Multi-repo configuration
//! [repos]
//! primary = "."
//! additional = [
//!     "~/Documents/Github/WORKWAY",
//!     "~/Documents/Github/other-project"
//! ]
//!
//! # Agent mapping for backfill
//! [agents]
//! "Micah Johnson" = "human"
//! "claude@anthropic.com" = "claude-code"
//! ```

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ConfigError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("TOML parse error: {0}")]
    Toml(#[from] toml::de::Error),
    
    #[error("TOML serialize error: {0}")]
    TomlSerialize(#[from] toml::ser::Error),
    
    #[error("Config not found at {0}")]
    NotFound(PathBuf),
}

/// Loom configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub struct LoomConfig {
    /// Short identifier for this repository (e.g., "csm", "ww")
    #[serde(default)]
    pub repo_id: Option<String>,
    
    /// Human-readable repository name
    #[serde(default)]
    pub repo_name: Option<String>,
    
    /// Issue ID prefix for this repository (defaults to "lm")
    #[serde(default = "default_issue_prefix")]
    pub issue_prefix: String,
    
    /// Multi-repo configuration
    #[serde(default)]
    pub repos: RepoConfig,
    
    /// Agent mapping for backfill (git author -> loom agent ID)
    #[serde(default)]
    pub agents: HashMap<String, String>,
    
    /// Backfill configuration
    #[serde(default)]
    pub backfill: BackfillConfig,
    
    /// Sync configuration
    #[serde(default)]
    pub sync: SyncConfig,
}

fn default_issue_prefix() -> String {
    "lm".to_string()
}

impl Default for LoomConfig {
    fn default() -> Self {
        Self {
            repo_id: None,
            repo_name: None,
            issue_prefix: default_issue_prefix(),
            repos: RepoConfig::default(),
            agents: HashMap::new(),
            backfill: BackfillConfig::default(),
            sync: SyncConfig::default(),
        }
    }
}

/// Multi-repo configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepoConfig {
    /// Primary repository path (where this database lives)
    #[serde(default = "default_primary")]
    pub primary: String,
    
    /// Additional repositories to hydrate from (read-only)
    #[serde(default)]
    pub additional: Vec<String>,
}

fn default_primary() -> String {
    ".".to_string()
}

impl Default for RepoConfig {
    fn default() -> Self {
        Self {
            primary: default_primary(),
            additional: Vec::new(),
        }
    }
}

/// Backfill configuration
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "kebab-case")]
pub struct BackfillConfig {
    /// Custom issue patterns for this repo (regex)
    #[serde(default)]
    pub issue_patterns: Vec<String>,
    
    /// Path to Beads directory (relative to repo root)
    #[serde(default)]
    pub beads_path: Option<String>,
}

/// Sync configuration
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "kebab-case")]
pub struct SyncConfig {
    /// Git branch for loom sync commits
    #[serde(default)]
    pub sync_branch: Option<String>,
    
    /// Auto-sync on task completion
    #[serde(default)]
    pub auto_sync: bool,
}

impl LoomConfig {
    /// Load config from a directory (looks for .loom/config.toml)
    pub fn load(root: impl AsRef<Path>) -> Result<Self, ConfigError> {
        let config_path = root.as_ref().join(".loom").join("config.toml");
        
        if !config_path.exists() {
            return Ok(Self::default());
        }
        
        let content = std::fs::read_to_string(&config_path)?;
        let config: LoomConfig = toml::from_str(&content)?;
        Ok(config)
    }
    
    /// Load from a specific file path
    pub fn load_from(path: impl AsRef<Path>) -> Result<Self, ConfigError> {
        let path = path.as_ref();
        if !path.exists() {
            return Err(ConfigError::NotFound(path.to_path_buf()));
        }
        
        let content = std::fs::read_to_string(path)?;
        let config: LoomConfig = toml::from_str(&content)?;
        Ok(config)
    }
    
    /// Save config to a directory
    pub fn save(&self, root: impl AsRef<Path>) -> Result<(), ConfigError> {
        let config_path = root.as_ref().join(".loom").join("config.toml");
        
        // Ensure directory exists
        if let Some(parent) = config_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        
        let content = toml::to_string_pretty(self)?;
        std::fs::write(&config_path, content)?;
        Ok(())
    }
    
    /// Get the effective repo ID (falls back to directory name)
    pub fn effective_repo_id(&self, root: impl AsRef<Path>) -> String {
        if let Some(ref id) = self.repo_id {
            return id.clone();
        }
        
        // Fall back to directory name
        root.as_ref()
            .file_name()
            .and_then(|n| n.to_str())
            .map(|s| s.to_lowercase().replace(' ', "-"))
            .unwrap_or_else(|| "unknown".to_string())
    }
    
    /// Get all repository paths (primary + additional), expanded
    pub fn all_repo_paths(&self, root: impl AsRef<Path>) -> Vec<PathBuf> {
        let mut paths = Vec::new();
        
        // Primary
        let primary = if self.repos.primary == "." {
            root.as_ref().to_path_buf()
        } else {
            expand_path(&self.repos.primary)
        };
        paths.push(primary);
        
        // Additional
        for additional in &self.repos.additional {
            paths.push(expand_path(additional));
        }
        
        paths
    }
    
    /// Check if a path is the primary repository
    pub fn is_primary(&self, path: impl AsRef<Path>, root: impl AsRef<Path>) -> bool {
        let primary = if self.repos.primary == "." {
            root.as_ref().to_path_buf()
        } else {
            expand_path(&self.repos.primary)
        };
        
        // Canonicalize for comparison
        let path_canon = std::fs::canonicalize(path.as_ref()).ok();
        let primary_canon = std::fs::canonicalize(&primary).ok();
        
        match (path_canon, primary_canon) {
            (Some(p), Some(pr)) => p == pr,
            _ => false,
        }
    }
    
    /// Create a default config for a new repository
    pub fn for_repo(repo_id: &str, repo_name: &str) -> Self {
        Self {
            repo_id: Some(repo_id.to_string()),
            repo_name: Some(repo_name.to_string()),
            issue_prefix: "lm".to_string(),
            repos: RepoConfig::default(),
            agents: HashMap::new(),
            backfill: BackfillConfig::default(),
            sync: SyncConfig::default(),
        }
    }
    
    /// Write default config file with comments
    pub fn write_default(root: impl AsRef<Path>) -> Result<(), ConfigError> {
        let config_path = root.as_ref().join(".loom").join("config.toml");
        
        // Ensure directory exists
        if let Some(parent) = config_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        
        let default_config = r#"# Loom Configuration
# This file configures Loom for this repository.
# All settings are optional - sensible defaults are used.

# Repository identifier (used in unified multi-repo views)
# repo-id = "myproject"

# Human-readable repository name
# repo-name = "My Project"

# Issue ID prefix (default: "lm")
# issue-prefix = "lm"

# Multi-repo configuration
# Allows seeing tasks from multiple repositories in one view
# while routing writes to the correct repository.
[repos]
primary = "."
# additional = [
#     "~/Documents/Github/other-project",
#     "~/work/another-repo"
# ]

# Agent mapping for backfill
# Maps git author names/emails to Loom agent IDs
[agents]
# "Your Name" = "human"
# "claude@anthropic.com" = "claude-code"

# Backfill configuration
[backfill]
# Custom issue patterns (regex) for this repo
# issue-patterns = ["MYPROJ-[0-9]+"]
# Path to Beads directory (relative to repo root)
# beads-path = ".beads"

# Sync configuration
[sync]
# Git branch for loom sync commits
# sync-branch = "loom-sync"
# Auto-sync on task completion
# auto-sync = false
"#;
        
        std::fs::write(&config_path, default_config)?;
        Ok(())
    }
}

/// Expand ~ and environment variables in a path
fn expand_path(path: &str) -> PathBuf {
    let expanded = if path.starts_with('~') {
        if let Some(home) = dirs::home_dir() {
            path.replacen('~', &home.to_string_lossy(), 1)
        } else {
            path.to_string()
        }
    } else {
        path.to_string()
    };
    
    PathBuf::from(expanded)
}

/// Repository info for unified views
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepoInfo {
    /// Repository identifier
    pub id: String,
    /// Repository name
    pub name: String,
    /// Path to repository
    pub path: PathBuf,
    /// Whether this is the primary repository
    pub is_primary: bool,
    /// Whether the repository is available (exists and has .loom/)
    pub available: bool,
}

impl LoomConfig {
    /// Get info about all configured repositories
    pub fn repo_info(&self, root: impl AsRef<Path>) -> Vec<RepoInfo> {
        let root = root.as_ref();
        let mut repos = Vec::new();
        
        // Primary repository
        let primary_path = if self.repos.primary == "." {
            root.to_path_buf()
        } else {
            expand_path(&self.repos.primary)
        };
        
        let primary_config = LoomConfig::load(&primary_path).ok();
        let primary_id = primary_config.as_ref()
            .and_then(|c| c.repo_id.clone())
            .unwrap_or_else(|| self.effective_repo_id(root));
        let primary_name = primary_config.as_ref()
            .and_then(|c| c.repo_name.clone())
            .unwrap_or_else(|| primary_id.clone());
        
        repos.push(RepoInfo {
            id: primary_id,
            name: primary_name,
            path: primary_path.clone(),
            is_primary: true,
            available: primary_path.join(".loom").exists(),
        });
        
        // Additional repositories
        for additional in &self.repos.additional {
            let path = expand_path(additional);
            let config = LoomConfig::load(&path).ok();
            
            let id = config.as_ref()
                .and_then(|c| c.repo_id.clone())
                .unwrap_or_else(|| {
                    path.file_name()
                        .and_then(|n| n.to_str())
                        .map(|s| s.to_lowercase().replace(' ', "-"))
                        .unwrap_or_else(|| "unknown".to_string())
                });
            
            let name = config.as_ref()
                .and_then(|c| c.repo_name.clone())
                .unwrap_or_else(|| id.clone());
            
            repos.push(RepoInfo {
                id,
                name,
                path: path.clone(),
                is_primary: false,
                available: path.join(".loom").exists(),
            });
        }
        
        repos
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    
    #[test]
    fn test_default_config() {
        let config = LoomConfig::default();
        assert_eq!(config.issue_prefix, "lm");
        assert_eq!(config.repos.primary, ".");
        assert!(config.repos.additional.is_empty());
    }
    
    #[test]
    fn test_save_and_load() {
        let dir = tempdir().unwrap();
        std::fs::create_dir_all(dir.path().join(".loom")).unwrap();
        
        let config = LoomConfig {
            repo_id: Some("test".to_string()),
            repo_name: Some("Test Repo".to_string()),
            issue_prefix: "tr".to_string(),
            repos: RepoConfig {
                primary: ".".to_string(),
                additional: vec!["~/other".to_string()],
            },
            ..Default::default()
        };
        
        config.save(dir.path()).unwrap();
        
        let loaded = LoomConfig::load(dir.path()).unwrap();
        assert_eq!(loaded.repo_id, Some("test".to_string()));
        assert_eq!(loaded.repos.additional.len(), 1);
    }
    
    #[test]
    fn test_effective_repo_id() {
        let config = LoomConfig::default();
        let id = config.effective_repo_id("/path/to/my-project");
        assert_eq!(id, "my-project");
        
        let config = LoomConfig {
            repo_id: Some("custom".to_string()),
            ..Default::default()
        };
        let id = config.effective_repo_id("/path/to/my-project");
        assert_eq!(id, "custom");
    }
}
