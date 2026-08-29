use std::{
    collections::{BTreeMap, HashMap, VecDeque},
    fs::{self, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
    time::{Duration, SystemTime},
};

mod transport;

use create_something_draw_pairing_protocol::{
    apply_canvas_operation, apply_envelope, digest_capability, prune_applied_receipts,
    valid_document, AppliedOperation, CanvasOperation, OperationEnvelope, OperationResult,
    PairedClient, PairingHostState, DOCUMENT_VERSION, PROTOCOL_VERSION,
};
use rand::{distr::Alphanumeric, Rng};
use serde::Serialize;
use serde_json::{json, Value};
use tauri::Manager;
use time::{format_description::well_known::Rfc3339, OffsetDateTime};
use uuid::Uuid;

const STATE_FILE: &str = "paired-session.json";
const COMPANION_STATE_FILE: &str = "companion-session.json";
const KEYCHAIN_SERVICE: &str = "agency.createsomething.draw.pairing";
const KEYCHAIN_ACCOUNT: &str = "active-companion";
const PAIRING_LIFETIME: Duration = Duration::from_secs(5 * 60);
const CAPABILITY_LIFETIME: Duration = Duration::from_secs(12 * 60 * 60);
const MAX_PAIRING_FAILURES: u8 = 5;
const MAX_COMPANION_QUEUE: usize = 2048;

struct PendingPairing {
    expires_at: SystemTime,
    failed_attempts: u8,
}

fn optimistic_companion_document(session: &CompanionSession) -> Value {
    session
        .queue
        .iter()
        .fold(session.document.clone(), |document, envelope| {
            apply_canvas_operation(&document, &envelope.operation, &envelope.sent_at)
                .unwrap_or(document)
        })
}

fn is_safe_idempotent(document: &Value, operation: &CanvasOperation) -> bool {
    match operation {
        CanvasOperation::RemoveObjects { ids } => document
            .get("objects")
            .and_then(Value::as_array)
            .is_some_and(|objects| {
                ids.iter().all(|id| {
                    !objects
                        .iter()
                        .any(|object| object.get("id").and_then(Value::as_str) == Some(id.as_str()))
                })
            }),
        CanvasOperation::SetTitle { title } => {
            document.get("title").and_then(Value::as_str) == Some(title)
        }
        CanvasOperation::SetViewport { viewport } => serde_json::to_value(viewport)
            .ok()
            .is_some_and(|value| document.get("viewport") == Some(&value)),
        CanvasOperation::PutObject { object } => {
            object.get("id").and_then(Value::as_str).and_then(|id| {
                document
                    .get("objects")
                    .and_then(Value::as_array)?
                    .iter()
                    .find(|candidate| candidate.get("id").and_then(Value::as_str) == Some(id))
            }) == Some(object)
        }
        CanvasOperation::Convert {
            selected_ids,
            target,
            result_id,
            ..
        } => document
            .get("objects")
            .and_then(Value::as_array)
            .and_then(|objects| {
                objects.iter().find(|object| {
                    object.get("id").and_then(Value::as_str) == Some(result_id.as_str())
                })
            })
            .is_some_and(|object| {
                let expected_kind = match target {
                    create_something_draw_pairing_protocol::ConversionTarget::Note => "note",
                    create_something_draw_pairing_protocol::ConversionTarget::Connector => {
                        "connector"
                    }
                    create_something_draw_pairing_protocol::ConversionTarget::Group => "group",
                };
                object.get("kind").and_then(Value::as_str) == Some(expected_kind)
                    && object.get("sourceIds") == serde_json::to_value(selected_ids).ok().as_ref()
            }),
        CanvasOperation::RestoreConversion { .. } => false,
    }
}

pub(crate) struct DrawRuntime {
    state_path: PathBuf,
    host: Mutex<PairingHostState>,
    pending: Mutex<HashMap<String, PendingPairing>>,
    transport: Mutex<Option<Value>>,
    host_capability: String,
    companion_state_path: PathBuf,
    companion: Mutex<Option<CompanionSession>>,
    companion_flush: tokio::sync::Mutex<()>,
}

struct CompanionSession {
    host: transport::DiscoveredHost,
    client_id: String,
    capability: String,
    expires_at: String,
    revision: u64,
    document: Value,
    queue: VecDeque<OperationEnvelope>,
    online: bool,
}

#[derive(serde::Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct StoredCompanionSession {
    host: transport::DiscoveredHost,
    client_id: String,
    expires_at: String,
    revision: u64,
    document: Value,
    #[serde(default = "default_online")]
    online: bool,
    #[serde(default)]
    queue: VecDeque<StoredQueuedOperation>,
}

fn default_online() -> bool {
    true
}

#[derive(serde::Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct StoredQueuedOperation {
    operation_id: String,
    base_revision: u64,
    sent_at: String,
    operation: CanvasOperation,
}

#[derive(serde::Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PairingOffer {
    code: String,
    expires_at: String,
}

#[derive(serde::Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PairingGrant {
    session_id: String,
    client_id: String,
    capability: String,
    expires_at: String,
    protocol_version: &'static str,
    document_version: &'static str,
    revision: u64,
    document: Value,
}

fn now() -> SystemTime {
    SystemTime::now()
}

pub(crate) fn rfc3339(value: SystemTime) -> Result<String, String> {
    OffsetDateTime::from(value)
        .format(&Rfc3339)
        .map_err(|error| error.to_string())
}

fn initial_state() -> PairingHostState {
    let timestamp = rfc3339(now()).unwrap_or_else(|_| "1970-01-01T00:00:00Z".into());
    PairingHostState {
        session_id: format!("session-{}", Uuid::new_v4()),
        revision: 0,
        document: json!({
            "version": DOCUMENT_VERSION,
            "id": format!("canvas-{}", Uuid::new_v4()),
            "title": "Untitled mapping session",
            "createdAt": timestamp,
            "updatedAt": timestamp,
            "viewport": { "x": 0, "y": 0, "zoom": 1 },
            "objects": []
        }),
        clients: BTreeMap::new(),
        applied: BTreeMap::new(),
    }
}

