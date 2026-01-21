//! Workflow Formulas
//!
//! Repeatable patterns for common workflows.
//! Like Gas Town's polecat formulas, but more flexible.

use std::collections::HashMap;
use std::path::Path;
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum FormulaError {
    #[error("Formula not found: {0}")]
    NotFound(String),
    
    #[error("Missing required variable: {0}")]
    MissingVariable(String),
    
    #[error("Parse error: {0}")]
    Parse(String),
    
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("TOML error: {0}")]
    Toml(#[from] toml::de::Error),
}

/// Quality tier for formula execution
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum QualityTier {
    /// Fast, cheap, good for simple tasks
    Basic,
    /// Balanced quality and cost
    Standard,
    /// High quality, thorough
    Premium,
    /// Maximum quality, no cost limit
    Elite,
}

impl QualityTier {
    pub fn as_str(&self) -> &'static str {
        match self {
            QualityTier::Basic => "basic",
            QualityTier::Standard => "standard",
            QualityTier::Premium => "premium",
            QualityTier::Elite => "elite",
        }
    }
    
    /// Suggested agent for this tier
    pub fn suggested_agent(&self) -> &'static str {
        match self {
            QualityTier::Basic => "gemini",     // Cheapest
            QualityTier::Standard => "codex",   // Balanced
            QualityTier::Premium => "cursor",   // IDE integration
            QualityTier::Elite => "claude-code", // Best quality
        }
    }
    
    /// Max retries for this tier
    pub fn max_retries(&self) -> u32 {
        match self {
            QualityTier::Basic => 1,
            QualityTier::Standard => 2,
            QualityTier::Premium => 3,
            QualityTier::Elite => 5,
        }
    }
}

/// A variable in a formula
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Variable {
    pub name: String,
    pub description: String,
    #[serde(default)]
    pub required: bool,
    pub default: Option<String>,
}

/// A step in a formula
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Step {
    pub id: String,
    pub title: String,
    pub description: String,
    /// Agent to use (overrides formula default)
    pub agent: Option<String>,
    /// Labels for this step
    #[serde(default)]
    pub labels: Vec<String>,
    /// Prompt template (can reference variables)
    pub prompt: Option<String>,
    /// Verification command
    pub verify: Option<String>,
    /// Create checkpoint after this step
    #[serde(default)]
    pub checkpoint: bool,
    /// Can this step be parallelized?
    #[serde(default)]
    pub parallel: bool,
}

/// Success criteria for a formula
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct SuccessCriteria {
    #[serde(default)]
    pub criteria: Vec<String>,
    /// Run these commands to verify
    #[serde(default)]
    pub verify_commands: Vec<String>,
    /// Required Ground checks
    #[serde(default)]
    pub ground_checks: Vec<String>,
}

/// A workflow formula
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Formula {
    /// Unique formula name
    pub name: String,
    /// Human-readable description
    pub description: String,
    /// Default quality tier
    #[serde(default = "default_quality")]
    pub quality: QualityTier,
    /// Preferred agent (can be overridden)
    pub agent: Option<String>,
    /// Variables that must be provided
    #[serde(default)]
    pub variables: Vec<Variable>,
    /// Steps to execute
    #[serde(default)]
    pub steps: Vec<Step>,
    /// Success criteria
    #[serde(default)]
    pub success_criteria: SuccessCriteria,
    /// Labels to apply to created tasks
    #[serde(default)]
    pub labels: Vec<String>,
    /// Estimated tokens per step
    #[serde(default = "default_tokens")]
    pub estimated_tokens: u64,
}

fn default_quality() -> QualityTier {
    QualityTier::Standard
}

fn default_tokens() -> u64 {
    10000
}

impl Formula {
    /// Load a formula from TOML file
    pub fn from_file(path: impl AsRef<Path>) -> Result<Self, FormulaError> {
        let content = std::fs::read_to_string(path)?;
        let formula: Formula = toml::from_str(&content)?;
        Ok(formula)
    }
    
    /// Load a formula from TOML string
    pub fn from_toml(content: &str) -> Result<Self, FormulaError> {
        let formula: Formula = toml::from_str(content)?;
        Ok(formula)
    }
    
    /// Validate that all required variables are provided
    pub fn validate_variables(&self, vars: &HashMap<String, String>) -> Result<(), FormulaError> {
        for var in &self.variables {
            if var.required && !vars.contains_key(&var.name) && var.default.is_none() {
                return Err(FormulaError::MissingVariable(var.name.clone()));
            }
        }
        Ok(())
    }
    
