//! Report Generation
//!
//! Generate markdown, text, or JSON reports from Ground analysis.

use serde::{Deserialize, Serialize};
use crate::config::ReportFormat;

/// A single finding from Ground analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Finding {
    /// Finding type
    pub finding_type: FindingType,
    /// Severity level
    pub severity: Severity,
    /// File path(s) involved
    pub files: Vec<String>,
    /// Description of the finding
    pub description: String,
    /// Suggested action
    pub suggestion: Option<String>,
    /// Additional details
    pub details: Option<serde_json::Value>,
}

/// Types of findings
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum FindingType {
    DeadExport,
    DuplicateFunction,
    OrphanedModule,
    DryViolation,
    EnvironmentMismatch,
}

impl FindingType {
    pub fn as_str(&self) -> &'static str {
        match self {
            FindingType::DeadExport => "Dead Export",
            FindingType::DuplicateFunction => "Duplicate Function",
            FindingType::OrphanedModule => "Orphaned Module",
            FindingType::DryViolation => "DRY Violation",
            FindingType::EnvironmentMismatch => "Environment Mismatch",
        }
    }
    
    pub fn emoji(&self) -> &'static str {
        match self {
            FindingType::DeadExport => "💀",
            FindingType::DuplicateFunction => "📋",
            FindingType::OrphanedModule => "🔌",
            FindingType::DryViolation => "🔁",
            FindingType::EnvironmentMismatch => "⚠️",
        }
    }
}

/// Severity levels
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Ord, PartialOrd, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Severity {
    Info,
    Warning,
    Error,
}

impl Severity {
    pub fn emoji(&self) -> &'static str {
        match self {
            Severity::Info => "ℹ️",
            Severity::Warning => "⚠️",
            Severity::Error => "❌",
        }
    }
}

/// A complete Ground analysis report
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Report {
    /// Report title
    pub title: String,
    /// Analysis path
    pub path: String,
    /// Findings
    pub findings: Vec<Finding>,
    /// Summary statistics
    pub summary: ReportSummary,
    /// Timestamp
    pub timestamp: String,
}

/// Summary statistics
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ReportSummary {
    pub total_findings: usize,
    pub dead_exports: usize,
    pub duplicate_functions: usize,
    pub orphaned_modules: usize,
    pub dry_violations: usize,
    pub environment_issues: usize,
    pub errors: usize,
    pub warnings: usize,
    pub info: usize,
}

impl Report {
    /// Create a new empty report
    pub fn new(title: impl Into<String>, path: impl Into<String>) -> Self {
        Self {
            title: title.into(),
            path: path.into(),
            findings: Vec::new(),
            summary: ReportSummary::default(),
            timestamp: chrono::Utc::now().to_rfc3339(),
        }
    }
    
    /// Add a finding to the report
    pub fn add_finding(&mut self, finding: Finding) {
        // Update summary
        self.summary.total_findings += 1;
        
        match finding.finding_type {
            FindingType::DeadExport => self.summary.dead_exports += 1,
            FindingType::DuplicateFunction => self.summary.duplicate_functions += 1,
            FindingType::OrphanedModule => self.summary.orphaned_modules += 1,
            FindingType::DryViolation => self.summary.dry_violations += 1,
            FindingType::EnvironmentMismatch => self.summary.environment_issues += 1,
        }
        
        match finding.severity {
            Severity::Error => self.summary.errors += 1,
            Severity::Warning => self.summary.warnings += 1,
            Severity::Info => self.summary.info += 1,
        }
        
        self.findings.push(finding);
    }
    
    /// Render the report in the specified format
    pub fn render(&self, format: ReportFormat) -> String {
        match format {
            ReportFormat::Text => self.render_text(),
            ReportFormat::Markdown => self.render_markdown(),
            ReportFormat::Json => self.render_json(),
        }
    }
    
