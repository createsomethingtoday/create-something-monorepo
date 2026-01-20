//! Ground MCP Server
//!
//! Exposes Ground tools via the Model Context Protocol.
//!
//! ## Tools
//!
//! ### Check Tools (do these first)
//! - `ground_compare` - Compare two files for similarity
//! - `ground_count_uses` - Count how many times something is used
//! - `ground_check_connections` - Check if a module is connected
//! - `ground_find_duplicate_functions` - Find duplicate functions across files
//!
//! ### Claim Tools (need to check first)
//! - `ground_claim_duplicate` - Claim files are duplicates
//! - `ground_claim_dead_code` - Claim code is dead
//! - `ground_claim_orphan` - Claim module is orphaned
//!
//! ### Other Tools
//! - `ground_status` - Show what's been checked
//! - `ground_suggest_fix` - Get suggestions for fixing duplicates

use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::{VerifiedTriad, VerifiedTriadError};
use crate::computations::{analyze_function_dry, analyze_function_dry_with_options, FunctionDryOptions};
use crate::computations::environment::{analyze_environment_safety, WarningSeverity, RuntimeEnvironment};
use crate::monorepo::{detect_monorepo, suggest_refactoring, generate_beads_command};

/// MCP Tool definitions for Ground
pub fn list_tools() -> Vec<ToolDefinition> {
    vec![
        // Check tools (do these first)
        ToolDefinition {
            name: "ground_compare".to_string(),
            description: "Compare two files for similarity. You need to do this before you can claim they're duplicates.".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "file_a": {
                        "type": "string",
                        "description": "Path to first file"
                    },
                    "file_b": {
                        "type": "string",
                        "description": "Path to second file"
                    }
                },
                "required": ["file_a", "file_b"]
            }),
        },
        ToolDefinition {
            name: "ground_count_uses".to_string(),
            description: "Count how many times a symbol is used. You need to do this before you can claim it's dead code.".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "Symbol to search for"
                    },
                    "search_path": {
                        "type": "string",
                        "description": "Path to search in (default: current directory)"
                    }
                },
                "required": ["symbol"]
            }),
        },
        ToolDefinition {
            name: "ground_check_connections".to_string(),
            description: "Check if a module is connected to other code. Understands Cloudflare Workers (routes, crons, bindings). You need to do this before you can claim it's orphaned.".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "module_path": {
                        "type": "string",
                        "description": "Path to the module to check"
                    }
                },
                "required": ["module_path"]
            }),
        },
        ToolDefinition {
            name: "ground_find_duplicate_functions".to_string(),
            description: "Find duplicate functions across files. Catches cases where overall file similarity is low but specific functions are copied.".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "directory": {
                        "type": "string",
                        "description": "Directory to analyze"
                    },
                    "threshold": {
                        "type": "number",
                        "description": "How similar functions need to be (0.0-1.0, default: 0.8)"
                    },
                    "exclude_tests": {
                        "type": "boolean",
                        "description": "Exclude test files (*.test.ts, *.spec.ts, __tests__/*). Default: false"
                    },
                    "min_lines": {
                        "type": "number",
                        "description": "Minimum function lines to analyze. Filters out trivial 1-3 line functions. Default: no minimum"
                    }
                },
                "required": ["directory"]
            }),
        },
        // Claim tools (need to check first)
        ToolDefinition {
            name: "ground_claim_duplicate".to_string(),
            description: "Claim that two files are duplicates. Blocked if you haven't compared them first, or if they're not similar enough.".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "file_a": {
                        "type": "string",
                        "description": "Path to first file"
                    },
                    "file_b": {
                        "type": "string",
                        "description": "Path to second file"
                    },
                    "reason": {
                        "type": "string",
                        "description": "Why you're claiming this"
                    }
                },
                "required": ["file_a", "file_b", "reason"]
            }),
        },
        ToolDefinition {
            name: "ground_claim_dead_code".to_string(),
            description: "Claim that code is dead (unused). Blocked if you haven't counted uses first, or if it's actually used.".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "Symbol that's dead"
                    },
                    "reason": {
                        "type": "string",
                        "description": "Why you're claiming this"
                    }
                },
                "required": ["symbol", "reason"]
            }),
        },
        ToolDefinition {
            name: "ground_claim_orphan".to_string(),
            description: "Claim that a module is orphaned (nothing connects to it). Blocked if you haven't checked connections first, or if it's actually connected.".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "module_path": {
                        "type": "string",
                        "description": "Path to the module"
                    },
                    "reason": {
                        "type": "string",
                        "description": "Why you're claiming this"
                    }
                },
                "required": ["module_path", "reason"]
            }),
        },
        // Other tools
        ToolDefinition {
            name: "ground_status".to_string(),
            description: "Show Ground status and thresholds.".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {}
            }),
        },
        ToolDefinition {
            name: "ground_suggest_fix".to_string(),
            description: "Get suggestions for fixing a duplication. Works best in the CREATE SOMETHING monorepo - suggests where to move shared code and gives you a beads command.".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "file_a": {
                        "type": "string",
                        "description": "Path to first file"
                    },
                    "file_b": {
                        "type": "string",
                        "description": "Path to second file"
                    },
                    "similarity": {
                        "type": "number",
                        "description": "How similar the files are (0.0-1.0)"
                    }
                },
                "required": ["file_a", "file_b", "similarity"]
            }),
        },
        ToolDefinition {
            name: "ground_check_environment".to_string(),
            description: "Check for environment safety issues. Detects Workers-only APIs (caches, env.KV) reachable from Node.js entry points, or Node.js APIs in Workers code. Traces the import chain to show exactly how problematic APIs are reached.".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "entry_point": {
                        "type": "string",
                        "description": "Path to the entry point (CLI script, Worker index.ts, etc.)"
                    }
                },
                "required": ["entry_point"]
            }),
        },
    ]
}

