//! Verified Triad Audit Tool
//!
//! Batch DRY validation across a codebase with categorized output.
//!
//! Usage:
//!   vt-audit [path] [--threshold 0.75] [--extensions ts,svelte]
//!   vt-audit [path] --function-level  # Detect duplicate functions

use std::path::{Path, PathBuf};
use std::fs;
use std::collections::HashMap;
use clap::Parser;
use verified_triad::{VerifiedTriad, TriadThresholds};
use verified_triad::exceptions::{ExceptionMatch, check_exception, load_config, smart_threshold};
use verified_triad::computations::{analyze_function_dry, FunctionDryReport};

#[derive(Parser)]
#[command(name = "vt-audit")]
#[command(about = "Batch DRY validation - find duplicates across a codebase")]
struct Cli {
    /// Path to analyze
    #[arg(default_value = ".")]
    path: PathBuf,
    
    /// Path to registry database
    #[arg(long, default_value = ".vt/registry.db")]
    db: PathBuf,
    
    /// Path to config file
    #[arg(long, default_value = ".vt/config.toml")]
    config: PathBuf,
    
    /// Similarity threshold (0.0-1.0)
    #[arg(long, default_value = "0.75")]
    threshold: f64,
    
    /// File extensions to analyze (comma-separated)
    #[arg(long, default_value = "ts,tsx,js,jsx,svelte")]
    extensions: String,
    
    /// Minimum file size in bytes
    #[arg(long, default_value = "100")]
    min_size: u64,
    
    /// Maximum files to compare (for performance)
    #[arg(long, default_value = "500")]
    max_files: usize,
    
    /// Show progress
    #[arg(long, short)]
    verbose: bool,
    
    /// Show all findings including exceptions
    #[arg(long)]
    show_all: bool,
    
    /// Use smart thresholds based on detected package type
    #[arg(long, short)]
    smart: bool,
    
    /// Analyze at function level (detects duplicate functions across files)
    #[arg(long, short = 'f')]
    function_level: bool,
}

#[derive(Debug)]
struct Finding {
    file_a: PathBuf,
    file_b: PathBuf,
    similarity: f64,
    evidence_id: String,
    exception: ExceptionMatch,
    content_a: String,
    content_b: String,
}

#[derive(Debug, Default)]
struct CategorizedResults {
    violations: Vec<Finding>,
    acceptable: Vec<Finding>,
}

