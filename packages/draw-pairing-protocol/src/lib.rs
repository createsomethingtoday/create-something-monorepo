use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};

pub const PROTOCOL_VERSION: &str = "create-something.draw-pairing.v1";
pub const DOCUMENT_VERSION: &str = "create-something.mapping-canvas.v1";

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OperationEnvelope {
    pub protocol_version: String,
    pub document_version: String,
    pub session_id: String,
    pub client_id: String,
    pub operation_id: String,
    pub base_revision: u64,
    pub sent_at: String,
    pub capability: String,
    pub operation: CanvasOperation,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum CanvasOperation {
    PutObject {
        object: Value,
    },
    RemoveObjects {
        ids: Vec<String>,
    },
    SetTitle {
        title: String,
    },
    SetViewport {
        viewport: Viewport,
    },
    Convert {
        #[serde(rename = "selectedIds")]
        selected_ids: Vec<String>,
        target: ConversionTarget,
        #[serde(rename = "resultId")]
        result_id: String,
        #[serde(rename = "createdAt")]
        created_at: String,
    },
    RestoreConversion {
        id: String,
    },
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Viewport {
    pub x: f64,
    pub y: f64,
    pub zoom: f64,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ConversionTarget {
    Note,
    Connector,
    Group,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PairedClient {
    pub capability_digest: String,
    pub expires_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub revoked_at: Option<String>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppliedOperation {
    pub operation_id: String,
    pub client_id: String,
    pub fingerprint: String,
    pub revision: u64,
    pub document_updated_at: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PairingHostState {
    pub session_id: String,
    pub revision: u64,
    pub document: Value,
    pub clients: BTreeMap<String, PairedClient>,
    pub applied: BTreeMap<String, AppliedOperation>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum OperationErrorCode {
    InvalidEnvelope,
    UnsupportedProtocol,
    UnsupportedDocument,
    WrongSession,
    UnknownClient,
    CapabilityRejected,
    ClientRevoked,
    CapabilityExpired,
    StaleRevision,
    FutureRevision,
    OperationIdReused,
    InvalidOperation,
}

#[derive(Clone, Debug, PartialEq)]
pub enum OperationResult {
    Applied {
        state: PairingHostState,
        receipt: AppliedOperation,
    },
    Duplicate {
        state: PairingHostState,
        receipt: AppliedOperation,
    },
    Rejected {
        state: PairingHostState,
        code: OperationErrorCode,
        current_revision: u64,
    },
}

pub fn digest_capability(capability: &str) -> String {
    Sha256::digest(capability.as_bytes())
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect()
}

fn fingerprint(envelope: &OperationEnvelope) -> String {
    let bytes = serde_json::to_vec(&serde_json::json!({
        "protocolVersion": envelope.protocol_version,
        "documentVersion": envelope.document_version,
        "sessionId": envelope.session_id,
        "clientId": envelope.client_id,
        "operationId": envelope.operation_id,
        "baseRevision": envelope.base_revision,
        "operation": envelope.operation,
    }))
    .expect("serializing a validated operation cannot fail");
    Sha256::digest(bytes)
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect()
}

fn reject(state: PairingHostState, code: OperationErrorCode) -> OperationResult {
    let current_revision = state.revision;
    OperationResult::Rejected {
        state,
        code,
        current_revision,
    }
}

fn non_empty(value: &str) -> bool {
    !value.trim().is_empty()
}

pub fn valid_document(document: &Value) -> bool {
    document.get("version").and_then(Value::as_str) == Some(DOCUMENT_VERSION)
        && document
            .get("id")
            .and_then(Value::as_str)
            .is_some_and(non_empty)
        && document.get("title").and_then(Value::as_str).is_some()
        && document.get("objects").and_then(Value::as_array).is_some()
        && document
            .get("viewport")
            .and_then(Value::as_object)
            .is_some()
}

fn valid_object(object: &Value) -> bool {
    let Some(kind) = object.get("kind").and_then(Value::as_str) else {
        return false;
    };
    if !object
        .get("id")
        .and_then(Value::as_str)
        .is_some_and(non_empty)
        || !object
            .get("createdAt")
            .and_then(Value::as_str)
            .is_some_and(non_empty)
    {
        return false;
    }
    match kind {
        "stroke" => {
            object
                .get("points")
                .and_then(Value::as_array)
                .is_some_and(|points| points.len() > 1)
                && object.get("color").and_then(Value::as_str).is_some()
                && object
                    .get("width")
                    .and_then(Value::as_f64)
                    .is_some_and(|width| width > 0.0)
        }
        "rectangle" | "ellipse" | "arrow" => {
            object.get("from").is_some()
                && object.get("to").is_some()
                && object.get("color").and_then(Value::as_str).is_some()
        }
        "note" => object.get("text").and_then(Value::as_str).is_some(),
        "connector" => {
            object
                .get("fromId")
                .and_then(Value::as_str)
                .is_some_and(non_empty)
                && object
                    .get("toId")
                    .and_then(Value::as_str)
                    .is_some_and(non_empty)
                && object.get("label").and_then(Value::as_str).is_some()
        }
        "group" => {
            object.get("label").and_then(Value::as_str).is_some()
                && object.get("childIds").and_then(Value::as_array).is_some()
        }
        _ => false,
    }
}

fn validate_envelope(envelope: &OperationEnvelope) -> bool {
    if !non_empty(&envelope.session_id)
        || !non_empty(&envelope.client_id)
        || !non_empty(&envelope.operation_id)
        || !non_empty(&envelope.sent_at)
        || !non_empty(&envelope.capability)
    {
        return false;
    }
    match &envelope.operation {
        CanvasOperation::PutObject { object } => valid_object(object),
        CanvasOperation::RemoveObjects { ids } => {
            !ids.is_empty() && ids.iter().all(|id| non_empty(id))
        }
        CanvasOperation::SetTitle { title } => non_empty(title) && title.len() <= 240,
        CanvasOperation::SetViewport { viewport } => {
            viewport.x.is_finite()
                && viewport.y.is_finite()
                && viewport.zoom.is_finite()
                && viewport.zoom > 0.0
        }
        CanvasOperation::Convert {
            selected_ids,
            result_id,
            created_at,
            ..
        } => {
            !selected_ids.is_empty()
                && selected_ids.iter().all(|id| non_empty(id))
                && non_empty(result_id)
                && non_empty(created_at)
        }
        CanvasOperation::RestoreConversion { id } => non_empty(id),
    }
}

fn coordinate(value: &Value, field: &str) -> Option<f64> {
    value.get(field).and_then(Value::as_f64)
}

fn push_point(points: &mut Vec<(f64, f64)>, value: &Value) {
    if let (Some(x), Some(y)) = (coordinate(value, "x"), coordinate(value, "y")) {
        points.push((x, y));
    }
}

fn collect_bounds_points(
    object: &Value,
    all: &[Value],
    visited: &mut Vec<String>,
    points: &mut Vec<(f64, f64)>,
) {
    let Some(id) = object.get("id").and_then(Value::as_str) else {
        return;
    };
    if visited.iter().any(|candidate| candidate == id) {
        return;
    }
    visited.push(id.to_owned());
    match object.get("kind").and_then(Value::as_str) {
        Some("stroke") => {
            if let Some(values) = object.get("points").and_then(Value::as_array) {
                values.iter().for_each(|value| push_point(points, value));
            }
        }
        Some("rectangle" | "ellipse" | "arrow") => {
            if let Some(value) = object.get("from") {
                push_point(points, value);
            }
            if let Some(value) = object.get("to") {
                push_point(points, value);
            }
        }
        Some("note" | "group") => {
            if let (Some(x), Some(y), Some(width), Some(height)) = (
                coordinate(object, "x"),
                coordinate(object, "y"),
                coordinate(object, "width"),
                coordinate(object, "height"),
            ) {
                points.push((x, y));
                points.push((x + width, y + height));
            }
        }
        Some("connector") => {
            for field in ["fromId", "toId"] {
                if let Some(endpoint) = object.get(field).and_then(Value::as_str) {
                    if let Some(found) = all.iter().find(|candidate| {
                        candidate.get("id").and_then(Value::as_str) == Some(endpoint)
                    }) {
                        collect_bounds_points(found, all, visited, points);
                    }
                }
            }
        }
        _ => {}
    }
}

fn object_bounds(selected: &[Value], all: &[Value]) -> (f64, f64, f64, f64) {
    let mut points = Vec::new();
    let mut visited = Vec::new();
    for object in selected {
        collect_bounds_points(object, all, &mut visited, &mut points);
    }
    if points.is_empty() {
        return (100.0, 100.0, 320.0, 180.0);
    }
    let min_x = points.iter().map(|(x, _)| *x).fold(f64::INFINITY, f64::min);
    let min_y = points.iter().map(|(_, y)| *y).fold(f64::INFINITY, f64::min);
    let max_x = points
        .iter()
        .map(|(x, _)| *x)
        .fold(f64::NEG_INFINITY, f64::max);
    let max_y = points
        .iter()
        .map(|(_, y)| *y)
        .fold(f64::NEG_INFINITY, f64::max);
    (
        min_x,
        min_y,
        (max_x - min_x).max(120.0),
        (max_y - min_y).max(80.0),
    )
}

fn remove_and_repair(objects: &mut Vec<Value>, ids: &[String]) {
    objects.retain(|candidate| {
        let id_removed = candidate
            .get("id")
            .and_then(Value::as_str)
            .is_some_and(|id| ids.iter().any(|removed| removed == id));
        let endpoint_removed = candidate.get("kind").and_then(Value::as_str) == Some("connector")
            && ["fromId", "toId"].iter().any(|field| {
                candidate
                    .get(field)
                    .and_then(Value::as_str)
                    .is_some_and(|id| ids.iter().any(|removed| removed == id))
            });
        !id_removed && !endpoint_removed
    });
    loop {
        let existing: Vec<String> = objects
            .iter()
            .filter_map(|object| object.get("id").and_then(Value::as_str).map(str::to_owned))
            .collect();
        let before = objects.len();
        objects.retain(|object| {
            object.get("kind").and_then(Value::as_str) != Some("connector")
                || ["fromId", "toId"].iter().all(|field| {
                    object
                        .get(field)
                        .and_then(Value::as_str)
                        .is_some_and(|id| existing.iter().any(|candidate| candidate == id))
                })
        });
        if objects.len() == before {
            break;
        }
    }
    let existing: Vec<String> = objects
        .iter()
        .filter_map(|object| object.get("id").and_then(Value::as_str).map(str::to_owned))
        .collect();
    for object in objects {
        if object.get("kind").and_then(Value::as_str) == Some("group") {
            if let Some(children) = object.get_mut("childIds").and_then(Value::as_array_mut) {
                children.retain(|child| {
                    child
                        .as_str()
                        .is_some_and(|id| existing.iter().any(|candidate| candidate == id))
                });
            }
        }
    }
}

fn apply_operation(document: &Value, operation: &CanvasOperation, now: &str) -> Option<Value> {
    if !valid_document(document) {
        return None;
    }
    let mut next = document.clone();
    match operation {
        CanvasOperation::PutObject { object } => {
            let objects = next.get_mut("objects")?.as_array_mut()?;
            objects.retain(|candidate| candidate.get("id") != object.get("id"));
            objects.push(object.clone());
        }
        CanvasOperation::RemoveObjects { ids } => {
            let objects = next.get_mut("objects")?.as_array_mut()?;
            let before = objects.len();
            remove_and_repair(objects, ids);
            if objects.len() == before {
                return None;
            }
        }
        CanvasOperation::SetTitle { title } => {
            if next.get("title").and_then(Value::as_str) == Some(title) {
                return None;
            }
            next["title"] = Value::String(title.clone());
        }
        CanvasOperation::SetViewport { viewport } => {
            let value = serde_json::to_value(viewport).ok()?;
            if next.get("viewport") == Some(&value) {
                return None;
            }
            next["viewport"] = value;
        }
        CanvasOperation::Convert {
            selected_ids,
            target,
            result_id,
            created_at,
        } => {
            let objects = next.get_mut("objects")?.as_array_mut()?;
            if objects
                .iter()
                .any(|object| object.get("id").and_then(Value::as_str) == Some(result_id))
            {
                return None;
            }
            let selected: Vec<Value> = objects
                .iter()
                .filter(|object| {
                    object
                        .get("id")
                        .and_then(Value::as_str)
                        .is_some_and(|id| selected_ids.iter().any(|selected| selected == id))
                })
                .cloned()
                .collect();
            if selected.is_empty() || (*target == ConversionTarget::Connector && selected.len() < 2)
            {
                return None;
            }
            let (x, y, width, height) = object_bounds(&selected, objects);
            let mut converted = match target {
                ConversionTarget::Note => serde_json::json!({
                    "id": result_id,
                    "kind": "note",
                    "createdAt": created_at,
                    "x": x,
                    "y": y,
                    "width": width.max(240.0),
                    "height": height.max(120.0),
                    "text": "Captured thought"
                }),
                ConversionTarget::Connector => serde_json::json!({
                    "id": result_id,
                    "kind": "connector",
                    "createdAt": created_at,
                    "fromId": selected_ids[0],
                    "toId": selected_ids[1],
                    "label": ""
                }),
                ConversionTarget::Group => serde_json::json!({
                    "id": result_id,
                    "kind": "group",
                    "createdAt": created_at,
                    "x": x - 24.0,
                    "y": y - 40.0,
                    "width": width + 48.0,
                    "height": height + 64.0,
                    "label": "Working group",
                    "childIds": selected_ids
                }),
            };
            converted["sourceIds"] = serde_json::to_value(selected_ids).ok()?;
            converted["sourceSnapshot"] = Value::Array(selected);
            objects.push(converted);
        }
        CanvasOperation::RestoreConversion { id } => {
            let objects = next.get_mut("objects")?.as_array_mut()?;
            let conversion = objects
                .iter()
                .find(|object| object.get("id").and_then(Value::as_str) == Some(id))?
                .clone();
            let snapshots = conversion.get("sourceSnapshot")?.as_array()?.clone();
            remove_and_repair(objects, std::slice::from_ref(id));
            let existing: Vec<String> = objects
                .iter()
                .filter_map(|object| object.get("id").and_then(Value::as_str).map(str::to_owned))
                .collect();
            for snapshot in snapshots {
                let missing = snapshot
                    .get("id")
                    .and_then(Value::as_str)
                    .is_some_and(|source_id| {
                        !existing.iter().any(|candidate| candidate == source_id)
                    });
                if missing {
                    objects.push(snapshot);
                }
            }
            remove_and_repair(objects, &[]);
        }
    }
    next["updatedAt"] = Value::String(now.to_owned());
    valid_document(&next).then_some(next)
}

pub fn apply_envelope(
    state: PairingHostState,
    envelope: OperationEnvelope,
    now: &str,
) -> OperationResult {
    if envelope.protocol_version != PROTOCOL_VERSION {
        return reject(state, OperationErrorCode::UnsupportedProtocol);
    }
    if envelope.document_version != DOCUMENT_VERSION {
        return reject(state, OperationErrorCode::UnsupportedDocument);
    }
    if !validate_envelope(&envelope) {
        return reject(state, OperationErrorCode::InvalidEnvelope);
    }
    if envelope.session_id != state.session_id {
        return reject(state, OperationErrorCode::WrongSession);
    }
    let Some(client) = state.clients.get(&envelope.client_id) else {
        return reject(state, OperationErrorCode::UnknownClient);
    };
    if client.revoked_at.is_some() {
        return reject(state, OperationErrorCode::ClientRevoked);
    }
    if client.expires_at.as_str() <= now {
        return reject(state, OperationErrorCode::CapabilityExpired);
    }
    if digest_capability(&envelope.capability) != client.capability_digest {
        return reject(state, OperationErrorCode::CapabilityRejected);
    }
    let operation_fingerprint = fingerprint(&envelope);
    if let Some(previous) = state.applied.get(&envelope.operation_id) {
        return if previous.fingerprint == operation_fingerprint {
            OperationResult::Duplicate {
                receipt: previous.clone(),
                state,
            }
        } else {
            reject(state, OperationErrorCode::OperationIdReused)
        };
    }
    if envelope.base_revision < state.revision {
        return reject(state, OperationErrorCode::StaleRevision);
    }
    if envelope.base_revision > state.revision {
        return reject(state, OperationErrorCode::FutureRevision);
    }
    let Some(document) = apply_operation(&state.document, &envelope.operation, now) else {
        return reject(state, OperationErrorCode::InvalidOperation);
    };
    let receipt = AppliedOperation {
        operation_id: envelope.operation_id.clone(),
        client_id: envelope.client_id.clone(),
        fingerprint: operation_fingerprint,
        revision: state.revision + 1,
        document_updated_at: now.to_owned(),
    };
    let mut next = state;
    next.revision = receipt.revision;
    next.document = document;
    next.applied.insert(envelope.operation_id, receipt.clone());
    OperationResult::Applied {
        state: next,
        receipt,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use pretty_assertions::assert_eq;

    const NOW: &str = "2026-08-29T12:30:00.000Z";

    fn fixture() -> OperationEnvelope {
        serde_json::from_str(include_str!("../fixtures/authorized-put-object.json")).unwrap()
    }

    fn conversion_fixture() -> OperationEnvelope {
        serde_json::from_str(include_str!("../fixtures/authorized-convert-note.json")).unwrap()
    }

    fn state() -> PairingHostState {
        PairingHostState {
            session_id: "session-fixture".into(),
            revision: 0,
            document: serde_json::json!({
                "version": DOCUMENT_VERSION,
                "id": "canvas-fixture",
                "title": "Fixture",
                "createdAt": "2026-08-29T12:00:00.000Z",
                "updatedAt": "2026-08-29T12:00:00.000Z",
                "viewport": { "x": 0, "y": 0, "zoom": 1 },
                "objects": []
            }),
            clients: BTreeMap::from([(
                "phone-fixture".into(),
                PairedClient {
                    capability_digest: digest_capability("fixture-secret"),
                    expires_at: "2026-08-30T00:00:00.000Z".into(),
                    revoked_at: None,
                },
            )]),
            applied: BTreeMap::new(),
        }
    }

    #[test]
    fn shared_fixture_round_trips_without_contract_drift() {
        let envelope = fixture();
        assert_eq!(envelope.protocol_version, PROTOCOL_VERSION);
        let serialized = serde_json::to_value(&envelope).unwrap();
        let source: Value =
            serde_json::from_str(include_str!("../fixtures/authorized-put-object.json")).unwrap();
        assert_eq!(serialized, source);
    }

    #[test]
    fn applies_and_deduplicates_exact_retries() {
        let first = apply_envelope(state(), fixture(), NOW);
        let OperationResult::Applied { state, receipt } = first else {
            panic!("expected application");
        };
        assert_eq!(state.revision, 1);
        let duplicate = apply_envelope(state, fixture(), NOW);
        let OperationResult::Duplicate {
            state,
            receipt: repeated,
        } = duplicate
        else {
            panic!("expected duplicate");
        };
        assert_eq!(state.revision, 1);
        assert_eq!(repeated, receipt);
    }

    #[test]
    fn rejects_reused_ids_stale_revisions_and_revoked_clients() {
        let OperationResult::Applied { state, .. } = apply_envelope(state(), fixture(), NOW) else {
            panic!("expected application");
        };
        let mut reused = fixture();
        reused.operation = CanvasOperation::SetTitle {
            title: "Changed".into(),
        };
        assert!(matches!(
            apply_envelope(state.clone(), reused, NOW),
            OperationResult::Rejected {
                code: OperationErrorCode::OperationIdReused,
                ..
            }
        ));

        let mut stale = fixture();
        stale.operation_id = "operation-fixture-2".into();
        assert!(matches!(
            apply_envelope(state.clone(), stale, NOW),
            OperationResult::Rejected {
                code: OperationErrorCode::StaleRevision,
                ..
            }
        ));

        let mut revoked_state = state;
        revoked_state
            .clients
            .get_mut("phone-fixture")
            .unwrap()
            .revoked_at = Some(NOW.into());
        assert!(matches!(
            apply_envelope(revoked_state, fixture(), NOW),
            OperationResult::Rejected {
                code: OperationErrorCode::ClientRevoked,
                ..
            }
        ));
    }

    #[test]
    fn rejects_expired_and_invalid_capabilities() {
        let mut expired = state();
        expired.clients.get_mut("phone-fixture").unwrap().expires_at = NOW.into();
        assert!(matches!(
            apply_envelope(expired, fixture(), NOW),
            OperationResult::Rejected {
                code: OperationErrorCode::CapabilityExpired,
                ..
            }
        ));

        let mut wrong = fixture();
        wrong.capability = "wrong".into();
        assert!(matches!(
            apply_envelope(state(), wrong, NOW),
            OperationResult::Rejected {
                code: OperationErrorCode::CapabilityRejected,
                ..
            }
        ));
    }

    #[test]
    fn converts_and_restores_source_with_deterministic_identity() {
        let OperationResult::Applied { state, .. } = apply_envelope(state(), fixture(), NOW) else {
            panic!("expected source application");
        };
        let OperationResult::Applied { state, .. } =
            apply_envelope(state, conversion_fixture(), NOW)
        else {
            panic!("expected conversion application");
        };
        let note = state
            .document
            .get("objects")
            .and_then(Value::as_array)
            .and_then(|objects| objects.last())
            .expect("converted note");
        assert_eq!(note.get("id").and_then(Value::as_str), Some("note-fixture"));
        assert_eq!(
            note.get("sourceSnapshot")
                .and_then(Value::as_array)
                .map(Vec::len),
            Some(1)
        );

        let restore = OperationEnvelope {
            operation_id: "operation-fixture-3".into(),
            base_revision: 2,
            operation: CanvasOperation::RestoreConversion {
                id: "note-fixture".into(),
            },
            ..fixture()
        };
        let OperationResult::Applied { state, .. } = apply_envelope(state, restore, NOW) else {
            panic!("expected restore application");
        };
        let objects = state
            .document
            .get("objects")
            .and_then(Value::as_array)
            .unwrap();
        assert!(objects
            .iter()
            .any(|object| object.get("id").and_then(Value::as_str) == Some("stroke-fixture")));
        assert!(!objects
            .iter()
            .any(|object| object.get("id").and_then(Value::as_str) == Some("note-fixture")));
    }
}
