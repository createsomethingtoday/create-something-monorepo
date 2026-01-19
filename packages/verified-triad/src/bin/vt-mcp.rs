//! Verified Triad MCP Server
//!
//! A Model Context Protocol server that exposes Verified Triad tools.
//!
//! Usage:
//!   vt-mcp [--db <path>]
//!
//! The server communicates via stdio using JSON-RPC.

use std::io::{self, BufRead, Write};
use std::path::PathBuf;
use clap::Parser;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use verified_triad::{VerifiedTriad, mcp};

#[derive(Parser)]
#[command(name = "vt-mcp")]
#[command(about = "Verified Triad MCP Server - Computation-constrained synthesis")]
struct Cli {
    /// Path to registry database
    #[arg(long, default_value = ".vt/registry.db")]
    db: PathBuf,
}

/// JSON-RPC Request
#[derive(Debug, Deserialize)]
struct Request {
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
    
    // Ensure .vt directory exists
    if let Some(parent) = cli.db.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    
    // Initialize Verified Triad
    let mut vt = match VerifiedTriad::new(&cli.db) {
        Ok(vt) => vt,
        Err(e) => {
            eprintln!("Failed to initialize Verified Triad: {}", e);
            std::process::exit(1);
        }
    };
    
    eprintln!("Verified Triad MCP server started (db: {})", cli.db.display());
    
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
                    "tools": {}
                },
                "serverInfo": {
                    "name": "verified-triad",
                    "version": env!("CARGO_PKG_VERSION")
                }
            })),
            
            "tools/list" => {
                let tools = mcp::list_tools();
                Response::success(id, json!({
                    "tools": tools.iter().map(|t| json!({
                        "name": t.name,
                        "description": t.description,
                        "inputSchema": t.input_schema
                    })).collect::<Vec<_>>()
                }))
            }
            
            "tools/call" => {
                let tool_name = request.params.get("name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let args = request.params.get("arguments")
                    .cloned()
                    .unwrap_or(json!({}));
                
                let result = mcp::handle_tool_call(&mut vt, tool_name, &args);
                
                if result.success {
                    Response::success(id, json!({
                        "content": [{
                            "type": "text",
                            "text": serde_json::to_string_pretty(&result.content).unwrap()
                        }]
                    }))
                } else {
                    Response::success(id, json!({
                        "content": [{
                            "type": "text",
                            "text": result.error.unwrap_or_else(|| "Unknown error".to_string())
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
