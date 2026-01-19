//! MCP Server for Verified Triad
//!
//! Exposes computation and claim tools via the Model Context Protocol.
//!
//! ## Tools
//!
//! ### Computation Tools (required before claims)
//! - `vt_compute_similarity` - Compute similarity between two files
//! - `vt_compute_usages` - Count usages of a symbol
//! - `vt_compute_connectivity` - Analyze module connectivity
//!
//! ### Claim Tools (validated against registry)
//! - `vt_claim_dry` - Claim DRY violation (requires prior similarity computation)
//! - `vt_claim_existence` - Claim something doesn't earn existence
//! - `vt_claim_connectivity` - Claim a module is disconnected
//!
//! ### Status Tools
//! - `vt_status` - Show registry status and thresholds

use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::{VerifiedTriad, VerifiedTriadError};

/// MCP Tool definitions for Verified Triad
pub fn list_tools() -> Vec<ToolDefinition> {
    vec![
        // Computation tools
        ToolDefinition {
            name: "vt_compute_similarity".to_string(),
            description: "Compute similarity between two files (DRY level). MUST be called before claiming DRY violation.".to_string(),
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
            name: "vt_compute_usages".to_string(),
            description: "Count usages of a symbol (Rams level). MUST be called before claiming no-existence.".to_string(),
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
            name: "vt_compute_connectivity".to_string(),
            description: "Analyze module connectivity (Heidegger level). MUST be called before claiming disconnection.".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "module_path": {
                        "type": "string",
                        "description": "Path to the module to analyze"
                    }
                },
                "required": ["module_path"]
            }),
        },
        // Claim tools
        ToolDefinition {
            name: "vt_claim_dry".to_string(),
            description: "Claim a DRY violation. BLOCKED if vt_compute_similarity was not called first, or similarity is below threshold.".to_string(),
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
                        "description": "Human-readable reason for the claim"
                    }
                },
                "required": ["file_a", "file_b", "reason"]
            }),
        },
        ToolDefinition {
            name: "vt_claim_existence".to_string(),
            description: "Claim something doesn't earn existence. BLOCKED if vt_compute_usages was not called first, or symbol is actually used.".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "Symbol that doesn't earn existence"
                    },
                    "reason": {
                        "type": "string",
                        "description": "Human-readable reason for the claim"
                    }
                },
                "required": ["symbol", "reason"]
            }),
        },
        ToolDefinition {
            name: "vt_claim_connectivity".to_string(),
            description: "Claim a module is disconnected. BLOCKED if vt_compute_connectivity was not called first, or module is actually connected.".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "module_path": {
                        "type": "string",
                        "description": "Path to the disconnected module"
                    },
                    "reason": {
                        "type": "string",
                        "description": "Human-readable reason for the claim"
                    }
                },
                "required": ["module_path", "reason"]
            }),
        },
        // Status tool
        ToolDefinition {
            name: "vt_status".to_string(),
            description: "Show Verified Triad registry status and thresholds.".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {}
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
    vt: &mut VerifiedTriad,
    tool_name: &str,
    args: &Value,
) -> ToolResult {
    match tool_name {
        "vt_compute_similarity" => handle_compute_similarity(vt, args),
        "vt_compute_usages" => handle_compute_usages(vt, args),
        "vt_compute_connectivity" => handle_compute_connectivity(vt, args),
        "vt_claim_dry" => handle_claim_dry(vt, args),
        "vt_claim_existence" => handle_claim_existence(vt, args),
        "vt_claim_connectivity" => handle_claim_connectivity(vt, args),
        "vt_status" => handle_status(vt),
        _ => ToolResult::error(format!("Unknown tool: {}", tool_name)),
    }
}

fn handle_compute_similarity(vt: &mut VerifiedTriad, args: &Value) -> ToolResult {
    let file_a = match args.get("file_a").and_then(|v| v.as_str()) {
        Some(s) => PathBuf::from(s),
        None => return ToolResult::error("Missing required parameter: file_a"),
    };
    let file_b = match args.get("file_b").and_then(|v| v.as_str()) {
        Some(s) => PathBuf::from(s),
        None => return ToolResult::error("Missing required parameter: file_b"),
    };
    
    match vt.compute_similarity(&file_a, &file_b) {
        Ok(evidence) => {
            let threshold = vt.thresholds().dry_similarity;
            ToolResult::success(json!({
                "computed": true,
                "similarity": evidence.similarity,
                "similarity_percent": format!("{:.1}%", evidence.similarity * 100.0),
                "token_overlap": evidence.token_overlap,
                "line_similarity": evidence.line_similarity,
                "evidence_id": evidence.id.to_string(),
                "meets_threshold": evidence.similarity >= threshold,
                "threshold": threshold,
                "can_claim": evidence.similarity >= threshold,
                "message": if evidence.similarity >= threshold {
                    format!("✓ Similarity {:.1}% meets threshold. You can now call vt_claim_dry.", evidence.similarity * 100.0)
                } else {
                    format!("Similarity {:.1}% is below threshold ({:.0}%). Claim would be blocked.", evidence.similarity * 100.0, threshold * 100.0)
                }
            }))
        }
        Err(e) => ToolResult::error(format!("Computation failed: {}", e)),
    }
}

