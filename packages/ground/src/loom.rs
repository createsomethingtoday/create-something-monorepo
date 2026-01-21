//! Loom Integration
//!
//! Helper functions for filing Ground findings as Loom tasks.
//! This module provides utilities to convert Ground analysis results
//! into Loom task definitions.

use std::path::Path;
use serde::{Deserialize, Serialize};

/// A task to be filed in Loom
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoomTask {
    pub title: String,
    pub description: Option<String>,
    pub labels: Vec<String>,
    /// Link to Ground evidence ID
    pub evidence: Option<String>,
}

/// Generate a Loom task for a DRY violation (duplicate files)
pub fn task_for_duplicate(
    file_a: impl AsRef<Path>,
    file_b: impl AsRef<Path>,
    similarity: f64,
    evidence_id: Option<&str>,
) -> LoomTask {
    let file_a = file_a.as_ref();
    let file_b = file_b.as_ref();
    
    let title = format!(
        "Deduplicate {} and {} ({:.0}% similar)",
        file_a.file_name().and_then(|n| n.to_str()).unwrap_or("file_a"),
        file_b.file_name().and_then(|n| n.to_str()).unwrap_or("file_b"),
        similarity * 100.0
    );
    
    let description = format!(
        "Files are {:.1}% similar. Consider extracting shared code.\n\n\
         - {}\n\
         - {}",
        similarity * 100.0,
        file_a.display(),
        file_b.display()
    );
    
    LoomTask {
        title,
        description: Some(description),
        labels: vec!["dry".to_string(), "refactor".to_string(), "ground".to_string()],
        evidence: evidence_id.map(String::from),
    }
}

/// Generate a Loom task for a dead code finding
pub fn task_for_dead_code(
    symbol: &str,
    search_path: impl AsRef<Path>,
    evidence_id: Option<&str>,
) -> LoomTask {
    let path = search_path.as_ref();
    
    let title = format!("Remove dead code: {}", symbol);
    
    let description = format!(
        "Symbol '{}' has no usages in {}.\n\n\
         Consider removing if truly unused, or mark as intentionally unused.",
        symbol,
        path.display()
    );
    
    LoomTask {
        title,
        description: Some(description),
        labels: vec!["dead-code".to_string(), "cleanup".to_string(), "ground".to_string()],
        evidence: evidence_id.map(String::from),
    }
}

/// Generate a Loom task for an orphaned module
pub fn task_for_orphan(
    module_path: impl AsRef<Path>,
    evidence_id: Option<&str>,
) -> LoomTask {
    let path = module_path.as_ref();
    
    let title = format!(
        "Review orphaned module: {}",
        path.file_name().and_then(|n| n.to_str()).unwrap_or("module")
    );
    
    let description = format!(
        "Module {} has no incoming connections.\n\n\
         Consider:\n\
         - Removing if truly unused\n\
         - Connecting to entry point\n\
         - Marking as intentional (e.g., CLI entry)",
        path.display()
    );
    
    LoomTask {
        title,
        description: Some(description),
        labels: vec!["orphan".to_string(), "cleanup".to_string(), "ground".to_string()],
        evidence: evidence_id.map(String::from),
    }
}

/// Generate a Loom task for a dead export
pub fn task_for_dead_export(
    export_name: &str,
    module_path: impl AsRef<Path>,
    evidence_id: Option<&str>,
) -> LoomTask {
    let path = module_path.as_ref();
    
    let title = format!("Remove unused export: {}", export_name);
    
    let description = format!(
        "Export '{}' in {} is never imported elsewhere.\n\n\
         Consider removing from public API.",
        export_name,
        path.display()
    );
    
    LoomTask {
        title,
        description: Some(description),
        labels: vec!["dead-export".to_string(), "cleanup".to_string(), "ground".to_string()],
        evidence: evidence_id.map(String::from),
    }
}

/// Generate a Loom task for an environment safety issue
pub fn task_for_environment_issue(
    entry_point: impl AsRef<Path>,
    issue_description: &str,
    severity: &str,
    evidence_id: Option<&str>,
) -> LoomTask {
    let path = entry_point.as_ref();
    
    let title = format!(
        "Fix environment issue in {}",
        path.file_name().and_then(|n| n.to_str()).unwrap_or("entry")
    );
    
    let description = format!(
        "Environment safety issue detected:\n\n{}\n\nSeverity: {}",
        issue_description,
        severity
    );
    
    LoomTask {
        title,
        description: Some(description),
        labels: vec!["environment".to_string(), "bug".to_string(), "ground".to_string()],
        evidence: evidence_id.map(String::from),
    }
}

/// Generate a Loom task for duplicate functions
pub fn task_for_duplicate_function(
    function_name: &str,
    file_a: impl AsRef<Path>,
    file_b: impl AsRef<Path>,
    similarity: f64,
    evidence_id: Option<&str>,
) -> LoomTask {
    let file_a = file_a.as_ref();
    let file_b = file_b.as_ref();
    
    let title = format!(
        "Extract duplicate function: {} ({:.0}% similar)",
        function_name,
        similarity * 100.0
    );
    
    let description = format!(
        "Function '{}' is duplicated across files:\n\n\
         - {}\n\
         - {}\n\n\
         Consider extracting to shared module.",
        function_name,
        file_a.display(),
        file_b.display()
    );
    
    LoomTask {
        title,
        description: Some(description),
        labels: vec!["dry".to_string(), "refactor".to_string(), "function".to_string(), "ground".to_string()],
        evidence: evidence_id.map(String::from),
    }
}

/// Output format for filing tasks
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoomBatch {
    pub tasks: Vec<LoomTask>,
}

impl LoomBatch {
    pub fn new() -> Self {
        Self { tasks: vec![] }
    }
    
    pub fn add(&mut self, task: LoomTask) {
        self.tasks.push(task);
    }
    
    /// Generate CLI commands to file these tasks in Loom
    pub fn to_cli_commands(&self) -> Vec<String> {
        self.tasks.iter().map(|task| {
            let mut cmd = format!("lm create \"{}\"", task.title);
            
            if let Some(ref desc) = task.description {
                // Escape for shell
                let escaped = desc.replace('"', "\\\"").replace('\n', "\\n");
                cmd.push_str(&format!(" --description \"{}\"", escaped));
            }
            
            if !task.labels.is_empty() {
                cmd.push_str(&format!(" --labels \"{}\"", task.labels.join(",")));
            }
            
            cmd
        }).collect()
    }
    
    /// Output as JSON for programmatic use
    pub fn to_json(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string_pretty(self)
    }
}

impl Default for LoomBatch {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_duplicate_task() {
        let task = task_for_duplicate(
            "src/utils.ts",
            "src/helpers.ts",
            0.85,
            Some("evidence-123"),
        );
        
        assert!(task.title.contains("utils.ts"));
        assert!(task.title.contains("helpers.ts"));
        assert!(task.title.contains("85%"));
        assert!(task.labels.contains(&"dry".to_string()));
    }
    
    #[test]
    fn test_batch_cli_commands() {
        let mut batch = LoomBatch::new();
        batch.add(task_for_dead_code("unusedFn", "src/", None));
        batch.add(task_for_orphan("src/orphan.ts", None));
        
        let commands = batch.to_cli_commands();
        assert_eq!(commands.len(), 2);
        assert!(commands[0].starts_with("lm create"));
    }
}
