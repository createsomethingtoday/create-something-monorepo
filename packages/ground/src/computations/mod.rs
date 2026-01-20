//! Computation Layer
//!
//! This layer computes actual relationships between code artifacts.
//! These computations are the ONLY source of truth for claims.

mod similarity;
mod usage;
mod connectivity;
pub mod ast_similarity;
pub mod function_dry;
pub mod environment;

pub use similarity::{compute_similarity, SimilarityEvidence};
pub use usage::{count_usages, UsageEvidence, UsageLocation, UsageType};
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
