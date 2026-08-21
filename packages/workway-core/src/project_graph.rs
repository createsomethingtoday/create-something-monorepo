//! Authoritative, evidence-aware project-graph contracts.
//!
//! The graph stores semantic identifiers and revision lineage. It deliberately
//! does not contain render meshes, source-file paths, extracted documents, or
//! construction authorization.

use std::collections::BTreeSet;

use serde::{Deserialize, Serialize};

/// Schema shared by future Rust, TypeScript, and Swift project-graph consumers.
pub const PROJECT_GRAPH_SCHEMA_VERSION: &str = "workway.project-graph.v1";
/// Private evidence manifests are never a client delivery artifact.
pub const PRIVATE_EVIDENCE_MANIFEST_SCHEMA_VERSION: &str = "workway.private-evidence-manifest.v1";
/// A client-safe summary of evidence readiness derived from the private manifest.
pub const CLIENT_EVIDENCE_READINESS_SCHEMA_VERSION: &str = "workway.client-evidence-readiness.v1";
/// A client-safe secure-handoff checklist. It never transfers document bytes.
pub const EVIDENCE_INTAKE_PACKET_SCHEMA_VERSION: &str = "workway.evidence-intake-packet.v1";

/// The actual coordinate scope held by the current graph revision.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum DimensionTruthScope {
    RevisedPlanHorizontalOnly,
}

/// Semantic entities are stable project identifiers, never renderer objects.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum SemanticEntityKind {
    Space,
    Fixture,
    Envelope,
    MaterialRole,
}

/// A client-safe semantic entity record.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SemanticEntity {
    pub id: String,
    pub kind: SemanticEntityKind,
    pub client_label: String,
}

/// An immutable link to an evidence manifest record.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvidenceReference {
    pub evidence_id: String,
    pub canonical_revision: String,
    pub purpose: String,
}

/// Deterministic project state that clients and renderers derive from.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectGraph {
    pub schema_version: String,
    pub project_id: String,
    pub canonical_revision: String,
    pub derived_revision: String,
    pub dimension_truth: DimensionTruthScope,
    pub entities: Vec<SemanticEntity>,
    pub evidence_references: Vec<EvidenceReference>,
    construction_ready: bool,
}

impl ProjectGraph {
    /// This kernel cannot turn graph validation into construction permission.
    #[must_use]
    pub const fn construction_ready(&self) -> bool {
        self.construction_ready
    }
}

/// Classification of the expected professional evidence, not its raw content.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum EvidenceSourceClass {
    SiteSurvey,
    Architectural,
    Structural,
    MechanicalElectricalPlumbing,
    Energy,
    Jurisdiction,
}

/// Review progression for a private evidence record.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum PrivateEvidenceReviewStatus {
    Missing,
    Submitted,
    Accepted,
}

impl PrivateEvidenceReviewStatus {
    const fn client_status(self) -> &'static str {
        match self {
            Self::Missing => "missing",
            Self::Submitted => "submitted",
            Self::Accepted => "accepted",
        }
    }
}

/// A private evidence record. `vault_record_id` is an opaque storage handle,
/// never a filesystem path, source-document name, or extracted content.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrivateEvidenceRecord {
    pub opaque_id: String,
    pub vault_record_id: String,
    pub content_sha256: Option<String>,
    pub source_class: EvidenceSourceClass,
    pub review_status: PrivateEvidenceReviewStatus,
    pub client_label: String,
    pub required_reviewer_role: String,
}

/// Private evidence metadata used by the deterministic kernel only.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrivateEvidenceManifest {
    pub schema_version: String,
    pub project_id: String,
    pub canonical_revision: String,
    pub entries: Vec<PrivateEvidenceRecord>,
    construction_ready: bool,
}

impl PrivateEvidenceManifest {
    /// Evidence intake can never imply construction permission.
    #[must_use]
    pub const fn construction_ready(&self) -> bool {
        self.construction_ready
    }
}

/// A client-facing metadata record. It purposely omits vault handles, source
/// names, source paths, and extracted document content.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClientEvidenceReadinessEntry {
    pub evidence_id: String,
    pub client_label: String,
    pub source_class: EvidenceSourceClass,
    pub review_status: String,
    pub required_reviewer_role: String,
    pub content_sha256: Option<String>,
}

/// Client-safe evidence state derived only after both contracts validate.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClientEvidenceReadiness {
    pub schema_version: String,
    pub project_id: String,
    pub canonical_revision: String,
    pub derived_revision: String,
    pub dimension_truth: DimensionTruthScope,
    pub evidence: Vec<ClientEvidenceReadinessEntry>,
    construction_ready: bool,
}

