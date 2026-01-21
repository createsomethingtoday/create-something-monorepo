//! Simulation Engine
//!
//! Deterministic, time-aware simulation for SaaS demos.
//! Compiles to WASM for use in Cloudflare Workers and browsers.
//!
//! Philosophy: A demo should feel alive. Same seed = same story, but
//! the story unfolds naturally with time.

mod rng;
mod scenario;
mod dental;

use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

pub use rng::Rng;
pub use scenario::{Scenario, TimeOfDay};
pub use dental::DentalScenario;

/// A simulated data item
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SimItem {
    pub id: String,
    pub title: String,
    pub body: String,
    pub source_type: String,
    pub category: String,
    pub score: f64,
    pub status: String,
    /// Minutes ago (relative to simulation time)
    pub minutes_ago: i64,
    /// Optional metadata
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<serde_json::Value>,
}

/// A log entry for the activity feed
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SimLogEntry {
    pub minutes_ago: i64,
    pub text: String,
    pub entry_type: String,
}

/// Real-time metrics snapshot
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SimMetrics {
    pub waiting_room: u32,
    pub avg_wait_minutes: u32,
    pub on_time_rate: u32,
    pub no_show_rate: u32,
    pub appointments_total: u32,
    pub appointments_completed: u32,
    pub automations_today: u32,
    pub calls_processed: u32,
    pub confirmations_sent: u32,
    pub eligibility_checked: u32,
    pub recalls_contacted: u32,
    pub agents_completed: u32,
    pub agents_awaiting: u32,
    pub human_decisions: u32,
}

/// Complete simulation state at a point in time
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SimState {
    pub items: Vec<SimItem>,
    pub activity_log: Vec<SimLogEntry>,
    pub metrics: SimMetrics,
    pub time_of_day: String,
    pub simulation_time: i64,
}

/// The main simulation engine
#[wasm_bindgen]
pub struct Simulation {
    seed: u64,
    scenario: String,
}

#[wasm_bindgen]
impl Simulation {
    /// Create a new simulation with a seed
    #[wasm_bindgen(constructor)]
    pub fn new(seed: u64, scenario: &str) -> Simulation {
        Simulation {
            seed,
            scenario: scenario.to_string(),
        }
    }

    /// Create a simulation with the current timestamp as seed
    #[wasm_bindgen(js_name = fromTimestamp)]
    pub fn from_timestamp(timestamp: i64, scenario: &str) -> Simulation {
        // Use day-level seed so demos are consistent within a day
        let day_seed = (timestamp / 86400) as u64;
        Simulation {
            seed: day_seed,
            scenario: scenario.to_string(),
        }
    }

    /// Get the complete simulation state at a given timestamp
    #[wasm_bindgen(js_name = stateAt)]
    pub fn state_at(&self, timestamp_ms: i64) -> JsValue {
        let state = match self.scenario.as_str() {
            "dental" => DentalScenario::generate(self.seed, timestamp_ms),
            _ => DentalScenario::generate(self.seed, timestamp_ms), // Default to dental
        };
        
        serde_wasm_bindgen::to_value(&state).unwrap_or(JsValue::NULL)
    }

    /// Get just the items at a given timestamp
    #[wasm_bindgen(js_name = itemsAt)]
    pub fn items_at(&self, timestamp_ms: i64) -> JsValue {
        let state = match self.scenario.as_str() {
            "dental" => DentalScenario::generate(self.seed, timestamp_ms),
            _ => DentalScenario::generate(self.seed, timestamp_ms),
        };
        
        serde_wasm_bindgen::to_value(&state.items).unwrap_or(JsValue::NULL)
    }

    /// Get just the metrics at a given timestamp
    #[wasm_bindgen(js_name = metricsAt)]
    pub fn metrics_at(&self, timestamp_ms: i64) -> JsValue {
        let state = match self.scenario.as_str() {
            "dental" => DentalScenario::generate(self.seed, timestamp_ms),
            _ => DentalScenario::generate(self.seed, timestamp_ms),
        };
        
        serde_wasm_bindgen::to_value(&state.metrics).unwrap_or(JsValue::NULL)
    }

    /// Get the activity log at a given timestamp
    #[wasm_bindgen(js_name = activityLogAt)]
    pub fn activity_log_at(&self, timestamp_ms: i64, count: usize) -> JsValue {
        let state = match self.scenario.as_str() {
            "dental" => DentalScenario::generate(self.seed, timestamp_ms),
            _ => DentalScenario::generate(self.seed, timestamp_ms),
        };
        
        let log: Vec<_> = state.activity_log.into_iter().take(count).collect();
        serde_wasm_bindgen::to_value(&log).unwrap_or(JsValue::NULL)
    }

    /// Get the seed for debugging
    #[wasm_bindgen(getter)]
    pub fn seed(&self) -> u64 {
        self.seed
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_determinism() {
        let sim1 = Simulation::new(12345, "dental");
        let sim2 = Simulation::new(12345, "dental");
        
        let ts = 1705849200000i64; // Some timestamp
        
        let state1 = DentalScenario::generate(sim1.seed, ts);
        let state2 = DentalScenario::generate(sim2.seed, ts);
        
        assert_eq!(state1.items.len(), state2.items.len());
        assert_eq!(state1.items[0].title, state2.items[0].title);
    }

    #[test]
    fn test_time_variance() {
        let sim = Simulation::new(12345, "dental");
        
        let morning = DentalScenario::generate(sim.seed, 1705831200000); // 9am
        let afternoon = DentalScenario::generate(sim.seed, 1705860000000); // 5pm
        
        // Metrics should differ by time of day
        assert!(morning.metrics.appointments_completed < afternoon.metrics.appointments_completed);
    }
}
