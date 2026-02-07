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
    Backfill, BackfillOptions, BackfillAnalytics,
    PriorityCalculator,
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
    Ready {
        /// Output robot-priority ranking with scores (like bv --robot-priority)
        #[arg(long, short)]
        ranked: bool,
        
        /// Output format (text, json)
        #[arg(long, default_value = "text")]
        format: String,
    },
    
    /// List blocked tasks and what's blocking them
    Blocked,
    
    /// Update a task
    Update {
        /// Task ID
        id: String,
        
        /// New status (ready, claimed, blocked, done, cancelled)
        #[arg(long)]
        status: Option<String>,
        
        /// New priority (critical, high, normal, low)
        #[arg(long)]
        priority: Option<String>,
        
        /// New issue type (bug, feature, task, epic, chore)
        #[arg(long, name = "type")]
        issue_type: Option<String>,
        
        /// New description
        #[arg(long)]
        description: Option<String>,
    },
    
    /// Compact database by removing old done/cancelled tasks
    Compact {
        /// Remove tasks older than N days (default: 30)
        #[arg(long, default_value = "30")]
        older_than: u32,
        
        /// Preview without deleting
        #[arg(long)]
        dry_run: bool,
    },
    
    /// Health check for the loom database
    Doctor,
    
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
        
        /// Filter by repository
        #[arg(long, short)]
        repo: Option<String>,
    },
    
    /// List configured repositories
    Repos,
    
    /// List tasks from all configured repositories
    All {
        /// Filter by status
        #[arg(long, short)]
        status: Option<String>,
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
    
    /// Backfill from Git commits and Beads issues
    Backfill {
        /// Start date (ISO 8601 or relative like "30 days ago")
        #[arg(long, short)]
        since: Option<String>,
        
        /// End date (ISO 8601 or relative)
        #[arg(long, short)]
        until: Option<String>,
        
        /// Filter by git author
        #[arg(long, short)]
        author: Option<String>,
        
        /// Path to Beads directory (defaults to ./csm/.beads)
        #[arg(long, short)]
        beads: Option<String>,
        
        /// Preview without writing
        #[arg(long)]
        dry_run: bool,
    },
    
    /// Show analytics from backfilled data
    Analytics {
        /// Start date filter
        #[arg(long, short)]
        since: Option<String>,
        
        /// Filter by agent
        #[arg(long, short)]
        agent: Option<String>,
    },
    
    /// Notion sync management
    Notion {
        #[command(subcommand)]
        command: NotionCommands,
    },
}

#[derive(Subcommand)]
enum NotionCommands {
    /// Initialize Notion database for work analytics
    Init {
        /// Parent page ID in Notion (where to create the database)
        parent_page_id: String,
        
        /// Notion OAuth access token (or set NOTION_TOKEN env var)
        #[arg(long, short)]
        token: Option<String>,
    },
    
    /// Set Notion OAuth token
    Auth {
        /// Notion OAuth access token
        token: String,
    },
    
    /// Sync tasks to Notion database
    Sync {
        /// Preview without writing
        #[arg(long)]
        dry_run: bool,
        
        /// Update all pages regardless of timestamp
        #[arg(long)]
        force: bool,
        
        /// Filter by status (ready, claimed, blocked, done, cancelled)
        #[arg(long)]
        status: Option<String>,
        
        /// Only sync tasks updated after this date (ISO 8601)
        #[arg(long)]
        since: Option<String>,
    },
    
    /// Show Notion sync status
    Status,
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
        
