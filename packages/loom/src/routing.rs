//! Smart Routing
//!
//! Intelligent task-to-agent routing based on:
//! - Task labels and type
//! - Agent capabilities and history
//! - Cost constraints
//! - Availability

use crate::work::Task;
use crate::agents::{AgentProfile, AgentRegistry, RequiredFeatures};
use crate::formulas::Formula;
use serde::{Deserialize, Serialize};

/// Routing strategy
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RoutingStrategy {
    /// Best agent for the task (quality-first)
    Best,
    /// Cheapest agent that can do the job
    Cheapest,
    /// Fastest available agent
    Fastest,
    /// Round-robin across available agents
    RoundRobin,
    /// Specific agent
    Specific,
}

/// Routing constraints
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct RoutingConstraints {
    /// Maximum cost in dollars
    pub max_cost: Option<f64>,
    /// Maximum estimated tokens
    pub max_tokens: Option<u64>,
    /// Required features
    pub required_features: Option<RequiredFeatures>,
    /// Preferred agents (in order)
    pub preferred_agents: Vec<String>,
    /// Excluded agents
    pub excluded_agents: Vec<String>,
    /// Quality floor (minimum quality score)
    pub min_quality: Option<f64>,
}

/// Routing decision
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoutingDecision {
    /// Selected agent
    pub agent_id: String,
    /// Why this agent was selected
    pub reason: String,
    /// Estimated cost
    pub estimated_cost: f64,
    /// Confidence in this decision (0-1)
    pub confidence: f64,
    /// Alternative agents considered
    pub alternatives: Vec<String>,
}

/// Smart router
pub struct Router {
    last_robin_index: usize,
}

impl Router {
    pub fn new() -> Self {
        Self { last_robin_index: 0 }
    }
    
    /// Route a task to the best agent
    pub fn route(
        &mut self,
        task: &Task,
        registry: &AgentRegistry,
        strategy: RoutingStrategy,
        constraints: &RoutingConstraints,
    ) -> Result<RoutingDecision, String> {
        let profiles = registry.all_profiles()
            .map_err(|e| e.to_string())?;
        
        // Filter by constraints
        let candidates: Vec<_> = profiles.into_iter()
            .filter(|p| self.passes_constraints(p, task, constraints))
            .collect();
        
        if candidates.is_empty() {
            return Err("No agents available matching constraints".to_string());
        }
        
        match strategy {
            RoutingStrategy::Best => self.route_best(task, &candidates, constraints),
            RoutingStrategy::Cheapest => self.route_cheapest(task, &candidates),
            RoutingStrategy::Fastest => self.route_fastest(&candidates),
            RoutingStrategy::RoundRobin => self.route_round_robin(&candidates),
            RoutingStrategy::Specific => {
                if let Some(agent) = constraints.preferred_agents.first() {
                    candidates.iter()
                        .find(|p| &p.id == agent)
                        .map(|p| RoutingDecision {
                            agent_id: p.id.clone(),
                            reason: "Specifically requested".to_string(),
                            estimated_cost: p.cost.estimate(self.estimate_tokens(task)),
                            confidence: 1.0,
                            alternatives: vec![],
                        })
                        .ok_or_else(|| format!("Agent {} not available", agent))
                } else {
                    Err("No specific agent specified".to_string())
                }
            }
        }
    }
    
    /// Route based on formula quality tier
    pub fn route_for_formula(
        &mut self,
        formula: &Formula,
        registry: &AgentRegistry,
        constraints: &RoutingConstraints,
    ) -> Result<RoutingDecision, String> {
        let profiles = registry.all_profiles()
            .map_err(|e| e.to_string())?;
        
        // Get suggested agent for quality tier
        let suggested = formula.quality.suggested_agent();
        
        // Filter candidates
        let mut candidates: Vec<_> = profiles.into_iter()
            .filter(|p| {
                !constraints.excluded_agents.contains(&p.id) &&
                p.has_capacity()
            })
            .collect();
        
        // Sort by preference for suggested agent
        candidates.sort_by(|a, b| {
            let a_preferred = a.id == suggested;
            let b_preferred = b.id == suggested;
            b_preferred.cmp(&a_preferred)
        });
        
        if let Some(agent) = candidates.first() {
            let tokens = formula.estimated_tokens;
            Ok(RoutingDecision {
                agent_id: agent.id.clone(),
                reason: format!("Best for {} tier ({})", formula.quality.as_str(), formula.name),
                estimated_cost: agent.cost.estimate(tokens),
                confidence: 0.9,
                alternatives: candidates.iter().skip(1).take(2).map(|p| p.id.clone()).collect(),
            })
        } else {
            Err("No agents available".to_string())
        }
    }
    
    fn passes_constraints(&self, profile: &AgentProfile, task: &Task, constraints: &RoutingConstraints) -> bool {
        // Check availability
        if !profile.has_capacity() {
            return false;
        }
        
        // Check exclusions
        if constraints.excluded_agents.contains(&profile.id) {
            return false;
        }
        
        // Check cost constraint
        if let Some(max_cost) = constraints.max_cost {
            let estimated_tokens = self.estimate_tokens(task);
            let cost = profile.cost.estimate(estimated_tokens);
            if cost > max_cost {
                return false;
            }
        }
        
        // Check token constraint
        if let Some(max_tokens) = constraints.max_tokens {
            if max_tokens > profile.capabilities.max_context {
                return false;
            }
        }
        
        // Check required features
        if let Some(ref req) = constraints.required_features {
            if req.checkpoints && !profile.capabilities.checkpoints {
                return false;
            }
            if req.git_aware && !profile.capabilities.git_aware {
                return false;
            }
            if req.sub_agents && !profile.capabilities.sub_agents {
                return false;
            }
        }
        
        // Check quality floor
        if let Some(min_quality) = constraints.min_quality {
            if profile.quality.success_rate() < min_quality {
                return false;
            }
        }
        
        true
    }
    
