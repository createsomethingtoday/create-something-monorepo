//! Symbol-level Import/Export Graph
//!
//! Builds a complete graph of all exports and imports in a codebase,
//! enabling efficient dead export detection without repeated file walking.
//!
//! ## Use Cases
//! - Repo-wide dead export detection (O(1) per export after graph build)
//! - Finding all consumers of a symbol
//! - Dependency analysis
//!
//! ## Performance
//! - Build: O(files) - parse each file once
//! - Query dead exports: O(exports) - simple hash lookups
//! - vs find_dead_exports: O(exports × files) per module
//!
//! ## Path Alias Support
//! - SvelteKit: `$lib` → `src/lib` (automatic)
//! - TypeScript: reads `tsconfig.json` paths
//! - Re-export chains are followed to determine if original exports are used

use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::fs;
use serde::{Serialize, Deserialize};
use chrono::{DateTime, Utc};

use super::imports::{extract_imports, extract_exports};
use crate::monorepo::discover_workspace_package_paths;

/// Path alias configuration (e.g., $lib → src/lib)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PathAlias {
    /// The alias pattern (e.g., "$lib", "@/*")
    pub pattern: String,
    /// The resolved path relative to project root (e.g., "src/lib")
    pub target: String,
}

/// A symbol exported from a module
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportedSymbol {
    /// Name of the exported symbol
    pub name: String,
    /// File that exports it
    pub file: PathBuf,
    /// Line number of the export
    pub line: u32,
    /// Whether it's a re-export from another module
    pub is_reexport: bool,
    /// If re-export, the source module
    pub source_module: Option<String>,
}

/// A symbol imported into a module
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportedSymbol {
    /// Name of the imported symbol (or "*" for namespace import)
    pub name: String,
    /// File that imports it
    pub file: PathBuf,
    /// Module path being imported from
    pub from_module: String,
    /// Line number of the import
    pub line: u32,
}

/// Complete symbol graph for a codebase
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SymbolGraph {
    /// All files in the graph
    pub files: Vec<PathBuf>,
    
    /// Map from file path to its exports
    pub exports: HashMap<PathBuf, Vec<ExportedSymbol>>,
    
    /// Map from file path to its imports
    pub imports: HashMap<PathBuf, Vec<ImportedSymbol>>,
    
    /// Index: symbol name -> list of (file, export) that export it
    pub symbol_exporters: HashMap<String, Vec<(PathBuf, u32)>>,
    
    /// Index: symbol name -> list of files that import it
    pub symbol_importers: HashMap<String, HashSet<PathBuf>>,
    
    /// Index: module specifier -> resolved file path
    pub module_resolution: HashMap<String, PathBuf>,
    
    /// Path aliases detected from config files ($lib, @/*, etc.)
    pub path_aliases: Vec<PathAlias>,
    
    /// Re-export tracking: symbol -> (original_file, re_exporter_files)
    /// Used to trace if an export is used through re-export chains
    pub reexport_chains: HashMap<String, Vec<(PathBuf, PathBuf)>>,
    
    /// When the graph was built
    pub built_at: DateTime<Utc>,
    
    /// Root directory used for building
    pub root_dir: PathBuf,
    
    /// Number of files scanned
    pub files_scanned: usize,
    
    /// Number of files with parse errors (skipped)
    pub parse_errors: usize,
}

/// Result of dead export analysis using the graph
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphDeadExport {
    /// Name of the dead export
    pub name: String,
    /// File containing the export
    pub file: PathBuf,
    /// Line number
    pub line: u32,
    /// Context (export statement preview)
    pub context: String,
}

/// Report from graph-based dead export detection
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphDeadExportsReport {
    /// All dead exports found
    pub dead_exports: Vec<GraphDeadExport>,
    /// Total exports analyzed
    pub total_exports: usize,
    /// Files analyzed
    pub files_analyzed: usize,
    /// Time taken to query (not build)
    pub query_time_ms: u64,
}

