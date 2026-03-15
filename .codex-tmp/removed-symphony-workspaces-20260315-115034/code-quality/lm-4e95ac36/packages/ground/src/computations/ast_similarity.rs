//! AST-based Similarity Computation
//!
//! Uses tree-sitter to parse code into ASTs and compare structural similarity.
//! This catches semantic duplicates that text-based comparison misses:
//! - Renamed variables
//! - Reformatted code
//! - Reordered statements

use std::collections::HashMap;
use tree_sitter::{Parser, Node, Tree};

/// Structural fingerprint of code
#[derive(Debug, Clone)]
pub struct AstFingerprint {
    /// Node type frequencies (e.g., "function_declaration": 3)
    pub node_types: HashMap<String, usize>,
    /// Depth histogram (how many nodes at each depth)
    pub depth_histogram: Vec<usize>,
    /// Total node count
    pub node_count: usize,
    /// Function/method signatures (normalized)
    pub signatures: Vec<String>,
    /// Control flow patterns (if, for, while, etc.)
    pub control_flow: Vec<String>,
}

impl AstFingerprint {
    pub fn new() -> Self {
        Self {
            node_types: HashMap::new(),
            depth_histogram: Vec::new(),
            node_count: 0,
            signatures: Vec::new(),
            control_flow: Vec::new(),
        }
    }
}

/// Result of AST-based comparison
#[derive(Debug, Clone)]
pub struct AstSimilarity {
    /// Overall structural similarity (0.0 - 1.0)
    pub structural_similarity: f64,
    /// Node type distribution similarity
    pub type_similarity: f64,
    /// Depth profile similarity
    pub depth_similarity: f64,
    /// Signature similarity
    pub signature_similarity: f64,
    /// Control flow similarity
    pub control_flow_similarity: f64,
}

/// Parse TypeScript/JavaScript code and extract fingerprint
pub fn extract_fingerprint_ts(source: &str) -> Option<AstFingerprint> {
    let mut parser = Parser::new();
    let language = tree_sitter_typescript::LANGUAGE_TYPESCRIPT;
    parser.set_language(&language.into()).ok()?;
    
    let tree = parser.parse(source, None)?;
    Some(extract_fingerprint_from_tree(&tree, source))
}

/// Parse JavaScript code and extract fingerprint
pub fn extract_fingerprint_js(source: &str) -> Option<AstFingerprint> {
    let mut parser = Parser::new();
    let language = tree_sitter_javascript::LANGUAGE;
    parser.set_language(&language.into()).ok()?;
    
    let tree = parser.parse(source, None)?;
    Some(extract_fingerprint_from_tree(&tree, source))
}

/// Parse Rust code and extract fingerprint
pub fn extract_fingerprint_rust(source: &str) -> Option<AstFingerprint> {
    let mut parser = Parser::new();
    let language = tree_sitter_rust::LANGUAGE;
    parser.set_language(&language.into()).ok()?;
    
    let tree = parser.parse(source, None)?;
    Some(extract_fingerprint_from_tree(&tree, source))
}

/// Parse Python code and extract fingerprint
pub fn extract_fingerprint_python(source: &str) -> Option<AstFingerprint> {
    let mut parser = Parser::new();
    let language = tree_sitter_python::LANGUAGE;
    parser.set_language(&language.into()).ok()?;
    
    let tree = parser.parse(source, None)?;
    Some(extract_fingerprint_from_tree(&tree, source))
}

/// Extract fingerprint based on file extension
pub fn extract_fingerprint(source: &str, extension: &str) -> Option<AstFingerprint> {
    match extension.to_lowercase().as_str() {
        "ts" | "tsx" => extract_fingerprint_ts(source),
        "js" | "jsx" | "mjs" => extract_fingerprint_js(source),
        "rs" => extract_fingerprint_rust(source),
        "py" => extract_fingerprint_python(source),
        _ => None, // Unsupported language
    }
}

