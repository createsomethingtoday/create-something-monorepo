use workway_core::{
    project_client_evidence_readiness, threshold_dwelling_evidence_intake_packet_v08,
    threshold_dwelling_evidence_manifest_v08, threshold_dwelling_project_graph_v08,
    validate_private_evidence_manifest, validate_project_graph, EvidenceIntakeField, ProjectGraph,
    CLIENT_EVIDENCE_READINESS_SCHEMA_VERSION, EVIDENCE_INTAKE_PACKET_SCHEMA_VERSION,
    PROJECT_GRAPH_SCHEMA_VERSION,
};

#[test]
fn threshold_dwelling_graph_projects_reviewable_evidence_without_private_content() {
    let graph = threshold_dwelling_project_graph_v08();
    let manifest = threshold_dwelling_evidence_manifest_v08();
    let graph_validation = validate_project_graph(&graph, &manifest);
    let manifest_validation = validate_private_evidence_manifest(&manifest);
    let projection = project_client_evidence_readiness(&graph, &manifest)
        .expect("a valid graph may produce a client-safe evidence projection");
    let client_json = serde_json::to_string(&projection).expect("projection serializes");

    assert_eq!(graph.schema_version, PROJECT_GRAPH_SCHEMA_VERSION);
    assert_eq!(graph.project_id, "threshold-dwelling");
    assert_eq!(graph.canonical_revision, "0.7");
    assert_eq!(graph.derived_revision, "0.8");
    assert_eq!(graph.entities.len(), 9);
    assert_eq!(graph.evidence_references.len(), 9);
    assert!(graph_validation.is_valid());
    assert!(manifest_validation.is_valid());
    assert_eq!(
        projection.schema_version,
        CLIENT_EVIDENCE_READINESS_SCHEMA_VERSION
    );
    assert_eq!(projection.project_id, graph.project_id);
    assert_eq!(projection.derived_revision, graph.derived_revision);
    assert_eq!(projection.evidence.len(), 9);
    assert!(projection
        .evidence
        .iter()
        .all(|evidence| evidence.review_status == "missing"));
    assert!(!client_json.contains("vaultRecordId"));
    assert!(!client_json.contains("sourcePath"));
    assert!(!client_json.contains("private"));
    assert!(!client_json.contains(".pdf"));
}

#[test]
fn graph_rejects_duplicate_entities_revision_drift_unknown_evidence_and_readiness_mutation() {
    let mut graph = threshold_dwelling_project_graph_v08();
    let mut manifest = threshold_dwelling_evidence_manifest_v08();
    graph.entities[1].id = graph.entities[0].id.clone();
    graph.evidence_references[0].evidence_id = "evidence-not-in-manifest".into();
    graph.evidence_references[1].canonical_revision = "0.6".into();
    manifest.canonical_revision = "0.6".into();
    let mut graph_json = serde_json::to_value(&graph).expect("graph serializes");
    graph_json["constructionReady"] = true.into();
    let graph: ProjectGraph =
        serde_json::from_value(graph_json).expect("malformed client input still deserializes");

    let validation = validate_project_graph(&graph, &manifest);

    assert!(!validation.is_valid());
    assert!(validation
        .issue_ids
        .contains(&"duplicate-semantic-entity-id".into()));
    assert!(validation
        .issue_ids
        .contains(&"graph-manifest-canonical-revision-mismatch".into()));
    assert!(validation
        .issue_ids
        .contains(&"evidence-reference-revision-mismatch".into()));
    assert!(validation
        .issue_ids
        .contains(&"evidence-reference-not-found".into()));
    assert!(validation
        .issue_ids
        .contains(&"construction-ready-must-be-false".into()));
    assert!(project_client_evidence_readiness(&graph, &manifest).is_none());
}

#[test]
fn private_manifest_rejects_raw_paths_nonopaque_locators_and_invalid_hashes() {
    let mut manifest = threshold_dwelling_evidence_manifest_v08();
    manifest.entries[0].vault_record_id = "uploads/client-plan.pdf".into();
    manifest.entries[1].opaque_id = "source:architectural-package".into();
    manifest.entries[2].content_sha256 = Some("not-a-sha256".into());
    manifest.entries[3].client_label = "Private upload /Users/micah/site.pdf".into();

    let validation = validate_private_evidence_manifest(&manifest);

    assert!(!validation.is_valid());
    assert!(validation
        .issue_ids
        .contains(&"unsafe-private-evidence-locator".into()));
    assert!(validation
        .issue_ids
        .contains(&"evidence-id-must-be-opaque".into()));
    assert!(validation
        .issue_ids
        .contains(&"invalid-evidence-content-hash".into()));
    assert!(validation
        .issue_ids
        .contains(&"unsafe-client-evidence-label".into()));
}

#[test]
fn evidence_intake_packet_exposes_secure_handoff_requirements_without_document_access() {
    let packet = threshold_dwelling_evidence_intake_packet_v08()
        .expect("the Threshold Dwelling fixture should yield a client-safe handoff packet");
    let client_json = serde_json::to_string(&packet).expect("packet serializes");
    let glazing_request = packet
        .requests
        .iter()
        .find(|request| request.evidence_id == "evr_glazing")
        .expect("the glazing gate must have a secure handoff request");

    assert_eq!(packet.schema_version, EVIDENCE_INTAKE_PACKET_SCHEMA_VERSION);
    assert_eq!(packet.project_id, "threshold-dwelling");
    assert_eq!(packet.requests.len(), 9);
    assert!(!packet.client_file_upload_available);
    assert!(!packet.construction_ready());
    assert_eq!(glazing_request.review_status, "missing");
    assert!(glazing_request
        .required_fields
        .contains(&EvidenceIntakeField::ContentSha256));
    assert!(glazing_request
        .required_fields
        .contains(&EvidenceIntakeField::QualifiedReviewRequest));
    assert!(!glazing_request.client_file_upload_available);
    assert!(!client_json.contains("vaultRecordId"));
    assert!(!client_json.contains("sourcePath"));
    assert!(!client_json.contains("documentContent"));
}

#[test]
fn checked_in_browser_evidence_intake_packet_is_an_exact_rust_projection() {
    let checked_in: serde_json::Value = serde_json::from_str(include_str!(
        "../../space/src/lib/workway/threshold-dwelling-evidence-intake-packet.json"
    ))
    .expect("the checked-in client handoff packet must be valid JSON");
    let expected = serde_json::to_value(
        threshold_dwelling_evidence_intake_packet_v08()
            .expect("the Threshold Dwelling fixture should project safely"),
    )
    .expect("the packet serializes");

    assert_eq!(checked_in, expected);
}
