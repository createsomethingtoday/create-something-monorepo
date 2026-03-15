//! Exception Patterns for DRY Audit
//!
//! Simple, config-driven exception system.
//! Ships with universal defaults, customizable via `.vt/config.toml`.

use std::path::Path;
use serde::{Deserialize, Serialize};
use glob::Pattern;

/// Configuration for exceptions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExceptionConfig {
    /// Path patterns to ignore (glob syntax)
    #[serde(default = "default_ignore_paths")]
    pub ignore_paths: Vec<String>,
    
    /// Specific filenames to ignore
    #[serde(default = "default_ignore_files")]
    pub ignore_files: Vec<String>,
    
    /// Acceptable similar file patterns (pairs that are similar by design)
    /// Format: ["TableBody:TableHeader", "login:signup"]
    #[serde(default = "default_acceptable_patterns")]
    pub acceptable_patterns: Vec<String>,
    
    /// Maximum lines for "boilerplate" classification
    #[serde(default = "default_boilerplate_max_lines")]
    pub boilerplate_max_lines: usize,
    
    /// Maximum bytes for "small file" classification
    #[serde(default = "default_small_file_max_bytes")]
    pub small_file_max_bytes: u64,
}

impl Default for ExceptionConfig {
    fn default() -> Self {
        Self {
            ignore_paths: default_ignore_paths(),
            ignore_files: default_ignore_files(),
            acceptable_patterns: default_acceptable_patterns(),
            boilerplate_max_lines: default_boilerplate_max_lines(),
            small_file_max_bytes: default_small_file_max_bytes(),
        }
    }
}

fn default_ignore_paths() -> Vec<String> {
    vec![
        "**/test/**".to_string(),
        "**/tests/**".to_string(),
        "**/__tests__/**".to_string(),
        "**/fixtures/**".to_string(),
        "**/__fixtures__/**".to_string(),
        "**/__mocks__/**".to_string(),
        "**/examples/**".to_string(),
        "**/generated/**".to_string(),
        "**/dist/**".to_string(),
        "**/.svelte-kit/**".to_string(),
    ]
}

fn default_ignore_files() -> Vec<String> {
    vec![
        // Build configs
        "vite.config.ts".to_string(),
        "vite.config.js".to_string(),
        "svelte.config.js".to_string(),
        "tailwind.config.js".to_string(),
        "tailwind.config.ts".to_string(),
        "postcss.config.js".to_string(),
        "postcss.config.cjs".to_string(),
        "tsconfig.json".to_string(),
        "mdsvex.config.js".to_string(),
        // Lock files
        "package-lock.json".to_string(),
        "pnpm-lock.yaml".to_string(),
        "yarn.lock".to_string(),
        // Other configs
        ".prettierrc".to_string(),
        ".eslintrc.js".to_string(),
        ".eslintrc.cjs".to_string(),
    ]
}

fn default_acceptable_patterns() -> Vec<String> {
    vec![
        // HTML element wrappers (same component, different elements)
        "TableBody:TableHeader".to_string(),
        "TableHead:TableCell".to_string(),
        "CardContent:CardHeader".to_string(),
        "CardHeader:CardFooter".to_string(),
        // API operation patterns (same resource, different operations)
        "archive:rollback".to_string(),
        "archive:restore".to_string(),
        // Account settings endpoints (same pattern, different settings)
        "privacy:email".to_string(),
        "privacy:notifications".to_string(),
        "email:notifications".to_string(),
    ]
}

fn default_boilerplate_max_lines() -> usize {
    15
}

fn default_small_file_max_bytes() -> u64 {
    300
}

/// Result of checking a file pair against exceptions
#[derive(Debug, Clone, PartialEq)]
pub enum ExceptionMatch {
    /// No exception applies - this is a potential violation
    None,
    /// Matched an ignore path pattern
    IgnoredPath { pattern: String },
    /// Matched an ignore filename
    IgnoredFile { filename: String },
    /// Matched an acceptable pattern (similar by design)
    AcceptablePattern { pattern: String },
    /// Both files are small (boilerplate)
    Boilerplate { reason: String },
    /// Files are re-export only
    ReExportOnly,
}

impl ExceptionMatch {
    pub fn is_exception(&self) -> bool {
        !matches!(self, ExceptionMatch::None)
    }
    
