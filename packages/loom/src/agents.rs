//! Agent Profiles & Intelligence
//!
//! Unlike Gas Town (Claude-centric), Loom treats all agents as first-class citizens.
//! Each agent has a profile tracking capabilities, costs, quality scores, and history.

use std::collections::HashMap;
use std::path::Path;
use chrono::{DateTime, Utc};
use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AgentError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),
    
    #[error("Agent not found: {0}")]
    NotFound(String),
    
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
}

/// Agent capabilities - what can this agent do well?
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Capabilities {
    /// Good at planning and architecture
    pub planning: f32,
    /// Good at writing code
    pub coding: f32,
    /// Good at debugging
    pub debugging: f32,
    /// Good at UI/UX work
    pub ui: f32,
    /// Good at documentation
    pub docs: f32,
    /// Good at refactoring
    pub refactor: f32,
    /// Good at testing
    pub testing: f32,
    /// Supports MCP tools
    pub mcp: bool,
    /// Supports checkpoints/rewind
    pub checkpoints: bool,
    /// Git-aware (can commit, branch)
    pub git_aware: bool,
    /// Can spawn sub-agents
    pub sub_agents: bool,
    /// Maximum context window (tokens)
    pub max_context: u64,
}

impl Capabilities {
    /// Claude Code profile
    pub fn claude_code() -> Self {
        Self {
            planning: 0.95,
            coding: 0.90,
            debugging: 0.85,
            ui: 0.80,
            docs: 0.90,
            refactor: 0.90,
            testing: 0.85,
            mcp: true,
            checkpoints: true,  // /rewind support
            git_aware: true,
            sub_agents: true,
            max_context: 200_000,
        }
    }
    
    /// Cursor profile
    pub fn cursor() -> Self {
        Self {
            planning: 0.80,
            coding: 0.85,
            debugging: 0.80,
            ui: 0.90,  // IDE integration helps with UI
            docs: 0.75,
            refactor: 0.85,
            testing: 0.80,
            mcp: true,
            checkpoints: false,
            git_aware: true,
            sub_agents: false,
            max_context: 128_000,
        }
    }
    
    /// Codex CLI profile
    pub fn codex() -> Self {
        Self {
            planning: 0.75,
            coding: 0.85,
            debugging: 0.75,
            ui: 0.70,
            docs: 0.80,
            refactor: 0.80,
            testing: 0.85,
            mcp: true,
            checkpoints: false,
            git_aware: true,
            sub_agents: false,
            max_context: 128_000,
        }
    }
    
    /// Gemini CLI profile
    pub fn gemini() -> Self {
        Self {
            planning: 0.85,
            coding: 0.80,
            debugging: 0.80,
            ui: 0.75,
            docs: 0.85,
            refactor: 0.80,
            testing: 0.75,
            mcp: true,
            checkpoints: false,
            git_aware: false,
            sub_agents: false,
            max_context: 1_000_000,  // 1M context is Gemini's strength
        }
    }
    
    /// Score for a specific task type
    pub fn score_for(&self, task_type: &str) -> f32 {
        match task_type {
            "planning" | "architecture" | "design" => self.planning,
            "coding" | "implementation" | "feature" => self.coding,
            "debugging" | "bug" | "fix" => self.debugging,
            "ui" | "frontend" | "svelte" | "css" => self.ui,
            "docs" | "documentation" | "readme" => self.docs,
            "refactor" | "dry" | "cleanup" => self.refactor,
            "test" | "testing" | "spec" => self.testing,
            _ => 0.5, // neutral
        }
    }
}

/// Cost model for an agent
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CostModel {
    /// Cost per 1K input tokens
    pub input_per_1k: f64,
    /// Cost per 1K output tokens
    pub output_per_1k: f64,
    /// Typical input/output ratio (e.g., 3.0 means 3x more output than input)
    pub output_ratio: f64,
}

impl CostModel {
    pub fn claude_opus() -> Self {
        Self { input_per_1k: 0.015, output_per_1k: 0.075, output_ratio: 3.0 }
    }
    
    pub fn claude_sonnet() -> Self {
        Self { input_per_1k: 0.003, output_per_1k: 0.015, output_ratio: 3.0 }
    }
    
    pub fn gpt4() -> Self {
        Self { input_per_1k: 0.01, output_per_1k: 0.03, output_ratio: 2.5 }
    }
    
    pub fn gemini_pro() -> Self {
        Self { input_per_1k: 0.00125, output_per_1k: 0.005, output_ratio: 2.0 }
    }
    
    /// Estimate cost for a task
    pub fn estimate(&self, estimated_input_tokens: u64) -> f64 {
        let input_cost = (estimated_input_tokens as f64 / 1000.0) * self.input_per_1k;
        let output_tokens = estimated_input_tokens as f64 * self.output_ratio;
        let output_cost = (output_tokens / 1000.0) * self.output_per_1k;
        input_cost + output_cost
    }
}