fn handle_compute_usages(vt: &mut VerifiedTriad, args: &Value) -> ToolResult {
    let symbol = match args.get("symbol").and_then(|v| v.as_str()) {
        Some(s) => s,
        None => return ToolResult::error("Missing required parameter: symbol"),
    };
    let search_path = args.get("search_path")
        .and_then(|v| v.as_str())
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("."));
    
    match vt.count_usages(symbol, &search_path) {
        Ok(evidence) => {
            let min_usage = vt.thresholds().rams_min_usage;
            let can_claim = evidence.usage_count < min_usage;
            ToolResult::success(json!({
                "computed": true,
                "symbol": symbol,
                "usage_count": evidence.usage_count,
                "evidence_id": evidence.id.to_string(),
                "locations": evidence.locations.iter().take(5).map(|loc| {
                    json!({
                        "file": loc.file.to_string_lossy(),
                        "line": loc.line,
                        "context": loc.context
                    })
                }).collect::<Vec<_>>(),
                "can_claim_no_existence": can_claim,
                "min_usage_threshold": min_usage,
                "message": if can_claim {
                    format!("✓ Symbol has {} usages (below minimum {}). You can now call vt_claim_existence.", evidence.usage_count, min_usage)
                } else {
                    format!("Symbol has {} usages (meets minimum {}). \"No existence\" claim would be blocked.", evidence.usage_count, min_usage)
                }
            }))
        }
        Err(e) => ToolResult::error(format!("Computation failed: {}", e)),
    }
}

fn handle_compute_connectivity(vt: &mut VerifiedTriad, args: &Value) -> ToolResult {
    let module_path = match args.get("module_path").and_then(|v| v.as_str()) {
        Some(s) => PathBuf::from(s),
        None => return ToolResult::error("Missing required parameter: module_path"),
    };
    
    match vt.analyze_connectivity(&module_path) {
        Ok(evidence) => {
            let min_connections = vt.thresholds().heidegger_min_connections;
            let total = evidence.total_connections();
            let can_claim = total < min_connections;
            ToolResult::success(json!({
                "computed": true,
                "module": module_path.to_string_lossy(),
                "is_connected": evidence.is_connected,
                "incoming_connections": evidence.incoming_connections,
                "outgoing_connections": evidence.outgoing_connections,
                "total_connections": total,
                "evidence_id": evidence.id.to_string(),
                "can_claim_disconnected": can_claim,
                "min_connections_threshold": min_connections,
                "message": if can_claim {
                    format!("✓ Module has {} connections (below minimum {}). You can now call vt_claim_connectivity.", total, min_connections)
                } else {
                    format!("Module has {} connections (meets minimum {}). \"Disconnected\" claim would be blocked.", total, min_connections)
                }
            }))
        }
        Err(e) => ToolResult::error(format!("Computation failed: {}", e)),
    }
}

fn handle_claim_dry(vt: &VerifiedTriad, args: &Value) -> ToolResult {
    let file_a = match args.get("file_a").and_then(|v| v.as_str()) {
        Some(s) => PathBuf::from(s),
        None => return ToolResult::error("Missing required parameter: file_a"),
    };
    let file_b = match args.get("file_b").and_then(|v| v.as_str()) {
        Some(s) => PathBuf::from(s),
        None => return ToolResult::error("Missing required parameter: file_b"),
    };
    let reason = match args.get("reason").and_then(|v| v.as_str()) {
        Some(s) => s,
        None => return ToolResult::error("Missing required parameter: reason"),
    };
    
    match vt.claim_dry_violation(&file_a, &file_b, reason) {
        Ok(claim) => ToolResult::success(json!({
            "claim_allowed": true,
            "claim_id": claim.id.to_string(),
            "similarity": claim.similarity,
            "evidence_id": claim.evidence_id.to_string(),
            "message": format!("✓ CLAIM ALLOWED: DRY violation confirmed at {:.1}% similarity", claim.similarity * 100.0)
        })),
        Err(e) => {
            let suggestion = match &e {
                VerifiedTriadError::ClaimRejected(crate::ClaimRejected::NoEvidence { suggestion, .. }) => {
                    suggestion.clone()
                }
                _ => "Run vt_compute_similarity first".to_string(),
            };
            ToolResult::success(json!({
                "claim_allowed": false,
                "blocked": true,
                "reason": e.to_string(),
                "suggestion": suggestion,
                "message": format!("✗ CLAIM BLOCKED: {}", e)
            }))
        }
    }
}

