//! HyperLogLog Cardinality Estimation
//!
//! @pattern
//! ```yaml
//! id: hyperloglog-v1
//! name: HyperLogLog Sketch
//! category: SimilaritySketching
//! description: |
//!   Probabilistic cardinality estimation using sub-linear space. Counts unique
//!   elements with ~0.8% error at 14-bit precision. Use for counting unique
//!   workflow runs, file changes, API calls without storing all IDs.
//! priority_score: 36
//! dependencies: [sha2]
//! example_usage: |
//!   let mut hll = HyperLogLog::new(14);
//!   hll.add_str("user-123");
//!   hll.add_str("user-456");
//!   println!("Unique users: {}", hll.count());
//! llm_prompt: |
//!   Use hyperloglog-v1 for cardinality estimation. Choose precision 12-16
//!   based on accuracy needs. Merge HLLs for distributed counting.
//! inspired_by: ["Flajolet et al. HyperLogLog paper", "Redis HyperLogLog"]
//! status: stable
//! ```
//!
//! A probabilistic data structure for estimating the number of distinct elements
//! in a multiset. Uses sub-linear space O(m) where m is the number of registers.
//!
//! ## Use Cases
//! - Count unique workflow runs without storing all IDs
//! - Estimate unique file changes in a codebase
//! - Track unique API calls or events
//!
//! ## Accuracy
//! - 12 bits (4,096 registers): ~1.6% standard error
//! - 14 bits (16,384 registers): ~0.8% standard error
//! - 16 bits (65,536 registers): ~0.4% standard error
//!
//! ## Philosophy
//! Canon: "The work must remain connected"—HyperLogLog lets agents track
//! cardinality across sessions without storing complete sets.

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::hash::{Hash, Hasher};
use std::collections::hash_map::DefaultHasher;

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/// Default precision (14 bits = 16,384 registers, ~0.8% error)
pub const DEFAULT_PRECISION: u8 = 14;

/// Minimum precision (4 bits = 16 registers)
pub const MIN_PRECISION: u8 = 4;

/// Maximum precision (18 bits = 262,144 registers)
pub const MAX_PRECISION: u8 = 18;

// ─────────────────────────────────────────────────────────────────────────────
// HyperLogLog Implementation
// ─────────────────────────────────────────────────────────────────────────────

/// HyperLogLog cardinality estimator.
///
/// ## Example
/// ```
/// use ground::computations::hll::HyperLogLog;
///
/// let mut hll = HyperLogLog::new(14);
/// 
/// // Add elements
/// hll.add_str("user-123");
/// hll.add_str("user-456");
/// hll.add_str("user-123"); // Duplicate, won't increase count
///
/// // Estimate cardinality
/// let count = hll.count();
/// println!("Estimated unique users: {}", count);
/// ```
#[derive(Clone, Serialize, Deserialize)]
pub struct HyperLogLog {
    /// Precision (number of bits for register index)
    precision: u8,
    /// Number of registers (2^precision)
    num_registers: usize,
    /// Register array (stores max leading zeros + 1)
    registers: Vec<u8>,
}

impl HyperLogLog {
    /// Create a new HyperLogLog with the given precision.
    ///
    /// Precision determines accuracy vs memory trade-off:
    /// - p=12: 4KB memory, ~1.6% error
    /// - p=14: 16KB memory, ~0.8% error (recommended)
    /// - p=16: 64KB memory, ~0.4% error
    pub fn new(precision: u8) -> Self {
        let p = precision.clamp(MIN_PRECISION, MAX_PRECISION);
        let num_registers = 1 << p;
        
        Self {
            precision: p,
            num_registers,
            registers: vec![0; num_registers],
        }
    }

    /// Create with default precision (14 bits).
    pub fn default_precision() -> Self {
        Self::new(DEFAULT_PRECISION)
    }

    /// Add a hashable element to the set.
    pub fn add<T: Hash>(&mut self, item: &T) {
        let hash = self.hash_item(item);
        self.add_hash(hash);
    }

    /// Add a string element (common case).
    pub fn add_str(&mut self, s: &str) {
        self.add(&s);
    }

    /// Add a pre-computed 64-bit hash.
    pub fn add_hash(&mut self, hash: u64) {
        // Use first `precision` bits as register index
        let register_idx = (hash >> (64 - self.precision)) as usize;
        
        // Count leading zeros in remaining bits
        let remaining = (hash << self.precision) | (1 << (self.precision - 1));
        let leading_zeros = remaining.leading_zeros() as u8 + 1;
        
        // Store max(current, new leading zeros)
        if leading_zeros > self.registers[register_idx] {
            self.registers[register_idx] = leading_zeros;
        }
    }

