//! Ground CLI
//!
//! Grounded claims for code. You can't claim something until you've checked it.
//!
//! Usage:
//!   ground compare <a> <b>              Compare two files for similarity
//!   ground count uses <symbol> [path]   Count how many times something is used
//!   ground check connections <module>   Check if a module is connected
//!
//!   ground find duplicates [path]       Find duplicate code
//!   ground find duplicate-functions [path]  Find duplicate functions
//!   ground find dead-code <symbol>      Find unused code
//!   ground find orphans [path]          Find disconnected modules
//!
//!   ground claim duplicate <a> <b>      Claim files are duplicates (needs compare first)
//!   ground claim dead-code <symbol>     Claim code is dead (needs count first)
//!   ground claim orphan <module>        Claim module is orphaned (needs check first)
//!
//!   ground status                       Show what's been checked

use std::path::{Path, PathBuf};
use std::fs;
use std::collections::HashMap;
use clap::{Parser, Subcommand};
use ground::VerifiedTriad;
use ground::exceptions::{check_exception, load_config, smart_threshold};
use ground::monorepo::{detect_monorepo, suggest_refactoring, generate_beads_command};

#[derive(Parser)]
#[command(name = "ground")]
#[command(about = "Grounded claims for code. You can't claim something until you've checked it.")]
#[command(version)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
    
    /// Path to registry database
    #[arg(long, default_value = ".ground/registry.db")]
    db: PathBuf,
}

#[derive(Subcommand)]
enum Commands {
    /// Initialize ground in current directory
    Init,
    
    /// Compare two files for similarity
    Compare {
        /// First file
        file_a: PathBuf,
        /// Second file
        file_b: PathBuf,
    },
    
    /// Count how many times something is used
    #[command(subcommand)]
    Count(CountCommands),
    
    /// Check connections for a module
    #[command(subcommand)]
    Check(CheckCommands),
    
    /// Find problems in your code
    #[command(subcommand)]
    Find(FindCommands),
    
    /// Make a claim (only works if you've checked first)
    #[command(subcommand)]
    Claim(ClaimCommands),
    
    /// Show what's been checked
    Status,
    
    /// Suggest how to fix a duplication
    Suggest {
        /// First file
        file_a: PathBuf,
        /// Second file
        file_b: PathBuf,
    },
}

#[derive(Subcommand)]
enum CountCommands {
    /// Count how many times a symbol is used
    Uses {
        /// Symbol to search for
        symbol: String,
        /// Path to search in
        #[arg(default_value = ".")]
        path: PathBuf,
    },
}

#[derive(Subcommand)]
enum CheckCommands {
    /// Check if a module is connected to the rest of the code
    Connections {
        /// Module path
        module: PathBuf,
    },
    /// Check for environment safety issues (Workers APIs in Node.js or vice versa)
    EnvironmentSafety {
        /// Entry point to analyze (CLI script, Worker index.ts, etc.)
        entry_point: PathBuf,
    },
}

#[derive(Subcommand)]
enum FindCommands {
    /// Find duplicate code across files
    Duplicates {
        /// Path to search
        #[arg(default_value = ".")]
        path: PathBuf,
        /// Similarity threshold (0.0-1.0)
        #[arg(long, default_value = "0.75")]
        threshold: f64,
        /// File extensions to check (comma-separated)
        #[arg(long, default_value = "ts,tsx,js,jsx,svelte")]
        extensions: String,
        /// Max files to compare
        #[arg(long, default_value = "500")]
        max_files: usize,
        /// Use CREATE SOMETHING monorepo mode
        #[arg(long, short)]
        monorepo: bool,
        /// Output beads commands for filing issues
        #[arg(long)]
        beads: bool,
        /// Use smart thresholds based on file type
        #[arg(long, short)]
        smart: bool,
    },
    /// Find duplicate functions across files
    DuplicateFunctions {
        /// Path to search
        #[arg(default_value = ".")]
        path: PathBuf,
        /// Similarity threshold (0.0-1.0)
        #[arg(long, default_value = "0.8")]
        threshold: f64,
        /// Max files to analyze
        #[arg(long, default_value = "200")]
        max_files: usize,
        /// Exclude test files (*.test.ts, *.spec.ts, __tests__/*)
        #[arg(long)]
        exclude_tests: bool,
        /// Minimum function lines to analyze (filters trivial functions)
        #[arg(long)]
        min_lines: Option<usize>,
    },
    /// Find unused code
    DeadCode {
        /// Symbol to check
        symbol: String,
        /// Path to search in
        #[arg(default_value = ".")]
        path: PathBuf,
    },
    /// Find modules that nothing connects to
    Orphans {
        /// Path to search
        #[arg(default_value = ".")]
        path: PathBuf,
    },
    /// Find exports that are never imported elsewhere
    DeadExports {
        /// Module to scan for dead exports
        module: PathBuf,
        /// Search scope for import detection
        #[arg(long, default_value = ".")]
        scope: PathBuf,
    },
    /// Find design system drift (violations of Canon tokens)
    Drift {
        /// Path to search
        #[arg(default_value = ".")]
        path: PathBuf,
        /// Category to check (colors, spacing, typography, svelte, all)
        #[arg(long, default_value = "all")]
        category: String,
        /// Only show files below this adoption threshold (0-100)
        #[arg(long)]
        below_threshold: Option<f64>,
        /// Output format (text, json)
        #[arg(long, default_value = "text")]
        format: String,
    },
    /// Calculate token adoption ratio
    AdoptionRatio {
        /// Path to analyze
        #[arg(default_value = ".")]
        path: PathBuf,
        /// Show per-file breakdown
        #[arg(long, short)]
        verbose: bool,
        /// Show worst offending files
        #[arg(long, default_value = "10")]
        worst: usize,
        /// Output format (text, json)
        #[arg(long, default_value = "text")]
        format: String,
    },
    /// Mine patterns to discover implicit design tokens
    Patterns {
        /// Path to analyze
        #[arg(default_value = ".")]
        path: PathBuf,
        /// Minimum occurrences to consider a pattern
        #[arg(long, default_value = "3")]
        min_occurrences: usize,
        /// Output format (text, json)
        #[arg(long, default_value = "text")]
        format: String,
    },
}

