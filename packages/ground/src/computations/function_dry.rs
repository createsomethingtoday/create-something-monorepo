//! Function-Level DRY Analysis
//!
//! Extracts individual functions from source files using tree-sitter AST parsing
//! and compares them for duplication. This catches cases where overall file
//! similarity is low but specific functions are duplicated across files.
//!
//! ## Inter-File Detection (Original)
//!
//! File A (beads.ts):
//! ```typescript
//! import { something } from 'lib';
//! 
//! function bd(path: string) {  // <-- This function is duplicated
//!     return exec(`bd ${path}`);
//! }
//!
//! export function processBeads() { /* unique logic */ }
//! ```
//!
//! File B (molecule.ts):
//! ```typescript
//! import { other } from 'lib';
//!
//! function bd(path: string) {  // <-- Same function, different file
//!     return exec(`bd ${path}`);
//! }
//!
//! export function processMolecules() { /* unique logic */ }
//! ```
//!
//! File-level similarity might be ~30%, but bd() is 100% duplicated.
//!
//! ## Intra-File Detection (New)
//!
//! Detects similar functions with DIFFERENT names within the same file.
//! Research shows same-file clones have higher bug propagation risk.
//!
//! ```typescript
//! // file.ts - Ground CAN detect this with detect_intra_file=true
//! function validateEmail(email: string) {
//!     const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//!     return regex.test(email);
//! }
//!
//! function checkEmail(email: string) {  // <-- Same logic, different name
//!     const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//!     return regex.test(email);
//! }
//! ```
//!
//! This supports AI-native/agentic engineering by enabling agents to:
//! - Self-heal duplicative patterns introduced during iterative development
//! - Reduce propagated bugs (same-file clones have ~18% higher bug rate)
//! - Apply the Subtractive Triad: DRY at implementation level

use std::path::{Path, PathBuf};
use std::fs;
use serde::{Serialize, Deserialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use tree_sitter::{Parser, Node};

use super::ComputationError;

/// An extracted function from source code
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractedFunction {
    /// Function name
    pub name: String,
    
    /// Normalized function body (whitespace-normalized, comments removed)
    pub normalized_body: String,
    
    /// Original source code of the function
    pub source: String,
    
    /// Line number where the function starts
    pub start_line: usize,
    
    /// Line number where the function ends
    pub end_line: usize,
    
    /// Parameters (normalized)
    pub parameters: Vec<String>,
    
    /// Return type (if explicitly typed)
    pub return_type: Option<String>,
    
    /// Whether this is exported
    pub is_exported: bool,
    
    /// Whether this is async
    pub is_async: bool,
}

/// Evidence of function-level DRY violation (inter-file: same name, different files)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionDryEvidence {
    /// Unique identifier
    pub id: Uuid,
    
    /// First file containing the duplicate
    pub file_a: PathBuf,
    
    /// Second file containing the duplicate  
    pub file_b: PathBuf,
    
    /// Duplicated function name
    pub function_name: String,
    
    /// Similarity between the functions (0.0 - 1.0)
    pub similarity: f64,
    
    /// Function details from file A
    pub function_a: ExtractedFunction,
    
    /// Function details from file B
    pub function_b: ExtractedFunction,
    
    /// When this computation was performed
    pub computed_at: DateTime<Utc>,
}

/// Evidence of intra-file DRY violation (same file, different names, similar implementation)
/// 
/// Research shows same-file clones have ~18% higher bug propagation risk than
/// cross-file clones. This type captures duplication that traditional same-name
/// detection misses.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntraFileDryEvidence {
    /// Unique identifier
    pub id: Uuid,
    
    /// File containing both functions
    pub file: PathBuf,
    
    /// Name of the first function
    pub function_a_name: String,
    
    /// Name of the second function
    pub function_b_name: String,
    
    /// Similarity between the functions (0.0 - 1.0)
    pub similarity: f64,
    
    /// Function details for first function
    pub function_a: ExtractedFunction,
    
    /// Function details for second function
    pub function_b: ExtractedFunction,
    
    /// Suggested extraction name (e.g., common prefix or inferred purpose)
    pub suggested_extraction: Option<String>,
    
    /// When this computation was performed
    pub computed_at: DateTime<Utc>,
}

