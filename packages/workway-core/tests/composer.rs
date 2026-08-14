use workway_core::{
    decide_composer_proposal, interpret_threshold_dwelling_composer_intent,
    threshold_dwelling_composer_contract_v08, threshold_dwelling_project_graph_v08,
    ComposerDecision, ComposerInterpretation, DeterministicOperation,
};

#[test]
fn composer_turns_one_supported_intent_into_a_review_gated_deterministic_operation() {
    let graph = threshold_dwelling_project_graph_v08();
    let interpretation = interpret_threshold_dwelling_composer_intent(
        &graph,
        "Move the kitchen island 4 inches south to improve refrigerator clearance.",
    );

    let ComposerInterpretation::Proposed {
        proposal,
        validation,
    } = interpretation
    else {
        panic!("the known bounded kitchen request should become a proposal");
    };
    let receipt =
        decide_composer_proposal(&graph, &proposal, &validation, ComposerDecision::Accepted)
            .expect("a valid proposal can receive a human decision receipt");

    assert!(validation.is_valid());
    assert_eq!(receipt.status, ComposerDecision::Accepted);
    assert_eq!(receipt.proposal_id, proposal.id);
    assert_eq!(
        receipt.resulting_derived_revision,
        "0.8:decision:kitchen-island-clearance-0001"
    );
    assert!(!receipt.construction_ready());
}

#[test]
fn composer_can_propose_a_codified_material_role_without_selecting_a_product() {
    let graph = threshold_dwelling_project_graph_v08();
    let interpretation = interpret_threshold_dwelling_composer_intent(
        &graph,
        "Use architectural concrete for the exterior envelope.",
    );

    let ComposerInterpretation::Proposed {
        proposal,
        validation,
    } = interpretation
    else {
        panic!("a codified role change should remain a reviewable proposal");
    };

    assert_eq!(
        proposal.operation,
        DeterministicOperation::SetMaterialRole {
            entity_id: "exterior-envelope".into(),
            material_role_id: "material-architectural-concrete".into(),
        }
    );
    assert_eq!(proposal.measurements.len(), 1);
    assert_eq!(proposal.measurements[0].id, "facade-concrete-area-target");
    assert!(validation.is_valid());
    assert!(proposal.requires_professional_review);
}

#[test]
fn composer_blocks_ambiguous_or_unissued_intent_without_creating_a_proposal() {
    let graph = threshold_dwelling_project_graph_v08();

    let ambiguous = interpret_threshold_dwelling_composer_intent(&graph, "Make it more open.");
    let unissued = interpret_threshold_dwelling_composer_intent(
        &graph,
        "Replace the exterior wall with floor-to-ceiling glass.",
    );

    assert!(matches!(
        ambiguous,
        ComposerInterpretation::Blocked { ref reason_id, .. }
            if reason_id == "unsupported-or-ambiguous-intent"
    ));
    assert!(matches!(
        unissued,
        ComposerInterpretation::Blocked { ref reason_id, .. }
            if reason_id == "window-and-glass-opening-geometry-unissued"
    ));
}

#[test]
fn checked_in_browser_composer_contract_is_an_exact_rust_projection() {
    let checked_in: serde_json::Value = serde_json::from_str(include_str!(
        "../../space/src/lib/workway/threshold-dwelling-composer-contract.json"
    ))
    .expect("the checked-in client contract must be valid JSON");
    let expected = serde_json::to_value(threshold_dwelling_composer_contract_v08())
        .expect("the Composer contract must serialize");

    assert_eq!(checked_in, expected);
}
