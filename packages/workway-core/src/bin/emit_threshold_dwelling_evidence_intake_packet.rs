//! Emits the client-safe evidence handoff packet consumed by the local Space UI.
//!
//! The packet intentionally contains requirements only. It is not an upload,
//! parser, OCR flow, storage adapter, or evidence-acceptance mechanism.

use workway_core::threshold_dwelling_evidence_intake_packet_v08;

fn main() {
    let packet = threshold_dwelling_evidence_intake_packet_v08()
        .expect("the Threshold Dwelling evidence fixture must project safely");
    println!(
        "{}",
        serde_json::to_string_pretty(&packet)
            .expect("the bounded evidence handoff packet must serialize")
    );
}