impl SymbolGraph {
    /// Build a new symbol graph from a directory
    pub fn build(root_dir: &Path, progress_callback: Option<&dyn Fn(usize, usize)>) -> Result<Self, String> {
        // Detect path aliases from config files
        let path_aliases = detect_path_aliases(root_dir);
        
        let mut graph = SymbolGraph {
            files: Vec::new(),
            exports: HashMap::new(),
            imports: HashMap::new(),
            symbol_exporters: HashMap::new(),
            symbol_importers: HashMap::new(),
            module_resolution: workspace_module_resolution(root_dir),
            path_aliases,
            reexport_chains: HashMap::new(),
            built_at: Utc::now(),
            root_dir: root_dir.to_path_buf(),
            files_scanned: 0,
            parse_errors: 0,
        };
        
        // Collect all scannable files
        let mut files = Vec::new();
        collect_files(root_dir, &mut files);
        
        let total_files = files.len();
        
        // Parse each file
        for (idx, file) in files.iter().enumerate() {
            if let Some(cb) = progress_callback {
                cb(idx + 1, total_files);
            }
            
            graph.files_scanned += 1;
            
            // Extract exports
            match extract_exports(file) {
                Ok(exports) => {
                    let exported: Vec<ExportedSymbol> = exports.iter().map(|e| {
                        let symbol = ExportedSymbol {
                            name: e.name.clone(),
                            file: file.clone(),
                            line: e.line as u32,
                            is_reexport: e.is_reexport,
                            source_module: e.source.clone(),
                        };
                        
                        // Index by symbol name
                        graph.symbol_exporters
                            .entry(e.name.clone())
                            .or_default()
                            .push((file.clone(), e.line as u32));
                        
                        // Track re-export chains
                        if e.is_reexport {
                            if let Some(ref source) = e.source {
                                // Record that this file re-exports from source
                                graph.reexport_chains
                                    .entry(e.name.clone())
                                    .or_default()
                                    .push((file.clone(), PathBuf::from(source)));
                            }
                        }
                        
                        symbol
                    }).collect();
                    
                    graph.exports.insert(file.clone(), exported);
                }
                Err(_) => {
                    graph.parse_errors += 1;
                }
            }
            
            // Extract imports
            match extract_imports(file) {
                Ok(imports) => {
                    let imported: Vec<ImportedSymbol> = imports.iter().flat_map(|i| {
                        i.symbols.iter().map(|s| {
                            let symbol = ImportedSymbol {
                                name: s.clone(),
                                file: file.clone(),
                                from_module: i.source.clone(),
                                line: i.start_line as u32,
                            };
                            
                            // Index by symbol name
                            graph.symbol_importers
                                .entry(s.clone())
                                .or_default()
                                .insert(file.clone());
                            
                            symbol
                        }).collect::<Vec<_>>()
                    }).collect();
                    
                    graph.imports.insert(file.clone(), imported);
                }
                Err(_) => {
                    // Already counted in exports error
                }
            }
            
            graph.files.push(file.clone());
        }
        
        Ok(graph)
    }
    
    /// Find all dead exports in the graph
    pub fn find_dead_exports(&self) -> GraphDeadExportsReport {
        use std::time::Instant;
        let start = Instant::now();
        
        let mut dead_exports = Vec::new();
        let mut total_exports = 0;
        
        for (file, exports) in &self.exports {
            for export in exports {
                // Skip re-exports - they're just pass-through
                if export.is_reexport {
                    continue;
                }
                
                total_exports += 1;
                
                // Check if anyone imports this symbol directly
                let importers = self.symbol_importers.get(&export.name);
                
                let is_used_directly = match importers {
                    Some(files) => {
                        // Check if any importer actually imports from this file
                        // (not just any file exporting the same name)
                        files.iter().any(|importer| {
                            self.imports.get(importer).map_or(false, |imports| {
                                imports.iter().any(|i| {
                                    i.name == export.name && 
                                    self.resolves_to(&i.from_module, file, importer)
                                })
                            })
                        })
                    }
                    None => false,
                };
                
                // If not used directly, check if used via re-export chain
                let is_used_via_reexport = if !is_used_directly {
                    self.is_used_via_reexport(&export.name, file)
                } else {
                    false
                };
                
                if !is_used_directly && !is_used_via_reexport {
                    dead_exports.push(GraphDeadExport {
                        name: export.name.clone(),
                        file: file.clone(),
                        line: export.line,
                        context: format!("export {}", export.name),
                    });
                }
            }
        }
        
        let query_time_ms = start.elapsed().as_millis() as u64;
        
        GraphDeadExportsReport {
            dead_exports,
            total_exports,
            files_analyzed: self.files.len(),
            query_time_ms,
        }
    }
    
