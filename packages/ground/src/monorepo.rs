//! CREATE SOMETHING Monorepo Awareness
//!
//! Opinionated configuration for the CREATE SOMETHING monorepo.
//! Understands package structure, suggests specific refactoring targets,
//! and integrates with beads for issue tracking.
//!
//! ## Package Structure
//!
//! ```text
//! packages/
//! ├── components/          # @create-something/components (shared library)
//! │   └── src/lib/
//! │       ├── analytics/   # Analytics handlers
//! │       ├── auth/        # Auth handlers  
//! │       ├── newsletter/  # Newsletter handlers
//! │       └── ...
//! ├── agency/              # SvelteKit app (property)
//! ├── io/                  # SvelteKit app (property)
//! ├── ltd/                 # SvelteKit app (property)
//! ├── space/               # SvelteKit app (property)
//! ├── lms/                 # SvelteKit app (property)
//! ├── identity-worker/     # Cloudflare Worker (auth)
//! └── harness/             # Agent infrastructure
//! ```

use std::path::{Path, PathBuf};
use std::fs;
use serde::{Serialize, Deserialize};

/// CREATE SOMETHING property packages (SvelteKit apps)
pub const PROPERTY_PACKAGES: &[&str] = &["agency", "io", "ltd", "space", "lms"];

/// Shared library package
pub const SHARED_PACKAGE: &str = "components";

/// Known export paths in @create-something/components
pub const COMPONENT_EXPORTS: &[(&str, &str)] = &[
    ("analytics", "Analytics handlers and tracking"),
    ("auth", "Authentication handlers and session management"),
    ("auth/server", "Server-side auth validation"),
    ("newsletter", "Newsletter subscription handlers"),
    ("gdpr", "GDPR consent management"),
    ("api", "API client utilities"),
    ("utils", "Shared utilities"),
    ("forms", "Form components"),
    ("validation", "Validation utilities"),
    ("types", "Shared TypeScript types"),
];

/// Monorepo detection result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonorepoInfo {
    /// Root path of the monorepo
    pub root: PathBuf,
    
    /// Whether this is a CREATE SOMETHING monorepo
    pub is_create_something: bool,
    
    /// Detected packages
    pub packages: Vec<PackageInfo>,
    
    /// Package relationships (who depends on whom)
    pub dependencies: Vec<(String, String)>,
}

/// Information about a package
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackageInfo {
    /// Package name (e.g., "@create-something/components")
    pub name: String,
    
    /// Package path relative to monorepo root
    pub path: PathBuf,
    
    /// Package type
    pub package_type: PackageType,
    
    /// Whether this is a SvelteKit app
    pub is_sveltekit: bool,
    
    /// Whether this is a Cloudflare Worker
    pub is_worker: bool,
}

/// Type of package
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum PackageType {
    /// Shared library (@create-something/components)
    SharedLibrary,
    /// SvelteKit property app (agency, io, ltd, etc.)
    Property,
    /// Cloudflare Worker
    Worker,
    /// Agent/tooling infrastructure
    Infrastructure,
    /// Other package
    Other,
}

/// Suggested refactoring action
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RefactoringSuggestion {
    /// What to do
    pub action: RefactoringAction,
    
    /// Human-readable description
    pub description: String,
    
    /// Target location in @create-something/components
    pub target_path: String,
    
    /// Import statement to use after refactoring
    pub import_statement: String,
    
    /// Beads command to create issue
    pub beads_command: String,
    
    /// Priority (P0 = critical, P1 = high, P2 = medium)
    pub priority: String,
}

/// Type of refactoring action
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RefactoringAction {
    /// Extract to shared components
    ExtractToShared,
    /// Create new handler factory
    CreateHandlerFactory,
    /// Move duplicate function
    MoveDuplicateFunction,
    /// Consolidate similar routes
    ConsolidateRoutes,
}

