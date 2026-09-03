use std::{
    fs,
    net::{IpAddr, SocketAddr, TcpListener},
    path::Path,
    sync::Arc,
};

use axum::{
    extract::{ConnectInfo, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use axum_server::tls_rustls::RustlsConfig;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use create_something_draw_pairing_protocol::{OperationEnvelope, PROTOCOL_VERSION};
use local_ip_address::local_ip;
#[cfg(not(target_os = "ios"))]
use mdns_sd::{ServiceDaemon, ServiceEvent, ServiceInfo};
use rcgen::{generate_simple_self_signed, CertifiedKey};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};

use crate::{apply_operation, authorized_snapshot, host_status, DrawRuntime};

#[cfg(target_os = "ios")]
mod ios_bonjour;

const SERVICE_TYPE: &str = "_csdraw._tcp.local.";
const CERT_FILE: &str = "pairing-cert.pem";
const KEY_FILE: &str = "pairing-key.pem";
const HOST_ID_FILE: &str = "pairing-host-id";
const CERT_IDENTITY_FILE: &str = "pairing-cert-identity";

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PairRequest {
    code: String,
    client_id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SnapshotRequest {
    client_id: String,
    capability: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DiscoveredHost {
    pub(crate) endpoint: String,
    pub(crate) session_id: String,
    pub(crate) protocol_version: String,
    pub(crate) certificate_fingerprint: String,
    pub(crate) certificate_der: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RemotePairRequest {
    pub(crate) endpoint: String,
    pub(crate) certificate_der: String,
    pub(crate) certificate_fingerprint: String,
    pub(crate) code: String,
    pub(crate) client_id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RemoteOperationRequest {
    pub(crate) endpoint: String,
    pub(crate) certificate_der: String,
    pub(crate) certificate_fingerprint: String,
    pub(crate) envelope: OperationEnvelope,
}

pub(crate) struct RemoteSnapshotRequest {
    pub(crate) endpoint: String,
    pub(crate) certificate_der: String,
    pub(crate) certificate_fingerprint: String,
    pub(crate) client_id: String,
    pub(crate) capability: String,
}

fn api_error(status: StatusCode, message: String) -> (StatusCode, Json<Value>) {
    (status, Json(json!({ "error": message })))
}

async fn public_status(
    State(runtime): State<Arc<DrawRuntime>>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let value = host_status(&runtime)
        .map_err(|error| api_error(StatusCode::INTERNAL_SERVER_ERROR, error))?;
    Ok(Json(json!({
        "sessionId": value["sessionId"],
        "revision": value["revision"],
        "protocolVersion": value["protocolVersion"],
        "documentVersion": value["documentVersion"],
        "transport": value["transport"]
    })))
}

async fn confirm_pairing(
    State(runtime): State<Arc<DrawRuntime>>,
    ConnectInfo(source): ConnectInfo<SocketAddr>,
    Json(request): Json<PairRequest>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let grant = crate::pair_confirm_from_source(
        &runtime,
        request.code,
        request.client_id,
        &source.ip().to_string(),
    )
    .map_err(|error| api_error(StatusCode::UNAUTHORIZED, error))?;
    serde_json::to_value(grant)
        .map(Json)
        .map_err(|error| api_error(StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))
}

async fn submit_operation(
    State(runtime): State<Arc<DrawRuntime>>,
    Json(envelope): Json<OperationEnvelope>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    apply_operation(&runtime, envelope)
        .map(Json)
        .map_err(|error| api_error(StatusCode::BAD_REQUEST, error))
}

async fn snapshot(
    State(runtime): State<Arc<DrawRuntime>>,
    Json(request): Json<SnapshotRequest>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    authorized_snapshot(&runtime, &request.client_id, &request.capability)
        .map(Json)
        .map_err(|error| api_error(StatusCode::UNAUTHORIZED, error))
}

fn host_identity(home: &Path) -> Result<String, String> {
    let path = home.join(HOST_ID_FILE);
    if let Ok(value) = fs::read_to_string(&path) {
        let value = value.trim();
        if !value.is_empty()
            && value.len() <= 32
            && value
                .chars()
                .all(|character| character.is_ascii_lowercase() || character.is_ascii_digit())
        {
            return Ok(value.to_string());
        }
        return Err("Persisted Draw host identity is invalid".into());
    }
    fs::create_dir_all(home).map_err(|error| error.to_string())?;
    let identity = uuid::Uuid::new_v4().simple().to_string()[..12].to_string();
    fs::write(&path, format!("{identity}\n")).map_err(|error| error.to_string())?;
    Ok(identity)
}

fn certificate_material(home: &Path, hostname: &str) -> Result<(Vec<u8>, Vec<u8>, String), String> {
    let cert_path = home.join(CERT_FILE);
    let key_path = home.join(KEY_FILE);
    let identity_path = home.join(CERT_IDENTITY_FILE);
    let reusable =
        fs::read_to_string(&identity_path).is_ok_and(|identity| identity.trim() == hostname);
    let (cert, key) = match (reusable, fs::read(&cert_path), fs::read(&key_path)) {
        (true, Ok(cert), Ok(key)) => (cert, key),
        _ => {
            fs::create_dir_all(home).map_err(|error| error.to_string())?;
            let CertifiedKey { cert, signing_key } = generate_simple_self_signed(vec![
                hostname.trim_end_matches('.').into(),
                "localhost".into(),
            ])
            .map_err(|error| error.to_string())?;
            let cert = cert.pem().into_bytes();
            let key = signing_key.serialize_pem().into_bytes();
            fs::write(&cert_path, &cert).map_err(|error| error.to_string())?;
            fs::write(&key_path, &key).map_err(|error| error.to_string())?;
            fs::write(&identity_path, format!("{hostname}\n"))
                .map_err(|error| error.to_string())?;
            (cert, key)
        }
    };
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&key_path, fs::Permissions::from_mode(0o600))
            .map_err(|error| error.to_string())?;
    }
    let certificate_der = rustls_pemfile::certs(&mut cert.as_slice())
        .next()
        .ok_or_else(|| "Pairing certificate is missing".to_string())?
        .map_err(|error| error.to_string())?;
    let fingerprint = Sha256::digest(certificate_der.as_ref())
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect();
    Ok((cert, key, fingerprint))
}

#[cfg(not(target_os = "ios"))]
fn advertise(
    port: u16,
    address: IpAddr,
    certificate_der: &[u8],
    fingerprint: &str,
    session_id: &str,
    instance_name: &str,
    hostname: &str,
) -> Result<ServiceDaemon, String> {
    let daemon = ServiceDaemon::new().map_err(|error| error.to_string())?;
    let encoded_certificate = BASE64.encode(certificate_der);
    let certificate_chunks = encoded_certificate
        .as_bytes()
        .chunks(180)
        .collect::<Vec<_>>();
    let mut properties = vec![
        ("protocol".to_string(), PROTOCOL_VERSION.to_string()),
        ("fingerprint".to_string(), fingerprint.to_string()),
        ("session".to_string(), session_id.to_string()),
        (
            "certParts".to_string(),
            certificate_chunks.len().to_string(),
        ),
    ];
    for (index, chunk) in certificate_chunks.iter().enumerate() {
        properties.push((
            format!("cert{index}"),
            String::from_utf8_lossy(chunk).into_owned(),
        ));
    }
    let service = ServiceInfo::new(
        SERVICE_TYPE,
        instance_name,
        hostname,
        address,
        port,
        properties.as_slice(),
    )
    .map_err(|error| error.to_string())?
    .enable_addr_auto();
    daemon
        .register(service)
        .map_err(|error| error.to_string())?;
    Ok(daemon)
}

#[cfg(not(target_os = "ios"))]
pub(crate) fn start(runtime: Arc<DrawRuntime>, home: &Path) -> Result<(), String> {
    let listener = TcpListener::bind(("0.0.0.0", 0)).map_err(|error| error.to_string())?;
    listener
        .set_nonblocking(true)
        .map_err(|error| error.to_string())?;
    let port = listener
        .local_addr()
        .map_err(|error| error.to_string())?
        .port();
    let address = local_ip().unwrap_or(IpAddr::from([127, 0, 0, 1]));
    let host_id = host_identity(home)?;
    let hostname = format!("create-something-draw-{host_id}.local.");
    let instance_name = format!("CREATE SOMETHING Draw {host_id}");
    let (cert, key, fingerprint) = certificate_material(home, &hostname)?;
    let certificate_der = rustls_pemfile::certs(&mut cert.as_slice())
        .next()
        .ok_or_else(|| "Pairing certificate is missing".to_string())?
        .map_err(|error| error.to_string())?;
    let session_id = runtime
        .host
        .lock()
        .map_err(|error| error.to_string())?
        .session_id
        .clone();
    let mdns = advertise(
        port,
        address,
        certificate_der.as_ref(),
        &fingerprint,
        &session_id,
        &instance_name,
        &hostname,
    )?;
    *runtime
        .transport
        .lock()
        .map_err(|error| error.to_string())? = Some(json!({
        "status": "listening",
        "endpoint": format!("https://{address}:{port}"),
        "serviceType": SERVICE_TYPE,
        "serviceName": instance_name,
        "hostname": hostname,
        "certificateFingerprint": fingerprint
    }));
    let router = Router::new()
        .route("/v1/status", get(public_status))
        .route("/v1/pair/confirm", post(confirm_pairing))
        .route("/v1/operations", post(submit_operation))
        .route("/v1/snapshot", post(snapshot))
        .with_state(runtime);
    std::thread::Builder::new()
        .name("draw-pairing-host".into())
        .spawn(move || {
            let thread = tokio::runtime::Runtime::new().expect("pairing runtime");
            thread.block_on(async move {
                let _mdns = mdns;
                let tls = RustlsConfig::from_pem(cert, key)
                    .await
                    .expect("pairing TLS config");
                axum_server::from_tcp_rustls(listener, tls)
                    .serve(router.into_make_service_with_connect_info::<SocketAddr>())
                    .await
                    .expect("pairing HTTPS server");
            });
        })
        .map_err(|error| error.to_string())?;
    Ok(())
}

#[cfg(target_os = "ios")]
pub(crate) fn discover() -> Result<Vec<DiscoveredHost>, String> {
    ios_bonjour::discover(SERVICE_TYPE)
}

#[cfg(not(target_os = "ios"))]
pub(crate) fn discover() -> Result<Vec<DiscoveredHost>, String> {
    let daemon = ServiceDaemon::new().map_err(|error| error.to_string())?;
    let receiver = daemon
        .browse(SERVICE_TYPE)
        .map_err(|error| error.to_string())?;
    let deadline = std::time::Instant::now() + std::time::Duration::from_secs(3);
    let mut hosts = Vec::new();
    while let Some(remaining) = deadline.checked_duration_since(std::time::Instant::now()) {
        let Ok(event) = receiver.recv_timeout(remaining) else {
            break;
        };
        let ServiceEvent::ServiceResolved(info) = event else {
            continue;
        };
        let Some(protocol_version) = info.get_property_val_str("protocol") else {
            continue;
        };
        let Some(session_id) = info.get_property_val_str("session") else {
            continue;
        };
        let Some(fingerprint) = info.get_property_val_str("fingerprint") else {
            continue;
        };
        let part_count = info
            .get_property_val_str("certParts")
            .and_then(|value| value.parse::<usize>().ok())
            .unwrap_or_default();
        if part_count == 0 {
            continue;
        }
        let mut certificate_der = String::new();
        for index in 0..part_count {
            let Some(part) = info.get_property_val_str(&format!("cert{index}")) else {
                certificate_der.clear();
                break;
            };
            certificate_der.push_str(part);
        }
        if certificate_der.is_empty() {
            continue;
        }
        let endpoint = format!(
            "https://{}:{}",
            info.get_hostname().trim_end_matches('.'),
            info.get_port()
        );
        let host = DiscoveredHost {
            endpoint,
            session_id: session_id.to_string(),
            protocol_version: protocol_version.to_string(),
            certificate_fingerprint: fingerprint.to_string(),
            certificate_der,
        };
        if !hosts
            .iter()
            .any(|entry: &DiscoveredHost| entry.session_id == host.session_id)
        {
            hosts.push(host);
        }
    }
    let _ = daemon.stop_browse(SERVICE_TYPE);
    let _ = daemon.shutdown();
    Ok(hosts)
}

fn pinned_client(
    certificate_der: &str,
    certificate_fingerprint: &str,
) -> Result<reqwest::Client, String> {
    let certificate_der = BASE64
        .decode(certificate_der.as_bytes())
        .map_err(|error| error.to_string())?;
    let actual_fingerprint: String = Sha256::digest(&certificate_der)
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect();
    if actual_fingerprint != certificate_fingerprint.to_lowercase() {
        return Err("Discovered certificate fingerprint does not match its certificate".into());
    }
    let certificate =
        reqwest::Certificate::from_der(&certificate_der).map_err(|error| error.to_string())?;
    reqwest::Client::builder()
        .add_root_certificate(certificate)
        .https_only(true)
        .build()
        .map_err(|error| error.to_string())
}

pub(crate) async fn remote_pair(request: RemotePairRequest) -> Result<Value, String> {
    let client = pinned_client(&request.certificate_der, &request.certificate_fingerprint)?;
    let response = client
        .post(format!(
            "{}/v1/pair/confirm",
            request.endpoint.trim_end_matches('/')
        ))
        .json(&json!({ "code": request.code, "clientId": request.client_id }))
        .send()
        .await
        .map_err(|error| error.to_string())?;
    let status = response.status();
    let body: Value = response.json().await.map_err(|error| error.to_string())?;
    if !status.is_success() {
        return Err(body
            .get("error")
            .and_then(Value::as_str)
            .unwrap_or("Pairing rejected")
            .to_string());
    }
    Ok(body)
}

pub(crate) async fn remote_submit(request: RemoteOperationRequest) -> Result<Value, String> {
    let client = pinned_client(&request.certificate_der, &request.certificate_fingerprint)?;
    let response = client
        .post(format!(
            "{}/v1/operations",
            request.endpoint.trim_end_matches('/')
        ))
        .json(&request.envelope)
        .send()
        .await
        .map_err(|error| error.to_string())?;
    let status = response.status();
    let body: Value = response.json().await.map_err(|error| error.to_string())?;
    if !status.is_success() {
        return Err(body
            .get("error")
            .and_then(Value::as_str)
            .unwrap_or("Operation rejected")
            .to_string());
    }
    Ok(body)
}

pub(crate) async fn remote_snapshot(request: RemoteSnapshotRequest) -> Result<Value, String> {
    let client = pinned_client(&request.certificate_der, &request.certificate_fingerprint)?;
    let response = client
        .post(format!(
            "{}/v1/snapshot",
            request.endpoint.trim_end_matches('/')
        ))
        .json(&json!({ "clientId": request.client_id, "capability": request.capability }))
        .send()
        .await
        .map_err(|error| error.to_string())?;
    let status = response.status();
    let body: Value = response.json().await.map_err(|error| error.to_string())?;
    if !status.is_success() {
        return Err(body
            .get("error")
            .and_then(Value::as_str)
            .unwrap_or("Snapshot rejected")
            .to_string());
    }
    Ok(body)
}

#[cfg(test)]
mod tests {
    use std::{
        collections::{HashMap, VecDeque},
        sync::Mutex,
        time::Duration,
    };

    use super::*;
    use create_something_draw_pairing_protocol::{CanvasOperation, DOCUMENT_VERSION};

    use crate::{
        flush_companion, initial_state, pair_begin, queue_companion_operation, revoke_client,
        CompanionSession,
    };

    #[test]
    fn bonjour_and_certificate_identity_is_unique_per_mac_home() {
        let first = std::env::temp_dir().join(format!("draw-host-a-{}", uuid::Uuid::new_v4()));
        let second = std::env::temp_dir().join(format!("draw-host-b-{}", uuid::Uuid::new_v4()));
        let first_id = host_identity(&first).unwrap();
        let second_id = host_identity(&second).unwrap();
        assert_ne!(first_id, second_id);
        assert_eq!(host_identity(&first).unwrap(), first_id);
        let first_hostname = format!("create-something-draw-{first_id}.local.");
        let second_hostname = format!("create-something-draw-{second_id}.local.");
        assert_ne!(first_hostname, second_hostname);
        let (first_cert, _, first_fingerprint) =
            certificate_material(&first, &first_hostname).unwrap();
        let (second_cert, _, second_fingerprint) =
            certificate_material(&second, &second_hostname).unwrap();
        assert_ne!(first_cert, second_cert);
        assert_ne!(first_fingerprint, second_fingerprint);
        let _ = fs::remove_dir_all(first);
        let _ = fs::remove_dir_all(second);
    }

    #[test]
    fn discovery_and_certificate_pinned_pairing_reach_the_authoritative_host() {
        let home = std::env::temp_dir().join(format!("draw-transport-{}", uuid::Uuid::new_v4()));
        let state_path = home.join("paired-session.json");
        let runtime = Arc::new(DrawRuntime {
            state_path: state_path.clone(),
            host: Mutex::new(initial_state()),
            pending: Mutex::new(HashMap::new()),
            transport: Mutex::new(None),
            host_capability: "test-host-capability".into(),
            companion_state_path: home.join("companion-session.json"),
            companion: Mutex::new(None),
            companion_flush: tokio::sync::Mutex::new(()),
        });
        crate::persist_state(&state_path, &runtime.host.lock().unwrap()).unwrap();
        start(runtime.clone(), &home).unwrap();
        std::thread::sleep(Duration::from_millis(300));
        let offer = pair_begin(&runtime).unwrap();
        let session_id = runtime.host.lock().unwrap().session_id.clone();
        let host = discover()
            .unwrap()
            .into_iter()
            .find(|host| host.session_id == session_id)
            .expect("the Bonjour host should resolve");
        let discovered_host = host.clone();
        let endpoint = host.endpoint;
        let certificate_der = host.certificate_der;
        let certificate_fingerprint = host.certificate_fingerprint;
        let request = RemotePairRequest {
            endpoint: endpoint.clone(),
            certificate_der: certificate_der.clone(),
            certificate_fingerprint: certificate_fingerprint.clone(),
            code: offer.code,
            client_id: "integration-iphone".into(),
        };
        let thread = tokio::runtime::Runtime::new().unwrap();
        let grant = thread.block_on(remote_pair(request)).unwrap();
        assert_eq!(grant["sessionId"], session_id);
        assert_eq!(grant["clientId"], "integration-iphone");
        let capability = grant["capability"].as_str().unwrap().to_string();
        assert!(capability.len() >= 48);
        assert!(!fs::read_to_string(state_path)
            .unwrap()
            .contains(&capability));
        let envelope = OperationEnvelope {
            protocol_version: PROTOCOL_VERSION.into(),
            document_version: DOCUMENT_VERSION.into(),
            session_id: session_id.clone(),
            client_id: "integration-iphone".into(),
            operation_id: "operation-integration-title".into(),
            base_revision: 0,
            sent_at: "2026-08-29T15:00:00Z".into(),
            capability: capability.clone(),
            operation: CanvasOperation::SetTitle {
                title: "Paired iPhone session".into(),
            },
        };
        let submit = |envelope| RemoteOperationRequest {
            endpoint: endpoint.clone(),
            certificate_der: certificate_der.clone(),
            certificate_fingerprint: certificate_fingerprint.clone(),
            envelope,
        };
        let applied = thread
            .block_on(remote_submit(submit(envelope.clone())))
            .unwrap();
        assert_eq!(applied["status"], "applied");
        assert_eq!(applied["revision"], 1);
        assert_eq!(applied["document"]["title"], "Paired iPhone session");
        let duplicate = thread
            .block_on(remote_submit(submit(envelope.clone())))
            .unwrap();
        assert_eq!(duplicate["status"], "duplicate");
        assert_eq!(duplicate["revision"], 1);
        let snapshot_request = || RemoteSnapshotRequest {
            endpoint: endpoint.clone(),
            certificate_der: certificate_der.clone(),
            certificate_fingerprint: certificate_fingerprint.clone(),
            client_id: "integration-iphone".into(),
            capability: capability.clone(),
        };
        let snapshot = thread
            .block_on(remote_snapshot(snapshot_request()))
            .unwrap();
        assert_eq!(snapshot["revision"], 1);
        assert_eq!(snapshot["document"]["title"], "Paired iPhone session");
        *runtime.companion.lock().unwrap() = Some(CompanionSession {
            host: discovered_host,
            client_id: "integration-iphone".into(),
            capability: capability.clone(),
            expires_at: grant["expiresAt"].as_str().unwrap().into(),
            revision: 1,
            document: applied["document"].clone(),
            queue: VecDeque::new(),
            online: false,
            requires_repair: false,
        });
        queue_companion_operation(
            &runtime,
            CanvasOperation::SetTitle {
                title: "First queued while disconnected".into(),
            },
        )
        .unwrap();
        queue_companion_operation(
            &runtime,
            CanvasOperation::SetTitle {
                title: "Second queued while disconnected".into(),
            },
        )
        .unwrap();
        let queued = thread.block_on(flush_companion(&runtime)).unwrap();
        assert_eq!(queued["status"], "queued");
        assert_eq!(queued["queueDepth"], 1);
        assert_eq!(
            queued["document"]["title"],
            "Second queued while disconnected"
        );
        let stored_queue = crate::load_companion_state(&runtime.companion_state_path)
            .expect("offline queue should persist");
        assert_eq!(stored_queue.queue.len(), 1);
        assert!(
            matches!(stored_queue.queue[0].operation, CanvasOperation::SetTitle { ref title } if title == "Second queued while disconnected")
        );
        assert_eq!(runtime.host.lock().unwrap().revision, 1);
        let mut concurrent = envelope.clone();
        concurrent.operation_id = "operation-concurrent-host-change".into();
        concurrent.base_revision = 1;
        concurrent.operation = CanvasOperation::SetTitle {
            title: "Concurrent Mac change".into(),
        };
        let concurrent_result = thread.block_on(remote_submit(submit(concurrent))).unwrap();
        assert_eq!(concurrent_result["revision"], 2);
        runtime.companion.lock().unwrap().as_mut().unwrap().online = true;
        let (first_flush, second_flush) = thread
            .block_on(async { tokio::join!(flush_companion(&runtime), flush_companion(&runtime)) });
        let synced = first_flush.unwrap();
        let repeated = second_flush.unwrap();
        assert_eq!(synced["status"], "synced");
        assert_eq!(synced["queueDepth"], 0);
        assert_eq!(synced["revision"], 3);
        assert_eq!(
            synced["document"]["title"],
            "Second queued while disconnected"
        );
        assert_eq!(repeated["status"], "synced");
        assert_eq!(repeated["revision"], 3);
        assert_eq!(
            runtime
                .companion
                .lock()
                .unwrap()
                .as_ref()
                .unwrap()
                .queue
                .len(),
            0
        );
        assert_eq!(
            crate::load_companion_state(&runtime.companion_state_path)
                .unwrap()
                .queue
                .len(),
            0
        );
        revoke_client(&runtime, "integration-iphone".into()).unwrap();
        let mut after_revoke = envelope;
        after_revoke.operation_id = "operation-after-revoke".into();
        after_revoke.base_revision = 1;
        let rejected = thread
            .block_on(remote_submit(submit(after_revoke)))
            .unwrap();
        assert_eq!(rejected["status"], "rejected");
        assert_eq!(rejected["code"], "CLIENT_REVOKED");
        assert!(thread
            .block_on(remote_snapshot(snapshot_request()))
            .is_err());
        assert_eq!(runtime.host.lock().unwrap().revision, 3);
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            assert_eq!(
                fs::metadata(home.join(KEY_FILE))
                    .unwrap()
                    .permissions()
                    .mode()
                    & 0o777,
                0o600
            );
        }
    }
}
