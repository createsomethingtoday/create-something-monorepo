//! Framework Detection
//!
//! Auto-detect frameworks (SvelteKit, Next.js, Cloudflare Workers, etc.)
//! and apply appropriate patterns for accurate code analysis.
//!
//! ## Why This Matters
//! - SvelteKit: `$lib` aliases, `+page.svelte` conventions, hooks
//! - Next.js: `pages/`, `app/`, API routes, middleware
//! - Cloudflare: Workers, Pages, bindings
//!
//! Without framework awareness, these appear as orphans or dead code.

use std::path::{Path, PathBuf};
use std::fs;
use serde::{Serialize, Deserialize};

/// Detected framework type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Framework {
    /// SvelteKit application
    SvelteKit,
    /// Next.js application (Pages Router)
    NextJsPages,
    /// Next.js application (App Router)
    NextJsApp,
    /// Cloudflare Worker
    CloudflareWorker,
    /// Cloudflare Pages
    CloudflarePages,
    /// Vite application (generic)
    Vite,
    /// Remix application
    Remix,
    /// Express/Node.js backend
    Express,
    /// Plain TypeScript/JavaScript
    Plain,
}

impl Framework {
    pub fn as_str(&self) -> &'static str {
        match self {
            Framework::SvelteKit => "SvelteKit",
            Framework::NextJsPages => "Next.js (Pages)",
            Framework::NextJsApp => "Next.js (App)",
            Framework::CloudflareWorker => "Cloudflare Worker",
            Framework::CloudflarePages => "Cloudflare Pages",
            Framework::Vite => "Vite",
            Framework::Remix => "Remix",
            Framework::Express => "Express",
            Framework::Plain => "Plain TypeScript/JavaScript",
        }
    }
}

/// Framework-specific patterns that should be recognized
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FrameworkPatterns {
    /// Framework type
    pub framework: Framework,
    
    /// Path aliases (e.g., $lib -> src/lib)
    pub aliases: Vec<PathAlias>,
    
    /// Convention-based entry points (files that are implicitly used)
    pub implicit_entries: Vec<ImplicitEntry>,
    
    /// Paths to always ignore (framework-generated)
    pub ignore_paths: Vec<String>,
    
    /// File patterns that are entry points by convention
    pub entry_patterns: Vec<String>,
}

/// A path alias
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PathAlias {
    /// The alias (e.g., "$lib")
    pub alias: String,
    /// The resolved path (e.g., "src/lib")
    pub path: String,
}

/// An implicit entry point (used by framework, not imports)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImplicitEntry {
    /// Pattern matching the file
    pub pattern: String,
    /// Why this is an entry point
    pub reason: String,
}

/// Framework detection result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FrameworkDetection {
    /// Primary framework detected
    pub primary: Framework,
    
    /// All frameworks detected (could be multiple)
    pub all: Vec<Framework>,
    
    /// Confidence score (0.0 - 1.0)
    pub confidence: f64,
    
    /// Evidence that led to detection
    pub evidence: Vec<String>,
    
    /// Framework-specific patterns
    pub patterns: FrameworkPatterns,
}

/// Detect framework(s) in a directory
pub fn detect_framework(directory: &Path) -> FrameworkDetection {
    let mut frameworks = Vec::new();
    let mut evidence = Vec::new();
    
    // Check for SvelteKit
    if let Some(ev) = detect_sveltekit(directory) {
        frameworks.push(Framework::SvelteKit);
        evidence.extend(ev);
    }
    
    // Check for Next.js
    if let Some((next, ev)) = detect_nextjs(directory) {
        frameworks.push(next);
        evidence.extend(ev);
    }
    
    // Check for Cloudflare
    if let Some((cf, ev)) = detect_cloudflare(directory) {
        frameworks.push(cf);
        evidence.extend(ev);
    }
    
    // Check for Vite
    if let Some(ev) = detect_vite(directory) {
        if !frameworks.contains(&Framework::SvelteKit) {
            frameworks.push(Framework::Vite);
        }
        evidence.extend(ev);
    }
    
    // Check for Remix
    if let Some(ev) = detect_remix(directory) {
        frameworks.push(Framework::Remix);
        evidence.extend(ev);
    }
    
    // Check for Express
    if let Some(ev) = detect_express(directory) {
        frameworks.push(Framework::Express);
        evidence.extend(ev);
    }
    
    // Determine primary framework
    let primary = frameworks.first().copied().unwrap_or(Framework::Plain);
    let confidence = calculate_confidence(&frameworks, &evidence);
    let patterns = get_patterns(primary);
    
    FrameworkDetection {
        primary,
        all: frameworks,
        confidence,
        evidence,
        patterns,
    }
}

