//! Parser module for HTML/Svelte/React components
//!
//! Converts source strings into a normalized AST (NodeData tree).

use crate::operations::{NodeData, NodeType};
use scraper::{Html, ElementRef};
use std::sync::atomic::{AtomicU64, Ordering};

/// Global counter for generating unique IDs
static ID_COUNTER: AtomicU64 = AtomicU64::new(0);

/// Reset ID counter (useful for deterministic tests)
pub fn reset_id_counter() {
    ID_COUNTER.store(0, Ordering::SeqCst);
}

/// Generate a unique node ID
fn next_id() -> String {
    let id = ID_COUNTER.fetch_add(1, Ordering::SeqCst);
    format!("node-{}", id)
}

/// Supported syntax types
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Syntax {
    Html,
    Svelte,
    React,
}

/// Parse source code into a NodeData tree
pub fn parse(source: &str, syntax: Syntax) -> NodeData {
    match syntax {
        Syntax::Html => parse_html(source),
        Syntax::Svelte => parse_svelte(source),
        Syntax::React => parse_react(source),
    }
}

/// Parse HTML into a NodeData tree
fn parse_html(source: &str) -> NodeData {
    let document = Html::parse_fragment(source);
    let mut root = NodeData::root();
    
    // Parse the root element
    let root_element = document.root_element();
    for child in root_element.children() {
        if let Some(element) = ElementRef::wrap(child) {
            root.children.push(parse_element(&element));
        } else if let Some(text) = child.value().as_text() {
            let content = text.trim();
            if !content.is_empty() {
                root.children.push(NodeData::text(next_id(), content));
            }
        }
    }
    
    root
}

/// Parse an element and its children recursively
fn parse_element(element: &ElementRef) -> NodeData {
    let tag = element.value().name().to_string();
    let mut data = NodeData::element(next_id(), &tag);
    
    // Copy attributes
    for attr in element.value().attrs() {
        data.attrs.insert(attr.0.to_string(), attr.1.to_string());
    }
    
    // Parse children
    for child in element.children() {
        if let Some(child_element) = ElementRef::wrap(child) {
            data.children.push(parse_element(&child_element));
        } else if let Some(text) = child.value().as_text() {
            let content = text.trim();
            if !content.is_empty() {
                data.children.push(NodeData::text(next_id(), content));
            }
        }
    }
    
    data
}

/// Parse Svelte component into a NodeData tree
/// 
/// Extracts the template portion (HTML-like content),
/// removes <script> and <style> blocks, and cleans up Svelte syntax.
fn parse_svelte(source: &str) -> NodeData {
    let mut template = source.to_string();
    
    // Remove <script>...</script> blocks
    while let Some(start) = template.find("<script") {
        if let Some(end) = template[start..].find("</script>") {
            template = format!(
                "{}{}",
                &template[..start],
                &template[start + end + 9..]
            );
        } else {
            break;
        }
    }
    
    // Remove <style>...</style> blocks
    while let Some(start) = template.find("<style") {
        if let Some(end) = template[start..].find("</style>") {
            template = format!(
                "{}{}",
                &template[..start],
                &template[start + end + 8..]
            );
        } else {
            break;
        }
    }
    
    // Clean up Svelte-specific syntax
    template = clean_svelte_syntax(&template);
    
    // Parse the remaining template as HTML
    parse_html(&template)
}

/// Clean Svelte template syntax for static rendering
fn clean_svelte_syntax(source: &str) -> String {
    let mut result = source.to_string();
    
    // Remove {#if ...} ... {/if} blocks - keep the first branch content
    result = remove_if_blocks(&result);
    
    // Remove {#each ...} ... {/each} blocks - show placeholder
    result = remove_each_blocks(&result);
    
    // Remove {@html ...} - show placeholder
    result = remove_html_blocks(&result);
    
    // Remove {@render ...} - show placeholder  
    result = remove_render_blocks(&result);
    
    // Replace simple expressions {variable} with placeholder text
    result = replace_expressions(&result);
    
    result
}

