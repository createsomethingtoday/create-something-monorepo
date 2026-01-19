//! Verified Triad CLI
//!
//! Usage:
//!   vt init                              Initialize registry in current directory
//!   vt compute similarity <a> <b>        Compute similarity between files
//!   vt compute usages <symbol> [path]    Count usages of a symbol
//!   vt compute connectivity <module>     Analyze module connectivity
//!   vt claim dry <a> <b> <reason>        Claim DRY violation (requires prior compute)
//!   vt claim existence <symbol> <reason> Claim no existence (requires prior compute)
//!   vt claim connectivity <module> <reason> Claim disconnection (requires prior compute)
//!   vt status                            Show registry status
//!   vt config init                       Generate default config file

use std::path::PathBuf;
use clap::{Parser, Subcommand};
use verified_triad::{VerifiedTriad, TriadThresholds};
use verified_triad::exceptions::ExceptionConfig;

#[derive(Parser)]
#[command(name = "vt")]
#[command(about = "Verified Triad - Computation-constrained synthesis for AI code analysis")]
#[command(version)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
    
    /// Path to registry database
    #[arg(long, default_value = ".vt/registry.db")]
    db: PathBuf,
}

#[derive(Subcommand)]
enum Commands {
    /// Initialize Verified Triad in current directory
    Init,
    
    /// Compute relationships (required before claims)
    #[command(subcommand)]
    Compute(ComputeCommands),
    
    /// Make claims (requires prior computation)
    #[command(subcommand)]
    Claim(ClaimCommands),
    
    /// Show registry status
    Status,
    
    /// Configure thresholds and exceptions
    #[command(subcommand)]
    Config(ConfigCommands),
}

#[derive(Subcommand)]
enum ConfigCommands {
    /// Generate default config file
    Init {
        /// Output path for config file
        #[arg(long, default_value = ".vt/config.toml")]
        output: PathBuf,
    },
    
    /// Show current config
    Show {
        /// Path to config file
        #[arg(long, default_value = ".vt/config.toml")]
        config: PathBuf,
    },
}

#[derive(Subcommand)]
enum ComputeCommands {
    /// Compute similarity between two files
    Similarity {
        /// First file
        file_a: PathBuf,
        /// Second file
        file_b: PathBuf,
    },
    
    /// Count usages of a symbol
    Usages {
        /// Symbol to search for
        symbol: String,
        /// Path to search in (default: current directory)
        #[arg(default_value = ".")]
        path: PathBuf,
    },
    
    /// Analyze module connectivity
    Connectivity {
        /// Module path
        module: PathBuf,
    },
}

#[derive(Subcommand)]
enum ClaimCommands {
    /// Claim a DRY violation
    Dry {
        /// First file
        file_a: PathBuf,
        /// Second file
        file_b: PathBuf,
        /// Reason for the claim
        reason: String,
    },
    
    /// Claim something doesn't earn existence
    Existence {
        /// Symbol that doesn't earn existence
        symbol: String,
        /// Reason for the claim
        reason: String,
    },
    
    /// Claim a module is disconnected
    Connectivity {
        /// Module path
        module: PathBuf,
        /// Reason for the claim
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
            // Create .vt directory
            std::fs::create_dir_all(".vt")?;
            
            // Initialize registry
            let _vt = VerifiedTriad::new(&cli.db)?;
            
            println!("✓ Initialized Verified Triad registry at {}", cli.db.display());
            println!("\nNext steps:");
            println!("  vt compute similarity <file_a> <file_b>  # Compute before claiming");
            println!("  vt claim dry <file_a> <file_b> \"reason\"  # Make grounded claim");
            Ok(())
        }
        
