//! Desire Paths - Tracking what agents try to do that doesn't exist
//!
//! "A desire path is a path created as a consequence of erosion caused by
//! human or animal foot traffic. The path usually represents the shortest
//! or most easily navigated route."
//!
//! In software: agents reveal what tools they want by trying to use them.
//! This module tracks those attempts to inform future tool development.

use std::collections::HashMap;
use std::fs::{File, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::path::Path;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

/// A single attempt to use a non-existent or failed tool
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DesirePathEntry {
    /// ISO timestamp
    pub timestamp: String,
    /// The tool name that was attempted
    pub tool_name: String,
    /// The arguments passed (sanitized)
    pub arguments: HashMap<String, String>,
    /// The error type or reason for failure
    pub failure_reason: FailureReason,
    /// Session ID if available (for grouping)
    pub session_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum FailureReason {
    /// Tool name doesn't exist
    UnknownTool,
    /// Tool exists but arguments were invalid
    InvalidArguments(String),
    /// Tool exists but operation failed
    OperationFailed(String),
    /// Path doesn't exist
    PathNotFound,
    /// Permission denied
    PermissionDenied,
}

/// Aggregated analysis of desire paths
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DesirePathAnalysis {
    /// Total entries analyzed
    pub total_entries: usize,
    /// Most common unknown tools (tool_name -> count)
    pub unknown_tools: Vec<(String, usize)>,
    /// Most common failure patterns
    pub failure_patterns: Vec<(FailureReason, usize)>,
    /// Suggested tool names based on patterns
    pub suggestions: Vec<ToolSuggestion>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolSuggestion {
    /// Suggested tool name
    pub name: String,
    /// What it would do (inferred from attempts)
    pub description: String,
    /// How many times agents tried something similar
    pub attempt_count: usize,
    /// Confidence score (0.0-1.0)
    pub confidence: f64,
}

/// Desire path tracker - logs and analyzes agent attempts
pub struct DesirePathTracker {
    log_path: std::path::PathBuf,
    /// In-memory cache for analysis
    entries: Vec<DesirePathEntry>,
    /// Current session ID
    session_id: Option<String>,
}

impl DesirePathTracker {
    /// Create a new tracker with the given log path
    pub fn new(log_path: impl AsRef<Path>) -> Self {
        Self {
            log_path: log_path.as_ref().to_path_buf(),
            entries: Vec::new(),
            session_id: None,
        }
    }

    /// Set the current session ID for grouping
    pub fn set_session(&mut self, session_id: String) {
        self.session_id = Some(session_id);
    }

    /// Log an unknown tool attempt
    pub fn log_unknown_tool(&mut self, tool_name: &str, arguments: &serde_json::Value) {
        let entry = DesirePathEntry {
            timestamp: Utc::now().to_rfc3339(),
            tool_name: tool_name.to_string(),
            arguments: sanitize_arguments(arguments),
            failure_reason: FailureReason::UnknownTool,
            session_id: self.session_id.clone(),
        };
        self.log_entry(entry);
    }

    /// Log an invalid arguments attempt
    pub fn log_invalid_args(&mut self, tool_name: &str, arguments: &serde_json::Value, error: &str) {
        let entry = DesirePathEntry {
            timestamp: Utc::now().to_rfc3339(),
            tool_name: tool_name.to_string(),
            arguments: sanitize_arguments(arguments),
            failure_reason: FailureReason::InvalidArguments(error.to_string()),
            session_id: self.session_id.clone(),
        };
        self.log_entry(entry);
    }

    /// Log an operation failure
    pub fn log_operation_failed(&mut self, tool_name: &str, arguments: &serde_json::Value, error: &str) {
        let entry = DesirePathEntry {
            timestamp: Utc::now().to_rfc3339(),
            tool_name: tool_name.to_string(),
            arguments: sanitize_arguments(arguments),
            failure_reason: FailureReason::OperationFailed(error.to_string()),
            session_id: self.session_id.clone(),
        };
        self.log_entry(entry);
    }

    /// Log a path not found error
    pub fn log_path_not_found(&mut self, tool_name: &str, arguments: &serde_json::Value) {
        let entry = DesirePathEntry {
            timestamp: Utc::now().to_rfc3339(),
            tool_name: tool_name.to_string(),
            arguments: sanitize_arguments(arguments),
            failure_reason: FailureReason::PathNotFound,
            session_id: self.session_id.clone(),
        };
        self.log_entry(entry);
    }

    fn log_entry(&mut self, entry: DesirePathEntry) {
        // Log to file (append mode, JSONL format)
        if let Ok(mut file) = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.log_path)
        {
            if let Ok(json) = serde_json::to_string(&entry) {
                let _ = writeln!(file, "{}", json);
            }
        }
        // Keep in memory for analysis
        self.entries.push(entry);
    }

    /// Load all entries from the log file
    pub fn load_all(&mut self) -> std::io::Result<()> {
        self.entries.clear();
        if !self.log_path.exists() {
            return Ok(());
        }
        
        let file = File::open(&self.log_path)?;
        let reader = BufReader::new(file);
        
        for line in reader.lines() {
            if let Ok(line) = line {
                if let Ok(entry) = serde_json::from_str::<DesirePathEntry>(&line) {
                    self.entries.push(entry);
                }
            }
        }
        
        Ok(())
    }

    /// Analyze the collected desire paths
    pub fn analyze(&self) -> DesirePathAnalysis {
        let mut unknown_tools: HashMap<String, usize> = HashMap::new();
        let mut failure_reasons: HashMap<String, usize> = HashMap::new();
        
        for entry in &self.entries {
            if entry.failure_reason == FailureReason::UnknownTool {
                *unknown_tools.entry(entry.tool_name.clone()).or_insert(0) += 1;
            }
            
            let reason_key = match &entry.failure_reason {
                FailureReason::UnknownTool => "unknown_tool".to_string(),
                FailureReason::InvalidArguments(_) => "invalid_args".to_string(),
                FailureReason::OperationFailed(_) => "op_failed".to_string(),
                FailureReason::PathNotFound => "path_not_found".to_string(),
                FailureReason::PermissionDenied => "permission_denied".to_string(),
            };
            *failure_reasons.entry(reason_key).or_insert(0) += 1;
        }
        
        // Sort by count descending
        let mut unknown_vec: Vec<_> = unknown_tools.into_iter().collect();
        unknown_vec.sort_by(|a, b| b.1.cmp(&a.1));
        
        // Generate suggestions from patterns
        let suggestions = generate_suggestions(&unknown_vec);
        
        DesirePathAnalysis {
            total_entries: self.entries.len(),
            unknown_tools: unknown_vec,
            failure_patterns: vec![], // TODO: Implement failure pattern analysis
            suggestions,
        }
    }

    /// Get entries from the last N days
    pub fn recent_entries(&self, days: i64) -> Vec<&DesirePathEntry> {
        let cutoff = Utc::now() - chrono::Duration::days(days);
        self.entries
            .iter()
            .filter(|e| {
                if let Ok(dt) = DateTime::parse_from_rfc3339(&e.timestamp) {
                    dt.with_timezone(&Utc) > cutoff
                } else {
                    false
                }
            })
            .collect()
    }
}

/// Sanitize arguments for logging (remove sensitive data, truncate long values)
fn sanitize_arguments(args: &serde_json::Value) -> HashMap<String, String> {
    let mut result = HashMap::new();
    
    if let Some(obj) = args.as_object() {
        for (key, value) in obj {
            // Skip potentially sensitive keys
            if key.to_lowercase().contains("password") 
                || key.to_lowercase().contains("secret")
                || key.to_lowercase().contains("token")
                || key.to_lowercase().contains("key") {
                result.insert(key.clone(), "[REDACTED]".to_string());
                continue;
            }
            
            // Truncate long values
            let val_str = match value {
                serde_json::Value::String(s) => {
                    if s.len() > 100 {
                        format!("{}...", &s[..100])
                    } else {
                        s.clone()
                    }
                }
                _ => value.to_string(),
            };
            
            result.insert(key.clone(), val_str);
        }
    }
    
    result
}

/// Generate tool suggestions from unknown tool patterns
fn generate_suggestions(unknown_tools: &[(String, usize)]) -> Vec<ToolSuggestion> {
    let mut suggestions = Vec::new();
    
    // Pattern matching for common tool name attempts
    let patterns = [
        ("refactor", "Automated code refactoring", 0.8),
        ("rename", "Rename symbols across codebase", 0.85),
        ("extract", "Extract code into separate function/module", 0.75),
        ("inline", "Inline function calls", 0.7),
        ("format", "Format code according to style guide", 0.6),
        ("lint", "Run linting checks", 0.6),
        ("test", "Generate or run tests", 0.7),
        ("doc", "Generate documentation", 0.65),
        ("dependency", "Analyze dependencies", 0.75),
        ("import", "Manage imports", 0.7),
        ("unused", "Find unused code", 0.8),
        ("complexity", "Analyze code complexity", 0.7),
        ("security", "Security analysis", 0.75),
        ("migrate", "Migration assistance", 0.7),
    ];
    
    for (tool_name, count) in unknown_tools {
        let tool_lower = tool_name.to_lowercase();
        
        for (pattern, description, base_confidence) in &patterns {
            if tool_lower.contains(pattern) {
                suggestions.push(ToolSuggestion {
                    name: tool_name.clone(),
                    description: description.to_string(),
                    attempt_count: *count,
                    confidence: base_confidence * (*count as f64 / 10.0).min(1.0),
                });
                break;
            }
        }
    }
    
    // Sort by confidence descending
    suggestions.sort_by(|a, b| b.confidence.partial_cmp(&a.confidence).unwrap_or(std::cmp::Ordering::Equal));
    
    suggestions
}

/// MCP tool response format for desire path analysis
#[derive(Debug, Serialize)]
pub struct DesirePathResponse {
    pub total_entries: usize,
    pub unknown_tools: Vec<UnknownToolEntry>,
    pub suggestions: Vec<ToolSuggestion>,
    pub summary: String,
}

#[derive(Debug, Serialize)]
pub struct UnknownToolEntry {
    pub name: String,
    pub count: usize,
    pub last_seen: Option<String>,
}

impl From<DesirePathAnalysis> for DesirePathResponse {
    fn from(analysis: DesirePathAnalysis) -> Self {
        let unknown_tools: Vec<UnknownToolEntry> = analysis.unknown_tools
            .iter()
            .take(20) // Top 20
            .map(|(name, count)| UnknownToolEntry {
                name: name.clone(),
                count: *count,
                last_seen: None, // TODO: Add timestamp tracking
            })
            .collect();
        
        let summary = if analysis.total_entries == 0 {
            "No desire path data yet. Agents haven't attempted unknown tools.".to_string()
        } else {
            format!(
                "Analyzed {} entries. {} unique unknown tools attempted. Top suggestion: {}",
                analysis.total_entries,
                unknown_tools.len(),
                analysis.suggestions.first()
                    .map(|s| format!("{} (confidence: {:.0}%)", s.name, s.confidence * 100.0))
                    .unwrap_or_else(|| "none".to_string())
            )
        };
        
        DesirePathResponse {
            total_entries: analysis.total_entries,
            unknown_tools,
            suggestions: analysis.suggestions,
            summary,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_sanitize_arguments() {
        let args = serde_json::json!({
            "path": "/some/path",
            "password": "secret123",
            "api_key": "sk-xxx",
            "normal_arg": "value"
        });
        
        let sanitized = sanitize_arguments(&args);
        
        assert_eq!(sanitized.get("path"), Some(&"/some/path".to_string()));
        assert_eq!(sanitized.get("password"), Some(&"[REDACTED]".to_string()));
        assert_eq!(sanitized.get("api_key"), Some(&"[REDACTED]".to_string()));
        assert_eq!(sanitized.get("normal_arg"), Some(&"value".to_string()));
    }
    
    #[test]
    fn test_suggestion_generation() {
        let unknown = vec![
            ("ground_refactor_function".to_string(), 5),
            ("ground_rename_symbol".to_string(), 3),
            ("random_tool".to_string(), 1),
        ];
        
        let suggestions = generate_suggestions(&unknown);
        
        assert!(suggestions.len() >= 2);
        assert!(suggestions[0].name.contains("refactor") || suggestions[0].name.contains("rename"));
    }
}
