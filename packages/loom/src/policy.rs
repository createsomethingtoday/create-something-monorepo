//! Create Something Routing Policy
//!
//! Opinionated algorithms optimized for the Create Something monorepo:
//! - SvelteKit apps with Cloudflare Workers
//! - Ground-verified completions
//! - Canon compliance
//! - Multi-agent with Codex as primary

use crate::work::Task;
use crate::agents::AgentProfile;

// ─────────────────────────────────────────────────────────────────────────────
// Create Something Agent Profiles
// ─────────────────────────────────────────────────────────────────────────────

/// Cursor is best for UI work - IDE integration helps with Svelte.
/// Single source of truth: default_models.toml (via AgentProfile::cursor())
pub fn cursor_profile() -> AgentProfile {
    AgentProfile::cursor()
}

/// Codex is good for API work and testing.
/// Single source of truth: default_models.toml (via AgentProfile::codex())
pub fn codex_profile() -> AgentProfile {
    AgentProfile::codex()
}

/// Gemini excels at large context - good for analysis across many files.
/// Single source of truth: default_models.toml (via AgentProfile::gemini())
pub fn gemini_profile() -> AgentProfile {
    AgentProfile::gemini()
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
        let has = |term: &str| title_lower.contains(term) || desc_lower.contains(term);
        
        // Epic indicators
        if has("refactor")
            || has("migrate")
            || has("redesign")
            || task.labels.iter().any(|l| l == "epic" || l == "architecture")
        {
            return Complexity::Epic;
        }
        
        // Complex indicators
        if has("implement")
            || has("feature")
            || has("system")
            || task.labels.iter().any(|l| l == "feature" || l == "planning")
        {
            return Complexity::Complex;
        }
        
        // Moderate indicators
        if has("add")
            || has("update")
            || has("improve")
            || task.labels.len() > 2
        {
            return Complexity::Moderate;
        }
        
        // Simple indicators
        if has("fix")
            || has("bug")
            || has("typo")
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
            Complexity::Complex => "codex",       // Default primary executor
            Complexity::Epic => "codex",          // Default primary executor
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
        
        // Planning/Architecture -> Codex (primary orchestrator runtime)
        "planning" | "architecture" | "design" | "prd" | "spec" => Some("codex"),
        
        // Backend/API -> Codex (fast, good for APIs)
        "api" | "backend" | "endpoint" | "rest" | "graphql" => Some("codex"),
        
        // Cloudflare Workers -> Codex (primary orchestrator runtime)
        "workers" | "cloudflare" | "edge" | "durable-objects" => Some("codex"),
        
        // Testing -> Codex (strong at tests)
        "test" | "testing" | "vitest" | "playwright" => Some("codex"),
        
        // Refactoring/DRY -> Codex
        "refactor" | "dry" | "cleanup" | "canon" => Some("codex"),
        
        // Documentation -> Codex
        "docs" | "readme" | "documentation" => Some("codex"),
        
        // Large file analysis -> Gemini (1M context)
        "analysis" | "audit" | "review" | "large" => Some("gemini"),
        
        // Debug -> Codex
        "debug" | "debugging" | "investigate" => Some("codex"),
        
        // Ground verification -> Codex
        "ground" | "verify" | "evidence" => Some("codex"),
        
        // Package-specific routing
        "io" | "agency" | "tend" => Some("cursor"),  // UI packages
        "loom" => Some("codex"),     // Rust packages (ground already matched above)
        "webflow-mcp" | "community-mcp" => Some("codex"),  // MCP servers
        
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
        agent: Some("codex".to_string()),
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
                agent: Some("codex".to_string()),
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
        agent: Some("codex".to_string()),
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
                agent: Some("codex".to_string()),
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
        agent: Some("codex".to_string()),
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
                default: Some("agency".to_string()),
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
                agent: Some("codex".to_string()),
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

/// Fleet deployment formula for multi-worker rollout with policy gates.
pub fn cs_fleet_deploy_formula() -> Formula {
    Formula {
        name: "fleet-deploy".to_string(),
        description: "Policy-gated MCP hub fleet deployment with post-deploy verification".to_string(),
        quality: QualityTier::Premium,
        agent: Some("codex".to_string()),
        variables: vec![
            Variable {
                name: "gate_profile".to_string(),
                description: "Gate profile (strict or warmup)".to_string(),
                required: false,
                default: Some("strict".to_string()),
            },
            Variable {
                name: "rollout_mode".to_string(),
                description: "Target rollout mode (shadow or polar_enforce)".to_string(),
                required: false,
                default: Some("shadow".to_string()),
            },
        ],
        steps: vec![
            Step {
                id: "preflight-gates".to_string(),
                title: "Run preflight quality gates".to_string(),
                description: "Run typecheck and lint quality gates before deploy".to_string(),
                agent: None,
                labels: vec!["quality-gate".to_string()],
                prompt: None,
                verify: Some("pnpm mcp:gate:typecheck && pnpm mcp:gate:lint".to_string()),
                checkpoint: true,
                parallel: false,
            },
            Step {
                id: "deploy-fleet".to_string(),
                title: "Deploy fleet".to_string(),
                description: "Deploy all configured fleet workers".to_string(),
                agent: Some("codex".to_string()),
                labels: vec!["deploy".to_string(), "write-intent".to_string()],
                prompt: Some("Deploy using gate_profile={{gate_profile}} rollout_mode={{rollout_mode}} and record any policy exceptions.".to_string()),
                verify: Some("pnpm mcp:hub:fleet:deploy".to_string()),
                checkpoint: true,
                parallel: false,
            },
            Step {
                id: "verify-fleet".to_string(),
                title: "Verify fleet health".to_string(),
                description: "Run protocol and health verification after deploy".to_string(),
                agent: None,
                labels: vec!["verification".to_string()],
                prompt: None,
                verify: Some("pnpm mcp:hub:fleet:verify".to_string()),
                checkpoint: false,
                parallel: false,
            },
        ],
        success_criteria: SuccessCriteria {
            criteria: vec![
                "All targeted workers deploy successfully".to_string(),
                "Post-deploy verification passes".to_string(),
                "Policy gate outcomes are recorded".to_string(),
            ],
            verify_commands: vec![
                "pnpm mcp:hub:fleet:deploy".to_string(),
                "pnpm mcp:hub:fleet:verify".to_string(),
            ],
            ground_checks: vec![],
        },
        labels: vec![
            "fleet".to_string(),
            "deploy".to_string(),
            "policy-gated".to_string(),
            "write-intent".to_string(),
        ],
        estimated_tokens: 30000,
    }
}

/// Fleet verification formula for fan-out/fan-in health validation.
pub fn cs_fleet_verify_formula() -> Formula {
    Formula {
        name: "fleet-verify".to_string(),
        description: "Run fleet verification and collect rollout evidence".to_string(),
        quality: QualityTier::Standard,
        agent: Some("codex".to_string()),
        variables: vec![
            Variable {
                name: "emit_eval".to_string(),
                description: "Run Langfuse eval checks (true or false)".to_string(),
                required: false,
                default: Some("true".to_string()),
            },
        ],
        steps: vec![
            Step {
                id: "verify-hub-fleet".to_string(),
                title: "Run fleet verification".to_string(),
                description: "Run MCP protocol and health checks across workers".to_string(),
                agent: None,
                labels: vec!["verification".to_string(), "read-only".to_string()],
                prompt: None,
                verify: Some("pnpm mcp:hub:fleet:verify".to_string()),
                checkpoint: true,
                parallel: false,
            },
            Step {
                id: "collect-evidence".to_string(),
                title: "Collect eval evidence".to_string(),
                description: "Run contract/error-path checks when requested".to_string(),
                agent: None,
                labels: vec!["eval".to_string()],
                prompt: Some("If emit_eval={{emit_eval}} is true, run contract/error-path eval scripts and summarize failures.".to_string()),
                verify: Some("pnpm langfuse:eval:mcp:contract && pnpm langfuse:eval:mcp:error-path".to_string()),
                checkpoint: false,
                parallel: false,
            },
        ],
        success_criteria: SuccessCriteria {
            criteria: vec![
                "Fleet verification passes".to_string(),
                "Eval evidence captured for reviewers".to_string(),
            ],
            verify_commands: vec![
                "pnpm mcp:hub:fleet:verify".to_string(),
            ],
            ground_checks: vec![],
        },
        labels: vec!["fleet".to_string(), "verify".to_string(), "read-only".to_string()],
        estimated_tokens: 18000,
    }
}

/// MCP quality gate formula for stage/scope quality checks.
pub fn cs_mcp_gate_formula() -> Formula {
    Formula {
        name: "mcp-gate".to_string(),
        description: "Run MCP quality gates with scoped stage control".to_string(),
        quality: QualityTier::Standard,
        agent: Some("codex".to_string()),
        variables: vec![
            Variable {
                name: "stage".to_string(),
                description: "Gate stage (all|typecheck|lint|test)".to_string(),
                required: false,
                default: Some("all".to_string()),
            },
            Variable {
                name: "scope".to_string(),
                description: "Gate scope (active|fleet|all)".to_string(),
                required: false,
                default: Some("active".to_string()),
            },
        ],
        steps: vec![
            Step {
                id: "run-gate".to_string(),
                title: "Run MCP quality gate".to_string(),
                description: "Execute stage/scope quality gate command".to_string(),
                agent: None,
                labels: vec!["quality-gate".to_string()],
                prompt: Some("Run MCP quality gate with stage={{stage}} scope={{scope}} and report failing packages only.".to_string()),
                verify: Some("node scripts/mcp-quality-gate.mjs {{stage}} --scope={{scope}}".to_string()),
                checkpoint: true,
                parallel: false,
            },
        ],
        success_criteria: SuccessCriteria {
            criteria: vec![
                "Selected MCP quality gate passes".to_string(),
                "Failure summary is captured when gate fails".to_string(),
            ],
            verify_commands: vec![
                "node scripts/mcp-quality-gate.mjs {{stage}} --scope={{scope}}".to_string(),
            ],
            ground_checks: vec![],
        },
        labels: vec!["mcp".to_string(), "quality-gate".to_string()],
        estimated_tokens: 12000,
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
            issue_type: Default::default(),
            agent: None,
            labels: labels.into_iter().map(String::from).collect(),
            parent: None,
            evidence: None,
            actual_cost_usd: None,
            repo: None,
            close_reason: None,
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
        assert_eq!(route_by_label("planning"), Some("codex"));
        assert_eq!(route_by_label("testing"), Some("codex"));
        assert_eq!(route_by_label("workers"), Some("codex"));
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
        let codex = codex_profile();
        let cursor = cursor_profile();
        
        // Planning task should favor Codex
        let planning_task = make_task("Plan authentication", vec!["planning", "architecture"]);
        let codex_score = score_agent(&codex, &planning_task);
        let cursor_score = score_agent(&cursor, &planning_task);
        assert!(codex_score > cursor_score, "Codex should score higher for planning");
        
        // UI task should favor Cursor
        let ui_task = make_task("Build login form", vec!["ui", "svelte"]);
        let codex_score = score_agent(&codex, &ui_task);
        let cursor_score = score_agent(&cursor, &ui_task);
        assert!(cursor_score > codex_score, "Cursor should score higher for UI");
    }
}