/// Detect if we're in a CREATE SOMETHING monorepo
pub fn detect_monorepo(start_path: &Path) -> Option<MonorepoInfo> {
    let root = find_monorepo_root(start_path)?;
    
    // Check for pnpm-workspace.yaml
    let workspace_file = root.join("pnpm-workspace.yaml");
    if !workspace_file.exists() {
        return None;
    }
    
    // Check for packages/components (our shared library)
    let components_path = root.join("packages/components");
    let is_create_something = components_path.exists() && 
        root.join("packages/components/package.json").exists();
    
    if !is_create_something {
        return None;
    }
    
    // Detect packages
    let packages = detect_packages(&root);
    
    Some(MonorepoInfo {
        root,
        is_create_something: true,
        packages,
        dependencies: Vec::new(), // TODO: Parse package.json dependencies
    })
}

fn find_monorepo_root(start: &Path) -> Option<PathBuf> {
    let mut current = if start.is_file() {
        start.parent()?
    } else {
        start
    };
    
    for _ in 0..10 {
        if current.join("pnpm-workspace.yaml").exists() {
            return Some(current.to_path_buf());
        }
        current = current.parent()?;
    }
    
    None
}

fn detect_packages(root: &Path) -> Vec<PackageInfo> {
    let mut packages = Vec::new();
    
    let packages_dir = root.join("packages");
    if !packages_dir.exists() {
        return packages;
    }
    
    for entry in fs::read_dir(&packages_dir).into_iter().flatten().flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        
        let name = path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();
        
        // Skip hidden directories
        if name.starts_with('.') {
            continue;
        }
        
        let package_json = path.join("package.json");
        if !package_json.exists() {
            continue;
        }
        
        // Determine package type
        let package_type = if name == SHARED_PACKAGE {
            PackageType::SharedLibrary
        } else if PROPERTY_PACKAGES.contains(&name.as_str()) {
            PackageType::Property
        } else if path.join("wrangler.toml").exists() {
            PackageType::Worker
        } else if name.contains("agent") || name.contains("harness") || name.contains("orchestration") {
            PackageType::Infrastructure
        } else {
            PackageType::Other
        };
        
        let is_sveltekit = path.join("svelte.config.js").exists() || 
                          path.join("src/routes").exists();
        let is_worker = path.join("wrangler.toml").exists();
        
        // Get npm package name
        let npm_name = fs::read_to_string(&package_json)
            .ok()
            .and_then(|content| {
                serde_json::from_str::<serde_json::Value>(&content).ok()
            })
            .and_then(|json| {
                json.get("name").and_then(|n| n.as_str()).map(String::from)
            })
            .unwrap_or_else(|| format!("@create-something/{}", name));
        
        packages.push(PackageInfo {
            name: npm_name,
            path: path.strip_prefix(root).unwrap_or(&path).to_path_buf(),
            package_type,
            is_sveltekit,
            is_worker,
        });
    }
    
    packages
}

