//! WorkWay's deterministic project-state kernel.
//!
//! This crate owns no rendering and makes no construction-readiness claim.

pub mod change_proposal;
pub mod composer;
pub mod project_graph;
pub mod spatial_package;

pub use change_proposal::{
    threshold_dwelling_concrete_envelope_material_role_proposal_v08,
    threshold_dwelling_kitchen_island_clearance_proposal_v08, validate_change_proposal,
    ChangeProposal, ChangeProposalValidation, DeterministicOperation, MeasurementDelta,
    CHANGE_PROPOSAL_SCHEMA_VERSION,
};
pub use composer::{
    decide_composer_proposal, interpret_threshold_dwelling_composer_intent,
    threshold_dwelling_composer_contract_v08, ComposerBlockedIntentRule,
    ComposerContractProjection, ComposerDecision, ComposerDecisionReceipt, ComposerInterpretation,
    ComposerSupportedIntent, COMPOSER_CONTRACT_SCHEMA_VERSION,
};
pub use project_graph::{
    project_client_evidence_readiness, threshold_dwelling_evidence_manifest_v08,
    threshold_dwelling_project_graph_v08, validate_private_evidence_manifest,
    validate_project_graph, ClientEvidenceReadiness, ClientEvidenceReadinessEntry,
    DimensionTruthScope, EvidenceReference, EvidenceSourceClass, PrivateEvidenceManifest,
    PrivateEvidenceManifestValidation, PrivateEvidenceRecord, PrivateEvidenceReviewStatus,
    ProjectGraph, ProjectGraphValidation, SemanticEntity, SemanticEntityKind,
    CLIENT_EVIDENCE_READINESS_SCHEMA_VERSION, PRIVATE_EVIDENCE_MANIFEST_SCHEMA_VERSION,
    PROJECT_GRAPH_SCHEMA_VERSION,
};
pub use spatial_package::{
    threshold_dwelling_spatial_package_v08, validate_spatial_package, ClientAsset,
    ClientSourceDocumentAccess, EntityRenderBinding, LocomotionModel, MaterialContract,
    PhysicalSceneContract, PhysicalSceneEvidenceFact, PortalTraversal, ProjectRevisionReference,
    RoomChapter, SafeStageGuidance, SceneFormat, SceneRepresentation, SceneRepresentationStatus,
    SpatialPackage, SpatialPackageValidation, SpatialPortal, SpatialScale, ValidationReceipt,
    SPATIAL_PACKAGE_SCHEMA_VERSION,
};

use serde::{Deserialize, Serialize};

/// Versioned, client-safe contract for professional-review evidence and
/// determination progress. It is a workflow contract, never a permit.
pub const PROFESSIONAL_REVIEW_PACKET_SCHEMA_VERSION: &str = "workway.professional-review-packet.v1";

/// The only status available to an imported design until professionals attach
/// and review the required source documents.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ProjectStatus {
    CandidateDesignIntent,
}

/// An integer-inch rectangle within the project plan datum.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlanZone {
    pub id: String,
    pub x_in: u32,
    pub y_in: u32,
    pub width_in: u32,
    pub height_in: u32,
    pub kind: String,
}

impl PlanZone {
    #[must_use]
    pub fn new(
        id: impl Into<String>,
        x_in: u32,
        y_in: u32,
        width_in: u32,
        height_in: u32,
        kind: impl Into<String>,
    ) -> Self {
        Self {
            id: id.into(),
            x_in,
            y_in,
            width_in,
            height_in,
            kind: kind.into(),
        }
    }

    #[must_use]
    pub fn area_sq_ft(&self) -> u64 {
        u64::from(self.width_in) * u64::from(self.height_in) / 144
    }
}

/// A human-approved design decision attached to a project revision.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectDecision {
    pub id: String,
    pub title: String,
    pub decision: String,
}

/// Deterministic, render-independent project state.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectBaseline {
    pub id: String,
    pub revision: String,
    pub status: ProjectStatus,
    pub footprint_width_in: u32,
    pub footprint_depth_in: u32,
    pub zones: Vec<PlanZone>,
    pub decisions: Vec<ProjectDecision>,
}

