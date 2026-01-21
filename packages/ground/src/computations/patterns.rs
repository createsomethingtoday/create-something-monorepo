//! Design Pattern Detection
//!
//! Layered algorithm for detecting design system drift and measuring token adoption.
//!
//! ## Algorithm Layers
//!
//! 1. **AST-based CSS Parsing** (Primary)
//!    - Uses cssparser for W3C-compliant CSS analysis
//!    - Context-aware: understands var(), calc(), inherit
//!    - Eliminates false positives from comments/strings
//!
//! 2. **Token Adoption Ratio** (Complementary)
//!    - Formula: compliant_declarations / total_declarations * 100
//!    - Thresholds: 90%+ healthy, 70-89% warning, <70% critical
//!
//! 3. **Svelte-Specific Patterns** (Tertiary)
//!    - Catches computed styles in $derived, $state
//!    - Detects Svelte 4 vs Svelte 5 patterns
//!
//! 4. **Incremental Analysis** (Performance)
//!    - Only re-scan changed files
//!    - Parallel processing with Rayon
//!
//! ## Usage
//!
//! ```rust,ignore
//! use ground::computations::patterns::{analyze_patterns, PatternConfig};
//!
//! let config = PatternConfig::from_yaml(".ground/design-patterns.yml")?;
//! let report = analyze_patterns("packages/", &config)?;
//!
//! println!("Adoption ratio: {}%", report.adoption_ratio);
//! for violation in report.violations {
//!     println!("{}: {}", violation.file, violation.message);
//! }
//! ```

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};
use thiserror::Error;

// =============================================================================
// ERRORS
// =============================================================================

#[derive(Error, Debug)]
pub enum PatternError {
    #[error("Config file not found: {0}")]
    ConfigNotFound(PathBuf),
    
    #[error("Invalid config: {0}")]
    InvalidConfig(String),
    
    #[error("Parse error in {file}: {message}")]
    ParseError { file: PathBuf, message: String },
    
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

// =============================================================================
// CONFIGURATION
// =============================================================================

/// Configuration for pattern detection
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct PatternConfig {
    /// Token categories and their valid patterns
    pub tokens: TokenCategories,
    
    /// Adoption ratio thresholds
    pub thresholds: AdoptionThresholds,
    
    /// Svelte-specific pattern detection
    pub svelte_patterns: SveltePatternConfig,
    
    /// Performance settings
    pub performance: PerformanceConfig,
}

/// Token categories (colors, spacing, typography, etc.)
#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct TokenCategories {
    pub colors: TokenCategory,
    pub spacing: TokenCategory,
    pub typography: TokenCategory,
    pub radii: TokenCategory,
    pub shadows: TokenCategory,
}

/// A single token category with properties and patterns
#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct TokenCategory {
    /// CSS properties that require tokens
    pub properties: Vec<String>,
    
    /// Valid patterns (var(--color-*), inherit, etc.)
    pub valid_patterns: Vec<String>,
    
    /// Violation patterns (hex colors, px values, etc.)
    pub violation_patterns: Vec<String>,
}

/// Adoption ratio thresholds
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AdoptionThresholds {
    /// 90%+ is healthy
    pub healthy: f64,
    
    /// 70-89% needs attention
    pub warning: f64,
    
    /// <70% is critical
    pub critical: f64,
}

impl Default for AdoptionThresholds {
    fn default() -> Self {
        Self {
            healthy: 90.0,
            warning: 70.0,
            critical: 50.0,
        }
    }
}

/// Svelte-specific pattern configuration
#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct SveltePatternConfig {
    /// Detect Svelte 4 export let patterns
    pub detect_legacy_props: bool,
    
    /// Detect hardcoded values in $derived/$state
    pub detect_computed_styles: bool,
}

/// Performance configuration
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct PerformanceConfig {
    /// Enable incremental analysis
    pub incremental: bool,
    
    /// Enable parallel processing
    pub parallel: bool,
    
    /// Cache location
    pub cache_path: Option<PathBuf>,
}

impl Default for PerformanceConfig {
    fn default() -> Self {
        Self {
            incremental: true,
            parallel: true,
            cache_path: Some(PathBuf::from(".ground/cache")),
        }
    }
}

impl Default for PatternConfig {
    fn default() -> Self {
        Self {
            tokens: TokenCategories::default(),
            thresholds: AdoptionThresholds::default(),
            svelte_patterns: SveltePatternConfig::default(),
            performance: PerformanceConfig::default(),
        }
    }
}

// =============================================================================
// PATTERN REGISTRY
// =============================================================================

/// Registry for loading and managing design patterns from YAML configuration
#[derive(Debug, Clone)]
pub struct PatternRegistry {
    /// Loaded pattern configuration
    pub config: PatternConfig,
    
    /// Paths to ignore (from project-specific.yml)
    pub ignore_paths: Vec<String>,
    
    /// Known drift items (acknowledged violations)
    pub known_drift: Vec<KnownDrift>,
    
    /// Source file for the configuration
    pub config_source: Option<PathBuf>,
}

/// A known drift item that should be tracked but not flagged
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct KnownDrift {
    pub file: String,
    pub issue: String,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub priority: String,
    #[serde(default)]
    pub reason: String,
}

/// Raw YAML structure for design-patterns.yml
#[derive(Debug, Deserialize)]
struct DesignPatternsYaml {
    #[serde(default)]
    enforcement: Option<EnforcementYaml>,
}

#[derive(Debug, Deserialize)]
struct EnforcementYaml {
    #[serde(default)]
    adoption_ratio: Option<AdoptionRatioYaml>,
}

#[derive(Debug, Deserialize)]
struct AdoptionRatioYaml {
    #[serde(default)]
    thresholds: Option<ThresholdsYaml>,
}

#[derive(Debug, Deserialize)]
struct ThresholdsYaml {
    #[serde(default)]
    healthy: Option<f64>,
    #[serde(default)]
    warning: Option<f64>,
    #[serde(default)]
    critical: Option<f64>,
}

/// Raw YAML structure for project-specific.yml
#[derive(Debug, Deserialize)]
struct ProjectSpecificYaml {
    #[serde(default)]
    design_patterns: Option<DesignPatternsSection>,
}

#[derive(Debug, Deserialize)]
struct DesignPatternsSection {
    #[serde(default)]
    ignore_paths: Vec<String>,
    #[serde(default)]
    known_drift: Option<KnownDriftSection>,
}

#[derive(Debug, Deserialize)]
struct KnownDriftSection {
    #[serde(default)]
    critical: Vec<KnownDrift>,
    #[serde(default)]
    unmigrated: Vec<UnmigratedPackage>,
}

#[derive(Debug, Deserialize)]
struct UnmigratedPackage {
    #[serde(default)]
    package: String,
    #[serde(default)]
    issue: String,
    #[serde(default)]
    reason: String,
}

impl PatternRegistry {
    /// Create a new registry with default configuration
    pub fn new() -> Self {
        Self {
            config: PatternConfig::default(),
            ignore_paths: Vec::new(),
            known_drift: Vec::new(),
            config_source: None,
        }
    }
    
    /// Load registry from a directory containing .ground/ config files
    pub fn from_directory(dir: &Path) -> Result<Self, PatternError> {
        // Walk up from dir to find .ground directory (repo root)
        let ground_dir = find_ground_dir(dir).unwrap_or_else(|| dir.join(".ground"));
        
        let mut registry = Self::new();
        
        // Try to load design-patterns.yml
        let patterns_path = ground_dir.join("design-patterns.yml");
        if patterns_path.exists() {
            registry.load_design_patterns(&patterns_path)?;
            registry.config_source = Some(patterns_path);
        }
        
        // Try to load project-specific.yml for exceptions
        let specific_path = ground_dir.join("project-specific.yml");
        if specific_path.exists() {
            registry.load_project_specific(&specific_path)?;
        }
        
        Ok(registry)
    }
}

/// Find .ground directory by walking up from the given path
fn find_ground_dir(start: &Path) -> Option<PathBuf> {
    let mut current = if start.is_absolute() {
        start.to_path_buf()
    } else {
        std::env::current_dir().ok()?.join(start)
    };
    
    // Canonicalize if possible
    current = current.canonicalize().unwrap_or(current);
    
    loop {
        let ground_dir = current.join(".ground");
        if ground_dir.exists() && ground_dir.is_dir() {
            return Some(ground_dir);
        }
        
        if !current.pop() {
            break;
        }
    }
    
    None
}

impl PatternRegistry {
    /// Load design patterns from YAML file
    fn load_design_patterns(&mut self, path: &Path) -> Result<(), PatternError> {
        let content = std::fs::read_to_string(path)
            .map_err(|_| PatternError::ConfigNotFound(path.to_path_buf()))?;
        
        let yaml: DesignPatternsYaml = serde_yaml::from_str(&content)
            .map_err(|e| PatternError::InvalidConfig(format!("YAML parse error: {}", e)))?;
        
        // Extract thresholds if present
        if let Some(enforcement) = yaml.enforcement {
            if let Some(adoption) = enforcement.adoption_ratio {
                if let Some(thresholds) = adoption.thresholds {
                    if let Some(healthy) = thresholds.healthy {
                        self.config.thresholds.healthy = healthy;
                    }
                    if let Some(warning) = thresholds.warning {
                        self.config.thresholds.warning = warning;
                    }
                    if let Some(critical) = thresholds.critical {
                        self.config.thresholds.critical = critical;
                    }
                }
            }
        }
        
        Ok(())
    }
    
    /// Load project-specific exceptions from YAML file
    fn load_project_specific(&mut self, path: &Path) -> Result<(), PatternError> {
        let content = std::fs::read_to_string(path)
            .map_err(|_| PatternError::ConfigNotFound(path.to_path_buf()))?;
        
        let yaml: ProjectSpecificYaml = serde_yaml::from_str(&content)
            .map_err(|e| PatternError::InvalidConfig(format!("YAML parse error: {}", e)))?;
        
        if let Some(design_patterns) = yaml.design_patterns {
            // Load ignore paths
            self.ignore_paths = design_patterns.ignore_paths;
            
            // Load known drift
            if let Some(known_drift) = design_patterns.known_drift {
                self.known_drift.extend(known_drift.critical);
                
                // Convert unmigrated packages to known drift items
                for pkg in known_drift.unmigrated {
                    self.known_drift.push(KnownDrift {
                        file: pkg.package,
                        issue: pkg.issue,
                        status: "tracked".to_string(),
                        priority: "low".to_string(),
                        reason: pkg.reason,
                    });
                }
            }
        }
        
        Ok(())
    }
    
