//! Connectivity Computation (Heidegger Level)
//!
//! Analyzes how modules connect to the rest of the system.
//! A module "serves the whole" if it's connected.
//!
//! ## Architecture-Aware Connectivity
//!
//! Beyond import-level connections, we recognize architectural connections:
//! - Cloudflare Workers: routes, crons, bindings (KV, D1, R2, services)
//! - Serverless functions: HTTP triggers, event bindings
//!
//! A Worker with no import connections but valid deployment configuration
//! IS connected to the whole - through deployment topology, not code imports.

use std::path::{Path, PathBuf};
use std::fs;
use serde::{Serialize, Deserialize};
use serde_json;
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
    
    /// Architectural connections (non-import based)
    pub architectural: Option<ArchitecturalConnections>,
    
    /// When this computation was performed
    pub computed_at: DateTime<Utc>,
}

/// Architectural connections detected from deployment configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArchitecturalConnections {
    /// Type of architecture (e.g., "cloudflare-worker", "serverless")
    pub architecture_type: String,
    
    /// HTTP routes this service responds to
    pub routes: Vec<String>,
    
    /// Cron schedules that trigger this service
    pub crons: Vec<String>,
    
    /// Resource bindings (KV, D1, R2, etc.)
    pub bindings: Vec<ServiceBinding>,
    
    /// Service-to-service bindings
    pub service_bindings: Vec<String>,
    
    /// Custom domains configured
    pub custom_domains: Vec<String>,
    
    /// Total architectural connections
    pub total_connections: u32,
}

/// A binding to an external service/resource
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceBinding {
    /// Type of binding (kv, d1, r2, service, etc.)
    pub binding_type: String,
    
    /// Name of the binding in code
    pub name: String,
    
    /// External resource identifier (if any)
    pub resource_id: Option<String>,
}

impl ConnectivityEvidence {
    /// Check if this module "serves the whole" (has minimum connections)
    pub fn serves_whole(&self, min_connections: u32) -> bool {
        let code_connections = self.incoming_connections + self.outgoing_connections;
        let arch_connections = self.architectural.as_ref()
            .map(|a| a.total_connections)
            .unwrap_or(0);
        
        code_connections >= min_connections || arch_connections >= min_connections
    }
    
    /// Total connections (code + architectural)
    pub fn total_connections(&self) -> u32 {
        let code = self.incoming_connections + self.outgoing_connections;
        let arch = self.architectural.as_ref()
            .map(|a| a.total_connections)
            .unwrap_or(0);
        code + arch
    }
    
    /// Whether this has architectural connections (Worker/serverless)
    pub fn has_architectural_connections(&self) -> bool {
        self.architectural.as_ref()
            .map(|a| a.total_connections > 0)
            .unwrap_or(false)
    }
}

/// Analyze connectivity of a module
pub fn analyze_connectivity(module_path: &Path) -> Result<ConnectivityEvidence, ComputationError> {
    // Canonicalize path to handle relative paths correctly
    let module_path = module_path.canonicalize()
        .map_err(|_| ComputationError::FileNotFound(module_path.to_path_buf()))?;
    
    // Find the project root (look for package.json, Cargo.toml, etc.)
    let project_root = find_project_root(&module_path)?;
    
    // Analyze what this module imports
    let imports = analyze_imports(&module_path)?;
    
    // Analyze who imports this module
    let imported_by = find_importers(&module_path, &project_root)?;
    
    // Check for architectural connections (Workers, serverless)
    let architectural = detect_architectural_connections(&module_path);
    
    let incoming_connections = imported_by.len() as u32;
    let outgoing_connections = imports.len() as u32;
    
    // Connected if has code connections OR architectural connections
    let arch_connections = architectural.as_ref()
        .map(|a| a.total_connections)
        .unwrap_or(0);
    let is_connected = incoming_connections > 0 || outgoing_connections > 0 || arch_connections > 0;
    
    Ok(ConnectivityEvidence {
        id: Uuid::new_v4(),
        module_path: module_path.to_path_buf(),
        is_connected,
        incoming_connections,
        outgoing_connections,
        imported_by,
        imports,
        architectural,
        computed_at: Utc::now(),
    })
}

/// Detect architectural connections from deployment configuration
fn detect_architectural_connections(module_path: &Path) -> Option<ArchitecturalConnections> {
    // First check for Cloudflare Worker (wrangler.toml)
    if let Some(wrangler_path) = find_wrangler_toml(module_path) {
        if let Some(arch) = parse_wrangler_toml(&wrangler_path) {
            return Some(arch);
        }
    }
    
    // Check for browser extension (manifest.json)
    if let Some(ext_arch) = detect_browser_extension_entry(module_path) {
        return Some(ext_arch);
    }
    
    // Then check for package.json bin/main entry points
    if let Some(pkg_arch) = detect_package_json_entry(module_path) {
        return Some(pkg_arch);
    }
    
    None
}

