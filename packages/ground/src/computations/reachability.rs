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
use crate::config::GroundConfig;

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
    /// Framework-owned configuration loaded by the build/runtime
    FrameworkConfig,
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
    /// Explicit Ground configuration entry point
    GroundManual,
    /// Promptfoo local file reference in a supported config field
    PromptfooFileReference,
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
            EntryPointType::FrameworkConfig => "framework config",
            EntryPointType::CloudflareWorker => "Cloudflare Worker",
            EntryPointType::TestFile => "test file",
            EntryPointType::Script => "script",
            EntryPointType::HtmlReference => "HTML reference",
            EntryPointType::DynamicImport => "dynamic import",
            EntryPointType::GroundManual => "Ground manual entry point",
            EntryPointType::PromptfooFileReference => "Promptfoo file reference",
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
    analyze_reachability_with_config(directory, &GroundConfig::default())
}

/// Analyze reachability with explicit Ground configuration entry points.
pub fn analyze_reachability_with_config(
    directory: &Path,
    config: &GroundConfig,
) -> std::io::Result<ReachabilityReport> {
    // 1. Find all modules
    let mut all_modules: HashSet<PathBuf> = HashSet::new();
    collect_modules(directory, &mut all_modules)?;
    
    // 2. Find entry points
    let entry_points = find_entry_points_with_config(directory, config)?;
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
    find_entry_points_with_config(directory, &GroundConfig::default())
}

/// Find entry points with exact manual Ground entries and supported declarative adapters.
pub fn find_entry_points_with_config(
    directory: &Path,
    config: &GroundConfig,
) -> std::io::Result<Vec<EntryPoint>> {
    let mut entry_points = Vec::new();
    
    // Check package.json
    let pkg_path = directory.join("package.json");
    if pkg_path.exists() {
        if let Ok(entries) = find_package_json_entries(&pkg_path) {
            entry_points.extend(entries);
        }
    }
    
    // Recursively find SvelteKit routes and other entries
    find_entries_recursive(directory, directory, &mut entry_points)?;

    find_manual_ground_entries(directory, config, &mut entry_points)?;
    find_promptfoo_file_reference_entries(directory, directory, &mut entry_points)?;
    find_wrangler_entry_points(directory, directory, &mut entry_points)?;
    
    Ok(entry_points)
}

fn find_manual_ground_entries(
    directory: &Path,
    config: &GroundConfig,
    entries: &mut Vec<EntryPoint>,
) -> std::io::Result<()> {
    if config.entry_points.manual.is_empty() {
        return Ok(());
    }

    let mut modules = HashSet::new();
    collect_modules(directory, &mut modules)?;

    for path in modules {
        if config.is_manual_entry_point(directory, &path) {
            let relative_path = path.strip_prefix(directory)
                .map(|path| path.display().to_string())
                .unwrap_or_else(|_| path.display().to_string());
            entries.push(EntryPoint {
                path,
                entry_type: EntryPointType::GroundManual,
                description: format!(
                    "Ground entry_points.manual: {}",
                    relative_path.replace('\\', "/"),
                ),
            });
        }
    }

    Ok(())
}

fn find_promptfoo_file_reference_entries(
    root: &Path,
    directory: &Path,
    entries: &mut Vec<EntryPoint>,
) -> std::io::Result<()> {
    let read_dir = match fs::read_dir(directory) {
        Ok(entries) => entries,
        Err(_) => return Ok(()),
    };

    for entry in read_dir.flatten() {
        let path = entry.path();
        let name = path.file_name().and_then(|name| name.to_str()).unwrap_or("");
        if name.starts_with('.') ||
           matches!(name, "node_modules" | "dist" | "build" | ".svelte-kit" | "target") {
            continue;
        }

        if path.is_dir() {
            find_promptfoo_file_reference_entries(root, &path, entries)?;
        } else if path.is_file() && is_promptfoo_config(name) {
            entries.extend(promptfoo_file_reference_entries(root, &path));
        }
    }

    Ok(())
}

fn is_promptfoo_config(name: &str) -> bool {
    name.starts_with("promptfooconfig") &&
        (name.ends_with(".yaml") || name.ends_with(".yml"))
}

fn promptfoo_file_reference_entries(root: &Path, config_path: &Path) -> Vec<EntryPoint> {
    let Ok(contents) = fs::read_to_string(config_path) else {
        return Vec::new();
    };
    let Ok(config) = serde_yaml::from_str::<serde_yaml::Value>(&contents) else {
        return Vec::new();
    };
    let references = promptfoo_file_references(&config);
    references.into_iter()
        .filter_map(|(field, id)| {
            let path = id.strip_prefix("file://")?.to_string();
            Some((field, id, path))
        })
        .filter_map(|(field, id, path)| resolve_local_config_reference(config_path, &path)
            .map(|resolved| (field, id, resolved)))
        .map(|(field, id, path)| {
            let config_relative = config_path.strip_prefix(root)
                .map(|path| path.display().to_string())
                .unwrap_or_else(|_| config_path.display().to_string());
            EntryPoint {
                path,
                entry_type: EntryPointType::PromptfooFileReference,
                description: format!(
                    "Promptfoo {} in {}: {}",
                    field,
                    config_relative.replace('\\', "/"),
                    id,
                ),
            }
        })
        .collect()
}

