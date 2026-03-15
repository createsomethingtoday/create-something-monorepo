//! Bloom Filter Implementation
//!
//! @pattern
//! ```yaml
//! id: bloom-filter-v1
//! name: Bloom Filter
//! category: SimilaritySketching
//! description: |
//!   Space-efficient probabilistic set membership. Returns "possibly in set"
//!   or "definitely not in set". Use for cache checks, dedup pipelines,
//!   quick rejection of non-matching items.
//! priority_score: 35
//! dependencies: [sha2]
//! example_usage: |
//!   let mut bloom = BloomFilter::with_capacity(1000, 0.01);
//!   bloom.insert_str("processed-123");
//!   if !bloom.contains_str("item-456") {
//!     // Definitely not processed
//!   }
//! llm_prompt: |
//!   Use bloom-filter-v1 for fast "have we seen this?" checks. Choose FP rate
//!   0.01 (1%) for most cases. False negatives are impossible.
//! inspired_by: ["Burton Bloom 1970 paper", "Google Guava BloomFilter"]
//! status: stable
//! ```
//!
//! A space-efficient probabilistic data structure for set membership queries.
//! False positives are possible, but false negatives are not.
//!
//! ## Use Cases
//! - Fast "have we seen this before?" checks in deduplication pipelines
//! - Cache optimization: skip expensive lookups for items definitely not in cache
//! - Spell checking: quick rejection of non-dictionary words
//! - Agent workflows: track processed items across sessions
//!
//! ## Trade-offs
//! - 1% false positive rate: ~10 bits per element, 7 hash functions
//! - 0.1% false positive rate: ~14 bits per element, 10 hash functions
//! - No false negatives: if "not in set" is returned, it's definitely not there
//!
//! ## Philosophy
//! Canon: "The work must remain connected"—Bloom filters let agents quickly
//! check membership without loading complete sets into memory.

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::hash::{Hash, Hasher};
use std::collections::hash_map::DefaultHasher;

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/// Default false positive rate (1%)
pub const DEFAULT_FP_RATE: f64 = 0.01;

/// Minimum number of bits
pub const MIN_BITS: usize = 64;

/// Maximum number of bits (16MB)
pub const MAX_BITS: usize = 128 * 1024 * 1024;

// ─────────────────────────────────────────────────────────────────────────────
// Bloom Filter Implementation
// ─────────────────────────────────────────────────────────────────────────────

/// Bloom filter for probabilistic set membership.
///
/// ## Example
/// ```
/// use ground::computations::bloom::BloomFilter;
///
/// // Create filter for ~1000 items with 1% false positive rate
/// let mut bloom = BloomFilter::with_capacity(1000, 0.01);
///
/// // Add items
/// bloom.insert_str("hello");
/// bloom.insert_str("world");
///
/// // Check membership
/// assert!(bloom.contains_str("hello"));
/// assert!(!bloom.contains_str("goodbye")); // Probably not in set
/// ```
#[derive(Clone, Serialize, Deserialize)]
pub struct BloomFilter {
    /// Bit array
    bits: Vec<u64>,
    /// Number of bits in the filter
    num_bits: usize,
    /// Number of hash functions
    num_hashes: u32,
    /// Number of items inserted
    count: usize,
}

impl BloomFilter {
    /// Create a new Bloom filter with optimal parameters.
    ///
    /// # Arguments
    /// * `expected_items` - Expected number of items to insert
    /// * `fp_rate` - Desired false positive rate (e.g., 0.01 for 1%)
    pub fn with_capacity(expected_items: usize, fp_rate: f64) -> Self {
        let fp_rate = fp_rate.max(0.0001).min(0.5);
        let expected_items = expected_items.max(1);

        // Optimal number of bits: m = -n * ln(p) / (ln(2)^2)
        let ln2_squared = std::f64::consts::LN_2 * std::f64::consts::LN_2;
        let num_bits = (-(expected_items as f64) * fp_rate.ln() / ln2_squared).ceil() as usize;
        let num_bits = num_bits.clamp(MIN_BITS, MAX_BITS);

        // Optimal number of hash functions: k = (m/n) * ln(2)
        let num_hashes = ((num_bits as f64 / expected_items as f64) * std::f64::consts::LN_2)
            .ceil() as u32;
        let num_hashes = num_hashes.clamp(1, 30);

        // Round up to u64 boundary
        let num_words = (num_bits + 63) / 64;

        Self {
            bits: vec![0u64; num_words],
            num_bits: num_words * 64,
            num_hashes,
            count: 0,
        }
    }

