//! API-first, non-authoritative agent receipts.
//!
//! The project graph remains the Database authority. This module is the
//! Automation/Judgment boundary: it converts a versioned request into either a
//! deterministic proposal or a source-free blocked receipt. It never mutates
//! canonical state, accepts evidence, or creates construction authority.

use serde::{Deserialize, Serialize};

use crate::{
    interpret_threshold_dwelling_composer_intent, threshold_dwelling_project_graph_v08,
    ChangeProposal, ChangeProposalValidation, ComposerInterpretation, DeterministicOperation,
    MeasurementDelta,
};

/// Contract for an agent request accepted by the local foundation.
pub const WORKWAY_AGENT_REQUEST_SCHEMA_VERSION: &str = "workway.agent-request.v1";
/// Contract for a source-free agent receipt returned by the local foundation.
pub const WORKWAY_AGENT_RECEIPT_SCHEMA_VERSION: &str = "workway.agent-receipt.v1";

const INVALID_REQUEST_ID: &str = "req_00000000000000000000000000000000";

/// The only roles declared by the foundation. Composer is the sole enabled
/// runtime role; the others are contracts for later approval-gated systems.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum WorkWayAgentRole {
    Composer,
    Ingestion,
    TradeReview,
    SpatialSession,
}

/// A request carries no source document, operation payload, evidence field, or
/// approval control. Unknown JSON properties are rejected at the API boundary.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct WorkWayAgentRequest {
    pub schema_version: String,
    pub request_id: String,
    pub role: WorkWayAgentRole,
    pub project_id: String,
    pub canonical_revision: String,
    pub spatial_revision: String,
    pub intent: String,
}

impl WorkWayAgentRequest {
    /// Constructs the currently enabled, proposal-only Composer request.
    #[must_use]
    pub fn composer(
        request_id: impl Into<String>,
        project_id: impl Into<String>,
        canonical_revision: impl Into<String>,
        spatial_revision: impl Into<String>,
        intent: impl Into<String>,
    ) -> Self {
        Self {
            schema_version: WORKWAY_AGENT_REQUEST_SCHEMA_VERSION.into(),
            request_id: request_id.into(),
            role: WorkWayAgentRole::Composer,
            project_id: project_id.into(),
            canonical_revision: canonical_revision.into(),
            spatial_revision: spatial_revision.into(),
            intent: intent.into(),
        }
    }
}

/// The outcome is a receipt state, never a graph state transition.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum WorkWayAgentOutcome {
    Proposed,
    Blocked,
    Escalated,
}

/// Explicit human/professional review requirement accompanying every result.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct WorkWayAgentReviewRequirement {
    pub required: bool,
    pub roles: Vec<String>,
    pub rationale: String,
}

/// Source-free reason for a blocked or escalated request.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct WorkWayAgentBlock {
    pub reason_id: String,
    pub explanation: String,
}

/// Source-free projection of a deterministic proposal for an agent receipt.
/// It retains identifiers, typed operation, and measurable consequences but
/// deliberately omits the caller's raw intent/prompt.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct WorkWayAgentProposal {
    pub schema_version: String,
    pub id: String,
    pub package_id: String,
    pub project_id: String,
    pub canonical_revision: String,
    pub spatial_revision: String,
    pub chapter_id: String,
    pub operation: DeterministicOperation,
    pub measurements: Vec<MeasurementDelta>,
    pub requires_professional_review: bool,
    construction_ready: bool,
}

impl WorkWayAgentProposal {
    fn from_change_proposal(proposal: &ChangeProposal) -> Self {
        Self {
            schema_version: proposal.schema_version.clone(),
            id: proposal.id.clone(),
            package_id: proposal.package_id.clone(),
            project_id: proposal.project_id.clone(),
            canonical_revision: proposal.canonical_revision.clone(),
            spatial_revision: proposal.spatial_revision.clone(),
            chapter_id: proposal.chapter_id.clone(),
            operation: proposal.operation.clone(),
            measurements: proposal.measurements.clone(),
            requires_professional_review: proposal.requires_professional_review,
            construction_ready: false,
        }
    }

    #[must_use]
    pub const fn construction_ready(&self) -> bool {
        self.construction_ready
    }
}