#[derive(Subcommand)]
enum ClaimCommands {
    /// Claim that two files are duplicates
    Duplicate {
        /// First file
        file_a: PathBuf,
        /// Second file
        file_b: PathBuf,
        /// Why you're claiming this
        reason: String,
    },
    /// Claim that code is dead (unused)
    DeadCode {
        /// Symbol that's dead
        symbol: String,
        /// Why you're claiming this
        reason: String,
    },
    /// Claim that a module is orphaned (disconnected)
    Orphan {
        /// Module path
        module: PathBuf,
        /// Why you're claiming this
        reason: String,
    },
}

fn main() {
    let cli = Cli::parse();
    
    if let Err(e) = run(cli) {
        eprintln!("Error: {}", e);
        std::process::exit(1);
    }
}

fn run(cli: Cli) -> Result<(), Box<dyn std::error::Error>> {
    match cli.command {
        Commands::Init => {
            std::fs::create_dir_all(".ground")?;
            let _vt = VerifiedTriad::new(&cli.db)?;
            
            println!("✓ Ground initialized");
            println!();
            println!("Next steps:");
            println!("  ground compare file_a.ts file_b.ts     Compare two files");
            println!("  ground find duplicates ./src           Find all duplicates");
            println!("  ground claim duplicate a.ts b.ts \"...\" Make a grounded claim");
            Ok(())
        }
        
        Commands::Compare { file_a, file_b } => {
            let mut vt = VerifiedTriad::new(&cli.db)?;
            let evidence = vt.compute_similarity(&file_a, &file_b)?;
            
            println!("Compared {} ↔ {}", file_a.display(), file_b.display());
            println!();
            println!("  Similarity:  {:.1}%", evidence.similarity * 100.0);
            if let Some(ast) = evidence.ast_similarity {
                println!("  Structure:   {:.1}%", ast * 100.0);
            }
            println!("  Evidence ID: {}", evidence.id);
            
            let threshold = vt.thresholds().dry_similarity;
            println!();
            if evidence.similarity >= threshold {
                println!("  This looks like a duplicate ({:.0}%+ threshold).", threshold * 100.0);
                println!("  You can now run: ground claim duplicate {} {} \"reason\"", 
                    file_a.display(), file_b.display());
            } else {
                println!("  Not similar enough to be a duplicate (below {:.0}%).", threshold * 100.0);
            }
            
            Ok(())
        }
        
        Commands::Count(CountCommands::Uses { symbol, path }) => {
            let mut vt = VerifiedTriad::new(&cli.db)?;
            let evidence = vt.count_usages(&symbol, &path)?;
            
            println!("Counted uses of '{}'", symbol);
            println!();
            println!("  Found: {} uses", evidence.usage_count);
            println!("  Evidence ID: {}", evidence.id);
            
            if !evidence.locations.is_empty() {
                println!();
                println!("  Locations:");
                for loc in evidence.locations.iter().take(5) {
                    println!("    {}:{}", loc.file.display(), loc.line);
                }
                if evidence.locations.len() > 5 {
                    println!("    ... and {} more", evidence.locations.len() - 5);
                }
            }
            
            if evidence.usage_count == 0 {
                println!();
                println!("  This looks like dead code.");
                println!("  You can now run: ground claim dead-code {} \"reason\"", symbol);
            }
            
            Ok(())
        }
        
        Commands::Check(CheckCommands::Connections { module }) => {
            let mut vt = VerifiedTriad::new(&cli.db)?;
            let evidence = vt.analyze_connectivity(&module)?;
            
            println!("Checked connections for {}", module.display());
            println!();
            println!("  Incoming: {} (files that import this)", evidence.incoming_connections);
            println!("  Outgoing: {} (files this imports)", evidence.outgoing_connections);
            println!("  Evidence ID: {}", evidence.id);
            
            if let Some(arch) = &evidence.architectural {
                println!();
                println!("  This is a {} with:", arch.architecture_type);
                if !arch.routes.is_empty() {
                    println!("    Routes: {}", arch.routes.join(", "));
                }
                if !arch.crons.is_empty() {
                    println!("    Crons: {}", arch.crons.join(", "));
                }
                if !arch.bindings.is_empty() {
                    println!("    Bindings: {}", arch.bindings.len());
                }
            }
            
            if evidence.total_connections() == 0 {
                println!();
                println!("  This looks orphaned (nothing connects to it).");
                println!("  You can now run: ground claim orphan {} \"reason\"", module.display());
            }
            
            Ok(())
        }
        
        Commands::Check(CheckCommands::EnvironmentSafety { entry_point }) => {
            use ground::computations::environment::{analyze_environment_safety, WarningSeverity, RuntimeEnvironment};
            
            let evidence = analyze_environment_safety(&entry_point)?;
            
            let env_str = match evidence.entry_environment {
                RuntimeEnvironment::Node => "Node.js",
                RuntimeEnvironment::Workers => "Cloudflare Workers",
                RuntimeEnvironment::Universal => "Universal",
                RuntimeEnvironment::Unknown => "Unknown",
            };
            
            println!("Environment Safety Check for {}", entry_point.display());
            println!();
            println!("  Detected environment: {}", env_str);
            println!("  Reachable modules: {}", evidence.reachable_modules.len());
            println!("  Environment-specific APIs found: {}", evidence.api_usages.len());
            
            if evidence.warnings.is_empty() {
                println!();
                println!("  ✓ No environment safety issues detected.");
            } else {
                println!();
                println!("  ⚠ {} warning(s) found:", evidence.warnings.len());
                println!();
                
                for (i, warning) in evidence.warnings.iter().enumerate() {
                    let severity_icon = match warning.severity {
                        WarningSeverity::Error => "✗",
                        WarningSeverity::Warning => "⚠",
                        WarningSeverity::Info => "ℹ",
                    };
                    
                    println!("  {}. {} {}", i + 1, severity_icon, warning.message);
                    println!();
                    println!("     Import chain:");
                    for (j, path) in warning.import_chain.iter().enumerate() {
                        let prefix = if j == 0 { "     " } else { "       → " };
                        println!("{}{}", prefix, path.file_name().and_then(|n| n.to_str()).unwrap_or("?"));
                    }
                    println!();
                    println!("     {}", warning.suggestion.replace("\n", "\n     "));
                    println!();
                }
            }
            
            if !evidence.is_safe {
                std::process::exit(1);
            }
            
            Ok(())
        }
        
        Commands::Find(find_cmd) => run_find(find_cmd, &cli.db),
        
        Commands::Claim(claim_cmd) => {
            let vt = VerifiedTriad::new(&cli.db)?;
            
            match claim_cmd {
                ClaimCommands::Duplicate { file_a, file_b, reason } => {
                    match vt.claim_dry_violation(&file_a, &file_b, &reason) {
                        Ok(claim) => {
                            println!("✓ Claim recorded (grounded in evidence)");
                            println!();
                            println!("  Files: {} ↔ {}", file_a.display(), file_b.display());
                            println!("  Similarity: {:.1}%", claim.similarity * 100.0);
                            println!("  Reason: {}", claim.reason);
                            println!("  Claim ID: {}", claim.id);
                        }
                        Err(e) => {
                            println!("✗ Claim blocked");
                            println!();
                            println!("  {}", e);
                            println!();
                            println!("  You need to compare the files first:");
                            println!("  ground compare {} {}", file_a.display(), file_b.display());
                            std::process::exit(1);
                        }
                    }
                }
                
                ClaimCommands::DeadCode { symbol, reason } => {
                    match vt.claim_no_existence(&symbol, &reason) {
                        Ok(claim) => {
                            println!("✓ Claim recorded (grounded in evidence)");
                            println!();
                            println!("  Symbol: {}", claim.symbol);
                            println!("  Uses found: {}", claim.usage_count);
                            println!("  Reason: {}", claim.reason);
                            println!("  Claim ID: {}", claim.id);
                        }
                        Err(e) => {
                            println!("✗ Claim blocked");
                            println!();
                            println!("  {}", e);
                            println!();
                            println!("  You need to count uses first:");
                            println!("  ground count uses {}", symbol);
                            std::process::exit(1);
                        }
                    }
                }
                
                ClaimCommands::Orphan { module, reason } => {
                    match vt.claim_disconnection(&module, &reason) {
                        Ok(claim) => {
                            println!("✓ Claim recorded (grounded in evidence)");
                            println!();
                            println!("  Module: {}", claim.module_path.display());
                            println!("  Connections: {}", claim.connection_count);
                            println!("  Reason: {}", claim.reason);
                            println!("  Claim ID: {}", claim.id);
                        }
                        Err(e) => {
                            println!("✗ Claim blocked");
                            println!();
                            println!("  {}", e);
                            println!();
                            println!("  You need to check connections first:");
                            println!("  ground check connections {}", module.display());
                            std::process::exit(1);
                        }
                    }
                }
            }
            
            Ok(())
        }
        
        Commands::Status => {
            let vt = VerifiedTriad::new(&cli.db)?;
            let thresholds = vt.thresholds();
            
            println!("Ground Status");
            println!();
            println!("  Registry: {}", cli.db.display());
            println!();
            println!("  Thresholds:");
            println!("    Duplicate similarity: {:.0}%", thresholds.dry_similarity * 100.0);
            println!("    Min uses for \"alive\": {}", thresholds.rams_min_usage);
            println!("    Min connections: {}", thresholds.heidegger_min_connections);
            
            Ok(())
        }
        
        Commands::Suggest { file_a, file_b } => {
            let mut vt = VerifiedTriad::new(&cli.db)?;
            
            // First compute similarity
            let evidence = vt.compute_similarity(&file_a, &file_b)?;
            
            // Try to detect monorepo
            let monorepo = detect_monorepo(&file_a)
                .or_else(|| detect_monorepo(&file_b));
            
            println!("Suggestion for {} ↔ {}", file_a.display(), file_b.display());
            println!();
            println!("  Similarity: {:.1}%", evidence.similarity * 100.0);
            
            if let Some(info) = monorepo {
                if let Some(suggestion) = suggest_refactoring(&file_a, &file_b, evidence.similarity, &info) {
                    println!();
                    println!("  📋 {}", suggestion.description);
                    println!("  📁 Move to: {}", suggestion.target_path);
                    println!("  📦 Then import: {}", suggestion.import_statement);
                    println!("  🎯 Priority: {}", suggestion.priority);
                    println!();
                    println!("  To file an issue:");
                    println!("  {}", suggestion.beads_command);
                } else {
                    println!();
                    println!("  No specific suggestion for this pattern.");
                    let cmd = generate_beads_command(&file_a, &file_b, evidence.similarity, None);
                    println!("  To file an issue: {}", cmd);
                }
            } else {
                println!();
                println!("  Not in a recognized monorepo.");
                println!("  Run from the monorepo root for specific suggestions.");
            }
            
            Ok(())
        }
    }
}

