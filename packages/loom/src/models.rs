//! Model Configuration
//!
//! Config-driven model profiles loaded from `.loom/models.toml`.
//! Update config, not code, when pricing changes or new models drop.

use std::collections::HashMap;
use std::path::Path;
use serde::{Deserialize, Serialize};
use crate::agents::{AgentProfile, Capabilities, CostModel, QualityMetrics};

/// Model tier for routing decisions
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ModelTier {
    /// Fastest, cheapest - simple tasks
    Fast,
    /// Balanced cost/capability - most work
    Balanced,
    /// Highest capability - complex reasoning
    Powerful,
}

impl Default for ModelTier {
    fn default() -> Self {
        ModelTier::Balanced
    }
}

/// Model family
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ModelFamily {
    Claude,
    Gpt,
    Gemini,
    Other(String),
}

/// Model configuration from TOML
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelConfig {
    /// Model family (claude, gpt, gemini)
    pub family: String,
    
    /// Model tier (fast, balanced, powerful)
    #[serde(default)]
    pub tier: ModelTier,
    
    /// Display name
    pub name: Option<String>,
    
    /// CLI command to invoke
    pub cli: Option<String>,
    
    // ─────────────────────────────────────────────────────────────────
    // Cost (per 1K tokens)
    // ─────────────────────────────────────────────────────────────────
    
    /// Input cost per 1K tokens (USD)
    pub input_per_1k: f64,
    
    /// Output cost per 1K tokens (USD)
    pub output_per_1k: f64,
    
    /// Typical output/input ratio
    #[serde(default = "default_output_ratio")]
    pub output_ratio: f64,
    
    // ─────────────────────────────────────────────────────────────────
    // Capabilities (0.0 - 1.0)
    // ─────────────────────────────────────────────────────────────────
    
    /// Planning and architecture
    #[serde(default = "default_capability")]
    pub planning: f64,
    
    /// Code implementation
    #[serde(default = "default_capability")]
    pub coding: f64,
    
    /// Bug diagnosis
    #[serde(default = "default_capability")]
    pub debugging: f64,
    
    /// UI/frontend work
    #[serde(default = "default_capability")]
    pub ui: f64,
    
    /// Documentation
    #[serde(default = "default_capability")]
    pub docs: f64,
    
    /// Refactoring/DRY
    #[serde(default = "default_capability")]
    pub refactor: f64,
    
    /// Test writing
    #[serde(default = "default_capability")]
    pub testing: f64,
    
    // ─────────────────────────────────────────────────────────────────
    // Features
    // ─────────────────────────────────────────────────────────────────
    
    /// Maximum context window
    #[serde(default = "default_context")]
    pub max_context: u64,
    
    /// Supports MCP
    #[serde(default)]
    pub mcp: bool,
    
    /// Supports checkpoints/rewind
    #[serde(default)]
    pub checkpoints: bool,
    
    /// Git-aware
    #[serde(default)]
    pub git_aware: bool,
    
    /// Can spawn sub-agents
    #[serde(default)]
    pub sub_agents: bool,
    
    /// Max concurrent tasks
    #[serde(default = "default_concurrent")]
    pub max_concurrent: u32,
}

fn default_output_ratio() -> f64 { 2.5 }
fn default_capability() -> f64 { 0.7 }
fn default_context() -> u64 { 128_000 }
fn default_concurrent() -> u32 { 3 }

impl ModelConfig {
    /// Convert to AgentProfile
    pub fn to_profile(&self, id: &str) -> AgentProfile {
        AgentProfile {
            id: id.to_string(),
            name: self.name.clone().unwrap_or_else(|| id.to_string()),
            cli_path: self.cli.clone().unwrap_or_else(|| self.family.clone()),
            capabilities: Capabilities {
                planning: self.planning as f32,
                coding: self.coding as f32,
                debugging: self.debugging as f32,
                ui: self.ui as f32,
                docs: self.docs as f32,
                refactor: self.refactor as f32,
                testing: self.testing as f32,
                mcp: self.mcp,
                checkpoints: self.checkpoints,
                git_aware: self.git_aware,
                sub_agents: self.sub_agents,
                max_context: self.max_context,
            },
            cost: CostModel {
                input_per_1k: self.input_per_1k,
                output_per_1k: self.output_per_1k,
                output_ratio: self.output_ratio,
            },
            quality: QualityMetrics::default(),
            max_concurrent: self.max_concurrent,
            active: 0,
            available: true,
            last_used: None,
        }
    }
}

/// Models configuration file
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ModelsConfig {
    /// Model definitions keyed by ID
    #[serde(default)]
    pub models: HashMap<String, ModelConfig>,
}

impl ModelsConfig {
    /// Load from TOML file
    pub fn load(path: impl AsRef<Path>) -> Result<Self, ModelsError> {
        let content = std::fs::read_to_string(path)?;
        let config: ModelsConfig = toml::from_str(&content)?;
        Ok(config)
    }
    
    /// Load from .loom/models.toml or return defaults
    pub fn load_or_default(loom_root: impl AsRef<Path>) -> Self {
        let path = loom_root.as_ref().join("models.toml");
        Self::load(&path).unwrap_or_else(|_| Self::defaults())
    }
    
    /// Get all profiles
    pub fn profiles(&self) -> Vec<AgentProfile> {
        self.models.iter()
            .map(|(id, config)| config.to_profile(id))
            .collect()
    }
    
    /// Get profile by ID
    pub fn get(&self, id: &str) -> Option<AgentProfile> {
        self.models.get(id).map(|c| c.to_profile(id))
    }
    
    /// Default models configuration
    pub fn defaults() -> Self {
        let toml = include_str!("default_models.toml");
        toml::from_str(toml).expect("default_models.toml should be valid")
    }
    
    /// Write defaults to a file
    pub fn write_defaults(path: impl AsRef<Path>) -> Result<(), ModelsError> {
        let toml = include_str!("default_models.toml");
        std::fs::write(path, toml)?;
        Ok(())
    }
}

#[derive(Debug, thiserror::Error)]
pub enum ModelsError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("TOML parse error: {0}")]
    Toml(#[from] toml::de::Error),
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_load_defaults() {
        let config = ModelsConfig::defaults();
        assert!(config.models.contains_key("claude-sonnet"));
        assert!(config.models.contains_key("claude-haiku"));
        assert!(config.models.contains_key("gpt-4o"));
        assert!(config.models.contains_key("gemini-2-flash"));
    }
    
    #[test]
    fn test_to_profile() {
        let config = ModelsConfig::defaults();
        let sonnet = config.get("claude-sonnet").unwrap();
        assert_eq!(sonnet.id, "claude-sonnet");
        assert!(sonnet.capabilities.planning > 0.8);
    }
}
