//! Style Extractor - Extract and scope CSS from Svelte components
//!
//! Parses <style> blocks and generates scoped CSS with unique class suffixes.
//! This enables rendering components with isolated styles.

use std::collections::HashMap;

/// Extracted and scoped styles from a component
#[derive(Debug, Clone, Default)]
pub struct ExtractedStyles {
    /// Scoped CSS ready for injection
    pub css: String,
    /// Unique scope identifier (e.g., "svelte-x7f3k2")
    pub scope_id: String,
    /// Original class names mapped to scoped versions
    pub class_map: HashMap<String, String>,
}

/// Extract styles from a Svelte component source
pub fn extract_styles(source: &str) -> ExtractedStyles {
    // Find <style> block
    let style_content = extract_style_block(source);
    
    if style_content.is_empty() {
        return ExtractedStyles::default();
    }
    
    // Generate unique scope ID from content hash
    let scope_id = generate_scope_id(&style_content);
    
    // Parse and scope the CSS
    let (scoped_css, class_map) = scope_css(&style_content, &scope_id);
    
    ExtractedStyles {
        css: scoped_css,
        scope_id,
        class_map,
    }
}

/// Extract content between <style> tags
fn extract_style_block(source: &str) -> String {
    // Find opening <style> tag (with optional attributes)
    let start = source.find("<style");
    if start.is_none() {
        return String::new();
    }
    let start = start.unwrap();
    
    // Find the closing > of the opening tag
    let tag_end = source[start..].find('>');
    if tag_end.is_none() {
        return String::new();
    }
    let content_start = start + tag_end.unwrap() + 1;
    
    // Find </style>
    let end = source[content_start..].find("</style>");
    if end.is_none() {
        return String::new();
    }
    let content_end = content_start + end.unwrap();
    
    source[content_start..content_end].trim().to_string()
}

/// Generate a short hash-based scope ID
fn generate_scope_id(content: &str) -> String {
    // Simple hash using djb2 algorithm
    let mut hash: u32 = 5381;
    for byte in content.bytes() {
        hash = hash.wrapping_mul(33).wrapping_add(byte as u32);
    }
    
    // Convert to base36 for short ID
    format!("s{:x}", hash & 0xFFFFFF)
}

/// Scope CSS selectors by adding the scope ID
fn scope_css(css: &str, scope_id: &str) -> (String, HashMap<String, String>) {
    let mut class_map = HashMap::new();
    let mut scoped = String::new();
    
    // Simple CSS parser - handles basic selectors
    // For production, consider using a proper CSS parser
    let mut chars = css.chars().peekable();
    let mut in_selector = true;
    let mut current_selector = String::new();
    let mut brace_depth = 0;
    
    while let Some(c) = chars.next() {
        match c {
            '{' => {
                brace_depth += 1;
                if brace_depth == 1 && in_selector {
                    // Scope the selector
                    let scoped_selector = scope_selector(&current_selector, scope_id, &mut class_map);
                    scoped.push_str(&scoped_selector);
                    in_selector = false;
                }
                scoped.push(c);
                current_selector.clear();
            }
            '}' => {
                brace_depth -= 1;
                scoped.push(c);
                if brace_depth == 0 {
                    in_selector = true;
                }
            }
            _ => {
                if in_selector && brace_depth == 0 {
                    current_selector.push(c);
                } else {
                    scoped.push(c);
                }
            }
        }
    }
    
    (scoped, class_map)
}

/// Scope a single selector
fn scope_selector(selector: &str, scope_id: &str, class_map: &mut HashMap<String, String>) -> String {
    let selector = selector.trim();
    
    // Handle multiple selectors (comma-separated)
    if selector.contains(',') {
        return selector
            .split(',')
            .map(|s| scope_selector(s.trim(), scope_id, class_map))
            .collect::<Vec<_>>()
            .join(", ");
    }
    
    // Handle combinators by scoping each part
    let parts: Vec<&str> = selector.split_whitespace().collect();
    let scoped_parts: Vec<String> = parts
        .iter()
        .map(|part| scope_simple_selector(part, scope_id, class_map))
        .collect();
    
    scoped_parts.join(" ")
}

/// Scope a simple selector (no combinators)
fn scope_simple_selector(selector: &str, scope_id: &str, class_map: &mut HashMap<String, String>) -> String {
    // Don't scope keyframe names, :root, or :global
    if selector.starts_with('@') || selector == ":root" || selector.starts_with(":global") {
        return selector.to_string();
    }
    
    // Extract class names and scope them
    let mut result = String::new();
    let mut chars = selector.chars().peekable();
    let mut current_class = String::new();
    let mut in_class = false;
    
    while let Some(c) = chars.next() {
        if c == '.' {
            if in_class && !current_class.is_empty() {
                // End previous class
                let scoped_class = format!("{}.{}", current_class, scope_id);
                class_map.insert(current_class.clone(), scoped_class.clone());
                result.push('.');
                result.push_str(&scoped_class);
                current_class.clear();
            }
            in_class = true;
        } else if in_class {
            if c.is_alphanumeric() || c == '-' || c == '_' {
                current_class.push(c);
            } else {
                // End class
                if !current_class.is_empty() {
                    let scoped_class = format!("{}.{}", current_class, scope_id);
                    class_map.insert(current_class.clone(), scoped_class.clone());
                    result.push('.');
                    result.push_str(&scoped_class);
                    current_class.clear();
                }
                in_class = false;
                result.push(c);
            }
        } else {
            result.push(c);
        }
    }
    
    // Handle trailing class
    if in_class && !current_class.is_empty() {
        let scoped_class = format!("{}.{}", current_class, scope_id);
        class_map.insert(current_class.clone(), scoped_class.clone());
        result.push('.');
        result.push_str(&scoped_class);
    }
    
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_extract_style_block() {
        let source = r#"
            <script>let x = 1;</script>
            <div class="test">Hello</div>
            <style>
                .test { color: red; }
            </style>
        "#;
        let content = extract_style_block(source);
        assert!(content.contains(".test"));
        assert!(content.contains("color: red"));
    }
    
    #[test]
    fn test_scope_css() {
        let css = ".btn { background: blue; }";
        let (scoped, class_map) = scope_css(css, "s123");
        
        assert!(scoped.contains(".btn.s123"));
        assert!(class_map.contains_key("btn"));
    }
    
    #[test]
    fn test_multiple_selectors() {
        let css = ".a, .b { color: red; }";
        let (scoped, _) = scope_css(css, "s123");
        
        assert!(scoped.contains(".a.s123"));
        assert!(scoped.contains(".b.s123"));
    }
    
    #[test]
    fn test_descendant_selector() {
        let css = ".parent .child { color: red; }";
        let (scoped, _) = scope_css(css, "s123");
        
        assert!(scoped.contains(".parent.s123"));
        assert!(scoped.contains(".child.s123"));
    }
    
    #[test]
    fn test_extract_styles_full() {
        let source = r#"
            <style>
                .hero { display: flex; }
                .title { font-size: 2rem; }
            </style>
            <div class="hero">
                <h1 class="title">Hello</h1>
            </div>
        "#;
        
        let styles = extract_styles(source);
        
        assert!(!styles.scope_id.is_empty());
        assert!(styles.css.contains(&styles.scope_id));
        assert!(styles.class_map.contains_key("hero"));
        assert!(styles.class_map.contains_key("title"));
    }
}