/// Result of function-level DRY analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionDryReport {
    /// Unique identifier
    pub id: Uuid,
    
    /// Files analyzed
    pub files: Vec<PathBuf>,
    
    /// Duplicate functions found (inter-file: same name, different files)
    pub duplicates: Vec<FunctionDryEvidence>,
    
    /// Intra-file duplicates found (same file, different names, similar implementation)
    pub intra_file_duplicates: Vec<IntraFileDryEvidence>,
    
    /// Total functions analyzed
    pub total_functions: usize,
    
    /// Files that were skipped (e.g., test files)
    pub skipped_files: Vec<PathBuf>,
    
    /// When this computation was performed
    pub computed_at: DateTime<Utc>,
}

/// Options for function-level DRY analysis
#[derive(Debug, Clone, Default)]
pub struct FunctionDryOptions {
    /// Exclude test files from analysis (*.test.ts, *.spec.ts, __tests__/*)
    pub exclude_tests: bool,
    
    /// Exclude files matching these patterns
    pub exclude_patterns: Vec<String>,
    
    /// Only analyze functions with at least this many lines
    pub min_function_lines: Option<usize>,
    
    /// Enable intra-file duplicate detection (same file, different names)
    /// This catches functions with similar implementations but different names
    /// within the same file. Research shows same-file clones have higher
    /// bug propagation risk (~18% of clone fragments contain propagated bugs).
    pub detect_intra_file: bool,
    
    /// Similarity threshold for intra-file detection (0.0-1.0)
    /// Defaults to 0.85 if not specified (higher than inter-file to reduce false positives)
    /// Since we're comparing different-named functions, we need higher confidence
    pub intra_file_threshold: Option<f64>,
}

/// Default threshold for intra-file detection (higher than inter-file)
pub const DEFAULT_INTRA_FILE_THRESHOLD: f64 = 0.85;

impl FunctionDryOptions {
    /// Create options with test file exclusion enabled
    pub fn exclude_tests() -> Self {
        Self {
            exclude_tests: true,
            ..Default::default()
        }
    }
    
    /// Create options with intra-file detection enabled
    pub fn with_intra_file() -> Self {
        Self {
            detect_intra_file: true,
            intra_file_threshold: Some(DEFAULT_INTRA_FILE_THRESHOLD),
            ..Default::default()
        }
    }
    
    /// Create options with both test exclusion and intra-file detection
    pub fn exclude_tests_with_intra_file() -> Self {
        Self {
            exclude_tests: true,
            detect_intra_file: true,
            intra_file_threshold: Some(DEFAULT_INTRA_FILE_THRESHOLD),
            ..Default::default()
        }
    }
    
    /// Get the effective intra-file threshold
    pub fn effective_intra_file_threshold(&self) -> f64 {
        self.intra_file_threshold.unwrap_or(DEFAULT_INTRA_FILE_THRESHOLD)
    }
    
    /// Check if a path should be excluded
    pub fn should_exclude(&self, path: &Path) -> bool {
        if self.exclude_tests {
            if is_test_file(path) {
                return true;
            }
        }
        
        // Check custom patterns
        let path_str = path.to_string_lossy();
        for pattern in &self.exclude_patterns {
            if path_str.contains(pattern) {
                return true;
            }
        }
        
        false
    }
}