fn run_find(cmd: FindCommands, db: &Path) -> Result<(), Box<dyn std::error::Error>> {
    match cmd {
        FindCommands::Duplicates { path, threshold, extensions, max_files, monorepo, beads, smart } => {
            find_duplicates(&path, threshold, &extensions, max_files, monorepo, beads, smart, db)
        }
        FindCommands::DuplicateFunctions { path, threshold, max_files, exclude_tests, min_lines } => {
            find_duplicate_functions(&path, threshold, max_files, exclude_tests, min_lines)
        }
        FindCommands::DeadCode { symbol, path } => {
            let mut vt = VerifiedTriad::new(db)?;
            let evidence = vt.count_usages(&symbol, &path)?;
            
            if evidence.usage_count == 0 {
                println!("Found dead code: '{}'", symbol);
                println!("  No uses found in {}", path.display());
                println!("  Evidence ID: {}", evidence.id);
            } else {
                println!("'{}' is not dead code", symbol);
                println!("  Found {} uses", evidence.usage_count);
            }
            Ok(())
        }
        FindCommands::Orphans { path } => {
            find_orphans(&path)
        }
        FindCommands::DeadExports { module, scope } => {
            find_dead_exports_cmd(&module, &scope)
        }
        FindCommands::Drift { path, category, below_threshold, format } => {
            find_drift(&path, &category, below_threshold, &format)
        }
        FindCommands::AdoptionRatio { path, verbose, worst, format } => {
            show_adoption_ratio(&path, verbose, worst, &format)
        }
        FindCommands::Patterns { path, min_occurrences, format } => {
            mine_patterns_cmd(&path, min_occurrences, &format)
        }
    }
}

