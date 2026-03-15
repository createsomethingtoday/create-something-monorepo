//! Claim Constraint Layer
//!
//! The NOVEL component that gates claims against computed evidence.
//!
//! Key principle: You CANNOT construct a claim without evidence.
//! In Rust, this is enforced at the type level - illegal states are unrepresentable.

use std::path::PathBuf;
use serde::{Serialize, Deserialize};
use thiserror::Error;
use uuid::Uuid;
use chrono::{DateTime, Utc};

use crate::computations::{SimilarityEvidence, UsageEvidence, ConnectivityEvidence};

/// Reasons a claim can be rejected
#[derive(Error, Debug, Clone, Serialize, Deserialize)]
pub enum ClaimRejected {
    #[error("No evidence found for {claim_type}. {suggestion}")]
    NoEvidence {
        claim_type: String,
        suggestion: String,
    },
    
    #[error("Evidence below threshold: {actual:.2} < {required:.2}")]
    BelowThreshold {
        actual: f64,
        required: f64,
    },
    
    #[error("Evidence contradicts claim: {reason}")]
    EvidenceContradicts {
        reason: String,
    },
}

// =============================================================================
// DRY Violation Claim (Level 1)
// =============================================================================

/// A validated DRY violation claim
///
/// This struct CANNOT be constructed without SimilarityEvidence.
/// The type system enforces computation-before-claim.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DryViolation {
    /// Unique claim identifier
    pub id: Uuid,
    
    /// First file in the duplication
    pub file_a: PathBuf,
    
    /// Second file in the duplication
    pub file_b: PathBuf,
    
    /// Computed similarity (from evidence)
    pub similarity: f64,
    
    /// Human-provided reason for the claim
    pub reason: String,
    
    /// ID of the evidence supporting this claim
    pub evidence_id: Uuid,
    
    /// When this claim was made
    pub claimed_at: DateTime<Utc>,
}

impl DryViolation {
    /// Create a DRY violation claim from computed evidence
    ///
    /// This is the ONLY way to create a DryViolation.
    /// The claim is rejected if evidence doesn't meet threshold.
    pub fn from_evidence(
        evidence: SimilarityEvidence,
        reason: String,
        threshold: f64,
    ) -> Result<Self, ClaimRejected> {
        if evidence.similarity < threshold {
            return Err(ClaimRejected::BelowThreshold {
                actual: evidence.similarity,
                required: threshold,
            });
        }
        
        Ok(Self {
            id: Uuid::new_v4(),
            file_a: evidence.file_a,
            file_b: evidence.file_b,
            similarity: evidence.similarity,
            reason,
            evidence_id: evidence.id,
            claimed_at: Utc::now(),
        })
    }
    
    /// The similarity score that supports this claim
    pub fn similarity(&self) -> f64 {
        self.similarity
    }
}

// =============================================================================
// Existence Claim (Level 2 - Rams)
// =============================================================================

/// A validated claim that something doesn't earn its existence
///
/// CANNOT be constructed without UsageEvidence showing zero (or low) usage.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExistenceClaim {
    /// Unique claim identifier
    pub id: Uuid,
    
    /// The symbol that doesn't earn existence
    pub symbol: String,
    
    /// Computed usage count (from evidence)
    pub usage_count: u32,
    
    /// Human-provided reason for the claim
    pub reason: String,
    
    /// ID of the evidence supporting this claim
    pub evidence_id: Uuid,
    
    /// When this claim was made
    pub claimed_at: DateTime<Utc>,
}

impl ExistenceClaim {
    /// Create an existence claim from computed evidence
    ///
    /// Claims "doesn't earn existence" - rejected if actual_usage >= min_usage
    /// Note: Uses actual_usage_count (not definitions) for validation
    pub fn from_evidence(
        evidence: UsageEvidence,
        reason: String,
        min_usage: u32,
    ) -> Result<Self, ClaimRejected> {
        // Use actual_usage_count, not total usage_count
        // This allows claiming exported-but-unused symbols as dead code
        if evidence.actual_usage_count >= min_usage {
            return Err(ClaimRejected::EvidenceContradicts {
                reason: format!(
                    "'{}' has {} actual usages (plus {} definitions), which meets the minimum of {}",
                    evidence.symbol, evidence.actual_usage_count, evidence.definition_count, min_usage
                ),
            });
        }
        
        Ok(Self {
            id: Uuid::new_v4(),
            symbol: evidence.symbol,
            usage_count: evidence.actual_usage_count, // Store actual uses, not total
            reason,
            evidence_id: evidence.id,
            claimed_at: Utc::now(),
        })
    }
}

// =============================================================================
// Connectivity Claim (Level 3 - Heidegger)
// =============================================================================

/// A validated claim that a module is disconnected from the system
///
/// CANNOT be constructed without ConnectivityEvidence showing isolation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectivityClaim {
    /// Unique claim identifier
    pub id: Uuid,
    
    /// The module that's disconnected
    pub module_path: PathBuf,
    
    /// Number of connections (should be low/zero)
    pub connection_count: u32,
    
    /// Human-provided reason for the claim
    pub reason: String,
    
    /// ID of the evidence supporting this claim
    pub evidence_id: Uuid,
    
    /// When this claim was made
    pub claimed_at: DateTime<Utc>,
}

