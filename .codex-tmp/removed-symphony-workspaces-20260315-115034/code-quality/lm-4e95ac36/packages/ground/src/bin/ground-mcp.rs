//! Ground MCP Server
//!
//! Exposes Ground tools via the Model Context Protocol.
//!
//! Usage:
//!   ground-mcp [--db <path>] [--workspace <path>]
//!
//! The server communicates via stdio using JSON-RPC.
//!
//! ## MCP Apps Support
//!
//! This server supports MCP Apps extension for interactive UIs:
//! - `ui://ground/duplicate-explorer` - Visual duplicate function explorer

use std::io::{self, BufRead, Write};
use std::path::PathBuf;
use std::time::Instant;
use clap::Parser;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use ground::{VerifiedTriad, mcp, ui_resources::UiRegistry, desire_paths::DesirePathTracker};

/// Log a message to stderr with timestamp
macro_rules! log {
    ($($arg:tt)*) => {
        eprintln!("[ground {}] {}", chrono::Utc::now().format("%H:%M:%S%.3f"), format!($($arg)*));
    };
}

#[derive(Parser)]
#[command(name = "ground-mcp")]
#[command(about = "Ground MCP Server - Grounded claims for code")]
struct Cli {
    /// Path to registry database
    #[arg(long, default_value = ".ground/registry.db")]
    db: PathBuf,
    
    /// Workspace root directory (for resolving relative paths)
    #[arg(long)]
    workspace: Option<PathBuf>,
}

/// JSON-RPC Request
#[derive(Debug, Deserialize)]
struct Request {
    #[allow(dead_code)]
    jsonrpc: String,
    id: Option<Value>,
    method: String,
    #[serde(default)]
    params: Value,
}

/// JSON-RPC Response
#[derive(Debug, Serialize)]
struct Response {
    jsonrpc: String,
    id: Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<RpcError>,
}

#[derive(Debug, Serialize)]
struct RpcError {
    code: i32,
    message: String,
}

impl Response {
    fn success(id: Value, result: Value) -> Self {
        Self {
            jsonrpc: "2.0".to_string(),
            id,
            result: Some(result),
            error: None,
        }
    }
    
    fn error(id: Value, code: i32, message: String) -> Self {
        Self {
            jsonrpc: "2.0".to_string(),
            id,
            result: None,
            error: Some(RpcError { code, message }),
        }
    }
}

/// Summarize tool arguments for logging (avoid logging huge paths/data)
fn summarize_args(tool_name: &str, args: &Value) -> String {
    match tool_name {
        "ground_count_uses" => {
            let symbol = args.get("symbol").and_then(|v| v.as_str()).unwrap_or("?");
            let path = args.get("search_path").and_then(|v| v.as_str()).unwrap_or(".");
            format!(" (symbol={}, path={})", symbol, shorten_path(path))
        }
        "ground_find_dead_exports" => {
            let module = args.get("module_path").and_then(|v| v.as_str()).unwrap_or("?");
            format!(" (module={})", shorten_path(module))
        }
        "ground_find_duplicate_functions" => {
            let dir = args.get("directory").and_then(|v| v.as_str()).unwrap_or(".");
            let cross = args.get("cross_package").and_then(|v| v.as_bool()).unwrap_or(false);
            if cross {
                format!(" (dir={}, cross_package=true)", shorten_path(dir))
            } else {
                format!(" (dir={})", shorten_path(dir))
            }
        }
        "ground_analyze" => {
            let dir = args.get("directory").and_then(|v| v.as_str()).unwrap_or(".");
            format!(" (dir={})", shorten_path(dir))
        }
        "ground_check_connections" => {
            let module = args.get("module_path").and_then(|v| v.as_str()).unwrap_or("?");
            format!(" (module={})", shorten_path(module))
        }
        "ground_compare" => {
            let a = args.get("file_a").and_then(|v| v.as_str()).unwrap_or("?");
            let b = args.get("file_b").and_then(|v| v.as_str()).unwrap_or("?");
            format!(" ({} vs {})", shorten_path(a), shorten_path(b))
        }
        "ground_find_orphans" => {
            let dir = args.get("directory").and_then(|v| v.as_str()).unwrap_or(".");
            format!(" (dir={})", shorten_path(dir))
        }
        "ground_check_environment" => {
            let entry = args.get("entry_point").and_then(|v| v.as_str()).unwrap_or("?");
            format!(" (entry={})", shorten_path(entry))
        }
        "ground_find_drift" | "ground_adoption_ratio" | "ground_mine_patterns" => {
            let dir = args.get("directory").and_then(|v| v.as_str()).unwrap_or(".");
            format!(" (dir={})", shorten_path(dir))
        }
        "ground_suggest_pattern" => {
            let file = args.get("file").and_then(|v| v.as_str()).unwrap_or("?");
            format!(" (file={})", shorten_path(file))
        }
        _ => String::new()
    }
}

