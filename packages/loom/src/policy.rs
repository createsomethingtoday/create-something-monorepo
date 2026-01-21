//! Create Something Routing Policy
//!
//! Opinionated algorithms optimized for the Create Something monorepo:
//! - SvelteKit apps with Cloudflare Workers
//! - Ground-verified completions
//! - Canon compliance
//! - Multi-agent with Claude Code as primary

use crate::work::Task;
use crate::agents::{AgentProfile, Capabilities, CostModel, QualityMetrics};

// ─────────────────────────────────────────────────────────────────────────────
// Create Something Agent Profiles
// ─────────────────────────────────────────────────────────────────────────────

/// Claude Code is our primary agent - best for complex, multi-step work
pub fn claude_code_profile() -> AgentProfile {
    AgentProfile {
        id: "claude-code".to_string(),
        name: "Claude Code".to_string(),
        cli_path: "claude".to_string(),
        capabilities: Capabilities {
            planning: 0.98,      // Exceptional at architecture
            coding: 0.95,        // Strong implementation
            debugging: 0.92,     // Good at diagnosis
            ui: 0.85,            // Decent but not specialist
            docs: 0.95,          // Excellent documentation
            refactor: 0.95,      // Strong at DRY improvements
            testing: 0.90,       // Good test writing
            mcp: true,           // Full MCP support
            checkpoints: true,   // /rewind support
            git_aware: true,     // Understands git
            sub_agents: true,    // Can spawn work
            max_context: 200_000,
        },
        cost: CostModel {
            input_per_1k: 0.015,
            output_per_1k: 0.075,
            output_ratio: 3.0,
        },
        quality: QualityMetrics::default(),
        max_concurrent: 5,
        active: 0,
        available: true,
        last_used: None,
    }
}

/// Cursor is best for UI work - IDE integration helps with Svelte
pub fn cursor_profile() -> AgentProfile {
    AgentProfile {
        id: "cursor".to_string(),
        name: "Cursor".to_string(),
        cli_path: "cursor".to_string(),
        capabilities: Capabilities {
            planning: 0.75,      // Less strong at planning
            coding: 0.88,        // Good implementation
            debugging: 0.85,     // Good with IDE tools
            ui: 0.95,            // EXCELLENT - IDE preview helps
            docs: 0.70,          // Basic docs
            refactor: 0.80,      // Decent refactoring
            testing: 0.75,       // Basic testing
            mcp: true,
            checkpoints: false,
            git_aware: true,
            sub_agents: false,
            max_context: 128_000,
        },
        cost: CostModel {
            input_per_1k: 0.003,   // Uses Sonnet by default
            output_per_1k: 0.015,
            output_ratio: 2.5,
        },
        quality: QualityMetrics::default(),
        max_concurrent: 2,  // IDE-bound
        active: 0,
        available: true,
        last_used: None,
    }
}

/// Codex is good for API work and testing
pub fn codex_profile() -> AgentProfile {
    AgentProfile {
        id: "codex".to_string(),
        name: "Codex CLI".to_string(),
        cli_path: "codex".to_string(),
        capabilities: Capabilities {
            planning: 0.70,
            coding: 0.85,
            debugging: 0.80,
            ui: 0.65,            // Not great at UI
            docs: 0.75,
            refactor: 0.75,
            testing: 0.90,       // Strong at testing
            mcp: true,
            checkpoints: false,
            git_aware: true,
            sub_agents: false,
            max_context: 128_000,
        },
        cost: CostModel {
            input_per_1k: 0.005,
            output_per_1k: 0.015,
            output_ratio: 2.0,
        },
        quality: QualityMetrics::default(),
        max_concurrent: 3,
        active: 0,
        available: true,
        last_used: None,
    }
}