/// Check if a file is a test file
pub fn is_test_file(path: &Path) -> bool {
    let path_str = path.to_string_lossy();
    
    // Common test file patterns
    let test_patterns = [
        ".test.", ".spec.", "_test.", "_spec.",
        "/__tests__/", "/__mocks__/", "/test/", "/tests/",
        "/fixtures/", "/mocks/",
    ];
    
    for pattern in test_patterns {
        if path_str.contains(pattern) {
            return true;
        }
    }
    
    // Check filename patterns
    if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
        if name.starts_with("test_") || name.starts_with("spec_") ||
           name.ends_with(".test.ts") || name.ends_with(".test.tsx") ||
           name.ends_with(".test.js") || name.ends_with(".test.jsx") ||
           name.ends_with(".spec.ts") || name.ends_with(".spec.tsx") ||
           name.ends_with(".spec.js") || name.ends_with(".spec.jsx") ||
           name.ends_with("_test.rs") || name.ends_with("_test.py") {
            return true;
        }
    }
    
    false
}

/// Extract all functions from a TypeScript/JavaScript file
pub fn extract_functions_ts(path: &Path) -> Result<Vec<ExtractedFunction>, ComputationError> {
    let source = fs::read_to_string(path)?;
    
    let mut parser = Parser::new();
    let language = tree_sitter_typescript::LANGUAGE_TYPESCRIPT;
    parser.set_language(&language.into())
        .map_err(|e| ComputationError::ParseError { 
            file: path.to_path_buf(), 
            message: e.to_string() 
        })?;
    
    let tree = parser.parse(&source, None)
        .ok_or_else(|| ComputationError::ParseError { 
            file: path.to_path_buf(), 
            message: "Failed to parse".to_string() 
        })?;
    
    let mut functions = Vec::new();
    extract_functions_from_node(tree.root_node(), &source, &mut functions);
    
    Ok(functions)
}

/// Extract all functions from a JavaScript file
pub fn extract_functions_js(path: &Path) -> Result<Vec<ExtractedFunction>, ComputationError> {
    let source = fs::read_to_string(path)?;
    
    let mut parser = Parser::new();
    let language = tree_sitter_javascript::LANGUAGE;
    parser.set_language(&language.into())
        .map_err(|e| ComputationError::ParseError { 
            file: path.to_path_buf(), 
            message: e.to_string() 
        })?;
    
    let tree = parser.parse(&source, None)
        .ok_or_else(|| ComputationError::ParseError { 
            file: path.to_path_buf(), 
            message: "Failed to parse".to_string() 
        })?;
    
    let mut functions = Vec::new();
    extract_functions_from_node(tree.root_node(), &source, &mut functions);
    
    Ok(functions)
}

/// Extract functions based on file extension
pub fn extract_functions(path: &Path) -> Result<Vec<ExtractedFunction>, ComputationError> {
    let ext = path.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");
    
    match ext.to_lowercase().as_str() {
        "ts" | "tsx" => extract_functions_ts(path),
        "js" | "jsx" | "mjs" => extract_functions_js(path),
        _ => Ok(Vec::new()), // Unsupported language, return empty
    }
}

fn extract_functions_from_node(node: Node, source: &str, functions: &mut Vec<ExtractedFunction>) {
    let kind = node.kind();
    
    // Check for function declarations
    if matches!(kind, "function_declaration" | "function" | "arrow_function" | "method_definition") {
        if let Some(func) = parse_function_node(node, source) {
            functions.push(func);
        }
    }
    
    // Check for variable declarations with arrow functions
    if kind == "lexical_declaration" || kind == "variable_declaration" {
        if let Some(func) = parse_variable_function(node, source) {
            functions.push(func);
        }
    }
    
    // Recurse into children
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        extract_functions_from_node(child, source, functions);
    }
}

