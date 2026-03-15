//! Reachability Analysis
//!
//! Determines what code is reachable from entry points using dataflow analysis.
//! Unreached code is definitively dead.
//!
//! ## Algorithm
//! 1. Identify entry points (main, exports, event handlers, routes)
//! 2. Build call/import graph from entry points
//! 3. Mark all reachable code via BFS/DFS traversal
//! 4. Unreached modules are dead code candidates
//!
//! ## Entry Points
//! - package.json main/bin/exports
//! - SvelteKit +page.svelte, +server.ts, hooks.server.ts
//! - Cloudflare Worker index.ts with wrangler.toml
//! - Test files (*.test.ts, *.spec.ts)
//! - CLI scripts

use std::collections::{HashMap, HashSet, VecDeque};
use std::path::{Path, PathBuf};
use std::fs;
use serde::{Serialize, Deserialize};

/// Entry point types
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum EntryPointType {
    /// package.json main field
    PackageMain,
    /// package.json bin field
    PackageBin,
    /// package.json exports field
    PackageExports,
    /// SvelteKit page route
    SvelteKitPage,
    /// SvelteKit server route
    SvelteKitServer,
    /// SvelteKit hooks
    SvelteKitHooks,
    /// SvelteKit layout
    SvelteKitLayout,
    /// Cloudflare Worker
    CloudflareWorker,
    /// Test file
    TestFile,
    /// Script/CLI
    Script,
    /// HTML file reference
    HtmlReference,
    /// Dynamic import target
    DynamicImport,
}

impl EntryPointType {
    pub fn as_str(&self) -> &'static str {
        match self {
            EntryPointType::PackageMain => "package.json main",
            EntryPointType::PackageBin => "package.json bin",
            EntryPointType::PackageExports => "package.json exports",
            EntryPointType::SvelteKitPage => "SvelteKit page",
            EntryPointType::SvelteKitServer => "SvelteKit server",
            EntryPointType::SvelteKitHooks => "SvelteKit hooks",
            EntryPointType::SvelteKitLayout => "SvelteKit layout",
            EntryPointType::CloudflareWorker => "Cloudflare Worker",
            EntryPointType::TestFile => "test file",
            EntryPointType::Script => "script",
            EntryPointType::HtmlReference => "HTML reference",
            EntryPointType::DynamicImport => "dynamic import",
        }
    }
}

/// A discovered entry point
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntryPoint {
    pub path: PathBuf,
    pub entry_type: EntryPointType,
    pub description: String,
}

/// Reachability status for a module
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ReachabilityStatus {
    /// Reachable from at least one entry point
    Reachable,
    /// Not reachable from any entry point
    Unreachable,
    /// Is itself an entry point
    EntryPoint,
}

/// Reachability result for a module
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModuleReachability {
    pub path: PathBuf,
    pub status: ReachabilityStatus,
    /// Entry points that reach this module (if reachable)
    pub reached_from: Vec<PathBuf>,
    /// Distance from nearest entry point
    pub distance: Option<usize>,
}

