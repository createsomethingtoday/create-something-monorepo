//! MCP Server for Loom
//!
//! Exposes Loom functionality via the Model Context Protocol.
//! This allows any MCP-compatible agent to use Loom for task coordination.
//!
//! ## MCP Apps Support
//!
//! This server supports MCP Apps extension for interactive UIs:
//! - `ui://loom/task-board` - Kanban-style task visualization
//!
//! Tools that benefit from UI rendering include `_meta.ui` metadata.

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::io::{BufRead, Write};

use crate::{Loom, CreateTask, Status, Priority, IssueType, RoutingStrategy, RoutingConstraints, SessionStatus};
use crate::ui_resources::UiRegistry;

/// Tool UI metadata for MCP Apps
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolUiMeta {
    pub resource_uri: String,
}

/// Tool metadata container
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolMeta {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ui: Option<ToolUiMeta>,
}

/// Tool definition for MCP with optional UI metadata
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ToolDefinition {
    pub name: String,
    pub description: String,
    #[serde(rename = "inputSchema")]
    pub parameters: Value,
    /// MCP Apps UI metadata - present when this tool supports interactive UI rendering
    #[serde(rename = "_meta", skip_serializing_if = "Option::is_none", default)]
    pub meta: Option<ToolMeta>,
}

/// Helper to create a tool definition without UI
fn tool(name: &str, description: &str, parameters: Value) -> ToolDefinition {
    ToolDefinition {
        name: name.to_string(),
        description: description.to_string(),
        parameters,
        meta: None,
    }
}

/// Helper to create a tool definition with Task Board UI
fn tool_with_task_board(name: &str, description: &str, parameters: Value) -> ToolDefinition {
    ToolDefinition {
        name: name.to_string(),
        description: description.to_string(),
        parameters,
        meta: Some(ToolMeta {
            ui: Some(ToolUiMeta {
                resource_uri: "ui://loom/task-board".to_string(),
            }),
        }),
    }
}

