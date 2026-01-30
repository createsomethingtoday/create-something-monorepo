//! Notion Tools - High-performance data processing for Notion agents
//!
//! This crate provides:
//! - WebAssembly exports for hot-path operations in Cloudflare Workers
//! - MCP server for AI-accessible analysis tools

pub mod processors;

#[cfg(not(target_arch = "wasm32"))]
pub mod mcp;

use wasm_bindgen::prelude::*;

// Re-export processor functions for WASM
pub use processors::duplicates::find_duplicates_impl;
pub use processors::pages::simplify_pages_impl;
pub use processors::schema::format_schema_impl;

/// Initialize WASM module
#[wasm_bindgen(start)]
pub fn init() {
    // Initialization hook for WASM module
    // Add console_error_panic_hook if needed for debugging
}

/// Format a Notion database schema for LLM context.
///
/// Takes JSON string of database properties, returns formatted string.
#[wasm_bindgen]
pub fn format_schema(properties_json: &str) -> Result<String, JsValue> {
    format_schema_impl(properties_json).map_err(|e| JsValue::from_str(&e))
}

/// Simplify Notion page results for agent processing.
///
/// Extracts titles and key metadata from page objects.
#[wasm_bindgen]
pub fn simplify_pages(pages_json: &str) -> Result<String, JsValue> {
    simplify_pages_impl(pages_json).map_err(|e| JsValue::from_str(&e))
}

/// Find duplicate pages by title.
///
/// Returns JSON with page IDs to archive based on keep_strategy ("oldest" or "newest").
#[wasm_bindgen]
pub fn find_duplicates(pages_json: &str, keep_strategy: &str) -> Result<String, JsValue> {
    find_duplicates_impl(pages_json, keep_strategy).map_err(|e| JsValue::from_str(&e))
}

/// Estimate token count for text.
///
/// Fast approximation using byte-level heuristics.
#[wasm_bindgen]
pub fn estimate_tokens(text: &str) -> u32 {
    // Rough estimate: ~4 characters per token for English text
    // More accurate for mixed content
    let bytes = text.len();
    let chars = text.chars().count();
    
    // Use character count for ASCII-heavy, byte count for Unicode-heavy
    let estimate = if bytes == chars {
        chars / 4  // ASCII text
    } else {
        // Mixed content: average of byte and char estimates
        (bytes / 4 + chars / 3) / 2
    };
    
    estimate.max(1) as u32
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_estimate_tokens() {
        assert!(estimate_tokens("Hello, world!") > 0);
        assert!(estimate_tokens("") == 1); // Minimum 1
        
        // Longer text should have more tokens
        let short = estimate_tokens("Hi");
        let long = estimate_tokens("This is a much longer piece of text that should have more tokens");
        assert!(long > short);
    }
}
