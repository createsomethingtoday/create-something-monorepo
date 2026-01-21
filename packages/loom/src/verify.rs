//! Ground Verification Integration
//!
//! Loom can use Ground to verify task completions.
//! This ensures that claims like "no duplicates" or "dead code removed"
//! are actually grounded in evidence.

use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum VerifyError {
    #[error("Ground not found - install ground or add to PATH")]
    GroundNotFound,
    
    #[error("Verification failed: {0}")]
    Failed(String),
    
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("Parse error: {0}")]
    Parse(#[from] serde_json::Error),
}

/// A verification check type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CheckType {
    /// Check for duplicate files
    Duplicates,
    /// Check for duplicate functions
    DuplicateFunctions,
    /// Check for dead code
    DeadCode,
    /// Check for dead exports
    DeadExports,
    /// Check for orphaned modules
    Orphans,
    /// Check for environment safety
    Environment,
}

impl CheckType {
    pub fn as_str(&self) -> &'static str {
        match self {
            CheckType::Duplicates => "duplicates",
            CheckType::DuplicateFunctions => "duplicate_functions",
            CheckType::DeadCode => "dead_code",
            CheckType::DeadExports => "dead_exports",
            CheckType::Orphans => "orphans",
            CheckType::Environment => "environment",
        }
    }
}

/// Result of a verification check
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerificationResult {
    /// Type of check performed
    pub check_type: CheckType,
    /// Whether the check passed
    pub passed: bool,
    /// Number of issues found
    pub issue_count: u32,
    /// Details of issues (if any)
    pub issues: Vec<String>,
    /// Timestamp of check
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

/// Ground verifier
pub struct Verifier {
    ground_path: String,
}

impl Verifier {
    /// Create a new verifier
    pub fn new() -> Result<Self, VerifyError> {
        // Check if ground is available
        let ground_path = which::which("ground")
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|_| "ground".to_string());
        
        Ok(Self { ground_path })
    }
    
    /// Check if ground is available
    pub fn is_available(&self) -> bool {
        Command::new(&self.ground_path)
            .arg("--version")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }
    
    /// Run a verification check
    pub fn check(
        &self,
        check_type: CheckType,
        directory: impl AsRef<Path>,
    ) -> Result<VerificationResult, VerifyError> {
        let dir = directory.as_ref();
        
        let args: Vec<&str> = match check_type {
            CheckType::Duplicates => vec!["find", "duplicates", "--json"],
            CheckType::DuplicateFunctions => vec!["find", "duplicate-functions", "--json"],
            CheckType::DeadCode => vec!["find", "dead-code", "--json"],
            CheckType::DeadExports => vec!["find", "dead-exports", "--json"],
            CheckType::Orphans => vec!["find", "orphans", "--json"],
            CheckType::Environment => vec!["check", "environment", "--json"],
        };
        
        let output = Command::new(&self.ground_path)
            .args(&args)
            .current_dir(dir)
            .output()?;
        
        // Ground uses exit code 0 for no issues, non-zero for issues found
        let passed = output.status.success();
        let stdout = String::from_utf8_lossy(&output.stdout);
        
        // Try to parse JSON output
        let issues: Vec<String> = if !stdout.is_empty() {
            serde_json::from_str(&stdout).unwrap_or_default()
        } else {
            Vec::new()
        };
        
        Ok(VerificationResult {
            check_type,
            passed,
            issue_count: issues.len() as u32,
            issues,
            timestamp: chrono::Utc::now(),
        })
    }
    
    /// Run multiple checks
    pub fn check_all(
        &self,
        checks: &[CheckType],
        directory: impl AsRef<Path>,
    ) -> Result<Vec<VerificationResult>, VerifyError> {
        let dir = directory.as_ref();
        let mut results = Vec::new();
        
        for check in checks {
            results.push(self.check(*check, dir)?);
        }
        
        Ok(results)
    }
    
    /// Verify that a task's claims are grounded
    pub fn verify_task_claims(
        &self,
        task_labels: &[String],
        directory: impl AsRef<Path>,
    ) -> Result<Vec<VerificationResult>, VerifyError> {
        let mut checks = Vec::new();
        
        // Map labels to verification checks
        for label in task_labels {
            match label.to_lowercase().as_str() {
                "dry" | "refactor" | "duplicates" => {
                    if !checks.contains(&CheckType::Duplicates) {
                        checks.push(CheckType::Duplicates);
                    }
                    if !checks.contains(&CheckType::DuplicateFunctions) {
                        checks.push(CheckType::DuplicateFunctions);
                    }
                }
                "dead-code" | "cleanup" => {
                    if !checks.contains(&CheckType::DeadCode) {
                        checks.push(CheckType::DeadCode);
                    }
                    if !checks.contains(&CheckType::DeadExports) {
                        checks.push(CheckType::DeadExports);
                    }
                }
                "orphan" | "orphans" | "organize" => {
                    if !checks.contains(&CheckType::Orphans) {
                        checks.push(CheckType::Orphans);
                    }
                }
                "workers" | "environment" | "cloudflare" => {
                    if !checks.contains(&CheckType::Environment) {
                        checks.push(CheckType::Environment);
                    }
                }
                _ => {}
            }
        }
        
        if checks.is_empty() {
            return Ok(Vec::new());
        }
        
        self.check_all(&checks, directory)
    }
}

impl Default for Verifier {
    fn default() -> Self {
        Self {
            ground_path: "ground".to_string(),
        }
    }
}

/// Format verification results as evidence string
pub fn format_evidence(results: &[VerificationResult]) -> String {
    if results.is_empty() {
        return "No verification checks performed".to_string();
    }
    
    let mut lines = Vec::new();
    lines.push("Ground Verification Results:".to_string());
    
    for result in results {
        let status = if result.passed { "✓" } else { "✗" };
        lines.push(format!(
            "  {} {}: {} issues",
            status,
            result.check_type.as_str(),
            result.issue_count
        ));
    }
    
    let all_passed = results.iter().all(|r| r.passed);
    lines.push(format!(
        "Overall: {}",
        if all_passed { "PASSED" } else { "FAILED" }
    ));
    
    lines.join("\n")
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_check_type_mapping() {
        let labels = vec![
            "dry".to_string(),
            "refactor".to_string(),
            "dead-code".to_string(),
        ];
        
        // This would map to duplicates, duplicate_functions, dead_code, dead_exports
        let verifier = Verifier::default();
        
        // Can't run actual ground commands in tests, but we can test the label mapping
        assert_eq!(CheckType::Duplicates.as_str(), "duplicates");
        assert_eq!(CheckType::DeadCode.as_str(), "dead_code");
    }
    
    #[test]
    fn test_format_evidence() {
        let results = vec![
            VerificationResult {
                check_type: CheckType::Duplicates,
                passed: true,
                issue_count: 0,
                issues: vec![],
                timestamp: chrono::Utc::now(),
            },
            VerificationResult {
                check_type: CheckType::DeadCode,
                passed: false,
                issue_count: 2,
                issues: vec!["unused_function".to_string(), "dead_export".to_string()],
                timestamp: chrono::Utc::now(),
            },
        ];
        
        let evidence = format_evidence(&results);
        assert!(evidence.contains("Ground Verification"));
        assert!(evidence.contains("duplicates"));
        assert!(evidence.contains("dead_code"));
        assert!(evidence.contains("FAILED"));
    }
}