fn main() {
    let cli = Cli::parse();
    
    // Ensure .vt directory exists
    if let Some(parent) = cli.db.parent() {
        let _ = fs::create_dir_all(parent);
    }
    
    // Load exception config
    let exception_config = load_config(&cli.config);
    
    // Parse extensions
    let extensions: Vec<&str> = cli.extensions.split(',').map(|s| s.trim()).collect();
    
    // If function-level analysis requested, run that instead
    if cli.function_level {
        run_function_level_analysis(&cli, &extensions);
        return;
    }
    
    println!("Verified Triad DRY Audit");
    println!("========================");
    println!("Path: {}", cli.path.display());
    if cli.smart {
        println!("Threshold: SMART (auto-detected per file pair)");
        println!("  UI Components: 80%  |  API Handlers: 70%");
        println!("  Configuration: 85%  |  Default: 75%");
    } else {
        println!("Threshold: {:.0}%", cli.threshold * 100.0);
    }
    println!("Extensions: {}", extensions.join(", "));
    if cli.config.exists() {
        println!("Config: {} (loaded)", cli.config.display());
    } else {
        println!("Config: using defaults");
    }
    println!();
    
    // Collect files
    let mut files: Vec<PathBuf> = Vec::new();
    collect_files(&cli.path, &extensions, cli.min_size, &mut files);
    
    if files.len() > cli.max_files {
        println!("Found {} files, limiting to {} for performance", files.len(), cli.max_files);
        files.truncate(cli.max_files);
    } else {
        println!("Found {} files to analyze", files.len());
    }
    
    if files.is_empty() {
        println!("No files found matching criteria.");
        return;
    }
    
    // Group files by size (optimization: only compare files of similar size)
    let size_groups = group_by_size(&files);
    
    // Initialize Verified Triad
    let mut vt = match VerifiedTriad::with_thresholds(
        &cli.db,
        TriadThresholds {
            dry_similarity: cli.threshold,
            ..Default::default()
        },
    ) {
        Ok(vt) => vt,
        Err(e) => {
            eprintln!("Failed to initialize: {}", e);
            std::process::exit(1);
        }
    };
    
    // Compare files and categorize
    let mut results = CategorizedResults::default();
    let mut comparisons = 0u64;
    let total_comparisons: u64 = size_groups.values()
        .map(|g| (g.len() * (g.len().saturating_sub(1)) / 2) as u64)
        .sum();
    
    println!("\nComparing {} file pairs...\n", total_comparisons);
    
    for group in size_groups.values() {
        for i in 0..group.len() {
            for j in (i + 1)..group.len() {
                comparisons += 1;
                
                if cli.verbose && comparisons % 100 == 0 {
                    eprint!("\rProgress: {}/{} ({:.1}%)", 
                        comparisons, total_comparisons,
                        (comparisons as f64 / total_comparisons as f64) * 100.0);
                }
                
                let file_a = &group[i];
                let file_b = &group[j];
                
                match vt.compute_similarity(file_a, file_b) {
                    Ok(evidence) => {
                        // Determine threshold (smart or fixed)
                        let effective_threshold = if cli.smart {
                            smart_threshold(file_a, file_b, cli.threshold)
                        } else {
                            cli.threshold
                        };
                        
                        if evidence.similarity >= effective_threshold {
                            // Read file contents for exception checking
                            let content_a = fs::read_to_string(file_a).unwrap_or_default();
                            let content_b = fs::read_to_string(file_b).unwrap_or_default();
                            
                            // Check against exceptions
                            let exception = check_exception(
                                &exception_config,
                                file_a,
                                file_b,
                                Some(&content_a),
                                Some(&content_b),
                            );
                            
                            let finding = Finding {
                                file_a: file_a.clone(),
                                file_b: file_b.clone(),
                                similarity: evidence.similarity,
                                evidence_id: evidence.id.to_string(),
                                exception: exception.clone(),
                                content_a,
                                content_b,
                            };
                            
                            if exception.is_exception() {
                                results.acceptable.push(finding);
                            } else {
                                results.violations.push(finding);
                            }
                        }
                    }
                    Err(e) => {
                        if cli.verbose {
                            eprintln!("\nError comparing {:?} and {:?}: {}", file_a, file_b, e);
                        }
                    }
                }
            }
        }
    }
    
    if cli.verbose {
        eprintln!("\r                                                  \r");
    }
    
    // Sort results by similarity (highest first)
    results.violations.sort_by(|a, b| b.similarity.partial_cmp(&a.similarity).unwrap());
    results.acceptable.sort_by(|a, b| b.similarity.partial_cmp(&a.similarity).unwrap());
    
    // Report results
    println!("\n========================================");
    println!("DRY AUDIT RESULTS (Grounded in Evidence)");
    println!("========================================\n");
    
    // Violations
    if results.violations.is_empty() {
        println!("VIOLATIONS: None found\n");
    } else {
        println!("VIOLATIONS ({}):\n", results.violations.len());
        
        for (i, finding) in results.violations.iter().enumerate() {
            println!("  {}. {:.1}% similar", i + 1, finding.similarity * 100.0);
            println!("     {} <-> {}", 
                finding.file_a.display(), 
                finding.file_b.display());
            println!("     Evidence: {}", finding.evidence_id);
            println!();
        }
    }
    
    // Acceptable (only show if --show-all or verbose)
    if !results.acceptable.is_empty() && (cli.show_all || cli.verbose) {
        println!("----------------------------------------");
        println!("ACCEPTABLE ({} - matched exception patterns):\n", results.acceptable.len());
        
        for (i, finding) in results.acceptable.iter().enumerate() {
            println!("  {}. {:.1}% similar", i + 1, finding.similarity * 100.0);
            println!("     {} <-> {}", 
                finding.file_a.display(), 
                finding.file_b.display());
            if let Some(reason) = finding.exception.reason() {
                println!("     Reason: {}", reason);
            }
            println!();
        }
    } else if !results.acceptable.is_empty() {
        println!("----------------------------------------");
        println!("ACCEPTABLE: {} findings filtered by exception patterns", results.acceptable.len());
        println!("(use --show-all to see details)\n");
    }
    
    // Summary
    println!("========================================");
    println!("SUMMARY");
    println!("========================================");
    println!("  Files analyzed:     {}", files.len());
    println!("  Comparisons made:   {}", comparisons);
    println!("  Violations:         {}", results.violations.len());
    println!("  Acceptable:         {}", results.acceptable.len());
    println!("  Total findings:     {}", results.violations.len() + results.acceptable.len());
    
    if !results.violations.is_empty() {
        println!("\nAll violations are GROUNDED in computation.");
        println!("Evidence IDs can be verified in: {}", cli.db.display());
    }
    
    // Exit code based on violations
    if !results.violations.is_empty() {
        std::process::exit(1);
    }
}