fn detect_sveltekit(dir: &Path) -> Option<Vec<String>> {
    let mut evidence = Vec::new();
    
    // Check svelte.config.js/ts
    if dir.join("svelte.config.js").exists() {
        evidence.push("Found svelte.config.js".to_string());
    }
    if dir.join("svelte.config.ts").exists() {
        evidence.push("Found svelte.config.ts".to_string());
    }
    
    // Check for SvelteKit routes structure
    if dir.join("src/routes").exists() {
        evidence.push("Found src/routes directory".to_string());
    }
    
    // Check package.json for @sveltejs/kit
    if let Ok(pkg) = read_package_json(dir) {
        if pkg.contains("@sveltejs/kit") {
            evidence.push("Found @sveltejs/kit in dependencies".to_string());
        }
    }
    
    // Check for hooks
    if dir.join("src/hooks.server.ts").exists() || dir.join("src/hooks.client.ts").exists() {
        evidence.push("Found SvelteKit hooks".to_string());
    }
    
    if evidence.is_empty() {
        None
    } else {
        Some(evidence)
    }
}

fn detect_nextjs(dir: &Path) -> Option<(Framework, Vec<String>)> {
    let mut evidence = Vec::new();
    let mut is_app_router = false;
    
    // Check next.config.js/ts/mjs
    for name in ["next.config.js", "next.config.ts", "next.config.mjs"] {
        if dir.join(name).exists() {
            evidence.push(format!("Found {}", name));
        }
    }
    
    // Check for pages/ directory (Pages Router)
    if dir.join("pages").exists() || dir.join("src/pages").exists() {
        evidence.push("Found pages directory".to_string());
    }
    
    // Check for app/ directory (App Router)
    if dir.join("app").exists() || dir.join("src/app").exists() {
        evidence.push("Found app directory (App Router)".to_string());
        is_app_router = true;
    }
    
    // Check package.json for next
    if let Ok(pkg) = read_package_json(dir) {
        if pkg.contains("\"next\"") {
            evidence.push("Found next in dependencies".to_string());
        }
    }
    
    if evidence.is_empty() {
        None
    } else {
        let framework = if is_app_router {
            Framework::NextJsApp
        } else {
            Framework::NextJsPages
        };
        Some((framework, evidence))
    }
}

fn detect_cloudflare(dir: &Path) -> Option<(Framework, Vec<String>)> {
    let mut evidence = Vec::new();
    let mut is_pages = false;
    
    // Check wrangler.toml
    if dir.join("wrangler.toml").exists() {
        evidence.push("Found wrangler.toml".to_string());
        
        // Check if it's Pages or Worker
        if let Ok(content) = fs::read_to_string(dir.join("wrangler.toml")) {
            if content.contains("pages_build_output_dir") || content.contains("[site]") {
                is_pages = true;
                evidence.push("Detected Cloudflare Pages configuration".to_string());
            }
        }
    }
    
    // Check wrangler.json
    if dir.join("wrangler.json").exists() || dir.join("wrangler.jsonc").exists() {
        evidence.push("Found wrangler.json".to_string());
    }
    
    // Check for functions/ directory (Pages)
    if dir.join("functions").exists() {
        is_pages = true;
        evidence.push("Found functions directory (Pages)".to_string());
    }
    
    // Check package.json for wrangler
    if let Ok(pkg) = read_package_json(dir) {
        if pkg.contains("wrangler") {
            evidence.push("Found wrangler in dependencies".to_string());
        }
    }
    
    if evidence.is_empty() {
        None
    } else {
        let framework = if is_pages {
            Framework::CloudflarePages
        } else {
            Framework::CloudflareWorker
        };
        Some((framework, evidence))
    }
}

