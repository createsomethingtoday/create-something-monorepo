//! # Loom
//!
//! AI-native coordination layer. External memory for agents.
//!
//! ## Philosophy
//!
//! Loom is infrastructure that agents use. Any agent can:
//! - Create tasks and sub-tasks
//! - Claim work and track progress
//! - Dispatch to other agents
//! - Resume after crashes
//!
//! ## Why Loom over Beads/Gas Town?
//!
//! - **Multi-agent first**: Claude, Codex, Gemini, Cursor - all first-class
//! - **Smart routing**: Route tasks to the best agent based on capabilities and cost
//! - **Session memory**: Agents remember context across tasks
//! - **Crash recovery**: Checkpoint and resume from any point
//! - **Formulas**: Repeatable workflows like Gas Town's polecats
//! - **Ground integration**: Verified completions with evidence
//!
//! ## Usage
//!
//! ```rust,ignore
//! use loom::Loom;
//!
//! // Connect to a loom (creates .loom/ directory)
//! let mut loom = Loom::open(".")?;
//!
//! // Create a task
//! let task = loom.create("Fix the authentication bug")?;
//!
//! // Route to best agent
//! let decision = loom.route(&task)?;
//! println!("Routing to: {} ({})", decision.agent_id, decision.reason);
//!
//! // Claim and work with session tracking
//! let session = loom.start_session(&task.id, &decision.agent_id)?;
//!
//! // Checkpoint progress
//! loom.checkpoint(&session.id, "Initial analysis complete")?;
//!
//! // Complete with evidence
//! loom.complete(&task.id, Some("commit-abc123"))?;
//! ```
//!
//! ## Directory Structure
//!
//! ```text
//! .loom/
//! ├── work.db           # All tasks (SQLite)
//! ├── agents.db         # Agent profiles and history
//! ├── memory.db         # Sessions and checkpoints
//! ├── run.sock          # Daemon socket
//! ├── dispatch.toml     # Agent config
//! ├── formulas/         # Custom formulas
//! ├── tasks.jsonl       # Git sync export
//! └── log/              # Daemon logs
//! ```

pub mod work;
pub mod dispatch;
pub mod daemon;
pub mod mcp;
pub mod agents;
pub mod memory;
pub mod formulas;
pub mod routing;
pub mod sync;
pub mod verify;
pub mod policy;
pub mod models;
pub mod orchestrator;

use std::path::{Path, PathBuf};
use thiserror::Error;

pub use work::{Task, Status, Priority, CreateTask, WorkStore, WorkSummary, WorkError};
pub use dispatch::{Agent, AgentConfig, DispatchConfig, Dispatcher, DispatchError};
pub use agents::{AgentProfile, AgentRegistry, Capabilities, CostModel, QualityMetrics, RequiredFeatures};
pub use memory::{
    Session, SessionContext, SessionStatus, Checkpoint, MemoryStore, MemoryError,
    // Enhanced context types (Harness AgentContext parity)
    FileModification, ChangeType, IssueUpdate, TaskProgress, TestState, Decision,
};
pub use formulas::{Formula, FormulaRegistry, QualityTier, Step, Variable};
pub use routing::{Router, RoutingStrategy, RoutingConstraints, RoutingDecision};
pub use sync::{GitSync, SyncState, SyncResult, SyncError};
pub use verify::{Verifier, VerificationResult, CheckType, VerifyError, format_evidence};
pub use policy::{Complexity, score_agent, route_by_label, requires_verification};
pub use models::{ModelsConfig, ModelConfig, ModelTier, ModelFamily};
pub use orchestrator::{Orchestrator, OrchestratorConfig, AgentBackend, ExecutionResult, send_notification};

