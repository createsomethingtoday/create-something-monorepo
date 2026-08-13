//! Client-safe spatial-package contracts.
//!
//! A spatial package is a derived, cacheable delivery artifact. It identifies
//! the project revision it came from, names the available scene
//! representations, maps semantic entities to render entities, and defines
//! bounded room-chapter navigation. It never becomes the source of geometric
//! truth or a construction authorization.

use std::collections::BTreeSet;

use serde::{Deserialize, Serialize};

/// The schema identifier shared by future Swift, TypeScript, and Rust clients.
pub const SPATIAL_PACKAGE_SCHEMA_VERSION: &str = "workway.spatial-package.v1";

/// A project revision that is authoritative for a spatial package.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectRevisionReference {
    pub project_id: String,
    pub project_revision: String,
}

/// Client packages may not contain original source documents or extracted
/// unrestricted document content.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ClientSourceDocumentAccess {
    Excluded,
}

/// A client-side asset with a content hash.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClientAsset {
    pub id: String,
    pub client_path: String,
    pub sha256: String,
}

/// Client-safe reference to a project-graph material schedule. This holds
/// codified roles only; it never claims a selected product or construction
/// performance value.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MaterialContract {
    pub schedule_id: String,
    pub material_binding_status: String,
    pub rendered_material_ids: Vec<String>,
    pub construction_ready: bool,
}

/// A client-safe visual-truth gate. It blocks physical 1:1 vertical scenes
/// until geometry has accepted, traceable evidence; it never authorizes work.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PhysicalSceneContract {
    pub issuance_id: String,
    pub status: String,
    pub coordinate_truth: String,
    pub unissued_fact_ids: Vec<String>,
    pub can_generate_physical_one_to_one_scene: bool,
    pub construction_ready: bool,
}

/// A scene representation consumers may request after pre-caching a package.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum SceneFormat {
    Svg,
    Png,
    Glb,
    Usd,
    Usdz,
}

/// Explicitly distinguish delivered scene data from a future capability.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum SceneRepresentationStatus {
    Available,
    Unissued,
}

/// A viewable representation of the package's scene.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SceneRepresentation {
    pub id: String,
    pub format: SceneFormat,
    pub status: SceneRepresentationStatus,
    pub canonical_revision: String,
    pub spatial_revision: String,
    pub asset_id: Option<String>,
}

/// Connects a stable semantic identifier to a renderer-facing identifier.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntityRenderBinding {
    pub entity_id: String,
    pub render_entity_id: String,
}

/// Room chapters stay dimensionally one-to-one while their local stage can be
/// rebased around a participant between transitions.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum SpatialScale {
    OneToOne,
}

/// Movement is intentionally chapter-based, not unbounded virtual walking.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum LocomotionModel {
    RoomChapterRebase,
}

/// Client guidance for configuring a bounded physical stage. It does not
/// certify the stage, building, or participant safety.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SafeStageGuidance {
    pub minimum_width_in: u32,
    pub minimum_depth_in: u32,
    pub locomotion: LocomotionModel,
    pub statement: String,
}

/// A selected spatial chapter in a much larger project.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RoomChapter {
    pub id: String,
    pub entity_id: String,
    pub width_in: u32,
    pub depth_in: u32,
    pub scale: SpatialScale,
    pub safe_stage: SafeStageGuidance,
}

/// A deliberate transition between chapters.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum PortalTraversal {
    ExplicitTransition,
}

/// A navigable relationship between room chapters.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpatialPortal {
    pub id: String,
    pub from_chapter_id: String,
    pub to_chapter_id: String,
    pub traversal: PortalTraversal,
}

/// An attached deterministic assessment that explains why a package is
/// eligible for a client. It is not a construction or code-compliance receipt.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidationReceipt {
    pub id: String,
    pub assessment: String,
    pub source_revision: String,
}

/// The immutable metadata and derived render/navigation instructions a client
/// may receive for one project revision.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpatialPackage {
    pub schema_version: String,
    pub id: String,
    pub canonical_project: ProjectRevisionReference,
    pub spatial_revision: String,
    pub client_source_documents: ClientSourceDocumentAccess,
    pub material_contract: MaterialContract,
    pub physical_scene_contract: PhysicalSceneContract,
    pub assets: Vec<ClientAsset>,
    pub scene_representations: Vec<SceneRepresentation>,
    pub entity_render_bindings: Vec<EntityRenderBinding>,
    pub room_chapters: Vec<RoomChapter>,
    pub portals: Vec<SpatialPortal>,
    pub validation_receipts: Vec<ValidationReceipt>,
    pub construction_ready: bool,
}

