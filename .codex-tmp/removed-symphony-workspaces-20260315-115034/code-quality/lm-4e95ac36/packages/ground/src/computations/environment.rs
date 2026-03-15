//! Environment Safety Analysis
//!
//! Heideggerian principle: Reveal what's hidden.
//! Environment mismatches are invisible until runtime - this makes them visible.
//!
//! The hermeneutic circle: understand parts (modules) through the whole
//! (entry point's environment), and the whole through its parts (reachable APIs).

use std::collections::{HashMap, HashSet, VecDeque};
use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;

use super::ComputationError;

/// Workers-only APIs that will fail in Node.js
const WORKERS_APIS: &[(&str, &str)] = &[
    // Cache API
    ("caches.default", "Cache API - Workers only"),
    ("caches.open", "Cache API - Workers only"),
    
    // Environment bindings
    ("env.KV", "KV namespace binding"),
    ("env.R2", "R2 bucket binding"),
    ("env.D1", "D1 database binding"),
    ("env.AI", "Workers AI binding"),
    ("env.VECTORIZE", "Vectorize binding"),
    ("env.QUEUE", "Queue binding"),
    ("env.DO", "Durable Object binding"),
    
    // Execution context
    ("ctx.waitUntil", "Execution context - Workers only"),
    ("waitUntil(", "Execution context - Workers only"),
    ("ctx.passThroughOnException", "Execution context - Workers only"),
    
    // Workers-specific globals
    ("HTMLRewriter", "HTMLRewriter - Workers only"),
    ("WebSocketPair", "WebSocketPair - Workers only"),
    
    // Subtle crypto differences (exists in Node but behavior differs)
    // ("crypto.subtle", "Behavior differs between Workers and Node"),
];

/// Node.js-only APIs that will fail in Workers
const NODE_APIS: &[(&str, &str)] = &[
    ("require('fs')", "Node.js fs module"),
    ("require('path')", "Node.js path module - use import instead"),
    ("require('child_process')", "Node.js child_process"),
    ("process.env", "Node.js process.env - use env bindings in Workers"),
    ("__dirname", "Node.js __dirname - not available in Workers"),
    ("__filename", "Node.js __filename - not available in Workers"),
    ("Buffer.from", "Node.js Buffer - use Uint8Array in Workers"),
];

/// Detected runtime environment
#[derive(Debug, Clone, PartialEq)]
pub enum RuntimeEnvironment {
    /// Node.js entry point (CLI, script)
    Node,
    /// Cloudflare Workers entry point
    Workers,
    /// Universal - no environment-specific APIs
    Universal,
    /// Unknown - couldn't determine
    Unknown,
}

/// A detected API usage that's environment-specific
#[derive(Debug, Clone)]
pub struct ApiUsage {
    pub api: String,
    pub description: String,
    pub file: PathBuf,
    pub line: u32,
    pub environment: RuntimeEnvironment,
}

/// Import chain showing how an API is reachable
#[derive(Debug, Clone)]
pub struct ImportChain {
    pub chain: Vec<PathBuf>,
    pub api_usage: ApiUsage,
}

/// Evidence of environment safety analysis
#[derive(Debug)]
pub struct EnvironmentEvidence {
    pub id: String,
    pub entry_point: PathBuf,
    pub entry_environment: RuntimeEnvironment,
    pub reachable_modules: Vec<PathBuf>,
    pub api_usages: Vec<ImportChain>,
    pub is_safe: bool,
    pub warnings: Vec<EnvironmentWarning>,
}

/// Warning about environment mismatch
#[derive(Debug, Clone)]
pub struct EnvironmentWarning {
    pub severity: WarningSeverity,
    pub message: String,
    pub import_chain: Vec<PathBuf>,
    pub api: String,
    pub suggestion: String,
}

#[derive(Debug, Clone, PartialEq)]
pub enum WarningSeverity {
    Error,   // Will definitely fail at runtime
    Warning, // Might fail depending on code path
    Info,    // Informational
}

/// Analyze environment safety from an entry point
pub fn analyze_environment_safety(entry_point: &Path) -> Result<EnvironmentEvidence, ComputationError> {
    let entry_point = entry_point.canonicalize()
        .map_err(|_| ComputationError::FileNotFound(entry_point.to_path_buf()))?;
    
    // Determine entry point's environment
    let entry_environment = detect_entry_environment(&entry_point);
    
    // Build import graph (BFS from entry point)
    let reachable_modules = build_import_graph(&entry_point)?;
    
    // Scan all reachable modules for environment-specific APIs
    let mut api_usages = Vec::new();
    for module in &reachable_modules {
        if let Ok(usages) = scan_for_apis(module) {
            for usage in usages {
                // Build the import chain from entry to this usage
                let chain = find_import_chain(&entry_point, &usage.file, &reachable_modules);
                api_usages.push(ImportChain {
                    chain,
                    api_usage: usage,
                });
            }
        }
    }
    
    // Generate warnings for mismatches
    let warnings = generate_warnings(&entry_environment, &api_usages);
    let is_safe = warnings.iter().all(|w| w.severity != WarningSeverity::Error);
    
    Ok(EnvironmentEvidence {
        id: Uuid::new_v4().to_string(),
        entry_point,
        entry_environment,
        reachable_modules,
        api_usages,
        is_safe,
        warnings,
    })
}

