//! Usage Computation (Rams Level)
//!
//! Counts actual usages of symbols across a codebase.
//! A symbol "earns its existence" if it has usages.

use std::path::{Path, PathBuf};
use std::fs;
use serde::{Serialize, Deserialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

use super::ComputationError;

/// Evidence of computed usage count for a symbol
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageEvidence {
    /// Unique identifier for this computation
    pub id: Uuid,
    
    /// The symbol being counted
    pub symbol: String,
    
    /// Path that was searched
    pub search_path: PathBuf,
    
    /// Total number of usages found (including definitions)
    pub usage_count: u32,
    
    /// Number of definition sites (export, function, class, interface, type declarations)
    pub definition_count: u32,
    
    /// Number of actual usages (calls, references, imports)
    pub actual_usage_count: u32,
    
    /// Number of type-only usages (generic params, type annotations, etc.)
    #[serde(default)]
    pub type_only_count: u32,
    
    /// Locations where the symbol was found
    pub locations: Vec<UsageLocation>,
    
    /// When this computation was performed
    pub computed_at: DateTime<Utc>,
}

/// A location where a symbol is used
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageLocation {
    pub file: PathBuf,
    pub line: u32,
    pub column: u32,
    pub context: String,
    /// Whether this is a definition site (vs an actual usage)
    pub is_definition: bool,
    /// The type of usage (definition, usage, or type-only)
    #[serde(default)]
    pub usage_type: UsageType,
}

impl Default for UsageType {
    fn default() -> Self {
        UsageType::Usage
    }
}

/// Type of usage location
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum UsageType {
    /// Definition site (export, function, class, interface, type)
    Definition,
    /// Actual usage (call, reference, import from another file)
    Usage,
    /// Type-only usage (generic param, type annotation, type assertion)
    TypeOnly,
}

impl UsageEvidence {
    /// Check if this symbol "earns existence" (has minimum actual usages, not counting definitions)
    /// Type-only usages count as actual usages for types/interfaces
    pub fn earns_existence(&self, min_usage: u32) -> bool {
        (self.actual_usage_count + self.type_only_count) >= min_usage
    }
    
    /// Check if symbol is only defined but never actually used
    /// Type-only usages count as usage for types
    pub fn is_defined_but_unused(&self) -> bool {
        self.definition_count > 0 && self.actual_usage_count == 0 && self.type_only_count == 0
    }
    
    /// Check if symbol appears to be exported but never imported elsewhere
    /// Type-only usages count as imports for types
    pub fn is_exported_but_unused(&self) -> bool {
        // If we have definitions (including exports) but no actual usages or type-only usages,
        // this is an exported-but-unused symbol
        self.definition_count > 0 && self.actual_usage_count == 0 && self.type_only_count == 0
    }
    
    /// Check if symbol is used only as a type (not at runtime)
    pub fn is_type_only(&self) -> bool {
        self.type_only_count > 0 && self.actual_usage_count == 0
    }
    
    /// Total usages including type-only
    pub fn total_usages(&self) -> u32 {
        self.actual_usage_count + self.type_only_count
    }
}

/// Count usages of a symbol in a directory
pub fn count_usages(symbol: &str, search_path: &Path) -> Result<UsageEvidence, ComputationError> {
    let mut locations = Vec::new();
    
    // Walk the directory and search for the symbol
    if search_path.is_file() {
        search_file(symbol, search_path, &mut locations)?;
    } else if search_path.is_dir() {
        search_directory(symbol, search_path, &mut locations)?;
    } else {
        return Err(ComputationError::FileNotFound(search_path.to_path_buf()));
    }
    
    // Count definitions vs actual usages vs type-only usages
    let definition_count = locations.iter()
        .filter(|l| l.usage_type == UsageType::Definition)
        .count() as u32;
    let type_only_count = locations.iter()
        .filter(|l| l.usage_type == UsageType::TypeOnly)
        .count() as u32;
    let actual_usage_count = locations.iter()
        .filter(|l| l.usage_type == UsageType::Usage)
        .count() as u32;
    
    Ok(UsageEvidence {
        id: Uuid::new_v4(),
        symbol: symbol.to_string(),
        search_path: search_path.to_path_buf(),
        usage_count: locations.len() as u32,
        definition_count,
        actual_usage_count,
        type_only_count,
        locations,
        computed_at: Utc::now(),
    })
}

fn search_file(symbol: &str, path: &Path, locations: &mut Vec<UsageLocation>) -> Result<(), ComputationError> {
    // Skip non-code files
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
    if !matches!(ext, "ts" | "tsx" | "js" | "jsx" | "rs" | "py" | "go") {
        return Ok(());
    }
    
    let content = fs::read_to_string(path)?;
    
    for (line_num, line) in content.lines().enumerate() {
        // Simple word-boundary search for the symbol
        // In production, use tree-sitter for semantic search
        if contains_symbol(line, symbol) {
            let column = line.find(symbol).unwrap_or(0) as u32;
            let usage_type = classify_usage(line, symbol);
            let is_definition = usage_type == UsageType::Definition;
            
            locations.push(UsageLocation {
                file: path.to_path_buf(),
                line: (line_num + 1) as u32,
                column,
                context: line.trim().to_string(),
                is_definition,
                usage_type,
            });
        }
    }
    
    Ok(())
}

/// Classify the type of usage for a symbol on a line
fn classify_usage(line: &str, symbol: &str) -> UsageType {
    // First check if it's a definition
    if is_definition_line(line, symbol) {
        return UsageType::Definition;
    }
    
    // Then check for type-only usages (TypeScript/JavaScript patterns)
    if is_type_only_usage(line, symbol) {
        return UsageType::TypeOnly;
    }
    
    // Default to actual runtime usage
    UsageType::Usage
}

/// Detect if a line uses the symbol only as a type (not at runtime)
fn is_type_only_usage(line: &str, symbol: &str) -> bool {
    let trimmed = line.trim();
    
    // Type import: import type { Symbol } or import { type Symbol }
    if trimmed.starts_with("import type") && trimmed.contains(symbol) {
        return true;
    }
    if trimmed.starts_with("import") && trimmed.contains(&format!("type {}", symbol)) {
        return true;
    }
    
    // Generic type parameter: <Symbol> or <Symbol, Other> or <T extends Symbol>
    let generic_patterns = [
        format!("<{}>", symbol),
        format!("<{},", symbol),
        format!("<{} ", symbol),
        format!(", {}>", symbol),
        format!(", {},", symbol),
        format!("extends {}>", symbol),
        format!("extends {},", symbol),
        format!("extends {} ", symbol),
    ];
    for pattern in &generic_patterns {
        if trimmed.contains(pattern) {
            return true;
        }
    }
    
    // Type annotation: : Symbol or : Symbol[] or : Symbol | Other
    let annotation_patterns = [
        format!(": {}", symbol),
        format!(": {}[", symbol),
        format!(": {} |", symbol),
        format!(": {} &", symbol),
        format!(": {} =", symbol),  // default type
        format!("| {}", symbol),
        format!("& {}", symbol),
    ];
    for pattern in &annotation_patterns {
        if trimmed.contains(pattern) {
            // Make sure it's not a ternary or object property
            // Skip if there's a ? before the colon (ternary) 
            let symbol_pos = trimmed.find(pattern);
            if let Some(pos) = symbol_pos {
                let before = &trimmed[..pos];
                // Ternary check: look for ? without : between them
                if !before.contains('?') || before.rfind(':').map_or(false, |c| c > before.rfind('?').unwrap_or(0)) {
                    return true;
                }
            }
        }
    }
    
    // Type assertion: as Symbol
    if trimmed.contains(&format!("as {}", symbol)) {
        return true;
    }
    
    // implements/extends in class/interface declaration
    if (trimmed.contains("implements") || trimmed.contains("extends")) && trimmed.contains(symbol) {
        // Check it's not a function call
        if !trimmed.contains(&format!("{}(", symbol)) {
            return true;
        }
    }
    
    // satisfies operator: satisfies Symbol
    if trimmed.contains(&format!("satisfies {}", symbol)) {
        return true;
    }
    
    // Rust type patterns
    if trimmed.contains(&format!("-> {}", symbol)) || // return type
       trimmed.contains(&format!(": {}", symbol)) ||  // type annotation
       trimmed.contains(&format!("impl {}", symbol)) || // impl block
       trimmed.contains(&format!("where {}", symbol)) { // where clause
        return true;
    }
    
    false
}

/// Detect if a line is a definition site for the symbol
fn is_definition_line(line: &str, symbol: &str) -> bool {
    let trimmed = line.trim();
    
    // TypeScript/JavaScript definition patterns
    let ts_definition_patterns = [
        // Export declarations
        format!("export function {}", symbol),
        format!("export const {}", symbol),
        format!("export let {}", symbol),
        format!("export class {}", symbol),
        format!("export interface {}", symbol),
        format!("export type {}", symbol),
        format!("export enum {}", symbol),
        format!("export {{ {}", symbol),  // re-export
        format!("export default {}", symbol),
        // Non-export declarations
        format!("function {}", symbol),
        format!("const {} =", symbol),
        format!("let {} =", symbol),
        format!("var {} =", symbol),
        format!("class {}", symbol),
        format!("interface {}", symbol),
        format!("type {} =", symbol),
        format!("enum {}", symbol),
        // Async/generator variants
        format!("export async function {}", symbol),
        format!("async function {}", symbol),
        // Object property definitions
        format!("{}: function", symbol),
        format!("{}(", symbol),  // Method shorthand (if at start)
    ];
    
    // Rust definition patterns
    let rust_definition_patterns = [
        format!("pub fn {}", symbol),
        format!("fn {}", symbol),
        format!("pub struct {}", symbol),
        format!("struct {}", symbol),
        format!("pub enum {}", symbol),
        format!("enum {}", symbol),
        format!("pub type {}", symbol),
        format!("type {}", symbol),
        format!("pub trait {}", symbol),
        format!("trait {}", symbol),
        format!("pub const {}", symbol),
        format!("const {}", symbol),
        format!("pub static {}", symbol),
        format!("static {}", symbol),
    ];
    
    // Python definition patterns  
    let python_definition_patterns = [
        format!("def {}(", symbol),
        format!("class {}:", symbol),
        format!("class {}(", symbol),
        format!("{} =", symbol),  // Variable assignment at module level
    ];
    
    // Check all patterns
    for pattern in ts_definition_patterns.iter()
        .chain(rust_definition_patterns.iter())
        .chain(python_definition_patterns.iter()) 
    {
        if trimmed.starts_with(&*pattern) {
            return true;
        }
    }
    
    // Also check for definitions with decorators/attributes on previous line
    // e.g., @decorator \n def foo():
    // This is a simplified check - would need multi-line context for full accuracy
    
    false
}

fn search_directory(symbol: &str, dir: &Path, locations: &mut Vec<UsageLocation>) -> Result<(), ComputationError> {
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        
        // Skip hidden directories and node_modules
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            if name.starts_with('.') || name == "node_modules" || name == "target" || name == "dist" {
                continue;
            }
        }
        
        if path.is_dir() {
            search_directory(symbol, &path, locations)?;
        } else if path.is_file() {
            search_file(symbol, &path, locations)?;
        }
    }
    
    Ok(())
}

