//! # Verified Triad
//!
//! Computation-constrained synthesis for AI code analysis.
//!
//! ## The Problem
//!
//! AI agents hallucinate relationships when synthesizing code audits.
//! They correctly retrieve individual facts but fabricate connections:
//!
//! ```text
//! Retrieval (works):  "File A contains validateEmail()"
//! Retrieval (works):  "File B contains checkEmail()"
//! Synthesis (fails):  "These are 95% similar" ← Hallucinated
//! ```
//!
//! ## The Solution
//!
//! Verified Triad requires computed evidence before allowing claims:
//!
//! ```text
//! compute(similarity) → register(result) → claim(duplication) → check(registry) → allow|block
//! ```
//!
//! ## Usage
//!
//! ```rust,ignore
//! use verified_triad::{VerifiedTriad, DryViolation};
//!
//! let mut vt = VerifiedTriad::new("./vt.db")?;
//!
//! // First, compute similarity (required)
//! let evidence = vt.compute_similarity("src/utils.ts", "lib/utils.ts")?;
//!
//! // Then, make a claim (will be validated against registry)
//! let claim = vt.claim_dry_violation(
//!     "src/utils.ts",
//!     "lib/utils.ts",
//!     "Duplicate validation logic"
//! )?;
//! // → Returns Ok(DryViolation) if evidence exists and meets threshold
//! // → Returns Err(ClaimRejected) if no evidence or below threshold
//! ```
//!
//! ## The Subtractive Triad
//!
//! This tool operationalizes the Subtractive Triad methodology:
//!
//! | Level | Question | Computation Required |
//! |-------|----------|---------------------|
//! | DRY | "Have I built this before?" | `compute_similarity()` |
//! | Rams | "Does this earn existence?" | `count_usages()` |
//! | Heidegger | "Does this serve the whole?" | `analyze_connectivity()` |

pub mod computations;
pub mod registry;
pub mod claims;
pub mod mcp;
pub mod exceptions;

use std::path::Path;
use thiserror::Error;

pub use computations::{SimilarityEvidence, UsageEvidence, ConnectivityEvidence};
pub use registry::VerificationRegistry;
pub use claims::{DryViolation, ExistenceClaim, ConnectivityClaim, ClaimRejected};

/// Configuration for claim thresholds
#[derive(Debug, Clone)]
pub struct TriadThresholds {
    /// Minimum similarity for DRY violation claim (0.0 - 1.0)
    pub dry_similarity: f64,
    /// Minimum usage count to "earn existence"
    pub rams_min_usage: u32,
    /// Minimum connections to "serve the whole"
    pub heidegger_min_connections: u32,
}

impl Default for TriadThresholds {
    fn default() -> Self {
        Self {
            dry_similarity: 0.80,
            rams_min_usage: 1,
            heidegger_min_connections: 1,
        }
    }
}

/// Main entry point for Verified Triad
pub struct VerifiedTriad {
    registry: VerificationRegistry,
    thresholds: TriadThresholds,
}