/// MCP Tool definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolDefinition {
    pub name: String,
    pub description: String,
    pub input_schema: Value,
}

/// MCP Tool call result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolResult {
    pub success: bool,
    pub content: Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl ToolResult {
    pub fn success(content: Value) -> Self {
        Self {
            success: true,
            content,
            error: None,
        }
    }
    
    pub fn error(message: impl Into<String>) -> Self {
        Self {
            success: false,
            content: Value::Null,
            error: Some(message.into()),
        }
    }
}

/// Handle a tool call
pub fn handle_tool_call(
    g: &mut VerifiedTriad,
    tool_name: &str,
    args: &Value,
) -> ToolResult {
    match tool_name {
        "ground_compare" => handle_compare(g, args),
        "ground_count_uses" => handle_count_uses(g, args),
        "ground_check_connections" => handle_check_connections(g, args),
        "ground_find_duplicate_functions" => handle_find_duplicate_functions(args),
        "ground_claim_duplicate" => handle_claim_duplicate(g, args),
        "ground_claim_dead_code" => handle_claim_dead_code(g, args),
        "ground_claim_orphan" => handle_claim_orphan(g, args),
        "ground_status" => handle_status(g),
        "ground_suggest_fix" => handle_suggest_fix(args),
        "ground_check_environment" => handle_check_environment(args),
        _ => ToolResult::error(format!("Unknown tool: {}", tool_name)),
    }
}

fn handle_compare(g: &mut VerifiedTriad, args: &Value) -> ToolResult {
    let file_a = match args.get("file_a").and_then(|v| v.as_str()) {
        Some(s) => PathBuf::from(s),
        None => return ToolResult::error("Missing: file_a"),
    };
    let file_b = match args.get("file_b").and_then(|v| v.as_str()) {
        Some(s) => PathBuf::from(s),
        None => return ToolResult::error("Missing: file_b"),
    };
    
    match g.compute_similarity(&file_a, &file_b) {
        Ok(evidence) => {
            let threshold = g.thresholds().dry_similarity;
            let is_duplicate = evidence.similarity >= threshold;
            
            ToolResult::success(json!({
                "compared": true,
                "similarity": evidence.similarity,
                "similarity_percent": format!("{:.1}%", evidence.similarity * 100.0),
                "is_duplicate": is_duplicate,
                "threshold": threshold,
                "evidence_id": evidence.id.to_string(),
                "message": if is_duplicate {
                    format!("These look like duplicates ({:.1}% similar). You can now claim this with ground_claim_duplicate.", evidence.similarity * 100.0)
                } else {
                    format!("Not duplicates ({:.1}% similar, need {:.0}%).", evidence.similarity * 100.0, threshold * 100.0)
                }
            }))
        }
        Err(e) => ToolResult::error(format!("Comparison failed: {}", e)),
    }
}

