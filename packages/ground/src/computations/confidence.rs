//! Bayesian Confidence Scoring
//!
//! Computes confidence scores for findings to enable autonomous agent decisions.
//! Instead of binary "dead/not dead", provides probabilities with explanations.
//!
//! ## Use Cases
//! - Agent auto-fixes high confidence (>90%) findings
//! - Agent flags medium confidence (50-90%) for review
//! - Agent skips low confidence (<50%) as likely false positives
//!
//! ## Bayesian Approach
//! P(Dead | Evidence) = P(Evidence | Dead) * P(Dead) / P(Evidence)
//!
//! Evidence includes: import count, export usage, file location, naming patterns, etc.

use serde::{Serialize, Deserialize};

/// Threshold for auto-fix decisions
pub const AUTO_FIX_THRESHOLD: f64 = 0.90;

/// Threshold for flagging for review
pub const REVIEW_THRESHOLD: f64 = 0.50;

/// A factor contributing to confidence
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfidenceFactor {
    /// Name of the factor
    pub name: String,
    
    /// Description of what this factor means
    pub description: String,
    
    /// Weight contribution (positive = increases confidence, negative = decreases)
    pub weight: f64,
    
    /// Raw value that led to this weight
    pub raw_value: Option<f64>,
}

/// Confidence score for a finding
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfidenceScore {
    /// Overall confidence (0.0 - 1.0)
    pub score: f64,
    
    /// Whether this is safe for auto-fix
    pub safe_to_auto_fix: bool,
    
    /// Whether this needs human review
    pub needs_review: bool,
    
    /// Individual factors contributing to score
    pub factors: Vec<ConfidenceFactor>,
    
    /// Human-readable explanation
    pub explanation: String,
    
    /// Recommended action
    pub recommended_action: RecommendedAction,
}

/// Recommended action based on confidence
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum RecommendedAction {
    /// Automatically apply the fix
    AutoFix,
    /// Flag for human review
    FlagForReview,
    /// Skip - likely false positive
    Skip,
    /// Investigate further before deciding
    Investigate,
}

impl RecommendedAction {
    pub fn as_str(&self) -> &'static str {
        match self {
            RecommendedAction::AutoFix => "auto-fix",
            RecommendedAction::FlagForReview => "flag-for-review",
            RecommendedAction::Skip => "skip",
            RecommendedAction::Investigate => "investigate",
        }
    }
}

/// Builder for computing confidence scores
#[derive(Debug, Clone)]
pub struct ConfidenceBuilder {
    factors: Vec<ConfidenceFactor>,
    base_rate: f64,
}

impl ConfidenceBuilder {
    /// Create a new builder with default base rate
    pub fn new() -> Self {
        Self {
            factors: Vec::new(),
            base_rate: 0.5, // 50% prior
        }
    }
    
    /// Set the base rate (prior probability)
    pub fn with_base_rate(mut self, rate: f64) -> Self {
        self.base_rate = rate.clamp(0.01, 0.99);
        self
    }
    
    /// Add a factor
    pub fn add_factor(mut self, name: &str, description: &str, weight: f64) -> Self {
        self.factors.push(ConfidenceFactor {
            name: name.to_string(),
            description: description.to_string(),
            weight,
            raw_value: None,
        });
        self
    }
    
    /// Add a factor with raw value
    pub fn add_factor_with_value(
        mut self,
        name: &str,
        description: &str,
        weight: f64,
        raw_value: f64,
    ) -> Self {
        self.factors.push(ConfidenceFactor {
            name: name.to_string(),
            description: description.to_string(),
            weight,
            raw_value: Some(raw_value),
        });
        self
    }
    
