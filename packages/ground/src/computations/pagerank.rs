//! PageRank for Import Graphs
//!
//! Computes importance scores for modules based on the import graph.
//! Modules imported by many important modules are themselves important.
//!
//! ## Use Cases
//! - Prioritize orphan detection (low PageRank = more likely truly orphaned)
//! - Identify core modules (high PageRank = critical infrastructure)
//! - Risk assessment for changes (high PageRank = high impact)
//!
//! ## Algorithm
//! Standard PageRank with damping factor 0.85:
//! PR(A) = (1-d)/N + d * Σ(PR(T)/C(T)) for all T linking to A
//!
//! Where:
//! - d = damping factor (0.85)
//! - N = total number of nodes
//! - C(T) = number of outgoing links from T

use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::fs;
use serde::{Serialize, Deserialize};

/// Default damping factor for PageRank
pub const DEFAULT_DAMPING: f64 = 0.85;

/// Default number of iterations
pub const DEFAULT_ITERATIONS: usize = 100;

/// Convergence threshold
pub const CONVERGENCE_THRESHOLD: f64 = 1e-6;

/// PageRank results for a module
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModuleRank {
    /// Path to the module
    pub path: PathBuf,
    
    /// PageRank score (0.0 - 1.0, normalized)
    pub rank: f64,
    
    /// Percentile rank (0-100, relative to other modules)
    pub percentile: f64,
    
    /// Number of incoming imports
    pub in_degree: usize,
    
    /// Number of outgoing imports
    pub out_degree: usize,
    
    /// Classification based on rank
    pub classification: ModuleClassification,
}

/// Classification of module importance
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ModuleClassification {
    /// Top 10% - Core infrastructure, changes are high risk
    Critical,
    /// Top 25% - Important, widely used
    Important,
    /// Middle 50% - Normal utility modules
    Standard,
    /// Bottom 25% - Leaf modules, rarely imported
    Peripheral,
}

impl ModuleClassification {
    pub fn from_percentile(percentile: f64) -> Self {
        if percentile >= 90.0 {
            ModuleClassification::Critical
        } else if percentile >= 75.0 {
            ModuleClassification::Important
        } else if percentile >= 25.0 {
            ModuleClassification::Standard
        } else {
            ModuleClassification::Peripheral
        }
    }
}

/// Import graph for PageRank computation
#[derive(Debug, Clone)]
pub struct ImportGraph {
    /// Map from module path to its index
    pub node_index: HashMap<PathBuf, usize>,
    
    /// Reverse map from index to path
    pub index_to_path: Vec<PathBuf>,
    
    /// Adjacency list: outgoing edges (who this module imports)
    pub outgoing: Vec<HashSet<usize>>,
    
    /// Reverse adjacency: incoming edges (who imports this module)
    pub incoming: Vec<HashSet<usize>>,
}

impl ImportGraph {
    /// Create a new empty graph
    pub fn new() -> Self {
        Self {
            node_index: HashMap::new(),
            index_to_path: Vec::new(),
            outgoing: Vec::new(),
            incoming: Vec::new(),
        }
    }
    
    /// Add a node (module) to the graph
    pub fn add_node(&mut self, path: PathBuf) -> usize {
        if let Some(&idx) = self.node_index.get(&path) {
            return idx;
        }
        
        let idx = self.index_to_path.len();
        self.node_index.insert(path.clone(), idx);
        self.index_to_path.push(path);
        self.outgoing.push(HashSet::new());
        self.incoming.push(HashSet::new());
        idx
    }
    
    /// Add an edge: `from` imports `to`
    pub fn add_edge(&mut self, from: &Path, to: &Path) {
        let from_idx = self.add_node(from.to_path_buf());
        let to_idx = self.add_node(to.to_path_buf());
        
        self.outgoing[from_idx].insert(to_idx);
        self.incoming[to_idx].insert(from_idx);
    }
    
    /// Number of nodes
    pub fn node_count(&self) -> usize {
        self.index_to_path.len()
    }
    
    /// Get in-degree for a node
    pub fn in_degree(&self, idx: usize) -> usize {
        self.incoming.get(idx).map(|s| s.len()).unwrap_or(0)
    }
    
    /// Get out-degree for a node
    pub fn out_degree(&self, idx: usize) -> usize {
        self.outgoing.get(idx).map(|s| s.len()).unwrap_or(0)
    }
}

impl Default for ImportGraph {
    fn default() -> Self {
        Self::new()
    }
}