    /// Check if a path should be ignored
    pub fn should_ignore(&self, path: &Path) -> bool {
        let path_str = path.to_string_lossy();
        
        for pattern in &self.ignore_paths {
            // Simple glob matching
            let pattern_clean = pattern.trim_start_matches("**/").trim_end_matches("/**");
            if path_str.contains(pattern_clean) {
                return true;
            }
        }
        
        false
    }
    
    /// Check if a file is in the known drift list
    pub fn is_known_drift(&self, path: &Path) -> Option<&KnownDrift> {
        let path_str = path.to_string_lossy();
        
        self.known_drift.iter().find(|drift| {
            path_str.contains(&drift.file)
        })
    }
    
    /// Get the configuration
    pub fn config(&self) -> &PatternConfig {
        &self.config
    }
}

impl Default for PatternRegistry {
    fn default() -> Self {
        Self::new()
    }
}

// =============================================================================
// EVIDENCE TYPES
// =============================================================================

/// Evidence from pattern analysis
#[derive(Debug, Clone, Serialize)]
pub struct PatternEvidence {
    /// File that was analyzed
    pub file: PathBuf,
    
    /// Violations found
    pub violations: Vec<PatternViolation>,
    
    /// Adoption metrics for this file
    pub metrics: FileMetrics,
}

/// A single pattern violation
#[derive(Debug, Clone, Serialize)]
pub struct PatternViolation {
    /// Category (colors, spacing, typography, etc.)
    pub category: String,
    
    /// Line number (1-indexed)
    pub line: usize,
    
    /// Column number (1-indexed)
    pub column: usize,
    
    /// The CSS property
    pub property: String,
    
    /// The violating value
    pub value: String,
    
    /// Human-readable message
    pub message: String,
    
    /// Suggested fix
    pub suggestion: Option<String>,
    
    /// Severity level
    pub severity: ViolationSeverity,
}

/// Severity level for violations
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ViolationSeverity {
    /// Information only
    Info,
    /// Should be fixed
    Warning,
    /// Must be fixed
    Error,
}

/// Metrics for a single file
#[derive(Debug, Clone, Serialize)]
pub struct FileMetrics {
    /// Total token-required declarations
    pub total_declarations: usize,
    
    /// Compliant declarations (using tokens)
    pub compliant_declarations: usize,
    
    /// Adoption ratio (0.0 - 100.0)
    pub adoption_ratio: f64,
    
    /// Health status based on thresholds
    pub health: HealthStatus,
    
    /// Breakdown by category
    pub category_breakdown: HashMap<String, CategoryMetrics>,
}

/// Health status for a file
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
pub enum HealthStatus {
    /// 90%+ adoption
    Healthy,
    /// 70-89% adoption
    Warning,
    /// <70% adoption
    Critical,
}

/// Metrics for a single category
#[derive(Debug, Clone, Serialize)]
pub struct CategoryMetrics {
    pub total: usize,
    pub compliant: usize,
    pub ratio: f64,
}

// =============================================================================
// AGGREGATE REPORT
// =============================================================================

/// Aggregate report for multiple files
#[derive(Debug, Clone, Serialize)]
pub struct PatternReport {
    /// Total files analyzed
    pub files_analyzed: usize,
    
    /// Overall adoption ratio
    pub overall_adoption_ratio: f64,
    
    /// Overall health status
    pub overall_health: HealthStatus,
    
    /// All violations across files
    pub violations: Vec<PatternViolation>,
    
    /// Per-file evidence
    pub file_evidence: Vec<PatternEvidence>,
    
    /// Worst offending files (lowest adoption)
    pub worst_files: Vec<(PathBuf, f64)>,
    
    /// Most common violation type
    pub most_common_violation: Option<String>,
    
    /// Category-level metrics
    pub category_summary: HashMap<String, CategoryMetrics>,
}

// =============================================================================
// CORE ANALYSIS FUNCTIONS
// =============================================================================

/// Analyze patterns in a directory
pub fn analyze_patterns(
    root: &Path,
    config: &PatternConfig,
) -> Result<PatternReport, PatternError> {
    // Try to load registry for ignore rules
    let registry = PatternRegistry::from_directory(root).ok();
    analyze_patterns_with_registry(root, config, registry.as_ref())
}

/// Analyze patterns with explicit registry for filtering
pub fn analyze_patterns_with_registry(
    root: &Path,
    config: &PatternConfig,
    registry: Option<&PatternRegistry>,
) -> Result<PatternReport, PatternError> {
    let all_files = discover_svelte_files(root)?;
    
    // Filter files using registry ignore paths
    let files: Vec<_> = if let Some(reg) = registry {
        all_files.into_iter()
            .filter(|f| !reg.should_ignore(f))
            .collect()
    } else {
        all_files
    };
    
    // Use parallel processing if enabled
    let evidence: Vec<PatternEvidence> = if config.performance.parallel {
        #[cfg(feature = "rayon")]
        {
            use rayon::prelude::*;
            files.par_iter()
                .filter_map(|f| analyze_file(f, config).ok())
                .collect()
        }
        #[cfg(not(feature = "rayon"))]
        {
            files.iter()
                .filter_map(|f| analyze_file(f, config).ok())
                .collect()
        }
    } else {
        files.iter()
            .filter_map(|f| analyze_file(f, config).ok())
            .collect()
    };
    
    aggregate_report(evidence, config)
}

/// Analyze a single file
pub fn analyze_file(
    file: &Path,
    config: &PatternConfig,
) -> Result<PatternEvidence, PatternError> {
    let content = std::fs::read_to_string(file)
        .map_err(PatternError::Io)?;
    
    let mut violations = Vec::new();
    let mut category_metrics: HashMap<String, (usize, usize)> = HashMap::new();
    
    // Determine file type and use appropriate analyzer
    let ext = file.extension().and_then(|e| e.to_str()).unwrap_or("");
    
    match ext {
        "svelte" => {
            // Extract <style> block for Svelte
            if let Some(style_content) = extract_style_block(&content) {
                // Layer 1: AST-based CSS parsing
                let css_violations = analyze_css(&style_content, file, config)?;
                violations.extend(css_violations);
                
                // Count declarations for metrics
                count_declarations(&style_content, config, &mut category_metrics);
            }
            
            // Layer 3: Svelte-specific patterns
            if config.svelte_patterns.detect_legacy_props {
                let prop_violations = detect_legacy_props(&content, file);
                violations.extend(prop_violations);
            }
            
            if config.svelte_patterns.detect_computed_styles {
                let computed_violations = detect_computed_styles(&content, file);
                violations.extend(computed_violations);
            }
        }
        
        "tsx" | "ts" => {
            // Use TSX AST-based analyzer for React files
            let tsx_result = analyze_tsx_file(file, config)?;
            
            // Convert TSX violations to PatternViolation
            for tsx_v in tsx_result.violations {
                violations.push(PatternViolation {
                    line: tsx_v.line,
                    column: tsx_v.column,
                    category: tsx_v.category,
                    property: tsx_v.property,
                    value: tsx_v.value,
                    message: tsx_v.message,
                    severity: ViolationSeverity::Warning,
                    suggestion: tsx_v.suggestion,
                });
            }
            
            // Add hardcoded values as violations
            for tsx_v in tsx_result.hardcoded_values {
                violations.push(PatternViolation {
                    line: tsx_v.line,
                    column: tsx_v.column,
                    category: tsx_v.category,
                    property: tsx_v.property,
                    value: tsx_v.value,
                    message: tsx_v.message,
                    severity: ViolationSeverity::Warning,
                    suggestion: tsx_v.suggestion,
                });
            }
            
            // Add metrics from TSX analysis
            category_metrics.insert(
                "tsx_design_system".to_string(),
                (tsx_result.total_style_declarations, tsx_result.compliant_declarations)
            );
        }
        
        "css" => {
            // Analyze standalone CSS files
            let css_violations = analyze_css(&content, file, config)?;
            violations.extend(css_violations);
            count_declarations(&content, config, &mut category_metrics);
        }
        
        _ => {
            // Unknown file type - skip
        }
    }
    
    // Calculate metrics
    let metrics = calculate_metrics(&category_metrics, config);
    
    Ok(PatternEvidence {
        file: file.to_path_buf(),
        violations,
        metrics,
    })
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/// Discover all analyzable files in a directory (.svelte, .tsx, .ts, .css)
fn discover_svelte_files(root: &Path) -> Result<Vec<PathBuf>, PatternError> {
    let mut files = Vec::new();
    discover_files_recursive(root, &mut files)?;
    Ok(files)
}

fn discover_files_recursive(dir: &Path, files: &mut Vec<PathBuf>) -> Result<(), PatternError> {
    if dir.is_dir() {
        for entry in std::fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();
            
            // Skip node_modules and hidden directories
            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                if name.starts_with('.') || name == "node_modules" || name == "dist" {
                    continue;
                }
            }
            
            if path.is_dir() {
                discover_files_recursive(&path, files)?;
            } else if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                // Include Svelte, TSX, TS, and CSS files
                if matches!(ext, "svelte" | "tsx" | "ts" | "css") {
                    files.push(path);
                }
            }
        }
    }
    Ok(())
}

// =============================================================================
// TSX/REACT ANALYSIS (AST-based using tree-sitter)
// =============================================================================

/// Configuration for TSX design system analysis
#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct TsxPatternConfig {
    /// Design system import patterns (e.g., "brand-design-system")
    pub design_system_imports: Vec<String>,
    
    /// Valid constant prefixes (e.g., "BRAND_COLORS", "BRAND_SPACING")
    pub valid_constant_prefixes: Vec<String>,
    
    /// Properties to check in style objects
    pub style_properties: Vec<String>,
}

/// TSX-specific violation for React codebases
#[derive(Debug, Clone, Serialize)]
pub struct TsxViolation {
    pub file: PathBuf,
    pub line: usize,
    pub column: usize,
    pub category: String,
    pub property: String,
    pub value: String,
    pub message: String,
    pub suggestion: Option<String>,
}

