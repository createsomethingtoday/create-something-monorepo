//! Backfill - Import historical work from Git and Beads
//!
//! This module enables backfilling Loom's agent_history and work tables
//! from Git commits and Beads issues for analytics and routing intelligence.
//!
//! ## Usage
//!
//! ```bash
//! # Backfill last 30 days
//! lm backfill --since "30 days ago"
//!
//! # Backfill specific date range
//! lm backfill --since "2025-12-01" --until "2026-01-01"
//!
//! # Dry run to preview
//! lm backfill --since "2025-12-01" --dry-run
//! ```

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::Command;
use chrono::{DateTime, Utc, Duration, NaiveDate};
use regex::Regex;
use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::{Loom, CreateTask, Priority};

#[derive(Error, Debug)]
pub enum BackfillError {
    #[error("Git error: {0}")]
    Git(String),
    
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("Parse error: {0}")]
    Parse(String),
    
    #[error("Beads error: {0}")]
    Beads(String),
    
    #[error("Loom error: {0}")]
    Loom(#[from] crate::LoomError),
    
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
}

/// Options for backfill operation
#[derive(Debug, Clone, Default)]
pub struct BackfillOptions {
    /// Start date (inclusive)
    pub since: Option<DateTime<Utc>>,
    /// End date (inclusive)
    pub until: Option<DateTime<Utc>>,
    /// Filter by git author
    pub author: Option<String>,
    /// Path to Beads directory (defaults to ./csm/.beads or ./.beads)
    pub beads_path: Option<PathBuf>,
    /// Preview without writing
    pub dry_run: bool,
    /// Git repository path (defaults to current directory)
    pub repo_path: Option<PathBuf>,
    /// Agent mapping (git author -> loom agent ID)
    pub agent_mapping: HashMap<String, String>,
    /// Custom issue ID patterns (regex). If empty, uses defaults.
    /// Default patterns: csm-xxx, lm-xxx, bd-xxx, WORKWAY-xxx
    pub issue_patterns: Vec<String>,
}

/// A parsed git commit
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommitRecord {
    /// Commit hash (full SHA)
    pub hash: String,
    /// Short hash (first 7 chars)
    pub short_hash: String,
    /// Author name
    pub author: String,
    /// Author email
    pub email: String,
    /// Commit timestamp
    pub timestamp: DateTime<Utc>,
    /// Commit message (first line)
    pub message: String,
    /// Full commit message
    pub body: Option<String>,
    /// Files changed count
    pub files_changed: u32,
    /// Lines inserted
    pub insertions: u32,
    /// Lines deleted
    pub deletions: u32,
    /// Issue IDs referenced in message (e.g., csm-abc, lm-xyz)
    pub issue_ids: Vec<String>,
}

/// A Beads issue (from issues.jsonl)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BeadsIssue {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub description: Option<String>,
    pub status: String,
    #[serde(default)]
    pub priority: i32,
    #[serde(default)]
    pub issue_type: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    #[serde(default)]
    pub closed_at: Option<String>,
    #[serde(default)]
    pub close_reason: Option<String>,
    #[serde(default)]
    pub labels: Vec<String>,
    #[serde(default)]
    pub created_by: Option<String>,
}

/// A correlated record linking commits to issues
#[derive(Debug, Clone)]
pub struct CorrelatedRecord {
    pub commit: CommitRecord,
    pub issues: Vec<BeadsIssue>,
    pub inferred_agent: String,
    pub inferred_task_type: String,
    pub inferred_success: bool,
    pub inferred_duration_secs: f64,
}

/// Result of a backfill operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackfillResult {
    pub commits_scanned: u32,
    pub issues_found: u32,
    pub tasks_created: u32,
    pub executions_recorded: u32,
    pub by_agent: HashMap<String, AgentStats>,
    pub by_task_type: HashMap<String, TaskTypeStats>,
    pub dry_run: bool,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct AgentStats {
    pub executions: u32,
    pub successes: u32,
    pub failures: u32,
}

