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
}

/// Type of usage location
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum UsageType {
    /// Definition site (export, function, class, interface, type)
    Definition,
    /// Actual usage (call, reference, import from another file)
    Usage,
}

impl UsageEvidence {
    /// Check if this symbol "earns existence" (has minimum actual usages, not counting definitions)
    pub fn earns_existence(&self, min_usage: u32) -> bool {
        self.actual_usage_count >= min_usage
    }
    
    /// Check if symbol is only defined but never actually used
    pub fn is_defined_but_unused(&self) -> bool {
        self.definition_count > 0 && self.actual_usage_count == 0
    }
    
    /// Check if symbol appears to be exported but never imported elsewhere
    pub fn is_exported_but_unused(&self) -> bool {
        // If we have definitions (including exports) but no actual usages,
        // this is an exported-but-unused symbol
        self.definition_count > 0 && self.actual_usage_count == 0
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
    
    // Count definitions vs actual usages
    let definition_count = locations.iter().filter(|l| l.is_definition).count() as u32;
    let actual_usage_count = locations.iter().filter(|l| !l.is_definition).count() as u32;
    
    Ok(UsageEvidence {
        id: Uuid::new_v4(),
        symbol: symbol.to_string(),
        search_path: search_path.to_path_buf(),
        usage_count: locations.len() as u32,
        definition_count,
        actual_usage_count,
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
            let is_definition = is_definition_line(line, symbol);
            
            locations.push(UsageLocation {
                file: path.to_path_buf(),
                line: (line_num + 1) as u32,
                column,
                context: line.trim().to_string(),
                is_definition,
            });
        }
    }
    
    Ok(())
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
    // First, extract all exports from the module
    let exports = extract_exports(module_path)?;
    let total_exports = exports.len() as u32;
    
    // Then check each export for usage in the search scope
    let mut dead_exports = Vec::new();
    
    for export in exports {
        // Count usages of this symbol (excluding the definition file)
        let is_used = check_import_usage(&export.name, module_path, search_scope)?;
        
        if !is_used {
            dead_exports.push(export);
        }
    }
    
    Ok(DeadExportsReport {
        module_path: module_path.to_path_buf(),
        dead_exports,
        total_exports,
        search_scope: search_scope.to_path_buf(),
        computed_at: Utc::now(),
    })
}

/// Extract all exports from a TypeScript/JavaScript module
fn extract_exports(module_path: &Path) -> Result<Vec<DeadExport>, ComputationError> {
    let content = fs::read_to_string(module_path)?;
    let mut exports = Vec::new();
    
    for (line_num, line) in content.lines().enumerate() {
        let trimmed = line.trim();
        
        // Named exports: export function foo, export const foo, etc.
        if let Some(name) = extract_named_export(trimmed) {
            exports.push(DeadExport {
                name,
                file: module_path.to_path_buf(),
                line: (line_num + 1) as u32,
                context: trimmed.to_string(),
            });
        }
        
        // Export statements: export { foo, bar }
        if trimmed.starts_with("export {") || trimmed.starts_with("export{") {
            let names = extract_export_list(trimmed);
            for name in names {
                exports.push(DeadExport {
                    name,
                    file: module_path.to_path_buf(),
                    line: (line_num + 1) as u32,
                    context: trimmed.to_string(),
                });
            }
        }
    }
    
    Ok(exports)
}

/// Extract the exported name from a named export line
fn extract_named_export(line: &str) -> Option<String> {
    // Patterns: export function NAME, export const NAME, export class NAME, etc.
    let prefixes = [
        "export function ",
        "export async function ",
        "export const ",
        "export let ",
        "export var ",
        "export class ",
        "export interface ",
        "export type ",
        "export enum ",
        "export abstract class ",
    ];
    
    for prefix in prefixes {
        if line.starts_with(prefix) {
            let rest = &line[prefix.len()..];
            // Extract identifier (stops at space, <, (, =, {, :)
            let name: String = rest.chars()
                .take_while(|c| c.is_alphanumeric() || *c == '_')
                .collect();
            if !name.is_empty() {
                return Some(name);
            }
        }
    }
    
    // export default is usually unnamed, skip
    // export * from is re-export, skip
    
    None
}

/// Extract names from export { foo, bar, baz as qux }
fn extract_export_list(line: &str) -> Vec<String> {
    let mut names = Vec::new();
    
    // Find content between { and }
    if let Some(start) = line.find('{') {
        if let Some(end) = line.find('}') {
            // Safety: ensure valid slice bounds
            if end > start + 1 {
                let content = &line[start + 1..end];
                
                for part in content.split(',') {
                    let part = part.trim();
                    
                    // Handle "foo as bar" - use the original name (foo)
                    let name = if part.contains(" as ") {
                        part.split(" as ").next().unwrap_or(part).trim()
                    } else {
                        part
                    };
                    
                    if !name.is_empty() && name != "type" {
                        names.push(name.to_string());
                    }
                }
            }
        }
    }
    
    names
}

/// Check if a symbol is imported anywhere in the search scope (excluding source file)
/// Also traces re-exports through barrel files (index.ts)
fn check_import_usage(symbol: &str, source_file: &Path, search_scope: &Path) -> Result<bool, ComputationError> {
    // First check for direct imports of the symbol
    if check_import_in_dir(symbol, source_file, search_scope)? {
        return Ok(true);
    }
    
    // If not found directly, check if this module is re-exported by a barrel file
    // and if so, check for imports through that barrel file
    if let Some(parent) = source_file.parent() {
        let index_files = ["index.ts", "index.js", "index.tsx", "index.jsx"];
        
        for index_name in &index_files {
            let index_path = parent.join(index_name);
            if index_path.exists() && index_path != source_file {
                if let Ok(index_content) = fs::read_to_string(&index_path) {
                    // Check if this index file re-exports from our source file
                    let source_stem = source_file.file_stem()
                        .and_then(|s| s.to_str())
                        .unwrap_or("");
                    
                    if reexports_from(&index_content, source_stem) {
                        // The index file re-exports from our source.
                        // Now check if anyone imports the symbol from the index file's directory
                        let dir_name = parent.file_name()
                            .and_then(|n| n.to_str())
                            .unwrap_or("");
                        
                        // Search for imports like: import { symbol } from './core' or '../core'
                        if check_reexport_usage(symbol, dir_name, &index_path, search_scope)? {
                            return Ok(true);
                        }
                    }
                }
            }
        }
    }
    
    Ok(false)
}

/// Check if an index file re-exports from a specific module
fn reexports_from(index_content: &str, module_stem: &str) -> bool {
    for line in index_content.lines() {
        let trimmed = line.trim();
        
        // export * from './module'
        // export { foo } from './module'
        // export type { Foo } from './module'
        if (trimmed.starts_with("export") || trimmed.starts_with("}")) && trimmed.contains("from") {
            // Extract the path
            if let Some(path) = extract_from_path(trimmed) {
                let path_stem = path.trim_start_matches("./")
                    .trim_end_matches(".js")
                    .trim_end_matches(".ts")
                    .trim_end_matches(".tsx")
                    .trim_end_matches(".jsx");
                
                if path_stem == module_stem {
                    return true;
                }
            }
        }
    }
    false
}

/// Extract the path from a "from './path'" statement
fn extract_from_path(line: &str) -> Option<String> {
    let from_pos = line.find("from")?;
    let after_from = &line[from_pos + 4..];
    
    let quote_char = if after_from.contains('\'') { '\'' } else { '"' };
    let start = after_from.find(quote_char)? + 1;
    let rest = &after_from[start..];
    let end = rest.find(quote_char)?;
    
    Some(rest[..end].to_string())
}

/// Check if a symbol is imported through a barrel file (index.ts)
fn check_reexport_usage(symbol: &str, dir_name: &str, index_path: &Path, search_scope: &Path) -> Result<bool, ComputationError> {
    check_reexport_in_dir(symbol, dir_name, index_path, search_scope)
}

fn check_reexport_in_dir(symbol: &str, dir_name: &str, index_path: &Path, dir: &Path) -> Result<bool, ComputationError> {
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
            if check_reexport_in_dir(symbol, dir_name, index_path, &path)? {
                return Ok(true);
            }
        } else if path.is_file() && path != *index_path {
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
            if matches!(ext, "ts" | "tsx" | "js" | "jsx") {
                if let Ok(content) = fs::read_to_string(&path) {
                    // Check for import of symbol from the directory (barrel import)
                    // e.g., import { verifyHmacSignature } from './core'
                    // e.g., import { verifyHmacSignature } from '../core'
                    if imports_symbol_from_dir(&content, symbol, dir_name) {
                        return Ok(true);
                    }
                }
            }
        }
    }
    
    Ok(false)
}