    /// Create from raw parameters (for advanced use).
    pub fn with_params(num_bits: usize, num_hashes: u32) -> Self {
        let num_bits = num_bits.clamp(MIN_BITS, MAX_BITS);
        let num_hashes = num_hashes.clamp(1, 30);
        let num_words = (num_bits + 63) / 64;

        Self {
            bits: vec![0u64; num_words],
            num_bits: num_words * 64,
            num_hashes,
            count: 0,
        }
    }

    /// Insert a hashable item.
    pub fn insert<T: Hash>(&mut self, item: &T) {
        let (h1, h2) = self.hash_pair(item);
        
        for i in 0..self.num_hashes {
            let idx = self.get_index(h1, h2, i);
            self.set_bit(idx);
        }
        
        self.count += 1;
    }

    /// Insert a string (common case).
    pub fn insert_str(&mut self, s: &str) {
        self.insert(&s);
    }

    /// Insert raw bytes.
    pub fn insert_bytes(&mut self, bytes: &[u8]) {
        let (h1, h2) = self.hash_bytes(bytes);
        
        for i in 0..self.num_hashes {
            let idx = self.get_index(h1, h2, i);
            self.set_bit(idx);
        }
        
        self.count += 1;
    }

    /// Check if an item is possibly in the set.
    ///
    /// Returns:
    /// - `true`: Item is probably in the set (may be false positive)
    /// - `false`: Item is definitely NOT in the set
    pub fn contains<T: Hash>(&self, item: &T) -> bool {
        let (h1, h2) = self.hash_pair(item);
        
        for i in 0..self.num_hashes {
            let idx = self.get_index(h1, h2, i);
            if !self.get_bit(idx) {
                return false;
            }
        }
        
        true
    }

    /// Check if a string is possibly in the set.
    pub fn contains_str(&self, s: &str) -> bool {
        self.contains(&s)
    }

    /// Check if bytes are possibly in the set.
    pub fn contains_bytes(&self, bytes: &[u8]) -> bool {
        let (h1, h2) = self.hash_bytes(bytes);
        
        for i in 0..self.num_hashes {
            let idx = self.get_index(h1, h2, i);
            if !self.get_bit(idx) {
                return false;
            }
        }
        
        true
    }

    /// Get the number of items inserted.
    pub fn count(&self) -> usize {
        self.count
    }

    /// Check if the filter is empty.
    pub fn is_empty(&self) -> bool {
        self.count == 0
    }

    /// Get the number of bits in the filter.
    pub fn num_bits(&self) -> usize {
        self.num_bits
    }

    /// Get the number of hash functions.
    pub fn num_hashes(&self) -> u32 {
        self.num_hashes
    }

    /// Get memory usage in bytes.
    pub fn memory_bytes(&self) -> usize {
        self.bits.len() * 8
    }

    /// Estimate the current false positive rate.
    pub fn estimated_fp_rate(&self) -> f64 {
        if self.count == 0 {
            return 0.0;
        }

        // FP rate ≈ (1 - e^(-kn/m))^k
        let k = self.num_hashes as f64;
        let n = self.count as f64;
        let m = self.num_bits as f64;

        let exp = (-k * n / m).exp();
        (1.0 - exp).powi(self.num_hashes as i32)
    }

    /// Get the fill ratio (fraction of bits set).
    pub fn fill_ratio(&self) -> f64 {
        let set_bits: usize = self.bits.iter().map(|w| w.count_ones() as usize).sum();
        set_bits as f64 / self.num_bits as f64
    }

    /// Clear the filter.
    pub fn clear(&mut self) {
        self.bits.fill(0);
        self.count = 0;
    }

    /// Merge another Bloom filter into this one (union).
    ///
    /// After merging, this filter contains all items from both filters.
    /// Filters must have the same parameters.
    pub fn merge(&mut self, other: &BloomFilter) -> Result<(), BloomError> {
        if self.num_bits != other.num_bits || self.num_hashes != other.num_hashes {
            return Err(BloomError::ParameterMismatch {
                expected_bits: self.num_bits,
                expected_hashes: self.num_hashes,
                got_bits: other.num_bits,
                got_hashes: other.num_hashes,
            });
        }

        for (i, word) in other.bits.iter().enumerate() {
            self.bits[i] |= word;
        }

        // Count is approximate after merge
        self.count += other.count;

        Ok(())
    }

    /// Create a union of two Bloom filters.
    pub fn union(&self, other: &BloomFilter) -> Result<BloomFilter, BloomError> {
        let mut result = self.clone();
        result.merge(other)?;
        Ok(result)
    }