fn load_state(path: &Path) -> PairingHostState {
    fs::read(path)
        .ok()
        .and_then(|bytes| serde_json::from_slice(&bytes).ok())
        .unwrap_or_else(initial_state)
}

fn persist_state(path: &Path, state: &PairingHostState) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| "Draw state path has no parent".to_string())?;
    fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    let temporary = parent.join(format!(".{STATE_FILE}.{}.tmp", Uuid::new_v4()));
    let bytes = serde_json::to_vec_pretty(state).map_err(|error| error.to_string())?;
    let mut file = OpenOptions::new()
        .create_new(true)
        .write(true)
        .open(&temporary)
        .map_err(|error| error.to_string())?;
    file.write_all(&bytes).map_err(|error| error.to_string())?;
    file.write_all(b"\n").map_err(|error| error.to_string())?;
    file.sync_all().map_err(|error| error.to_string())?;
    fs::rename(&temporary, path).map_err(|error| error.to_string())?;
    if let Ok(directory) = OpenOptions::new().read(true).open(parent) {
        let _ = directory.sync_all();
    }
    Ok(())
}

fn persist_companion_state(path: &Path, session: &CompanionSession) -> Result<(), String> {
    let stored = StoredCompanionSession {
        host: session.host.clone(),
        client_id: session.client_id.clone(),
        expires_at: session.expires_at.clone(),
        revision: session.revision,
        document: session.document.clone(),
        online: session.online,
        queue: session
            .queue
            .iter()
            .map(|envelope| StoredQueuedOperation {
                operation_id: envelope.operation_id.clone(),
                base_revision: envelope.base_revision,
                sent_at: envelope.sent_at.clone(),
                operation: envelope.operation.clone(),
            })
            .collect(),
    };
    let parent = path.parent().ok_or("Companion state path has no parent")?;
    fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    let temporary = parent.join(format!(".{COMPANION_STATE_FILE}.{}.tmp", Uuid::new_v4()));
    let bytes = serde_json::to_vec_pretty(&stored).map_err(|error| error.to_string())?;
    let mut file = OpenOptions::new()
        .create_new(true)
        .write(true)
        .open(&temporary)
        .map_err(|error| error.to_string())?;
    file.write_all(&bytes).map_err(|error| error.to_string())?;
    file.write_all(b"\n").map_err(|error| error.to_string())?;
    file.sync_all().map_err(|error| error.to_string())?;
    fs::rename(&temporary, path).map_err(|error| error.to_string())?;
    Ok(())
}

fn load_companion_state(path: &Path) -> Option<StoredCompanionSession> {
    fs::read(path)
        .ok()
        .and_then(|bytes| serde_json::from_slice(&bytes).ok())
}

#[cfg(any(target_os = "macos", target_os = "ios"))]
fn store_companion_capability(capability: &str) -> Result<(), String> {
    security_framework::passwords::set_generic_password(
        KEYCHAIN_SERVICE,
        KEYCHAIN_ACCOUNT,
        capability.as_bytes(),
    )
    .map_err(|error| error.to_string())
}

#[cfg(any(target_os = "macos", target_os = "ios"))]
fn load_companion_capability() -> Option<String> {
    security_framework::passwords::get_generic_password(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT)
        .ok()
        .and_then(|bytes| String::from_utf8(bytes).ok())
}

#[cfg(any(target_os = "macos", target_os = "ios"))]
fn delete_companion_capability() -> Result<(), String> {
    security_framework::passwords::delete_generic_password(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT)
        .or_else(|error| {
            if error.code() == -25300 {
                Ok(())
            } else {
                Err(error)
            }
        })
        .map_err(|error| error.to_string())
}

#[cfg(not(any(target_os = "macos", target_os = "ios")))]
fn store_companion_capability(_capability: &str) -> Result<(), String> {
    Err("Apple Keychain is unavailable".into())
}

#[cfg(not(any(target_os = "macos", target_os = "ios")))]
fn load_companion_capability() -> Option<String> {
    None
}

#[cfg(not(any(target_os = "macos", target_os = "ios")))]
fn delete_companion_capability() -> Result<(), String> {
    Ok(())
}

fn restore_companion(path: &Path) -> Option<CompanionSession> {
    let stored = load_companion_state(path)?;
    let expires_at = OffsetDateTime::parse(&stored.expires_at, &Rfc3339).ok()?;
    if expires_at <= OffsetDateTime::now_utc() {
        return None;
    }
    let capability = load_companion_capability()?;
    let host = stored.host;
    let client_id = stored.client_id;
    let queue = stored
        .queue
        .into_iter()
        .map(|queued| OperationEnvelope {
            protocol_version: PROTOCOL_VERSION.into(),
            document_version: DOCUMENT_VERSION.into(),
            session_id: host.session_id.clone(),
            client_id: client_id.clone(),
            operation_id: queued.operation_id,
            base_revision: queued.base_revision,
            sent_at: queued.sent_at,
            capability: capability.clone(),
            operation: queued.operation,
        })
        .collect();
    Some(CompanionSession {
        host,
        client_id,
        capability,
        expires_at: stored.expires_at,
        revision: stored.revision,
        document: stored.document,
        queue,
        online: stored.online,
    })
}

fn random_capability() -> String {
    rand::rng()
        .sample_iter(&Alphanumeric)
        .take(48)
        .map(char::from)
        .collect()
}

pub(crate) fn result_json(result: OperationResult) -> Value {
    match result {
        OperationResult::Applied { state, receipt } => json!({
            "status": "applied",
            "revision": state.revision,
            "document": state.document,
            "receipt": receipt
        }),
        OperationResult::Duplicate { state, receipt } => json!({
            "status": "duplicate",
            "revision": state.revision,
            "document": state.document,
            "receipt": receipt
        }),
        OperationResult::Rejected {
            code,
            current_revision,
            ..
        } => json!({
            "status": "rejected",
            "code": code,
            "currentRevision": current_revision
        }),
    }
}

