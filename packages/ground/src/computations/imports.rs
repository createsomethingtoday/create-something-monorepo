//! AST-based Import Analysis
//!
//! Uses tree-sitter for robust import/export parsing instead of string manipulation.
//! Handles all edge cases: multi-line imports, re-exports, barrel files, Svelte files, etc.

use std::path::{Path, PathBuf};
use std::fs;
use tree_sitter::{Parser, Node};

/// Extract script content from a Svelte file.
/// 
/// Svelte files contain `<script>` or `<script lang="ts">` tags with TypeScript/JavaScript.
/// This extracts the content for parsing with tree-sitter.
/// 
/// Handles both regular `<script>` and `<script context="module">` tags while
/// preserving source line positions.
fn extract_svelte_script(source: &str) -> Option<String> {
    extract_svelte_scripts(source, false)
}

/// Extract only module-context scripts from a Svelte component.
///
/// Instance-script exports are component API (`export let` props and exported
/// component methods), not JavaScript module exports. Dead-export analysis must
/// therefore ignore the entire instance script.
fn extract_svelte_module_script(source: &str) -> Option<String> {
    extract_svelte_scripts(source, true)
}

fn extract_svelte_scripts(source: &str, module_only: bool) -> Option<String> {
    let source_bytes = source.as_bytes();
    let mut extracted = source_bytes
        .iter()
        .map(|byte| {
            if matches!(byte, b'\n' | b'\r') {
                *byte
            } else {
                b' '
            }
        })
        .collect::<Vec<_>>();
    let mut found = false;
    let mut search_start = 0;

    while let Some(tag_start) = source[search_start..].find("<script") {
        let abs_tag_start = search_start + tag_start;

        // Find the end of the opening tag
        let tag_content_start = match source[abs_tag_start..].find('>') {
            Some(pos) => abs_tag_start + pos + 1,
            None => {
                search_start = abs_tag_start + 7; // skip "<script"
                continue;
            }
        };

        // Find the closing </script> tag
        let tag_content_end = match source[tag_content_start..].find("</script>") {
            Some(pos) => tag_content_start + pos,
            None => {
                search_start = tag_content_start;
                continue;
            }
        };

        let opening_tag = &source[abs_tag_start..tag_content_start];
        let normalized_tag = opening_tag
            .to_ascii_lowercase()
            .chars()
            .filter(|character| !character.is_ascii_whitespace())
            .collect::<String>();
        let has_context_module = normalized_tag.contains("context=\"module\"")
            || normalized_tag.contains("context='module'");
        let has_module_attribute = opening_tag
            .trim_end_matches('>')
            .split_ascii_whitespace()
            .any(|attribute| attribute.eq_ignore_ascii_case("module"));

        if !module_only || has_context_module || has_module_attribute {
            extracted[tag_content_start..tag_content_end]
                .copy_from_slice(&source_bytes[tag_content_start..tag_content_end]);
            found = true;
        }

        search_start = tag_content_end + 9; // skip "</script>"
    }

    if !found {
        return None;
    }

    String::from_utf8(extracted).ok()
}

/// An import statement extracted from source
#[derive(Debug, Clone)]
pub struct ExtractedImport {
    /// Symbols imported (e.g., ["foo", "bar"])
    pub symbols: Vec<String>,
    /// Source path (e.g., "./utils" or "../core/index.js")
    pub source: String,
    /// Whether this is a type-only import
    pub is_type_only: bool,
    /// Start line
    pub start_line: usize,
    /// End line  
    pub end_line: usize,
}

/// An export statement extracted from source
#[derive(Debug, Clone)]
pub struct ExtractedExport {
    /// Symbol name being exported
    pub name: String,
    /// Whether this is a re-export (export { x } from './y')
    pub is_reexport: bool,
    /// Source path if re-export
    pub source: Option<String>,
    /// Start line
    pub line: usize,
}