/// Detect if module is an entry point referenced by a browser extension manifest.json
/// 
/// Browser extensions have a unique architecture where:
/// - manifest.json is the entry point (not a JS file)
/// - Files are connected via manifest references, not imports:
///   - background.service_worker: "background.js"
///   - action.default_popup: "popup.html" → <script src="popup.js">
///   - content_scripts[].js: ["content.js"]
///   - options_page / options_ui.page
///   - devtools_page
fn detect_browser_extension_entry(module_path: &Path) -> Option<ArchitecturalConnections> {
    let manifest_path = find_manifest_json(module_path)?;
    let manifest_dir = manifest_path.parent()?;
    let content = fs::read_to_string(&manifest_path).ok()?;
    let json: serde_json::Value = serde_json::from_str(&content).ok()?;
    
    // Verify this is a browser extension manifest (has manifest_version)
    if json.get("manifest_version").is_none() {
        return None;
    }
    
    // Get module filename and path relative to manifest
    let module_name = module_path.file_name()?.to_str()?;
    let relative_path = module_path.strip_prefix(manifest_dir).ok()?;
    let relative_str = relative_path.to_str()?;
    
    let mut entry_points = Vec::new();
    
    // Check background.service_worker (Manifest V3)
    if let Some(background) = json.get("background") {
        if let Some(sw) = background.get("service_worker").and_then(|v| v.as_str()) {
            if path_matches_extension_entry(sw, relative_str, module_name) {
                entry_points.push(format!("background.service_worker: {}", sw));
            }
        }
        // Manifest V2 background scripts
        if let Some(scripts) = background.get("scripts").and_then(|v| v.as_array()) {
            for script in scripts {
                if let Some(s) = script.as_str() {
                    if path_matches_extension_entry(s, relative_str, module_name) {
                        entry_points.push(format!("background.scripts[]: {}", s));
                    }
                }
            }
        }
    }
    
    // Check action/browser_action/page_action popup (can be HTML that references JS)
    for action_key in &["action", "browser_action", "page_action"] {
        if let Some(action) = json.get(*action_key) {
            if let Some(popup) = action.get("default_popup").and_then(|v| v.as_str()) {
                // Check if our module is referenced by the popup HTML
                if let Some(html_entry) = check_html_script_reference(manifest_dir, popup, module_name, relative_str) {
                    entry_points.push(html_entry);
                }
            }
        }
    }
    
    // Check content_scripts
    if let Some(content_scripts) = json.get("content_scripts").and_then(|v| v.as_array()) {
        for (i, cs) in content_scripts.iter().enumerate() {
            if let Some(js_files) = cs.get("js").and_then(|v| v.as_array()) {
                for script in js_files {
                    if let Some(s) = script.as_str() {
                        if path_matches_extension_entry(s, relative_str, module_name) {
                            entry_points.push(format!("content_scripts[{}].js: {}", i, s));
                        }
                    }
                }
            }
        }
    }
    
    // Check options_page (string) and options_ui.page (can be HTML)
    if let Some(options_page) = json.get("options_page").and_then(|v| v.as_str()) {
        if let Some(html_entry) = check_html_script_reference(manifest_dir, options_page, module_name, relative_str) {
            entry_points.push(html_entry);
        } else if path_matches_extension_entry(options_page, relative_str, module_name) {
            entry_points.push(format!("options_page: {}", options_page));
        }
    }
    if let Some(options_ui) = json.get("options_ui") {
        if let Some(page) = options_ui.get("page").and_then(|v| v.as_str()) {
            if let Some(html_entry) = check_html_script_reference(manifest_dir, page, module_name, relative_str) {
                entry_points.push(html_entry);
            }
        }
    }
    
    // Check devtools_page
    if let Some(devtools) = json.get("devtools_page").and_then(|v| v.as_str()) {
        if let Some(html_entry) = check_html_script_reference(manifest_dir, devtools, module_name, relative_str) {
            entry_points.push(html_entry);
        }
    }
    
    // Check sandbox.pages
    if let Some(sandbox) = json.get("sandbox") {
        if let Some(pages) = sandbox.get("pages").and_then(|v| v.as_array()) {
            for page in pages {
                if let Some(p) = page.as_str() {
                    if let Some(html_entry) = check_html_script_reference(manifest_dir, p, module_name, relative_str) {
                        entry_points.push(html_entry);
                    }
                }
            }
        }
    }
    
    // Check web_accessible_resources (Manifest V3)
    if let Some(war) = json.get("web_accessible_resources").and_then(|v| v.as_array()) {
        for resource_set in war {
            if let Some(resources) = resource_set.get("resources").and_then(|v| v.as_array()) {
                for resource in resources {
                    if let Some(r) = resource.as_str() {
                        if path_matches_extension_entry(r, relative_str, module_name) {
                            entry_points.push(format!("web_accessible_resources[].resources: {}", r));
                        }
                    }
                }
            }
        }
    }
    
    if entry_points.is_empty() {
        return None;
    }
    
    Some(ArchitecturalConnections {
        architecture_type: "browser-extension".to_string(),
        routes: entry_points,  // Reuse routes field for entry point descriptions
        crons: Vec::new(),
        bindings: Vec::new(),
        service_bindings: Vec::new(),
        custom_domains: Vec::new(),
        total_connections: 1,  // Extension entry points count as 1 architectural connection
    })
}

/// Check if a module path matches an extension entry path
fn path_matches_extension_entry(entry_path: &str, relative_path: &str, module_name: &str) -> bool {
    let entry_normalized = entry_path.trim_start_matches("./");
    let rel_normalized = relative_path.replace('\\', "/");
    
    // Direct match
    if entry_normalized == rel_normalized {
        return true;
    }
    
    // Match just filename
    let entry_filename = entry_path.rsplit('/').next().unwrap_or(entry_path);
    if entry_filename == module_name {
        return true;
    }
    
    false
}