    /// Render as plain text
    pub fn render_text(&self) -> String {
        let mut output = String::new();
        
        output.push_str(&format!("=== {} ===\n", self.title));
        output.push_str(&format!("Path: {}\n", self.path));
        output.push_str(&format!("Time: {}\n\n", self.timestamp));
        
        // Summary
        output.push_str("SUMMARY\n");
        output.push_str(&format!("  Total findings: {}\n", self.summary.total_findings));
        output.push_str(&format!("  Errors: {}\n", self.summary.errors));
        output.push_str(&format!("  Warnings: {}\n", self.summary.warnings));
        output.push_str(&format!("  Info: {}\n\n", self.summary.info));
        
        // Findings by type
        if self.summary.dead_exports > 0 {
            output.push_str(&format!("DEAD EXPORTS ({})\n", self.summary.dead_exports));
            for f in self.findings.iter().filter(|f| f.finding_type == FindingType::DeadExport) {
                output.push_str(&format!("  {} {}\n", f.severity.emoji(), f.description));
                for file in &f.files {
                    output.push_str(&format!("    - {}\n", file));
                }
                if let Some(suggestion) = &f.suggestion {
                    output.push_str(&format!("    Suggestion: {}\n", suggestion));
                }
            }
            output.push('\n');
        }
        
        if self.summary.duplicate_functions > 0 {
            output.push_str(&format!("DUPLICATE FUNCTIONS ({})\n", self.summary.duplicate_functions));
            for f in self.findings.iter().filter(|f| f.finding_type == FindingType::DuplicateFunction) {
                output.push_str(&format!("  {} {}\n", f.severity.emoji(), f.description));
                for file in &f.files {
                    output.push_str(&format!("    - {}\n", file));
                }
                if let Some(suggestion) = &f.suggestion {
                    output.push_str(&format!("    Suggestion: {}\n", suggestion));
                }
            }
            output.push('\n');
        }
        
        if self.summary.orphaned_modules > 0 {
            output.push_str(&format!("ORPHANED MODULES ({})\n", self.summary.orphaned_modules));
            for f in self.findings.iter().filter(|f| f.finding_type == FindingType::OrphanedModule) {
                output.push_str(&format!("  {} {}\n", f.severity.emoji(), f.description));
                for file in &f.files {
                    output.push_str(&format!("    - {}\n", file));
                }
            }
            output.push('\n');
        }
        
        output
    }
    
    /// Render as markdown
    pub fn render_markdown(&self) -> String {
        let mut output = String::new();
        
        output.push_str(&format!("# {}\n\n", self.title));
        output.push_str(&format!("> Path: `{}`  \n", self.path));
        output.push_str(&format!("> Generated: {}\n\n", self.timestamp));
        
        // Summary table
        output.push_str("## Summary\n\n");
        output.push_str("| Metric | Count |\n");
        output.push_str("|--------|-------|\n");
        output.push_str(&format!("| Total Findings | {} |\n", self.summary.total_findings));
        output.push_str(&format!("| ❌ Errors | {} |\n", self.summary.errors));
        output.push_str(&format!("| ⚠️ Warnings | {} |\n", self.summary.warnings));
        output.push_str(&format!("| ℹ️ Info | {} |\n\n", self.summary.info));
        
        // Findings by type
        if self.summary.dead_exports > 0 {
            output.push_str(&format!("## 💀 Dead Exports ({})\n\n", self.summary.dead_exports));
            for f in self.findings.iter().filter(|f| f.finding_type == FindingType::DeadExport) {
                output.push_str(&format!("### {} {}\n\n", f.severity.emoji(), f.description));
                output.push_str("**Files:**\n");
                for file in &f.files {
                    output.push_str(&format!("- `{}`\n", file));
                }
                if let Some(suggestion) = &f.suggestion {
                    output.push_str(&format!("\n**Suggestion:** {}\n", suggestion));
                }
                output.push('\n');
            }
        }
        
        if self.summary.duplicate_functions > 0 {
            output.push_str(&format!("## 📋 Duplicate Functions ({})\n\n", self.summary.duplicate_functions));
            for f in self.findings.iter().filter(|f| f.finding_type == FindingType::DuplicateFunction) {
                output.push_str(&format!("### {} {}\n\n", f.severity.emoji(), f.description));
                output.push_str("**Files:**\n");
                for file in &f.files {
                    output.push_str(&format!("- `{}`\n", file));
                }
                if let Some(suggestion) = &f.suggestion {
                    output.push_str(&format!("\n**Suggestion:** {}\n", suggestion));
                }
                output.push('\n');
            }
        }
        
        if self.summary.orphaned_modules > 0 {
            output.push_str(&format!("## 🔌 Orphaned Modules ({})\n\n", self.summary.orphaned_modules));
            for f in self.findings.iter().filter(|f| f.finding_type == FindingType::OrphanedModule) {
                output.push_str(&format!("- {} `{}`", f.severity.emoji(), f.files.first().unwrap_or(&String::new())));
                if let Some(suggestion) = &f.suggestion {
                    output.push_str(&format!(" - {}", suggestion));
                }
                output.push('\n');
            }
            output.push('\n');
        }
        
        // Footer
        if self.summary.total_findings == 0 {
            output.push_str("---\n\n✅ **No issues found!**\n");
        } else {
            output.push_str("---\n\n");
            output.push_str("*Generated by [Ground](https://github.com/create-something/ground)*\n");
        }
        
        output
    }
    