/// Extract all imports from a TypeScript/JavaScript/Svelte file using tree-sitter
pub fn extract_imports(path: &Path) -> Result<Vec<ExtractedImport>, String> {
    let source = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read file: {}", e))?;
    
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
    
    // Handle Svelte files by extracting script content
    let (parse_source, language) = if ext == "svelte" {
        let script = extract_svelte_script(&source)
            .ok_or_else(|| "No script tag found in Svelte file".to_string())?;
        (script, tree_sitter_typescript::LANGUAGE_TYPESCRIPT.into())
    } else if ext == "ts" || ext == "tsx" {
        (source.clone(), tree_sitter_typescript::LANGUAGE_TYPESCRIPT.into())
    } else {
        (source.clone(), tree_sitter_javascript::LANGUAGE.into())
    };
    
    let mut parser = Parser::new();
    parser.set_language(&language)
        .map_err(|e| format!("Failed to set language: {}", e))?;
    
    let tree = parser.parse(&parse_source, None)
        .ok_or_else(|| "Failed to parse file".to_string())?;
    
    let mut imports = Vec::new();
    extract_imports_from_node(tree.root_node(), &parse_source, &mut imports);
    
    Ok(imports)
}

/// Extract all exports from a TypeScript/JavaScript/Svelte file using tree-sitter
pub fn extract_exports(path: &Path) -> Result<Vec<ExtractedExport>, String> {
    let source = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read file: {}", e))?;
    
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
    
    // Svelte module exports exist only in module-context scripts. Instance
    // exports describe the component API and must not enter dead-export checks.
    let (parse_source, language) = if ext == "svelte" {
        let Some(script) = extract_svelte_module_script(&source) else {
            return Ok(Vec::new());
        };
        (script, tree_sitter_typescript::LANGUAGE_TYPESCRIPT.into())
    } else if ext == "ts" || ext == "tsx" {
        (source.clone(), tree_sitter_typescript::LANGUAGE_TYPESCRIPT.into())
    } else {
        (source.clone(), tree_sitter_javascript::LANGUAGE.into())
    };
    
    let mut parser = Parser::new();
    parser.set_language(&language)
        .map_err(|e| format!("Failed to set language: {}", e))?;
    
    let tree = parser.parse(&parse_source, None)
        .ok_or_else(|| "Failed to parse file".to_string())?;
    
    let mut exports = Vec::new();
    extract_exports_from_node(tree.root_node(), &parse_source, &mut exports);
    
    Ok(exports)
}

fn extract_imports_from_node(node: Node, source: &str, imports: &mut Vec<ExtractedImport>) {
    // Handle import statements
    if node.kind() == "import_statement" {
        if let Some(import) = parse_import_statement(node, source) {
            imports.push(import);
        }
    }
    
    // Recurse into children
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        extract_imports_from_node(child, source, imports);
    }
}

fn parse_import_statement(node: Node, source: &str) -> Option<ExtractedImport> {
    let mut symbols = Vec::new();
    let mut import_source = String::new();
    let mut is_type_only = false;
    
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        match child.kind() {
            "import_clause" => {
                // Check for type-only import
                let clause_text = child.utf8_text(source.as_bytes()).unwrap_or("");
                if clause_text.starts_with("type") {
                    is_type_only = true;
                }
                
                // Extract named imports
                let mut inner_cursor = child.walk();
                for inner in child.children(&mut inner_cursor) {
                    if inner.kind() == "named_imports" {
                        extract_named_imports(inner, source, &mut symbols);
                    } else if inner.kind() == "identifier" {
                        // Default import
                        if let Ok(name) = inner.utf8_text(source.as_bytes()) {
                            symbols.push(name.to_string());
                        }
                    }
                }
            }
            "string" | "string_fragment" => {
                if let Ok(text) = child.utf8_text(source.as_bytes()) {
                    import_source = text.trim_matches(|c| c == '"' || c == '\'').to_string();
                }
            }
            _ => {}
        }
    }
    
    // Also try to get source from the last string child
    if import_source.is_empty() {
        if let Some(source_node) = node.child_by_field_name("source") {
            if let Ok(text) = source_node.utf8_text(source.as_bytes()) {
                import_source = text.trim_matches(|c| c == '"' || c == '\'').to_string();
            }
        }
    }
    
    if import_source.is_empty() {
        return None;
    }
    
    Some(ExtractedImport {
        symbols,
        source: import_source,
        is_type_only,
        start_line: node.start_position().row + 1,
        end_line: node.end_position().row + 1,
    })
}

fn extract_named_imports(node: Node, source: &str, symbols: &mut Vec<String>) {
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        if child.kind() == "import_specifier" {
            // Get the imported name (could be aliased)
            if let Some(name_node) = child.child_by_field_name("name") {
                if let Ok(name) = name_node.utf8_text(source.as_bytes()) {
                    symbols.push(name.to_string());
                }
            } else {
                // No alias, just get the identifier
                let mut inner_cursor = child.walk();
                for inner in child.children(&mut inner_cursor) {
                    if inner.kind() == "identifier" {
                        if let Ok(name) = inner.utf8_text(source.as_bytes()) {
                            symbols.push(name.to_string());
                        }
                        break;
                    }
                }
            }
        }
    }
}