        Commands::Compute(cmd) => {
            let mut vt = VerifiedTriad::new(&cli.db)?;
            
            match cmd {
                ComputeCommands::Similarity { file_a, file_b } => {
                    let evidence = vt.compute_similarity(&file_a, &file_b)?;
                    
                    println!("✓ Computed similarity");
                    println!("  Files: {} ↔ {}", file_a.display(), file_b.display());
                    println!("  Similarity: {:.2}%", evidence.similarity * 100.0);
                    println!("  Token overlap: {:.2}%", evidence.token_overlap * 100.0);
                    println!("  Line similarity: {:.2}%", evidence.line_similarity * 100.0);
                    if let Some(ast_sim) = evidence.ast_similarity {
                        println!("  AST similarity: {:.2}%", ast_sim * 100.0);
                    }
                    println!("  Evidence ID: {}", evidence.id);
                    
                    let threshold = vt.thresholds().dry_similarity;
                    if evidence.similarity >= threshold {
                        println!("\n  → Meets DRY threshold ({:.0}%), claim allowed", threshold * 100.0);
                    } else {
                        println!("\n  → Below DRY threshold ({:.0}%), claim would be blocked", threshold * 100.0);
                    }
                }
                
                ComputeCommands::Usages { symbol, path } => {
                    let evidence = vt.count_usages(&symbol, &path)?;
                    
                    println!("✓ Computed usages");
                    println!("  Symbol: {}", symbol);
                    println!("  Search path: {}", path.display());
                    println!("  Usage count: {}", evidence.usage_count);
                    println!("  Evidence ID: {}", evidence.id);
                    
                    if !evidence.locations.is_empty() {
                        println!("\n  Locations:");
                        for loc in evidence.locations.iter().take(5) {
                            println!("    {}:{} - {}", loc.file.display(), loc.line, loc.context);
                        }
                        if evidence.locations.len() > 5 {
                            println!("    ... and {} more", evidence.locations.len() - 5);
                        }
                    }
                    
                    let min = vt.thresholds().rams_min_usage;
                    if evidence.usage_count < min {
                        println!("\n  → Below minimum usage ({}), \"no existence\" claim allowed", min);
                    } else {
                        println!("\n  → Meets minimum usage ({}), \"no existence\" claim would be blocked", min);
                    }
                }
                
                ComputeCommands::Connectivity { module } => {
                    let evidence = vt.analyze_connectivity(&module)?;
                    
                    println!("✓ Computed connectivity");
                    println!("  Module: {}", module.display());
                    println!("  Connected: {}", evidence.is_connected);
                    println!("  Incoming: {} (imported by {} files)", evidence.incoming_connections, evidence.imported_by.len());
                    println!("  Outgoing: {} (imports {} files)", evidence.outgoing_connections, evidence.imports.len());
                    println!("  Evidence ID: {}", evidence.id);
                    
                    let min = vt.thresholds().heidegger_min_connections;
                    if evidence.total_connections() < min {
                        println!("\n  → Below minimum connections ({}), \"disconnected\" claim allowed", min);
                    } else {
                        println!("\n  → Meets minimum connections ({}), \"disconnected\" claim would be blocked", min);
                    }
                }
            }
            
            Ok(())
        }
        
