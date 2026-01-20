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
use ground::{VerifiedTriad, TriadThresholds};
use ground::exceptions::{ExceptionConfig, ExceptionMatch, check_exception, load_config, smart_threshold};
use ground::computations::{analyze_function_dry, FunctionDryReport};
use ground::monorepo::{detect_monorepo, suggest_refactoring, generate_beads_command, MonorepoInfo, PackageType};

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
        FindCommands::Orphans { path: _ } => {
            println!("Finding orphans is not yet implemented.");
            println!("Use: ground check connections <module> to check individual modules.");
            Ok(())
        }
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
        
        for (i, (file_a, file_b, similarity, evidence_id)) in violations.iter().enumerate() {
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
