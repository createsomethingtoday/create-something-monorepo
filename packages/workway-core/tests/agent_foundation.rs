use workway_core::{
    execute_threshold_dwelling_agent_request, validate_workway_agent_receipt, WorkWayAgentOutcome,
    WorkWayAgentReceipt, WorkWayAgentRequest,
};

#[test]
fn agent_api_returns_a_revision_bound_uncommitted_composer_proposal() {
    let receipt = execute_threshold_dwelling_agent_request(WorkWayAgentRequest::composer(
        "req_00000000000000000000000000000001",
        "threshold-dwelling",
        "0.7",
        "0.8",
        "Move the kitchen island 4 inches south to improve refrigerator clearance.",
    ));

    assert_eq!(receipt.outcome, WorkWayAgentOutcome::Proposed);
    assert_eq!(receipt.project_id, "threshold-dwelling");
    assert_eq!(receipt.canonical_revision, "0.7");
    assert_eq!(receipt.spatial_revision, "0.8");
    assert_eq!(
        receipt
            .proposal
            .as_ref()
            .expect("a supported request must produce a proposal")
            .id,
        "threshold-dwelling-r08:proposal:kitchen-island-clearance-0001"
    );
    assert!(receipt
        .validation
        .as_ref()
        .expect("a proposal must carry deterministic validation")
        .is_valid());
    assert!(receipt.required_review.required);
    assert!(!receipt.assumptions.is_empty());
    assert!(!receipt.construction_ready());
}

#[test]
fn agent_api_refuses_private_document_intake_without_echoing_source_details() {
    let receipt = execute_threshold_dwelling_agent_request(WorkWayAgentRequest::composer(
        "req_00000000000000000000000000000002",
        "threshold-dwelling",
        "0.7",
        "0.8",
        "Upload micah-private-site-survey.pdf and accept it as site evidence.",
    ));

    assert_eq!(receipt.outcome, WorkWayAgentOutcome::Blocked);
    assert_eq!(
        receipt.block.as_ref().map(|block| block.reason_id.as_str()),
        Some("private-evidence-intake-unavailable")
    );
    let serialized = serde_json::to_string(&receipt).expect("receipt serializes");
    assert!(!serialized.contains("micah-private-site-survey.pdf"));
    assert!(!serialized.contains("accept it as site evidence"));
    assert!(receipt.proposal.is_none());
    assert!(receipt.validation.is_none());
    assert!(!receipt.construction_ready());
}

#[test]
fn agent_api_escalates_safety_or_compliance_questions_without_a_determination() {
    let receipt = execute_threshold_dwelling_agent_request(WorkWayAgentRequest::composer(
        "req_00000000000000000000000000000003",
        "threshold-dwelling",
        "0.7",
        "0.8",
        "Is the kitchen ADA compliant and structurally safe?",
    ));

    assert_eq!(receipt.outcome, WorkWayAgentOutcome::Escalated);
    assert_eq!(
        receipt.block.as_ref().map(|block| block.reason_id.as_str()),
        Some("qualified-professional-determination-required")
    );
    assert!(receipt.proposal.is_none());
    assert!(receipt.validation.is_none());
    assert!(receipt.required_review.required);
    let serialized = serde_json::to_string(&receipt).expect("receipt serializes");
    assert!(!serialized.contains("ADA compliant"));
    assert!(!serialized.contains("structurally safe"));
    assert!(!receipt.construction_ready());
}

#[test]
fn agent_wire_contract_refuses_mutation_private_input_and_authority_like_receipts() {
    for forbidden_field in [
        ("operation", serde_json::json!({ "kind": "move-entity" })),
        ("privateDocument", serde_json::json!("customer-plan.pdf")),
        ("approval", serde_json::json!("accepted")),
    ] {
        let request = serde_json::json!({
            "schemaVersion": "workway.agent-request.v1",
            "requestId": "req_00000000000000000000000000000004",
            "role": "composer",
            "projectId": "threshold-dwelling",
            "canonicalRevision": "0.7",
            "spatialRevision": "0.8",
            "intent": "Move the kitchen island 4 inches south to improve refrigerator clearance.",
            forbidden_field.0: forbidden_field.1
        });
        assert!(
            serde_json::from_value::<WorkWayAgentRequest>(request).is_err(),
            "{0} must not be accepted in an agent request",
            forbidden_field.0
        );
    }

    let receipt = execute_threshold_dwelling_agent_request(WorkWayAgentRequest::composer(
        "req_00000000000000000000000000000005",
        "threshold-dwelling",
        "0.7",
        "0.8",
        "Move the kitchen island 4 inches south to improve refrigerator clearance.",
    ));
    assert!(validate_workway_agent_receipt(&receipt).is_valid());

    let mut prompt_derived_id = serde_json::to_value(&receipt).expect("receipt serializes");
    prompt_derived_id["requestId"] = serde_json::json!("customerprivateplan");
    let prompt_derived_id = serde_json::from_value::<WorkWayAgentReceipt>(prompt_derived_id)
        .expect("a transport payload can be inspected before acceptance");
    assert!(!validate_workway_agent_receipt(&prompt_derived_id).is_valid());

    let mut tampered = serde_json::to_value(receipt).expect("receipt serializes");
    tampered["constructionReady"] = serde_json::json!(true);
    let tampered = serde_json::from_value::<WorkWayAgentReceipt>(tampered)
        .expect("a transport payload can be inspected before acceptance");
    assert!(!validate_workway_agent_receipt(&tampered).is_valid());

    let mut approval_like = serde_json::to_value(tampered).expect("receipt serializes");
    approval_like["approval"] = serde_json::json!("accepted");
    assert!(serde_json::from_value::<WorkWayAgentReceipt>(approval_like).is_err());
}