    /// Build the confidence score
    pub fn build(self) -> ConfidenceScore {
        // Sum all weights
        let total_weight: f64 = self.factors.iter().map(|f| f.weight).sum();
        
        // Convert to log-odds, apply weights, convert back
        let log_odds = (self.base_rate / (1.0 - self.base_rate)).ln();
        let adjusted_log_odds = log_odds + total_weight;
        let score = 1.0 / (1.0 + (-adjusted_log_odds).exp());
        
        // Clamp to valid range
        let score = score.clamp(0.001, 0.999);
        
        let safe_to_auto_fix = score >= AUTO_FIX_THRESHOLD;
        let needs_review = score >= REVIEW_THRESHOLD && score < AUTO_FIX_THRESHOLD;
        
        let recommended_action = if score >= AUTO_FIX_THRESHOLD {
            RecommendedAction::AutoFix
        } else if score >= 0.70 {
            RecommendedAction::FlagForReview
        } else if score >= REVIEW_THRESHOLD {
            RecommendedAction::Investigate
        } else {
            RecommendedAction::Skip
        };
        
        let explanation = generate_explanation(&self.factors, score, recommended_action);
        
        ConfidenceScore {
            score,
            safe_to_auto_fix,
            needs_review,
            factors: self.factors,
            explanation,
            recommended_action,
        }
    }
}

impl Default for ConfidenceBuilder {
    fn default() -> Self {
        Self::new()
    }
}

fn generate_explanation(
    factors: &[ConfidenceFactor],
    score: f64,
    action: RecommendedAction,
) -> String {
    let mut positive: Vec<&ConfidenceFactor> = factors.iter()
        .filter(|f| f.weight > 0.0)
        .collect();
    let mut negative: Vec<&ConfidenceFactor> = factors.iter()
        .filter(|f| f.weight < 0.0)
        .collect();
    
    positive.sort_by(|a, b| b.weight.partial_cmp(&a.weight).unwrap_or(std::cmp::Ordering::Equal));
    negative.sort_by(|a, b| a.weight.partial_cmp(&b.weight).unwrap_or(std::cmp::Ordering::Equal));
    
    let mut parts = Vec::new();
    
    parts.push(format!(
        "Confidence: {:.0}% - {}",
        score * 100.0,
        action.as_str()
    ));
    
    if !positive.is_empty() {
        let top_positive: Vec<String> = positive.iter()
            .take(3)
            .map(|f| f.description.clone())
            .collect();
        parts.push(format!("Evidence for: {}", top_positive.join(", ")));
    }
    
    if !negative.is_empty() {
        let top_negative: Vec<String> = negative.iter()
            .take(3)
            .map(|f| f.description.clone())
            .collect();
        parts.push(format!("Evidence against: {}", top_negative.join(", ")));
    }
    
    parts.join(". ")
}

// ============================================================================
// Specific confidence calculators for different finding types
// ============================================================================