impl ProjectBaseline {
    #[must_use]
    pub fn validate_dimensions(&self) -> DimensionValidation {
        let footprint_area_sq_ft =
            u64::from(self.footprint_width_in) * u64::from(self.footprint_depth_in) / 144;
        let classified_area_sq_ft = self.zones.iter().map(PlanZone::area_sq_ft).sum::<u64>();
        let out_of_bounds_zone_ids = self
            .zones
            .iter()
            .filter(|zone| !zone_is_within_footprint(zone, self))
            .map(|zone| zone.id.clone())
            .collect::<Vec<_>>();
        let zero_area_zone_ids = self
            .zones
            .iter()
            .filter(|zone| zone.width_in == 0 || zone.height_in == 0)
            .map(|zone| zone.id.clone())
            .collect::<Vec<_>>();
        let overlapping_zone_pairs = self
            .zones
            .iter()
            .enumerate()
            .flat_map(|(index, zone)| {
                self.zones
                    .iter()
                    .skip(index + 1)
                    .filter(move |other| zones_overlap(zone, other))
                    .map(move |other| [zone.id.clone(), other.id.clone()])
            })
            .collect::<Vec<_>>();

        DimensionValidation {
            footprint_area_sq_ft,
            classified_area_sq_ft,
            unclassified_enclosed_area_sq_ft: footprint_area_sq_ft
                .saturating_sub(classified_area_sq_ft),
            out_of_bounds_zone_ids,
            overlapping_zone_pairs,
            zero_area_zone_ids,
        }
    }
}

fn zone_is_within_footprint(zone: &PlanZone, project: &ProjectBaseline) -> bool {
    u64::from(zone.x_in) + u64::from(zone.width_in) <= u64::from(project.footprint_width_in)
        && u64::from(zone.y_in) + u64::from(zone.height_in) <= u64::from(project.footprint_depth_in)
}

fn zones_overlap(first: &PlanZone, second: &PlanZone) -> bool {
    let first_left = u64::from(first.x_in);
    let first_right = first_left + u64::from(first.width_in);
    let first_top = u64::from(first.y_in);
    let first_bottom = first_top + u64::from(first.height_in);
    let second_left = u64::from(second.x_in);
    let second_right = second_left + u64::from(second.width_in);
    let second_top = u64::from(second.y_in);
    let second_bottom = second_top + u64::from(second.height_in);

    first_left < second_right
        && first_right > second_left
        && first_top < second_bottom
        && first_bottom > second_top
}

/// Arithmetic validation only. It is not a survey, building-code, or
/// construction validation result.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DimensionValidation {
    pub footprint_area_sq_ft: u64,
    pub classified_area_sq_ft: u64,
    pub unclassified_enclosed_area_sq_ft: u64,
    pub out_of_bounds_zone_ids: Vec<String>,
    pub overlapping_zone_pairs: Vec<[String; 2]>,
    pub zero_area_zone_ids: Vec<String>,
}

impl DimensionValidation {
    /// `true` only if the zone rectangles fully and exclusively partition the
    /// declared footprint. This remains arithmetic validation, not a survey,
    /// code, or construction determination.
    #[must_use]
    pub fn is_complete_partition(&self) -> bool {
        self.classified_area_sq_ft == self.footprint_area_sq_ft
            && self.unclassified_enclosed_area_sq_ft == 0
            && self.out_of_bounds_zone_ids.is_empty()
            && self.overlapping_zone_pairs.is_empty()
            && self.zero_area_zone_ids.is_empty()
    }
}

/// Required discipline-specific evidence before a project can ask a human for
/// a construction-readiness determination.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ProfessionalReviewRequirement {
    LicensedSiteSurvey,
    CoordinatedArchitecturalPackage,
    StructuralAndWindDesign,
    MechanicalElectricalPlumbingDesign,
    EnergyCompliancePackage,
    JurisdictionalDetermination,
}

impl ProfessionalReviewRequirement {
    pub const ALL: [Self; 6] = [
        Self::LicensedSiteSurvey,
        Self::CoordinatedArchitecturalPackage,
        Self::StructuralAndWindDesign,
        Self::MechanicalElectricalPlumbingDesign,
        Self::EnergyCompliancePackage,
        Self::JurisdictionalDetermination,
    ];