fn promptfoo_file_references(config: &serde_yaml::Value) -> Vec<(String, String)> {
    let Some(mapping) = config.as_mapping() else {
        return Vec::new();
    };
    let mut references = Vec::new();

    for field in ["providers", "prompts"] {
        let Some(entries) = mapping
            .get(serde_yaml::Value::String(field.to_string()))
            .and_then(serde_yaml::Value::as_sequence)
        else {
            continue;
        };
        for entry in entries {
            if let Some(id) = entry.as_mapping()
                .and_then(|entry| entry.get(serde_yaml::Value::String("id".to_string())))
                .and_then(serde_yaml::Value::as_str) {
                references.push((format!("{}[].id", field), id.to_string()));
            }
        }
    }

    if let Some(default_test) = mapping
        .get(serde_yaml::Value::String("defaultTest".to_string())) {
        collect_promptfoo_assertion_values(
            default_test,
            "defaultTest.assert[].value",
            &mut references,
        );
    }
    if let Some(tests) = mapping
        .get(serde_yaml::Value::String("tests".to_string()))
        .and_then(serde_yaml::Value::as_sequence) {
        for test in tests {
            collect_promptfoo_assertion_values(test, "tests[].assert[].value", &mut references);
        }
    }

    references
}

fn collect_promptfoo_assertion_values(
    test: &serde_yaml::Value,
    field: &str,
    references: &mut Vec<(String, String)>,
) {
    let Some(assertions) = test.as_mapping()
        .and_then(|test| test.get(serde_yaml::Value::String("assert".to_string())))
        .and_then(serde_yaml::Value::as_sequence)
    else {
        return;
    };
    for assertion in assertions {
        if let Some(value) = assertion.as_mapping()
            .and_then(|assertion| assertion.get(serde_yaml::Value::String("value".to_string())))
            .and_then(serde_yaml::Value::as_str) {
            references.push((field.to_string(), value.to_string()));
        }
    }
}

fn resolve_local_config_reference(config_path: &Path, reference: &str) -> Option<PathBuf> {
    let reference_path = Path::new(reference);
    if reference_path.is_absolute() || reference_path.components().any(|component| {
        matches!(component,
            std::path::Component::ParentDir |
            std::path::Component::RootDir |
            std::path::Component::Prefix(_)
        )
    }) {
        return None;
    }

    let candidate = config_path.parent()?.join(reference_path);
    let config_directory = config_path.parent()?.canonicalize().ok()?;
    let canonical_candidate = candidate.canonicalize().ok()?;
    if !canonical_candidate.starts_with(&config_directory) {
        return None;
    }
    let extension = candidate.extension().and_then(|extension| extension.to_str()).unwrap_or("");
    if !matches!(extension, "ts" | "tsx" | "js" | "jsx" | "mjs" | "svelte") || !candidate.is_file() {
        return None;
    }

    Some(candidate)
}