/// Confidence for orphan module detection
pub fn orphan_confidence(
    incoming_imports: u32,
    outgoing_imports: u32,
    is_entry_point: bool,
    is_test_file: bool,
    is_config_file: bool,
    has_architectural_connections: bool,
    pagerank_percentile: Option<f64>,
    framework_implicit_entry: bool,
) -> ConfidenceScore {
    let mut builder = ConfidenceBuilder::new()
        .with_base_rate(0.3); // Prior: 30% of flagged modules are truly orphaned
    
    // Strong positive evidence (truly orphaned)
    if incoming_imports == 0 {
        builder = builder.add_factor_with_value(
            "no_incoming_imports",
            "No other modules import this",
            0.8,
            0.0,
        );
    }
    
    // Strong negative evidence (not orphaned)
    if is_entry_point {
        builder = builder.add_factor(
            "is_entry_point",
            "Configured as package entry point",
            -1.5,
        );
    }
    
    if is_test_file {
        builder = builder.add_factor(
            "is_test_file",
            "Test files are entry points by convention",
            -1.2,
        );
    }
    
    if is_config_file {
        builder = builder.add_factor(
            "is_config_file",
            "Config files are loaded by tooling",
            -1.0,
        );
    }
    
    if has_architectural_connections {
        builder = builder.add_factor(
            "architectural_connections",
            "Has Worker/serverless connections",
            -1.0,
        );
    }
    
    if framework_implicit_entry {
        builder = builder.add_factor(
            "framework_implicit_entry",
            "Framework convention entry point",
            -1.5,
        );
    }
    
    // Moderate evidence
    if outgoing_imports == 0 {
        builder = builder.add_factor(
            "no_outgoing_imports",
            "Doesn't import anything (likely standalone)",
            0.3,
        );
    } else {
        builder = builder.add_factor_with_value(
            "has_outgoing_imports",
            "Imports other modules (active code)",
            -0.2,
            outgoing_imports as f64,
        );
    }
    
    // PageRank evidence
    if let Some(percentile) = pagerank_percentile {
        let weight = if percentile < 10.0 {
            0.3 // Low importance
        } else if percentile > 50.0 {
            -0.3 // Moderate importance
        } else if percentile > 80.0 {
            -0.6 // High importance
        } else {
            0.0
        };
        
        builder = builder.add_factor_with_value(
            "pagerank",
            &format!("PageRank percentile: {:.0}%", percentile),
            weight,
            percentile,
        );
    }
    
    builder.build()
}

/// Confidence for dead export detection
pub fn dead_export_confidence(
    usage_count: u32,
    type_only_usage_count: u32,
    re_exported: bool,
    is_public_api: bool,
    in_barrel_file: bool,
) -> ConfidenceScore {
    let mut builder = ConfidenceBuilder::new()
        .with_base_rate(0.4); // Prior: 40% of flagged exports are truly dead
    
    // Strong positive evidence (truly dead)
    if usage_count == 0 && type_only_usage_count == 0 {
        builder = builder.add_factor(
            "zero_usage",
            "Not used anywhere in codebase",
            1.0,
        );
    } else if usage_count == 0 && type_only_usage_count > 0 {
        builder = builder.add_factor_with_value(
            "type_only_usage",
            "Only used as type (may be intentional)",
            0.2,
            type_only_usage_count as f64,
        );
    }
    
    // Strong negative evidence (not dead)
    if re_exported {
        builder = builder.add_factor(
            "re_exported",
            "Re-exported from another module",
            -0.8,
        );
    }
    
    if is_public_api {
        builder = builder.add_factor(
            "public_api",
            "Part of public package API",
            -1.0,
        );
    }
    
    if in_barrel_file {
        builder = builder.add_factor(
            "barrel_file",
            "In index/barrel file (public surface)",
            -0.5,
        );
    }
    
    // Moderate evidence
    if usage_count == 1 {
        builder = builder.add_factor_with_value(
            "single_usage",
            "Only one usage (could be removable)",
            0.2,
            1.0,
        );
    } else if usage_count > 5 {
        builder = builder.add_factor_with_value(
            "multiple_usages",
            "Used multiple times",
            -0.5,
            usage_count as f64,
        );
    }
    
    builder.build()
}

