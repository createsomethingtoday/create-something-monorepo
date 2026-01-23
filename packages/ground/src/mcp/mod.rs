//! Ground MCP Server
//!
//! Exposes Ground tools via the Model Context Protocol.
//! 
//! ## AI-Native Workflow
//! 
//! The natural agent workflow is: `analyze → fix → verify_fix`
//! 
//! ## Tools (13 total)
//!
//! ### Primary Entry Points
//! - `ground_analyze` - Batch analysis (duplicates, dead exports, orphans, environment)
//! - `ground_diff` - Incremental analysis (only new issues since git baseline)
//! - `ground_verify_fix` - Confirm a fix worked without full re-analysis
//!
//! ### Targeted Analysis
//! - `ground_find_duplicate_functions` - Find function-level duplicates
//! - `ground_find_dead_exports` - Find unused exports (traces re-exports)
//! - `ground_find_orphans` - Batch scan for orphaned modules
//! - `ground_check_environment` - Detect Workers/Node.js API safety issues
//! - `ground_check_connections` - Check module connectivity
//! - `ground_count_uses` - Count symbol uses (distinguishes type-only)
//! - `ground_compare` - Compare two files for similarity
//! - `ground_suggest_fix` - Get refactoring suggestions
//!
//! ### Claims (Audit Trail)
//! - `ground_claim_dead_code` - Claim code is dead (blocked until verified)
//! - `ground_claim_orphan` - Claim module is orphaned (blocked until verified)

use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::{VerifiedTriad, VerifiedTriadError};
use crate::computations::{analyze_function_dry_with_options, FunctionDryOptions};
use crate::computations::environment::{analyze_environment_safety, WarningSeverity, RuntimeEnvironment};
use crate::computations::{BloomFilter, HyperLogLog};
use crate::computations::confidence::orphan_confidence;
use crate::computations::framework::{detect_framework, is_implicit_entry};
use crate::monorepo::{detect_monorepo, suggest_refactoring, generate_loom_command};
use crate::config::GroundConfig;