fn handle_count_uses(g: &mut VerifiedTriad, args: &Value) -> ToolResult {
    let symbol = match args.get("symbol").and_then(|v| v.as_str()) {
        Some(s) => s,
        None => return ToolResult::error("Missing: symbol"),
    };
    let search_path = args.get("search_path")
        .and_then(|v| v.as_str())
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("."));
    
    match g.count_usages(symbol, &search_path) {
        Ok(evidence) => {
            // A symbol is truly dead if it has no actual usages (definitions don't count)
            let is_exported_unused = evidence.is_exported_but_unused();
            let is_dead = evidence.actual_usage_count == 0 && evidence.definition_count == 0;
            
            // Generate appropriate message
            let message = if is_dead {
                format!("'{}' isn't used anywhere. You can now claim this with ground_claim_dead_code.", symbol)
            } else if is_exported_unused {
                format!(
                    "'{}' is defined {} time(s) but never actually used. It may be exported but never imported elsewhere.",
                    symbol, evidence.definition_count
                )
            } else {
                format!(
                    "'{}' has {} actual use(s) (plus {} definition site(s)).",
                    symbol, evidence.actual_usage_count, evidence.definition_count
                )
            };
            
            ToolResult::success(json!({
                "counted": true,
                "symbol": symbol,
                "total_occurrences": evidence.usage_count,
                "definitions": evidence.definition_count,
                "actual_uses": evidence.actual_usage_count,
                "is_dead_code": is_dead,
                "is_exported_but_unused": is_exported_unused,
                "evidence_id": evidence.id.to_string(),
                "locations": evidence.locations.iter().take(10).map(|loc| {
                    json!({
                        "file": loc.file.to_string_lossy(),
                        "line": loc.line,
                        "is_definition": loc.is_definition,
                        "context": loc.context
                    })
                }).collect::<Vec<_>>(),
                "message": message
            }))
        }
        Err(e) => ToolResult::error(format!("Count failed: {}", e)),
    }
}

fn handle_check_connections(g: &mut VerifiedTriad, args: &Value) -> ToolResult {
    let module_path = match args.get("module_path").and_then(|v| v.as_str()) {
        Some(s) => PathBuf::from(s),
        None => return ToolResult::error("Missing: module_path"),
    };
    
    match g.analyze_connectivity(&module_path) {
        Ok(evidence) => {
            let total = evidence.total_connections();
            let is_orphan = total == 0;
            
            // Build architectural info if present
            let arch_info = evidence.architectural.as_ref().map(|arch| {
                json!({
                    "type": arch.architecture_type,
                    "routes": arch.routes,
                    "crons": arch.crons,
                    "bindings": arch.bindings.len(),
                    "connections": arch.total_connections
                })
            });
            
            ToolResult::success(json!({
                "checked": true,
                "module": module_path.to_string_lossy(),
                "connections": {
                    "incoming": evidence.incoming_connections,
                    "outgoing": evidence.outgoing_connections,
                    "total": total
                },
                "is_orphan": is_orphan,
                "architectural": arch_info,
                "evidence_id": evidence.id.to_string(),
                "message": if evidence.has_architectural_connections() {
                    format!("This is a Cloudflare Worker with {} architectural connections.", 
                        evidence.architectural.as_ref().map(|a| a.total_connections).unwrap_or(0))
                } else if is_orphan {
                    "Nothing connects to this. You can now claim this with ground_claim_orphan.".to_string()
                } else {
                    format!("{} things connect to this ({} incoming, {} outgoing).", total, evidence.incoming_connections, evidence.outgoing_connections)
                }
            }))
        }
        Err(e) => ToolResult::error(format!("Check failed: {}", e)),
    }
}