/// Confidence for duplicate code detection
pub fn duplicate_confidence(
    similarity: f64,
    function_lines: u32,
    same_package: bool,
    similar_names: bool,
    identical_structure: bool,
) -> ConfidenceScore {
    let mut builder = ConfidenceBuilder::new()
        .with_base_rate(0.5); // Prior: 50% of flagged duplicates are actionable
    
    // Strong positive evidence (true duplicate)
    if similarity >= 0.95 {
        builder = builder.add_factor_with_value(
            "very_high_similarity",
            "95%+ similar (near identical)",
            1.2,
            similarity,
        );
    } else if similarity >= 0.85 {
        builder = builder.add_factor_with_value(
            "high_similarity",
            "85%+ similar (strong duplicate)",
            0.6,
            similarity,
        );
    } else if similarity >= 0.70 {
        builder = builder.add_factor_with_value(
            "moderate_similarity",
            "70%+ similar (possible duplicate)",
            0.2,
            similarity,
        );
    }
    
    if identical_structure {
        builder = builder.add_factor(
            "identical_structure",
            "Identical code structure (AST match)",
            0.8,
        );
    }
    
    // Strong negative evidence (not actionable)
    if function_lines < 5 {
        builder = builder.add_factor_with_value(
            "trivial_function",
            "Very short function (may be coincidental)",
            -0.6,
            function_lines as f64,
        );
    }
    
    if !same_package {
        builder = builder.add_factor(
            "cross_package",
            "Different packages (may be intentional)",
            -0.3,
        );
    }
    
    // Moderate evidence
    if similar_names {
        builder = builder.add_factor(
            "similar_names",
            "Similar function names",
            0.3,
        );
    }
    
    if function_lines >= 20 {
        builder = builder.add_factor_with_value(
            "substantial_function",
            "Substantial function size",
            0.3,
            function_lines as f64,
        );
    }
    
    builder.build()
}

/// Confidence for environment safety issues
pub fn environment_safety_confidence(
    api_name: &str,
    in_conditional: bool,
    has_fallback: bool,
    import_chain_length: u32,
) -> ConfidenceScore {
    let mut builder = ConfidenceBuilder::new()
        .with_base_rate(0.6); // Prior: 60% of flagged issues are real
    
    // API-specific confidence
    let api_confidence = match api_name {
        "caches" | "globalThis.caches" => 0.8,
        "env.KV" | "env.D1" | "env.R2" => 0.9,
        "process.env" => 0.4, // Often polyfilled
        "fs" | "path" => 0.7,
        _ => 0.5,
    };
    
    builder = builder.add_factor_with_value(
        "api_type",
        &format!("API: {} (environment-specific)", api_name),
        (api_confidence - 0.5) * 2.0, // Scale to weight
        api_confidence,
    );
    
    // Strong negative evidence
    if in_conditional {
        builder = builder.add_factor(
            "conditional_usage",
            "Used inside environment check",
            -0.8,
        );
    }
    
    if has_fallback {
        builder = builder.add_factor(
            "has_fallback",
            "Has fallback for missing API",
            -0.6,
        );
    }
    
    // Moderate evidence
    if import_chain_length > 3 {
        builder = builder.add_factor_with_value(
            "deep_import_chain",
            "Deep import chain (harder to track)",
            0.2,
            import_chain_length as f64,
        );
    }
    
    builder.build()
}

