//! HTML Renderer - Generate HTML from AST with scoped styles
//!
//! Converts NodeData AST to actual HTML strings with:
//! - Scoped class names from style_extractor
//! - data-node-id attributes for animation targeting
//! - Proper HTML escaping

use crate::operations::NodeData;
use crate::style_extractor::ExtractedStyles;

/// Rendered component output
#[derive(Debug, Clone)]
pub struct RenderedComponent {
    /// HTML ready for DOM insertion
    pub html: String,
    /// Scoped CSS to inject
    pub css: String,
    /// Scope ID used for classes
    pub scope_id: String,
}

/// Render AST to HTML with scoped styles
pub fn render(ast: &NodeData, styles: &ExtractedStyles) -> RenderedComponent {
    let html = render_node(ast, styles, true);
    
    RenderedComponent {
        html,
        css: styles.css.clone(),
        scope_id: styles.scope_id.clone(),
    }
}

/// Render a single node to HTML
fn render_node(node: &NodeData, styles: &ExtractedStyles, is_root: bool) -> String {
    match node.node_type {
        crate::operations::NodeType::Root => {
            // Render children only
            node.children
                .iter()
                .map(|child| render_node(child, styles, false))
                .collect::<Vec<_>>()
                .join("")
        }
        crate::operations::NodeType::Text => {
            // Text nodes render as escaped text
            if let Some(text) = &node.text {
                html_escape(text)
            } else {
                String::new()
            }
        }
        crate::operations::NodeType::Element => {
            render_element(node, styles)
        }
        crate::operations::NodeType::Component => {
            // Components render as a placeholder div
            let name = node.tag.as_deref().unwrap_or("Component");
            format!(
                "<div data-node-id=\"{}\" data-component=\"{}\" class=\"component-placeholder {}\">[{}]</div>",
                node.id,
                name,
                styles.scope_id,
                name
            )
        }
        crate::operations::NodeType::Fragment => {
            // Fragments render children wrapped in a container
            let children: String = node.children
                .iter()
                .map(|child| render_node(child, styles, false))
                .collect();
            format!(
                "<div data-node-id=\"{}\" class=\"fragment {}\">{}",
                node.id,
                styles.scope_id,
                children
            )
        }
    }
}

/// Render an element node to HTML
fn render_element(node: &NodeData, styles: &ExtractedStyles) -> String {
    let tag = node.tag.as_deref().unwrap_or("div");
    
    // Build attributes string
    let mut attrs = String::new();
    
    // Add data-node-id for animation targeting
    attrs.push_str(&format!(" data-node-id=\"{}\"", node.id));
    
    // Process attributes
    for (key, value) in &node.attrs {
        if key == "class" {
            // Scope class names
            let scoped_classes = scope_classes(value, styles);
            attrs.push_str(&format!(" class=\"{}\"", scoped_classes));
        } else {
            attrs.push_str(&format!(" {}=\"{}\"", key, html_escape_attr(value)));
        }
    }
    
    // Add scope class if no class attribute exists
    if !node.attrs.contains_key("class") && !styles.scope_id.is_empty() {
        attrs.push_str(&format!(" class=\"{}\"", styles.scope_id));
    }
    
    // Render children
    let children: String = node.children
        .iter()
        .map(|child| render_node(child, styles, false))
        .collect();
    
    // Self-closing tags
    if is_void_element(tag) {
        format!("<{}{} />", tag, attrs)
    } else {
        format!("<{}{}>{}</{}>", tag, attrs, children, tag)
    }
}

/// Scope class names in a class attribute value
fn scope_classes(classes: &str, styles: &ExtractedStyles) -> String {
    if styles.scope_id.is_empty() {
        return classes.to_string();
    }
    
    let mut result: Vec<String> = classes
        .split_whitespace()
        .map(|class| {
            // Add scope to each class
            format!("{} {}", class, styles.scope_id)
        })
        .collect();
    
    // Add scope ID as a class itself
    if !result.iter().any(|c| c.contains(&styles.scope_id)) {
        result.push(styles.scope_id.clone());
    }
    
    // Deduplicate
    let mut seen = std::collections::HashSet::new();
    result
        .into_iter()
        .flat_map(|s| s.split_whitespace().map(|s| s.to_string()).collect::<Vec<_>>())
        .filter(|s| seen.insert(s.clone()))
        .collect::<Vec<_>>()
        .join(" ")
}

/// Check if an element is a void (self-closing) element
fn is_void_element(tag: &str) -> bool {
    matches!(
        tag.to_lowercase().as_str(),
        "area" | "base" | "br" | "col" | "embed" | "hr" | "img" | "input" 
        | "link" | "meta" | "param" | "source" | "track" | "wbr"
    )
}

/// Escape HTML special characters in text content
fn html_escape(text: &str) -> String {
    text.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

/// Escape HTML special characters in attribute values
fn html_escape_attr(text: &str) -> String {
    text.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::operations::NodeType;
    use std::collections::HashMap;
    
    fn make_element(id: &str, tag: &str, classes: Option<&str>) -> NodeData {
        let mut attrs = HashMap::new();
        if let Some(c) = classes {
            attrs.insert("class".to_string(), c.to_string());
        }
        NodeData {
            id: id.to_string(),
            node_type: NodeType::Element,
            tag: Some(tag.to_string()),
            text: None,
            attrs,
            children: vec![],
        }
    }
    
    #[test]
    fn test_render_simple_element() {
        let node = make_element("node-0", "div", Some("test"));
        let styles = ExtractedStyles {
            css: ".test.s123 { color: red; }".to_string(),
            scope_id: "s123".to_string(),
            class_map: HashMap::new(),
        };
        
        let result = render(&node, &styles);
        
        assert!(result.html.contains("data-node-id=\"node-0\""));
        assert!(result.html.contains("s123"));
        assert!(result.html.contains("test"));
    }
    
    #[test]
    fn test_render_nested_elements() {
        let mut parent = make_element("node-0", "div", Some("parent"));
        let child = make_element("node-1", "span", Some("child"));
        parent.children.push(child);
        
        let styles = ExtractedStyles::default();
        let result = render(&parent, &styles);
        
        assert!(result.html.contains("<div"));
        assert!(result.html.contains("<span"));
        assert!(result.html.contains("</span>"));
        assert!(result.html.contains("</div>"));
    }
    
    #[test]
    fn test_render_void_element() {
        let node = make_element("node-0", "br", None);
        let styles = ExtractedStyles::default();
        let result = render(&node, &styles);
        
        assert!(result.html.contains("<br"));
        assert!(result.html.contains("/>"));
        assert!(!result.html.contains("</br>"));
    }
    
    #[test]
    fn test_render_text_escape() {
        let node = NodeData {
            id: "node-0".to_string(),
            node_type: NodeType::Text,
            tag: None,
            text: Some("<script>alert('xss')</script>".to_string()),
            attrs: HashMap::new(),
            children: vec![],
        };
        let styles = ExtractedStyles::default();
        let result = render(&node, &styles);
        
        assert!(!result.html.contains("<script>"));
        assert!(result.html.contains("&lt;script&gt;"));
    }
}
