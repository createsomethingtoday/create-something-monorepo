//! Emits the checked-in, client-safe Composer contract used by the Space UI.
//!
//! This binary is intentionally a generation aid. Rust tests compare the
//! checked-in JSON artifact to the projection, so a stale artifact fails CI.

use workway_core::threshold_dwelling_composer_contract_v08;

fn main() {
    let contract = threshold_dwelling_composer_contract_v08();
    println!(
        "{}",
        serde_json::to_string_pretty(&contract)
            .expect("the bounded Composer projection must serialize")
    );
}
