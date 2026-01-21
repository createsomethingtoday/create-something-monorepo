//! # lm - Loom CLI
//!
//! The command-line interface for Loom.
//!
//! ## Examples
//!
//! ```bash
//! # Initialize
//! lm init
//!
//! # Create tasks
//! lm create "Fix authentication bug"
//! lm create "Plan new feature" --labels planning,architecture
//!
//! # View work
//! lm ready        # Tasks ready to work on
//! lm mine         # Tasks claimed by you
//! lm summary      # Overview of all work
//!
//! # Work on a task
//! lm claim lm-abc --agent claude-code
//! lm route lm-abc # Get routing recommendation
//! lm done lm-abc --evidence "commit abc123"
//!
//! # Sessions & Recovery
//! lm session start lm-abc --agent claude-code
//! lm checkpoint "Initial analysis complete"
//! lm session end --status completed
//! lm recover      # List recoverable sessions
//!
//! # Formulas
//! lm formula list
//! lm formula show feature
//! lm formula run feature --feature_name "dark mode" --package io
//!
//! # Agents
//! lm agents       # List available agents
//! lm agent claude-code  # Show agent details
//!
//! # Git sync
//! lm sync         # Full sync with git
//! lm push         # Export and push
//! lm pull         # Fetch and import
//! ```

use clap::{Parser, Subcommand};
use loom::{
    Loom, LoomError, CreateTask, Status,
    RoutingStrategy, RoutingConstraints, SessionStatus,
};

/// Loom - AI-native coordination layer
#[derive(Parser)]
#[command(name = "lm")]
#[command(about = "External memory for agents. Multi-agent task coordination.")]
#[command(version)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Initialize a new Loom in the current directory
    Init,
    
    /// List tasks ready to work on
    Ready,
    
    /// List tasks claimed by an agent
    Mine {
        /// Agent name (defaults to system hostname)
        #[arg(long, short)]
        agent: Option<String>,
    },
    
    /// Create a new task
    Create {
        /// Task title
        title: String,
        
        /// Description
        #[arg(long, short)]
        description: Option<String>,
        
        /// Labels (comma-separated)
        #[arg(long, short)]
        labels: Option<String>,
        
        /// Parent task ID
        #[arg(long, short)]
        parent: Option<String>,
    },
    
    /// Claim a task
    Claim {
        /// Task ID
        id: String,
        
        /// Agent claiming the task
        #[arg(long, short)]
        agent: Option<String>,
    },
    
    /// Release a claimed task
    Release {
        /// Task ID
        id: String,
    },
    
    /// Mark a task as done
    Done {
        /// Task ID
        id: String,
        
        /// Evidence (commit hash, URL, etc.)
        #[arg(long, short)]
        evidence: Option<String>,
    },
    
    /// Cancel a task
    Cancel {
        /// Task ID
        id: String,
    },
    
    /// List all tasks
    List {
        /// Filter by status
        #[arg(long, short)]
        status: Option<String>,
        
        /// Filter by label
        #[arg(long, short)]
        label: Option<String>,
    },
    
    /// Show task details
    Show {
        /// Task ID
        id: String,
    },
    
    /// Add a dependency (task blocked by another)
    Block {
        /// Task that is blocked
        task: String,
        
        /// Task that blocks it
        by: String,
    },
    
    /// Remove a dependency
    Unblock {
        /// Task that was blocked
        task: String,
        
        /// Task that was blocking it
        by: String,
    },
    
    /// Create a sub-task
    Spawn {
        /// Parent task ID
        parent: String,
        
        /// Sub-task title
        title: String,
    },
    
    /// Show work summary
    Summary,
    
    /// Route a task to the best agent
    Route {
        /// Task ID
        id: String,
        
        /// Routing strategy (best, cheapest, fastest)
        #[arg(long, short, default_value = "best")]
        strategy: String,
        
        /// Maximum cost in dollars
        #[arg(long)]
        max_cost: Option<f64>,
    },
    
    /// Session management
    Session {
        #[command(subcommand)]
        command: SessionCommands,
    },
    
    /// Create a checkpoint for the current session
    Checkpoint {
        /// Summary of progress
        summary: String,
        
        /// Session ID (defaults to active session)
        #[arg(long)]
        session: Option<String>,
    },
    
    /// List recoverable sessions
    Recover,
    
    /// Resume a session
    Resume {
        /// Session ID
        session_id: String,
    },
    
    /// List available agents
    Agents,
    
    /// Show agent details
    Agent {
        /// Agent ID
        id: String,
    },
    
    /// Formula management
    Formula {
        #[command(subcommand)]
        command: FormulaCommands,
    },
    
    /// Git sync operations
    Sync,
    
    /// Export and push to git
    Push,
    
    /// Fetch and import from git
    Pull,
    
    /// Run the daemon
    Daemon {
        #[command(subcommand)]
        command: DaemonCommands,
    },
}