/// Check if a line contains a symbol (word-boundary aware)
fn contains_symbol(line: &str, symbol: &str) -> bool {
    let mut start = 0;
    while let Some(pos) = line[start..].find(symbol) {
        let abs_pos = start + pos;
        let before_ok = abs_pos == 0 || !line.chars().nth(abs_pos - 1).unwrap_or(' ').is_alphanumeric();
        let after_pos = abs_pos + symbol.len();
        let after_ok = after_pos >= line.len() || !line.chars().nth(after_pos).unwrap_or(' ').is_alphanumeric();
        
        if before_ok && after_ok {
            return true;
        }
        start = abs_pos + 1;
    }
    false
}

/// A dead export - exported but never imported elsewhere
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeadExport {
    /// The exported symbol name
    pub name: String,
    /// The file it's exported from
    pub file: PathBuf,
    /// Line number of the export
    pub line: u32,
    /// The export statement
    pub context: String,
}

/// Result of scanning for dead exports
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeadExportsReport {
    /// Module that was scanned
    pub module_path: PathBuf,
    /// Exports that are never imported elsewhere
    pub dead_exports: Vec<DeadExport>,
    /// Total exports found
    pub total_exports: u32,
    /// Search scope used
    pub search_scope: PathBuf,
    /// Computation timestamp
    pub computed_at: DateTime<Utc>,
}

