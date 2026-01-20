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
    
    /// Total number of usages found
    pub usage_count: u32,
    
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
}

impl UsageEvidence {
    /// Check if this symbol "earns existence" (has minimum usages)
    pub fn earns_existence(&self, min_usage: u32) -> bool {
        self.usage_count >= min_usage
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
    
    Ok(UsageEvidence {
        id: Uuid::new_v4(),
        symbol: symbol.to_string(),
        search_path: search_path.to_path_buf(),
        usage_count: locations.len() as u32,
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
            locations.push(UsageLocation {
                file: path.to_path_buf(),
                line: (line_num + 1) as u32,
                column,
                context: line.trim().to_string(),
            });
        }
    }
    
    Ok(())
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
}