impl ClientEvidenceReadiness {
    /// A client readiness projection never represents construction approval.
    #[must_use]
    pub const fn construction_ready(&self) -> bool {
        self.construction_ready
    }
}

/// The metadata a future approved intake service must capture outside the
/// browser. Field names are visible so an operator understands the handoff,
/// but values and document content are never present in this packet.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum EvidenceIntakeField {
    OpaqueVaultRecordId,
    ContentSha256,
    SourceClassConfirmation,
    QualifiedReviewRequest,
}

/// One secure-handoff requirement for an evidence gate. It purposely includes
/// no upload URL, vault locator, source filename, document body, or reviewer
/// identity.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvidenceIntakeRequest {
    pub evidence_id: String,
    pub client_label: String,
    pub purpose: String,
    pub source_class: EvidenceSourceClass,
    pub review_status: String,
    pub required_reviewer_role: String,
    pub required_fields: Vec<EvidenceIntakeField>,
    pub client_file_upload_available: bool,
}

/// A local operator-facing checklist for preparing a later secure evidence
/// handoff. It models no storage, transfer, parsing, acceptance, or
/// construction authority.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvidenceIntakePacket {
    pub schema_version: String,
    pub project_id: String,
    pub canonical_revision: String,
    pub derived_revision: String,
    pub requests: Vec<EvidenceIntakeRequest>,
    pub client_file_upload_available: bool,
    construction_ready: bool,
}

impl EvidenceIntakePacket {
    /// Secure-handoff preparation cannot accept evidence or authorize work.
    #[must_use]
    pub const fn construction_ready(&self) -> bool {
        self.construction_ready
    }
}

/// A repair-oriented result for private evidence manifest validation.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrivateEvidenceManifestValidation {
    pub project_id: String,
    pub issue_ids: Vec<String>,
    pub client_safe: bool,
    construction_ready: bool,
}

impl PrivateEvidenceManifestValidation {
    #[must_use]
    pub fn is_valid(&self) -> bool {
        self.client_safe && !self.construction_ready
    }
}

/// A repair-oriented result for graph-to-evidence validation.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectGraphValidation {
    pub project_id: String,
    pub issue_ids: Vec<String>,
    pub client_safe: bool,
    construction_ready: bool,
}

impl ProjectGraphValidation {
    #[must_use]
    pub fn is_valid(&self) -> bool {
        self.client_safe && !self.construction_ready
    }
}

fn required(value: &str) -> bool {
    !value.trim().is_empty()
}

fn has_duplicates<'a>(values: impl IntoIterator<Item = &'a str>) -> bool {
    let mut seen = BTreeSet::new();
    values.into_iter().any(|value| !seen.insert(value))
}

fn is_sha256(value: &str) -> bool {
    value.len() == 64 && value.bytes().all(|byte| byte.is_ascii_hexdigit())
}

fn is_opaque_id(value: &str, prefix: &str) -> bool {
    value.starts_with(prefix)
        && value.len() > prefix.len()
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_')
}

fn is_safe_client_label(value: &str) -> bool {
    let lower = value.to_ascii_lowercase();
    required(value)
        && !value.contains('/')
        && !value.contains('\\')
        && !lower.contains("private")
        && !lower.contains("upload")
        && !lower.contains("source")
        && !lower.contains(".pdf")
}

/// Validate private metadata without inspecting a source document itself.
#[must_use]
pub fn validate_private_evidence_manifest(
    manifest: &PrivateEvidenceManifest,
) -> PrivateEvidenceManifestValidation {
    let mut issue_ids = Vec::new();
    if manifest.schema_version != PRIVATE_EVIDENCE_MANIFEST_SCHEMA_VERSION {
        issue_ids.push("evidence-manifest-schema-version-mismatch".into());
    }
    if !required(&manifest.project_id) || !required(&manifest.canonical_revision) {
        issue_ids.push("evidence-manifest-identity-missing".into());
    }
    if manifest.entries.is_empty() {
        issue_ids.push("evidence-manifest-entry-required".into());
    }
    if manifest.construction_ready {
        issue_ids.push("construction-ready-must-be-false".into());
    }
    if has_duplicates(
        manifest
            .entries
            .iter()
            .map(|entry| entry.opaque_id.as_str()),
    ) {
        issue_ids.push("duplicate-evidence-id".into());
    }

    for entry in &manifest.entries {
        if !is_opaque_id(&entry.opaque_id, "evr_") {
            issue_ids.push("evidence-id-must-be-opaque".into());
        }
        if !is_opaque_id(&entry.vault_record_id, "vault_") {
            issue_ids.push("unsafe-private-evidence-locator".into());
        }
        if entry
            .content_sha256
            .as_deref()
            .is_some_and(|hash| !is_sha256(hash))
        {
            issue_ids.push("invalid-evidence-content-hash".into());
        }
        if entry.review_status != PrivateEvidenceReviewStatus::Missing
            && entry.content_sha256.is_none()
        {
            issue_ids.push("reviewed-evidence-content-hash-required".into());
        }
        if !is_safe_client_label(&entry.client_label) {
            issue_ids.push("unsafe-client-evidence-label".into());
        }
        if !required(&entry.required_reviewer_role) {
            issue_ids.push("required-reviewer-role-missing".into());
        }
    }

    issue_ids.sort();
    issue_ids.dedup();
    PrivateEvidenceManifestValidation {
        project_id: manifest.project_id.clone(),
        client_safe: issue_ids.is_empty(),
        issue_ids,
        construction_ready: false,
    }
}