fn handle_find_duplicate_functions(args: &Value) -> ToolResult {
    let directory = match args.get("directory").and_then(|v| v.as_str()) {
        Some(s) => PathBuf::from(s),
        None => return ToolResult::error("Missing: directory"),
    };
    
    let threshold = args.get("threshold")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.8);
    
    let exclude_tests = args.get("exclude_tests")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    
    let min_lines = args.get("min_lines")
        .and_then(|v| v.as_u64())
        .map(|n| n as usize);
    
    // Build options
    let options = FunctionDryOptions {
        exclude_tests,
        min_function_lines: min_lines,
        ..Default::default()
    };
    
    // Collect files
    let mut files: Vec<PathBuf> = Vec::new();
    collect_ts_files(&directory, &mut files);
    
    if files.is_empty() {
        return ToolResult::success(json!({
            "found": true,
            "directory": directory.to_string_lossy(),
            "files_checked": 0,
            "functions_found": 0,
            "duplicates": [],
            "message": "No TypeScript/JavaScript files found"
        }));
    }
    
    if files.len() > 200 {
        files.truncate(200);
    }
    
    match analyze_function_dry_with_options(&files, threshold, &options) {
        Ok(report) => {
            let duplicates: Vec<Value> = report.duplicates.iter().map(|d| {
                json!({
                    "function": d.function_name,
                    "similarity": format!("{:.1}%", d.similarity * 100.0),
                    "file_a": d.file_a.to_string_lossy(),
                    "file_b": d.file_b.to_string_lossy(),
                    "lines_a": format!("{}-{}", d.function_a.start_line, d.function_a.end_line),
                    "lines_b": format!("{}-{}", d.function_b.start_line, d.function_b.end_line)
                })
            }).collect();
            
            let mut response = json!({
                "found": true,
                "directory": directory.to_string_lossy(),
                "files_checked": report.files.len(),
                "functions_found": report.total_functions,
                "duplicate_count": report.duplicates.len(),
                "duplicates": duplicates,
                "message": if report.duplicates.is_empty() {
                    "No duplicate functions found.".to_string()
                } else {
                    format!("Found {} duplicate functions. Consider extracting to a shared module.", report.duplicates.len())
                }
            });
            
            // Add skipped files info if any were excluded
            if !report.skipped_files.is_empty() {
                response["skipped_test_files"] = json!(report.skipped_files.len());
            }
            
            ToolResult::success(response)
        }
        Err(e) => ToolResult::error(format!("Analysis failed: {}", e)),
    }
}

fn handle_claim_duplicate(g: &VerifiedTriad, args: &Value) -> ToolResult {
    let file_a = match args.get("file_a").and_then(|v| v.as_str()) {
        Some(s) => PathBuf::from(s),
        None => return ToolResult::error("Missing: file_a"),
    };
    let file_b = match args.get("file_b").and_then(|v| v.as_str()) {
        Some(s) => PathBuf::from(s),
        None => return ToolResult::error("Missing: file_b"),
    };
    let reason = match args.get("reason").and_then(|v| v.as_str()) {
        Some(s) => s,
        None => return ToolResult::error("Missing: reason"),
    };
    
    match g.claim_dry_violation(&file_a, &file_b, reason) {
        Ok(claim) => ToolResult::success(json!({
            "claimed": true,
            "claim_id": claim.id.to_string(),
            "similarity": format!("{:.1}%", claim.similarity * 100.0),
            "evidence_id": claim.evidence_id.to_string(),
            "message": format!("Claim recorded: {:.1}% similar", claim.similarity * 100.0)
        })),
        Err(e) => {
            let suggestion = match &e {
                VerifiedTriadError::ClaimRejected(crate::ClaimRejected::NoEvidence { .. }) => {
                    "You need to compare these files first with ground_compare."
                }
                _ => "Make sure you've compared the files and they're similar enough.",
            };
            ToolResult::success(json!({
                "claimed": false,
                "blocked": true,
                "reason": e.to_string(),
                "suggestion": suggestion,
                "message": format!("Claim blocked: {}", e)
            }))
        }
    }
}

fn handle_claim_dead_code(g: &VerifiedTriad, args: &Value) -> ToolResult {
    let symbol = match args.get("symbol").and_then(|v| v.as_str()) {
        Some(s) => s,
        None => return ToolResult::error("Missing: symbol"),
    };
    let reason = match args.get("reason").and_then(|v| v.as_str()) {
        Some(s) => s,
        None => return ToolResult::error("Missing: reason"),
    };
    
    match g.claim_no_existence(symbol, reason) {
        Ok(claim) => ToolResult::success(json!({
            "claimed": true,
            "claim_id": claim.id.to_string(),
            "uses": claim.usage_count,
            "evidence_id": claim.evidence_id.to_string(),
            "message": format!("Claim recorded: '{}' has {} uses", symbol, claim.usage_count)
        })),
        Err(e) => {
            let suggestion = match &e {
                VerifiedTriadError::ClaimRejected(crate::ClaimRejected::NoEvidence { .. }) => {
                    "You need to count uses first with ground_count_uses."
                }
                _ => "Make sure you've counted uses and it's actually unused.",
            };
            ToolResult::success(json!({
                "claimed": false,
                "blocked": true,
                "reason": e.to_string(),
                "suggestion": suggestion,
                "message": format!("Claim blocked: {}", e)
            }))
        }
    }
}