/// Check if an HTML file references a JS module via <script> tag
fn check_html_script_reference(base_dir: &Path, html_path: &str, module_name: &str, relative_str: &str) -> Option<String> {
    let html_file = base_dir.join(html_path);
    let html_content = fs::read_to_string(&html_file).ok()?;
    
    // Simple regex-free script tag detection
    // Look for patterns like: <script src="popup.js"> or <script src="./popup.js">
    for line in html_content.lines() {
        if line.contains("<script") && line.contains("src=") {
            // Extract src value
            if let Some(src) = extract_script_src(line) {
                let src_normalized = src.trim_start_matches("./");
                
                // Check if this script references our module
                if src_normalized == module_name || 
                   src_normalized == relative_str ||
                   src.rsplit('/').next().unwrap_or(&src) == module_name {
                    return Some(format!("{} → <script src=\"{}\">", html_path, src));
                }
            }
        }
    }
    
    None
}

/// Extract src value from a script tag line
fn extract_script_src(line: &str) -> Option<String> {
    // Handle both src="..." and src='...'
    let src_start = line.find("src=")?;
    let after_src = &line[src_start + 4..];
    
    let quote_char = after_src.chars().next()?;
    if quote_char != '"' && quote_char != '\'' {
        return None;
    }
    
    let content_start = 1; // Skip opening quote
    let rest = &after_src[content_start..];
    let end = rest.find(quote_char)?;
    
    Some(rest[..end].to_string())
}

/// Find manifest.json starting from module path and going up
fn find_manifest_json(start: &Path) -> Option<PathBuf> {
    let mut current = if start.is_file() {
        start.parent()?
    } else {
        start
    };
    
    // Check up to 5 levels up
    for _ in 0..5 {
        let manifest_path = current.join("manifest.json");
        if manifest_path.exists() {
            // Quick check that it's a browser extension manifest
            if let Ok(content) = fs::read_to_string(&manifest_path) {
                if content.contains("manifest_version") {
                    return Some(manifest_path);
                }
            }
        }
        
        // Stop at monorepo/project markers
        if current.join("pnpm-workspace.yaml").exists() ||
           current.join("package.json").exists() && 
           !current.join("manifest.json").exists() {
            // If we hit a package.json without manifest.json, it's probably not an extension
            break;
        }
        
        current = current.parent()?;
    }
    
    None
}

/// Detect if module is an entry point defined in package.json (bin, main, exports, scripts)
fn detect_package_json_entry(module_path: &Path) -> Option<ArchitecturalConnections> {
    let package_json_path = find_package_json(module_path)?;
    let content = fs::read_to_string(&package_json_path).ok()?;
    let json: serde_json::Value = serde_json::from_str(&content).ok()?;
    
    // Get module filename without extension for matching
    let module_stem = module_path.file_stem()?.to_str()?;
    let module_name = module_path.file_name()?.to_str()?;
    
    // Get path relative to package.json directory
    let pkg_dir = package_json_path.parent()?;
    let relative_path = module_path.strip_prefix(pkg_dir).ok()?;
    let relative_str = relative_path.to_str()?;
    
    let mut entry_points = Vec::new();
    
    // Check "main" field
    if let Some(main) = json.get("main").and_then(|v| v.as_str()) {
        if path_matches_module(main, relative_str, module_stem) {
            entry_points.push(format!("main: {}", main));
        }
    }
    
    // Check "bin" field (can be string or object)
    if let Some(bin) = json.get("bin") {
        if let Some(bin_str) = bin.as_str() {
            if path_matches_module(bin_str, relative_str, module_stem) {
                entry_points.push(format!("bin: {}", bin_str));
            }
        } else if let Some(bin_obj) = bin.as_object() {
            for (name, path_val) in bin_obj {
                if let Some(path_str) = path_val.as_str() {
                    if path_matches_module(path_str, relative_str, module_stem) {
                        entry_points.push(format!("bin.{}: {}", name, path_str));
                    }
                }
            }
        }
    }
    
    // Check "exports" field (simplified - handles common patterns)
    if let Some(exports) = json.get("exports") {
        check_exports_recursive(exports, relative_str, module_stem, &mut entry_points, "exports");
    }
    
    // Check "scripts" field for npm lifecycle scripts that reference this file
    // Common patterns: "postinstall": "node install.js", "prepare": "node scripts/build.js"
    if let Some(scripts) = json.get("scripts").and_then(|v| v.as_object()) {
        for (script_name, script_val) in scripts {
            if let Some(script_cmd) = script_val.as_str() {
                // Check if script references our module
                // Patterns to detect:
                // - "node install.js"
                // - "node ./install.js"  
                // - "node scripts/build.js"
                // - "tsx install.ts"
                // - "npx ts-node install.ts"
                if script_references_module(script_cmd, module_name, relative_str) {
                    entry_points.push(format!("scripts.{}: {}", script_name, script_cmd));
                }
            }
        }
    }
    
    if entry_points.is_empty() {
        return None;
    }
    
    Some(ArchitecturalConnections {
        architecture_type: "package-entry".to_string(),
        routes: entry_points,  // Reuse routes field for entry point descriptions
        crons: Vec::new(),
        bindings: Vec::new(),
        service_bindings: Vec::new(),
        custom_domains: Vec::new(),
        total_connections: 1,  // Entry points count as 1 architectural connection
    })
}