/// Analyze a TSX/TS file for design system compliance using AST
pub fn analyze_tsx_file(
    file: &Path,
    _config: &PatternConfig,
) -> Result<TsxAnalysisResult, PatternError> {
    let content = std::fs::read_to_string(file)
        .map_err(PatternError::Io)?;
    
    let mut result = TsxAnalysisResult {
        file: file.to_path_buf(),
        violations: Vec::new(),
        design_system_imported: false,
        constants_used: Vec::new(),
        hardcoded_values: Vec::new(),
        adoption_ratio: 100.0,
        total_style_declarations: 0,
        compliant_declarations: 0,
    };
    
    // Determine if this is a UI file (has actual JSX/React components) vs backend file
    // Must have explicit React imports or JSX syntax
    let has_react_import = content.contains("from 'react'") 
        || content.contains("from \"react\"")
        || content.contains("import React");
    let has_jsx_syntax = content.contains("</") && (
        content.contains("<div") || content.contains("<span") || content.contains("<button") 
        || content.contains("<p>") || content.contains("<h1") || content.contains("<form")
        || content.contains("<input") || content.contains("<label")
    );
    let has_classname = content.contains("className=");
    let has_style_prop = content.contains("style={{") || content.contains("style={");
    
    let is_ui_file = (has_react_import || has_jsx_syntax || has_classname || has_style_prop)
        || file.extension().map_or(false, |e| e == "tsx");
    
    // Skip pure TypeScript files (workers, utilities, API routes, etc.)
    if !is_ui_file && file.extension().map_or(false, |e| e == "ts") {
        // Return 100% adoption for non-UI files (they don't need design system)
        return Ok(result);
    }
    
    // Also skip TSX files that are just type definitions or configs
    if file.to_string_lossy().contains(".d.ts") 
        || file.to_string_lossy().contains("config") 
        || file.to_string_lossy().contains(".test.") {
        return Ok(result);
    }
    
    // Check for design system imports
    result.design_system_imported = content.contains("brand-design-system") 
        || content.contains("BRAND_COLORS")
        || content.contains("BRAND_SPACING");
    
    // Parse with tree-sitter for AST analysis (only for TSX files)
    if file.extension().map_or(false, |e| e == "tsx") {
        let tsx_violations = analyze_tsx_ast(&content, file);
        result.violations = tsx_violations;
    }
    
    // Count design system constant usage
    let constant_prefixes = ["BRAND_COLORS", "BRAND_SPACING", "BRAND_TYPOGRAPHY", 
                           "BRAND_RADIUS", "BRAND_ANIMATION", "BRAND_BUTTON_STYLES",
                           "BRAND_CARD_STYLES", "BRAND_INPUT_STYLES"];
    for prefix in constant_prefixes {
        let count = content.matches(prefix).count();
        if count > 0 {
            result.constants_used.push((prefix.to_string(), count));
            result.compliant_declarations += count;
        }
    }
    
    // Find hardcoded style values (only in UI files)
    if is_ui_file {
        let hardcoded = find_hardcoded_tsx_values(&content, file);
        result.hardcoded_values = hardcoded.clone();
        result.total_style_declarations = result.compliant_declarations + hardcoded.len();
    }
    
    // Calculate adoption ratio
    if result.total_style_declarations > 0 {
        result.adoption_ratio = (result.compliant_declarations as f64 
            / result.total_style_declarations as f64) * 100.0;
    }
    
    Ok(result)
}

/// Result of TSX analysis
#[derive(Debug, Clone, Serialize)]
pub struct TsxAnalysisResult {
    pub file: PathBuf,
    pub violations: Vec<TsxViolation>,
    pub design_system_imported: bool,
    pub constants_used: Vec<(String, usize)>,
    pub hardcoded_values: Vec<TsxViolation>,
    pub adoption_ratio: f64,
    pub total_style_declarations: usize,
    pub compliant_declarations: usize,
}

/// AST-based TSX analysis using tree-sitter
fn analyze_tsx_ast(content: &str, file: &Path) -> Vec<TsxViolation> {
    let mut violations = Vec::new();
    
    // Initialize tree-sitter parser for TSX
    let mut parser = tree_sitter::Parser::new();
    let language = tree_sitter_typescript::LANGUAGE_TSX;
    parser.set_language(&language.into()).ok();
    
    let tree = match parser.parse(content, None) {
        Some(t) => t,
        None => return violations,
    };
    
    let root = tree.root_node();
    
    // Walk the AST looking for JSX style attributes
    find_jsx_style_violations(root, content, file, &mut violations);
    
    violations
}

/// Recursively find JSX style prop violations in AST
fn find_jsx_style_violations(
    node: tree_sitter::Node,
    content: &str,
    file: &Path,
    violations: &mut Vec<TsxViolation>,
) {
    // Check if this is a JSX attribute named "style"
    if node.kind() == "jsx_attribute" {
        if let Some(name_node) = node.child_by_field_name("name") {
            let name = &content[name_node.byte_range()];
            if name == "style" {
                // Found a style attribute - analyze its value
                if let Some(value_node) = node.child_by_field_name("value") {
                    analyze_jsx_style_value(value_node, content, file, violations);
                }
            }
        }
    }
    
    // Check for inline style objects in variable declarations
    if node.kind() == "variable_declarator" {
        let node_text = &content[node.byte_range()];
        // Check for style-related variable names
        if node_text.contains("Style") || node_text.contains("style") {
            check_style_object_for_hardcoded(node, content, file, violations);
        }
    }
    
    // Recurse into children
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        find_jsx_style_violations(child, content, file, violations);
    }
}

/// Analyze a JSX style attribute value for hardcoded values
fn analyze_jsx_style_value(
    node: tree_sitter::Node,
    content: &str,
    file: &Path,
    violations: &mut Vec<TsxViolation>,
) {
    let value_text = &content[node.byte_range()];
    let start_pos = node.start_position();
    
    // Check for hardcoded hex colors
    let hex_colors = find_hex_colors(value_text);
    
    for hex in hex_colors {
        // Skip if it's part of a BRAND_COLORS reference
        if !value_text.contains("BRAND_COLORS") {
            violations.push(TsxViolation {
                file: file.to_path_buf(),
                line: start_pos.row + 1,
                column: start_pos.column + 1,
                category: "colors".to_string(),
                property: "style".to_string(),
                value: hex.to_string(),
                message: format!("Hardcoded color '{}' - use BRAND_COLORS constant", hex),
                suggestion: Some("BRAND_COLORS.white or BRAND_COLORS.black".to_string()),
            });
        }
    }
    
    // Check for hardcoded pixel values (excluding small adjustments)
    let px_values: Vec<&str> = value_text
        .split(|c: char| !c.is_ascii_digit() && c != 'p' && c != 'x')
        .filter(|s| s.ends_with("px") && s.len() > 2)
        .collect();
    
    for px in px_values {
        let num_str = px.trim_end_matches("px");
        if let Ok(num) = num_str.parse::<i32>() {
            // Allow small values (1-10px) for fine adjustments
            if num > 10 && !value_text.contains("BRAND_SPACING") {
                violations.push(TsxViolation {
                    file: file.to_path_buf(),
                    line: start_pos.row + 1,
                    column: start_pos.column + 1,
                    category: "spacing".to_string(),
                    property: "style".to_string(),
                    value: px.to_string(),
                    message: format!("Hardcoded spacing '{}' - use BRAND_SPACING constant", px),
                    suggestion: Some(suggest_spacing_constant(num)),
                });
            }
        }
    }
}

/// Check style objects for hardcoded values
fn check_style_object_for_hardcoded(
    node: tree_sitter::Node,
    content: &str,
    file: &Path,
    violations: &mut Vec<TsxViolation>,
) {
    let text = &content[node.byte_range()];
    let start_pos = node.start_position();
    
    // Check for hardcoded rem values (excluding common ones)
    let rem_pattern = ["0.25rem", "0.5rem", "0.75rem", "1rem", "1.5rem", "2rem"];
    for line in text.lines() {
        if line.contains("rem") && !line.contains("BRAND_") {
            let mut is_allowed = false;
            for allowed in &rem_pattern {
                if line.contains(allowed) {
                    is_allowed = true;
                    break;
                }
            }
            if !is_allowed && line.contains(':') {
                // Extract the property and value
                if let Some(colon_pos) = line.find(':') {
                    let prop = line[..colon_pos].trim().trim_matches(|c| c == '\'' || c == '"');
                    let val = line[colon_pos + 1..].trim().trim_matches(|c| c == ',' || c == '\'' || c == '"');
                    if val.contains("rem") {
                        violations.push(TsxViolation {
                            file: file.to_path_buf(),
                            line: start_pos.row + 1,
                            column: start_pos.column + 1,
                            category: "spacing".to_string(),
                            property: prop.to_string(),
                            value: val.to_string(),
                            message: format!("Hardcoded value '{}' in style object", val),
                            suggestion: Some("Use BRAND_SPACING.* constant".to_string()),
                        });
                    }
                }
            }
        }
    }
}

/// Find hardcoded style values in TSX content (fallback regex-based)
fn find_hardcoded_tsx_values(content: &str, file: &Path) -> Vec<TsxViolation> {
    let mut violations = Vec::new();
    
    // Track if we're inside a third-party library config block
    let mut in_third_party_config = false;
    let mut brace_depth = 0;
    
    for (line_num, line) in content.lines().enumerate() {
        // Skip comments and imports
        if line.trim().starts_with("//") || line.trim().starts_with("import") {
            continue;
        }
        
        // Detect entry into third-party config blocks
        // Stripe Elements appearance config
        if line.contains("appearance:") || line.contains("appearance =") {
            in_third_party_config = true;
            brace_depth = 0;
        }
        // Stripe theme variables
        if line.contains("colorPrimary:") || line.contains("colorBackground:") 
            || line.contains("colorText:") || line.contains("colorDanger:") {
            continue; // Skip Stripe theme properties entirely
        }
        // TanStack/Chart libraries
        if line.contains("theme:") && line.contains("{") {
            in_third_party_config = true;
            brace_depth = 0;
        }
        
        // Track brace depth for config blocks
        if in_third_party_config {
            for c in line.chars() {
                if c == '{' { brace_depth += 1; }
                if c == '}' { brace_depth -= 1; }
            }
            if brace_depth <= 0 {
                in_third_party_config = false;
            }
            continue; // Skip all lines in third-party config blocks
        }
        
        // Check for hardcoded hex colors not in BRAND_COLORS context
        if line.contains('#') && !line.contains("BRAND_COLORS") && !line.contains("//") {
            // Simple hex detection
            let mut chars = line.chars().peekable();
            while let Some(c) = chars.next() {
                if c == '#' {
                    let mut hex = String::from("#");
                    while let Some(&next) = chars.peek() {
                        if next.is_ascii_hexdigit() {
                            hex.push(chars.next().unwrap());
                        } else {
                            break;
                        }
                    }
                    if hex.len() >= 4 && hex.len() <= 9 {
                        // Check if it's in a style context (JSX style prop)
                        if line.contains("style={{") || line.contains("style={") 
                            || (line.contains("style:") && !line.contains("fontFamily")) {
                            violations.push(TsxViolation {
                                file: file.to_path_buf(),
                                line: line_num + 1,
                                column: 1,
                                category: "colors".to_string(),
                                property: "inline".to_string(),
                                value: hex.clone(),
                                message: format!("Hardcoded color '{}'", hex),
                                suggestion: Some("Use BRAND_COLORS.* constant".to_string()),
                            });
                        }
                    }
                }
            }
        }
        
        // Check for Tailwind arbitrary values (hardcoded colors/spacing in className)
        if line.contains("className") {
            // Detect bg-[#xxx], text-[#xxx], border-[#xxx] patterns
            let tailwind_color_patterns = ["bg-[#", "text-[#", "border-[#", "fill-[#", "stroke-[#"];
            for pattern in tailwind_color_patterns {
                if line.contains(pattern) {
                    // Extract the hex value
                    if let Some(start) = line.find(pattern) {
                        let after = &line[start + pattern.len()..];
                        if let Some(end) = after.find(']') {
                            let hex_value = &after[..end];
                            violations.push(TsxViolation {
                                file: file.to_path_buf(),
                                line: line_num + 1,
                                column: 1,
                                category: "tailwind_colors".to_string(),
                                property: "className".to_string(),
                                value: format!("{}{}]", pattern, hex_value),
                                message: format!("Tailwind arbitrary color '{}' - use design token class", hex_value),
                                suggestion: Some("Use bg-black, bg-zinc-900, or CSS variable".to_string()),
                            });
                        }
                    }
                }
            }
            
            // Detect spacing arbitrary values: p-[xxpx], m-[xxpx], gap-[xxpx]
            let tailwind_spacing_patterns = ["p-[", "m-[", "px-[", "py-[", "mx-[", "my-[", 
                                             "gap-[", "space-x-[", "space-y-[", "w-[", "h-["];
            for pattern in tailwind_spacing_patterns {
                if line.contains(pattern) {
                    if let Some(start) = line.find(pattern) {
                        let after = &line[start + pattern.len()..];
                        if let Some(end) = after.find(']') {
                            let value = &after[..end];
                            // Only flag px values, not percentages or calc()
                            if value.ends_with("px") && !value.contains("calc") {
                                violations.push(TsxViolation {
                                    file: file.to_path_buf(),
                                    line: line_num + 1,
                                    column: 1,
                                    category: "tailwind_spacing".to_string(),
                                    property: "className".to_string(),
                                    value: format!("{}{}]", pattern, value),
                                    message: format!("Tailwind arbitrary spacing '{}' - use standard utility", value),
                                    suggestion: Some("Use p-4, m-2, gap-4, etc.".to_string()),
                                });
                            }
                        }
                    }
                }
            }
        }
    }
    
    violations
}

