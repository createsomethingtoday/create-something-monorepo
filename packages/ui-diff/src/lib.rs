//! UI Diff - Full-stack AST diffing and rendering for animated UI previews
//!
//! Parses UI components (HTML, Svelte), extracts and scopes styles, renders HTML,
//! and produces animations for visual canvas display.

use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

mod parser;
mod differ;
mod operations;
mod style_extractor;
mod renderer;
mod animator;

pub use operations::{Operation, PropChange, NodeData};
pub use parser::{parse, Syntax};
pub use differ::diff_trees;
pub use style_extractor::{extract_styles, ExtractedStyles};
pub use renderer::{render, RenderedComponent};
pub use animator::{generate_animations, generate_animation_css, Animation};

/// Initialize panic hook for better WASM error messages
#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}

/// Diff two component strings and return operations as JSON
#[wasm_bindgen]
pub fn diff(before: &str, after: &str, syntax: &str) -> String {
    let syntax = match syntax {
        "svelte" => Syntax::Svelte,
        "html" => Syntax::Html,
        "react" | "jsx" | "tsx" => Syntax::React,
        _ => Syntax::Html,
    };
    
    let tree_before = parser::parse(before, syntax);
    let tree_after = parser::parse(after, syntax);
    
    let ops = differ::diff_trees(&tree_before, &tree_after);
    
    serde_json::to_string(&ops).unwrap_or_else(|_| "[]".to_string())
}

/// Parse a component and return its AST as JSON
#[wasm_bindgen]
pub fn parse_component(source: &str, syntax: &str) -> String {
    let syntax = match syntax {
        "svelte" => Syntax::Svelte,
        "html" => Syntax::Html,
        "react" | "jsx" | "tsx" => Syntax::React,
        _ => Syntax::Html,
    };
    
    let tree = parser::parse(source, syntax);
    serde_json::to_string(&tree).unwrap_or_else(|_| "null".to_string())
}

/// Render result containing HTML, CSS, and animations
#[derive(Serialize)]
struct RenderResult {
    html: String,
    css: String,
    scope_id: String,
    animations: Vec<animator::Animation>,
    animation_css: String,
}

/// Render a component with styles and generate animations for changes
/// 
/// This is the main entry point for the visual canvas.
/// It parses the component, extracts styles, renders HTML, and if
/// a previous version is provided, generates animations for the diff.
#[wasm_bindgen]
pub fn render_component(source: &str, syntax: &str, previous: Option<String>) -> String {
    let syntax = match syntax {
        "svelte" => Syntax::Svelte,
        "html" => Syntax::Html,
        "react" | "jsx" | "tsx" => Syntax::React,
        _ => Syntax::Html,
    };
    
    // Parse the component
    let tree = parser::parse(source, syntax);
    
    // Extract and scope styles
    let styles = style_extractor::extract_styles(source);
    
    // Render to HTML
    let rendered = renderer::render(&tree, &styles);
    
    // Generate animations if we have a previous version
    let (animations, animation_css) = if let Some(prev_source) = previous {
        let prev_tree = parser::parse(&prev_source, syntax);
        let ops = differ::diff_trees(&prev_tree, &tree);
        let anims = animator::generate_animations(&ops);
        let anim_css = animator::generate_animation_css(&anims);
        (anims, anim_css)
    } else {
        (vec![], String::new())
    };
    
    let result = RenderResult {
        html: rendered.html,
        css: rendered.css,
        scope_id: rendered.scope_id,
        animations,
        animation_css,
    };
    
    serde_json::to_string(&result).unwrap_or_else(|_| r#"{"error":"serialization failed"}"#.to_string())
}

/// Extract styles from a component and return as JSON
#[wasm_bindgen]
pub fn extract_component_styles(source: &str) -> String {
    let styles = style_extractor::extract_styles(source);
    
    #[derive(Serialize)]
    struct StylesResult {
        css: String,
        scope_id: String,
    }
    
    let result = StylesResult {
        css: styles.css,
        scope_id: styles.scope_id,
    };
    
    serde_json::to_string(&result).unwrap_or_else(|_| r#"{"css":"","scope_id":""}"#.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_diff_empty() {
        let result = diff("", "", "html");
        assert_eq!(result, "[]");
    }
    
    #[test]
    fn test_diff_insert() {
        let before = "<div></div>";
        let after = "<div><span>Hello</span></div>";
        let result = diff(before, after, "html");
        assert!(result.contains("insert"));
    }
}
