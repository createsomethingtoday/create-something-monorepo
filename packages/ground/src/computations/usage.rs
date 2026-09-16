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
    
    /// Total number of usages found (including definitions)
    pub usage_count: u32,
    
    /// Number of definition sites (export, function, class, interface, type declarations)
    pub definition_count: u32,
    
    /// Number of actual usages (calls, references, imports)
    pub actual_usage_count: u32,
    
    /// Number of type-only usages (generic params, type annotations, etc.)
    #[serde(default)]
    pub type_only_count: u32,
    
    /// Locations where the symbol was found
    pub locations: Vec<UsageLocation>,
    
    /// When this computation was performed
    pub computed_at: DateTime<Utc>,
}

/// A location where a symbol is used
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct UsageLocation {
    pub file: PathBuf,
    pub line: u32,
    pub column: u32,
    pub context: String,
    /// Whether this is a definition site (vs an actual usage)
    pub is_definition: bool,
    /// The type of usage (definition, usage, or type-only)
    #[serde(default)]
    pub usage_type: UsageType,
}

impl Default for UsageType {
    fn default() -> Self {
        UsageType::Usage
    }
}

/// Type of usage location
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum UsageType {
    /// Definition site (export, function, class, interface, type)
    Definition,
    /// Actual usage (call, reference, import from another file)
    Usage,
    /// Type-only usage (generic param, type annotation, type assertion)
    TypeOnly,
}

impl UsageEvidence {
    /// Check if this symbol "earns existence" (has minimum actual usages, not counting definitions)
    /// Type-only usages count as actual usages for types/interfaces
    pub fn earns_existence(&self, min_usage: u32) -> bool {
        (self.actual_usage_count + self.type_only_count) >= min_usage
    }
    
    /// Check if symbol is only defined but never actually used
    /// Type-only usages count as usage for types
    pub fn is_defined_but_unused(&self) -> bool {
        self.definition_count > 0 && self.actual_usage_count == 0 && self.type_only_count == 0
    }
    
    /// Check if symbol appears to be exported but never imported elsewhere
    /// Type-only usages count as imports for types
    pub fn is_exported_but_unused(&self) -> bool {
        // If we have definitions (including exports) but no actual usages or type-only usages,
        // this is an exported-but-unused symbol
        self.definition_count > 0 && self.actual_usage_count == 0 && self.type_only_count == 0
    }
    
    /// Check if symbol is used only as a type (not at runtime)
    pub fn is_type_only(&self) -> bool {
        self.type_only_count > 0 && self.actual_usage_count == 0
    }
    