    #[must_use]
    pub const fn id(self) -> &'static str {
        match self {
            Self::LicensedSiteSurvey => "licensed-site-survey",
            Self::CoordinatedArchitecturalPackage => "coordinated-architectural-package",
            Self::StructuralAndWindDesign => "structural-and-wind-design",
            Self::MechanicalElectricalPlumbingDesign => "mechanical-electrical-plumbing-design",
            Self::EnergyCompliancePackage => "energy-compliance-package",
            Self::JurisdictionalDetermination => "jurisdictional-determination",
        }
    }
}

/// Workflow state for a human professional or authority determination. An
/// issued determination must be attached as an external artifact; this core
/// never turns it into construction authorization.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum DeterminationStatus {
    NotRequested,
    Requested,
    Issued,
}

/// A reference to a determination that a responsible professional or the
/// authority having jurisdiction may issue outside WorkWay.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfessionalDetermination {
    pub id: String,
    pub requirement_id: ProfessionalReviewRequirement,
    pub status: DeterminationStatus,
    pub scope: String,
    pub source_document_id: Option<String>,
    pub issued_by: Option<String>,
    pub issuer_credential: Option<String>,
    pub issued_at: Option<String>,
    pub conditions: Vec<String>,
}

/// The determination portion of a professional-review packet. It models
/// progress transparently while preserving the rule that only the responsible
/// professionals and applicable authority control construction permission.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeterminationRegister {
    pub schema_version: String,
    pub project_id: String,
    pub project_revision: String,
    pub determinations: Vec<ProfessionalDetermination>,
    construction_ready: bool,
}

impl DeterminationRegister {
    /// This core has no authority to issue a permit or construction release.
    #[must_use]
    pub const fn construction_ready(&self) -> bool {
        self.construction_ready
    }
}

/// Status of the evidence attached to a review requirement.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum EvidenceStatus {
    Missing,
    Submitted,
    Accepted,
}

/// A document record. `Accepted` becomes effective only when `reviewed_by` is
/// populated by a designated reviewer.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvidenceRecord {
    pub requirement: ProfessionalReviewRequirement,
    pub status: EvidenceStatus,
    pub document_id: String,
    pub submitted_by: String,
    pub reviewed_by: Option<String>,
}

/// The effective state of one professional-review requirement.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RequirementAssessment {
    pub requirement: ProfessionalReviewRequirement,
    pub status: EvidenceStatus,
    pub evidence: Vec<EvidenceRecord>,
}

/// Evidence progress. `construction_ready` is intentionally immutable at
/// `false`; the final determination belongs to responsible professionals and
/// the authority having jurisdiction.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfessionalReviewAssessment {
    pub project_id: String,
    pub requirements: Vec<RequirementAssessment>,
    pub missing_requirements: Vec<ProfessionalReviewRequirement>,
    pub can_request_professional_determination: bool,
    construction_ready: bool,
}

impl ProfessionalReviewAssessment {
    /// This kernel never marks a project construction-ready. Consumers can
    /// display the guard, but cannot construct an assessment with a different
    /// readiness value.
    #[must_use]
    pub const fn construction_ready(&self) -> bool {
        self.construction_ready
    }
}

fn effective_evidence_status(evidence: &[EvidenceRecord]) -> EvidenceStatus {
    if evidence.iter().any(|record| {
        record.status == EvidenceStatus::Accepted
            && record
                .reviewed_by
                .as_deref()
                .is_some_and(|reviewer| !reviewer.trim().is_empty())
    }) {
        return EvidenceStatus::Accepted;
    }
    if evidence.is_empty() {
        EvidenceStatus::Missing
    } else {
        EvidenceStatus::Submitted
    }
}

/// Assess an evidence packet without turning it into a permit, code, or
/// construction decision.
#[must_use]
pub fn assess_professional_review(
    project: &ProjectBaseline,
    evidence: &[EvidenceRecord],
) -> ProfessionalReviewAssessment {
    let requirements = ProfessionalReviewRequirement::ALL
        .into_iter()
        .map(|requirement| {
            let matching_evidence = evidence
                .iter()
                .filter(|record| record.requirement == requirement)
                .cloned()
                .collect::<Vec<_>>();
            let status = effective_evidence_status(&matching_evidence);

            RequirementAssessment {
                requirement,
                status,
                evidence: matching_evidence,
            }
        })
        .collect::<Vec<_>>();
    let missing_requirements = requirements
        .iter()
        .filter(|assessment| assessment.status != EvidenceStatus::Accepted)
        .map(|assessment| assessment.requirement)
        .collect::<Vec<_>>();

    ProfessionalReviewAssessment {
        project_id: project.id.clone(),
        requirements,
        can_request_professional_determination: missing_requirements.is_empty(),
        missing_requirements,
        construction_ready: false,
    }
}

