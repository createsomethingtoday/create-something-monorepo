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
use ground::{VerifiedTriad, mcp, ui_resources::UiRegistry};

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
    
    log!("MCP server started (db: {}, MCP Apps enabled)", cli.db.display());
    
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
            
            "tools/call" => {
                let tool_name = request.params.get("name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let args = request.params.get("arguments")
                    .cloned()
                    .unwrap_or(json!({}));
                
                // Log tool call with key arguments for debugging
                let args_summary = summarize_args(tool_name, &args);
                log!("{} starting{}", tool_name, args_summary);
                
                let start = Instant::now();
                let result = mcp::handle_tool_call(&mut g, tool_name, &args);
                let elapsed = start.elapsed();
                
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