#[derive(Error, Debug)]
pub enum VerifiedTriadError {
    #[error("Registry error: {0}")]
    Registry(#[from] registry::RegistryError),
    
    #[error("Computation error: {0}")]
    Computation(#[from] computations::ComputationError),
    
    #[error("Claim rejected: {0}")]
    ClaimRejected(#[from] ClaimRejected),
    
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

impl VerifiedTriad {
    /// Create a new Verified Triad instance with SQLite-backed registry
    pub fn new(db_path: impl AsRef<Path>) -> Result<Self, VerifiedTriadError> {
        let registry = VerificationRegistry::new(db_path)?;
        Ok(Self {
            registry,
            thresholds: TriadThresholds::default(),
        })
    }
    
    /// Create with custom thresholds
    pub fn with_thresholds(
        db_path: impl AsRef<Path>,
        thresholds: TriadThresholds,
    ) -> Result<Self, VerifiedTriadError> {
        let registry = VerificationRegistry::new(db_path)?;
        Ok(Self { registry, thresholds })
    }
    
    /// Compute similarity between two files (DRY level)
    pub fn compute_similarity(
        &mut self,
        file_a: impl AsRef<Path>,
        file_b: impl AsRef<Path>,
    ) -> Result<SimilarityEvidence, VerifiedTriadError> {
        let evidence = computations::compute_similarity(file_a.as_ref(), file_b.as_ref())?;
        self.registry.record_similarity(&evidence)?;
        Ok(evidence)
    }
    
    /// Count usages of a symbol (Rams level)
    pub fn count_usages(
        &mut self,
        symbol: &str,
        search_path: impl AsRef<Path>,
    ) -> Result<UsageEvidence, VerifiedTriadError> {
        let evidence = computations::count_usages(symbol, search_path.as_ref())?;
        self.registry.record_usage(&evidence)?;
        Ok(evidence)
    }
    
    /// Analyze connectivity of a module (Heidegger level)
    pub fn analyze_connectivity(
        &mut self,
        module_path: impl AsRef<Path>,
    ) -> Result<ConnectivityEvidence, VerifiedTriadError> {
        let evidence = computations::analyze_connectivity(module_path.as_ref())?;
        self.registry.record_connectivity(&evidence)?;
        Ok(evidence)
    }
    
    /// Claim a DRY violation (requires prior similarity computation)
    pub fn claim_dry_violation(
        &self,
        file_a: impl AsRef<Path>,
        file_b: impl AsRef<Path>,
        reason: impl Into<String>,
    ) -> Result<DryViolation, VerifiedTriadError> {
        let evidence = self.registry.get_similarity(file_a.as_ref(), file_b.as_ref())?
            .ok_or_else(|| ClaimRejected::NoEvidence {
                claim_type: "DRY violation".to_string(),
                suggestion: format!(
                    "Run: vt compute similarity {:?} {:?}",
                    file_a.as_ref(),
                    file_b.as_ref()
                ),
            })?;
        
        DryViolation::from_evidence(evidence, reason.into(), self.thresholds.dry_similarity)
            .map_err(VerifiedTriadError::ClaimRejected)
    }
    
    /// Claim something doesn't earn existence (requires prior usage computation)
    pub fn claim_no_existence(
        &self,
        symbol: &str,
        reason: impl Into<String>,
    ) -> Result<ExistenceClaim, VerifiedTriadError> {
        let evidence = self.registry.get_usage(symbol)?
            .ok_or_else(|| ClaimRejected::NoEvidence {
                claim_type: "existence".to_string(),
                suggestion: format!("Run: vt compute usages {}", symbol),
            })?;
        
        ExistenceClaim::from_evidence(evidence, reason.into(), self.thresholds.rams_min_usage)
            .map_err(VerifiedTriadError::ClaimRejected)
    }
    
    /// Claim a module is disconnected (requires prior connectivity computation)
    pub fn claim_disconnection(
        &self,
        module_path: impl AsRef<Path>,
        reason: impl Into<String>,
    ) -> Result<ConnectivityClaim, VerifiedTriadError> {
        let evidence = self.registry.get_connectivity(module_path.as_ref())?
            .ok_or_else(|| ClaimRejected::NoEvidence {
                claim_type: "disconnection".to_string(),
                suggestion: format!("Run: vt compute connectivity {:?}", module_path.as_ref()),
            })?;
        
        ConnectivityClaim::from_evidence(
            evidence,
            reason.into(),
            self.thresholds.heidegger_min_connections,
        ).map_err(VerifiedTriadError::ClaimRejected)
    }
    
    /// Get current thresholds
    pub fn thresholds(&self) -> &TriadThresholds {
        &self.thresholds
    }
    
    /// Update thresholds
    pub fn set_thresholds(&mut self, thresholds: TriadThresholds) {
        self.thresholds = thresholds;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    
    #[test]
    fn test_claim_without_computation_is_rejected() {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("test.db");
        let vt = VerifiedTriad::new(&db_path).unwrap();
        
        // Attempt to claim without computing first
        let result = vt.claim_dry_violation("a.ts", "b.ts", "looks similar");
        
        assert!(result.is_err());
        match result.unwrap_err() {
            VerifiedTriadError::ClaimRejected(ClaimRejected::NoEvidence { .. }) => {}
            _ => panic!("Expected NoEvidence error"),
        }
    }
}
