//! Locality-Sensitive Hashing for AST Fingerprints
//!
//! Enables O(n) similarity comparison instead of O(n³) tree-edit distance.
//! Uses MinHash/SimHash on AST node sequences for fast approximate matching.
//!
//! ## Use Cases
//! - Index millions of functions for duplicate detection
//! - Quick pre-filtering before expensive tree-edit distance
//! - Near-duplicate detection across large codebases
//!
//! ## Algorithm
//! 1. Extract k-shingles (k-grams) from AST node sequences
//! 2. Apply MinHash to create compact signatures
//! 3. Use LSH bands to find candidate pairs
//! 4. Estimate Jaccard similarity from MinHash signatures

use std::collections::{HashMap, HashSet};
use std::hash::{Hash, Hasher};
use std::collections::hash_map::DefaultHasher;
use serde::{Serialize, Deserialize};

/// Number of hash functions for MinHash
pub const DEFAULT_NUM_HASHES: usize = 128;

/// Shingle size (k-gram)
pub const DEFAULT_SHINGLE_SIZE: usize = 3;

/// Number of bands for LSH
pub const DEFAULT_NUM_BANDS: usize = 16;

/// Rows per band (num_hashes / num_bands)
pub const DEFAULT_ROWS_PER_BAND: usize = 8;

/// MinHash signature for a document/function
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MinHashSignature {
    /// The hash values (one per hash function)
    pub values: Vec<u64>,
    
    /// Number of shingles in the original document
    pub shingle_count: usize,
    
    /// Original identifier (e.g., function name, file path)
    pub identifier: String,
}

impl MinHashSignature {
    /// Estimate Jaccard similarity between two signatures
    pub fn similarity(&self, other: &MinHashSignature) -> f64 {
        if self.values.len() != other.values.len() {
            return 0.0;
        }
        
        let matches = self.values.iter()
            .zip(other.values.iter())
            .filter(|(a, b)| a == b)
            .count();
        
        matches as f64 / self.values.len() as f64
    }
}

/// LSH Index for finding similar items
#[derive(Debug, Clone)]
pub struct LshIndex {
    /// Number of hash functions (stored for debugging/introspection)
    #[allow(dead_code)]
    num_hashes: usize,
    
    /// Number of bands (stored for debugging/introspection)
    #[allow(dead_code)]
    num_bands: usize,
    
    /// Rows per band
    rows_per_band: usize,
    
    /// Band hash tables: band_id -> hash -> list of signature indices
    bands: Vec<HashMap<u64, Vec<usize>>>,
    
    /// All signatures
    signatures: Vec<MinHashSignature>,
}

impl LshIndex {
    /// Create a new LSH index with default parameters
    pub fn new() -> Self {
        Self::with_params(DEFAULT_NUM_HASHES, DEFAULT_NUM_BANDS)
    }
    
    /// Create with custom parameters
    pub fn with_params(num_hashes: usize, num_bands: usize) -> Self {
        let rows_per_band = num_hashes / num_bands;
        
        Self {
            num_hashes,
            num_bands,
            rows_per_band,
            bands: (0..num_bands).map(|_| HashMap::new()).collect(),
            signatures: Vec::new(),
        }
    }
    
    /// Add a signature to the index
    pub fn add(&mut self, signature: MinHashSignature) {
        let sig_idx = self.signatures.len();
        
        // Hash signature into each band
        for (band_idx, band_map) in self.bands.iter_mut().enumerate() {
            let start = band_idx * self.rows_per_band;
            let end = start + self.rows_per_band;
            
            if end <= signature.values.len() {
                let band_hash = hash_band(&signature.values[start..end]);
                band_map.entry(band_hash).or_default().push(sig_idx);
            }
        }
        
        self.signatures.push(signature);
    }
    
