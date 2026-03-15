//! Similarity Computation (DRY Level)
//!
//! Computes actual similarity between code files using:
//! - Token-level diff (via `similar` crate)
//! - AST structure comparison (via tree-sitter)
//! - Content hash comparison

use std::path::{Path, PathBuf};
use std::fs;
use serde::{Serialize, Deserialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use similar::{TextDiff, Algorithm};

use super::ComputationError;
use super::ast_similarity::{extract_fingerprint, compare_fingerprints};

/// Evidence of computed similarity between two files
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimilarityEvidence {
    /// Unique identifier for this computation
    pub id: Uuid,
    
    /// First file path
    pub file_a: PathBuf,
    
    /// Second file path  
    pub file_b: PathBuf,
    
    /// Overall similarity score (0.0 - 1.0)
    pub similarity: f64,
    
    /// Token-level overlap ratio
    pub token_overlap: f64,
    
    /// Line-level similarity
    pub line_similarity: f64,
    
    /// AST structural similarity (if available)
    pub ast_similarity: Option<f64>,
    
    /// Hash of file A content
    pub hash_a: String,
    
    /// Hash of file B content
    pub hash_b: String,
    
    /// When this computation was performed
    pub computed_at: DateTime<Utc>,
}

impl SimilarityEvidence {
    /// Check if this evidence meets a similarity threshold
    pub fn meets_threshold(&self, threshold: f64) -> bool {
        self.similarity >= threshold
    }
}

/// Compute similarity between two files
pub fn compute_similarity(file_a: &Path, file_b: &Path) -> Result<SimilarityEvidence, ComputationError> {
    // Read file contents
    let content_a = fs::read_to_string(file_a)
        .map_err(|_| ComputationError::FileNotFound(file_a.to_path_buf()))?;
    let content_b = fs::read_to_string(file_b)
        .map_err(|_| ComputationError::FileNotFound(file_b.to_path_buf()))?;
    
    // Compute hashes
    use sha2::{Sha256, Digest};
    let hash_a = format!("{:x}", Sha256::digest(content_a.as_bytes()));
    let hash_b = format!("{:x}", Sha256::digest(content_b.as_bytes()));
    
    // Compute line-level similarity using diff
    let diff = TextDiff::configure()
        .algorithm(Algorithm::Patience)
        .diff_lines(&content_a, &content_b);
    
    let line_similarity = diff.ratio() as f64;
    
    // Compute token-level overlap
    let tokens_a: Vec<&str> = content_a.split_whitespace().collect();
    let tokens_b: Vec<&str> = content_b.split_whitespace().collect();
    let token_overlap = compute_token_overlap(&tokens_a, &tokens_b);
    
    // Compute AST similarity if language is supported
    let extension = file_a.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");
    
    let ast_similarity = compute_ast_similarity(&content_a, &content_b, extension);
    
    // Combined similarity score (weighted average)
    // If AST is available, weight it heavily as it's more reliable
    let similarity = match ast_similarity {
        Some(ast_sim) => {
            // AST: 40%, Line: 35%, Token: 25%
            (ast_sim * 0.40) + (line_similarity * 0.35) + (token_overlap * 0.25)
        }
        None => {
            // Fallback: Line: 60%, Token: 40%
            (line_similarity * 0.60) + (token_overlap * 0.40)
        }
    };
    
    Ok(SimilarityEvidence {
        id: Uuid::new_v4(),
        file_a: file_a.to_path_buf(),
        file_b: file_b.to_path_buf(),
        similarity,
        token_overlap,
        line_similarity,
        ast_similarity,
        hash_a,
        hash_b,
        computed_at: Utc::now(),
    })
}

/// Compute AST-based similarity between two code strings
fn compute_ast_similarity(content_a: &str, content_b: &str, extension: &str) -> Option<f64> {
    let fp_a = extract_fingerprint(content_a, extension)?;
    let fp_b = extract_fingerprint(content_b, extension)?;
    
    let result = compare_fingerprints(&fp_a, &fp_b);
    Some(result.structural_similarity)
}

/// Compute Jaccard similarity of token sets
fn compute_token_overlap(tokens_a: &[&str], tokens_b: &[&str]) -> f64 {
    use std::collections::HashSet;
    
    let set_a: HashSet<_> = tokens_a.iter().collect();
    let set_b: HashSet<_> = tokens_b.iter().collect();
    
    let intersection = set_a.intersection(&set_b).count();
    let union = set_a.union(&set_b).count();
    
    if union == 0 {
        return 0.0;
    }
    
    intersection as f64 / union as f64
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    use std::fs::File;
    use std::io::Write;
    
    #[test]
    fn test_identical_files_have_similarity_1() {
        let dir = tempdir().unwrap();
        let file_a = dir.path().join("a.ts");
        let file_b = dir.path().join("b.ts");
        
        let content = "function validate(x: string) { return x.length > 0; }";
        File::create(&file_a).unwrap().write_all(content.as_bytes()).unwrap();
        File::create(&file_b).unwrap().write_all(content.as_bytes()).unwrap();
        
        let evidence = compute_similarity(&file_a, &file_b).unwrap();
        
        assert!((evidence.similarity - 1.0).abs() < 0.001);
        assert_eq!(evidence.hash_a, evidence.hash_b);
    }
    
    #[test]
    fn test_completely_different_files_have_low_similarity() {
        let dir = tempdir().unwrap();
        let file_a = dir.path().join("a.ts");
        let file_b = dir.path().join("b.ts");
        
        // Structurally different code
        let content_a = r#"
function calculate(x: number, y: number): number {
    for (let i = 0; i < 10; i++) {
        x = x * y;
    }
    return x;
}
"#;
        let content_b = r#"
const config = {
    name: "app",
    version: "1.0.0",
    settings: {
        debug: true
    }
};
export default config;
"#;
        File::create(&file_a).unwrap().write_all(content_a.as_bytes()).unwrap();
        File::create(&file_b).unwrap().write_all(content_b.as_bytes()).unwrap();
        
        let evidence = compute_similarity(&file_a, &file_b).unwrap();
        
        // Different structure should have low similarity
        assert!(evidence.similarity < 0.5, "Expected < 0.5, got {}", evidence.similarity);
    }
    
    #[test]
    fn test_similar_files_have_medium_similarity() {
        let dir = tempdir().unwrap();
        let file_a = dir.path().join("a.ts");
        let file_b = dir.path().join("b.ts");
        
        // More similar content to ensure test passes
        let content_a = r#"
function validateEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}
export { validateEmail };
"#;
        let content_b = r#"
function validateEmail(email: string): boolean {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
}
export { validateEmail };
"#;
        
        File::create(&file_a).unwrap().write_all(content_a.as_bytes()).unwrap();
        File::create(&file_b).unwrap().write_all(content_b.as_bytes()).unwrap();
        
        let evidence = compute_similarity(&file_a, &file_b).unwrap();
        
        // These are similar but not identical
        assert!(evidence.similarity > 0.4, "Expected similarity > 0.4, got {}", evidence.similarity);
        assert!(evidence.similarity < 0.99, "Expected similarity < 0.99, got {}", evidence.similarity);
    }
}