/// Shorten a path for logging (show last 2 components)
fn shorten_path(path: &str) -> String {
    let parts: Vec<&str> = path.split('/').collect();
    if parts.len() <= 2 {
        path.to_string()
    } else {
        format!(".../{}", parts[parts.len()-2..].join("/"))
    }
}

fn main() {
    let cli = Cli::parse();
    
    // Change to workspace directory if provided
    // This makes all relative paths work correctly
    if let Some(ref workspace) = cli.workspace {
        if workspace.exists() && workspace.is_dir() {
            if let Err(e) = std::env::set_current_dir(workspace) {
                log!("Warning: Could not change to workspace {}: {}", workspace.display(), e);
            } else {
                log!("Workspace: {}", workspace.display());
            }
        } else {
            log!("Warning: Workspace path does not exist: {}", workspace.display());
        }
    }
    
    // Ensure .ground directory exists
    if let Some(parent) = cli.db.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    
    // Initialize Ground
    let mut g = match VerifiedTriad::new(&cli.db) {
        Ok(g) => g,
        Err(e) => {
            log!("Failed to initialize: {}", e);
            std::process::exit(1);
        }
    };
    
    // Initialize UI registry for MCP Apps
    let ui_registry = UiRegistry::new();
    
    // Initialize desire path tracker
    let desire_paths_log = cli.db.parent()
        .map(|p| p.join("desire_paths.jsonl"))
        .unwrap_or_else(|| PathBuf::from(".ground/desire_paths.jsonl"));
    let mut desire_tracker = DesirePathTracker::new(&desire_paths_log);
    
    log!("MCP server started (db: {}, MCP Apps enabled, desire paths: {})", 
         cli.db.display(), desire_paths_log.display());
    
    let stdin = io::stdin();
    let mut stdout = io::stdout();
    
    for line in stdin.lock().lines() {
        let line = match line {
            Ok(l) => l,
            Err(e) => {
                eprintln!("Read error: {}", e);
                continue;
            }
        };
        
        if line.trim().is_empty() {
            continue;
        }
        
        let request: Request = match serde_json::from_str(&line) {
            Ok(r) => r,
            Err(e) => {
                let response = Response::error(
                    Value::Null,
                    -32700,
                    format!("Parse error: {}", e),
                );
                let _ = writeln!(stdout, "{}", serde_json::to_string(&response).unwrap());
                let _ = stdout.flush();
                continue;
            }
        };
        
        let id = request.id.clone().unwrap_or(Value::Null);
        
        let response = match request.method.as_str() {
            "initialize" => Response::success(id, json!({
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {},
                    "resources": {
                        "subscribe": false,
                        "listChanged": false
                    },
                    "prompts": {
                        "listChanged": false
                    }
                },
                "serverInfo": {
                    "name": "ground",
                    "version": env!("CARGO_PKG_VERSION")
                }
            })),
            
            "tools/list" => {
                let tools = mcp::list_tools();
                // Add UI metadata to tools that support it
                Response::success(id, json!({
                    "tools": tools.iter().map(|t| {
                        let mut tool_json = json!({
                            "name": t.name,
                            "description": t.description,
                            "inputSchema": t.input_schema
                        });
                        // Add UI metadata for duplicate-related tools
                        if t.name == "ground_find_duplicate_functions" || 
                           t.name == "ground_compare" ||
                           t.name == "ground_suggest_fix" {
                            tool_json["_meta"] = json!({
                                "ui": {
                                    "resourceUri": "ui://ground/duplicate-explorer"
                                }
                            });
                        }
                        tool_json
                    }).collect::<Vec<_>>()
                }))
            }
            
            // MCP Apps: List UI resources
            "resources/list" => {
                let resources: Vec<Value> = ui_registry.list()
                    .iter()
                    .map(|r| json!({
                        "uri": r.uri,
                        "name": r.name,
                        "description": r.description,
                        "mimeType": r.mime_type
                    }))
                    .collect();
                Response::success(id, json!({ "resources": resources }))
            }
            
            // MCP Apps: Read a UI resource
            "resources/read" => {
                let uri = request.params.get("uri")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");

                if let Some(resource) = ui_registry.get(uri) {
                    Response::success(id, json!({
                        "contents": [{
                            "uri": resource.uri,
                            "mimeType": resource.mime_type,
                            "text": resource.content
                        }]
                    }))
                } else {
                    Response::error(id, -32002, format!("Resource not found: {}", uri))
                }
            }

            // Judgment tier — Prompts
            "prompts/list" => {
                Response::success(id, json!({
                    "prompts": [
                        {
                            "name": "refactor_planning",
                            "description": "Plan a safe refactoring sequence. Analyzes duplicates, dead exports, and orphans to determine optimal removal order with risk assessment.",
                            "arguments": [
                                {
                                    "name": "path",
                                    "description": "Directory path to analyze for refactoring (e.g., 'src/' or 'packages/mylib')",
                                    "required": true
                                }
                            ]
                        },
                        {
                            "name": "architecture_health_score",
                            "description": "Calculate a composite health score for a codebase directory. Combines orphan%, duplicate%, and dead export% into a single score with actionable recommendations.",
                            "arguments": [
                                {
                                    "name": "path",
                                    "description": "Directory path to assess (e.g., 'src/' or '.')",
                                    "required": true
                                }
                            ]
                        },
                        {
                            "name": "workers_safety_review",
                            "description": "Scan for Node.js APIs and patterns that break in Cloudflare Workers (V8 isolates). Suggests Workers-compatible alternatives.",
                            "arguments": [
                                {
                                    "name": "path",
                                    "description": "Entry point or directory to scan for Workers compatibility (e.g., 'src/index.ts')",
                                    "required": true
                                }
                            ]
                        }
                    ]
                }))
            }

            "prompts/get" => {
                let prompt_name = request.params.get("name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let args = request.params.get("arguments")
                    .cloned()
                    .unwrap_or(json!({}));
                let path = args.get("path")
                    .and_then(|v| v.as_str())
                    .unwrap_or(".");

                match prompt_name {
                    "refactor_planning" => Response::success(id, json!({
                        "description": format!("Refactoring plan for {}", path),
                        "messages": [{
                            "role": "user",
                            "content": {
                                "type": "text",
                                "text": format!(r#"You are planning a safe refactoring sequence for the codebase at `{}`. Use Ground tools in this exact order to build a complete picture before making any changes.

## Step 1: Find Duplicate Functions (highest risk — 18% higher bug correlation)
Use `ground_find_duplicate_functions` on the target path. Duplicates are the #1 source of inconsistent behavior during refactoring. Start here because:
- Removing one copy of a duplicate while missing another causes silent bugs.
- Duplicates often have subtle differences that reveal which version is canonical.

## Step 2: Find Dead Exports
Use `ground_find_dead_exports` on each module in the target path. Dead exports are safe to remove because nothing depends on them. They're low-risk wins that:
- Reduce bundle size and API surface.
- Simplify the dependency graph for later steps.

## Step 3: Find Orphans
Use `ground_find_orphans` in the target path. Orphaned files have no incoming imports — they're either entry points or dead code. Cross-reference with your build config.

## Step 4: Check Connections
For each file you plan to modify, use `ground_check_connections` to understand its dependency graph. A file with 20 dependents needs more careful refactoring than one with 2.

## Step 5: Build the Refactoring Plan
Based on the analysis, produce a plan with:
- **Safe removals** (dead exports, confirmed orphans): Do these first.
- **Consolidations** (duplicates): Merge into canonical locations, update imports.
- **Risky changes** (high-connectivity modules): Do these last, with tests.

For each change, specify:
1. File path and action (remove, merge, rename).
2. Risk level (LOW/MEDIUM/HIGH) based on connection count.
3. Suggested test to verify after the change.

## Step 6: Verify with ground_analyze
Run `ground_analyze` on the target path to confirm the health score improves after your planned changes."#, path)
                            }
                        }]
                    })),

                    "architecture_health_score" => Response::success(id, json!({
                        "description": format!("Architecture health score for {}", path),
                        "messages": [{
                            "role": "user",
                            "content": {
                                "type": "text",
                                "text": format!(r#"Calculate a composite architecture health score for `{}`. Use Ground tools to gather metrics, then compute the score.

## Data Collection

Run these Ground tools to gather raw metrics:

1. **`ground_analyze`** on the path — gives overall summary including file count, function count.
2. **`ground_find_orphans`** — count orphaned files vs total files = orphan%.
3. **`ground_find_duplicate_functions`** — count duplicate groups vs total functions = duplicate%.
4. **`ground_find_dead_exports`** on key modules — count dead exports vs total exports = dead%.

## Score Calculation

Compute the health score (0-10) using this formula:

```
health = 10 - (orphan_penalty + duplicate_penalty + dead_export_penalty)

Where:
  orphan_penalty    = min(3, orphan% × 10)       # 30%+ orphans = max 3 point penalty
  duplicate_penalty = min(4, duplicate% × 20)     # 20%+ duplicates = max 4 point penalty
  dead_export_penalty = min(3, dead_export% × 10) # 30%+ dead = max 3 point penalty
```

Duplicates are weighted heaviest because they correlate with 18% higher bug rates.

## Output Format

Present results as:

### Health Score: X.X / 10

| Metric | Value | Penalty | Recommendation |
|--------|-------|---------|----------------|
| Orphan files | X/Y (Z%) | -N | [specific action] |
| Duplicate functions | X groups | -N | [specific action] |
| Dead exports | X/Y (Z%) | -N | [specific action] |

### Score Interpretation
- **9-10**: Excellent — minimal maintenance debt.
- **7-8**: Good — some cleanup opportunities.
- **5-6**: Fair — refactoring recommended this sprint.
- **3-4**: Poor — technical debt actively slowing development.
- **0-2**: Critical — immediate intervention needed.

### Top 3 Recommendations
[Ordered by impact: what to fix first, second, third, with specific file paths.]"#, path)
                            }
                        }]
                    })),

                    "workers_safety_review" => Response::success(id, json!({
                        "description": format!("Cloudflare Workers safety review for {}", path),
                        "messages": [{
                            "role": "user",
                            "content": {
                                "type": "text",
                                "text": format!(r#"Scan `{}` for Node.js APIs and patterns that will break in Cloudflare Workers (V8 isolates). Use Ground tools to analyze the code.

## Step 1: Check Environment
Use `ground_check_environment` with the target path as entry point. This detects:
- Node.js built-in module usage (`fs`, `path`, `crypto`, `child_process`, etc.)
- Global objects not available in Workers (`process`, `Buffer`, `__dirname`, `__filename`)
- Dynamic `require()` calls

## Step 2: Analyze Dependencies
Use `ground_check_connections` to trace what the entry point imports. For each dependency:
- Flag any that import Node.js built-ins.
- Check if Workers-compatible alternatives exist.

## Step 3: Common Breaking Patterns

Flag these specific patterns with recommended fixes:

| Node.js Pattern | Workers Alternative |
|----------------|---------------------|
| `fs.readFile()` | Workers KV, R2, or D1 |
| `path.join()` | String concatenation or URL API |
| `crypto.randomBytes()` | `crypto.getRandomValues()` |
| `Buffer.from()` | `Uint8Array` or `TextEncoder` |
| `process.env` | `env` binding parameter |
| `setTimeout` (long) | Durable Objects alarms |
| `child_process` | No equivalent — redesign needed |
| `net`/`dgram` | `fetch()` or WebSocket |
| `stream.Readable` | `ReadableStream` (Web Streams API) |
| `__dirname` | Not available — use URL resolution |

## Step 4: Report

For each finding, provide:
1. **File and line** where the incompatible API is used.
2. **Severity**: CRITICAL (will crash), WARNING (may fail), INFO (suboptimal).
3. **Fix**: The specific Workers-compatible replacement.
4. **Effort**: LOW (drop-in replacement), MEDIUM (minor refactor), HIGH (architectural change).

Summarize with a compatibility score: what percentage of the codebase is Workers-ready."#, path)
                            }
                        }]
                    })),

                    _ => Response::error(id, -32002, format!("Prompt not found: {}", prompt_name))
                }
            }

            "tools/call" => {
                let tool_name = request.params.get("name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let args = request.params.get("arguments")
                    .cloned()
                    .unwrap_or(json!({}));
                
                // Handle desire paths analysis tool specially
                if tool_name == "ground_desire_paths" {
                    log!("ground_desire_paths starting");
                    let start = Instant::now();
                    
                    // Load and analyze desire paths
                    if let Err(e) = desire_tracker.load_all() {
                        log!("Warning: Could not load desire paths: {}", e);
                    }
                    let analysis = desire_tracker.analyze();
                    let response: ground::desire_paths::DesirePathResponse = analysis.into();
                    
                    log!("ground_desire_paths completed in {:.2}s", start.elapsed().as_secs_f64());
                    Response::success(id, json!({
                        "content": [{
                            "type": "text",
                            "text": serde_json::to_string_pretty(&response).unwrap()
                        }]
                    }))
                } else {
                    // Log tool call with key arguments for debugging
                    let args_summary = summarize_args(tool_name, &args);
                    log!("{} starting{}", tool_name, args_summary);
                    
                    let start = Instant::now();
                    let result = mcp::handle_tool_call(&mut g, tool_name, &args);
                    let elapsed = start.elapsed();
                    
                    // Track unknown tools for desire path analysis
                    if !result.success {
                        let error_msg = result.error.clone().unwrap_or_default();
                        if error_msg.contains("Unknown tool") {
                            desire_tracker.log_unknown_tool(tool_name, &args);
                            log!("Desire path logged: unknown tool {}", tool_name);
                        } else if error_msg.contains("not found") || error_msg.contains("No such file") {
                            desire_tracker.log_path_not_found(tool_name, &args);
                        } else if error_msg.contains("invalid") || error_msg.contains("Invalid") {
                            desire_tracker.log_invalid_args(tool_name, &args, &error_msg);
                        }
                    }
                    
                    // Log completion with timing
                    if result.success {
                        log!("{} completed in {:.2}s", tool_name, elapsed.as_secs_f64());
                        Response::success(id, json!({
                            "content": [{
                                "type": "text",
                                "text": serde_json::to_string_pretty(&result.content).unwrap()
                            }]
                        }))
                    } else {
                        let error_msg = result.error.clone().unwrap_or_else(|| "Unknown error".to_string());
                        log!("{} failed in {:.2}s: {}", tool_name, elapsed.as_secs_f64(), error_msg);
                        Response::success(id, json!({
                            "content": [{
                                "type": "text",
                                "text": error_msg
                            }],
                            "isError": true
                        }))
                    }
                }
            }
            
            "notifications/initialized" => {
                // No response needed for notifications
                continue;
            }
            
            _ => Response::error(id, -32601, format!("Method not found: {}", request.method)),
        };
        
        let _ = writeln!(stdout, "{}", serde_json::to_string(&response).unwrap());
        let _ = stdout.flush();
    }
}
