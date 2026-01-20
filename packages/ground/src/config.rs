//! Ground Configuration
//!
//! Supports .ground.yml for ignore patterns and analysis settings.
//!
//! ## Example Config
//! ```yaml
//! # .ground.yml
//! version: "1"
//! 
//! ignore:
//!   # Functions to skip in duplicate detection
//!   functions:
//!     - getCapabilities    # Required interface method
//!     - constructor        # Boilerplate OK
//!     - toString           # Standard method
//!   
//!   # Exports to skip in dead export detection
//!   exports:
//!     - __test__*          # Test helpers
//!     - internal_*         # Internal APIs
//!   
//!   # File patterns to skip entirely
//!   paths:
//!     - "**/*.test.ts"
//!     - "**/*.spec.ts"
//!     - "**/fixtures/**"
//!     - "**/mocks/**"
//!   
//!   # Specific file pairs to skip in duplicate detection
//!   duplicate_pairs:
//!     - ["src/a.ts", "src/b.ts"]  # Known intentional duplication
//! 
//! thresholds:
//!   duplicate_similarity: 80      # Percent (default: 80)
//!   min_function_lines: 5         # Lines (default: 5)
//!   max_dead_export_age_days: 30  # Days before flagging (optional)
//! 
//! report:
//!   format: markdown              # text, markdown, json
//!   include_suggestions: true
//!   group_by: file                # file, type, severity
//! ```

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use glob::Pattern;

/// Ground configuration loaded from .ground.yml
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct GroundConfig {
    /// Config version
    #[serde(default = "default_version")]
    pub version: String,
    
    /// Extended config files to merge (relative to this config file)
    #[serde(default)]
    pub extends: Vec<String>,
    
    /// Ignore patterns
    #[serde(default)]
    pub ignore: IgnoreConfig,
    
    /// Analysis thresholds
    #[serde(default)]
    pub thresholds: ThresholdConfig,
    
    /// Report settings
    #[serde(default)]
    pub report: ReportConfig,
}

fn default_version() -> String {
    "1".to_string()
}

/// Ignore configuration
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct IgnoreConfig {
    /// Function names to ignore in duplicate detection
    #[serde(default)]
    pub functions: Vec<String>,
    
    /// Export names/patterns to ignore in dead export detection
    #[serde(default)]
    pub exports: Vec<String>,
    
    /// File path patterns to ignore entirely
    #[serde(default)]
    pub paths: Vec<String>,
    
    /// Specific file pairs to ignore in duplicate detection
    #[serde(default)]
    pub duplicate_pairs: Vec<[String; 2]>,
}

/// Threshold configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThresholdConfig {
    /// Similarity threshold for duplicate detection (0-100)
    #[serde(default = "default_similarity")]
    pub duplicate_similarity: u32,
    
    /// Minimum function lines to analyze
    #[serde(default = "default_min_lines")]
    pub min_function_lines: usize,
    
    /// Days before flagging dead exports (optional)
    #[serde(default)]
    pub max_dead_export_age_days: Option<u32>,
}

fn default_similarity() -> u32 { 80 }
fn default_min_lines() -> usize { 5 }

impl Default for ThresholdConfig {
    fn default() -> Self {
        Self {
            duplicate_similarity: 80,
            min_function_lines: 5,
            max_dead_export_age_days: None,
        }
    }
}

/// Report configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportConfig {
    /// Output format
    #[serde(default = "default_format")]
    pub format: ReportFormat,
    
    /// Include fix suggestions
    #[serde(default = "default_true")]
    pub include_suggestions: bool,
    
    /// Group findings by
    #[serde(default)]
    pub group_by: GroupBy,
}

fn default_format() -> ReportFormat { ReportFormat::Text }
fn default_true() -> bool { true }

impl Default for ReportConfig {
    fn default() -> Self {
        Self {
            format: ReportFormat::Text,
            include_suggestions: true,
            group_by: GroupBy::File,
        }
    }
}