/// Find exports in a module that are never imported elsewhere
pub fn find_dead_exports(module_path: &Path, search_scope: &Path) -> Result<DeadExportsReport, ComputationError> {
    use super::imports::{extract_exports as extract_exports_ast, get_reexported_symbols};
    
    // Use tree-sitter to extract all exports (more accurate than string parsing)
    let ast_exports = extract_exports_ast(module_path)
        .map_err(|e| ComputationError::ParseError { 
            file: module_path.to_path_buf(), 
            message: e 
        })?;
    
    let total_exports = ast_exports.len() as u32;
    
    // Convert to DeadExport format for checking
    let exports: Vec<DeadExport> = ast_exports.iter()
        .filter(|e| !e.is_reexport) // Only check original exports, not re-exports
        .map(|e| DeadExport {
            name: e.name.clone(),
            file: module_path.to_path_buf(),
            line: e.line as u32,
            context: format!("export {}", e.name),
        })
        .collect();
    
    // Then check each export for usage in the search scope
    let mut dead_exports = Vec::new();
    
    // Get the module stem for re-export checking
    let module_stem = module_path.file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("");
    
    // Find barrel file in same directory that might re-export from this module
    let barrel_path = if let Some(parent) = module_path.parent() {
        let index_files = ["index.ts", "index.js", "index.tsx", "index.jsx"];
        index_files.iter()
            .map(|f| parent.join(f))
            .find(|p| p.exists() && p != module_path)
    } else {
        None
    };
    
    // Get symbols that are re-exported through the barrel file
    let reexported_symbols: Vec<String> = barrel_path.as_ref()
        .map(|p| get_reexported_symbols(p, module_stem))
        .unwrap_or_default();
    
    for export in exports {
        // First: check for direct imports of this symbol
        let is_directly_imported = check_import_in_dir_ast(&export.name, module_path, search_scope)?;
        
        if is_directly_imported {
            continue; // Symbol is used directly
        }
        
        // Second: check if this symbol is re-exported through a barrel file
        if reexported_symbols.contains(&export.name) {
            // Symbol is re-exported - check if the barrel file's consumers import this symbol
            if let Some(ref barrel) = barrel_path {
                let barrel_dir = barrel.parent()
                    .and_then(|p| p.file_name())
                    .and_then(|n| n.to_str())
                    .unwrap_or("");
                
                // Check if anyone imports this symbol from the barrel's directory
                if check_symbol_imported_from_barrel(&export.name, barrel_dir, barrel, search_scope)? {
                    continue; // Symbol is used via re-export
                }
            }
        }
        
        // Symbol is not used anywhere
        dead_exports.push(export);
    }
    
    Ok(DeadExportsReport {
        module_path: module_path.to_path_buf(),
        dead_exports,
        total_exports,
        search_scope: search_scope.to_path_buf(),
        computed_at: Utc::now(),
    })
}