/// Full reachability analysis report
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReachabilityReport {
    pub directory: PathBuf,
    pub entry_points: Vec<EntryPoint>,
    pub modules: Vec<ModuleReachability>,
    pub stats: ReachabilityStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReachabilityStats {
    pub total_modules: usize,
    pub reachable_count: usize,
    pub unreachable_count: usize,
    pub entry_point_count: usize,
    pub reachability_rate: f64,
}

/// Analyze reachability for a directory
pub fn analyze_reachability(directory: &Path) -> std::io::Result<ReachabilityReport> {
    // 1. Find all modules
    let mut all_modules: HashSet<PathBuf> = HashSet::new();
    collect_modules(directory, &mut all_modules)?;
    
    // 2. Find entry points
    let entry_points = find_entry_points(directory)?;
    let entry_paths: HashSet<PathBuf> = entry_points.iter()
        .map(|e| e.path.clone())
        .collect();
    
    // 3. Build import graph
    let import_graph = build_import_graph(directory, &all_modules)?;
    
    // 4. BFS from entry points
    let (reachable, distances) = compute_reachability(&entry_paths, &import_graph);
    
    // 5. Build results
    let mut modules: Vec<ModuleReachability> = Vec::new();
    
    for path in &all_modules {
        let status = if entry_paths.contains(path) {
            ReachabilityStatus::EntryPoint
        } else if reachable.contains(path) {
            ReachabilityStatus::Reachable
        } else {
            ReachabilityStatus::Unreachable
        };
        
        let reached_from: Vec<PathBuf> = if status == ReachabilityStatus::Reachable {
            // Find which entry points reach this
            entry_paths.iter()
                .filter(|ep| can_reach(ep, path, &import_graph))
                .cloned()
                .collect()
        } else {
            vec![]
        };
        
        modules.push(ModuleReachability {
            path: path.clone(),
            status,
            reached_from,
            distance: distances.get(path).copied(),
        });
    }
    
    // Sort by status (unreachable first for easier review)
    modules.sort_by(|a, b| {
        match (&a.status, &b.status) {
            (ReachabilityStatus::Unreachable, ReachabilityStatus::Unreachable) => 
                a.path.cmp(&b.path),
            (ReachabilityStatus::Unreachable, _) => std::cmp::Ordering::Less,
            (_, ReachabilityStatus::Unreachable) => std::cmp::Ordering::Greater,
            _ => a.path.cmp(&b.path),
        }
    });
    
    let reachable_count = modules.iter()
        .filter(|m| m.status == ReachabilityStatus::Reachable)
        .count();
    let unreachable_count = modules.iter()
        .filter(|m| m.status == ReachabilityStatus::Unreachable)
        .count();
    let entry_count = modules.iter()
        .filter(|m| m.status == ReachabilityStatus::EntryPoint)
        .count();
    
    let total = modules.len();
    let reachability_rate = if total > 0 {
        (reachable_count + entry_count) as f64 / total as f64
    } else {
        1.0
    };
    
    Ok(ReachabilityReport {
        directory: directory.to_path_buf(),
        entry_points,
        modules,
        stats: ReachabilityStats {
            total_modules: total,
            reachable_count,
            unreachable_count,
            entry_point_count: entry_count,
            reachability_rate,
        },
    })
}

/// Find all entry points in a directory
pub fn find_entry_points(directory: &Path) -> std::io::Result<Vec<EntryPoint>> {
    let mut entry_points = Vec::new();
    
    // Check package.json
    let pkg_path = directory.join("package.json");
    if pkg_path.exists() {
        if let Ok(entries) = find_package_json_entries(&pkg_path) {
            entry_points.extend(entries);
        }
    }
    
    // Check for wrangler.toml (Cloudflare Worker)
    let wrangler_path = directory.join("wrangler.toml");
    if wrangler_path.exists() {
        if let Ok(entry) = find_wrangler_entry(&wrangler_path, directory) {
            entry_points.push(entry);
        }
    }
    
    // Recursively find SvelteKit routes and other entries
    find_entries_recursive(directory, directory, &mut entry_points)?;
    
    Ok(entry_points)
}

fn find_entries_recursive(
    root: &Path,
    dir: &Path,
    entries: &mut Vec<EntryPoint>,
) -> std::io::Result<()> {
    let read_dir = match fs::read_dir(dir) {
        Ok(r) => r,
        Err(_) => return Ok(()),
    };
    
    for entry in read_dir.flatten() {
        let path = entry.path();
        
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            // Skip hidden and generated
            if name.starts_with('.') || 
               matches!(name, "node_modules" | "dist" | "build" | ".svelte-kit" | "target") {
                continue;
            }
        }
        
        if !path.exists() {
            continue;
        }
        
        if path.is_dir() {
            find_entries_recursive(root, &path, entries)?;
        } else if path.is_file() {
            if let Some(entry) = detect_entry_point(&path) {
                entries.push(entry);
            }
        }
    }
    
    Ok(())
}