        Commands::Claim(cmd) => {
            let vt = VerifiedTriad::new(&cli.db)?;
            
            match cmd {
                ClaimCommands::Dry { file_a, file_b, reason } => {
                    match vt.claim_dry_violation(&file_a, &file_b, &reason) {
                        Ok(claim) => {
                            println!("✓ Claim ALLOWED (grounded in computation)");
                            println!("  Claim ID: {}", claim.id);
                            println!("  Files: {} ↔ {}", file_a.display(), file_b.display());
                            println!("  Similarity: {:.2}%", claim.similarity * 100.0);
                            println!("  Reason: {}", claim.reason);
                            println!("  Evidence: {}", claim.evidence_id);
                        }
                        Err(e) => {
                            println!("✗ Claim BLOCKED");
                            println!("  {}", e);
                            std::process::exit(1);
                        }
                    }
                }
                
                ClaimCommands::Existence { symbol, reason } => {
                    match vt.claim_no_existence(&symbol, &reason) {
                        Ok(claim) => {
                            println!("✓ Claim ALLOWED (grounded in computation)");
                            println!("  Claim ID: {}", claim.id);
                            println!("  Symbol: {}", claim.symbol);
                            println!("  Usage count: {}", claim.usage_count);
                            println!("  Reason: {}", claim.reason);
                            println!("  Evidence: {}", claim.evidence_id);
                        }
                        Err(e) => {
                            println!("✗ Claim BLOCKED");
                            println!("  {}", e);
                            std::process::exit(1);
                        }
                    }
                }
                
                ClaimCommands::Connectivity { module, reason } => {
                    match vt.claim_disconnection(&module, &reason) {
                        Ok(claim) => {
                            println!("✓ Claim ALLOWED (grounded in computation)");
                            println!("  Claim ID: {}", claim.id);
                            println!("  Module: {}", claim.module_path.display());
                            println!("  Connections: {}", claim.connection_count);
                            println!("  Reason: {}", claim.reason);
                            println!("  Evidence: {}", claim.evidence_id);
                        }
                        Err(e) => {
                            println!("✗ Claim BLOCKED");
                            println!("  {}", e);
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
            
            println!("Verified Triad Status");
            println!("=====================");
            println!("\nRegistry: {}", cli.db.display());
            println!("\nThresholds:");
            println!("  DRY similarity: {:.0}%", thresholds.dry_similarity * 100.0);
            println!("  Min usages (Rams): {}", thresholds.rams_min_usage);
            println!("  Min connections (Heidegger): {}", thresholds.heidegger_min_connections);
            
            Ok(())
        }
        
        Commands::Config(cmd) => {
            match cmd {
                ConfigCommands::Init { output } => {
                    // Create parent directory if needed
                    if let Some(parent) = output.parent() {
                        std::fs::create_dir_all(parent)?;
                    }
                    
                    // Generate default config
                    let config = ExceptionConfig::default();
                    let toml_content = generate_config_toml(&config);
                    
                    std::fs::write(&output, toml_content)?;
                    
                    println!("✓ Generated config file: {}", output.display());
                    println!("\nDefault exception patterns:");
                    println!("  - {} ignore paths", config.ignore_paths.len());
                    println!("  - {} ignore files", config.ignore_files.len());
                    println!("  - {} acceptable patterns", config.acceptable_patterns.len());
                    println!("  - Boilerplate max lines: {}", config.boilerplate_max_lines);
                    println!("  - Small file max bytes: {}", config.small_file_max_bytes);
                    println!("\nEdit the file to customize for your project.");
                }
                
                ConfigCommands::Show { config } => {
                    let cfg = verified_triad::exceptions::load_config(&config);
                    
                    println!("Verified Triad Config");
                    println!("=====================");
                    if config.exists() {
                        println!("Source: {}", config.display());
                    } else {
                        println!("Source: defaults (no config file)");
                    }
                    println!("\nIgnore Paths:");
                    for path in &cfg.ignore_paths {
                        println!("  - {}", path);
                    }
                    println!("\nIgnore Files:");
                    for file in &cfg.ignore_files {
                        println!("  - {}", file);
                    }
                    println!("\nAcceptable Patterns:");
                    for pattern in &cfg.acceptable_patterns {
                        println!("  - {}", pattern);
                    }
                    println!("\nThresholds:");
                    println!("  Boilerplate max lines: {}", cfg.boilerplate_max_lines);
                    println!("  Small file max bytes: {}", cfg.small_file_max_bytes);
                }
            }
            
            Ok(())
        }
    }
}

fn generate_config_toml(config: &ExceptionConfig) -> String {
    let mut out = String::new();
    
    out.push_str("# Verified Triad Exception Config\n");
    out.push_str("# Customize to reduce false positives in DRY audits\n\n");
    
    out.push_str("# Path patterns to ignore (glob syntax)\n");
    out.push_str("ignore_paths = [\n");
    for path in &config.ignore_paths {
        out.push_str(&format!("    \"{}\",\n", path));
    }
    out.push_str("]\n\n");
    
    out.push_str("# Specific filenames to ignore\n");
    out.push_str("ignore_files = [\n");
    for file in &config.ignore_files {
        out.push_str(&format!("    \"{}\",\n", file));
    }
    out.push_str("]\n\n");
    
    out.push_str("# Acceptable similar patterns (files similar by design)\n");
    out.push_str("# Format: \"PartA:PartB\" matches files containing both parts\n");
    out.push_str("acceptable_patterns = [\n");
    for pattern in &config.acceptable_patterns {
        out.push_str(&format!("    \"{}\",\n", pattern));
    }
    out.push_str("]\n\n");
    
    out.push_str("# Files with <= this many lines are considered boilerplate\n");
    out.push_str(&format!("boilerplate_max_lines = {}\n\n", config.boilerplate_max_lines));
    
    out.push_str("# Files with <= this many bytes are considered small\n");
    out.push_str(&format!("small_file_max_bytes = {}\n", config.small_file_max_bytes));
    
    out
}
