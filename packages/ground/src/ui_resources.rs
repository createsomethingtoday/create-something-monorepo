//! UI Resources for Ground MCP Apps
//!
//! This module provides support for serving interactive UI components
//! via the MCP Apps extension (ui:// protocol).
//!
//! ## Available UIs
//!
//! - `ui://ground/duplicate-explorer` - Interactive duplicate function visualization

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// UI Resource definition for MCP Apps
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UiResource {
    /// The URI for this resource (e.g., "ui://ground/duplicate-explorer")
    pub uri: String,
    /// Human-readable name
    pub name: String,
    /// Description of what this UI does
    pub description: String,
    /// The bundled HTML content
    pub content: String,
    /// MIME type (always text/html for MCP Apps)
    pub mime_type: String,
}

/// Registry of available UI resources
pub struct UiRegistry {
    resources: HashMap<String, UiResource>,
}

impl Default for UiRegistry {
    fn default() -> Self {
        Self::new()
    }
}

impl UiRegistry {
    pub fn new() -> Self {
        let mut registry = Self {
            resources: HashMap::new(),
        };
        
        // Register built-in UI resources
        registry.register_builtin_resources();
        
        registry
    }
    
    fn register_builtin_resources(&mut self) {
        // Duplicate Explorer UI
        self.resources.insert(
            "ui://ground/duplicate-explorer".to_string(),
            UiResource {
                uri: "ui://ground/duplicate-explorer".to_string(),
                name: "Duplicate Explorer".to_string(),
                description: "Interactive visualization of duplicate functions with similarity scores and refactoring suggestions".to_string(),
                content: include_str!("../ui/duplicate-explorer/index.html").to_string(),
                mime_type: "text/html".to_string(),
            },
        );
    }
    
    /// List all available UI resources
    pub fn list(&self) -> Vec<&UiResource> {
        self.resources.values().collect()
    }
    
    /// Get a specific UI resource by URI
    pub fn get(&self, uri: &str) -> Option<&UiResource> {
        self.resources.get(uri)
    }
    
    /// Check if a URI is a valid UI resource
    #[allow(dead_code)]
    pub fn has(&self, uri: &str) -> bool {
        self.resources.contains_key(uri)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_ui_registry() {
        let registry = UiRegistry::new();
        
        // Check that duplicate explorer is registered
        assert!(registry.has("ui://ground/duplicate-explorer"));
        
        let resource = registry.get("ui://ground/duplicate-explorer").unwrap();
        assert_eq!(resource.name, "Duplicate Explorer");
        assert!(resource.content.contains("Ground Duplicate Explorer"));
    }
    
    #[test]
    fn test_ui_registry_list() {
        let registry = UiRegistry::new();
        let resources = registry.list();
        
        // Should have at least the duplicate explorer
        assert!(!resources.is_empty());
        assert!(resources.iter().any(|r| r.uri == "ui://ground/duplicate-explorer"));
    }
}
