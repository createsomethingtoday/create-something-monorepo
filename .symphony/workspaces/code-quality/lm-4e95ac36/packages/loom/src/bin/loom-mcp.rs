//! Loom MCP Server Binary
//!
//! Runs the Loom MCP server for agent integration.
//!
//! Usage:
//!   loom-mcp [--path <dir>]
//!
//! The server communicates via stdio using JSON-RPC.
//!
//! ## MCP Apps Support
//!
//! This server supports MCP Apps extension for interactive UIs:
//! - `ui://loom/task-board` - Kanban-style task visualization

use std::io::{self, BufRead, Write};
use std::path::PathBuf;
use clap::Parser;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use loom::{Loom, mcp, ui_resources::UiRegistry};

#[derive(Parser)]
#[command(name = "loom-mcp")]
#[command(about = "Loom MCP Server - Agent coordination via Model Context Protocol")]
#[command(version)]
struct Cli {
    /// Path to Loom directory (default: current directory)
    #[arg(long, short)]
    path: Option<PathBuf>,
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

fn main() {
    let cli = Cli::parse();
    let path = cli.path.unwrap_or_else(|| PathBuf::from("."));
    
    // Open or initialize Loom
    let mut loom = match Loom::open_or_init(&path) {
        Ok(l) => l,
        Err(e) => {
            eprintln!("Failed to initialize Loom: {}", e);
            std::process::exit(1);
        }
    };
    
    // Initialize UI registry for MCP Apps
    let ui_registry = UiRegistry::new();
    
    eprintln!("Loom MCP server started (path: {}, MCP Apps enabled)", path.display());
    
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
                    "name": "loom",
                    "version": env!("CARGO_PKG_VERSION")
                }
            })),
            
            "tools/list" => {
                let tools = mcp::list_tools();
                Response::success(id, json!({
                    "tools": tools.iter().map(|t| {
                        let mut tool_json = json!({
                            "name": t.name,
                            "description": t.description,
                            "inputSchema": t.parameters
                        });
                        // Add UI metadata if present
                        if let Some(ref meta) = t.meta {
                            tool_json["_meta"] = serde_json::to_value(meta).unwrap_or(json!(null));
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
                
                match mcp::call_tool(&mut loom, tool_name, args) {
                    Ok(result) => Response::success(id, json!({
                        "content": [{
                            "type": "text",
                            "text": serde_json::to_string_pretty(&result).unwrap()
                        }]
                    })),
                    Err(e) => Response::success(id, json!({
                        "content": [{
                            "type": "text",
                            "text": e
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