    /// Serialize to bytes.
    pub fn to_bytes(&self) -> Vec<u8> {
        let mut bytes = Vec::with_capacity(16 + self.bits.len() * 8);
        
        // Header: num_bits (8 bytes), num_hashes (4 bytes), count (4 bytes)
        bytes.extend_from_slice(&(self.num_bits as u64).to_le_bytes());
        bytes.extend_from_slice(&self.num_hashes.to_le_bytes());
        bytes.extend_from_slice(&(self.count as u32).to_le_bytes());
        
        // Bit array
        for word in &self.bits {
            bytes.extend_from_slice(&word.to_le_bytes());
        }
        
        bytes
    }

    /// Deserialize from bytes.
    pub fn from_bytes(bytes: &[u8]) -> Result<Self, BloomError> {
        if bytes.len() < 16 {
            return Err(BloomError::InvalidData("Data too short".into()));
        }

        let num_bits = u64::from_le_bytes(bytes[0..8].try_into().unwrap()) as usize;
        let num_hashes = u32::from_le_bytes(bytes[8..12].try_into().unwrap());
        let count = u32::from_le_bytes(bytes[12..16].try_into().unwrap()) as usize;

        let num_words = (num_bits + 63) / 64;
        let expected_len = 16 + num_words * 8;

        if bytes.len() != expected_len {
            return Err(BloomError::InvalidData(format!(
                "Expected {} bytes, got {}",
                expected_len,
                bytes.len()
            )));
        }

        let mut bits = Vec::with_capacity(num_words);
        for i in 0..num_words {
            let start = 16 + i * 8;
            let word = u64::from_le_bytes(bytes[start..start + 8].try_into().unwrap());
            bits.push(word);
        }

        Ok(Self {
            bits,
            num_bits,
            num_hashes,
            count,
        })
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private Methods
    // ─────────────────────────────────────────────────────────────────────────

    fn hash_pair<T: Hash>(&self, item: &T) -> (u64, u64) {
        let mut hasher1 = DefaultHasher::new();
        item.hash(&mut hasher1);
        let h1 = hasher1.finish();

        // Use a different seed for second hash
        let mut hasher2 = DefaultHasher::new();
        hasher2.write_u64(h1);
        hasher2.write_u64(0x517cc1b727220a95); // Random seed
        let h2 = hasher2.finish();

        (h1, h2)
    }

    fn hash_bytes(&self, bytes: &[u8]) -> (u64, u64) {
        let mut hasher = Sha256::new();
        hasher.update(bytes);
        let result = hasher.finalize();

        let h1 = u64::from_le_bytes(result[0..8].try_into().unwrap());
        let h2 = u64::from_le_bytes(result[8..16].try_into().unwrap());

        (h1, h2)
    }

    fn get_index(&self, h1: u64, h2: u64, i: u32) -> usize {
        // Double hashing: h(i) = h1 + i*h2
        let hash = h1.wrapping_add((i as u64).wrapping_mul(h2));
        (hash as usize) % self.num_bits
    }

    fn set_bit(&mut self, idx: usize) {
        let word_idx = idx / 64;
        let bit_idx = idx % 64;
        self.bits[word_idx] |= 1u64 << bit_idx;
    }

    fn get_bit(&self, idx: usize) -> bool {
        let word_idx = idx / 64;
        let bit_idx = idx % 64;
        (self.bits[word_idx] >> bit_idx) & 1 == 1
    }
}

impl Default for BloomFilter {
    fn default() -> Self {
        Self::with_capacity(1000, DEFAULT_FP_RATE)
    }
}

impl std::fmt::Debug for BloomFilter {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("BloomFilter")
            .field("num_bits", &self.num_bits)
            .field("num_hashes", &self.num_hashes)
            .field("count", &self.count)
            .field("fill_ratio", &format!("{:.2}%", self.fill_ratio() * 100.0))
            .field("estimated_fp_rate", &format!("{:.4}%", self.estimated_fp_rate() * 100.0))
            .field("memory_bytes", &self.memory_bytes())
            .finish()
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────────────────

/// Errors that can occur during Bloom filter operations.
#[derive(Debug, Clone, thiserror::Error)]
pub enum BloomError {
    #[error("Parameter mismatch: expected {expected_bits} bits/{expected_hashes} hashes, got {got_bits}/{got_hashes}")]
    ParameterMismatch {
        expected_bits: usize,
        expected_hashes: u32,
        got_bits: usize,
        got_hashes: u32,
    },

