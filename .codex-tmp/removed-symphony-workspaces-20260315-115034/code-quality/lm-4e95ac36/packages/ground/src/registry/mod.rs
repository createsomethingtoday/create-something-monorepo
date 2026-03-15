//! Verification Registry
//!
//! The NOVEL component of Verified Triad.
//!
//! Tracks all computed evidence. Claims are validated against this registry.
//! If evidence doesn't exist for a claim, the claim is BLOCKED.

use std::path::Path;
use rusqlite::{Connection, params};
use thiserror::Error;

use crate::computations::{SimilarityEvidence, UsageEvidence, ConnectivityEvidence};

#[derive(Error, Debug)]
pub enum RegistryError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),
    
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
    
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

/// SQLite-backed verification registry
pub struct VerificationRegistry {
    conn: Connection,
}

impl VerificationRegistry {
    /// Create a new registry with SQLite backing
    pub fn new(db_path: impl AsRef<Path>) -> Result<Self, RegistryError> {
        let conn = Connection::open(db_path)?;
        
        // Create tables
        conn.execute_batch(r#"
            CREATE TABLE IF NOT EXISTS similarity_evidence (
                id TEXT PRIMARY KEY,
                file_a TEXT NOT NULL,
                file_b TEXT NOT NULL,
                similarity REAL NOT NULL,
                token_overlap REAL NOT NULL,
                line_similarity REAL NOT NULL,
                hash_a TEXT NOT NULL,
                hash_b TEXT NOT NULL,
                computed_at TEXT NOT NULL,
                evidence_json TEXT NOT NULL
            );
            
            CREATE INDEX IF NOT EXISTS idx_similarity_files 
            ON similarity_evidence(file_a, file_b);
            
            CREATE TABLE IF NOT EXISTS usage_evidence (
                id TEXT PRIMARY KEY,
                symbol TEXT NOT NULL,
                search_path TEXT NOT NULL,
                usage_count INTEGER NOT NULL,
                computed_at TEXT NOT NULL,
                evidence_json TEXT NOT NULL
            );
            
            CREATE INDEX IF NOT EXISTS idx_usage_symbol 
            ON usage_evidence(symbol);
            
            CREATE TABLE IF NOT EXISTS connectivity_evidence (
                id TEXT PRIMARY KEY,
                module_path TEXT NOT NULL,
                is_connected INTEGER NOT NULL,
                incoming_connections INTEGER NOT NULL,
                outgoing_connections INTEGER NOT NULL,
                computed_at TEXT NOT NULL,
                evidence_json TEXT NOT NULL
            );
            
            CREATE INDEX IF NOT EXISTS idx_connectivity_module 
            ON connectivity_evidence(module_path);
        "#)?;
        
        Ok(Self { conn })
    }
    
    /// Create an in-memory registry (for testing)
    pub fn in_memory() -> Result<Self, RegistryError> {
        let conn = Connection::open_in_memory()?;
        let registry = Self { conn };
        
        // Run the same initialization
        registry.conn.execute_batch(r#"
            CREATE TABLE IF NOT EXISTS similarity_evidence (
                id TEXT PRIMARY KEY,
                file_a TEXT NOT NULL,
                file_b TEXT NOT NULL,
                similarity REAL NOT NULL,
                token_overlap REAL NOT NULL,
                line_similarity REAL NOT NULL,
                hash_a TEXT NOT NULL,
                hash_b TEXT NOT NULL,
                computed_at TEXT NOT NULL,
                evidence_json TEXT NOT NULL
            );
            
            CREATE TABLE IF NOT EXISTS usage_evidence (
                id TEXT PRIMARY KEY,
                symbol TEXT NOT NULL,
                search_path TEXT NOT NULL,
                usage_count INTEGER NOT NULL,
                computed_at TEXT NOT NULL,
                evidence_json TEXT NOT NULL
            );
            
            CREATE TABLE IF NOT EXISTS connectivity_evidence (
                id TEXT PRIMARY KEY,
                module_path TEXT NOT NULL,
                is_connected INTEGER NOT NULL,
                incoming_connections INTEGER NOT NULL,
                outgoing_connections INTEGER NOT NULL,
                computed_at TEXT NOT NULL,
                evidence_json TEXT NOT NULL
            );
        "#)?;
        
        Ok(registry)
    }
    
    // --- Similarity Evidence ---
    
    /// Record similarity computation result
    pub fn record_similarity(&mut self, evidence: &SimilarityEvidence) -> Result<(), RegistryError> {
        let json = serde_json::to_string(evidence)?;
        
        self.conn.execute(
            r#"INSERT OR REPLACE INTO similarity_evidence 
               (id, file_a, file_b, similarity, token_overlap, line_similarity, 
                hash_a, hash_b, computed_at, evidence_json)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)"#,
            params![
                evidence.id.to_string(),
                evidence.file_a.to_string_lossy().to_string(),
                evidence.file_b.to_string_lossy().to_string(),
                evidence.similarity,
                evidence.token_overlap,
                evidence.line_similarity,
                evidence.hash_a,
                evidence.hash_b,
                evidence.computed_at.to_rfc3339(),
                json,
            ],
        )?;
        
        Ok(())
    }
    
    /// Get similarity evidence for a file pair (in either order)
    pub fn get_similarity(&self, file_a: &Path, file_b: &Path) -> Result<Option<SimilarityEvidence>, RegistryError> {
        let file_a_str = file_a.to_string_lossy().to_string();
        let file_b_str = file_b.to_string_lossy().to_string();
        
        let result: Option<String> = self.conn.query_row(
            r#"SELECT evidence_json FROM similarity_evidence 
               WHERE (file_a = ?1 AND file_b = ?2) OR (file_a = ?2 AND file_b = ?1)
               ORDER BY computed_at DESC LIMIT 1"#,
            params![file_a_str, file_b_str],
            |row| row.get(0),
        ).ok();
        
        match result {
            Some(json) => Ok(Some(serde_json::from_str(&json)?)),
            None => Ok(None),
        }
    }
    
    /// Check if similarity has been computed for a file pair
    pub fn has_similarity(&self, file_a: &Path, file_b: &Path) -> Result<bool, RegistryError> {
        Ok(self.get_similarity(file_a, file_b)?.is_some())
    }
    
    // --- Usage Evidence ---
    
    /// Record usage computation result
    pub fn record_usage(&mut self, evidence: &UsageEvidence) -> Result<(), RegistryError> {
        let json = serde_json::to_string(evidence)?;
        
        self.conn.execute(
            r#"INSERT OR REPLACE INTO usage_evidence 
               (id, symbol, search_path, usage_count, computed_at, evidence_json)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6)"#,
            params![
                evidence.id.to_string(),
                evidence.symbol,
                evidence.search_path.to_string_lossy().to_string(),
                evidence.usage_count,
                evidence.computed_at.to_rfc3339(),
                json,
            ],
        )?;
        
        Ok(())
    }
    