/// Validate graph identity and its exact relationship to safe evidence metadata.
#[must_use]
pub fn validate_project_graph(
    graph: &ProjectGraph,
    manifest: &PrivateEvidenceManifest,
) -> ProjectGraphValidation {
    let mut issue_ids = Vec::new();
    if graph.schema_version != PROJECT_GRAPH_SCHEMA_VERSION {
        issue_ids.push("project-graph-schema-version-mismatch".into());
    }
    if [
        graph.project_id.as_str(),
        graph.canonical_revision.as_str(),
        graph.derived_revision.as_str(),
    ]
    .into_iter()
    .any(|value| !required(value))
    {
        issue_ids.push("project-graph-identity-missing".into());
    }
    if graph.construction_ready {
        issue_ids.push("construction-ready-must-be-false".into());
    }
    if graph.project_id != manifest.project_id {
        issue_ids.push("graph-manifest-project-mismatch".into());
    }
    if graph.canonical_revision != manifest.canonical_revision {
        issue_ids.push("graph-manifest-canonical-revision-mismatch".into());
    }
    if graph.entities.is_empty() {
        issue_ids.push("semantic-entity-required".into());
    }
    if has_duplicates(graph.entities.iter().map(|entity| entity.id.as_str())) {
        issue_ids.push("duplicate-semantic-entity-id".into());
    }
    if graph
        .entities
        .iter()
        .any(|entity| !required(&entity.id) || !is_safe_client_label(&entity.client_label))
    {
        issue_ids.push("invalid-semantic-entity".into());
    }
    if graph.evidence_references.is_empty() {
        issue_ids.push("evidence-reference-required".into());
    }
    if has_duplicates(
        graph
            .evidence_references
            .iter()
            .map(|reference| reference.evidence_id.as_str()),
    ) {
        issue_ids.push("duplicate-evidence-reference-id".into());
    }
    let manifest_ids = manifest
        .entries
        .iter()
        .map(|entry| entry.opaque_id.as_str())
        .collect::<BTreeSet<_>>();
    for reference in &graph.evidence_references {
        if !required(&reference.purpose) {
            issue_ids.push("evidence-reference-purpose-missing".into());
        }
        if reference.canonical_revision != graph.canonical_revision {
            issue_ids.push("evidence-reference-revision-mismatch".into());
        }
        if !manifest_ids.contains(reference.evidence_id.as_str()) {
            issue_ids.push("evidence-reference-not-found".into());
        }
    }
    let manifest_validation = validate_private_evidence_manifest(manifest);
    if !manifest_validation.is_valid() {
        issue_ids.push("invalid-private-evidence-manifest".into());
    }

    issue_ids.sort();
    issue_ids.dedup();
    ProjectGraphValidation {
        project_id: graph.project_id.clone(),
        client_safe: issue_ids.is_empty(),
        issue_ids,
        construction_ready: false,
    }
}