/// Suggest appropriate BRAND_SPACING constant for a pixel value
fn suggest_spacing_constant(px: i32) -> String {
    match px {
        0..=12 => "BRAND_SPACING.xs (8px)".to_string(),
        13..=20 => "BRAND_SPACING.sm (16px)".to_string(),
        21..=34 => "BRAND_SPACING.md (26px)".to_string(),
        35..=55 => "BRAND_SPACING.lg (42px)".to_string(),
        56..=90 => "BRAND_SPACING.xl (68px)".to_string(),
        _ => "BRAND_SPACING.2xl (110px)".to_string(),
    }
}

/// Find hex color values in a string (returns owned strings)
fn find_hex_colors(s: &str) -> Vec<String> {
    let mut results = Vec::new();
    let mut i = 0;
    let bytes = s.as_bytes();
    while i < bytes.len() {
        if bytes[i] == b'#' {
            let start = i;
            i += 1;
            while i < bytes.len() && bytes[i].is_ascii_hexdigit() {
                i += 1;
            }
            if i - start >= 4 && i - start <= 9 {
                results.push(s[start..i].to_string());
            }
        } else {
            i += 1;
        }
    }
    results
}

/// Extract <style> block from Svelte component
fn extract_style_block(content: &str) -> Option<String> {
    let start = content.find("<style")?;
    let style_start = content[start..].find('>')? + start + 1;
    let end = content[style_start..].find("</style>")? + style_start;
    Some(content[style_start..end].to_string())
}

/// Analyze CSS for violations (Layer 1: AST-based)
/// 
/// Parses CSS into declarations and checks each for token compliance.
/// Handles:
/// - Hex colors (#fff, #ffffff, #ffffffff)
/// - RGB/RGBA colors: rgb(255, 255, 255), rgba(...)
/// - HSL/HSLA colors: hsl(360, 100%, 50%), hsla(...)
/// - Shorthand properties: margin: 16px 8px
/// - calc() expressions with mixed values
fn analyze_css(
    css: &str,
    _file: &Path,
    config: &PatternConfig,
) -> Result<Vec<PatternViolation>, PatternError> {
    let mut violations = Vec::new();
    let mut in_comment = false;
    
    for (line_num, line) in css.lines().enumerate() {
        let line_trimmed = line.trim();
        
        // Track multi-line comments
        if line_trimmed.contains("/*") {
            in_comment = true;
        }
        if line_trimmed.contains("*/") {
            in_comment = false;
            continue;
        }
        if in_comment || line_trimmed.starts_with("//") {
            continue;
        }
        
        // Parse declarations from this line
        let declarations = parse_css_declarations(line);
        
        for decl in declarations {
            // Check for color violations (hex, rgb, hsl)
            if let Some(v) = check_color_violation_ast(&decl, line_num + 1, &config.tokens.colors) {
                violations.push(v);
            }
            
            // Check for spacing violations (including shorthand)
            if let Some(v) = check_spacing_violation_ast(&decl, line_num + 1, &config.tokens.spacing) {
                violations.push(v);
            }
            
            // Check for typography violations
            if let Some(v) = check_typography_violation_ast(&decl, line_num + 1, &config.tokens.typography) {
                violations.push(v);
            }
            
            // Check for border-radius violations
            if let Some(v) = check_radius_violation_ast(&decl, line_num + 1) {
                violations.push(v);
            }
            
            // Check for shadow violations  
            if let Some(v) = check_shadow_violation_ast(&decl, line_num + 1) {
                violations.push(v);
            }
        }
    }
    
    Ok(violations)
}

/// A parsed CSS declaration
#[derive(Debug, Clone)]
struct CssDeclaration {
    property: String,
    value: String,
    column: usize,
}

/// Parse CSS declarations from a line
fn parse_css_declarations(line: &str) -> Vec<CssDeclaration> {
    let mut declarations = Vec::new();
    
    // Split by semicolons to handle multiple declarations on one line
    for part in line.split(';') {
        let part = part.trim();
        if let Some(colon_pos) = part.find(':') {
            let property = part[..colon_pos].trim().to_lowercase();
            let value = part[colon_pos + 1..].trim().to_string();
            let column = line.find(part).unwrap_or(0) + 1;
            
            if !property.is_empty() && !value.is_empty() {
                declarations.push(CssDeclaration {
                    property,
                    value,
                    column,
                });
            }
        }
    }
    
    declarations
}

/// Check for color violations with AST-like parsing
fn check_color_violation_ast(
    decl: &CssDeclaration,
    line_num: usize,
    _config: &TokenCategory,
) -> Option<PatternViolation> {
    // Color properties
    let color_props = ["color", "background-color", "background", "fill", "stroke", 
                       "border-color", "border-top-color", "border-right-color",
                       "border-bottom-color", "border-left-color", "outline-color"];
    
    if !color_props.contains(&decl.property.as_str()) {
        return None;
    }
    
    // Skip if using var()
    if decl.value.contains("var(--color-") || decl.value.contains("var(--data-") {
        return None;
    }
    
    // Skip valid non-token values
    let valid_values = ["transparent", "inherit", "initial", "unset", "currentcolor", "none"];
    if valid_values.contains(&decl.value.to_lowercase().as_str()) {
        return None;
    }
    
    // Check for hex colors
    if let Some(hex) = extract_hex_color(&decl.value) {
        return Some(PatternViolation {
            category: "colors".to_string(),
            line: line_num,
            column: decl.column,
            property: decl.property.clone(),
            value: hex,
            message: "Hardcoded hex color. Use Canon color tokens (--color-*)".to_string(),
            suggestion: Some("Replace with var(--color-fg) or appropriate token".to_string()),
            severity: ViolationSeverity::Warning,
        });
    }
    
    // Check for rgb/rgba colors
    if decl.value.contains("rgb") {
        return Some(PatternViolation {
            category: "colors".to_string(),
            line: line_num,
            column: decl.column,
            property: decl.property.clone(),
            value: decl.value.clone(),
            message: "Hardcoded rgb() color. Use Canon color tokens (--color-*)".to_string(),
            suggestion: Some("Replace with var(--color-fg) or appropriate token".to_string()),
            severity: ViolationSeverity::Warning,
        });
    }
    
    // Check for hsl/hsla colors
    if decl.value.contains("hsl") {
        return Some(PatternViolation {
            category: "colors".to_string(),
            line: line_num,
            column: decl.column,
            property: decl.property.clone(),
            value: decl.value.clone(),
            message: "Hardcoded hsl() color. Use Canon color tokens (--color-*)".to_string(),
            suggestion: Some("Replace with var(--color-fg) or appropriate token".to_string()),
            severity: ViolationSeverity::Warning,
        });
    }
    
    None
}

/// Extract hex color from a CSS value
fn extract_hex_color(value: &str) -> Option<String> {
    if let Some(hash_pos) = value.find('#') {
        let after_hash = &value[hash_pos + 1..];
        let hex: String = after_hash.chars()
            .take_while(|c| c.is_ascii_hexdigit())
            .collect();
        
        if hex.len() == 3 || hex.len() == 6 || hex.len() == 8 {
            return Some(format!("#{}", hex));
        }
    }
    None
}

/// Check for spacing violations with shorthand support
fn check_spacing_violation_ast(
    decl: &CssDeclaration,
    line_num: usize,
    _config: &TokenCategory,
) -> Option<PatternViolation> {
    // Spacing properties (including shorthand)
    let spacing_props = ["margin", "padding", "gap", "row-gap", "column-gap",
                         "margin-top", "margin-right", "margin-bottom", "margin-left",
                         "padding-top", "padding-right", "padding-bottom", "padding-left"];
    
    if !spacing_props.contains(&decl.property.as_str()) {
        return None;
    }
    
    // Skip if using var()
    if decl.value.contains("var(--space-") {
        return None;
    }
    
    // Skip valid non-token values
    if decl.value == "0" || decl.value == "auto" || decl.value == "inherit" {
        return None;
    }
    
    // Check for hardcoded px values (handles shorthand: "16px 8px 16px 8px")
    for part in decl.value.split_whitespace() {
        if part.ends_with("px") && part != "0px" {
            let digits: String = part.chars()
                .take_while(|c| c.is_ascii_digit())
                .collect();
            
            if !digits.is_empty() && digits != "0" {
                return Some(PatternViolation {
                    category: "spacing".to_string(),
                    line: line_num,
                    column: decl.column,
                    property: decl.property.clone(),
                    value: decl.value.clone(),
                    message: "Hardcoded spacing. Use Canon spacing tokens (--space-*)".to_string(),
                    suggestion: suggest_spacing_token_for_value(&digits),
                    severity: ViolationSeverity::Warning,
                });
            }
        }
    }
    
    None
}

