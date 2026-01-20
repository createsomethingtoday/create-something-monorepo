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