pub(crate) fn host_status(runtime: &DrawRuntime) -> Result<Value, String> {
    let state = runtime.host.lock().map_err(|error| error.to_string())?;
    Ok(json!({
        "sessionId": state.session_id,
        "revision": state.revision,
        "document": state.document,
        "pairedClients": state.clients.iter().filter(|(id, _)| id.as_str() != "native-mac").map(|(id, client)| json!({
            "clientId": id,
            "expiresAt": client.expires_at,
            "revokedAt": client.revoked_at
        })).collect::<Vec<_>>(),
        "protocolVersion": PROTOCOL_VERSION,
        "documentVersion": DOCUMENT_VERSION
        ,"transport": runtime.transport.lock().map_err(|error| error.to_string())?.clone()
    }))
}

pub(crate) fn pair_begin(runtime: &DrawRuntime) -> Result<PairingOffer, String> {
    let code = format!("{:06}", rand::rng().random_range(0..1_000_000));
    let expires_at = now() + PAIRING_LIFETIME;
    let mut pending = runtime.pending.lock().map_err(|error| error.to_string())?;
    pending.retain(|_, offer| offer.expires_at > now());
    pending.insert(
        code.clone(),
        PendingPairing {
            expires_at,
            failed_attempts: 0,
        },
    );
    Ok(PairingOffer {
        code,
        expires_at: rfc3339(expires_at)?,
    })
}

pub(crate) fn pair_confirm(
    runtime: &DrawRuntime,
    code: String,
    client_id: String,
) -> Result<PairingGrant, String> {
    if client_id.trim().is_empty() {
        return Err("Client id is required".into());
    }
    let offer = {
        let mut pending = runtime.pending.lock().map_err(|error| error.to_string())?;
        pending.retain(|_, offer| offer.expires_at > now());
        if let Some(offer) = pending.remove(&code) {
            offer
        } else {
            for offer in pending.values_mut() {
                offer.failed_attempts = offer.failed_attempts.saturating_add(1);
            }
            pending.retain(|_, offer| offer.failed_attempts < MAX_PAIRING_FAILURES);
            return Err("Pairing code is invalid or attempt limit reached".into());
        }
    };
    if offer.expires_at <= now() {
        return Err("Pairing code expired".into());
    }
    let capability = random_capability();
    let expires_at = rfc3339(now() + CAPABILITY_LIFETIME)?;
    let mut state = runtime.host.lock().map_err(|error| error.to_string())?;
    state.clients.insert(
        client_id.clone(),
        PairedClient {
            capability_digest: digest_capability(&capability),
            expires_at: expires_at.clone(),
            revoked_at: None,
        },
    );
    persist_state(&runtime.state_path, &state)?;
    Ok(PairingGrant {
        session_id: state.session_id.clone(),
        client_id,
        capability,
        expires_at,
        protocol_version: PROTOCOL_VERSION,
        document_version: DOCUMENT_VERSION,
        revision: state.revision,
        document: state.document.clone(),
    })
}

pub(crate) fn apply_operation(
    runtime: &DrawRuntime,
    envelope: OperationEnvelope,
) -> Result<Value, String> {
    let mut state = runtime.host.lock().map_err(|error| error.to_string())?;
    apply_operation_locked(runtime, &mut state, envelope)
}

fn apply_operation_locked(
    runtime: &DrawRuntime,
    state: &mut PairingHostState,
    envelope: OperationEnvelope,
) -> Result<Value, String> {
    let timestamp = rfc3339(now())?;
    let result = apply_envelope(state.clone(), envelope, &timestamp);
    match &result {
        OperationResult::Applied { state: next, .. } => {
            persist_state(&runtime.state_path, next)?;
            *state = next.clone();
        }
        OperationResult::Duplicate { .. } | OperationResult::Rejected { .. } => {}
    }
    Ok(result_json(result))
}

pub(crate) fn revoke_client(runtime: &DrawRuntime, client_id: String) -> Result<Value, String> {
    let mut state = runtime.host.lock().map_err(|error| error.to_string())?;
    let client = state
        .clients
        .get_mut(&client_id)
        .ok_or_else(|| "Paired client not found".to_string())?;
    client.revoked_at = Some(rfc3339(now())?);
    persist_state(&runtime.state_path, &state)?;
    Ok(json!({ "status": "revoked", "clientId": client_id }))
}

pub(crate) fn authorized_snapshot(
    runtime: &DrawRuntime,
    client_id: &str,
    capability: &str,
) -> Result<Value, String> {
    let state = runtime.host.lock().map_err(|error| error.to_string())?;
    let client = state
        .clients
        .get(client_id)
        .ok_or("Unknown paired client")?;
    if client.revoked_at.is_some() {
        return Err("Paired client is revoked".into());
    }
    if digest_capability(capability) != client.capability_digest {
        return Err("Pairing capability rejected".into());
    }
    let expires_at =
        OffsetDateTime::parse(&client.expires_at, &Rfc3339).map_err(|error| error.to_string())?;
    if expires_at <= OffsetDateTime::now_utc() {
        return Err("Pairing capability expired".into());
    }
    Ok(json!({
        "sessionId": state.session_id,
        "revision": state.revision,
        "document": state.document,
        "protocolVersion": PROTOCOL_VERSION,
        "documentVersion": DOCUMENT_VERSION
    }))
}

#[tauri::command]
fn draw_host_status(runtime: tauri::State<'_, Arc<DrawRuntime>>) -> Result<Value, String> {
    host_status(&runtime)
}

#[tauri::command]
fn draw_runtime_role() -> &'static str {
    if cfg!(mobile) {
        "companion"
    } else {
        "host"
    }
}

