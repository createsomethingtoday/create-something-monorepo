//! WorkWay Edge's deliberately narrow private-evidence intake boundary.
//!
//! This crate stores only explicitly submitted bytes for an already registered
//! evidence gate. It does not parse a document, create a review decision,
//! update the project graph, or make a construction-readiness claim.

use std::{
    collections::BTreeMap,
    env,
    fs::{self, OpenOptions},
    io::Write,
    net::{IpAddr, SocketAddr},
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
    time::{SystemTime, UNIX_EPOCH},
};

use axum::{
    body::Bytes,
    extract::{DefaultBodyLimit, Path as AxumPath, State},
    http::{header, HeaderMap, StatusCode},
    response::IntoResponse,
    routing::post,
    Json, Router,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use chacha20poly1305::{
    aead::{Aead, Generate, KeyInit, Payload},
    XChaCha20Poly1305, XNonce,
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use subtle::ConstantTimeEq;
use workway_core::{
    threshold_dwelling_evidence_manifest_v08, validate_private_evidence_manifest,
    EvidenceSourceClass,
};

/// Bump when the durable encrypted object format or receipt contract changes.
pub const WORKWAY_EDGE_VAULT_SCHEMA_VERSION: &str = "workway.edge-vault.v1";
const ENVELOPE_MAGIC: &[u8; 8] = b"WWEDGE01";
#[cfg(test)]
const XCHACHA_NONCE_BYTES: usize = 24;
const DEFAULT_MAX_PDF_BYTES: usize = 25 * 1024 * 1024;

/// Errors deliberately carry no file-system locations, credentials, document
/// labels, or document content.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum VaultError {
    InvalidConfiguration,
    InvalidCredentials,
    InvalidProjectId,
    UnknownEvidenceId,
    UnsupportedMediaType,
    InvalidPdfSignature,
    EmptyPayload,
    PayloadTooLarge,
    EvidenceAlreadyRecorded,
    AuthenticationFailed,
    InvalidEncryptedObject,
    NonLoopbackBinding,
    StorageUnavailable,
}

impl std::fmt::Display for VaultError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(self.code())
    }
}

impl std::error::Error for VaultError {}

impl VaultError {
    const fn code(&self) -> &'static str {
        match self {
            Self::InvalidConfiguration => "invalid-configuration",
            Self::InvalidCredentials => "invalid-credentials",
            Self::InvalidProjectId => "invalid-project-id",
            Self::UnknownEvidenceId => "unknown-evidence-id",
            Self::UnsupportedMediaType => "unsupported-media-type",
            Self::InvalidPdfSignature => "invalid-pdf-signature",
            Self::EmptyPayload => "empty-payload",
            Self::PayloadTooLarge => "payload-too-large",
            Self::EvidenceAlreadyRecorded => "evidence-already-recorded",
            Self::AuthenticationFailed => "authentication-failed",
            Self::InvalidEncryptedObject => "invalid-encrypted-object",
            Self::NonLoopbackBinding => "non-loopback-binding-not-supported",
            Self::StorageUnavailable => "storage-unavailable",
        }
    }
}

/// Secret-bearing local configuration. Keys and bearer tokens are intentionally
/// not printable and never written to the vault directory.
#[derive(Clone)]
pub struct VaultConfig {
    root: PathBuf,
    master_key: [u8; 32],
    bearer_token: Vec<u8>,
    max_pdf_bytes: usize,
}