fn detect_entry_point(path: &Path) -> Option<EntryPoint> {
    let name = path.file_name()?.to_str()?;
    let parent = path.parent()?.file_name().and_then(|n| n.to_str()).unwrap_or("");
    
    // SvelteKit routes
    if name == "+page.svelte" || name == "+page.ts" {
        return Some(EntryPoint {
            path: path.to_path_buf(),
            entry_type: EntryPointType::SvelteKitPage,
            description: format!("SvelteKit page: {}", path.display()),
        });
    }
    
    if name == "+page.server.ts" || name == "+server.ts" {
        return Some(EntryPoint {
            path: path.to_path_buf(),
            entry_type: EntryPointType::SvelteKitServer,
            description: format!("SvelteKit server: {}", path.display()),
        });
    }
    
    if name == "+layout.svelte" || name == "+layout.ts" || name == "+layout.server.ts" {
        return Some(EntryPoint {
            path: path.to_path_buf(),
            entry_type: EntryPointType::SvelteKitLayout,
            description: format!("SvelteKit layout: {}", path.display()),
        });
    }
    
    if name == "hooks.server.ts" || name == "hooks.client.ts" {
        return Some(EntryPoint {
            path: path.to_path_buf(),
            entry_type: EntryPointType::SvelteKitHooks,
            description: format!("SvelteKit hooks: {}", path.display()),
        });
    }
    
    // Test files
    if name.ends_with(".test.ts") || name.ends_with(".spec.ts") ||
       name.ends_with(".test.js") || name.ends_with(".spec.js") ||
       parent == "__tests__" {
        return Some(EntryPoint {
            path: path.to_path_buf(),
            entry_type: EntryPointType::TestFile,
            description: format!("Test file: {}", path.display()),
        });
    }
    
    // Scripts directory
    if parent == "scripts" || parent == "bin" {
        return Some(EntryPoint {
            path: path.to_path_buf(),
            entry_type: EntryPointType::Script,
            description: format!("Script: {}", path.display()),
        });
    }
    
    None
}

fn find_package_json_entries(pkg_path: &Path) -> std::io::Result<Vec<EntryPoint>> {
    let mut entries = Vec::new();
    let content = fs::read_to_string(pkg_path)?;
    let json: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;
    
    let pkg_dir = pkg_path.parent().unwrap_or(Path::new("."));
    
    // Check main
    if let Some(main) = json.get("main").and_then(|v| v.as_str()) {
        let main_path = pkg_dir.join(main);
        if main_path.exists() {
            entries.push(EntryPoint {
                path: main_path,
                entry_type: EntryPointType::PackageMain,
                description: format!("package.json main: {}", main),
            });
        }
    }
    
    // Check bin
    if let Some(bin) = json.get("bin") {
        if let Some(bin_str) = bin.as_str() {
            let bin_path = pkg_dir.join(bin_str);
            if bin_path.exists() {
                entries.push(EntryPoint {
                    path: bin_path,
                    entry_type: EntryPointType::PackageBin,
                    description: format!("package.json bin: {}", bin_str),
                });
            }
        } else if let Some(bin_obj) = bin.as_object() {
            for (name, path_val) in bin_obj {
                if let Some(path_str) = path_val.as_str() {
                    let bin_path = pkg_dir.join(path_str);
                    if bin_path.exists() {
                        entries.push(EntryPoint {
                            path: bin_path,
                            entry_type: EntryPointType::PackageBin,
                            description: format!("package.json bin.{}: {}", name, path_str),
                        });
                    }
                }
            }
        }
    }
    
    // Check exports (simplified)
    if let Some(exports) = json.get("exports") {
        collect_exports_entries(exports, pkg_dir, &mut entries, "exports");
    }
    
    Ok(entries)
}

fn collect_exports_entries(
    exports: &serde_json::Value,
    pkg_dir: &Path,
    entries: &mut Vec<EntryPoint>,
    _prefix: &str,
) {
    match exports {
        serde_json::Value::String(s) => {
            let path = pkg_dir.join(s.trim_start_matches("./"));
            if path.exists() {
                entries.push(EntryPoint {
                    path,
                    entry_type: EntryPointType::PackageExports,
                    description: format!("package.json exports: {}", s),
                });
            }
        }
        serde_json::Value::Object(obj) => {
            for (key, val) in obj {
                // Skip conditions like "import", "require", "types"
                if key.starts_with('.') {
                    collect_exports_entries(val, pkg_dir, entries, key);
                } else {
                    collect_exports_entries(val, pkg_dir, entries, key);
                }
            }
        }
        _ => {}
    }
}

fn find_wrangler_entry(wrangler_path: &Path, directory: &Path) -> std::io::Result<EntryPoint> {
    let content = fs::read_to_string(wrangler_path)?;
    let value: toml::Value = content.parse()
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;
    
    let main = value.get("main")
        .and_then(|v| v.as_str())
        .unwrap_or("src/index.ts");
    
    let main_path = directory.join(main);
    
    Ok(EntryPoint {
        path: main_path,
        entry_type: EntryPointType::CloudflareWorker,
        description: format!("Cloudflare Worker: {}", main),
    })
}