#[tauri::command]
fn draw_companion_status(runtime: tauri::State<'_, Arc<DrawRuntime>>) -> Result<Value, String> {
    let companion = runtime
        .companion
        .lock()
        .map_err(|error| error.to_string())?;
    Ok(match companion.as_ref() {
        Some(session) => json!({
            "status": "paired",
            "sessionId": session.host.session_id,
            "clientId": session.client_id,
            "expiresAt": session.expires_at,
            "capabilityReady": !session.capability.is_empty(),
            "revision": session.revision,
            "document": session.document,
            "queueDepth": session.queue.len(),
            "online": session.online,
            "endpoint": session.host.endpoint,
            "certificateFingerprint": session.host.certificate_fingerprint
        }),
        None => json!({ "status": "unpaired" }),
    })
}

#[tauri::command]
async fn draw_companion_pair(
    runtime: tauri::State<'_, Arc<DrawRuntime>>,
    host: transport::DiscoveredHost,
    code: String,
) -> Result<Value, String> {
    let client_id = format!("iphone-{}", Uuid::new_v4());
    let grant = transport::remote_pair(transport::RemotePairRequest {
        endpoint: host.endpoint.clone(),
        certificate_der: host.certificate_der.clone(),
        certificate_fingerprint: host.certificate_fingerprint.clone(),
        code,
        client_id: client_id.clone(),
    })
    .await?;
    let session = CompanionSession {
        host,
        client_id,
        capability: grant["capability"]
            .as_str()
            .ok_or("Pairing grant omitted capability")?
            .to_string(),
        expires_at: grant["expiresAt"]
            .as_str()
            .ok_or("Pairing grant omitted expiry")?
            .to_string(),
        revision: grant["revision"]
            .as_u64()
            .ok_or("Pairing grant omitted revision")?,
        document: grant["document"].clone(),
        queue: VecDeque::new(),
        online: true,
    };
    store_companion_capability(&session.capability)?;
    persist_companion_state(&runtime.companion_state_path, &session)?;
    *runtime
        .companion
        .lock()
        .map_err(|error| error.to_string())? = Some(session);
    draw_companion_status(runtime)
}

#[tauri::command]
fn draw_host_apply_local(
    runtime: tauri::State<'_, Arc<DrawRuntime>>,
    operation: CanvasOperation,
) -> Result<Value, String> {
    let mut state = runtime.host.lock().map_err(|error| error.to_string())?;
    let envelope = OperationEnvelope {
        protocol_version: PROTOCOL_VERSION.into(),
        document_version: DOCUMENT_VERSION.into(),
        session_id: state.session_id.clone(),
        client_id: "native-mac".into(),
        operation_id: format!("mac-{}", Uuid::new_v4()),
        base_revision: state.revision,
        sent_at: rfc3339(now())?,
        capability: runtime.host_capability.clone(),
        operation,
    };
    apply_operation_locked(&runtime, &mut state, envelope)
}

fn replace_host_document(
    runtime: &DrawRuntime,
    document: Value,
    reason: String,
) -> Result<Value, String> {
    if cfg!(mobile) {
        return Err("Only the Mac authority can replace the canonical document".into());
    }
    if !valid_document(&document) {
        return Err("Replacement document is invalid".into());
    }
    let mut state = runtime.host.lock().map_err(|error| error.to_string())?;
    state.revision += 1;
    state.document = document;
    let operation_id = format!("mac-replace-{}", Uuid::new_v4());
    let fingerprint = digest_capability(
        &serde_json::to_string(&state.document).map_err(|error| error.to_string())?,
    );
    let receipt = AppliedOperation {
        operation_id: operation_id.clone(),
        client_id: "native-mac".into(),
        fingerprint,
        revision: state.revision,
        document_updated_at: state
            .document
            .get("updatedAt")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_string(),
    };
    state.applied.insert(operation_id, receipt);
    prune_applied_receipts(&mut state.applied);
    persist_state(&runtime.state_path, &state)?;
    Ok(json!({
        "status": "applied",
        "reason": reason,
        "sessionId": state.session_id,
        "revision": state.revision,
        "document": state.document
    }))
}

#[tauri::command]
fn draw_host_replace_document(
    runtime: tauri::State<'_, Arc<DrawRuntime>>,
    document: Value,
    reason: String,
) -> Result<Value, String> {
    replace_host_document(&runtime, document, reason)
}