#[derive(Subcommand)]
enum SessionCommands {
    /// Start a new session
    Start {
        /// Task ID
        task: String,
        
        /// Agent working on the task
        #[arg(long, short)]
        agent: Option<String>,
    },
    
    /// End the current session
    End {
        /// Session status (completed, failed, cancelled)
        #[arg(long, short)]
        status: Option<String>,
        
        /// Session ID (defaults to active session)
        #[arg(long)]
        session: Option<String>,
    },
    
    /// Show current session
    Current {
        /// Task ID
        task: String,
    },
}

#[derive(Subcommand)]
enum FormulaCommands {
    /// List available formulas
    List,
    
    /// Show formula details
    Show {
        /// Formula name
        name: String,
    },
    
    /// Run a formula
    Run {
        /// Formula name
        name: String,
        
        /// Variables (key=value format)
        #[arg(long, short)]
        vars: Vec<String>,
    },
}

#[derive(Subcommand)]
enum DaemonCommands {
    /// Start the daemon
    Start,
    
    /// Check daemon status
    Status,
    
    /// Stop the daemon
    Stop,
}

fn main() {
    if let Err(e) = run() {
        eprintln!("Error: {}", e);
        std::process::exit(1);
    }
}

fn run() -> Result<(), LoomError> {
    let cli = Cli::parse();
    
    match cli.command {
        Commands::Init => {
            let loom = Loom::init(".")?;
            println!("Initialized Loom in {}", loom.root().display());
        }
        
        Commands::Ready => {
            let loom = Loom::open(".")?;
            let tasks = loom.ready()?;
            
            if tasks.is_empty() {
                println!("No tasks ready");
            } else {
                println!("{:<10} {:<40} {:?}", "ID", "TITLE", "LABELS");
                for task in tasks {
                    println!("{:<10} {:<40} {:?}", task.id, truncate(&task.title, 40), task.labels);
                }
            }
        }
        
        Commands::Mine { agent } => {
            let loom = Loom::open(".")?;
            let agent = agent.unwrap_or_else(get_hostname);
            let tasks = loom.mine(&agent)?;
            
            if tasks.is_empty() {
                println!("No tasks claimed by {}", agent);
            } else {
                println!("{:<10} {:<40} {:?}", "ID", "TITLE", "STATUS");
                for task in tasks {
                    println!("{:<10} {:<40} {:?}", task.id, truncate(&task.title, 40), task.status);
                }
            }
        }
        
        Commands::Create { title, description, labels, parent } => {
            let mut loom = Loom::open_or_init(".")?;
            let labels: Vec<String> = labels
                .map(|l| l.split(',').map(|s| s.trim().to_string()).collect())
                .unwrap_or_default();
            
            let task = loom.create_task(CreateTask {
                title,
                description,
                priority: Default::default(),
                labels,
                parent,
                evidence: None,
            })?;
            
            println!("Created: {} - {}", task.id, task.title);
        }
        
        Commands::Claim { id, agent } => {
            let mut loom = Loom::open(".")?;
            let agent = agent.unwrap_or_else(get_hostname);
            let task = loom.claim(&id, &agent)?;
            println!("Claimed: {} by {}", task.id, agent);
        }
        
        Commands::Release { id } => {
            let mut loom = Loom::open(".")?;
            loom.release(&id)?;
            println!("Released: {}", id);
        }
        
        Commands::Done { id, evidence } => {
            let mut loom = Loom::open(".")?;
            loom.complete(&id, evidence.as_deref())?;
            println!("Completed: {}", id);
            if let Some(ev) = evidence {
                println!("Evidence: {}", ev);
            }
        }
        
        Commands::Cancel { id } => {
            let mut loom = Loom::open(".")?;
            loom.cancel(&id)?;
            println!("Cancelled: {}", id);
        }
        
        Commands::List { status, label } => {
            let loom = Loom::open(".")?;
            
            let tasks = if let Some(status_str) = status {
                let status = parse_status(&status_str)?;
                loom.list_by_status(status)?
            } else if let Some(label) = label {
                loom.list_by_label(&label)?
            } else {
                loom.list()?
            };
            
            if tasks.is_empty() {
                println!("No tasks found");
            } else {
                println!("{:<10} {:<8} {:<40} {:?}", "ID", "STATUS", "TITLE", "AGENT");
                for task in tasks {
                    println!(
                        "{:<10} {:<8} {:<40} {:?}",
                        task.id,
                        format!("{:?}", task.status).to_lowercase(),
                        truncate(&task.title, 40),
                        task.agent
                    );
                }
            }
        }
        
        Commands::Show { id } => {
            let loom = Loom::open(".")?;
            let task = loom.get(&id)?
                .ok_or_else(|| LoomError::Config(format!("Task not found: {}", id)))?;
            
            println!("ID:          {}", task.id);
            println!("Title:       {}", task.title);
            println!("Status:      {:?}", task.status);
            println!("Agent:       {}", task.agent.as_deref().unwrap_or("-"));
            println!("Labels:      {:?}", task.labels);
            println!("Parent:      {}", task.parent.as_deref().unwrap_or("-"));
            println!("Evidence:    {}", task.evidence.as_deref().unwrap_or("-"));
            println!("Created:     {}", task.created_at);
            println!("Updated:     {}", task.updated_at);
            
            if let Some(desc) = &task.description {
                println!("\nDescription:\n{}", desc);
            }
        }
        
        Commands::Block { task, by } => {
            let mut loom = Loom::open(".")?;
            loom.block(&task, &by)?;
            println!("{} is now blocked by {}", task, by);
        }
        
        Commands::Unblock { task, by } => {
            let mut loom = Loom::open(".")?;
            loom.unblock(&task, &by)?;
            println!("{} is no longer blocked by {}", task, by);
        }
        
        Commands::Spawn { parent, title } => {
            let mut loom = Loom::open(".")?;
            let task = loom.spawn(&parent, title)?;
            println!("Created sub-task: {} under {}", task.id, parent);
        }
        
        Commands::Summary => {
            let loom = Loom::open(".")?;
            let summary = loom.summary()?;
            
            println!("Work Summary");
            println!("============");
            println!("Total:     {}", summary.total());
            println!("Ready:     {}", summary.ready);
            println!("Claimed:   {}", summary.claimed);
            println!("Blocked:   {}", summary.blocked);
            println!("Done:      {}", summary.done);
            println!("Cancelled: {}", summary.cancelled);
        }
        
        Commands::Route { id, strategy, max_cost } => {
            let mut loom = Loom::open(".")?;
            let task = loom.get(&id)?
                .ok_or_else(|| LoomError::Config(format!("Task not found: {}", id)))?;
            
            let strategy = match strategy.as_str() {
                "best" => RoutingStrategy::Best,
                "cheapest" => RoutingStrategy::Cheapest,
                "fastest" => RoutingStrategy::Fastest,
                s => return Err(LoomError::Config(format!("Unknown strategy: {}", s))),
            };
            
            let constraints = RoutingConstraints {
                max_cost,
                ..Default::default()
            };
            
            let decision = loom.route_with(&task, strategy, &constraints)?;
            
            println!("Routing Decision");
            println!("================");
            println!("Agent:      {}", decision.agent_id);
            println!("Reason:     {}", decision.reason);
            println!("Cost:       ${:.4}", decision.estimated_cost);
            println!("Confidence: {:.0}%", decision.confidence * 100.0);
            if !decision.alternatives.is_empty() {
                println!("Alternatives: {:?}", decision.alternatives);
            }
        }
        
        Commands::Session { command } => {
            match command {
                SessionCommands::Start { task, agent } => {
                    let mut loom = Loom::open(".")?;
                    let agent = agent.unwrap_or_else(get_hostname);
                    
                    // First claim the task
                    loom.claim(&task, &agent)?;
                    
                    // Then start session
                    let session = loom.start_session(&task, &agent)?;
                    println!("Started session: {}", session.id);
                    println!("Task: {}", task);
                    println!("Agent: {}", agent);
                }
                
                SessionCommands::End { status, session } => {
                    let mut loom = Loom::open(".")?;
                    
                    let session_id = if let Some(id) = session {
                        id
                    } else {
                        return Err(LoomError::Config("Session ID required".to_string()));
                    };
                    
                    let status = match status.as_deref() {
                        Some("completed") | None => SessionStatus::Completed,
                        Some("failed") => SessionStatus::Failed,
                        Some("cancelled") => SessionStatus::Cancelled,
                        Some(s) => return Err(LoomError::Config(format!("Unknown status: {}", s))),
                    };
                    
                    loom.end_session(&session_id, status)?;
                    println!("Ended session {} with status {:?}", session_id, status);
                }
                
                SessionCommands::Current { task } => {
                    let loom = Loom::open(".")?;
                    
                    if let Some(session) = loom.current_session(&task)? {
                        println!("Session:    {}", session.id);
                        println!("Agent:      {}", session.agent_id);
                        println!("Task:       {}", session.task_id);
                        println!("Status:     {:?}", session.status);
                        println!("Started:    {}", session.started_at);
                        println!("Checkpoint: {}", session.last_checkpoint.as_deref().unwrap_or("-"));
                    } else {
                        println!("No active session for task {}", task);
                    }
                }
            }
        }
        
        Commands::Checkpoint { summary, session } => {
            let mut loom = Loom::open(".")?;
            
            let session_id = if let Some(id) = session {
                id
            } else {
                return Err(LoomError::Config("Session ID required".to_string()));
            };
            
            let checkpoint = loom.checkpoint(&session_id, &summary)?;
            println!("Created checkpoint: {} (sequence {})", checkpoint.id, checkpoint.sequence);
        }
        
        Commands::Recover => {
            let loom = Loom::open(".")?;
            let sessions = loom.recoverable_sessions()?;
            
            if sessions.is_empty() {
                println!("No sessions to recover");
            } else {
                println!("{:<12} {:<12} {:<12} {:?}", "SESSION", "AGENT", "TASK", "CHECKPOINT");
                for session in sessions {
                    println!(
                        "{:<12} {:<12} {:<12} {:?}",
                        session.id,
                        session.agent_id,
                        session.task_id,
                        session.last_checkpoint
                    );
                }
            }
        }
        
        Commands::Resume { session_id } => {
            let mut loom = Loom::open(".")?;
            let session = loom.resume_session(&session_id)?;
            println!("Resumed session: {}", session.id);
            println!("Task: {}", session.task_id);
            println!("Agent: {}", session.agent_id);
            
            if let Some(checkpoint) = &session.last_checkpoint {
                println!("Restored from checkpoint: {}", checkpoint);
            }
        }
        
        Commands::Agents => {
            let loom = Loom::open(".")?;
            let agents = loom.agents()?;
            
            println!("{:<12} {:<20} {:<10} {:?}", "ID", "NAME", "AVAILABLE", "SUCCESS RATE");
            for agent in agents {
                println!(
                    "{:<12} {:<20} {:<10} {:.0}%",
                    agent.id,
                    agent.name,
                    if agent.available { "yes" } else { "no" },
                    agent.quality.success_rate() * 100.0
                );
            }
        }
        
        Commands::Agent { id } => {
            let loom = Loom::open(".")?;
            let agent = loom.agent(&id)?
                .ok_or_else(|| LoomError::Config(format!("Agent not found: {}", id)))?;
            
            println!("ID:          {}", agent.id);
            println!("Name:        {}", agent.name);
            println!("CLI:         {}", agent.cli_path);
            println!("Available:   {}", agent.available);
            println!("Concurrent:  {}/{}", agent.active, agent.max_concurrent);
            println!();
            println!("Capabilities:");
            println!("  Planning:  {:.0}%", agent.capabilities.planning * 100.0);
            println!("  Coding:    {:.0}%", agent.capabilities.coding * 100.0);
            println!("  Debugging: {:.0}%", agent.capabilities.debugging * 100.0);
            println!("  UI:        {:.0}%", agent.capabilities.ui * 100.0);
            println!("  Docs:      {:.0}%", agent.capabilities.docs * 100.0);
            println!("  Refactor:  {:.0}%", agent.capabilities.refactor * 100.0);
            println!("  Testing:   {:.0}%", agent.capabilities.testing * 100.0);
            println!("  MCP:       {}", agent.capabilities.mcp);
            println!("  Checkpoints: {}", agent.capabilities.checkpoints);
            println!("  Git-aware: {}", agent.capabilities.git_aware);
            println!();
            println!("Cost Model:");
            println!("  Input:     ${:.5}/1K tokens", agent.cost.input_per_1k);
            println!("  Output:    ${:.5}/1K tokens", agent.cost.output_per_1k);
            println!();
            println!("Quality:");
            println!("  Success rate: {:.0}%", agent.quality.success_rate() * 100.0);
            println!("  Avg duration: {:.0}s", agent.quality.avg_duration_secs);
        }
        
        Commands::Formula { command } => {
            match command {
                FormulaCommands::List => {
                    let loom = Loom::open(".")?;
                    let formulas = loom.list_formulas();
                    
                    println!("Available Formulas:");
                    for name in formulas {
                        if let Some(formula) = loom.formula(name) {
                            println!("  {:<15} - {}", name, formula.description);
                        }
                    }
                }
                
                FormulaCommands::Show { name } => {
                    let loom = Loom::open(".")?;
                    let formula = loom.formula(&name)
                        .ok_or_else(|| LoomError::Config(format!("Formula not found: {}", name)))?;
                    
                    println!("Formula: {}", formula.name);
                    println!("Description: {}", formula.description);
                    println!("Quality: {:?}", formula.quality);
                    println!("Agent: {}", formula.agent.as_deref().unwrap_or("auto"));
                    println!();
                    
                    if !formula.variables.is_empty() {
                        println!("Variables:");
                        for var in &formula.variables {
                            println!("  {} - {} {}", 
                                var.name, 
                                var.description,
                                if var.required { "(required)" } else { "" }
                            );
                        }
                        println!();
                    }
                    
                    println!("Steps:");
                    for (i, step) in formula.steps.iter().enumerate() {
                        println!("  {}. {} - {}", i + 1, step.title, step.description);
                    }
                }
                
                FormulaCommands::Run { name, vars } => {
                    let mut loom = Loom::open(".")?;
                    let formula = loom.formula(&name)
                        .ok_or_else(|| LoomError::Config(format!("Formula not found: {}", name)))?
                        .clone();
                    
                    // Parse variables
                    let mut var_map = std::collections::HashMap::new();
                    for var_str in vars {
                        if let Some((k, v)) = var_str.split_once('=') {
                            var_map.insert(k.to_string(), v.to_string());
                        }
                    }
                    
                    // Validate variables
                    formula.validate_variables(&var_map)
                        .map_err(|e| LoomError::Config(e.to_string()))?;
                    
                    // Get routing decision
                    let decision = loom.route_for_formula(&formula)?;
                    
                    println!("Running formula: {}", formula.name);
                    println!("Agent: {} ({})", decision.agent_id, decision.reason);
                    println!();
                    
                    // Create task for the formula
                    let task = loom.create_task(CreateTask {
                        title: format!("[{}] {}", formula.name, formula.description),
                        description: Some(format!("Variables: {:?}", var_map)),
                        priority: Default::default(),
                        labels: formula.labels.clone(),
                        parent: None,
                        evidence: None,
                    })?;
                    
                    println!("Created task: {}", task.id);
                    println!();
                    println!("Steps to execute:");
                    for (i, step) in formula.steps.iter().enumerate() {
                        let prompt = step.prompt.as_ref()
                            .map(|p| formula.expand_template(p, &var_map))
                            .unwrap_or_default();
                        
                        println!("  {}. {} {}", 
                            i + 1, 
                            step.title,
                            if step.checkpoint { "[checkpoint]" } else { "" }
                        );
                        if !prompt.is_empty() {
                            println!("     Prompt: {}", prompt);
                        }
                    }
                }
            }
        }
        
        Commands::Sync | Commands::Push | Commands::Pull => {
            // These require git to be available
            println!("Git sync not yet fully implemented");
            println!("Use 'lm list --format json' to export tasks manually");
        }
        
        Commands::Daemon { command } => {
            match command {
                DaemonCommands::Start => {
                    println!("Starting daemon...");
                    let runtime = tokio::runtime::Runtime::new()
                        .map_err(|e| LoomError::Io(e.into()))?;
                    
                    runtime.block_on(async {
                        let loom = Loom::open(".")?;
                        let daemon = loom::daemon::Daemon::new(loom.root())
                            .map_err(|e| LoomError::Config(e.to_string()))?;
                        daemon.run().await
                            .map_err(|e| LoomError::Config(e.to_string()))
                    })?;
                }
                
                DaemonCommands::Status => {
                    let loom = Loom::open(".")?;
                    let socket_path = loom.root().join("run.sock");
                    
                    if socket_path.exists() {
                        println!("Daemon: running");
                        println!("Socket: {}", socket_path.display());
                    } else {
                        println!("Daemon: not running");
                    }
                }
                
                DaemonCommands::Stop => {
                    let loom = Loom::open(".")?;
                    let socket_path = loom.root().join("run.sock");
                    
                    if socket_path.exists() {
                        std::fs::remove_file(&socket_path)?;
                        println!("Daemon stopped");
                    } else {
                        println!("Daemon not running");
                    }
                }
            }
        }
    }
    
    Ok(())
}

fn parse_status(s: &str) -> Result<Status, LoomError> {
    match s.to_lowercase().as_str() {
        "ready" => Ok(Status::Ready),
        "claimed" => Ok(Status::Claimed),
        "blocked" => Ok(Status::Blocked),
        "done" => Ok(Status::Done),
        "cancelled" => Ok(Status::Cancelled),
        _ => Err(LoomError::Config(format!("Unknown status: {}", s))),
    }
}

fn truncate(s: &str, max: usize) -> String {
    if s.len() <= max {
        s.to_string()
    } else {
        format!("{}...", &s[..max - 3])
    }
}

fn get_hostname() -> String {
    hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "unknown".to_string())
}
