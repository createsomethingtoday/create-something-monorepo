use workway_core::{
    threshold_dwelling_kitchen_island_clearance_proposal_v08,
    threshold_dwelling_spatial_package_v08, validate_change_proposal, validate_spatial_package,
    DeterministicOperation, SceneFormat, SceneRepresentationStatus, CHANGE_PROPOSAL_SCHEMA_VERSION,
    SPATIAL_PACKAGE_SCHEMA_VERSION,
};

#[test]
fn threshold_dwelling_v08_spatial_package_is_client_safe_without_claiming_native_delivery() {
    let package = threshold_dwelling_spatial_package_v08();
    let validation = validate_spatial_package(&package);

    assert_eq!(package.schema_version, SPATIAL_PACKAGE_SCHEMA_VERSION);
    assert_eq!(package.canonical_project.project_id, "threshold-dwelling");
    assert_eq!(package.canonical_project.project_revision, "0.7");
    assert_eq!(package.spatial_revision, "0.8");
    assert_eq!(
        package.material_contract.schedule_id,
        "threshold-dwelling-rev-0.8-design-intent-assembly-schedule"
    );
    assert_eq!(
        package.material_contract.rendered_material_ids,
        vec!["M-INT-002", "M-INT-001", "M-ENV-002", "M-INT-003"]
    );
    assert!(!package.material_contract.construction_ready);
    assert_eq!(
        package.physical_scene_contract.status,
        "blocked-vertical-geometry-unissued"
    );
    assert_eq!(
        package.physical_scene_contract.client_source_documents,
        "excluded"
    );
    assert_eq!(package.physical_scene_contract.unissued_fact_ids.len(), 9);
    assert!(
        !package
            .physical_scene_contract
            .can_generate_physical_one_to_one_scene
    );
    assert!(validation.is_valid());
    assert!(validation.issue_ids.is_empty());
    assert!(!validation.construction_ready);
    assert_eq!(package.room_chapters.len(), 8);
    assert_eq!(package.portals.len(), 7);
    assert!(package.scene_representations.iter().any(|representation| {
        representation.format == SceneFormat::Usd
            && representation.status == SceneRepresentationStatus::Unissued
            && representation.asset_id.is_none()
    }));
    assert!(package.scene_representations.iter().any(|representation| {
        representation.format == SceneFormat::Usdz
            && representation.status == SceneRepresentationStatus::Unissued
            && representation.asset_id.is_none()
    }));
    assert!(package.scene_representations.iter().any(|representation| {
        representation.format == SceneFormat::Glb
            && representation.status == SceneRepresentationStatus::Available
            && representation.asset_id.as_deref() == Some("browser-massing-glb")
    }));
}

#[test]
fn spatial_package_rejects_revision_private_asset_entity_portal_and_readiness_failures() {
    let mut package = threshold_dwelling_spatial_package_v08();
    package.construction_ready = true;
    package.assets[0].client_path = "sources/private/home-plan.pdf".into();
    package.scene_representations[0].spatial_revision = "0.9".into();
    package.entity_render_bindings[1].render_entity_id = "public-room/kitchen".into();
    package.portals[0].to_chapter_id = "unissued-room".into();
    package.material_contract.construction_ready = true;
    package
        .physical_scene_contract
        .can_generate_physical_one_to_one_scene = true;

    let validation = validate_spatial_package(&package);

    assert!(!validation.is_valid());
    assert!(validation
        .issue_ids
        .contains(&"construction-ready-must-be-false".into()));
    assert!(validation
        .issue_ids
        .contains(&"unsafe-client-asset-path".into()));
    assert!(validation
        .issue_ids
        .contains(&"representation-spatial-revision-mismatch".into()));
    assert!(validation
        .issue_ids
        .contains(&"duplicate-render-entity-id".into()));
    assert!(validation
        .issue_ids
        .contains(&"portal-target-chapter-missing".into()));
    assert!(validation
        .issue_ids
        .contains(&"invalid-material-contract".into()));
    assert!(validation
        .issue_ids
        .contains(&"invalid-physical-scene-contract".into()));
}

#[test]
fn spatial_package_requires_explicit_asset_capability_state_and_valid_delivery_references() {
    let mut package = threshold_dwelling_spatial_package_v08();
    package
        .scene_representations
        .retain(|representation| representation.format != SceneFormat::Usdz);
    package.scene_representations[0].asset_id = Some("missing-asset".into());
    package
        .scene_representations
        .iter_mut()
        .find(|representation| representation.format == SceneFormat::Usd)
        .expect("the fixture declares USD as unissued")
        .asset_id = Some("tabletop-plan-png".into());

    let validation = validate_spatial_package(&package);

    assert!(!validation.is_valid());
    assert!(validation
        .issue_ids
        .contains(&"spatial-asset-capability-not-declared".into()));
    assert!(validation
        .issue_ids
        .contains(&"available-representation-missing-client-asset".into()));
    assert!(validation
        .issue_ids
        .contains(&"unissued-representation-must-not-name-client-asset".into()));
}

#[test]
fn kitchen_island_proposal_is_a_deterministic_review_delta_not_a_construction_release() {
    let proposal = threshold_dwelling_kitchen_island_clearance_proposal_v08();
    let validation = validate_change_proposal(&proposal);

    assert_eq!(proposal.schema_version, CHANGE_PROPOSAL_SCHEMA_VERSION);
    assert_eq!(
        proposal.package_id,
        "threshold-dwelling-r08-spatial-package"
    );
    assert_eq!(proposal.chapter_id, "kitchen");
    assert_eq!(
        proposal.operation,
        DeterministicOperation::MoveEntity {
            entity_id: "kitchen-island".into(),
            delta_x_in: 0,
            delta_y_in: 4,
        }
    );
    assert_eq!(proposal.measurements[0].current_in, 38);
    assert_eq!(proposal.measurements[0].proposed_in, 42);
    assert_eq!(proposal.measurements[0].target_in, Some(42));
    assert!(validation.is_valid());
    assert!(validation.issue_ids.is_empty());
    assert!(!proposal.construction_ready());
    assert!(!validation.construction_ready());
}

#[test]
fn change_proposal_rejects_a_noop_or_unmet_measurement_target() {
    let mut proposal = threshold_dwelling_kitchen_island_clearance_proposal_v08();
    proposal.operation = DeterministicOperation::MoveEntity {
        entity_id: "kitchen-island".into(),
        delta_x_in: 0,
        delta_y_in: 0,
    };
    proposal.measurements[0].proposed_in = 41;

    let validation = validate_change_proposal(&proposal);

    assert!(!validation.is_valid());
    assert!(validation
        .issue_ids
        .contains(&"operation-must-change-project-state".into()));
    assert!(validation
        .issue_ids
        .contains(&"measurement-target-not-met".into()));
}