/// Detect the runtime environment of an entry point
fn detect_entry_environment(entry_point: &Path) -> RuntimeEnvironment {
    // Check for wrangler.toml in parent directories
    let mut current = entry_point.parent();
    while let Some(dir) = current {
        if dir.join("wrangler.toml").exists() || dir.join("wrangler.jsonc").exists() {
            return RuntimeEnvironment::Workers;
        }
        
        // Check package.json for bin field (Node.js CLI)
        let pkg_json = dir.join("package.json");
        if pkg_json.exists() {
            if let Ok(content) = fs::read_to_string(&pkg_json) {
                if content.contains("\"bin\"") {
                    return RuntimeEnvironment::Node;
                }
            }
        }
        
        current = dir.parent();
    }
    
    RuntimeEnvironment::Unknown
}

/// Build import graph using BFS from entry point
fn build_import_graph(entry_point: &Path) -> Result<Vec<PathBuf>, ComputationError> {
    let mut visited = HashSet::new();
    let mut queue = VecDeque::new();
    let mut result = Vec::new();
    
    queue.push_back(entry_point.to_path_buf());
    visited.insert(entry_point.to_path_buf());
    
    while let Some(current) = queue.pop_front() {
        result.push(current.clone());
        
        // Extract imports from this file
        let imports = extract_imports(&current)?;
        
        for import_path in imports {
            // Resolve the import to an actual file
            if let Some(resolved) = resolve_import(&current, &import_path) {
                if !visited.contains(&resolved) {
                    visited.insert(resolved.clone());
                    queue.push_back(resolved);
                }
            }
        }
    }
    
    Ok(result)
}

/// Extract import paths from a file
fn extract_imports(file_path: &Path) -> Result<Vec<String>, ComputationError> {
    let content = fs::read_to_string(file_path)?;
    let mut imports = Vec::new();
    
    for line in content.lines() {
        let line = line.trim();
        
        // import ... from '...'
        if line.starts_with("import") && line.contains("from") {
            if let Some(path) = extract_import_path(line) {
                // Only follow relative imports (not npm packages)
                if path.starts_with('.') {
                    imports.push(path);
                }
            }
        }
        
        // export ... from '...'
        if line.starts_with("export") && line.contains("from") {
            if let Some(path) = extract_import_path(line) {
                if path.starts_with('.') {
                    imports.push(path);
                }
            }
        }
        
        // Dynamic import: import('...')
        if line.contains("import(") {
            if let Some(start) = line.find("import(") {
                let rest = &line[start + 7..];
                if let Some(path) = extract_quoted_string(rest) {
                    if path.starts_with('.') {
                        imports.push(path);
                    }
                }
            }
        }
        
        // require('...')
        if line.contains("require(") {
            if let Some(start) = line.find("require(") {
                let rest = &line[start + 8..];
                if let Some(path) = extract_quoted_string(rest) {
                    if path.starts_with('.') {
                        imports.push(path);
                    }
                }
            }
        }
    }
    
    Ok(imports)
}

fn extract_import_path(line: &str) -> Option<String> {
    let after_from = line.split("from").nth(1)?;
    extract_quoted_string(after_from.trim())
}

fn extract_quoted_string(s: &str) -> Option<String> {
    let quote_char = if s.starts_with('\'') {
        '\''
    } else if s.starts_with('"') {
        '"'
    } else if s.starts_with('`') {
        '`'
    } else {
        return None;
    };
    
    let start = s.find(quote_char)? + 1;
    let rest = &s[start..];
    let end = rest.find(quote_char)?;
    
    Some(rest[..end].to_string())
}

/// Resolve an import path to an actual file
fn resolve_import(from_file: &Path, import_path: &str) -> Option<PathBuf> {
    let parent = from_file.parent()?;
    let base = parent.join(import_path);
    
    // Try various extensions
    let extensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ""];
    
    for ext in &extensions {
        // Handle .js -> .ts resolution (ESM style)
        let path_without_js = if import_path.ends_with(".js") {
            import_path.trim_end_matches(".js")
        } else {
            import_path
        };
        
        let candidate = parent.join(format!("{}{}", path_without_js, ext));
        if candidate.exists() {
            return candidate.canonicalize().ok();
        }
        
        // Try index file
        let index_candidate = parent.join(path_without_js).join(format!("index{}", ext));
        if index_candidate.exists() {
            return index_candidate.canonicalize().ok();
        }
    }
    
    // Try the exact path
    if base.exists() {
        return base.canonicalize().ok();
    }
    
    None
}