/// Remove {#if} blocks, keeping the first branch
fn remove_if_blocks(source: &str) -> String {
    let mut result = source.to_string();
    
    // Repeatedly process until no more {#if} found
    while let Some(start) = result.find("{#if") {
        // Find the matching {/if}
        let mut depth = 1;
        let mut pos = start + 4;
        let mut first_else_pos = None;
        
        while pos < result.len() && depth > 0 {
            if result[pos..].starts_with("{#if") {
                depth += 1;
                pos += 4;
            } else if (result[pos..].starts_with("{:else}") || result[pos..].starts_with("{:else ") || result[pos..].starts_with("{:else if")) && depth == 1 {
                if first_else_pos.is_none() {
                    first_else_pos = Some(pos);
                }
                // Skip to end of this tag
                if let Some(end) = result[pos..].find('}') {
                    pos += end + 1;
                } else {
                    pos += 1;
                }
            } else if result[pos..].starts_with("{/if}") {
                depth -= 1;
                if depth == 0 {
                    // Found matching end
                    let content_start = result[start..].find('}').map(|i| start + i + 1).unwrap_or(start);
                    let content_end = first_else_pos.unwrap_or(pos);
                    let content = &result[content_start..content_end];
                    result = format!(
                        "{}{}{}",
                        &result[..start],
                        content.trim(),
                        &result[pos + 5..]
                    );
                    break;
                }
                pos += 5;
            } else {
                pos += 1;
            }
        }
        
        // Safety: if we couldn't find matching end, remove just the {#if ...}
        if depth > 0 {
            if let Some(end) = result[start..].find('}') {
                result = format!("{}{}", &result[..start], &result[start + end + 1..]);
            } else {
                break;
            }
        }
    }
    
    // Also clean any remaining {:else...} tags that might be orphaned
    while let Some(start) = result.find("{:else") {
        if let Some(end) = result[start..].find('}') {
            result = format!("{}{}", &result[..start], &result[start + end + 1..]);
        } else {
            break;
        }
    }
    
    result
}

/// Remove {#each} blocks, replacing with placeholder
fn remove_each_blocks(source: &str) -> String {
    let mut result = source.to_string();
    
    while let Some(start) = result.find("{#each") {
        // Find the end of the opening tag first
        let tag_end = result[start..].find('}').map(|i| start + i + 1);
        
        if let Some(end) = find_matching_block_end(&result[start..], "{#each", "{/each}") {
            // Extract what's between {#each ...} and {/each}
            let content_start = tag_end.unwrap_or(start);
            let content = &result[content_start..start + end];
            
            // Show a cleaner placeholder with one sample of inner content structure
            let placeholder = if content.contains('<') {
                // Has HTML structure, show simplified
                "<!-- list items -->"
            } else {
                "..."
            };
            
            result = format!(
                "{}{}{}",
                &result[..start],
                placeholder,
                &result[start + end + 8..]
            );
        } else {
            // Can't find matching end, just remove the opening tag
            if let Some(tag_end_offset) = result[start..].find('}') {
                result = format!("{}{}", &result[..start], &result[start + tag_end_offset + 1..]);
            } else {
                break;
            }
        }
    }
    
    // Also remove any orphaned {/each} tags
    result = result.replace("{/each}", "");
    
    result
}

/// Remove {@html ...} blocks
fn remove_html_blocks(source: &str) -> String {
    let mut result = source.to_string();
    
    while let Some(start) = result.find("{@html") {
        if let Some(end) = result[start..].find('}') {
            result = format!(
                "{}<!-- html content -->{}",
                &result[..start],
                &result[start + end + 1..]
            );
        } else {
            break;
        }
    }
    
    result
}

/// Remove {@render ...} blocks  
fn remove_render_blocks(source: &str) -> String {
    let mut result = source.to_string();
    
    while let Some(start) = result.find("{@render") {
        if let Some(end) = result[start..].find('}') {
            result = format!(
                "{}<!-- slot -->{}",
                &result[..start],
                &result[start + end + 1..]
            );
        } else {
            break;
        }
    }
    
    result
}

/// Replace {expression} with readable placeholder
fn replace_expressions(source: &str) -> String {
    let mut result = String::new();
    let mut chars = source.chars().peekable();
    
    while let Some(c) = chars.next() {
        if c == '{' && chars.peek() != Some(&'#') && chars.peek() != Some(&'/') && chars.peek() != Some(&':') && chars.peek() != Some(&'@') {
            // This is an expression {something}
            let mut expr = String::new();
            let mut depth = 1;
            
            while let Some(c) = chars.next() {
                if c == '{' {
                    depth += 1;
                    expr.push(c);
                } else if c == '}' {
                    depth -= 1;
                    if depth == 0 {
                        break;
                    }
                    expr.push(c);
                } else {
                    expr.push(c);
                }
            }
            
            // Convert expression to placeholder
            let placeholder = expression_to_placeholder(&expr);
            result.push_str(&placeholder);
        } else {
            result.push(c);
        }
    }
    
    result
}