    /// Estimate the cardinality (number of distinct elements).
    pub fn count(&self) -> u64 {
        let m = self.num_registers as f64;
        
        // Compute harmonic mean of 2^(-register)
        let mut sum = 0.0;
        let mut zeros = 0;
        
        for &register in &self.registers {
            sum += 2.0_f64.powi(-(register as i32));
            if register == 0 {
                zeros += 1;
            }
        }
        
        // Alpha correction factor (depends on number of registers)
        let alpha = self.alpha();
        
        // Raw estimate
        let raw_estimate = alpha * m * m / sum;
        
        // Small range correction (linear counting)
        if raw_estimate <= 2.5 * m && zeros > 0 {
            return (m * (m / zeros as f64).ln()).round() as u64;
        }
        
        // Large range correction (32-bit hash saturation)
        // Not needed for 64-bit hashes, but included for completeness
        let pow_32 = 2.0_f64.powi(32);
        if raw_estimate > pow_32 / 30.0 {
            return (-pow_32 * (1.0 - raw_estimate / pow_32).ln()).round() as u64;
        }
        
        raw_estimate.round() as u64
    }

    /// Get the standard error rate for this precision.
    pub fn error_rate(&self) -> f64 {
        1.04 / (self.num_registers as f64).sqrt()
    }

    /// Merge another HyperLogLog into this one.
    ///
    /// After merging, this HLL represents the union of both sets.
    /// The other HLL must have the same precision.
    pub fn merge(&mut self, other: &HyperLogLog) -> Result<(), HllError> {
        if self.precision != other.precision {
            return Err(HllError::PrecisionMismatch {
                expected: self.precision,
                got: other.precision,
            });
        }
        
        for i in 0..self.num_registers {
            if other.registers[i] > self.registers[i] {
                self.registers[i] = other.registers[i];
            }
        }
        
        Ok(())
    }

    /// Create a new HLL that is the union of two HLLs.
    pub fn union(&self, other: &HyperLogLog) -> Result<HyperLogLog, HllError> {
        let mut result = self.clone();
        result.merge(other)?;
        Ok(result)
    }

    /// Reset the HLL to empty state.
    pub fn clear(&mut self) {
        self.registers.fill(0);
    }

    /// Check if the HLL is empty (no elements added).
    pub fn is_empty(&self) -> bool {
        self.registers.iter().all(|&r| r == 0)
    }

    /// Get the precision (number of bits).
    pub fn precision(&self) -> u8 {
        self.precision
    }

    /// Get the number of registers.
    pub fn num_registers(&self) -> usize {
        self.num_registers
    }

    /// Get memory usage in bytes.
    pub fn memory_bytes(&self) -> usize {
        self.registers.len()
    }

    /// Serialize to bytes for storage/transmission.
    pub fn to_bytes(&self) -> Vec<u8> {
        let mut bytes = Vec::with_capacity(1 + self.registers.len());
        bytes.push(self.precision);
        bytes.extend_from_slice(&self.registers);
        bytes
    }

    /// Deserialize from bytes.
    pub fn from_bytes(bytes: &[u8]) -> Result<Self, HllError> {
        if bytes.is_empty() {
            return Err(HllError::InvalidData("Empty byte array".into()));
        }
        
        let precision = bytes[0];
        if precision < MIN_PRECISION || precision > MAX_PRECISION {
            return Err(HllError::InvalidPrecision(precision));
        }
        
        let expected_len = 1 + (1 << precision);
        if bytes.len() != expected_len {
            return Err(HllError::InvalidData(format!(
                "Expected {} bytes, got {}",
                expected_len,
                bytes.len()
            )));
        }
        
        Ok(Self {
            precision,
            num_registers: 1 << precision,
            registers: bytes[1..].to_vec(),
        })
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private Methods
    // ─────────────────────────────────────────────────────────────────────────

    fn hash_item<T: Hash>(&self, item: &T) -> u64 {
        let mut hasher = DefaultHasher::new();
        item.hash(&mut hasher);
        hasher.finish()
    }

    fn alpha(&self) -> f64 {
        match self.num_registers {
            16 => 0.673,
            32 => 0.697,
            64 => 0.709,
            _ => 0.7213 / (1.0 + 1.079 / self.num_registers as f64),
        }
    }
}

impl Default for HyperLogLog {
    fn default() -> Self {
        Self::default_precision()
    }
}

impl std::fmt::Debug for HyperLogLog {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("HyperLogLog")
            .field("precision", &self.precision)
            .field("num_registers", &self.num_registers)
            .field("estimated_count", &self.count())
            .field("memory_bytes", &self.memory_bytes())
            .finish()
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────────────────

/// Errors that can occur during HLL operations.
#[derive(Debug, Clone, thiserror::Error)]
pub enum HllError {
    #[error("Precision mismatch: expected {expected}, got {got}")]
    PrecisionMismatch { expected: u8, got: u8 },
    
    #[error("Invalid precision: {0} (must be 4-18)")]
    InvalidPrecision(u8),
    