fn handle_claim_existence(vt: &VerifiedTriad, args: &Value) -> ToolResult {
    let symbol = match args.get("symbol").and_then(|v| v.as_str()) {
        Some(s) => s,
        None => return ToolResult::error("Missing required parameter: symbol"),
    };
    let reason = match args.get("reason").and_then(|v| v.as_str()) {
        Some(s) => s,
        None => return ToolResult::error("Missing required parameter: reason"),
    };
    
    match vt.claim_no_existence(symbol, reason) {
        Ok(claim) => ToolResult::success(json!({
            "claim_allowed": true,
            "claim_id": claim.id.to_string(),
            "usage_count": claim.usage_count,
            "evidence_id": claim.evidence_id.to_string(),
            "message": format!("✓ CLAIM ALLOWED: '{}' doesn't earn existence ({} usages)", symbol, claim.usage_count)
        })),
        Err(e) => {
            let suggestion = match &e {
                VerifiedTriadError::ClaimRejected(crate::ClaimRejected::NoEvidence { suggestion, .. }) => {
                    suggestion.clone()
                }
                _ => "Run vt_compute_usages first".to_string(),
            };
            ToolResult::success(json!({
                "claim_allowed": false,
                "blocked": true,
                "reason": e.to_string(),
                "suggestion": suggestion,
                "message": format!("✗ CLAIM BLOCKED: {}", e)
            }))
        }
    }
}

fn handle_claim_connectivity(vt: &VerifiedTriad, args: &Value) -> ToolResult {
    let module_path = match args.get("module_path").and_then(|v| v.as_str()) {
        Some(s) => PathBuf::from(s),
        None => return ToolResult::error("Missing required parameter: module_path"),
    };
    let reason = match args.get("reason").and_then(|v| v.as_str()) {
        Some(s) => s,
        None => return ToolResult::error("Missing required parameter: reason"),
    };
    
    match vt.claim_disconnection(&module_path, reason) {
        Ok(claim) => ToolResult::success(json!({
            "claim_allowed": true,
            "claim_id": claim.id.to_string(),
            "connection_count": claim.connection_count,
            "evidence_id": claim.evidence_id.to_string(),
            "message": format!("✓ CLAIM ALLOWED: Module is disconnected ({} connections)", claim.connection_count)
        })),
        Err(e) => {
            let suggestion = match &e {
                VerifiedTriadError::ClaimRejected(crate::ClaimRejected::NoEvidence { suggestion, .. }) => {
                    suggestion.clone()
                }
                _ => "Run vt_compute_connectivity first".to_string(),
            };
            ToolResult::success(json!({
                "claim_allowed": false,
                "blocked": true,
                "reason": e.to_string(),
                "suggestion": suggestion,
                "message": format!("✗ CLAIM BLOCKED: {}", e)
            }))
        }
    }
}

fn handle_status(vt: &VerifiedTriad) -> ToolResult {
    let thresholds = vt.thresholds();
    ToolResult::success(json!({
        "thresholds": {
            "dry_similarity": thresholds.dry_similarity,
            "dry_similarity_percent": format!("{:.0}%", thresholds.dry_similarity * 100.0),
            "rams_min_usage": thresholds.rams_min_usage,
            "heidegger_min_connections": thresholds.heidegger_min_connections
        },
        "philosophy": {
            "dry": "Have I built this before? (Similarity threshold)",
            "rams": "Does this earn existence? (Minimum usages)",
            "heidegger": "Does this serve the whole? (Minimum connections)"
        },
        "workflow": [
            "1. Call vt_compute_* to compute relationships",
            "2. Review computation results",
            "3. Call vt_claim_* to make grounded claims",
            "4. Claims are validated against the registry"
        ]
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    
    #[test]
    fn test_tool_definitions() {
        let tools = list_tools();
        assert_eq!(tools.len(), 7);
        
        let names: Vec<_> = tools.iter().map(|t| t.name.as_str()).collect();
        assert!(names.contains(&"vt_compute_similarity"));
        assert!(names.contains(&"vt_claim_dry"));
        assert!(names.contains(&"vt_status"));
    }
    
    #[test]
    fn test_claim_blocked_without_computation() {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("test.db");
        let mut vt = VerifiedTriad::new(&db_path).unwrap();
        
        let result = handle_tool_call(&mut vt, "vt_claim_dry", &json!({
            "file_a": "a.ts",
            "file_b": "b.ts",
            "reason": "looks similar"
        }));
        
        // Should return success:true (it's a valid response) but claim_allowed:false
        assert!(result.success);
        assert_eq!(result.content["claim_allowed"], false);
        assert_eq!(result.content["blocked"], true);
    }
}