/// Derive the only evidence metadata a client may receive. Invalid source state
/// has no projection rather than an optimistic fallback.
#[must_use]
pub fn project_client_evidence_readiness(
    graph: &ProjectGraph,
    manifest: &PrivateEvidenceManifest,
) -> Option<ClientEvidenceReadiness> {
    if !validate_project_graph(graph, manifest).is_valid() {
        return None;
    }
    let entries_by_id = manifest
        .entries
        .iter()
        .map(|entry| (entry.opaque_id.as_str(), entry))
        .collect::<std::collections::BTreeMap<_, _>>();
    let evidence = graph
        .evidence_references
        .iter()
        .filter_map(|reference| entries_by_id.get(reference.evidence_id.as_str()))
        .map(|entry| ClientEvidenceReadinessEntry {
            evidence_id: entry.opaque_id.clone(),
            client_label: entry.client_label.clone(),
            source_class: entry.source_class,
            review_status: entry.review_status.client_status().into(),
            required_reviewer_role: entry.required_reviewer_role.clone(),
            content_sha256: entry.content_sha256.clone(),
        })
        .collect();

    Some(ClientEvidenceReadiness {
        schema_version: CLIENT_EVIDENCE_READINESS_SCHEMA_VERSION.into(),
        project_id: graph.project_id.clone(),
        canonical_revision: graph.canonical_revision.clone(),
        derived_revision: graph.derived_revision.clone(),
        dimension_truth: graph.dimension_truth,
        evidence,
        construction_ready: false,
    })
}

/// Derive the secure-handoff checklist from the same validated graph and
/// private manifest that drive evidence readiness. A client receives only the
/// minimum facts needed to prepare a handoff; document transfer is deliberately
/// unavailable here.
#[must_use]
pub fn project_evidence_intake_packet(
    graph: &ProjectGraph,
    manifest: &PrivateEvidenceManifest,
) -> Option<EvidenceIntakePacket> {
    if !validate_project_graph(graph, manifest).is_valid() {
        return None;
    }
    let entries_by_id = manifest
        .entries
        .iter()
        .map(|entry| (entry.opaque_id.as_str(), entry))
        .collect::<std::collections::BTreeMap<_, _>>();
    let requests = graph
        .evidence_references
        .iter()
        .filter_map(|reference| {
            entries_by_id
                .get(reference.evidence_id.as_str())
                .map(|entry| EvidenceIntakeRequest {
                    evidence_id: entry.opaque_id.clone(),
                    client_label: entry.client_label.clone(),
                    purpose: reference.purpose.clone(),
                    source_class: entry.source_class,
                    review_status: entry.review_status.client_status().into(),
                    required_reviewer_role: entry.required_reviewer_role.clone(),
                    required_fields: vec![
                        EvidenceIntakeField::OpaqueVaultRecordId,
                        EvidenceIntakeField::ContentSha256,
                        EvidenceIntakeField::SourceClassConfirmation,
                        EvidenceIntakeField::QualifiedReviewRequest,
                    ],
                    client_file_upload_available: false,
                })
        })
        .collect();

    Some(EvidenceIntakePacket {
        schema_version: EVIDENCE_INTAKE_PACKET_SCHEMA_VERSION.into(),
        project_id: graph.project_id.clone(),
        canonical_revision: graph.canonical_revision.clone(),
        derived_revision: graph.derived_revision.clone(),
        requests,
        client_file_upload_available: false,
        construction_ready: false,
    })
}

fn missing_evidence(
    opaque_id: &str,
    source_class: EvidenceSourceClass,
    client_label: &str,
    required_reviewer_role: &str,
) -> PrivateEvidenceRecord {
    PrivateEvidenceRecord {
        opaque_id: opaque_id.into(),
        vault_record_id: format!("vault_{}", opaque_id.trim_start_matches("evr_")),
        content_sha256: None,
        source_class,
        review_status: PrivateEvidenceReviewStatus::Missing,
        client_label: client_label.into(),
        required_reviewer_role: required_reviewer_role.into(),
    }
}

/// The intentionally empty evidence state for the current Rev 0.8 proposal.
#[must_use]
pub fn threshold_dwelling_evidence_manifest_v08() -> PrivateEvidenceManifest {
    PrivateEvidenceManifest {
        schema_version: PRIVATE_EVIDENCE_MANIFEST_SCHEMA_VERSION.into(),
        project_id: "threshold-dwelling".into(),
        canonical_revision: "0.7".into(),
        entries: vec![
            missing_evidence(
                "evr_site_datum",
                EvidenceSourceClass::SiteSurvey,
                "Site datum and grade evidence",
                "Registered professional land surveyor",
            ),
            missing_evidence(
                "evr_exterior_assembly",
                EvidenceSourceClass::Architectural,
                "Exterior assembly evidence",
                "Architect or qualified residential design professional",
            ),
            missing_evidence(
                "evr_interior_partitions",
                EvidenceSourceClass::Architectural,
                "Interior partition evidence",
                "Architect or qualified residential design professional",
            ),
            missing_evidence(
                "evr_roof_ceiling",
                EvidenceSourceClass::Architectural,
                "Roof and ceiling evidence",
                "Architect or qualified residential design professional",
            ),
            missing_evidence(
                "evr_openings",
                EvidenceSourceClass::Architectural,
                "Door and opening evidence",
                "Architect or qualified residential design professional",
            ),
            missing_evidence(
                "evr_glazing",
                EvidenceSourceClass::Energy,
                "Glass opening and energy evidence",
                "Energy rater or qualified energy-compliance professional",
            ),
            missing_evidence(
                "evr_structure",
                EvidenceSourceClass::Structural,
                "Structural and lateral evidence",
                "Licensed structural engineer",
            ),
            missing_evidence(
                "evr_mep",
                EvidenceSourceClass::MechanicalElectricalPlumbing,
                "MEP coordination evidence",
                "Licensed or jurisdiction-qualified MEP professionals",
            ),
            missing_evidence(
                "evr_thresholds",
                EvidenceSourceClass::Jurisdiction,
                "Exterior threshold and jurisdiction evidence",
                "Authority having jurisdiction and project team",
            ),
        ],
        construction_ready: false,
    }
}

