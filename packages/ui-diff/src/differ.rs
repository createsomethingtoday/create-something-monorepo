//! Tree diffing algorithm
//!
//! Compares two NodeData trees and produces a minimal set of operations
//! to transform the first into the second.

use crate::operations::{AnimationHint, NodeData, NodeType, Operation, PropChange};
use std::collections::{HashMap, HashSet};

/// Diff two trees and return the operations needed to transform `before` into `after`
pub fn diff_trees(before: &NodeData, after: &NodeData) -> Vec<Operation> {
    let mut ops = Vec::new();
    
    // Build index of nodes by ID for quick lookup
    let before_index = build_index(before);
    let after_index = build_index(after);
    
    // Find deletions (in before but not in after)
    for (id, _) in &before_index {
        if !after_index.contains_key(id) {
            ops.push(Operation::Delete {
                target: id.clone(),
            });
        }
    }
    
    // Find insertions and updates
    diff_node(before, after, "root", &before_index, &mut ops);
    
    ops
}

/// Build an index of all nodes by their ID
fn build_index(root: &NodeData) -> HashMap<String, &NodeData> {
    let mut index = HashMap::new();
    build_index_recursive(root, &mut index);
    index
}

fn build_index_recursive<'a>(node: &'a NodeData, index: &mut HashMap<String, &'a NodeData>) {
    index.insert(node.id.clone(), node);
    for child in &node.children {
        build_index_recursive(child, index);
    }
}

/// Recursively diff two nodes
fn diff_node(
    before: &NodeData,
    after: &NodeData,
    parent_id: &str,
    before_index: &HashMap<String, &NodeData>,
    ops: &mut Vec<Operation>,
) {
    // Compare children
    let before_child_ids: Vec<&str> = before.children.iter().map(|c| c.id.as_str()).collect();
    let after_child_ids: Vec<&str> = after.children.iter().map(|c| c.id.as_str()).collect();
    
    let before_set: HashSet<&str> = before_child_ids.iter().copied().collect();
    let after_set: HashSet<&str> = after_child_ids.iter().copied().collect();
    
    // Find new children (insertions)
    for (index, child) in after.children.iter().enumerate() {
        if !before_set.contains(child.id.as_str()) {
            ops.push(Operation::Insert {
                parent: after.id.clone(),
                node: child.clone(),
                index,
                animate: Some(AnimationHint::ScaleFade),
            });
        }
    }
    
    // Find children that exist in both - check for updates
    for child in &after.children {
        if let Some(before_child) = before_index.get(&child.id) {
            // Check for property changes
            let changes = diff_props(before_child, child);
            if !changes.is_empty() {
                ops.push(Operation::Update {
                    target: child.id.clone(),
                    changes,
                });
            }
            
            // Recursively diff children
            diff_node(before_child, child, &child.id, before_index, ops);
        }
    }
    
    // Check for moves (same ID but different position/parent)
    // This is a simplified check - a full implementation would use
    // a more sophisticated algorithm like Myers diff
    for (new_index, child) in after.children.iter().enumerate() {
        if before_set.contains(child.id.as_str()) {
            // Check if position changed
            if let Some(old_index) = before_child_ids.iter().position(|&id| id == child.id) {
                if old_index != new_index {
                    ops.push(Operation::Move {
                        target: child.id.clone(),
                        new_parent: after.id.clone(),
                        index: new_index,
                    });
                }
            }
        }
    }
}

/// Compare properties between two nodes
fn diff_props(before: &NodeData, after: &NodeData) -> Vec<PropChange> {
    let mut changes = Vec::new();
    
    // Check text content
    if before.text != after.text {
        if let Some(to) = &after.text {
            changes.push(PropChange {
                prop: "text".to_string(),
                from: before.text.clone(),
                to: to.clone(),
            });
        }
    }
    
    // Check attributes
    let all_keys: HashSet<&String> = before.attrs.keys().chain(after.attrs.keys()).collect();
    
    for key in all_keys {
        let before_val = before.attrs.get(key);
        let after_val = after.attrs.get(key);
        
        match (before_val, after_val) {
            (Some(bv), Some(av)) if bv != av => {
                changes.push(PropChange {
                    prop: key.clone(),
                    from: Some(bv.clone()),
                    to: av.clone(),
                });
            }
            (None, Some(av)) => {
                changes.push(PropChange {
                    prop: key.clone(),
                    from: None,
                    to: av.clone(),
                });
            }
            (Some(bv), None) => {
                changes.push(PropChange {
                    prop: key.clone(),
                    from: Some(bv.clone()),
                    to: String::new(), // Attribute removed
                });
            }
            _ => {}
        }
    }
    
    changes
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::parser::{parse, reset_id_counter, Syntax};
    
    #[test]
    fn test_diff_no_changes() {
        reset_id_counter();
        let html = "<div>Hello</div>";
        let tree = parse(html, Syntax::Html);
        
        let ops = diff_trees(&tree, &tree);
        assert!(ops.is_empty());
    }
    
    #[test]
    fn test_diff_text_change() {
        reset_id_counter();
        let before = NodeData::root()
            .with_child(NodeData::text("t1", "Hello"));
        
        let after = NodeData::root()
            .with_child(NodeData::text("t1", "World"));
        
        let ops = diff_trees(&before, &after);
        
        assert_eq!(ops.len(), 1);
        match &ops[0] {
            Operation::Update { target, changes } => {
                assert_eq!(target, "t1");
                assert_eq!(changes[0].prop, "text");
                assert_eq!(changes[0].to, "World");
            }
            _ => panic!("Expected Update operation"),
        }
    }
    
    #[test]
    fn test_diff_insert() {
        let before = NodeData::root();
        
        let after = NodeData::root()
            .with_child(NodeData::element("e1", "div"));
        
        let ops = diff_trees(&before, &after);
        
        assert!(ops.iter().any(|op| matches!(op, Operation::Insert { .. })));
    }
    
    #[test]
    fn test_diff_delete() {
        let before = NodeData::root()
            .with_child(NodeData::element("e1", "div"));
        
        let after = NodeData::root();
        
        let ops = diff_trees(&before, &after);
        
        assert!(ops.iter().any(|op| matches!(op, Operation::Delete { target } if target == "e1")));
    }
}