    /// Find candidate similar signatures for a query
    pub fn query_candidates(&self, signature: &MinHashSignature) -> HashSet<usize> {
        let mut candidates = HashSet::new();
        
        for (band_idx, band_map) in self.bands.iter().enumerate() {
            let start = band_idx * self.rows_per_band;
            let end = start + self.rows_per_band;
            
            if end <= signature.values.len() {
                let band_hash = hash_band(&signature.values[start..end]);
                
                if let Some(indices) = band_map.get(&band_hash) {
                    for &idx in indices {
                        candidates.insert(idx);
                    }
                }
            }
        }
        
        candidates
    }
    
    /// Find all similar items above threshold
    pub fn find_similar(&self, signature: &MinHashSignature, threshold: f64) -> Vec<SimilarityMatch> {
        let candidates = self.query_candidates(signature);
        let mut matches = Vec::new();
        
        for idx in candidates {
            let other = &self.signatures[idx];
            let sim = signature.similarity(other);
            
            if sim >= threshold {
                matches.push(SimilarityMatch {
                    index: idx,
                    identifier: other.identifier.clone(),
                    similarity: sim,
                });
            }
        }
        
        // Sort by similarity descending
        matches.sort_by(|a, b| b.similarity.partial_cmp(&a.similarity).unwrap_or(std::cmp::Ordering::Equal));
        
        matches
    }
    
    /// Find all pairs above threshold (for duplicate detection)
    pub fn find_all_pairs(&self, threshold: f64) -> Vec<SimilarityPair> {
        let mut pairs = Vec::new();
        let mut seen: HashSet<(usize, usize)> = HashSet::new();
        
        for (i, sig) in self.signatures.iter().enumerate() {
            let candidates = self.query_candidates(sig);
            
            for j in candidates {
                if i >= j {
                    continue; // Skip self and already seen pairs
                }
                
                let pair_key = (i.min(j), i.max(j));
                if seen.contains(&pair_key) {
                    continue;
                }
                seen.insert(pair_key);
                
                let sim = sig.similarity(&self.signatures[j]);
                if sim >= threshold {
                    pairs.push(SimilarityPair {
                        index_a: i,
                        index_b: j,
                        identifier_a: sig.identifier.clone(),
                        identifier_b: self.signatures[j].identifier.clone(),
                        similarity: sim,
                    });
                }
            }
        }
        
        // Sort by similarity descending
        pairs.sort_by(|a, b| b.similarity.partial_cmp(&a.similarity).unwrap_or(std::cmp::Ordering::Equal));
        
        pairs
    }
    
    /// Get a signature by index
    pub fn get(&self, index: usize) -> Option<&MinHashSignature> {
        self.signatures.get(index)
    }
    
    /// Number of items in index
    pub fn len(&self) -> usize {
        self.signatures.len()
    }
    
    /// Check if empty
    pub fn is_empty(&self) -> bool {
        self.signatures.is_empty()
    }
}

impl Default for LshIndex {
    fn default() -> Self {
        Self::new()
    }
}

/// A match result from LSH query
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimilarityMatch {
    pub index: usize,
    pub identifier: String,
    pub similarity: f64,
}

/// A pair of similar items
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimilarityPair {
    pub index_a: usize,
    pub index_b: usize,
    pub identifier_a: String,
    pub identifier_b: String,
    pub similarity: f64,
}

/// Compute MinHash signature from a set of shingles
pub fn minhash_signature(shingles: &HashSet<String>, num_hashes: usize) -> Vec<u64> {
    if shingles.is_empty() {
        return vec![u64::MAX; num_hashes];
    }
    
    let mut signature = vec![u64::MAX; num_hashes];
    
    for shingle in shingles {
        for (i, sig_val) in signature.iter_mut().enumerate() {
            let hash = hash_with_seed(shingle, i as u64);
            if hash < *sig_val {
                *sig_val = hash;
            }
        }
    }
    
    signature
}

/// Create MinHash signature from text with default parameters
pub fn create_signature(text: &str, identifier: String) -> MinHashSignature {
    create_signature_with_params(text, identifier, DEFAULT_SHINGLE_SIZE, DEFAULT_NUM_HASHES)
}