impl VaultConfig {
    /// Reads secrets from the local process environment only.
    ///
    /// `WORKWAY_EDGE_VAULT_ROOT`, `WORKWAY_EDGE_MASTER_KEY_B64`, and
    /// `WORKWAY_EDGE_INTAKE_TOKEN` are required. The base64 key must decode to
    /// exactly 32 bytes; a new key is never generated implicitly.
    pub fn from_environment() -> Result<Self, VaultError> {
        let root = env::var_os("WORKWAY_EDGE_VAULT_ROOT")
            .map(PathBuf::from)
            .filter(|value| !value.as_os_str().is_empty())
            .ok_or(VaultError::InvalidConfiguration)?;
        let encoded_key = env::var("WORKWAY_EDGE_MASTER_KEY_B64")
            .map_err(|_| VaultError::InvalidConfiguration)?;
        let decoded_key = BASE64
            .decode(encoded_key)
            .map_err(|_| VaultError::InvalidConfiguration)?;
        let master_key: [u8; 32] = decoded_key
            .try_into()
            .map_err(|_| VaultError::InvalidConfiguration)?;
        let bearer_token = env::var("WORKWAY_EDGE_INTAKE_TOKEN")
            .map_err(|_| VaultError::InvalidConfiguration)?
            .into_bytes();
        if bearer_token.is_empty() {
            return Err(VaultError::InvalidConfiguration);
        }
        let max_pdf_bytes = env::var("WORKWAY_EDGE_MAX_PDF_BYTES")
            .ok()
            .map(|value| value.parse::<usize>())
            .transpose()
            .map_err(|_| VaultError::InvalidConfiguration)?
            .unwrap_or(DEFAULT_MAX_PDF_BYTES);
        if max_pdf_bytes == 0 {
            return Err(VaultError::InvalidConfiguration);
        }

        Ok(Self {
            root,
            master_key,
            bearer_token,
            max_pdf_bytes,
        })
    }

    #[cfg(test)]
    fn for_test(
        root: &Path,
        master_key: [u8; 32],
        bearer_token: &str,
        max_pdf_bytes: usize,
    ) -> Self {
        Self {
            root: root.into(),
            master_key,
            bearer_token: bearer_token.as_bytes().to_vec(),
            max_pdf_bytes,
        }
    }
}

/// Process configuration. This first implementation refuses every network
/// address except loopback; remote, LAN, pairing, and TLS are separate work.
pub struct EdgeRuntimeConfig {
    pub bind_addr: SocketAddr,
    pub vault: VaultConfig,
}

impl EdgeRuntimeConfig {
    pub fn from_environment() -> Result<Self, VaultError> {
        let bind_addr = env::var("WORKWAY_EDGE_BIND_ADDR")
            .unwrap_or_else(|_| "127.0.0.1:9443".into())
            .parse::<SocketAddr>()
            .map_err(|_| VaultError::InvalidConfiguration)?;
        Ok(Self {
            bind_addr: loopback_socket_addr(bind_addr)?,
            vault: VaultConfig::from_environment()?,
        })
    }
}

/// Reject wildcard, LAN, and public binds even if a caller supplied them.
pub fn loopback_socket_addr(address: SocketAddr) -> Result<SocketAddr, VaultError> {
    match address.ip() {
        IpAddr::V4(ip) if ip.is_loopback() => Ok(address),
        IpAddr::V6(ip) if ip.is_loopback() => Ok(address),
        _ => Err(VaultError::NonLoopbackBinding),
    }
}

/// A bounded evidence request. The HTTP adapter accepts only `application/pdf`
/// and maps it to `Pdf`; future document classes need an explicit review.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EvidenceIngestRequest {
    project_id: String,
    evidence_id: String,
    media_type: EvidenceMediaType,
    bytes: Vec<u8>,
}

impl EvidenceIngestRequest {
    #[must_use]
    pub fn pdf(
        project_id: impl Into<String>,
        evidence_id: impl Into<String>,
        bytes: Vec<u8>,
    ) -> Self {
        Self::new(project_id, evidence_id, EvidenceMediaType::Pdf, bytes)
    }

