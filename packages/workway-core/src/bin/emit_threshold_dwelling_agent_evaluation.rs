//! Emits the checked-in, source-free client projection consumed by the local
//! Space walkthrough. Raw evaluator inputs and diagnostic expectations never
//! cross this artifact boundary.

use workway_core::threshold_dwelling_agent_client_projection_v1;

fn main() {
    let projection = threshold_dwelling_agent_client_projection_v1();
    println!(
        "{}",
        serde_json::to_string_pretty(&projection)
            .expect("the synthetic WorkWay agent client projection must serialize")
    );
}