/// Quality metrics for an agent (learned from history)
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct QualityMetrics {
    /// Tasks completed successfully
    pub successes: u32,
    /// Tasks that failed or needed retry
    pub failures: u32,
    /// Average time to complete (seconds)
    pub avg_duration_secs: f64,
    /// Quality score by task type (learned)
    pub by_type: HashMap<String, f32>,
}

impl QualityMetrics {
    pub fn success_rate(&self) -> f64 {
        let total = self.successes + self.failures;
        if total == 0 { 0.5 } else { self.successes as f64 / total as f64 }
    }
    
    pub fn record_success(&mut self, task_type: &str, duration_secs: f64) {
        self.successes += 1;
        // Update rolling average
        let total = self.successes + self.failures;
        self.avg_duration_secs = 
            (self.avg_duration_secs * (total - 1) as f64 + duration_secs) / total as f64;
        
        // Update type-specific score
        let score = self.by_type.entry(task_type.to_string()).or_insert(0.5);
        *score = (*score * 0.9) + 0.1; // Increase towards 1.0
    }
    
    pub fn record_failure(&mut self, task_type: &str) {
        self.failures += 1;
        
        // Update type-specific score
        let score = self.by_type.entry(task_type.to_string()).or_insert(0.5);
        *score = *score * 0.9; // Decrease towards 0.0
    }
}

/// An agent profile
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentProfile {
    /// Unique identifier (e.g., "claude-code", "cursor", "codex")
    pub id: String,
    /// Human-readable name
    pub name: String,
    /// CLI executable path
    pub cli_path: String,
    /// Base capabilities
    pub capabilities: Capabilities,
    /// Cost model
    pub cost: CostModel,
    /// Learned quality metrics
    pub quality: QualityMetrics,
    /// Maximum concurrent instances
    pub max_concurrent: u32,
    /// Currently active instances
    pub active: u32,
    /// Is available (CLI exists, not rate-limited)
    pub available: bool,
    /// Last used timestamp
    pub last_used: Option<DateTime<Utc>>,
}

impl AgentProfile {
    /// Create a Claude Code profile
    pub fn claude_code() -> Self {
        Self {
            id: "claude-code".to_string(),
            name: "Claude Code".to_string(),
            cli_path: "claude".to_string(),
            capabilities: Capabilities::claude_code(),
            cost: CostModel::claude_opus(),
            quality: QualityMetrics::default(),
            max_concurrent: 5,
            active: 0,
            available: true,
            last_used: None,
        }
    }
    
    /// Create a Cursor profile
    pub fn cursor() -> Self {
        Self {
            id: "cursor".to_string(),
            name: "Cursor".to_string(),
            cli_path: "cursor".to_string(),
            capabilities: Capabilities::cursor(),
            cost: CostModel::claude_sonnet(), // Cursor uses various models
            quality: QualityMetrics::default(),
            max_concurrent: 2,
            active: 0,
            available: true,
            last_used: None,
        }
    }
    
    /// Create a Codex profile
    pub fn codex() -> Self {
        Self {
            id: "codex".to_string(),
            name: "Codex CLI".to_string(),
            cli_path: "codex".to_string(),
            capabilities: Capabilities::codex(),
            cost: CostModel::gpt4(),
            quality: QualityMetrics::default(),
            max_concurrent: 3,
            active: 0,
            available: true,
            last_used: None,
        }
    }
    
    /// Create a Gemini profile
    pub fn gemini() -> Self {
        Self {
            id: "gemini".to_string(),
            name: "Gemini CLI".to_string(),
            cli_path: "gemini".to_string(),
            capabilities: Capabilities::gemini(),
            cost: CostModel::gemini_pro(),
            quality: QualityMetrics::default(),
            max_concurrent: 3,
            active: 0,
            available: true,
            last_used: None,
        }
    }
    
    /// Check if agent has capacity
    pub fn has_capacity(&self) -> bool {
        self.available && self.active < self.max_concurrent
    }
    