/// Report output format
#[derive(Debug, Clone, Copy, Serialize, Deserialize, Default, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ReportFormat {
    #[default]
    Text,
    Markdown,
    Json,
}

/// Grouping strategy for findings
#[derive(Debug, Clone, Copy, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum GroupBy {
    #[default]
    File,
    Type,
    Severity,
    Package,
    App,
}

impl GroundConfig {
    /// Load config from a file path, processing extends directives
    pub fn load(path: &Path) -> Result<Self, ConfigError> {
        Self::load_with_depth(path, 0)
    }
    
    /// Internal load with depth tracking to prevent infinite recursion
    fn load_with_depth(path: &Path, depth: usize) -> Result<Self, ConfigError> {
        const MAX_DEPTH: usize = 10;
        
        if depth > MAX_DEPTH {
            return Err(ConfigError::Parse(format!(
                "Config extends depth exceeded {} (circular reference?)", 
                MAX_DEPTH
            )));
        }
        
        if !path.exists() {
            return Ok(Self::default());
        }
        
        let contents = std::fs::read_to_string(path)
            .map_err(|e| ConfigError::Io(e.to_string()))?;
        
        let mut config: GroundConfig = serde_yaml::from_str(&contents)
            .map_err(|e| ConfigError::Parse(e.to_string()))?;
        
        // Process extends directives
        if !config.extends.is_empty() {
            let base_dir = path.parent().unwrap_or(Path::new("."));
            let extends = std::mem::take(&mut config.extends);
            
            for extend_path in extends {
                let extended_path = base_dir.join(&extend_path);
                if extended_path.exists() {
                    let extended_config = Self::load_with_depth(&extended_path, depth + 1)?;
                    config.merge(extended_config);
                }
                // Silently skip missing extended files (they might be optional)
            }
        }
        
        Ok(config)
    }
    
    /// Merge another config into this one (other takes precedence for scalars,
    /// arrays are concatenated)
    pub fn merge(&mut self, other: GroundConfig) {
        // Merge ignore patterns (concatenate arrays)
        self.ignore.functions.extend(other.ignore.functions);
        self.ignore.exports.extend(other.ignore.exports);
        self.ignore.paths.extend(other.ignore.paths);
        self.ignore.duplicate_pairs.extend(other.ignore.duplicate_pairs);
        
        // Deduplicate
        self.ignore.functions.sort();
        self.ignore.functions.dedup();
        self.ignore.exports.sort();
        self.ignore.exports.dedup();
        self.ignore.paths.sort();
        self.ignore.paths.dedup();
        // duplicate_pairs are harder to dedupe, leave as-is
        
        // For thresholds, keep current values (base config wins)
        // For report, keep current values (base config wins)
    }
    
    /// Load config from default locations
    pub fn load_default() -> Self {
        let paths = [
            PathBuf::from(".ground.yml"),
            PathBuf::from(".ground.yaml"),
            PathBuf::from("ground.yml"),
            PathBuf::from("ground.yaml"),
        ];
        
        for path in &paths {
            if let Ok(config) = Self::load(path) {
                return config;
            }
        }
        
        Self::default()
    }
    
    /// Check if a function name should be ignored
    pub fn should_ignore_function(&self, name: &str) -> bool {
        self.ignore.functions.iter().any(|pattern| {
            if pattern.contains('*') {
                Pattern::new(pattern).map(|p| p.matches(name)).unwrap_or(false)
            } else {
                pattern == name
            }
        })
    }
    
    /// Check if an export name should be ignored
    pub fn should_ignore_export(&self, name: &str) -> bool {
        self.ignore.exports.iter().any(|pattern| {
            if pattern.contains('*') {
                Pattern::new(pattern).map(|p| p.matches(name)).unwrap_or(false)
            } else {
                pattern == name
            }
        })
    }
    
