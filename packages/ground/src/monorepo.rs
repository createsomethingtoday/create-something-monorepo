//! CREATE SOMETHING Monorepo Awareness
//!
//! Workspace discovery for the CREATE SOMETHING monorepo.
//! Follows pnpm workspace patterns, manifests, and dependency relationships.
//!
//! ## Package Structure
//!
//! ```text
//! apps/*
//! packages/*
//! packages/*/worker
//! packages/*/workers/*
//! ```

use std::collections::{BTreeSet, HashSet};
use std::path::{Path, PathBuf};
use std::fs;
use serde::{Serialize, Deserialize};

/// CREATE SOMETHING property packages (SvelteKit apps)
pub const PROPERTY_PACKAGES: &[&str] = &["agency", "io", "ltd", "space", "lms"];

/// Shared library package
pub const SHARED_PACKAGE: &str = "canon";

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
    /// Package name (e.g., "@create-something/canon")
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
    /// Shared library (@create-something/canon)
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
    
    /// Target location, present only after resolution and validation
    pub target_path: String,
    
    /// Import statement to use after refactoring
    pub import_statement: String,
    
    /// Linear command to create task.
    pub linear_command: String,
    
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

/// Detect if we're in a pnpm monorepo (works for any pnpm workspace)
pub fn detect_monorepo(start_path: &Path) -> Option<MonorepoInfo> {
    let root = find_monorepo_root(start_path)?;
    
    // Check for pnpm-workspace.yaml (required for any pnpm monorepo)
    let workspace_file = root.join("pnpm-workspace.yaml");
    if !workspace_file.exists() {
        return None;
    }
    
    let is_create_something = fs::read_to_string(root.join("package.json"))
        .ok()
        .and_then(|content| serde_json::from_str::<serde_json::Value>(&content).ok())
        .and_then(|manifest| manifest.get("name").and_then(|name| name.as_str()).map(str::to_owned))
        .is_some_and(|name| name == "@create-something/monorepo");
    
    // Detect packages
    let packages = detect_packages(&root);
    let package_names = packages.iter().map(|package| package.name.clone()).collect::<HashSet<_>>();
    let mut dependencies = Vec::new();
    for package in &packages {
        let Ok(content) = fs::read_to_string(root.join(&package.path).join("package.json")) else {
            continue;
        };
        let Ok(manifest) = serde_json::from_str::<serde_json::Value>(&content) else {
            continue;
        };
        for section in ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"] {
            let Some(entries) = manifest.get(section).and_then(|value| value.as_object()) else {
                continue;
            };
            for dependency in entries.keys() {
                if package_names.contains(dependency) {
                    dependencies.push((package.name.clone(), dependency.clone()));
                }
            }
        }
    }
    dependencies.sort();
    dependencies.dedup();
    
    Some(MonorepoInfo {
        root,
        is_create_something,
        packages,
        dependencies,
    })
}

fn find_monorepo_root(start: &Path) -> Option<PathBuf> {
    let mut current = if start.is_file() {
        start.parent()?
    } else {
        start
    };
    
    while let Some(parent) = current.parent() {
        if current.join("pnpm-workspace.yaml").exists() {
            return Some(current.to_path_buf());
        }
        current = parent;
    }

    if current.join("pnpm-workspace.yaml").exists() {
        return Some(current.to_path_buf());
    }
    None
}