/// A deterministic report designed to give a client or agent enough evidence
/// to repair an invalid package without replacing professional review.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpatialPackageValidation {
    pub package_id: String,
    pub issue_ids: Vec<String>,
    pub client_safe: bool,
    pub construction_ready: bool,
}

impl SpatialPackageValidation {
    #[must_use]
    pub const fn is_valid(&self) -> bool {
        self.client_safe && !self.construction_ready
    }
}

fn contains_duplicate_ids<'a>(ids: impl IntoIterator<Item = &'a str>) -> bool {
    let mut seen = BTreeSet::new();
    ids.into_iter().any(|id| !seen.insert(id))
}

fn is_safe_client_path(path: &str) -> bool {
    let normalized = path.trim();
    let lower = normalized.to_ascii_lowercase();

    !normalized.is_empty()
        && normalized == path
        && !normalized.starts_with('/')
        && !normalized.contains('\\')
        && !normalized.contains("..")
        && !normalized.contains("://")
        && !lower.contains("private")
        && !lower.contains("source")
        && !lower.contains("upload")
        && !lower.ends_with(".pdf")
}

fn is_sha256(value: &str) -> bool {
    value.len() == 64 && value.bytes().all(|byte| byte.is_ascii_hexdigit())
}

/// Validates the parts of a spatial package that can be checked without a
/// scene engine, a site, or a professional determination.
#[must_use]
pub fn validate_spatial_package(package: &SpatialPackage) -> SpatialPackageValidation {
    let mut issue_ids = Vec::new();

    if package.schema_version != SPATIAL_PACKAGE_SCHEMA_VERSION {
        issue_ids.push("schema-version-mismatch".into());
    }
    if package.id.trim().is_empty()
        || package.canonical_project.project_id.trim().is_empty()
        || package.canonical_project.project_revision.trim().is_empty()
        || package.spatial_revision.trim().is_empty()
    {
        issue_ids.push("required-identity-missing".into());
    }
    if package.construction_ready {
        issue_ids.push("construction-ready-must-be-false".into());
    }
    if package.material_contract.schedule_id.trim().is_empty()
        || package.material_contract.material_binding_status != "role-codified-product-unselected"
        || package.material_contract.rendered_material_ids.is_empty()
        || contains_duplicate_ids(
            package
                .material_contract
                .rendered_material_ids
                .iter()
                .map(String::as_str),
        )
        || package.material_contract.construction_ready
    {
        issue_ids.push("invalid-material-contract".into());
    }
    let expected_physical_scene_status = if package
        .physical_scene_contract
        .can_generate_physical_one_to_one_scene
    {
        "eligible-with-professional-review"
    } else {
        "blocked-vertical-geometry-unissued"
    };
    if package
        .physical_scene_contract
        .issuance_id
        .trim()
        .is_empty()
        || package.physical_scene_contract.coordinate_truth != "revised-plan-horizontal-only"
        || contains_duplicate_ids(
            package
                .physical_scene_contract
                .unissued_fact_ids
                .iter()
                .map(String::as_str),
        )
        || package.physical_scene_contract.status != expected_physical_scene_status
        || (package
            .physical_scene_contract
            .can_generate_physical_one_to_one_scene
            && !package.physical_scene_contract.unissued_fact_ids.is_empty())
        || (!package
            .physical_scene_contract
            .can_generate_physical_one_to_one_scene
            && package.physical_scene_contract.unissued_fact_ids.is_empty())
        || package.physical_scene_contract.construction_ready
    {
        issue_ids.push("invalid-physical-scene-contract".into());
    }

    if contains_duplicate_ids(package.assets.iter().map(|asset| asset.id.as_str())) {
        issue_ids.push("duplicate-asset-id".into());
    }
    for asset in &package.assets {
        if !is_safe_client_path(&asset.client_path) {
            issue_ids.push("unsafe-client-asset-path".into());
        }
        if !is_sha256(&asset.sha256) {
            issue_ids.push("invalid-client-asset-hash".into());
        }
    }

    if contains_duplicate_ids(
        package
            .scene_representations
            .iter()
            .map(|representation| representation.id.as_str()),
    ) {
        issue_ids.push("duplicate-scene-representation-id".into());
    }
    let available_asset_ids = package
        .assets
        .iter()
        .map(|asset| asset.id.as_str())
        .collect::<BTreeSet<_>>();
    let formats = package
        .scene_representations
        .iter()
        .map(|representation| representation.format)
        .collect::<BTreeSet<_>>();
    if !formats.contains(&SceneFormat::Usd) || !formats.contains(&SceneFormat::Usdz) {
        issue_ids.push("spatial-asset-capability-not-declared".into());
    }
    if !package
        .scene_representations
        .iter()
        .any(|representation| representation.status == SceneRepresentationStatus::Available)
    {
        issue_ids.push("no-available-client-scene-representation".into());
    }
    for representation in &package.scene_representations {
        if representation.canonical_revision != package.canonical_project.project_revision {
            issue_ids.push("representation-canonical-revision-mismatch".into());
        }
        if representation.spatial_revision != package.spatial_revision {
            issue_ids.push("representation-spatial-revision-mismatch".into());
        }
        match (representation.status, representation.asset_id.as_deref()) {
            (SceneRepresentationStatus::Available, Some(asset_id))
                if available_asset_ids.contains(asset_id) => {}
            (SceneRepresentationStatus::Available, _) => {
                issue_ids.push("available-representation-missing-client-asset".into());
            }
            (SceneRepresentationStatus::Unissued, None) => {}
            (SceneRepresentationStatus::Unissued, Some(_)) => {
                issue_ids.push("unissued-representation-must-not-name-client-asset".into());
            }
        }
    }

    if contains_duplicate_ids(
        package
            .entity_render_bindings
            .iter()
            .map(|binding| binding.entity_id.as_str()),
    ) {
        issue_ids.push("duplicate-semantic-entity-id".into());
    }
    if contains_duplicate_ids(
        package
            .entity_render_bindings
            .iter()
            .map(|binding| binding.render_entity_id.as_str()),
    ) {
        issue_ids.push("duplicate-render-entity-id".into());
    }

    if contains_duplicate_ids(
        package
            .room_chapters
            .iter()
            .map(|chapter| chapter.id.as_str()),
    ) {
        issue_ids.push("duplicate-room-chapter-id".into());
    }
    let binding_entity_ids = package
        .entity_render_bindings
        .iter()
        .map(|binding| binding.entity_id.as_str())
        .collect::<BTreeSet<_>>();
    for chapter in &package.room_chapters {
        if !binding_entity_ids.contains(chapter.entity_id.as_str()) {
            issue_ids.push("room-chapter-entity-is-not-render-bound".into());
        }
        if chapter.width_in == 0 || chapter.depth_in == 0 {
            issue_ids.push("room-chapter-dimensions-must-be-positive".into());
        }
        if chapter.safe_stage.minimum_width_in == 0 || chapter.safe_stage.minimum_depth_in == 0 {
            issue_ids.push("safe-stage-dimensions-must-be-positive".into());
        }
    }

    if contains_duplicate_ids(package.portals.iter().map(|portal| portal.id.as_str())) {
        issue_ids.push("duplicate-portal-id".into());
    }
    let chapter_ids = package
        .room_chapters
        .iter()
        .map(|chapter| chapter.id.as_str())
        .collect::<BTreeSet<_>>();
    for portal in &package.portals {
        if portal.from_chapter_id == portal.to_chapter_id {
            issue_ids.push("portal-must-connect-distinct-chapters".into());
        }
        if !chapter_ids.contains(portal.from_chapter_id.as_str())
            || !chapter_ids.contains(portal.to_chapter_id.as_str())
        {
            issue_ids.push("portal-target-chapter-missing".into());
        }
    }

    if package.validation_receipts.is_empty() {
        issue_ids.push("validation-receipt-required".into());
    }
    if contains_duplicate_ids(
        package
            .validation_receipts
            .iter()
            .map(|receipt| receipt.id.as_str()),
    ) {
        issue_ids.push("duplicate-validation-receipt-id".into());
    }
    if package
        .validation_receipts
        .iter()
        .any(|receipt| receipt.source_revision != package.spatial_revision)
    {
        issue_ids.push("validation-receipt-spatial-revision-mismatch".into());
    }

    issue_ids.sort();
    issue_ids.dedup();
    let client_safe = issue_ids.is_empty();

    SpatialPackageValidation {
        package_id: package.id.clone(),
        issue_ids,
        client_safe,
        construction_ready: false,
    }
}