fn detect_vite(dir: &Path) -> Option<Vec<String>> {
    let mut evidence = Vec::new();
    
    for name in ["vite.config.js", "vite.config.ts", "vite.config.mjs"] {
        if dir.join(name).exists() {
            evidence.push(format!("Found {}", name));
        }
    }
    
    if let Ok(pkg) = read_package_json(dir) {
        if pkg.contains("\"vite\"") {
            evidence.push("Found vite in dependencies".to_string());
        }
    }
    
    if evidence.is_empty() {
        None
    } else {
        Some(evidence)
    }
}

fn detect_remix(dir: &Path) -> Option<Vec<String>> {
    let mut evidence = Vec::new();
    
    if dir.join("remix.config.js").exists() {
        evidence.push("Found remix.config.js".to_string());
    }
    
    if dir.join("app/routes").exists() {
        evidence.push("Found app/routes directory".to_string());
    }
    
    if let Ok(pkg) = read_package_json(dir) {
        if pkg.contains("@remix-run") {
            evidence.push("Found @remix-run in dependencies".to_string());
        }
    }
    
    if evidence.is_empty() {
        None
    } else {
        Some(evidence)
    }
}

fn detect_express(dir: &Path) -> Option<Vec<String>> {
    let mut evidence = Vec::new();
    
    if let Ok(pkg) = read_package_json(dir) {
        if pkg.contains("\"express\"") {
            evidence.push("Found express in dependencies".to_string());
        }
    }
    
    // Check for common Express patterns in entry files
    for entry in ["index.ts", "index.js", "server.ts", "server.js", "app.ts", "app.js"] {
        let path = dir.join(entry);
        if path.exists() {
            if let Ok(content) = fs::read_to_string(&path) {
                if content.contains("express()") || content.contains("app.listen") {
                    evidence.push(format!("Found Express patterns in {}", entry));
                }
            }
        }
    }
    
    if evidence.is_empty() {
        None
    } else {
        Some(evidence)
    }
}

fn read_package_json(dir: &Path) -> std::io::Result<String> {
    fs::read_to_string(dir.join("package.json"))
}

fn calculate_confidence(frameworks: &[Framework], evidence: &[String]) -> f64 {
    if frameworks.is_empty() {
        return 0.0;
    }
    
    // Base confidence from evidence count
    let base = (evidence.len() as f64 / 5.0).min(1.0);
    
    // Boost for strong indicators
    let has_config = evidence.iter().any(|e| e.contains("config"));
    let has_deps = evidence.iter().any(|e| e.contains("dependencies"));
    let has_structure = evidence.iter().any(|e| e.contains("directory") || e.contains("routes"));
    
    let boost = if has_config && has_deps && has_structure {
        0.3
    } else if has_config && has_deps {
        0.2
    } else if has_config {
        0.1
    } else {
        0.0
    };
    
    (base + boost).min(1.0)
}

/// Get framework-specific patterns
pub fn get_patterns(framework: Framework) -> FrameworkPatterns {
    match framework {
        Framework::SvelteKit => sveltekit_patterns(),
        Framework::NextJsPages => nextjs_pages_patterns(),
        Framework::NextJsApp => nextjs_app_patterns(),
        Framework::CloudflareWorker => cloudflare_worker_patterns(),
        Framework::CloudflarePages => cloudflare_pages_patterns(),
        Framework::Vite => vite_patterns(),
        Framework::Remix => remix_patterns(),
        Framework::Express => express_patterns(),
        Framework::Plain => plain_patterns(),
    }
}