fn extract_fingerprint_from_tree(tree: &Tree, source: &str) -> AstFingerprint {
    let mut fingerprint = AstFingerprint::new();
    let root = tree.root_node();
    
    // Walk the tree and collect metrics
    walk_node(&root, 0, &mut fingerprint, source);
    
    fingerprint
}

fn walk_node(node: &Node, depth: usize, fingerprint: &mut AstFingerprint, source: &str) {
    fingerprint.node_count += 1;
    
    // Track node types
    let node_type = node.kind().to_string();
    *fingerprint.node_types.entry(node_type.clone()).or_insert(0) += 1;
    
    // Track depth histogram
    while fingerprint.depth_histogram.len() <= depth {
        fingerprint.depth_histogram.push(0);
    }
    fingerprint.depth_histogram[depth] += 1;
    
    // Extract signatures for function-like nodes
    if is_function_like(&node_type) {
        if let Some(sig) = extract_signature(node, source) {
            fingerprint.signatures.push(sig);
        }
    }
    
    // Track control flow
    if is_control_flow(&node_type) {
        fingerprint.control_flow.push(node_type.clone());
    }
    
    // Recurse into children
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        walk_node(&child, depth + 1, fingerprint, source);
    }
}

fn is_function_like(node_type: &str) -> bool {
    matches!(node_type, 
        "function_declaration" | 
        "function_expression" |
        "arrow_function" |
        "method_definition" |
        "function_item" |  // Rust
        "function_definition" | // Python
        "generator_function_declaration"
    )
}

fn is_control_flow(node_type: &str) -> bool {
    matches!(node_type,
        "if_statement" |
        "if_expression" |
        "for_statement" |
        "for_expression" |
        "for_in_statement" |
        "while_statement" |
        "while_expression" |
        "do_statement" |
        "switch_statement" |
        "match_expression" |
        "try_statement" |
        "catch_clause" |
        "return_statement"
    )
}

fn extract_signature(node: &Node, source: &str) -> Option<String> {
    // Try to find the function name
    let mut cursor = node.walk();
    let mut name = None;
    let mut params = Vec::new();
    
    for child in node.children(&mut cursor) {
        match child.kind() {
            "identifier" | "property_identifier" => {
                if name.is_none() {
                    name = child.utf8_text(source.as_bytes()).ok().map(|s| s.to_string());
                }
            }
            "formal_parameters" | "parameters" => {
                // Count parameters instead of extracting names (for normalization)
                let param_count = child.named_child_count();
                params.push(format!("{} params", param_count));
            }
            _ => {}
        }
    }
    
    name.map(|n| format!("{}({})", n, params.join(", ")))
}

/// Compare two AST fingerprints
pub fn compare_fingerprints(a: &AstFingerprint, b: &AstFingerprint) -> AstSimilarity {
    let type_similarity = compare_type_distributions(&a.node_types, &b.node_types);
    let depth_similarity = compare_histograms(&a.depth_histogram, &b.depth_histogram);
    let signature_similarity = compare_string_sets(&a.signatures, &b.signatures);
    let control_flow_similarity = compare_sequences(&a.control_flow, &b.control_flow);
    
    // Weighted combination
    let structural_similarity = 
        type_similarity * 0.3 +
        depth_similarity * 0.2 +
        signature_similarity * 0.3 +
        control_flow_similarity * 0.2;
    
    AstSimilarity {
        structural_similarity,
        type_similarity,
        depth_similarity,
        signature_similarity,
        control_flow_similarity,
    }
}

/// Compare node type distributions using cosine similarity
fn compare_type_distributions(a: &HashMap<String, usize>, b: &HashMap<String, usize>) -> f64 {
    let all_keys: std::collections::HashSet<_> = a.keys().chain(b.keys()).collect();
    
    if all_keys.is_empty() {
        return 1.0;
    }
    
    let mut dot_product = 0.0;
    let mut magnitude_a = 0.0;
    let mut magnitude_b = 0.0;
    
    for key in all_keys {
        let val_a = *a.get(key).unwrap_or(&0) as f64;
        let val_b = *b.get(key).unwrap_or(&0) as f64;
        
        dot_product += val_a * val_b;
        magnitude_a += val_a * val_a;
        magnitude_b += val_b * val_b;
    }
    
    let magnitude = magnitude_a.sqrt() * magnitude_b.sqrt();
    if magnitude == 0.0 {
        return 1.0;
    }
    
    dot_product / magnitude
}

