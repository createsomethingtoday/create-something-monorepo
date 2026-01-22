//! Git Sync
//!
//! Like Beads' git-based sync, but Rust-native.
//! Allows team collaboration on tasks via git.

use std::path::{Path, PathBuf};
use std::process::Command;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::work::{Task, WorkStore};

#[derive(Error, Debug)]
pub enum SyncError {
    #[error("Git error: {0}")]
    Git(String),
    
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
    
    #[error("Work store error: {0}")]
    Work(#[from] crate::work::WorkError),
    
    #[error("Not a git repository")]
    NotGitRepo,
    
    #[error("Sync branch not configured")]
    NoBranch,
}

/// Sync state tracking
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct SyncState {
    /// Last sync timestamp
    pub last_sync: Option<DateTime<Utc>>,
    /// Last synced commit
    pub last_commit: Option<String>,
    /// Tasks exported since last sync
    pub pending_exports: u32,
    /// Tasks imported since last sync
    pub pending_imports: u32,
}

/// Git sync manager
pub struct GitSync {
    root: PathBuf,
    branch: String,
    state: SyncState,
}

impl GitSync {
    /// Create a new git sync manager
    pub fn new(root: impl AsRef<Path>, branch: impl Into<String>) -> Result<Self, SyncError> {
        let root = root.as_ref().to_path_buf();
        
        // Check if we're in a git repo
        if !root.join(".git").exists() && !Self::is_in_git_repo(&root)? {
            return Err(SyncError::NotGitRepo);
        }
        
        let branch = branch.into();
        
        // Load state
        let state_path = root.join(".loom").join("sync-state.json");
        let state = if state_path.exists() {
            let content = std::fs::read_to_string(&state_path)?;
            serde_json::from_str(&content)?
        } else {
            SyncState::default()
        };
        
        Ok(Self { root, branch, state })
    }
    
    fn is_in_git_repo(path: &Path) -> Result<bool, SyncError> {
        let output = Command::new("git")
            .args(["rev-parse", "--is-inside-work-tree"])
            .current_dir(path)
            .output()?;
        
        Ok(output.status.success())
    }
    
    /// Export tasks to JSONL file for git sync
    pub fn export(&mut self, store: &WorkStore) -> Result<PathBuf, SyncError> {
        let tasks = store.list_all()?;
        let export_path = self.root.join(".loom").join("tasks.jsonl");
        
        let mut lines = Vec::new();
        for task in &tasks {
            let json = serde_json::to_string(task)?;
            lines.push(json);
        }
        
        std::fs::write(&export_path, lines.join("\n"))?;
        
        self.state.pending_exports = tasks.len() as u32;
        self.save_state()?;
        
        Ok(export_path)
    }
    
    /// Import tasks from JSONL file
    pub fn import(&mut self, store: &mut WorkStore) -> Result<u32, SyncError> {
        let import_path = self.root.join(".loom").join("tasks.jsonl");
        
        if !import_path.exists() {
            return Ok(0);
        }
        
        let content = std::fs::read_to_string(&import_path)?;
        let mut count = 0;
        
        for line in content.lines() {
            if line.trim().is_empty() {
                continue;
            }
            
            let task: Task = serde_json::from_str(line)?;
            
            // Check if task exists
            if store.get(&task.id)?.is_none() {
                // Import new task
                store.create(crate::work::CreateTask {
                    title: task.title,
                    description: task.description,
                    priority: task.priority,
                    labels: task.labels,
                    parent: task.parent,
                    evidence: task.evidence,
                    repo: task.repo,
                })?;
                count += 1;
            }
            // TODO: Merge existing tasks if updated
        }
        
        self.state.pending_imports = count;
        self.save_state()?;
        
        Ok(count)
    }
    
    /// Push changes to remote
    pub fn push(&mut self) -> Result<(), SyncError> {
        // Add changes
        self.git(&["add", ".loom/tasks.jsonl"])?;
        
        // Check if there are changes to commit
        let status = self.git(&["status", "--porcelain", ".loom/tasks.jsonl"])?;
        if status.trim().is_empty() {
            return Ok(()); // Nothing to commit
        }
        
        // Commit
        let now = Utc::now();
        let msg = format!("loom sync: {} tasks at {}", self.state.pending_exports, now.format("%Y-%m-%d %H:%M"));
        self.git(&["commit", "-m", &msg, ".loom/tasks.jsonl"])?;
        
        // Push
        self.git(&["push", "origin", &self.branch])?;
        
        // Update state
        let commit = self.git(&["rev-parse", "HEAD"])?;
        self.state.last_sync = Some(now);
        self.state.last_commit = Some(commit.trim().to_string());
        self.state.pending_exports = 0;
        self.save_state()?;
        
        Ok(())
    }
    
    /// Pull changes from remote
    pub fn pull(&mut self, store: &mut WorkStore) -> Result<u32, SyncError> {
        // Fetch
        self.git(&["fetch", "origin", &self.branch])?;
        
        // Check if there are changes
        let local = self.git(&["rev-parse", &self.branch])?;
        let remote = self.git(&["rev-parse", &format!("origin/{}", self.branch)])?;
        
        if local.trim() == remote.trim() {
            return Ok(0); // No changes
        }
        
        // Pull
        self.git(&["pull", "origin", &self.branch])?;
        
        // Import
        let count = self.import(store)?;
        
        // Update state
        self.state.last_sync = Some(Utc::now());
        self.state.last_commit = Some(remote.trim().to_string());
        self.save_state()?;
        
        Ok(count)
    }
    
    /// Full sync: pull, merge, push
    pub fn sync(&mut self, store: &mut WorkStore) -> Result<SyncResult, SyncError> {
        let pulled = self.pull(store)?;
        self.export(store)?;
        self.push()?;
        
        Ok(SyncResult {
            imported: pulled,
            exported: self.state.pending_exports,
        })
    }
    
    fn git(&self, args: &[&str]) -> Result<String, SyncError> {
        let output = Command::new("git")
            .args(args)
            .current_dir(&self.root)
            .output()?;
        
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(SyncError::Git(stderr.to_string()));
        }
        
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    }
    
    fn save_state(&self) -> Result<(), SyncError> {
        let state_path = self.root.join(".loom").join("sync-state.json");
        let json = serde_json::to_string_pretty(&self.state)?;
        std::fs::write(state_path, json)?;
        Ok(())
    }
    
    /// Get current sync state
    pub fn state(&self) -> &SyncState {
        &self.state
    }
}

/// Result of a sync operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncResult {
    pub imported: u32,
    pub exported: u32,
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_sync_state_serialization() {
        let state = SyncState {
            last_sync: Some(Utc::now()),
            last_commit: Some("abc123".to_string()),
            pending_exports: 5,
            pending_imports: 3,
        };
        
        let json = serde_json::to_string(&state).unwrap();
        let parsed: SyncState = serde_json::from_str(&json).unwrap();
        
        assert_eq!(parsed.pending_exports, 5);
        assert_eq!(parsed.pending_imports, 3);
    }
}