/// List all available tools
pub fn list_tools() -> Vec<ToolDefinition> {
    vec![
        // ─────────────────────────────────────────────────────────────────
        // Quick Work (Single-Agent Pattern)
        // ─────────────────────────────────────────────────────────────────
        tool("loom_work", "Start working on something (creates and claims task atomically). Use this for single-agent work to avoid ceremony.", json!({
            "type": "object",
            "properties": {
                "title": { "type": "string", "description": "What you're working on" },
                "agent": { "type": "string", "description": "Your agent ID (e.g., 'claude-code', 'cursor')" },
                "priority": { "type": "string", "enum": ["critical", "high", "normal", "low"], "description": "Task priority (default: normal)" },
                "labels": { "type": "array", "items": { "type": "string" }, "description": "Optional labels for routing/filtering" }
            },
            "required": ["title", "agent"]
        })),
        // ─────────────────────────────────────────────────────────────────
        // Task Management
        // ─────────────────────────────────────────────────────────────────
        tool("loom_create",
            "Create a new task in Loom (for multi-agent coordination - use loom_work for solo work)",
            json!({
                "type": "object",
                "properties": {
                    "title": { "type": "string", "description": "Task title" },
                    "description": { "type": "string", "description": "Task description (optional)" },
                    "priority": { "type": "string", "enum": ["critical", "high", "normal", "low"], "description": "Task priority (default: normal)" },
                    "labels": { "type": "array", "items": { "type": "string" }, "description": "Labels for categorization and routing" },
                    "parent": { "type": "string", "description": "Parent task ID for sub-tasks" }
                },
                "required": ["title"]
            }),
        ),
        tool("loom_claim", "Claim a task for this agent to work on", json!({
            "type": "object",
            "properties": {
                "task_id": { "type": "string" },
                "agent": { "type": "string", "description": "Agent ID claiming the task" }
            },
            "required": ["task_id", "agent"]
        })),
        tool("loom_release", "Release a claimed task back to ready status", json!({
            "type": "object",
            "properties": { "task_id": { "type": "string" } },
            "required": ["task_id"]
        })),
        tool("loom_complete", "Mark a task as complete with optional evidence. Auto-unblocks dependent tasks.", json!({
            "type": "object",
            "properties": {
                "task_id": { "type": "string" },
                "evidence": { "type": "string", "description": "Completion evidence (commit hash, URL, etc.)" },
                "cost_usd": { "type": "number", "description": "Actual cost in USD (for tracking)" }
            },
            "required": ["task_id"]
        })),
        tool("loom_cancel", "Cancel a task", json!({
            "type": "object",
            "properties": { "task_id": { "type": "string" } },
            "required": ["task_id"]
        })),
        tool("loom_spawn", "Create a sub-task under a parent task", json!({
            "type": "object",
            "properties": {
                "parent_id": { "type": "string" },
                "title": { "type": "string" }
            },
            "required": ["parent_id", "title"]
        })),
        
        // ─────────────────────────────────────────────────────────────────
        // Queries (with MCP Apps UI support for task visualization)
        // ─────────────────────────────────────────────────────────────────
        tool_with_task_board("loom_ready", "Get all tasks ready to work on", json!({
            "type": "object",
            "properties": {}
        })),
        tool_with_task_board("loom_mine", "Get tasks claimed by a specific agent", json!({
            "type": "object",
            "properties": { "agent": { "type": "string" } },
            "required": ["agent"]
        })),
        tool_with_task_board("loom_blocked", "Get all blocked tasks", json!({
            "type": "object",
            "properties": {}
        })),
        tool("loom_get", "Get a task by ID", json!({
            "type": "object",
            "properties": { "task_id": { "type": "string" } },
            "required": ["task_id"]
        })),
        tool_with_task_board("loom_list", "List tasks with optional filtering", json!({
            "type": "object",
            "properties": {
                "status": { "type": "string", "enum": ["ready", "claimed", "blocked", "done", "cancelled"] },
                "label": { "type": "string" },
                "repo": { "type": "string", "description": "Filter by repository ID" }
            }
        })),
        tool_with_task_board("loom_summary", "Get a summary of work status (optionally filtered by label)", json!({
            "type": "object",
            "properties": {
                "label": { "type": "string", "description": "Filter summary by label (e.g., 'auth-feature')" }
            }
        })),
        
        // ─────────────────────────────────────────────────────────────────
        // Dependencies
        // ─────────────────────────────────────────────────────────────────
        tool("loom_block", "Add a dependency (task is blocked by another)", json!({
            "type": "object",
            "properties": {
                "task_id": { "type": "string", "description": "Task that is blocked" },
                "blocked_by": { "type": "string", "description": "Task that blocks it" }
            },
            "required": ["task_id", "blocked_by"]
        })),
        tool("loom_unblock", "Remove a dependency", json!({
            "type": "object",
            "properties": {
                "task_id": { "type": "string" },
                "blocked_by": { "type": "string" }
            },
            "required": ["task_id", "blocked_by"]
        })),
        
        // ─────────────────────────────────────────────────────────────────
        // Smart Routing
        // ─────────────────────────────────────────────────────────────────
        tool("loom_route", "Get routing recommendation for a task (which agent should work on it)", json!({
            "type": "object",
            "properties": {
                "task_id": { "type": "string" },
                "strategy": { "type": "string", "enum": ["best", "cheapest", "fastest"], "default": "best" },
                "max_cost": { "type": "number", "description": "Maximum cost in dollars" }
            },
            "required": ["task_id"]
        })),
        tool("loom_agents", "List all available agents and their capabilities", json!({
            "type": "object",
            "properties": {}
        })),
        
        // ─────────────────────────────────────────────────────────────────
        // Sessions & Memory
        // ─────────────────────────────────────────────────────────────────
        tool("loom_session_start", "Start a work session for a task", json!({
            "type": "object",
            "properties": {
                "task_id": { "type": "string" },
                "agent": { "type": "string" }
            },
            "required": ["task_id", "agent"]
        })),
        tool("loom_session_end", "End a work session", json!({
            "type": "object",
            "properties": {
                "session_id": { "type": "string" },
                "status": { "type": "string", "enum": ["completed", "failed", "cancelled"] }
            },
            "required": ["session_id"]
        })),
        tool("loom_checkpoint", "Create a checkpoint (save progress for crash recovery)", json!({
            "type": "object",
            "properties": {
                "session_id": { "type": "string" },
                "summary": { "type": "string", "description": "Summary of progress" }
            },
            "required": ["session_id", "summary"]
        })),
        tool("loom_recover", "List sessions that can be recovered after a crash", json!({
            "type": "object",
            "properties": {}
        })),
        tool("loom_resume", "Resume an interrupted session", json!({
            "type": "object",
            "properties": { "session_id": { "type": "string" } },
            "required": ["session_id"]
        })),
        
        // ─────────────────────────────────────────────────────────────────
        // Formulas
        // ─────────────────────────────────────────────────────────────────
        tool("loom_formulas", "List available workflow formulas", json!({
            "type": "object",
            "properties": {}
        })),
        tool("loom_formula", "Get details of a specific formula", json!({
            "type": "object",
            "properties": { "name": { "type": "string" } },
            "required": ["name"]
        })),
        
        // ─────────────────────────────────────────────────────────────────
        // Learning & Feedback
        // ─────────────────────────────────────────────────────────────────
        tool("loom_record_execution", "Record task execution result for learning (improves future routing)", json!({
            "type": "object",
            "properties": {
                "agent_id": { "type": "string" },
                "task_id": { "type": "string" },
                "task_type": { "type": "string", "description": "Type of task (coding, debugging, planning, etc.)" },
                "success": { "type": "boolean" },
                "duration_secs": { "type": "number" }
            },
            "required": ["agent_id", "task_id", "success", "duration_secs"]
        })),
        
        // ─────────────────────────────────────────────────────────────────
        // Multi-Repo Support
        // ─────────────────────────────────────────────────────────────────
        tool("loom_repos", "List configured repositories (for multi-repo coordination between projects)", json!({
            "type": "object",
            "properties": {}
        })),
        tool("loom_switch_repo", "Switch the active repository context. Use this when working in a different repo than the MCP server was started in.", json!({
            "type": "object",
            "properties": {
                "path": { "type": "string", "description": "Absolute path to the repository to switch to" }
            },
            "required": ["path"]
        })),
        tool_with_task_board("loom_list_all", "List tasks from ALL configured repositories (primary + additional). Use for unified views across projects.", json!({
            "type": "object",
            "properties": {
                "status": { "type": "string", "enum": ["ready", "claimed", "blocked", "done", "cancelled"] }
            }
        })),
        
        // ─────────────────────────────────────────────────────────────────
        // Backfill & Analytics
        // ─────────────────────────────────────────────────────────────────
        tool("loom_backfill", "Import historical work from Git commits and Beads issues. Creates tasks and execution records for analytics.", json!({
            "type": "object",
            "properties": {
                "repo_path": { "type": "string", "description": "Absolute path to repository to backfill from" },
                "since": { "type": "string", "description": "Start date (ISO 8601 or relative like '30 days ago')" },
                "until": { "type": "string", "description": "End date (ISO 8601 or relative)" },
                "author": { "type": "string", "description": "Filter by git author name" },
                "beads_path": { "type": "string", "description": "Path to Beads directory" },
                "dry_run": { "type": "boolean", "description": "Preview changes without writing" }
            }
        })),
        tool("loom_analytics", "Get analytics from historical execution data (after backfill)", json!({
            "type": "object",
            "properties": {
                "agent": { "type": "string", "description": "Filter by agent ID" },
                "task_type": { "type": "string", "description": "Filter by task type (bug, feature, task, refactor)" }
            }
        })),
        
        // ─────────────────────────────────────────────────────────────────
        // GSD-Inspired: Discuss & Verify (Pre-Planning)
        // ─────────────────────────────────────────────────────────────────
        tool("loom_discuss", "Capture implementation preferences before planning. Use for ambiguous features to align on visual style, API design, content structure, etc.", json!({
            "type": "object",
            "properties": {
                "task_id": { "type": "string", "description": "Task to discuss preferences for" },
                "category": { "type": "string", "enum": ["visual", "api", "content", "architecture", "performance", "other"], "description": "Category of preference being captured" },
                "question": { "type": "string", "description": "Question about implementation preference" },
                "options": { "type": "array", "items": { "type": "string" }, "description": "Available options (if multiple choice)" },
                "decision": { "type": "string", "description": "The chosen option or answer" },
                "rationale": { "type": "string", "description": "Why this choice was made" }
            },
            "required": ["task_id", "category", "question", "decision"]
        })),
        tool("loom_verify_plan", "Verify a plan BEFORE execution. Checks plan against task requirements, validates file paths, ensures no scope creep.", json!({
            "type": "object",
            "properties": {
                "task_id": { "type": "string", "description": "Task the plan is for" },
                "plan": { 
                    "type": "object", 
                    "description": "The proposed plan",
                    "properties": {
                        "steps": { "type": "array", "items": { "type": "object" } },
                        "files_to_modify": { "type": "array", "items": { "type": "string" } },
                        "files_to_create": { "type": "array", "items": { "type": "string" } },
                        "estimated_changes": { "type": "number" }
                    }
                }
            },
            "required": ["task_id", "plan"]
        })),
        
        // ─────────────────────────────────────────────────────────────────
        // Enhanced Context (Harness AgentContext Parity)
        // ─────────────────────────────────────────────────────────────────
        tool("loom_update_context", "Update session context with rich metadata for resume/recovery. Use to track file modifications, decisions, test state, and progress.", json!({
            "type": "object",
            "properties": {
                "session_id": { "type": "string" },
                "file_modified": { "type": "object", "description": "Record a file modification" },
                "decision": { "type": "object", "description": "Record a decision" },
                "test_state": { "type": "object", "description": "Record current test state" },
                "task_progress": { "type": "object", "description": "Update current task progress" },
                "blocker": { "type": "string", "description": "Add a blocker" },
                "note": { "type": "string", "description": "Add a note" }
            },
            "required": ["session_id"]
        })),
        tool("loom_get_resume_brief", "Get a resume brief for a session. This is a markdown summary of context that can be injected into a priming prompt for session continuity.", json!({
            "type": "object",
            "properties": { "session_id": { "type": "string" } },
            "required": ["session_id"]
        })),
        
        // ─────────────────────────────────────────────────────────────────
        // Beads Compatibility (Robot Priority, Update, Compact)
        // ─────────────────────────────────────────────────────────────────
        tool("loom_priority", "Get prioritized list of ready tasks with robot-optimized ranking (PageRank + Critical Path). Use this instead of loom_ready for smarter work selection.", json!({
            "type": "object",
            "properties": {
                "limit": { "type": "integer", "description": "Maximum number of tasks to return (default: 10)" }
            }
        })),
        tool("loom_update", "Update task fields (status, priority, issue_type). For status changes that have side effects (like done/cancelled), use complete/cancel instead.", json!({
            "type": "object",
            "properties": {
                "task_id": { "type": "string" },
                "priority": { "type": "string", "enum": ["critical", "high", "normal", "low"] },
                "issue_type": { "type": "string", "enum": ["bug", "feature", "task", "epic", "chore"] }
            },
            "required": ["task_id"]
        })),
        tool("loom_compact", "Remove old done/cancelled tasks from the database. Use for cleanup.", json!({
            "type": "object",
            "properties": {
                "older_than_days": { "type": "integer", "description": "Remove tasks older than N days (default: 30)" }
            }
        })),
        tool("loom_doctor", "Health check for the loom database. Reports task statistics and potential issues.", json!({
            "type": "object",
            "properties": {}
        })),
        
        // ─────────────────────────────────────────────────────────────────
        // Notion Sync
        // ─────────────────────────────────────────────────────────────────
        tool("loom_notion_init", "Initialize Notion database for Loom work analytics. Creates a database with the proper schema in the specified parent page.", json!({
            "type": "object",
            "properties": {
                "parent_page_id": { "type": "string", "description": "Notion page ID where to create the database" },
                "token": { "type": "string", "description": "Notion OAuth access token (optional if NOTION_TOKEN env var is set)" }
            },
            "required": ["parent_page_id"]
        })),
        tool("loom_notion_sync", "Sync Loom tasks to Notion database. Creates new pages, updates changed pages, skips unchanged.", json!({
            "type": "object",
            "properties": {
                "dry_run": { "type": "boolean", "description": "Preview changes without writing (default: false)" },
                "force": { "type": "boolean", "description": "Update all pages regardless of timestamp (default: false)" },
                "status": { "type": "string", "enum": ["ready", "claimed", "blocked", "done", "cancelled"], "description": "Only sync tasks with this status" },
                "since": { "type": "string", "description": "Only sync tasks updated after this ISO 8601 date" }
            }
        })),
        tool("loom_notion_status", "Check Notion sync configuration status.", json!({
            "type": "object",
            "properties": {}
        })),
    ]
}