fn sveltekit_patterns() -> FrameworkPatterns {
    FrameworkPatterns {
        framework: Framework::SvelteKit,
        aliases: vec![
            PathAlias { alias: "$lib".to_string(), path: "src/lib".to_string() },
            PathAlias { alias: "$app".to_string(), path: ".svelte-kit/runtime/app".to_string() },
        ],
        implicit_entries: vec![
            ImplicitEntry { 
                pattern: "**/+page.svelte".to_string(),
                reason: "SvelteKit page component".to_string(),
            },
            ImplicitEntry {
                pattern: "**/+page.ts".to_string(),
                reason: "SvelteKit page load function".to_string(),
            },
            ImplicitEntry {
                pattern: "**/+page.server.ts".to_string(),
                reason: "SvelteKit server load function".to_string(),
            },
            ImplicitEntry {
                pattern: "**/+server.ts".to_string(),
                reason: "SvelteKit API endpoint".to_string(),
            },
            ImplicitEntry {
                pattern: "**/+layout.svelte".to_string(),
                reason: "SvelteKit layout component".to_string(),
            },
            ImplicitEntry {
                pattern: "**/+layout.ts".to_string(),
                reason: "SvelteKit layout load function".to_string(),
            },
            ImplicitEntry {
                pattern: "**/+layout.server.ts".to_string(),
                reason: "SvelteKit layout server load".to_string(),
            },
            ImplicitEntry {
                pattern: "**/+error.svelte".to_string(),
                reason: "SvelteKit error page".to_string(),
            },
            ImplicitEntry {
                pattern: "src/hooks.server.ts".to_string(),
                reason: "SvelteKit server hooks".to_string(),
            },
            ImplicitEntry {
                pattern: "src/hooks.client.ts".to_string(),
                reason: "SvelteKit client hooks".to_string(),
            },
            ImplicitEntry {
                pattern: "src/app.html".to_string(),
                reason: "SvelteKit app template".to_string(),
            },
            ImplicitEntry {
                pattern: "src/app.css".to_string(),
                reason: "SvelteKit global styles".to_string(),
            },
        ],
        ignore_paths: vec![
            ".svelte-kit/**".to_string(),
            "build/**".to_string(),
        ],
        entry_patterns: vec![
            "+page.svelte".to_string(),
            "+page.ts".to_string(),
            "+page.server.ts".to_string(),
            "+server.ts".to_string(),
            "+layout.svelte".to_string(),
            "hooks.server.ts".to_string(),
            "hooks.client.ts".to_string(),
        ],
    }
}

fn nextjs_pages_patterns() -> FrameworkPatterns {
    FrameworkPatterns {
        framework: Framework::NextJsPages,
        aliases: vec![
            PathAlias { alias: "@".to_string(), path: "src".to_string() },
            PathAlias { alias: "~".to_string(), path: "src".to_string() },
        ],
        implicit_entries: vec![
            ImplicitEntry {
                pattern: "pages/**/*.tsx".to_string(),
                reason: "Next.js page".to_string(),
            },
            ImplicitEntry {
                pattern: "pages/api/**/*.ts".to_string(),
                reason: "Next.js API route".to_string(),
            },
            ImplicitEntry {
                pattern: "pages/_app.tsx".to_string(),
                reason: "Next.js custom App".to_string(),
            },
            ImplicitEntry {
                pattern: "pages/_document.tsx".to_string(),
                reason: "Next.js custom Document".to_string(),
            },
            ImplicitEntry {
                pattern: "middleware.ts".to_string(),
                reason: "Next.js middleware".to_string(),
            },
        ],
        ignore_paths: vec![
            ".next/**".to_string(),
            "out/**".to_string(),
        ],
        entry_patterns: vec![
            "pages/**/*.tsx".to_string(),
            "pages/**/*.ts".to_string(),
            "middleware.ts".to_string(),
        ],
    }
}

fn nextjs_app_patterns() -> FrameworkPatterns {
    FrameworkPatterns {
        framework: Framework::NextJsApp,
        aliases: vec![
            PathAlias { alias: "@".to_string(), path: "src".to_string() },
        ],
        implicit_entries: vec![
            ImplicitEntry {
                pattern: "app/**/page.tsx".to_string(),
                reason: "Next.js App Router page".to_string(),
            },
            ImplicitEntry {
                pattern: "app/**/layout.tsx".to_string(),
                reason: "Next.js App Router layout".to_string(),
            },
            ImplicitEntry {
                pattern: "app/**/loading.tsx".to_string(),
                reason: "Next.js loading UI".to_string(),
            },
            ImplicitEntry {
                pattern: "app/**/error.tsx".to_string(),
                reason: "Next.js error UI".to_string(),
            },
            ImplicitEntry {
                pattern: "app/**/route.ts".to_string(),
                reason: "Next.js route handler".to_string(),
            },
            ImplicitEntry {
                pattern: "middleware.ts".to_string(),
                reason: "Next.js middleware".to_string(),
            },
        ],
        ignore_paths: vec![
            ".next/**".to_string(),
        ],
        entry_patterns: vec![
            "page.tsx".to_string(),
            "layout.tsx".to_string(),
            "route.ts".to_string(),
            "middleware.ts".to_string(),
        ],
    }
}