/// Check if an npm script command references a module
fn script_references_module(script_cmd: &str, module_name: &str, relative_path: &str) -> bool {
    // Split command by common shell operators
    let parts: Vec<&str> = script_cmd.split(|c| c == ' ' || c == '&' || c == '|' || c == ';')
        .filter(|s| !s.is_empty())
        .collect();
    
    for part in parts {
        let normalized = part.trim_start_matches("./");
        
        // Direct match with module name
        if normalized == module_name {
            return true;
        }
        
        // Match with relative path
        if normalized == relative_path || normalized == relative_path.replace('\\', "/") {
            return true;
        }
        
        // Check if the part ends with the module name (e.g., "scripts/install.js")
        if normalized.ends_with(module_name) {
            return true;
        }
        
        // Handle extensionless references (node install -> install.js)
        let module_stem = module_name.rsplit('.').last().unwrap_or(module_name);
        if let Some(name_without_ext) = module_name.strip_suffix(".js")
            .or_else(|| module_name.strip_suffix(".ts"))
            .or_else(|| module_name.strip_suffix(".mjs"))
            .or_else(|| module_name.strip_suffix(".cjs"))
        {
            if normalized == name_without_ext {
                return true;
            }
        }
        
        // Also check module_stem directly
        if normalized == module_stem {
            return true;
        }
    }
    
    false
}

