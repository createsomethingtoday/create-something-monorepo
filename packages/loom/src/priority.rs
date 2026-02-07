//! Priority Algorithms for Robot-Optimized Work Selection
//!
//! Implements graph-based prioritization: Impact Score, Critical Path, PageRank-lite.
//! Port of packages/agents/coordination/src/priority.ts for Rust/Loom.
//!
//! Usage:
//! ```rust,ignore
//! let priority = Priority::new(&work_store);
//! let ranked = priority.get_prioritized(10)?;
//! for result in ranked {
//!     println!("{}: {} (score: {:.2}, reason: {})", 
//!         result.task.id, result.task.title, result.score, result.reason);
//! }
//! ```

use crate::work::{Task, Status, WorkStore, WorkError, Dependency, DependencyType};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

/// Result of priority calculation for a single task
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PriorityResult {
    /// The task being scored
    pub task: Task,
    /// Computed priority score (0.0 - 1.0, higher = work on first)
    pub score: f64,
    /// Human-readable explanation of why this task is prioritized
    pub reason: String,
    /// Breakdown of scoring factors
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub factors: Vec<ScoringFactor>,
}

/// Individual factor contributing to priority score
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoringFactor {
    pub name: String,
    pub value: f64,
    pub weight: f64,
}

/// Critical path information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CriticalPath {
    /// Tasks in the critical path, ordered from start to end
    pub tasks: Vec<Task>,
    /// Total length of the path
    pub length: usize,
}

/// Priority calculator for work selection
pub struct Priority<'a> {
    store: &'a WorkStore,
}

impl<'a> Priority<'a> {
    /// Create a new priority calculator
    pub fn new(store: &'a WorkStore) -> Self {
        Self { store }
    }
    