fn handle_claim_orphan(g: &VerifiedTriad, args: &Value) -> ToolResult {
    let module_path = match args.get("module_path").and_then(|v| v.as_str()) {
        Some(s) => PathBuf::from(s),
        None => return ToolResult::error("Missing: module_path"),
    };
    let reason = match args.get("reason").and_then(|v| v.as_str()) {
        Some(s) => s,
        None => return ToolResult::error("Missing: reason"),
    };
    
    match g.claim_disconnection(&module_path, reason) {
        Ok(claim) => ToolResult::success(json!({
            "claimed": true,
            "claim_id": claim.id.to_string(),
            "connections": claim.connection_count,
            "evidence_id": claim.evidence_id.to_string(),
            "message": format!("Claim recorded: {} has {} connections", module_path.display(), claim.connection_count)
        })),
        Err(e) => {
            let suggestion = match &e {
                VerifiedTriadError::ClaimRejected(crate::ClaimRejected::NoEvidence { .. }) => {
                    "You need to check connections first with ground_check_connections."
                }
                _ => "Make sure you've checked connections and it's actually orphaned.",
            };
            ToolResult::success(json!({
                "claimed": false,
                "blocked": true,
                "reason": e.to_string(),
                "suggestion": suggestion,
                "message": format!("Claim blocked: {}", e)
            }))
        }
    }
}

fn handle_status(g: &VerifiedTriad) -> ToolResult {
    let thresholds = g.thresholds();
    ToolResult::success(json!({
        "thresholds": {
            "duplicate_similarity": format!("{:.0}%", thresholds.dry_similarity * 100.0),
            "min_uses": thresholds.rams_min_usage,
            "min_connections": thresholds.heidegger_min_connections
        },
        "how_it_works": [
            "1. Check something first (compare, count uses, check connections)",
            "2. Ground records the evidence",
            "3. Now you can make a claim about it",
            "4. If you haven't checked, your claim is blocked"
        ]
    }))
}

fn handle_suggest_fix(args: &Value) -> ToolResult {
    let file_a = match args.get("file_a").and_then(|v| v.as_str()) {
        Some(s) => PathBuf::from(s),
        None => return ToolResult::error("Missing: file_a"),
    };
    let file_b = match args.get("file_b").and_then(|v| v.as_str()) {
        Some(s) => PathBuf::from(s),
        None => return ToolResult::error("Missing: file_b"),
    };
    let similarity = args.get("similarity")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.8);
    
    let monorepo = detect_monorepo(&file_a)
        .or_else(|| detect_monorepo(&file_b));
    
    match monorepo {
        Some(info) => {
            if let Some(suggestion) = suggest_refactoring(&file_a, &file_b, similarity, &info) {
                ToolResult::success(json!({
                    "has_suggestion": true,
                    "action": suggestion.description,
                    "target_path": suggestion.target_path,
                    "import_statement": suggestion.import_statement,
                    "priority": suggestion.priority,
                    "beads_command": suggestion.beads_command,
                    "monorepo": true
                }))
            } else {
                let beads_cmd = generate_beads_command(&file_a, &file_b, similarity, None);
                ToolResult::success(json!({
                    "has_suggestion": false,
                    "beads_command": beads_cmd,
                    "message": "No specific pattern matched, but here's a beads command.",
                    "monorepo": true
                }))
            }
        }
        None => {
            ToolResult::success(json!({
                "has_suggestion": false,
                "monorepo": false,
                "message": "Not in CREATE SOMETHING monorepo. Run from the monorepo root for specific suggestions."
            }))
        }
    }
}

