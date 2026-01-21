//! Agent Dispatch
//!
//! Multi-CLI agent routing for task execution.
//! Supports Claude, Codex, Gemini CLI, and Cursor.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::pin::Pin;
use std::process::Stdio;
use std::future::Future;
use serde::{Deserialize, Serialize};
use thiserror::Error;
use tokio::process::Command;

use crate::work::Task;

/// Boxed future for async agent execution
pub type BoxFuture<'a, T> = Pin<Box<dyn Future<Output = T> + Send + 'a>>;

#[derive(Error, Debug)]
pub enum DispatchError {
    #[error("Agent not found: {0}")]
    AgentNotFound(String),
    
    #[error("Agent not available: {0}")]
    AgentNotAvailable(String),
    
    #[error("Config error: {0}")]
    Config(String),
    
    #[error("Execution error: {0}")]
    Execution(String),
    
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("TOML parse error: {0}")]
    TomlParse(#[from] toml::de::Error),
}

/// Agent execution result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionResult {
    pub success: bool,
    pub output: String,
    pub error: Option<String>,
    pub exit_code: Option<i32>,
    pub evidence: Option<String>,
}

/// Agent features/capabilities
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct AgentFeatures {
    /// Supports checkpoint/rewind
    pub rewind: bool,
    /// Supports MCP tools
    pub mcp: bool,
    /// Git-aware (can commit, push)
    pub git_aware: bool,
    /// Can spawn sub-agents
    pub sub_agents: bool,
}

/// Cost estimate for a task
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Cost {
    pub estimated_tokens: u64,
    pub cost_per_1k: f64,
    pub total_cost: f64,
}

/// Configuration for a single agent
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    /// Path to the CLI executable
    pub path: String,
    /// Maximum concurrent executions
    #[serde(default = "default_max_concurrent")]
    pub max_concurrent: u32,
    /// Cost per 1k tokens
    #[serde(default)]
    pub cost_per_1k: f64,
    /// Agent features
    #[serde(default)]
    pub features: AgentFeatures,
    /// Additional CLI arguments
    #[serde(default)]
    pub args: Vec<String>,
}

fn default_max_concurrent() -> u32 {
    3
}

/// Routing configuration
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct RoutingConfig {
    /// Default agent to use
    pub default: Option<String>,
    /// Route by label
    #[serde(default)]
    pub labels: HashMap<String, String>,
}

/// Full dispatch configuration
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DispatchConfig {
    #[serde(default)]
    pub agents: HashMap<String, AgentConfig>,
    #[serde(default)]
    pub routing: RoutingConfig,
}

impl DispatchConfig {
    /// Load configuration from a TOML file
    pub fn from_file(path: impl AsRef<Path>) -> Result<Self, DispatchError> {
        let content = std::fs::read_to_string(path)?;
        let config: DispatchConfig = toml::from_str(&content)?;
        Ok(config)
    }
    
    /// Save configuration to a TOML file
    pub fn to_file(&self, path: impl AsRef<Path>) -> Result<(), DispatchError> {
        let content = toml::to_string_pretty(self)
            .map_err(|e| DispatchError::Config(e.to_string()))?;
        std::fs::write(path, content)?;
        Ok(())
    }
}

/// Agent trait for dispatch
pub trait Agent: Send + Sync {
    /// Agent name
    fn name(&self) -> &str;
    
    /// Check if agent is available
    fn is_available(&self) -> bool;
    
    /// Get agent features
    fn features(&self) -> &AgentFeatures;
    
    /// Estimate cost for a task
    fn cost_estimate(&self, task: &Task) -> Cost;
    
    /// Execute a task (async)
    fn execute<'a>(&'a self, task: &'a Task) -> BoxFuture<'a, Result<ExecutionResult, DispatchError>>;
}

/// CLI-based agent implementation
pub struct CliAgent {
    name: String,
    config: AgentConfig,
    executable_path: Option<PathBuf>,
}

impl CliAgent {
    pub fn new(name: impl Into<String>, config: AgentConfig) -> Self {
        let name = name.into();
        let executable_path = which::which(&config.path).ok();
        
        Self {
            name,
            config,
            executable_path,
        }
    }
}

impl Agent for CliAgent {
    fn name(&self) -> &str {
        &self.name
    }
    
    fn is_available(&self) -> bool {
        self.executable_path.is_some()
    }
    
    fn features(&self) -> &AgentFeatures {
        &self.config.features
    }
    
    fn cost_estimate(&self, task: &Task) -> Cost {
        // Rough estimate based on task title/description length
        let text_len = task.title.len() + task.description.as_ref().map(|d| d.len()).unwrap_or(0);
        let estimated_tokens = (text_len as u64 * 10).max(1000); // Assume 10x expansion, min 1000
        
        Cost {
            estimated_tokens,
            cost_per_1k: self.config.cost_per_1k,
            total_cost: (estimated_tokens as f64 / 1000.0) * self.config.cost_per_1k,
        }
    }
    