        Commands::Ready { ranked, format } => {
            let loom = Loom::open(".")?;
            
            if ranked {
                // Robot-priority ranking with scores
                let priority = PriorityCalculator::new(loom.store());
                let results = priority.get_prioritized(20)
                    .map_err(|e| LoomError::Work(e))?;
                
                if format == "json" {
                    println!("{}", serde_json::to_string_pretty(&results).unwrap_or_default());
                } else {
                    if results.is_empty() {
                        println!("No tasks ready");
                    } else {
                        println!("{:<10} {:<6} {:<40} {}", "ID", "SCORE", "TITLE", "REASON");
                        for result in results {
                            println!("{:<10} {:<6.2} {:<40} {}", 
                                result.task.id, 
                                result.score, 
                                truncate(&result.task.title, 40),
                                result.reason
                            );
                        }
                    }
                }
            } else {
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
        }
        
        Commands::Blocked => {
            let loom = Loom::open(".")?;
            let tasks = loom.blocked()?;
            
            if tasks.is_empty() {
                println!("No blocked tasks");
            } else {
                println!("{:<10} {:<40} {}", "ID", "TITLE", "BLOCKED BY");
                for task in tasks {
                    let blockers = loom.get_blocking_tasks(&task.id)?;
                    let blocker_ids: Vec<_> = blockers.iter().map(|t| t.id.as_str()).collect();
                    println!("{:<10} {:<40} {}", 
                        task.id, 
                        truncate(&task.title, 40), 
                        blocker_ids.join(", ")
                    );
                }
            }
        }
        
        Commands::Update { id, status, priority, issue_type, description } => {
            let mut loom = Loom::open(".")?;
            let mut updated = false;
            
            if let Some(status_str) = status {
                let new_status = parse_status(&status_str)?;
                // Use the store through a workaround - update via complete/cancel for done/cancelled
                match new_status {
                    Status::Done => {
                        loom.complete(&id, None)?;
                    }
                    Status::Cancelled => {
                        loom.cancel(&id)?;
                    }
                    Status::Claimed => {
                        loom.claim(&id, &get_hostname())?;
                    }
                    Status::Ready => {
                        loom.release(&id)?;
                    }
                    _ => {
                        // Blocked status is managed automatically by dependencies
                        println!("Status {:?} is managed automatically", new_status);
                    }
                }
                println!("Status updated to {:?}", new_status);
                updated = true;
            }
            
            if let Some(priority_str) = priority {
                use loom::Priority as TaskPriority;
                let priority = TaskPriority::from_str(&priority_str)
                    .ok_or_else(|| LoomError::Config(format!("Invalid priority: {}", priority_str)))?;
                loom.set_priority(&id, priority)?;
                println!("Priority updated to {:?}", priority);
                updated = true;
            }
            
            if let Some(type_str) = issue_type {
                use loom::IssueType;
                let issue_type = IssueType::from_str(&type_str)
                    .ok_or_else(|| LoomError::Config(format!("Invalid issue type: {}", type_str)))?;
                loom.set_issue_type(&id, issue_type)?;
                println!("Issue type updated to {:?}", issue_type);
                updated = true;
            }
            
            if let Some(desc) = description {
                let desc_val = if desc.is_empty() { None } else { Some(desc.as_str()) };
                loom.set_description(&id, desc_val)?;
                println!("Description updated");
                updated = true;
            }
            
            if !updated {
                println!("No updates specified. Use --status, --priority, --type, or --description");
            }
        }
        
        Commands::Compact { older_than, dry_run } => {
            if dry_run {
                // Preview mode
                let loom = Loom::open(".")?;
                use loom::Status;
                let all_tasks = loom.list()?;
                let cutoff = chrono::Utc::now() - chrono::Duration::days(older_than as i64);
                
                let to_remove: Vec<_> = all_tasks.iter()
                    .filter(|t| matches!(t.status, Status::Done | Status::Cancelled))
                    .filter(|t| t.updated_at < cutoff)
                    .collect();
                
                if to_remove.is_empty() {
                    println!("No tasks to compact (older than {} days)", older_than);
                } else {
                    println!("Would remove {} tasks:", to_remove.len());
                    for task in to_remove {
                        println!("  {} - {} ({:?})", task.id, truncate(&task.title, 40), task.status);
                    }
                }
            } else {
                let mut loom = Loom::open(".")?;
                let removed = loom.compact(older_than)?;
                println!("Compacted: {} tasks removed (older than {} days)", removed, older_than);
            }
        }
        
        Commands::Doctor => {
            let loom = Loom::open(".")?;
            let summary = loom.summary()?;
            
            println!("Loom Health Check");
            println!("=================");
            println!();
            println!("Database: {}", loom.root().join("work.db").display());
            println!();
            println!("Task Summary:");
            println!("  Ready:     {}", summary.ready);
            println!("  Claimed:   {}", summary.claimed);
            println!("  Blocked:   {}", summary.blocked);
            println!("  Done:      {}", summary.done);
            println!("  Cancelled: {}", summary.cancelled);
            println!("  Total:     {}", summary.total());
            println!();
            println!("  Progress:  {}%", summary.progress_pct());
            println!("  Total Cost: ${:.2}", summary.total_cost_usd);
            
            // Check for potential issues
            let mut issues: Vec<String> = vec![];
            
            // Check for orphaned blocked tasks (blocked by non-existent tasks)
            let blocked_tasks = loom.blocked()?;
            for task in &blocked_tasks {
                let blockers = loom.get_blocking_tasks(&task.id)?;
                if blockers.is_empty() {
                    issues.push(format!("Task {} is blocked but has no blockers", task.id));
                }
            }
            
            // Check for claimed tasks with no agent
            let claimed_tasks = loom.list_by_status(Status::Claimed)?;
            for task in &claimed_tasks {
                if task.agent.is_none() {
                    issues.push(format!("Task {} is claimed but has no agent", task.id));
                }
            }
            
            if issues.is_empty() {
                println!();
                println!("No issues found");
            } else {
                println!();
                println!("Issues ({}):", issues.len());
                for issue in issues {
                    println!("  - {}", issue);
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
                repo: None,
                ..Default::default()
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
        
        Commands::List { status, label, repo } => {
            let loom = Loom::open(".")?;
            
            let tasks = if let Some(repo_id) = repo {
                loom.list_by_repo(&repo_id)?
            } else if let Some(status_str) = status {
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
                println!("{:<10} {:<8} {:<6} {:<40} {:?}", "ID", "STATUS", "REPO", "TITLE", "AGENT");
                for task in tasks {
                    println!(
                        "{:<10} {:<8} {:<6} {:<40} {:?}",
                        task.id,
                        format!("{:?}", task.status).to_lowercase(),
                        task.repo.as_deref().unwrap_or("-"),
                        truncate(&task.title, 40),
                        task.agent
                    );
                }
            }
        }
        
        Commands::Repos => {
            let loom = Loom::open(".")?;
            let repos = loom.repos();
            
            println!("Configured Repositories");
            println!("=======================");
            println!();
            println!("{:<12} {:<20} {:<10} {}", "ID", "NAME", "PRIMARY", "PATH");
            for repo in repos {
                println!(
                    "{:<12} {:<20} {:<10} {}",
                    repo.id,
                    repo.name,
                    if repo.is_primary { "yes" } else { "no" },
                    repo.path.display()
                );
                if !repo.available {
                    println!("             (not initialized - run 'lm init' in that directory)");
                }
            }
            
            // Also show repos with tasks in this database
            let db_repos = loom.list_repos()?;
            if !db_repos.is_empty() {
                println!();
                println!("Repositories with tasks in this database:");
                for repo in db_repos {
                    println!("  - {}", repo);
                }
            }
        }
        
        Commands::All { status } => {
            let loom = Loom::open(".")?;
            
            let mut tasks = loom.list_all_repos()?;
            
            // Filter by status if provided
            if let Some(status_str) = status {
                let target_status = parse_status(&status_str)?;
                tasks.retain(|t| t.status == target_status);
            }
            
            if tasks.is_empty() {
                println!("No tasks found across all repositories");
            } else {
                println!("{:<10} {:<8} {:<12} {:<40} {:?}", "ID", "STATUS", "REPO", "TITLE", "AGENT");
                for task in tasks {
                    println!(
                        "{:<10} {:<8} {:<12} {:<40} {:?}",
                        task.id,
                        format!("{:?}", task.status).to_lowercase(),
                        task.repo.as_deref().unwrap_or("-"),
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
            println!("Priority:    {:?}", task.priority);
            println!("Type:        {:?}", task.issue_type);
            println!("Agent:       {}", task.agent.as_deref().unwrap_or("-"));
            println!("Labels:      {:?}", task.labels);
            println!("Parent:      {}", task.parent.as_deref().unwrap_or("-"));
            println!("Repo:        {}", task.repo.as_deref().unwrap_or("-"));
            println!("Evidence:    {}", task.evidence.as_deref().unwrap_or("-"));
            if let Some(reason) = &task.close_reason {
                println!("Close reason: {}", reason);
            }
            println!("Created:     {}", task.created_at);
            println!("Updated:     {}", task.updated_at);
            
            // Show dependencies
            let deps = loom.get_dependencies(&task.id)?;
            if !deps.is_empty() {
                println!("\nDependencies:");
                for dep in deps {
                    println!("  {} ({:?})", dep.depends_on, dep.dep_type);
                }
            }
            
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
                        repo: None,
                        ..Default::default()
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
            eprintln!("Error: Git sync is not yet implemented.");
            eprintln!("Use 'lm list --format json' to export tasks manually.");
            std::process::exit(1);
        }
        
        Commands::Backfill { since, until, author, beads, dry_run } => {
            let mut loom = Loom::open_or_init(".")?;
            
            let options = BackfillOptions {
                since: since.as_ref().and_then(|s| Backfill::parse_date(s).ok()),
                until: until.as_ref().and_then(|s| Backfill::parse_date(s).ok()),
                author,
                beads_path: beads.map(std::path::PathBuf::from),
                dry_run,
                repo_path: None,
                agent_mapping: std::collections::HashMap::new(),
                issue_patterns: Vec::new(), // Use defaults (csm-, lm-, bd-, WORKWAY-)
            };
            
            let backfill = Backfill::new(options);
            let result = backfill.run(&mut loom)
                .map_err(|e| LoomError::Config(e.to_string()))?;
            
            println!("{}", BackfillAnalytics::format_result(&result));
        }
        
        Commands::Analytics { since, agent } => {
            let loom = Loom::open(".")?;

            let since_dt = since.as_ref().map(|s| {
                Backfill::parse_date(s).map_err(|_| {
                    LoomError::Config(format!("Invalid --since date: '{}'. Use ISO 8601, YYYY-MM-DD, or 'N days ago'.", s))
                })
            }).transpose()?;

            // Get summary statistics
            let summary = loom.summary()?;

            println!("Work Analytics");
            println!("==============");
            if let Some(ref dt) = since_dt {
                println!("(since {})", dt.format("%Y-%m-%d"));
            }
            println!();
            println!("Overall Summary:");
            println!("  Total tasks:    {}", summary.total());
            println!("  Completed:      {} ({:.0}%)", summary.done, summary.progress_pct());
            println!("  Active:         {}", summary.active());
            println!("  Total cost:     ${:.2}", summary.total_cost_usd);
            println!();

            // Get agent profiles with their stats
            let agents = loom.agents()?;

            println!("Agent Performance:");
            for agent_profile in agents {
                if let Some(ref filter) = agent {
                    if !agent_profile.id.contains(filter) {
                        continue;
                    }
                }

                println!("  {:<13} → success rate: {:.0}%, avg duration: {:.0}s",
                    agent_profile.id,
                    agent_profile.quality.success_rate() * 100.0,
                    agent_profile.quality.avg_duration_secs
                );
            }

            if since_dt.is_some() {
                println!();
                println!("Note: --since filter applies to backfill analytics.");
                println!("Run 'lm backfill' first to populate historical execution data.");
            }
        }
        
        Commands::Notion { command } => {
            match command {
                NotionCommands::Init { parent_page_id, token } => {
                    // Get token from arg, env, or config
                    let access_token = token
                        .or_else(|| std::env::var("NOTION_TOKEN").ok())
                        .ok_or_else(|| LoomError::Config(
                            "Notion token required. Use --token or set NOTION_TOKEN env var".to_string()
                        ))?;
                    
                    println!("Creating Notion database...");
                    
                    let client = loom::NotionClient::new(&access_token);
                    let database_id = client.create_database(&parent_page_id)
                        .map_err(|e| LoomError::Config(e.to_string()))?;
                    
                    // Save config
                    let mut config = loom::LoomConfig::load(".").unwrap_or_default();
                    config.notion.access_token = Some(access_token);
                    config.notion.database_id = Some(database_id.clone());
                    config.save(".")
                        .map_err(|e| LoomError::Config(e.to_string()))?;
                    
                    println!("Created database: {}", database_id);
                    println!("Config saved to .loom/config.toml");
                    println!();
                    println!("Run 'lm notion sync' to sync tasks to Notion.");
                }
                
                NotionCommands::Auth { token } => {
                    let mut config = loom::LoomConfig::load(".").unwrap_or_default();
                    config.notion.access_token = Some(token);
                    config.save(".")
                        .map_err(|e| LoomError::Config(e.to_string()))?;
                    
                    println!("Notion token saved to .loom/config.toml");
                }
                
                NotionCommands::Sync { dry_run, force, status, since } => {
                    let loom = Loom::open(".")?;
                    let config = loom::LoomConfig::load(".")
                        .map_err(|e| LoomError::Config(e.to_string()))?;
                    
                    let access_token = config.notion.access_token
                        .or_else(|| std::env::var("NOTION_TOKEN").ok())
                        .ok_or_else(|| LoomError::Config(
                            "Notion not configured. Run 'lm notion init' first".to_string()
                        ))?;
                    
                    let database_id = config.notion.database_id
                        .ok_or_else(|| LoomError::Config(
                            "Notion database not configured. Run 'lm notion init' first".to_string()
                        ))?;
                    
                    let status_filter = status.as_ref().and_then(|s| parse_status(s).ok());
                    let since_filter = since.as_ref().and_then(|s| {
                        chrono::DateTime::parse_from_rfc3339(s)
                            .map(|dt| dt.with_timezone(&chrono::Utc))
                            .ok()
                    });
                    
                    let sync_options = loom::SyncOptions {
                        dry_run,
                        force,
                        status: status_filter,
                        since: since_filter,
                    };
                    
                    let tasks = loom.list()?;
                    let client = loom::NotionClient::new(&access_token);
                    
                    if dry_run {
                        println!("Dry run - no changes will be made");
                    }
                    
                    println!("Syncing {} tasks to Notion...", tasks.len());
                    
                    let result = loom::sync_tasks(&client, &database_id, &tasks, &sync_options)
                        .map_err(|e| LoomError::Config(e.to_string()))?;
                    
                    println!();
                    println!("Sync complete:");
                    println!("  Created:  {}", result.created);
                    println!("  Updated:  {}", result.updated);
                    println!("  Skipped:  {}", result.skipped);
                    
                    if !result.errors.is_empty() {
                        println!("  Errors:   {}", result.errors.len());
                        for error in &result.errors {
                            println!("    - {}", error);
                        }
                    }
                }
                
                NotionCommands::Status => {
                    let config = loom::LoomConfig::load(".")
                        .map_err(|e| LoomError::Config(e.to_string()))?;
                    
                    println!("Notion Sync Status");
                    println!("==================");
                    println!();
                    
                    if let Some(ref db_id) = config.notion.database_id {
                        println!("Database ID: {}", db_id);
                        println!("Token:       {}", if config.notion.access_token.is_some() { "configured" } else { "not set" });
                        println!();
                        println!("Run 'lm notion sync' to sync tasks.");
                    } else {
                        println!("Not configured.");
                        println!();
                        println!("Run 'lm notion init <parent_page_id>' to set up.");
                    }
                }
            }
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
    if s.chars().count() <= max {
        s.to_string()
    } else {
        let truncated: String = s.chars().take(max.saturating_sub(3)).collect();
        format!("{}...", truncated)
    }
}

fn get_hostname() -> String {
    hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "unknown".to_string())
}