/// Compute PageRank scores for all modules in the graph
pub fn compute_pagerank(
    graph: &ImportGraph,
    damping: f64,
    max_iterations: usize,
) -> Vec<f64> {
    let n = graph.node_count();
    if n == 0 {
        return vec![];
    }
    
    // Initialize scores uniformly
    let initial_score = 1.0 / n as f64;
    let mut scores: Vec<f64> = vec![initial_score; n];
    let mut new_scores: Vec<f64> = vec![0.0; n];
    
    let base_score = (1.0 - damping) / n as f64;
    
    for _iteration in 0..max_iterations {
        // Reset new scores
        for score in new_scores.iter_mut() {
            *score = base_score;
        }
        
        // Distribute scores along edges
        for (from_idx, outgoing_set) in graph.outgoing.iter().enumerate() {
            if outgoing_set.is_empty() {
                // Dangling node: distribute to all nodes
                let contribution = damping * scores[from_idx] / n as f64;
                for score in new_scores.iter_mut() {
                    *score += contribution;
                }
            } else {
                // Distribute to linked nodes
                let contribution = damping * scores[from_idx] / outgoing_set.len() as f64;
                for &to_idx in outgoing_set {
                    new_scores[to_idx] += contribution;
                }
            }
        }
        
        // Check convergence
        let diff: f64 = scores.iter()
            .zip(new_scores.iter())
            .map(|(old, new)| (old - new).abs())
            .sum();
        
        std::mem::swap(&mut scores, &mut new_scores);
        
        if diff < CONVERGENCE_THRESHOLD {
            break;
        }
    }
    
    // Normalize so sum = 1.0
    let sum: f64 = scores.iter().sum();
    if sum > 0.0 {
        for score in scores.iter_mut() {
            *score /= sum;
        }
    }
    
    scores
}

/// Compute PageRank with full module information
pub fn rank_modules(graph: &ImportGraph) -> Vec<ModuleRank> {
    let scores = compute_pagerank(graph, DEFAULT_DAMPING, DEFAULT_ITERATIONS);
    
    if scores.is_empty() {
        return vec![];
    }
    
    // Sort scores to compute percentiles
    let mut sorted_scores: Vec<f64> = scores.clone();
    sorted_scores.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    
    let mut results: Vec<ModuleRank> = Vec::with_capacity(graph.node_count());
    
    for (idx, path) in graph.index_to_path.iter().enumerate() {
        let rank = scores[idx];
        
        // Compute percentile
        let position = sorted_scores.iter()
            .position(|&s| s >= rank)
            .unwrap_or(0);
        let percentile = (position as f64 / sorted_scores.len() as f64) * 100.0;
        
        results.push(ModuleRank {
            path: path.clone(),
            rank,
            percentile,
            in_degree: graph.in_degree(idx),
            out_degree: graph.out_degree(idx),
            classification: ModuleClassification::from_percentile(percentile),
        });
    }
    
    // Sort by rank descending
    results.sort_by(|a, b| b.rank.partial_cmp(&a.rank).unwrap_or(std::cmp::Ordering::Equal));
    
    results
}

/// Build an import graph from a directory
pub fn build_import_graph(root: &Path) -> std::io::Result<ImportGraph> {
    let mut graph = ImportGraph::new();
    
    build_graph_recursive(root, root, &mut graph)?;
    
    Ok(graph)
}

fn build_graph_recursive(
    root: &Path,
    dir: &Path,
    graph: &mut ImportGraph,
) -> std::io::Result<()> {
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return Ok(()), // Skip unreadable directories
    };
    
    for entry in entries.flatten() {
        let path = entry.path();
        
        // Skip hidden and generated directories
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            if name.starts_with('.') || 
               matches!(name, "node_modules" | "target" | "dist" | "build" | ".svelte-kit" | "venv" | ".venv") {
                continue;
            }
        }
        
        if !path.exists() {
            continue;
        }
        
        if path.is_dir() {
            build_graph_recursive(root, &path, graph)?;
        } else if path.is_file() {
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
            if matches!(ext, "ts" | "tsx" | "js" | "jsx") {
                // Add node
                graph.add_node(path.clone());
                
                // Parse imports
                if let Ok(content) = fs::read_to_string(&path) {
                    for import_path in extract_imports(&content) {
                        if let Some(resolved) = resolve_import(&path, &import_path, root) {
                            graph.add_edge(&path, &resolved);
                        }
                    }
                }
            }
        }
    }
    
    Ok(())
}