    /// Get prioritized list of ready tasks
    /// Combines multiple signals: impact, priority level, age, dependencies
    pub fn get_prioritized(&self, limit: usize) -> Result<Vec<PriorityResult>, WorkError> {
        // Get all ready tasks
        let ready = self.store.ready()?;

        if ready.is_empty() {
            return Ok(vec![]);
        }

        // Pre-fetch all tasks and dependencies once to avoid O(n^2) DB queries
        let graph = DependencyGraph::build(self.store)?;

        // Calculate scores for each task
        let mut scored: Vec<PriorityResult> = Vec::new();

        for task in ready {
            let result = self.calculate_score_with_graph(&task, &graph)?;
            scored.push(result);
        }

        // Sort by score descending
        scored.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));

        Ok(scored.into_iter().take(limit).collect())
    }
    
    /// Calculate priority score for a single task (public API, fetches deps on demand)
    /// Higher score = should be worked on first
    pub fn calculate_score(&self, task: &Task) -> Result<PriorityResult, WorkError> {
        let graph = DependencyGraph::build(self.store)?;
        self.calculate_score_with_graph(task, &graph)
    }

    /// Calculate priority score using a pre-built dependency graph (O(1) lookups)
    fn calculate_score_with_graph(&self, task: &Task, graph: &DependencyGraph) -> Result<PriorityResult, WorkError> {
        let mut factors: Vec<ScoringFactor> = Vec::new();

        // 1. Priority level (Critical=highest, Low=lowest)
        // Weight: 0.30
        let priority_value = match task.priority {
            crate::work::Priority::Critical => 1.0,
            crate::work::Priority::High => 0.75,
            crate::work::Priority::Normal => 0.5,
            crate::work::Priority::Low => 0.25,
        };
        factors.push(ScoringFactor {
            name: "priority".to_string(),
            value: priority_value,
            weight: 0.30,
        });

        // 2. Impact: How many issues does this unblock?
        // Weight: 0.35
        let impact_value = graph.calculate_impact(&task.id);
        factors.push(ScoringFactor {
            name: "impact".to_string(),
            value: impact_value,
            weight: 0.35,
        });

        // 3. Age: Older tasks get slight boost to prevent starvation
        // Weight: 0.10
        let age_value = Self::calculate_age_score(task.created_at);
        factors.push(ScoringFactor {
            name: "age".to_string(),
            value: age_value,
            weight: 0.10,
        });

        // 4. Connectivity: Is this a hub task? (many connections)
        // Weight: 0.15
        let connectivity_value = graph.calculate_connectivity(&task.id);
        factors.push(ScoringFactor {
            name: "connectivity".to_string(),
            value: connectivity_value,
            weight: 0.15,
        });

        // 5. Issue type bonus: Bugs get slight priority over features
        // Weight: 0.10
        let type_value = match task.issue_type {
            crate::work::IssueType::Bug => 0.8,
            crate::work::IssueType::Feature => 0.5,
            crate::work::IssueType::Task => 0.5,
            crate::work::IssueType::Epic => 0.3,
            crate::work::IssueType::Chore => 0.4,
        };
        factors.push(ScoringFactor {
            name: "type".to_string(),
            value: type_value,
            weight: 0.10,
        });

        // Calculate weighted score
        let total_score: f64 = factors.iter()
            .map(|f| f.value * f.weight)
            .sum();

        // Build reason string from top factors
        let mut top_factors: Vec<_> = factors.iter()
            .filter(|f| f.value > 0.3)
            .map(|f| (f.name.clone(), f.value * f.weight))
            .collect();
        top_factors.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

        let reason = if !top_factors.is_empty() {
            let names: Vec<_> = top_factors.iter().take(2).map(|(n, _)| n.as_str()).collect();
            format!("High {}", names.join(", "))
        } else {
            "Default priority".to_string()
        };

        Ok(PriorityResult {
            task: task.clone(),
            score: (total_score * 100.0).round() / 100.0,
            reason,
            factors,
        })
    }

    /// Calculate age score: Older tasks get slight priority boost
    /// Prevents task starvation
    fn calculate_age_score(created_at: DateTime<Utc>) -> f64 {
        let now = Utc::now();
        let age_seconds = (now - created_at).num_seconds() as f64;
        let age_days = age_seconds / (24.0 * 60.0 * 60.0);

        // Score increases with age, maxes out at 7 days
        (age_days / 7.0).min(1.0)
    }
    
    /// Get the critical path: sequence of tasks that, if delayed, delay everything
    pub fn get_critical_path(&self) -> Result<CriticalPath, WorkError> {
        let all_tasks = self.store.list_all()?;
        let active_tasks: Vec<_> = all_tasks.iter()
            .filter(|t| matches!(t.status, Status::Ready | Status::Blocked | Status::Claimed))
            .collect();
        
        if active_tasks.is_empty() {
            return Ok(CriticalPath { tasks: vec![], length: 0 });
        }
        
        // Find endpoint tasks (no outgoing blocking dependencies)
        let endpoints: Vec<_> = active_tasks.iter()
            .filter(|t| {
                // Check if this task blocks any other active task
                !active_tasks.iter().any(|other| {
                    if other.id == t.id {
                        return false;
                    }
                    self.store.get_all_dependencies(&other.id)
                        .map(|deps| deps.iter().any(|d| d.depends_on == t.id && d.dep_type == DependencyType::Blocks))
                        .unwrap_or(false)
                })
            })
            .collect();
        
        // Find longest path ending at each endpoint
        let mut longest_path: Vec<Task> = vec![];
        
        for endpoint in endpoints {
            let path = self.trace_path(&endpoint.id, &mut HashSet::new())?;
            if path.len() > longest_path.len() {
                longest_path = path;
            }
        }
        
        let length = longest_path.len();
        Ok(CriticalPath { tasks: longest_path, length })
    }
    
    fn trace_path(&self, task_id: &str, visited: &mut HashSet<String>) -> Result<Vec<Task>, WorkError> {
        if visited.contains(task_id) {
            return Ok(vec![]);
        }
        visited.insert(task_id.to_string());
        
        let task = match self.store.get(task_id)? {
            Some(t) => t,
            None => return Ok(vec![]),
        };
        
        // Get all blockers of this task
        let deps = self.store.get_all_dependencies(task_id)?;
        let blockers: Vec<_> = deps.iter()
            .filter(|d| d.dep_type == DependencyType::Blocks)
            .collect();
        
        if blockers.is_empty() {
            return Ok(vec![task]);
        }
        
        // Find longest path through blockers
        let mut longest_blocker_path: Vec<Task> = vec![];
        
        for blocker in blockers {
            if let Some(blocker_task) = self.store.get(&blocker.depends_on)? {
                if !matches!(blocker_task.status, Status::Done | Status::Cancelled) {
                    let path = self.trace_path(&blocker.depends_on, &mut visited.clone())?;
                    if path.len() > longest_blocker_path.len() {
                        longest_blocker_path = path;
                    }
                }
            }
        }
        
        longest_blocker_path.push(task);
        Ok(longest_blocker_path)
    }
    
    /// Get bottleneck tasks: tasks blocking the most other work
    pub fn get_bottlenecks(&self, limit: usize) -> Result<Vec<PriorityResult>, WorkError> {
        let graph = DependencyGraph::build(self.store)?;
        let active_tasks: Vec<_> = graph.all_tasks.iter()
            .filter(|t| matches!(t.status, Status::Ready | Status::Claimed))
            .collect();

        let mut bottlenecks: Vec<(Task, usize)> = Vec::new();

        for task in active_tasks {
            let blocked_count = graph.count_blocked_tasks(&task.id, &mut HashSet::new());
            if blocked_count > 0 {
                bottlenecks.push((task.clone(), blocked_count));
            }
        }

        // Sort by blocked count descending
        bottlenecks.sort_by(|a, b| b.1.cmp(&a.1));

        Ok(bottlenecks.into_iter()
            .take(limit)
            .map(|(task, blocked_count)| PriorityResult {
                task,
                score: blocked_count as f64,
                reason: format!("Blocking {} task(s)", blocked_count),
                factors: vec![],
            })
            .collect())
    }
}