impl ConnectivityClaim {
    /// Create a connectivity claim from computed evidence
    ///
    /// Claims "doesn't serve the whole" - rejected if connected
    pub fn from_evidence(
        evidence: ConnectivityEvidence,
        reason: String,
        min_connections: u32,
    ) -> Result<Self, ClaimRejected> {
        let total = evidence.total_connections();
        
        if total >= min_connections {
            return Err(ClaimRejected::EvidenceContradicts {
                reason: format!(
                    "'{}' has {} connections ({} in, {} out), meeting minimum of {}",
                    evidence.module_path.display(),
                    total,
                    evidence.incoming_connections,
                    evidence.outgoing_connections,
                    min_connections
                ),
            });
        }
        
        Ok(Self {
            id: Uuid::new_v4(),
            module_path: evidence.module_path,
            connection_count: total,
            reason,
            evidence_id: evidence.id,
            claimed_at: Utc::now(),
        })
    }
}

// =============================================================================
// Claim Report (for output)
// =============================================================================

/// A collection of validated claims from a triad audit
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TriadAuditReport {
    /// DRY violations found (all grounded in similarity computation)
    pub dry_violations: Vec<DryViolation>,
    
    /// Things that don't earn existence (all grounded in usage computation)
    pub existence_issues: Vec<ExistenceClaim>,
    
    /// Disconnected modules (all grounded in connectivity computation)
    pub connectivity_issues: Vec<ConnectivityClaim>,
    
    /// Claims that were BLOCKED (no evidence or below threshold)
    pub rejected_claims: Vec<ClaimRejected>,
    
    /// When this report was generated
    pub generated_at: DateTime<Utc>,
}

impl TriadAuditReport {
    pub fn new() -> Self {
        Self {
            dry_violations: Vec::new(),
            existence_issues: Vec::new(),
            connectivity_issues: Vec::new(),
            rejected_claims: Vec::new(),
            generated_at: Utc::now(),
        }
    }
    
    /// Total number of valid (grounded) claims
    pub fn valid_claim_count(&self) -> usize {
        self.dry_violations.len() + 
        self.existence_issues.len() + 
        self.connectivity_issues.len()
    }
    
    /// Number of blocked claims
    pub fn rejected_count(&self) -> usize {
        self.rejected_claims.len()
    }
}

impl Default for TriadAuditReport {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;
    
    fn mock_similarity_evidence(similarity: f64) -> SimilarityEvidence {
        SimilarityEvidence {
            id: Uuid::new_v4(),
            file_a: PathBuf::from("a.ts"),
            file_b: PathBuf::from("b.ts"),
            similarity,
            token_overlap: similarity,
            line_similarity: similarity,
            ast_similarity: Some(similarity),
            hash_a: "hash_a".to_string(),
            hash_b: "hash_b".to_string(),
            computed_at: Utc::now(),
        }
    }
    
    #[test]
    fn test_dry_claim_allowed_above_threshold() {
        let evidence = mock_similarity_evidence(0.85);
        let claim = DryViolation::from_evidence(evidence, "duplicated".to_string(), 0.80);
        
        assert!(claim.is_ok());
        assert!((claim.unwrap().similarity - 0.85).abs() < 0.001);
    }
    
    #[test]
    fn test_dry_claim_rejected_below_threshold() {
        let evidence = mock_similarity_evidence(0.75);
        let claim = DryViolation::from_evidence(evidence, "duplicated".to_string(), 0.80);
        
        assert!(claim.is_err());
        match claim.unwrap_err() {
            ClaimRejected::BelowThreshold { actual, required } => {
                assert!((actual - 0.75).abs() < 0.001);
                assert!((required - 0.80).abs() < 0.001);
            }
            _ => panic!("Expected BelowThreshold error"),
        }
    }
    
    #[test]
    fn test_existence_claim_requires_low_usage() {
        let evidence = UsageEvidence {
            id: Uuid::new_v4(),
            symbol: "unused".to_string(),
            search_path: PathBuf::from("."),
            usage_count: 0,
            definition_count: 0,
            actual_usage_count: 0,
            type_only_count: 0,
            locations: vec![],
            computed_at: Utc::now(),
        };
        
        let claim = ExistenceClaim::from_evidence(evidence, "not used".to_string(), 1);
        assert!(claim.is_ok());
    }
    
    #[test]
    fn test_existence_claim_rejected_if_used() {
        let evidence = UsageEvidence {
            id: Uuid::new_v4(),
            symbol: "used".to_string(),
            search_path: PathBuf::from("."),
            usage_count: 5,
            definition_count: 1,
            actual_usage_count: 4, // 4 actual uses = rejected
            type_only_count: 0,
            locations: vec![],
            computed_at: Utc::now(),
        };
        
        let claim = ExistenceClaim::from_evidence(evidence, "not used".to_string(), 1);
        assert!(claim.is_err());
    }
    
    #[test]
    fn test_existence_claim_allowed_for_exported_but_unused() {
        // Symbol that's exported (1 definition) but never actually used
        let evidence = UsageEvidence {
            id: Uuid::new_v4(),
            symbol: "ExportedButUnused".to_string(),
            search_path: PathBuf::from("."),
            usage_count: 1,           // 1 total occurrence
            definition_count: 1,       // It's the export definition
            actual_usage_count: 0,     // 0 actual uses!
            type_only_count: 0,
            locations: vec![],
            computed_at: Utc::now(),
        };
        
        // Should be claimable as dead code since actual_usage_count is 0
        let claim = ExistenceClaim::from_evidence(evidence, "exported but never imported".to_string(), 1);
        assert!(claim.is_ok());
        assert_eq!(claim.unwrap().usage_count, 0); // Records actual uses, not total
    }
}
