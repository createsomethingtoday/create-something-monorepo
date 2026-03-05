//! Autonomous Orchestrator (Ralph Pattern)
//!
//! Spawns fresh agent contexts for each task, supporting multiple backends:
//! - Codex CLI
//! - Gemini CLI
//!
//! Philosophy: Each task gets a fresh context. No pollution between tasks.
//! This is "weniger, aber besser" - less, but better.

use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::{Loom, Task, Priority, LoomError};
use crate::memory::SessionStatus;

#[derive(Error, Debug)]
pub enum OrchestratorError {
    #[error("Loom error: {0}")]
    Loom(#[from] LoomError),
    
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("Agent execution failed: {0}")]
    ExecutionFailed(String),
    
    #[error("No agents available")]
    NoAgentsAvailable,
    
    #[error("Configuration error: {0}")]
    Config(String),
}

/// Agent backend types
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AgentBackend {
    /// Codex CLI (`codex exec`)
    Codex,
    /// Gemini CLI with Pro model (`gemini -m gemini-2.5-pro`)
    GeminiPro,
    /// Gemini CLI with Flash model (`gemini -m gemini-2.5-flash`)
    GeminiFlash,
}

impl AgentBackend {
    pub fn as_str(&self) -> &'static str {
        match self {
            AgentBackend::Codex => "codex",
            AgentBackend::GeminiPro => "gemini-pro",
            AgentBackend::GeminiFlash => "gemini-flash",
        }
    }
    
    /// Check if this backend is available on the system
    pub fn is_available(&self) -> bool {
        match self {
            AgentBackend::Codex => which_exists("codex"),
            AgentBackend::GeminiPro | AgentBackend::GeminiFlash => which_exists("gemini"),
        }
    }
    
    /// Get the best backend for a task based on complexity
    pub fn for_task(task: &Task) -> Self {
        // Complex tasks → Codex or Gemini Pro
        // Mechanical tasks → Gemini Flash
        
        let title_lower = task.title.to_lowercase();
        let labels: Vec<&str> = task.labels.iter().map(|s| s.as_str()).collect();
        
        // High complexity indicators → Codex
        let complex_patterns = [
            "architect", "design", "refactor", "migrate",
            "integrate", "security", "performance", "optimize",
        ];
        
        for pattern in &complex_patterns {
            if title_lower.contains(pattern) {
                return AgentBackend::Codex;
            }
        }
        
        // Architecture/planning labels → Codex
        if labels.contains(&"architecture") || labels.contains(&"planning") {
            return AgentBackend::Codex;
        }
        
        // Mechanical tasks → Gemini Flash
        let mechanical_patterns = [
            "rename", "typo", "comment", "format", "lint",
            "cleanup", "remove unused", "bump version",
        ];
        
        for pattern in &mechanical_patterns {
            if title_lower.contains(pattern) {
                return AgentBackend::GeminiFlash;
            }
        }
        
        // Priority-based: critical/high → Codex
        match task.priority {
            Priority::Critical | Priority::High => AgentBackend::Codex,
            Priority::Normal => AgentBackend::GeminiPro,
            Priority::Low => AgentBackend::GeminiFlash,
        }
    }
}