fn extract_exports_from_node(node: Node, source: &str, exports: &mut Vec<ExtractedExport>) {
    match node.kind() {
        // export function foo() {}
        // export const foo = ...
        // export class Foo {}
        "export_statement" => {
            parse_export_statement(node, source, exports);
        }
        // export { foo, bar } from './module'
        // export { foo }
        "export_clause" => {
            // This is handled inside export_statement
        }
        _ => {}
    }
    
    // Recurse into children
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        extract_exports_from_node(child, source, exports);
    }
}

fn parse_export_statement(node: Node, source: &str, exports: &mut Vec<ExtractedExport>) {
    let line = node.start_position().row + 1;
    let mut export_source: Option<String> = None;
    
    // Check for re-export source
    if let Some(source_node) = node.child_by_field_name("source") {
        if let Ok(text) = source_node.utf8_text(source.as_bytes()) {
            export_source = Some(text.trim_matches(|c| c == '"' || c == '\'').to_string());
        }
    }
    
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        match child.kind() {
            // Named exports: export { foo, bar }
            "export_clause" => {
                let mut inner_cursor = child.walk();
                for inner in child.children(&mut inner_cursor) {
                    if inner.kind() == "export_specifier" {
                        // Get the local name (what's being exported)
                        if let Some(name_node) = inner.child_by_field_name("name") {
                            if let Ok(name) = name_node.utf8_text(source.as_bytes()) {
                                exports.push(ExtractedExport {
                                    name: name.to_string(),
                                    is_reexport: export_source.is_some(),
                                    source: export_source.clone(),
                                    line,
                                });
                            }
                        } else {
                            // No alias, get first identifier
                            let mut spec_cursor = inner.walk();
                            for spec_child in inner.children(&mut spec_cursor) {
                                if spec_child.kind() == "identifier" {
                                    if let Ok(name) = spec_child.utf8_text(source.as_bytes()) {
                                        exports.push(ExtractedExport {
                                            name: name.to_string(),
                                            is_reexport: export_source.is_some(),
                                            source: export_source.clone(),
                                            line,
                                        });
                                    }
                                    break;
                                }
                            }
                        }
                    }
                }
            }
            // export function foo() {}
            "function_declaration" | "generator_function_declaration" => {
                if let Some(name_node) = child.child_by_field_name("name") {
                    if let Ok(name) = name_node.utf8_text(source.as_bytes()) {
                        exports.push(ExtractedExport {
                            name: name.to_string(),
                            is_reexport: false,
                            source: None,
                            line,
                        });
                    }
                }
            }
            // export const foo = ...
            "lexical_declaration" => {
                let mut decl_cursor = child.walk();
                for decl_child in child.children(&mut decl_cursor) {
                    if decl_child.kind() == "variable_declarator" {
                        if let Some(name_node) = decl_child.child_by_field_name("name") {
                            if let Ok(name) = name_node.utf8_text(source.as_bytes()) {
                                exports.push(ExtractedExport {
                                    name: name.to_string(),
                                    is_reexport: false,
                                    source: None,
                                    line,
                                });
                            }
                        }
                    }
                }
            }
            // export class Foo {}
            "class_declaration" => {
                if let Some(name_node) = child.child_by_field_name("name") {
                    if let Ok(name) = name_node.utf8_text(source.as_bytes()) {
                        exports.push(ExtractedExport {
                            name: name.to_string(),
                            is_reexport: false,
                            source: None,
                            line,
                        });
                    }
                }
            }
            // export interface Foo {} (TypeScript)
            "interface_declaration" => {
                if let Some(name_node) = child.child_by_field_name("name") {
                    if let Ok(name) = name_node.utf8_text(source.as_bytes()) {
                        exports.push(ExtractedExport {
                            name: name.to_string(),
                            is_reexport: false,
                            source: None,
                            line,
                        });
                    }
                }
            }
            // export type Foo = ... (TypeScript)
            "type_alias_declaration" => {
                if let Some(name_node) = child.child_by_field_name("name") {
                    if let Ok(name) = name_node.utf8_text(source.as_bytes()) {
                        exports.push(ExtractedExport {
                            name: name.to_string(),
                            is_reexport: false,
                            source: None,
                            line,
                        });
                    }
                }
            }
            // export enum Foo {} (TypeScript)
            "enum_declaration" => {
                if let Some(name_node) = child.child_by_field_name("name") {
                    if let Ok(name) = name_node.utf8_text(source.as_bytes()) {
                        exports.push(ExtractedExport {
                            name: name.to_string(),
                            is_reexport: false,
                            source: None,
                            line,
                        });
                    }
                }
            }
            _ => {}
        }
    }
}