fn cloudflare_worker_patterns() -> FrameworkPatterns {
    FrameworkPatterns {
        framework: Framework::CloudflareWorker,
        aliases: vec![],
        implicit_entries: vec![
            ImplicitEntry {
                pattern: "src/index.ts".to_string(),
                reason: "Worker entry point".to_string(),
            },
            ImplicitEntry {
                pattern: "index.ts".to_string(),
                reason: "Worker entry point".to_string(),
            },
        ],
        ignore_paths: vec![
            "dist/**".to_string(),
            ".wrangler/**".to_string(),
        ],
        entry_patterns: vec![
            "index.ts".to_string(),
            "worker.ts".to_string(),
        ],
    }
}

fn cloudflare_pages_patterns() -> FrameworkPatterns {
    FrameworkPatterns {
        framework: Framework::CloudflarePages,
        aliases: vec![],
        implicit_entries: vec![
            ImplicitEntry {
                pattern: "functions/**/*.ts".to_string(),
                reason: "Pages function".to_string(),
            },
            ImplicitEntry {
                pattern: "functions/_middleware.ts".to_string(),
                reason: "Pages middleware".to_string(),
            },
        ],
        ignore_paths: vec![
            ".wrangler/**".to_string(),
        ],
        entry_patterns: vec![
            "functions/**/*.ts".to_string(),
        ],
    }
}

fn vite_patterns() -> FrameworkPatterns {
    FrameworkPatterns {
        framework: Framework::Vite,
        aliases: vec![],
        implicit_entries: vec![
            ImplicitEntry {
                pattern: "src/main.ts".to_string(),
                reason: "Vite entry point".to_string(),
            },
            ImplicitEntry {
                pattern: "index.html".to_string(),
                reason: "Vite HTML entry".to_string(),
            },
        ],
        ignore_paths: vec![
            "dist/**".to_string(),
        ],
        entry_patterns: vec![
            "main.ts".to_string(),
            "main.tsx".to_string(),
        ],
    }
}

fn remix_patterns() -> FrameworkPatterns {
    FrameworkPatterns {
        framework: Framework::Remix,
        aliases: vec![
            PathAlias { alias: "~".to_string(), path: "app".to_string() },
        ],
        implicit_entries: vec![
            ImplicitEntry {
                pattern: "app/routes/**/*.tsx".to_string(),
                reason: "Remix route".to_string(),
            },
            ImplicitEntry {
                pattern: "app/root.tsx".to_string(),
                reason: "Remix root".to_string(),
            },
            ImplicitEntry {
                pattern: "app/entry.client.tsx".to_string(),
                reason: "Remix client entry".to_string(),
            },
            ImplicitEntry {
                pattern: "app/entry.server.tsx".to_string(),
                reason: "Remix server entry".to_string(),
            },
        ],
        ignore_paths: vec![
            "build/**".to_string(),
            ".cache/**".to_string(),
        ],
        entry_patterns: vec![
            "routes/**/*.tsx".to_string(),
            "root.tsx".to_string(),
        ],
    }
}

fn express_patterns() -> FrameworkPatterns {
    FrameworkPatterns {
        framework: Framework::Express,
        aliases: vec![],
        implicit_entries: vec![
            ImplicitEntry {
                pattern: "index.ts".to_string(),
                reason: "Express entry".to_string(),
            },
            ImplicitEntry {
                pattern: "server.ts".to_string(),
                reason: "Express server".to_string(),
            },
            ImplicitEntry {
                pattern: "app.ts".to_string(),
                reason: "Express app".to_string(),
            },
        ],
        ignore_paths: vec![
            "dist/**".to_string(),
        ],
        entry_patterns: vec![
            "index.ts".to_string(),
            "server.ts".to_string(),
            "app.ts".to_string(),
        ],
    }
}

fn plain_patterns() -> FrameworkPatterns {
    FrameworkPatterns {
        framework: Framework::Plain,
        aliases: vec![],
        implicit_entries: vec![
            ImplicitEntry {
                pattern: "index.ts".to_string(),
                reason: "Default entry".to_string(),
            },
        ],
        ignore_paths: vec![
            "dist/**".to_string(),
            "build/**".to_string(),
        ],
        entry_patterns: vec![
            "index.ts".to_string(),
            "main.ts".to_string(),
        ],
    }
}

