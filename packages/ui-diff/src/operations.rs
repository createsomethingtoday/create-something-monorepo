//! Operation types for UI diffing
//!
//! These operations represent the minimal set of changes needed to transform
//! one UI tree into another. They're designed to map directly to animations
//! in a viewer (pulse in, fade out, slide to new position).

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// A single operation in the diff result
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum Operation {
    /// Insert a new node
    Insert {
        /// Parent node ID (or "root" for top-level)
        parent: String,
        /// The node data to insert
        node: NodeData,
        /// Position among siblings (0-indexed)
        index: usize,
        /// Animation hint for the viewer
        #[serde(skip_serializing_if = "Option::is_none")]
        animate: Option<AnimationHint>,
    },
    
    /// Update properties of an existing node
    Update {
        /// Target node ID
        target: String,
        /// List of property changes
        changes: Vec<PropChange>,
    },
    
    /// Delete a node
    Delete {
        /// Target node ID to remove
        target: String,
    },
    
    /// Move a node to a new parent/position
    Move {
        /// Node ID to move
        target: String,
        /// New parent ID
        new_parent: String,
        /// New position among siblings
        index: usize,
    },
}

/// A property change within an Update operation
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PropChange {
    /// Property name (e.g., "class", "style", "text")
    pub prop: String,
    /// Previous value (for debugging/visualization)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub from: Option<String>,
    /// New value
    pub to: String,
}

/// Hints for the viewer on how to animate this operation
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "kebab-case")]
pub enum AnimationHint {
    /// Scale and fade in from center
    ScaleFade,
    /// Slide in from a direction
    SlideIn { direction: Direction },
    /// Fade in only
    FadeIn,
    /// No animation (instant)
    None,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Direction {
    Top,
    Right,
    Bottom,
    Left,
}

/// Represents a node in the UI tree
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct NodeData {
    /// Unique ID for this node
    pub id: String,
    /// Node type (element tag, text, component)
    #[serde(rename = "type")]
    pub node_type: NodeType,
    /// Tag name for elements (e.g., "div", "button")
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tag: Option<String>,
    /// Text content for text nodes
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
    /// Attributes/props
    #[serde(default, skip_serializing_if = "HashMap::is_empty")]
    pub attrs: HashMap<String, String>,
    /// Child nodes
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub children: Vec<NodeData>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum NodeType {
    Element,
    Text,
    Component,
    Fragment,
    Root,
}

impl NodeData {
    /// Create a new element node
    pub fn element(id: impl Into<String>, tag: impl Into<String>) -> Self {
        Self {
            id: id.into(),
            node_type: NodeType::Element,
            tag: Some(tag.into()),
            text: None,
            attrs: HashMap::new(),
            children: Vec::new(),
        }
    }
    
    /// Create a new text node
    pub fn text(id: impl Into<String>, content: impl Into<String>) -> Self {
        Self {
            id: id.into(),
            node_type: NodeType::Text,
            tag: None,
            text: Some(content.into()),
            attrs: HashMap::new(),
            children: Vec::new(),
        }
    }
    
    /// Create a root node
    pub fn root() -> Self {
        Self {
            id: "root".to_string(),
            node_type: NodeType::Root,
            tag: None,
            text: None,
            attrs: HashMap::new(),
            children: Vec::new(),
        }
    }
    
    /// Add a child node
    pub fn with_child(mut self, child: NodeData) -> Self {
        self.children.push(child);
        self
    }
    
    /// Add an attribute
    pub fn with_attr(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.attrs.insert(key.into(), value.into());
        self
    }
}