fn which_exists(cmd: &str) -> bool {
    Command::new("which")
        .arg(cmd)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

/// Configuration for the orchestrator
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrchestratorConfig {
    /// Poll interval for checking ready tasks (in seconds)
    pub poll_interval_secs: u64,
    /// Maximum concurrent agents
    pub max_concurrent: usize,
    /// Enabled backends (in preference order)
    pub backends: Vec<AgentBackend>,
    /// Working directory for agents
    pub working_dir: PathBuf,
    /// Enable system notifications
    pub notifications: bool,
    /// Maximum runtime per task in seconds (0 = no limit)
    pub max_task_runtime_secs: u64,
}

impl Default for OrchestratorConfig {
    fn default() -> Self {
        Self {
            poll_interval_secs: 5,
            max_concurrent: 1, // Serial by default (safest)
            backends: vec![AgentBackend::Codex, AgentBackend::GeminiPro, AgentBackend::GeminiFlash],
            working_dir: PathBuf::from("."),
            notifications: true,
            max_task_runtime_secs: 600, // 10 minutes
        }
    }
}

/// Result of a task execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionResult {
    pub task_id: String,
    pub backend: AgentBackend,
    pub success: bool,
    pub output: String,
    pub duration_secs: f64,
    pub started_at: DateTime<Utc>,
    pub ended_at: DateTime<Utc>,
    pub error: Option<String>,
    pub policy_gate: Option<PolicyGateArtifact>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PolicyDecision {
    Allow,
    RequireHumanReview,
    Block,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyGateArtifact {
    pub task_id: String,
    pub has_write_intent: bool,
    pub has_human_review_step: bool,
    pub account_role: String,
    pub rollout_mode: String,
    pub gate_profile: String,
    pub decision: PolicyDecision,
    pub reasons: Vec<String>,
    pub policy_sources: Vec<String>,
    pub evaluated_at: DateTime<Utc>,
}

/// The orchestrator - runs tasks through agent backends
pub struct Orchestrator {
    config: OrchestratorConfig,
}

fn task_has_label_prefix(task: &Task, prefix: &str) -> Option<String> {
    task.labels
        .iter()
        .find_map(|label| label.strip_prefix(prefix).map(|v| v.to_string()))
}

fn detect_write_intent(task: &Task) -> bool {
    if task.labels.iter().any(|label| {
        matches!(
            label.as_str(),
            "write-intent" | "mutating" | "mutation" | "deploy" | "rollout" | "delete" | "destroy"
        )
    }) {
        return true;
    }

    let title = task.title.to_lowercase();
    let write_terms = [
        "deploy",
        "rollout",
        "migrate",
        "update production",
        "delete",
        "remove",
        "rotate secret",
    ];
    write_terms.iter().any(|term| title.contains(term))
}

fn detect_human_review_step(task: &Task) -> bool {
    task.labels.iter().any(|label| {
        matches!(
            label.as_str(),
            "human-review" | "requires-review" | "approval" | "approved" | "reviewed"
        )
    })
}

fn infer_account_role(task: &Task) -> String {
    task_has_label_prefix(task, "role:")
        .or_else(|| std::env::var("LOOM_ACCOUNT_ROLE").ok())
        .unwrap_or_else(|| "operator".to_string())
        .to_lowercase()
}

fn infer_rollout_mode(task: &Task) -> String {
    task_has_label_prefix(task, "rollout:")
        .or_else(|| std::env::var("LOOM_ROLLOUT_MODE").ok())
        .unwrap_or_else(|| "legacy_enforce".to_string())
        .to_lowercase()
}

fn infer_gate_profile(task: &Task) -> String {
    task_has_label_prefix(task, "gate-profile:")
        .or_else(|| std::env::var("LOOM_GATE_PROFILE").ok())
        .unwrap_or_else(|| "strict".to_string())
        .to_lowercase()
}

fn is_read_only_role(role: &str) -> bool {
    matches!(role, "public" | "auditor" | "readonly")
}

fn discover_policy_sources(working_dir: &Path) -> Vec<String> {
    let candidates = [
        "docs/policies/v1/policy.judgment-baseline.v1.json",
        "docs/policies/v1/policy.account-role-boundaries.v1.json",
        "docs/policies/v1/policy.engine-rollout-gates.v1.json",
    ];

    candidates
        .iter()
        .map(|relative| working_dir.join(relative))
        .filter(|path| path.exists())
        .map(|path| path.display().to_string())
        .collect()
}

fn evaluate_policy_gate(task: &Task, working_dir: &Path) -> PolicyGateArtifact {
    let has_write_intent = detect_write_intent(task);
    let has_human_review_step = detect_human_review_step(task);
    let account_role = infer_account_role(task);
    let rollout_mode = infer_rollout_mode(task);
    let gate_profile = infer_gate_profile(task);
    let mut reasons = Vec::new();

    let decision = if has_write_intent && is_read_only_role(&account_role) {
        reasons.push("Public/auditor/readonly role cannot execute write-intent workflows.".to_string());
        PolicyDecision::Block
    } else if has_write_intent && !has_human_review_step {
        reasons.push("Write-intent workflow is missing an explicit human-review step.".to_string());
        PolicyDecision::RequireHumanReview
    } else {
        reasons.push("No restrictive policy rule matched.".to_string());
        PolicyDecision::Allow
    };

    PolicyGateArtifact {
        task_id: task.id.clone(),
        has_write_intent,
        has_human_review_step,
        account_role,
        rollout_mode,
        gate_profile,
        decision,
        reasons,
        policy_sources: discover_policy_sources(working_dir),
        evaluated_at: Utc::now(),
    }
}

impl Orchestrator {
    /// Create a new orchestrator with default config
    pub fn new() -> Self {
        Self {
            config: OrchestratorConfig::default(),
        }
    }
    
    /// Create with custom config
    pub fn with_config(config: OrchestratorConfig) -> Self {
        Self { config }
    }
    
    /// Get available backends (those actually installed)
    pub fn available_backends(&self) -> Vec<AgentBackend> {
        self.config.backends.iter()
            .filter(|b| b.is_available())
            .cloned()
            .collect()
    }

    fn write_policy_gate_artifact(&self, artifact: &PolicyGateArtifact) -> Result<(), OrchestratorError> {
        let dir = self.config.working_dir.join(".loom").join("policy-gates");
        fs::create_dir_all(&dir)?;
        let file = dir.join(format!("{}.json", artifact.task_id));
        let json = serde_json::to_string_pretty(artifact)
            .map_err(|e| OrchestratorError::Config(format!("Failed to serialize policy gate artifact: {}", e)))?;
        fs::write(file, json)?;
        Ok(())
    }

    fn record_policy_gate_in_session(
        &self,
        loom: &mut Loom,
        session_id: &str,
        artifact: &PolicyGateArtifact,
    ) -> Result<(), OrchestratorError> {
        let mut session = loom
            .get_session(session_id)?
            .ok_or_else(|| OrchestratorError::Config(format!("Session not found: {}", session_id)))?;

        let json = serde_json::to_string(artifact)
            .map_err(|e| OrchestratorError::Config(format!("Failed to serialize policy gate context: {}", e)))?;
        session.context.custom.insert("policy_gate".to_string(), json);
        loom.update_context(session_id, &session.context)?;
        Ok(())
    }
    
    /// Generate a prompt for a task
    pub fn generate_prompt(&self, task: &Task, loom: &Loom) -> String {
        let mut prompt = format!(
            "# Task: {}\n\n",
            task.title
        );
        
        if let Some(ref desc) = task.description {
            prompt.push_str(&format!("## Description\n{}\n\n", desc));
        }
        
        if !task.labels.is_empty() {
            prompt.push_str(&format!("## Labels\n{}\n\n", task.labels.join(", ")));
        }
        
        // Add any captured preferences
        if let Ok(Some(prefs)) = loom.get_preferences(&task.id) {
            prompt.push_str("## Implementation Preferences\n");
            prompt.push_str(&prefs);
            prompt.push_str("\n\n");
        }
        
        prompt.push_str("## Instructions\n");
        prompt.push_str("Complete this task. When done, clearly indicate SUCCESS or FAILURE in your final message.\n");
        prompt.push_str("\n");
        prompt.push_str("Work in small, verifiable steps. Run tests after each change.\n");
        
        prompt
    }
    
    /// Execute a single task with the appropriate backend
    pub fn execute_task(&self, task: &Task, loom: &mut Loom) -> Result<ExecutionResult, OrchestratorError> {
        let backend = AgentBackend::for_task(task);
        let available = self.available_backends();
        
        // Fallback if preferred backend isn't available
        let actual_backend = if available.contains(&backend) {
            backend
        } else if !available.is_empty() {
            available[0]
        } else {
            return Err(OrchestratorError::NoAgentsAvailable);
        };
        
        let prompt = self.generate_prompt(task, loom);
        let started_at = Utc::now();
        let start_instant = Instant::now();
        
        // Start a session
        let session = loom.start_session(&task.id, actual_backend.as_str())?;

        // Evaluate and persist policy gate artifact before execution.
        let policy_gate = evaluate_policy_gate(task, &self.config.working_dir);
        self.write_policy_gate_artifact(&policy_gate)?;
        self.record_policy_gate_in_session(loom, &session.id, &policy_gate)?;

        if policy_gate.decision != PolicyDecision::Allow {
            let _ = loom.end_session(&session.id, SessionStatus::Failed);
            let ended_at = Utc::now();
            let duration_secs = start_instant.elapsed().as_secs_f64();
            let reason = policy_gate.reasons.join(" ");
            return Ok(ExecutionResult {
                task_id: task.id.clone(),
                backend: actual_backend,
                success: false,
                output: String::new(),
                duration_secs,
                started_at,
                ended_at,
                error: Some(format!("Policy gate {:?}: {}", policy_gate.decision, reason)),
                policy_gate: Some(policy_gate),
            });
        }
        
        // Execute based on backend
        let result = match actual_backend {
            AgentBackend::Codex => self.run_codex(&prompt),
            AgentBackend::GeminiPro => self.run_gemini(&prompt, "gemini-2.5-pro"),
            AgentBackend::GeminiFlash => self.run_gemini(&prompt, "gemini-2.5-flash"),
        };
        
        let duration_secs = start_instant.elapsed().as_secs_f64();
        let ended_at = Utc::now();
        
        match result {
            Ok(output) => {
                // Process exited with code 0 — treat as success.
                // Backend runners return Err on non-zero exit,
                // so reaching Ok means the process succeeded.
                let success = true;

                // End session
                let _ = loom.end_session(&session.id, SessionStatus::Completed);

                // Send notification
                if self.config.notifications {
                    let _ = send_notification("Task Completed", &task.title);
                }

                Ok(ExecutionResult {
                    task_id: task.id.clone(),
                    backend: actual_backend,
                    success,
                    output,
                    duration_secs,
                    started_at,
                    ended_at,
                    error: None,
                    policy_gate: Some(policy_gate),
                })
            }
            Err(e) => {
                let _ = loom.end_session(&session.id, SessionStatus::Failed);
                
                if self.config.notifications {
                    let _ = send_notification("Task Error", &format!("{}: {}", task.title, e));
                }
                
                Ok(ExecutionResult {
                    task_id: task.id.clone(),
                    backend: actual_backend,
                    success: false,
                    output: String::new(),
                    duration_secs,
                    started_at,
                    ended_at,
                    error: Some(e.to_string()),
                    policy_gate: Some(policy_gate),
                })
            }
        }
    }
    
    /// Run Codex CLI
    fn run_codex(&self, prompt: &str) -> Result<String, OrchestratorError> {
        let output = Command::new("codex")
            .args([
                "exec",
                "--sandbox",
                "workspace-write",
                "--ask-for-approval",
                "never",
                prompt,
            ])
            .current_dir(&self.config.working_dir)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .map_err(|e| OrchestratorError::ExecutionFailed(format!("Failed to run codex: {}", e)))?;
        
        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            Err(OrchestratorError::ExecutionFailed(format!("Codex failed: {}", stderr)))
        }
    }
    
    /// Run Gemini CLI
    fn run_gemini(&self, prompt: &str, model: &str) -> Result<String, OrchestratorError> {
        // Gemini CLI: gemini -p "prompt" --yolo -m model
        // --yolo enables autonomous mode (no confirmation prompts)
        let output = Command::new("gemini")
            .args(["-p", prompt, "--yolo", "-m", model])
            .current_dir(&self.config.working_dir)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .map_err(|e| OrchestratorError::ExecutionFailed(format!("Failed to run gemini: {}", e)))?;
        
        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            Err(OrchestratorError::ExecutionFailed(format!("Gemini failed: {}", stderr)))
        }
    }
    
    /// Run the orchestrator loop (blocking)
    /// This is the Ralph pattern: poll for ready tasks and execute them
    pub fn run_loop(&self, loom: &mut Loom) -> Result<(), OrchestratorError> {
        eprintln!("Orchestrator started. Backends: {:?}", self.available_backends());
        eprintln!("Poll interval: {}s, Max concurrent: {}", 
            self.config.poll_interval_secs, self.config.max_concurrent);
        
        loop {
            // Get ready tasks
            let ready = loom.ready()?;
            
            if ready.is_empty() {
                // No tasks - check summary
                if let Ok(summary) = loom.summary() {
                    if summary.done + summary.cancelled == summary.total() {
                        eprintln!("All tasks complete!");
                        if self.config.notifications {
                            let _ = send_notification("Loom Complete", "All tasks have been completed");
                        }
                        break;
                    }
                }
                
                // Sleep and continue
                std::thread::sleep(Duration::from_secs(self.config.poll_interval_secs));
                continue;
            }
            
            // Pick highest priority task
            let task = ready.into_iter()
                .max_by_key(|t| match t.priority {
                    Priority::Critical => 4,
                    Priority::High => 3,
                    Priority::Normal => 2,
                    Priority::Low => 1,
                })
                .unwrap();
            
            eprintln!("Processing: {} ({})", task.title, task.id);
            
            // Claim the task
            let _ = loom.claim(&task.id, "orchestrator");
            
            // Execute
            let result = self.execute_task(&task, loom)?;
            
            if result.success {
                eprintln!("  ✓ Completed in {:.1}s", result.duration_secs);
                let _ = loom.complete(&task.id, Some(&format!("Completed by {}", result.backend.as_str())));
            } else {
                eprintln!("  ✗ Failed: {:?}", result.error);
                // Leave task claimed but not complete - human intervention needed
            }
            
            // Brief pause between tasks
            std::thread::sleep(Duration::from_millis(500));
        }
        
        Ok(())
    }
}