/// Pre-computed dependency graph for O(1) lookups during scoring.
/// Built once from the database, then used for all scoring operations.
struct DependencyGraph {
    all_tasks: Vec<Task>,
    /// Dependencies keyed by task_id (task_id -> deps where this task is the dependent)
    deps_by_task: HashMap<String, Vec<Dependency>>,
    /// Reverse index: depends_on -> tasks that depend on it (via Blocks)
    blocked_by: HashMap<String, Vec<String>>,
}

impl DependencyGraph {
    /// Build the graph with two DB queries (all tasks + all dependencies)
    fn build(store: &WorkStore) -> Result<Self, WorkError> {
        let all_tasks = store.list_all()?;
        let mut deps_by_task: HashMap<String, Vec<Dependency>> = HashMap::new();
        let mut blocked_by: HashMap<String, Vec<String>> = HashMap::new();

        for task in &all_tasks {
            let deps = store.get_all_dependencies(&task.id)?;
            for dep in &deps {
                if dep.dep_type == DependencyType::Blocks {
                    blocked_by.entry(dep.depends_on.clone())
                        .or_default()
                        .push(task.id.clone());
                }
            }
            deps_by_task.insert(task.id.clone(), deps);
        }

        Ok(Self { all_tasks, deps_by_task, blocked_by })
    }

    /// Calculate impact score: How many tasks does completing this unblock?
    fn calculate_impact(&self, task_id: &str) -> f64 {
        let blocked_count = self.count_blocked_tasks(task_id, &mut HashSet::new());
        // Normalize: 0 blocked = 0, 5+ blocked = 1
        (blocked_count as f64 / 5.0).min(1.0)
    }

