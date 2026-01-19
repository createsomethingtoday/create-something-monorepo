//! Computation Layer
//!
//! This layer computes actual relationships between code artifacts.
//! These computations are the ONLY source of truth for claims.

mod similarity;
mod usage;
mod connectivity;
pub mod ast_similarity;

pub use similarity::{compute_similarity, SimilarityEvidence};
pub use usage::{count_usages, UsageEvidence};
pub use connectivity::{analyze_connectivity, ConnectivityEvidence};
pub use ast_similarity::{extract_fingerprint, compare_fingerprints, AstFingerprint, AstSimilarity};

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