fn handle_check_environment(args: &Value) -> ToolResult {
    let entry_point = match args.get("entry_point").and_then(|v| v.as_str()) {
        Some(p) => PathBuf::from(p),
        None => return ToolResult::error("Missing required parameter: entry_point"),
    };
    
    match analyze_environment_safety(&entry_point) {
        Ok(evidence) => {
            let env_str = match &evidence.entry_environment {
                RuntimeEnvironment::Node => "node",
                RuntimeEnvironment::Workers => "workers",
                RuntimeEnvironment::Universal => "universal",
                RuntimeEnvironment::Unknown => "unknown",
            };
            
            // Build warnings list
            let warnings: Vec<_> = evidence.warnings.iter().map(|w| {
                let severity = match w.severity {
                    WarningSeverity::Error => "error",
                    WarningSeverity::Warning => "warning",
                    WarningSeverity::Info => "info",
                };
                
                // Format import chain as readable string
                let chain_str: Vec<_> = w.import_chain.iter()
                    .map(|p| p.file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("?")
                        .to_string())
                    .collect();
                
                json!({
                    "severity": severity,
                    "message": w.message,
                    "api": w.api,
                    "import_chain": chain_str,
                    "suggestion": w.suggestion
                })
            }).collect();
            
            // Build API usages list
            let api_usages: Vec<_> = evidence.api_usages.iter().map(|u| {
                let env = match u.api_usage.environment {
                    RuntimeEnvironment::Workers => "workers",
                    RuntimeEnvironment::Node => "node",
                    _ => "unknown",
                };
                
                json!({
                    "api": u.api_usage.api,
                    "description": u.api_usage.description,
                    "file": u.api_usage.file.display().to_string(),
                    "line": u.api_usage.line,
                    "environment": env
                })
            }).collect();
            
            let message = if evidence.is_safe {
                format!(
                    "Environment check passed. Entry point is {} with {} reachable modules.",
                    env_str,
                    evidence.reachable_modules.len()
                )
            } else {
                format!(
                    "Environment issues detected! {} warning(s) found. {} entry point reaches {} APIs.",
                    evidence.warnings.len(),
                    env_str,
                    evidence.api_usages.len()
                )
            };
            
            ToolResult::success(json!({
                "entry_point": evidence.entry_point.display().to_string(),
                "detected_environment": env_str,
                "reachable_modules": evidence.reachable_modules.len(),
                "api_usages_count": evidence.api_usages.len(),
                "api_usages": api_usages,
                "is_safe": evidence.is_safe,
                "warnings_count": evidence.warnings.len(),
                "warnings": warnings,
                "message": message,
                "evidence_id": evidence.id
            }))
        }
        Err(e) => ToolResult::error(format!("Environment check failed: {}", e)),
    }
}

fn collect_ts_files(dir: &PathBuf, files: &mut Vec<PathBuf>) {
    let entries = match std::fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };
    
    for entry in entries.filter_map(|e| e.ok()) {
        let path = entry.path();
        
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            if name.starts_with('.') || 
               matches!(name, "node_modules" | "target" | "dist" | "build" | ".svelte-kit") {
                continue;
            }
        }
        
        if path.is_dir() {
            collect_ts_files(&path, files);
        } else if path.is_file() {
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
            if matches!(ext, "ts" | "tsx" | "js" | "jsx") {
                files.push(path);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    
    #[test]
    fn test_tool_definitions() {
        let tools = list_tools();
        assert_eq!(tools.len(), 10);
        
        let names: Vec<_> = tools.iter().map(|t| t.name.as_str()).collect();
        assert!(names.contains(&"ground_compare"));
        assert!(names.contains(&"ground_count_uses"));
        assert!(names.contains(&"ground_check_connections"));
        assert!(names.contains(&"ground_find_duplicate_functions"));
        assert!(names.contains(&"ground_claim_duplicate"));
        assert!(names.contains(&"ground_claim_dead_code"));
        assert!(names.contains(&"ground_claim_orphan"));
        assert!(names.contains(&"ground_status"));
        assert!(names.contains(&"ground_suggest_fix"));
        assert!(names.contains(&"ground_check_environment"));
    }
    
    #[test]
    fn test_claim_blocked_without_check() {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("test.db");
        let mut g = VerifiedTriad::new(&db_path).unwrap();
        
        let result = handle_tool_call(&mut g, "ground_claim_duplicate", &json!({
            "file_a": "a.ts",
            "file_b": "b.ts",
            "reason": "looks similar"
        }));
        
        assert!(result.success);
        assert_eq!(result.content["claimed"], false);
        assert_eq!(result.content["blocked"], true);
    }
}