/// Gemini excels at large context - good for analysis across many files
pub fn gemini_profile() -> AgentProfile {
    AgentProfile {
        id: "gemini".to_string(),
        name: "Gemini CLI".to_string(),
        cli_path: "gemini".to_string(),
        capabilities: Capabilities {
            planning: 0.80,
            coding: 0.78,        // Weaker at implementation
            debugging: 0.75,
            ui: 0.70,
            docs: 0.85,          // Good documentation
            refactor: 0.75,
            testing: 0.72,
            mcp: true,
            checkpoints: false,
            git_aware: false,    // Less git-aware
            sub_agents: false,
            max_context: 1_000_000,  // 1M is the killer feature
        },
        cost: CostModel {
            input_per_1k: 0.00125,  // Very cheap
            output_per_1k: 0.005,
            output_ratio: 2.0,
        },
        quality: QualityMetrics::default(),
        max_concurrent: 3,
        active: 0,
        available: true,
        last_used: None,
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Something Task Classification
// ─────────────────────────────────────────────────────────────────────────────

/// Task complexity levels
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Complexity {
    /// Simple, mechanical task (rename, move, format)
    Trivial,
    /// Single-file change, clear scope
    Simple,
    /// Multi-file change, some planning needed
    Moderate,
    /// Architectural change, significant planning
    Complex,
    /// Cross-cutting concern, needs deep understanding
    Epic,
}

impl Complexity {
    /// Estimate complexity from task content
    pub fn estimate(task: &Task) -> Self {
        let title_lower = task.title.to_lowercase();
        let desc_lower = task.description.as_ref()
            .map(|d| d.to_lowercase())
            .unwrap_or_default();
        
        // Epic indicators
        if title_lower.contains("refactor")
            || title_lower.contains("migrate")
            || title_lower.contains("redesign")
            || task.labels.iter().any(|l| l == "epic" || l == "architecture")
        {
            return Complexity::Epic;
        }
        
        // Complex indicators
        if title_lower.contains("implement")
            || title_lower.contains("feature")
            || title_lower.contains("system")
            || task.labels.iter().any(|l| l == "feature" || l == "planning")
        {
            return Complexity::Complex;
        }
        
        // Moderate indicators
        if title_lower.contains("add")
            || title_lower.contains("update")
            || title_lower.contains("improve")
            || task.labels.len() > 2
        {
            return Complexity::Moderate;
        }
        
        // Simple indicators
        if title_lower.contains("fix")
            || title_lower.contains("bug")
            || title_lower.contains("typo")
        {
            return Complexity::Simple;
        }
        
        // Default to moderate
        Complexity::Moderate
    }
    
    /// Recommended agent for this complexity
    pub fn recommended_agent(&self) -> &'static str {
        match self {
            Complexity::Trivial => "gemini",      // Cheap for simple work
            Complexity::Simple => "codex",        // Good for quick fixes
            Complexity::Moderate => "cursor",     // IDE helps with multi-file
            Complexity::Complex => "claude-code", // Best for complex work
            Complexity::Epic => "claude-code",    // Only Claude for epics
        }
    }
    
    /// Minimum quality score required
    /// Note: New agents start with 50% default, so we're lenient initially
    pub fn quality_threshold(&self) -> f64 {
        match self {
            Complexity::Trivial => 0.3,
            Complexity::Simple => 0.4,
            Complexity::Moderate => 0.45,
            Complexity::Complex => 0.48,  // Allow new agents (50% default)
            Complexity::Epic => 0.50,      // Must have at least neutral history
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Something Label Routing
// ─────────────────────────────────────────────────────────────────────────────

/// Route based on Create Something-specific labels
pub fn route_by_label(label: &str) -> Option<&'static str> {
    match label.to_lowercase().as_str() {
        // UI/Frontend -> Cursor (IDE integration)
        "ui" | "svelte" | "frontend" | "css" | "tailwind" | "components" => Some("cursor"),
        
        // Planning/Architecture -> Claude Code (best reasoning)
        "planning" | "architecture" | "design" | "prd" | "spec" => Some("claude-code"),
        
        // Backend/API -> Codex (fast, good for APIs)
        "api" | "backend" | "endpoint" | "rest" | "graphql" => Some("codex"),
        
        // Cloudflare Workers -> Claude Code (understands edge patterns)
        "workers" | "cloudflare" | "edge" | "durable-objects" => Some("claude-code"),
        
        // Testing -> Codex (strong at tests)
        "test" | "testing" | "vitest" | "playwright" => Some("codex"),
        
        // Refactoring/DRY -> Claude Code (needs understanding)
        "refactor" | "dry" | "cleanup" | "canon" => Some("claude-code"),
        
        // Documentation -> Claude Code (best writing)
        "docs" | "readme" | "documentation" => Some("claude-code"),
        
        // Large file analysis -> Gemini (1M context)
        "analysis" | "audit" | "review" | "large" => Some("gemini"),
        
        // Debug -> Claude Code (best at diagnosis)
        "debug" | "debugging" | "investigate" => Some("claude-code"),
        
        // Ground verification -> Claude Code (needs to run Ground)
        "ground" | "verify" | "evidence" => Some("claude-code"),
        
        // Package-specific routing
        "io" | "agency" | "tend" => Some("cursor"),  // UI packages
        "loom" => Some("claude-code"),     // Rust packages (ground already matched above)
        "webflow-mcp" | "community-mcp" => Some("claude-code"),  // MCP servers
        
        _ => None,
    }
}

/// Get all labels that should trigger Ground verification
pub fn verification_labels() -> &'static [&'static str] {
    &[
        "dry", "refactor", "cleanup", "dead-code", "orphan",
        "duplicates", "canon", "ground", "verify"
    ]
}

/// Check if task requires Ground verification
pub fn requires_verification(task: &Task) -> bool {
    let verify_labels = verification_labels();
    task.labels.iter().any(|l| verify_labels.contains(&l.as_str()))
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Something Scoring Algorithm
// ─────────────────────────────────────────────────────────────────────────────

/// Score an agent for a task using Create Something's priorities:
/// 1. Quality first (we want things done right)
/// 2. Capability match (right tool for the job)
/// 3. Cost (prefer cheaper when quality is equal)
/// 4. Availability (load balance)
pub fn score_agent(profile: &AgentProfile, task: &Task) -> f64 {
    let complexity = Complexity::estimate(task);
    
    // Check quality threshold - don't route complex work to weak agents
    let quality = profile.quality.success_rate();
    if quality < complexity.quality_threshold() {
        return 0.0; // Disqualified
    }
    
    // Label-based routing (strong signal)
    let mut label_bonus = 0.0;
    for label in &task.labels {
        if let Some(preferred) = route_by_label(label) {
            if profile.id == preferred {
                label_bonus += 0.3; // Big boost for label match
            }
        }
    }
    
    // Capability score
    let capability_score = task.labels.iter()
        .map(|l| profile.capabilities.score_for(l) as f64)
        .filter(|&s| s > 0.5)
        .sum::<f64>()
        / task.labels.len().max(1) as f64;
    
    // Complexity match
    let complexity_match = if profile.id == complexity.recommended_agent() {
        0.2
    } else {
        0.0
    };
    
    // Quality score (learned from history)
    let quality_score = quality * 0.3;
    
    // Cost efficiency (inverted, normalized)
    // For Create Something, we prefer quality over cost
    let estimated_cost = profile.cost.estimate(estimate_tokens(task));
    let cost_score = 0.1 / (1.0 + estimated_cost);
    
    // Availability
    let availability = if profile.has_capacity() { 0.1 } else { 0.0 };
    
    // Final weighted score
    // Quality and capability are heavily weighted
    (capability_score * 0.30) +
    (label_bonus) +           // Can add up to 0.3+ for multiple label matches
    (complexity_match) +      // 0.2 for complexity match
    (quality_score) +         // Up to 0.3 for quality
    (cost_score) +            // Small factor
    (availability)            // Small factor
}

/// Estimate tokens for a task
fn estimate_tokens(task: &Task) -> u64 {
    let base = 5000u64;
    let title = task.title.len() as u64 * 2;
    let desc = task.description.as_ref()
        .map(|d| d.len() as u64 * 2)
        .unwrap_or(0);
    
    // Complexity multiplier
    let multiplier = match Complexity::estimate(task) {
        Complexity::Trivial => 1,
        Complexity::Simple => 2,
        Complexity::Moderate => 4,
        Complexity::Complex => 8,
        Complexity::Epic => 16,
    };
    
    (base + title + desc) * multiplier
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Something Formulas
// ─────────────────────────────────────────────────────────────────────────────

use crate::formulas::{Formula, QualityTier, Step, Variable, SuccessCriteria};

/// Create Something's opinionated feature formula
pub fn cs_feature_formula() -> Formula {
    Formula {
        name: "cs-feature".to_string(),
        description: "Create Something feature implementation with Canon compliance".to_string(),
        quality: QualityTier::Premium,
        agent: Some("claude-code".to_string()),
        variables: vec![
            Variable {
                name: "feature_name".to_string(),
                description: "Name of the feature".to_string(),
                required: true,
                default: None,
            },
            Variable {
                name: "package".to_string(),
                description: "Package to implement in (io, agency, tend, etc.)".to_string(),
                required: true,
                default: None,
            },
        ],
        steps: vec![
            Step {
                id: "verify-exports".to_string(),
                title: "Verify component availability".to_string(),
                description: "Use 'pnpm exports' to verify imports exist before using them".to_string(),
                agent: None,
                labels: vec!["planning".to_string()],
                prompt: Some("Before implementing {{feature_name}}, verify all imports using 'pnpm exports {{package}}'".to_string()),
                verify: Some("pnpm exports {{package}}".to_string()),
                checkpoint: true,
                parallel: false,
            },
            Step {
                id: "plan".to_string(),
                title: "Plan implementation".to_string(),
                description: "Design the feature following Canon standards".to_string(),
                agent: Some("claude-code".to_string()),
                labels: vec!["planning".to_string()],
                prompt: None,
                verify: None,
                checkpoint: true,
                parallel: false,
            },
            Step {
                id: "implement".to_string(),
                title: "Implement feature".to_string(),
                description: "Build the feature in {{package}}".to_string(),
                agent: None,
                labels: vec!["coding".to_string()],
                prompt: None,
                verify: Some("pnpm check".to_string()),
                checkpoint: true,
                parallel: false,
            },
            Step {
                id: "canon-check".to_string(),
                title: "Canon compliance check".to_string(),
                description: "Verify adherence to Canon standards".to_string(),
                agent: None,
                labels: vec!["canon".to_string()],
                prompt: None,
                verify: Some("pnpm lint".to_string()),
                checkpoint: false,
                parallel: false,
            },
            Step {
                id: "ground-verify".to_string(),
                title: "Ground verification".to_string(),
                description: "Run Ground to verify no DRY violations".to_string(),
                agent: None,
                labels: vec!["ground".to_string()],
                prompt: None,
                verify: Some("ground analyze packages/{{package}}/src".to_string()),
                checkpoint: false,
                parallel: false,
            },
        ],
        success_criteria: SuccessCriteria {
            criteria: vec![
                "Feature works as specified".to_string(),
                "Canon compliant (no linter errors)".to_string(),
                "Ground verification passed".to_string(),
                "No hallucinated imports".to_string(),
            ],
            verify_commands: vec![
                "pnpm check".to_string(),
                "pnpm lint".to_string(),
                "pnpm test".to_string(),
            ],
            ground_checks: vec![
                "duplicates".to_string(),
                "dead_exports".to_string(),
            ],
        },
        labels: vec!["feature".to_string(), "canon".to_string()],
        estimated_tokens: 40000,
    }
}

/// Create Something's Svelte component formula
pub fn cs_component_formula() -> Formula {
    Formula {
        name: "cs-component".to_string(),
        description: "Create a Svelte component following Create Something patterns".to_string(),
        quality: QualityTier::Standard,
        agent: Some("cursor".to_string()), // Cursor for UI work
        variables: vec![
            Variable {
                name: "component_name".to_string(),
                description: "Name of the component (PascalCase)".to_string(),
                required: true,
                default: None,
            },
            Variable {
                name: "package".to_string(),
                description: "Package (components, io, agency)".to_string(),
                required: false,
                default: Some("components".to_string()),
            },
        ],
        steps: vec![
            Step {
                id: "check-existing".to_string(),
                title: "Check for existing components".to_string(),
                description: "Verify component doesn't already exist".to_string(),
                agent: None,
                labels: vec![],
                prompt: Some("Check if {{component_name}} exists in @create-something/{{package}}".to_string()),
                verify: Some("pnpm exports {{package}} {{component_name}}".to_string()),
                checkpoint: false,
                parallel: false,
            },
            Step {
                id: "implement".to_string(),
                title: "Create component".to_string(),
                description: "Implement the Svelte component".to_string(),
                agent: Some("cursor".to_string()),
                labels: vec!["ui".to_string(), "svelte".to_string()],
                prompt: None,
                verify: Some("pnpm check".to_string()),
                checkpoint: true,
                parallel: false,
            },
            Step {
                id: "export".to_string(),
                title: "Add to exports".to_string(),
                description: "Export from package index".to_string(),
                agent: None,
                labels: vec![],
                prompt: None,
                verify: Some("pnpm exports {{package}} {{component_name}}".to_string()),
                checkpoint: false,
                parallel: false,
            },
        ],
        success_criteria: SuccessCriteria {
            criteria: vec![
                "Component renders correctly".to_string(),
                "Exported from package".to_string(),
                "Props typed correctly".to_string(),
            ],
            verify_commands: vec!["pnpm check".to_string()],
            ground_checks: vec![],
        },
        labels: vec!["ui".to_string(), "svelte".to_string(), "components".to_string()],
        estimated_tokens: 15000,
    }
}

/// Create Something's refactor formula with Ground verification
pub fn cs_refactor_formula() -> Formula {
    Formula {
        name: "cs-refactor".to_string(),
        description: "Refactor with Ground verification (DRY, dead code, orphans)".to_string(),
        quality: QualityTier::Premium,
        agent: Some("claude-code".to_string()),
        variables: vec![
            Variable {
                name: "target".to_string(),
                description: "File or directory to refactor".to_string(),
                required: true,
                default: None,
            },
            Variable {
                name: "goal".to_string(),
                description: "What to improve (dry, cleanup, organize)".to_string(),
                required: true,
                default: None,
            },
        ],
        steps: vec![
            Step {
                id: "baseline".to_string(),
                title: "Establish baseline".to_string(),
                description: "Run Ground to see current issues".to_string(),
                agent: None,
                labels: vec!["ground".to_string()],
                prompt: Some("Run ground analyze on {{target}} to establish baseline".to_string()),
                verify: None,
                checkpoint: true,
                parallel: false,
            },
            Step {
                id: "plan".to_string(),
                title: "Plan refactoring".to_string(),
                description: "Design safe refactoring approach".to_string(),
                agent: Some("claude-code".to_string()),
                labels: vec!["planning".to_string()],
                prompt: None,
                verify: None,
                checkpoint: true,
                parallel: false,
            },
            Step {
                id: "refactor".to_string(),
                title: "Apply changes".to_string(),
                description: "Make the refactoring changes".to_string(),
                agent: None,
                labels: vec!["refactor".to_string()],
                prompt: None,
                verify: Some("pnpm check && pnpm test".to_string()),
                checkpoint: true,
                parallel: false,
            },
            Step {
                id: "verify-improvement".to_string(),
                title: "Verify improvement".to_string(),
                description: "Run Ground diff to verify improvement".to_string(),
                agent: None,
                labels: vec!["ground".to_string(), "verify".to_string()],
                prompt: None,
                verify: Some("ground diff {{target}}".to_string()),
                checkpoint: false,
                parallel: false,
            },
        ],
        success_criteria: SuccessCriteria {
            criteria: vec![
                "Ground shows improvement".to_string(),
                "No regressions".to_string(),
                "Tests pass".to_string(),
            ],
            verify_commands: vec![
                "pnpm check".to_string(),
                "pnpm test".to_string(),
            ],
            ground_checks: vec![
                "duplicates".to_string(),
                "dead_exports".to_string(),
                "orphans".to_string(),
            ],
        },
        labels: vec!["refactor".to_string(), "dry".to_string(), "ground".to_string()],
        estimated_tokens: 30000,
    }
}

/// Create Something's Worker formula
pub fn cs_worker_formula() -> Formula {
    Formula {
        name: "cs-worker".to_string(),
        description: "Create a Cloudflare Worker with proper environment handling".to_string(),
        quality: QualityTier::Premium,
        agent: Some("claude-code".to_string()),
        variables: vec![
            Variable {
                name: "worker_name".to_string(),
                description: "Name of the worker".to_string(),
                required: true,
                default: None,
            },
            Variable {
                name: "package".to_string(),
                description: "Parent package".to_string(),
                required: false,
                default: Some("templates-platform".to_string()),
            },
        ],
        steps: vec![
            Step {
                id: "scaffold".to_string(),
                title: "Scaffold worker".to_string(),
                description: "Create worker structure".to_string(),
                agent: None,
                labels: vec!["workers".to_string()],
                prompt: None,
                verify: None,
                checkpoint: true,
                parallel: false,
            },
            Step {
                id: "implement".to_string(),
                title: "Implement handler".to_string(),
                description: "Write the worker logic".to_string(),
                agent: Some("claude-code".to_string()),
                labels: vec!["workers".to_string(), "coding".to_string()],
                prompt: None,
                verify: Some("pnpm check".to_string()),
                checkpoint: true,
                parallel: false,
            },
            Step {
                id: "env-check".to_string(),
                title: "Environment safety check".to_string(),
                description: "Verify no Node.js APIs leak into Worker".to_string(),
                agent: None,
                labels: vec!["workers".to_string(), "ground".to_string()],
                prompt: None,
                verify: Some("ground check-environment packages/{{package}}/workers/{{worker_name}}/src/index.ts".to_string()),
                checkpoint: false,
                parallel: false,
            },
        ],
        success_criteria: SuccessCriteria {
            criteria: vec![
                "Worker deploys".to_string(),
                "No environment safety issues".to_string(),
                "Handles edge cases".to_string(),
            ],
            verify_commands: vec!["pnpm check".to_string()],
            ground_checks: vec!["environment".to_string()],
        },
        labels: vec!["workers".to_string(), "cloudflare".to_string()],
        estimated_tokens: 25000,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::work::{Task, Status};
    use chrono::Utc;
    
    fn make_task(title: &str, labels: Vec<&str>) -> Task {
        Task {
            id: "test-1".to_string(),
            title: title.to_string(),
            description: None,
            status: Status::Ready,
            priority: Default::default(),
            agent: None,
            labels: labels.into_iter().map(String::from).collect(),
            parent: None,
            evidence: None,
            actual_cost_usd: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }
    
    #[test]
    fn test_complexity_estimation() {
        assert_eq!(
            Complexity::estimate(&make_task("Fix typo in readme", vec![])),
            Complexity::Simple
        );
        
        assert_eq!(
            Complexity::estimate(&make_task("Implement dark mode", vec!["feature"])),
            Complexity::Complex
        );
        
        assert_eq!(
            Complexity::estimate(&make_task("Refactor authentication system", vec![])),
            Complexity::Epic
        );
    }
    
    #[test]
    fn test_label_routing() {
        assert_eq!(route_by_label("svelte"), Some("cursor"));
        assert_eq!(route_by_label("planning"), Some("claude-code"));
        assert_eq!(route_by_label("testing"), Some("codex"));
        assert_eq!(route_by_label("workers"), Some("claude-code"));
    }
    
    #[test]
    fn test_verification_required() {
        let task = make_task("Fix bug", vec!["bug"]);
        assert!(!requires_verification(&task));
        
        let task = make_task("Refactor module", vec!["refactor", "dry"]);
        assert!(requires_verification(&task));
    }
    
    #[test]
    fn test_scoring() {
        let claude = claude_code_profile();
        let cursor = cursor_profile();
        
        // Planning task should favor Claude
        let planning_task = make_task("Plan authentication", vec!["planning", "architecture"]);
        let claude_score = score_agent(&claude, &planning_task);
        let cursor_score = score_agent(&cursor, &planning_task);
        assert!(claude_score > cursor_score, "Claude should score higher for planning");
        
        // UI task should favor Cursor
        let ui_task = make_task("Build login form", vec!["ui", "svelte"]);
        let claude_score = score_agent(&claude, &ui_task);
        let cursor_score = score_agent(&cursor, &ui_task);
        assert!(cursor_score > claude_score, "Cursor should score higher for UI");
    }
}
