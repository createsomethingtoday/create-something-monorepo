//! UI Resources for MCP Apps
//!
//! This module provides support for serving interactive UI components
//! via the MCP Apps extension (ui:// protocol).
//!
//! ## Architecture
//!
//! UI resources are bundled HTML/JS files that render in the MCP client's
//! sandboxed iframe. They communicate with the MCP server via postMessage.
//!
//! ## Available UIs
//!
//! - `ui://loom/task-board` - Interactive Kanban-style task board
//! - `ui://loom/session-timeline` - Visual session recovery interface
//! - `ui://loom/analytics` - Real-time metrics dashboard

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// UI Resource definition for MCP Apps
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UiResource {
    /// The URI for this resource (e.g., "ui://loom/task-board")
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
        // Task Board UI
        self.resources.insert(
            "ui://loom/task-board".to_string(),
            UiResource {
                uri: "ui://loom/task-board".to_string(),
                name: "Task Board".to_string(),
                description: "Interactive Kanban-style task board with drag-and-drop support".to_string(),
                content: include_str!("../ui/task-board/index.html").to_string(),
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
        
        // Check that task board is registered
        assert!(registry.has("ui://loom/task-board"));
        
        let resource = registry.get("ui://loom/task-board").unwrap();
        assert_eq!(resource.name, "Task Board");
        assert!(resource.content.contains("Loom Task Board"));
    }
    
    #[test]
    fn test_ui_registry_list() {
        let registry = UiRegistry::new();
        let resources = registry.list();
        
        // Should have at least the task board
        assert!(!resources.is_empty());
        assert!(resources.iter().any(|r| r.uri == "ui://loom/task-board"));
    }
}