/// Create MinHash signature with custom parameters
pub fn create_signature_with_params(
    text: &str,
    identifier: String,
    shingle_size: usize,
    num_hashes: usize,
) -> MinHashSignature {
    let shingles = extract_shingles(text, shingle_size);
    let values = minhash_signature(&shingles, num_hashes);
    
    MinHashSignature {
        values,
        shingle_count: shingles.len(),
        identifier,
    }
}

/// Create MinHash signature from AST tokens
pub fn create_ast_signature(tokens: &[String], identifier: String) -> MinHashSignature {
    create_ast_signature_with_params(tokens, identifier, DEFAULT_SHINGLE_SIZE, DEFAULT_NUM_HASHES)
}

/// Create MinHash signature from AST tokens with custom parameters
pub fn create_ast_signature_with_params(
    tokens: &[String],
    identifier: String,
    shingle_size: usize,
    num_hashes: usize,
) -> MinHashSignature {
    let shingles = extract_token_shingles(tokens, shingle_size);
    let values = minhash_signature(&shingles, num_hashes);
    
    MinHashSignature {
        values,
        shingle_count: shingles.len(),
        identifier,
    }
}

/// Extract k-shingles from text
pub fn extract_shingles(text: &str, k: usize) -> HashSet<String> {
    let mut shingles = HashSet::new();
    
    // Normalize: lowercase, remove extra whitespace
    let normalized: String = text.to_lowercase()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");
    
    let chars: Vec<char> = normalized.chars().collect();
    
    if chars.len() >= k {
        for window in chars.windows(k) {
            let shingle: String = window.iter().collect();
            shingles.insert(shingle);
        }
    } else if !chars.is_empty() {
        // Document smaller than k, use entire document
        shingles.insert(normalized);
    }
    
    shingles
}

/// Extract k-shingles from token sequence
pub fn extract_token_shingles(tokens: &[String], k: usize) -> HashSet<String> {
    let mut shingles = HashSet::new();
    
    if tokens.len() >= k {
        for window in tokens.windows(k) {
            let shingle = window.join("_");
            shingles.insert(shingle);
        }
    } else if !tokens.is_empty() {
        // Sequence smaller than k, use entire sequence
        shingles.insert(tokens.join("_"));
    }
    
    shingles
}

/// Hash a single band of signature values
fn hash_band(values: &[u64]) -> u64 {
    let mut hasher = DefaultHasher::new();
    for v in values {
        v.hash(&mut hasher);
    }
    hasher.finish()
}

/// Hash with a seed (for MinHash)
fn hash_with_seed(s: &str, seed: u64) -> u64 {
    let mut hasher = DefaultHasher::new();
    seed.hash(&mut hasher);
    s.hash(&mut hasher);
    hasher.finish()
}

/// Estimate Jaccard similarity from two MinHash signatures
pub fn estimate_jaccard(sig_a: &[u64], sig_b: &[u64]) -> f64 {
    if sig_a.len() != sig_b.len() || sig_a.is_empty() {
        return 0.0;
    }
    
    let matches = sig_a.iter()
        .zip(sig_b.iter())
        .filter(|(a, b)| a == b)
        .count();
    
    matches as f64 / sig_a.len() as f64
}

/// Calculate the probability of LSH finding a pair with given similarity
/// P = 1 - (1 - s^r)^b
/// where s = similarity, r = rows per band, b = num bands
pub fn lsh_probability(similarity: f64, rows_per_band: usize, num_bands: usize) -> f64 {
    let r = rows_per_band as f64;
    let b = num_bands as f64;
    
    1.0 - (1.0 - similarity.powf(r)).powf(b)
}