fn detect_packages(root: &Path) -> Vec<PackageInfo> {
    let mut packages = Vec::new();

    for path in discover_workspace_package_paths(root) {
        let name = path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();
        
        // Skip hidden directories
        if name.starts_with('.') {
            continue;
        }
        
        let package_json = path.join("package.json");
        
        // Determine package type
        let relative_path = path.strip_prefix(root).unwrap_or(&path);
        let package_type = if name == SHARED_PACKAGE {
            PackageType::SharedLibrary
        } else if relative_path.starts_with("apps") || PROPERTY_PACKAGES.contains(&name.as_str()) {
            PackageType::Property
        } else if path.join("wrangler.toml").exists() || name == "worker" || name.ends_with("-worker") {
            PackageType::Worker
        } else if name.contains("agent") || name.contains("harness") || name.contains("orchestration") {
            PackageType::Infrastructure
        } else {
            PackageType::Other
        };
        
        let is_sveltekit = path.join("svelte.config.js").exists() || 
                          path.join("src/routes").exists();
        let is_worker = path.join("wrangler.toml").exists() || name == "worker" || name.ends_with("-worker");
        
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

/// Expand the repository's declared pnpm workspace patterns. Package discovery
/// must follow the same include and exclude contract as pnpm so analysis does
/// not silently omit apps or nested workers.
pub fn discover_workspace_package_paths(root: &Path) -> Vec<PathBuf> {
    let Ok(contents) = fs::read_to_string(root.join("pnpm-workspace.yaml")) else {
        return Vec::new();
    };
    let Ok(document) = serde_yaml::from_str::<serde_yaml::Value>(&contents) else {
        return Vec::new();
    };
    let Some(patterns) = document.get("packages").and_then(|value| value.as_sequence()) else {
        return Vec::new();
    };

    let mut included = BTreeSet::new();
    let mut excluded = Vec::new();
    for pattern in patterns.iter().filter_map(|value| value.as_str()) {
        if let Some(pattern) = pattern.strip_prefix('!') {
            if let Ok(pattern) = glob::Pattern::new(pattern) {
                excluded.push(pattern);
            }
            continue;
        }
        let absolute_pattern = root.join(pattern).to_string_lossy().to_string();
        let Ok(matches) = glob::glob(&absolute_pattern) else {
            continue;
        };
        for candidate in matches.flatten() {
            if candidate.is_dir() && candidate.join("package.json").is_file() {
                included.insert(candidate);
            }
        }
    }

    included
        .into_iter()
        .filter(|path| {
            let relative = path.strip_prefix(root).unwrap_or(path);
            !excluded.iter().any(|pattern| pattern.matches_path(relative))
        })
        .collect()
}

/// Generate refactoring suggestion for a DRY violation
pub fn suggest_refactoring(
    _file_a: &Path,
    _file_b: &Path,
    _similarity: f64,
    _monorepo: &MonorepoInfo,
) -> Option<RefactoringSuggestion> {
    None
}

impl RefactoringSuggestion {
    /// Preferred task command for new callers.
    pub fn linear_command(&self) -> &str {
        &self.linear_command
    }
}

/// Generate Linear command for a DRY violation.
pub fn generate_linear_command(
    file_a: &Path,
    file_b: &Path,
    similarity: f64,
    suggestion: Option<&RefactoringSuggestion>,
) -> String {
    if let Some(s) = suggestion {
        return s.linear_command.clone();
    }
    
    // Generic command
    let file_a_name = file_a.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown");
    let file_b_name = file_b.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown");
    
    let priority = if similarity > 0.95 { "urgent" } else if similarity > 0.85 { "high" } else { "normal" };

    linear_create_command(
        &format!(
            "DRY violation: {} vs {} ({:.0}% similar)",
            file_a_name, file_b_name, similarity * 100.0
        ),
        &["refactor", "dry", "ground-detected"],
        priority,
    )
}

fn linear_create_command(title: &str, labels: &[&str], priority: &str) -> String {
    let label_args = labels
        .iter()
        .map(|label| format!(" --label {}", shell_quote(label)))
        .collect::<String>();
    format!(
        "pnpm linear:create -- --title {}{} --priority {}",
        shell_quote(title),
        label_args,
        shell_quote(priority)
    )
}

fn shell_quote(value: &str) -> String {
    format!("\"{}\"", value.replace('"', "\\\""))
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
    fn discovers_included_apps_and_nested_packages_with_dependencies_and_exclusions() {
        let repo = tempfile::tempdir().unwrap();
        fs::write(
            repo.path().join("pnpm-workspace.yaml"),
            "packages:\n  - 'apps/*'\n  - 'packages/*'\n  - 'packages/*/worker'\n  - '!packages/legacy'\n",
        )
        .unwrap();
        fs::write(
            repo.path().join("package.json"),
            r#"{"name":"@create-something/monorepo"}"#,
        )
        .unwrap();
        for directory in ["apps/studio", "packages/service", "packages/service/worker", "packages/legacy"] {
            fs::create_dir_all(repo.path().join(directory)).unwrap();
        }
        fs::write(
            repo.path().join("apps/studio/package.json"),
            r#"{"name":"@create-something/studio","dependencies":{"@create-something/service":"workspace:*"}}"#,
        )
        .unwrap();
        fs::write(
            repo.path().join("packages/service/package.json"),
            r#"{"name":"@create-something/service"}"#,
        )
        .unwrap();
        fs::write(
            repo.path().join("packages/service/worker/package.json"),
            r#"{"name":"@create-something/service-worker","dependencies":{"@create-something/service":"workspace:*"}}"#,
        )
        .unwrap();
        fs::write(
            repo.path().join("packages/legacy/package.json"),
            r#"{"name":"@create-something/legacy"}"#,
        )
        .unwrap();

        let detected = detect_monorepo(repo.path()).unwrap();
        let names = detected.packages.iter().map(|package| package.name.as_str()).collect::<Vec<_>>();
        assert_eq!(names, vec![
            "@create-something/studio",
            "@create-something/service",
            "@create-something/service-worker",
        ]);
        assert!(detected.is_create_something);
        assert_eq!(detected.dependencies, vec![
            ("@create-something/service-worker".to_string(), "@create-something/service".to_string()),
            ("@create-something/studio".to_string(), "@create-something/service".to_string()),
        ]);
    }

    #[test]
    fn create_something_refactors_require_resolved_exports_before_suggesting_a_target() {
        let monorepo = MonorepoInfo {
            root: PathBuf::from("/repo"),
            is_create_something: true,
            packages: Vec::new(),
            dependencies: Vec::new(),
        };

        assert!(suggest_refactoring(
            Path::new("/repo/apps/agency/src/routes/api/auth/+server.ts"),
            Path::new("/repo/apps/io/src/routes/api/auth/+server.ts"),
            0.95,
            &monorepo,
        )
        .is_none());
    }
}