fn find_dead_exports_cmd(module: &Path, scope: &Path) -> Result<(), Box<dyn std::error::Error>> {
    use ground::computations::find_dead_exports;
    
    println!("Finding dead exports in {}", module.display());
    println!("  Search scope: {}", scope.display());
    println!();
    
    let report = find_dead_exports(module, scope)?;
    
    println!("Found {} exports in module", report.total_exports);
    println!();
    
    if report.dead_exports.is_empty() {
        println!("✓ All exports are used somewhere in the codebase.");
    } else {
        println!("⚠ Found {} unused exports:", report.dead_exports.len());
        println!();
        
        for (i, dead) in report.dead_exports.iter().enumerate() {
            println!("  {}. '{}' (line {})", i + 1, dead.name, dead.line);
            println!("     {}", truncate(&dead.context, 60));
        }
        
        println!();
        println!("These exports are not imported anywhere in {}.", scope.display());
        println!("Consider removing them or marking them as internal.");
        
        std::process::exit(1);
    }
    
    Ok(())
}

fn truncate(s: &str, max_len: usize) -> String {
    if s.len() <= max_len {
        s.to_string()
    } else {
        format!("{}...", &s[..max_len - 3])
    }
}

fn find_duplicates(
    path: &Path, 
    threshold: f64, 
    extensions: &str, 
    max_files: usize,
    monorepo_mode: bool,
    beads: bool,
    smart: bool,
    db: &Path,
) -> Result<(), Box<dyn std::error::Error>> {
    let extensions: Vec<&str> = extensions.split(',').map(|s| s.trim()).collect();
    
    // Detect monorepo
    let monorepo_info = if monorepo_mode {
        detect_monorepo(path)
    } else {
        None
    };
    
    if monorepo_mode {
        println!("┌────────────────────────────────────────────────────────┐");
        println!("│  Ground · Find Duplicates                              │");
        println!("│  CREATE SOMETHING Monorepo Mode                        │");
        println!("└────────────────────────────────────────────────────────┘");
        println!();
        
        if let Some(ref info) = monorepo_info {
            println!("📦 Monorepo: {} packages", info.packages.len());
        }
    } else {
        println!("Finding duplicates in {}", path.display());
    }
    
    println!("  Threshold: {:.0}%", threshold * 100.0);
    println!("  Extensions: {}", extensions.join(", "));
    println!();
    
    // Collect files
    let mut files: Vec<PathBuf> = Vec::new();
    collect_files(path, &extensions, 100, &mut files);
    
    if files.len() > max_files {
        println!("Found {} files, checking first {}", files.len(), max_files);
        files.truncate(max_files);
    } else {
        println!("Found {} files", files.len());
    }
    
    if files.is_empty() {
        println!("No files to check.");
        return Ok(());
    }
    
    // Group by size for efficiency
    let size_groups = group_by_size(&files);
    let total_comparisons: u64 = size_groups.values()
        .map(|g| (g.len() * (g.len().saturating_sub(1)) / 2) as u64)
        .sum();
    
    println!("Comparing {} pairs...", total_comparisons);
    println!();
    
    // Initialize ground
    std::fs::create_dir_all(db.parent().unwrap_or(Path::new(".")))?;
    let mut vt = VerifiedTriad::new(db)?;
    let exception_config = load_config(&Path::new(".ground/config.toml"));
    
    let mut violations: Vec<(PathBuf, PathBuf, f64, String)> = Vec::new();
    let mut acceptable = 0u64;
    
    for group in size_groups.values() {
        for i in 0..group.len() {
            for j in (i + 1)..group.len() {
                let file_a = &group[i];
                let file_b = &group[j];
                
                if let Ok(evidence) = vt.compute_similarity(file_a, file_b) {
                    let effective_threshold = if smart {
                        smart_threshold(file_a, file_b, threshold)
                    } else {
                        threshold
                    };
                    
                    if evidence.similarity >= effective_threshold {
                        let content_a = fs::read_to_string(file_a).unwrap_or_default();
                        let content_b = fs::read_to_string(file_b).unwrap_or_default();
                        
                        let exception = check_exception(
                            &exception_config,
                            file_a,
                            file_b,
                            Some(&content_a),
                            Some(&content_b),
                        );
                        
                        if exception.is_exception() {
                            acceptable += 1;
                        } else {
                            violations.push((
                                file_a.clone(),
                                file_b.clone(),
                                evidence.similarity,
                                evidence.id.to_string(),
                            ));
                        }
                    }
                }
            }
        }
    }
    
    // Sort by similarity
    violations.sort_by(|a, b| b.2.partial_cmp(&a.2).unwrap());
    
    // Report
    if violations.is_empty() {
        println!("No duplicates found.");
    } else {
        println!("Found {} duplicates:", violations.len());
        println!();
        
        let mut beads_commands: Vec<String> = Vec::new();
        
        for (i, (file_a, file_b, similarity, _evidence_id)) in violations.iter().enumerate() {
            println!("{}. {:.1}% similar", i + 1, similarity * 100.0);
            println!("   {} ↔ {}", file_a.display(), file_b.display());
            
            if let Some(ref info) = monorepo_info {
                if let Some(suggestion) = suggest_refactoring(file_a, file_b, *similarity, info) {
                    println!("   ┌──────────────────────────────────────────");
                    println!("   │ 📋 {}", suggestion.description);
                    println!("   │ 📁 {}", suggestion.target_path);
                    println!("   │ 🎯 {}", suggestion.priority);
                    println!("   └──────────────────────────────────────────");
                    beads_commands.push(suggestion.beads_command);
                }
            }
            
            println!();
        }
        
        if beads && !beads_commands.is_empty() {
            println!("─────────────────────────────────────────────");
            println!("Beads commands (copy to create issues):");
            println!();
            for cmd in &beads_commands {
                println!("{}", cmd);
            }
            println!();
        }
    }
    
    if acceptable > 0 {
        println!("{} findings filtered (config exceptions)", acceptable);
    }
    
    if !violations.is_empty() {
        std::process::exit(1);
    }
    
    Ok(())
}