fn collect_files(dir: &Path, extensions: &[&str], min_size: u64, files: &mut Vec<PathBuf>) {
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };
    
    for entry in entries.filter_map(|e| e.ok()) {
        let path = entry.path();
        
        // Skip hidden and generated directories
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            if name.starts_with('.') || 
               matches!(name, "node_modules" | "target" | "dist" | "build" | ".svelte-kit" | "__pycache__") {
                continue;
            }
        }
        
        if path.is_dir() {
            collect_files(&path, extensions, min_size, files);
        } else if path.is_file() {
            // Check extension
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
            if !extensions.contains(&ext) {
                continue;
            }
            
            // Check size
            if let Ok(meta) = fs::metadata(&path) {
                if meta.len() >= min_size {
                    files.push(path);
                }
            }
        }
    }
}

fn group_by_size(files: &[PathBuf]) -> HashMap<u64, Vec<PathBuf>> {
    let mut groups: HashMap<u64, Vec<PathBuf>> = HashMap::new();
    
    for file in files {
        if let Ok(meta) = fs::metadata(file) {
            // Group by size bucket (within 20% of each other)
            let size = meta.len();
            let bucket = size / 100 * 100; // Round to nearest 100 bytes
            
            groups.entry(bucket).or_default().push(file.clone());
        }
    }
    
    // Filter out groups with only one file
    groups.retain(|_, v| v.len() > 1);
    
    groups
}

/// Run function-level DRY analysis
fn run_function_level_analysis(cli: &Cli, extensions: &[&str]) {
    println!("Verified Triad FUNCTION-LEVEL DRY Audit");
    println!("=======================================");
    println!("Path: {}", cli.path.display());
    println!("Threshold: {:.0}%", cli.threshold * 100.0);
    println!("Extensions: {}", extensions.join(", "));
    println!();
    
    // Collect files
    let mut files: Vec<PathBuf> = Vec::new();
    collect_files(&cli.path, extensions, cli.min_size, &mut files);
    
    if files.len() > cli.max_files {
        println!("Found {} files, limiting to {} for performance", files.len(), cli.max_files);
        files.truncate(cli.max_files);
    } else {
        println!("Found {} files to analyze", files.len());
    }
    
    if files.is_empty() {
        println!("No files found matching criteria.");
        return;
    }
    
    println!("\nExtracting and comparing functions...\n");
    
    // Run function-level analysis
    let report = match analyze_function_dry(&files, cli.threshold) {
        Ok(r) => r,
        Err(e) => {
            eprintln!("Analysis failed: {}", e);
            std::process::exit(1);
        }
    };
    
    // Report results
    println!("========================================");
    println!("FUNCTION-LEVEL DRY RESULTS");
    println!("========================================\n");
    
    if report.duplicates.is_empty() {
        println!("DUPLICATE FUNCTIONS: None found\n");
    } else {
        println!("DUPLICATE FUNCTIONS ({}):\n", report.duplicates.len());
        
        // Group by function name
        let mut by_name: HashMap<String, Vec<_>> = HashMap::new();
        for dup in &report.duplicates {
            by_name.entry(dup.function_name.clone())
                .or_default()
                .push(dup);
        }
        
        let mut idx = 1;
        for (func_name, dups) in by_name.iter() {
            println!("  {}. Function '{}' duplicated in {} places:", idx, func_name, dups.len() + 1);
            
            // Collect all unique files
            let mut files_set = std::collections::HashSet::new();
            for dup in dups {
                files_set.insert(&dup.file_a);
                files_set.insert(&dup.file_b);
            }
            
            for file in files_set {
                // Find line info
                let line_info = dups.iter()
                    .find_map(|d| {
                        if &d.file_a == file {
                            Some((d.function_a.start_line, d.function_a.end_line))
                        } else if &d.file_b == file {
                            Some((d.function_b.start_line, d.function_b.end_line))
                        } else {
                            None
                        }
                    });
                
                if let Some((start, end)) = line_info {
                    println!("     - {} (lines {}-{})", file.display(), start, end);
                } else {
                    println!("     - {}", file.display());
                }
            }
            
            // Show similarity
            if let Some(dup) = dups.first() {
                println!("     Similarity: {:.1}%", dup.similarity * 100.0);
            }
            println!();
            idx += 1;
        }
    }
    
    // Summary
    println!("========================================");
    println!("SUMMARY");
    println!("========================================");
    println!("  Files analyzed:       {}", files.len());
    println!("  Functions extracted:  {}", report.total_functions);
    println!("  Duplicate functions:  {}", report.duplicates.len());
    
    if !report.duplicates.is_empty() {
        println!("\nRECOMMENDATION:");
        println!("  Extract duplicate functions to a shared module.");
        println!("  Example: packages/shared/src/lib/bd-client.ts");
        
        std::process::exit(1);
    }
}