/// Check if a file imports a specific symbol from a specific source path pattern
pub fn file_imports_symbol_from(path: &Path, symbol: &str, source_pattern: &str) -> bool {
    let imports = match extract_imports(path) {
        Ok(i) => i,
        Err(_) => return false,
    };
    
    for import in imports {
        // Check if source matches pattern (handles ./core, ../core, etc.)
        let source_end = import.source.rsplit('/').next().unwrap_or(&import.source);
        let source_end = source_end
            .trim_end_matches(".js")
            .trim_end_matches(".ts")
            .trim_end_matches("/index");
        
        if source_end == source_pattern || import.source.ends_with(&format!("/{}", source_pattern)) {
            if import.symbols.contains(&symbol.to_string()) {
                return true;
            }
        }
    }
    
    false
}

/// Check if a file re-exports from a specific module
pub fn file_reexports_from(path: &Path, module_stem: &str) -> bool {
    let exports = match extract_exports(path) {
        Ok(e) => e,
        Err(_) => return false,
    };
    
    for export in exports {
        if export.is_reexport {
            if let Some(source) = &export.source {
                let source_stem = source
                    .trim_start_matches("./")
                    .trim_end_matches(".js")
                    .trim_end_matches(".ts");
                
                if source_stem == module_stem {
                    return true;
                }
            }
        }
    }
    
    false
}

/// Get all symbols re-exported from a specific module
pub fn get_reexported_symbols(path: &Path, module_stem: &str) -> Vec<String> {
    let exports = match extract_exports(path) {
        Ok(e) => e,
        Err(_) => return Vec::new(),
    };
    
    let mut symbols = Vec::new();
    for export in exports {
        if export.is_reexport {
            if let Some(source) = &export.source {
                let source_stem = source
                    .trim_start_matches("./")
                    .trim_end_matches(".js")
                    .trim_end_matches(".ts");
                
                if source_stem == module_stem {
                    symbols.push(export.name);
                }
            }
        }
    }
    
    symbols
}

/// Extract Svelte action directives from a Svelte file's template markup.
///
/// Svelte actions are bound via `use:actionName` or `use:actionName={options}` in templates.
/// These create runtime connections to imported action functions that import-graph analysis
/// cannot detect because they live in the HTML template, not the `<script>` block.
///
/// Returns the list of action names referenced via `use:` directives.
pub fn extract_svelte_action_directives(path: &Path) -> Result<Vec<String>, String> {
    let source = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
    if ext != "svelte" {
        return Ok(Vec::new());
    }

    Ok(extract_use_directives_from_source(&source))
}

/// Extract action names from `use:` directives in Svelte source.
///
/// Patterns matched:
/// - `use:actionName`
/// - `use:actionName={options}`
/// - `use:actionName|transition`
///
/// Excludes built-in Svelte directives: `use:` is always user-defined,
/// but we skip common false positives from template comments.
pub(crate) fn extract_use_directives_from_source(source: &str) -> Vec<String> {
    let mut actions = Vec::new();
    let mut seen = std::collections::HashSet::new();

    for line in source.lines() {
        let trimmed = line.trim();

        // Skip lines inside <script> tags (those are handled by import parsing)
        // We want the template portion only. A simple heuristic: skip lines
        // that look like JS statements. More robust: track script tag state.
        // For now, we scan all lines — `use:` in script blocks is syntactically
        // invalid anyway, so matches will only come from template markup.

        // Find all occurrences of `use:` on this line
        let mut search_start = 0;
        while let Some(pos) = trimmed[search_start..].find("use:") {
            let abs_pos = search_start + pos;

            // Verify this isn't inside a string literal or comment
            // Quick check: if preceded by `//` or `/*` on this line, skip
            let before = &trimmed[..abs_pos];
            if before.contains("//") || before.contains("/*") {
                search_start = abs_pos + 4;
                continue;
            }

            // Extract the action name: starts after "use:", ends at whitespace,
            // `=`, `|`, `}`, or end of token
            let after = &trimmed[abs_pos + 4..];
            let name_end = after.find(|c: char| {
                c == '=' || c == '|' || c == '}' || c == ' ' || c == '\t'
                    || c == '\n' || c == '\r' || c == '/' || c == '>'
            }).unwrap_or(after.len());

            let action_name = &after[..name_end];

            // Validate: action names must be valid JS identifiers
            if !action_name.is_empty()
                && action_name.chars().next().map_or(false, |c| c.is_alphabetic() || c == '_' || c == '$')
                && action_name.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '$')
            {
                if seen.insert(action_name.to_string()) {
                    actions.push(action_name.to_string());
                }
            }

            search_start = abs_pos + 4 + name_end;
        }
    }

    actions
}