fn find_duplicate_functions(
    path: &Path,
    threshold: f64,
    max_files: usize,
    exclude_tests: bool,
    min_lines: Option<usize>,
) -> Result<(), Box<dyn std::error::Error>> {
    use ground::computations::{analyze_function_dry_with_options, FunctionDryOptions};
    
    println!("Finding duplicate functions in {}", path.display());
    println!("  Threshold: {:.0}%", threshold * 100.0);
    if exclude_tests {
        println!("  Excluding test files");
    }
    if let Some(min) = min_lines {
        println!("  Min function lines: {}", min);
    }
    println!();
    
    let mut files: Vec<PathBuf> = Vec::new();
    collect_files(path, &["ts", "tsx", "js", "jsx"], 100, &mut files);
    
    if files.len() > max_files {
        files.truncate(max_files);
    }
    
    println!("Checking {} files...", files.len());
    println!();
    
    let options = FunctionDryOptions {
        exclude_tests,
        min_function_lines: min_lines,
        ..Default::default()
    };
    
    let report = analyze_function_dry_with_options(&files, threshold, &options)?;
    
    if report.duplicates.is_empty() {
        println!("No duplicate functions found.");
    } else {
        println!("Found {} duplicate functions:", report.duplicates.len());
        println!();
        
        // Group by function name
        let mut by_name: HashMap<String, Vec<_>> = HashMap::new();
        for dup in &report.duplicates {
            by_name.entry(dup.function_name.clone())
                .or_default()
                .push(dup);
        }
        
        for (i, (name, dups)) in by_name.iter().enumerate() {
            println!("{}. Function '{}' ({:.0}% similar)", i + 1, name, dups[0].similarity * 100.0);
            
            let mut files_set = std::collections::HashSet::new();
            for dup in dups {
                files_set.insert(&dup.file_a);
                files_set.insert(&dup.file_b);
            }
            
            for file in files_set {
                println!("   {}", file.display());
            }
            println!();
        }
        
        println!("Consider extracting these to a shared module.");
        std::process::exit(1);
    }
    
    Ok(())
}