/// Log progress to stderr (visible in MCP server logs)
#[allow(unused_macros)]
macro_rules! mcp_log {
    ($($arg:tt)*) => {
        eprintln!("[ground {}] {}", chrono::Utc::now().format("%H:%M:%S%.3f"), format!($($arg)*));
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sketch Storage (for MCP session state)
// ─────────────────────────────────────────────────────────────────────────────

/// Sketch types supported by Ground MCP
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SketchType {
    HyperLogLog,
    Bloom,
}

/// A named sketch stored in memory
#[derive(Debug)]
pub enum Sketch {
    HyperLogLog(HyperLogLog),
    Bloom(BloomFilter),
}

lazy_static::lazy_static! {
    /// Global sketch storage for MCP sessions
    static ref SKETCHES: Mutex<HashMap<String, Sketch>> = Mutex::new(HashMap::new());
    
    /// Bloom filter cache for "have we compared these files?" optimization
    static ref COMPARISON_CACHE: Mutex<BloomFilter> = Mutex::new(BloomFilter::with_capacity(10000, 0.01));
    
    /// Bloom filter cache for "have we checked this symbol?" optimization  
    static ref SYMBOL_CACHE: Mutex<BloomFilter> = Mutex::new(BloomFilter::with_capacity(10000, 0.01));
    
    /// Cached symbol graph for repo-wide analysis
    static ref SYMBOL_GRAPH: Mutex<Option<crate::computations::SymbolGraph>> = Mutex::new(None);
}

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
            description: "Count how many times a symbol is used. You need to do this before you can claim it's dead code. Distinguishes between runtime usages and type-only usages (TypeScript generics, type annotations, etc.). Type-only usages count as valid usage for types/interfaces.".to_string(),
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
            description: "Find duplicate functions across files AND within files. Catches inter-file duplicates (same name, different files) and intra-file duplicates (different names, similar implementation in same file). Research shows same-file clones have ~18% higher bug propagation risk. Supports cross-package detection in monorepos. Loads .ground.yml for ignore patterns.".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "directory": {
                        "type": "string",
                        "description": "Directory to analyze (single directory)"
                    },
                    "directories": {
                        "type": "array",
                        "items": { "type": "string" },
                        "description": "Multiple directories to analyze for cross-package duplicates"
                    },
                    "cross_package": {
                        "type": "boolean",
                        "description": "Auto-detect packages in a monorepo (looks for packages/*/src). Default: false"
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
                    },
                    "config": {
                        "type": "string",
                        "description": "Path to .ground.yml config file. If not provided, looks in directory/.ground.yml"
                    },
                    "detect_intra_file": {
                        "type": "boolean",
                        "description": "Detect similar functions with different names WITHIN the same file. Catches duplicative logic that traditional same-name detection misses. Default: false"
                    },
                    "intra_file_threshold": {
                        "type": "number",
                        "description": "Similarity threshold for intra-file detection (0.0-1.0, default: 0.85). Higher than cross-file to reduce false positives since we're comparing different-named functions."
                    }
                },
                "required": []
            }),
        },
        // Claim tools (audit trail - blocked until verified)
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
        ToolDefinition {
            name: "ground_find_orphans".to_string(),
            description: "Find orphaned modules in a directory. Scans all TypeScript/JavaScript files and identifies those with no incoming connections (nothing imports them) and no architectural connections (not a Worker entry point, not a package.json bin entry).".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "directory": {
                        "type": "string",
                        "description": "Directory to scan for orphaned modules"
                    },
                    "include_tests": {
                        "type": "boolean",
                        "description": "Include test files in scan (default: false)"
                    }
                },
                "required": ["directory"]
            }),
        },
        ToolDefinition {
            name: "ground_find_dead_exports".to_string(),
            description: "Find exports in a module that are never imported elsewhere in the codebase. Helps identify unused API surface.".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "module_path": {
                        "type": "string",
                        "description": "Path to the module to scan for dead exports"
                    },
                    "search_scope": {
                        "type": "string",
                        "description": "Directory to search for imports (default: current directory). Use narrow scope for speed."
                    },
                    "force": {
                        "type": "boolean",
                        "description": "Allow scanning large directories (500+ files). Default: false. For repo-wide analysis, use ground_build_graph instead."
                    }
                },
                "required": ["module_path"]
            }),
        },
        // Graph-based analysis (fast for repo-wide scans)
        ToolDefinition {
            name: "ground_build_graph".to_string(),
            description: "Build a symbol graph of all imports/exports in a directory. Use this first for repo-wide dead export analysis - much faster than find_dead_exports with broad scope.".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "directory": {
                        "type": "string",
                        "description": "Root directory to build the graph from"
                    }
                },
                "required": ["directory"]
            }),
        },
        ToolDefinition {
            name: "ground_query_dead".to_string(),
            description: "Query the symbol graph for dead exports. Run ground_build_graph first. Automatically filters out framework conventions (SvelteKit load/GET/POST, hooks, etc.) unless raw=true.".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "file": {
                        "type": "string",
                        "description": "Optional: specific file to check. If omitted, checks all files in the graph."
                    },
                    "raw": {
                        "type": "boolean",
                        "description": "If true, return ALL dead exports including framework conventions. Default: false (filtered)."
                    }
                },
                "required": []
            }),
        },
        // AI-Native Tools
        ToolDefinition {
            name: "ground_analyze".to_string(),
            description: "Batch analysis: returns duplicates, dead exports, orphans, and environment issues in one call. Reduces agent round-trips. Each finding includes confidence scores and structured fix actions.".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "directory": {
                        "type": "string",
                        "description": "Directory to analyze"
                    },
                    "checks": {
                        "type": "array",
                        "items": {
                            "type": "string",
                            "enum": ["duplicates", "dead_exports", "orphans", "environment"]
                        },
                        "description": "Which checks to run. Default: all"
                    },
                    "entry_points": {
                        "type": "array",
                        "items": { "type": "string" },
                        "description": "Entry points for environment check (e.g., Worker index.ts files)"
                    },
                    "cross_package": {
                        "type": "boolean",
                        "description": "Scan across packages in monorepo. Default: false"
                    }
                },
                "required": ["directory"]
            }),
        },
        ToolDefinition {
            name: "ground_diff".to_string(),
            description: "Incremental analysis: only report NEW issues since a baseline. Compares against git base branch or saved baseline. Agents shouldn't re-process known issues.".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "directory": {
                        "type": "string",
                        "description": "Directory to analyze"
                    },
                    "base": {
                        "type": "string",
                        "description": "Git base ref to compare against (e.g., 'main', 'origin/main', 'HEAD~5'). Default: 'main'"
                    },
                    "checks": {
                        "type": "array",
                        "items": {
                            "type": "string",
                            "enum": ["duplicates", "orphans"]
                        },
                        "description": "Which checks to run. Default: ['duplicates']"
                    },
                    "cross_package": {
                        "type": "boolean",
                        "description": "Scan across packages in monorepo. Default: false"
                    }
                },
                "required": ["directory"]
            }),
        },
        ToolDefinition {
            name: "ground_verify_fix".to_string(),
            description: "Verify that a fix was applied correctly. Checks if the claimed issue no longer exists without re-running full analysis.".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "fix_type": {
                        "type": "string",
                        "enum": ["duplicate_removed", "dead_export_removed", "orphan_connected", "function_extracted"],
                        "description": "Type of fix to verify"
                    },
                    "details": {
                        "type": "object",
                        "description": "Fix-specific details",
                        "properties": {
                            "function_name": { "type": "string" },
                            "file_a": { "type": "string" },
                            "file_b": { "type": "string" },
                            "export_name": { "type": "string" },
                            "module_path": { "type": "string" },
                            "target_module": { "type": "string" }
                        }
                    }
                },
                "required": ["fix_type", "details"]
            }),
        },
        // Pattern Analysis Tools (v2.1)
        ToolDefinition {
            name: "ground_find_drift".to_string(),
            description: "Find design system drift (violations of Canon design tokens). Detects hardcoded colors, spacing, typography, and Svelte 4 patterns that should use design tokens.".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "directory": {
                        "type": "string",
                        "description": "Directory to analyze (default: current directory)"
                    },
                    "category": {
                        "type": "string",
                        "enum": ["all", "colors", "spacing", "typography", "svelte"],
                        "description": "Category to check (default: all)"
                    },
                    "below_threshold": {
                        "type": "number",
                        "description": "Only show files with adoption ratio below this percentage (0-100)"
                    }
                },
                "required": []
            }),
        },
        ToolDefinition {
            name: "ground_adoption_ratio".to_string(),
            description: "Calculate Canon design token adoption ratio. Shows overall health and per-category breakdown. Thresholds: 90%+ healthy, 70-89% warning, <70% critical.".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "directory": {
                        "type": "string",
                        "description": "Directory to analyze (default: current directory)"
                    },
                    "worst_count": {
                        "type": "number",
                        "description": "Number of worst-offending files to show (default: 10)"
                    }
                },
                "required": []
            }),
        },
        ToolDefinition {
            name: "ground_suggest_pattern".to_string(),
            description: "Suggest Canon design tokens to replace hardcoded values. Given a file with violations, suggests which tokens to use.".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "file": {
                        "type": "string",
                        "description": "Path to the file with violations"
                    }
                },
                "required": ["file"]
            }),
        },
        ToolDefinition {
            name: "ground_mine_patterns".to_string(),
            description: "Mine patterns to discover implicit design tokens. Analyzes CSS values across Svelte files to find repeated patterns that should become Canon tokens.".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "directory": {
                        "type": "string",
                        "description": "Directory to analyze (default: current directory)"
                    },
                    "min_occurrences": {
                        "type": "number",
                        "description": "Minimum occurrences to consider a pattern (default: 3)"
                    }
                },
                "required": []
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
        // Claims (audit trail)
        "ground_claim_dead_code" => handle_claim_dead_code(g, args),
        "ground_claim_orphan" => handle_claim_orphan(g, args),
        // Other tools
        "ground_suggest_fix" => handle_suggest_fix(args),
        "ground_check_environment" => handle_check_environment(args),
        "ground_find_orphans" => handle_find_orphans(args),
        "ground_find_dead_exports" => handle_find_dead_exports(args),
        // AI-Native tools
        "ground_analyze" => handle_batch_analyze(args),
        "ground_verify_fix" => handle_verify_fix(args),
        "ground_diff" => handle_diff(args),
        // Pattern Analysis tools (v2.1)
        "ground_find_drift" => handle_find_drift(args),
        "ground_adoption_ratio" => handle_adoption_ratio(args),
        "ground_suggest_pattern" => handle_suggest_pattern(args),
        "ground_mine_patterns" => handle_mine_patterns(args),
        // Graph-based analysis
        "ground_build_graph" => handle_build_graph(args),
        "ground_query_dead" => handle_query_dead(args),
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
    
    // Create cache key for this comparison pair (order-independent)
    let cache_key = {
        let a = file_a.to_string_lossy();
        let b = file_b.to_string_lossy();
        if a < b { format!("{}|{}", a, b) } else { format!("{}|{}", b, a) }
    };
    
    // Check Bloom filter cache for recent comparison
    let was_cached = {
        let cache = COMPARISON_CACHE.lock().unwrap();
        cache.contains_str(&cache_key)
    };
    
    match g.compute_similarity(&file_a, &file_b) {
        Ok(evidence) => {
            // Add to cache
            {
                let mut cache = COMPARISON_CACHE.lock().unwrap();
                cache.insert_str(&cache_key);
            }
            
            let threshold = g.thresholds().dry_similarity;
            let is_duplicate = evidence.similarity >= threshold;
            
            ToolResult::success(json!({
                "compared": true,
                "similarity": evidence.similarity,
                "similarity_percent": format!("{:.1}%", evidence.similarity * 100.0),
                "is_duplicate": is_duplicate,
                "threshold": threshold,
                "evidence_id": evidence.id.to_string(),
                "cached_hint": was_cached,
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
    
    // Check if we've counted this symbol before (hint only, doesn't skip work)
    let was_cached = {
        let cache = SYMBOL_CACHE.lock().unwrap();
        cache.contains_str(symbol)
    };
    
    mcp_log!("Counting uses of '{}' in {}", symbol, search_path.display());
    
    match g.count_usages(symbol, &search_path) {
        Ok(evidence) => {
            // Add to symbol cache
            {
                let mut cache = SYMBOL_CACHE.lock().unwrap();
                cache.insert_str(symbol);
            }
            
            // A symbol is truly dead if it has no actual usages AND no type-only usages
            // Type-only usages count as valid usage for types/interfaces
            let is_exported_unused = evidence.is_exported_but_unused();
            let is_type_only = evidence.is_type_only();
            let is_dead = evidence.actual_usage_count == 0 
                && evidence.type_only_count == 0 
                && evidence.definition_count == 0;
            
            // Generate appropriate message
            let message = if is_dead {
                format!("'{}' isn't used anywhere. You can now claim this with ground_claim_dead_code.", symbol)
            } else if is_type_only {
                format!(
                    "'{}' is used {} time(s) as a type only (no runtime usage). This is valid for types/interfaces.",
                    symbol, evidence.type_only_count
                )
            } else if is_exported_unused {
                format!(
                    "'{}' is defined {} time(s) but never actually used. It may be exported but never imported elsewhere.",
                    symbol, evidence.definition_count
                )
            } else {
                format!(
                    "'{}' has {} actual use(s), {} type-only use(s), and {} definition site(s).",
                    symbol, evidence.actual_usage_count, evidence.type_only_count, evidence.definition_count
                )
            };
            
            ToolResult::success(json!({
                "counted": true,
                "symbol": symbol,
                "total_occurrences": evidence.usage_count,
                "definitions": evidence.definition_count,
                "actual_uses": evidence.actual_usage_count,
                "type_only_uses": evidence.type_only_count,
                "is_dead_code": is_dead,
                "is_type_only": is_type_only,
                "is_exported_but_unused": is_exported_unused,
                "evidence_id": evidence.id.to_string(),
                "cached_hint": was_cached,
                "locations": evidence.locations.iter().take(10).map(|loc| {
                    json!({
                        "file": loc.file.to_string_lossy(),
                        "line": loc.line,
                        "is_definition": loc.is_definition,
                        "usage_type": format!("{:?}", loc.usage_type),
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
    let exclude_tests = args.get("exclude_tests")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    
    let cross_package = args.get("cross_package")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    
    // Load config from directory (or use config path if provided)
    let config_path = args.get("config")
        .and_then(|v| v.as_str())
        .map(PathBuf::from);
    
    let base_dir = args.get("directory")
        .and_then(|v| v.as_str())
        .map(PathBuf::from);
    
    // Load .ground.yml config - walk up directory tree to find it
    let config = if let Some(path) = config_path {
        GroundConfig::load(&path).unwrap_or_default()
    } else if let Some(ref dir) = base_dir {
        find_config_in_ancestors(dir).unwrap_or_default()
    } else {
        GroundConfig::load_default()
    };
    
    // Use config threshold as default, allow override from args
    let threshold = args.get("threshold")
        .and_then(|v| v.as_f64())
        .unwrap_or_else(|| config.similarity_threshold());
    
    // Use config min_lines as default, allow override from args
    let min_lines = args.get("min_lines")
        .and_then(|v| v.as_u64())
        .map(|n| n as usize)
        .or(Some(config.thresholds.min_function_lines));
    
    // Determine directories to scan
    let directories: Vec<PathBuf> = if cross_package {
        // Auto-detect packages in monorepo - require explicit directory for safety
        let base = match args.get("directory").and_then(|v| v.as_str()) {
            Some(dir) => resolve_path(dir),
            None => {
                return ToolResult::error(
                    "cross_package=true requires 'directory' to specify the monorepo root. \
                     Example: { \"cross_package\": true, \"directory\": \"/path/to/monorepo\" }"
                );
            }
        };
        
        let packages = discover_monorepo_packages(&base);
        if packages.len() == 1 && packages[0] == base {
            // No packages found - likely wrong directory
            return ToolResult::error(format!(
                "No packages found in {}. Expected packages/ or apps/ subdirectory. \
                 Make sure 'directory' points to the monorepo root.",
                base.display()
            ));
        }
        packages
    } else if let Some(dirs) = args.get("directories").and_then(|v| v.as_array()) {
        // Multiple directories provided - resolve relative paths
        dirs.iter()
            .filter_map(|v| v.as_str())
            .map(|p| resolve_path(p))
            .collect()
    } else if let Some(dir) = args.get("directory").and_then(|v| v.as_str()) {
        // Single directory - resolve relative path
        vec![resolve_path(dir)]
    } else {
        return ToolResult::error("Missing: directory, directories, or cross_package=true");
    };
    
    if directories.is_empty() {
        return ToolResult::error("No directories found to analyze");
    }
    
    // Safety limit on packages
    let max_packages = 50;
    if directories.len() > max_packages {
        return ToolResult::error(format!(
            "Too many packages to scan ({} found, max {}). Use 'directories' to specify a subset.",
            directories.len(), max_packages
        ));
    }
    
    // Parse intra-file detection options
    let detect_intra_file = args.get("detect_intra_file")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    
    let intra_file_threshold = args.get("intra_file_threshold")
        .and_then(|v| v.as_f64());
    
    // Build options
    let options = FunctionDryOptions {
        exclude_tests,
        min_function_lines: min_lines,
        detect_intra_file,
        intra_file_threshold,
        ..Default::default()
    };
    
    // Collect files from all directories, tracking which package each file is from
    // NOTE: We do NOT apply config.ignore.paths here - those are for orphan detection
    // (to avoid flagging route files as orphaned). For duplicate detection, we want
    // to find copies even in +server.ts files. We only apply function name ignores
    // and pair ignores during result filtering.
    let mut files: Vec<PathBuf> = Vec::new();
    let mut file_to_package: std::collections::HashMap<PathBuf, String> = std::collections::HashMap::new();
    let max_files = 500;
    
    'outer: for dir in &directories {
        let package_name = extract_package_name(dir);
        let mut dir_files: Vec<PathBuf> = Vec::new();
        collect_ts_files(dir, &mut dir_files);
        
        for file in dir_files {
            file_to_package.insert(file.clone(), package_name.clone());
            files.push(file);
            
            // Early exit if we hit the file limit
            if files.len() >= max_files {
                break 'outer;
            }
        }
    }
    
    let is_cross_package_scan = directories.len() > 1;
    
    if files.is_empty() {
        return ToolResult::success(json!({
            "found": true,
            "directories": directories.iter().map(|d| d.to_string_lossy()).collect::<Vec<_>>(),
            "packages_scanned": directories.len(),
            "files_checked": 0,
            "functions_found": 0,
            "duplicates": [],
            "cross_package_duplicates": [],
            "message": "No TypeScript/JavaScript files found"
        }));
    }
    
    mcp_log!("Analyzing {} files for duplicate functions (threshold={:.0}%)", files.len(), threshold * 100.0);
    
    match analyze_function_dry_with_options(&files, threshold, &options) {
        Ok(report) => {
            // Categorize duplicates: same-package vs cross-package
            // Apply config ignore patterns
            let mut same_package_dups: Vec<Value> = Vec::new();
            let mut cross_package_dups: Vec<Value> = Vec::new();
            let mut ignored_count = 0;
            
            for d in &report.duplicates {
                // Skip ignored functions from config
                if config.should_ignore_function(&d.function_name) {
                    ignored_count += 1;
                    continue;
                }
                
                // Skip ignored file pairs from config
                if config.should_ignore_pair(&d.file_a, &d.file_b) {
                    ignored_count += 1;
                    continue;
                }
                
                let pkg_a = file_to_package.get(&d.file_a)
                    .map(|s| s.as_str())
                    .unwrap_or("unknown");
                let pkg_b = file_to_package.get(&d.file_b)
                    .map(|s| s.as_str())
                    .unwrap_or("unknown");
                
                let dup_entry = json!({
                    "function": d.function_name,
                    "similarity": format!("{:.1}%", d.similarity * 100.0),
                    "file_a": d.file_a.to_string_lossy(),
                    "file_b": d.file_b.to_string_lossy(),
                    "package_a": pkg_a,
                    "package_b": pkg_b,
                    "lines_a": format!("{}-{}", d.function_a.start_line, d.function_a.end_line),
                    "lines_b": format!("{}-{}", d.function_b.start_line, d.function_b.end_line)
                });
                
                if pkg_a != pkg_b {
                    cross_package_dups.push(dup_entry);
                } else {
                    same_package_dups.push(dup_entry);
                }
            }
            
            // Process intra-file duplicates (same file, different names)
            let mut intra_file_dups: Vec<Value> = Vec::new();
            for d in &report.intra_file_duplicates {
                // Skip ignored functions from config
                if config.should_ignore_function(&d.function_a_name) || 
                   config.should_ignore_function(&d.function_b_name) {
                    ignored_count += 1;
                    continue;
                }
                
                let pkg = file_to_package.get(&d.file)
                    .map(|s| s.as_str())
                    .unwrap_or("unknown");
                
                intra_file_dups.push(json!({
                    "function_a": d.function_a_name,
                    "function_b": d.function_b_name,
                    "similarity": format!("{:.1}%", d.similarity * 100.0),
                    "file": d.file.to_string_lossy(),
                    "package": pkg,
                    "lines_a": format!("{}-{}", d.function_a.start_line, d.function_a.end_line),
                    "lines_b": format!("{}-{}", d.function_b.start_line, d.function_b.end_line),
                    "suggested_extraction": d.suggested_extraction
                }));
            }
            
            // Build message
            let inter_file_count = same_package_dups.len() + cross_package_dups.len();
            let intra_file_count = intra_file_dups.len();
            let total_dup_count = inter_file_count + intra_file_count;
            
            let message = if total_dup_count == 0 {
                "No duplicate functions found.".to_string()
            } else {
                let mut parts = Vec::new();
                
                if is_cross_package_scan && !cross_package_dups.is_empty() {
                    parts.push(format!(
                        "{} cross-package duplicate(s) (prime candidates for shared package)",
                        cross_package_dups.len()
                    ));
                }
                
                if !same_package_dups.is_empty() {
                    parts.push(format!("{} same-package duplicate(s)", same_package_dups.len()));
                }
                
                if !intra_file_dups.is_empty() {
                    parts.push(format!(
                        "{} intra-file duplicate(s) (same file, different names - higher bug risk)",
                        intra_file_dups.len()
                    ));
                }
                
                format!("Found {}. Consider consolidating.", parts.join(", "))
            };
            
            let mut response = json!({
                "found": true,
                "directories": directories.iter().map(|d| d.to_string_lossy()).collect::<Vec<_>>(),
                "packages_scanned": directories.len(),
                "files_checked": report.files.len(),
                "functions_found": report.total_functions,
                "duplicate_count": inter_file_count,
                "cross_package_count": cross_package_dups.len(),
                "same_package_count": same_package_dups.len(),
                "intra_file_count": intra_file_count,
                "duplicates": same_package_dups,
                "cross_package_duplicates": cross_package_dups,
                "intra_file_duplicates": intra_file_dups,
                "message": message
            });
            
            // Add config info if function patterns were applied
            // NOTE: We don't apply path ignores to duplicate detection - those are
            // for orphan detection. We still filter by function name and pair ignores.
            if ignored_count > 0 {
                response["ignored_by_config"] = json!(ignored_count);
                response["config_applied"] = json!(true);
            }
            
            // Add ignored function patterns from config for transparency
            if !config.ignore.functions.is_empty() {
                response["ignored_functions"] = json!(config.ignore.functions);
            }
            
            // Add skipped files info if any were excluded
            if !report.skipped_files.is_empty() {
                response["skipped_test_files"] = json!(report.skipped_files.len());
            }
            
            ToolResult::success(response)
        }
        Err(e) => ToolResult::error(format!("Analysis failed: {}", e)),
    }
}

/// Find .ground.yml by walking up the directory tree
/// This allows configs to be placed at the monorepo root and still apply to subdirectories
fn find_config_in_ancestors(start_dir: &Path) -> Option<GroundConfig> {
    let mut current = if start_dir.is_absolute() {
        start_dir.to_path_buf()
    } else {
        std::env::current_dir().ok()?.join(start_dir)
    };
    
    // Canonicalize to resolve any symlinks or relative components
    if let Ok(canonical) = current.canonicalize() {
        current = canonical;
    }
    
    // Walk up to 10 levels to avoid infinite loops
    for _ in 0..10 {
        // Check for .ground.yml in current directory
        for name in &[".ground.yml", ".ground.yaml", "ground.yml", "ground.yaml"] {
            let config_path = current.join(name);
            if config_path.exists() {
                if let Ok(config) = GroundConfig::load(&config_path) {
                    return Some(config);
                }
            }
        }
        
        // Move to parent directory
        match current.parent() {
            Some(parent) if parent != current => {
                current = parent.to_path_buf();
            }
            _ => break,
        }
    }
    
    None
}

/// Discover packages in a monorepo by looking for common patterns
fn discover_monorepo_packages(base: &Path) -> Vec<PathBuf> {
    let mut packages = Vec::new();
    
    // Check for packages/ directory (npm/pnpm workspaces)
    let packages_dir = base.join("packages");
    if packages_dir.is_dir() {
        if let Ok(entries) = std::fs::read_dir(&packages_dir) {
            for entry in entries.filter_map(|e| e.ok()) {
                let path = entry.path();
                if path.is_dir() {
                    // Look for src/ subdirectory
                    let src_dir = path.join("src");
                    if src_dir.is_dir() {
                        packages.push(src_dir);
                    } else {
                        // Also check for lib/ (common in some projects)
                        let lib_dir = path.join("lib");
                        if lib_dir.is_dir() {
                            packages.push(lib_dir);
                        }
                    }
                }
            }
        }
    }
    
    // Check for apps/ directory (turborepo, nx)
    let apps_dir = base.join("apps");
    if apps_dir.is_dir() {
        if let Ok(entries) = std::fs::read_dir(&apps_dir) {
            for entry in entries.filter_map(|e| e.ok()) {
                let path = entry.path();
                if path.is_dir() {
                    let src_dir = path.join("src");
                    if src_dir.is_dir() {
                        packages.push(src_dir);
                    }
                }
            }
        }
    }
    
    // If no packages found, fall back to base directory
    if packages.is_empty() {
        packages.push(base.to_path_buf());
    }
    
    packages
}

/// Extract a human-readable package name from a path
fn extract_package_name(path: &Path) -> String {
    // Try to find "packages/NAME" or "apps/NAME" pattern
    let path_str = path.to_string_lossy();
    
    // Look for packages/NAME/src pattern
    if let Some(idx) = path_str.find("packages/") {
        let after_packages = &path_str[idx + 9..];
        if let Some(end) = after_packages.find('/') {
            return after_packages[..end].to_string();
        }
    }
    
    // Look for apps/NAME/src pattern  
    if let Some(idx) = path_str.find("apps/") {
        let after_apps = &path_str[idx + 5..];
        if let Some(end) = after_apps.find('/') {
            return after_apps[..end].to_string();
        }
    }
    
    // Fall back to directory name
    path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string()
}

/// Kept for potential future use or separate MCP server
#[allow(dead_code)]
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

/// Kept for potential future use - status can be included in analyze response
#[allow(dead_code)]
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
                    "loom_command": suggestion.loom_command,
                    "monorepo": true
                }))
            } else {
                let loom_cmd = generate_loom_command(&file_a, &file_b, similarity, None);
                ToolResult::success(json!({
                    "has_suggestion": false,
                    "loom_command": loom_cmd,
                    "message": "No specific pattern matched, but here's a Loom command.",
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

fn handle_find_orphans(args: &Value) -> ToolResult {
    use crate::computations::analyze_connectivity;
    
    let directory = match args.get("directory").and_then(|v| v.as_str()) {
        Some(d) => PathBuf::from(d),
        None => return ToolResult::error("Missing required parameter: directory"),
    };
    
    let include_tests = args.get("include_tests")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    
    // Load config for path filtering
    let config = find_config_in_ancestors(&directory).unwrap_or_default();
    
    // Collect files
    let mut files = Vec::new();
    collect_ts_files(&directory, &mut files);
    let total_files_before_filter = files.len();
    
    // Filter using config path patterns first
    let files: Vec<_> = files.into_iter()
        .filter(|f| !config.should_ignore_path(f))
        .collect();
    let paths_ignored = total_files_before_filter - files.len();
    
    // Filter out test files if needed (in addition to config)
    let files: Vec<_> = if include_tests {
        files
    } else {
        files.into_iter()
            .filter(|f| {
                let name = f.file_name().and_then(|n| n.to_str()).unwrap_or("");
                !name.contains(".test.") && 
                !name.contains(".spec.") &&
                !f.to_string_lossy().contains("__tests__")
            })
            .collect()
    };
    
    // Filter out index files, type declarations, and SvelteKit route files
    let files: Vec<_> = files.into_iter()
        .filter(|f| {
            let name = f.file_name().and_then(|n| n.to_str()).unwrap_or("");
            !name.ends_with(".d.ts") &&
            name != "index.ts" &&
            name != "index.js" &&
            !name.starts_with("+")  // SvelteKit route files
        })
        .collect();
    
    let mut orphans = Vec::new();
    let mut connected = 0;
    let mut errors = 0;
    
    for file in &files {
        match analyze_connectivity(file) {
            Ok(evidence) => {
                if evidence.total_connections() == 0 && evidence.architectural.is_none() {
                    orphans.push(json!({
                        "path": file.display().to_string(),
                        "relative_path": file.strip_prefix(&directory)
                            .map(|p| p.display().to_string())
                            .unwrap_or_else(|_| file.display().to_string())
                    }));
                } else {
                    connected += 1;
                }
            }
            Err(_) => {
                errors += 1;
            }
        }
    }
    
    let message = if orphans.is_empty() {
        format!("No orphaned modules found. {} modules are connected.", connected)
    } else {
        format!("Found {} orphaned modules (nothing imports them).", orphans.len())
    };
    
    let mut response = json!({
        "directory": directory.display().to_string(),
        "files_scanned": files.len(),
        "orphan_count": orphans.len(),
        "orphans": orphans,
        "connected_count": connected,
        "error_count": errors,
        "message": message
    });
    
    // Add config filtering info if paths were ignored
    if paths_ignored > 0 {
        response["paths_ignored_by_config"] = json!(paths_ignored);
        response["config_applied"] = json!(true);
    }
    
    ToolResult::success(response)
}

fn handle_find_dead_exports(args: &Value) -> ToolResult {
    use crate::computations::find_dead_exports;
    
    let module_path = match args.get("module_path").and_then(|v| v.as_str()) {
        Some(p) => PathBuf::from(p),
        None => return ToolResult::error("Missing required parameter: module_path"),
    };
    
    let search_scope = args.get("search_scope")
        .and_then(|v| v.as_str())
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("."));
    
    // Allow bypassing safety check with force=true
    let force = args.get("force")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    
    // Safety check: prevent scanning overly broad directories (unless forced)
    let scope_str = search_scope.to_string_lossy();
    if !force && (scope_str == "." || scope_str.ends_with("/") && !scope_str.contains("/src")) {
        // Count files to warn about large scopes
        let file_count = count_scannable_files(&search_scope, 500);
        if file_count >= 500 {
            mcp_log!("Rejected: search_scope '{}' has {}+ files (too broad, use force=true to override)", scope_str, file_count);
            
            // Try to suggest a better scope based on module_path
            let suggested = suggest_search_scope(&module_path);
            return ToolResult::error(format!(
                "search_scope '{}' is too broad (500+ files). This would take too long.\n\n\
                 Options:\n\
                 1. Use a narrower scope: \"{}\"\n\
                 2. Pass force=true to scan anyway (may take minutes)\n\
                 3. Use ground_analyze for repo-wide disconnection analysis\n\n\
                 For finding ALL dead code across a repo, use:\n\
                 - ground_analyze with checks=[\"dead_exports\", \"orphans\"] on each package\n\
                 - ground_diff to find NEW issues since last commit",
                scope_str,
                suggested.unwrap_or_else(|| "packages/your-package/src".to_string())
            ));
        }
    }
    
    // Count files for progress estimation
    let file_count = count_scannable_files(&search_scope, 5000);
    if file_count > 100 {
        mcp_log!("Scanning {} ({} files) for dead exports - this may take a while...", 
                 search_scope.display(), file_count);
    } else {
        mcp_log!("Scanning {} for dead exports", search_scope.display());
    }
    
    match find_dead_exports(&module_path, &search_scope) {
        Ok(report) => {
            let dead_exports: Vec<_> = report.dead_exports.iter().map(|d| {
                json!({
                    "name": d.name,
                    "file": d.file.display().to_string(),
                    "line": d.line,
                    "context": d.context
                })
            }).collect();
            
            let message = if report.dead_exports.is_empty() {
                format!(
                    "All {} export(s) from {} are used somewhere in {}.",
                    report.total_exports,
                    module_path.display(),
                    search_scope.display()
                )
            } else {
                format!(
                    "Found {} unused export(s) out of {} total in {}.",
                    report.dead_exports.len(),
                    report.total_exports,
                    module_path.display()
                )
            };
            
            ToolResult::success(json!({
                "module_path": report.module_path.display().to_string(),
                "search_scope": report.search_scope.display().to_string(),
                "total_exports": report.total_exports,
                "dead_export_count": report.dead_exports.len(),
                "dead_exports": dead_exports,
                "all_used": report.dead_exports.is_empty(),
                "message": message
            }))
        }
        Err(e) => ToolResult::error(format!("Failed to find dead exports: {}", e)),
    }
}

/// Count scannable files in a directory, stopping early at max_count
fn count_scannable_files(dir: &PathBuf, max_count: usize) -> usize {
    let mut count = 0;
    count_files_recursive(dir, &mut count, max_count);
    count
}

fn count_files_recursive(dir: &PathBuf, count: &mut usize, max_count: usize) {
    if *count >= max_count {
        return;
    }
    
    let entries = match std::fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };
    
    for entry in entries.filter_map(|e| e.ok()) {
        if *count >= max_count {
            return;
        }
        
        let path = entry.path();
        
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            if name.starts_with('.') || 
               matches!(name, "node_modules" | "target" | "dist" | "build" | ".svelte-kit") {
                continue;
            }
        }
        
        if path.is_dir() {
            count_files_recursive(&path, count, max_count);
        } else if path.is_file() {
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
            if matches!(ext, "ts" | "tsx" | "js" | "jsx" | "svelte") {
                *count += 1;
            }
        }
    }
}

/// Suggest a better search scope based on the module path
fn suggest_search_scope(module_path: &PathBuf) -> Option<String> {
    let path_str = module_path.to_string_lossy();
    
    // Look for common package patterns
    if let Some(idx) = path_str.find("/packages/") {
        // Extract up to packages/name/src
        let rest = &path_str[idx + 10..]; // skip "/packages/"
        if let Some(slash) = rest.find('/') {
            let pkg_name = &rest[..slash];
            return Some(format!("packages/{}/src", pkg_name));
        }
    }
    
    if let Some(idx) = path_str.find("/apps/") {
        let rest = &path_str[idx + 6..]; // skip "/apps/"
        if let Some(slash) = rest.find('/') {
            let app_name = &rest[..slash];
            return Some(format!("apps/{}/src", app_name));
        }
    }
    
    // Fall back to src directory of the module
    if let Some(idx) = path_str.find("/src/") {
        return Some(path_str[..idx + 4].to_string()); // include "/src"
    }
    
    None
}

/// Resolve a path, handling relative paths by finding the workspace root.
/// The workspace root is detected by looking for .ground.yml, package.json, or .git
fn resolve_path(path: &str) -> PathBuf {
    let p = PathBuf::from(path);
    
    // If it's already absolute, just return it
    if p.is_absolute() {
        return p;
    }
    
    // For relative paths, try to find the workspace root
    // by looking for common project markers
    if let Some(workspace_root) = find_workspace_root() {
        let full_path = workspace_root.join(&p);
        // If this path exists, use it
        if full_path.exists() {
            return full_path.canonicalize().unwrap_or(full_path);
        }
    }
    
    // Fallback: try current directory
    match std::env::current_dir() {
        Ok(cwd) => {
            let full_path = cwd.join(&p);
            full_path.canonicalize().unwrap_or(full_path)
        }
        Err(_) => p,
    }
}

/// Find the workspace root by looking for common project markers.
/// Walks up from current directory looking for .ground.yml, package.json, or .git
fn find_workspace_root() -> Option<PathBuf> {
    let cwd = std::env::current_dir().ok()?;
    let mut current = cwd;
    
    // Walk up to 20 levels
    for _ in 0..20 {
        // Check for workspace markers (in order of specificity)
        for marker in &[".ground.yml", "package.json", ".git", "pnpm-workspace.yaml"] {
            let marker_path = current.join(marker);
            if marker_path.exists() {
                // For .git, check if it's a directory (not a file in worktrees)
                if *marker == ".git" && !marker_path.is_dir() {
                    continue;
                }
                return Some(current);
            }
        }
        
        // Move to parent
        match current.parent() {
            Some(parent) if parent != current => {
                current = parent.to_path_buf();
            }
            _ => break,
        }
    }
    
    None
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

// ─────────────────────────────────────────────────────────────────────────────
// Sketch Tool Handlers (kept for potential separate ground-sketch MCP server)
// ─────────────────────────────────────────────────────────────────────────────

#[allow(dead_code)]
fn handle_sketch_create(args: &Value) -> ToolResult {
    let name = match args.get("name").and_then(|v| v.as_str()) {
        Some(s) => s.to_string(),
        None => return ToolResult::error("Missing: name"),
    };
    
    let sketch_type = match args.get("type").and_then(|v| v.as_str()) {
        Some("hll") => SketchType::HyperLogLog,
        Some("bloom") => SketchType::Bloom,
        Some(t) => return ToolResult::error(format!("Invalid type: {}. Use 'hll' or 'bloom'.", t)),
        None => return ToolResult::error("Missing: type"),
    };
    
    let sketch = match sketch_type {
        SketchType::HyperLogLog => {
            let precision = args.get("capacity")
                .and_then(|v| v.as_u64())
                .map(|p| p.clamp(4, 18) as u8)
                .unwrap_or(14);
            Sketch::HyperLogLog(HyperLogLog::new(precision))
        }
        SketchType::Bloom => {
            let capacity = args.get("capacity")
                .and_then(|v| v.as_u64())
                .map(|c| c as usize)
                .unwrap_or(10000);
            let fp_rate = args.get("fp_rate")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.01);
            Sketch::Bloom(BloomFilter::with_capacity(capacity, fp_rate))
        }
    };
    
    let info = match &sketch {
        Sketch::HyperLogLog(hll) => json!({
            "type": "hll",
            "precision": hll.precision(),
            "error_rate": format!("{:.2}%", hll.error_rate() * 100.0),
            "memory_bytes": hll.memory_bytes()
        }),
        Sketch::Bloom(bloom) => json!({
            "type": "bloom",
            "num_bits": bloom.num_bits(),
            "num_hashes": bloom.num_hashes(),
            "memory_bytes": bloom.memory_bytes()
        }),
    };
    
    {
        let mut sketches = SKETCHES.lock().unwrap();
        sketches.insert(name.clone(), sketch);
    }
    
    ToolResult::success(json!({
        "created": true,
        "name": name,
        "info": info,
        "message": format!("Created sketch '{}'", name)
    }))
}

#[allow(dead_code)]
fn handle_sketch_add(args: &Value) -> ToolResult {
    let name = match args.get("name").and_then(|v| v.as_str()) {
        Some(s) => s,
        None => return ToolResult::error("Missing: name"),
    };
    
    let items: Vec<&str> = match args.get("items").and_then(|v| v.as_array()) {
        Some(arr) => arr.iter().filter_map(|v| v.as_str()).collect(),
        None => return ToolResult::error("Missing: items"),
    };
    
    if items.is_empty() {
        return ToolResult::error("Items array is empty");
    }
    
    let mut sketches = SKETCHES.lock().unwrap();
    
    match sketches.get_mut(name) {
        Some(Sketch::HyperLogLog(hll)) => {
            for item in &items {
                hll.add_str(item);
            }
            ToolResult::success(json!({
                "added": true,
                "name": name,
                "items_added": items.len(),
                "estimated_count": hll.count(),
                "message": format!("Added {} items. Estimated unique count: {}", items.len(), hll.count())
            }))
        }
        Some(Sketch::Bloom(bloom)) => {
            for item in &items {
                bloom.insert_str(item);
            }
            ToolResult::success(json!({
                "added": true,
                "name": name,
                "items_added": items.len(),
                "total_count": bloom.count(),
                "fill_ratio": format!("{:.2}%", bloom.fill_ratio() * 100.0),
                "message": format!("Added {} items. Total items: {}", items.len(), bloom.count())
            }))
        }
        None => ToolResult::error(format!("Sketch '{}' not found. Create it first with ground_sketch_create.", name)),
    }
}

#[allow(dead_code)]
fn handle_sketch_query(args: &Value) -> ToolResult {
    let name = match args.get("name").and_then(|v| v.as_str()) {
        Some(s) => s,
        None => return ToolResult::error("Missing: name"),
    };
    
    let items: Vec<&str> = args.get("items")
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().filter_map(|v| v.as_str()).collect())
        .unwrap_or_default();
    
    let sketches = SKETCHES.lock().unwrap();
    
    match sketches.get(name) {
        Some(Sketch::HyperLogLog(hll)) => {
            ToolResult::success(json!({
                "type": "hll",
                "name": name,
                "estimated_count": hll.count(),
                "error_rate": format!("{:.2}%", hll.error_rate() * 100.0),
                "precision": hll.precision(),
                "is_empty": hll.is_empty(),
                "message": format!("Estimated {} unique items (±{:.1}%)", hll.count(), hll.error_rate() * 100.0)
            }))
        }
        Some(Sketch::Bloom(bloom)) => {
            let membership: Vec<_> = items.iter().map(|item| {
                json!({
                    "item": item,
                    "possibly_in_set": bloom.contains_str(item)
                })
            }).collect();
            
            let all_present = membership.iter().all(|m| m["possibly_in_set"].as_bool().unwrap_or(false));
            let any_present = membership.iter().any(|m| m["possibly_in_set"].as_bool().unwrap_or(false));
            
            ToolResult::success(json!({
                "type": "bloom",
                "name": name,
                "total_items": bloom.count(),
                "fill_ratio": format!("{:.2}%", bloom.fill_ratio() * 100.0),
                "estimated_fp_rate": format!("{:.4}%", bloom.estimated_fp_rate() * 100.0),
                "membership": membership,
                "all_present": all_present,
                "any_present": any_present,
                "message": if items.is_empty() {
                    format!("Bloom filter has {} items", bloom.count())
                } else if all_present {
                    "All queried items are possibly in the set".to_string()
                } else if any_present {
                    "Some queried items are possibly in the set".to_string()
                } else {
                    "None of the queried items are in the set".to_string()
                }
            }))
        }
        None => ToolResult::error(format!("Sketch '{}' not found", name)),
    }
}

#[allow(dead_code)]
fn handle_sketch_merge(args: &Value) -> ToolResult {
    let sketch_a = match args.get("sketch_a").and_then(|v| v.as_str()) {
        Some(s) => s,
        None => return ToolResult::error("Missing: sketch_a"),
    };
    let sketch_b = match args.get("sketch_b").and_then(|v| v.as_str()) {
        Some(s) => s,
        None => return ToolResult::error("Missing: sketch_b"),
    };
    let output_name = match args.get("output_name").and_then(|v| v.as_str()) {
        Some(s) => s.to_string(),
        None => return ToolResult::error("Missing: output_name"),
    };
    
    let mut sketches = SKETCHES.lock().unwrap();
    
    // Get clones of both sketches
    let a = sketches.get(sketch_a).cloned();
    let b = sketches.get(sketch_b).cloned();
    
    match (a, b) {
        (Some(Sketch::HyperLogLog(mut hll_a)), Some(Sketch::HyperLogLog(hll_b))) => {
            match hll_a.merge(&hll_b) {
                Ok(()) => {
                    let count = hll_a.count();
                    sketches.insert(output_name.clone(), Sketch::HyperLogLog(hll_a));
                    ToolResult::success(json!({
                        "merged": true,
                        "output_name": output_name,
                        "type": "hll",
                        "estimated_count": count,
                        "message": format!("Merged HLL sketches. Estimated unique count: {}", count)
                    }))
                }
                Err(e) => ToolResult::error(format!("Merge failed: {}", e)),
            }
        }
        (Some(Sketch::Bloom(mut bloom_a)), Some(Sketch::Bloom(bloom_b))) => {
            match bloom_a.merge(&bloom_b) {
                Ok(()) => {
                    let count = bloom_a.count();
                    sketches.insert(output_name.clone(), Sketch::Bloom(bloom_a));
                    ToolResult::success(json!({
                        "merged": true,
                        "output_name": output_name,
                        "type": "bloom",
                        "total_items": count,
                        "message": format!("Merged Bloom filters. Total items: {}", count)
                    }))
                }
                Err(e) => ToolResult::error(format!("Merge failed: {}", e)),
            }
        }
        (Some(_), Some(_)) => {
            ToolResult::error("Cannot merge sketches of different types")
        }
        (None, _) => ToolResult::error(format!("Sketch '{}' not found", sketch_a)),
        (_, None) => ToolResult::error(format!("Sketch '{}' not found", sketch_b)),
    }
}

// Need Clone for merge operation
impl Clone for Sketch {
    fn clone(&self) -> Self {
        match self {
            Sketch::HyperLogLog(hll) => Sketch::HyperLogLog(hll.clone()),
            Sketch::Bloom(bloom) => Sketch::Bloom(bloom.clone()),
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// AI-Native Tool Handlers
// ─────────────────────────────────────────────────────────────────────────────

/// Structured fix action for agents to execute directly
#[derive(Debug, Clone, Serialize)]
struct StructuredFix {
    action: String,
    source_files: Vec<String>,
    target: Option<String>,
    function_name: Option<String>,
    imports_to_update: Vec<ImportUpdate>,
    confidence: f64,
    safe_to_auto_fix: bool,
    rationale: String,
}

#[derive(Debug, Clone, Serialize)]
struct ImportUpdate {
    file: String,
    old_import: String,
    new_import: String,
}

/// Calculate confidence score for a duplicate finding
fn calculate_duplicate_confidence(similarity: f64, lines_a: usize, lines_b: usize, same_package: bool) -> f64 {
    let mut confidence = similarity;
    
    // Higher confidence for larger functions
    let avg_lines = (lines_a + lines_b) as f64 / 2.0;
    if avg_lines > 20.0 {
        confidence += 0.05;
    }
    
    // Higher confidence for same-package duplicates (easier to fix)
    if same_package {
        confidence += 0.02;
    }
    
    // Cap at 0.99
    confidence.min(0.99)
}

/// Generate structured fix for a duplicate
fn generate_structured_fix(
    func_name: &str,
    file_a: &Path,
    file_b: &Path,
    similarity: f64,
    pkg_a: &str,
    pkg_b: &str,
) -> StructuredFix {
    let same_package = pkg_a == pkg_b;
    let confidence = calculate_duplicate_confidence(similarity, 20, 20, same_package);
    
    // Determine target module
    let target = if same_package {
        // Same package: extract to utils in that package
        format!("{}/src/lib/utils/{}.ts", pkg_a, func_name.to_lowercase())
    } else {
        // Cross-package: suggest shared package
        format!("packages/shared/src/{}.ts", func_name.to_lowercase())
    };
    
    // Generate import updates
    let imports = vec![
        ImportUpdate {
            file: file_a.to_string_lossy().to_string(),
            old_import: format!("./{}", func_name),
            new_import: if same_package {
                format!("$lib/utils/{}", func_name.to_lowercase())
            } else {
                format!("@create-something/shared/{}", func_name.to_lowercase())
            },
        },
        ImportUpdate {
            file: file_b.to_string_lossy().to_string(),
            old_import: format!("./{}", func_name),
            new_import: if same_package {
                format!("$lib/utils/{}", func_name.to_lowercase())
            } else {
                format!("@create-something/shared/{}", func_name.to_lowercase())
            },
        },
    ];
    
    StructuredFix {
        action: "consolidate".to_string(),
        source_files: vec![
            file_a.to_string_lossy().to_string(),
            file_b.to_string_lossy().to_string(),
        ],
        target: Some(target),
        function_name: Some(func_name.to_string()),
        imports_to_update: imports,
        confidence,
        safe_to_auto_fix: confidence > 0.9 && same_package,
        rationale: format!(
            "{:.1}% similar, {} duplicate. {}",
            similarity * 100.0,
            if same_package { "same-package" } else { "cross-package" },
            if confidence > 0.9 { "High confidence - safe to auto-fix." } else { "Review recommended." }
        ),
    }
}

fn handle_batch_analyze(args: &Value) -> ToolResult {
    let directory = match args.get("directory").and_then(|v| v.as_str()) {
        Some(d) => PathBuf::from(d),
        None => return ToolResult::error("Missing required parameter: directory"),
    };
    
    let checks: Vec<&str> = args.get("checks")
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().filter_map(|v| v.as_str()).collect())
        .unwrap_or_else(|| vec!["duplicates", "dead_exports", "orphans"]);
    
    mcp_log!("Batch analyze: {} checks={:?}", directory.display(), checks);
    
    let cross_package = args.get("cross_package")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    
    let entry_points: Vec<PathBuf> = args.get("entry_points")
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().filter_map(|v| v.as_str()).map(PathBuf::from).collect())
        .unwrap_or_default();
    
    // Load config
    let config = find_config_in_ancestors(&directory).unwrap_or_default();
    
    // Detect framework for smarter analysis
    let framework_detection = detect_framework(&directory);
    let framework_patterns = &framework_detection.patterns;
    
    let mut results = json!({
        "directory": directory.to_string_lossy(),
        "checks_run": checks,
        "framework": {
            "detected": framework_detection.primary.as_str(),
            "confidence": framework_detection.confidence,
            "evidence": framework_detection.evidence
        },
        "findings": {
            "duplicates": [],
            "dead_exports": [],
            "orphans": [],
            "environment_issues": []
        },
        "summary": {
            "total_issues": 0,
            "auto_fixable": 0,
            "needs_review": 0
        }
    });
    
    let mut total_issues = 0;
    let mut auto_fixable = 0;
    
    // Run duplicate check
    if checks.contains(&"duplicates") {
        let dup_args = json!({
            "directory": directory.to_string_lossy(),
            "cross_package": cross_package,
            "threshold": config.similarity_threshold()
        });
        
        if let ToolResult { success: true, content, .. } = handle_find_duplicate_functions(&dup_args) {
            // Convert duplicates to structured findings with fixes
            let mut structured_dups: Vec<Value> = Vec::new();
            
            if let Some(dups) = content.get("duplicates").and_then(|v| v.as_array()) {
                for dup in dups {
                    let func_name = dup.get("function").and_then(|v| v.as_str()).unwrap_or("");
                    let file_a = PathBuf::from(dup.get("file_a").and_then(|v| v.as_str()).unwrap_or(""));
                    let file_b = PathBuf::from(dup.get("file_b").and_then(|v| v.as_str()).unwrap_or(""));
                    let pkg_a = dup.get("package_a").and_then(|v| v.as_str()).unwrap_or("unknown");
                    let pkg_b = dup.get("package_b").and_then(|v| v.as_str()).unwrap_or("unknown");
                    let similarity: f64 = dup.get("similarity")
                        .and_then(|v| v.as_str())
                        .and_then(|s| s.trim_end_matches('%').parse().ok())
                        .map(|p: f64| p / 100.0)
                        .unwrap_or(0.8);
                    
                    let fix = generate_structured_fix(func_name, &file_a, &file_b, similarity, pkg_a, pkg_b);
                    
                    if fix.safe_to_auto_fix {
                        auto_fixable += 1;
                    }
                    total_issues += 1;
                    
                    structured_dups.push(json!({
                        "type": "duplicate_function",
                        "function": func_name,
                        "similarity": similarity,
                        "files": [file_a.to_string_lossy(), file_b.to_string_lossy()],
                        "packages": [pkg_a, pkg_b],
                        "confidence": fix.confidence,
                        "safe_to_auto_fix": fix.safe_to_auto_fix,
                        "fix": {
                            "action": fix.action,
                            "source_files": fix.source_files,
                            "target": fix.target,
                            "function_name": fix.function_name,
                            "imports_to_update": fix.imports_to_update,
                            "rationale": fix.rationale
                        }
                    }));
                }
            }
            
            // Also add cross-package duplicates
            if let Some(cross_dups) = content.get("cross_package_duplicates").and_then(|v| v.as_array()) {
                for dup in cross_dups {
                    let func_name = dup.get("function").and_then(|v| v.as_str()).unwrap_or("");
                    let file_a = PathBuf::from(dup.get("file_a").and_then(|v| v.as_str()).unwrap_or(""));
                    let file_b = PathBuf::from(dup.get("file_b").and_then(|v| v.as_str()).unwrap_or(""));
                    let pkg_a = dup.get("package_a").and_then(|v| v.as_str()).unwrap_or("unknown");
                    let pkg_b = dup.get("package_b").and_then(|v| v.as_str()).unwrap_or("unknown");
                    let similarity: f64 = dup.get("similarity")
                        .and_then(|v| v.as_str())
                        .and_then(|s| s.trim_end_matches('%').parse().ok())
                        .map(|p: f64| p / 100.0)
                        .unwrap_or(0.8);
                    
                    let fix = generate_structured_fix(func_name, &file_a, &file_b, similarity, pkg_a, pkg_b);
                    total_issues += 1;
                    // Cross-package fixes are usually not auto-fixable
                    
                    structured_dups.push(json!({
                        "type": "cross_package_duplicate",
                        "function": func_name,
                        "similarity": similarity,
                        "files": [file_a.to_string_lossy(), file_b.to_string_lossy()],
                        "packages": [pkg_a, pkg_b],
                        "confidence": fix.confidence,
                        "safe_to_auto_fix": false,
                        "fix": {
                            "action": fix.action,
                            "source_files": fix.source_files,
                            "target": fix.target,
                            "function_name": fix.function_name,
                            "imports_to_update": fix.imports_to_update,
                            "rationale": fix.rationale
                        }
                    }));
                }
            }
            
            results["findings"]["duplicates"] = json!(structured_dups);
        }
    }
    
    // Run orphan check
    if checks.contains(&"orphans") {
        let orphan_args = json!({
            "directory": directory.to_string_lossy(),
            "include_tests": false
        });
        
        if let ToolResult { success: true, content, .. } = handle_find_orphans(&orphan_args) {
            if let Some(orphans) = content.get("orphans").and_then(|v| v.as_array()) {
                let structured_orphans: Vec<Value> = orphans.iter().filter_map(|o| {
                    let path_str = o.get("path").and_then(|v| v.as_str()).unwrap_or("");
                    let path = Path::new(path_str);
                    
                    // Check if this is a framework implicit entry (e.g., +page.svelte)
                    let is_framework_entry = is_implicit_entry(path, framework_patterns);
                    
                    // Check if it looks like a test or config file
                    let filename = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
                    let is_test = filename.contains(".test.") || filename.contains(".spec.") || 
                                  path_str.contains("__tests__");
                    let is_config = filename.ends_with(".config.ts") || filename.ends_with(".config.js") ||
                                   matches!(filename, "tsconfig.json" | "vite.config.ts" | "vitest.config.ts");
                    
                    // Calculate confidence using Bayesian scoring
                    let confidence = orphan_confidence(
                        0,  // incoming_imports (we know it's 0 since it's flagged as orphan)
                        0,  // outgoing_imports (unknown, assume 0)
                        false,  // is_entry_point (would need package.json check)
                        is_test,
                        is_config,
                        false,  // has_architectural_connections (would need deeper check)
                        None,   // pagerank_percentile (not computed here)
                        is_framework_entry,
                    );
                    
                    // Skip low-confidence findings (likely false positives)
                    if confidence.score < 0.3 {
                        return None;
                    }
                    
                    total_issues += 1;
                    if confidence.safe_to_auto_fix {
                        auto_fixable += 1;
                    }
                    
                    Some(json!({
                        "type": "orphan_module",
                        "path": path_str,
                        "confidence": confidence.score,
                        "safe_to_auto_fix": confidence.safe_to_auto_fix,
                        "recommended_action": confidence.recommended_action.as_str(),
                        "factors": confidence.factors.iter().map(|f| json!({
                            "name": f.name,
                            "description": f.description,
                            "weight": f.weight
                        })).collect::<Vec<_>>(),
                        "fix": {
                            "action": "review_or_delete",
                            "module_path": path_str,
                            "rationale": confidence.explanation
                        }
                    }))
                }).collect();
                
                results["findings"]["orphans"] = json!(structured_orphans);
            }
        }
    }
    
    // Run environment check if entry points provided
    if checks.contains(&"environment") && !entry_points.is_empty() {
        let mut env_issues: Vec<Value> = Vec::new();
        
        for entry in &entry_points {
            let env_args = json!({
                "entry_point": entry.to_string_lossy()
            });
            
            if let ToolResult { success: true, content, .. } = handle_check_environment(&env_args) {
                if content.get("is_safe") == Some(&json!(false)) {
                    if let Some(warnings) = content.get("warnings").and_then(|v| v.as_array()) {
                        for warning in warnings {
                            total_issues += 1;
                            env_issues.push(json!({
                                "type": "environment_issue",
                                "entry_point": entry.to_string_lossy(),
                                "severity": warning.get("severity"),
                                "message": warning.get("message"),
                                "api": warning.get("api"),
                                "import_chain": warning.get("import_chain"),
                                "confidence": 0.95,
                                "safe_to_auto_fix": false,
                                "fix": {
                                    "action": "isolate_api",
                                    "suggestion": warning.get("suggestion"),
                                    "rationale": "Environment-specific API detected in wrong context"
                                }
                            }));
                        }
                    }
                }
            }
        }
        
        results["findings"]["environment_issues"] = json!(env_issues);
    }
    
    // Update summary
    results["summary"]["total_issues"] = json!(total_issues);
    results["summary"]["auto_fixable"] = json!(auto_fixable);
    results["summary"]["needs_review"] = json!(total_issues - auto_fixable);
    
    let message = if total_issues == 0 {
        "No issues found. Codebase is clean.".to_string()
    } else {
        format!(
            "Found {} issue(s): {} auto-fixable, {} need review.",
            total_issues, auto_fixable, total_issues - auto_fixable
        )
    };
    
    results["message"] = json!(message);
    
    ToolResult::success(results)
}

fn handle_verify_fix(args: &Value) -> ToolResult {
    use crate::computations::analyze_connectivity;
    
    let fix_type = match args.get("fix_type").and_then(|v| v.as_str()) {
        Some(t) => t,
        None => return ToolResult::error("Missing required parameter: fix_type"),
    };
    
    let details = match args.get("details") {
        Some(d) => d,
        None => return ToolResult::error("Missing required parameter: details"),
    };
    
    match fix_type {
        "duplicate_removed" => {
            // Verify that the duplicate function no longer exists in source files
            let func_name = details.get("function_name").and_then(|v| v.as_str());
            let file_a = details.get("file_a").and_then(|v| v.as_str()).map(PathBuf::from);
            let file_b = details.get("file_b").and_then(|v| v.as_str()).map(PathBuf::from);
            
            let (func, fa, fb) = match (func_name, file_a, file_b) {
                (Some(f), Some(a), Some(b)) => (f, a, b),
                _ => return ToolResult::error("Missing function_name, file_a, or file_b"),
            };
            
            // Check if function still exists in both files
            let in_a = check_function_exists(&fa, func);
            let in_b = check_function_exists(&fb, func);
            
            let verified = !in_a || !in_b; // At least one file no longer has it
            
            ToolResult::success(json!({
                "verified": verified,
                "fix_type": fix_type,
                "function_name": func,
                "file_a_has_function": in_a,
                "file_b_has_function": in_b,
                "message": if verified {
                    format!("Verified: '{}' is no longer duplicated", func)
                } else {
                    format!("Not verified: '{}' still exists in both files", func)
                }
            }))
        }
        "dead_export_removed" => {
            let export_name = match details.get("export_name").and_then(|v| v.as_str()) {
                Some(e) => e,
                None => return ToolResult::error("Missing export_name"),
            };
            let module_path = match details.get("module_path").and_then(|v| v.as_str()) {
                Some(p) => PathBuf::from(p),
                None => return ToolResult::error("Missing module_path"),
            };
            
            // Check if export still exists
            let still_exists = check_export_exists(&module_path, export_name);
            
            ToolResult::success(json!({
                "verified": !still_exists,
                "fix_type": fix_type,
                "export_name": export_name,
                "module_path": module_path.to_string_lossy(),
                "export_still_exists": still_exists,
                "message": if !still_exists {
                    format!("Verified: '{}' export has been removed", export_name)
                } else {
                    format!("Not verified: '{}' export still exists", export_name)
                }
            }))
        }
        "orphan_connected" => {
            let module_path = match details.get("module_path").and_then(|v| v.as_str()) {
                Some(p) => PathBuf::from(p),
                None => return ToolResult::error("Missing module_path"),
            };
            
            // Check if module now has connections
            match analyze_connectivity(&module_path) {
                Ok(evidence) => {
                    let has_connections = evidence.total_connections() > 0 
                        || evidence.has_architectural_connections();
                    
                    ToolResult::success(json!({
                        "verified": has_connections,
                        "fix_type": fix_type,
                        "module_path": module_path.to_string_lossy(),
                        "connections": evidence.total_connections(),
                        "message": if has_connections {
                            format!("Verified: module now has {} connection(s)", evidence.total_connections())
                        } else {
                            "Not verified: module is still orphaned".to_string()
                        }
                    }))
                }
                Err(e) => ToolResult::error(format!("Failed to check connections: {}", e)),
            }
        }
        "function_extracted" => {
            let func_name = details.get("function_name").and_then(|v| v.as_str());
            let target = details.get("target_module").and_then(|v| v.as_str()).map(PathBuf::from);
            
            let (func, target_path) = match (func_name, target) {
                (Some(f), Some(t)) => (f, t),
                _ => return ToolResult::error("Missing function_name or target_module"),
            };
            
            // Check if function exists in target
            let in_target = check_function_exists(&target_path, func);
            
            ToolResult::success(json!({
                "verified": in_target,
                "fix_type": fix_type,
                "function_name": func,
                "target_module": target_path.to_string_lossy(),
                "function_in_target": in_target,
                "message": if in_target {
                    format!("Verified: '{}' has been extracted to {}", func, target_path.display())
                } else {
                    format!("Not verified: '{}' not found in target module", func)
                }
            }))
        }
        _ => ToolResult::error(format!("Unknown fix_type: {}", fix_type)),
    }
}

/// Check if a function exists in a file (simple text search)
fn check_function_exists(path: &Path, func_name: &str) -> bool {
    if !path.exists() {
        return false;
    }
    
    if let Ok(content) = std::fs::read_to_string(path) {
        // Look for function declaration patterns
        let patterns = [
            format!("function {}", func_name),
            format!("const {} =", func_name),
            format!("let {} =", func_name),
            format!("export function {}", func_name),
            format!("export const {} =", func_name),
            format!("async function {}", func_name),
            format!("export async function {}", func_name),
        ];
        
        patterns.iter().any(|p| content.contains(p))
    } else {
        false
    }
}

/// Check if an export exists in a file
fn check_export_exists(path: &Path, export_name: &str) -> bool {
    if !path.exists() {
        return false;
    }
    
    if let Ok(content) = std::fs::read_to_string(path) {
        let patterns = [
            format!("export {{ {}", export_name),
            format!("export {{{}", export_name),
            format!("export const {}", export_name),
            format!("export function {}", export_name),
            format!("export type {}", export_name),
            format!("export interface {}", export_name),
            format!("export default {}", export_name),
        ];
        
        patterns.iter().any(|p| content.contains(p))
    } else {
        false
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Incremental/Diff Mode
// ─────────────────────────────────────────────────────────────────────────────

fn handle_diff(args: &Value) -> ToolResult {
    let directory = match args.get("directory").and_then(|v| v.as_str()) {
        Some(d) => PathBuf::from(d),
        None => return ToolResult::error("Missing required parameter: directory"),
    };
    
    let base_ref = args.get("base")
        .and_then(|v| v.as_str())
        .unwrap_or("main");
    
    let checks: Vec<&str> = args.get("checks")
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().filter_map(|v| v.as_str()).collect())
        .unwrap_or_else(|| vec!["duplicates"]);
    
    let cross_package = args.get("cross_package")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    
    // Get changed files since base using git
    let changed_files = match get_changed_files_since(&directory, base_ref) {
        Ok(files) => files,
        Err(e) => {
            return ToolResult::error(format!(
                "Failed to get changed files from git: {}. Make sure '{}' is a valid git ref.",
                e, base_ref
            ));
        }
    };
    
    if changed_files.is_empty() {
        return ToolResult::success(json!({
            "base": base_ref,
            "changed_files": 0,
            "new_issues": [],
            "total_new_issues": 0,
            "message": format!("No files changed since '{}'. Nothing to analyze.", base_ref)
        }));
    }
    
    // Load config
    let config = find_config_in_ancestors(&directory).unwrap_or_default();
    
    // Filter changed files by config ignore patterns and file type
    let relevant_files: Vec<PathBuf> = changed_files.iter()
        .filter(|f| {
            // Only TypeScript/JavaScript files
            let ext = f.extension().and_then(|e| e.to_str()).unwrap_or("");
            if !matches!(ext, "ts" | "tsx" | "js" | "jsx") {
                return false;
            }
            // Apply config path filters
            !config.should_ignore_path(f)
        })
        .cloned()
        .collect();
    
    let mut new_issues: Vec<Value> = Vec::new();
    
    // Run duplicate check on changed files
    if checks.contains(&"duplicates") {
        let dup_args = json!({
            "directory": directory.to_string_lossy(),
            "cross_package": cross_package,
            "threshold": config.similarity_threshold()
        });
        
        if let ToolResult { success: true, content, .. } = handle_find_duplicate_functions(&dup_args) {
            // Filter duplicates to only those involving changed files
            if let Some(dups) = content.get("duplicates").and_then(|v| v.as_array()) {
                for dup in dups {
                    let file_a = dup.get("file_a").and_then(|v| v.as_str()).unwrap_or("");
                    let file_b = dup.get("file_b").and_then(|v| v.as_str()).unwrap_or("");
                    
                    // Include if either file is in the changed set
                    let involves_changed = relevant_files.iter().any(|f| {
                        let f_str = f.to_string_lossy();
                        file_a.ends_with(&*f_str) || file_b.ends_with(&*f_str) ||
                        f_str.ends_with(file_a) || f_str.ends_with(file_b)
                    });
                    
                    if involves_changed {
                        new_issues.push(json!({
                            "type": "duplicate_function",
                            "function": dup.get("function"),
                            "similarity": dup.get("similarity"),
                            "files": [file_a, file_b],
                            "introduced_by": "current_branch"
                        }));
                    }
                }
            }
            
            // Also check cross-package duplicates
            if let Some(cross_dups) = content.get("cross_package_duplicates").and_then(|v| v.as_array()) {
                for dup in cross_dups {
                    let file_a = dup.get("file_a").and_then(|v| v.as_str()).unwrap_or("");
                    let file_b = dup.get("file_b").and_then(|v| v.as_str()).unwrap_or("");
                    
                    let involves_changed = relevant_files.iter().any(|f| {
                        let f_str = f.to_string_lossy();
                        file_a.ends_with(&*f_str) || file_b.ends_with(&*f_str) ||
                        f_str.ends_with(file_a) || f_str.ends_with(file_b)
                    });
                    
                    if involves_changed {
                        new_issues.push(json!({
                            "type": "cross_package_duplicate",
                            "function": dup.get("function"),
                            "similarity": dup.get("similarity"),
                            "files": [file_a, file_b],
                            "packages": [dup.get("package_a"), dup.get("package_b")],
                            "introduced_by": "current_branch"
                        }));
                    }
                }
            }
        }
    }
    
    // Run orphan check on changed files
    if checks.contains(&"orphans") {
        // For orphans, we check if any of the NEW files are orphaned
        for file in &relevant_files {
            // Skip if file was deleted (doesn't exist)
            if !file.exists() {
                continue;
            }
            
            // Check if this is a new file (not in base)
            let is_new_file = is_file_new_since(&directory, file, base_ref);
            
            if is_new_file {
                // Check connections for this specific file
                use crate::computations::analyze_connectivity;
                if let Ok(evidence) = analyze_connectivity(file) {
                    if evidence.total_connections() == 0 && evidence.architectural.is_none() {
                        new_issues.push(json!({
                            "type": "orphan_module",
                            "path": file.to_string_lossy(),
                            "introduced_by": "current_branch",
                            "is_new_file": true
                        }));
                    }
                }
            }
        }
    }
    
    let message = if new_issues.is_empty() {
        format!(
            "No new issues introduced since '{}'. {} files changed, all clean.",
            base_ref, relevant_files.len()
        )
    } else {
        format!(
            "Found {} new issue(s) in {} changed files since '{}'.",
            new_issues.len(), relevant_files.len(), base_ref
        )
    };
    
    ToolResult::success(json!({
        "base": base_ref,
        "changed_files": relevant_files.len(),
        "changed_file_list": relevant_files.iter()
            .map(|f| f.to_string_lossy().to_string())
            .collect::<Vec<_>>(),
        "new_issues": new_issues,
        "total_new_issues": new_issues.len(),
        "checks_run": checks,
        "message": message
    }))
}

/// Get list of files changed since a git ref
fn get_changed_files_since(repo_dir: &Path, base_ref: &str) -> Result<Vec<PathBuf>, String> {
    use std::process::Command;
    
    // Get the merge base between current HEAD and the base ref
    let merge_base_output = Command::new("git")
        .args(["merge-base", base_ref, "HEAD"])
        .current_dir(repo_dir)
        .output()
        .map_err(|e| format!("Failed to run git merge-base: {}", e))?;
    
    let merge_base = if merge_base_output.status.success() {
        String::from_utf8_lossy(&merge_base_output.stdout).trim().to_string()
    } else {
        // If merge-base fails, just use the base ref directly
        base_ref.to_string()
    };
    
    // Get diff against merge base
    let output = Command::new("git")
        .args(["diff", "--name-only", &merge_base])
        .current_dir(repo_dir)
        .output()
        .map_err(|e| format!("Failed to run git diff: {}", e))?;
    
    if !output.status.success() {
        return Err(format!(
            "git diff failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }
    
    let files: Vec<PathBuf> = String::from_utf8_lossy(&output.stdout)
        .lines()
        .filter(|line| !line.is_empty())
        .map(|line| repo_dir.join(line))
        .collect();
    
    // Also get untracked files (new files not yet committed)
    let untracked_output = Command::new("git")
        .args(["ls-files", "--others", "--exclude-standard"])
        .current_dir(repo_dir)
        .output()
        .map_err(|e| format!("Failed to run git ls-files: {}", e))?;
    
    let mut all_files = files;
    if untracked_output.status.success() {
        let untracked: Vec<PathBuf> = String::from_utf8_lossy(&untracked_output.stdout)
            .lines()
            .filter(|line| !line.is_empty())
            .map(|line| repo_dir.join(line))
            .collect();
        all_files.extend(untracked);
    }
    
    Ok(all_files)
}

/// Check if a file is new (didn't exist in base ref)
fn is_file_new_since(repo_dir: &Path, file: &Path, base_ref: &str) -> bool {
    use std::process::Command;
    
    // Get relative path
    let relative = file.strip_prefix(repo_dir).unwrap_or(file);
    
    // Try to show the file at the base ref
    let output = Command::new("git")
        .args(["show", &format!("{}:{}", base_ref, relative.display())])
        .current_dir(repo_dir)
        .output();
    
    match output {
        Ok(o) => !o.status.success(), // File is new if git show fails
        Err(_) => true, // Assume new if we can't check
    }
}

#[allow(dead_code)]
fn handle_sketch_list() -> ToolResult {
    let sketches = SKETCHES.lock().unwrap();
    
    let list: Vec<_> = sketches.iter().map(|(name, sketch)| {
        match sketch {
            Sketch::HyperLogLog(hll) => json!({
                "name": name,
                "type": "hll",
                "estimated_count": hll.count(),
                "precision": hll.precision(),
                "error_rate": format!("{:.2}%", hll.error_rate() * 100.0),
                "memory_bytes": hll.memory_bytes()
            }),
            Sketch::Bloom(bloom) => json!({
                "name": name,
                "type": "bloom",
                "item_count": bloom.count(),
                "fill_ratio": format!("{:.2}%", bloom.fill_ratio() * 100.0),
                "estimated_fp_rate": format!("{:.4}%", bloom.estimated_fp_rate() * 100.0),
                "memory_bytes": bloom.memory_bytes()
            }),
        }
    }).collect();
    
    // Also report cache stats
    let comparison_cache = COMPARISON_CACHE.lock().unwrap();
    let symbol_cache = SYMBOL_CACHE.lock().unwrap();
    
    ToolResult::success(json!({
        "sketches": list,
        "count": list.len(),
        "internal_caches": {
            "comparison_cache": {
                "items": comparison_cache.count(),
                "fill_ratio": format!("{:.2}%", comparison_cache.fill_ratio() * 100.0)
            },
            "symbol_cache": {
                "items": symbol_cache.count(),
                "fill_ratio": format!("{:.2}%", symbol_cache.fill_ratio() * 100.0)
            }
        },
        "message": if list.is_empty() {
            "No sketches created yet. Use ground_sketch_create to create one.".to_string()
        } else {
            format!("{} sketch(es) in session", list.len())
        }
    }))
}

// ─────────────────────────────────────────────────────────────────────────────
// Pattern Analysis Handlers (v2.1)
// ─────────────────────────────────────────────────────────────────────────────

fn handle_find_drift(args: &Value) -> ToolResult {
    use crate::computations::patterns::{analyze_patterns, PatternConfig, HealthStatus};
    
    let directory = args.get("directory")
        .and_then(|v| v.as_str())
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("."));
    
    let category = args.get("category")
        .and_then(|v| v.as_str())
        .unwrap_or("all");
    
    let below_threshold = args.get("below_threshold")
        .and_then(|v| v.as_f64());
    
    let config = PatternConfig::default();
    
    match analyze_patterns(&directory, &config) {
        Ok(report) => {
            // Filter violations by category
            let violations: Vec<_> = if category == "all" {
                report.violations.clone()
            } else {
                report.violations.iter()
                    .filter(|v| v.category == category)
                    .cloned()
                    .collect()
            };
            
            // Get files below threshold if specified
            let files_below: Vec<_> = if let Some(threshold) = below_threshold {
                report.file_evidence.iter()
                    .filter(|e| e.metrics.adoption_ratio < threshold && e.metrics.total_declarations > 0)
                    .map(|e| json!({
                        "file": e.file.display().to_string(),
                        "adoption_ratio": format!("{:.1}%", e.metrics.adoption_ratio),
                        "violations": e.violations.len()
                    }))
                    .collect()
            } else {
                vec![]
            };
            
            let health_status = match report.overall_health {
                HealthStatus::Healthy => "healthy",
                HealthStatus::Warning => "warning", 
                HealthStatus::Critical => "critical",
            };
            
            ToolResult::success(json!({
                "drift_detected": !violations.is_empty(),
                "violations_count": violations.len(),
                "overall_adoption_ratio": format!("{:.1}%", report.overall_adoption_ratio),
                "health_status": health_status,
                "files_analyzed": report.files_analyzed,
                "category_filter": category,
                "violations": violations.iter().take(20).map(|v| json!({
                    "category": v.category,
                    "line": v.line,
                    "property": v.property,
                    "value": v.value,
                    "message": v.message,
                    "suggestion": v.suggestion
                })).collect::<Vec<_>>(),
                "files_below_threshold": files_below,
                "worst_files": report.worst_files.iter().take(5).map(|(f, r)| json!({
                    "file": f.display().to_string(),
                    "adoption_ratio": format!("{:.1}%", r)
                })).collect::<Vec<_>>(),
                "message": if violations.is_empty() {
                    format!("No {} drift detected. Overall adoption: {:.1}%", 
                        if category == "all" { "design system" } else { category },
                        report.overall_adoption_ratio)
                } else {
                    format!("Found {} {} violations. Overall adoption: {:.1}%",
                        violations.len(),
                        if category == "all" { "design system" } else { category },
                        report.overall_adoption_ratio)
                }
            }))
        }
        Err(e) => ToolResult::error(format!("Pattern analysis failed: {}", e)),
    }
}

fn handle_adoption_ratio(args: &Value) -> ToolResult {
    use crate::computations::patterns::{analyze_patterns, PatternConfig, HealthStatus};
    
    let directory = args.get("directory")
        .and_then(|v| v.as_str())
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("."));
    
    let worst_count = args.get("worst_count")
        .and_then(|v| v.as_u64())
        .unwrap_or(10) as usize;
    
    let config = PatternConfig::default();
    
    match analyze_patterns(&directory, &config) {
        Ok(report) => {
            let health_status = match report.overall_health {
                HealthStatus::Healthy => "healthy",
                HealthStatus::Warning => "warning",
                HealthStatus::Critical => "critical",
            };
            
            let health_icon = match report.overall_health {
                HealthStatus::Healthy => "✅",
                HealthStatus::Warning => "⚠️",
                HealthStatus::Critical => "❌",
            };
            
            let category_breakdown: Vec<_> = report.category_summary.iter()
                .map(|(cat, metrics)| {
                    let status = if metrics.ratio >= 90.0 { "healthy" }
                        else if metrics.ratio >= 70.0 { "warning" }
                        else { "critical" };
                    json!({
                        "category": cat,
                        "adoption_ratio": format!("{:.1}%", metrics.ratio),
                        "compliant": metrics.compliant,
                        "total": metrics.total,
                        "status": status
                    })
                })
                .collect();
            
            ToolResult::success(json!({
                "overall_adoption_ratio": format!("{:.1}%", report.overall_adoption_ratio),
                "health_status": health_status,
                "files_analyzed": report.files_analyzed,
                "category_breakdown": category_breakdown,
                "worst_files": report.worst_files.iter().take(worst_count).map(|(f, r)| json!({
                    "file": f.display().to_string(),
                    "adoption_ratio": format!("{:.1}%", r),
                    "status": if *r >= 90.0 { "healthy" } else if *r >= 70.0 { "warning" } else { "critical" }
                })).collect::<Vec<_>>(),
                "thresholds": {
                    "healthy": "90%+",
                    "warning": "70-89%",
                    "critical": "<70%"
                },
                "message": format!("{} Overall adoption: {:.1}% ({})", 
                    health_icon, report.overall_adoption_ratio, health_status)
            }))
        }
        Err(e) => ToolResult::error(format!("Adoption ratio calculation failed: {}", e)),
    }
}

fn handle_suggest_pattern(args: &Value) -> ToolResult {
    use crate::computations::patterns::suggest_for_file;
    
    let file = match args.get("file").and_then(|v| v.as_str()) {
        Some(s) => PathBuf::from(s),
        None => return ToolResult::error("Missing: file"),
    };
    
    // Optionally provide codebase root for similar file analysis
    let codebase_root = args.get("codebase_root")
        .and_then(|v| v.as_str())
        .map(PathBuf::from);
    
    match suggest_for_file(&file, codebase_root.as_deref()) {
        Ok(suggestions) => {
            let token_mappings: Vec<_> = suggestions.token_mappings.iter()
                .map(|m| {
                    json!({
                        "from_value": m.from_value,
                        "to_token": m.to_token,
                        "confidence": format!("{:.0}%", m.confidence * 100.0),
                        "lines": m.lines,
                        "reason": m.reason
                    })
                })
                .collect();
            
            let similar_files: Vec<_> = suggestions.similar_files.iter()
                .map(|s| {
                    json!({
                        "file": s.file,
                        "similarity": format!("{:.0}%", s.similarity * 100.0),
                        "tokens_you_could_use": s.tokens_used
                    })
                })
                .collect();
            
            ToolResult::success(json!({
                "file": suggestions.file.display().to_string(),
                "violations_count": suggestions.violations.len(),
                "token_mappings": token_mappings,
                "similar_files": similar_files,
                "recommendation": suggestions.recommendation,
                "message": if suggestions.violations.is_empty() {
                    "No violations found - file is Canon compliant".to_string()
                } else {
                    format!("Found {} violations with {} token mappings", 
                        suggestions.violations.len(), token_mappings.len())
                }
            }))
        }
        Err(e) => ToolResult::error(format!("Pattern analysis failed: {}", e)),
    }
}

// NOTE: Legacy suggest_*_token functions replaced by suggest_for_file in patterns.rs
// which provides more detailed context-aware suggestions with reasoning

fn handle_mine_patterns(args: &Value) -> ToolResult {
    use crate::computations::patterns::mine_patterns;
    
    let directory = args.get("directory")
        .and_then(|v| v.as_str())
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("."));
    
    let min_occurrences = args.get("min_occurrences")
        .and_then(|v| v.as_u64())
        .unwrap_or(3) as usize;
    
    match mine_patterns(&directory, min_occurrences) {
        Ok(report) => {
            ToolResult::success(json!({
                "files_analyzed": report.files_analyzed,
                "discovered_patterns_count": report.discovered_patterns.len(),
                "discovered_patterns": report.discovered_patterns.iter().take(20).map(|p| json!({
                    "category": p.category,
                    "property": p.property,
                    "value": p.value,
                    "occurrences": p.occurrences,
                    "should_tokenize": p.should_tokenize,
                    "files_sample": p.files.iter().take(3).collect::<Vec<_>>()
                })).collect::<Vec<_>>(),
                "value_clusters": report.value_clusters.iter().take(10).map(|c| json!({
                    "category": c.category,
                    "representative": c.representative,
                    "total_occurrences": c.total_occurrences,
                    "variant_count": c.values.len()
                })).collect::<Vec<_>>(),
                "suggested_tokens": report.suggested_tokens.iter().take(10).map(|s| json!({
                    "name": s.name,
                    "value": s.value,
                    "category": s.category,
                    "occurrences": s.occurrences,
                    "impact_files": s.impact_files,
                    "confidence": format!("{:.0}%", s.confidence * 100.0)
                })).collect::<Vec<_>>(),
                "message": if report.discovered_patterns.is_empty() {
                    format!("No patterns found with {} or more occurrences", min_occurrences)
                } else {
                    format!("Found {} patterns, {} suggested tokens", 
                        report.discovered_patterns.len(),
                        report.suggested_tokens.len())
                }
            }))
        }
        Err(e) => ToolResult::error(format!("Pattern mining failed: {}", e)),
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Graph-based Analysis Handlers
// ─────────────────────────────────────────────────────────────────────────────

fn handle_build_graph(args: &Value) -> ToolResult {
    use crate::computations::SymbolGraph;
    
    let directory = match args.get("directory").and_then(|v| v.as_str()) {
        Some(d) => PathBuf::from(d),
        None => return ToolResult::error("Missing required parameter: directory"),
    };
    
    if !directory.exists() {
        return ToolResult::error(format!("Directory not found: {}", directory.display()));
    }
    
    mcp_log!("Building symbol graph for {}", directory.display());
    
    // Build with progress logging
    let start = std::time::Instant::now();
    let last_logged = std::cell::Cell::new(0usize);
    
    let graph = match SymbolGraph::build(&directory, Some(&|current, total| {
        // Log progress every 100 files
        let last = last_logged.get();
        if current - last >= 100 || current == total {
            mcp_log!("Graph build progress: {}/{} files", current, total);
            last_logged.set(current);
        }
    })) {
        Ok(g) => g,
        Err(e) => return ToolResult::error(format!("Failed to build graph: {}", e)),
    };
    
    let elapsed = start.elapsed();
    let stats = graph.stats();
    
    // Clone aliases before moving graph
    let aliases: Vec<_> = graph.path_aliases.clone();
    let alias_count = aliases.len();
    
    let alias_info = if aliases.is_empty() {
        "none detected".to_string()
    } else {
        aliases.iter().map(|a| format!("{} → {}", a.pattern, a.target)).collect::<Vec<_>>().join(", ")
    };
    
    mcp_log!("Graph built in {:.2}s: {} files, {} exports, {} imports, aliases: {}", 
             elapsed.as_secs_f64(), stats.files, stats.exports, stats.imports, alias_info);
    
    // Build alias list for output
    let alias_list: Vec<serde_json::Value> = aliases.iter().map(|a| json!({
        "pattern": a.pattern,
        "target": a.target
    })).collect();
    
    // Store the graph for subsequent queries
    {
        let mut cached = SYMBOL_GRAPH.lock().unwrap();
        *cached = Some(graph);
    }
    
    ToolResult::success(json!({
        "success": true,
        "directory": directory.to_string_lossy(),
        "stats": {
            "files": stats.files,
            "exports": stats.exports,
            "imports": stats.imports,
            "unique_symbols": stats.unique_symbols,
            "parse_errors": stats.parse_errors
        },
        "path_aliases": alias_list,
        "build_time_ms": elapsed.as_millis(),
        "message": format!(
            "Graph built successfully. {} files, {} exports, {} imports{}. Ready for ground_query_dead.",
            stats.files, stats.exports, stats.imports,
            if alias_count == 0 { "".to_string() } else { format!(", {} path alias(es)", alias_count) }
        )
    }))
}

/// Find the framework root by walking up from a directory
/// Looking for svelte.config.js, next.config.js, package.json, etc.
fn find_framework_root(dir: &Path) -> PathBuf {
    let config_files = [
        "svelte.config.js", "svelte.config.ts",
        "next.config.js", "next.config.mjs", "next.config.ts",
        "vite.config.js", "vite.config.ts",
        "remix.config.js",
        "wrangler.toml", "wrangler.json",
    ];
    
    let mut current = dir.to_path_buf();
    
    // Walk up to 5 levels to find framework config
    for _ in 0..5 {
        for config in &config_files {
            if current.join(config).exists() {
                return current;
            }
        }
        
        // Also check for package.json with framework deps
        let pkg_json = current.join("package.json");
        if pkg_json.exists() {
            if let Ok(content) = std::fs::read_to_string(&pkg_json) {
                if content.contains("\"@sveltejs/kit\"") ||
                   content.contains("\"next\"") ||
                   content.contains("\"@remix-run/") {
                    return current;
                }
            }
        }
        
        match current.parent() {
            Some(parent) => current = parent.to_path_buf(),
            None => break,
        }
    }
    
    // Fall back to original dir
    dir.to_path_buf()
}

fn handle_query_dead(args: &Value) -> ToolResult {
    use crate::computations::framework::{detect_framework, is_implicit_entry};
    
    let file = args.get("file")
        .and_then(|v| v.as_str())
        .map(PathBuf::from);
    
    let raw = args.get("raw")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    
    // Get the cached graph
    let graph = {
        let cached = SYMBOL_GRAPH.lock().unwrap();
        match cached.as_ref() {
            Some(g) => g.clone(),
            None => return ToolResult::error(
                "No graph built. Run ground_build_graph first to build the symbol graph."
            ),
        }
    };
    
    // Detect framework for smart filtering
    // Try the root_dir first, then walk up to find framework config files
    let detection_dir = find_framework_root(&graph.root_dir);
    let framework_detection = detect_framework(&detection_dir);
    let patterns = &framework_detection.patterns;
    
    mcp_log!("Querying graph for dead exports (framework={}, raw={})", 
             framework_detection.primary.as_str(), raw);
    
    // Framework convention exports to filter (unless raw=true)
    let framework_exports: std::collections::HashSet<&str> = if raw {
        std::collections::HashSet::new()
    } else {
        // SvelteKit conventions
        let mut set: std::collections::HashSet<&str> = [
            "load", "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD",
            "handle", "handleError", "handleFetch", 
            "prerender", "trailingSlash", "csr", "ssr", "entries",
            "actions", "fallback",
        ].iter().cloned().collect();
        
        // Next.js conventions
        set.extend(["getServerSideProps", "getStaticProps", "getStaticPaths", 
                    "generateMetadata", "generateStaticParams"].iter().cloned());
        
        set
    };
    
    // Check if a dead export is a framework convention
    let is_framework_convention = |dead: &crate::computations::GraphDeadExport| -> bool {
        // Check if export name is a framework convention
        if framework_exports.contains(dead.name.as_str()) {
            // And it's in an implicit entry file
            if is_implicit_entry(&dead.file, patterns) {
                return true;
            }
        }
        false
    };
    
    if let Some(ref file_path) = file {
        // Query specific file
        let all_dead = graph.find_dead_exports_in_file(file_path);
        
        let (framework_dead, true_dead): (Vec<_>, Vec<_>) = all_dead.iter()
            .partition(|d| is_framework_convention(d));
        
        let dead_json: Vec<_> = true_dead.iter().map(|d| json!({
            "name": d.name,
            "file": d.file.to_string_lossy(),
            "line": d.line,
            "context": d.context
        })).collect();
        
        let mut result = json!({
            "file": file_path.to_string_lossy(),
            "dead_export_count": true_dead.len(),
            "dead_exports": dead_json,
            "framework": framework_detection.primary.as_str(),
            "message": if true_dead.is_empty() {
                format!("All exports in {} are used.", file_path.display())
            } else {
                format!("Found {} dead export(s) in {}.", true_dead.len(), file_path.display())
            }
        });
        
        if !framework_dead.is_empty() && !raw {
            result["filtered_framework_exports"] = json!(framework_dead.len());
            result["note"] = json!("Framework convention exports (load, GET, etc.) were filtered. Use raw=true to see all.");
        }
        
        ToolResult::success(result)
    } else {
        // Query all files
        let report = graph.find_dead_exports();
        
        // Partition into true dead vs framework conventions
        let (framework_dead, true_dead): (Vec<_>, Vec<_>) = report.dead_exports.iter()
            .partition(|d| is_framework_convention(d));
        
        // Group true dead by file
        let mut by_file: HashMap<String, Vec<&crate::computations::GraphDeadExport>> = HashMap::new();
        for dead in &true_dead {
            by_file.entry(dead.file.to_string_lossy().to_string())
                .or_default()
                .push(dead);
        }
        
        let files_with_dead: Vec<_> = by_file.iter().map(|(file, exports)| json!({
            "file": file,
            "dead_exports": exports.iter().map(|e| json!({
                "name": e.name,
                "line": e.line
            })).collect::<Vec<_>>()
        })).collect();
        
        mcp_log!("Query complete: {} true dead, {} framework conventions filtered ({}ms)", 
                 true_dead.len(), framework_dead.len(), report.query_time_ms);
        
        let mut result = json!({
            "framework": framework_detection.primary.as_str(),
            "total_exports": report.total_exports,
            "dead_export_count": true_dead.len(),
            "files_with_dead_exports": by_file.len(),
            "files_analyzed": report.files_analyzed,
            "query_time_ms": report.query_time_ms,
            "by_file": files_with_dead,
            "message": if true_dead.is_empty() {
                format!("No dead exports found across {} files (excluding {} framework conventions).", 
                    report.files_analyzed, framework_dead.len())
            } else {
                format!("Found {} dead export(s) across {} file(s). {} framework convention exports filtered.",
                    true_dead.len(), by_file.len(), framework_dead.len())
            }
        });
        
        if !framework_dead.is_empty() && !raw {
            result["filtered_framework_exports"] = json!(framework_dead.len());
            result["note"] = json!("Framework exports (load, GET, handle, etc.) were filtered. Use raw=true to see all.");
        }
        
        ToolResult::success(result)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    
    #[test]
    fn test_tool_definitions() {
        let tools = list_tools();
        assert_eq!(tools.len(), 19); // Focused AI-native tool set + pattern analysis + graph tools
        
        let names: Vec<_> = tools.iter().map(|t| t.name.as_str()).collect();
        // Check tools
        assert!(names.contains(&"ground_compare"));
        assert!(names.contains(&"ground_count_uses"));
        assert!(names.contains(&"ground_check_connections"));
        assert!(names.contains(&"ground_find_duplicate_functions"));
        // Claim tools (audit trail)
        assert!(names.contains(&"ground_claim_dead_code"));
        assert!(names.contains(&"ground_claim_orphan"));
        // Other tools
        assert!(names.contains(&"ground_suggest_fix"));
        assert!(names.contains(&"ground_check_environment"));
        // Pattern analysis tools
        assert!(names.contains(&"ground_find_drift"));
        assert!(names.contains(&"ground_adoption_ratio"));
        assert!(names.contains(&"ground_suggest_pattern"));
        assert!(names.contains(&"ground_mine_patterns"));
        assert!(names.contains(&"ground_find_orphans"));
        assert!(names.contains(&"ground_find_dead_exports"));
        // AI-Native tools
        assert!(names.contains(&"ground_analyze"));
        assert!(names.contains(&"ground_diff"));
        assert!(names.contains(&"ground_verify_fix"));
    }
    
    #[test]
    fn test_claim_blocked_without_check() {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("test.db");
        let mut g = VerifiedTriad::new(&db_path).unwrap();
        
        // Test claim_dead_code is blocked without prior count_uses
        let result = handle_tool_call(&mut g, "ground_claim_dead_code", &json!({
            "symbol": "unusedFunction",
            "reason": "looks unused"
        }));
        
        assert!(result.success);
        assert_eq!(result.content["claimed"], false);
        assert_eq!(result.content["blocked"], true);
    }
}
