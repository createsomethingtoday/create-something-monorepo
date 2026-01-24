//! Animation Generator - Generate CSS keyframes from diff operations
//!
//! Converts operations (Insert, Update, Delete, Move) into CSS animations
//! that can be applied to elements via data-node-id selectors.

use crate::operations::Operation;
use serde::{Deserialize, Serialize};

/// A CSS animation to apply to an element
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Animation {
    /// CSS selector for the target element
    pub selector: String,
    /// Unique animation name
    pub name: String,
    /// CSS @keyframes definition
    pub keyframes: String,
    /// Duration in milliseconds
    pub duration_ms: u32,
    /// CSS easing function
    pub easing: String,
    /// CSS fill mode (forwards, backwards, both, none)
    pub fill_mode: String,
}

/// Timing constants aligned with Canon design system
mod timing {
    /// Subtle changes (100ms)
    pub const MICRO: u32 = 100;
    /// Standard operations (200ms)
    pub const STANDARD: u32 = 200;
    /// Complex changes (400ms)
    pub const COMPLEX: u32 = 400;
}

/// Generate animations from a list of operations
pub fn generate_animations(operations: &[Operation]) -> Vec<Animation> {
    operations
        .iter()
        .filter_map(|op| generate_animation(op))
        .collect()
}

/// Generate a single animation from an operation
fn generate_animation(operation: &Operation) -> Option<Animation> {
    match operation {
        Operation::Insert { node, .. } => {
            let name = format!("insert-{}", node.id);
            Some(Animation {
                selector: format!("[data-node-id=\"{}\"]", node.id),
                name: name.clone(),
                keyframes: format!(
                    r#"@keyframes {} {{
  from {{
    opacity: 0;
    transform: scale(0.95);
  }}
  to {{
    opacity: 1;
    transform: scale(1);
  }}
}}"#,
                    name
                ),
                duration_ms: timing::STANDARD,
                easing: "cubic-bezier(0, 0, 0.2, 1)".to_string(), // ease-out
                fill_mode: "forwards".to_string(),
            })
        }
        
        Operation::Update { target, changes } => {
            // Only animate if there are visible changes
            let has_visible_change = changes.iter().any(|c| {
                matches!(c.prop.as_str(), "class" | "style" | "text")
            });
            
            if !has_visible_change {
                return None;
            }
            
            let name = format!("update-{}", target);
            Some(Animation {
                selector: format!("[data-node-id=\"{}\"]", target),
                name: name.clone(),
                keyframes: format!(
                    r#"@keyframes {} {{
  0% {{
    box-shadow: 0 0 0 2px rgba(80, 130, 185, 0.8);
  }}
  100% {{
    box-shadow: 0 0 0 2px transparent;
  }}
}}"#,
                    name
                ),
                duration_ms: timing::COMPLEX,
                easing: "ease-out".to_string(),
                fill_mode: "forwards".to_string(),
            })
        }
        
        Operation::Delete { target } => {
            let name = format!("delete-{}", target);
            Some(Animation {
                selector: format!("[data-node-id=\"{}\"]", target),
                name: name.clone(),
                keyframes: format!(
                    r#"@keyframes {} {{
  from {{
    opacity: 1;
    transform: scale(1);
  }}
  to {{
    opacity: 0;
    transform: scale(0.95);
  }}
}}"#,
                    name
                ),
                duration_ms: timing::MICRO,
                easing: "cubic-bezier(0.4, 0, 1, 1)".to_string(), // ease-in
                fill_mode: "forwards".to_string(),
            })
        }
        
        Operation::Move { target, .. } => {
            // Move animations are trickier - they need FLIP
            // For now, use a simple fade transition
            let name = format!("move-{}", target);
            Some(Animation {
                selector: format!("[data-node-id=\"{}\"]", target),
                name: name.clone(),
                keyframes: format!(
                    r#"@keyframes {} {{
  0% {{
    opacity: 0.5;
    outline: 2px dashed rgba(80, 130, 185, 0.5);
    outline-offset: 2px;
  }}
  50% {{
    opacity: 1;
    outline: 2px dashed rgba(80, 130, 185, 0.8);
    outline-offset: 4px;
  }}
  100% {{
    opacity: 1;
    outline: 2px dashed transparent;
    outline-offset: 0px;
  }}
}}"#,
                    name
                ),
                duration_ms: timing::COMPLEX,
                easing: "ease-in-out".to_string(),
                fill_mode: "forwards".to_string(),
            })
        }
    }
}

/// Generate CSS for all animations
pub fn generate_animation_css(animations: &[Animation]) -> String {
    let mut css = String::new();
    
    // Keyframes
    for anim in animations {
        css.push_str(&anim.keyframes);
        css.push('\n');
    }
    
    // Animation applications
    for anim in animations {
        css.push_str(&format!(
            "{} {{ animation: {} {}ms {} {}; }}\n",
            anim.selector,
            anim.name,
            anim.duration_ms,
            anim.easing,
            anim.fill_mode
        ));
    }
    
    css
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::operations::{NodeData, NodeType, PropChange};
    use std::collections::HashMap;
    
    #[test]
    fn test_insert_animation() {
        let node = NodeData {
            id: "node-1".to_string(),
            node_type: NodeType::Element,
            tag: Some("div".to_string()),
            text: None,
            attrs: HashMap::new(),
            children: vec![],
        };
        
        let op = Operation::Insert {
            parent: "root".to_string(),
            node,
            index: 0,
            animate: None,
        };
        
        let anims = generate_animations(&[op]);
        assert_eq!(anims.len(), 1);
        
        let anim = &anims[0];
        assert!(anim.selector.contains("node-1"));
        assert!(anim.keyframes.contains("opacity: 0"));
        assert!(anim.keyframes.contains("scale(0.95)"));
        assert_eq!(anim.duration_ms, timing::STANDARD);
    }
    
    #[test]
    fn test_update_animation() {
        let op = Operation::Update {
            target: "node-1".to_string(),
            changes: vec![PropChange {
                prop: "class".to_string(),
                from: Some("old".to_string()),
                to: "new".to_string(),
            }],
        };
        
        let anims = generate_animations(&[op]);
        assert_eq!(anims.len(), 1);
        
        let anim = &anims[0];
        assert!(anim.keyframes.contains("box-shadow"));
        assert_eq!(anim.duration_ms, timing::COMPLEX);
    }
    
    #[test]
    fn test_delete_animation() {
        let op = Operation::Delete {
            target: "node-1".to_string(),
        };
        
        let anims = generate_animations(&[op]);
        assert_eq!(anims.len(), 1);
        
        let anim = &anims[0];
        assert!(anim.keyframes.contains("opacity: 0"));
        assert_eq!(anim.duration_ms, timing::MICRO);
    }
    
    #[test]
    fn test_generate_css() {
        let anims = vec![Animation {
            selector: "[data-node-id=\"test\"]".to_string(),
            name: "test-anim".to_string(),
            keyframes: "@keyframes test-anim { from { opacity: 0; } to { opacity: 1; } }".to_string(),
            duration_ms: 200,
            easing: "ease-out".to_string(),
            fill_mode: "forwards".to_string(),
        }];
        
        let css = generate_animation_css(&anims);
        
        assert!(css.contains("@keyframes test-anim"));
        assert!(css.contains("[data-node-id=\"test\"]"));
        assert!(css.contains("200ms"));
    }
}