/// Generate refactoring suggestion for a DRY violation
pub fn suggest_refactoring(
    file_a: &Path,
    file_b: &Path,
    similarity: f64,
    monorepo: &MonorepoInfo,
) -> Option<RefactoringSuggestion> {
    let file_a_str = file_a.to_string_lossy();
    let file_b_str = file_b.to_string_lossy();
    
    // Detect the pattern
    let pattern = detect_violation_pattern(&file_a_str, &file_b_str);
    
    match pattern {
        ViolationPattern::ApiHandler(handler_type) => {
            let target_module = match handler_type.as_str() {
                "analytics" => "analytics",
                "newsletter" => "newsletter",
                "auth" | "login" | "signup" => "auth",
                "user" => "auth",
                _ => "api",
            };
            
            Some(RefactoringSuggestion {
                action: RefactoringAction::CreateHandlerFactory,
                description: format!(
                    "Create shared {} handler factory in @create-something/components/{}",
                    handler_type, target_module
                ),
                target_path: format!("packages/components/src/lib/{}/handlers.ts", target_module),
                import_statement: format!(
                    "import {{ create{}Handler }} from '@create-something/components/{}'",
                    to_pascal_case(&handler_type), target_module
                ),
                beads_command: format!(
                    "bd create \"Extract shared {} handler ({:.0}% duplicate)\" --priority P1 --label refactor",
                    handler_type, similarity * 100.0
                ),
                priority: if similarity > 0.95 { "P0" } else { "P1" }.to_string(),
            })
        }
        ViolationPattern::PageLoader(loader_type) => {
            Some(RefactoringSuggestion {
                action: RefactoringAction::CreateHandlerFactory,
                description: format!(
                    "Create shared {} page loader in @create-something/components/auth",
                    loader_type
                ),
                target_path: "packages/components/src/lib/auth/handlers.ts".to_string(),
                import_statement: format!(
                    "import {{ create{}PageLoader }} from '@create-something/components/auth'",
                    to_pascal_case(&loader_type)
                ),
                beads_command: format!(
                    "bd create \"Extract shared {} loader ({:.0}% duplicate)\" --priority P1 --label refactor",
                    loader_type, similarity * 100.0
                ),
                priority: "P1".to_string(),
            })
        }
        ViolationPattern::SvelteComponent(component_name) => {
            Some(RefactoringSuggestion {
                action: RefactoringAction::ExtractToShared,
                description: format!(
                    "Move {} component to @create-something/components",
                    component_name
                ),
                target_path: format!("packages/components/src/lib/components/{}.svelte", component_name),
                import_statement: format!(
                    "import {{ {} }} from '@create-something/components/components'",
                    component_name
                ),
                beads_command: format!(
                    "bd create \"Move {} to shared components ({:.0}% duplicate)\" --priority P2 --label refactor",
                    component_name, similarity * 100.0
                ),
                priority: "P2".to_string(),
            })
        }
        ViolationPattern::UtilityFunction(func_name) => {
            Some(RefactoringSuggestion {
                action: RefactoringAction::MoveDuplicateFunction,
                description: format!(
                    "Extract {} function to @create-something/components/utils",
                    func_name
                ),
                target_path: "packages/components/src/lib/utils/index.ts".to_string(),
                import_statement: format!(
                    "import {{ {} }} from '@create-something/components/utils'",
                    func_name
                ),
                beads_command: format!(
                    "bd create \"Extract {} to shared utils ({:.0}% duplicate)\" --priority P2 --label refactor",
                    func_name, similarity * 100.0
                ),
                priority: "P2".to_string(),
            })
        }
        ViolationPattern::Unknown => None,
    }
}

/// Generate beads command for a DRY violation
pub fn generate_beads_command(
    file_a: &Path,
    file_b: &Path,
    similarity: f64,
    suggestion: Option<&RefactoringSuggestion>,
) -> String {
    if let Some(s) = suggestion {
        return s.beads_command.clone();
    }
    
    // Generic command
    let file_a_name = file_a.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown");
    let file_b_name = file_b.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown");
    
    let priority = if similarity > 0.95 { "P0" } else if similarity > 0.85 { "P1" } else { "P2" };
    
    format!(
        "bd create \"DRY violation: {} vs {} ({:.0}% similar)\" --priority {} --label refactor",
        file_a_name, file_b_name, similarity * 100.0, priority
    )
}

#[derive(Debug)]
enum ViolationPattern {
    ApiHandler(String),
    PageLoader(String),
    SvelteComponent(String),
    UtilityFunction(String),
    Unknown,
}

fn detect_violation_pattern(file_a: &str, file_b: &str) -> ViolationPattern {
    // Check for API handlers (+server.ts in routes/api/)
    if file_a.contains("/routes/api/") && file_b.contains("/routes/api/") {
        // Extract handler type from path
        let handler_type = extract_api_handler_type(file_a)
            .or_else(|| extract_api_handler_type(file_b))
            .unwrap_or_else(|| "api".to_string());
        return ViolationPattern::ApiHandler(handler_type);
    }
    
    // Check for page loaders (+page.server.ts)
    if (file_a.contains("+page.server.ts") || file_a.contains("+layout.server.ts")) &&
       (file_b.contains("+page.server.ts") || file_b.contains("+layout.server.ts")) {
        let loader_type = extract_loader_type(file_a)
            .or_else(|| extract_loader_type(file_b))
            .unwrap_or_else(|| "page".to_string());
        return ViolationPattern::PageLoader(loader_type);
    }
    
    // Check for Svelte components
    if file_a.ends_with(".svelte") && file_b.ends_with(".svelte") {
        let component_name = extract_component_name(file_a)
            .or_else(|| extract_component_name(file_b))
            .unwrap_or_else(|| "Component".to_string());
        return ViolationPattern::SvelteComponent(component_name);
    }
    
    ViolationPattern::Unknown
}