fn collect_files(dir: &Path, extensions: &[&str], min_size: u64, files: &mut Vec<PathBuf>) {
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };
    
    for entry in entries.filter_map(|e| e.ok()) {
        let path = entry.path();
        
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            if name.starts_with('.') || 
               matches!(name, "node_modules" | "target" | "dist" | "build" | ".svelte-kit" | "__pycache__") {
                continue;
            }
        }
        
        if path.is_dir() {
            collect_files(&path, extensions, min_size, files);
        } else if path.is_file() {
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
            if !extensions.contains(&ext) {
                continue;
            }
            
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
            let bucket = meta.len() / 100 * 100;
            groups.entry(bucket).or_default().push(file.clone());
        }
    }
    
    groups.retain(|_, v| v.len() > 1);
    groups
}

fn find_orphans(path: &Path) -> Result<(), Box<dyn std::error::Error>> {
    use ground::computations::analyze_connectivity;
    
    println!("Finding orphaned modules in {}", path.display());
    println!();
    
    let mut files: Vec<PathBuf> = Vec::new();
    collect_files(path, &["ts", "tsx", "js", "jsx"], 0, &mut files);
    
    // Filter out test files, index files, and type declaration files
    let files: Vec<_> = files.into_iter()
        .filter(|f| {
            let name = f.file_name().and_then(|n| n.to_str()).unwrap_or("");
            !name.contains(".test.") && 
            !name.contains(".spec.") &&
            !name.ends_with(".d.ts") &&
            name != "index.ts" &&
            name != "index.js" &&
            !name.starts_with("+")  // SvelteKit route files
        })
        .collect();
    
    println!("Checking {} files...", files.len());
    println!();
    
    let mut orphans = Vec::new();
    let mut connected = 0;
    let mut errors = 0;
    
    for file in &files {
        match analyze_connectivity(file) {
            Ok(evidence) => {
                if evidence.total_connections() == 0 && evidence.architectural.is_none() {
                    orphans.push((file.clone(), evidence));
                } else {
                    connected += 1;
                }
            }
            Err(_) => {
                errors += 1;
            }
        }
    }
    
    if orphans.is_empty() {
        println!("No orphaned modules found.");
        println!("  {} modules are connected", connected);
        if errors > 0 {
            println!("  {} modules had errors during analysis", errors);
        }
    } else {
        println!("Found {} orphaned modules:", orphans.len());
        println!();
        
        for (i, (file, _evidence)) in orphans.iter().enumerate() {
            // Try to show relative path
            let display_path = file.strip_prefix(path).unwrap_or(file);
            println!("  {}. {}", i + 1, display_path.display());
        }
        
        println!();
        println!("Summary:");
        println!("  {} orphaned (nothing imports them)", orphans.len());
        println!("  {} connected", connected);
        if errors > 0 {
            println!("  {} errors", errors);
        }
        
        println!();
        println!("To verify an individual module:");
        println!("  ground check connections <path>");
        
        std::process::exit(1);
    }
    
    Ok(())
}