fn parse_function_node(node: Node, source: &str) -> Option<ExtractedFunction> {
    let start_byte = node.start_byte();
    let end_byte = node.end_byte();
    let func_source = &source[start_byte..end_byte];
    
    // Get function name
    let name = node.child_by_field_name("name")
        .map(|n| n.utf8_text(source.as_bytes()).unwrap_or("anonymous").to_string())
        .unwrap_or_else(|| "anonymous".to_string());
    
    // Skip anonymous functions for duplicate detection
    if name == "anonymous" {
        return None;
    }
    
    // Get parameters
    let parameters = extract_parameters(node, source);
    
    // Get return type (TypeScript)
    let return_type = node.child_by_field_name("return_type")
        .map(|n| n.utf8_text(source.as_bytes()).unwrap_or("").to_string());
    
    // Check if exported
    let is_exported = node.parent()
        .map(|p| p.kind() == "export_statement")
        .unwrap_or(false);
    
    // Check if async
    let is_async = func_source.trim_start().starts_with("async");
    
    // Normalize the body
    let normalized_body = normalize_function_body(func_source);
    
    Some(ExtractedFunction {
        name,
        normalized_body,
        source: func_source.to_string(),
        start_line: node.start_position().row + 1,
        end_line: node.end_position().row + 1,
        parameters,
        return_type,
        is_exported,
        is_async,
    })
}

fn parse_variable_function(node: Node, source: &str) -> Option<ExtractedFunction> {
    // Look for patterns like: const foo = () => {} or const foo = function() {}
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        if child.kind() == "variable_declarator" {
            let name_node = child.child_by_field_name("name")?;
            let name = name_node.utf8_text(source.as_bytes()).ok()?.to_string();
            
            let value_node = child.child_by_field_name("value")?;
            if matches!(value_node.kind(), "arrow_function" | "function") {
                let start_byte = node.start_byte();
                let end_byte = node.end_byte();
                let func_source = &source[start_byte..end_byte];
                
                let parameters = extract_parameters(value_node, source);
                let return_type = value_node.child_by_field_name("return_type")
                    .map(|n| n.utf8_text(source.as_bytes()).unwrap_or("").to_string());
                
                let is_exported = node.parent()
                    .map(|p| p.kind() == "export_statement")
                    .unwrap_or(false);
                
                let is_async = func_source.contains("async");
                
                let normalized_body = normalize_function_body(func_source);
                
                return Some(ExtractedFunction {
                    name,
                    normalized_body,
                    source: func_source.to_string(),
                    start_line: node.start_position().row + 1,
                    end_line: node.end_position().row + 1,
                    parameters,
                    return_type,
                    is_exported,
                    is_async,
                });
            }
        }
    }
    None
}

fn extract_parameters(node: Node, source: &str) -> Vec<String> {
    let mut params = Vec::new();
    
    if let Some(params_node) = node.child_by_field_name("parameters") {
        let mut cursor = params_node.walk();
        for child in params_node.children(&mut cursor) {
            if matches!(child.kind(), "identifier" | "required_parameter" | "optional_parameter") {
                if let Some(name) = child.child_by_field_name("pattern")
                    .or_else(|| Some(child))
                    .and_then(|n| n.utf8_text(source.as_bytes()).ok()) 
                {
                    // Normalize: remove type annotations
                    let param = name.split(':').next().unwrap_or(name).trim().to_string();
                    if !param.is_empty() && param != "(" && param != ")" && param != "," {
                        params.push(param);
                    }
                }
            }
        }
    }
    
    params
}