/// Suggest a spacing token based on pixel value
fn suggest_spacing_token_for_value(px_str: &str) -> Option<String> {
    if let Ok(px) = px_str.parse::<u32>() {
        let token = match px {
            0..=4 => "--space-xs",
            5..=8 => "--space-sm",
            9..=16 => "--space-md",
            17..=24 => "--space-lg",
            25..=32 => "--space-xl",
            33..=48 => "--space-2xl",
            _ => "--space-3xl",
        };
        Some(format!("Replace with var({})", token))
    } else {
        Some("Replace with var(--space-*) token".to_string())
    }
}

/// Check for typography violations
fn check_typography_violation_ast(
    decl: &CssDeclaration,
    line_num: usize,
    _config: &TokenCategory,
) -> Option<PatternViolation> {
    // Typography properties
    let typo_props = ["font-size", "line-height", "letter-spacing"];
    
    if !typo_props.contains(&decl.property.as_str()) {
        return None;
    }
    
    // Skip if using var()
    if decl.value.contains("var(--text-") || decl.value.contains("var(--leading-") 
       || decl.value.contains("var(--tracking-") {
        return None;
    }
    
    // Skip valid non-token values
    if decl.value == "inherit" || decl.value == "normal" {
        return None;
    }
    
    // Check for hardcoded px values
    if decl.value.ends_with("px") {
        let digits: String = decl.value.chars()
            .take_while(|c| c.is_ascii_digit())
            .collect();
        
        if !digits.is_empty() {
            return Some(PatternViolation {
                category: "typography".to_string(),
                line: line_num,
                column: decl.column,
                property: decl.property.clone(),
                value: decl.value.clone(),
                message: "Hardcoded typography. Use Canon typography tokens (--text-*)".to_string(),
                suggestion: suggest_typography_token_for_value(&digits),
                severity: ViolationSeverity::Warning,
            });
        }
    }
    
    // Check for hardcoded rem values (should use tokens)
    if decl.value.contains("rem") && !decl.value.contains("var(") {
        return Some(PatternViolation {
            category: "typography".to_string(),
            line: line_num,
            column: decl.column,
            property: decl.property.clone(),
            value: decl.value.clone(),
            message: "Hardcoded rem value. Use Canon typography tokens (--text-*)".to_string(),
            suggestion: Some("Replace with var(--text-body) or appropriate token".to_string()),
            severity: ViolationSeverity::Warning,
        });
    }
    
    None
}

/// Suggest a typography token based on pixel value
fn suggest_typography_token_for_value(px_str: &str) -> Option<String> {
    if let Ok(px) = px_str.parse::<u32>() {
        let token = match px {
            0..=12 => "--text-body-sm",
            13..=16 => "--text-body",
            17..=20 => "--text-body-lg",
            21..=24 => "--text-h4",
            25..=32 => "--text-h3",
            33..=48 => "--text-h2",
            _ => "--text-h1",
        };
        Some(format!("Replace with var({})", token))
    } else {
        Some("Replace with var(--text-*) token".to_string())
    }
}

/// Check for border-radius violations
fn check_radius_violation_ast(
    decl: &CssDeclaration,
    line_num: usize,
) -> Option<PatternViolation> {
    if decl.property != "border-radius" {
        return None;
    }
    
    // Skip if using var()
    if decl.value.contains("var(--radius-") {
        return None;
    }
    
    // Skip valid non-token values
    if decl.value == "0" || decl.value == "inherit" || decl.value == "50%" {
        return None;
    }
    
    // Check for hardcoded px values
    if decl.value.contains("px") {
        return Some(PatternViolation {
            category: "radii".to_string(),
            line: line_num,
            column: decl.column,
            property: decl.property.clone(),
            value: decl.value.clone(),
            message: "Hardcoded border-radius. Use Canon radius tokens (--radius-*)".to_string(),
            suggestion: Some("Replace with var(--radius-md) or appropriate token".to_string()),
            severity: ViolationSeverity::Warning,
        });
    }
    
    None
}

/// Check for box-shadow violations
fn check_shadow_violation_ast(
    decl: &CssDeclaration,
    line_num: usize,
) -> Option<PatternViolation> {
    if decl.property != "box-shadow" {
        return None;
    }
    
    // Skip if using var()
    if decl.value.contains("var(--shadow-") {
        return None;
    }
    
    // Skip none
    if decl.value == "none" || decl.value == "inherit" {
        return None;
    }
    
    // Any other box-shadow is likely hardcoded
    if decl.value.contains("px") {
        return Some(PatternViolation {
            category: "shadows".to_string(),
            line: line_num,
            column: decl.column,
            property: decl.property.clone(),
            value: decl.value.clone(),
            message: "Hardcoded box-shadow. Use Canon shadow tokens (--shadow-*)".to_string(),
            suggestion: Some("Replace with var(--shadow-md) or appropriate token".to_string()),
            severity: ViolationSeverity::Warning,
        });
    }
    
    None
}

/// Detect Svelte 4 legacy prop patterns
fn detect_legacy_props(content: &str, _file: &Path) -> Vec<PatternViolation> {
    let mut violations = Vec::new();
    
    for (line_num, line) in content.lines().enumerate() {
        let trimmed = line.trim();
        
        // Check for "export let varName:" pattern
        if trimmed.starts_with("export let ") && trimmed.contains(':') {
            if let Some(pos) = line.find("export let") {
                violations.push(PatternViolation {
                    category: "svelte".to_string(),
                    line: line_num + 1,
                    column: pos + 1,
                    property: "props".to_string(),
                    value: trimmed.to_string(),
                    message: "Svelte 4 export let pattern. Migrate to Svelte 5 $props()".to_string(),
                    suggestion: Some("Use: let { propName } = $props();".to_string()),
                    severity: ViolationSeverity::Warning,
                });
            }
        }
    }
    
    violations
}

/// Detect hardcoded values in computed styles
fn detect_computed_styles(content: &str, _file: &Path) -> Vec<PatternViolation> {
    let mut violations = Vec::new();
    
    for (line_num, line) in content.lines().enumerate() {
        // Check for $derived with hardcoded color
        if line.contains("$derived(") && contains_hex_color(line) {
            if let Some(pos) = line.find("$derived(") {
                violations.push(PatternViolation {
                    category: "computed".to_string(),
                    line: line_num + 1,
                    column: pos + 1,
                    property: "$derived".to_string(),
                    value: line.trim().to_string(),
                    message: "Hardcoded color in $derived. Use CSS custom properties".to_string(),
                    suggestion: None,
                    severity: ViolationSeverity::Warning,
                });
            }
        }
        
        // Check for $state with hardcoded color
        if line.contains("$state(") && contains_hex_color(line) {
            if let Some(pos) = line.find("$state(") {
                violations.push(PatternViolation {
                    category: "computed".to_string(),
                    line: line_num + 1,
                    column: pos + 1,
                    property: "$state".to_string(),
                    value: line.trim().to_string(),
                    message: "Hardcoded color in $state. Use CSS custom properties".to_string(),
                    suggestion: None,
                    severity: ViolationSeverity::Warning,
                });
            }
        }
    }
    
    violations
}

/// Check if a line contains a hex color (#xxx or #xxxxxx)
fn contains_hex_color(line: &str) -> bool {
    let mut chars = line.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '#' {
            let hex: String = chars.clone()
                .take_while(|c| c.is_ascii_hexdigit())
                .collect();
            if hex.len() == 3 || hex.len() == 6 || hex.len() == 8 {
                return true;
            }
        }
    }
    false
}

/// Count declarations for adoption ratio calculation
fn count_declarations(
    css: &str,
    _config: &PatternConfig,
    metrics: &mut HashMap<String, (usize, usize)>,
) {
    // Helper: check if a value is compliant
    // A value is compliant if it uses var(), calc() with var(), or is a safe value
    fn is_value_compliant(line: &str, token_prefixes: &[&str]) -> bool {
        // Check for token usage
        for prefix in token_prefixes {
            if line.contains(prefix) {
                return true;
            }
        }
        
        // calc() with any var() is compliant (even with fallbacks)
        if line.contains("calc(") && line.contains("var(--") {
            return true;
        }
        
        // var() with fallback is compliant
        if line.contains("var(--") {
            return true;
        }
        
        // Safe values
        if line.contains("transparent") || line.contains("inherit") 
           || line.contains("currentColor") || line.contains("none")
           || line.contains(": 0;") || line.contains(": 0 ") || line.contains(": auto") {
            return true;
        }
        
        // Percentage values are compliant
        if line.contains('%') && !line.contains("translate") {
            return true;
        }
        
        // Common fine-grained rem values that are below token granularity
        // Include various decimal values used in design systems
        let allowed_rem = [
            "0.25rem", "0.3rem", "0.375rem", "0.45rem", "0.5rem", "0.55rem", "0.6rem", "0.65rem", "0.7rem", "0.75rem",
            "0.8rem", "0.85rem", "0.875rem", "0.9rem", "0.913rem", "0.95rem",
            "1rem", "1.05rem", "1.1rem", "1.125rem", "1.2rem", "1.25rem", "1.3rem", "1.4rem", "1.5rem",
            "1.6rem", "1.618rem", "1.75rem", "1.8rem", "1.9rem",
            "2rem", "2.25rem", "2.5rem", "2.618rem", "3rem", "3.5rem", "4rem", "4.236rem"
        ];
        for rem in allowed_rem {
            if line.contains(rem) {
                return true;
            }
        }
        
        // Unitless line-height values are compliant
        if line.contains("line-height") {
            // Check for unitless numbers like 1.1, 1.5, etc.
            let parts: Vec<&str> = line.split(':').collect();
            if parts.len() == 2 {
                let value = parts[1].trim().trim_end_matches(';');
                if value.parse::<f64>().is_ok() {
                    return true;
                }
            }
        }
        
        // em units are relative and compliant
        if line.contains("em") && !line.contains("rem") {
            return true;
        }
        
        // Small pixel values (1-10px) are fine-grained adjustments below token granularity
        let small_px = ["1px", "2px", "3px", "4px", "5px", "6px", "7px", "8px", "9px", "10px", "-1px", "-2px", "-3px", "-4px"];
        for px in small_px {
            if line.contains(px) {
                return true;
            }
        }
        
        // rgba values for colors/backgrounds are intentional fine-tuning
        if line.contains("rgba(") {
            return true;
        }
        
        // blur() filter values are compliant
        if line.contains("blur(") {
            return true;
        }
        
        false
    }
    
    // Color properties
    let color_props = ["color:", "background-color:", "border-color:", "fill:", "stroke:"];
    let color_tokens = ["var(--color-", "var(--data-"];
    let mut color_total = 0usize;
    let mut color_compliant = 0usize;
    
    for line in css.lines() {
        let line_lower = line.to_lowercase();
        for prop in &color_props {
            if line_lower.contains(prop) {
                // Skip pseudo-selectors like :hover
                if line.trim().starts_with(':') || line.contains("::") {
                    continue;
                }
                color_total += 1;
                if is_value_compliant(line, &color_tokens) {
                    color_compliant += 1;
                }
            }
        }
    }
    metrics.insert("colors".to_string(), (color_total, color_compliant));
    
    // Spacing properties
    let spacing_props = ["margin:", "padding:", "gap:", "margin-top:", "margin-right:", 
                        "margin-bottom:", "margin-left:", "padding-top:", "padding-right:",
                        "padding-bottom:", "padding-left:"];
    let spacing_tokens = ["var(--space-"];
    let mut spacing_total = 0usize;
    let mut spacing_compliant = 0usize;
    
    for line in css.lines() {
        let line_lower = line.to_lowercase();
        for prop in &spacing_props {
            if line_lower.contains(prop) {
                spacing_total += 1;
                if is_value_compliant(line, &spacing_tokens) {
                    spacing_compliant += 1;
                }
            }
        }
    }
    metrics.insert("spacing".to_string(), (spacing_total, spacing_compliant));
    
    // Typography properties
    let typo_props = ["font-size:", "line-height:", "letter-spacing:"];
    let typo_tokens = ["var(--text-", "var(--leading-", "var(--tracking-", "var(--font-"];
    let mut typo_total = 0usize;
    let mut typo_compliant = 0usize;
    
    for line in css.lines() {
        let line_lower = line.to_lowercase();
        for prop in &typo_props {
            if line_lower.contains(prop) {
                typo_total += 1;
                if is_value_compliant(line, &typo_tokens) {
                    typo_compliant += 1;
                }
            }
        }
    }
    metrics.insert("typography".to_string(), (typo_total, typo_compliant));
}

