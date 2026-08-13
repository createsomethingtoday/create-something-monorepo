use workway_core::{
    decide_composer_proposal, interpret_threshold_dwelling_composer_intent,
    threshold_dwelling_project_graph_v08, ComposerDecision, ComposerInterpretation,
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