/// Check if a package.json path matches our module
fn path_matches_module(pkg_path: &str, relative_path: &str, module_stem: &str) -> bool {
    // Normalize paths for comparison
    let pkg_normalized = pkg_path.trim_start_matches("./");
    let rel_normalized = relative_path.replace('\\', "/");
    
    // Direct match (with or without dist/)
    if pkg_normalized == rel_normalized {
        return true;
    }
    
    // Match dist/foo.js to src/foo.ts
    if pkg_normalized.starts_with("dist/") || pkg_normalized.starts_with("./dist/") {
        let dist_stem = pkg_normalized
            .trim_start_matches("./")
            .trim_start_matches("dist/")
            .trim_end_matches(".js")
            .trim_end_matches(".cjs")
            .trim_end_matches(".mjs");
        
        // Check if our module stem matches
        if dist_stem == module_stem || 
           rel_normalized.ends_with(&format!("{}.ts", dist_stem)) ||
           rel_normalized.ends_with(&format!("{}.tsx", dist_stem)) ||
           rel_normalized == format!("src/{}.ts", dist_stem) {
            return true;
        }
    }
    
    // Match based on filename
    let pkg_stem = std::path::Path::new(pkg_path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("");
    
    pkg_stem == module_stem
}

/// Recursively check exports field for matching paths
fn check_exports_recursive(
    exports: &serde_json::Value,
    relative_path: &str,
    module_stem: &str,
    entry_points: &mut Vec<String>,
    path_prefix: &str,
) {
    match exports {
        serde_json::Value::String(s) => {
            if path_matches_module(s, relative_path, module_stem) {
                entry_points.push(format!("{}: {}", path_prefix, s));
            }
        }
        serde_json::Value::Object(obj) => {
            for (key, val) in obj {
                let new_prefix = if key.starts_with('.') {
                    format!("exports[{}]", key)
                } else {
                    format!("{}.{}", path_prefix, key)
                };
                check_exports_recursive(val, relative_path, module_stem, entry_points, &new_prefix);
            }
        }
        _ => {}
    }
}

/// Find package.json starting from module path and going up
fn find_package_json(start: &Path) -> Option<PathBuf> {
    let mut current = if start.is_file() {
        start.parent()?
    } else {
        start
    };
    
    // Check up to 5 levels up (within same package)
    for _ in 0..5 {
        let pkg_path = current.join("package.json");
        if pkg_path.exists() {
            return Some(pkg_path);
        }
        
        // Stop at monorepo markers (don't go to parent package)
        if current.join("pnpm-workspace.yaml").exists() ||
           current.join("lerna.json").exists() {
            break;
        }
        
        current = current.parent()?;
    }
    
    None
}

/// Find wrangler.toml starting from module path and going up
fn find_wrangler_toml(start: &Path) -> Option<PathBuf> {
    let mut current = if start.is_file() {
        start.parent()?
    } else {
        start
    };
    
    // Check up to 5 levels up
    for _ in 0..5 {
        let wrangler_path = current.join("wrangler.toml");
        if wrangler_path.exists() {
            return Some(wrangler_path);
        }
        
        // Also check wrangler.jsonc
        let wrangler_jsonc = current.join("wrangler.jsonc");
        if wrangler_jsonc.exists() {
            // We only parse TOML for now, but note it exists
            return None;
        }
        
        current = current.parent()?;
    }
    
    None
}

/// Parse wrangler.toml and extract architectural connections
fn parse_wrangler_toml(path: &Path) -> Option<ArchitecturalConnections> {
    let content = fs::read_to_string(path).ok()?;
    let value: toml::Value = content.parse().ok()?;
    
    let mut routes = Vec::new();
    let mut crons = Vec::new();
    let mut bindings = Vec::new();
    let mut service_bindings = Vec::new();
    let mut custom_domains = Vec::new();
    
    // Parse routes
    if let Some(route) = value.get("route").and_then(|v| v.as_str()) {
        routes.push(route.to_string());
    }
    if let Some(routes_arr) = value.get("routes").and_then(|v| v.as_array()) {
        for r in routes_arr {
            if let Some(s) = r.as_str() {
                routes.push(s.to_string());
            } else if let Some(obj) = r.as_table() {
                if let Some(pattern) = obj.get("pattern").and_then(|v| v.as_str()) {
                    routes.push(pattern.to_string());
                }
            }
        }
    }
    
    // Parse custom domains
    if let Some(domains) = value.get("custom_domains").and_then(|v| v.as_array()) {
        for d in domains {
            if let Some(s) = d.as_str() {
                custom_domains.push(s.to_string());
            }
        }
    }
    
    // Parse triggers (crons)
    if let Some(triggers) = value.get("triggers").and_then(|v| v.as_table()) {
        if let Some(crons_arr) = triggers.get("crons").and_then(|v| v.as_array()) {
            for c in crons_arr {
                if let Some(s) = c.as_str() {
                    crons.push(s.to_string());
                }
            }
        }
    }
    
    // Parse KV namespaces
    if let Some(kv) = value.get("kv_namespaces").and_then(|v| v.as_array()) {
        for ns in kv {
            if let Some(obj) = ns.as_table() {
                let name = obj.get("binding")
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown")
                    .to_string();
                let id = obj.get("id")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());
                bindings.push(ServiceBinding {
                    binding_type: "kv".to_string(),
                    name,
                    resource_id: id,
                });
            }
        }
    }
    
    // Parse D1 databases
    if let Some(d1) = value.get("d1_databases").and_then(|v| v.as_array()) {
        for db in d1 {
            if let Some(obj) = db.as_table() {
                let name = obj.get("binding")
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown")
                    .to_string();
                let id = obj.get("database_id")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());
                bindings.push(ServiceBinding {
                    binding_type: "d1".to_string(),
                    name,
                    resource_id: id,
                });
            }
        }
    }
    
    // Parse R2 buckets
    if let Some(r2) = value.get("r2_buckets").and_then(|v| v.as_array()) {
        for bucket in r2 {
            if let Some(obj) = bucket.as_table() {
                let name = obj.get("binding")
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown")
                    .to_string();
                let id = obj.get("bucket_name")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());
                bindings.push(ServiceBinding {
                    binding_type: "r2".to_string(),
                    name,
                    resource_id: id,
                });
            }
        }
    }
    
    // Parse service bindings
    if let Some(services) = value.get("services").and_then(|v| v.as_array()) {
        for svc in services {
            if let Some(obj) = svc.as_table() {
                let name = obj.get("binding")
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown");
                let service = obj.get("service")
                    .and_then(|v| v.as_str())
                    .unwrap_or(name);
                service_bindings.push(service.to_string());
                bindings.push(ServiceBinding {
                    binding_type: "service".to_string(),
                    name: name.to_string(),
                    resource_id: Some(service.to_string()),
                });
            }
        }
    }
    
    // Parse Durable Objects
    if let Some(durable) = value.get("durable_objects").and_then(|v| v.as_table()) {
        if let Some(durable_bindings) = durable.get("bindings").and_then(|v| v.as_array()) {
            for obj in durable_bindings {
                if let Some(tbl) = obj.as_table() {
                    let name = tbl.get("name")
                        .and_then(|v| v.as_str())
                        .unwrap_or("unknown")
                        .to_string();
                    let class = tbl.get("class_name")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string());
                    bindings.push(ServiceBinding {
                        binding_type: "durable_object".to_string(),
                        name,
                        resource_id: class,
                    });
                }
            }
        }
    }
    
    // Parse Queues
    if let Some(queues) = value.get("queues").and_then(|v| v.as_table()) {
        // Producer queues
        if let Some(producers) = queues.get("producers").and_then(|v| v.as_array()) {
            for q in producers {
                if let Some(obj) = q.as_table() {
                    let name = obj.get("binding")
                        .and_then(|v| v.as_str())
                        .unwrap_or("unknown")
                        .to_string();
                    let queue = obj.get("queue")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string());
                    bindings.push(ServiceBinding {
                        binding_type: "queue_producer".to_string(),
                        name,
                        resource_id: queue,
                    });
                }
            }
        }
        // Consumer queues
        if let Some(consumers) = queues.get("consumers").and_then(|v| v.as_array()) {
            for q in consumers {
                if let Some(obj) = q.as_table() {
                    let queue = obj.get("queue")
                        .and_then(|v| v.as_str())
                        .unwrap_or("unknown")
                        .to_string();
                    bindings.push(ServiceBinding {
                        binding_type: "queue_consumer".to_string(),
                        name: queue.clone(),
                        resource_id: Some(queue),
                    });
                }
            }
        }
    }
    
    // Parse tail consumers
    if let Some(tail) = value.get("tail_consumers").and_then(|v| v.as_array()) {
        for t in tail {
            if let Some(obj) = t.as_table() {
                let service = obj.get("service")
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown")
                    .to_string();
                bindings.push(ServiceBinding {
                    binding_type: "tail".to_string(),
                    name: "tail".to_string(),
                    resource_id: Some(service),
                });
            }
        }
    }
    
    // Calculate total connections
    let total_connections = routes.len() as u32
        + crons.len() as u32
        + bindings.len() as u32
        + custom_domains.len() as u32;
    
    if total_connections == 0 {
        return None;
    }
    
    Some(ArchitecturalConnections {
        architecture_type: "cloudflare-worker".to_string(),
        routes,
        crons,
        bindings,
        service_bindings,
        custom_domains,
        total_connections,
    })
}