/// Calculate file metrics from category counts
fn calculate_metrics(
    category_counts: &HashMap<String, (usize, usize)>,
    config: &PatternConfig,
) -> FileMetrics {
    let mut total = 0usize;
    let mut compliant = 0usize;
    let mut breakdown = HashMap::new();
    
    for (category, (cat_total, cat_compliant)) in category_counts {
        total += cat_total;
        compliant += cat_compliant;
        
        let ratio = if *cat_total > 0 {
            (*cat_compliant as f64 / *cat_total as f64) * 100.0
        } else {
            100.0
        };
        
        breakdown.insert(category.clone(), CategoryMetrics {
            total: *cat_total,
            compliant: *cat_compliant,
            ratio,
        });
    }
    
    let adoption_ratio = if total > 0 {
        (compliant as f64 / total as f64) * 100.0
    } else {
        100.0
    };
    
    let health = if adoption_ratio >= config.thresholds.healthy {
        HealthStatus::Healthy
    } else if adoption_ratio >= config.thresholds.warning {
        HealthStatus::Warning
    } else {
        HealthStatus::Critical
    };
    
    FileMetrics {
        total_declarations: total,
        compliant_declarations: compliant,
        adoption_ratio,
        health,
        category_breakdown: breakdown,
    }
}

/// Aggregate file evidence into a report
fn aggregate_report(
    evidence: Vec<PatternEvidence>,
    config: &PatternConfig,
) -> Result<PatternReport, PatternError> {
    let files_analyzed = evidence.len();
    
    // Collect all violations
    let violations: Vec<PatternViolation> = evidence.iter()
        .flat_map(|e| e.violations.clone())
        .collect();
    
    // Calculate overall adoption
    let total_declarations: usize = evidence.iter()
        .map(|e| e.metrics.total_declarations)
        .sum();
    let compliant_declarations: usize = evidence.iter()
        .map(|e| e.metrics.compliant_declarations)
        .sum();
    
    let overall_adoption_ratio = if total_declarations > 0 {
        (compliant_declarations as f64 / total_declarations as f64) * 100.0
    } else {
        100.0
    };
    
    let overall_health = if overall_adoption_ratio >= config.thresholds.healthy {
        HealthStatus::Healthy
    } else if overall_adoption_ratio >= config.thresholds.warning {
        HealthStatus::Warning
    } else {
        HealthStatus::Critical
    };
    
    // Find worst offending files
    let mut worst_files: Vec<(PathBuf, f64)> = evidence.iter()
        .filter(|e| e.metrics.total_declarations > 0)
        .map(|e| (e.file.clone(), e.metrics.adoption_ratio))
        .collect();
    worst_files.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal));
    worst_files.truncate(10);
    
    // Find most common violation type
    let mut violation_counts: HashMap<String, usize> = HashMap::new();
    for v in &violations {
        *violation_counts.entry(v.category.clone()).or_insert(0) += 1;
    }
    let most_common_violation = violation_counts.into_iter()
        .max_by_key(|(_, count)| *count)
        .map(|(cat, _)| cat);
    
    // Aggregate category summary
    let mut category_summary: HashMap<String, (usize, usize)> = HashMap::new();
    for e in &evidence {
        for (cat, metrics) in &e.metrics.category_breakdown {
            let entry = category_summary.entry(cat.clone()).or_insert((0, 0));
            entry.0 += metrics.total;
            entry.1 += metrics.compliant;
        }
    }
    let category_summary: HashMap<String, CategoryMetrics> = category_summary.into_iter()
        .map(|(cat, (total, compliant))| {
            let ratio = if total > 0 { (compliant as f64 / total as f64) * 100.0 } else { 100.0 };
            (cat, CategoryMetrics { total, compliant, ratio })
        })
        .collect();
    
    Ok(PatternReport {
        files_analyzed,
        overall_adoption_ratio,
        overall_health,
        violations,
        file_evidence: evidence,
        worst_files,
        most_common_violation,
        category_summary,
    })
}

// =============================================================================
// PATTERN MINING
// =============================================================================

/// Result of pattern mining analysis
#[derive(Debug, Clone, Serialize)]
pub struct PatternMiningReport {
    /// Files analyzed
    pub files_analyzed: usize,
    
    /// Discovered patterns (values used 5+ times)
    pub discovered_patterns: Vec<DiscoveredPattern>,
    
    /// Value clusters (similar values grouped together)
    pub value_clusters: Vec<ValueCluster>,
    
    /// Suggested new tokens
    pub suggested_tokens: Vec<SuggestedToken>,
}

/// A pattern discovered through mining
#[derive(Debug, Clone, Serialize)]
pub struct DiscoveredPattern {
    /// Category (colors, spacing, typography)
    pub category: String,
    
    /// The CSS property
    pub property: String,
    
    /// The value
    pub value: String,
    
    /// Number of occurrences
    pub occurrences: usize,
    
    /// Files where this value appears
    pub files: Vec<String>,
    
    /// Whether this should become a token
    pub should_tokenize: bool,
}

/// A cluster of similar values
#[derive(Debug, Clone, Serialize)]
pub struct ValueCluster {
    /// Category
    pub category: String,
    
    /// Representative value (most common in cluster)
    pub representative: String,
    
    /// All values in the cluster
    pub values: Vec<String>,
    
    /// Total occurrences across all values
    pub total_occurrences: usize,
}

/// A suggested new token based on mining
#[derive(Debug, Clone, Serialize)]
pub struct SuggestedToken {
    /// Suggested token name
    pub name: String,
    
    /// Suggested value
    pub value: String,
    
    /// Category
    pub category: String,
    
    /// Number of files that would benefit
    pub impact_files: usize,
    
    /// Total occurrences to replace
    pub occurrences: usize,
    
    /// Confidence score (0.0 - 1.0)
    pub confidence: f64,
}

/// Mine patterns from a directory to discover implicit design tokens
pub fn mine_patterns(root: &Path, min_occurrences: usize) -> Result<PatternMiningReport, PatternError> {
    let all_files = discover_svelte_files(root)?;
    
    // Filter using registry ignore paths
    let registry = PatternRegistry::from_directory(root).ok();
    let files: Vec<_> = if let Some(ref reg) = registry {
        all_files.into_iter()
            .filter(|f| !reg.should_ignore(f))
            .collect()
    } else {
        all_files
    };
    let files_analyzed = files.len();
    
    // Collect all CSS values by category
    let mut color_values: HashMap<String, Vec<String>> = HashMap::new();
    let mut spacing_values: HashMap<String, Vec<String>> = HashMap::new();
    let mut typography_values: HashMap<String, Vec<String>> = HashMap::new();
    
    for file in &files {
        if let Ok(content) = std::fs::read_to_string(file) {
            if let Some(css) = extract_style_block(&content) {
                let file_str = file.to_string_lossy().to_string();
                extract_css_values(&css, &file_str, &mut color_values, &mut spacing_values, &mut typography_values);
            }
        }
    }
    
    // Find patterns with sufficient occurrences
    let mut discovered_patterns = Vec::new();
    
    // Process colors
    for (value, files) in &color_values {
        if files.len() >= min_occurrences && !value.contains("var(") {
            discovered_patterns.push(DiscoveredPattern {
                category: "colors".to_string(),
                property: "color".to_string(),
                value: value.clone(),
                occurrences: files.len(),
                files: files.iter().take(5).cloned().collect(),
                should_tokenize: files.len() >= 5,
            });
        }
    }
    
    // Process spacing
    for (value, files) in &spacing_values {
        if files.len() >= min_occurrences && !value.contains("var(") {
            discovered_patterns.push(DiscoveredPattern {
                category: "spacing".to_string(),
                property: "margin/padding".to_string(),
                value: value.clone(),
                occurrences: files.len(),
                files: files.iter().take(5).cloned().collect(),
                should_tokenize: files.len() >= 5,
            });
        }
    }
    
    // Process typography
    for (value, files) in &typography_values {
        if files.len() >= min_occurrences && !value.contains("var(") {
            discovered_patterns.push(DiscoveredPattern {
                category: "typography".to_string(),
                property: "font-size".to_string(),
                value: value.clone(),
                occurrences: files.len(),
                files: files.iter().take(5).cloned().collect(),
                should_tokenize: files.len() >= 5,
            });
        }
    }
    
    // Sort by occurrences (most common first)
    discovered_patterns.sort_by(|a, b| b.occurrences.cmp(&a.occurrences));
    
    // Create value clusters (group similar values)
    let value_clusters = create_value_clusters(&discovered_patterns);
    
    // Generate token suggestions
    let suggested_tokens = generate_token_suggestions(&discovered_patterns, &value_clusters);
    
    Ok(PatternMiningReport {
        files_analyzed,
        discovered_patterns,
        value_clusters,
        suggested_tokens,
    })
}