    #[error("Invalid data: {0}")]
    InvalidData(String),
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/// Calculate optimal Bloom filter parameters.
///
/// Returns (num_bits, num_hashes) for the given expected items and FP rate.
pub fn optimal_params(expected_items: usize, fp_rate: f64) -> (usize, u32) {
    let fp_rate = fp_rate.max(0.0001).min(0.5);
    let expected_items = expected_items.max(1);

    let ln2_squared = std::f64::consts::LN_2 * std::f64::consts::LN_2;
    let num_bits = (-(expected_items as f64) * fp_rate.ln() / ln2_squared).ceil() as usize;
    let num_bits = num_bits.clamp(MIN_BITS, MAX_BITS);

    let num_hashes = ((num_bits as f64 / expected_items as f64) * std::f64::consts::LN_2)
        .ceil() as u32;
    let num_hashes = num_hashes.clamp(1, 30);

    (num_bits, num_hashes)
}

/// Create a Bloom filter and add items.
pub fn bloom_from_iter<T: Hash>(items: impl IntoIterator<Item = T>, fp_rate: f64) -> BloomFilter {
    let items: Vec<T> = items.into_iter().collect();
    let mut bloom = BloomFilter::with_capacity(items.len(), fp_rate);
    for item in items {
        bloom.insert(&item);
    }
    bloom
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_operations() {
        let mut bloom = BloomFilter::with_capacity(100, 0.01);
        
        bloom.insert_str("hello");
        bloom.insert_str("world");
        
        assert!(bloom.contains_str("hello"));
        assert!(bloom.contains_str("world"));
        assert!(!bloom.contains_str("goodbye")); // Very likely not a false positive
    }

    #[test]
    fn test_no_false_negatives() {
        let mut bloom = BloomFilter::with_capacity(1000, 0.01);
        
        // Insert many items
        for i in 0..500 {
            bloom.insert(&i);
        }
        
        // All inserted items must be found
        for i in 0..500 {
            assert!(bloom.contains(&i), "False negative for {}", i);
        }
    }

    #[test]
    fn test_false_positive_rate() {
        let n = 10000;
        let fp_rate = 0.01;
        let mut bloom = BloomFilter::with_capacity(n, fp_rate);
        
        // Insert items
        for i in 0..n {
            bloom.insert(&i);
        }
        
        // Check items that were NOT inserted
        let mut false_positives = 0;
        let test_count = 10000;
        
        for i in n..(n + test_count) {
            if bloom.contains(&i) {
                false_positives += 1;
            }
        }
        
        let actual_fp_rate = false_positives as f64 / test_count as f64;
        
        // Allow 3x the expected FP rate (statistical variance)
        assert!(
            actual_fp_rate < fp_rate * 3.0,
            "FP rate too high: {:.4} (expected ~{:.4})",
            actual_fp_rate,
            fp_rate
        );
    }

    #[test]
    fn test_merge() {
        let mut bloom1 = BloomFilter::with_capacity(100, 0.01);
        let mut bloom2 = BloomFilter::with_capacity(100, 0.01);
        
        for i in 0..50 {
            bloom1.insert(&i);
        }
        
        for i in 50..100 {
            bloom2.insert(&i);
        }
        
        bloom1.merge(&bloom2).unwrap();
        
        // Should contain all items from both
        for i in 0..100 {
            assert!(bloom1.contains(&i), "Missing {} after merge", i);
        }
    }

    #[test]
    fn test_serialization() {
        let mut bloom = BloomFilter::with_capacity(100, 0.01);
        
        for i in 0..50 {
            bloom.insert(&i);
        }
        
        let bytes = bloom.to_bytes();
        let restored = BloomFilter::from_bytes(&bytes).unwrap();
        
        assert_eq!(bloom.num_bits(), restored.num_bits());
        assert_eq!(bloom.num_hashes(), restored.num_hashes());
        assert_eq!(bloom.count(), restored.count());
        
        // Check membership is preserved
        for i in 0..50 {
            assert!(restored.contains(&i));
        }
    }

    #[test]
    fn test_clear() {
        let mut bloom = BloomFilter::with_capacity(100, 0.01);
        
        bloom.insert_str("test");
        assert!(bloom.contains_str("test"));
        
        bloom.clear();
        assert!(!bloom.contains_str("test"));
        assert_eq!(bloom.count(), 0);
    }

    #[test]
    fn test_optimal_params() {
        let (bits, hashes) = optimal_params(1000, 0.01);
        
        // For 1% FP rate, should be ~10 bits per element, 7 hash functions
        assert!(bits >= 9000 && bits <= 11000, "bits={}", bits);
        assert!(hashes >= 5 && hashes <= 10, "hashes={}", hashes);
    }
}
