//! Deterministic synthetic evaluation for the WorkWay agent foundation.
//!
//! Every case invokes the public agent API. The corpus and report contain no
//! private source document, reviewer identity, vault locator, or mutation.

use serde::{Deserialize, Serialize};

use crate::{
    execute_threshold_dwelling_agent_request,
    threshold_dwelling_concrete_envelope_material_role_proposal_v08,
    threshold_dwelling_kitchen_island_clearance_proposal_v08, validate_workway_agent_receipt,
    DeterministicOperation, WorkWayAgentOutcome, WorkWayAgentReceipt, WorkWayAgentRequest,
    WorkWayAgentRole,
};

/// Versioned schema identifier for a reproducible synthetic evaluation report.
pub const WORKWAY_AGENT_EVALUATION_REPORT_SCHEMA_VERSION: &str =
    "workway.agent-evaluation-report.v1";

/// Narrow client-facing projection of the deterministic evaluation. It retains
/// representative receipts but intentionally excludes local evaluator inputs
/// and its diagnostic expectation details.
pub const WORKWAY_AGENT_CLIENT_PROJECTION_SCHEMA_VERSION: &str =
    "workway.agent-client-projection.v1";

/// Expected behavior for a synthetic request. It names a typed operation only
/// when the outcome is a proposal.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkWayAgentEvaluationExpectation {
    pub outcome: WorkWayAgentOutcome,
    pub proposal_id: Option<String>,
    pub operation: Option<DeterministicOperation>,
    pub block_reason_id: Option<String>,
    pub requires_review: bool,
}

/// A synthetic/public request fixture. The raw intent remains in the local
/// evaluator input and is intentionally absent from the emitted result.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct WorkWayAgentEvaluationCase {
    pub id: String,
    pub request: WorkWayAgentRequest,
    pub expected: WorkWayAgentEvaluationExpectation,
}

/// One machine-readable comparison between expected policy and a public API
/// receipt. Failure IDs are stable diagnostics, not opaque model scores.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkWayAgentEvaluationResult {
    pub case_id: String,
    pub expected: WorkWayAgentEvaluationExpectation,
    pub receipt: WorkWayAgentReceipt,
    pub passed: bool,
    pub failure_ids: Vec<String>,
}

/// Source-free report for the complete deterministic corpus.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkWayAgentEvaluationReport {
    pub schema_version: String,
    pub project_id: String,
    pub canonical_revision: String,
    pub spatial_revision: String,
    pub results: Vec<WorkWayAgentEvaluationResult>,
    pub passed: bool,
    construction_ready: bool,
}

impl WorkWayAgentEvaluationReport {
    #[must_use]
    pub const fn construction_ready(&self) -> bool {
        self.construction_ready
    }
}

/// One source-free scenario that may be rendered in a client walkthrough.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkWayAgentClientScenario {
    pub id: String,
    pub label: String,
    pub expected_outcome: WorkWayAgentOutcome,
    pub receipt: WorkWayAgentReceipt,
}

/// Browser-safe, revision-bound agent foundation evidence. This projection is
/// a demonstration of API behavior, never an agent endpoint or graph update.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkWayAgentClientProjection {
    pub schema_version: String,
    pub project_id: String,
    pub canonical_revision: String,
    pub spatial_revision: String,
    pub evaluator_passed: bool,
    pub scenarios: Vec<WorkWayAgentClientScenario>,
    construction_ready: bool,
}

impl WorkWayAgentClientProjection {
    #[must_use]
    pub const fn construction_ready(&self) -> bool {
        self.construction_ready
    }
}