/// Check if a symbol is imported from a barrel file (e.g., import { X } from './core')
fn check_symbol_imported_from_barrel(symbol: &str, barrel_dir: &str, barrel_path: &Path, search_scope: &Path) -> Result<bool, ComputationError> {
    check_barrel_imports_in_dir(symbol, barrel_dir, barrel_path, search_scope)
}

fn check_barrel_imports_in_dir(symbol: &str, barrel_dir: &str, barrel_path: &Path, dir: &Path) -> Result<bool, ComputationError> {
    use super::imports::extract_imports;
    
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return Ok(false),
    };
    
    for entry in entries {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };
        let path = entry.path();
        
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            if name.starts_with('.') || 
               matches!(name, "node_modules" | "target" | "dist" | "build" | ".git") {
                continue;
            }
        }
        
        if !path.exists() {
            continue;
        }
        
        if path.is_dir() {
            if check_barrel_imports_in_dir(symbol, barrel_dir, barrel_path, &path)? {
                return Ok(true);
            }
        } else if path.is_file() && path != *barrel_path {
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
            if matches!(ext, "ts" | "tsx" | "js" | "jsx") {
                // Use tree-sitter to extract imports
                if let Ok(imports) = extract_imports(&path) {
                    for import in imports {
                        // Check if this import is from the barrel directory
                        // e.g., '../core', './core', '../core/index', '../core/index.js'
                        let source_end = import.source.rsplit('/').next().unwrap_or(&import.source);
                        let source_end = source_end
                            .trim_end_matches(".js")
                            .trim_end_matches(".ts")
                            .trim_end_matches("/index");
                        
                        // Check if import source ends with barrel directory or is 'index'
                        let is_barrel_import = source_end == barrel_dir || 
                            source_end == "index" && import.source.contains(barrel_dir) ||
                            import.source.ends_with(&format!("/{}", barrel_dir)) ||
                            import.source.ends_with(&format!("/{}/index", barrel_dir)) ||
                            import.source.ends_with(&format!("/{}/index.js", barrel_dir)) ||
                            import.source.ends_with(&format!("/{}/index.ts", barrel_dir));
                        
                        if is_barrel_import && import.symbols.contains(&symbol.to_string()) {
                            return Ok(true);
                        }
                    }
                }
            }
        }
    }
    
    Ok(false)
}