    /// Find dead exports in a specific file
    pub fn find_dead_exports_in_file(&self, file: &Path) -> Vec<GraphDeadExport> {
        let mut dead = Vec::new();
        
        if let Some(exports) = self.exports.get(file) {
            for export in exports {
                if export.is_reexport {
                    continue;
                }
                
                let importers = self.symbol_importers.get(&export.name);
                
                let is_used = match importers {
                    Some(files) => {
                        files.iter().any(|importer| {
                            self.imports.get(importer).map_or(false, |imports| {
                                imports.iter().any(|i| {
                                    i.name == export.name && 
                                    self.resolves_to(&i.from_module, file, importer)
                                })
                            })
                        })
                    }
                    None => false,
                };
                
                if !is_used {
                    dead.push(GraphDeadExport {
                        name: export.name.clone(),
                        file: file.to_path_buf(),
                        line: export.line,
                        context: format!("export {}", export.name),
                    });
                }
            }
        }
        
        dead
    }
    
    /// Check if a module specifier resolves to a target file
    fn resolves_to(&self, module_spec: &str, target: &Path, importer: &Path) -> bool {
        if let Some(resolved) = self.module_resolution.get(module_spec) {
            if module_target_matches(resolved, target) {
                return true;
            }
        }

        for (pattern, resolved) in &self.module_resolution {
            let Some(prefix) = pattern.strip_suffix("/*") else {
                continue;
            };
            let Some(remainder) = module_spec.strip_prefix(&format!("{prefix}/")) else {
                continue;
            };
            let expanded = PathBuf::from(resolved.to_string_lossy().replace('*', remainder));
            if module_target_matches(&expanded, target) {
                return true;
            }
        }

        // First, try to resolve path aliases
        let resolved_spec = self.resolve_alias(module_spec);
        let module_spec = resolved_spec.as_deref().unwrap_or(module_spec);
        
        // Handle relative imports
        if module_spec.starts_with("./") || module_spec.starts_with("../") {
            if let Some(importer_dir) = importer.parent() {
                let resolved = importer_dir.join(module_spec);
                
                // Try with various extensions
                let candidates = [
                    resolved.clone(),
                    resolved.with_extension("ts"),
                    resolved.with_extension("tsx"),
                    resolved.with_extension("js"),
                    resolved.with_extension("jsx"),
                    resolved.with_extension("svelte"),
                    resolved.join("index.ts"),
                    resolved.join("index.js"),
                ];
                
                for candidate in &candidates {
                    if let Ok(canonical) = candidate.canonicalize() {
                        if let Ok(target_canonical) = target.canonicalize() {
                            if canonical == target_canonical {
                                return true;
                            }
                        }
                    }
                }
                
            }
        }
        
        // Handle alias-resolved absolute paths (relative to root)
        if !module_spec.starts_with('.') && !module_spec.starts_with('/') {
            // This might be an alias-resolved path
            let resolved = self.root_dir.join(module_spec);
            
            let candidates = [
                resolved.clone(),
                resolved.with_extension("ts"),
                resolved.with_extension("tsx"),
                resolved.with_extension("js"),
                resolved.with_extension("svelte"),
                resolved.join("index.ts"),
                resolved.join("index.js"),
            ];
            
            for candidate in &candidates {
                if let Ok(canonical) = candidate.canonicalize() {
                    if let Ok(target_canonical) = target.canonicalize() {
                        if canonical == target_canonical {
                            return true;
                        }
                    }
                }
            }
        }
        
        false
    }
    