/// Collect all TypeScript/JavaScript modules in a directory
fn collect_modules(dir: &Path, modules: &mut HashSet<PathBuf>) -> std::io::Result<()> {
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return Ok(()),
    };
    
    for entry in entries.flatten() {
        let path = entry.path();
        
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            if name.starts_with('.') ||
               matches!(name, "node_modules" | "dist" | "build" | ".svelte-kit" | "target" | "venv" | ".venv") {
                continue;
            }
        }
        
        if !path.exists() {
            continue;
        }
        
        if path.is_dir() {
            collect_modules(&path, modules)?;
        } else if path.is_file() {
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
            if matches!(ext, "ts" | "tsx" | "js" | "jsx" | "svelte") {
                modules.insert(path);
            }
        }
    }
    
    Ok(())
}

/// Build import graph for reachability analysis
fn build_import_graph(
    _root: &Path,
    modules: &HashSet<PathBuf>,
) -> std::io::Result<HashMap<PathBuf, HashSet<PathBuf>>> {
    let mut graph: HashMap<PathBuf, HashSet<PathBuf>> = HashMap::new();
    
    for module in modules {
        let imports = match fs::read_to_string(module) {
            Ok(content) => extract_imports(&content, module),
            Err(_) => continue,
        };
        
        // Filter to only include imports that exist in our module set
        let valid_imports: HashSet<PathBuf> = imports.into_iter()
            .filter(|p| modules.contains(p) || p.exists())
            .collect();
        
        graph.insert(module.clone(), valid_imports);
    }
    
    Ok(graph)
}

/// Extract imports from file content
fn extract_imports(content: &str, file_path: &Path) -> HashSet<PathBuf> {
    let mut imports = HashSet::new();
    let dir = file_path.parent().unwrap_or(Path::new("."));
    
    for line in content.lines() {
        let line = line.trim();
        
        // import ... from '...'
        if (line.starts_with("import") || line.contains("} from")) && line.contains("from") {
            if let Some(path) = extract_path_from_import(line) {
                if path.starts_with('.') {
                    if let Some(resolved) = resolve_path(dir, &path) {
                        imports.insert(resolved);
                    }
                }
            }
        }
        
        // export ... from '...'
        if line.starts_with("export") && line.contains("from") {
            if let Some(path) = extract_path_from_import(line) {
                if path.starts_with('.') {
                    if let Some(resolved) = resolve_path(dir, &path) {
                        imports.insert(resolved);
                    }
                }
            }
        }
        
        // require('...')
        if line.contains("require(") {
            if let Some(path) = extract_require_path(line) {
                if path.starts_with('.') {
                    if let Some(resolved) = resolve_path(dir, &path) {
                        imports.insert(resolved);
                    }
                }
            }
        }
    }
    
    imports
}

fn extract_path_from_import(line: &str) -> Option<String> {
    let pos = line.find("from")?;
    let after = &line[pos + 4..];
    
    let quote = if after.contains('\'') { '\'' } else { '"' };
    let start = after.find(quote)? + 1;
    let rest = &after[start..];
    let end = rest.find(quote)?;
    
    Some(rest[..end].to_string())
}

fn extract_require_path(line: &str) -> Option<String> {
    let start = line.find("require(")? + 8;
    let rest = &line[start..];
    
    let quote = if rest.starts_with('\'') { '\'' } else { '"' };
    let content_start = rest.find(quote)? + 1;
    let content = &rest[content_start..];
    let end = content.find(quote)?;
    
    Some(content[..end].to_string())
}

fn resolve_path(dir: &Path, import_path: &str) -> Option<PathBuf> {
    let base = dir.join(import_path);
    
    // Try various extensions
    let extensions = [
        "", ".ts", ".tsx", ".js", ".jsx", ".svelte",
        "/index.ts", "/index.tsx", "/index.js", "/index.svelte"
    ];
    
    for ext in extensions {
        let with_ext = if ext.is_empty() {
            base.clone()
        } else if ext.starts_with('/') {
            base.join(&ext[1..])
        } else {
            PathBuf::from(format!("{}{}", base.display(), ext))
        };
        
        if with_ext.exists() {
            return Some(with_ext);
        }
    }
    
    None
}