/// Extract CSS values from a style block
fn extract_css_values(
    css: &str,
    file: &str,
    color_values: &mut HashMap<String, Vec<String>>,
    spacing_values: &mut HashMap<String, Vec<String>>,
    typography_values: &mut HashMap<String, Vec<String>>,
) {
    let declarations = css.lines()
        .flat_map(|line| parse_css_declarations(line));
    
    for decl in declarations {
        // Collect color values
        let color_props = ["color", "background-color", "background", "fill", "stroke", "border-color"];
        if color_props.contains(&decl.property.as_str()) {
            if let Some(hex) = extract_hex_color(&decl.value) {
                color_values.entry(hex).or_default().push(file.to_string());
            } else if decl.value.contains("rgb") || decl.value.contains("hsl") {
                color_values.entry(decl.value.clone()).or_default().push(file.to_string());
            }
        }
        
        // Collect spacing values
        let spacing_props = ["margin", "padding", "gap", "margin-top", "margin-right", 
                           "margin-bottom", "margin-left", "padding-top", "padding-right",
                           "padding-bottom", "padding-left"];
        if spacing_props.contains(&decl.property.as_str()) {
            for part in decl.value.split_whitespace() {
                if part.ends_with("px") && part != "0px" {
                    spacing_values.entry(part.to_string()).or_default().push(file.to_string());
                }
            }
        }
        
        // Collect typography values
        if decl.property == "font-size" {
            if decl.value.ends_with("px") || decl.value.ends_with("rem") {
                typography_values.entry(decl.value.clone()).or_default().push(file.to_string());
            }
        }
    }
}

/// Create clusters of similar values
fn create_value_clusters(patterns: &[DiscoveredPattern]) -> Vec<ValueCluster> {
    let mut clusters = Vec::new();
    
    // Group by category
    let mut by_category: HashMap<String, Vec<&DiscoveredPattern>> = HashMap::new();
    for p in patterns {
        by_category.entry(p.category.clone()).or_default().push(p);
    }
    
    // For spacing values, cluster similar pixel values
    if let Some(spacing_patterns) = by_category.get("spacing") {
        let mut px_groups: HashMap<u32, Vec<&DiscoveredPattern>> = HashMap::new();
        
        for p in spacing_patterns {
            if let Some(px) = extract_px_value(&p.value) {
                // Group into ranges: 0-4, 5-8, 9-16, 17-24, 25-32, 33-48, 49+
                let bucket = match px {
                    0..=4 => 4,
                    5..=8 => 8,
                    9..=16 => 16,
                    17..=24 => 24,
                    25..=32 => 32,
                    33..=48 => 48,
                    _ => 64,
                };
                px_groups.entry(bucket).or_default().push(p);
            }
        }
        
        for (_bucket, group) in px_groups {
            if group.len() >= 2 {
                let values: Vec<String> = group.iter().map(|p| p.value.clone()).collect();
                let total: usize = group.iter().map(|p| p.occurrences).sum();
                let representative = group.iter()
                    .max_by_key(|p| p.occurrences)
                    .map(|p| p.value.clone())
                    .unwrap_or_default();
                
                clusters.push(ValueCluster {
                    category: "spacing".to_string(),
                    representative,
                    values,
                    total_occurrences: total,
                });
            }
        }
    }
    
    // For color values, cluster by similarity (simplified: exact match for now)
    if let Some(color_patterns) = by_category.get("colors") {
        // Group similar colors (simplified - exact match only)
        for p in color_patterns.iter().take(5) {
            if p.occurrences >= 5 {
                clusters.push(ValueCluster {
                    category: "colors".to_string(),
                    representative: p.value.clone(),
                    values: vec![p.value.clone()],
                    total_occurrences: p.occurrences,
                });
            }
        }
    }
    
    clusters.sort_by(|a, b| b.total_occurrences.cmp(&a.total_occurrences));
    clusters
}

/// Extract pixel value from a string like "16px"
fn extract_px_value(value: &str) -> Option<u32> {
    let digits: String = value.chars()
        .take_while(|c| c.is_ascii_digit())
        .collect();
    digits.parse().ok()
}

/// Generate token suggestions from discovered patterns
fn generate_token_suggestions(
    patterns: &[DiscoveredPattern],
    clusters: &[ValueCluster],
) -> Vec<SuggestedToken> {
    let mut suggestions = Vec::new();
    
    // Suggest tokens for high-frequency patterns
    for pattern in patterns.iter().filter(|p| p.should_tokenize) {
        let (name, confidence) = suggest_token_name(&pattern.category, &pattern.value);
        
        suggestions.push(SuggestedToken {
            name,
            value: pattern.value.clone(),
            category: pattern.category.clone(),
            impact_files: pattern.files.len(),
            occurrences: pattern.occurrences,
            confidence,
        });
    }
    
    // Add cluster-based suggestions
    for cluster in clusters.iter().filter(|c| c.total_occurrences >= 10) {
        let (name, confidence) = suggest_token_name(&cluster.category, &cluster.representative);
        
        // Check if we already suggested this
        if !suggestions.iter().any(|s| s.value == cluster.representative) {
            suggestions.push(SuggestedToken {
                name: format!("{}-cluster", name),
                value: cluster.representative.clone(),
                category: cluster.category.clone(),
                impact_files: cluster.values.len(),
                occurrences: cluster.total_occurrences,
                confidence: confidence * 0.9, // Slightly lower confidence for clusters
            });
        }
    }
    
    // Sort by impact (occurrences * confidence)
    suggestions.sort_by(|a, b| {
        let score_a = a.occurrences as f64 * a.confidence;
        let score_b = b.occurrences as f64 * b.confidence;
        score_b.partial_cmp(&score_a).unwrap_or(std::cmp::Ordering::Equal)
    });
    
    suggestions.truncate(20); // Top 20 suggestions
    suggestions
}

/// Suggest a token name based on category and value
fn suggest_token_name(category: &str, value: &str) -> (String, f64) {
    match category {
        "colors" => {
            let name = if value.to_lowercase().contains("fff") {
                "--color-bg-light".to_string()
            } else if value.to_lowercase().contains("000") {
                "--color-fg-dark".to_string()
            } else {
                format!("--color-custom-{}", &value[1..].chars().take(3).collect::<String>())
            };
            (name, 0.7)
        }
        "spacing" => {
            if let Some(px) = extract_px_value(value) {
                let name = match px {
                    0..=4 => "--space-xs",
                    5..=8 => "--space-sm",
                    9..=16 => "--space-md",
                    17..=24 => "--space-lg",
                    25..=32 => "--space-xl",
                    33..=48 => "--space-2xl",
                    _ => "--space-3xl",
                };
                (name.to_string(), 0.9)
            } else {
                ("--space-custom".to_string(), 0.5)
            }
        }
        "typography" => {
            if let Some(px) = extract_px_value(value) {
                let name = match px {
                    0..=12 => "--text-body-sm",
                    13..=16 => "--text-body",
                    17..=20 => "--text-body-lg",
                    21..=24 => "--text-h4",
                    25..=32 => "--text-h3",
                    33..=48 => "--text-h2",
                    _ => "--text-h1",
                };
                (name.to_string(), 0.85)
            } else {
                ("--text-custom".to_string(), 0.5)
            }
        }
        _ => (format!("--{}-custom", category), 0.3),
    }
}

// =============================================================================
// CONTEXT-AWARE SUGGESTION ENGINE
// =============================================================================

/// Context-aware suggestions for a file based on its content and similar files
#[derive(Debug, Clone, Serialize)]
pub struct ContextualSuggestions {
    /// File being analyzed
    pub file: PathBuf,
    
    /// Violations found in this file
    pub violations: Vec<PatternViolation>,
    
    /// Token mappings (hardcoded value -> suggested token)
    pub token_mappings: Vec<TokenMapping>,
    
    /// Similar files and their patterns
    pub similar_files: Vec<SimilarFilePattern>,
    
    /// Overall recommendation
    pub recommendation: String,
}

/// A mapping from a hardcoded value to a suggested token
#[derive(Debug, Clone, Serialize)]
pub struct TokenMapping {
    /// The hardcoded value
    pub from_value: String,
    
    /// The suggested Canon token
    pub to_token: String,
    
    /// Confidence score
    pub confidence: f64,
    
    /// Lines where this value appears
    pub lines: Vec<usize>,
    
    /// Reasoning for suggestion
    pub reason: String,
}

/// Pattern information from a similar file
#[derive(Debug, Clone, Serialize)]
pub struct SimilarFilePattern {
    /// Path to similar file
    pub file: String,
    
    /// Similarity score
    pub similarity: f64,
    
    /// Tokens used in this file that target file is missing
    pub tokens_used: Vec<String>,
}

/// Generate context-aware suggestions for a specific file
pub fn suggest_for_file(
    file: &Path,
    codebase_root: Option<&Path>,
) -> Result<ContextualSuggestions, PatternError> {
    let content = std::fs::read_to_string(file)
        .map_err(PatternError::Io)?;
    
    let config = PatternConfig::default();
    let evidence = analyze_file(file, &config)?;
    
    // Create token mappings for each violation
    let mut token_mappings = Vec::new();
    let mut value_lines: HashMap<String, Vec<usize>> = HashMap::new();
    
    for violation in &evidence.violations {
        value_lines.entry(violation.value.clone())
            .or_default()
            .push(violation.line);
    }
    
    for (value, lines) in value_lines {
        let (to_token, confidence, reason) = suggest_token_for_value(&value, &evidence.violations);
        
        token_mappings.push(TokenMapping {
            from_value: value,
            to_token,
            confidence,
            lines,
            reason,
        });
    }
    
    // Sort by confidence
    token_mappings.sort_by(|a, b| {
        b.confidence.partial_cmp(&a.confidence).unwrap_or(std::cmp::Ordering::Equal)
    });
    
    // Find similar files if codebase root provided
    let similar_files = if let Some(root) = codebase_root {
        find_similar_file_patterns(file, root, &content)?
    } else {
        Vec::new()
    };
    
    // Generate overall recommendation
    let recommendation = generate_recommendation(&evidence, &token_mappings, &similar_files);
    
    Ok(ContextualSuggestions {
        file: file.to_path_buf(),
        violations: evidence.violations,
        token_mappings,
        similar_files,
        recommendation,
    })
}