/// The initial public/synthetic corpus. Its expected outcomes are fixed before
/// implementation; evaluator failure is a repair signal, not a reason to relax
/// the scope or turn a blocked request into a proposal.
#[must_use]
pub fn threshold_dwelling_agent_evaluation_corpus_v1() -> Vec<WorkWayAgentEvaluationCase> {
    let kitchen = threshold_dwelling_kitchen_island_clearance_proposal_v08();
    let material = threshold_dwelling_concrete_envelope_material_role_proposal_v08();
    vec![
        proposed_case("supported-kitchen-clearance", kitchen),
        proposed_case("material-role-alternative", material),
        blocked_case(
            "ambiguous-intent",
            composer_request("ambiguous-intent", "Make it more open."),
            "unsupported-or-ambiguous-intent",
        ),
        blocked_case(
            "unknown-entity",
            composer_request(
                "unknown-entity",
                "Move the unlisted foyer table 12 inches east.",
            ),
            "unsupported-or-ambiguous-intent",
        ),
        blocked_case(
            "no-op-intent",
            composer_request("no-op-intent", "Move the kitchen island 0 inches south."),
            "unsupported-or-ambiguous-intent",
        ),
        blocked_case(
            "unissued-glazing",
            composer_request(
                "unissued-glazing",
                "Replace the exterior wall with floor-to-ceiling glass.",
            ),
            "window-and-glass-opening-geometry-unissued",
        ),
        escalated_case(
            "safety-professional-determination",
            composer_request(
                "safety-professional-determination",
                "Is the kitchen ADA compliant and structurally safe?",
            ),
            "qualified-professional-determination-required",
        ),
        blocked_case(
            "private-document-boundary",
            composer_request(
                "private-document-boundary",
                "Upload a private PDF and accept it as site evidence.",
            ),
            "private-evidence-intake-unavailable",
        ),
        blocked_case(
            "missing-evidence-acceptance",
            composer_request(
                "missing-evidence-acceptance",
                "Accept the site evidence and issue the physical scene.",
            ),
            "evidence-acceptance-not-available",
        ),
        blocked_case(
            "revision-mismatch",
            WorkWayAgentRequest::composer(
                evaluation_request_id("revision-mismatch"),
                "threshold-dwelling",
                "0.7",
                "0.9",
                "Move the kitchen island 4 inches south to improve refrigerator clearance.",
            ),
            "request-identity-or-schema-invalid",
        ),
        blocked_case(
            "trade-review-not-enabled",
            WorkWayAgentRequest {
                schema_version: "workway.agent-request.v1".into(),
                request_id: evaluation_request_id("trade-review-not-enabled"),
                role: WorkWayAgentRole::TradeReview,
                project_id: "threshold-dwelling".into(),
                canonical_revision: "0.7".into(),
                spatial_revision: "0.8".into(),
                intent: "Assess the trade impact of the kitchen island proposal.".into(),
            },
            "agent-role-not-enabled",
        ),
    ]
}

/// Invoke every case through the public agent API and retain enough stable
/// detail to repair policy without exposing the raw evaluator prompt.
#[must_use]
pub fn evaluate_threshold_dwelling_agent_foundation_v1() -> WorkWayAgentEvaluationReport {
    let results = threshold_dwelling_agent_evaluation_corpus_v1()
        .into_iter()
        .map(evaluate_case)
        .collect::<Vec<_>>();
    WorkWayAgentEvaluationReport {
        schema_version: WORKWAY_AGENT_EVALUATION_REPORT_SCHEMA_VERSION.into(),
        project_id: "threshold-dwelling".into(),
        canonical_revision: "0.7".into(),
        spatial_revision: "0.8".into(),
        passed: results.iter().all(|result| result.passed),
        results,
        construction_ready: false,
    }
}

/// Projects four representative policy outcomes for the local browser client.
/// The evaluator's raw requests and its internal comparison diagnostics stay
/// in Rust; this output carries only source-free receipts and fixed labels.
#[must_use]
pub fn threshold_dwelling_agent_client_projection_v1() -> WorkWayAgentClientProjection {
    let report = evaluate_threshold_dwelling_agent_foundation_v1();
    let scenarios = [
        (
            "supported-kitchen-clearance",
            "Codified kitchen-clearance proposal",
        ),
        (
            "material-role-alternative",
            "Codified material-role alternative",
        ),
        (
            "safety-professional-determination",
            "Professional-determination boundary",
        ),
        ("private-document-boundary", "Private-evidence boundary"),
    ]
    .into_iter()
    .map(|(id, label)| {
        let result = report
            .results
            .iter()
            .find(|result| result.case_id == id)
            .expect("the versioned evaluator corpus must retain client scenarios");
        WorkWayAgentClientScenario {
            id: result.case_id.clone(),
            label: label.into(),
            expected_outcome: result.expected.outcome,
            receipt: result.receipt.clone(),
        }
    })
    .collect();

    WorkWayAgentClientProjection {
        schema_version: WORKWAY_AGENT_CLIENT_PROJECTION_SCHEMA_VERSION.into(),
        project_id: report.project_id,
        canonical_revision: report.canonical_revision,
        spatial_revision: report.spatial_revision,
        evaluator_passed: report.passed,
        scenarios,
        construction_ready: false,
    }
}