/// Compute reachability using BFS from entry points
fn compute_reachability(
    entry_points: &HashSet<PathBuf>,
    import_graph: &HashMap<PathBuf, HashSet<PathBuf>>,
) -> (HashSet<PathBuf>, HashMap<PathBuf, usize>) {
    let mut reachable = HashSet::new();
    let mut distances = HashMap::new();
    let mut queue = VecDeque::new();
    
    // Initialize with entry points
    for ep in entry_points {
        if !reachable.contains(ep) {
            reachable.insert(ep.clone());
            distances.insert(ep.clone(), 0);
            queue.push_back((ep.clone(), 0));
        }
    }
    
    // BFS
    while let Some((current, dist)) = queue.pop_front() {
        if let Some(imports) = import_graph.get(&current) {
            for import in imports {
                if !reachable.contains(import) {
                    reachable.insert(import.clone());
                    distances.insert(import.clone(), dist + 1);
                    queue.push_back((import.clone(), dist + 1));
                }
            }
        }
    }
    
    (reachable, distances)
}

/// Check if source can reach target
fn can_reach(
    source: &Path,
    target: &Path,
    import_graph: &HashMap<PathBuf, HashSet<PathBuf>>,
) -> bool {
    let mut visited = HashSet::new();
    let mut queue = VecDeque::new();
    
    queue.push_back(source.to_path_buf());
    
    while let Some(current) = queue.pop_front() {
        if current == target {
            return true;
        }
        
        if visited.contains(&current) {
            continue;
        }
        visited.insert(current.clone());
        
        if let Some(imports) = import_graph.get(&current) {
            for import in imports {
                if !visited.contains(import) {
                    queue.push_back(import.clone());
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
    use std::io::Write;
    
    #[test]
    fn test_find_sveltekit_entries() {
        let dir = tempdir().unwrap();
        
        // Create SvelteKit structure
        let routes = dir.path().join("src/routes");
        fs::create_dir_all(&routes).unwrap();
        
        fs::File::create(routes.join("+page.svelte")).unwrap();
        fs::File::create(routes.join("+page.server.ts")).unwrap();
        
        let hooks = dir.path().join("src");
        fs::File::create(hooks.join("hooks.server.ts")).unwrap();
        
        let entries = find_entry_points(dir.path()).unwrap();
        
        assert!(entries.iter().any(|e| e.entry_type == EntryPointType::SvelteKitPage));
        assert!(entries.iter().any(|e| e.entry_type == EntryPointType::SvelteKitServer));
        assert!(entries.iter().any(|e| e.entry_type == EntryPointType::SvelteKitHooks));
    }
    
    #[test]
    fn test_reachability_simple() {
        let dir = tempdir().unwrap();
        
        // Create package.json with main entry
        let pkg = dir.path().join("package.json");
        fs::File::create(&pkg).unwrap()
            .write_all(br#"{"main": "index.ts"}"#).unwrap();
        
        // index.ts imports utils.ts
        fs::File::create(dir.path().join("index.ts")).unwrap()
            .write_all(b"import { foo } from './utils';").unwrap();
        
        // utils.ts exists
        fs::File::create(dir.path().join("utils.ts")).unwrap()
            .write_all(b"export function foo() {}").unwrap();
        
        // orphan.ts is not imported
        fs::File::create(dir.path().join("orphan.ts")).unwrap()
            .write_all(b"export function lonely() {}").unwrap();
        
        let report = analyze_reachability(dir.path()).unwrap();
        
        // index.ts should be entry point
        let index = report.modules.iter()
            .find(|m| m.path.file_name().unwrap().to_str().unwrap() == "index.ts")
            .unwrap();
        assert_eq!(index.status, ReachabilityStatus::EntryPoint);
        
        // utils.ts should be reachable
        let utils = report.modules.iter()
            .find(|m| m.path.file_name().unwrap().to_str().unwrap() == "utils.ts")
            .unwrap();
        assert_eq!(utils.status, ReachabilityStatus::Reachable);
        
        // orphan.ts should be unreachable
        let orphan = report.modules.iter()
            .find(|m| m.path.file_name().unwrap().to_str().unwrap() == "orphan.ts")
            .unwrap();
        assert_eq!(orphan.status, ReachabilityStatus::Unreachable);
    }
    
    #[test]
    fn test_test_files_are_entry_points() {
        let dir = tempdir().unwrap();
        
        fs::File::create(dir.path().join("utils.test.ts")).unwrap()
            .write_all(b"test('foo', () => {})").unwrap();
        
        let entries = find_entry_points(dir.path()).unwrap();
        
        assert!(entries.iter().any(|e| e.entry_type == EntryPointType::TestFile));
    }
}