fn find_wrangler_entry_points(
    root: &Path,
    directory: &Path,
    entries: &mut Vec<EntryPoint>,
) -> std::io::Result<()> {
    let read_dir = match fs::read_dir(directory) {
        Ok(entries) => entries,
        Err(_) => return Ok(()),
    };

    for entry in read_dir.flatten() {
        let path = entry.path();
        let name = path.file_name().and_then(|name| name.to_str()).unwrap_or("");
        if name.starts_with('.') ||
           matches!(name, "node_modules" | "dist" | "build" | ".svelte-kit" | "target") {
            continue;
        }

        if path.is_dir() {
            find_wrangler_entry_points(root, &path, entries)?;
        } else if path.is_file() && matches!(name, "wrangler.toml" | "wrangler.json") {
            if let Ok(Some(entry)) = find_wrangler_entry(root, &path) {
                entries.push(entry);
            }
        }
    }

    Ok(())
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

    if matches!(
        name,
        "svelte.config.js" | "svelte.config.ts" |
        "vite.config.js" | "vite.config.ts" | "vite.config.mjs" |
        "next.config.js" | "next.config.ts" | "next.config.mjs" |
        "remix.config.js"
    ) {
        return Some(EntryPoint {
            path: path.to_path_buf(),
            entry_type: EntryPointType::FrameworkConfig,
            description: format!("Framework config: {}", path.display()),
        });
    }

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

fn find_wrangler_entry(root: &Path, wrangler_path: &Path) -> std::io::Result<Option<EntryPoint>> {
    let content = fs::read_to_string(wrangler_path)?;
    let main = match wrangler_path.extension().and_then(|extension| extension.to_str()) {
        Some("toml") => content.parse::<toml::Value>()
            .map_err(|error| std::io::Error::new(std::io::ErrorKind::InvalidData, error))?
            .get("main")
            .and_then(toml::Value::as_str)
            .map(str::to_owned),
        Some("json") => serde_json::from_str::<serde_json::Value>(&content)
            .map_err(|error| std::io::Error::new(std::io::ErrorKind::InvalidData, error))?
            .get("main")
            .and_then(serde_json::Value::as_str)
            .map(str::to_owned),
        _ => None,
    };
    let Some(main) = main else {
        return Ok(None);
    };
    let Some(main_path) = resolve_local_config_reference(wrangler_path, &main) else {
        return Ok(None);
    };
    let config_relative = wrangler_path.strip_prefix(root)
        .map(|path| path.display().to_string())
        .unwrap_or_else(|_| wrangler_path.display().to_string());

    Ok(Some(EntryPoint {
        path: main_path,
        entry_type: EntryPointType::CloudflareWorker,
        description: format!("{} main: {}", config_relative.replace('\\', "/"), main),
    }))
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
            if matches!(ext, "ts" | "tsx" | "js" | "jsx" | "mjs" | "svelte") {
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

    #[test]
    fn nested_wrangler_json_main_is_a_cloudflare_entry_point() {
        let dir = tempdir().unwrap();
        let worker_directory = dir.path().join("apps/worker");
        fs::create_dir_all(&worker_directory).unwrap();
        fs::write(
            worker_directory.join("wrangler.json"),
            r#"{"main":"worker.mjs"}"#,
        ).unwrap();
        fs::write(worker_directory.join("worker.mjs"), "export default {}\n").unwrap();
        fs::write(worker_directory.join("orphan.mjs"), "export default {}\n").unwrap();

        let report = analyze_reachability(dir.path()).unwrap();
        let worker = report.modules.iter()
            .find(|module| module.path.ends_with("apps/worker/worker.mjs"))
            .unwrap();
        let orphan = report.modules.iter()
            .find(|module| module.path.ends_with("apps/worker/orphan.mjs"))
            .unwrap();

        assert_eq!(worker.status, ReachabilityStatus::EntryPoint);
        assert_eq!(orphan.status, ReachabilityStatus::Unreachable);
        assert!(report.entry_points.iter().any(|entry| {
            entry.path.ends_with("apps/worker/worker.mjs") &&
                entry.entry_type == EntryPointType::CloudflareWorker &&
                entry.description.contains("wrangler.json main")
        }));
    }

    #[test]
    fn promptfoo_file_references_are_narrow_and_path_confined() {
        let dir = tempdir().unwrap();
        let benchmarks = dir.path().join("benchmarks");
        let providers = benchmarks.join("providers");
        fs::create_dir_all(&providers).unwrap();
        fs::write(providers.join("allowed.js"), "export default {};\n").unwrap();
        fs::write(benchmarks.join("loc.js"), "export default {};\n").unwrap();
        fs::write(
            benchmarks.join("promptfooconfig.yaml"),
            "providers:\n  - id: file://providers/allowed.js\nprompts:\n  - id: file://providers/allowed.js\n  - id: file://../outside.js\ndefaultTest:\n  assert:\n    - value: file://loc.js\n",
        ).unwrap();
        fs::write(
            benchmarks.join("workflow.yaml"),
            "prompts:\n  - id: file://providers/allowed.js\n",
        ).unwrap();

        let entries = find_entry_points(dir.path()).unwrap();
        let promptfoo_entries: Vec<_> = entries.iter()
            .filter(|entry| entry.entry_type == EntryPointType::PromptfooFileReference)
            .collect();

        assert_eq!(promptfoo_entries.len(), 3);
        assert!(promptfoo_entries.iter().any(|entry| {
            entry.path.ends_with("benchmarks/providers/allowed.js") &&
                entry.description.contains("providers[].id")
        }));
        assert!(promptfoo_entries.iter().any(|entry| {
            entry.path.ends_with("benchmarks/providers/allowed.js") &&
                entry.description.contains("prompts[].id")
        }));
        assert!(promptfoo_entries.iter().any(|entry| {
            entry.path.ends_with("benchmarks/loc.js") &&
                entry.description.contains("defaultTest.assert[].value") &&
                entry.description.contains("benchmarks/promptfooconfig.yaml")
        }));
    }
}
