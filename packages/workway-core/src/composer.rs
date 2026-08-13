//! Bounded Composer interpretation and human decision receipts.
//!
//! This is intentionally a reference adapter, not a language model runtime.
//! It recognizes only exact, supported intent and always routes the result
//! through the deterministic proposal validator.

use serde::{Deserialize, Serialize};

use crate::{
    threshold_dwelling_kitchen_island_clearance_proposal_v08, validate_change_proposal,
    ChangeProposal, ChangeProposalValidation, ProjectGraph,
};

/// A valid Composer action is a human decision about a proposal, never a
/// construction release or an implicit mutation of canonical project state.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ComposerDecision {
    Accepted,
    Rejected,
}

/// Either a fully typed proposal or a reviewable explanation for why intent is
/// unavailable under the current evidence gate.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ComposerInterpretation {
    Proposed {
        proposal: Box<ChangeProposal>,
        validation: ChangeProposalValidation,
    },
    Blocked {
        reason_id: String,
        explanation: String,
    },
}

/// Immutable local receipt for a reviewer decision. It names a derived review
/// revision but neither mutates the graph nor authorizes construction.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ComposerDecisionReceipt {
    pub id: String,
    pub proposal_id: String,
    pub project_id: String,
    pub canonical_revision: String,
    pub resulting_derived_revision: String,
    pub status: ComposerDecision,
    pub decision_scope: String,
    construction_ready: bool,
}

impl ComposerDecisionReceipt {
    /// Review acceptance remains deliberately below any construction authority.
    #[must_use]
    pub const fn construction_ready(&self) -> bool {
        self.construction_ready
    }
}

fn normalize_intent(value: &str) -> String {
    value
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .to_ascii_lowercase()
}

fn graph_has_entity(graph: &ProjectGraph, entity_id: &str) -> bool {
    graph.entities.iter().any(|entity| entity.id == entity_id)
}

/// Interpret only the first documented Threshold Dwelling Composer request.
/// Any exterior-glazing request is held at the unissued opening-geometry gate;
/// unknown wording is never guessed into geometry.
#[must_use]
pub fn interpret_threshold_dwelling_composer_intent(
    graph: &ProjectGraph,
    intent: &str,
) -> ComposerInterpretation {
    let normalized = normalize_intent(intent);
    let proposal = threshold_dwelling_kitchen_island_clearance_proposal_v08();
    if normalized == normalize_intent(&proposal.intent)
        && graph.project_id == proposal.project_id
        && graph.canonical_revision == proposal.canonical_revision
        && graph.derived_revision == proposal.spatial_revision
        && graph_has_entity(graph, "kitchen-island")
    {
        return ComposerInterpretation::Proposed {
            validation: validate_change_proposal(&proposal),
            proposal: Box::new(proposal),
        };
    }
    if normalized.contains("glass")
        && (normalized.contains("exterior") || normalized.contains("floor-to-ceiling"))
    {
        return ComposerInterpretation::Blocked {
            reason_id: "window-and-glass-opening-geometry-unissued".into(),
            explanation: "Glass-opening geometry, support, safety, water-management, and energy evidence remain unissued; no facade operation was created.".into(),
        };
    }

    ComposerInterpretation::Blocked {
        reason_id: "unsupported-or-ambiguous-intent".into(),
        explanation: "The local Composer recognizes only explicitly codified operations and will not infer geometry from ambiguous intent.".into(),
    }
}

/// Record a reviewer decision only for a valid proposal that exactly matches
/// the authoritative graph revision and known semantic fixture.
#[must_use]
pub fn decide_composer_proposal(
    graph: &ProjectGraph,
    proposal: &ChangeProposal,
    validation: &ChangeProposalValidation,
    status: ComposerDecision,
) -> Option<ComposerDecisionReceipt> {
    if !validation.is_valid()
        || graph.project_id != proposal.project_id
        || graph.canonical_revision != proposal.canonical_revision
        || graph.derived_revision != proposal.spatial_revision
        || !graph_has_entity(graph, "kitchen-island")
    {
        return None;
    }
    let operation_suffix = proposal.id.rsplit(':').next()?;
    Some(ComposerDecisionReceipt {
        id: format!("{}:decision:{status:?}", proposal.id),
        proposal_id: proposal.id.clone(),
        project_id: graph.project_id.clone(),
        canonical_revision: graph.canonical_revision.clone(),
        resulting_derived_revision: format!(
            "{}:decision:{operation_suffix}",
            graph.derived_revision
        ),
        status,
        decision_scope: "local-review-only".into(),
        construction_ready: false,
    })
}