impl AgentStats {
    pub fn success_rate(&self) -> f64 {
        if self.executions == 0 {
            0.0
        } else {
            self.successes as f64 / self.executions as f64 * 100.0
        }
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct TaskTypeStats {
    pub count: u32,
    pub total_duration_secs: f64,
}

impl TaskTypeStats {
    pub fn avg_duration_hours(&self) -> f64 {
        if self.count == 0 {
            0.0
        } else {
            self.total_duration_secs / self.count as f64 / 3600.0
        }
    }
}

/// Backfill engine
pub struct Backfill {
    options: BackfillOptions,
    issue_pattern: Regex,
}

impl Backfill {
    /// Create a new backfill engine with the given options
    pub fn new(options: BackfillOptions) -> Self {
        // Build pattern from custom patterns or use defaults
        let pattern_str = if options.issue_patterns.is_empty() {
            // Default patterns: csm-xxx, lm-xxx, bd-xxx, WORKWAY-xxx (with optional dot notation)
            r"(csm-[a-z0-9]+(?:\.[a-z0-9]+)?|lm-[a-z0-9]+|bd-[a-z0-9]+|WORKWAY-[a-z0-9]+(?:\.[a-z0-9]+)?)".to_string()
        } else {
            // Build alternation from custom patterns
            format!("({})", options.issue_patterns.join("|"))
        };
        
        let issue_pattern = Regex::new(&pattern_str)
            .expect("Invalid regex pattern");
        
        Self {
            options,
            issue_pattern,
        }
    }
    
    /// Create with custom issue patterns
    pub fn with_patterns(mut options: BackfillOptions, patterns: Vec<&str>) -> Self {
        options.issue_patterns = patterns.into_iter().map(String::from).collect();
        Self::new(options)
    }
    
    /// Parse a relative date string like "30 days ago" or ISO date
    pub fn parse_date(s: &str) -> Result<DateTime<Utc>, BackfillError> {
        // Try ISO format first
        if let Ok(dt) = DateTime::parse_from_rfc3339(s) {
            return Ok(dt.with_timezone(&Utc));
        }
        
        // Try YYYY-MM-DD format
        if let Ok(date) = NaiveDate::parse_from_str(s, "%Y-%m-%d") {
            let dt = date.and_hms_opt(0, 0, 0)
                .ok_or_else(|| BackfillError::Parse("Invalid date".to_string()))?;
            return Ok(DateTime::from_naive_utc_and_offset(dt, Utc));
        }
        
        // Try relative format like "30 days ago"
        let s_lower = s.to_lowercase();
        if s_lower.ends_with("days ago") || s_lower.ends_with("day ago") {
            let parts: Vec<&str> = s_lower.split_whitespace().collect();
            if let Ok(days) = parts[0].parse::<i64>() {
                return Ok(Utc::now() - Duration::days(days));
            }
        }
        
        if s_lower.ends_with("weeks ago") || s_lower.ends_with("week ago") {
            let parts: Vec<&str> = s_lower.split_whitespace().collect();
            if let Ok(weeks) = parts[0].parse::<i64>() {
                return Ok(Utc::now() - Duration::weeks(weeks));
            }
        }
        
        if s_lower.ends_with("months ago") || s_lower.ends_with("month ago") {
            let parts: Vec<&str> = s_lower.split_whitespace().collect();
            if let Ok(months) = parts[0].parse::<i64>() {
                return Ok(Utc::now() - Duration::days(months * 30));
            }
        }
        
        Err(BackfillError::Parse(format!("Could not parse date: {}", s)))
    }
    
    /// Run the backfill operation
    pub fn run(&self, loom: &mut Loom) -> Result<BackfillResult, BackfillError> {
        let repo_path = self.options.repo_path.clone()
            .unwrap_or_else(|| PathBuf::from("."));
        
        // Step 1: Parse git commits
        let commits = self.parse_git_log(&repo_path)?;
        
        // Step 2: Load Beads issues
        let issues = self.load_beads_issues()?;
        let issues_map: HashMap<String, BeadsIssue> = issues
            .into_iter()
            .map(|i| (i.id.clone(), i))
            .collect();
        
        // Step 3: Correlate commits with issues
        let correlated = self.correlate(&commits, &issues_map);
        
        // Step 4: Record to Loom (unless dry run)
        let result = self.record_to_loom(loom, &correlated, &issues_map)?;
        
        Ok(result)
    }
    
    /// Parse git log and return commit records
    fn parse_git_log(&self, repo_path: &Path) -> Result<Vec<CommitRecord>, BackfillError> {
        let mut args = vec![
            "log".to_string(),
            "--format=%H|%h|%an|%ae|%aI|%s".to_string(),
            "--numstat".to_string(),
        ];
        
        if let Some(since) = &self.options.since {
            args.push(format!("--since={}", since.format("%Y-%m-%d")));
        }
        
        if let Some(until) = &self.options.until {
            args.push(format!("--until={}", until.format("%Y-%m-%d")));
        }
        
        if let Some(author) = &self.options.author {
            args.push(format!("--author={}", author));
        }
        
        let output = Command::new("git")
            .args(&args)
            .current_dir(repo_path)
            .output()?;
        
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(BackfillError::Git(stderr.to_string()));
        }
        
        let stdout = String::from_utf8_lossy(&output.stdout);
        self.parse_git_output(&stdout)
    }
    
    /// Parse git log output into CommitRecords
    fn parse_git_output(&self, output: &str) -> Result<Vec<CommitRecord>, BackfillError> {
        let mut commits = Vec::new();
        let mut current_commit: Option<CommitRecord> = None;
        let mut insertions = 0u32;
        let mut deletions = 0u32;
        let mut files_changed = 0u32;
        
        for line in output.lines() {
            // Check if this is a commit line (contains | separators)
            if line.contains('|') && line.len() > 40 {
                // Save previous commit if exists
                if let Some(mut commit) = current_commit.take() {
                    commit.insertions = insertions;
                    commit.deletions = deletions;
                    commit.files_changed = files_changed;
                    commits.push(commit);
                }
                
                // Parse new commit
                let parts: Vec<&str> = line.splitn(6, '|').collect();
                if parts.len() >= 6 {
                    let hash = parts[0].to_string();
                    let short_hash = parts[1].to_string();
                    let author = parts[2].to_string();
                    let email = parts[3].to_string();
                    let timestamp_str = parts[4];
                    let message = parts[5].to_string();
                    
                    // Parse timestamp
                    let timestamp = DateTime::parse_from_rfc3339(timestamp_str)
                        .map(|dt| dt.with_timezone(&Utc))
                        .unwrap_or_else(|_| Utc::now());
                    
                    // Extract issue IDs from message
                    let issue_ids: Vec<String> = self.issue_pattern
                        .find_iter(&message)
                        .map(|m| m.as_str().to_string())
                        .collect();
                    
                    current_commit = Some(CommitRecord {
                        hash,
                        short_hash,
                        author,
                        email,
                        timestamp,
                        message,
                        body: None,
                        files_changed: 0,
                        insertions: 0,
                        deletions: 0,
                        issue_ids,
                    });
                    
                    // Reset stats for new commit
                    insertions = 0;
                    deletions = 0;
                    files_changed = 0;
                }
            } else if !line.trim().is_empty() {
                // This is a numstat line: insertions deletions filename
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 3 {
                    if let (Ok(ins), Ok(del)) = (parts[0].parse::<u32>(), parts[1].parse::<u32>()) {
                        insertions += ins;
                        deletions += del;
                        files_changed += 1;
                    }
                }
            }
        }
        
        // Don't forget the last commit
        if let Some(mut commit) = current_commit {
            commit.insertions = insertions;
            commit.deletions = deletions;
            commit.files_changed = files_changed;
            commits.push(commit);
        }
        
        Ok(commits)
    }
    
    /// Load Beads issues from JSONL file
    fn load_beads_issues(&self) -> Result<Vec<BeadsIssue>, BackfillError> {
        let beads_path = self.options.beads_path.clone()
            .unwrap_or_else(|| PathBuf::from("csm/.beads"));
        
        let issues_path = beads_path.join("issues.jsonl");
        
        if !issues_path.exists() {
            // Try alternative path
            let alt_path = PathBuf::from(".beads").join("issues.jsonl");
            if alt_path.exists() {
                return self.parse_issues_jsonl(&alt_path);
            }
            
            // No beads found - return empty
            return Ok(Vec::new());
        }
        
        self.parse_issues_jsonl(&issues_path)
    }
    
    /// Parse issues.jsonl file
    fn parse_issues_jsonl(&self, path: &Path) -> Result<Vec<BeadsIssue>, BackfillError> {
        let content = std::fs::read_to_string(path)?;
        let mut issues = Vec::new();
        
        for line in content.lines() {
            if line.trim().is_empty() {
                continue;
            }
            
            match serde_json::from_str::<BeadsIssue>(line) {
                Ok(issue) => issues.push(issue),
                Err(e) => {
                    // Log but continue - some lines might be malformed
                    eprintln!("Warning: Failed to parse issue: {}", e);
                }
            }
        }
        
        Ok(issues)
    }
    
    /// Correlate commits with issues
    fn correlate(
        &self,
        commits: &[CommitRecord],
        issues_map: &HashMap<String, BeadsIssue>,
    ) -> Vec<CorrelatedRecord> {
        let mut correlated = Vec::new();
        
        for commit in commits {
            // Find matching issues
            let mut matching_issues = Vec::new();
            for issue_id in &commit.issue_ids {
                if let Some(issue) = issues_map.get(issue_id) {
                    matching_issues.push(issue.clone());
                }
            }
            
            // Infer agent from git author or mapping
            let inferred_agent = self.infer_agent(&commit.author, &commit.email);
            
            // Infer task type from issues or commit message
            let inferred_task_type = self.infer_task_type(commit, &matching_issues);
            
            // Infer success from issue status
            let inferred_success = self.infer_success(&matching_issues);
            
            // Infer duration from issue timestamps or estimate from LOC
            let inferred_duration_secs = self.infer_duration(commit, &matching_issues);
            
            correlated.push(CorrelatedRecord {
                commit: commit.clone(),
                issues: matching_issues,
                inferred_agent,
                inferred_task_type,
                inferred_success,
                inferred_duration_secs,
            });
        }
        
        correlated
    }
    
    /// Infer agent ID from git author
    fn infer_agent(&self, author: &str, email: &str) -> String {
        // Check explicit mapping first
        if let Some(agent) = self.options.agent_mapping.get(author) {
            return agent.clone();
        }
        if let Some(agent) = self.options.agent_mapping.get(email) {
            return agent.clone();
        }
        
        // Check for known patterns
        let author_lower = author.to_lowercase();
        let email_lower = email.to_lowercase();
        
        if author_lower.contains("claude") || email_lower.contains("claude") {
            return "claude-code".to_string();
        }
        if author_lower.contains("cursor") || email_lower.contains("cursor") {
            return "cursor".to_string();
        }
        if author_lower.contains("codex") || email_lower.contains("codex") {
            return "codex".to_string();
        }
        if author_lower.contains("gemini") || email_lower.contains("gemini") {
            return "gemini".to_string();
        }
        
        // Default to "human" for unrecognized authors
        "human".to_string()
    }
    
    /// Infer task type from commit and issues
    fn infer_task_type(&self, commit: &CommitRecord, issues: &[BeadsIssue]) -> String {
        // Check issue types first
        for issue in issues {
            if let Some(ref issue_type) = issue.issue_type {
                match issue_type.to_lowercase().as_str() {
                    "bug" => return "bug".to_string(),
                    "feature" => return "feature".to_string(),
                    "task" => return "task".to_string(),
                    "refactor" => return "refactor".to_string(),
                    _ => {}
                }
            }
        }
        
        // Infer from commit message
        let msg_lower = commit.message.to_lowercase();
        
        if msg_lower.starts_with("fix") || msg_lower.contains("bug") || msg_lower.contains("hotfix") {
            return "bug".to_string();
        }
        if msg_lower.starts_with("feat") || msg_lower.contains("feature") || msg_lower.contains("add") {
            return "feature".to_string();
        }
        if msg_lower.contains("refactor") || msg_lower.contains("cleanup") || msg_lower.contains("dry") {
            return "refactor".to_string();
        }
        if msg_lower.contains("test") || msg_lower.contains("spec") {
            return "testing".to_string();
        }
        if msg_lower.contains("doc") || msg_lower.contains("readme") {
            return "docs".to_string();
        }
        if msg_lower.contains("style") || msg_lower.contains("css") || msg_lower.contains("ui") {
            return "ui".to_string();
        }
        
        "task".to_string()
    }
    
    /// Infer success from issue status
    fn infer_success(&self, issues: &[BeadsIssue]) -> bool {
        if issues.is_empty() {
            // Assume commits without linked issues succeeded
            return true;
        }
        
        // Success if any linked issue is closed
        issues.iter().any(|i| i.status == "closed")
    }
    
    /// Infer duration from issue timestamps or estimate from LOC
    fn infer_duration(&self, commit: &CommitRecord, issues: &[BeadsIssue]) -> f64 {
        // Try to get duration from issue timestamps
        for issue in issues {
            if let (Some(closed_at), created_at) = (&issue.closed_at, &issue.created_at) {
                if let (Ok(closed), Ok(created)) = (
                    DateTime::parse_from_rfc3339(closed_at),
                    DateTime::parse_from_rfc3339(created_at),
                ) {
                    let duration = closed.signed_duration_since(created);
                    let secs = duration.num_seconds() as f64;
                    if secs > 0.0 {
                        return secs;
                    }
                }
            }
        }
        
        // Estimate from lines of code changed
        // Rough heuristic: ~10 LOC per minute for simple changes
        let total_loc = commit.insertions + commit.deletions;
        let estimated_minutes = (total_loc as f64 / 10.0).max(5.0).min(480.0); // 5 min to 8 hours
        
        estimated_minutes * 60.0
    }
    
    /// Record correlated data to Loom
    fn record_to_loom(
        &self,
        loom: &mut Loom,
        correlated: &[CorrelatedRecord],
        issues_map: &HashMap<String, BeadsIssue>,
    ) -> Result<BackfillResult, BackfillError> {
        let mut result = BackfillResult {
            commits_scanned: correlated.len() as u32,
            issues_found: issues_map.len() as u32,
            tasks_created: 0,
            executions_recorded: 0,
            by_agent: HashMap::new(),
            by_task_type: HashMap::new(),
            dry_run: self.options.dry_run,
        };
        
        // Track which issues have been created as tasks
        let mut created_tasks: HashMap<String, String> = HashMap::new();
        
        for record in correlated {
            // Update agent stats
            let agent_stats = result.by_agent
                .entry(record.inferred_agent.clone())
                .or_default();
            agent_stats.executions += 1;
            if record.inferred_success {
                agent_stats.successes += 1;
            } else {
                agent_stats.failures += 1;
            }
            
            // Update task type stats
            let type_stats = result.by_task_type
                .entry(record.inferred_task_type.clone())
                .or_default();
            type_stats.count += 1;
            type_stats.total_duration_secs += record.inferred_duration_secs;
            
            if self.options.dry_run {
                continue;
            }
            
            // Create tasks for linked issues (if not already created)
            for issue in &record.issues {
                if !created_tasks.contains_key(&issue.id) {
                    let task = loom.create_task(CreateTask {
                        title: issue.title.clone(),
                        description: issue.description.clone(),
                        priority: match issue.priority {
                            0 => Priority::Critical,
                            1 => Priority::High,
                            2 => Priority::Normal,
                            _ => Priority::Low,
                        },
                        labels: issue.labels.clone(),
                        parent: None,
                        evidence: Some(format!("beads:{}", issue.id)),
                        repo: None, // Will use default from config
                    })?;
                    
                    created_tasks.insert(issue.id.clone(), task.id.clone());
                    result.tasks_created += 1;
                    
                    // If issue is closed, complete the task
                    if issue.status == "closed" {
                        let _ = loom.complete(&task.id, issue.close_reason.as_deref());
                    }
                }
            }
            
            // Record execution
            // Use the first linked issue's task ID, or create a standalone task
            let task_id = if let Some(issue) = record.issues.first() {
                created_tasks.get(&issue.id).cloned()
                    .unwrap_or_else(|| format!("commit:{}", record.commit.short_hash))
            } else {
                format!("commit:{}", record.commit.short_hash)
            };
            
            loom.record_execution(
                &record.inferred_agent,
                &task_id,
                Some(&record.inferred_task_type),
                record.inferred_success,
                record.inferred_duration_secs,
            )?;
            
            result.executions_recorded += 1;
        }
        
        Ok(result)
    }
}

/// Analytics queries for backfilled data
pub struct BackfillAnalytics;

impl BackfillAnalytics {
    /// Format backfill result for display
    pub fn format_result(result: &BackfillResult) -> String {
        let mut output = String::new();
        
        output.push_str("Backfill Summary\n");
        output.push_str("================\n");
        
        if result.dry_run {
            output.push_str("(DRY RUN - no changes made)\n\n");
        }
        
        output.push_str(&format!("Commits scanned:     {}\n", result.commits_scanned));
        output.push_str(&format!("Beads issues found:  {}\n", result.issues_found));
        output.push_str(&format!("Tasks created:       {}\n", result.tasks_created));
        output.push_str(&format!("Executions recorded: {}\n", result.executions_recorded));
        
        output.push_str("\nBy Agent:\n");
        for (agent, stats) in &result.by_agent {
            output.push_str(&format!(
                "  {:<13} → {:>3} executions ({:.0}% success)\n",
                agent,
                stats.executions,
                stats.success_rate()
            ));
        }
        
        output.push_str("\nBy Task Type:\n");
        for (task_type, stats) in &result.by_task_type {
            output.push_str(&format!(
                "  {:<13} → {:>3} (avg {:.1}h)\n",
                task_type,
                stats.count,
                stats.avg_duration_hours()
            ));
        }
        
        output
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_parse_date_iso() {
        let dt = Backfill::parse_date("2025-12-01").unwrap();
        assert_eq!(dt.date_naive().to_string(), "2025-12-01");
    }
    
    #[test]
    fn test_parse_date_relative() {
        let dt = Backfill::parse_date("30 days ago").unwrap();
        let expected = Utc::now() - Duration::days(30);
        // Allow 1 second tolerance
        assert!((dt.timestamp() - expected.timestamp()).abs() < 2);
    }
    
    #[test]
    fn test_issue_pattern() {
        let backfill = Backfill::new(BackfillOptions::default());
        
        let msg = "Fix auth bug (csm-abc123) and update lm-xyz";
        let issues: Vec<String> = backfill.issue_pattern
            .find_iter(msg)
            .map(|m| m.as_str().to_string())
            .collect();
        
        assert_eq!(issues, vec!["csm-abc123", "lm-xyz"]);
    }
    
    #[test]
    fn test_workway_pattern() {
        let backfill = Backfill::new(BackfillOptions::default());
        
        // WORKWAY uses WORKWAY-xxx and hierarchical WORKWAY-xxx.y notation
        let msg = "feat: implement invite flow (WORKWAY-01r) with child tasks WORKWAY-01r.1";
        let issues: Vec<String> = backfill.issue_pattern
            .find_iter(msg)
            .map(|m| m.as_str().to_string())
            .collect();
        
        assert_eq!(issues, vec!["WORKWAY-01r", "WORKWAY-01r.1"]);
    }
    
    #[test]
    fn test_infer_agent() {
        let backfill = Backfill::new(BackfillOptions::default());
        
        assert_eq!(backfill.infer_agent("Claude", "claude@ai.com"), "claude-code");
        assert_eq!(backfill.infer_agent("John Doe", "john@example.com"), "human");
    }
    
    #[test]
    fn test_infer_task_type() {
        let backfill = Backfill::new(BackfillOptions::default());
        
        let fix_commit = CommitRecord {
            hash: "abc".to_string(),
            short_hash: "abc".to_string(),
            author: "test".to_string(),
            email: "test@test.com".to_string(),
            timestamp: Utc::now(),
            message: "Fix: resolve auth timeout".to_string(),
            body: None,
            files_changed: 1,
            insertions: 10,
            deletions: 5,
            issue_ids: vec![],
        };
        
        assert_eq!(backfill.infer_task_type(&fix_commit, &[]), "bug");
        
        let feat_commit = CommitRecord {
            message: "feat: add dark mode toggle".to_string(),
            ..fix_commit.clone()
        };
        
        assert_eq!(backfill.infer_task_type(&feat_commit, &[]), "feature");
    }
}