/// Scan a file for environment-specific APIs
fn scan_for_apis(file_path: &Path) -> Result<Vec<ApiUsage>, ComputationError> {
    let content = fs::read_to_string(file_path)?;
    let mut usages = Vec::new();
    
    for (line_num, line) in content.lines().enumerate() {
        // Check Workers APIs
        for (api, description) in WORKERS_APIS {
            if line.contains(api) {
                usages.push(ApiUsage {
                    api: api.to_string(),
                    description: description.to_string(),
                    file: file_path.to_path_buf(),
                    line: (line_num + 1) as u32,
                    environment: RuntimeEnvironment::Workers,
                });
            }
        }
        
        // Check Node APIs
        for (api, description) in NODE_APIS {
            if line.contains(api) {
                usages.push(ApiUsage {
                    api: api.to_string(),
                    description: description.to_string(),
                    file: file_path.to_path_buf(),
                    line: (line_num + 1) as u32,
                    environment: RuntimeEnvironment::Node,
                });
            }
        }
    }
    
    Ok(usages)
}

/// Find the import chain from entry point to a target file
fn find_import_chain(entry: &Path, target: &Path, all_modules: &[PathBuf]) -> Vec<PathBuf> {
    // Simple BFS to find shortest path
    let mut visited = HashSet::new();
    let mut queue = VecDeque::new();
    let mut parent: HashMap<PathBuf, PathBuf> = HashMap::new();
    
    queue.push_back(entry.to_path_buf());
    visited.insert(entry.to_path_buf());
    
    while let Some(current) = queue.pop_front() {
        if current == target {
            // Reconstruct path
            let mut chain = vec![current.clone()];
            let mut node = &current;
            while let Some(p) = parent.get(node) {
                chain.push(p.clone());
                node = p;
            }
            chain.reverse();
            return chain;
        }
        
        // Get imports from current file
        if let Ok(imports) = extract_imports(&current) {
            for import_path in imports {
                if let Some(resolved) = resolve_import(&current, &import_path) {
                    if !visited.contains(&resolved) && all_modules.contains(&resolved) {
                        visited.insert(resolved.clone());
                        parent.insert(resolved.clone(), current.clone());
                        queue.push_back(resolved);
                    }
                }
            }
        }
    }
    
    // Fallback: just return entry and target
    vec![entry.to_path_buf(), target.to_path_buf()]
}

/// Generate warnings for environment mismatches
fn generate_warnings(entry_env: &RuntimeEnvironment, api_usages: &[ImportChain]) -> Vec<EnvironmentWarning> {
    let mut warnings = Vec::new();
    
    for usage in api_usages {
        let api_env = &usage.api_usage.environment;
        
        // Check for mismatches
        let mismatch = match (entry_env, api_env) {
            (RuntimeEnvironment::Node, RuntimeEnvironment::Workers) => true,
            (RuntimeEnvironment::Workers, RuntimeEnvironment::Node) => true,
            _ => false,
        };
        
        if mismatch {
            let (severity, suggestion) = match (entry_env, api_env) {
                (RuntimeEnvironment::Node, RuntimeEnvironment::Workers) => (
                    WarningSeverity::Error,
                    format!(
                        "Options:\n  \
                         - Use conditional exports in package.json\n  \
                         - Lazy-load with: const {{ {} }} = await import('./workers-only.js')\n  \
                         - Split into separate /node and /workers entry points",
                        usage.api_usage.api.split('.').next().unwrap_or(&usage.api_usage.api)
                    )
                ),
                (RuntimeEnvironment::Workers, RuntimeEnvironment::Node) => (
                    WarningSeverity::Error,
                    format!(
                        "Options:\n  \
                         - Use Workers-compatible alternative\n  \
                         - Polyfill the Node.js API\n  \
                         - Use conditional imports"
                    )
                ),
                _ => continue,
            };
            
            warnings.push(EnvironmentWarning {
                severity,
                message: format!(
                    "{} API '{}' reachable from {} entry point",
                    match api_env {
                        RuntimeEnvironment::Workers => "Workers-only",
                        RuntimeEnvironment::Node => "Node.js-only",
                        _ => "Environment-specific",
                    },
                    usage.api_usage.api,
                    match entry_env {
                        RuntimeEnvironment::Node => "Node.js",
                        RuntimeEnvironment::Workers => "Workers",
                        _ => "unknown",
                    }
                ),
                import_chain: usage.chain.clone(),
                api: usage.api_usage.api.clone(),
                suggestion,
            });
        }
    }
    
    warnings
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_extract_quoted_string() {
        assert_eq!(extract_quoted_string("'./foo'"), Some("./foo".to_string()));
        assert_eq!(extract_quoted_string("\"./bar\""), Some("./bar".to_string()));
        assert_eq!(extract_quoted_string("`./baz`"), Some("./baz".to_string()));
    }
    
    #[test]
    fn test_workers_api_detection() {
        let content = "const cache = caches.default;";
        assert!(WORKERS_APIS.iter().any(|(api, _)| content.contains(api)));
    }
}