/// A revision-bound proposal or fail-closed response suitable for evaluation
/// and client projection. It omits source files, prompts, vault identifiers,
/// reviewer identities, mutation handles, and acceptance capability.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct WorkWayAgentReceipt {
    pub schema_version: String,
    pub request_id: String,
    pub role: WorkWayAgentRole,
    pub project_id: String,
    pub canonical_revision: String,
    pub spatial_revision: String,
    pub supported_scope: Vec<String>,
    pub outcome: WorkWayAgentOutcome,
    pub assumptions: Vec<String>,
    pub required_review: WorkWayAgentReviewRequirement,
    pub proposal: Option<WorkWayAgentProposal>,
    pub validation: Option<ChangeProposalValidation>,
    pub block: Option<WorkWayAgentBlock>,
    construction_ready: bool,
}

impl WorkWayAgentReceipt {
    /// An agent receipt is never construction authority.
    #[must_use]
    pub const fn construction_ready(&self) -> bool {
        self.construction_ready
    }
}

/// Validation for a receipt crossing a process or client boundary. Validating
/// a receipt never converts it into a graph update or a construction decision.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkWayAgentReceiptValidation {
    pub request_id: String,
    pub issue_ids: Vec<String>,
    pub client_safe: bool,
    construction_ready: bool,
}

impl WorkWayAgentReceiptValidation {
    #[must_use]
    pub const fn construction_ready(&self) -> bool {
        self.construction_ready
    }

    #[must_use]
    pub fn is_valid(&self) -> bool {
        self.client_safe && !self.construction_ready
    }
}

/// Validate an agent response before a client or evaluator treats it as a
/// source-free result. This checks contract identity and authority boundaries,
/// not the truth of any professional, regulatory, or construction conclusion.
#[must_use]
pub fn validate_workway_agent_receipt(
    receipt: &WorkWayAgentReceipt,
) -> WorkWayAgentReceiptValidation {
    let mut issue_ids = Vec::new();
    if receipt.schema_version != WORKWAY_AGENT_RECEIPT_SCHEMA_VERSION {
        issue_ids.push("agent-receipt-schema-version-mismatch".into());
    }
    if [
        receipt.request_id.as_str(),
        receipt.project_id.as_str(),
        receipt.canonical_revision.as_str(),
        receipt.spatial_revision.as_str(),
    ]
    .into_iter()
    .any(|value| value.trim().is_empty())
    {
        issue_ids.push("agent-receipt-identity-missing".into());
    }
    if !is_opaque_request_id(&receipt.request_id) {
        issue_ids.push("agent-receipt-request-id-not-opaque".into());
    }
    if receipt.supported_scope.is_empty()
        || receipt
            .supported_scope
            .iter()
            .any(|value| value.trim().is_empty())
    {
        issue_ids.push("agent-receipt-supported-scope-missing".into());
    }
    if receipt.assumptions.is_empty()
        || receipt
            .assumptions
            .iter()
            .any(|value| value.trim().is_empty())
    {
        issue_ids.push("agent-receipt-assumptions-missing".into());
    }
    if !receipt.required_review.required
        || receipt.required_review.roles.is_empty()
        || receipt
            .required_review
            .roles
            .iter()
            .any(|value| value.trim().is_empty())
        || receipt.required_review.rationale.trim().is_empty()
    {
        issue_ids.push("agent-receipt-review-requirement-missing".into());
    }
    if receipt.construction_ready {
        issue_ids.push("construction-ready-must-be-false".into());
    }

    match receipt.outcome {
        WorkWayAgentOutcome::Proposed => {
            let Some(proposal) = receipt.proposal.as_ref() else {
                issue_ids.push("proposed-agent-receipt-proposal-required".into());
                return receipt_validation(receipt, issue_ids);
            };
            let Some(validation) = receipt.validation.as_ref() else {
                issue_ids.push("proposed-agent-receipt-validation-required".into());
                return receipt_validation(receipt, issue_ids);
            };
            if receipt.block.is_some() {
                issue_ids.push("proposed-agent-receipt-block-forbidden".into());
            }
            if !validation.is_valid()
                || validation.proposal_id != proposal.id
                || proposal.project_id != receipt.project_id
                || proposal.canonical_revision != receipt.canonical_revision
                || proposal.spatial_revision != receipt.spatial_revision
                || proposal.construction_ready()
                || validation.construction_ready()
            {
                issue_ids.push("proposed-agent-receipt-contract-invalid".into());
            }
        }
        WorkWayAgentOutcome::Blocked | WorkWayAgentOutcome::Escalated => {
            if receipt.proposal.is_some() || receipt.validation.is_some() {
                issue_ids.push("non-proposed-agent-receipt-operation-forbidden".into());
            }
            if receipt.block.as_ref().is_none_or(|block| {
                block.reason_id.trim().is_empty() || block.explanation.trim().is_empty()
            }) {
                issue_ids.push("non-proposed-agent-receipt-block-required".into());
            }
        }
    }
    receipt_validation(receipt, issue_ids)
}