async fn flush_companion(runtime: &DrawRuntime) -> Result<Value, String> {
    let _flush_guard = runtime.companion_flush.lock().await;
    loop {
        let (request, expected_operation_id) = {
            let companion = runtime
                .companion
                .lock()
                .map_err(|error| error.to_string())?;
            let Some(session) = companion.as_ref() else {
                return Err("iPhone is not paired".into());
            };
            if !session.online {
                let document = optimistic_companion_document(session);
                return Ok(
                    json!({ "status": "queued", "queueDepth": session.queue.len(), "revision": session.revision, "document": document, "online": false }),
                );
            }
            let Some(envelope) = session.queue.front().cloned() else {
                return Ok(
                    json!({ "status": "synced", "queueDepth": 0, "revision": session.revision, "document": session.document }),
                );
            };
            let expected_operation_id = envelope.operation_id.clone();
            (
                transport::RemoteOperationRequest {
                    endpoint: session.host.endpoint.clone(),
                    certificate_der: session.host.certificate_der.clone(),
                    certificate_fingerprint: session.host.certificate_fingerprint.clone(),
                    envelope,
                },
                expected_operation_id,
            )
        };
        let result = match transport::remote_submit(request).await {
            Ok(result) => result,
            Err(error) => {
                let mut companion = runtime.companion.lock().map_err(|lock| lock.to_string())?;
                let session = companion.as_mut().ok_or("iPhone is not paired")?;
                session.online = false;
                persist_companion_state(&runtime.companion_state_path, session)?;
                return Ok(
                    json!({ "status": "queued", "queueDepth": session.queue.len(), "revision": session.revision, "online": false, "error": error }),
                );
            }
        };
        let rebase_request = {
            let mut companion = runtime
                .companion
                .lock()
                .map_err(|error| error.to_string())?;
            let session = companion.as_mut().ok_or("iPhone is not paired")?;
            if matches!(result["status"].as_str(), Some("applied" | "duplicate")) {
                session.revision = result["revision"]
                    .as_u64()
                    .ok_or("Host response omitted revision")?;
                session.document = result["document"].clone();
                if session
                    .queue
                    .front()
                    .map(|queued| queued.operation_id.as_str())
                    == Some(expected_operation_id.as_str())
                {
                    session.queue.pop_front();
                } else {
                    return Err("Companion queue changed while an operation was in flight".into());
                }
                persist_companion_state(&runtime.companion_state_path, session)?;
                None
            } else if matches!(
                result["code"].as_str(),
                Some("STALE_REVISION" | "FUTURE_REVISION")
            ) {
                Some((
                    transport::RemoteSnapshotRequest {
                        endpoint: session.host.endpoint.clone(),
                        certificate_der: session.host.certificate_der.clone(),
                        certificate_fingerprint: session.host.certificate_fingerprint.clone(),
                        client_id: session.client_id.clone(),
                        capability: session.capability.clone(),
                    },
                    false,
                ))
            } else if result["code"].as_str() == Some("INVALID_OPERATION") {
                Some((
                    transport::RemoteSnapshotRequest {
                        endpoint: session.host.endpoint.clone(),
                        certificate_der: session.host.certificate_der.clone(),
                        certificate_fingerprint: session.host.certificate_fingerprint.clone(),
                        client_id: session.client_id.clone(),
                        capability: session.capability.clone(),
                    },
                    true,
                ))
            } else {
                return Ok(
                    json!({ "status": "conflict", "queueDepth": session.queue.len(), "revision": session.revision, "document": session.document, "hostResult": result }),
                );
            }
        };
        let Some((snapshot_request, invalid_operation)) = rebase_request else {
            continue;
        };
        let snapshot = transport::remote_snapshot(snapshot_request).await?;
        let mut companion = runtime
            .companion
            .lock()
            .map_err(|error| error.to_string())?;
        let session = companion.as_mut().ok_or("iPhone is not paired")?;
        session.revision = snapshot["revision"]
            .as_u64()
            .ok_or("Snapshot omitted revision")?;
        session.document = snapshot["document"].clone();
        if invalid_operation {
            let safely_reconciled = session
                .queue
                .front()
                .is_some_and(|envelope| is_safe_idempotent(&session.document, &envelope.operation));
            if safely_reconciled {
                session.queue.pop_front();
                persist_companion_state(&runtime.companion_state_path, session)?;
                continue;
            }
            persist_companion_state(&runtime.companion_state_path, session)?;
            return Ok(json!({
                "status": "conflict",
                "queueDepth": session.queue.len(),
                "revision": session.revision,
                "document": optimistic_companion_document(session),
                "code": "INVALID_OPERATION"
            }));
        }
        let revision = session.revision;
        for (offset, envelope) in session.queue.iter_mut().enumerate() {
            envelope.base_revision = revision + offset as u64;
            envelope.operation_id = format!("iphone-rebased-{}", Uuid::new_v4());
            envelope.sent_at = rfc3339(now())?;
        }
        persist_companion_state(&runtime.companion_state_path, session)?;
    }
}

fn queue_companion_operation(
    runtime: &DrawRuntime,
    operation: CanvasOperation,
) -> Result<(), String> {
    let mut companion = runtime
        .companion
        .lock()
        .map_err(|error| error.to_string())?;
    let session = companion.as_mut().ok_or("iPhone is not paired")?;
    if !session.online {
        let superseded =
            session
                .queue
                .iter()
                .rposition(|envelope| match (&envelope.operation, &operation) {
                    (CanvasOperation::SetTitle { .. }, CanvasOperation::SetTitle { .. }) => true,
                    (CanvasOperation::SetViewport { .. }, CanvasOperation::SetViewport { .. }) => {
                        true
                    }
                    (
                        CanvasOperation::PutObject { object: prior },
                        CanvasOperation::PutObject { object: next },
                    ) => prior.get("id") == next.get("id"),
                    _ => false,
                });
        if let Some(index) = superseded {
            let envelope = session
                .queue
                .get_mut(index)
                .ok_or("Superseded queue entry disappeared")?;
            envelope.operation = operation;
            envelope.operation_id = format!("iphone-coalesced-{}", Uuid::new_v4());
            envelope.sent_at = rfc3339(now())?;
            for (offset, queued) in session.queue.iter_mut().enumerate() {
                queued.base_revision = session.revision + offset as u64;
            }
            persist_companion_state(&runtime.companion_state_path, session)?;
            return Ok(());
        }
    }
    if session.queue.len() >= MAX_COMPANION_QUEUE {
        return Err("Offline queue is full; reconnect before adding more changes".into());
    }
    let base_revision = session.revision + session.queue.len() as u64;
    session.queue.push_back(OperationEnvelope {
        protocol_version: PROTOCOL_VERSION.into(),
        document_version: DOCUMENT_VERSION.into(),
        session_id: session.host.session_id.clone(),
        client_id: session.client_id.clone(),
        operation_id: format!("iphone-{}", Uuid::new_v4()),
        base_revision,
        sent_at: rfc3339(now())?,
        capability: session.capability.clone(),
        operation,
    });
    for (offset, envelope) in session.queue.iter_mut().enumerate() {
        envelope.base_revision = session.revision + offset as u64;
    }
    persist_companion_state(&runtime.companion_state_path, session)?;
    Ok(())
}

#[tauri::command]
async fn draw_companion_submit(
    runtime: tauri::State<'_, Arc<DrawRuntime>>,
    operation: CanvasOperation,
) -> Result<Value, String> {
    queue_companion_operation(&runtime, operation)?;
    flush_companion(&runtime).await
}

#[tauri::command]
async fn draw_companion_set_online(
    runtime: tauri::State<'_, Arc<DrawRuntime>>,
    online: bool,
) -> Result<Value, String> {
    {
        let mut companion = runtime
            .companion
            .lock()
            .map_err(|error| error.to_string())?;
        companion.as_mut().ok_or("iPhone is not paired")?.online = online;
        if let Some(session) = companion.as_ref() {
            persist_companion_state(&runtime.companion_state_path, session)?;
        }
    }
    if online {
        flush_companion(&runtime).await
    } else {
        draw_companion_status(runtime)
    }
}