impl Default for Orchestrator {
    fn default() -> Self {
        Self::new()
    }
}

/// Send a system notification
pub fn send_notification(title: &str, message: &str) -> Result<(), std::io::Error> {
    #[cfg(target_os = "macos")]
    {
        Command::new("osascript")
            .args(["-e", &format!(
                "display notification \"{}\" with title \"Loom: {}\"",
                message.replace("\"", "\\\""),
                title.replace("\"", "\\\"")
            )])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()?;
    }
    
    #[cfg(target_os = "linux")]
    {
        Command::new("notify-send")
            .args([&format!("Loom: {}", title), message])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()?;
    }
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::Status;
    use std::path::Path;
    
    #[test]
    fn test_backend_selection() {
        // Complex task → Codex
        let complex_task = Task {
            id: "test-1".to_string(),
            title: "Architect the authentication system".to_string(),
            description: None,
            status: Status::Ready,
            priority: Priority::Normal,
            issue_type: Default::default(),
            labels: vec![],
            parent: None,
            agent: None,
            evidence: None,
            actual_cost_usd: None,
            repo: None,
            close_reason: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        assert_eq!(AgentBackend::for_task(&complex_task), AgentBackend::Codex);
        
        // Mechanical task → Gemini Flash
        let simple_task = Task {
            id: "test-2".to_string(),
            title: "Fix typo in README".to_string(),
            description: None,
            status: Status::Ready,
            priority: Priority::Low,
            issue_type: Default::default(),
            labels: vec![],
            parent: None,
            agent: None,
            evidence: None,
            actual_cost_usd: None,
            repo: None,
            close_reason: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        assert_eq!(AgentBackend::for_task(&simple_task), AgentBackend::GeminiFlash);
    }
    
    #[test]
    fn test_which_exists() {
        // "which" should exist on all Unix systems
        assert!(which_exists("which"));
        // Random garbage shouldn't exist
        assert!(!which_exists("nonexistent_binary_12345"));
    }

    #[test]
    fn test_policy_gate_blocks_readonly_write_intent() {
        let task = Task {
            id: "test-3".to_string(),
            title: "Deploy hub fleet".to_string(),
            description: None,
            status: Status::Ready,
            priority: Priority::High,
            issue_type: Default::default(),
            labels: vec!["write-intent".to_string(), "role:public".to_string()],
            parent: None,
            agent: None,
            evidence: None,
            actual_cost_usd: None,
            repo: None,
            close_reason: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        let artifact = evaluate_policy_gate(&task, Path::new("."));
        assert_eq!(artifact.decision, PolicyDecision::Block);
    }

    #[test]
    fn test_policy_gate_requires_human_review_for_write_intent() {
        let task = Task {
            id: "test-4".to_string(),
            title: "Rollout config update".to_string(),
            description: None,
            status: Status::Ready,
            priority: Priority::Normal,
            issue_type: Default::default(),
            labels: vec!["write-intent".to_string()],
            parent: None,
            agent: None,
            evidence: None,
            actual_cost_usd: None,
            repo: None,
            close_reason: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        let artifact = evaluate_policy_gate(&task, Path::new("."));
        assert_eq!(artifact.decision, PolicyDecision::RequireHumanReview);
    }

    #[test]
    fn test_policy_gate_allows_reviewed_write_intent() {
        let task = Task {
            id: "test-5".to_string(),
            title: "Deploy after approval".to_string(),
            description: None,
            status: Status::Ready,
            priority: Priority::Normal,
            issue_type: Default::default(),
            labels: vec![
                "write-intent".to_string(),
                "human-review".to_string(),
                "role:operator".to_string(),
            ],
            parent: None,
            agent: None,
            evidence: None,
            actual_cost_usd: None,
            repo: None,
            close_reason: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        let artifact = evaluate_policy_gate(&task, Path::new("."));
        assert_eq!(artifact.decision, PolicyDecision::Allow);
    }
}