fn find_project_root(start: &Path) -> Result<PathBuf, ComputationError> {
    let mut current = start.parent().unwrap_or(start);
    
    loop {
        // Check for common project markers (including monorepo markers)
        for marker in &[
            "package.json",
            "pnpm-workspace.yaml",  // pnpm monorepo
            "pnpm-lock.yaml",       // pnpm project
            "yarn.lock",            // yarn project
            "package-lock.json",    // npm project
            "Cargo.toml",
            "pyproject.toml",
            "go.mod",
            ".git",                 // Git root as fallback
        ] {
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
    // Gracefully handle directories that can't be read
    let entries = match fs::read_dir(dir) {
        Ok(entries) => entries,
        Err(_) => return Ok(()), // Skip unreadable directories
    };
    
    for entry in entries {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue, // Skip unreadable entries
        };
        let path = entry.path();
        
        // Skip hidden and generated directories
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            if name.starts_with('.') || matches!(name, "node_modules" | "target" | "dist" | "build") {
                continue;
            }
        }
        
        // Check if path exists and is accessible (handles broken symlinks)
        if !path.exists() {
            continue;
        }
        
        if path.is_dir() {
            // Ignore errors in subdirectories
            let _ = find_importers_recursive(target, module_name, &path, importers);
        } else if path.is_file() && path != target {
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
            if matches!(ext, "ts" | "tsx" | "js" | "jsx") {
                if let Ok(content) = fs::read_to_string(&path) {
                    // Check if this file imports our target module
                    // Handle ESM-style .js imports pointing to .ts files
                    if imports_module(&content, module_name) {
                        importers.push(path);
                    }
                }
            }
        }
    }
    
    Ok(())
}

/// Check if content imports a module, handling ESM-style .js → .ts resolution
fn imports_module(content: &str, module_name: &str) -> bool {
    // Quick early exit
    if !content.contains(module_name) {
        return false;
    }
    
    // Check each line for imports
    for line in content.lines() {
        let line = line.trim();
        
        // Check for import/export patterns:
        // 1. import { foo } from './bar'
        // 2. export { foo } from './bar'
        // 3. } from './bar'  (multi-line imports)
        // 4. require('./bar')
        let is_import_line = line.contains("import") || 
                             line.contains("export") || 
                             line.contains("require") ||
                             (line.starts_with('}') && line.contains("from"));
        
        if !is_import_line {
            continue;
        }
        
        // Extract the path from the import/require
        let path = if line.contains("from") {
            extract_import_path_from_line(line)
        } else if line.contains("require(") {
            extract_require_path_from_line(line)
        } else {
            None
        };
        
        if let Some(import_path) = path {
            // Check if this import refers to our module
            // The import could be:
            // - ./format, ../format, ../../lib/format (no extension)
            // - ./format.js, ../format.js, ../../lib/format.js (ESM style)
            // - ./format.ts, ../format.ts (direct TS import)
            // - ./format/index, ./format/index.js (index imports)
            
            // Get the final segment (after last /)
            let final_segment = import_path.rsplit('/').next().unwrap_or(&import_path);
            
            // Check various endings
            if final_segment == module_name ||
               final_segment == format!("{}.js", module_name) ||
               final_segment == format!("{}.ts", module_name) ||
               final_segment == format!("{}.tsx", module_name) ||
               final_segment == format!("{}.jsx", module_name) ||
               final_segment == "index" && import_path.contains(&format!("/{}", module_name)) ||
               final_segment == "index.js" && import_path.contains(&format!("/{}", module_name)) ||
               final_segment == "index.ts" && import_path.contains(&format!("/{}", module_name)) {
                return true;
            }
        }
    }
    
    false
}

/// Extract import path from a line like: import { foo } from './bar'
fn extract_import_path_from_line(line: &str) -> Option<String> {
    let after_from = line.split("from").nth(1)?;
    let trimmed = after_from.trim();
    
    // Find the quoted string
    let (start_char, end_char) = if trimmed.starts_with('\'') {
        ('\'', '\'')
    } else if trimmed.starts_with('"') {
        ('"', '"')
    } else if trimmed.starts_with('`') {
        ('`', '`')
    } else {
        return None;
    };
    
    let start = trimmed.find(start_char)? + 1;
    let rest = &trimmed[start..];
    let end = rest.find(end_char)?;
    
    Some(rest[..end].to_string())
}