/// The first spatial package fixture. It is intentionally limited to
/// deterministic browser assets. USD and USDZ are declared but unissued so no
/// consumer confuses the web proof with a shipped native spatial client.
#[must_use]
pub fn threshold_dwelling_spatial_package_v08() -> SpatialPackage {
    let stage_statement =
        "Minimum physical-stage guidance for a rebased room chapter; not a physical safety certification or architectural clearance.";

    SpatialPackage {
        schema_version: SPATIAL_PACKAGE_SCHEMA_VERSION.into(),
        id: "threshold-dwelling-r08-spatial-package".into(),
        canonical_project: ProjectRevisionReference {
            project_id: "threshold-dwelling".into(),
            project_revision: "0.7".into(),
        },
        spatial_revision: "0.8".into(),
        client_source_documents: ClientSourceDocumentAccess::Excluded,
        material_contract: MaterialContract {
            schedule_id: "threshold-dwelling-rev-0.8-design-intent-assembly-schedule".into(),
            material_binding_status: "role-codified-product-unselected".into(),
            rendered_material_ids: vec![
                "M-INT-002".into(),
                "M-INT-001".into(),
                "M-ENV-002".into(),
                "M-INT-003".into(),
            ],
            construction_ready: false,
        },
        physical_scene_contract: PhysicalSceneContract {
            issuance_id: "threshold-dwelling-rev-0.8-physical-scene-gate".into(),
            status: "blocked-vertical-geometry-unissued".into(),
            coordinate_truth: "revised-plan-horizontal-only".into(),
            unissued_fact_ids: vec![
                "finished-floor-and-site-datum".into(),
                "exterior-wall-assembly-geometry".into(),
                "interior-partition-geometry".into(),
                "roof-and-ceiling-geometry".into(),
                "door-opening-geometry".into(),
                "window-and-glass-opening-geometry".into(),
                "structural-support-and-lateral-geometry".into(),
                "mep-service-coordination-geometry".into(),
                "exterior-grade-and-threshold-geometry".into(),
            ],
            can_generate_physical_one_to_one_scene: false,
            construction_ready: false,
        },
        assets: vec![
            ClientAsset {
                id: "tabletop-plan-svg".into(),
                client_path: "experiments/threshold-dwelling/renders/floor-plan.svg".into(),
                sha256: "c83c9deb796c34f8a94497a2f4e77fdbbbfbc6d584480ea0cf3f9c08bc48e017".into(),
            },
            ClientAsset {
                id: "tabletop-plan-png".into(),
                client_path: "experiments/threshold-dwelling/renders/floor-plan.png".into(),
                sha256: "6bb7955a32628e0fd499b58e7ca57f9c9f3a93cfca46a84ecb1ffc84fdde2a5c".into(),
            },
            ClientAsset {
                id: "public-room-hero-png".into(),
                client_path: "experiments/threshold-dwelling/renders/living-system-public-room-hero-v1.png".into(),
                sha256: "ff78a4af53c0c1117c1cf83db22e451728733dffaba9bd2356a046ebc9ad63ba".into(),
            },
            ClientAsset {
                id: "browser-massing-glb".into(),
                client_path: "experiments/threshold-dwelling/renders/threshold-dwelling-r08-massing-guide.glb".into(),
                sha256: "807b85dea1b6cb276621fc96cde962285112e984946134e26f6fa39e53f75754".into(),
            },
        ],
        scene_representations: vec![
            SceneRepresentation {
                id: "tabletop-svg".into(),
                format: SceneFormat::Svg,
                status: SceneRepresentationStatus::Available,
                canonical_revision: "0.7".into(),
                spatial_revision: "0.8".into(),
                asset_id: Some("tabletop-plan-svg".into()),
            },
            SceneRepresentation {
                id: "tabletop-png".into(),
                format: SceneFormat::Png,
                status: SceneRepresentationStatus::Available,
                canonical_revision: "0.7".into(),
                spatial_revision: "0.8".into(),
                asset_id: Some("tabletop-plan-png".into()),
            },
            SceneRepresentation {
                id: "public-room-hero-png".into(),
                format: SceneFormat::Png,
                status: SceneRepresentationStatus::Available,
                canonical_revision: "0.7".into(),
                spatial_revision: "0.8".into(),
                asset_id: Some("public-room-hero-png".into()),
            },
            SceneRepresentation {
                id: "browser-massing-glb".into(),
                format: SceneFormat::Glb,
                status: SceneRepresentationStatus::Available,
                canonical_revision: "0.7".into(),
                spatial_revision: "0.8".into(),
                asset_id: Some("browser-massing-glb".into()),
            },
            SceneRepresentation {
                id: "native-usd".into(),
                format: SceneFormat::Usd,
                status: SceneRepresentationStatus::Unissued,
                canonical_revision: "0.7".into(),
                spatial_revision: "0.8".into(),
                asset_id: None,
            },
            SceneRepresentation {
                id: "native-usdz".into(),
                format: SceneFormat::Usdz,
                status: SceneRepresentationStatus::Unissued,
                canonical_revision: "0.7".into(),
                spatial_revision: "0.8".into(),
                asset_id: None,
            },
        ],
        entity_render_bindings: vec![
            EntityRenderBinding {
                entity_id: "public-room-kitchen".into(),
                render_entity_id: "public-room/kitchen".into(),
            },
            EntityRenderBinding {
                entity_id: "public-room-dining".into(),
                render_entity_id: "public-room/dining".into(),
            },
            EntityRenderBinding {
                entity_id: "public-room-living".into(),
                render_entity_id: "public-room/living".into(),
            },
            EntityRenderBinding {
                entity_id: "arrival-loggia".into(),
                render_entity_id: "arrival/loggia".into(),
            },
            EntityRenderBinding {
                entity_id: "private-room-daughter-sleep-zone".into(),
                render_entity_id: "private-room/daughter-sleep-zone".into(),
            },
            EntityRenderBinding {
                entity_id: "private-room-primary-sleep-zone".into(),
                render_entity_id: "private-room/primary-sleep-zone".into(),
            },
            EntityRenderBinding {
                entity_id: "private-room-inlaw-sleep-zone".into(),
                render_entity_id: "private-room/inlaw-sleep-zone".into(),
            },
            EntityRenderBinding {
                entity_id: "private-room-inlaw-sitting-zone".into(),
                render_entity_id: "private-room/inlaw-sitting-zone".into(),
            },
        ],
        room_chapters: vec![
            RoomChapter {
                id: "kitchen".into(),
                entity_id: "public-room-kitchen".into(),
                width_in: 180,
                depth_in: 156,
                scale: SpatialScale::OneToOne,
                safe_stage: SafeStageGuidance {
                    minimum_width_in: 96,
                    minimum_depth_in: 96,
                    locomotion: LocomotionModel::RoomChapterRebase,
                    statement: stage_statement.into(),
                },
            },
            RoomChapter {
                id: "dining".into(),
                entity_id: "public-room-dining".into(),
                width_in: 156,
                depth_in: 156,
                scale: SpatialScale::OneToOne,
                safe_stage: SafeStageGuidance {
                    minimum_width_in: 96,
                    minimum_depth_in: 96,
                    locomotion: LocomotionModel::RoomChapterRebase,
                    statement: stage_statement.into(),
                },
            },
            RoomChapter {
                id: "living".into(),
                entity_id: "public-room-living".into(),
                width_in: 180,
                depth_in: 156,
                scale: SpatialScale::OneToOne,
                safe_stage: SafeStageGuidance {
                    minimum_width_in: 96,
                    minimum_depth_in: 96,
                    locomotion: LocomotionModel::RoomChapterRebase,
                    statement: stage_statement.into(),
                },
            },
            RoomChapter {
                id: "arrival".into(),
                entity_id: "arrival-loggia".into(),
                width_in: 120,
                depth_in: 168,
                scale: SpatialScale::OneToOne,
                safe_stage: SafeStageGuidance {
                    minimum_width_in: 96,
                    minimum_depth_in: 96,
                    locomotion: LocomotionModel::RoomChapterRebase,
                    statement: stage_statement.into(),
                },
            },
            RoomChapter {
                id: "daughter-sleep-zone".into(),
                entity_id: "private-room-daughter-sleep-zone".into(),
                width_in: 216,
                depth_in: 168,
                scale: SpatialScale::OneToOne,
                safe_stage: SafeStageGuidance {
                    minimum_width_in: 96,
                    minimum_depth_in: 96,
                    locomotion: LocomotionModel::RoomChapterRebase,
                    statement: stage_statement.into(),
                },
            },
            RoomChapter {
                id: "primary-sleep-zone".into(),
                entity_id: "private-room-primary-sleep-zone".into(),
                width_in: 252,
                depth_in: 180,
                scale: SpatialScale::OneToOne,
                safe_stage: SafeStageGuidance {
                    minimum_width_in: 96,
                    minimum_depth_in: 96,
                    locomotion: LocomotionModel::RoomChapterRebase,
                    statement: stage_statement.into(),
                },
            },
            RoomChapter {
                id: "inlaw-sleep-zone".into(),
                entity_id: "private-room-inlaw-sleep-zone".into(),
                width_in: 192,
                depth_in: 264,
                scale: SpatialScale::OneToOne,
                safe_stage: SafeStageGuidance {
                    minimum_width_in: 96,
                    minimum_depth_in: 96,
                    locomotion: LocomotionModel::RoomChapterRebase,
                    statement: stage_statement.into(),
                },
            },
            RoomChapter {
                id: "inlaw-sitting-zone".into(),
                entity_id: "private-room-inlaw-sitting-zone".into(),
                width_in: 120,
                depth_in: 168,
                scale: SpatialScale::OneToOne,
                safe_stage: SafeStageGuidance {
                    minimum_width_in: 96,
                    minimum_depth_in: 96,
                    locomotion: LocomotionModel::RoomChapterRebase,
                    statement: stage_statement.into(),
                },
            },
        ],
        portals: vec![
            SpatialPortal {
                id: "kitchen-to-dining".into(),
                from_chapter_id: "kitchen".into(),
                to_chapter_id: "dining".into(),
                traversal: PortalTraversal::ExplicitTransition,
            },
            SpatialPortal {
                id: "dining-to-living".into(),
                from_chapter_id: "dining".into(),
                to_chapter_id: "living".into(),
                traversal: PortalTraversal::ExplicitTransition,
            },
            SpatialPortal {
                id: "living-to-arrival".into(),
                from_chapter_id: "living".into(),
                to_chapter_id: "arrival".into(),
                traversal: PortalTraversal::ExplicitTransition,
            },
            SpatialPortal {
                id: "arrival-to-daughter-sleep".into(),
                from_chapter_id: "arrival".into(),
                to_chapter_id: "daughter-sleep-zone".into(),
                traversal: PortalTraversal::ExplicitTransition,
            },
            SpatialPortal {
                id: "daughter-sleep-to-primary-sleep".into(),
                from_chapter_id: "daughter-sleep-zone".into(),
                to_chapter_id: "primary-sleep-zone".into(),
                traversal: PortalTraversal::ExplicitTransition,
            },
            SpatialPortal {
                id: "primary-sleep-to-inlaw-sleep".into(),
                from_chapter_id: "primary-sleep-zone".into(),
                to_chapter_id: "inlaw-sleep-zone".into(),
                traversal: PortalTraversal::ExplicitTransition,
            },
            SpatialPortal {
                id: "inlaw-sleep-to-inlaw-sitting".into(),
                from_chapter_id: "inlaw-sleep-zone".into(),
                to_chapter_id: "inlaw-sitting-zone".into(),
                traversal: PortalTraversal::ExplicitTransition,
            },
        ],
        validation_receipts: vec![
            ValidationReceipt {
                id: "dimensioned-project-review".into(),
                assessment: "Design-intent geometry and revision lineage recorded; no survey or construction determination supplied.".into(),
                source_revision: "0.8".into(),
            },
            ValidationReceipt {
                id: "living-system-review".into(),
                assessment: "Room chapters, circulation intent, material roles, and carport proposal remain proposed design intent.".into(),
                source_revision: "0.8".into(),
            },
        ],
        construction_ready: false,
    }
}