/// Check if a path matches a framework's implicit entry pattern
pub fn is_implicit_entry(path: &Path, patterns: &FrameworkPatterns) -> bool {
    let path_str = path.to_string_lossy();
    
    for entry in &patterns.implicit_entries {
        if glob_match(&entry.pattern, &path_str) {
            return true;
        }
    }
    
    // Check entry patterns
    if let Some(filename) = path.file_name().and_then(|n| n.to_str()) {
        for pattern in &patterns.entry_patterns {
            if filename == pattern || glob_match(pattern, &path_str) {
                return true;
            }
        }
    }
    
    false
}

/// Simple glob matching (supports * and **)
/// Uses string matching instead of regex for better compatibility
fn glob_match(pattern: &str, path: &str) -> bool {
    // Handle ** (match any path)
    if pattern.starts_with("**/") {
        let suffix = &pattern[3..]; // skip "**/""
        // Check if path ends with the suffix
        if path.ends_with(suffix) {
            return true;
        }
        // Also check if suffix contains more patterns
        return glob_match(suffix, path);
    }
    
    if pattern.contains("**") {
        // Split on ** and check if all parts are contained in order
        let parts: Vec<&str> = pattern.split("**").collect();
        let mut remaining = path;
        
        for (i, part) in parts.iter().enumerate() {
            let part = part.trim_matches('/');
            if part.is_empty() {
                continue;
            }
            
            if i == 0 {
                // First part must be at the start
                if !remaining.starts_with(part) {
                    return false;
                }
                remaining = &remaining[part.len()..];
            } else if i == parts.len() - 1 {
                // Last part must be at the end
                if !remaining.ends_with(part) {
                    return false;
                }
            } else {
                // Middle parts just need to exist somewhere
                if let Some(pos) = remaining.find(part) {
                    remaining = &remaining[pos + part.len()..];
                } else {
                    return false;
                }
            }
        }
        return true;
    }
    
    // Handle single * (match within segment)
    if pattern.contains('*') {
        let parts: Vec<&str> = pattern.split('*').collect();
        let mut remaining = path;
        
        for (i, part) in parts.iter().enumerate() {
            if part.is_empty() {
                continue;
            }
            
            if i == 0 {
                if !remaining.starts_with(part) {
                    return false;
                }
                remaining = &remaining[part.len()..];
            } else if i == parts.len() - 1 {
                if !remaining.ends_with(part) {
                    return false;
                }
            } else {
                if let Some(pos) = remaining.find(part) {
                    // Make sure we don't cross directory boundaries for single *
                    let between = &remaining[..pos];
                    if between.contains('/') {
                        return false;
                    }
                    remaining = &remaining[pos + part.len()..];
                } else {
                    return false;
                }
            }
        }
        return true;
    }
    
    // Exact match
    path == pattern || path.ends_with(&format!("/{}", pattern))
}

/// Get all files that should be considered entry points for a framework
pub fn find_framework_entries(directory: &Path, framework: Framework) -> Vec<PathBuf> {
    let patterns = get_patterns(framework);
    let mut entries = Vec::new();
    
    find_entries_recursive(directory, &patterns, &mut entries);
    
    entries
}

fn find_entries_recursive(dir: &Path, patterns: &FrameworkPatterns, entries: &mut Vec<PathBuf>) {
    let read_dir = match fs::read_dir(dir) {
        Ok(r) => r,
        Err(_) => return,
    };
    
    for entry in read_dir.flatten() {
        let path = entry.path();
        
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            // Skip ignored paths
            if patterns.ignore_paths.iter().any(|p| glob_match(p, name)) {
                continue;
            }
            
            if name.starts_with('.') || matches!(name, "node_modules") {
                continue;
            }
        }
        
        if path.is_dir() {
            find_entries_recursive(&path, patterns, entries);
        } else if path.is_file() {
            if is_implicit_entry(&path, patterns) {
                entries.push(path);
            }
        }
    }
}

// Simple regex implementation for no-std-like environments
mod regex_lite {
    pub struct Regex {
        pattern: String,
    }
    
    impl Regex {
        pub fn new(pattern: &str) -> Result<Self, ()> {
            Ok(Self { pattern: pattern.to_string() })
        }
        