    /// Render as JSON
    pub fn render_json(&self) -> String {
        serde_json::to_string_pretty(self).unwrap_or_else(|_| "{}".to_string())
    }
    
    /// Check if there are any errors
    pub fn has_errors(&self) -> bool {
        self.summary.errors > 0
    }
    
    /// Check if there are any findings
    pub fn has_findings(&self) -> bool {
        self.summary.total_findings > 0
    }
}

/// Builder for creating findings
pub struct FindingBuilder {
    finding_type: FindingType,
    severity: Severity,
    files: Vec<String>,
    description: String,
    suggestion: Option<String>,
    details: Option<serde_json::Value>,
}

impl FindingBuilder {
    pub fn new(finding_type: FindingType, description: impl Into<String>) -> Self {
        Self {
            finding_type,
            severity: Severity::Warning,
            files: Vec::new(),
            description: description.into(),
            suggestion: None,
            details: None,
        }
    }
    
    pub fn severity(mut self, severity: Severity) -> Self {
        self.severity = severity;
        self
    }
    
    pub fn file(mut self, file: impl Into<String>) -> Self {
        self.files.push(file.into());
        self
    }
    
    pub fn files(mut self, files: impl IntoIterator<Item = impl Into<String>>) -> Self {
        self.files.extend(files.into_iter().map(|f| f.into()));
        self
    }
    
    pub fn suggestion(mut self, suggestion: impl Into<String>) -> Self {
        self.suggestion = Some(suggestion.into());
        self
    }
    
    pub fn details(mut self, details: serde_json::Value) -> Self {
        self.details = Some(details);
        self
    }
    
    pub fn build(self) -> Finding {
        Finding {
            finding_type: self.finding_type,
            severity: self.severity,
            files: self.files,
            description: self.description,
            suggestion: self.suggestion,
            details: self.details,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_report_summary() {
        let mut report = Report::new("Test Report", "./src");
        
        report.add_finding(FindingBuilder::new(FindingType::DeadExport, "Unused export")
            .file("src/utils.ts")
            .severity(Severity::Warning)
            .build());
        
        report.add_finding(FindingBuilder::new(FindingType::DuplicateFunction, "Similar functions")
            .files(["src/a.ts", "src/b.ts"])
            .severity(Severity::Error)
            .build());
        
        assert_eq!(report.summary.total_findings, 2);
        assert_eq!(report.summary.dead_exports, 1);
        assert_eq!(report.summary.duplicate_functions, 1);
        assert_eq!(report.summary.errors, 1);
        assert_eq!(report.summary.warnings, 1);
    }
    
    #[test]
    fn test_markdown_render() {
        let mut report = Report::new("Test Report", "./src");
        report.add_finding(FindingBuilder::new(FindingType::DeadExport, "Unused: foo")
            .file("src/utils.ts")
            .suggestion("Remove or document")
            .build());
        
        let md = report.render_markdown();
        assert!(md.contains("# Test Report"));
        assert!(md.contains("Dead Exports"));
        assert!(md.contains("Unused: foo"));
        assert!(md.contains("Remove or document"));
    }
}