/// Loom error types
#[derive(Error, Debug)]
pub enum LoomError {
    #[error("Work store error: {0}")]
    Work(#[from] WorkError),
    
    #[error("Dispatch error: {0}")]
    Dispatch(#[from] DispatchError),
    
    #[error("Agent error: {0}")]
    Agent(#[from] agents::AgentError),
    
    #[error("Memory error: {0}")]
    Memory(#[from] MemoryError),
    
    #[error("Sync error: {0}")]
    Sync(#[from] SyncError),
    
    #[error("Formula error: {0}")]
    Formula(#[from] formulas::FormulaError),
    
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("Not initialized: run 'lm init' first")]
    NotInitialized,
    
    #[error("Config error: {0}")]
    Config(String),
    
    #[error("Routing error: {0}")]
    Routing(String),
}

/// Main entry point for Loom - the complete coordination layer
pub struct Loom {
    root: PathBuf,
    store: WorkStore,
    agents: AgentRegistry,
    memory: MemoryStore,
    router: Router,
    formulas: FormulaRegistry,
    dispatch: Option<Dispatcher>,
}

impl Loom {
    /// Initialize a new Loom in the given directory
    pub fn init(path: impl AsRef<Path>) -> Result<Self, LoomError> {
        let root = path.as_ref().join(".loom");
        std::fs::create_dir_all(&root)?;
        std::fs::create_dir_all(root.join("log"))?;
        std::fs::create_dir_all(root.join("formulas"))?;
        
        // Initialize all stores
        let store = WorkStore::open(root.join("work.db"))?;
        let mut agents = AgentRegistry::open(root.join("agents.db"))?;
        let memory = MemoryStore::open(root.join("memory.db"))?;
        
        // Create default models.toml if it doesn't exist
        let models_path = root.join("models.toml");
        if !models_path.exists() {
            let _ = ModelsConfig::write_defaults(&models_path);
        }
        
        // Load agents from models config
        let models_config = ModelsConfig::load_or_default(&root);
        agents.register_from_config(&models_config)?;
        
        // Initialize router and formulas (using Create Something optimized defaults)
        let router = Router::new();
        let mut formulas = FormulaRegistry::create_something();
        let _ = formulas.load_from_dir(root.join("formulas"));
        
        // Create default dispatch config if it doesn't exist
        let dispatch_path = root.join("dispatch.toml");
        if !dispatch_path.exists() {
            let default_config = r#"# Loom Dispatch Configuration
# Defines which agents are available and how to route tasks

[agents.claude]
path = "claude"
max_concurrent = 5
cost_per_1k = 0.015

[agents.cursor]
path = "cursor"
max_concurrent = 2
cost_per_1k = 0.020

[agents.codex]
path = "codex"
max_concurrent = 3
cost_per_1k = 0.008

[agents.gemini]
path = "gemini"
max_concurrent = 3
cost_per_1k = 0.001

[routing]
default = "claude"
# Route by task labels:
# labels = { ui = "cursor", api = "codex", planning = "claude" }
"#;
            std::fs::write(&dispatch_path, default_config)?;
        }
        
        Ok(Self {
            root,
            store,
            agents,
            memory,
            router,
            formulas,
            dispatch: None,
        })
    }
    
    /// Open an existing Loom in the given directory
    pub fn open(path: impl AsRef<Path>) -> Result<Self, LoomError> {
        let root = path.as_ref().join(".loom");
        
        if !root.exists() {
            return Err(LoomError::NotInitialized);
        }
        
        let store = WorkStore::open(root.join("work.db"))?;
        let agents = AgentRegistry::open(root.join("agents.db"))?;
        let memory = MemoryStore::open(root.join("memory.db"))?;
        let router = Router::new();
        let mut formulas = FormulaRegistry::create_something();
        let _ = formulas.load_from_dir(root.join("formulas"));
        
        // Try to load dispatch config
        let dispatch = Self::load_dispatch(&root).ok();
        
        Ok(Self {
            root,
            store,
            agents,
            memory,
            router,
            formulas,
            dispatch,
        })
    }
    
    /// Open or initialize a Loom
    pub fn open_or_init(path: impl AsRef<Path>) -> Result<Self, LoomError> {
        let root = path.as_ref().join(".loom");
        
        if root.exists() {
            Self::open(path)
        } else {
            Self::init(path)
        }
    }
    
    fn load_dispatch(root: &Path) -> Result<Dispatcher, LoomError> {
        let dispatch_path = root.join("dispatch.toml");
        if dispatch_path.exists() {
            let config = DispatchConfig::from_file(&dispatch_path)
                .map_err(|e| LoomError::Config(e.to_string()))?;
            Ok(Dispatcher::new(config))
        } else {
            Err(LoomError::Config("dispatch.toml not found".to_string()))
        }
    }
    
    /// Get the root directory
    pub fn root(&self) -> &Path {
        &self.root
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // Task Management
    // ─────────────────────────────────────────────────────────────────────
    
    /// Create a new task
    pub fn create(&mut self, title: impl Into<String>) -> Result<Task, LoomError> {
        let task = self.store.create(CreateTask {
            title: title.into(),
            ..Default::default()
        })?;
        Ok(task)
    }
    
    /// Create a task with full parameters
    pub fn create_task(&mut self, params: CreateTask) -> Result<Task, LoomError> {
        let task = self.store.create(params)?;
        Ok(task)
    }
    
    /// Create a sub-task under a parent
    pub fn spawn(&mut self, parent_id: &str, title: impl Into<String>) -> Result<Task, LoomError> {
        let task = self.store.create(CreateTask {
            title: title.into(),
            parent: Some(parent_id.to_string()),
            ..Default::default()
        })?;
        Ok(task)
    }
    
    /// Get a task by ID
    pub fn get(&self, id: &str) -> Result<Option<Task>, LoomError> {
        Ok(self.store.get(id)?)
    }
    
    /// Claim a task for an agent
    pub fn claim(&mut self, id: &str, agent: &str) -> Result<Task, LoomError> {
        let task = self.store.claim(id, agent)?;
        Ok(task)
    }
    
    /// Release a claimed task
    pub fn release(&mut self, id: &str) -> Result<(), LoomError> {
        self.store.release(id)?;
        Ok(())
    }
    
    /// Complete a task with optional evidence
    /// Returns list of task IDs that were auto-unblocked
    pub fn complete(&mut self, id: &str, evidence: Option<&str>) -> Result<Vec<String>, LoomError> {
        let unblocked = self.store.complete(id, evidence)?;
        Ok(unblocked)
    }
    
    /// Complete a task with cost tracking
    pub fn complete_with_cost(
        &mut self, 
        id: &str, 
        evidence: Option<&str>,
        cost_usd: f64,
    ) -> Result<Vec<String>, LoomError> {
        let unblocked = self.store.complete_with_cost(id, evidence, cost_usd)?;
        Ok(unblocked)
    }
    
    /// Record actual cost for a task (in USD)
    pub fn record_cost(&mut self, id: &str, cost_usd: f64) -> Result<(), LoomError> {
        self.store.record_cost(id, cost_usd)?;
        Ok(())
    }
    
    /// Set task priority
    pub fn set_priority(&mut self, id: &str, priority: Priority) -> Result<(), LoomError> {
        self.store.update_priority(id, priority)?;
        Ok(())
    }
    
    /// Complete a task with Ground verification
    /// 
    /// This runs Ground checks based on task labels before completing.
    /// If any checks fail, returns an error with the verification results.
    /// Returns (VerificationResult, unblocked_task_ids)
    pub fn complete_with_verification(&mut self, id: &str) -> Result<(VerificationResult, Vec<String>), LoomError> {
        let task = self.get(id)?
            .ok_or_else(|| LoomError::Config(format!("Task not found: {}", id)))?;
        
        // Try to get verifier
        let verifier = Verifier::new()
            .map_err(|e| LoomError::Config(e.to_string()))?;
        
        // Run verification based on task labels
        let results = verifier.verify_task_claims(&task.labels, &self.root.parent().unwrap_or(&self.root))
            .map_err(|e| LoomError::Config(e.to_string()))?;
        
        // Format evidence
        let evidence = format_evidence(&results);
        
        // Check if all passed
        let all_passed = results.iter().all(|r| r.passed);
        
        if all_passed || results.is_empty() {
            let unblocked = self.store.complete(id, Some(&evidence))?;
            Ok((VerificationResult {
                check_type: CheckType::Duplicates, // Placeholder
                passed: true,
                issue_count: 0,
                issues: vec![],
                timestamp: chrono::Utc::now(),
            }, unblocked))
        } else {
            // Return the first failing result
            let failed = results.into_iter().find(|r| !r.passed)
                .unwrap_or_else(|| VerificationResult {
                    check_type: CheckType::Duplicates,
                    passed: false,
                    issue_count: 0,
                    issues: vec!["Unknown verification failure".to_string()],
                    timestamp: chrono::Utc::now(),
                });
            
            Err(LoomError::Config(format!(
                "Verification failed: {} - {} issues found",
                failed.check_type.as_str(),
                failed.issue_count
            )))
        }
    }
    
    /// Cancel a task
    pub fn cancel(&mut self, id: &str) -> Result<(), LoomError> {
        self.store.cancel(id)?;
        Ok(())
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // Dependencies
    // ─────────────────────────────────────────────────────────────────────
    
    /// Add a dependency: task_id is blocked by depends_on
    pub fn block(&mut self, task_id: &str, depends_on: &str) -> Result<(), LoomError> {
        self.store.add_dependency(task_id, depends_on)?;
        Ok(())
    }
    
    /// Remove a dependency
    pub fn unblock(&mut self, task_id: &str, depends_on: &str) -> Result<(), LoomError> {
        self.store.remove_dependency(task_id, depends_on)?;
        Ok(())
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // Queries
    // ─────────────────────────────────────────────────────────────────────
    
    /// Get all ready tasks
    pub fn ready(&self) -> Result<Vec<Task>, LoomError> {
        Ok(self.store.ready()?)
    }
    
    /// Get tasks claimed by an agent
    pub fn mine(&self, agent: &str) -> Result<Vec<Task>, LoomError> {
        Ok(self.store.mine(agent)?)
    }
    
    /// Get all blocked tasks
    pub fn blocked(&self) -> Result<Vec<Task>, LoomError> {
        Ok(self.store.blocked()?)
    }
    
    /// List all tasks
    pub fn list(&self) -> Result<Vec<Task>, LoomError> {
        Ok(self.store.list_all()?)
    }
    
    /// List tasks by status
    pub fn list_by_status(&self, status: Status) -> Result<Vec<Task>, LoomError> {
        Ok(self.store.list_by_status(status)?)
    }
    
    /// List tasks by label
    pub fn list_by_label(&self, label: &str) -> Result<Vec<Task>, LoomError> {
        Ok(self.store.list_by_label(label)?)
    }
    
    /// Get children of a task
    pub fn children(&self, parent_id: &str) -> Result<Vec<Task>, LoomError> {
        Ok(self.store.children(parent_id)?)
    }
    
    /// Get summary statistics
    pub fn summary(&self) -> Result<WorkSummary, LoomError> {
        Ok(self.store.summary()?)
    }
    
    /// Get summary statistics filtered by label
    pub fn summary_by_label(&self, label: &str) -> Result<WorkSummary, LoomError> {
        Ok(self.store.summary_by_label(label)?)
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // Smart Routing
    // ─────────────────────────────────────────────────────────────────────
    
    /// Route a task to the best agent
    pub fn route(&mut self, task: &Task) -> Result<RoutingDecision, LoomError> {
        self.router.route(
            task,
            &self.agents,
            RoutingStrategy::Best,
            &RoutingConstraints::default(),
        ).map_err(LoomError::Routing)
    }
    
    /// Route with custom strategy and constraints
    pub fn route_with(
        &mut self,
        task: &Task,
        strategy: RoutingStrategy,
        constraints: &RoutingConstraints,
    ) -> Result<RoutingDecision, LoomError> {
        self.router.route(task, &self.agents, strategy, constraints)
            .map_err(LoomError::Routing)
    }
    
    /// Get all agent profiles
    pub fn agents(&self) -> Result<Vec<AgentProfile>, LoomError> {
        Ok(self.agents.all_profiles()?)
    }
    
    /// Get a specific agent profile
    pub fn agent(&self, id: &str) -> Result<Option<AgentProfile>, LoomError> {
        Ok(self.agents.get_profile(id)?)
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // Sessions & Memory
    // ─────────────────────────────────────────────────────────────────────
    
    /// Start a session for a task
    pub fn start_session(
        &mut self,
        task_id: &str,
        agent_id: &str,
    ) -> Result<Session, LoomError> {
        let session = self.memory.start_session(agent_id, task_id, None, None)?;
        Ok(session)
    }
    
    /// Get the current session for a task
    pub fn current_session(&self, task_id: &str) -> Result<Option<Session>, LoomError> {
        Ok(self.memory.get_active_session_for_task(task_id)?)
    }
    
    /// Get a session by ID
    pub fn get_session(&self, session_id: &str) -> Result<Option<Session>, LoomError> {
        Ok(self.memory.get_session(session_id)?)
    }
    
    /// Create a checkpoint
    pub fn checkpoint(&mut self, session_id: &str, summary: &str) -> Result<Checkpoint, LoomError> {
        let checkpoint = self.memory.create_checkpoint(session_id, summary, None)?;
        Ok(checkpoint)
    }
    
    /// Update session context
    pub fn update_context(&mut self, session_id: &str, context: &SessionContext) -> Result<(), LoomError> {
        self.memory.update_context(session_id, context)?;
        Ok(())
    }
    
    /// Update session context (alias for MCP compatibility)
    pub fn update_session_context(&mut self, session_id: &str, context: &SessionContext) -> Result<(), LoomError> {
        self.update_context(session_id, context)
    }
    
    /// End a session
    pub fn end_session(&mut self, session_id: &str, status: SessionStatus) -> Result<(), LoomError> {
        self.memory.end_session(session_id, status)?;
        Ok(())
    }
    
    /// Get recoverable sessions
    pub fn recoverable_sessions(&self) -> Result<Vec<Session>, LoomError> {
        Ok(self.memory.get_recoverable_sessions()?)
    }
    
    /// Resume a session
    pub fn resume_session(&mut self, session_id: &str) -> Result<Session, LoomError> {
        Ok(self.memory.resume_session(session_id)?)
    }
    
    /// Record execution result for learning
    pub fn record_execution(
        &mut self,
        agent_id: &str,
        task_id: &str,
        task_type: Option<&str>,
        success: bool,
        duration_secs: f64,
    ) -> Result<(), LoomError> {
        self.agents.record_execution(
            agent_id,
            task_id,
            task_type,
            success,
            duration_secs,
            None,
            None,
        )?;
        Ok(())
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // GSD-Inspired: Discuss Phase (Pre-Planning)
    // ─────────────────────────────────────────────────────────────────────
    
    /// Record a preference discussion for a task
    /// This captures implementation preferences before planning
    pub fn record_preference(
        &mut self,
        task_id: &str,
        category: &str,
        question: &str,
        decision: &str,
        rationale: Option<&str>,
        options: Option<&[String]>,
    ) -> Result<(), LoomError> {
        use std::fs::{OpenOptions};
        use std::io::Write;
        
        // Store preferences in a {task-id}-CONTEXT.md file in the loom directory
        let context_file = self.root.join(format!("{}-CONTEXT.md", task_id));
        
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&context_file)?;
        
        // Write the preference in markdown format
        writeln!(file, "\n## {} Preference: {}", category, question)?;
        writeln!(file)?;
        
        if let Some(opts) = options {
            writeln!(file, "**Options considered:**")?;
            for opt in opts {
                let marker = if opt == decision { "✓" } else { "-" };
                writeln!(file, "{} {}", marker, opt)?;
            }
            writeln!(file)?;
        }
        
        writeln!(file, "**Decision:** {}", decision)?;
        
        if let Some(rat) = rationale {
            writeln!(file, "\n**Rationale:** {}", rat)?;
        }
        
        writeln!(file, "\n---")?;
        
        Ok(())
    }
    
    /// Get all recorded preferences for a task
    pub fn get_preferences(&self, task_id: &str) -> Result<Option<String>, LoomError> {
        let context_file = self.root.join(format!("{}-CONTEXT.md", task_id));
        
        if context_file.exists() {
            Ok(Some(std::fs::read_to_string(&context_file)?))
        } else {
            Ok(None)
        }
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // Formulas
    // ─────────────────────────────────────────────────────────────────────
    
    /// Get a formula by name
    pub fn formula(&self, name: &str) -> Option<&Formula> {
        self.formulas.get(name)
    }
    
    /// List available formulas
    pub fn list_formulas(&self) -> Vec<&str> {
        self.formulas.list()
    }
    
    /// Route a task using a formula
    pub fn route_for_formula(&mut self, formula: &Formula) -> Result<RoutingDecision, LoomError> {
        self.router.route_for_formula(formula, &self.agents, &RoutingConstraints::default())
            .map_err(LoomError::Routing)
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // Dispatch
    // ─────────────────────────────────────────────────────────────────────
    
    /// Get the dispatcher (if configured)
    pub fn dispatcher(&self) -> Option<&Dispatcher> {
        self.dispatch.as_ref()
    }
    
    /// Get mutable dispatcher
    pub fn dispatcher_mut(&mut self) -> Option<&mut Dispatcher> {
        self.dispatch.as_mut()
    }
    
    /// Reload dispatch configuration
    pub fn reload_dispatch(&mut self) -> Result<(), LoomError> {
        self.dispatch = Some(Self::load_dispatch(&self.root)?);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    
    #[test]
    fn test_init_and_open() {
        let dir = tempdir().unwrap();
        
        // Initialize
        let mut loom = Loom::init(dir.path()).unwrap();
        
        // Create a task
        let task = loom.create("Test task").unwrap();
        assert!(task.id.starts_with("lm-"));
        
        // Reopen
        drop(loom);
        let loom = Loom::open(dir.path()).unwrap();
        
        // Task should still be there
        let retrieved = loom.get(&task.id).unwrap().unwrap();
        assert_eq!(retrieved.title, "Test task");
    }
    
    #[test]
    fn test_routing() {
        let dir = tempdir().unwrap();
        let mut loom = Loom::init(dir.path()).unwrap();
        
        let task = loom.create_task(CreateTask {
            title: "Plan authentication".to_string(),
            labels: vec!["planning".to_string(), "architecture".to_string()],
            ..Default::default()
        }).unwrap();
        
        let decision = loom.route(&task).unwrap();
        // Routing should return a valid decision
        assert!(!decision.agent_id.is_empty());
        assert!(decision.confidence > 0.0);
        // The algorithm considers capability, quality history, cost, and availability
        // It may pick different agents based on the weighted factors
    }
    
    #[test]
    fn test_session_lifecycle() {
        let dir = tempdir().unwrap();
        let mut loom = Loom::init(dir.path()).unwrap();
        
        let task = loom.create("Session test").unwrap();
        
        // Start session
        let session = loom.start_session(&task.id, "claude-code").unwrap();
        assert_eq!(session.status, SessionStatus::Active);
        
        // Create checkpoint
        let checkpoint = loom.checkpoint(&session.id, "Progress made").unwrap();
        assert_eq!(checkpoint.sequence, 1);
        
        // End session
        loom.end_session(&session.id, SessionStatus::Completed).unwrap();
    }
    
    #[test]
    fn test_formulas() {
        let dir = tempdir().unwrap();
        let loom = Loom::init(dir.path()).unwrap();
        
        // Should have built-in formulas
        assert!(loom.formula("basic-task").is_some());
        assert!(loom.formula("feature").is_some());
        assert!(loom.formula("bug-fix").is_some());
        assert!(loom.formula("refactor").is_some());
    }
}