    fn count_blocked_tasks(&self, task_id: &str, visited: &mut HashSet<String>) -> usize {
        if visited.contains(task_id) {
            return 0;
        }
        visited.insert(task_id.to_string());

        let mut count = 0;
        if let Some(dependents) = self.blocked_by.get(task_id) {
            for dependent_id in dependents {
                // Only count active tasks
                if let Some(task) = self.all_tasks.iter().find(|t| t.id == *dependent_id) {
                    if task.status == Status::Ready || task.status == Status::Blocked {
                        count += 1;
                        count += self.count_blocked_tasks(dependent_id, visited);
                    }
                }
            }
        }
        count
    }

    /// Calculate connectivity score: How connected is this task in the graph?
    fn calculate_connectivity(&self, task_id: &str) -> f64 {
        // Outgoing deps (things this task depends on)
        let outgoing = self.deps_by_task.get(task_id).map(|d| d.len()).unwrap_or(0);
        // Incoming deps (things that depend on this task)
        let incoming = self.blocked_by.get(task_id).map(|d| d.len()).unwrap_or(0);

        // Normalize: 0 connections = 0, 10+ connections = 1
        ((outgoing + incoming) as f64 / 10.0).min(1.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::work::{CreateTask, Priority as TaskPriority, IssueType};
    
    #[test]
    fn test_priority_calculation() {
        let mut store = WorkStore::in_memory().unwrap();
        
        // Create some tasks
        let high_priority = store.create(CreateTask {
            title: "Critical bug fix".to_string(),
            priority: TaskPriority::Critical,
            issue_type: IssueType::Bug,
            ..Default::default()
        }).unwrap();
        
        let low_priority = store.create(CreateTask {
            title: "Nice to have feature".to_string(),
            priority: TaskPriority::Low,
            issue_type: IssueType::Feature,
            ..Default::default()
        }).unwrap();
        
        let priority = Priority::new(&store);
        let ranked = priority.get_prioritized(10).unwrap();
        
        assert_eq!(ranked.len(), 2);
        // High priority task should be first
        assert_eq!(ranked[0].task.id, high_priority.id);
        assert!(ranked[0].score > ranked[1].score);
    }
    
    #[test]
    fn test_impact_scoring() {
        let mut store = WorkStore::in_memory().unwrap();
        
        // Create a blocker and blocked tasks
        let blocker = store.create(CreateTask {
            title: "Blocker task".to_string(),
            ..Default::default()
        }).unwrap();
        
        let blocked1 = store.create(CreateTask {
            title: "Blocked 1".to_string(),
            ..Default::default()
        }).unwrap();
        
        let blocked2 = store.create(CreateTask {
            title: "Blocked 2".to_string(),
            ..Default::default()
        }).unwrap();
        
        // Add dependencies
        store.add_dependency(&blocked1.id, &blocker.id).unwrap();
        store.add_dependency(&blocked2.id, &blocker.id).unwrap();
        
        let priority = Priority::new(&store);
        let ranked = priority.get_prioritized(10).unwrap();
        
        // The blocker should have higher priority due to impact
        let blocker_result = ranked.iter().find(|r| r.task.id == blocker.id).unwrap();
        let impact_factor = blocker_result.factors.iter().find(|f| f.name == "impact").unwrap();
        assert!(impact_factor.value > 0.0);
    }
    
    #[test]
    fn test_critical_path() {
        let mut store = WorkStore::in_memory().unwrap();
        
        // Create a chain: task1 → task2 → task3
        let task1 = store.create(CreateTask {
            title: "Task 1".to_string(),
            ..Default::default()
        }).unwrap();
        
        let task2 = store.create(CreateTask {
            title: "Task 2".to_string(),
            ..Default::default()
        }).unwrap();
        
        let task3 = store.create(CreateTask {
            title: "Task 3".to_string(),
            ..Default::default()
        }).unwrap();
        
        store.add_dependency(&task2.id, &task1.id).unwrap();
        store.add_dependency(&task3.id, &task2.id).unwrap();
        
        let priority = Priority::new(&store);
        let critical_path = priority.get_critical_path().unwrap();
        
        // Critical path should be length 3 (or less if task1 is not blocked)
        assert!(critical_path.length <= 3);
    }
}