    pub fn reason(&self) -> Option<String> {
        match self {
            ExceptionMatch::None => None,
            ExceptionMatch::IgnoredPath { pattern } => Some(format!("Path matches: {}", pattern)),
            ExceptionMatch::IgnoredFile { filename } => Some(format!("Config file: {}", filename)),
            ExceptionMatch::AcceptablePattern { pattern } => Some(format!("Acceptable pattern: {}", pattern)),
            ExceptionMatch::Boilerplate { reason } => Some(reason.clone()),
            ExceptionMatch::ReExportOnly => Some("Re-export only file".to_string()),
        }
    }
}

/// Check if a file pair matches any exception
pub fn check_exception(
    config: &ExceptionConfig,
    file_a: &Path,
    file_b: &Path,
    content_a: Option<&str>,
    content_b: Option<&str>,
) -> ExceptionMatch {
    // Check ignore paths
    for pattern_str in &config.ignore_paths {
        if let Ok(pattern) = Pattern::new(pattern_str) {
            let path_a = file_a.to_string_lossy();
            let path_b = file_b.to_string_lossy();
            if pattern.matches(&path_a) || pattern.matches(&path_b) {
                return ExceptionMatch::IgnoredPath { pattern: pattern_str.clone() };
            }
        }
    }
    
    // Check ignore filenames
    let name_a = file_a.file_name().and_then(|n| n.to_str()).unwrap_or("");
    let name_b = file_b.file_name().and_then(|n| n.to_str()).unwrap_or("");
    
    for filename in &config.ignore_files {
        if name_a == filename || name_b == filename {
            return ExceptionMatch::IgnoredFile { filename: filename.clone() };
        }
    }
    
    // Check acceptable patterns (similar by design)
    // Check both filename AND full path for pattern matching
    let path_a_str = file_a.to_string_lossy().to_lowercase();
    let path_b_str = file_b.to_string_lossy().to_lowercase();
    
    for pattern in &config.acceptable_patterns {
        if let Some((left, right)) = pattern.split_once(':') {
            let left_lower = left.to_lowercase();
            let right_lower = right.to_lowercase();
            
            // Check if both parts appear in the file paths (handles directory-based routes)
            let matches = (path_a_str.contains(&left_lower) && path_b_str.contains(&right_lower))
                || (path_a_str.contains(&right_lower) && path_b_str.contains(&left_lower));
            
            if matches {
                return ExceptionMatch::AcceptablePattern { pattern: pattern.clone() };
            }
        }
    }
    
    // Check content-based exceptions if content provided
    if let (Some(content_a), Some(content_b)) = (content_a, content_b) {
        // Check for small/boilerplate files
        let lines_a = content_a.lines().count();
        let lines_b = content_b.lines().count();
        
        if lines_a <= config.boilerplate_max_lines && lines_b <= config.boilerplate_max_lines {
            return ExceptionMatch::Boilerplate { 
                reason: format!("Both files ≤{} lines", config.boilerplate_max_lines)
            };
        }
        
        // Check for re-export only files
        if is_reexport_only(content_a) && is_reexport_only(content_b) {
            return ExceptionMatch::ReExportOnly;
        }
    }
    
    ExceptionMatch::None
}

/// Check if file content is just re-exports
fn is_reexport_only(content: &str) -> bool {
    let lines: Vec<&str> = content.lines()
        .map(|l| l.trim())
        .filter(|l| !l.is_empty() && !l.starts_with("//") && !l.starts_with("/*") && !l.starts_with("*"))
        .collect();
    
    if lines.is_empty() || lines.len() > 10 {
        return false;
    }
    
    // Check if all non-empty lines are exports/re-exports
    lines.iter().all(|line| {
        line.starts_with("export ") || 
        line.starts_with("export{") ||
        line.starts_with("export type") ||
        line.starts_with("export *") ||
        line.starts_with("module.exports") ||
        line.ends_with("*/")
    })
}

/// Load config from file or return defaults
pub fn load_config(config_path: &Path) -> ExceptionConfig {
    if config_path.exists() {
        if let Ok(content) = std::fs::read_to_string(config_path) {
            if let Ok(config) = toml::from_str(&content) {
                return config;
            }
        }
    }
    ExceptionConfig::default()
}

// =============================================================================
// SMART THRESHOLD DETECTION
// =============================================================================

/// Detected package type for smart threshold selection
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum PackageType {
    /// UI component library (wrapper components expected)
    UIComponents,
    /// API route handlers (catch copy-paste)
    APIHandlers,
    /// Configuration files (intentionally similar)
    Configuration,
    /// Shared utilities (default)
    SharedLibrary,
    /// Unknown/default
    Default,
}