    /// Resolve a path alias to its target path
    fn resolve_alias(&self, module_spec: &str) -> Option<String> {
        for alias in &self.path_aliases {
            // Handle exact match (e.g., "$lib" -> "src/lib")
            if alias.pattern == module_spec {
                return Some(alias.target.clone());
            }
            
            // Handle prefix match (e.g., "$lib/utils" -> "src/lib/utils")
            if module_spec.starts_with(&format!("{}/", alias.pattern)) {
                let rest = &module_spec[alias.pattern.len()..];
                return Some(format!("{}{}", alias.target, rest));
            }
            
            // Handle wildcard patterns (e.g., "@/*" -> "src/*")
            if alias.pattern.ends_with("/*") {
                let prefix = alias.pattern.trim_end_matches("/*");
                if module_spec.starts_with(&format!("{}/", prefix)) {
                    let rest = &module_spec[prefix.len() + 1..];
                    let target_prefix = alias.target.trim_end_matches("/*");
                    return Some(format!("{}/{}", target_prefix, rest));
                }
            }
        }
        None
    }
    
    /// Check if an export is used through a re-export chain
    fn is_used_via_reexport(&self, symbol_name: &str, original_file: &Path) -> bool {
        // Find all files that re-export this symbol
        if let Some(chain) = self.reexport_chains.get(symbol_name) {
            for (reexporter, _source) in chain {
                // Check if the reexporter file re-exports from the original
                if let Some(exports) = self.exports.get(reexporter) {
                    for export in exports {
                        if export.name == symbol_name && export.is_reexport {
                            // Check if anyone imports from the reexporter
                            if let Some(importers) = self.symbol_importers.get(symbol_name) {
                                for importer in importers {
                                    if let Some(imports) = self.imports.get(importer) {
                                        for imp in imports {
                                            if imp.name == symbol_name && 
                                               self.resolves_to(&imp.from_module, reexporter, importer) {
                                                // Someone imports via re-export - check if reexporter
                                                // ultimately sources from original_file
                                                if self.reexport_traces_to(reexporter, symbol_name, original_file) {
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
            }
        }
        false
    }
    
    /// Trace a re-export chain to see if it ultimately comes from a target file
    fn reexport_traces_to(&self, reexporter: &Path, symbol_name: &str, target: &Path) -> bool {
        if let Some(exports) = self.exports.get(reexporter) {
            for export in exports {
                if export.name == symbol_name && export.is_reexport {
                    if let Some(ref source) = export.source_module {
                        // Check if source resolves to target
                        if self.resolves_to(source, target, reexporter) {
                            return true;
                        }
                    }
                }
            }
        }
        false
    }
    
    /// Get statistics about the graph
    pub fn stats(&self) -> GraphStats {
        let total_exports: usize = self.exports.values().map(|e| e.len()).sum();
        let total_imports: usize = self.imports.values().map(|i| i.len()).sum();
        
        GraphStats {
            files: self.files.len(),
            exports: total_exports,
            imports: total_imports,
            unique_symbols: self.symbol_exporters.len(),
            parse_errors: self.parse_errors,
        }
    }
}

fn paths_equal(left: &Path, right: &Path) -> bool {
    match (left.canonicalize(), right.canonicalize()) {
        (Ok(left), Ok(right)) => left == right,
        _ => left == right,
    }
}

fn module_target_matches(published_target: &Path, source_target: &Path) -> bool {
    if paths_equal(published_target, source_target) {
        return true;
    }

    let Some(package_root) = published_target
        .ancestors()
        .find(|ancestor| ancestor.join("package.json").is_file())
    else {
        return false;
    };
    let Ok(relative) = published_target.strip_prefix(package_root) else {
        return false;
    };
    let relative_text = relative.to_string_lossy().replace('\\', "/");
    let Some(dist_relative) = relative_text.strip_prefix("dist/") else {
        return false;
    };
    let stem = strip_module_extension(dist_relative);

    ["src/lib", "src"].iter().any(|source_root| {
        ["ts", "tsx", "js", "jsx", "svelte", "css", "scss", "json"]
            .iter()
            .map(|extension| package_root.join(source_root).join(format!("{stem}.{extension}")))
            .any(|candidate| paths_equal(&candidate, source_target))
    })
}

fn strip_module_extension(path: &str) -> &str {
    [".d.ts", ".d.mts", ".d.cts", ".svelte", ".tsx", ".jsx", ".mts", ".cts", ".ts", ".js", ".css", ".scss", ".json"]
        .iter()
        .find_map(|extension| path.strip_suffix(extension))
        .unwrap_or(path)
}

fn workspace_module_resolution(root: &Path) -> HashMap<String, PathBuf> {
    let mut resolution = HashMap::new();
    for package in discover_workspace_package_paths(root) {
        let Ok(content) = fs::read_to_string(package.join("package.json")) else {
            continue;
        };
        let Ok(manifest) = serde_json::from_str::<serde_json::Value>(&content) else {
            continue;
        };
        let Some(name) = manifest.get("name").and_then(|value| value.as_str()) else {
            continue;
        };

        if let Some(exports) = manifest.get("exports") {
            match exports {
                serde_json::Value::String(target) => {
                    resolution.insert(name.to_string(), package.join(target));
                }
                serde_json::Value::Object(entries) => {
                    for (subpath, value) in entries {
                        let Some(target) = export_target(value) else { continue };
                        let specifier = if subpath == "." {
                            name.to_string()
                        } else if let Some(subpath) = subpath.strip_prefix("./") {
                            format!("{}/{}", name, subpath)
                        } else {
                            continue;
                        };
                        resolution.insert(specifier, package.join(target));
                    }
                }
                _ => {}
            }
        } else {
            for field in ["svelte", "module", "main", "types"] {
                if let Some(target) = manifest.get(field).and_then(|value| value.as_str()) {
                    resolution.insert(name.to_string(), package.join(target));
                    break;
                }
            }
        }
    }
    resolution
}

fn export_target(value: &serde_json::Value) -> Option<&str> {
    match value {
        serde_json::Value::String(target) => Some(target),
        serde_json::Value::Object(conditions) => ["types", "svelte", "import", "default", "require"]
            .iter()
            .find_map(|condition| conditions.get(*condition).and_then(export_target)),
        _ => None,
    }
}

/// Statistics about a symbol graph
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphStats {
    pub files: usize,
    pub exports: usize,
    pub imports: usize,
    pub unique_symbols: usize,
    pub parse_errors: usize,
}

/// Collect all TypeScript/JavaScript/Svelte files recursively
fn collect_files(dir: &Path, files: &mut Vec<PathBuf>) {
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };
    
    for entry in entries.filter_map(|e| e.ok()) {
        let path = entry.path();
        
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            // Skip hidden and common non-source directories
            if name.starts_with('.') || 
               matches!(name, "node_modules" | "target" | "dist" | "build" | ".svelte-kit" | "coverage") {
                continue;
            }
        }
        
        if path.is_dir() {
            collect_files(&path, files);
        } else if path.is_file() {
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
            if matches!(ext, "ts" | "tsx" | "js" | "jsx" | "svelte") {
                files.push(path);
            }
        }
    }
}

/// Detect path aliases from config files in the directory hierarchy
fn detect_path_aliases(root_dir: &Path) -> Vec<PathAlias> {
    let mut aliases: Vec<PathAlias> = Vec::new();
    
    // Walk to the filesystem root so deeply nested monorepo packages still use
    // their declared aliases.
    let mut search_dir = root_dir.to_path_buf();
    loop {
        // Check for svelte.config.js (SvelteKit)
        if search_dir.join("svelte.config.js").exists() || 
           search_dir.join("svelte.config.ts").exists() {
            // SvelteKit automatically provides $lib -> src/lib
            if !aliases.iter().any(|alias| alias.pattern == "$lib") {
                aliases.push(PathAlias {
                    pattern: "$lib".to_string(),
                    target: "src/lib".to_string(),
                });
            }
        }
        
        // Check for tsconfig.json
        let tsconfig_path = search_dir.join("tsconfig.json");
        if tsconfig_path.exists() {
            if let Ok(content) = fs::read_to_string(&tsconfig_path) {
                aliases.extend(parse_tsconfig_paths(&content));
            }
        }
        
        // Check for jsconfig.json (used by some projects)
        let jsconfig_path = search_dir.join("jsconfig.json");
        if jsconfig_path.exists() {
            if let Ok(content) = fs::read_to_string(&jsconfig_path) {
                aliases.extend(parse_tsconfig_paths(&content));
            }
        }
        
        match search_dir.parent() {
            Some(parent) => search_dir = parent.to_path_buf(),
            None => break,
        }
    }
    
    aliases
}

/// Parse path aliases from tsconfig.json content
fn parse_tsconfig_paths(content: &str) -> Vec<PathAlias> {
    let Ok(document) = json5::from_str::<serde_json::Value>(content) else {
        return Vec::new();
    };
    let Some(paths) = document
        .get("compilerOptions")
        .and_then(|options| options.get("paths"))
        .and_then(|paths| paths.as_object())
    else {
        return Vec::new();
    };

    paths
        .iter()
        .filter_map(|(pattern, targets)| {
            let target = targets.as_array()?.first()?.as_str()?;
            Some(PathAlias {
                pattern: pattern.clone(),
                target: target.trim_start_matches("./").to_string(),
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;
    
    #[test]
    fn test_build_graph() {
        let dir = tempdir().unwrap();
        
        // Create test files
        let utils = dir.path().join("utils.ts");
        fs::write(&utils, r#"
export function helper() { return 1; }
export function unused() { return 2; }
"#).unwrap();
        
        let main = dir.path().join("main.ts");
        fs::write(&main, r#"
import { helper } from './utils';
console.log(helper());
"#).unwrap();
        
        let graph = SymbolGraph::build(dir.path(), None).unwrap();
        
        assert_eq!(graph.files.len(), 2);
        assert!(graph.exports.contains_key(&utils));
        assert!(graph.imports.contains_key(&main));
    }
    
    #[test]
    fn test_find_dead_exports() {
        let dir = tempdir().unwrap();
        
        let utils = dir.path().join("utils.ts");
        fs::write(&utils, r#"
export function helper() { return 1; }
export function unused() { return 2; }
"#).unwrap();
        
        let main = dir.path().join("main.ts");
        fs::write(&main, r#"
import { helper } from './utils';
console.log(helper());
"#).unwrap();
        
        let graph = SymbolGraph::build(dir.path(), None).unwrap();
        let report = graph.find_dead_exports();
        
        // 'unused' should be dead
        assert_eq!(report.dead_exports.len(), 1);
        assert_eq!(report.dead_exports[0].name, "unused");
    }
    
    #[test]
    fn test_sveltekit_alias_detection() {
        let dir = tempdir().unwrap();
        
        // Create svelte.config.js to trigger SvelteKit detection
        fs::write(dir.path().join("svelte.config.js"), "export default {}").unwrap();
        
        let aliases = detect_path_aliases(dir.path());
        
        assert!(!aliases.is_empty(), "Should detect SvelteKit aliases");
        assert!(aliases.iter().any(|a| a.pattern == "$lib"), "Should have $lib alias");
    }
    
    #[test]
    fn test_alias_resolution() {
        let dir = tempdir().unwrap();
        
        // Setup SvelteKit structure
        fs::write(dir.path().join("svelte.config.js"), "export default {}").unwrap();
        fs::create_dir_all(dir.path().join("src/lib")).unwrap();
        
        let utils = dir.path().join("src/lib/utils.ts");
        fs::write(&utils, r#"
export function helper() { return 1; }
"#).unwrap();
        
        let page = dir.path().join("src/routes/+page.svelte");
        fs::create_dir_all(dir.path().join("src/routes")).unwrap();
        fs::write(&page, r#"
<script>
import { helper } from '$lib/utils';
</script>
"#).unwrap();
        
        let graph = SymbolGraph::build(dir.path(), None).unwrap();
        
        // Check alias was detected
        assert!(graph.path_aliases.iter().any(|a| a.pattern == "$lib"));
        
        // Check alias resolution works
        let resolved = graph.resolve_alias("$lib/utils");
        assert_eq!(resolved, Some("src/lib/utils".to_string()));
    }
    
    #[test]
    fn test_parse_tsconfig_paths() {
        let content = r#"{
            // JSONC comments and more than one alias are common in tsconfig files.
            "compilerOptions": {
                "paths": {
                    "@/*": ["./src/*"],
                    "$generated/*": ["./.generated/*"],
                }
            }
        }"#;
        
        let aliases = parse_tsconfig_paths(content);
        
        // Should detect @/* alias
        assert!(aliases.iter().any(|a| a.pattern == "@/*"));
        assert!(aliases.iter().any(|a| a.pattern == "$generated/*"));
    }

    #[test]
    fn workspace_package_exports_resolve_to_the_exporting_file() {
        let dir = tempdir().unwrap();
        fs::write(
            dir.path().join("pnpm-workspace.yaml"),
            "packages:\n  - 'apps/*'\n  - 'packages/*'\n",
        )
        .unwrap();
        fs::create_dir_all(dir.path().join("packages/canon/src")).unwrap();
        fs::create_dir_all(dir.path().join("apps/site/src")).unwrap();
        fs::write(
            dir.path().join("packages/canon/package.json"),
            r#"{"name":"@create-something/canon","exports":{"./math":"./src/math.ts"}}"#,
        )
        .unwrap();
        fs::write(
            dir.path().join("apps/site/package.json"),
            r#"{"name":"@create-something/site","dependencies":{"@create-something/canon":"workspace:*"}}"#,
        )
        .unwrap();
        fs::write(
            dir.path().join("packages/canon/src/math.ts"),
            "export const add = (a: number, b: number) => a + b;\n",
        )
        .unwrap();
        fs::write(
            dir.path().join("apps/site/src/index.ts"),
            "import { add } from '@create-something/canon/math';\nconsole.log(add(1, 2));\n",
        )
        .unwrap();

        let graph = SymbolGraph::build(dir.path(), None).unwrap();
        let report = graph.find_dead_exports();
        assert!(!report.dead_exports.iter().any(|export| export.name == "add"));
    }

    #[test]
    fn workspace_dist_and_wildcard_exports_resolve_to_source_files() {
        let dir = tempdir().unwrap();
        fs::write(
            dir.path().join("pnpm-workspace.yaml"),
            "packages:\n  - 'apps/*'\n  - 'packages/*'\n",
        )
        .unwrap();
        fs::create_dir_all(dir.path().join("packages/canon/src/lib/components")).unwrap();
        fs::create_dir_all(dir.path().join("apps/site/src")).unwrap();
        fs::write(
            dir.path().join("packages/canon/package.json"),
            r#"{"name":"@create-something/canon","exports":{"./components/*":"./dist/components/*.js"}}"#,
        )
        .unwrap();
        fs::write(
            dir.path().join("apps/site/package.json"),
            r#"{"name":"@create-something/site","dependencies":{"@create-something/canon":"workspace:*"}}"#,
        )
        .unwrap();
        fs::write(
            dir.path().join("packages/canon/src/lib/components/card.ts"),
            "export const card = () => 'card';\n",
        )
        .unwrap();
        fs::write(
            dir.path().join("apps/site/src/index.ts"),
            "import { card } from '@create-something/canon/components/card';\nconsole.log(card());\n",
        )
        .unwrap();

        let graph = SymbolGraph::build(dir.path(), None).unwrap();
        let report = graph.find_dead_exports();
        assert!(!report.dead_exports.iter().any(|export| export.name == "card"));
    }
}