fn receipt_validation(
    receipt: &WorkWayAgentReceipt,
    mut issue_ids: Vec<String>,
) -> WorkWayAgentReceiptValidation {
    issue_ids.sort();
    issue_ids.dedup();
    WorkWayAgentReceiptValidation {
        request_id: receipt.request_id.clone(),
        client_safe: issue_ids.is_empty(),
        issue_ids,
        construction_ready: false,
    }
}

/// Execute the enabled Composer through the canonical Threshold Dwelling graph.
/// A valid result is a proposal only; the receipt carries no apply or accept
/// operation and cannot alter graph, evidence, or construction state.
#[must_use]
pub fn execute_threshold_dwelling_agent_request(
    mut request: WorkWayAgentRequest,
) -> WorkWayAgentReceipt {
    let graph = threshold_dwelling_project_graph_v08();
    let scope = vec![
        "proposal-only".into(),
        "codified-composer-operations".into(),
        "source-free-client-receipt".into(),
    ];
    let request_id_is_safe = is_opaque_request_id(&request.request_id);
    if !request_id_is_safe {
        request.request_id = INVALID_REQUEST_ID.into();
    }
    if request.schema_version != WORKWAY_AGENT_REQUEST_SCHEMA_VERSION
        || !request_id_is_safe
        || request.project_id != graph.project_id
        || request.canonical_revision != graph.canonical_revision
        || request.spatial_revision != graph.derived_revision
        || request.intent.trim().is_empty()
    {
        return blocked_receipt(
            &graph.project_id,
            &graph.canonical_revision,
            &graph.derived_revision,
            request,
            scope,
            "request-identity-or-schema-invalid",
            "The request did not match the active schema, project, or revision, so no operation was created.",
        );
    }
    if request.role != WorkWayAgentRole::Composer {
        return blocked_receipt(
            &graph.project_id,
            &graph.canonical_revision,
            &graph.derived_revision,
            request,
            scope,
            "agent-role-not-enabled",
            "This role has no enabled runtime or authority in the local foundation.",
        );
    }
    if is_private_evidence_intake_intent(&request.intent) {
        return blocked_receipt(
            &graph.project_id,
            &graph.canonical_revision,
            &graph.derived_revision,
            request,
            scope,
            "private-evidence-intake-unavailable",
            "Private evidence intake, document parsing, and acceptance are outside this local agent API; no evidence operation was created.",
        );
    }
    if is_evidence_acceptance_intent(&request.intent) {
        return blocked_receipt(
            &graph.project_id,
            &graph.canonical_revision,
            &graph.derived_revision,
            request,
            scope,
            "evidence-acceptance-not-available",
            "Evidence acceptance and physical-scene issuance require the separate qualified-review and immutable-revision workflow; no evidence or scene state changed.",
        );
    }
    if is_professional_determination_intent(&request.intent) {
        return escalated_receipt(
            &graph.project_id,
            &graph.canonical_revision,
            &graph.derived_revision,
            request,
            scope,
            "qualified-professional-determination-required",
            "Safety, compliance, and construction determinations require the relevant qualified professional and jurisdictional process; no determination or operation was created.",
        );
    }

    match interpret_threshold_dwelling_composer_intent(&graph, &request.intent) {
        ComposerInterpretation::Proposed {
            proposal,
            validation,
        } if validation.is_valid() => WorkWayAgentReceipt {
            schema_version: WORKWAY_AGENT_RECEIPT_SCHEMA_VERSION.into(),
            request_id: request.request_id,
            role: request.role,
            project_id: graph.project_id,
            canonical_revision: graph.canonical_revision,
            spatial_revision: graph.derived_revision,
            supported_scope: scope,
            outcome: WorkWayAgentOutcome::Proposed,
            assumptions: proposal_assumptions(&proposal),
            required_review: proposal_review_requirement(),
            proposal: Some(WorkWayAgentProposal::from_change_proposal(&proposal)),
            validation: Some(validation),
            block: None,
            construction_ready: false,
        },
        ComposerInterpretation::Proposed { .. } => blocked_receipt(
            &graph.project_id,
            &graph.canonical_revision,
            &graph.derived_revision,
            request,
            scope,
            "deterministic-validation-failed",
            "The proposed operation did not pass deterministic validation, so it was not returned.",
        ),
        ComposerInterpretation::Blocked {
            reason_id,
            explanation,
        } => blocked_receipt(
            &graph.project_id,
            &graph.canonical_revision,
            &graph.derived_revision,
            request,
            scope,
            &reason_id,
            &explanation,
        ),
    }
}

