//! Bounded Composer interpretation and human decision receipts.
//!
//! This is intentionally a reference adapter, not a language model runtime.
//! It recognizes only exact, supported intent and always routes the result
//! through the deterministic proposal validator.

use serde::{Deserialize, Serialize};

use crate::{
    threshold_dwelling_concrete_envelope_material_role_proposal_v08,
    threshold_dwelling_kitchen_island_clearance_proposal_v08, threshold_dwelling_project_graph_v08,
    validate_change_proposal, ChangeProposal, ChangeProposalValidation, DeterministicOperation,
    ProjectGraph,
};

/// A static, client-consumable projection of the Rust Composer contract.
/// It contains only bounded proposal operations and blocked-intent policy;
/// it deliberately excludes private evidence, source documents, and geometry.
pub const COMPOSER_CONTRACT_SCHEMA_VERSION: &str = "workway.composer-contract.v1";

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

/// One exact supported intent and the deterministic result it produces.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ComposerSupportedIntent {
    pub intent: String,
    pub proposal: ChangeProposal,
    pub validation: ChangeProposalValidation,
}

/// A bounded matching rule for an evidence-gated intent category. The browser
/// evaluates this data generically; it does not invent a new facade policy.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ComposerBlockedIntentRule {
    pub rule_id: String,
    pub required_terms: Vec<String>,
    pub any_terms: Vec<String>,
    pub reason_id: String,
    pub explanation: String,
}

/// The complete serializable Composer policy needed by the local client.
/// This is a projection for review UI, not an authority to apply a proposal.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ComposerContractProjection {
    pub schema_version: String,
    pub project_id: String,
    pub canonical_revision: String,
    pub spatial_revision: String,
    pub supported_intents: Vec<ComposerSupportedIntent>,
    pub blocked_intent_rules: Vec<ComposerBlockedIntentRule>,
    pub fallback_reason_id: String,
    pub fallback_explanation: String,
    construction_ready: bool,
}

impl ComposerContractProjection {
    /// This is review-only contract data, never construction authority.
    #[must_use]
    pub const fn construction_ready(&self) -> bool {
        self.construction_ready
    }
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

/// Emit the narrow, client-safe Composer contract for the Threshold Dwelling
/// pilot. The checked-in browser artifact is verified against this exact
/// projection in the Rust test suite.
#[must_use]
pub fn threshold_dwelling_composer_contract_v08() -> ComposerContractProjection {
    let graph = threshold_dwelling_project_graph_v08();
    let kitchen = threshold_dwelling_kitchen_island_clearance_proposal_v08();
    let concrete = threshold_dwelling_concrete_envelope_material_role_proposal_v08();
    let supported_intents = [kitchen, concrete]
        .into_iter()
        .map(|proposal| ComposerSupportedIntent {
            intent: proposal.intent.clone(),
            validation: validate_change_proposal(&proposal),
            proposal,
        })
        .collect();

    ComposerContractProjection {
        schema_version: COMPOSER_CONTRACT_SCHEMA_VERSION.into(),
        project_id: graph.project_id,
        canonical_revision: graph.canonical_revision,
        spatial_revision: graph.derived_revision,
        supported_intents,
        blocked_intent_rules: vec![ComposerBlockedIntentRule {
            rule_id: "unissued-exterior-glass-opening-geometry".into(),
            required_terms: vec!["glass".into()],
            any_terms: vec!["exterior".into(), "floor-to-ceiling".into()],
            reason_id: "window-and-glass-opening-geometry-unissued".into(),
            explanation: "Glass-opening geometry, support, safety, water-management, and energy evidence remain unissued; no facade operation was created.".into(),
        }],
        fallback_reason_id: "unsupported-or-ambiguous-intent".into(),
        fallback_explanation: "The local Composer recognizes only explicitly codified operations and will not infer geometry from ambiguous intent.".into(),
        construction_ready: false,
    }
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
    let material_proposal = threshold_dwelling_concrete_envelope_material_role_proposal_v08();
    if normalized == normalize_intent(&material_proposal.intent)
        && graph.project_id == material_proposal.project_id
        && graph.canonical_revision == material_proposal.canonical_revision
        && graph.derived_revision == material_proposal.spatial_revision
        && graph_has_entity(graph, "exterior-envelope")
        && graph_has_entity(graph, "material-architectural-concrete")
    {
        return ComposerInterpretation::Proposed {
            validation: validate_change_proposal(&material_proposal),
            proposal: Box::new(material_proposal),
        };
    }
    for rule in threshold_dwelling_composer_contract_v08().blocked_intent_rules {
        if rule
            .required_terms
            .iter()
            .all(|term| normalized.contains(term))
            && rule.any_terms.iter().any(|term| normalized.contains(term))
        {
            return ComposerInterpretation::Blocked {
                reason_id: rule.reason_id,
                explanation: rule.explanation,
            };
        }
    }
    let contract = threshold_dwelling_composer_contract_v08();
    ComposerInterpretation::Blocked {
        reason_id: contract.fallback_reason_id,
        explanation: contract.fallback_explanation,
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
        || !operation_entities_exist(graph, &proposal.operation)
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

fn operation_entities_exist(graph: &ProjectGraph, operation: &DeterministicOperation) -> bool {
    match operation {
        DeterministicOperation::MoveEntity { entity_id, .. } => graph_has_entity(graph, entity_id),
        DeterministicOperation::SetMaterialRole {
            entity_id,
            material_role_id,
        } => graph_has_entity(graph, entity_id) && graph_has_entity(graph, material_role_id),
    }
}