/// Extract require path from a line like: const foo = require('./bar')
fn extract_require_path_from_line(line: &str) -> Option<String> {
    let start = line.find("require(")? + 8;
    let rest = &line[start..];
    
    let quote_char = if rest.starts_with('\'') {
        '\''
    } else if rest.starts_with('"') {
        '"'
    } else {
        return None;
    };
    
    let content_start = rest.find(quote_char)? + 1;
    let content = &rest[content_start..];
    let end = content.find(quote_char)?;
    
    Some(content[..end].to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    use std::fs::File;
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
        // No architectural connections either
        assert!(evidence.architectural.is_none());
    }
    
    #[test]
    fn test_worker_with_architectural_connections() {
        let dir = tempdir().unwrap();
        
        // Create package.json
        File::create(dir.path().join("package.json")).unwrap()
            .write_all(b"{}").unwrap();
        
        // Create wrangler.toml with routes and bindings
        File::create(dir.path().join("wrangler.toml")).unwrap()
            .write_all(br#"
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"

routes = [
    { pattern = "api.example.com/*", zone_name = "example.com" }
]

[[kv_namespaces]]
binding = "CACHE"
id = "abc123"

[[d1_databases]]
binding = "DB"
database_id = "def456"

[triggers]
crons = ["0 * * * *"]
"#).unwrap();
        
        // Create an isolated module (nothing imports it)
        let worker = dir.path().join("src/index.ts");
        std::fs::create_dir(dir.path().join("src")).unwrap();
        File::create(&worker).unwrap()
            .write_all(b"export default { fetch() {} }").unwrap();
        
        let evidence = analyze_connectivity(&worker).unwrap();
        
        // Should be connected despite no import connections
        assert!(evidence.is_connected);
        assert_eq!(evidence.incoming_connections, 0);
        assert_eq!(evidence.outgoing_connections, 0);
        
        // Has architectural connections
        let arch = evidence.architectural.expect("Should have architectural connections");
        assert_eq!(arch.architecture_type, "cloudflare-worker");
        assert_eq!(arch.routes.len(), 1);
        assert_eq!(arch.crons.len(), 1);
        assert_eq!(arch.bindings.len(), 2); // KV + D1
        assert!(arch.total_connections >= 4);
    }
    
    #[test]
    fn test_worker_serves_whole() {
        let dir = tempdir().unwrap();
        
        File::create(dir.path().join("package.json")).unwrap()
            .write_all(b"{}").unwrap();
        
        // Minimal worker with just a route
        File::create(dir.path().join("wrangler.toml")).unwrap()
            .write_all(br#"
name = "api-worker"
route = "api.example.com/*"
"#).unwrap();
        
        let worker = dir.path().join("index.ts");
        File::create(&worker).unwrap()
            .write_all(b"export default { fetch() {} }").unwrap();
        
        let evidence = analyze_connectivity(&worker).unwrap();
        
        // Should "serve the whole" with min 1 connection
        assert!(evidence.serves_whole(1));
        assert!(evidence.has_architectural_connections());
    }
    
    // ========================================================================
    // Browser Extension Tests
    // ========================================================================
    
    #[test]
    fn test_browser_extension_background_service_worker() {
        let dir = tempdir().unwrap();
        
        // Create manifest.json with service_worker (Manifest V3)
        File::create(dir.path().join("manifest.json")).unwrap()
            .write_all(br#"{
  "manifest_version": 3,
  "name": "Test Extension",
  "version": "1.0",
  "background": {
    "service_worker": "background.js"
  }
}"#).unwrap();
        
        // Create background.js (nothing imports it, but it's in manifest)
        let background = dir.path().join("background.js");
        File::create(&background).unwrap()
            .write_all(b"chrome.runtime.onInstalled.addListener(() => {});").unwrap();
        
        let evidence = analyze_connectivity(&background).unwrap();
        
        // Should be connected via manifest.json reference
        assert!(evidence.is_connected, "background.js should be connected via manifest");
        assert!(evidence.architectural.is_some(), "Should have architectural connections");
        
        let arch = evidence.architectural.unwrap();
        assert_eq!(arch.architecture_type, "browser-extension");
        assert!(arch.routes.iter().any(|r| r.contains("background.service_worker")));
    }
    
    #[test]
    fn test_browser_extension_popup_via_html_script() {
        let dir = tempdir().unwrap();
        
        // Create manifest.json with popup
        File::create(dir.path().join("manifest.json")).unwrap()
            .write_all(br#"{
  "manifest_version": 3,
  "name": "Test Extension",
  "version": "1.0",
  "action": {
    "default_popup": "popup.html"
  }
}"#).unwrap();
        
        // Create popup.html that references popup.js
        File::create(dir.path().join("popup.html")).unwrap()
            .write_all(br#"<!DOCTYPE html>
<html>
<head><title>Popup</title></head>
<body>
  <script src="popup.js"></script>
</body>
</html>"#).unwrap();
        
        // Create popup.js (nothing imports it, but it's referenced by popup.html)
        let popup = dir.path().join("popup.js");
        File::create(&popup).unwrap()
            .write_all(b"document.addEventListener('DOMContentLoaded', () => {});").unwrap();
        
        let evidence = analyze_connectivity(&popup).unwrap();
        
        // Should be connected via manifest.json → popup.html → <script> chain
        assert!(evidence.is_connected, "popup.js should be connected via HTML script tag");
        assert!(evidence.architectural.is_some(), "Should have architectural connections");
        
        let arch = evidence.architectural.unwrap();
        assert_eq!(arch.architecture_type, "browser-extension");
        assert!(arch.routes.iter().any(|r| r.contains("popup.html") && r.contains("popup.js")));
    }
    
    #[test]
    fn test_browser_extension_content_script() {
        let dir = tempdir().unwrap();
        
        // Create manifest.json with content_scripts
        File::create(dir.path().join("manifest.json")).unwrap()
            .write_all(br#"{
  "manifest_version": 3,
  "name": "Test Extension",
  "version": "1.0",
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"]
  }]
}"#).unwrap();
        
        // Create content.js
        let content = dir.path().join("content.js");
        File::create(&content).unwrap()
            .write_all(b"console.log('Content script loaded');").unwrap();
        
        let evidence = analyze_connectivity(&content).unwrap();
        
        // Should be connected via content_scripts in manifest
        assert!(evidence.is_connected, "content.js should be connected via manifest");
        assert!(evidence.architectural.is_some(), "Should have architectural connections");
        
        let arch = evidence.architectural.unwrap();
        assert_eq!(arch.architecture_type, "browser-extension");
        assert!(arch.routes.iter().any(|r| r.contains("content_scripts")));
    }
    
    #[test]
    fn test_browser_extension_manifest_v2_background() {
        let dir = tempdir().unwrap();
        
        // Create manifest.json with Manifest V2 background scripts array
        File::create(dir.path().join("manifest.json")).unwrap()
            .write_all(br#"{
  "manifest_version": 2,
  "name": "Test Extension",
  "version": "1.0",
  "background": {
    "scripts": ["background.js", "utils.js"],
    "persistent": false
  }
}"#).unwrap();
        
        // Create background.js
        let background = dir.path().join("background.js");
        File::create(&background).unwrap()
            .write_all(b"chrome.runtime.onInstalled.addListener(() => {});").unwrap();
        
        let evidence = analyze_connectivity(&background).unwrap();
        
        // Should be connected via manifest V2 background.scripts
        assert!(evidence.is_connected, "background.js should be connected via manifest V2");
        assert!(evidence.architectural.is_some());
        
        let arch = evidence.architectural.unwrap();
        assert_eq!(arch.architecture_type, "browser-extension");
        assert!(arch.routes.iter().any(|r| r.contains("background.scripts")));
    }
    
    #[test]
    fn test_browser_extension_true_orphan() {
        let dir = tempdir().unwrap();
        
        // Create manifest.json that doesn't reference orphan.js
        File::create(dir.path().join("manifest.json")).unwrap()
            .write_all(br#"{
  "manifest_version": 3,
  "name": "Test Extension",
  "version": "1.0",
  "background": {
    "service_worker": "background.js"
  }
}"#).unwrap();
        
        // Create orphan.js (NOT referenced in manifest)
        let orphan = dir.path().join("orphan.js");
        File::create(&orphan).unwrap()
            .write_all(b"// This file is unused").unwrap();
        
        let evidence = analyze_connectivity(&orphan).unwrap();
        
        // Should NOT be connected - it's a true orphan even in extension context
        assert!(!evidence.is_connected, "orphan.js should NOT be connected");
        assert!(evidence.architectural.is_none(), "Should have no architectural connections");
    }
    
    #[test]
    fn test_extract_script_src() {
        // Test double quotes
        assert_eq!(
            extract_script_src(r#"<script src="popup.js"></script>"#),
            Some("popup.js".to_string())
        );
        
        // Test single quotes
        assert_eq!(
            extract_script_src(r#"<script src='popup.js'></script>"#),
            Some("popup.js".to_string())
        );
        
        // Test with path
        assert_eq!(
            extract_script_src(r#"<script src="./js/content.js"></script>"#),
            Some("./js/content.js".to_string())
        );
        
        // Test with extra attributes
        assert_eq!(
            extract_script_src(r#"<script type="module" src="main.js" defer></script>"#),
            Some("main.js".to_string())
        );
    }
    
    // ========================================================================
    // NPM Scripts Tests
    // ========================================================================
    
    #[test]
    fn test_npm_postinstall_script_connection() {
        let dir = tempdir().unwrap();
        
        // Create package.json with postinstall script
        File::create(dir.path().join("package.json")).unwrap()
            .write_all(br#"{
  "name": "test-package",
  "version": "1.0.0",
  "scripts": {
    "postinstall": "node install.js"
  }
}"#).unwrap();
        
        // Create install.js (nothing imports it, but it's in scripts.postinstall)
        let install_js = dir.path().join("install.js");
        File::create(&install_js).unwrap()
            .write_all(b"console.log('Installing...');").unwrap();
        
        let evidence = analyze_connectivity(&install_js).unwrap();
        
        // Should be connected via scripts.postinstall
        assert!(evidence.is_connected, "install.js should be connected via postinstall script");
        assert!(evidence.architectural.is_some(), "Should have architectural connections");
        
        let arch = evidence.architectural.unwrap();
        assert_eq!(arch.architecture_type, "package-entry");
        assert!(arch.routes.iter().any(|r| r.contains("scripts.postinstall")));
    }
    
    #[test]
    fn test_npm_script_with_path() {
        let dir = tempdir().unwrap();
        
        // Create nested directory
        let scripts_dir = dir.path().join("scripts");
        std::fs::create_dir(&scripts_dir).unwrap();
        
        // Create package.json with script referencing nested file
        File::create(dir.path().join("package.json")).unwrap()
            .write_all(br#"{
  "name": "test-package",
  "version": "1.0.0",
  "scripts": {
    "prepare": "node scripts/build.js"
  }
}"#).unwrap();
        
        // Create scripts/build.js
        let build_js = scripts_dir.join("build.js");
        File::create(&build_js).unwrap()
            .write_all(b"console.log('Building...');").unwrap();
        
        let evidence = analyze_connectivity(&build_js).unwrap();
        
        // Should be connected via scripts.prepare
        assert!(evidence.is_connected, "build.js should be connected via prepare script");
        assert!(evidence.architectural.is_some());
        
        let arch = evidence.architectural.unwrap();
        assert!(arch.routes.iter().any(|r| r.contains("scripts.prepare")));
    }
    
    #[test]
    fn test_script_references_module() {
        // Test "node install.js"
        assert!(script_references_module("node install.js", "install.js", "install.js"));
        
        // Test "node ./install.js"
        assert!(script_references_module("node ./install.js", "install.js", "install.js"));
        
        // Test with path
        assert!(script_references_module("node scripts/build.js", "build.js", "scripts/build.js"));
        
        // Test chained commands
        assert!(script_references_module("npm run lint && node install.js", "install.js", "install.js"));
        
        // Test tsx/ts-node
        assert!(script_references_module("tsx install.ts", "install.ts", "install.ts"));
        
        // Should not match unrelated files
        assert!(!script_references_module("node other.js", "install.js", "install.js"));
    }
}