/// Check directory for direct imports of a symbol using tree-sitter AST parsing
fn check_import_in_dir_ast(symbol: &str, source_file: &Path, dir: &Path) -> Result<bool, ComputationError> {
    use super::imports::extract_imports;
    
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return Ok(false),
    };
    
    for entry in entries {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };
        let path = entry.path();
        
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            if name.starts_with('.') || 
               matches!(name, "node_modules" | "target" | "dist" | "build" | ".git") {
                continue;
            }
        }
        
        if !path.exists() {
            continue;
        }
        
        if path.is_dir() {
            if check_import_in_dir_ast(symbol, source_file, &path)? {
                return Ok(true);
            }
        } else if path.is_file() && path != source_file {
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
            if matches!(ext, "ts" | "tsx" | "js" | "jsx") {
                // Use tree-sitter to extract imports
                if let Ok(imports) = extract_imports(&path) {
                    for import in imports {
                        if import.symbols.contains(&symbol.to_string()) {
                            return Ok(true);
                        }
                    }
                }
            }
        }
    }
    
    Ok(false)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    use std::fs::File;
    use std::io::Write;
    
    #[test]
    fn test_counts_symbol_usages() {
        let dir = tempdir().unwrap();
        
        // Create files with symbol usages
        let file1 = dir.path().join("a.ts");
        File::create(&file1).unwrap().write_all(b"import { validateEmail } from './utils';\nvalidateEmail('test');").unwrap();
        
        let file2 = dir.path().join("b.ts");
        File::create(&file2).unwrap().write_all(b"const result = validateEmail(input);").unwrap();
        
        let evidence = count_usages("validateEmail", dir.path()).unwrap();
        
        assert_eq!(evidence.usage_count, 3);
        assert_eq!(evidence.symbol, "validateEmail");
    }
    
    #[test]
    fn test_zero_usages() {
        let dir = tempdir().unwrap();
        
        let file = dir.path().join("a.ts");
        File::create(&file).unwrap().write_all(b"const x = 1;").unwrap();
        
        let evidence = count_usages("nonExistentSymbol", dir.path()).unwrap();
        
        assert_eq!(evidence.usage_count, 0);
        assert!(!evidence.earns_existence(1));
    }
    
    #[test]
    fn test_word_boundary_matching() {
        assert!(contains_symbol("validateEmail()", "validateEmail"));
        assert!(contains_symbol("import { validateEmail }", "validateEmail"));
        assert!(!contains_symbol("validateEmailAddress", "validateEmail")); // Partial match
    }
    
    #[test]
    fn test_distinguishes_definition_from_usage() {
        let dir = tempdir().unwrap();
        
        // Create a file with both definition and usage
        let file = dir.path().join("utils.ts");
        File::create(&file).unwrap().write_all(br#"
export function validateEmail(email: string): boolean {
    return email.includes('@');
}

// Self-referential usage within the same file
const isValid = validateEmail('test@example.com');
"#).unwrap();
        
        let evidence = count_usages("validateEmail", dir.path()).unwrap();
        
        // Should have 2 occurrences total
        assert_eq!(evidence.usage_count, 2);
        // 1 is a definition
        assert_eq!(evidence.definition_count, 1);
        // 1 is actual usage
        assert_eq!(evidence.actual_usage_count, 1);
    }
    
    #[test]
    fn test_exported_but_unused() {
        let dir = tempdir().unwrap();
        
        // Create a file with only a definition (export but no usage)
        let file = dir.path().join("types.ts");
        File::create(&file).unwrap().write_all(br#"
export interface BeadsNotionConfig {
    apiKey: string;
    databaseId: string;
}
"#).unwrap();
        
        let evidence = count_usages("BeadsNotionConfig", dir.path()).unwrap();
        
        // Only 1 occurrence (the definition)
        assert_eq!(evidence.usage_count, 1);
        assert_eq!(evidence.definition_count, 1);
        assert_eq!(evidence.actual_usage_count, 0);
        
        // Should be flagged as exported-but-unused
        assert!(evidence.is_exported_but_unused());
        // Should NOT "earn existence" with min_usage = 1
        // because actual_usage_count is 0
        assert!(!evidence.earns_existence(1));
    }
    
    #[test]
    fn test_definition_detection() {
        // Function declarations
        assert!(is_definition_line("export function validateEmail()", "validateEmail"));
        assert!(is_definition_line("function validateEmail()", "validateEmail"));
        assert!(is_definition_line("export async function fetchData()", "fetchData"));
        
        // Class/interface/type declarations
        assert!(is_definition_line("export interface Config {", "Config"));
        assert!(is_definition_line("export type Status = 'ok' | 'error';", "Status"));
        assert!(is_definition_line("export class Service {", "Service"));
        
        // Const declarations
        assert!(is_definition_line("export const MY_CONST = 42;", "MY_CONST"));
        assert!(is_definition_line("const helper = () => {};", "helper"));
        
        // NOT definitions (usages)
        assert!(!is_definition_line("const result = validateEmail(input);", "validateEmail"));
        assert!(!is_definition_line("import { validateEmail } from './utils';", "validateEmail"));
    }
    
    #[test]
    fn test_reexport_chain_detection() {
        // Test the exact WORKWAY scenario:
        // security.ts exports verifyHmacSignature
        // core/index.ts re-exports from ./security.js
        // docusign/index.ts imports from ../core/index.js
        // Result: security.ts::verifyHmacSignature should NOT be dead
        
        let dir = tempdir().unwrap();
        
        // Create core directory structure
        let core_dir = dir.path().join("core");
        fs::create_dir(&core_dir).unwrap();
        
        // security.ts - the source file
        let security = core_dir.join("security.ts");
        File::create(&security).unwrap().write_all(br#"
export function verifyHmacSignature(data: string): boolean {
    return true;
}

export function secureCompare(a: string, b: string): boolean {
    return a === b;
}
"#).unwrap();
        
        // core/index.ts - the barrel file that re-exports
        let core_index = core_dir.join("index.ts");
        File::create(&core_index).unwrap().write_all(br#"
export { verifyHmacSignature, secureCompare } from './security.js';
"#).unwrap();
        
        // Create docusign directory
        let docusign_dir = dir.path().join("docusign");
        fs::create_dir(&docusign_dir).unwrap();
        
        // docusign/index.ts - consumes via barrel import
        let docusign_index = docusign_dir.join("index.ts");
        File::create(&docusign_index).unwrap().write_all(br#"
import { verifyHmacSignature } from '../core/index.js';

export function handleWebhook(data: string): boolean {
    return verifyHmacSignature(data);
}
"#).unwrap();
        
        // Now test: security.ts exports should NOT be dead
        let report = find_dead_exports(&security, dir.path()).unwrap();
        
        // verifyHmacSignature is used via barrel - should NOT be dead
        let dead_names: Vec<&str> = report.dead_exports.iter().map(|e| e.name.as_str()).collect();
        
        assert!(!dead_names.contains(&"verifyHmacSignature"), 
            "verifyHmacSignature should NOT be dead - it's used via re-export chain. Dead: {:?}", dead_names);
        
        // secureCompare is NOT imported anywhere - should be dead
        assert!(dead_names.contains(&"secureCompare"),
            "secureCompare SHOULD be dead - nothing imports it. Dead: {:?}", dead_names);
    }
}