#[tauri::command]
fn draw_companion_forget(runtime: tauri::State<'_, Arc<DrawRuntime>>) -> Result<Value, String> {
    *runtime
        .companion
        .lock()
        .map_err(|error| error.to_string())? = None;
    let _ = fs::remove_file(&runtime.companion_state_path);
    delete_companion_capability()?;
    Ok(json!({ "status": "unpaired" }))
}

#[tauri::command]
async fn draw_companion_refresh(
    runtime: tauri::State<'_, Arc<DrawRuntime>>,
) -> Result<Value, String> {
    let request = {
        let companion = runtime
            .companion
            .lock()
            .map_err(|error| error.to_string())?;
        let session = companion.as_ref().ok_or("iPhone is not paired")?;
        if !session.online {
            return Ok(
                json!({ "status": "paired", "sessionId": session.host.session_id, "revision": session.revision, "document": session.document, "queueDepth": session.queue.len(), "online": false, "certificateFingerprint": session.host.certificate_fingerprint }),
            );
        }
        transport::RemoteSnapshotRequest {
            endpoint: session.host.endpoint.clone(),
            certificate_der: session.host.certificate_der.clone(),
            certificate_fingerprint: session.host.certificate_fingerprint.clone(),
            client_id: session.client_id.clone(),
            capability: session.capability.clone(),
        }
    };
    let snapshot = transport::remote_snapshot(request).await?;
    let mut companion = runtime
        .companion
        .lock()
        .map_err(|error| error.to_string())?;
    let session = companion.as_mut().ok_or("iPhone is not paired")?;
    if session.queue.is_empty() {
        session.revision = snapshot["revision"]
            .as_u64()
            .ok_or("Snapshot omitted revision")?;
        session.document = snapshot["document"].clone();
        persist_companion_state(&runtime.companion_state_path, session)?;
    }
    Ok(
        json!({ "status": "paired", "sessionId": session.host.session_id, "revision": session.revision, "document": session.document, "queueDepth": session.queue.len(), "online": session.online, "certificateFingerprint": session.host.certificate_fingerprint }),
    )
}

#[tauri::command]
fn draw_pair_begin(runtime: tauri::State<'_, Arc<DrawRuntime>>) -> Result<PairingOffer, String> {
    pair_begin(&runtime)
}

#[tauri::command]
fn draw_revoke_client(
    runtime: tauri::State<'_, Arc<DrawRuntime>>,
    client_id: String,
) -> Result<Value, String> {
    revoke_client(&runtime, client_id)
}