    /// Score this agent for a task
    pub fn score_for_task(&self, labels: &[String], estimated_tokens: u64) -> f64 {
        // Base capability score
        let mut capability_score: f64 = 0.5;
        let mut matches = 0;
        
        for label in labels {
            let score = self.capabilities.score_for(label);
            if score > 0.5 {
                capability_score += score as f64;
                matches += 1;
            }
        }
        
        if matches > 0 {
            capability_score /= matches as f64;
        }
        
        // Quality score from history
        let quality_score = self.quality.success_rate();
        
        // Cost score (inverse - lower cost is better, but capped to prevent dominating)
        let estimated_cost = self.cost.estimate(estimated_tokens);
        let cost_score = 1.0 / (1.0 + estimated_cost * 2.0); // Reduced weight on cost
        
        // Availability bonus
        let availability_bonus = if self.has_capacity() { 1.0 } else { 0.0 };
        
        // Context fit (can it handle the task size?)
        let context_fit = if estimated_tokens < self.capabilities.max_context {
            1.0
        } else {
            0.5 // Penalize if task might exceed context
        };
        
        // Weighted combination - capability is most important for "best" routing
        (capability_score * 0.50) + 
        (quality_score * 0.20) + 
        (cost_score * 0.10) + 
        (availability_bonus * 0.10) +
        (context_fit * 0.10)
    }
}

/// Agent registry - stores and manages all agent profiles
pub struct AgentRegistry {
    conn: Connection,
}

impl AgentRegistry {
    /// Open or create an agent registry
    pub fn open(db_path: impl AsRef<Path>) -> Result<Self, AgentError> {
        let conn = Connection::open(db_path)?;
        
        // Enable WAL mode for better concurrency
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;")
            .map_err(|e| AgentError::Database(e))?;
        
        let registry = Self { conn };
        registry.init_schema()?;
        Ok(registry)
    }
    
    fn init_schema(&self) -> Result<(), AgentError> {
        self.conn.execute_batch(r#"
            CREATE TABLE IF NOT EXISTS agent_profiles (
                id TEXT PRIMARY KEY,
                profile_json TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            
            CREATE TABLE IF NOT EXISTS agent_sessions (
                id TEXT PRIMARY KEY,
                agent_id TEXT NOT NULL,
                task_id TEXT NOT NULL,
                started_at TEXT NOT NULL,
                ended_at TEXT,
                status TEXT NOT NULL DEFAULT 'active',
                context_json TEXT,
                FOREIGN KEY (agent_id) REFERENCES agent_profiles(id)
            );
            
            CREATE INDEX IF NOT EXISTS idx_sessions_agent ON agent_sessions(agent_id);
            CREATE INDEX IF NOT EXISTS idx_sessions_task ON agent_sessions(task_id);
            
            CREATE TABLE IF NOT EXISTS agent_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agent_id TEXT NOT NULL,
                task_id TEXT NOT NULL,
                task_type TEXT,
                success INTEGER NOT NULL,
                duration_secs REAL,
                tokens_used INTEGER,
                cost REAL,
                timestamp TEXT NOT NULL,
                FOREIGN KEY (agent_id) REFERENCES agent_profiles(id)
            );
            
            CREATE INDEX IF NOT EXISTS idx_history_agent ON agent_history(agent_id);
        "#)?;
        Ok(())
    }
    
    /// Register default agent profiles (uses Create Something optimized profiles)
    /// Register default agents (legacy - use register_from_config for new code)
    pub fn register_defaults(&mut self) -> Result<(), AgentError> {
        // Load from embedded default config
        let config = crate::models::ModelsConfig::defaults();
        self.register_from_config(&config)
    }
    
    /// Register agents from a ModelsConfig
    pub fn register_from_config(&mut self, config: &crate::models::ModelsConfig) -> Result<(), AgentError> {
        for profile in config.profiles() {
            self.upsert_profile(&profile)?;
        }
        Ok(())
    }
    
    /// Register agents from a TOML file path
    pub fn register_from_file(&mut self, path: impl AsRef<std::path::Path>) -> Result<(), AgentError> {
        let config = crate::models::ModelsConfig::load(path)
            .map_err(|e| AgentError::Serialization(serde_json::Error::io(
                std::io::Error::new(std::io::ErrorKind::InvalidData, e.to_string())
            )))?;
        self.register_from_config(&config)
    }
    
    /// Upsert an agent profile
    pub fn upsert_profile(&mut self, profile: &AgentProfile) -> Result<(), AgentError> {
        let json = serde_json::to_string(profile)?;
        let now = Utc::now();
        
        self.conn.execute(
            "INSERT OR REPLACE INTO agent_profiles (id, profile_json, updated_at) VALUES (?1, ?2, ?3)",
            params![profile.id, json, now.to_rfc3339()],
        )?;
        
        Ok(())
    }
    
    /// Get an agent profile by ID
    pub fn get_profile(&self, id: &str) -> Result<Option<AgentProfile>, AgentError> {
        let result: Option<String> = self.conn.query_row(
            "SELECT profile_json FROM agent_profiles WHERE id = ?1",
            params![id],
            |row| row.get(0),
        ).ok();
        
        match result {
            Some(json) => Ok(Some(serde_json::from_str(&json)?)),
            None => Ok(None),
        }
    }
    
    /// Get all agent profiles
    pub fn all_profiles(&self) -> Result<Vec<AgentProfile>, AgentError> {
        let mut stmt = self.conn.prepare("SELECT profile_json FROM agent_profiles")?;
        let profiles = stmt.query_map([], |row| {
            let json: String = row.get(0)?;
            Ok(json)
        })?
        .filter_map(|r| r.ok())
        .filter_map(|json| serde_json::from_str(&json).ok())
        .collect();
        
        Ok(profiles)
    }
    
    /// Record a task execution result
    pub fn record_execution(
        &mut self,
        agent_id: &str,
        task_id: &str,
        task_type: Option<&str>,
        success: bool,
        duration_secs: f64,
        tokens_used: Option<u64>,
        cost: Option<f64>,
    ) -> Result<(), AgentError> {
        let now = Utc::now();
        
        self.conn.execute(
            r#"INSERT INTO agent_history 
               (agent_id, task_id, task_type, success, duration_secs, tokens_used, cost, timestamp)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)"#,
            params![
                agent_id,
                task_id,
                task_type,
                success as i32,
                duration_secs,
                tokens_used.map(|t| t as i64),
                cost,
                now.to_rfc3339(),
            ],
        )?;
        
        // Update the profile's quality metrics
        if let Some(mut profile) = self.get_profile(agent_id)? {
            let task_type = task_type.unwrap_or("unknown");
            if success {
                profile.quality.record_success(task_type, duration_secs);
            } else {
                profile.quality.record_failure(task_type);
            }
            profile.last_used = Some(now);
            self.upsert_profile(&profile)?;
        }
        
        Ok(())
    }
    