    #[error("Invalid data: {0}")]
    InvalidData(String),
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/// Hash a string using SHA-256 and return a 64-bit hash.
/// Useful for consistent hashing across different systems.
pub fn hash_string_sha256(s: &str) -> u64 {
    let mut hasher = Sha256::new();
    hasher.update(s.as_bytes());
    let result = hasher.finalize();
    
    // Take first 8 bytes as u64
    let bytes: [u8; 8] = result[0..8].try_into().unwrap();
    u64::from_be_bytes(bytes)
}

/// Create an HLL and add multiple items at once.
pub fn count_unique<T: Hash>(items: impl IntoIterator<Item = T>) -> HyperLogLog {
    let mut hll = HyperLogLog::default();
    for item in items {
        hll.add(&item);
    }
    hll
}

/// Estimate the intersection size of two HLLs using inclusion-exclusion.
/// Note: This is an approximation and less accurate than union.
pub fn estimate_intersection(a: &HyperLogLog, b: &HyperLogLog) -> Result<u64, HllError> {
    let union = a.union(b)?;
    let count_a = a.count();
    let count_b = b.count();
    let count_union = union.count();
    
    // |A ∩ B| = |A| + |B| - |A ∪ B|
    let intersection = (count_a + count_b).saturating_sub(count_union);
    Ok(intersection)
}

/// Estimate the Jaccard similarity of two HLLs.
/// Returns a value between 0.0 and 1.0.
pub fn estimate_jaccard(a: &HyperLogLog, b: &HyperLogLog) -> Result<f64, HllError> {
    let union = a.union(b)?;
    let count_union = union.count();
    
    if count_union == 0 {
        return Ok(1.0); // Both empty
    }
    
    let intersection = estimate_intersection(a, b)?;
    Ok(intersection as f64 / count_union as f64)
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_empty_hll() {
        let hll = HyperLogLog::new(12);
        assert_eq!(hll.count(), 0);
        assert!(hll.is_empty());
    }

    #[test]
    fn test_single_element() {
        let mut hll = HyperLogLog::new(14);
        hll.add_str("hello");
        
        // Single element should give count close to 1
        let count = hll.count();
        assert!(count >= 1, "Expected at least 1, got {}", count);
        assert!(!hll.is_empty());
    }

    #[test]
    fn test_duplicates_ignored() {
        let mut hll = HyperLogLog::new(14);
        
        for _ in 0..100 {
            hll.add_str("same");
        }
        
        // Should still estimate ~1
        let count = hll.count();
        assert!(count <= 3, "Expected ~1, got {} (duplicates not ignored)", count);
    }

    #[test]
    fn test_many_unique_elements() {
        let mut hll = HyperLogLog::new(14);
        let n = 10000;
        
        for i in 0..n {
            hll.add(&i);
        }
        
        let count = hll.count();
        let error = (count as f64 - n as f64).abs() / n as f64;
        
        // Should be within ~5% for 14-bit precision (theoretical ~0.8%)
        assert!(
            error < 0.05,
            "Expected ~{}, got {} (error: {:.2}%)",
            n, count, error * 100.0
        );
    }

    #[test]
    fn test_merge() {
        let mut hll1 = HyperLogLog::new(12);
        let mut hll2 = HyperLogLog::new(12);
        
        for i in 0..1000 {
            hll1.add(&i);
        }
        
        for i in 500..1500 {
            hll2.add(&i);
        }
        
        hll1.merge(&hll2).unwrap();
        
        // Should have ~1500 unique elements
        let count = hll1.count();
        let error = (count as f64 - 1500.0).abs() / 1500.0;
        
        assert!(
            error < 0.10,
            "Expected ~1500, got {} (error: {:.2}%)",
            count, error * 100.0
        );
    }

    #[test]
    fn test_precision_mismatch() {
        let hll1 = HyperLogLog::new(12);
        let hll2 = HyperLogLog::new(14);
        
        let mut hll1_clone = hll1.clone();
        let result = hll1_clone.merge(&hll2);
        
        assert!(result.is_err());
    }

    #[test]
    fn test_serialization() {
        let mut hll = HyperLogLog::new(12);
        for i in 0..1000 {
            hll.add(&i);
        }
        
        let bytes = hll.to_bytes();
        let restored = HyperLogLog::from_bytes(&bytes).unwrap();
        
        assert_eq!(hll.precision(), restored.precision());
        assert_eq!(hll.count(), restored.count());
    }

    #[test]
    fn test_error_rate() {
        let hll12 = HyperLogLog::new(12);
        let hll14 = HyperLogLog::new(14);
        let hll16 = HyperLogLog::new(16);
        
        assert!(hll12.error_rate() > hll14.error_rate());
        assert!(hll14.error_rate() > hll16.error_rate());
        assert!((hll14.error_rate() - 0.008).abs() < 0.001);
    }
}