/// Convert a Svelte expression to a readable placeholder
fn expression_to_placeholder(expr: &str) -> String {
    let expr = expr.trim();
    
    // Handle common patterns
    if expr.contains("||") {
        // Default value pattern: {foo || 'Default'}
        if let Some(default) = expr.split("||").nth(1) {
            let default = default.trim().trim_matches('\'').trim_matches('"');
            return default.to_string();
        }
    }
    
    if expr.contains("?") && expr.contains(":") {
        // Ternary: show first option
        if let Some(first) = expr.split('?').nth(1) {
            if let Some(value) = first.split(':').next() {
                let value = value.trim().trim_matches('\'').trim_matches('"');
                if !value.is_empty() && value.len() < 30 {
                    return value.to_string();
                }
            }
        }
    }
    
    // Simple variable name - make it readable
    let name = expr.split('.').last().unwrap_or(expr)
        .split('(').next().unwrap_or(expr)
        .trim();
    
    // Convert camelCase/snake_case to words
    if name.len() < 20 && name.chars().all(|c| c.is_alphanumeric() || c == '_') {
        // Capitalize first letter
        let mut chars = name.chars();
        if let Some(first) = chars.next() {
            return format!("{}{}", first.to_uppercase(), chars.collect::<String>());
        }
    }
    
    "...".to_string()
}

/// Find matching block end for nested blocks
fn find_matching_block_end(source: &str, open_tag: &str, close_tag: &str) -> Option<usize> {
    let mut depth = 0;
    let mut pos = 0;
    
    while pos < source.len() {
        if source[pos..].starts_with(open_tag) {
            depth += 1;
            pos += open_tag.len();
        } else if source[pos..].starts_with(close_tag) {
            depth -= 1;
            if depth == 0 {
                return Some(pos);
            }
            pos += close_tag.len();
        } else {
            pos += 1;
        }
    }
    
    None
}

/// Parse React/JSX component into a NodeData tree
///
/// This is a simplified parser that handles basic JSX structure.
/// For production use, consider using a proper JSX parser like swc.
fn parse_react(source: &str) -> NodeData {
    // For now, treat JSX as HTML-like
    // This won't handle expressions properly but works for basic structure
    
    // Try to extract the return statement's JSX
    let jsx = extract_jsx_return(source).unwrap_or(source);
    
    parse_html(jsx)
}

/// Extract JSX from a React component's return statement
fn extract_jsx_return(source: &str) -> Option<&str> {
    // Look for "return (" or "return <"
    let return_idx = source.find("return")?;
    let after_return = &source[return_idx + 6..];
    
    // Find the opening
    let trimmed = after_return.trim_start();
    if trimmed.starts_with('(') {
        // Find matching closing paren
        let start = source.len() - trimmed.len() + 1;
        let mut depth = 1;
        let mut end = start;
        
        for (i, c) in trimmed[1..].chars().enumerate() {
            match c {
                '(' => depth += 1,
                ')' => {
                    depth -= 1;
                    if depth == 0 {
                        end = start + i;
                        break;
                    }
                }
                _ => {}
            }
        }
        
        Some(&source[start..end])
    } else if trimmed.starts_with('<') {
        // Direct JSX without parens - find the end
        Some(trimmed)
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_parse_simple_html() {
        reset_id_counter();
        let html = "<div><span>Hello</span></div>";
        let tree = parse(html, Syntax::Html);
        
        assert_eq!(tree.node_type, NodeType::Root);
        assert_eq!(tree.children.len(), 1);
        
        let div = &tree.children[0];
        assert_eq!(div.tag, Some("div".to_string()));
    }
    
    #[test]
    fn test_parse_svelte_removes_script() {
        reset_id_counter();
        let svelte = r#"
            <script>
                let name = "World";
            </script>
            <h1>Hello</h1>
        "#;
        let tree = parse(svelte, Syntax::Svelte);
        
        // Should only have the h1, not the script
        assert!(tree.children.iter().all(|n| n.tag.as_deref() != Some("script")));
    }
}