/// Call a tool by name with arguments
pub fn call_tool(loom: &mut Loom, name: &str, args: Value) -> Result<Value, String> {
    match name {
        // ─────────────────────────────────────────────────────────────────
        // Quick Work (Single-Agent Pattern) - Minimal Ceremony
        // ─────────────────────────────────────────────────────────────────
        "loom_work" => {
            let title = args["title"].as_str().ok_or("Missing title")?;
            let agent = args["agent"].as_str().ok_or("Missing agent")?;
            let priority = args["priority"].as_str()
                .and_then(Priority::from_str)
                .unwrap_or_default();
            let labels: Vec<String> = args["labels"]
                .as_array()
                .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
                .unwrap_or_default();
            
            // Create task
            let task = loom.create_task(CreateTask {
                title: title.to_string(),
                description: None,
                priority,
                labels,
                parent: None,
                evidence: None,
                repo: None,
                ..Default::default()
            }).map_err(|e| e.to_string())?;
            
            // Claim it immediately
            loom.claim(&task.id, agent).map_err(|e| e.to_string())?;
            
            Ok(json!({
                "task_id": task.id,
                "status": "claimed",
                "agent": agent,
                "priority": task.priority.as_str(),
                "message": "Task created and claimed. Start working."
            }))
        }
        
        // ─────────────────────────────────────────────────────────────────
        // Task Management
        // ─────────────────────────────────────────────────────────────────
        "loom_create" => {
            let title = args["title"].as_str()
                .ok_or("Missing title")?;
            let description = args["description"].as_str().map(String::from);
            let priority = args["priority"].as_str()
                .and_then(Priority::from_str)
                .unwrap_or_default();
            let labels: Vec<String> = args["labels"]
                .as_array()
                .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
                .unwrap_or_default();
            let parent = args["parent"].as_str().map(String::from);
            
            let task = loom.create_task(CreateTask {
                title: title.to_string(),
                description,
                priority,
                labels,
                parent,
                evidence: None,
                repo: None,
                ..Default::default()
            }).map_err(|e| e.to_string())?;
            
            Ok(json!({
                "id": task.id,
                "title": task.title,
                "priority": task.priority.as_str(),
                "status": format!("{:?}", task.status).to_lowercase()
            }))
        }
        
        "loom_claim" => {
            let task_id = args["task_id"].as_str().ok_or("Missing task_id")?;
            let agent = args["agent"].as_str().ok_or("Missing agent")?;
            
            let task = loom.claim(task_id, agent).map_err(|e| e.to_string())?;
            
            Ok(json!({
                "id": task.id,
                "agent": task.agent,
                "status": "claimed"
            }))
        }
        
        "loom_release" => {
            let task_id = args["task_id"].as_str().ok_or("Missing task_id")?;
            loom.release(task_id).map_err(|e| e.to_string())?;
            Ok(json!({ "released": task_id }))
        }
        
        "loom_complete" => {
            let task_id = args["task_id"].as_str().ok_or("Missing task_id")?;
            let evidence = args["evidence"].as_str();
            let cost_usd = args["cost_usd"].as_f64();
            
            // Record cost if provided
            if let Some(cost) = cost_usd {
                loom.record_cost(task_id, cost).map_err(|e| e.to_string())?;
            }
            
            // Complete and get auto-unblocked tasks
            let unblocked = loom.complete(task_id, evidence).map_err(|e| e.to_string())?;
            
            Ok(json!({ 
                "completed": task_id, 
                "evidence": evidence,
                "cost_usd": cost_usd,
                "unblocked": unblocked  // Tasks that are now ready
            }))
        }
        
        "loom_cancel" => {
            let task_id = args["task_id"].as_str().ok_or("Missing task_id")?;
            loom.cancel(task_id).map_err(|e| e.to_string())?;
            Ok(json!({ "cancelled": task_id }))
        }
        
        "loom_spawn" => {
            let parent_id = args["parent_id"].as_str().ok_or("Missing parent_id")?;
            let title = args["title"].as_str().ok_or("Missing title")?;
            
            let task = loom.spawn(parent_id, title).map_err(|e| e.to_string())?;
            
            Ok(json!({
                "id": task.id,
                "title": task.title,
                "parent": task.parent
            }))
        }
        
        // ─────────────────────────────────────────────────────────────────
        // Queries
        // ─────────────────────────────────────────────────────────────────
        "loom_ready" => {
            let tasks = loom.ready().map_err(|e| e.to_string())?;
            Ok(json!(tasks.iter().map(|t| json!({
                "id": t.id,
                "title": t.title,
                "priority": t.priority.as_str(),
                "labels": t.labels
            })).collect::<Vec<_>>()))
        }
        
        "loom_mine" => {
            let agent = args["agent"].as_str().ok_or("Missing agent")?;
            let tasks = loom.mine(agent).map_err(|e| e.to_string())?;
            Ok(json!(tasks.iter().map(|t| json!({
                "id": t.id,
                "title": t.title,
                "status": format!("{:?}", t.status).to_lowercase()
            })).collect::<Vec<_>>()))
        }
        
        "loom_blocked" => {
            let tasks = loom.blocked().map_err(|e| e.to_string())?;
            Ok(json!(tasks.iter().map(|t| json!({
                "id": t.id,
                "title": t.title
            })).collect::<Vec<_>>()))
        }
        
        "loom_get" => {
            let task_id = args["task_id"].as_str().ok_or("Missing task_id")?;
            let task = loom.get(task_id).map_err(|e| e.to_string())?;
            
            match task {
                Some(t) => {
                    // Get dependencies for full task view
                    let deps = loom.get_dependencies(&t.id).map_err(|e| e.to_string())?;
                    
                    Ok(json!({
                        "id": t.id,
                        "title": t.title,
                        "description": t.description,
                        "status": format!("{:?}", t.status).to_lowercase(),
                        "priority": t.priority.as_str(),
                        "issue_type": t.issue_type.as_str(),
                        "agent": t.agent,
                        "labels": t.labels,
                        "parent": t.parent,
                        "repo": t.repo,
                        "evidence": t.evidence,
                        "close_reason": t.close_reason,
                        "actual_cost_usd": t.actual_cost_usd,
                        "dependencies": deps.iter().map(|d| json!({
                            "depends_on": d.depends_on,
                            "type": d.dep_type.as_str()
                        })).collect::<Vec<_>>(),
                        "created_at": t.created_at.to_rfc3339(),
                        "updated_at": t.updated_at.to_rfc3339()
                    }))
                },
                None => Ok(json!({ "error": "Task not found" }))
            }
        }
        
        "loom_list" => {
            let tasks = if let Some(repo) = args["repo"].as_str() {
                loom.list_by_repo(repo).map_err(|e| e.to_string())?
            } else if let Some(status_str) = args["status"].as_str() {
                let status = match status_str {
                    "ready" => Status::Ready,
                    "claimed" => Status::Claimed,
                    "blocked" => Status::Blocked,
                    "done" => Status::Done,
                    "cancelled" => Status::Cancelled,
                    s => return Err(format!("Unknown status: {}", s)),
                };
                loom.list_by_status(status).map_err(|e| e.to_string())?
            } else if let Some(label) = args["label"].as_str() {
                loom.list_by_label(label).map_err(|e| e.to_string())?
            } else {
                loom.list().map_err(|e| e.to_string())?
            };
            
            Ok(json!(tasks.iter().map(|t| json!({
                "id": t.id,
                "title": t.title,
                "status": format!("{:?}", t.status).to_lowercase(),
                "priority": t.priority.as_str(),
                "agent": t.agent,
                "labels": t.labels,
                "repo": t.repo,
                "actual_cost_usd": t.actual_cost_usd
            })).collect::<Vec<_>>()))
        }
        
        "loom_summary" => {
            let summary = if let Some(label) = args["label"].as_str() {
                loom.summary_by_label(label).map_err(|e| e.to_string())?
            } else {
                loom.summary().map_err(|e| e.to_string())?
            };
            
            Ok(json!({
                "total": summary.total(),
                "ready": summary.ready,
                "claimed": summary.claimed,
                "blocked": summary.blocked,
                "done": summary.done,
                "cancelled": summary.cancelled,
                "total_cost_usd": summary.total_cost_usd,
                "progress_pct": summary.progress_pct(),
                "label": summary.label
            }))
        }
        
        // ─────────────────────────────────────────────────────────────────
        // Dependencies
        // ─────────────────────────────────────────────────────────────────
        "loom_block" => {
            let task_id = args["task_id"].as_str().ok_or("Missing task_id")?;
            let blocked_by = args["blocked_by"].as_str().ok_or("Missing blocked_by")?;
            loom.block(task_id, blocked_by).map_err(|e| e.to_string())?;
            Ok(json!({ "blocked": task_id, "by": blocked_by }))
        }
        
        "loom_unblock" => {
            let task_id = args["task_id"].as_str().ok_or("Missing task_id")?;
            let blocked_by = args["blocked_by"].as_str().ok_or("Missing blocked_by")?;
            loom.unblock(task_id, blocked_by).map_err(|e| e.to_string())?;
            Ok(json!({ "unblocked": task_id, "from": blocked_by }))
        }
        
        // ─────────────────────────────────────────────────────────────────
        // Smart Routing
        // ─────────────────────────────────────────────────────────────────
        "loom_route" => {
            let task_id = args["task_id"].as_str().ok_or("Missing task_id")?;
            let task = loom.get(task_id).map_err(|e| e.to_string())?
                .ok_or("Task not found")?;
            
            let strategy = match args["strategy"].as_str() {
                Some("cheapest") => RoutingStrategy::Cheapest,
                Some("fastest") => RoutingStrategy::Fastest,
                _ => RoutingStrategy::Best,
            };
            
            let constraints = RoutingConstraints {
                max_cost: args["max_cost"].as_f64(),
                ..Default::default()
            };
            
            let decision = loom.route_with(&task, strategy, &constraints)
                .map_err(|e| e.to_string())?;
            
            Ok(json!({
                "agent_id": decision.agent_id,
                "reason": decision.reason,
                "estimated_cost": decision.estimated_cost,
                "confidence": decision.confidence,
                "alternatives": decision.alternatives
            }))
        }
        
        "loom_agents" => {
            let agents = loom.agents().map_err(|e| e.to_string())?;
            Ok(json!(agents.iter().map(|a| json!({
                "id": a.id,
                "name": a.name,
                "available": a.available,
                "success_rate": a.quality.success_rate(),
                "capabilities": {
                    "planning": a.capabilities.planning,
                    "coding": a.capabilities.coding,
                    "debugging": a.capabilities.debugging,
                    "ui": a.capabilities.ui,
                    "refactor": a.capabilities.refactor,
                    "checkpoints": a.capabilities.checkpoints,
                    "git_aware": a.capabilities.git_aware
                }
            })).collect::<Vec<_>>()))
        }
        
        // ─────────────────────────────────────────────────────────────────
        // Sessions & Memory
        // ─────────────────────────────────────────────────────────────────
        "loom_session_start" => {
            let task_id = args["task_id"].as_str().ok_or("Missing task_id")?;
            let agent = args["agent"].as_str().ok_or("Missing agent")?;
            
            let session = loom.start_session(task_id, agent).map_err(|e| e.to_string())?;
            
            Ok(json!({
                "session_id": session.id,
                "task_id": session.task_id,
                "agent": session.agent_id,
                "status": format!("{:?}", session.status).to_lowercase()
            }))
        }
        
        "loom_session_end" => {
            let session_id = args["session_id"].as_str().ok_or("Missing session_id")?;
            let status = match args["status"].as_str() {
                Some("failed") => SessionStatus::Failed,
                Some("cancelled") => SessionStatus::Cancelled,
                _ => SessionStatus::Completed,
            };
            
            loom.end_session(session_id, status).map_err(|e| e.to_string())?;
            
            Ok(json!({
                "session_id": session_id,
                "status": format!("{:?}", status).to_lowercase()
            }))
        }
        
        "loom_checkpoint" => {
            let session_id = args["session_id"].as_str().ok_or("Missing session_id")?;
            let summary = args["summary"].as_str().ok_or("Missing summary")?;
            
            let checkpoint = loom.checkpoint(session_id, summary).map_err(|e| e.to_string())?;
            
            Ok(json!({
                "checkpoint_id": checkpoint.id,
                "session_id": checkpoint.session_id,
                "sequence": checkpoint.sequence,
                "summary": checkpoint.summary
            }))
        }
        
        "loom_recover" => {
            let sessions = loom.recoverable_sessions().map_err(|e| e.to_string())?;
            Ok(json!(sessions.iter().map(|s| json!({
                "session_id": s.id,
                "agent": s.agent_id,
                "task_id": s.task_id,
                "last_checkpoint": s.last_checkpoint
            })).collect::<Vec<_>>()))
        }
        
        "loom_resume" => {
            let session_id = args["session_id"].as_str().ok_or("Missing session_id")?;
            let session = loom.resume_session(session_id).map_err(|e| e.to_string())?;
            
            Ok(json!({
                "session_id": session.id,
                "task_id": session.task_id,
                "agent": session.agent_id,
                "restored_checkpoint": session.last_checkpoint
            }))
        }
        
        // ─────────────────────────────────────────────────────────────────
        // Formulas
        // ─────────────────────────────────────────────────────────────────
        "loom_formulas" => {
            let names = loom.list_formulas();
            let formulas: Vec<Value> = names.iter().filter_map(|name| {
                loom.formula(name).map(|f| json!({
                    "name": f.name,
                    "description": f.description,
                    "quality": format!("{:?}", f.quality).to_lowercase()
                }))
            }).collect();
            Ok(json!(formulas))
        }
        
        "loom_formula" => {
            let name = args["name"].as_str().ok_or("Missing name")?;
            let formula = loom.formula(name).ok_or("Formula not found")?;
            
            Ok(json!({
                "name": formula.name,
                "description": formula.description,
                "quality": format!("{:?}", formula.quality).to_lowercase(),
                "agent": formula.agent,
                "variables": formula.variables.iter().map(|v| json!({
                    "name": v.name,
                    "description": v.description,
                    "required": v.required,
                    "default": v.default
                })).collect::<Vec<_>>(),
                "steps": formula.steps.iter().map(|s| json!({
                    "id": s.id,
                    "title": s.title,
                    "description": s.description,
                    "checkpoint": s.checkpoint
                })).collect::<Vec<_>>()
            }))
        }
        
        // ─────────────────────────────────────────────────────────────────
        // Learning
        // ─────────────────────────────────────────────────────────────────
        "loom_record_execution" => {
            let agent_id = args["agent_id"].as_str().ok_or("Missing agent_id")?;
            let task_id = args["task_id"].as_str().ok_or("Missing task_id")?;
            let task_type = args["task_type"].as_str();
            let success = args["success"].as_bool().ok_or("Missing success")?;
            let duration_secs = args["duration_secs"].as_f64().ok_or("Missing duration_secs")?;
            
            loom.record_execution(agent_id, task_id, task_type, success, duration_secs)
                .map_err(|e| e.to_string())?;
            
            Ok(json!({
                "recorded": true,
                "agent_id": agent_id,
                "task_id": task_id,
                "success": success
            }))
        }
        
        // ─────────────────────────────────────────────────────────────────
        // Multi-Repo Support
        // ─────────────────────────────────────────────────────────────────
        "loom_repos" => {
            let repos = loom.repos();
            let db_repos = loom.list_repos().map_err(|e| e.to_string())?;
            
            Ok(json!({
                "current_repo": loom.repo_id(),
                "configured": repos.iter().map(|r| json!({
                    "id": r.id,
                    "name": r.name,
                    "path": r.path.to_string_lossy(),
                    "is_primary": r.is_primary,
                    "available": r.available
                })).collect::<Vec<_>>(),
                "repos_in_database": db_repos
            }))
        }
        
        "loom_switch_repo" => {
            use std::path::PathBuf;
            
            let path_str = args["path"].as_str()
                .ok_or("path parameter is required")?;
            let path = PathBuf::from(path_str);
            
            // Verify the path exists and has .loom
            if !path.exists() {
                return Err(format!("Path does not exist: {}", path.display()));
            }
            
            let loom_dir = path.join(".loom");
            if !loom_dir.exists() {
                return Err(format!("No .loom directory found at {}. Run 'lm init' in that directory first.", path.display()));
            }
            
            // Try to open the repo to get its info
            let target_loom = crate::Loom::open(&path)
                .map_err(|e| format!("Failed to open repo: {}", e))?;
            
            let repo_id = target_loom.repo_id();
            let config = target_loom.config();
            
            Ok(json!({
                "status": "validated",
                "repo_id": repo_id,
                "repo_name": config.repo_name,
                "path": path.to_string_lossy(),
                "note": "MCP server context cannot be switched at runtime. Use the 'repo_path' parameter in loom_backfill to specify which repository to operate on.",
                "usage": {
                    "backfill": format!("loom_backfill with repo_path=\"{}\"", path.display()),
                    "example": json!({
                        "tool": "loom_backfill",
                        "args": {
                            "repo_path": path.to_string_lossy(),
                            "since": "30 days ago"
                        }
                    })
                }
            }))
        }
        
        "loom_list_all" => {
            let mut tasks = loom.list_all_repos().map_err(|e| e.to_string())?;
            
            // Filter by status if provided
            if let Some(status_str) = args["status"].as_str() {
                let target_status = match status_str {
                    "ready" => Status::Ready,
                    "claimed" => Status::Claimed,
                    "blocked" => Status::Blocked,
                    "done" => Status::Done,
                    "cancelled" => Status::Cancelled,
                    s => return Err(format!("Unknown status: {}", s)),
                };
                tasks.retain(|t| t.status == target_status);
            }
            
            Ok(json!(tasks.iter().map(|t| json!({
                "id": t.id,
                "title": t.title,
                "status": format!("{:?}", t.status).to_lowercase(),
                "priority": t.priority.as_str(),
                "agent": t.agent,
                "labels": t.labels,
                "repo": t.repo,
                "actual_cost_usd": t.actual_cost_usd
            })).collect::<Vec<_>>()))
        }
        
        // ─────────────────────────────────────────────────────────────────
        // Backfill & Analytics
        // ─────────────────────────────────────────────────────────────────
        "loom_backfill" => {
            use crate::backfill::{Backfill, BackfillOptions, BackfillAnalytics};
            use std::path::PathBuf;
            
            // Check if a different repo path is specified
            let repo_path = args["repo_path"].as_str().map(PathBuf::from);
            
            let since = args["since"].as_str()
                .and_then(|s| Backfill::parse_date(s).ok());
            let until = args["until"].as_str()
                .and_then(|s| Backfill::parse_date(s).ok());
            let author = args["author"].as_str().map(String::from);
            let beads_path = args["beads_path"].as_str()
                .map(PathBuf::from);
            let dry_run = args["dry_run"].as_bool().unwrap_or(false);
            
            let options = BackfillOptions {
                since,
                until,
                author,
                beads_path,
                dry_run,
                repo_path: repo_path.clone(),
                agent_mapping: std::collections::HashMap::new(),
                issue_patterns: Vec::new(), // Use defaults from repo config
            };
            
            let backfill = Backfill::new(options);
            
            // If repo_path is specified, use a temporary Loom instance for that repo
            let result = if let Some(ref path) = repo_path {
                let mut target_loom = crate::Loom::open_or_init(path)
                    .map_err(|e| format!("Failed to open repo at {}: {}", path.display(), e))?;
                backfill.run(&mut target_loom).map_err(|e| e.to_string())?
            } else {
                backfill.run(loom).map_err(|e| e.to_string())?
            };
            
            let formatted = BackfillAnalytics::format_result(&result);
            
            Ok(json!({
                "dry_run": result.dry_run,
                "commits_scanned": result.commits_scanned,
                "issues_found": result.issues_found,
                "tasks_created": result.tasks_created,
                "executions_recorded": result.executions_recorded,
                "by_agent": result.by_agent,
                "by_task_type": result.by_task_type,
                "formatted_summary": formatted
            }))
        }
        
        "loom_analytics" => {
            let agent_filter = args["agent"].as_str();
            let _task_type_filter = args["task_type"].as_str();
            
            // Get summary statistics
            let summary = loom.summary().map_err(|e| e.to_string())?;
            
            // Get agent profiles with their stats
            let agents = loom.agents().map_err(|e| e.to_string())?;
            
            let agent_stats: Vec<Value> = agents.iter()
                .filter(|a| agent_filter.map_or(true, |f| a.id.contains(f)))
                .map(|a| json!({
                    "id": a.id,
                    "name": a.name,
                    "success_rate": a.quality.success_rate(),
                    "successes": a.quality.successes,
                    "failures": a.quality.failures,
                    "avg_duration_secs": a.quality.avg_duration_secs,
                    "quality_by_type": a.quality.by_type
                }))
                .collect();
            
            Ok(json!({
                "summary": {
                    "total_tasks": summary.total(),
                    "completed": summary.done,
                    "active": summary.active(),
                    "progress_pct": summary.progress_pct(),
                    "total_cost_usd": summary.total_cost_usd
                },
                "agents": agent_stats
            }))
        }
        
        // ─────────────────────────────────────────────────────────────────
        // GSD-Inspired: Discuss & Verify (Pre-Planning)
        // ─────────────────────────────────────────────────────────────────
        "loom_discuss" => {
            let task_id = args["task_id"].as_str().ok_or("Missing task_id")?;
            let category = args["category"].as_str().ok_or("Missing category")?;
            let question = args["question"].as_str().ok_or("Missing question")?;
            let decision = args["decision"].as_str().ok_or("Missing decision")?;
            let rationale = args["rationale"].as_str();
            let options: Option<Vec<String>> = args["options"]
                .as_array()
                .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect());
            
            // Record the preference discussion in the task metadata
            loom.record_preference(task_id, category, question, decision, rationale, options.as_deref())
                .map_err(|e| e.to_string())?;
            
            Ok(json!({
                "recorded": true,
                "task_id": task_id,
                "category": category,
                "question": question,
                "decision": decision,
                "rationale": rationale,
                "message": "Preference captured. This will inform planning."
            }))
        }
        
        "loom_verify_plan" => {
            let task_id = args["task_id"].as_str().ok_or("Missing task_id")?;
            let plan = &args["plan"];
            
            // Get the task to verify against
            let task = loom.get(task_id).map_err(|e| e.to_string())?
                .ok_or("Task not found")?;
            
            let mut issues: Vec<String> = Vec::new();
            let mut warnings: Vec<String> = Vec::new();
            
            // Check files_to_modify exist
            if let Some(files) = plan["files_to_modify"].as_array() {
                for file in files {
                    if let Some(path) = file.as_str() {
                        if !std::path::Path::new(path).exists() {
                            issues.push(format!("File to modify does not exist: {}", path));
                        }
                    }
                }
            }
            
            // Check files_to_create don't already exist
            if let Some(files) = plan["files_to_create"].as_array() {
                for file in files {
                    if let Some(path) = file.as_str() {
                        if std::path::Path::new(path).exists() {
                            warnings.push(format!("File to create already exists: {}", path));
                        }
                    }
                }
            }
            
            // Check estimated changes is reasonable (warn if > 500 lines)
            if let Some(changes) = plan["estimated_changes"].as_u64() {
                if changes > 500 {
                    warnings.push(format!("Large change set ({} lines) - consider breaking into smaller tasks", changes));
                }
            }
            
            // Scope creep check: ensure plan steps relate to task title
            // (Simple heuristic - could be enhanced with semantic matching)
            let title_lower = task.title.to_lowercase();
            let task_words: std::collections::HashSet<&str> = title_lower
                .split_whitespace()
                .filter(|w| w.len() > 3)
                .collect();
            
            if task_words.len() > 2 {
                if let Some(steps) = plan["steps"].as_array() {
                    let step_text: String = steps.iter()
                        .filter_map(|s| s["description"].as_str())
                        .collect::<Vec<_>>()
                        .join(" ")
                        .to_lowercase();
                    
                    let overlap = task_words.iter()
                        .filter(|w| step_text.contains(**w))
                        .count();
                    
                    if overlap < task_words.len() / 2 {
                        warnings.push("Plan steps may have scope creep - limited overlap with task title".to_string());
                    }
                }
            }
            
            let passed = issues.is_empty();
            
            Ok(json!({
                "passed": passed,
                "task_id": task_id,
                "issues": issues,
                "warnings": warnings,
                "message": if passed { 
                    "Plan verified. Proceed with execution." 
                } else { 
                    "Plan has issues. Address before proceeding." 
                }
            }))
        }
        
        // ─────────────────────────────────────────────────────────────────
        // Enhanced Context (Harness AgentContext Parity)
        // ─────────────────────────────────────────────────────────────────
        "loom_update_context" => {
            use crate::memory::{FileModification, ChangeType, Decision, TestState, TaskProgress};
            
            let session_id = args["session_id"].as_str().ok_or("Missing session_id")?;
            
            // Get current session and context
            let session = loom.get_session(session_id).map_err(|e| e.to_string())?
                .ok_or("Session not found")?;
            
            let mut context = session.context.clone();
            let mut updates_made = Vec::new();
            
            // Handle file_modified
            if let Some(file) = args.get("file_modified") {
                if let Some(path) = file["path"].as_str() {
                    let modification = FileModification {
                        path: path.to_string(),
                        summary: file["summary"].as_str().unwrap_or("").to_string(),
                        change_type: match file["change_type"].as_str() {
                            Some("created") => ChangeType::Created,
                            Some("deleted") => ChangeType::Deleted,
                            Some("renamed") => ChangeType::Renamed,
                            _ => ChangeType::Modified,
                        },
                        lines_added: file["lines_added"].as_u64().map(|n| n as u32),
                        lines_removed: file["lines_removed"].as_u64().map(|n| n as u32),
                    };
                    context.add_file_modified(modification);
                    updates_made.push("file_modified");
                }
            }
            
            // Handle decision
            if let Some(dec) = args.get("decision") {
                if let (Some(decision), Some(rationale)) = (dec["decision"].as_str(), dec["rationale"].as_str()) {
                    let alternatives: Option<Vec<String>> = dec["alternatives"]
                        .as_array()
                        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect());
                    
                    context.decisions.push(Decision {
                        decision: decision.to_string(),
                        rationale: rationale.to_string(),
                        alternatives,
                        made_at: chrono::Utc::now(),
                    });
                    updates_made.push("decision");
                }
            }
            
            // Handle test_state
            if let Some(ts) = args.get("test_state") {
                context.test_state = Some(TestState {
                    passed: ts["passed"].as_u64().unwrap_or(0) as u32,
                    failed: ts["failed"].as_u64().unwrap_or(0) as u32,
                    skipped: ts["skipped"].as_u64().unwrap_or(0) as u32,
                    failing_tests: ts["failing_tests"].as_array()
                        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
                        .unwrap_or_default(),
                    duration_ms: ts["duration_ms"].as_u64().unwrap_or(0),
                });
                updates_made.push("test_state");
            }
            
            // Handle task_progress
            if let Some(tp) = args.get("task_progress") {
                context.current_task = Some(TaskProgress {
                    issue_id: tp["issue_id"].as_str().unwrap_or("").to_string(),
                    issue_title: tp["issue_title"].as_str().unwrap_or("").to_string(),
                    current_step: tp["current_step"].as_str().unwrap_or("").to_string(),
                    progress_percent: tp["progress_percent"].as_u64().unwrap_or(0) as u8,
                    remaining_work: tp["remaining_work"].as_str().unwrap_or("").to_string(),
                    time_spent_ms: 0, // Could be tracked separately
                });
                updates_made.push("task_progress");
            }
            
            // Handle blocker
            if let Some(blocker) = args["blocker"].as_str() {
                context.add_blocker(blocker);
                updates_made.push("blocker");
            }
            
            // Handle note
            if let Some(note) = args["note"].as_str() {
                context.add_note(note);
                updates_made.push("note");
            }
            
            // Update captured_at timestamp
            context.captured_at = Some(chrono::Utc::now());
            
            // Save updated context
            loom.update_session_context(session_id, &context).map_err(|e| e.to_string())?;
            
            Ok(json!({
                "session_id": session_id,
                "updates": updates_made,
                "context_has_resumable": context.has_resumable_context()
            }))
        }
        
        "loom_get_resume_brief" => {
            let session_id = args["session_id"].as_str().ok_or("Missing session_id")?;
            
            let session = loom.get_session(session_id).map_err(|e| e.to_string())?
                .ok_or("Session not found")?;
            
            let brief = session.context.generate_resume_brief();
            
            Ok(json!({
                "session_id": session_id,
                "brief": brief,
                "has_resumable_context": session.context.has_resumable_context()
            }))
        }
        
        // ─────────────────────────────────────────────────────────────────
        // Beads Compatibility (Robot Priority, Update, Compact)
        // ─────────────────────────────────────────────────────────────────
        "loom_priority" => {
            use crate::priority::Priority as PriorityCalc;
            let limit = args["limit"].as_u64().unwrap_or(10) as usize;
            
            let priority = PriorityCalc::new(loom.store());
            let results = priority.get_prioritized(limit).map_err(|e| e.to_string())?;
            
            Ok(json!(results.iter().map(|r| json!({
                "id": r.task.id,
                "title": r.task.title,
                "score": r.score,
                "reason": r.reason,
                "priority": r.task.priority.as_str(),
                "issue_type": r.task.issue_type.as_str(),
                "labels": r.task.labels,
                "factors": r.factors.iter().map(|f| json!({
                    "name": f.name,
                    "value": f.value,
                    "weight": f.weight
                })).collect::<Vec<_>>()
            })).collect::<Vec<_>>()))
        }
        
        "loom_update" => {
            let task_id = args["task_id"].as_str().ok_or("Missing task_id")?;
            let mut updates: Vec<String> = vec![];
            
            if let Some(priority_str) = args["priority"].as_str() {
                let priority = Priority::from_str(priority_str)
                    .ok_or_else(|| format!("Invalid priority: {}", priority_str))?;
                loom.set_priority(task_id, priority).map_err(|e| e.to_string())?;
                updates.push(format!("priority={}", priority_str));
            }
            
            if let Some(type_str) = args["issue_type"].as_str() {
                let issue_type = IssueType::from_str(type_str)
                    .ok_or_else(|| format!("Invalid issue_type: {}", type_str))?;
                loom.set_issue_type(task_id, issue_type).map_err(|e| e.to_string())?;
                updates.push(format!("issue_type={}", type_str));
            }
            
            if updates.is_empty() {
                return Ok(json!({
                    "task_id": task_id,
                    "message": "No updates specified. Use priority and/or issue_type."
                }));
            }
            
            Ok(json!({
                "task_id": task_id,
                "updates": updates
            }))
        }
        
        "loom_compact" => {
            let older_than_days = args["older_than_days"].as_u64().unwrap_or(30) as u32;
            let removed = loom.compact(older_than_days).map_err(|e| e.to_string())?;
            
            Ok(json!({
                "removed_count": removed,
                "older_than_days": older_than_days
            }))
        }
        
        "loom_doctor" => {
            let summary = loom.summary().map_err(|e| e.to_string())?;
            let blocked_tasks = loom.blocked().map_err(|e| e.to_string())?;
            
            let mut issues: Vec<String> = vec![];
            
            // Check for orphaned blocked tasks
            for task in &blocked_tasks {
                let blockers = loom.get_blocking_tasks(&task.id).map_err(|e| e.to_string())?;
                if blockers.is_empty() {
                    issues.push(format!("Task {} is blocked but has no blockers", task.id));
                }
            }
            
            // Check for claimed tasks with no agent
            let claimed_tasks = loom.list_by_status(Status::Claimed).map_err(|e| e.to_string())?;
            for task in &claimed_tasks {
                if task.agent.is_none() {
                    issues.push(format!("Task {} is claimed but has no agent", task.id));
                }
            }
            
            Ok(json!({
                "summary": {
                    "ready": summary.ready,
                    "claimed": summary.claimed,
                    "blocked": summary.blocked,
                    "done": summary.done,
                    "cancelled": summary.cancelled,
                    "total": summary.total(),
                    "progress_pct": summary.progress_pct(),
                    "total_cost_usd": summary.total_cost_usd
                },
                "issues": issues,
                "healthy": issues.is_empty()
            }))
        }
        
        // ─────────────────────────────────────────────────────────────────
        // Notion Sync
        // ─────────────────────────────────────────────────────────────────
        "loom_notion_init" => {
            use crate::notion::NotionClient;
            use crate::config::LoomConfig;
            
            let parent_page_id = args["parent_page_id"].as_str()
                .ok_or("Missing parent_page_id")?;
            
            let token = args["token"].as_str()
                .map(String::from)
                .or_else(|| std::env::var("NOTION_TOKEN").ok())
                .ok_or("Notion token required. Provide 'token' or set NOTION_TOKEN env var")?;
            
            let client = NotionClient::new(&token);
            let database_id = client.create_database(parent_page_id)
                .map_err(|e| e.to_string())?;
            
            // Save config
            let root = loom.root().parent().unwrap_or(loom.root());
            let mut config = LoomConfig::load(root).unwrap_or_default();
            config.notion.access_token = Some(token);
            config.notion.database_id = Some(database_id.clone());
            config.save(root).map_err(|e| e.to_string())?;
            
            Ok(json!({
                "database_id": database_id,
                "message": "Notion database created and config saved. Use loom_notion_sync to sync tasks."
            }))
        }
        
        "loom_notion_sync" => {
            use crate::notion::{NotionClient, SyncOptions, sync_tasks};
            use crate::config::LoomConfig;
            
            let root = loom.root().parent().unwrap_or(loom.root());
            let config = LoomConfig::load(root).map_err(|e| e.to_string())?;
            
            let token = config.notion.access_token
                .or_else(|| std::env::var("NOTION_TOKEN").ok())
                .ok_or("Notion not configured. Run loom_notion_init first")?;
            
            let database_id = config.notion.database_id
                .ok_or("Notion database not configured. Run loom_notion_init first")?;
            
            let dry_run = args["dry_run"].as_bool().unwrap_or(false);
            let force = args["force"].as_bool().unwrap_or(false);
            
            let status_filter = args["status"].as_str().and_then(|s| {
                match s {
                    "ready" => Some(Status::Ready),
                    "claimed" => Some(Status::Claimed),
                    "blocked" => Some(Status::Blocked),
                    "done" => Some(Status::Done),
                    "cancelled" => Some(Status::Cancelled),
                    _ => None
                }
            });
            
            let since_filter = args["since"].as_str().and_then(|s| {
                chrono::DateTime::parse_from_rfc3339(s)
                    .map(|dt| dt.with_timezone(&chrono::Utc))
                    .ok()
            });
            
            let options = SyncOptions {
                dry_run,
                force,
                status: status_filter,
                since: since_filter,
            };
            
            let tasks = loom.list().map_err(|e| e.to_string())?;
            let client = NotionClient::new(&token);
            
            let result = sync_tasks(&client, &database_id, &tasks, &options)
                .map_err(|e| e.to_string())?;
            
            Ok(json!({
                "total": result.total,
                "created": result.created,
                "updated": result.updated,
                "skipped": result.skipped,
                "errors": result.errors,
                "dry_run": dry_run
            }))
        }
        
        "loom_notion_status" => {
            use crate::config::LoomConfig;
            
            let root = loom.root().parent().unwrap_or(loom.root());
            let config = LoomConfig::load(root).map_err(|e| e.to_string())?;
            
            Ok(json!({
                "configured": config.notion.is_configured(),
                "database_id": config.notion.database_id,
                "has_token": config.notion.access_token.is_some()
            }))
        }
        
        _ => Err(format!("Unknown tool: {}", name)),
    }
}