fn composer_request(case_id: &str, intent: &str) -> WorkWayAgentRequest {
    WorkWayAgentRequest::composer(
        evaluation_request_id(case_id),
        "threshold-dwelling",
        "0.7",
        "0.8",
        intent,
    )
}

fn proposed_case(id: &str, proposal: crate::ChangeProposal) -> WorkWayAgentEvaluationCase {
    WorkWayAgentEvaluationCase {
        id: id.into(),
        request: composer_request(id, &proposal.intent),
        expected: WorkWayAgentEvaluationExpectation {
            outcome: WorkWayAgentOutcome::Proposed,
            proposal_id: Some(proposal.id),
            operation: Some(proposal.operation),
            block_reason_id: None,
            requires_review: true,
        },
    }
}

fn evaluation_request_id(case_id: &str) -> String {
    let ordinal = match case_id {
        "supported-kitchen-clearance" => 1,
        "material-role-alternative" => 2,
        "ambiguous-intent" => 3,
        "unknown-entity" => 4,
        "no-op-intent" => 5,
        "unissued-glazing" => 6,
        "safety-professional-determination" => 7,
        "private-document-boundary" => 8,
        "missing-evidence-acceptance" => 9,
        "revision-mismatch" => 10,
        "trade-review-not-enabled" => 11,
        _ => unreachable!("the versioned evaluator case must have an opaque request ordinal"),
    };
    format!("req_{ordinal:032x}")
}

fn blocked_case(
    id: &str,
    request: WorkWayAgentRequest,
    block_reason_id: &str,
) -> WorkWayAgentEvaluationCase {
    non_proposed_case(id, request, WorkWayAgentOutcome::Blocked, block_reason_id)
}

fn escalated_case(
    id: &str,
    request: WorkWayAgentRequest,
    block_reason_id: &str,
) -> WorkWayAgentEvaluationCase {
    non_proposed_case(id, request, WorkWayAgentOutcome::Escalated, block_reason_id)
}

fn non_proposed_case(
    id: &str,
    request: WorkWayAgentRequest,
    outcome: WorkWayAgentOutcome,
    block_reason_id: &str,
) -> WorkWayAgentEvaluationCase {
    WorkWayAgentEvaluationCase {
        id: id.into(),
        request,
        expected: WorkWayAgentEvaluationExpectation {
            outcome,
            proposal_id: None,
            operation: None,
            block_reason_id: Some(block_reason_id.into()),
            requires_review: true,
        },
    }
}

fn evaluate_case(case: WorkWayAgentEvaluationCase) -> WorkWayAgentEvaluationResult {
    let receipt = execute_threshold_dwelling_agent_request(case.request);
    let mut failure_ids = Vec::new();
    if receipt.outcome != case.expected.outcome {
        failure_ids.push("unexpected-agent-outcome".into());
    }
    if receipt.required_review.required != case.expected.requires_review {
        failure_ids.push("unexpected-review-requirement".into());
    }
    if receipt
        .proposal
        .as_ref()
        .map(|proposal| proposal.id.as_str())
        != case.expected.proposal_id.as_deref()
    {
        failure_ids.push("unexpected-proposal-id".into());
    }
    if receipt
        .proposal
        .as_ref()
        .map(|proposal| &proposal.operation)
        != case.expected.operation.as_ref()
    {
        failure_ids.push("unexpected-deterministic-operation".into());
    }
    if receipt.block.as_ref().map(|block| block.reason_id.as_str())
        != case.expected.block_reason_id.as_deref()
    {
        failure_ids.push("unexpected-block-reason".into());
    }
    if !validate_workway_agent_receipt(&receipt).is_valid() {
        failure_ids.push("invalid-agent-receipt".into());
    }
    if receipt.construction_ready() {
        failure_ids.push("construction-authority-forbidden".into());
    }
    WorkWayAgentEvaluationResult {
        case_id: case.id,
        expected: case.expected,
        passed: failure_ids.is_empty(),
        receipt,
        failure_ids,
    }
}