/// Secure-handoff preparation for the current fixture. This does not accept
/// source evidence; it only describes the requirements for a future approved
/// private intake path.
#[must_use]
pub fn threshold_dwelling_evidence_intake_packet_v08() -> Option<EvidenceIntakePacket> {
    project_evidence_intake_packet(
        &threshold_dwelling_project_graph_v08(),
        &threshold_dwelling_evidence_manifest_v08(),
    )
}

/// Semantic graph for the present design-intent revision. Values remain
/// intentionally sparse until source evidence is accepted.
#[must_use]
pub fn threshold_dwelling_project_graph_v08() -> ProjectGraph {
    let evidence_references = [
        (
            "evr_site_datum",
            "Relate the plan datum to surveyed site grade.",
        ),
        (
            "evr_exterior_assembly",
            "Define exterior wall layers and depth.",
        ),
        (
            "evr_interior_partitions",
            "Define partitions and service backing.",
        ),
        (
            "evr_roof_ceiling",
            "Define roof, ceiling, and drainage geometry.",
        ),
        ("evr_openings", "Define door and opening geometry."),
        (
            "evr_glazing",
            "Define glass geometry and energy performance.",
        ),
        (
            "evr_structure",
            "Define support and lateral system geometry.",
        ),
        ("evr_mep", "Define MEP service coordination geometry."),
        (
            "evr_thresholds",
            "Define exterior grade and threshold geometry.",
        ),
    ]
    .into_iter()
    .map(|(evidence_id, purpose)| EvidenceReference {
        evidence_id: evidence_id.into(),
        canonical_revision: "0.7".into(),
        purpose: purpose.into(),
    })
    .collect();

    ProjectGraph {
        schema_version: PROJECT_GRAPH_SCHEMA_VERSION.into(),
        project_id: "threshold-dwelling".into(),
        canonical_revision: "0.7".into(),
        derived_revision: "0.8".into(),
        dimension_truth: DimensionTruthScope::RevisedPlanHorizontalOnly,
        entities: vec![
            SemanticEntity {
                id: "public-room-kitchen".into(),
                kind: SemanticEntityKind::Space,
                client_label: "Kitchen".into(),
            },
            SemanticEntity {
                id: "kitchen-island".into(),
                kind: SemanticEntityKind::Fixture,
                client_label: "Kitchen island".into(),
            },
            SemanticEntity {
                id: "public-room-dining".into(),
                kind: SemanticEntityKind::Space,
                client_label: "Dining".into(),
            },
            SemanticEntity {
                id: "public-room-living".into(),
                kind: SemanticEntityKind::Space,
                client_label: "Living".into(),
            },
            SemanticEntity {
                id: "arrival-loggia".into(),
                kind: SemanticEntityKind::Space,
                client_label: "Arrival loggia".into(),
            },
            SemanticEntity {
                id: "primary-sleep-zone".into(),
                kind: SemanticEntityKind::Space,
                client_label: "Primary sleep zone".into(),
            },
            SemanticEntity {
                id: "exterior-envelope".into(),
                kind: SemanticEntityKind::Envelope,
                client_label: "Exterior envelope".into(),
            },
            SemanticEntity {
                id: "material-architectural-concrete".into(),
                kind: SemanticEntityKind::MaterialRole,
                client_label: "Architectural concrete".into(),
            },
            SemanticEntity {
                id: "material-low-e-glass".into(),
                kind: SemanticEntityKind::MaterialRole,
                client_label: "Low-E insulated glass".into(),
            },
        ],
        evidence_references,
        construction_ready: false,
    }
}