/// Extract import paths from source code
fn extract_imports(content: &str) -> Vec<String> {
    let mut imports = Vec::new();
    
    for line in content.lines() {
        let line = line.trim();
        
        // import ... from '...'
        if (line.starts_with("import") || line.contains("} from")) && line.contains("from") {
            if let Some(path) = extract_quoted_string_after(line, "from") {
                if path.starts_with('.') {
                    imports.push(path);
                }
            }
        }
        
        // export ... from '...'
        if line.starts_with("export") && line.contains("from") {
            if let Some(path) = extract_quoted_string_after(line, "from") {
                if path.starts_with('.') {
                    imports.push(path);
                }
            }
        }
        
        // require('...')
        if line.contains("require(") {
            if let Some(path) = extract_require_path(line) {
                if path.starts_with('.') {
                    imports.push(path);
                }
            }
        }
    }
    
    imports
}

fn extract_quoted_string_after(line: &str, keyword: &str) -> Option<String> {
    let pos = line.find(keyword)?;
    let after = &line[pos + keyword.len()..];
    
    let quote_char = if after.contains('\'') { '\'' } else { '"' };
    let start = after.find(quote_char)? + 1;
    let rest = &after[start..];
    let end = rest.find(quote_char)?;
    
    Some(rest[..end].to_string())
}

fn extract_require_path(line: &str) -> Option<String> {
    let start = line.find("require(")? + 8;
    let rest = &line[start..];
    
    let quote_char = if rest.starts_with('\'') { '\'' } else { '"' };
    let content_start = rest.find(quote_char)? + 1;
    let content = &rest[content_start..];
    let end = content.find(quote_char)?;
    
    Some(content[..end].to_string())
}

/// Resolve a relative import to an absolute path
fn resolve_import(from_file: &Path, import_path: &str, root: &Path) -> Option<PathBuf> {
    let from_dir = from_file.parent()?;
    let resolved = from_dir.join(import_path);
    
    // Try various extensions
    let extensions = ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx", "/index.js"];
    
    for ext in extensions {
        let with_ext = if ext.is_empty() {
            resolved.clone()
        } else if ext.starts_with('/') {
            resolved.join(&ext[1..])
        } else {
            resolved.with_extension(&ext[1..])
        };
        
        if with_ext.exists() && with_ext.starts_with(root) {
            return Some(with_ext);
        }
    }
    
    None
}