/// Initial determination register for the v0.5 Threshold Dwelling candidate.
/// Every row is deliberately unissued until a responsible professional or the
/// authority having jurisdiction supplies a revision-specific artifact.
#[must_use]
pub fn threshold_dwelling_determination_register_v05() -> DeterminationRegister {
    let determinations = [
        (
            ProfessionalReviewRequirement::LicensedSiteSurvey,
            "Establish the parcel boundary, easements, topographic datum, and site reference.",
        ),
        (
            ProfessionalReviewRequirement::CoordinatedArchitecturalPackage,
            "Coordinate revision 0.5 plans, elevations, sections, schedules, and assembly details.",
        ),
        (
            ProfessionalReviewRequirement::StructuralAndWindDesign,
            "Establish foundation, load path, wind/bracing criteria, connections, and roof framing.",
        ),
        (
            ProfessionalReviewRequirement::MechanicalElectricalPlumbingDesign,
            "Coordinate HVAC, electrical, plumbing, ventilation, condensate, and equipment clearances.",
        ),
        (
            ProfessionalReviewRequirement::EnergyCompliancePackage,
            "Establish the jurisdiction-appropriate energy compliance basis for the selected envelope and systems.",
        ),
        (
            ProfessionalReviewRequirement::JurisdictionalDetermination,
            "Confirm zoning, plat, setbacks, access, permit path, and authority conditions for the actual parcel.",
        ),
    ]
    .into_iter()
    .map(|(requirement, scope)| ProfessionalDetermination {
        id: format!("{}-determination", requirement.id()),
        requirement_id: requirement,
        status: DeterminationStatus::NotRequested,
        scope: scope.into(),
        source_document_id: None,
        issued_by: None,
        issuer_credential: None,
        issued_at: None,
        conditions: vec![],
    })
    .collect();

    DeterminationRegister {
        schema_version: PROFESSIONAL_REVIEW_PACKET_SCHEMA_VERSION.into(),
        project_id: "threshold-dwelling".into(),
        project_revision: "0.5".into(),
        determinations,
        construction_ready: false,
    }
}

/// The v0.5 Threshold Dwelling parity fixture. It is a test bridge from the
/// current Canon candidate and must not be treated as a construction document.
#[must_use]
pub fn threshold_dwelling_baseline_v05() -> ProjectBaseline {
    ProjectBaseline {
        id: "threshold-dwelling".into(),
        revision: "0.5".into(),
        status: ProjectStatus::CandidateDesignIntent,
        footprint_width_in: 780,
        footprint_depth_in: 504,
        zones: vec![
            PlanZone::new("laundry", 0, 0, 144, 48, "service"),
            PlanZone::new("pantry", 0, 48, 144, 108, "service"),
            PlanZone::new("dog-utility", 660, 0, 120, 72, "service"),
            PlanZone::new("guest-bath", 660, 72, 120, 84, "public"),
            PlanZone::new("west-hall", 0, 156, 144, 84, "public"),
            PlanZone::new("center-hall", 144, 156, 516, 84, "public"),
            PlanZone::new("entry-hall", 660, 156, 120, 84, "public"),
            PlanZone::new("daughter-suite", 0, 240, 216, 264, "private"),
            PlanZone::new("primary-suite", 216, 240, 252, 264, "private"),
            PlanZone::new("inlaw-suite", 468, 240, 312, 264, "private"),
            PlanZone::new("open-living", 144, 0, 516, 156, "open"),
        ],
        decisions: vec![
            ProjectDecision {
                id: "east-projection-envelope".into(),
                title: "Use the 10 ft by 27 ft east projection".into(),
                decision:
                    "Dog kennel, carport, and covered entry form one 10 ft by 27 ft projection."
                        .into(),
            },
            ProjectDecision {
                id: "entry-hall-program".into(),
                title: "Classify the east arrival band as the Entry Hall".into(),
                decision: "The 10 ft by 7 ft band links the main entry to the central hall.".into(),
            },
        ],
    }
}
