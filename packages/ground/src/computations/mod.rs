//! Computation Layer
//!
//! This layer computes actual relationships between code artifacts.
//! These computations are the ONLY source of truth for claims.
//!
//! ## Core Computations
//! - Similarity: Compare files for duplicates
//! - Usage: Count symbol usages, find dead exports
//! - Connectivity: Analyze module connections
//!
//! ## Advanced Algorithms (v2.0)
//! - PageRank: Import graph importance scoring
//! - LSH: Locality-sensitive hashing for fast similarity
//! - Reachability: Entry point analysis
//! - Framework: Auto-detect SvelteKit/Next.js/Cloudflare
//! - Confidence: Bayesian scoring for AI-native decisions

mod similarity;
mod usage;
mod connectivity;
pub mod ast_similarity;
pub mod function_dry;
pub mod environment;
pub mod imports;
pub mod hll;
pub mod bloom;

// New algorithms (v2.0)
pub mod pagerank;
pub mod lsh;
pub mod reachability;
pub mod framework;
pub mod confidence;

pub use similarity::{compute_similarity, SimilarityEvidence};
pub use usage::{count_usages, find_dead_exports, UsageEvidence, UsageLocation, UsageType, DeadExport, DeadExportsReport};
pub use connectivity::{analyze_connectivity, ConnectivityEvidence, ArchitecturalConnections, ServiceBinding};
pub use ast_similarity::{extract_fingerprint, compare_fingerprints, AstFingerprint, AstSimilarity};
pub use function_dry::{
    extract_functions, analyze_function_dry, analyze_function_dry_with_options, compare_functions,
    ExtractedFunction, FunctionDryEvidence, FunctionDryReport, FunctionDryOptions, is_test_file,
};
pub use environment::{
    analyze_environment_safety, EnvironmentEvidence, EnvironmentWarning, 
    RuntimeEnvironment, ApiUsage, ImportChain, WarningSeverity,
};
pub use hll::{
    HyperLogLog, HllError, count_unique, estimate_intersection, estimate_jaccard,
    hash_string_sha256, DEFAULT_PRECISION, MIN_PRECISION, MAX_PRECISION,
};
pub use bloom::{
    BloomFilter, BloomError, optimal_params, bloom_from_iter,
    DEFAULT_FP_RATE, MIN_BITS, MAX_BITS,
};

// New algorithm exports (v2.0)
pub use pagerank::{
    ImportGraph, ModuleRank, ModuleClassification, PageRankReport, PageRankStats,
    compute_pagerank, rank_modules, build_import_graph, analyze_pagerank,
    DEFAULT_DAMPING, DEFAULT_ITERATIONS,
};
pub use lsh::{
    MinHashSignature, LshIndex, SimilarityMatch, SimilarityPair,
    create_signature, create_ast_signature, extract_shingles,
    estimate_jaccard as lsh_estimate_jaccard, lsh_probability, optimal_lsh_params,
    DEFAULT_NUM_HASHES, DEFAULT_SHINGLE_SIZE, DEFAULT_NUM_BANDS,
};
pub use reachability::{
    EntryPointType, EntryPoint, ReachabilityStatus, ModuleReachability,
    ReachabilityReport, ReachabilityStats,
    analyze_reachability, find_entry_points,
};
pub use framework::{
    Framework, FrameworkPatterns, PathAlias, ImplicitEntry, FrameworkDetection,
    detect_framework, get_patterns, is_implicit_entry, find_framework_entries,
};
pub use confidence::{
    ConfidenceFactor, ConfidenceScore, RecommendedAction, ConfidenceBuilder,
    orphan_confidence, dead_export_confidence, duplicate_confidence,
    environment_safety_confidence, aggregate_confidence,
    AUTO_FIX_THRESHOLD, REVIEW_THRESHOLD,
};

use thiserror::Error;
use std::path::PathBuf;

#[derive(Error, Debug)]
pub enum ComputationError {
    #[error("File not found: {0}")]
    FileNotFound(PathBuf),
    
    #[error("Parse error in {file}: {message}")]
    ParseError { file: PathBuf, message: String },
    
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("Unsupported language: {0}")]
    UnsupportedLanguage(String),
}
