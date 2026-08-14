use workway_core::{
    evaluate_threshold_dwelling_agent_foundation_v1, threshold_dwelling_agent_client_projection_v1,
    WorkWayAgentOutcome,
};

#[test]
fn synthetic_agent_evaluator_measures_all_expected_propose_block_and_escalate_cases() {
    let report = evaluate_threshold_dwelling_agent_foundation_v1();

    assert!(report.passed, "evaluation failures: {:#?}", report.results);
    assert_eq!(report.schema_version, "workway.agent-evaluation-report.v1");
    assert_eq!(report.project_id, "threshold-dwelling");
    assert_eq!(report.canonical_revision, "0.7");
    assert_eq!(report.spatial_revision, "0.8");
    assert!(!report.construction_ready());
    assert!(report.results.len() >= 9);
    assert!(report.results.iter().all(|result| {
        !result.receipt.construction_ready()
            && result.receipt.required_review.required
            && !result.receipt.assumptions.is_empty()
    }));

    let evidence_acceptance = report
        .results
        .iter()
        .find(|result| result.case_id == "missing-evidence-acceptance")
        .expect("the missing-evidence case is measured");
    assert_eq!(
        evidence_acceptance.receipt.outcome,
        WorkWayAgentOutcome::Blocked
    );
    assert_eq!(
        evidence_acceptance
            .receipt
            .block
            .as_ref()
            .map(|block| block.reason_id.as_str()),
        Some("evidence-acceptance-not-available")
    );
    assert!(evidence_acceptance.passed);
}

#[test]
fn evaluator_is_deterministic_and_its_report_is_source_free() {
    let first = evaluate_threshold_dwelling_agent_foundation_v1();
    let second = evaluate_threshold_dwelling_agent_foundation_v1();

    assert_eq!(first, second);
    let report = serde_json::to_string(&first).expect("report serializes");
    for forbidden in [
        "customer-plan.pdf",
        "vault_",
        "privateDocument",
        "constructionReady\":true",
        "accepted\"",
        "Move the kitchen island 4 inches south to improve refrigerator clearance.",
        "Use architectural concrete for the exterior envelope.",
        "\"intent\":",
        "evaluation-uploadaprivatepdfandacce",
    ] {
        assert!(!report.contains(forbidden), "report leaked {forbidden}");
    }
}

#[test]
fn client_projection_retains_only_source_free_representative_receipts() {
    let projection = threshold_dwelling_agent_client_projection_v1();

    assert!(projection.evaluator_passed);
    assert_eq!(
        projection.schema_version,
        "workway.agent-client-projection.v1"
    );
    assert_eq!(projection.scenarios.len(), 4);
    assert!(!projection.construction_ready());
    assert_eq!(
        projection
            .scenarios
            .iter()
            .map(|scenario| scenario.id.as_str())
            .collect::<Vec<_>>(),
        [
            "supported-kitchen-clearance",
            "material-role-alternative",
            "safety-professional-determination",
            "private-document-boundary",
        ]
    );
    let serialized = serde_json::to_string(&projection).expect("projection serializes");
    for forbidden in [
        "\"intent\":",
        "customer-plan.pdf",
        "vault_",
        "privateDocument",
    ] {
        assert!(
            !serialized.contains(forbidden),
            "projection leaked {forbidden}"
        );
    }
}

#[test]
fn checked_in_browser_agent_projection_is_an_exact_rust_projection() {
    let checked_in: serde_json::Value = serde_json::from_str(include_str!(
        "../../space/src/lib/workway/threshold-dwelling-agent-evaluation.json"
    ))
    .expect("the checked-in browser report must be valid JSON");
    let expected = serde_json::to_value(threshold_dwelling_agent_client_projection_v1())
        .expect("the Rust client projection must serialize");

    assert_eq!(checked_in, expected);
}