/// Extract Svelte store subscriptions from a Svelte file's template markup.
///
/// Svelte auto-subscribes to stores when referenced with the `$` prefix in templates:
/// `{$toast}`, `{$wizardState.step}`, `bind:value={$count}`, etc.
///
/// These create runtime connections to imported store variables that import-graph
/// analysis cannot detect because the `$` subscription syntax is compiled away
/// by the Svelte compiler.
///
/// Returns the list of store variable names (without the `$` prefix).
pub fn extract_svelte_store_subscriptions(path: &Path) -> Result<Vec<String>, String> {
    let source = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
    if ext != "svelte" {
        return Ok(Vec::new());
    }

    Ok(extract_store_subscriptions_from_source(&source))
}

/// Extract store names from `$storeName` patterns in Svelte source.
///
/// Patterns matched:
/// - `{$storeName}` — interpolation
/// - `{$storeName.prop}` — property access
/// - `bind:value={$store}` — bindings
/// - `class:active={$isActive}` — class directives
/// - `if ($store)` — conditionals (inside `{#if ...}`)
///
/// Excludes:
/// - `$app` (SvelteKit internal)
/// - `$page` (SvelteKit internal)
/// - `$navigating` (SvelteKit internal)
/// - `$enhanced` (SvelteKit internal)
/// - Names inside `<script>` blocks (those are declaration sites, not subscriptions)
pub(crate) fn extract_store_subscriptions_from_source(source: &str) -> Vec<String> {
    let mut stores = Vec::new();
    let mut seen = std::collections::HashSet::new();

    // SvelteKit built-in stores to exclude
    let builtins: std::collections::HashSet<&str> = [
        "app", "page", "navigating", "enhanced", "headlessState",
    ].iter().copied().collect();

    // Track whether we're inside a <script> block to skip declarations
    let mut in_script = false;

    for line in source.lines() {
        let trimmed = line.trim();

        // Simple script block tracking
        if trimmed.contains("<script") {
            in_script = true;
            continue;
        }
        if trimmed.contains("</script>") {
            in_script = false;
            continue;
        }

        // Skip script block internals — $store references there are
        // declaration/assignment sites, not auto-subscriptions
        if in_script {
            continue;
        }

        // Skip comments
        if trimmed.starts_with("//") || trimmed.starts_with("/*") || trimmed.starts_with("*") {
            continue;
        }

        // Find all `$identifier` patterns
        let mut search_start = 0;
        while let Some(pos) = trimmed[search_start..].find('$') {
            let abs_pos = search_start + pos;

            // Check that this `$` starts a store subscription (not inside a string)
            // Quick heuristic: if preceded by a backslash, skip (escaped)
            if abs_pos > 0 && trimmed.as_bytes()[abs_pos - 1] == b'\\' {
                search_start = abs_pos + 1;
                continue;
            }

            // Extract identifier after `$`
            let after = &trimmed[abs_pos + 1..];
            let name_end = after.find(|c: char| {
                !c.is_alphanumeric() && c != '_' && c != '$'
            }).unwrap_or(after.len());

            let store_name = &after[..name_end];

            // Validate: must be a valid identifier, not a builtin, not empty
            if !store_name.is_empty()
                && store_name.chars().next().map_or(false, |c| c.is_alphabetic() || c == '_')
                && store_name.chars().all(|c| c.is_alphanumeric() || c == '_')
                && !builtins.contains(store_name)
            {
                if seen.insert(store_name.to_string()) {
                    stores.push(store_name.to_string());
                }
            }

            search_start = abs_pos + 1 + name_end;
        }
    }

    stores
}