/// Aggregate confidence from multiple findings
pub fn aggregate_confidence(scores: &[ConfidenceScore]) -> ConfidenceScore {
    if scores.is_empty() {
        return ConfidenceBuilder::new().with_base_rate(0.0).build();
    }
    
    // Use geometric mean for aggregation (handles varied scales better)
    let product: f64 = scores.iter().map(|s| s.score).product();
    let aggregate = product.powf(1.0 / scores.len() as f64);
    
    // Collect all factors
    let all_factors: Vec<ConfidenceFactor> = scores.iter()
        .flat_map(|s| s.factors.clone())
        .collect();
    
    let safe_to_auto_fix = aggregate >= AUTO_FIX_THRESHOLD;
    let needs_review = aggregate >= REVIEW_THRESHOLD && aggregate < AUTO_FIX_THRESHOLD;
    
    let recommended_action = if safe_to_auto_fix {
        RecommendedAction::AutoFix
    } else if aggregate >= 0.70 {
        RecommendedAction::FlagForReview
    } else if aggregate >= REVIEW_THRESHOLD {
        RecommendedAction::Investigate
    } else {
        RecommendedAction::Skip
    };
    
    ConfidenceScore {
        score: aggregate,
        safe_to_auto_fix,
        needs_review,
        factors: all_factors,
        explanation: format!(
            "Aggregate confidence: {:.0}% from {} findings - {}",
            aggregate * 100.0,
            scores.len(),
            recommended_action.as_str()
        ),
        recommended_action,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_orphan_high_confidence() {
        let score = orphan_confidence(
            0,     // no incoming imports
            0,     // no outgoing imports
            false, // not entry point
            false, // not test file
            false, // not config file
            false, // no architectural connections
            Some(5.0), // low pagerank
            false, // not framework entry
        );
        
        // With positive evidence (no imports, low pagerank), should have elevated confidence
        assert!(score.score > 0.5, "Score was {}", score.score);
        // Should recommend investigation or review, not skip
        assert!(score.recommended_action != RecommendedAction::Skip);
    }
    
    #[test]
    fn test_orphan_low_confidence_entry_point() {
        let score = orphan_confidence(
            0,     // no incoming imports
            5,     // has outgoing imports
            true,  // IS entry point
            false, // not test file
            false, // not config file
            false, // no architectural connections
            None,  // no pagerank
            false, // not framework entry
        );
        
        assert!(score.score < 0.3);
        assert_eq!(score.recommended_action, RecommendedAction::Skip);
    }
    
    #[test]
    fn test_orphan_low_confidence_framework_entry() {
        let score = orphan_confidence(
            0,     // no incoming imports
            0,     // no outgoing imports
            false, // not entry point
            false, // not test file
            false, // not config file
            false, // no architectural connections
            None,  // no pagerank
            true,  // IS framework implicit entry
        );
        
        assert!(score.score < 0.4);
        assert_eq!(score.recommended_action, RecommendedAction::Skip);
    }
    
    #[test]
    fn test_duplicate_high_confidence() {
        let score = duplicate_confidence(
            0.98,  // very high similarity
            30,    // substantial function
            true,  // same package
            true,  // similar names
            true,  // identical structure
        );
        
        assert!(score.score > 0.9);
        assert!(score.safe_to_auto_fix);
        assert_eq!(score.recommended_action, RecommendedAction::AutoFix);
    }
    
    #[test]
    fn test_duplicate_low_confidence_trivial() {
        let score = duplicate_confidence(
            0.85,  // high similarity
            3,     // trivial function
            false, // different packages
            false, // different names
            false, // different structure
        );
        
        assert!(score.score < 0.5);
        assert_eq!(score.recommended_action, RecommendedAction::Skip);
    }
    
    #[test]
    fn test_dead_export_confidence() {
        let score = dead_export_confidence(
            0,     // no usage
            0,     // no type usage
            false, // not re-exported
            false, // not public api
            false, // not barrel file
        );
        
        // With strong positive evidence (zero usage), should have elevated confidence
        assert!(score.score > 0.5, "Score was {}", score.score);
    }
    
    #[test]
    fn test_dead_export_public_api() {
        let score = dead_export_confidence(
            0,     // no usage
            0,     // no type usage
            false, // not re-exported
            true,  // IS public api
            true,  // IS barrel file
        );
        
        assert!(score.score < 0.4);
    }
    
    #[test]
    fn test_aggregate_confidence() {
        let scores = vec![
            ConfidenceBuilder::new().with_base_rate(0.9).build(),
            ConfidenceBuilder::new().with_base_rate(0.8).build(),
            ConfidenceBuilder::new().with_base_rate(0.7).build(),
        ];
        
        let aggregate = aggregate_confidence(&scores);
        
        // Geometric mean of 0.9, 0.8, 0.7 ≈ 0.79
        assert!(aggregate.score > 0.7);
        assert!(aggregate.score < 0.9);
    }
    
    #[test]
    fn test_confidence_builder() {
        let score = ConfidenceBuilder::new()
            .with_base_rate(0.5)
            .add_factor("test1", "Test factor 1", 0.5)
            .add_factor("test2", "Test factor 2", -0.3)
            .build();
        
        assert!(score.score > 0.5); // Net positive weight
        assert!(!score.explanation.is_empty());
    }
}