fn extract_api_handler_type(path: &str) -> Option<String> {
    // /routes/api/analytics/... -> "analytics"
    // /routes/api/newsletter/... -> "newsletter"
    // /routes/api/auth/login/... -> "login"
    let parts: Vec<&str> = path.split('/').collect();
    let api_idx = parts.iter().position(|&p| p == "api")?;
    parts.get(api_idx + 1).map(|s| s.to_string())
}

fn extract_loader_type(path: &str) -> Option<String> {
    // /routes/account/+page.server.ts -> "account"
    // /routes/login/+page.server.ts -> "login"
    let parts: Vec<&str> = path.split('/').collect();
    let routes_idx = parts.iter().position(|&p| p == "routes")?;
    
    // Get the segment after routes that isn't a file
    for part in parts.iter().skip(routes_idx + 1) {
        if !part.starts_with('+') && !part.contains('.') {
            return Some(part.to_string());
        }
    }
    None
}

fn extract_component_name(path: &str) -> Option<String> {
    let file_name = path.split('/').last()?;
    Some(file_name.trim_end_matches(".svelte").to_string())
}

fn to_pascal_case(s: &str) -> String {
    s.split(|c: char| c == '_' || c == '-' || c == ' ')
        .map(|word| {
            let mut chars = word.chars();
            match chars.next() {
                None => String::new(),
                Some(first) => first.to_uppercase().chain(chars).collect(),
            }
        })
        .collect()
}

/// Get recommended threshold for a package type
pub fn recommended_threshold(package_type: &PackageType) -> f64 {
    match package_type {
        PackageType::SharedLibrary => 0.85,  // Strict - shared code should be unique
        PackageType::Property => 0.75,       // Medium - expect some duplication in routes
        PackageType::Worker => 0.70,         // Relaxed - workers are often similar
        PackageType::Infrastructure => 0.80, // Medium-strict
        PackageType::Other => 0.75,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_detect_api_handler_pattern() {
        let file_a = "packages/agency/src/routes/api/analytics/events/+server.ts";
        let file_b = "packages/ltd/src/routes/api/analytics/events/+server.ts";
        
        match detect_violation_pattern(file_a, file_b) {
            ViolationPattern::ApiHandler(handler_type) => {
                assert_eq!(handler_type, "analytics");
            }
            _ => panic!("Expected ApiHandler pattern"),
        }
    }
    
    #[test]
    fn test_detect_page_loader_pattern() {
        let file_a = "packages/agency/src/routes/account/+page.server.ts";
        let file_b = "packages/ltd/src/routes/account/+page.server.ts";
        
        match detect_violation_pattern(file_a, file_b) {
            ViolationPattern::PageLoader(loader_type) => {
                assert_eq!(loader_type, "account");
            }
            _ => panic!("Expected PageLoader pattern"),
        }
    }
    
    #[test]
    fn test_detect_svelte_component_pattern() {
        let file_a = "packages/agency/src/lib/components/Header.svelte";
        let file_b = "packages/ltd/src/lib/components/Header.svelte";
        
        match detect_violation_pattern(file_a, file_b) {
            ViolationPattern::SvelteComponent(name) => {
                assert_eq!(name, "Header");
            }
            _ => panic!("Expected SvelteComponent pattern"),
        }
    }
    
    #[test]
    fn test_to_pascal_case() {
        assert_eq!(to_pascal_case("analytics"), "Analytics");
        assert_eq!(to_pascal_case("user_analytics"), "UserAnalytics");
        assert_eq!(to_pascal_case("cross-domain"), "CrossDomain");
    }
}
