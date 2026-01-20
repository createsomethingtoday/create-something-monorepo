//! Function-Level DRY Analysis
//!
//! Extracts individual functions from source files using tree-sitter AST parsing
//! and compares them for duplication. This catches cases where overall file
//! similarity is low but specific functions are duplicated across files.
//!
//! ## Example
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

/// Evidence of function-level DRY violation
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

/// Result of function-level DRY analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionDryReport {
    /// Unique identifier
    pub id: Uuid,
    
    /// Files analyzed
    pub files: Vec<PathBuf>,
    
    /// Duplicate functions found
    pub duplicates: Vec<FunctionDryEvidence>,
    
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
}

impl FunctionDryOptions {
    /// Create options with test file exclusion enabled
    pub fn exclude_tests() -> Self {
        Self {
            exclude_tests: true,
            ..Default::default()
        }
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
    
    // Compare all pairs
    for i in 0..all_functions.len() {
        for j in (i + 1)..all_functions.len() {
            let (path_a, func_a) = &all_functions[i];
            let (path_b, func_b) = &all_functions[j];
            
            // Only compare same-named functions across different files
            if path_a != path_b && func_a.name == func_b.name {
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
        }
    }
    
    Ok(FunctionDryReport {
        id: Uuid::new_v4(),
        files: analyzed_files,
        duplicates,
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
}