    /// Get best agent for a task
    pub fn best_agent_for(
        &self,
        labels: &[String],
        estimated_tokens: u64,
        required_features: Option<&RequiredFeatures>,
    ) -> Result<Option<AgentProfile>, AgentError> {
        let profiles = self.all_profiles()?;
        
        let mut best: Option<(AgentProfile, f64)> = None;
        
        for profile in profiles {
            // Check required features
            if let Some(req) = required_features {
                if req.checkpoints && !profile.capabilities.checkpoints {
                    continue;
                }
                if req.git_aware && !profile.capabilities.git_aware {
                    continue;
                }
                if req.sub_agents && !profile.capabilities.sub_agents {
                    continue;
                }
                if req.min_context > profile.capabilities.max_context {
                    continue;
                }
            }
            
            if !profile.has_capacity() {
                continue;
            }
            
            let score = profile.score_for_task(labels, estimated_tokens);
            
            match best {
                None => best = Some((profile, score)),
                Some((_, best_score)) if score > best_score => {
                    best = Some((profile, score));
                }
                _ => {}
            }
        }
        
        Ok(best.map(|(p, _)| p))
    }
    
    /// Get cheapest available agent
    pub fn cheapest_agent(&self, estimated_tokens: u64) -> Result<Option<AgentProfile>, AgentError> {
        let profiles = self.all_profiles()?;
        
        let mut cheapest: Option<(AgentProfile, f64)> = None;
        
        for profile in profiles {
            if !profile.has_capacity() {
                continue;
            }
            
            let cost = profile.cost.estimate(estimated_tokens);
            
            match cheapest {
                None => cheapest = Some((profile, cost)),
                Some((_, best_cost)) if cost < best_cost => {
                    cheapest = Some((profile, cost));
                }
                _ => {}
            }
        }
        
        Ok(cheapest.map(|(p, _)| p))
    }
}

/// Required features for a task
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct RequiredFeatures {
    pub checkpoints: bool,
    pub git_aware: bool,
    pub sub_agents: bool,
    pub min_context: u64,
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_agent_scoring() {
        let claude = AgentProfile::claude_code();
        let cursor = AgentProfile::cursor();
        
        // Claude should score higher for planning
        let planning_labels = vec!["planning".to_string(), "architecture".to_string()];
        let claude_score = claude.score_for_task(&planning_labels, 10000);
        let cursor_score = cursor.score_for_task(&planning_labels, 10000);
        assert!(claude_score > cursor_score);
        
        // Cursor should score higher for UI
        let ui_labels = vec!["ui".to_string(), "svelte".to_string()];
        let claude_score = claude.score_for_task(&ui_labels, 10000);
        let cursor_score = cursor.score_for_task(&ui_labels, 10000);
        assert!(cursor_score > claude_score);
    }
    
    #[test]
    fn test_cost_estimation() {
        let opus = CostModel::claude_opus();
        let gemini = CostModel::gemini_pro();
        
        // Gemini should be cheaper
        let tokens = 50000u64;
        assert!(gemini.estimate(tokens) < opus.estimate(tokens));
    }
}