impl PackageType {
    /// Get recommended threshold for this package type
    pub fn threshold(&self) -> f64 {
        match self {
            PackageType::UIComponents => 0.80,  // Wrapper components expected
            PackageType::APIHandlers => 0.70,   // Catch copy-paste aggressively
            PackageType::Configuration => 0.85, // Config files are similar by design
            PackageType::SharedLibrary => 0.75, // Default
            PackageType::Default => 0.75,
        }
    }
    
    /// Human-readable name
    pub fn name(&self) -> &'static str {
        match self {
            PackageType::UIComponents => "UI Components",
            PackageType::APIHandlers => "API Handlers",
            PackageType::Configuration => "Configuration",
            PackageType::SharedLibrary => "Shared Library",
            PackageType::Default => "Default",
        }
    }
}

/// Detect package type from a file path
pub fn detect_package_type(path: &Path) -> PackageType {
    let path_str = path.to_string_lossy().to_lowercase();
    
    // UI component patterns
    if path_str.contains("/components/ui/") 
        || path_str.contains("/lib/ui/")
        || path_str.contains("/ui/components/") {
        return PackageType::UIComponents;
    }
    
    // API handler patterns (SvelteKit, Next.js, etc.)
    if path_str.contains("/routes/api/")
        || path_str.contains("/api/")
        || path_str.contains("+server.ts")
        || path_str.contains("+server.js") {
        return PackageType::APIHandlers;
    }
    
    // Configuration patterns
    if path_str.contains("/config/")
        || path_str.contains(".config.")
        || path_str.ends_with("config.ts")
        || path_str.ends_with("config.js") {
        return PackageType::Configuration;
    }
    
    // Shared library patterns
    if path_str.contains("/lib/")
        || path_str.contains("/utils/")
        || path_str.contains("/shared/")
        || path_str.contains("/common/") {
        return PackageType::SharedLibrary;
    }
    
    PackageType::Default
}

/// Get smart threshold for a file pair based on their detected types
pub fn smart_threshold(file_a: &Path, file_b: &Path, default: f64) -> f64 {
    let type_a = detect_package_type(file_a);
    let type_b = detect_package_type(file_b);
    
    // If both files are the same type, use that type's threshold
    if type_a == type_b && type_a != PackageType::Default {
        return type_a.threshold();
    }
    
    // If one is UI components, be more lenient
    if type_a == PackageType::UIComponents || type_b == PackageType::UIComponents {
        return 0.80;
    }
    
    // If one is API handlers, be more strict
    if type_a == PackageType::APIHandlers || type_b == PackageType::APIHandlers {
        return 0.70;
    }
    
    // Fall back to default
    default
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_default_config() {
        let config = ExceptionConfig::default();
        assert!(!config.ignore_paths.is_empty());
        assert!(!config.ignore_files.is_empty());
    }
    
    #[test]
    fn test_ignore_path_match() {
        let config = ExceptionConfig::default();
        let file_a = Path::new("src/test/utils.ts");
        let file_b = Path::new("src/lib/utils.ts");
        
        let result = check_exception(&config, file_a, file_b, None, None);
        assert!(matches!(result, ExceptionMatch::IgnoredPath { .. }));
    }
    
    #[test]
    fn test_ignore_file_match() {
        let config = ExceptionConfig::default();
        let file_a = Path::new("packages/a/vite.config.ts");
        let file_b = Path::new("packages/b/vite.config.ts");
        
        let result = check_exception(&config, file_a, file_b, None, None);
        assert!(matches!(result, ExceptionMatch::IgnoredFile { .. }));
    }
    
    #[test]
    fn test_reexport_only() {
        let content = r#"
export { Button } from './Button';
export type { ButtonProps } from './Button';
"#;
        assert!(is_reexport_only(content));
        
        let not_reexport = r#"
export function validate(x: string) {
    return x.length > 0;
}
"#;
        assert!(!is_reexport_only(not_reexport));
    }
    
    #[test]
    fn test_boilerplate_detection() {
        let config = ExceptionConfig::default();
        let file_a = Path::new("a.ts");
        let file_b = Path::new("b.ts");
        let content = "const x = 1;\nconst y = 2;";
        
        let result = check_exception(&config, file_a, file_b, Some(content), Some(content));
        assert!(matches!(result, ExceptionMatch::Boilerplate { .. }));
    }
}