    /// Total usages including type-only
    pub fn total_usages(&self) -> u32 {
        self.actual_usage_count + self.type_only_count
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
    
    // Count definitions vs actual usages vs type-only usages
    let definition_count = locations.iter()
        .filter(|l| l.usage_type == UsageType::Definition)
        .count() as u32;
    let type_only_count = locations.iter()
        .filter(|l| l.usage_type == UsageType::TypeOnly)
        .count() as u32;
    let actual_usage_count = locations.iter()
        .filter(|l| l.usage_type == UsageType::Usage)
        .count() as u32;
    
    Ok(UsageEvidence {
        id: Uuid::new_v4(),
        symbol: symbol.to_string(),
        search_path: search_path.to_path_buf(),
        usage_count: locations.len() as u32,
        definition_count,
        actual_usage_count,
        type_only_count,
        locations,
        computed_at: Utc::now(),
    })
}

fn search_file(symbol: &str, path: &Path, locations: &mut Vec<UsageLocation>) -> Result<(), ComputationError> {
    // Skip non-code files
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
    if !matches!(ext, "ts" | "tsx" | "js" | "jsx" | "svelte" | "rs" | "py" | "go") {
        return Ok(());
    }
    
    let content = fs::read_to_string(path)?;
    
    for (line_num, line) in content.lines().enumerate() {
        // Simple word-boundary search for the symbol
        // In production, use tree-sitter for semantic search
        if contains_symbol(line, symbol) {
            let column = line.find(symbol).unwrap_or(0) as u32;
            let usage_type = classify_usage(line, symbol);
            let is_definition = usage_type == UsageType::Definition;
            
            locations.push(UsageLocation {
                file: path.to_path_buf(),
                line: (line_num + 1) as u32,
                column,
                context: line.trim().to_string(),
                is_definition,
                usage_type,
            });
        }
    }
    
    Ok(())
}

/// Classify the type of usage for a symbol on a line
fn classify_usage(line: &str, symbol: &str) -> UsageType {
    // First check if it's a definition
    if is_definition_line(line, symbol) {
        return UsageType::Definition;
    }
    
    // Then check for type-only usages (TypeScript/JavaScript patterns)
    if is_type_only_usage(line, symbol) {
        return UsageType::TypeOnly;
    }
    
    // Default to actual runtime usage
    UsageType::Usage
}

/// Detect if a line uses the symbol only as a type (not at runtime)
fn is_type_only_usage(line: &str, symbol: &str) -> bool {
    let trimmed = line.trim();
    
    // Type import: import type { Symbol } or import { type Symbol }
    if trimmed.starts_with("import type") && trimmed.contains(symbol) {
        return true;
    }
    if trimmed.starts_with("import") && trimmed.contains(&format!("type {}", symbol)) {
        return true;
    }
    
    // Generic type parameter: <Symbol> or <Symbol, Other> or <T extends Symbol>
    let generic_patterns = [
        format!("<{}>", symbol),
        format!("<{},", symbol),
        format!("<{} ", symbol),
        format!(", {}>", symbol),
        format!(", {},", symbol),
        format!("extends {}>", symbol),
        format!("extends {},", symbol),
        format!("extends {} ", symbol),
    ];
    for pattern in &generic_patterns {
        if trimmed.contains(pattern) {
            return true;
        }
    }
    
    // Type annotation: : Symbol or : Symbol[] or : Symbol | Other
    let annotation_patterns = [
        format!(": {}", symbol),
        format!(": {}[", symbol),
        format!(": {} |", symbol),
        format!(": {} &", symbol),
        format!(": {} =", symbol),  // default type
        format!("| {}", symbol),
        format!("& {}", symbol),
    ];
    for pattern in &annotation_patterns {
        if trimmed.contains(pattern) {
            // Make sure it's not a ternary or object property
            // Skip if there's a ? before the colon (ternary) 
            let symbol_pos = trimmed.find(pattern);
            if let Some(pos) = symbol_pos {
                let before = &trimmed[..pos];
                // Ternary check: look for ? without : between them
                if !before.contains('?') || before.rfind(':').map_or(false, |c| c > before.rfind('?').unwrap_or(0)) {
                    return true;
                }
            }
        }
    }
    
    // Type assertion: as Symbol
    if trimmed.contains(&format!("as {}", symbol)) {
        return true;
    }
    
    // implements/extends in class/interface declaration
    if (trimmed.contains("implements") || trimmed.contains("extends")) && trimmed.contains(symbol) {
        // Check it's not a function call
        if !trimmed.contains(&format!("{}(", symbol)) {
            return true;
        }
    }
    
    // satisfies operator: satisfies Symbol
    if trimmed.contains(&format!("satisfies {}", symbol)) {
        return true;
    }
    
    // Rust type patterns
    if trimmed.contains(&format!("-> {}", symbol)) || // return type
       trimmed.contains(&format!(": {}", symbol)) ||  // type annotation
       trimmed.contains(&format!("impl {}", symbol)) || // impl block
       trimmed.contains(&format!("where {}", symbol)) { // where clause
        return true;
    }
    
    false
}

/// Detect if a line is a definition site for the symbol
fn is_definition_line(line: &str, symbol: &str) -> bool {
    let trimmed = line.trim();
    
    // TypeScript/JavaScript definition patterns
    let ts_definition_patterns = [
        // Export declarations
        format!("export function {}", symbol),
        format!("export const {}", symbol),
        format!("export let {}", symbol),
        format!("export class {}", symbol),
        format!("export interface {}", symbol),
        format!("export type {}", symbol),
        format!("export enum {}", symbol),
        format!("export {{ {}", symbol),  // re-export
        format!("export default {}", symbol),
        // Non-export declarations
        format!("function {}", symbol),
        format!("const {} =", symbol),
        format!("let {} =", symbol),
        format!("var {} =", symbol),
        format!("class {}", symbol),
        format!("interface {}", symbol),
        format!("type {} =", symbol),
        format!("enum {}", symbol),
        // Async/generator variants
        format!("export async function {}", symbol),
        format!("async function {}", symbol),
        // Object property definitions
        format!("{}: function", symbol),
        format!("{}(", symbol),  // Method shorthand (if at start)
    ];
    
    // Rust definition patterns
    let rust_definition_patterns = [
        format!("pub fn {}", symbol),
        format!("fn {}", symbol),
        format!("pub struct {}", symbol),
        format!("struct {}", symbol),
        format!("pub enum {}", symbol),
        format!("enum {}", symbol),
        format!("pub type {}", symbol),
        format!("type {}", symbol),
        format!("pub trait {}", symbol),
        format!("trait {}", symbol),
        format!("pub const {}", symbol),
        format!("const {}", symbol),
        format!("pub static {}", symbol),
        format!("static {}", symbol),
    ];
    
    // Python definition patterns  
    let python_definition_patterns = [
        format!("def {}(", symbol),
        format!("class {}:", symbol),
        format!("class {}(", symbol),
        format!("{} =", symbol),  // Variable assignment at module level
    ];
    
    // Check all patterns
    for pattern in ts_definition_patterns.iter()
        .chain(rust_definition_patterns.iter())
        .chain(python_definition_patterns.iter()) 
    {
        if trimmed.starts_with(&*pattern) {
            return true;
        }
    }
    
    // Also check for definitions with decorators/attributes on previous line
    // e.g., @decorator \n def foo():
    // This is a simplified check - would need multi-line context for full accuracy
    
    false
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

/// A dead export - exported but never imported elsewhere
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeadExport {
    /// The exported symbol name
    pub name: String,
    /// The file it's exported from
    pub file: PathBuf,
    /// Line number of the export
    pub line: u32,
    /// The export statement
    pub context: String,
}

/// Result of scanning for dead exports
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeadExportsReport {
    /// Module that was scanned
    pub module_path: PathBuf,
    /// Exports that are never imported elsewhere
    pub dead_exports: Vec<DeadExport>,
    /// Total exports found
    pub total_exports: u32,
    /// Search scope used
    pub search_scope: PathBuf,
    /// Computation timestamp
    pub computed_at: DateTime<Utc>,
}

/// Find exports in a module that are never imported elsewhere
pub fn find_dead_exports(module_path: &Path, search_scope: &Path) -> Result<DeadExportsReport, ComputationError> {
    use super::imports::{extract_exports as extract_exports_ast, extract_reexport_edges};
    
    // Use tree-sitter to extract all exports (more accurate than string parsing)
    let ast_exports = extract_exports_ast(module_path)
        .map_err(|e| ComputationError::ParseError { 
            file: module_path.to_path_buf(), 
            message: e 
        })?;
    
    let total_exports = ast_exports.len() as u32;
    // Validate the complete scope before issuing absence evidence. The graph's
    // resolver binds imports to package/relative targets instead of names alone.
    fs::read_dir(search_scope)?;
    let graph = super::graph::SymbolGraph::build(search_scope, None)
        .map_err(|message| ComputationError::ParseError { file: search_scope.to_path_buf(), message })?;
    if graph.parse_errors > 0 || graph.imports.len() != graph.files.len() {
        return Err(ComputationError::ParseError {
            file: search_scope.to_path_buf(),
            message: "Incomplete source parsing in search scope; cannot establish unused exports".to_string(),
        });
    }
    
    // Convert to DeadExport format for checking
    let exports: Vec<DeadExport> = ast_exports.iter()
        .filter(|e| !e.is_reexport) // Only check original exports, not re-exports
        .map(|e| DeadExport {
            name: e.name.clone(),
            file: module_path.to_path_buf(),
            line: e.line as u32,
            context: format!("export {}", e.name),
        })
        .collect();
    
    // Then check each export for usage in the search scope
    let mut dead_exports = Vec::new();
    
    let mut barrel_edges = Vec::new();
    for file in &graph.files {
        let edges = extract_reexport_edges(file).map_err(|message| ComputationError::ParseError { file: file.clone(), message })?;
        barrel_edges.push((file, edges));
    }
    
    for export in exports {
        let mut pending = vec![(module_path.to_path_buf(), export.name.clone())];
        let mut visited = std::collections::HashSet::new();
        let mut used = false;
        while let Some((target, name)) = pending.pop() {
            if !visited.insert((target.clone(), name.clone())) { continue; }
            if graph.imports.iter().any(|(importer, imports)| {
                importer != &target && imports.iter().any(|import| {
                    import.name == name && graph.resolves_to(&import.from_module, &target, importer)
                })
            }) {
                used = true;
                break;
            }
            for (barrel, edges) in &barrel_edges {
                for edge in edges {
                    if !edge.source.is_empty() && (edge.imported == name || (edge.imported == "*" && name != "default"))
                        && graph.resolves_to(&edge.source, &target, barrel) {
                        let exposed = if edge.exported == "*" { name.clone() } else { edge.exported.clone() };
                        let bindings = exposed_bindings(&graph, &barrel_edges, barrel, &exposed, &mut std::collections::HashSet::new());
                        let original = (module_path.canonicalize().unwrap_or_else(|_| module_path.to_path_buf()), export.name.clone());
                        if bindings.len() == 1 && bindings.contains(&original) {
                            pending.push(((*barrel).clone(), exposed));
                        }
                    }
                }
            }
        }
        if !used { dead_exports.push(export); }
    }
    
    Ok(DeadExportsReport {
        module_path: module_path.to_path_buf(),
        dead_exports,
        total_exports,
        search_scope: search_scope.to_path_buf(),
        computed_at: Utc::now(),
    })
}

/// Resolve the binding a barrel exposes: explicit declarations override stars;
/// distinct star origins remain ambiguous, while repeated paths to one binding agree.
fn exposed_bindings(
    graph: &super::graph::SymbolGraph,
    barrels: &[(&PathBuf, Vec<super::imports::ReexportEdge>)],
    file: &Path,
    name: &str,
    visiting: &mut std::collections::HashSet<(PathBuf, String)>,
) -> std::collections::HashSet<(PathBuf, String)> {
    let key = (file.canonicalize().unwrap_or_else(|_| file.to_path_buf()), name.to_string());
    let mut origins = std::collections::HashSet::new();
    if !visiting.insert(key.clone()) { return origins; }
    if let Some((_, edges)) = barrels.iter().find(|(path, _)| path.as_path() == file) {
        let explicit = edges.iter().any(|edge| edge.exported == name);
        for edge in edges {
            if !(edge.exported == name || (!explicit && edge.exported == "*" && name != "default")) { continue; }
            if edge.source.is_empty() {
                origins.insert((key.0.clone(), edge.imported.clone()));
            } else {
                let imported = if edge.imported == "*" { name } else { &edge.imported };
                for target in &graph.files {
                    if graph.resolves_to(&edge.source, target, file) {
                        origins.extend(exposed_bindings(graph, barrels, target, imported, visiting));
                    }
                }
            }
        }
    }
    visiting.remove(&key);
    origins
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    use std::fs::File;
    use std::io::Write;

    #[test]
    fn review_wildcard_barrels_preserve_real_consumers() {
        let dir = tempdir().unwrap();
        let source = dir.path().join("types.ts");
        fs::write(&source, "export const receipt = 1;").unwrap();
        fs::write(dir.path().join("index.ts"), "export * from './middle.js';").unwrap();
        fs::write(dir.path().join("middle.ts"), "export * from './types.js'; export * from './index.js';").unwrap();
        fs::write(dir.path().join("consumer.ts"), "import { receipt } from './index.js'; console.log(receipt);").unwrap();
        assert!(find_dead_exports(&source, dir.path()).unwrap().dead_exports.is_empty());
    }

    #[test]
    fn review_svelte_alias_uses_owning_config_directory() {
        let dir = tempdir().unwrap();
        fs::create_dir_all(dir.path().join("src/lib")).unwrap();
        fs::write(dir.path().join("svelte.config.js"), "export default {};").unwrap();
        let source = dir.path().join("src/lib/data.ts");
        fs::write(&source, "export const receipt = 1;").unwrap();
        fs::write(dir.path().join("src/page.ts"), "import { receipt } from '$lib/data.js'; console.log(receipt);").unwrap();
        assert!(find_dead_exports(&source, &dir.path().join("src")).unwrap().dead_exports.is_empty());
    }

    #[test]
    fn review_barrel_aliases_match_source_identity() {
        let dir = tempdir().unwrap();
        let source = dir.path().join("types.ts");
        fs::write(&source, "export const receipt = 1;").unwrap();
        fs::write(dir.path().join("other.ts"), "export const receipt = 2;").unwrap();
        fs::write(dir.path().join("index.ts"), "export { receipt as publicReceipt } from './types.js';").unwrap();
        fs::write(dir.path().join("consumer.ts"), "import { publicReceipt } from './index.js'; console.log(publicReceipt);").unwrap();
        assert!(find_dead_exports(&source, dir.path()).unwrap().dead_exports.is_empty());
        assert_eq!(find_dead_exports(&dir.path().join("other.ts"), dir.path()).unwrap().dead_exports.len(), 1);
    }

    #[test]
    fn review_tsconfig_base_url_is_relative_to_config() {
        let dir = tempdir().unwrap();
        fs::create_dir_all(dir.path().join("src/lib")).unwrap();
        fs::write(dir.path().join("tsconfig.json"), r#"{"compilerOptions":{"baseUrl":"src","paths":{"@data/*":["lib/*"]}}}"#).unwrap();
        let source = dir.path().join("src/lib/data.ts");
        fs::write(&source, "export const receipt = 1;").unwrap();
        fs::write(dir.path().join("src/page.ts"), "import { receipt } from '@data/data.js'; console.log(receipt);").unwrap();
        assert!(find_dead_exports(&source, &dir.path().join("src")).unwrap().dead_exports.is_empty());
    }

    #[test]
    fn review_wildcard_shadowing_and_ambiguity_do_not_hide_unused_exports() {
        for barrel in [
            "export * from './source.js'; export const receipt = 3;",
            "export * from './source.js'; export { receipt } from './other.js';",
            "export * from './source.js'; export * from './other.js';",
            "export * from './source.js'; const own = 3; export { own as receipt };",
        ] {
            let dir = tempdir().unwrap();
            let source = dir.path().join("source.ts");
            fs::write(&source, "export const receipt = 1;").unwrap();
            fs::write(dir.path().join("other.ts"), "export const receipt = 2;").unwrap();
            fs::write(dir.path().join("index.ts"), barrel).unwrap();
            fs::write(dir.path().join("consumer.ts"), "import { receipt } from './index.js'; console.log(receipt);").unwrap();
            assert_eq!(find_dead_exports(&source, dir.path()).unwrap().dead_exports.len(), 1, "{barrel}");
        }
    }

    #[test]
    fn review_repeated_wildcard_paths_to_one_binding_are_not_ambiguous() {
        let dir = tempdir().unwrap();
        let source = dir.path().join("source.ts");
        fs::write(&source, "export const receipt = 1;").unwrap();
        fs::write(dir.path().join("left.ts"), "export * from './source.js';").unwrap();
        fs::write(dir.path().join("right.ts"), "export * from './source.js';").unwrap();
        fs::write(dir.path().join("index.ts"), "export * from './left.js'; export * from './right.js';").unwrap();
        fs::write(dir.path().join("consumer.ts"), "import { receipt } from './index.js'; console.log(receipt);").unwrap();
        assert!(find_dead_exports(&source, dir.path()).unwrap().dead_exports.is_empty());
    }
    
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
    
    #[test]
    fn test_distinguishes_definition_from_usage() {
        let dir = tempdir().unwrap();
        
        // Create a file with both definition and usage
        let file = dir.path().join("utils.ts");
        File::create(&file).unwrap().write_all(br#"
export function validateEmail(email: string): boolean {
    return email.includes('@');
}

// Self-referential usage within the same file
const isValid = validateEmail('test@example.com');
"#).unwrap();
        
        let evidence = count_usages("validateEmail", dir.path()).unwrap();
        
        // Should have 2 occurrences total
        assert_eq!(evidence.usage_count, 2);
        // 1 is a definition
        assert_eq!(evidence.definition_count, 1);
        // 1 is actual usage
        assert_eq!(evidence.actual_usage_count, 1);
    }
    
    #[test]
    fn test_exported_but_unused() {
        let dir = tempdir().unwrap();
        
        // Create a file with only a definition (export but no usage)
        let file = dir.path().join("types.ts");
        File::create(&file).unwrap().write_all(br#"
export interface BeadsNotionConfig {
    apiKey: string;
    databaseId: string;
}
"#).unwrap();
        
        let evidence = count_usages("BeadsNotionConfig", dir.path()).unwrap();
        
        // Only 1 occurrence (the definition)
        assert_eq!(evidence.usage_count, 1);
        assert_eq!(evidence.definition_count, 1);
        assert_eq!(evidence.actual_usage_count, 0);
        
        // Should be flagged as exported-but-unused
        assert!(evidence.is_exported_but_unused());
        // Should NOT "earn existence" with min_usage = 1
        // because actual_usage_count is 0
        assert!(!evidence.earns_existence(1));
    }
    
    #[test]
    fn test_definition_detection() {
        // Function declarations
        assert!(is_definition_line("export function validateEmail()", "validateEmail"));
        assert!(is_definition_line("function validateEmail()", "validateEmail"));
        assert!(is_definition_line("export async function fetchData()", "fetchData"));
        
        // Class/interface/type declarations
        assert!(is_definition_line("export interface Config {", "Config"));
        assert!(is_definition_line("export type Status = 'ok' | 'error';", "Status"));
        assert!(is_definition_line("export class Service {", "Service"));
        
        // Const declarations
        assert!(is_definition_line("export const MY_CONST = 42;", "MY_CONST"));
        assert!(is_definition_line("const helper = () => {};", "helper"));
        
        // NOT definitions (usages)
        assert!(!is_definition_line("const result = validateEmail(input);", "validateEmail"));
        assert!(!is_definition_line("import { validateEmail } from './utils';", "validateEmail"));
    }
    
    #[test]
    fn test_reexport_chain_detection() {
        // Test the exact WORKWAY scenario:
        // security.ts exports verifyHmacSignature
        // core/index.ts re-exports from ./security.js
        // docusign/index.ts imports from ../core/index.js
        // Result: security.ts::verifyHmacSignature should NOT be dead
        
        let dir = tempdir().unwrap();
        
        // Create core directory structure
        let core_dir = dir.path().join("core");
        fs::create_dir(&core_dir).unwrap();
        
        // security.ts - the source file
        let security = core_dir.join("security.ts");
        File::create(&security).unwrap().write_all(br#"
export function verifyHmacSignature(data: string): boolean {
    return true;
}

export function secureCompare(a: string, b: string): boolean {
    return a === b;
}
"#).unwrap();
        
        // core/index.ts - the barrel file that re-exports
        let core_index = core_dir.join("index.ts");
        File::create(&core_index).unwrap().write_all(br#"
export { verifyHmacSignature, secureCompare } from './security.js';
"#).unwrap();
        
        // Create docusign directory
        let docusign_dir = dir.path().join("docusign");
        fs::create_dir(&docusign_dir).unwrap();
        
        // docusign/index.ts - consumes via barrel import
        let docusign_index = docusign_dir.join("index.ts");
        File::create(&docusign_index).unwrap().write_all(br#"
import { verifyHmacSignature } from '../core/index.js';

export function handleWebhook(data: string): boolean {
    return verifyHmacSignature(data);
}
"#).unwrap();
        
        // Now test: security.ts exports should NOT be dead
        let report = find_dead_exports(&security, dir.path()).unwrap();
        
        // verifyHmacSignature is used via barrel - should NOT be dead
        let dead_names: Vec<&str> = report.dead_exports.iter().map(|e| e.name.as_str()).collect();
        
        assert!(!dead_names.contains(&"verifyHmacSignature"), 
            "verifyHmacSignature should NOT be dead - it's used via re-export chain. Dead: {:?}", dead_names);
        
        // secureCompare is NOT imported anywhere - should be dead
        assert!(dead_names.contains(&"secureCompare"),
            "secureCompare SHOULD be dead - nothing imports it. Dead: {:?}", dead_names);
    }
    
    #[test]
    fn test_counts_symbol_usages_in_svelte() {
        let dir = tempdir().unwrap();
        
        // Create a TypeScript file with exports
        let utils = dir.path().join("utils.ts");
        File::create(&utils).unwrap().write_all(br#"
export function validateEmail(email: string): boolean {
    return email.includes('@');
}
"#).unwrap();
        
        // Create a Svelte file that imports from utils
        let component = dir.path().join("Form.svelte");
        File::create(&component).unwrap().write_all(br#"<script lang="ts">
import { validateEmail } from './utils';

let email = '';
$: isValid = validateEmail(email);
</script>

<input bind:value={email} />
<span>{isValid ? 'Valid' : 'Invalid'}</span>
"#).unwrap();
        
        let evidence = count_usages("validateEmail", dir.path()).unwrap();
        
        // Should find: 1 definition in utils.ts, 2 usages in Form.svelte (import + call)
        assert!(evidence.usage_count >= 3, 
            "Expected at least 3 occurrences, got {}", evidence.usage_count);
        assert!(evidence.definition_count >= 1,
            "Expected at least 1 definition, got {}", evidence.definition_count);
    }
    
    #[test]
    fn test_dead_export_not_flagged_when_imported_in_svelte() {
        let dir = tempdir().unwrap();
        
        // Create a lib directory structure
        let lib_dir = dir.path().join("lib");
        fs::create_dir(&lib_dir).unwrap();
        
        // Create utils.ts with exports
        let utils = lib_dir.join("utils.ts");
        File::create(&utils).unwrap().write_all(br#"
export function formatDate(date: Date): string {
    return date.toISOString();
}

export function unusedHelper(): void {
    // This is never imported
}
"#).unwrap();
        
        // Create a Svelte component that imports formatDate
        let component = dir.path().join("DateDisplay.svelte");
        File::create(&component).unwrap().write_all(br#"<script lang="ts">
import { formatDate } from './lib/utils';

export let date: Date;
$: formatted = formatDate(date);
</script>

<time>{formatted}</time>
"#).unwrap();
        
        // Check dead exports
        let report = find_dead_exports(&utils, dir.path()).unwrap();
        let dead_names: Vec<&str> = report.dead_exports.iter().map(|e| e.name.as_str()).collect();
        
        // formatDate is imported in Svelte - should NOT be dead
        assert!(!dead_names.contains(&"formatDate"),
            "formatDate should NOT be dead - it's imported in DateDisplay.svelte. Dead: {:?}", dead_names);
        
        // unusedHelper is not imported anywhere - should be dead
        assert!(dead_names.contains(&"unusedHelper"),
            "unusedHelper SHOULD be dead - nothing imports it. Dead: {:?}", dead_names);
    }
}