/// PageRank report for a directory
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageRankReport {
    /// Directory analyzed
    pub directory: PathBuf,
    
    /// Total modules analyzed
    pub total_modules: usize,
    
    /// Total import edges
    pub total_edges: usize,
    
    /// Top ranked modules
    pub rankings: Vec<ModuleRank>,
    
    /// Summary statistics
    pub stats: PageRankStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageRankStats {
    pub critical_count: usize,
    pub important_count: usize,
    pub standard_count: usize,
    pub peripheral_count: usize,
    pub avg_in_degree: f64,
    pub avg_out_degree: f64,
    pub max_rank: f64,
    pub min_rank: f64,
}

/// Analyze a directory and produce PageRank report
pub fn analyze_pagerank(directory: &Path) -> std::io::Result<PageRankReport> {
    let graph = build_import_graph(directory)?;
    let rankings = rank_modules(&graph);
    
    let total_edges: usize = graph.outgoing.iter().map(|s| s.len()).sum();
    
    let (critical, important, standard, peripheral) = rankings.iter()
        .fold((0, 0, 0, 0), |(c, i, s, p), r| {
            match r.classification {
                ModuleClassification::Critical => (c + 1, i, s, p),
                ModuleClassification::Important => (c, i + 1, s, p),
                ModuleClassification::Standard => (c, i, s + 1, p),
                ModuleClassification::Peripheral => (c, i, s, p + 1),
            }
        });
    
    let n = rankings.len();
    let avg_in = if n > 0 { 
        rankings.iter().map(|r| r.in_degree).sum::<usize>() as f64 / n as f64 
    } else { 
        0.0 
    };
    let avg_out = if n > 0 { 
        rankings.iter().map(|r| r.out_degree).sum::<usize>() as f64 / n as f64 
    } else { 
        0.0 
    };
    
    let max_rank = rankings.first().map(|r| r.rank).unwrap_or(0.0);
    let min_rank = rankings.last().map(|r| r.rank).unwrap_or(0.0);
    
    Ok(PageRankReport {
        directory: directory.to_path_buf(),
        total_modules: graph.node_count(),
        total_edges,
        rankings,
        stats: PageRankStats {
            critical_count: critical,
            important_count: important,
            standard_count: standard,
            peripheral_count: peripheral,
            avg_in_degree: avg_in,
            avg_out_degree: avg_out,
            max_rank,
            min_rank,
        },
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    use std::io::Write;
    
    #[test]
    fn test_empty_graph() {
        let graph = ImportGraph::new();
        let scores = compute_pagerank(&graph, DEFAULT_DAMPING, DEFAULT_ITERATIONS);
        assert!(scores.is_empty());
    }
    
    #[test]
    fn test_single_node() {
        let mut graph = ImportGraph::new();
        graph.add_node(PathBuf::from("a.ts"));
        
        let scores = compute_pagerank(&graph, DEFAULT_DAMPING, DEFAULT_ITERATIONS);
        assert_eq!(scores.len(), 1);
        assert!((scores[0] - 1.0).abs() < 0.01);
    }
    
    #[test]
    fn test_linear_chain() {
        // a -> b -> c
        // c should have highest rank (end of chain)
        let mut graph = ImportGraph::new();
        let a = PathBuf::from("a.ts");
        let b = PathBuf::from("b.ts");
        let c = PathBuf::from("c.ts");
        
        graph.add_edge(&a, &b);
        graph.add_edge(&b, &c);
        
        let rankings = rank_modules(&graph);
        
        // c should have highest rank (most "linked to")
        let c_rank = rankings.iter().find(|r| r.path == c).unwrap();
        let a_rank = rankings.iter().find(|r| r.path == a).unwrap();
        
        assert!(c_rank.rank > a_rank.rank);
    }
    
    #[test]
    fn test_hub_pattern() {
        // hub imports a, b, c, d
        // hub should have lower rank (it links TO things, not linked FROM)
        let mut graph = ImportGraph::new();
        let hub = PathBuf::from("hub.ts");
        
        for name in ["a", "b", "c", "d"] {
            let node = PathBuf::from(format!("{}.ts", name));
            graph.add_edge(&hub, &node);
        }
        
        let rankings = rank_modules(&graph);
        
        // All leaf nodes should have higher rank than hub
        let hub_rank = rankings.iter().find(|r| r.path == hub).unwrap();
        let a_rank = rankings.iter().find(|r| r.path.to_str().unwrap().contains("a.ts")).unwrap();
        
        assert!(a_rank.rank > hub_rank.rank);
    }
    
    #[test]
    fn test_classification() {
        assert_eq!(ModuleClassification::from_percentile(95.0), ModuleClassification::Critical);
        assert_eq!(ModuleClassification::from_percentile(80.0), ModuleClassification::Important);
        assert_eq!(ModuleClassification::from_percentile(50.0), ModuleClassification::Standard);
        assert_eq!(ModuleClassification::from_percentile(10.0), ModuleClassification::Peripheral);
    }
    
    #[test]
    fn test_real_directory() {
        let dir = tempdir().unwrap();
        
        // Create a mini project
        // utils.ts (imported by main.ts and helper.ts)
        // helper.ts (imports utils.ts, imported by main.ts)
        // main.ts (imports utils.ts and helper.ts)
        // orphan.ts (no imports or importers)
        
        let utils = dir.path().join("utils.ts");
        let helper = dir.path().join("helper.ts");
        let main = dir.path().join("main.ts");
        let orphan = dir.path().join("orphan.ts");
        
        fs::File::create(&utils).unwrap()
            .write_all(b"export function util() {}").unwrap();
        
        fs::File::create(&helper).unwrap()
            .write_all(b"import { util } from './utils';\nexport function help() { util(); }").unwrap();
        
        fs::File::create(&main).unwrap()
            .write_all(b"import { util } from './utils';\nimport { help } from './helper';\nutil(); help();").unwrap();
        
        fs::File::create(&orphan).unwrap()
            .write_all(b"export function lonely() {}").unwrap();
        
        let report = analyze_pagerank(dir.path()).unwrap();
        
        assert_eq!(report.total_modules, 4);
        
        // utils.ts should be highest (imported by 2 modules)
        let utils_rank = report.rankings.iter()
            .find(|r| r.path.file_name().unwrap().to_str().unwrap() == "utils.ts")
            .unwrap();
        
        let orphan_rank = report.rankings.iter()
            .find(|r| r.path.file_name().unwrap().to_str().unwrap() == "orphan.ts")
            .unwrap();
        
        assert!(utils_rank.rank > orphan_rank.rank);
        assert_eq!(utils_rank.in_degree, 2);
        assert_eq!(orphan_rank.in_degree, 0);
    }
}