    /// Get usage evidence for a symbol
    pub fn get_usage(&self, symbol: &str) -> Result<Option<UsageEvidence>, RegistryError> {
        let result: Option<String> = self.conn.query_row(
            r#"SELECT evidence_json FROM usage_evidence 
               WHERE symbol = ?1
               ORDER BY computed_at DESC LIMIT 1"#,
            params![symbol],
            |row| row.get(0),
        ).ok();
        
        match result {
            Some(json) => Ok(Some(serde_json::from_str(&json)?)),
            None => Ok(None),
        }
    }
    
    // --- Connectivity Evidence ---
    
    /// Record connectivity computation result
    pub fn record_connectivity(&mut self, evidence: &ConnectivityEvidence) -> Result<(), RegistryError> {
        let json = serde_json::to_string(evidence)?;
        
        self.conn.execute(
            r#"INSERT OR REPLACE INTO connectivity_evidence 
               (id, module_path, is_connected, incoming_connections, 
                outgoing_connections, computed_at, evidence_json)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"#,
            params![
                evidence.id.to_string(),
                evidence.module_path.to_string_lossy().to_string(),
                evidence.is_connected as i32,
                evidence.incoming_connections,
                evidence.outgoing_connections,
                evidence.computed_at.to_rfc3339(),
                json,
            ],
        )?;
        
        Ok(())
    }
    
    /// Get connectivity evidence for a module
    pub fn get_connectivity(&self, module_path: &Path) -> Result<Option<ConnectivityEvidence>, RegistryError> {
        let path_str = module_path.to_string_lossy().to_string();
        
        let result: Option<String> = self.conn.query_row(
            r#"SELECT evidence_json FROM connectivity_evidence 
               WHERE module_path = ?1
               ORDER BY computed_at DESC LIMIT 1"#,
            params![path_str],
            |row| row.get(0),
        ).ok();
        
        match result {
            Some(json) => Ok(Some(serde_json::from_str(&json)?)),
            None => Ok(None),
        }
    }
    
    // --- Utility Methods ---
    
    /// List all computations (for debugging/display)
    pub fn list_all(&self) -> Result<RegistrySummary, RegistryError> {
        let similarity_count: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM similarity_evidence",
            [],
            |row| row.get(0),
        )?;
        
        let usage_count: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM usage_evidence",
            [],
            |row| row.get(0),
        )?;
        
        let connectivity_count: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM connectivity_evidence",
            [],
            |row| row.get(0),
        )?;
        
        Ok(RegistrySummary {
            similarity_computations: similarity_count as u32,
            usage_computations: usage_count as u32,
            connectivity_computations: connectivity_count as u32,
        })
    }
}

/// Summary of registry contents
#[derive(Debug)]
pub struct RegistrySummary {
    pub similarity_computations: u32,
    pub usage_computations: u32,
    pub connectivity_computations: u32,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::computations::compute_similarity;
    use tempfile::tempdir;
    use std::fs::File;
    use std::io::Write;
    
    #[test]
    fn test_registry_records_and_retrieves() {
        let mut registry = VerificationRegistry::in_memory().unwrap();
        
        // Create test files
        let dir = tempdir().unwrap();
        let file_a = dir.path().join("a.ts");
        let file_b = dir.path().join("b.ts");
        File::create(&file_a).unwrap().write_all(b"const x = 1;").unwrap();
        File::create(&file_b).unwrap().write_all(b"const y = 2;").unwrap();
        
        // Compute and record
        let evidence = compute_similarity(&file_a, &file_b).unwrap();
        registry.record_similarity(&evidence).unwrap();
        
        // Retrieve
        let retrieved = registry.get_similarity(&file_a, &file_b).unwrap();
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap().id, evidence.id);
    }
    
    #[test]
    fn test_registry_returns_none_for_missing() {
        let registry = VerificationRegistry::in_memory().unwrap();
        
        let result = registry.get_similarity(
            Path::new("nonexistent_a.ts"),
            Path::new("nonexistent_b.ts"),
        ).unwrap();
        
        assert!(result.is_none());
    }
}