        pub fn is_match(&self, text: &str) -> bool {
            // Very simple matching - just check if patterns match
            // This is a simplified version; in production, use the regex crate
            let pattern = self.pattern
                .trim_start_matches('^')
                .trim_end_matches('$');
            
            if pattern.contains(".*") {
                // Wildcard matching
                let parts: Vec<&str> = pattern.split(".*").collect();
                let mut pos = 0;
                for part in parts {
                    if part.is_empty() {
                        continue;
                    }
                    if let Some(found) = text[pos..].find(part) {
                        pos += found + part.len();
                    } else {
                        return false;
                    }
                }
                true
            } else {
                text == pattern
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    use std::io::Write;
    
    #[test]
    fn test_detect_sveltekit() {
        let dir = tempdir().unwrap();
        
        // Create SvelteKit markers
        fs::File::create(dir.path().join("svelte.config.js")).unwrap();
        fs::create_dir_all(dir.path().join("src/routes")).unwrap();
        
        let pkg = dir.path().join("package.json");
        fs::File::create(&pkg).unwrap()
            .write_all(br#"{"dependencies": {"@sveltejs/kit": "^2.0.0"}}"#).unwrap();
        
        let detection = detect_framework(dir.path());
        
        assert_eq!(detection.primary, Framework::SvelteKit);
        assert!(detection.confidence > 0.5);
    }
    
    #[test]
    fn test_detect_nextjs_app() {
        let dir = tempdir().unwrap();
        
        fs::File::create(dir.path().join("next.config.js")).unwrap();
        fs::create_dir_all(dir.path().join("app")).unwrap();
        
        let detection = detect_framework(dir.path());
        
        assert_eq!(detection.primary, Framework::NextJsApp);
    }
    
    #[test]
    fn test_detect_cloudflare_worker() {
        let dir = tempdir().unwrap();
        
        fs::File::create(dir.path().join("wrangler.toml")).unwrap()
            .write_all(b"name = \"my-worker\"\nmain = \"src/index.ts\"").unwrap();
        
        let detection = detect_framework(dir.path());
        
        assert_eq!(detection.primary, Framework::CloudflareWorker);
    }
    
    #[test]
    fn test_sveltekit_patterns() {
        let patterns = get_patterns(Framework::SvelteKit);
        
        // Check aliases
        assert!(patterns.aliases.iter().any(|a| a.alias == "$lib"));
        
        // Check implicit entries
        assert!(patterns.implicit_entries.iter().any(|e| e.pattern.contains("+page.svelte")));
        assert!(patterns.implicit_entries.iter().any(|e| e.pattern.contains("hooks.server.ts")));
    }
    
    #[test]
    fn test_is_implicit_entry() {
        let patterns = sveltekit_patterns();
        
        assert!(is_implicit_entry(Path::new("src/routes/+page.svelte"), &patterns));
        assert!(is_implicit_entry(Path::new("src/hooks.server.ts"), &patterns));
        assert!(!is_implicit_entry(Path::new("src/lib/utils.ts"), &patterns));
        
        // Test with full paths (important for graph-based detection)
        assert!(is_implicit_entry(Path::new("packages/foo/src/routes/+layout.server.ts"), &patterns));
        assert!(is_implicit_entry(Path::new("packages/foo/src/routes/+server.ts"), &patterns));
        assert!(is_implicit_entry(Path::new("packages/foo/src/routes/api/users/+server.ts"), &patterns));
    }
    
    #[test]
    fn test_glob_match() {
        // Test glob_match with SvelteKit patterns (** prefix)
        assert!(glob_match("**/+page.svelte", "src/routes/+page.svelte"), "+page.svelte direct");
        assert!(glob_match("**/+page.svelte", "packages/foo/src/routes/+page.svelte"), "+page.svelte nested");
        assert!(glob_match("**/+server.ts", "packages/app/src/routes/api/+server.ts"), "+server.ts");
        assert!(glob_match("**/+layout.server.ts", "packages/webflow-dashboard/src/routes/+layout.server.ts"), "+layout.server.ts");
        
        // Test exact match
        assert!(glob_match("src/hooks.server.ts", "src/hooks.server.ts"), "exact match");
        assert!(glob_match("src/hooks.server.ts", "packages/foo/src/hooks.server.ts"), "exact with prefix");
        
        // Test non-matches
        assert!(!glob_match("**/+page.svelte", "src/lib/utils.ts"), "wrong extension");
        assert!(!glob_match("**/+server.ts", "src/lib/server.ts"), "missing plus");
    }
}
