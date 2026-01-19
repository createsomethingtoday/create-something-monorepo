//! Connectivity Computation (Heidegger Level)
//!
//! Analyzes how modules connect to the rest of the system.
//! A module "serves the whole" if it's connected.

use std::path::{Path, PathBuf};
use std::fs;
use serde::{Serialize, Deserialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

use super::ComputationError;

/// Evidence of computed connectivity for a module
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectivityEvidence {
    /// Unique identifier for this computation
    pub id: Uuid,
    
    /// The module being analyzed
    pub module_path: PathBuf,
    
    /// Whether this module is connected to the system
    pub is_connected: bool,
    
    /// Number of incoming connections (who imports this)
    pub incoming_connections: u32,
    
    /// Number of outgoing connections (what this imports)
    pub outgoing_connections: u32,
    
    /// Files that import this module
    pub imported_by: Vec<PathBuf>,
    
    /// Files that this module imports
    pub imports: Vec<PathBuf>,
    
    /// When this computation was performed
    pub computed_at: DateTime<Utc>,
}

impl ConnectivityEvidence {
    /// Check if this module "serves the whole" (has minimum connections)
    pub fn serves_whole(&self, min_connections: u32) -> bool {
        self.incoming_connections >= min_connections || self.outgoing_connections >= min_connections
    }
    
    /// Total connections (in + out)
    pub fn total_connections(&self) -> u32 {
        self.incoming_connections + self.outgoing_connections
    }
}

/// Analyze connectivity of a module
pub fn analyze_connectivity(module_path: &Path) -> Result<ConnectivityEvidence, ComputationError> {
    if !module_path.exists() {
        return Err(ComputationError::FileNotFound(module_path.to_path_buf()));
    }
    
    // Find the project root (look for package.json, Cargo.toml, etc.)
    let project_root = find_project_root(module_path)?;
    
    // Analyze what this module imports
    let imports = analyze_imports(module_path)?;
    
    // Analyze who imports this module
    let imported_by = find_importers(module_path, &project_root)?;
    
    let incoming_connections = imported_by.len() as u32;
    let outgoing_connections = imports.len() as u32;
    let is_connected = incoming_connections > 0 || outgoing_connections > 0;
    
    Ok(ConnectivityEvidence {
        id: Uuid::new_v4(),
        module_path: module_path.to_path_buf(),
        is_connected,
        incoming_connections,
        outgoing_connections,
        imported_by,
        imports,
        computed_at: Utc::now(),
    })
}

fn find_project_root(start: &Path) -> Result<PathBuf, ComputationError> {
    let mut current = start.parent().unwrap_or(start);
    
    loop {
        // Check for common project markers
        for marker in &["package.json", "Cargo.toml", "pyproject.toml", "go.mod"] {
            if current.join(marker).exists() {
                return Ok(current.to_path_buf());
            }
        }
        
        match current.parent() {
            Some(parent) => current = parent,
            None => return Ok(start.parent().unwrap_or(start).to_path_buf()),
        }
    }
}

fn analyze_imports(file_path: &Path) -> Result<Vec<PathBuf>, ComputationError> {
    let content = fs::read_to_string(file_path)?;
    let mut imports = Vec::new();
    
    // Simple regex-free import detection for TypeScript/JavaScript
    for line in content.lines() {
        let line = line.trim();
        
        // import ... from '...'
        if line.starts_with("import") && line.contains("from") {
            if let Some(path) = extract_import_path(line) {
                if path.starts_with('.') {
                    // Relative import - resolve to absolute
                    if let Some(parent) = file_path.parent() {
                        let resolved = parent.join(&path);
                        imports.push(resolved);
                    }
                }
            }
        }
        
        // require('...')
        if line.contains("require(") {
            if let Some(path) = extract_require_path(line) {
                if path.starts_with('.') {
                    if let Some(parent) = file_path.parent() {
                        let resolved = parent.join(&path);
                        imports.push(resolved);
                    }
                }
            }
        }
    }
    
    Ok(imports)
}

fn extract_import_path(line: &str) -> Option<String> {
    // Find content between quotes after "from"
    let from_pos = line.find("from")?;
    let after_from = &line[from_pos + 4..];
    
    let quote_char = if after_from.contains('\'') { '\'' } else { '"' };
    let start = after_from.find(quote_char)? + 1;
    let rest = &after_from[start..];
    let end = rest.find(quote_char)?;
    
    Some(rest[..end].to_string())
}

fn extract_require_path(line: &str) -> Option<String> {
    let start = line.find("require(")? + 8;
    let rest = &line[start..];
    
    let quote_char = if rest.starts_with('\'') { '\'' } else { '"' };
    let content_start = rest.find(quote_char)? + 1;
    let content = &rest[content_start..];
    let end = content.find(quote_char)?;
    
    Some(content[..end].to_string())
}

fn find_importers(module_path: &Path, project_root: &Path) -> Result<Vec<PathBuf>, ComputationError> {
    let mut importers = Vec::new();
    let module_name = module_path.file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("");
    
    find_importers_recursive(module_path, module_name, project_root, &mut importers)?;
    
    Ok(importers)
}

fn find_importers_recursive(
    target: &Path,
    module_name: &str,
    dir: &Path,
    importers: &mut Vec<PathBuf>,
) -> Result<(), ComputationError> {
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        
        // Skip hidden and generated directories
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            if name.starts_with('.') || matches!(name, "node_modules" | "target" | "dist" | "build") {
                continue;
            }
        }
        
        if path.is_dir() {
            find_importers_recursive(target, module_name, &path, importers)?;
        } else if path.is_file() && path != target {
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
            if matches!(ext, "ts" | "tsx" | "js" | "jsx") {
                if let Ok(content) = fs::read_to_string(&path) {
                    // Check if this file imports our target module
                    if content.contains(module_name) && 
                       (content.contains(&format!("from './{}'", module_name)) ||
                        content.contains(&format!("from \"./{}\"", module_name)) ||
                        content.contains(&format!("from '../{}'", module_name)) ||
                        content.contains(&format!("require('./{}')", module_name))) {
                        importers.push(path);
                    }
                }
            }
        }
    }
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    use std::fs::{File, create_dir};
    use std::io::Write;
    
    #[test]
    fn test_connected_module() {
        let dir = tempdir().unwrap();
        
        // Create package.json to mark project root
        File::create(dir.path().join("package.json")).unwrap()
            .write_all(b"{}").unwrap();
        
        // Create a module
        let utils = dir.path().join("utils.ts");
        File::create(&utils).unwrap()
            .write_all(b"export function validate() {}").unwrap();
        
        // Create a file that imports it
        let main = dir.path().join("main.ts");
        File::create(&main).unwrap()
            .write_all(b"import { validate } from './utils';\nvalidate();").unwrap();
        
        let evidence = analyze_connectivity(&utils).unwrap();
        
        assert!(evidence.is_connected);
        assert!(evidence.incoming_connections >= 1);
    }
    
    #[test]
    fn test_isolated_module() {
        let dir = tempdir().unwrap();
        
        // Create package.json
        File::create(dir.path().join("package.json")).unwrap()
            .write_all(b"{}").unwrap();
        
        // Create an isolated module (nothing imports it)
        let orphan = dir.path().join("orphan.ts");
        File::create(&orphan).unwrap()
            .write_all(b"export function unused() {}").unwrap();
        
        let evidence = analyze_connectivity(&orphan).unwrap();
        
        // No incoming connections (nothing imports this)
        assert_eq!(evidence.incoming_connections, 0);
    }
}