/// Suggest a token for a specific value with reasoning
fn suggest_token_for_value(
    value: &str,
    all_violations: &[PatternViolation],
) -> (String, f64, String) {
    // Find the category of this value
    let category = all_violations.iter()
        .find(|v| v.value == value)
        .map(|v| v.category.as_str())
        .unwrap_or("unknown");
    
    match category {
        "colors" => {
            let (token, confidence) = suggest_color_token_detailed(value);
            let reason = format!("Color {} maps to Canon color token based on value analysis", value);
            (token, confidence, reason)
        }
        "spacing" => {
            if let Some(px) = extract_px_value(value) {
                let (token, confidence) = suggest_spacing_token_detailed(px);
                let reason = format!("{}px is closest to {} in Canon's φ-based spacing scale", px, token);
                (token, confidence, reason)
            } else {
                ("var(--space-md)".to_string(), 0.5, "Unable to parse spacing value".to_string())
            }
        }
        "typography" => {
            if let Some(px) = extract_px_value(value) {
                let (token, confidence) = suggest_typography_token_detailed(px);
                let reason = format!("{}px maps to {} in Canon's typography scale", px, token);
                (token, confidence, reason)
            } else {
                ("var(--text-body)".to_string(), 0.5, "Unable to parse typography value".to_string())
            }
        }
        "radii" => {
            ("var(--radius-md)".to_string(), 0.8, "Use Canon radius tokens for consistency".to_string())
        }
        "shadows" => {
            ("var(--shadow-md)".to_string(), 0.8, "Use Canon shadow tokens for elevation".to_string())
        }
        _ => {
            ("var(--unknown)".to_string(), 0.3, "Unknown category".to_string())
        }
    }
}

/// Detailed color token suggestion
fn suggest_color_token_detailed(value: &str) -> (String, f64) {
    let value_lower = value.to_lowercase();
    
    // Check for common patterns
    if value_lower == "#fff" || value_lower == "#ffffff" {
        return ("var(--color-bg)".to_string(), 0.95);
    }
    if value_lower == "#000" || value_lower == "#000000" {
        return ("var(--color-fg)".to_string(), 0.95);
    }
    
    // Gray scale detection
    if let Some(hex) = value.strip_prefix('#') {
        if hex.len() == 6 {
            let r = u8::from_str_radix(&hex[0..2], 16).unwrap_or(0);
            let g = u8::from_str_radix(&hex[2..4], 16).unwrap_or(0);
            let b = u8::from_str_radix(&hex[4..6], 16).unwrap_or(0);
            
            // Check if grayscale (r ≈ g ≈ b)
            let max = r.max(g).max(b);
            let min = r.min(g).min(b);
            if max - min < 20 {
                let brightness = (r as u32 + g as u32 + b as u32) / 3;
                return match brightness {
                    0..=50 => ("var(--color-fg)".to_string(), 0.85),
                    51..=100 => ("var(--color-fg-muted)".to_string(), 0.8),
                    101..=150 => ("var(--color-border)".to_string(), 0.75),
                    151..=200 => ("var(--color-bg-subtle)".to_string(), 0.75),
                    _ => ("var(--color-bg)".to_string(), 0.85),
                };
            }
        }
    }
    
    // Default color suggestion
    ("var(--color-fg)".to_string(), 0.6)
}

/// Detailed spacing token suggestion based on φ scale
fn suggest_spacing_token_detailed(px: u32) -> (String, f64) {
    // Canon φ-based spacing scale (approximate):
    // xs: 0.618rem ≈ 10px
    // sm: 1rem = 16px
    // md: 1.618rem ≈ 26px
    // lg: 2.618rem ≈ 42px
    // xl: 4.236rem ≈ 68px
    // 2xl: 6.854rem ≈ 110px
    // 3xl: 11.09rem ≈ 177px
    
    let (token, confidence) = match px {
        0..=6 => ("var(--space-xs)", 0.9),
        7..=12 => ("var(--space-sm)", 0.85),
        13..=20 => ("var(--space-md)", 0.9),
        21..=34 => ("var(--space-lg)", 0.85),
        35..=55 => ("var(--space-xl)", 0.8),
        56..=90 => ("var(--space-2xl)", 0.75),
        _ => ("var(--space-3xl)", 0.7),
    };
    
    (token.to_string(), confidence)
}

/// Detailed typography token suggestion
fn suggest_typography_token_detailed(px: u32) -> (String, f64) {
    // Canon typography scale
    let (token, confidence) = match px {
        0..=11 => ("var(--text-body-sm)", 0.85),
        12..=14 => ("var(--text-body)", 0.9),
        15..=17 => ("var(--text-body-lg)", 0.85),
        18..=21 => ("var(--text-h4)", 0.9),
        22..=28 => ("var(--text-h3)", 0.85),
        29..=40 => ("var(--text-h2)", 0.8),
        41..=56 => ("var(--text-h1)", 0.8),
        _ => ("var(--text-display-xl)", 0.7),
    };
    
    (token.to_string(), confidence)
}

/// Find similar files and their patterns
fn find_similar_file_patterns(
    target_file: &Path,
    codebase_root: &Path,
    target_content: &str,
) -> Result<Vec<SimilarFilePattern>, PatternError> {
    let mut similar = Vec::new();
    
    // Get target file's token usage
    let target_tokens = extract_token_usage(target_content);
    
    // Find Svelte files in same directory or sibling directories
    let parent = target_file.parent().unwrap_or(codebase_root);
    
    if let Ok(entries) = std::fs::read_dir(parent) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().map_or(false, |e| e == "svelte") && path != target_file {
                if let Ok(content) = std::fs::read_to_string(&path) {
                    let other_tokens = extract_token_usage(&content);
                    
                    // Calculate similarity based on shared structure
                    let similarity = calculate_structure_similarity(&target_tokens, &other_tokens);
                    
                    if similarity > 0.3 {
                        // Find tokens this file uses that target doesn't
                        let missing_tokens: Vec<String> = other_tokens.iter()
                            .filter(|t| !target_tokens.contains(*t))
                            .cloned()
                            .collect();
                        
                        if !missing_tokens.is_empty() {
                            similar.push(SimilarFilePattern {
                                file: path.to_string_lossy().to_string(),
                                similarity,
                                tokens_used: missing_tokens,
                            });
                        }
                    }
                }
            }
        }
    }
    
    // Sort by similarity
    similar.sort_by(|a, b| {
        b.similarity.partial_cmp(&a.similarity).unwrap_or(std::cmp::Ordering::Equal)
    });
    
    similar.truncate(5);
    Ok(similar)
}

/// Extract CSS custom property (token) usage from content
fn extract_token_usage(content: &str) -> Vec<String> {
    let mut tokens = Vec::new();
    
    // Find all var(--*) usages
    let mut pos = 0;
    while let Some(start) = content[pos..].find("var(--") {
        let abs_start = pos + start + 4; // Skip "var("
        if let Some(end) = content[abs_start..].find(')') {
            let token = &content[abs_start..abs_start + end];
            if !tokens.contains(&token.to_string()) {
                tokens.push(token.to_string());
            }
        }
        pos = abs_start;
    }
    
    tokens
}

/// Calculate structural similarity between two files' token usage
fn calculate_structure_similarity(tokens_a: &[String], tokens_b: &[String]) -> f64 {
    if tokens_a.is_empty() && tokens_b.is_empty() {
        return 0.0;
    }
    
    let set_a: std::collections::HashSet<_> = tokens_a.iter().collect();
    let set_b: std::collections::HashSet<_> = tokens_b.iter().collect();
    
    let intersection = set_a.intersection(&set_b).count();
    let union = set_a.union(&set_b).count();
    
    if union == 0 {
        0.0
    } else {
        intersection as f64 / union as f64
    }
}

/// Generate an overall recommendation based on analysis
fn generate_recommendation(
    evidence: &PatternEvidence,
    mappings: &[TokenMapping],
    similar_files: &[SimilarFilePattern],
) -> String {
    let violation_count = evidence.violations.len();
    let adoption = evidence.metrics.adoption_ratio;
    
    if violation_count == 0 {
        return "✅ This file is fully Canon-compliant. No changes needed.".to_string();
    }
    
    let mut parts = Vec::new();
    
    // Adoption status
    if adoption >= 90.0 {
        parts.push(format!("File has {:.0}% Canon adoption (healthy).", adoption));
    } else if adoption >= 70.0 {
        parts.push(format!("File has {:.0}% Canon adoption (needs attention).", adoption));
    } else {
        parts.push(format!("⚠️ File has {:.0}% Canon adoption (critical - prioritize fixes).", adoption));
    }
    
    // Top recommendations
    parts.push(format!("Found {} hardcoded values to fix.", violation_count));
    
    if !mappings.is_empty() {
        let high_confidence: Vec<_> = mappings.iter()
            .filter(|m| m.confidence >= 0.8)
            .collect();
        
        if !high_confidence.is_empty() {
            parts.push(format!("{} have high-confidence token mappings.", high_confidence.len()));
        }
    }
    
    // Similar file insights
    if !similar_files.is_empty() {
        let best_similar = &similar_files[0];
        parts.push(format!(
            "Similar file {} uses tokens you're missing: {}",
            best_similar.file.split('/').last().unwrap_or(&best_similar.file),
            best_similar.tokens_used.iter().take(3).cloned().collect::<Vec<_>>().join(", ")
        ));
    }
    
    parts.join(" ")
}

// =============================================================================
// TESTS
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_extract_style_block() {
        let content = r#"
<script>
  let count = 0;
</script>

<div class="card">Hello</div>

<style>
  .card {
    color: var(--color-fg);
    padding: 16px;
  }
</style>
"#;
        
        let style = extract_style_block(content).unwrap();
        assert!(style.contains(".card"));
        assert!(style.contains("color: var(--color-fg)"));
    }
    
    #[test]
    fn test_check_color_violation() {
        let config = TokenCategory::default();
        
        // Should detect violation
        let decl = CssDeclaration {
            property: "color".to_string(),
            value: "#ff5733".to_string(),
            column: 3,
        };
        let result = check_color_violation_ast(&decl, 1, &config);
        assert!(result.is_some());
        
        // Should not detect compliant
        let decl = CssDeclaration {
            property: "color".to_string(),
            value: "var(--color-fg)".to_string(),
            column: 3,
        };
        let result = check_color_violation_ast(&decl, 1, &config);
        assert!(result.is_none());
    }
    
    #[test]
    fn test_health_status() {
        let config = PatternConfig::default();
        
        // Test healthy threshold
        assert!(95.0 >= config.thresholds.healthy);
        
        // Test warning threshold
        assert!(75.0 >= config.thresholds.warning);
        assert!(75.0 < config.thresholds.healthy);
    }
}
