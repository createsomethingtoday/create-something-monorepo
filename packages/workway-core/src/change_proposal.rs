//! Deterministic design-change proposals.
//!
//! An agent may suggest one of these compact operations, but it cannot write
//! geometry directly. A deterministic engine validates the bounded change
//! set, and a human decision is recorded separately. Neither step carries
//! construction authority.

use serde::{Deserialize, Serialize};

/// The versioned contract for an intent that can be reviewed before it is
/// applied to an authoritative project graph.
pub const CHANGE_PROPOSAL_SCHEMA_VERSION: &str = "workway.change-proposal.v1";

/// A machine-executable operation expressed in project coordinates.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum DeterministicOperation {
    MoveEntity {
        entity_id: String,
        delta_x_in: i32,
        delta_y_in: i32,
    },
}

/// A before-and-after measurement that explains the trade-off of a proposed
/// operation. This is design-intent arithmetic, not a code determination.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MeasurementDelta {
    pub id: String,
    pub current_in: u32,
    pub proposed_in: u32,
    pub target_in: Option<u32>,
}

/// A reviewable delta between a canonical project revision and a candidate
/// spatial revision. It remains a proposal until the project graph applies it
/// under the appropriate human and professional workflow.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChangeProposal {
    pub schema_version: String,
    pub id: String,
    pub package_id: String,
    pub project_id: String,
    pub canonical_revision: String,
    pub spatial_revision: String,
    pub chapter_id: String,
    pub intent: String,
    pub operation: DeterministicOperation,
    pub measurements: Vec<MeasurementDelta>,
    pub requires_professional_review: bool,
    construction_ready: bool,
}

impl ChangeProposal {
    /// This kernel cannot elevate a design proposal into a construction release.
    #[must_use]
    pub const fn construction_ready(&self) -> bool {
        self.construction_ready
    }
}

/// Deterministic validation only. It deliberately has no construction-ready
/// result, regardless of how complete a proposed operation appears.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChangeProposalValidation {
    pub proposal_id: String,
    pub issue_ids: Vec<String>,
    pub deterministic: bool,
    construction_ready: bool,
}

impl ChangeProposalValidation {
    #[must_use]
    pub const fn construction_ready(&self) -> bool {
        self.construction_ready
    }

    #[must_use]
    pub fn is_valid(&self) -> bool {
        self.deterministic && !self.construction_ready
    }
}

fn required(value: &str) -> bool {
    !value.trim().is_empty()
}

/// Validate the stable identity, bounded operation, and arithmetic evidence
/// that can be checked without generating a mesh or asserting compliance.
#[must_use]
pub fn validate_change_proposal(proposal: &ChangeProposal) -> ChangeProposalValidation {
    let mut issue_ids = Vec::new();

    if proposal.schema_version != CHANGE_PROPOSAL_SCHEMA_VERSION {
        issue_ids.push("schema-version-mismatch".into());
    }
    if [
        proposal.id.as_str(),
        proposal.package_id.as_str(),
        proposal.project_id.as_str(),
        proposal.canonical_revision.as_str(),
        proposal.spatial_revision.as_str(),
        proposal.chapter_id.as_str(),
        proposal.intent.as_str(),
    ]
    .into_iter()
    .any(|value| !required(value))
    {
        issue_ids.push("required-identity-missing".into());
    }
    if proposal.construction_ready {
        issue_ids.push("construction-ready-must-be-false".into());
    }

    match &proposal.operation {
        DeterministicOperation::MoveEntity {
            entity_id,
            delta_x_in,
            delta_y_in,
        } => {
            if !required(entity_id) {
                issue_ids.push("operation-entity-missing".into());
            }
            if *delta_x_in == 0 && *delta_y_in == 0 {
                issue_ids.push("operation-must-change-project-state".into());
            }
        }
    }

    if proposal.measurements.is_empty() {
        issue_ids.push("measurement-evidence-required".into());
    }
    for measurement in &proposal.measurements {
        if !required(&measurement.id) {
            issue_ids.push("measurement-id-missing".into());
        }
        if let Some(target_in) = measurement.target_in {
            if measurement.proposed_in < target_in {
                issue_ids.push("measurement-target-not-met".into());
            }
        }
    }

    issue_ids.sort();
    issue_ids.dedup();
    let deterministic = issue_ids.is_empty();

    ChangeProposalValidation {
        proposal_id: proposal.id.clone(),
        issue_ids,
        deterministic,
        construction_ready: false,
    }
}

/// A narrow v0.8 fixture for the kitchen-island conversation shown in the
/// WorkWay preview. The operation is typed; it is not generated mesh data.
#[must_use]
pub fn threshold_dwelling_kitchen_island_clearance_proposal_v08() -> ChangeProposal {
    ChangeProposal {
        schema_version: CHANGE_PROPOSAL_SCHEMA_VERSION.into(),
        id: "threshold-dwelling-r08:proposal:kitchen-island-clearance-0001".into(),
        package_id: "threshold-dwelling-r08-spatial-package".into(),
        project_id: "threshold-dwelling".into(),
        canonical_revision: "0.7".into(),
        spatial_revision: "0.8".into(),
        chapter_id: "kitchen".into(),
        intent: "Move the kitchen island 4 inches south to improve refrigerator clearance.".into(),
        operation: DeterministicOperation::MoveEntity {
            entity_id: "kitchen-island".into(),
            delta_x_in: 0,
            delta_y_in: 4,
        },
        measurements: vec![
            MeasurementDelta {
                id: "island-to-refrigerator-clearance".into(),
                current_in: 38,
                proposed_in: 42,
                target_in: Some(42),
            },
            MeasurementDelta {
                id: "island-to-opposite-run-clearance".into(),
                current_in: 48,
                proposed_in: 44,
                target_in: None,
            },
        ],
        requires_professional_review: true,
        construction_ready: false,
    }
}