fn find_drift(path: &Path, category: &str, below_threshold: Option<f64>, format: &str) -> Result<(), Box<dyn std::error::Error>> {
    use ground::computations::patterns::{analyze_patterns, PatternConfig};
    
    println!("Finding design system drift in {}", path.display());
    println!();
    
    let config = PatternConfig::default();
    let report = analyze_patterns(path, &config)?;
    
    // Filter by category if specified
    let violations: Vec<_> = if category == "all" {
        report.violations.clone()
    } else {
        report.violations.iter()
            .filter(|v| v.category == category)
            .cloned()
            .collect()
    };
    
    // Filter by threshold if specified
    let _files_to_show: Vec<_> = if let Some(threshold) = below_threshold {
        report.file_evidence.iter()
            .filter(|e| e.metrics.adoption_ratio < threshold)
            .collect()
    } else {
        report.file_evidence.iter().collect()
    };
    
    if format == "json" {
        let output = serde_json::json!({
            "files_analyzed": report.files_analyzed,
            "overall_adoption_ratio": report.overall_adoption_ratio,
            "violations_count": violations.len(),
            "violations": violations,
            "worst_files": report.worst_files,
        });
        println!("{}", serde_json::to_string_pretty(&output)?);
        return Ok(());
    }
    
    // Text output
    if violations.is_empty() {
        println!("✓ No {} drift detected!", if category == "all" { "design system" } else { category });
        println!("  Overall adoption: {:.1}%", report.overall_adoption_ratio);
    } else {
        println!("⚠ Found {} {} violations:", violations.len(), if category == "all" { "design system" } else { category });
        println!();
        
        // Group by file
        let mut by_file: std::collections::HashMap<String, Vec<_>> = std::collections::HashMap::new();
        for v in &violations {
            by_file.entry(v.category.clone()).or_default().push(v);
        }
        
        for (cat, cat_violations) in &by_file {
            println!("  {} ({} violations):", cat, cat_violations.len());
            for v in cat_violations.iter().take(5) {
                println!("    • {}:{} - {} = {}", 
                    "file", v.line, v.property, v.value);
                if let Some(ref suggestion) = v.suggestion {
                    println!("      → {}", suggestion);
                }
            }
            if cat_violations.len() > 5 {
                println!("    ... and {} more", cat_violations.len() - 5);
            }
            println!();
        }
        
        println!("Summary:");
        println!("  Files analyzed: {}", report.files_analyzed);
        println!("  Overall adoption: {:.1}%", report.overall_adoption_ratio);
        println!("  Total violations: {}", violations.len());
        
        if !report.worst_files.is_empty() {
            println!();
            println!("Worst offending files:");
            for (file, ratio) in report.worst_files.iter().take(5) {
                println!("  • {} ({:.1}%)", file.display(), ratio);
            }
        }
    }
    
    Ok(())
}