    fn route_best(&self, task: &Task, candidates: &[AgentProfile], constraints: &RoutingConstraints) -> Result<RoutingDecision, String> {
        use crate::policy;
        
        let tokens = self.estimate_tokens(task);
        
        // Use Create Something's opinionated scoring algorithm
        let mut scored: Vec<_> = candidates.iter()
            .map(|p| {
                let score = policy::score_agent(p, task);
                (p, score)
            })
            .filter(|(_, score)| *score > 0.0) // Filter out disqualified agents
            .collect();
        
        // Boost preferred agents
        for (profile, score) in &mut scored {
            if constraints.preferred_agents.contains(&profile.id) {
                *score *= 1.2; // 20% boost
            }
        }
        
        scored.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        
        if let Some((best, score)) = scored.first() {
            let complexity = policy::Complexity::estimate(task);
            Ok(RoutingDecision {
                agent_id: best.id.clone(),
                reason: format!(
                    "Best for {:?} task with labels {:?} (score: {:.2})",
                    complexity, task.labels, score
                ),
                estimated_cost: best.cost.estimate(tokens),
                confidence: *score,
                alternatives: scored.iter().skip(1).take(2).map(|(p, _)| p.id.clone()).collect(),
            })
        } else {
            Err("No candidates meet quality threshold for this task complexity".to_string())
        }
    }
    
    fn route_cheapest(&self, task: &Task, candidates: &[AgentProfile]) -> Result<RoutingDecision, String> {
        let tokens = self.estimate_tokens(task);
        
        let mut with_cost: Vec<_> = candidates.iter()
            .map(|p| (p, p.cost.estimate(tokens)))
            .collect();
        
        with_cost.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal));
        
        if let Some((cheapest, cost)) = with_cost.first() {
            Ok(RoutingDecision {
                agent_id: cheapest.id.clone(),
                reason: format!("Cheapest option (${:.4})", cost),
                estimated_cost: *cost,
                confidence: 0.8,
                alternatives: with_cost.iter().skip(1).take(2).map(|(p, _)| p.id.clone()).collect(),
            })
        } else {
            Err("No candidates".to_string())
        }
    }
    
    fn route_fastest(&self, candidates: &[AgentProfile]) -> Result<RoutingDecision, String> {
        // Sort by average duration (faster = better)
        let mut sorted: Vec<_> = candidates.iter().collect();
        sorted.sort_by(|a, b| {
            a.quality.avg_duration_secs
                .partial_cmp(&b.quality.avg_duration_secs)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        
        if let Some(fastest) = sorted.first() {
            Ok(RoutingDecision {
                agent_id: fastest.id.clone(),
                reason: format!("Fastest (avg {:.0}s)", fastest.quality.avg_duration_secs),
                estimated_cost: fastest.cost.estimate(10000),
                confidence: 0.7,
                alternatives: sorted.iter().skip(1).take(2).map(|p| p.id.clone()).collect(),
            })
        } else {
            Err("No candidates".to_string())
        }
    }
    
    fn route_round_robin(&mut self, candidates: &[AgentProfile]) -> Result<RoutingDecision, String> {
        if candidates.is_empty() {
            return Err("No candidates".to_string());
        }
        
        self.last_robin_index = (self.last_robin_index + 1) % candidates.len();
        let selected = &candidates[self.last_robin_index];
        
        Ok(RoutingDecision {
            agent_id: selected.id.clone(),
            reason: "Round-robin selection".to_string(),
            estimated_cost: selected.cost.estimate(10000),
            confidence: 0.6,
            alternatives: vec![],
        })
    }
    
    fn estimate_tokens(&self, task: &Task) -> u64 {
        // Rough estimate based on task content
        let title_tokens = task.title.len() as u64 * 2;
        let desc_tokens = task.description.as_ref()
            .map(|d| d.len() as u64 * 2)
            .unwrap_or(0);
        
        // Base estimate + content + multiplier for agent output
        (5000 + title_tokens + desc_tokens) * 3
    }
}

impl Default for Router {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::agents::AgentRegistry;
    use tempfile::tempdir;
    
    #[test]
    fn test_routing_strategies() {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("agents.db");
        let mut registry = AgentRegistry::open(&db_path).unwrap();
        registry.register_defaults().unwrap();
        
        let mut router = Router::new();
        
        let task = Task {
            id: "test-1".to_string(),
            title: "Plan authentication system".to_string(),
            description: Some("Design OAuth flow".to_string()),
            status: crate::work::Status::Ready,
            priority: Default::default(),
            agent: None,
            labels: vec!["planning".to_string(), "architecture".to_string()],
            parent: None,
            evidence: None,
            actual_cost_usd: None,
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        };
        
        let constraints = RoutingConstraints::default();
        
        // Best should return a routing decision with reasoning
        let best = router.route(&task, &registry, RoutingStrategy::Best, &constraints).unwrap();
        assert!(!best.agent_id.is_empty());
        assert!(best.confidence > 0.0);
        assert!(best.reason.contains("Best match") || best.reason.contains("labels"));
        
        // Cheapest should pick a low-cost agent (Gemini Flash or GPT-4o-mini)
        let cheapest = router.route(&task, &registry, RoutingStrategy::Cheapest, &constraints).unwrap();
        assert!(
            cheapest.agent_id.starts_with("gemini") || cheapest.agent_id.starts_with("gpt-4o-mini"),
            "Cheapest agent should be a low-cost model, got: {}", cheapest.agent_id
        );
        assert!(cheapest.reason.contains("Cheapest"));
    }
}