#[tauri::command]
async fn draw_discover_hosts() -> Result<Vec<transport::DiscoveredHost>, String> {
    tauri::async_runtime::spawn_blocking(transport::discover)
        .await
        .map_err(|error| error.to_string())?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let home = std::env::var_os("CREATE_SOMETHING_DRAW_HOME")
                .map(PathBuf::from)
                .unwrap_or(app.path().app_data_dir()?);
            let state_path = home.join(STATE_FILE);
            let companion_state_path = home.join(COMPANION_STATE_FILE);
            let host = load_state(&state_path);
            let host_capability = random_capability();
            let mut host = host;
            host.clients.insert(
                "native-mac".into(),
                PairedClient {
                    capability_digest: digest_capability(&host_capability),
                    expires_at: "9999-12-31T23:59:59Z".into(),
                    revoked_at: None,
                },
            );
            persist_state(&state_path, &host).map_err(std::io::Error::other)?;
            let runtime = Arc::new(DrawRuntime {
                state_path,
                host: Mutex::new(host),
                pending: Mutex::new(HashMap::new()),
                transport: Mutex::new(None),
                host_capability,
                companion: Mutex::new(restore_companion(&companion_state_path)),
                companion_state_path,
                companion_flush: tokio::sync::Mutex::new(()),
            });
            #[cfg(desktop)]
            transport::start(runtime.clone(), &home).map_err(std::io::Error::other)?;
            app.manage(runtime);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            draw_host_status,
            draw_runtime_role,
            draw_companion_status,
            draw_companion_pair,
            draw_host_apply_local,
            draw_host_replace_document,
            draw_companion_submit,
            draw_companion_set_online,
            draw_companion_refresh,
            draw_companion_forget,
            draw_pair_begin,
            draw_revoke_client,
            draw_discover_hosts
        ])
        .run(tauri::generate_context!())
        .expect("error while running CREATE SOMETHING Draw");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn persisted_state_never_contains_a_raw_capability() {
        let directory = std::env::temp_dir().join(format!("draw-native-{}", Uuid::new_v4()));
        let path = directory.join(STATE_FILE);
        let mut state = initial_state();
        state.clients.insert(
            "phone".into(),
            PairedClient {
                capability_digest: digest_capability("top-secret"),
                expires_at: "2099-01-01T00:00:00Z".into(),
                revoked_at: None,
            },
        );
        persist_state(&path, &state).unwrap();
        let source = fs::read_to_string(&path).unwrap();
        assert!(!source.contains("top-secret"));
        assert_eq!(load_state(&path), state);
        let _ = fs::remove_dir_all(directory);
    }

    #[test]
    fn pairing_capabilities_are_long_and_non_repeating() {
        let first = random_capability();
        let second = random_capability();
        assert_eq!(first.len(), 48);
        assert_ne!(first, second);
    }

    #[test]
    fn host_status_never_exposes_the_internal_mac_client() {
        let directory = std::env::temp_dir().join(format!("draw-host-status-{}", Uuid::new_v4()));
        let mut state = initial_state();
        let client = PairedClient {
            capability_digest: digest_capability("fixture"),
            expires_at: "2099-01-01T00:00:00Z".into(),
            revoked_at: None,
        };
        state.clients.insert("native-mac".into(), client.clone());
        state.clients.insert("iphone-visible".into(), client);
        let runtime = DrawRuntime {
            state_path: directory.join(STATE_FILE),
            host: Mutex::new(state),
            pending: Mutex::new(HashMap::new()),
            transport: Mutex::new(None),
            host_capability: random_capability(),
            companion_state_path: directory.join(COMPANION_STATE_FILE),
            companion: Mutex::new(None),
            companion_flush: tokio::sync::Mutex::new(()),
        };
        let status = host_status(&runtime).unwrap();
        let clients = status["pairedClients"].as_array().unwrap();
        assert_eq!(clients.len(), 1);
        assert_eq!(clients[0]["clientId"], "iphone-visible");
        let _ = fs::remove_dir_all(directory);
    }

    #[test]
    fn only_semantically_completed_operations_are_safe_to_drop() {
        let state = initial_state();
        assert!(is_safe_idempotent(
            &state.document,
            &CanvasOperation::RemoveObjects {
                ids: vec!["already-absent".into()]
            }
        ));
        assert!(is_safe_idempotent(
            &state.document,
            &CanvasOperation::SetTitle {
                title: "Untitled mapping session".into()
            }
        ));
        assert!(!is_safe_idempotent(
            &state.document,
            &CanvasOperation::SetTitle {
                title: "Still pending".into()
            }
        ));
        assert!(!is_safe_idempotent(
            &state.document,
            &CanvasOperation::PutObject {
                object: json!({ "id": "malformed" })
            }
        ));
    }

    #[test]
    fn pairing_offer_is_invalidated_after_bounded_failures() {
        let directory = std::env::temp_dir().join(format!("draw-pair-limit-{}", Uuid::new_v4()));
        let runtime = DrawRuntime {
            state_path: directory.join(STATE_FILE),
            host: Mutex::new(initial_state()),
            pending: Mutex::new(HashMap::new()),
            transport: Mutex::new(None),
            host_capability: random_capability(),
            companion_state_path: directory.join(COMPANION_STATE_FILE),
            companion: Mutex::new(None),
            companion_flush: tokio::sync::Mutex::new(()),
        };
        let offer = pair_begin(&runtime).unwrap();
        for attempt in 0..MAX_PAIRING_FAILURES {
            assert!(pair_confirm(&runtime, format!("wrong-{attempt}"), "attacker".into()).is_err());
        }
        assert!(pair_confirm(&runtime, offer.code, "iphone".into()).is_err());
        let _ = fs::remove_dir_all(directory);
    }

    #[test]
    fn companion_metadata_excludes_the_keychain_capability() {
        let directory = std::env::temp_dir().join(format!("draw-companion-{}", Uuid::new_v4()));
        let path = directory.join(COMPANION_STATE_FILE);
        let mut queue = VecDeque::new();
        queue.push_back(OperationEnvelope {
            protocol_version: PROTOCOL_VERSION.into(),
            document_version: DOCUMENT_VERSION.into(),
            session_id: "session-test".into(),
            client_id: "iphone-test".into(),
            operation_id: "operation-persisted-offline".into(),
            base_revision: 3,
            sent_at: "2026-08-29T16:00:00Z".into(),
            capability: "never-write-this-secret".into(),
            operation: CanvasOperation::SetTitle {
                title: "Durable queued action".into(),
            },
        });
        let session = CompanionSession {
            host: transport::DiscoveredHost {
                endpoint: "https://draw-mac.local:4242".into(),
                session_id: "session-test".into(),
                protocol_version: PROTOCOL_VERSION.into(),
                certificate_fingerprint: "a".repeat(64),
                certificate_der: "fixture-certificate".into(),
            },
            client_id: "iphone-test".into(),
            capability: "never-write-this-secret".into(),
            expires_at: "2099-01-01T00:00:00Z".into(),
            revision: 3,
            document: initial_state().document,
            queue,
            online: true,
        };
        persist_companion_state(&path, &session).unwrap();
        let source = fs::read_to_string(&path).unwrap();
        assert!(!source.contains("never-write-this-secret"));
        assert!(source.contains("operation-persisted-offline"));
        assert!(source.contains("Durable queued action"));
        let restored = load_companion_state(&path).unwrap();
        assert_eq!(restored.revision, 3);
        assert!(restored.online);
        assert_eq!(restored.queue.len(), 1);
        assert_eq!(
            restored.queue[0].operation_id,
            "operation-persisted-offline"
        );
        let _ = fs::remove_dir_all(directory);
    }

    #[test]
    fn mac_document_replacement_is_validated_persisted_and_revisioned() {
        let directory = std::env::temp_dir().join(format!("draw-replace-{}", Uuid::new_v4()));
        let state_path = directory.join(STATE_FILE);
        let companion_state_path = directory.join(COMPANION_STATE_FILE);
        let state = initial_state();
        let session_id = state.session_id.clone();
        let runtime = DrawRuntime {
            state_path: state_path.clone(),
            host: Mutex::new(state.clone()),
            pending: Mutex::new(HashMap::new()),
            transport: Mutex::new(None),
            host_capability: random_capability(),
            companion_state_path,
            companion: Mutex::new(None),
            companion_flush: tokio::sync::Mutex::new(()),
        };
        assert!(replace_host_document(
            &runtime,
            json!({ "version": DOCUMENT_VERSION }),
            "import".into()
        )
        .is_err());
        let mut replacement = state.document;
        replacement["title"] = json!("Restored Mac history");
        replacement["updatedAt"] = json!("2026-08-29T16:30:00Z");
        let result = replace_host_document(&runtime, replacement.clone(), "undo".into()).unwrap();
        assert_eq!(result["revision"], 1);
        let persisted = load_state(&state_path);
        assert_eq!(persisted.session_id, session_id);
        assert_eq!(persisted.revision, 1);
        assert_eq!(persisted.document, replacement);
        assert_eq!(persisted.applied.len(), 1);
        let _ = fs::remove_dir_all(directory);
    }

    #[test]
    fn host_replacements_share_the_bounded_receipt_window() {
        let directory = std::env::temp_dir().join(format!("draw-replace-bound-{}", Uuid::new_v4()));
        let state_path = directory.join(STATE_FILE);
        let companion_state_path = directory.join(COMPANION_STATE_FILE);
        let mut state = initial_state();
        for revision in 1..=create_something_draw_pairing_protocol::MAX_APPLIED_RECEIPTS {
            let operation_id = format!("existing-{revision}");
            state.applied.insert(
                operation_id.clone(),
                AppliedOperation {
                    operation_id,
                    client_id: "native-mac".into(),
                    fingerprint: "fixture".into(),
                    revision: revision as u64,
                    document_updated_at: "2026-08-29T16:00:00Z".into(),
                },
            );
        }
        state.revision = create_something_draw_pairing_protocol::MAX_APPLIED_RECEIPTS as u64;
        let replacement = state.document.clone();
        let runtime = DrawRuntime {
            state_path: state_path.clone(),
            host: Mutex::new(state),
            pending: Mutex::new(HashMap::new()),
            transport: Mutex::new(None),
            host_capability: random_capability(),
            companion_state_path,
            companion: Mutex::new(None),
            companion_flush: tokio::sync::Mutex::new(()),
        };
        replace_host_document(&runtime, replacement, "reset".into()).unwrap();
        let persisted = load_state(&state_path);
        assert_eq!(
            persisted.applied.len(),
            create_something_draw_pairing_protocol::MAX_APPLIED_RECEIPTS
        );
        assert!(!persisted.applied.contains_key("existing-1"));
        assert!(persisted
            .applied
            .values()
            .any(|receipt| receipt.revision == persisted.revision));
        let _ = fs::remove_dir_all(directory);
    }

    #[test]
    fn offline_put_coalescing_preserves_dependency_order() {
        let directory = std::env::temp_dir().join(format!("draw-queue-order-{}", Uuid::new_v4()));
        let runtime = DrawRuntime {
            state_path: directory.join(STATE_FILE),
            host: Mutex::new(initial_state()),
            pending: Mutex::new(HashMap::new()),
            transport: Mutex::new(None),
            host_capability: random_capability(),
            companion_state_path: directory.join(COMPANION_STATE_FILE),
            companion: Mutex::new(Some(CompanionSession {
                host: transport::DiscoveredHost {
                    endpoint: "https://draw-mac.local:4242".into(),
                    session_id: "session-order".into(),
                    protocol_version: PROTOCOL_VERSION.into(),
                    certificate_fingerprint: "a".repeat(64),
                    certificate_der: "fixture-certificate".into(),
                },
                client_id: "iphone-order".into(),
                capability: "fixture-secret".into(),
                expires_at: "2099-01-01T00:00:00Z".into(),
                revision: 4,
                document: initial_state().document,
                queue: VecDeque::new(),
                online: false,
            })),
            companion_flush: tokio::sync::Mutex::new(()),
        };
        queue_companion_operation(
            &runtime,
            CanvasOperation::PutObject {
                object: json!({ "id": "note-a", "text": "first" }),
            },
        )
        .unwrap();
        queue_companion_operation(
            &runtime,
            CanvasOperation::SetTitle {
                title: "Depends on prior queue order".into(),
            },
        )
        .unwrap();
        queue_companion_operation(
            &runtime,
            CanvasOperation::PutObject {
                object: json!({ "id": "note-a", "text": "latest" }),
            },
        )
        .unwrap();
        let companion = runtime.companion.lock().unwrap();
        let queue = &companion.as_ref().unwrap().queue;
        assert_eq!(queue.len(), 2);
        assert!(matches!(
            queue[0].operation,
            CanvasOperation::PutObject { .. }
        ));
        assert!(matches!(
            queue[1].operation,
            CanvasOperation::SetTitle { .. }
        ));
        assert_eq!(queue[0].base_revision, 4);
        assert_eq!(queue[1].base_revision, 5);
        assert_eq!(
            match &queue[0].operation {
                CanvasOperation::PutObject { object } => object["text"].as_str(),
                _ => None,
            },
            Some("latest")
        );
        drop(companion);
        let _ = fs::remove_dir_all(directory);
    }

    #[test]
    fn transport_failure_persists_offline_reconnect_state() {
        let directory = std::env::temp_dir().join(format!("draw-offline-{}", Uuid::new_v4()));
        let companion_state_path = directory.join(COMPANION_STATE_FILE);
        let runtime = DrawRuntime {
            state_path: directory.join(STATE_FILE),
            host: Mutex::new(initial_state()),
            pending: Mutex::new(HashMap::new()),
            transport: Mutex::new(None),
            host_capability: random_capability(),
            companion_state_path: companion_state_path.clone(),
            companion: Mutex::new(Some(CompanionSession {
                host: transport::DiscoveredHost {
                    endpoint: "https://127.0.0.1:9".into(),
                    session_id: "session-offline".into(),
                    protocol_version: PROTOCOL_VERSION.into(),
                    certificate_fingerprint: "a".repeat(64),
                    certificate_der: "invalid-certificate".into(),
                },
                client_id: "iphone-offline".into(),
                capability: "offline-secret".into(),
                expires_at: "2099-01-01T00:00:00Z".into(),
                revision: 0,
                document: initial_state().document,
                queue: VecDeque::new(),
                online: true,
            })),
            companion_flush: tokio::sync::Mutex::new(()),
        };
        queue_companion_operation(
            &runtime,
            CanvasOperation::SetTitle {
                title: "Queued".into(),
            },
        )
        .unwrap();
        let result = tokio::runtime::Runtime::new()
            .unwrap()
            .block_on(flush_companion(&runtime))
            .unwrap();
        assert_eq!(result["status"], "queued");
        assert_eq!(result["online"], false);
        assert!(!runtime.companion.lock().unwrap().as_ref().unwrap().online);
        assert!(!load_companion_state(&companion_state_path).unwrap().online);
        let _ = fs::remove_dir_all(directory);
    }
}