fn show_adoption_ratio(path: &Path, verbose: bool, worst_count: usize, format: &str) -> Result<(), Box<dyn std::error::Error>> {
    use ground::computations::patterns::{analyze_patterns, PatternConfig, HealthStatus};
    
    println!("Calculating token adoption ratio for {}", path.display());
    println!();
    
    let config = PatternConfig::default();
    let report = analyze_patterns(path, &config)?;
    
    if format == "json" {
        let output = serde_json::json!({
            "files_analyzed": report.files_analyzed,
            "overall_adoption_ratio": report.overall_adoption_ratio,
            "overall_health": format!("{:?}", report.overall_health),
            "category_summary": report.category_summary,
            "worst_files": report.worst_files.iter().take(worst_count).collect::<Vec<_>>(),
        });
        println!("{}", serde_json::to_string_pretty(&output)?);
        return Ok(());
    }
    
    // Text output
    let health_icon = match report.overall_health {
        HealthStatus::Healthy => "✅",
        HealthStatus::Warning => "⚠️",
        HealthStatus::Critical => "❌",
    };
    
    println!("{} Overall Adoption: {:.1}%", health_icon, report.overall_adoption_ratio);
    println!();
    
    println!("Category Breakdown:");
    for (category, metrics) in &report.category_summary {
        let cat_icon = if metrics.ratio >= 90.0 { "✅" } 
            else if metrics.ratio >= 70.0 { "⚠️" } 
            else { "❌" };
        println!("  {} {}: {:.1}% ({}/{} compliant)", 
            cat_icon, category, metrics.ratio, metrics.compliant, metrics.total);
    }
    
    if verbose {
        println!();
        println!("Per-file breakdown:");
        for evidence in &report.file_evidence {
            if evidence.metrics.total_declarations > 0 {
                let icon = match evidence.metrics.health {
                    HealthStatus::Healthy => "✅",
                    HealthStatus::Warning => "⚠️",
                    HealthStatus::Critical => "❌",
                };
                println!("  {} {} - {:.1}%", icon, evidence.file.display(), evidence.metrics.adoption_ratio);
            }
        }
    }
    
    if !report.worst_files.is_empty() {
        println!();
        println!("Worst Offending Files (bottom {}):", worst_count);
        for (file, ratio) in report.worst_files.iter().take(worst_count) {
            let icon = if *ratio >= 90.0 { "✅" } 
                else if *ratio >= 70.0 { "⚠️" } 
                else { "❌" };
            println!("  {} {} - {:.1}%", icon, file.display(), ratio);
        }
    }
    
    println!();
    println!("Thresholds: 90%+ Healthy, 70-89% Warning, <70% Critical");
    println!("Files analyzed: {}", report.files_analyzed);
    
    Ok(())
}

fn mine_patterns_cmd(path: &Path, min_occurrences: usize, format: &str) -> Result<(), Box<dyn std::error::Error>> {
    use ground::computations::patterns::mine_patterns;
    
    println!("Mining patterns in {} (min occurrences: {})...", path.display(), min_occurrences);
    println!();
    
    let report = mine_patterns(path, min_occurrences)?;
    
    if format == "json" {
        println!("{}", serde_json::to_string_pretty(&report)?);
        return Ok(());
    }
    
    // Text output
    println!("Files analyzed: {}", report.files_analyzed);
    println!();
    
    if !report.discovered_patterns.is_empty() {
        println!("📊 Discovered Patterns (values used {}+ times):", min_occurrences);
        println!();
        
        for pattern in report.discovered_patterns.iter().take(15) {
            let tokenize = if pattern.should_tokenize { "🎯" } else { "  " };
            println!("  {} {} = {} ({} occurrences)", 
                tokenize, pattern.property, pattern.value, pattern.occurrences);
        }
        
        if report.discovered_patterns.len() > 15 {
            println!("  ... and {} more patterns", report.discovered_patterns.len() - 15);
        }
    }
    
    if !report.value_clusters.is_empty() {
        println!();
        println!("🔗 Value Clusters (similar values grouped):");
        println!();
        
        for cluster in report.value_clusters.iter().take(10) {
            println!("  {}: {} ({} occurrences, {} variants)",
                cluster.category, cluster.representative, 
                cluster.total_occurrences, cluster.values.len());
        }
    }
    
    if !report.suggested_tokens.is_empty() {
        println!();
        println!("💡 Suggested New Tokens:");
        println!();
        
        for suggestion in report.suggested_tokens.iter().take(10) {
            let confidence_bar = match suggestion.confidence {
                c if c >= 0.9 => "█████",
                c if c >= 0.7 => "████░",
                c if c >= 0.5 => "███░░",
                _ => "██░░░",
            };
            println!("  {} {}: {} ({} occurrences, confidence: {})",
                suggestion.category, suggestion.name, suggestion.value,
                suggestion.occurrences, confidence_bar);
        }
        
        println!();
        println!("To add a suggested token to Canon:");
        println!("  1. Add to packages/components/src/lib/styles/tokens.css");
        println!("  2. Update .ground/design-patterns.yml");
    }
    
    if report.discovered_patterns.is_empty() {
        println!("No patterns found with {} or more occurrences.", min_occurrences);
        println!("Try lowering --min-occurrences or scanning a larger directory.");
    }
    
    Ok(())
}
