//! AST-based Import Analysis
//!
//! Uses tree-sitter for robust import/export parsing instead of string manipulation.
//! Handles all edge cases: multi-line imports, re-exports, barrel files, etc.

use std::path::Path;
use std::fs;
use tree_sitter::{Parser, Node};

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

/// Extract all imports from a TypeScript/JavaScript file using tree-sitter
pub fn extract_imports(path: &Path) -> Result<Vec<ExtractedImport>, String> {
    let source = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read file: {}", e))?;
    
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
    
    let mut parser = Parser::new();
    let language = if ext == "ts" || ext == "tsx" {
        tree_sitter_typescript::LANGUAGE_TYPESCRIPT.into()
    } else {
        tree_sitter_javascript::LANGUAGE.into()
    };
    
    parser.set_language(&language)
        .map_err(|e| format!("Failed to set language: {}", e))?;
    
    let tree = parser.parse(&source, None)
        .ok_or_else(|| "Failed to parse file".to_string())?;
    
    let mut imports = Vec::new();
    extract_imports_from_node(tree.root_node(), &source, &mut imports);
    
    Ok(imports)
}

/// Extract all exports from a TypeScript/JavaScript file using tree-sitter
pub fn extract_exports(path: &Path) -> Result<Vec<ExtractedExport>, String> {
    let source = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read file: {}", e))?;
    
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
    
    let mut parser = Parser::new();
    let language = if ext == "ts" || ext == "tsx" {
        tree_sitter_typescript::LANGUAGE_TYPESCRIPT.into()
    } else {
        tree_sitter_javascript::LANGUAGE.into()
    };
    
    parser.set_language(&language)
        .map_err(|e| format!("Failed to set language: {}", e))?;
    
    let tree = parser.parse(&source, None)
        .ok_or_else(|| "Failed to parse file".to_string())?;
    
    let mut exports = Vec::new();
    extract_exports_from_node(tree.root_node(), &source, &mut exports);
    
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
}