fn is_private_evidence_intake_intent(intent: &str) -> bool {
    let normalized = intent.to_ascii_lowercase();
    [
        "upload", "private", "document", "pdf", "file", "vault", "ocr",
    ]
    .into_iter()
    .any(|term| normalized.contains(term))
}

fn is_opaque_request_id(value: &str) -> bool {
    value.len() == 36
        && value.starts_with("req_")
        && value
            .bytes()
            .skip(4)
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
}

fn is_evidence_acceptance_intent(intent: &str) -> bool {
    let normalized = intent.to_ascii_lowercase();
    normalized.contains("evidence")
        && ["accept", "issue"]
            .into_iter()
            .any(|term| normalized.contains(term))
}

fn is_professional_determination_intent(intent: &str) -> bool {
    let normalized = intent.to_ascii_lowercase();
    [
        "ada",
        "code",
        "compliant",
        "compliance",
        "permit",
        "structural",
        "safe",
        "safety",
        "energy",
        "mep",
        "engineer",
    ]
    .into_iter()
    .any(|term| normalized.contains(term))
}

fn blocked_receipt(
    project_id: &str,
    canonical_revision: &str,
    spatial_revision: &str,
    request: WorkWayAgentRequest,
    supported_scope: Vec<String>,
    reason_id: &str,
    explanation: &str,
) -> WorkWayAgentReceipt {
    WorkWayAgentReceipt {
        schema_version: WORKWAY_AGENT_RECEIPT_SCHEMA_VERSION.into(),
        request_id: request.request_id,
        role: request.role,
        project_id: project_id.into(),
        canonical_revision: canonical_revision.into(),
        spatial_revision: spatial_revision.into(),
        supported_scope,
        outcome: WorkWayAgentOutcome::Blocked,
        assumptions: vec![
            "The canonical graph and current evidence gate remain authoritative.".into(),
            "No geometry, evidence, review, or construction state changed.".into(),
        ],
        required_review: blocked_review_requirement(),
        proposal: None,
        validation: None,
        block: Some(WorkWayAgentBlock {
            reason_id: reason_id.into(),
            explanation: explanation.into(),
        }),
        construction_ready: false,
    }
}

fn escalated_receipt(
    project_id: &str,
    canonical_revision: &str,
    spatial_revision: &str,
    request: WorkWayAgentRequest,
    supported_scope: Vec<String>,
    reason_id: &str,
    explanation: &str,
) -> WorkWayAgentReceipt {
    WorkWayAgentReceipt {
        schema_version: WORKWAY_AGENT_RECEIPT_SCHEMA_VERSION.into(),
        request_id: request.request_id,
        role: request.role,
        project_id: project_id.into(),
        canonical_revision: canonical_revision.into(),
        spatial_revision: spatial_revision.into(),
        supported_scope,
        outcome: WorkWayAgentOutcome::Escalated,
        assumptions: vec![
            "The canonical graph is a design-intent baseline, not a professional determination."
                .into(),
            "No geometry, evidence, review, or construction state changed.".into(),
        ],
        required_review: WorkWayAgentReviewRequirement {
            required: true,
            roles: vec!["Qualified professional in the relevant discipline".into()],
            rationale:
                "The request requires an external professional determination rather than a Composer proposal."
                    .into(),
        },
        proposal: None,
        validation: None,
        block: Some(WorkWayAgentBlock {
            reason_id: reason_id.into(),
            explanation: explanation.into(),
        }),
        construction_ready: false,
    }
}

fn proposal_assumptions(proposal: &ChangeProposal) -> Vec<String> {
    vec![
        "The active project and revision identity match the deterministic proposal fixture.".into(),
        format!(
            "{} is a reviewable design-intent operation; it is not an applied geometry change.",
            proposal.id
        ),
    ]
}

fn proposal_review_requirement() -> WorkWayAgentReviewRequirement {
    WorkWayAgentReviewRequirement {
        required: true,
        roles: vec![
            "Human project decision owner".into(),
            "Qualified professional review where the evidence gate requires it".into(),
        ],
        rationale:
            "A deterministic proposal remains uncommitted until an explicit human decision and any required qualified review."
                .into(),
    }
}

fn blocked_review_requirement() -> WorkWayAgentReviewRequirement {
    WorkWayAgentReviewRequirement {
        required: true,
        roles: vec!["Project team or qualified professional, as applicable".into()],
        rationale:
            "A blocked request needs an explicit scope, evidence, or professional-review decision before it can become a codified proposal."
                .into(),
    }
}