/// Calculate optimal LSH parameters for a target similarity threshold
pub fn optimal_lsh_params(threshold: f64, num_hashes: usize) -> (usize, usize) {
    // Try different band configurations
    let mut best_bands = 1;
    let mut best_score = f64::MAX;
    
    for bands in 1..=num_hashes {
        if num_hashes % bands != 0 {
            continue;
        }
        
        let rows = num_hashes / bands;
        
        // Score based on false positive/negative rates at threshold
        let prob_at_threshold = lsh_probability(threshold, rows, bands);
        let prob_below = lsh_probability(threshold * 0.8, rows, bands);
        
        // We want high prob at threshold, low prob below
        let score = (1.0 - prob_at_threshold) + prob_below;
        
        if score < best_score {
            best_score = score;
            best_bands = bands;
        }
    }
    
    let best_rows = num_hashes / best_bands;
    (best_bands, best_rows)
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_extract_shingles() {
        let text = "hello world";
        let shingles = extract_shingles(text, 3);
        
        assert!(shingles.contains("hel"));
        assert!(shingles.contains("ell"));
        assert!(shingles.contains("llo"));
        assert!(shingles.contains(" wo"));
        assert!(shingles.contains("rld"));
    }
    
    #[test]
    fn test_minhash_identical() {
        let text = "function foo() { return bar; }";
        let sig1 = create_signature(text, "a".to_string());
        let sig2 = create_signature(text, "b".to_string());
        
        let sim = sig1.similarity(&sig2);
        assert!((sim - 1.0).abs() < 0.001);
    }
    
    #[test]
    fn test_minhash_similar() {
        let text1 = "function foo() { return bar; }";
        let text2 = "function foo() { return baz; }";
        
        let sig1 = create_signature(text1, "a".to_string());
        let sig2 = create_signature(text2, "b".to_string());
        
        let sim = sig1.similarity(&sig2);
        assert!(sim > 0.5); // Should be fairly similar
        assert!(sim < 1.0); // But not identical
    }
    
    #[test]
    fn test_minhash_different() {
        let text1 = "function foo() { return bar; }";
        let text2 = "completely different content here";
        
        let sig1 = create_signature(text1, "a".to_string());
        let sig2 = create_signature(text2, "b".to_string());
        
        let sim = sig1.similarity(&sig2);
        assert!(sim < 0.3); // Should be quite different
    }
    
    #[test]
    fn test_lsh_index() {
        let mut index = LshIndex::new();
        
        // Add some signatures
        index.add(create_signature("function foo() { return 1; }", "foo".to_string()));
        index.add(create_signature("function bar() { return 2; }", "bar".to_string()));
        index.add(create_signature("function foo() { return 1; }", "foo_dup".to_string())); // Duplicate
        index.add(create_signature("completely different content", "other".to_string()));
        
        // Find pairs
        let pairs = index.find_all_pairs(0.8);
        
        // Should find foo and foo_dup as similar
        let has_dup = pairs.iter().any(|p| 
            (p.identifier_a == "foo" && p.identifier_b == "foo_dup") ||
            (p.identifier_a == "foo_dup" && p.identifier_b == "foo")
        );
        assert!(has_dup);
    }
    
    #[test]
    fn test_token_shingles() {
        let tokens = vec![
            "function".to_string(),
            "identifier".to_string(),
            "lparen".to_string(),
            "rparen".to_string(),
            "lbrace".to_string(),
        ];
        
        let shingles = extract_token_shingles(&tokens, 3);
        
        assert!(shingles.contains("function_identifier_lparen"));
        assert!(shingles.contains("identifier_lparen_rparen"));
        assert!(shingles.contains("lparen_rparen_lbrace"));
    }
    
    #[test]
    fn test_lsh_probability() {
        // With default params (16 bands, 8 rows)
        let prob_90 = lsh_probability(0.9, 8, 16);
        let prob_50 = lsh_probability(0.5, 8, 16);
        let prob_20 = lsh_probability(0.2, 8, 16);
        
        // 90% similar items should almost always be found
        assert!(prob_90 > 0.99, "prob_90 was {}", prob_90);
        
        // 50% similar should have some chance (depends on params)
        assert!(prob_50 > 0.001, "prob_50 was {}", prob_50);
        
        // 20% similar should have very low probability
        assert!(prob_20 < prob_50, "prob_20 ({}) should be less than prob_50 ({})", prob_20, prob_50);
    }
}