fn normalize_function_body(source: &str) -> String {
    // Remove comments, normalize whitespace
    source
        .lines()
        .map(|line| {
            // Remove single-line comments
            let without_comment = line.split("//").next().unwrap_or(line);
            without_comment.trim()
        })
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>()
        .join("\n")
        // Remove block comments
        .split("/*")
        .map(|part| part.split("*/").last().unwrap_or(part))
        .collect::<String>()
        // Normalize whitespace
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

/// Suggest an extraction name for intra-file duplicates
/// 
/// Attempts to find a common pattern or meaningful name for the shared logic
fn suggest_extraction_name(name_a: &str, name_b: &str) -> Option<String> {
    // Find longest common prefix
    let prefix: String = name_a.chars()
        .zip(name_b.chars())
        .take_while(|(a, b)| a == b)
        .map(|(a, _)| a)
        .collect();
    
    if prefix.len() >= 3 {
        // Clean up the prefix (remove trailing underscores, etc.)
        let clean_prefix = prefix.trim_end_matches(|c: char| c == '_' || c.is_numeric());
        if clean_prefix.len() >= 3 {
            return Some(format!("{}Core", clean_prefix));
        }
    }
    
    // Find longest common suffix
    let suffix: String = name_a.chars().rev()
        .zip(name_b.chars().rev())
        .take_while(|(a, b)| a == b)
        .map(|(a, _)| a)
        .collect::<String>()
        .chars()
        .rev()
        .collect();
    
    if suffix.len() >= 3 {
        let clean_suffix = suffix.trim_start_matches(|c: char| c == '_' || c.is_numeric());
        if clean_suffix.len() >= 3 {
            return Some(format!("do{}", capitalize_first(clean_suffix)));
        }
    }
    
    // Fallback: suggest based on common patterns
    let patterns = [
        ("validate", "check", "validateOrCheck"),
        ("get", "fetch", "retrieve"),
        ("update", "set", "modify"),
        ("create", "make", "build"),
        ("process", "handle", "handleOrProcess"),
        ("format", "transform", "convert"),
        ("parse", "extract", "parseOrExtract"),
    ];
    
    let name_a_lower = name_a.to_lowercase();
    let name_b_lower = name_b.to_lowercase();
    
    for (p1, p2, suggestion) in patterns {
        if (name_a_lower.contains(p1) && name_b_lower.contains(p2)) ||
           (name_a_lower.contains(p2) && name_b_lower.contains(p1)) {
            return Some(suggestion.to_string());
        }
    }
    
    // Generic fallback
    Some("sharedLogic".to_string())
}

/// Capitalize the first character of a string
fn capitalize_first(s: &str) -> String {
    let mut chars = s.chars();
    match chars.next() {
        None => String::new(),
        Some(first) => first.to_uppercase().chain(chars).collect(),
    }
}

/// Compare two functions for similarity
pub fn compare_functions(a: &ExtractedFunction, b: &ExtractedFunction) -> f64 {
    // Use levenshtein-style similarity on normalized bodies
    let a_body = &a.normalized_body;
    let b_body = &b.normalized_body;
    
    if a_body.is_empty() && b_body.is_empty() {
        return 1.0;
    }
    
    if a_body.is_empty() || b_body.is_empty() {
        return 0.0;
    }
    
    // Token-based comparison
    let a_tokens: Vec<&str> = a_body.split_whitespace().collect();
    let b_tokens: Vec<&str> = b_body.split_whitespace().collect();
    
    let max_len = a_tokens.len().max(b_tokens.len()) as f64;
    if max_len == 0.0 {
        return 1.0;
    }
    
    // Count matching tokens
    let mut matches = 0;
    for (ta, tb) in a_tokens.iter().zip(b_tokens.iter()) {
        if ta == tb {
            matches += 1;
        }
    }
    
    // Also penalize length difference
    let len_diff = (a_tokens.len() as i32 - b_tokens.len() as i32).abs() as f64;
    let len_penalty = 1.0 - (len_diff / max_len).min(1.0);
    
    let token_sim = matches as f64 / max_len;
    
    // Weighted combination
    token_sim * 0.7 + len_penalty * 0.3
}

/// Analyze functions across multiple files for duplicates
pub fn analyze_function_dry(
    files: &[PathBuf],
    threshold: f64,
) -> Result<FunctionDryReport, ComputationError> {
    analyze_function_dry_with_options(files, threshold, &FunctionDryOptions::default())
}

/// Analyze functions with custom options (e.g., test exclusion)
pub fn analyze_function_dry_with_options(
    files: &[PathBuf],
    threshold: f64,
    options: &FunctionDryOptions,
) -> Result<FunctionDryReport, ComputationError> {
    let mut all_functions: Vec<(PathBuf, ExtractedFunction)> = Vec::new();
    let mut skipped_files = Vec::new();
    let mut analyzed_files = Vec::new();
    
    // Extract functions from all files
    for path in files {
        // Check if we should skip this file
        if options.should_exclude(path) {
            skipped_files.push(path.clone());
            continue;
        }
        
        if let Ok(functions) = extract_functions(path) {
            // Filter by minimum lines if specified
            let filtered: Vec<_> = if let Some(min_lines) = options.min_function_lines {
                functions.into_iter()
                    .filter(|f| f.end_line - f.start_line + 1 >= min_lines)
                    .collect()
            } else {
                functions
            };
            
            for func in filtered {
                all_functions.push((path.clone(), func));
            }
            analyzed_files.push(path.clone());
        }
    }
    
    let total_functions = all_functions.len();
    let mut duplicates = Vec::new();
    let mut intra_file_duplicates = Vec::new();
    
    // Get the effective intra-file threshold
    let intra_threshold = options.effective_intra_file_threshold();
    
    // Compare all pairs
    for i in 0..all_functions.len() {
        for j in (i + 1)..all_functions.len() {
            let (path_a, func_a) = &all_functions[i];
            let (path_b, func_b) = &all_functions[j];
            
            let same_file = path_a == path_b;
            let same_name = func_a.name == func_b.name;
            
            // Inter-file detection: same name, different files (original behavior)
            if !same_file && same_name {
                let similarity = compare_functions(func_a, func_b);
                
                if similarity >= threshold {
                    duplicates.push(FunctionDryEvidence {
                        id: Uuid::new_v4(),
                        file_a: path_a.clone(),
                        file_b: path_b.clone(),
                        function_name: func_a.name.clone(),
                        similarity,
                        function_a: func_a.clone(),
                        function_b: func_b.clone(),
                        computed_at: Utc::now(),
                    });
                }
            }
            
            // Intra-file detection: same file, different names, similar implementation
            // This catches duplicative logic that traditional same-name detection misses
            if options.detect_intra_file && same_file && !same_name {
                let similarity = compare_functions(func_a, func_b);
                
                if similarity >= intra_threshold {
                    intra_file_duplicates.push(IntraFileDryEvidence {
                        id: Uuid::new_v4(),
                        file: path_a.clone(),
                        function_a_name: func_a.name.clone(),
                        function_b_name: func_b.name.clone(),
                        similarity,
                        function_a: func_a.clone(),
                        function_b: func_b.clone(),
                        suggested_extraction: suggest_extraction_name(&func_a.name, &func_b.name),
                        computed_at: Utc::now(),
                    });
                }
            }
        }
    }
    
    Ok(FunctionDryReport {
        id: Uuid::new_v4(),
        files: analyzed_files,
        duplicates,
        intra_file_duplicates,
        total_functions,
        skipped_files,
        computed_at: Utc::now(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    use std::fs::File;
    use std::io::Write;
    
    #[test]
    fn test_extract_functions() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("test.ts");
        
        File::create(&file_path).unwrap()
            .write_all(br#"
function validate(input: string): boolean {
    return input.length > 0;
}

const process = (data: any) => {
    return data.map(x => x * 2);
};

export async function fetchData(url: string) {
    const response = await fetch(url);
    return response.json();
}
"#).unwrap();
        
        let functions = extract_functions_ts(&file_path).unwrap();
        
        assert_eq!(functions.len(), 3);
        
        let validate = functions.iter().find(|f| f.name == "validate").unwrap();
        assert!(!validate.is_async);
        assert!(!validate.is_exported);
        
        let process = functions.iter().find(|f| f.name == "process").unwrap();
        assert!(!process.is_async);
        
        let fetch_data = functions.iter().find(|f| f.name == "fetchData").unwrap();
        assert!(fetch_data.is_async);
        assert!(fetch_data.is_exported);
    }
    
    #[test]
    fn test_detect_duplicate_functions() {
        let dir = tempdir().unwrap();
        
        // File A with bd() function
        let file_a = dir.path().join("beads.ts");
        File::create(&file_a).unwrap()
            .write_all(br#"
import { exec } from 'child_process';

function bd(path: string) {
    return exec(`bd ${path}`);
}

export function processBeads() {
    return bd('.');
}
"#).unwrap();
        
        // File B with same bd() function
        let file_b = dir.path().join("molecule.ts");
        File::create(&file_b).unwrap()
            .write_all(br#"
import { exec } from 'child_process';

function bd(path: string) {
    return exec(`bd ${path}`);
}

export function processMolecules() {
    return bd('./molecules');
}
"#).unwrap();
        
        let report = analyze_function_dry(
            &[file_a.clone(), file_b.clone()],
            0.8,
        ).unwrap();
        
        // Should detect bd() as duplicate
        assert!(!report.duplicates.is_empty());
        
        let bd_dup = report.duplicates.iter()
            .find(|d| d.function_name == "bd")
            .expect("Should find bd as duplicate");
        
        assert!(bd_dup.similarity >= 0.8);
    }
    
    #[test]
    fn test_different_functions_not_flagged() {
        let dir = tempdir().unwrap();
        
        let file_a = dir.path().join("a.ts");
        File::create(&file_a).unwrap()
            .write_all(br#"
function validate(input: string): boolean {
    return input.length > 0 && input.includes('@');
}
"#).unwrap();
        
        let file_b = dir.path().join("b.ts");
        File::create(&file_b).unwrap()
            .write_all(br#"
function validate(data: object): boolean {
    return Object.keys(data).length > 0;
}
"#).unwrap();
        
        let report = analyze_function_dry(
            &[file_a, file_b],
            0.9,
        ).unwrap();
        
        // Same function name but different implementation
        // Should either not match or have low similarity
        let validate_dup = report.duplicates.iter()
            .find(|d| d.function_name == "validate");
        
        if let Some(dup) = validate_dup {
            assert!(dup.similarity < 0.9, "Different functions should not be flagged");
        }
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Intra-File Duplicate Detection Tests
    // ─────────────────────────────────────────────────────────────────────────────
    
    #[test]
    fn test_intra_file_detects_similar_functions_different_names() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("duplicates.ts");
        
        // Two functions with different names but nearly identical implementation
        File::create(&file_path).unwrap()
            .write_all(br#"
function validateEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function checkEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}
"#).unwrap();
        
        let options = FunctionDryOptions::with_intra_file();
        let report = analyze_function_dry_with_options(
            &[file_path.clone()],
            0.8,
            &options,
        ).unwrap();
        
        // Should detect intra-file duplicate
        assert!(!report.intra_file_duplicates.is_empty(), 
            "Should detect intra-file duplicates with different names");
        
        let dup = &report.intra_file_duplicates[0];
        assert_eq!(dup.file, file_path);
        assert!(
            (dup.function_a_name == "validateEmail" && dup.function_b_name == "checkEmail") ||
            (dup.function_a_name == "checkEmail" && dup.function_b_name == "validateEmail")
        );
        assert!(dup.similarity >= 0.85, "Similarity should be high for near-identical functions");
        assert!(dup.suggested_extraction.is_some(), "Should have a suggested extraction name");
    }
    
    #[test]
    fn test_intra_file_disabled_by_default() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("duplicates.ts");
        
        File::create(&file_path).unwrap()
            .write_all(br#"
function validateEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function checkEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}
"#).unwrap();
        
        // Use default options (intra-file detection disabled)
        let report = analyze_function_dry(
            &[file_path],
            0.8,
        ).unwrap();
        
        // Should NOT detect intra-file duplicates by default
        assert!(report.intra_file_duplicates.is_empty(), 
            "Intra-file detection should be disabled by default");
    }
    
    #[test]
    fn test_intra_file_respects_threshold() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("partial.ts");
        
        // Two functions that are somewhat similar but not identical
        File::create(&file_path).unwrap()
            .write_all(br#"
function validateEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return false;
    return regex.test(email);
}

function checkPhone(phone: string): boolean {
    const regex = /^\d{10}$/;
    if (!phone) return false;
    return regex.test(phone);
}
"#).unwrap();
        
        // High threshold should not match these
        let options = FunctionDryOptions {
            detect_intra_file: true,
            intra_file_threshold: Some(0.95),
            ..Default::default()
        };
        let report = analyze_function_dry_with_options(
            &[file_path.clone()],
            0.8,
            &options,
        ).unwrap();
        
        assert!(report.intra_file_duplicates.is_empty(), 
            "High threshold should not match partially similar functions");
        
        // Lower threshold might match them
        let options_low = FunctionDryOptions {
            detect_intra_file: true,
            intra_file_threshold: Some(0.5),
            ..Default::default()
        };
        let report_low = analyze_function_dry_with_options(
            &[file_path],
            0.8,
            &options_low,
        ).unwrap();
        
        // May or may not match depending on exact similarity calculation
        // This test mainly verifies threshold is respected
        assert!(report.intra_file_duplicates.len() <= report_low.intra_file_duplicates.len(),
            "Lower threshold should match at least as many as higher threshold");
    }
    
    #[test]
    fn test_intra_file_does_not_flag_different_implementations() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("different.ts");
        
        // Two functions with different names AND different implementations
        File::create(&file_path).unwrap()
            .write_all(br#"
function processUser(user: User): void {
    const name = user.name.trim();
    const email = user.email.toLowerCase();
    saveToDatabase({ name, email });
}

function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
}
"#).unwrap();
        
        let options = FunctionDryOptions::with_intra_file();
        let report = analyze_function_dry_with_options(
            &[file_path],
            0.8,
            &options,
        ).unwrap();
        
        // Should NOT flag these as duplicates
        assert!(report.intra_file_duplicates.is_empty(), 
            "Different implementations should not be flagged as intra-file duplicates");
    }
    
    #[test]
    fn test_suggest_extraction_name() {
        // Test common prefix extraction
        assert_eq!(
            suggest_extraction_name("validateEmail", "validatePhone"),
            Some("validateCore".to_string())
        );
        
        // Test common prefix (get prefix found first)
        assert_eq!(
            suggest_extraction_name("getUserData", "getProductData"),
            Some("getCore".to_string())
        );
        
        // Test common suffix extraction (when no common prefix)
        assert_eq!(
            suggest_extraction_name("fetchUserData", "loadUserData"),
            Some("doUserData".to_string())
        );
        
        // Test pattern matching
        assert!(suggest_extraction_name("validateInput", "checkInput").is_some());
        
        // Test fallback
        assert!(suggest_extraction_name("foo", "bar").is_some());
    }
    
    #[test]
    fn test_inter_and_intra_file_together() {
        let dir = tempdir().unwrap();
        
        // File A with duplicate function
        let file_a = dir.path().join("a.ts");
        File::create(&file_a).unwrap()
            .write_all(br#"
function bd(path: string) {
    return exec(`bd ${path}`);
}

function runBd(path: string) {
    return exec(`bd ${path}`);
}
"#).unwrap();
        
        // File B with same bd() function
        let file_b = dir.path().join("b.ts");
        File::create(&file_b).unwrap()
            .write_all(br#"
function bd(path: string) {
    return exec(`bd ${path}`);
}
"#).unwrap();
        
        let options = FunctionDryOptions::with_intra_file();
        let report = analyze_function_dry_with_options(
            &[file_a.clone(), file_b.clone()],
            0.8,
            &options,
        ).unwrap();
        
        // Should detect inter-file duplicate (bd in both files)
        let inter_dup = report.duplicates.iter()
            .find(|d| d.function_name == "bd");
        assert!(inter_dup.is_some(), "Should detect inter-file duplicate for bd()");
        
        // Should detect intra-file duplicate (bd and runBd in file_a)
        let intra_dup = report.intra_file_duplicates.iter()
            .find(|d| d.file == file_a);
        assert!(intra_dup.is_some(), "Should detect intra-file duplicate in file_a");
    }
}