    /// Expand a template with variables
    pub fn expand_template(&self, template: &str, vars: &HashMap<String, String>) -> String {
        let mut result = template.to_string();
        
        for var in &self.variables {
            let placeholder = format!("{{{{{}}}}}", var.name);
            let value = vars.get(&var.name)
                .or(var.default.as_ref())
                .cloned()
                .unwrap_or_default();
            result = result.replace(&placeholder, &value);
        }
        
        result
    }
    
    /// Get the agent for a step
    pub fn agent_for_step(&self, step: &Step) -> String {
        step.agent.clone()
            .or(self.agent.clone())
            .unwrap_or_else(|| self.quality.suggested_agent().to_string())
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Built-in Formulas
// ─────────────────────────────────────────────────────────────────────────────

impl Formula {
    /// Basic task formula - simple, mechanical work
    pub fn basic_task() -> Self {
        Self {
            name: "basic-task".to_string(),
            description: "Simple, mechanical task with clear scope".to_string(),
            quality: QualityTier::Basic,
            agent: Some("gemini".to_string()),
            variables: vec![
                Variable {
                    name: "task_id".to_string(),
                    description: "The task ID to work on".to_string(),
                    required: true,
                    default: None,
                },
            ],
            steps: vec![
                Step {
                    id: "understand".to_string(),
                    title: "Understand the task".to_string(),
                    description: "Read task description and acceptance criteria".to_string(),
                    agent: None,
                    labels: vec![],
                    prompt: None,
                    verify: None,
                    checkpoint: false,
                    parallel: false,
                },
                Step {
                    id: "execute".to_string(),
                    title: "Execute the work".to_string(),
                    description: "Complete the task according to specifications".to_string(),
                    agent: None,
                    labels: vec![],
                    prompt: None,
                    verify: None,
                    checkpoint: true,
                    parallel: false,
                },
                Step {
                    id: "verify".to_string(),
                    title: "Quick verification".to_string(),
                    description: "Basic sanity check - does it work?".to_string(),
                    agent: None,
                    labels: vec![],
                    prompt: None,
                    verify: Some("pnpm check".to_string()),
                    checkpoint: false,
                    parallel: false,
                },
            ],
            success_criteria: SuccessCriteria {
                criteria: vec![
                    "All steps completed without errors".to_string(),
                    "Task updated with completion status".to_string(),
                ],
                verify_commands: vec!["pnpm check".to_string()],
                ground_checks: vec![],
            },
            labels: vec!["basic".to_string()],
            estimated_tokens: 5000,
        }
    }
    
    /// Feature implementation formula
    pub fn feature() -> Self {
        Self {
            name: "feature".to_string(),
            description: "Implement a new feature with planning and testing".to_string(),
            quality: QualityTier::Standard,
            agent: Some("claude-code".to_string()),
            variables: vec![
                Variable {
                    name: "feature_name".to_string(),
                    description: "Name of the feature".to_string(),
                    required: true,
                    default: None,
                },
                Variable {
                    name: "package".to_string(),
                    description: "Package to implement in".to_string(),
                    required: true,
                    default: None,
                },
            ],
            steps: vec![
                Step {
                    id: "plan".to_string(),
                    title: "Plan the implementation".to_string(),
                    description: "Analyze requirements, identify files to modify, plan approach".to_string(),
                    agent: Some("claude-code".to_string()), // Planning needs best agent
                    labels: vec!["planning".to_string()],
                    prompt: Some("Plan the implementation of {{feature_name}} in {{package}}. Identify files to modify and approach.".to_string()),
                    verify: None,
                    checkpoint: true,
                    parallel: false,
                },
                Step {
                    id: "implement".to_string(),
                    title: "Implement the feature".to_string(),
                    description: "Write the code following the plan".to_string(),
                    agent: None,
                    labels: vec!["coding".to_string()],
                    prompt: None,
                    verify: Some("pnpm check".to_string()),
                    checkpoint: true,
                    parallel: false,
                },
                Step {
                    id: "test".to_string(),
                    title: "Write tests".to_string(),
                    description: "Add tests for the new functionality".to_string(),
                    agent: None,
                    labels: vec!["testing".to_string()],
                    prompt: None,
                    verify: Some("pnpm test".to_string()),
                    checkpoint: true,
                    parallel: false,
                },
                Step {
                    id: "review".to_string(),
                    title: "Self-review".to_string(),
                    description: "Review changes for quality, DRY violations, Canon compliance".to_string(),
                    agent: Some("claude-code".to_string()),
                    labels: vec!["review".to_string()],
                    prompt: None,
                    verify: None,
                    checkpoint: false,
                    parallel: false,
                },
            ],
            success_criteria: SuccessCriteria {
                criteria: vec![
                    "Feature works as specified".to_string(),
                    "Tests pass".to_string(),
                    "No TypeScript errors".to_string(),
                    "No Canon violations".to_string(),
                ],
                verify_commands: vec![
                    "pnpm check".to_string(),
                    "pnpm test".to_string(),
                    "pnpm lint".to_string(),
                ],
                ground_checks: vec![],
            },
            labels: vec!["feature".to_string()],
            estimated_tokens: 30000,
        }
    }
    
    /// Bug fix formula
    pub fn bug_fix() -> Self {
        Self {
            name: "bug-fix".to_string(),
            description: "Diagnose and fix a bug".to_string(),
            quality: QualityTier::Standard,
            agent: Some("claude-code".to_string()),
            variables: vec![
                Variable {
                    name: "bug_description".to_string(),
                    description: "Description of the bug".to_string(),
                    required: true,
                    default: None,
                },
            ],
            steps: vec![
                Step {
                    id: "reproduce".to_string(),
                    title: "Reproduce the bug".to_string(),
                    description: "Understand and reproduce the bug".to_string(),
                    agent: None,
                    labels: vec!["debugging".to_string()],
                    prompt: Some("Analyze and reproduce: {{bug_description}}".to_string()),
                    verify: None,
                    checkpoint: true,
                    parallel: false,
                },
                Step {
                    id: "diagnose".to_string(),
                    title: "Diagnose root cause".to_string(),
                    description: "Find the root cause of the bug".to_string(),
                    agent: Some("claude-code".to_string()), // Best for analysis
                    labels: vec!["debugging".to_string()],
                    prompt: None,
                    verify: None,
                    checkpoint: true,
                    parallel: false,
                },
                Step {
                    id: "fix".to_string(),
                    title: "Implement fix".to_string(),
                    description: "Fix the bug".to_string(),
                    agent: None,
                    labels: vec!["coding".to_string()],
                    prompt: None,
                    verify: Some("pnpm check".to_string()),
                    checkpoint: true,
                    parallel: false,
                },
                Step {
                    id: "verify".to_string(),
                    title: "Verify fix".to_string(),
                    description: "Verify the bug is fixed and no regressions".to_string(),
                    agent: None,
                    labels: vec!["testing".to_string()],
                    prompt: None,
                    verify: Some("pnpm test".to_string()),
                    checkpoint: false,
                    parallel: false,
                },
            ],
            success_criteria: SuccessCriteria {
                criteria: vec![
                    "Bug is fixed".to_string(),
                    "No regressions".to_string(),
                    "Tests pass".to_string(),
                ],
                verify_commands: vec![
                    "pnpm check".to_string(),
                    "pnpm test".to_string(),
                ],
                ground_checks: vec![],
            },
            labels: vec!["bug".to_string(), "fix".to_string()],
            estimated_tokens: 20000,
        }
    }
    
    /// Refactor formula with Ground integration
    pub fn refactor() -> Self {
        Self {
            name: "refactor".to_string(),
            description: "Refactor code with DRY verification".to_string(),
            quality: QualityTier::Premium,
            agent: Some("claude-code".to_string()),
            variables: vec![
                Variable {
                    name: "target".to_string(),
                    description: "File or directory to refactor".to_string(),
                    required: true,
                    default: None,
                },
                Variable {
                    name: "goal".to_string(),
                    description: "What to improve".to_string(),
                    required: true,
                    default: None,
                },
            ],
            steps: vec![
                Step {
                    id: "analyze".to_string(),
                    title: "Analyze current state".to_string(),
                    description: "Use Ground to find issues".to_string(),
                    agent: None,
                    labels: vec!["refactor".to_string()],
                    prompt: Some("Analyze {{target}} for: {{goal}}".to_string()),
                    verify: None,
                    checkpoint: true,
                    parallel: false,
                },
                Step {
                    id: "plan".to_string(),
                    title: "Plan refactoring".to_string(),
                    description: "Create safe refactoring plan".to_string(),
                    agent: Some("claude-code".to_string()),
                    labels: vec!["planning".to_string()],
                    prompt: None,
                    verify: None,
                    checkpoint: true,
                    parallel: false,
                },
                Step {
                    id: "refactor".to_string(),
                    title: "Apply refactoring".to_string(),
                    description: "Make the changes".to_string(),
                    agent: None,
                    labels: vec!["refactor".to_string()],
                    prompt: None,
                    verify: Some("pnpm check".to_string()),
                    checkpoint: true,
                    parallel: false,
                },
                Step {
                    id: "verify-ground".to_string(),
                    title: "Verify with Ground".to_string(),
                    description: "Run Ground to verify improvements".to_string(),
                    agent: None,
                    labels: vec!["verify".to_string()],
                    prompt: None,
                    verify: Some("ground find duplicates {{target}}".to_string()),
                    checkpoint: false,
                    parallel: false,
                },
            ],
            success_criteria: SuccessCriteria {
                criteria: vec![
                    "Refactoring goal achieved".to_string(),
                    "No regressions".to_string(),
                    "Ground shows improvement".to_string(),
                ],
                verify_commands: vec![
                    "pnpm check".to_string(),
                    "pnpm test".to_string(),
                ],
                ground_checks: vec![
                    "find duplicates".to_string(),
                    "find dead-code".to_string(),
                ],
            },
            labels: vec!["refactor".to_string(), "dry".to_string()],
            estimated_tokens: 25000,
        }
    }
}

/// Formula registry
pub struct FormulaRegistry {
    formulas: HashMap<String, Formula>,
}

impl FormulaRegistry {
    pub fn new() -> Self {
        let mut registry = Self {
            formulas: HashMap::new(),
        };
        
        // Register built-in formulas
        registry.register(Formula::basic_task());
        registry.register(Formula::feature());
        registry.register(Formula::bug_fix());
        registry.register(Formula::refactor());
        
        registry
    }
    
    /// Create a registry with Create Something's opinionated formulas
    pub fn create_something() -> Self {
        use crate::policy;
        
        let mut registry = Self::new();
        
        // Add Create Something specific formulas
        registry.register(policy::cs_feature_formula());
        registry.register(policy::cs_component_formula());
        registry.register(policy::cs_refactor_formula());
        registry.register(policy::cs_worker_formula());
        
        registry
    }
    
    /// Load formulas from a directory
    pub fn load_from_dir(&mut self, dir: impl AsRef<Path>) -> Result<usize, FormulaError> {
        let dir = dir.as_ref();
        let mut count = 0;
        
        if !dir.exists() {
            return Ok(0);
        }
        
        for entry in std::fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();
            
            if path.extension().map(|e| e == "toml").unwrap_or(false) {
                if let Ok(formula) = Formula::from_file(&path) {
                    self.register(formula);
                    count += 1;
                }
            }
        }
        
        Ok(count)
    }
    
    /// Register a formula
    pub fn register(&mut self, formula: Formula) {
        self.formulas.insert(formula.name.clone(), formula);
    }
    
    /// Get a formula by name
    pub fn get(&self, name: &str) -> Option<&Formula> {
        self.formulas.get(name)
    }
    
    /// List all formula names
    pub fn list(&self) -> Vec<&str> {
        self.formulas.keys().map(|s| s.as_str()).collect()
    }
}

impl Default for FormulaRegistry {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_formula_parsing() {
        let toml = r#"
name = "test-formula"
description = "A test formula"
quality = "standard"

[[variables]]
name = "target"
description = "Target file"
required = true

[[steps]]
id = "step1"
title = "First step"
description = "Do something"
checkpoint = true
"#;
        
        let formula = Formula::from_toml(toml).unwrap();
        assert_eq!(formula.name, "test-formula");
        assert_eq!(formula.variables.len(), 1);
        assert_eq!(formula.steps.len(), 1);
    }
    
    #[test]
    fn test_variable_expansion() {
        let formula = Formula::feature();
        let mut vars = HashMap::new();
        vars.insert("feature_name".to_string(), "dark mode".to_string());
        vars.insert("package".to_string(), "packages/io".to_string());
        
        let step = &formula.steps[0];
        let expanded = formula.expand_template(step.prompt.as_ref().unwrap(), &vars);
        
        assert!(expanded.contains("dark mode"));
        assert!(expanded.contains("packages/io"));
    }
    
    #[test]
    fn test_builtin_formulas() {
        let registry = FormulaRegistry::new();
        
        assert!(registry.get("basic-task").is_some());
        assert!(registry.get("feature").is_some());
        assert!(registry.get("bug-fix").is_some());
        assert!(registry.get("refactor").is_some());
    }
}