    fn execute<'a>(&'a self, task: &'a Task) -> BoxFuture<'a, Result<ExecutionResult, DispatchError>> {
        Box::pin(async move {
            let path = self.executable_path.as_ref()
                .ok_or_else(|| DispatchError::AgentNotAvailable(self.name.clone()))?;
            
            // Build the prompt
            let prompt = format!(
                "Task: {}\n\nDescription: {}\n\nLabels: {}",
                task.title,
                task.description.as_deref().unwrap_or("(none)"),
                task.labels.join(", ")
            );
            
            // Execute the CLI
            let mut cmd = Command::new(path);
            cmd.args(&self.config.args);
            cmd.arg("--print"); // Most CLIs support --print for non-interactive
            cmd.arg(&prompt);
            cmd.stdin(Stdio::null());
            cmd.stdout(Stdio::piped());
            cmd.stderr(Stdio::piped());
            
            let output = cmd.output().await?;
            
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            
            Ok(ExecutionResult {
                success: output.status.success(),
                output: stdout,
                error: if stderr.is_empty() { None } else { Some(stderr) },
                exit_code: output.status.code(),
                evidence: None, // Would need to parse from output
            })
        })
    }
}

/// The dispatcher routes tasks to agents
pub struct Dispatcher {
    config: DispatchConfig,
    agents: HashMap<String, Box<dyn Agent>>,
    active: HashMap<String, u32>, // agent -> current active count
}

impl Dispatcher {
    /// Create a new dispatcher from config
    pub fn new(config: DispatchConfig) -> Self {
        let mut agents: HashMap<String, Box<dyn Agent>> = HashMap::new();
        
        for (name, agent_config) in &config.agents {
            let agent = CliAgent::new(name.clone(), agent_config.clone());
            agents.insert(name.clone(), Box::new(agent));
        }
        
        Self {
            config,
            agents,
            active: HashMap::new(),
        }
    }
    
    /// Get available agents
    pub fn available_agents(&self) -> Vec<&str> {
        self.agents.iter()
            .filter(|(_, agent)| agent.is_available())
            .map(|(name, _)| name.as_str())
            .collect()
    }
    
    /// Get agent by name
    pub fn get_agent(&self, name: &str) -> Option<&dyn Agent> {
        self.agents.get(name).map(|a| a.as_ref())
    }
    
    /// Route a task to the best agent
    pub fn route(&self, task: &Task) -> Result<&str, DispatchError> {
        // First check label-based routing
        for label in &task.labels {
            if let Some(agent_name) = self.config.routing.labels.get(label) {
                if let Some(agent) = self.agents.get(agent_name) {
                    if agent.is_available() && self.has_capacity(agent_name) {
                        return Ok(agent_name);
                    }
                }
            }
        }
        
        // Fall back to default
        if let Some(ref default) = self.config.routing.default {
            if let Some(agent) = self.agents.get(default) {
                if agent.is_available() && self.has_capacity(default) {
                    return Ok(default);
                }
            }
        }
        
        // Try any available agent
        for (name, agent) in &self.agents {
            if agent.is_available() && self.has_capacity(name) {
                return Ok(name);
            }
        }
        
        Err(DispatchError::AgentNotAvailable("No agents available".to_string()))
    }
    
    /// Check if agent has capacity
    fn has_capacity(&self, name: &str) -> bool {
        let current = self.active.get(name).copied().unwrap_or(0);
        let max = self.config.agents.get(name)
            .map(|c| c.max_concurrent)
            .unwrap_or(1);
        current < max
    }
    
    /// Get cheapest agent for a task
    pub fn cheapest(&self, task: &Task) -> Result<&str, DispatchError> {
        let mut best: Option<(&str, f64)> = None;
        
        for (name, agent) in &self.agents {
            if !agent.is_available() || !self.has_capacity(name) {
                continue;
            }
            
            let cost = agent.cost_estimate(task);
            
            match best {
                None => best = Some((name, cost.total_cost)),
                Some((_, best_cost)) if cost.total_cost < best_cost => {
                    best = Some((name, cost.total_cost));
                }
                _ => {}
            }
        }
        
        best.map(|(name, _)| name)
            .ok_or_else(|| DispatchError::AgentNotAvailable("No agents available".to_string()))
    }
    
    /// Execute a task with a specific agent
    pub async fn execute(&mut self, task: &Task, agent_name: &str) -> Result<ExecutionResult, DispatchError> {
        let agent = self.agents.get(agent_name)
            .ok_or_else(|| DispatchError::AgentNotFound(agent_name.to_string()))?;
        
        if !agent.is_available() {
            return Err(DispatchError::AgentNotAvailable(agent_name.to_string()));
        }
        
        // Track active count
        *self.active.entry(agent_name.to_string()).or_insert(0) += 1;
        
        let result = agent.execute(task).await;
        
        // Decrement active count
        if let Some(count) = self.active.get_mut(agent_name) {
            *count = count.saturating_sub(1);
        }
        
        result
    }
    
    /// Execute a task with auto-routing
    pub async fn dispatch(&mut self, task: &Task) -> Result<ExecutionResult, DispatchError> {
        let agent_name = self.route(task)?.to_string();
        self.execute(task, &agent_name).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_config_parse() {
        let toml = r#"
[agents.claude]
path = "claude"
max_concurrent = 5
cost_per_1k = 0.015

[agents.codex]
path = "codex"
max_concurrent = 3
cost_per_1k = 0.008

[routing]
default = "claude"
labels = { ui = "cursor" }
"#;
        
        let config: DispatchConfig = toml::from_str(toml).unwrap();
        assert_eq!(config.agents.len(), 2);
        assert_eq!(config.routing.default, Some("claude".to_string()));
    }
}
