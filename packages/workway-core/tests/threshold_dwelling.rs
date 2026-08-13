use workway_core::{
    assess_professional_review, threshold_dwelling_baseline_v05,
    threshold_dwelling_determination_register_v05, DeterminationStatus, EvidenceRecord,
    EvidenceStatus, PlanZone, ProfessionalReviewRequirement, ProjectBaseline, ProjectStatus,
    PROFESSIONAL_REVIEW_PACKET_SCHEMA_VERSION,
};

#[test]
fn json_contract_keeps_project_and_readiness_fields_client_safe() {
    let project = threshold_dwelling_baseline_v05();
    let review = assess_professional_review(&project, &[]);
    let project_json = serde_json::to_value(project).expect("project fixture serializes");
    let review_json = serde_json::to_value(review).expect("review assessment serializes");

    assert_eq!(project_json["footprintWidthIn"], 780);
    assert_eq!(project_json["status"], "candidateDesignIntent");
    assert_eq!(review_json["constructionReady"], false);
    assert_eq!(review_json["canRequestProfessionalDetermination"], false);
    assert_eq!(
        review_json["missingRequirements"].as_array().map(Vec::len),
        Some(6)
    );
}

#[test]
fn determination_register_tracks_unissued_human_decisions_without_authority_to_construct() {
    let register = threshold_dwelling_determination_register_v05();
    let register_json = serde_json::to_value(&register).expect("determination register serializes");

    assert_eq!(
        register.schema_version,
        PROFESSIONAL_REVIEW_PACKET_SCHEMA_VERSION
    );
    assert_eq!(register.project_id, "threshold-dwelling");
    assert_eq!(register.project_revision, "0.5");
    assert_eq!(register.determinations.len(), 6);
    assert!(register
        .determinations
        .iter()
        .all(|determination| determination.status == DeterminationStatus::NotRequested));
    assert!(!register.construction_ready());
    assert_eq!(
        register_json["schemaVersion"],
        PROFESSIONAL_REVIEW_PACKET_SCHEMA_VERSION
    );
    assert_eq!(register_json["constructionReady"], false);
    assert_eq!(
        register_json["determinations"][0]["id"],
        "licensed-site-survey-determination"
    );
    assert_eq!(
        register_json["determinations"][0]["requirementId"],
        "licensed-site-survey"
    );
}

#[test]
fn threshold_dwelling_preserves_a_complete_candidate_baseline_and_missing_review_intake() {
    let project = threshold_dwelling_baseline_v05();
    let dimensions = project.validate_dimensions();
    let review = assess_professional_review(&project, &[]);

    assert_eq!(project.revision, "0.5");
    assert_eq!(dimensions.footprint_area_sq_ft, 2_730);
    assert_eq!(dimensions.classified_area_sq_ft, 2_730);
    assert_eq!(dimensions.unclassified_enclosed_area_sq_ft, 0);
    assert!(dimensions.is_complete_partition());
    assert!(!review.construction_ready());
    assert!(!review.can_request_professional_determination);
    assert_eq!(
        review.missing_requirements,
        ProfessionalReviewRequirement::ALL.to_vec()
    );
}

#[test]
fn geometry_validation_rejects_overlapping_or_out_of_bounds_zones() {
    let project = ProjectBaseline {
        id: "invalid-fixture".into(),
        revision: "0.0".into(),
        status: ProjectStatus::CandidateDesignIntent,
        footprint_width_in: 120,
        footprint_depth_in: 120,
        zones: vec![
            PlanZone::new("first", 0, 0, 72, 72, "test"),
            PlanZone::new("second", 48, 0, 72, 72, "test"),
            PlanZone::new("outside", 0, 100, 24, 24, "test"),
        ],
        decisions: vec![],
    };

    let dimensions = project.validate_dimensions();

    assert_eq!(
        dimensions.overlapping_zone_pairs,
        vec![["first".to_owned(), "second".to_owned()]]
    );
    assert_eq!(dimensions.out_of_bounds_zone_ids, vec!["outside"]);
    assert!(!dimensions.is_complete_partition());
}

#[test]
fn reviewer_attested_evidence_can_request_but_never_replace_a_professional_determination() {
    let project = threshold_dwelling_baseline_v05();
    let evidence = ProfessionalReviewRequirement::ALL.map(|requirement| EvidenceRecord {
        requirement,
        status: EvidenceStatus::Accepted,
        document_id: format!("{requirement:?}-revision-01"),
        submitted_by: "qualified professional".into(),
        reviewed_by: Some("project reviewer".into()),
    });
    let review = assess_professional_review(&project, &evidence);

    assert!(review.missing_requirements.is_empty());
    assert!(review.can_request_professional_determination);
    assert!(!review.construction_ready());
}

#[test]
fn self_attested_acceptance_without_a_reviewer_remains_submitted() {
    let project = threshold_dwelling_baseline_v05();
    let evidence = ProfessionalReviewRequirement::ALL.map(|requirement| EvidenceRecord {
        requirement,
        status: EvidenceStatus::Accepted,
        document_id: format!("{requirement:?}-revision-01"),
        submitted_by: "unreviewed sender".into(),
        reviewed_by: None,
    });
    let review = assess_professional_review(&project, &evidence);

    assert!(!review.can_request_professional_determination);
    assert_eq!(
        review.missing_requirements,
        ProfessionalReviewRequirement::ALL.to_vec()
    );
    assert!(review
        .requirements
        .iter()
        .all(|requirement| requirement.status == EvidenceStatus::Submitted));
}