/// Compare depth histograms
fn compare_histograms(a: &[usize], b: &[usize]) -> f64 {
    let max_len = a.len().max(b.len());
    if max_len == 0 {
        return 1.0;
    }
    
    let mut intersection = 0usize;
    let mut union = 0usize;
    
    for i in 0..max_len {
        let val_a = a.get(i).copied().unwrap_or(0);
        let val_b = b.get(i).copied().unwrap_or(0);
        
        intersection += val_a.min(val_b);
        union += val_a.max(val_b);
    }
    
    if union == 0 {
        return 1.0;
    }
    
    intersection as f64 / union as f64
}

/// Compare string sets using Jaccard similarity
fn compare_string_sets(a: &[String], b: &[String]) -> f64 {
    if a.is_empty() && b.is_empty() {
        return 1.0;
    }
    
    let set_a: std::collections::HashSet<_> = a.iter().collect();
    let set_b: std::collections::HashSet<_> = b.iter().collect();
    
    let intersection = set_a.intersection(&set_b).count();
    let union = set_a.union(&set_b).count();
    
    if union == 0 {
        return 1.0;
    }
    
    intersection as f64 / union as f64
}

/// Compare sequences using longest common subsequence ratio
fn compare_sequences(a: &[String], b: &[String]) -> f64 {
    if a.is_empty() && b.is_empty() {
        return 1.0;
    }
    
    let lcs_len = lcs_length(a, b);
    let max_len = a.len().max(b.len());
    
    if max_len == 0 {
        return 1.0;
    }
    
    lcs_len as f64 / max_len as f64
}

/// Compute longest common subsequence length
fn lcs_length(a: &[String], b: &[String]) -> usize {
    let m = a.len();
    let n = b.len();
    
    if m == 0 || n == 0 {
        return 0;
    }
    
    let mut dp = vec![vec![0usize; n + 1]; m + 1];
    
    for i in 1..=m {
        for j in 1..=n {
            if a[i - 1] == b[j - 1] {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = dp[i - 1][j].max(dp[i][j - 1]);
            }
        }
    }
    
    dp[m][n]
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_identical_code_has_similarity_1() {
        let code = r#"
function validateEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}
"#;
        let fp_a = extract_fingerprint_ts(code).unwrap();
        let fp_b = extract_fingerprint_ts(code).unwrap();
        
        let result = compare_fingerprints(&fp_a, &fp_b);
        assert!((result.structural_similarity - 1.0).abs() < 0.01);
    }
    
    #[test]
    fn test_renamed_variable_still_similar() {
        let code_a = r#"
function validate(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}
"#;
        let code_b = r#"
function validate(input: string): boolean {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(input);
}
"#;
        let fp_a = extract_fingerprint_ts(code_a).unwrap();
        let fp_b = extract_fingerprint_ts(code_b).unwrap();
        
        let result = compare_fingerprints(&fp_a, &fp_b);
        // Should be very similar despite renamed variables
        assert!(result.structural_similarity > 0.8, 
            "Expected > 0.8, got {}", result.structural_similarity);
    }
    
    #[test]
    fn test_different_structure_has_low_similarity() {
        let code_a = r#"
function validate(x: string): boolean {
    if (x.length > 0) {
        for (let i = 0; i < x.length; i++) {
            if (x[i] === ' ') return false;
        }
        return true;
    }
    return false;
}
"#;
        let code_b = r#"
const config = {
    debug: true,
    version: "1.0.0"
};
export default config;
"#;
        let fp_a = extract_fingerprint_ts(code_a).unwrap();
        let fp_b = extract_fingerprint_ts(code_b).unwrap();
        
        let result = compare_fingerprints(&fp_a, &fp_b);
        assert!(result.structural_similarity < 0.5,
            "Expected < 0.5, got {}", result.structural_similarity);
    }
}