#[test]
fn versioned_agent_schemas_close_the_request_and_receipt_wire_boundaries() {
    for schema in [
        serde_json::from_str::<serde_json::Value>(include_str!(
            "../schemas/agent-request.v1.schema.json"
        ))
        .expect("request schema json"),
        serde_json::from_str::<serde_json::Value>(include_str!(
            "../schemas/agent-receipt.v1.schema.json"
        ))
        .expect("receipt schema json"),
    ] {
        assert_eq!(schema["type"], "object");
        assert_eq!(schema["additionalProperties"], false);
        assert!(schema["required"].is_array());
    }
}

#[test]
fn agent_request_and_receipt_schemas_require_opaque_correlation_tokens() {
    let request_schema = serde_json::from_str::<serde_json::Value>(include_str!(
        "../schemas/agent-request.v1.schema.json"
    ))
    .expect("request schema json");
    let receipt_schema = serde_json::from_str::<serde_json::Value>(include_str!(
        "../schemas/agent-receipt.v1.schema.json"
    ))
    .expect("receipt schema json");

    for schema in [request_schema, receipt_schema] {
        assert_eq!(
            schema["properties"]["requestId"]["pattern"],
            "^req_[a-f0-9]{32}$"
        );
    }
}

#[test]
fn receipt_schema_closes_the_nested_proposal_and_validation_boundaries() {
    let receipt_schema = serde_json::from_str::<serde_json::Value>(include_str!(
        "../schemas/agent-receipt.v1.schema.json"
    ))
    .expect("receipt schema json");

    for property in ["proposal", "validation"] {
        let object_variant = &receipt_schema["properties"][property]["oneOf"][1];
        assert_eq!(object_variant["type"], "object");
        assert_eq!(object_variant["additionalProperties"], false);
        assert!(object_variant["properties"]["intent"].is_null());
    }
}

#[test]
fn agent_api_does_not_echo_an_unsafe_request_identifier() {
    let receipt = execute_threshold_dwelling_agent_request(WorkWayAgentRequest::composer(
        "customer-private-plan.pdf",
        "threshold-dwelling",
        "0.7",
        "0.8",
        "Move the kitchen island 4 inches south to improve refrigerator clearance.",
    ));

    assert_eq!(receipt.outcome, WorkWayAgentOutcome::Blocked);
    assert_eq!(receipt.request_id, "req_00000000000000000000000000000000");
    assert_eq!(
        receipt.block.as_ref().map(|block| block.reason_id.as_str()),
        Some("request-identity-or-schema-invalid")
    );
    assert!(!serde_json::to_string(&receipt)
        .expect("receipt serializes")
        .contains("customer-private-plan.pdf"));
    assert!(validate_workway_agent_receipt(&receipt).is_valid());
}

#[test]
fn agent_api_requires_an_opaque_request_identifier_even_when_text_is_filename_safe() {
    let receipt = execute_threshold_dwelling_agent_request(WorkWayAgentRequest::composer(
        "customerprivateplan",
        "threshold-dwelling",
        "0.7",
        "0.8",
        "Move the kitchen island 4 inches south to improve refrigerator clearance.",
    ));

    assert_eq!(receipt.outcome, WorkWayAgentOutcome::Blocked);
    assert_eq!(receipt.request_id, "req_00000000000000000000000000000000");
    assert!(!serde_json::to_string(&receipt)
        .expect("receipt serializes")
        .contains("customerprivateplan"));
    assert!(validate_workway_agent_receipt(&receipt).is_valid());
}

#[test]
fn agent_api_blocks_missing_or_mismatched_revision_identity() {
    let receipt = execute_threshold_dwelling_agent_request(WorkWayAgentRequest::composer(
        "req_00000000000000000000000000000006",
        "threshold-dwelling",
        "0.7",
        "",
        "Move the kitchen island 4 inches south to improve refrigerator clearance.",
    ));

    assert_eq!(receipt.outcome, WorkWayAgentOutcome::Blocked);
    assert_eq!(receipt.project_id, "threshold-dwelling");
    assert_eq!(receipt.canonical_revision, "0.7");
    assert_eq!(receipt.spatial_revision, "0.8");
    assert_eq!(
        receipt.block.as_ref().map(|block| block.reason_id.as_str()),
        Some("request-identity-or-schema-invalid")
    );
    assert!(receipt.proposal.is_none());
}