/// Resolve a SvelteKit `$lib` path alias to a concrete path relative to the package src directory.
///
/// SvelteKit convention: `$lib` maps to `<package>/src/lib/`.
/// Given a package root (directory containing `package.json`) and an import source
/// like `$lib/utils/toast`, returns the resolved path: `<root>/src/lib/utils/toast`.
///
/// Returns `None` if the import doesn't use `$lib` or the package root can't be determined.
pub fn resolve_sveltekit_lib_alias(import_source: &str, package_root: &Path) -> Option<PathBuf> {
    let stripped = import_source.strip_prefix("$lib/")?;
    Some(package_root.join("src").join("lib").join(stripped))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;
    use std::io::Write;
    use tempfile::tempdir;
    
    #[test]
    fn test_extract_simple_import() {
        let dir = tempdir().unwrap();
        let file = dir.path().join("test.ts");
        
        let mut f = File::create(&file).unwrap();
        writeln!(f, "import {{ foo, bar }} from './utils';").unwrap();
        
        let imports = extract_imports(&file).unwrap();
        assert_eq!(imports.len(), 1);
        assert!(imports[0].symbols.contains(&"foo".to_string()));
        assert!(imports[0].symbols.contains(&"bar".to_string()));
        assert_eq!(imports[0].source, "./utils");
    }
    
    #[test]
    fn test_extract_multiline_import() {
        let dir = tempdir().unwrap();
        let file = dir.path().join("test.ts");
        
        let mut f = File::create(&file).unwrap();
        writeln!(f, "import {{").unwrap();
        writeln!(f, "    foo,").unwrap();
        writeln!(f, "    bar,").unwrap();
        writeln!(f, "    baz").unwrap();
        writeln!(f, "}} from '../core/index.js';").unwrap();
        
        let imports = extract_imports(&file).unwrap();
        assert_eq!(imports.len(), 1);
        assert!(imports[0].symbols.contains(&"foo".to_string()));
        assert!(imports[0].symbols.contains(&"bar".to_string()));
        assert!(imports[0].symbols.contains(&"baz".to_string()));
        assert_eq!(imports[0].source, "../core/index.js");
    }
    
    #[test]
    fn test_extract_reexport() {
        let dir = tempdir().unwrap();
        let file = dir.path().join("index.ts");
        
        let mut f = File::create(&file).unwrap();
        writeln!(f, "export {{ foo, bar }} from './utils.js';").unwrap();
        
        let exports = extract_exports(&file).unwrap();
        assert_eq!(exports.len(), 2);
        assert!(exports.iter().any(|e| e.name == "foo" && e.is_reexport));
        assert!(exports.iter().any(|e| e.name == "bar" && e.is_reexport));
    }
    
    #[test]
    fn test_extract_function_export() {
        let dir = tempdir().unwrap();
        let file = dir.path().join("utils.ts");
        
        let mut f = File::create(&file).unwrap();
        writeln!(f, "export function validateEmail(email: string) {{").unwrap();
        writeln!(f, "    return email.includes('@');").unwrap();
        writeln!(f, "}}").unwrap();
        
        let exports = extract_exports(&file).unwrap();
        assert_eq!(exports.len(), 1);
        assert_eq!(exports[0].name, "validateEmail");
        assert!(!exports[0].is_reexport);
    }
    
    #[test]
    fn test_extract_svelte_script() {
        let source = r#"<script lang="ts">
import { foo, bar } from '$lib/utils';

let count = 0;
</script>

<div>Hello {count}</div>"#;
        
        let script = super::extract_svelte_script(source).unwrap();
        assert!(script.contains("import { foo, bar }"));
        assert!(script.contains("let count = 0"));
        assert!(!script.contains("<div>"));
    }
    
    #[test]
    fn test_extract_svelte_multiple_scripts() {
        // Svelte files can have both <script> and <script context="module">
        let source = r#"<script context="module">
export const prerender = true;
</script>

<script lang="ts">
import { onMount } from 'svelte';
let ready = false;
</script>

<div>Content</div>"#;
        
        let script = super::extract_svelte_script(source).unwrap();
        assert!(script.contains("export const prerender"));
        assert!(script.contains("import { onMount }"));
    }

    #[test]
    fn test_extract_svelte_exports_excludes_instance_api() {
        let dir = tempdir().unwrap();
        let file = dir.path().join("Component.svelte");

        File::create(&file)
            .unwrap()
            .write_all(br#"<script context="module" lang="ts">
export const moduleValue = 'ground';
</script>

<script lang="ts">
export let title: string;
export function focus() {}
</script>

<h1>{title}</h1>
"#)
            .unwrap();

        let exports = extract_exports(&file).unwrap();
        let names: Vec<&str> = exports.iter().map(|export| export.name.as_str()).collect();
        assert_eq!(names, vec!["moduleValue"]);
        assert_eq!(exports[0].line, 2);
    }

    #[test]
    fn test_extract_svelte_five_module_attribute_export() {
        let dir = tempdir().unwrap();
        let file = dir.path().join("Component.svelte");

        File::create(&file)
            .unwrap()
            .write_all(br#"<script module>
export const moduleValue = 'ground';
</script>

<p>Ground</p>
"#)
            .unwrap();

        let exports = extract_exports(&file).unwrap();
        assert_eq!(exports.len(), 1);
        assert_eq!(exports[0].name, "moduleValue");
        assert_eq!(exports[0].line, 2);
    }
    
    #[test]
    fn test_extract_svelte_imports() {
        let dir = tempdir().unwrap();
        let file = dir.path().join("Component.svelte");
        
        let mut f = File::create(&file).unwrap();
        writeln!(f, r#"<script lang="ts">"#).unwrap();
        writeln!(f, "import {{ foo, bar }} from '$lib/utils';").unwrap();
        writeln!(f, "import {{ validateEmail }} from '../validation';").unwrap();
        writeln!(f, "let name = '';").unwrap();
        writeln!(f, "</script>").unwrap();
        writeln!(f, "").unwrap();
        writeln!(f, "<div>Hello</div>").unwrap();
        
        let imports = extract_imports(&file).unwrap();
        assert_eq!(imports.len(), 2);
        assert!(imports[0].symbols.contains(&"foo".to_string()));
        assert!(imports[0].symbols.contains(&"bar".to_string()));
        assert!(imports[1].symbols.contains(&"validateEmail".to_string()));
    }
    
    #[test]
    fn test_extract_svelte_no_script() {
        let dir = tempdir().unwrap();
        let file = dir.path().join("Static.svelte");
        
        let mut f = File::create(&file).unwrap();
        writeln!(f, "<div>Just static content</div>").unwrap();
        
        // Should return an error for Svelte files without script
        let result = extract_imports(&file);
        assert!(result.is_err());
    }

    #[test]
    fn test_extract_svelte_use_directives() {
        let dir = tempdir().unwrap();
        let file = dir.path().join("Page.svelte");

        let mut f = File::create(&file).unwrap();
        writeln!(f, r#"<script lang="ts">"#).unwrap();
        writeln!(f, "import {{ inview }} from '$lib/actions/inview';").unwrap();
        writeln!(f, "import {{ parallax }} from '$lib/actions/parallax';").unwrap();
        writeln!(f, "</script>").unwrap();
        writeln!(f, "").unwrap();
        writeln!(f, r#"<div use:inview={{ threshold: 0.5 }}>"#).unwrap();
        writeln!(f, r#"  <span use:parallax={{ speed: 0.3 }}>Text</span>"#).unwrap();
        writeln!(f, "</div>").unwrap();

        let actions = extract_svelte_action_directives(&file).unwrap();
        assert!(actions.contains(&"inview".to_string()), "Should detect use:inview");
        assert!(actions.contains(&"parallax".to_string()), "Should detect use:parallax");
        assert_eq!(actions.len(), 2);
    }

    #[test]
    fn test_extract_svelte_use_directive_bare() {
        // use:action without options
        let dir = tempdir().unwrap();
        let file = dir.path().join("Page.svelte");

        let mut f = File::create(&file).unwrap();
        writeln!(f, "<script lang=\"ts\">").unwrap();
        writeln!(f, "import {{ myAction }} from './actions';").unwrap();
        writeln!(f, "</script>").unwrap();
        writeln!(f, "").unwrap();
        writeln!(f, "<button use:myAction>Click</button>").unwrap();

        let actions = extract_svelte_action_directives(&file).unwrap();
        assert!(actions.contains(&"myAction".to_string()));
        assert_eq!(actions.len(), 1);
    }

    #[test]
    fn test_extract_svelte_store_subscriptions() {
        let dir = tempdir().unwrap();
        let file = dir.path().join("Dashboard.svelte");

        let mut f = File::create(&file).unwrap();
        writeln!(f, r#"<script lang="ts">"#).unwrap();
        writeln!(f, "import {{ toast }} from '$lib/stores/toast';").unwrap();
        writeln!(f, "import {{ wizardState }} from '$lib/stores/wizardState';").unwrap();
        writeln!(f, "</script>").unwrap();
        writeln!(f, "").unwrap();
        writeln!(f, r#"<div class:visible={{$toast.visible}}>"#).unwrap();
        writeln!(f, "  <p>Step: {{$wizardState.step}}</p>").unwrap();
        writeln!(f, "  <p>Message: {{$toast.message}}</p>").unwrap();
        writeln!(f, "</div>").unwrap();

        let stores = extract_svelte_store_subscriptions(&file).unwrap();
        assert!(stores.contains(&"toast".to_string()), "Should detect $toast subscription");
        assert!(stores.contains(&"wizardState".to_string()), "Should detect $wizardState subscription");
        assert_eq!(stores.len(), 2, "Should deduplicate repeated $toast references");
    }

    #[test]
    fn test_extract_svelte_store_excludes_builtins() {
        let dir = tempdir().unwrap();
        let file = dir.path().join("Page.svelte");

        let mut f = File::create(&file).unwrap();
        writeln!(f, "<script lang=\"ts\">").unwrap();
        writeln!(f, "import {{ page }} from '$app/stores';").unwrap();
        writeln!(f, "import {{ myStore }} from '$lib/stores/mine';").unwrap();
        writeln!(f, "</script>").unwrap();
        writeln!(f, "").unwrap();
        writeln!(f, "<p>Route: {{$page.url.pathname}}</p>").unwrap();
        writeln!(f, "<p>Value: {{$myStore}}</p>").unwrap();

        let stores = extract_svelte_store_subscriptions(&file).unwrap();
        // $page is a SvelteKit builtin — should be excluded
        assert!(!stores.contains(&"page".to_string()), "Should exclude $page builtin");
        // $myStore is user-defined — should be included
        assert!(stores.contains(&"myStore".to_string()), "Should include $myStore");
    }

    #[test]
    fn test_extract_svelte_store_skips_script_block() {
        let dir = tempdir().unwrap();
        let file = dir.path().join("Page.svelte");

        let mut f = File::create(&file).unwrap();
        writeln!(f, "<script lang=\"ts\">").unwrap();
        writeln!(f, "import {{ count }} from './stores';").unwrap();
        // This $count in script is a declaration site, not a template subscription
        writeln!(f, "const doubled = $count * 2;").unwrap();
        writeln!(f, "</script>").unwrap();
        writeln!(f, "").unwrap();
        // This $count in template IS a subscription
        writeln!(f, "<p>{{$count}}</p>").unwrap();

        let stores = extract_svelte_store_subscriptions(&file).unwrap();
        // Should find $count from template, not from script block
        assert!(stores.contains(&"count".to_string()));
        assert_eq!(stores.len(), 1, "Should find count exactly once (from template)");
    }

    #[test]
    fn test_resolve_sveltekit_lib_alias() {
        let root = std::path::PathBuf::from("/project");

        // Standard $lib resolution
        let resolved = resolve_sveltekit_lib_alias("$lib/utils/toast", &root);
        assert_eq!(resolved, Some(std::path::PathBuf::from("/project/src/lib/utils/toast")));

        // Nested path
        let resolved = resolve_sveltekit_lib_alias("$lib/stores/wizardState", &root);
        assert_eq!(resolved, Some(std::path::PathBuf::from("/project/src/lib/stores/wizardState")));

        // Non-$lib import returns None
        let resolved = resolve_sveltekit_lib_alias("./utils", &root);
        assert!(resolved.is_none());

        // Bare $lib (no subpath) returns None
        let resolved = resolve_sveltekit_lib_alias("$lib", &root);
        assert!(resolved.is_none());
    }

    #[test]
    fn test_extract_svelte_non_svelte_file_returns_empty() {
        let dir = tempdir().unwrap();
        let file = dir.path().join("utils.ts");

        let mut f = File::create(&file).unwrap();
        writeln!(f, "// use:something — this is just a comment").unwrap();
        writeln!(f, "const $toast = 'not a store';").unwrap();

        let actions = extract_svelte_action_directives(&file).unwrap();
        assert!(actions.is_empty(), "Non-svelte files should return no directives");

        let stores = extract_svelte_store_subscriptions(&file).unwrap();
        assert!(stores.is_empty(), "Non-svelte files should return no store subscriptions");
    }
}