/// MCP Server that handles JSON-RPC communication
pub struct McpServer {
    loom: Loom,
    ui_registry: UiRegistry,
}

impl McpServer {
    pub fn new(loom: Loom) -> Self {
        Self { 
            loom,
            ui_registry: UiRegistry::new(),
        }
    }
    
    /// Run the MCP server on stdin/stdout
    pub async fn run(&mut self) -> Result<(), std::io::Error> {
        let stdin = std::io::stdin();
        let mut stdout = std::io::stdout();
        
        for line in stdin.lock().lines() {
            let line = line?;
            if line.trim().is_empty() {
                continue;
            }
            
            let response = self.handle_request(&line);
            // Only write response if non-empty (notifications don't get responses)
            if !response.is_empty() {
                writeln!(stdout, "{}", response)?;
                stdout.flush()?;
            }
        }
        
        Ok(())
    }
    
    fn handle_request(&mut self, request: &str) -> String {
        let req: Value = match serde_json::from_str(request) {
            Ok(v) => v,
            Err(e) => return json!({ 
                "jsonrpc": "2.0",
                "id": null,
                "error": { "code": -32700, "message": format!("Parse error: {}", e) }
            }).to_string(),
        };
        
        let method = req["method"].as_str().unwrap_or("");
        let params = &req["params"];
        let id = &req["id"];
        
        let result = match method {
            // MCP initialization handshake
            "initialize" => {
                json!({
                    "protocolVersion": "2024-11-05",
                    "capabilities": {
                        "tools": {},
                        "resources": {
                            "subscribe": false,
                            "listChanged": false
                        }
                    },
                    "serverInfo": {
                        "name": "loom",
                        "version": "0.2.0"
                    }
                })
            }
            
            // Initialization complete notification (no response needed but we handle it)
            "notifications/initialized" => {
                return String::new(); // No response for notifications
            }
            
            "tools/list" => {
                let tools = list_tools();
                json!({ "tools": tools })
            }
            
            "tools/call" => {
                let name = params["name"].as_str().unwrap_or("");
                let args = params["arguments"].clone();
                
                match call_tool(&mut self.loom, name, args) {
                    Ok(result) => json!({ "content": [{ "type": "text", "text": result.to_string() }] }),
                    Err(e) => json!({ "isError": true, "content": [{ "type": "text", "text": e }] }),
                }
            }
            
            // MCP Apps: List UI resources
            "resources/list" => {
                let resources: Vec<Value> = self.ui_registry.list()
                    .iter()
                    .map(|r| json!({
                        "uri": r.uri,
                        "name": r.name,
                        "description": r.description,
                        "mimeType": r.mime_type
                    }))
                    .collect();
                json!({ "resources": resources })
            }
            
            // MCP Apps: Read a UI resource
            "resources/read" => {
                let uri = params["uri"].as_str().unwrap_or("");
                
                if let Some(resource) = self.ui_registry.get(uri) {
                    json!({
                        "contents": [{
                            "uri": resource.uri,
                            "mimeType": resource.mime_type,
                            "text": resource.content
                        }]
                    })
                } else {
                    json!({
                        "error": {
                            "code": -32002,
                            "message": format!("Resource not found: {}", uri)
                        }
                    })
                }
            }
            
            _ => json!({ "error": { "code": -32601, "message": format!("Unknown method: {}", method) } }),
        };
        
        json!({
            "jsonrpc": "2.0",
            "id": id,
            "result": result
        }).to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_tool_list() {
        let tools = list_tools();
        assert!(!tools.is_empty());
        
        // Check that key tools exist
        let names: Vec<_> = tools.iter().map(|t| t.name.as_str()).collect();
        assert!(names.contains(&"loom_create"));
        assert!(names.contains(&"loom_claim"));
        assert!(names.contains(&"loom_complete"));
        assert!(names.contains(&"loom_ready"));
        assert!(names.contains(&"loom_route"));
        assert!(names.contains(&"loom_session_start"));
        assert!(names.contains(&"loom_checkpoint"));
        assert!(names.contains(&"loom_formulas"));
    }
    
    #[test]
    fn test_call_tool() {
        use tempfile::tempdir;
        
        let dir = tempdir().unwrap();
        let mut loom = Loom::init(dir.path()).unwrap();
        
        // Create task
        let result = call_tool(&mut loom, "loom_create", json!({
            "title": "Test task",
            "labels": ["test", "mcp"]
        })).unwrap();
        
        let id = result["id"].as_str().unwrap();
        assert!(id.starts_with("lm-"));
        
        // Get ready tasks
        let ready = call_tool(&mut loom, "loom_ready", json!({})).unwrap();
        assert!(ready.as_array().unwrap().len() > 0);
        
        // Get summary
        let summary = call_tool(&mut loom, "loom_summary", json!({})).unwrap();
        assert_eq!(summary["total"], 1);
        assert_eq!(summary["ready"], 1);
    }
}