    #[must_use]
    pub fn new(
        project_id: impl Into<String>,
        evidence_id: impl Into<String>,
        media_type: EvidenceMediaType,
        bytes: Vec<u8>,
    ) -> Self {
        Self {
            project_id: project_id.into(),
            evidence_id: evidence_id.into(),
            media_type,
            bytes,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum EvidenceMediaType {
    Pdf,
    Unsupported(String),
}

impl EvidenceMediaType {
    fn from_http_header(value: Option<&str>) -> Self {
        match value.map(str::trim) {
            Some("application/pdf") => Self::Pdf,
            Some(other) => Self::Unsupported(other.into()),
            None => Self::Unsupported("missing".into()),
        }
    }
}

/// Source-free, non-authorizing acknowledgement of durable local storage.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EvidenceIngestReceipt {
    pub schema_version: String,
    pub project_id: String,
    pub evidence_id: String,
    pub source_class: EvidenceSourceClass,
    pub content_sha256: String,
    pub byte_length: usize,
    pub intake_status: String,
    construction_ready: bool,
}

impl EvidenceIngestReceipt {
    #[must_use]
    pub const fn construction_ready(&self) -> bool {
        self.construction_ready
    }
}

#[derive(Clone)]
pub struct Vault {
    inner: Arc<VaultInner>,
}

struct VaultInner {
    config: VaultConfig,
    project_id: String,
    canonical_revision: String,
    evidence: BTreeMap<String, EvidenceSourceClass>,
    write_guard: Mutex<()>,
}

/// Constructs the vault against the same registered evidence IDs that drive
/// the Threshold Dwelling intake packet. An arbitrary ID cannot create a new
/// storage location.
pub fn threshold_dwelling_vault(config: VaultConfig) -> Result<Vault, VaultError> {
    let manifest = threshold_dwelling_evidence_manifest_v08();
    if !validate_private_evidence_manifest(&manifest).is_valid() {
        return Err(VaultError::InvalidConfiguration);
    }
    let evidence = manifest
        .entries
        .into_iter()
        .map(|entry| (entry.opaque_id, entry.source_class))
        .collect();
    Vault::new(
        config,
        manifest.project_id,
        manifest.canonical_revision,
        evidence,
    )
}

impl Vault {
    fn new(
        config: VaultConfig,
        project_id: String,
        canonical_revision: String,
        evidence: BTreeMap<String, EvidenceSourceClass>,
    ) -> Result<Self, VaultError> {
        if evidence.is_empty() || config.max_pdf_bytes == 0 || config.bearer_token.is_empty() {
            return Err(VaultError::InvalidConfiguration);
        }
        initialize_private_directory(&config.root)?;
        initialize_private_directory(&config.root.join("objects"))?;
        Ok(Self {
            inner: Arc::new(VaultInner {
                config,
                project_id,
                canonical_revision,
                evidence,
                write_guard: Mutex::new(()),
            }),
        })
    }

    /// Records bytes once. This has no authority to mutate a manifest or mark
    /// evidence accepted; its receipt always remains non-construction-ready.
    pub fn ingest(
        &self,
        bearer_token: &str,
        request: EvidenceIngestRequest,
    ) -> Result<EvidenceIngestReceipt, VaultError> {
        if !bool::from(
            self.inner
                .config
                .bearer_token
                .as_slice()
                .ct_eq(bearer_token.as_bytes()),
        ) {
            return Err(VaultError::InvalidCredentials);
        }
        if request.project_id != self.inner.project_id {
            return Err(VaultError::InvalidProjectId);
        }
        let source_class = *self
            .inner
            .evidence
            .get(&request.evidence_id)
            .ok_or(VaultError::UnknownEvidenceId)?;
        if request.media_type != EvidenceMediaType::Pdf {
            return Err(VaultError::UnsupportedMediaType);
        }
        if request.bytes.is_empty() {
            return Err(VaultError::EmptyPayload);
        }
        if request.bytes.len() > self.inner.config.max_pdf_bytes {
            return Err(VaultError::PayloadTooLarge);
        }
        if !request.bytes.starts_with(b"%PDF-") {
            return Err(VaultError::InvalidPdfSignature);
        }

        let receipt = EvidenceIngestReceipt {
            schema_version: WORKWAY_EDGE_VAULT_SCHEMA_VERSION.into(),
            project_id: request.project_id,
            evidence_id: request.evidence_id,
            source_class,
            content_sha256: sha256_hex(&request.bytes),
            byte_length: request.bytes.len(),
            intake_status: "recorded".into(),
            construction_ready: false,
        };
        self.record_encrypted(&receipt, &request.bytes)?;
        Ok(receipt)
    }

    fn record_encrypted(
        &self,
        receipt: &EvidenceIngestReceipt,
        document: &[u8],
    ) -> Result<(), VaultError> {
        let _guard = self
            .inner
            .write_guard
            .lock()
            .map_err(|_| VaultError::StorageUnavailable)?;
        let object_path = self.object_path(&receipt.project_id, &receipt.evidence_id);
        if object_path.exists() {
            return Err(VaultError::EvidenceAlreadyRecorded);
        }
        let encrypted = self.encrypt(receipt, document)?;
        let pending_path = self.pending_object_path(&encrypted);
        write_private_file(&pending_path, &encrypted)?;
        if fs::rename(&pending_path, &object_path).is_err() {
            let _ = fs::remove_file(&pending_path);
            return Err(VaultError::StorageUnavailable);
        }
        if let Err(error) = append_audit_record(&self.inner.config.root, receipt) {
            let _ = fs::remove_file(&object_path);
            return Err(error);
        }
        Ok(())
    }

    fn encrypt(
        &self,
        receipt: &EvidenceIngestReceipt,
        document: &[u8],
    ) -> Result<Vec<u8>, VaultError> {
        let cipher = XChaCha20Poly1305::new_from_slice(&self.inner.config.master_key)
            .map_err(|_| VaultError::InvalidConfiguration)?;
        let nonce = XNonce::generate();
        let ciphertext = cipher
            .encrypt(
                &nonce,
                Payload {
                    msg: document,
                    aad: &self.additional_data(receipt),
                },
            )
            .map_err(|_| VaultError::AuthenticationFailed)?;
        let mut encrypted =
            Vec::with_capacity(ENVELOPE_MAGIC.len() + nonce.len() + ciphertext.len());
        encrypted.extend_from_slice(ENVELOPE_MAGIC);
        encrypted.extend_from_slice(&nonce);
        encrypted.extend_from_slice(&ciphertext);
        Ok(encrypted)
    }

    #[cfg(test)]
    fn decrypt(
        &self,
        project_id: &str,
        evidence_id: &str,
        encrypted: &[u8],
    ) -> Result<Vec<u8>, VaultError> {
        let source_class = *self
            .inner
            .evidence
            .get(evidence_id)
            .ok_or(VaultError::UnknownEvidenceId)?;
        let minimum_length = ENVELOPE_MAGIC.len() + XCHACHA_NONCE_BYTES + 16;
        if encrypted.len() < minimum_length || !encrypted.starts_with(ENVELOPE_MAGIC) {
            return Err(VaultError::InvalidEncryptedObject);
        }
        let nonce_start = ENVELOPE_MAGIC.len();
        let nonce_end = nonce_start + XCHACHA_NONCE_BYTES;
        let nonce = XNonce::try_from(&encrypted[nonce_start..nonce_end])
            .map_err(|_| VaultError::InvalidEncryptedObject)?;
        let receipt = EvidenceIngestReceipt {
            schema_version: WORKWAY_EDGE_VAULT_SCHEMA_VERSION.into(),
            project_id: project_id.into(),
            evidence_id: evidence_id.into(),
            source_class,
            content_sha256: String::new(),
            byte_length: 0,
            intake_status: "recorded".into(),
            construction_ready: false,
        };
        let cipher = XChaCha20Poly1305::new_from_slice(&self.inner.config.master_key)
            .map_err(|_| VaultError::InvalidConfiguration)?;
        cipher
            .decrypt(
                &nonce,
                Payload {
                    msg: &encrypted[nonce_end..],
                    aad: &self.additional_data(&receipt),
                },
            )
            .map_err(|_| VaultError::AuthenticationFailed)
    }

    fn additional_data(&self, receipt: &EvidenceIngestReceipt) -> Vec<u8> {
        format!(
            "{}\u{0}{}\u{0}{}\u{0}{}\u{0}{:?}",
            WORKWAY_EDGE_VAULT_SCHEMA_VERSION,
            self.inner.canonical_revision,
            receipt.project_id,
            receipt.evidence_id,
            receipt.source_class
        )
        .into_bytes()
    }

    fn object_path(&self, project_id: &str, evidence_id: &str) -> PathBuf {
        self.inner.config.root.join("objects").join(format!(
            "{}.wwe",
            sha256_hex(format!("{project_id}\u{0}{evidence_id}"))
        ))
    }

    fn pending_object_path(&self, encrypted: &[u8]) -> PathBuf {
        self.inner
            .config
            .root
            .join("objects")
            .join(format!(".{}.pending", sha256_hex(encrypted)))
    }

    #[cfg(test)]
    fn encrypted_object_for_test(
        &self,
        project_id: &str,
        evidence_id: &str,
    ) -> Result<Vec<u8>, VaultError> {
        fs::read(self.object_path(project_id, evidence_id))
            .map_err(|_| VaultError::StorageUnavailable)
    }

    #[cfg(test)]
    fn decrypt_for_test(
        &self,
        project_id: &str,
        evidence_id: &str,
        encrypted: &[u8],
    ) -> Result<Vec<u8>, VaultError> {
        self.decrypt(project_id, evidence_id, encrypted)
    }
}

/// The only HTTP interface in this first slice. It accepts no filename,
/// document URL, source path, project mutation, review operation, or retrieval.
pub fn vault_router(vault: Vault) -> Router {
    let max_pdf_bytes = vault.inner.config.max_pdf_bytes;
    Router::new()
        .route(
            "/v1/projects/{project_id}/evidence/{evidence_id}",
            post(record_evidence),
        )
        .layer(DefaultBodyLimit::max(max_pdf_bytes))
        .with_state(Arc::new(vault))
}

#[derive(Debug, Deserialize)]
struct IntakePath {
    project_id: String,
    evidence_id: String,
}

async fn record_evidence(
    State(vault): State<Arc<Vault>>,
    AxumPath(path): AxumPath<IntakePath>,
    headers: HeaderMap,
    body: Bytes,
) -> impl IntoResponse {
    let bearer_token = headers
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "));
    let Some(bearer_token) = bearer_token else {
        return vault_error_response(VaultError::InvalidCredentials);
    };
    let media_type = EvidenceMediaType::from_http_header(
        headers
            .get(header::CONTENT_TYPE)
            .and_then(|value| value.to_str().ok()),
    );
    match vault.ingest(
        bearer_token,
        EvidenceIngestRequest::new(path.project_id, path.evidence_id, media_type, body.to_vec()),
    ) {
        Ok(receipt) => (StatusCode::CREATED, Json(receipt)).into_response(),
        Err(error) => vault_error_response(error),
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SafeErrorResponse {
    error: &'static str,
    construction_ready: bool,
}

fn vault_error_response(error: VaultError) -> axum::response::Response {
    let status = match error {
        VaultError::InvalidCredentials => StatusCode::UNAUTHORIZED,
        VaultError::InvalidProjectId | VaultError::UnknownEvidenceId => StatusCode::NOT_FOUND,
        VaultError::UnsupportedMediaType => StatusCode::UNSUPPORTED_MEDIA_TYPE,
        VaultError::EmptyPayload | VaultError::InvalidPdfSignature => StatusCode::BAD_REQUEST,
        VaultError::PayloadTooLarge => StatusCode::PAYLOAD_TOO_LARGE,
        VaultError::EvidenceAlreadyRecorded => StatusCode::CONFLICT,
        VaultError::InvalidConfiguration
        | VaultError::AuthenticationFailed
        | VaultError::InvalidEncryptedObject
        | VaultError::NonLoopbackBinding
        | VaultError::StorageUnavailable => StatusCode::INTERNAL_SERVER_ERROR,
    };
    (
        status,
        Json(SafeErrorResponse {
            error: error.code(),
            construction_ready: false,
        }),
    )
        .into_response()
}

fn sha256_hex(input: impl AsRef<[u8]>) -> String {
    hex::encode(Sha256::digest(input.as_ref()))
}

fn initialize_private_directory(path: &Path) -> Result<(), VaultError> {
    fs::create_dir_all(path).map_err(|_| VaultError::StorageUnavailable)?;
    set_private_directory_permissions(path)
}

fn write_private_file(path: &Path, bytes: &[u8]) -> Result<(), VaultError> {
    let mut file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(path)
        .map_err(|_| VaultError::StorageUnavailable)?;
    file.write_all(bytes)
        .and_then(|_| file.sync_all())
        .map_err(|_| VaultError::StorageUnavailable)?;
    set_private_file_permissions(path)
}

fn append_audit_record(root: &Path, receipt: &EvidenceIngestReceipt) -> Result<(), VaultError> {
    let record = AuditRecord {
        schema_version: WORKWAY_EDGE_VAULT_SCHEMA_VERSION,
        event: "evidence-recorded",
        project_id: &receipt.project_id,
        evidence_id: &receipt.evidence_id,
        content_sha256: &receipt.content_sha256,
        byte_length: receipt.byte_length,
        recorded_at_unix_ms: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|_| VaultError::StorageUnavailable)?
            .as_millis()
            .try_into()
            .map_err(|_| VaultError::StorageUnavailable)?,
    };
    let serialized = serde_json::to_vec(&record).map_err(|_| VaultError::StorageUnavailable)?;
    let path = root.join("audit.jsonl");
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|_| VaultError::StorageUnavailable)?;
    file.write_all(&serialized)
        .and_then(|_| file.write_all(b"\n"))
        .and_then(|_| file.sync_all())
        .map_err(|_| VaultError::StorageUnavailable)?;
    set_private_file_permissions(&path)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AuditRecord<'a> {
    schema_version: &'a str,
    event: &'a str,
    project_id: &'a str,
    evidence_id: &'a str,
    content_sha256: &'a str,
    byte_length: usize,
    recorded_at_unix_ms: u64,
}

#[cfg(unix)]
fn set_private_directory_permissions(path: &Path) -> Result<(), VaultError> {
    use std::os::unix::fs::PermissionsExt;

    fs::set_permissions(path, fs::Permissions::from_mode(0o700))
        .map_err(|_| VaultError::StorageUnavailable)
}

#[cfg(not(unix))]
fn set_private_directory_permissions(_path: &Path) -> Result<(), VaultError> {
    Ok(())
}

#[cfg(unix)]
fn set_private_file_permissions(path: &Path) -> Result<(), VaultError> {
    use std::os::unix::fs::PermissionsExt;

    fs::set_permissions(path, fs::Permissions::from_mode(0o600))
        .map_err(|_| VaultError::StorageUnavailable)
}

#[cfg(not(unix))]
fn set_private_file_permissions(_path: &Path) -> Result<(), VaultError> {
    Ok(())
}

#[cfg(test)]
mod tests {
    use std::{fs, net::SocketAddr};

    use axum::{
        body::Body,
        http::{header, Request, StatusCode},
    };
    use tower::ServiceExt;

    use super::{
        loopback_socket_addr, threshold_dwelling_vault, vault_router, EvidenceIngestRequest,
        EvidenceMediaType, VaultConfig, VaultError,
    };

    fn test_config(root: &std::path::Path) -> VaultConfig {
        VaultConfig::for_test(root, [7; 32], "test-intake-token", 1_024)
    }

    fn synthetic_pdf() -> Vec<u8> {
        b"%PDF-1.7\n% WorkWay synthetic fixture only; not a project document.\n".to_vec()
    }

    #[test]
    fn encrypts_a_registered_synthetic_pdf_and_never_leaks_its_plaintext_to_receipt_or_audit() {
        let temp = tempfile::tempdir().expect("temporary vault root");
        let vault = threshold_dwelling_vault(test_config(temp.path())).expect("valid vault");
        let document = synthetic_pdf();

        let receipt = vault
            .ingest(
                "test-intake-token",
                EvidenceIngestRequest::pdf("threshold-dwelling", "evr_glazing", document.clone()),
            )
            .expect("synthetic document is recorded");

        assert_eq!(receipt.project_id, "threshold-dwelling");
        assert_eq!(receipt.evidence_id, "evr_glazing");
        assert_eq!(receipt.byte_length, document.len());
        assert!(!receipt.construction_ready());

        let encrypted = vault
            .encrypted_object_for_test("threshold-dwelling", "evr_glazing")
            .expect("encrypted object is present");
        assert!(!encrypted
            .windows(document.len())
            .any(|window| window == document));
        assert_eq!(
            vault
                .decrypt_for_test("threshold-dwelling", "evr_glazing", &encrypted)
                .expect("matching context decrypts"),
            document
        );

        let receipt_json = serde_json::to_string(&receipt).expect("receipt serializes");
        let audit = fs::read_to_string(temp.path().join("audit.jsonl")).expect("audit is present");
        let audit_record: serde_json::Value = serde_json::from_str(&audit).expect("audit is json");
        assert!(
            audit_record
                .get("recordedAtUnixMs")
                .and_then(serde_json::Value::as_u64)
                .is_some(),
            "audit must have a durable event time"
        );
        for forbidden in ["synthetic fixture", "%PDF", "vault_", "/", "\\"] {
            assert!(
                !receipt_json.contains(forbidden),
                "receipt leaked {forbidden}"
            );
            assert!(!audit.contains(forbidden), "audit leaked {forbidden}");
        }

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;

            for private_file in [
                temp.path().join("audit.jsonl"),
                vault.object_path("threshold-dwelling", "evr_glazing"),
            ] {
                assert_eq!(
                    fs::metadata(private_file)
                        .expect("private file metadata")
                        .permissions()
                        .mode()
                        & 0o777,
                    0o600
                );
            }
            for private_directory in [temp.path().to_path_buf(), temp.path().join("objects")] {
                assert_eq!(
                    fs::metadata(private_directory)
                        .expect("private directory metadata")
                        .permissions()
                        .mode()
                        & 0o777,
                    0o700
                );
            }
        }
    }

    #[test]
    fn wrong_key_or_tampered_ciphertext_cannot_decrypt_an_object() {
        let temp = tempfile::tempdir().expect("temporary vault root");
        let vault = threshold_dwelling_vault(test_config(temp.path())).expect("valid vault");
        vault
            .ingest(
                "test-intake-token",
                EvidenceIngestRequest::pdf("threshold-dwelling", "evr_structure", synthetic_pdf()),
            )
            .expect("synthetic document is recorded");
        let encrypted = vault
            .encrypted_object_for_test("threshold-dwelling", "evr_structure")
            .expect("encrypted object");

        let other_root = tempfile::tempdir().expect("temporary other vault root");
        let wrong_key_vault = threshold_dwelling_vault(VaultConfig::for_test(
            other_root.path(),
            [8; 32],
            "test-intake-token",
            1_024,
        ))
        .expect("valid independent vault");
        assert_eq!(
            wrong_key_vault
                .decrypt_for_test("threshold-dwelling", "evr_structure", &encrypted)
                .expect_err("wrong key must fail"),
            VaultError::AuthenticationFailed
        );

        let mut tampered = encrypted;
        let final_index = tampered.len() - 1;
        tampered[final_index] ^= 1;
        assert_eq!(
            vault
                .decrypt_for_test("threshold-dwelling", "evr_structure", &tampered)
                .expect_err("tampering must fail"),
            VaultError::AuthenticationFailed
        );
    }

    #[test]
    fn rejects_invalid_credentials_unknown_or_duplicate_evidence_and_oversized_or_wrong_type_payloads(
    ) {
        let temp = tempfile::tempdir().expect("temporary vault root");
        let vault = threshold_dwelling_vault(test_config(temp.path())).expect("valid vault");
        let request =
            EvidenceIngestRequest::pdf("threshold-dwelling", "evr_openings", synthetic_pdf());

        assert_eq!(
            vault
                .ingest("wrong-token", request.clone())
                .expect_err("auth fails"),
            VaultError::InvalidCredentials
        );
        assert_eq!(
            vault
                .ingest(
                    "test-intake-token",
                    EvidenceIngestRequest::pdf(
                        "threshold-dwelling",
                        "evr_not_registered",
                        synthetic_pdf()
                    ),
                )
                .expect_err("unknown evidence fails"),
            VaultError::UnknownEvidenceId
        );
        assert_eq!(
            vault
                .ingest(
                    "test-intake-token",
                    EvidenceIngestRequest::new(
                        "threshold-dwelling",
                        "evr_openings",
                        EvidenceMediaType::Unsupported("text/plain".into()),
                        synthetic_pdf(),
                    ),
                )
                .expect_err("wrong media type fails"),
            VaultError::UnsupportedMediaType
        );
        assert_eq!(
            vault
                .ingest(
                    "test-intake-token",
                    EvidenceIngestRequest::pdf(
                        "threshold-dwelling",
                        "evr_openings",
                        b"not a PDF fixture".to_vec(),
                    ),
                )
                .expect_err("non-PDF bytes fail"),
            VaultError::InvalidPdfSignature
        );
        assert_eq!(
            vault
                .ingest(
                    "test-intake-token",
                    EvidenceIngestRequest::pdf(
                        "threshold-dwelling",
                        "evr_openings",
                        vec![1; 1_025]
                    ),
                )
                .expect_err("oversized document fails"),
            VaultError::PayloadTooLarge
        );

        vault
            .ingest("test-intake-token", request)
            .expect("first intake succeeds");
        assert_eq!(
            vault
                .ingest(
                    "test-intake-token",
                    EvidenceIngestRequest::pdf(
                        "threshold-dwelling",
                        "evr_openings",
                        synthetic_pdf()
                    ),
                )
                .expect_err("duplicate evidence fails"),
            VaultError::EvidenceAlreadyRecorded
        );
    }

    #[tokio::test]
    async fn http_intake_requires_bearer_auth_and_returns_only_a_source_free_receipt() {
        let temp = tempfile::tempdir().expect("temporary vault root");
        let vault = threshold_dwelling_vault(test_config(temp.path())).expect("valid vault");
        let app = vault_router(vault);
        let path = "/v1/projects/threshold-dwelling/evidence/evr_site_datum";

        let unauthorized = app
            .clone()
            .oneshot(
                Request::post(path)
                    .header(header::CONTENT_TYPE, "application/pdf")
                    .body(Body::from(synthetic_pdf()))
                    .expect("valid request"),
            )
            .await
            .expect("router responds");
        assert_eq!(unauthorized.status(), StatusCode::UNAUTHORIZED);

        let accepted = app
            .oneshot(
                Request::post(path)
                    .header(header::AUTHORIZATION, "Bearer test-intake-token")
                    .header(header::CONTENT_TYPE, "application/pdf")
                    .body(Body::from(synthetic_pdf()))
                    .expect("valid request"),
            )
            .await
            .expect("router responds");
        assert_eq!(accepted.status(), StatusCode::CREATED);
        let body = axum::body::to_bytes(accepted.into_body(), 1_024)
            .await
            .expect("response body");
        let receipt = String::from_utf8(body.to_vec()).expect("utf8 json");
        assert!(receipt.contains("evr_site_datum"));
        assert!(!receipt.contains("synthetic fixture"));
        assert!(!receipt.contains("vault_"));

        let oversized_vault =
            threshold_dwelling_vault(test_config(temp.path().join("oversized").as_path()))
                .expect("separate valid vault");
        let oversized = vault_router(oversized_vault)
            .oneshot(
                Request::post("/v1/projects/threshold-dwelling/evidence/evr_mep")
                    .header(header::AUTHORIZATION, "Bearer test-intake-token")
                    .header(header::CONTENT_TYPE, "application/pdf")
                    .body(Body::from(vec![1; 1_025]))
                    .expect("valid request"),
            )
            .await
            .expect("router responds");
        assert_eq!(oversized.status(), StatusCode::PAYLOAD_TOO_LARGE);
    }

    #[test]
    fn runtime_binding_rejects_every_non_loopback_socket() {
        assert!(
            loopback_socket_addr("127.0.0.1:9443".parse::<SocketAddr>().expect("loopback")).is_ok()
        );
        assert!(
            loopback_socket_addr("[::1]:9443".parse::<SocketAddr>().expect("loopback")).is_ok()
        );
        assert_eq!(
            loopback_socket_addr("0.0.0.0:9443".parse::<SocketAddr>().expect("wildcard"))
                .expect_err("wildcard bind must fail"),
            VaultError::NonLoopbackBinding
        );
    }
}