/// Check if content imports a symbol from a directory (barrel import)
fn imports_symbol_from_dir(content: &str, symbol: &str, dir_name: &str) -> bool {
    for line in content.lines() {
        let trimmed = line.trim();
        
        // Must be an import that contains the symbol
        if !trimmed.contains(symbol) {
            continue;
        }
        
        // Check for import statements or multi-line closing
        if trimmed.starts_with("import") || (trimmed.starts_with('}') && trimmed.contains("from")) {
            // Extract the import path
            if let Some(import_path) = extract_from_path(trimmed) {
                // Check if the path ends with our directory name
                // e.g., './core', '../core', '../../lib/core'
                let path_end = import_path.rsplit('/').next().unwrap_or(&import_path);
                let path_end = path_end
                    .trim_end_matches(".js")
                    .trim_end_matches(".ts")
                    .trim_end_matches("/index.js")
                    .trim_end_matches("/index.ts")
                    .trim_end_matches("/index");
                
                if path_end == dir_name {
                    // Path matches, now check if the symbol is in the import list
                    if let Some(brace_start) = trimmed.find('{') {
                        if let Some(brace_end) = trimmed.find('}') {
                            if brace_end > brace_start + 1 {
                                let import_list = &trimmed[brace_start + 1..brace_end];
                                for part in import_list.split(',') {
                                    let part = part.trim();
                                    let name = if part.contains(" as ") {
                                        part.split(" as ").next().unwrap_or(part).trim()
                                    } else {
                                        part
                                    };
                                    if name == symbol {
                                        return true;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    false
}

fn check_import_in_dir(symbol: &str, source_file: &Path, dir: &Path) -> Result<bool, ComputationError> {
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
        
        // Skip hidden, node_modules, dist, etc.
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
            if check_import_in_dir(symbol, source_file, &path)? {
                return Ok(true);
            }
        } else if path.is_file() && path != source_file {
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
            if matches!(ext, "ts" | "tsx" | "js" | "jsx") {
                if let Ok(content) = fs::read_to_string(&path) {
                    // Check for import of this symbol
                    if imports_symbol(&content, symbol) {
                        return Ok(true);
                    }
                }
            }
        }
    }
    
    Ok(false)
}

/// Check if content imports a specific symbol
fn imports_symbol(content: &str, symbol: &str) -> bool {
    for line in content.lines() {
        let trimmed = line.trim();
        
        // import { symbol } from '...'
        // import { foo, symbol, bar } from '...'
        // import { original as symbol } from '...'
        if trimmed.starts_with("import") && trimmed.contains(symbol) {
            // Check it's in the import list, not just the path
            if let Some(brace_start) = trimmed.find('{') {
                if let Some(brace_end) = trimmed.find('}') {
                    // Safety: ensure valid slice bounds (brace_end must be after brace_start + 1)
                    if brace_end > brace_start + 1 {
                        let import_list = &trimmed[brace_start + 1..brace_end];
                        // Check for exact symbol (with word boundaries)
                        for part in import_list.split(',') {
                            let part = part.trim();
                            // Handle "original as alias"
                            let imported_name = if part.contains(" as ") {
                                // "symbol as alias" or "original as symbol"
                                let parts: Vec<&str> = part.split(" as ").collect();
                                if parts.len() == 2 {
                                    // Both the original and alias could match
                                    if parts[0].trim() == symbol || parts[1].trim() == symbol {
                                        return true;
                                    }
                                }
                                continue;
                            } else {
                                part
                            };
                            
                            if imported_name == symbol {
                                return true;
                            }
                        }
                    }
                }
            }
            
            // import symbol from '...' (default import)
            // This is trickier - would need to match the default export
        }
        
        // Dynamic imports: const { symbol } = await import('...')
        if trimmed.contains("import(") && trimmed.contains(symbol) {
            // Simplified check - ensure brace_end > brace_start to avoid slicing panic
            if let Some(brace_start) = trimmed.find('{') {
                if let Some(brace_end) = trimmed.find('}') {
                    // Safety: ensure valid slice bounds
                    if brace_end > brace_start + 1 {
                        let destructure = &trimmed[brace_start + 1..brace_end];
                        for part in destructure.split(',') {
                            if part.trim() == symbol {
                                return true;
                            }
                        }
                    }
                }
            }
        }
    }
    
    false
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
}