    /// Check if a file path should be ignored
    pub fn should_ignore_path(&self, path: &Path) -> bool {
        let path_str = path.to_string_lossy();
        self.ignore.paths.iter().any(|pattern| {
            Pattern::new(pattern).map(|p| p.matches(&path_str)).unwrap_or(false)
        })
    }
    
    /// Check if a file pair should be ignored in duplicate detection
    /// Handles both absolute and relative paths by checking if paths end with the pattern
    pub fn should_ignore_pair(&self, file_a: &Path, file_b: &Path) -> bool {
        let a_str = file_a.to_string_lossy();
        let b_str = file_b.to_string_lossy();
        
        self.ignore.duplicate_pairs.iter().any(|[pa, pb]| {
            // Try exact match first
            let exact_match = (pa == &*a_str && pb == &*b_str) 
                || (pa == &*b_str && pb == &*a_str);
            
            if exact_match {
                return true;
            }
            
            // Try suffix match (handles absolute vs relative paths)
            // e.g., config has "packages/agency/..." and file is "/Users/.../packages/agency/..."
            let suffix_match = 
                (a_str.ends_with(pa) && b_str.ends_with(pb))
                || (a_str.ends_with(pb) && b_str.ends_with(pa));
            
            if suffix_match {
                return true;
            }
            
            // Try glob patterns
            if pa.contains('*') || pb.contains('*') {
                let pa_pattern = Pattern::new(pa).ok();
                let pb_pattern = Pattern::new(pb).ok();
                
                if let (Some(p1), Some(p2)) = (&pa_pattern, &pb_pattern) {
                    return (p1.matches(&a_str) && p2.matches(&b_str))
                        || (p1.matches(&b_str) && p2.matches(&a_str));
                }
            }
            
            false
        })
    }
    
    /// Get similarity threshold as f64 (0.0-1.0)
    pub fn similarity_threshold(&self) -> f64 {
        self.thresholds.duplicate_similarity as f64 / 100.0
    }
}

/// Configuration errors
#[derive(Debug, Clone, thiserror::Error)]
pub enum ConfigError {
    #[error("IO error: {0}")]
    Io(String),
    
    #[error("Parse error: {0}")]
    Parse(String),
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_default_config() {
        let config = GroundConfig::default();
        assert_eq!(config.thresholds.duplicate_similarity, 80);
        assert_eq!(config.thresholds.min_function_lines, 5);
    }
    
    #[test]
    fn test_ignore_function() {
        let mut config = GroundConfig::default();
        config.ignore.functions = vec![
            "getCapabilities".to_string(),
            "constructor".to_string(),
            "test_*".to_string(),
        ];
        
        assert!(config.should_ignore_function("getCapabilities"));
        assert!(config.should_ignore_function("constructor"));
        assert!(config.should_ignore_function("test_foo"));
        assert!(!config.should_ignore_function("doSomething"));
    }
    
    #[test]
    fn test_ignore_path() {
        let mut config = GroundConfig::default();
        config.ignore.paths = vec![
            "**/*.test.ts".to_string(),
            "**/fixtures/**".to_string(),
        ];
        
        assert!(config.should_ignore_path(Path::new("src/foo.test.ts")));
        assert!(config.should_ignore_path(Path::new("tests/fixtures/data.json")));
        assert!(!config.should_ignore_path(Path::new("src/index.ts")));
    }
    
    #[test]
    fn test_parse_yaml() {
        let yaml = r#"
version: "1"
ignore:
  functions:
    - getCapabilities
    - constructor
  paths:
    - "**/*.test.ts"
thresholds:
  duplicate_similarity: 90
  min_function_lines: 10
report:
  format: markdown
"#;
        
        let config: GroundConfig = serde_yaml::from_str(yaml).unwrap();
        assert_eq!(config.ignore.functions.len(), 2);
        assert_eq!(config.thresholds.duplicate_similarity, 90);
        assert_eq!(config.report.format, ReportFormat::Markdown);
    }
}
