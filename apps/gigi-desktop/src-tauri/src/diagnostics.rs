//! Opt-in local incident capture. Provider/user payloads never enter the log.
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::os::unix::fs::{OpenOptionsExt, PermissionsExt};
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;

const MAX_EVENTS: usize = 200;
const MAX_BYTES: u64 = 131_072;
const RETENTION: u64 = 7 * 24 * 60 * 60 * 1000;
const CAPTURE_DURATION: u64 = 60 * 60 * 1000;
const STORAGE_ERROR: &str = "Local diagnostic storage unavailable. Delete the capture before trying again.";

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Build {
    version: String,
    source_sha: String,
    source_dirty: bool,
    platform: String,
    architecture: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Event {
    timestamp: u64,
    correlation_id: String,
    provider: String,
    stage: String,
    outcome: String,
    code: String,
    retry: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    state: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    previous_state: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Report { schema_version: u8, build: Build, events: Vec<Event> }

#[derive(Default)]
struct Session { expires_at: Option<u64>, review: Option<(String, Report)> }

fn sessions() -> &'static Mutex<HashMap<PathBuf, Session>> {
    static SESSIONS: OnceLock<Mutex<HashMap<PathBuf, Session>>> = OnceLock::new();
    SESSIONS.get_or_init(|| Mutex::new(HashMap::new()))
}
fn now() -> u64 { SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis() as u64 }
fn build() -> Build {
    Build { version: env!("CARGO_PKG_VERSION").into(), source_sha: option_env!("GIGI_BUILD_SOURCE_SHA").unwrap_or("unknown").into(),
        source_dirty: option_env!("GIGI_BUILD_SOURCE_DIRTY") != Some("false"), platform: std::env::consts::OS.into(), architecture: std::env::consts::ARCH.into() }
}
fn empty() -> Report { Report { schema_version: 1, build: build(), events: vec![] } }
fn stage(operation: &str) -> Option<&'static str> {
    match operation { "auth.login" => Some("sign_in"), "connections.status" => Some("status"),
        "connections.begin" => Some("consent_begin"), "connections.openConsent" => Some("consent_open"),
        "connections.reconcile" => Some("verify"), "connections.import" => Some("import"), _ => None }
}
fn valid_state(value: &str) -> bool { matches!(value, "connected" | "disconnected" | "pending" | "attention" | "unavailable" | "unconfigured" | "checking") }
fn safe_code(value: &str) -> &'static str {
    match value {
        "journal_unavailable" => "journal_unavailable", "link_outcome_unknown" => "link_outcome_unknown",
        "connection_changed" => "connection_changed", "connection_not_found" => "connection_not_found",
        "started" => "started", "ok" => "ok", "partial_failure" => "partial_failure",
        "access_denied" => "access_denied", "session_expired" => "session_expired", "reauthentication_required" => "reauthentication_required",
        "unauthorized" => "unauthorized", "provider_unavailable" => "provider_unavailable", "unavailable" => "unavailable",
        "unconfigured" => "unconfigured", "refresh_in_progress" => "refresh_in_progress", "refresh_outcome_unknown" => "refresh_outcome_unknown",
        "provider_readback_invalid" => "provider_readback_invalid", "invalid_readback" => "invalid_readback",
        "operator_review" => "operator_review", "reconnect_required" => "reconnect_required", "source_unavailable" => "source_unavailable",
        "invalid_configuration" => "invalid_configuration", "cancelled" => "cancelled", "Browser could not open" | "browser_unavailable" => "browser_unavailable", "loopback_unavailable" => "loopback_unavailable",
        "identity_contract_mismatch" => "identity_contract_mismatch", "identity_mismatch" => "identity_mismatch", "invalid_token_readback" => "invalid_token_readback",
        "redirect_registration_mismatch" => "redirect_registration_mismatch", "invalid_data_directory" => "invalid_data_directory",
        "unsafe_data_directory" => "unsafe_data_directory", "unsafe_session_file" => "unsafe_session_file",
        "invalid_request" => "invalid_request", "invalid_cursor" => "invalid_cursor", "not_found" => "not_found",
        "consent_pending" => "consent_pending", "Integration timed out. Reconcile connection status before retrying." | "timeout" => "timeout",
        "Integration companion unavailable. Reinstall the complete GiGi app." | "companion_unavailable" => "companion_unavailable",
        "Source account readback mismatch" | "source_account_mismatch" => "source_account_mismatch",
        "Invalid source record or provenance" | "invalid_source_record" => "invalid_source_record",
        _ => "unknown_error",
    }
}
fn valid_report(report: &Report, time: u64) -> bool {
    let b = &report.build;
    report.schema_version == 1 && report.events.len() <= MAX_EVENTS
        && b.version.len() <= 30 && b.version.split('.').count() == 3 && b.version.split('.').all(|part| !part.is_empty() && part.bytes().all(|c| c.is_ascii_digit()))
        && (b.source_sha == "unknown" || b.source_sha.len() == 40 && b.source_sha.bytes().all(|c| c.is_ascii_hexdigit()))
        && matches!(b.platform.as_str(), "macos" | "linux" | "windows") && matches!(b.architecture.as_str(), "aarch64" | "x86_64")
        && report.events.iter().all(|e| e.timestamp <= time && Uuid::parse_str(&e.correlation_id).is_ok()
            && matches!(e.provider.as_str(), "gmail" | "googlecalendar" | "gigi")
            && matches!(e.stage.as_str(), "sign_in" | "status" | "consent_begin" | "consent_open" | "verify" | "import")
            && matches!(e.outcome.as_str(), "started" | "succeeded" | "failed" | "partial")
            && safe_code(&e.code) == e.code && e.state.as_deref().is_none_or(valid_state) && e.previous_state.as_deref().is_none_or(valid_state))
}

fn directory(root: &Path) -> Result<PathBuf, String> {
    let dir = root.join("diagnostics");
    match fs::symlink_metadata(&dir) {
        Ok(meta) if !meta.is_dir() || meta.file_type().is_symlink() => return Err(STORAGE_ERROR.into()),
        Ok(_) => {},
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => { fs::create_dir_all(&dir).map_err(|_| STORAGE_ERROR)?; },
        Err(_) => return Err(STORAGE_ERROR.into()),
    }
    fs::set_permissions(&dir, fs::Permissions::from_mode(0o700)).map_err(|_| STORAGE_ERROR)?;
    Ok(dir)
}
fn read_report(dir: &Path, time: u64) -> Result<Report, String> {
    let path = dir.join("capture.json");
    let meta = match fs::symlink_metadata(&path) {
        Ok(meta) => meta,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(empty()),
        Err(_) => return Err(STORAGE_ERROR.into()),
    };
    if !meta.is_file() || meta.file_type().is_symlink() || meta.len() > MAX_BYTES { return Err(STORAGE_ERROR.into()); }
    let file = OpenOptions::new().read(true).custom_flags(libc::O_NOFOLLOW).open(&path).map_err(|_| STORAGE_ERROR)?;
    let report: Report = serde_json::from_reader(std::io::Read::take(file, MAX_BYTES + 1)).map_err(|_| STORAGE_ERROR)?;
    if !valid_report(&report, time) { return Err(STORAGE_ERROR.into()); }
    Ok(report)
}
fn write_private(dir: &Path, filename: &str, bytes: &[u8]) -> Result<PathBuf, String> {
    if bytes.len() as u64 > MAX_BYTES { return Err(STORAGE_ERROR.into()); }
    let path = dir.join(filename);
    if fs::symlink_metadata(&path).is_ok_and(|m| !m.is_file() || m.file_type().is_symlink()) { return Err(STORAGE_ERROR.into()); }
    // Fixed owned temporary names bound disk use even across interrupted writes.
    let temporary = dir.join(format!("{filename}.tmp"));
    let mut created = false;
    let result = (|| {
        let mut file = OpenOptions::new().write(true).create_new(true).mode(0o600).custom_flags(libc::O_NOFOLLOW).open(&temporary).map_err(|_| STORAGE_ERROR)?;
        created = true;
        file.write_all(bytes).and_then(|_| file.sync_all()).map_err(|_| STORAGE_ERROR)?;
        fs::rename(&temporary, &path).map_err(|_| STORAGE_ERROR)?;
        Ok(path)
    })();
    if created { let _ = fs::remove_file(temporary); }
    result
}
fn save(dir: &Path, report: &Report) -> Result<(), String> {
    let bytes = serde_json::to_vec(report).map_err(|_| STORAGE_ERROR)?;
    write_private(dir, "capture.json", &bytes).map(|_| ())
}
fn remove_file(dir: &Path, filename: &str) -> Result<(), String> {
    match fs::remove_file(dir.join(filename)) { Ok(()) => Ok(()), Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()), Err(_) => Err(STORAGE_ERROR.into()) }
}
fn prune(dir: &Path, report: &mut Report, session: &mut Session, time: u64) -> Result<(), String> {
    if session.expires_at.is_some_and(|expires| expires <= time) { session.expires_at = None; session.review = None; }
    let before = report.events.len();
    report.events.retain(|event| time.saturating_sub(event.timestamp) < RETENTION);
    if before != report.events.len() {
        session.review = None;
        save(dir, report)?;
        remove_file(dir, "gigi-diagnostics.json")?;
    }
    let export = dir.join("gigi-diagnostics.json");
    if let Ok(meta) = fs::symlink_metadata(export) {
        if meta.modified().ok().and_then(|t| t.duration_since(UNIX_EPOCH).ok()).is_some_and(|t| time.saturating_sub(t.as_millis() as u64) >= RETENTION) {
            remove_file(dir, "gigi-diagnostics.json")?;
        }
    }
    Ok(())
}
fn status(report: &Report, session: &Session, dir: &Path) -> Value {
    json!({"enabled":session.expires_at.is_some(),"eventCount":report.events.len(),"maxEvents":MAX_EVENTS,"retentionDays":7,"expiresAt":session.expires_at,"build":build(),"exportExists":fs::symlink_metadata(dir.join("gigi-diagnostics.json")).is_ok()})
}

pub fn dispatch(root: &Path, operation: &str, input: Value) -> Result<Value, String> {
    let mut all = sessions().lock().map_err(|_| STORAGE_ERROR)?;
    let session = all.entry(root.to_path_buf()).or_default();
    // Stop remains authoritative even when retained storage is corrupt/unavailable.
    if matches!(operation, "diagnostics.stop" | "diagnostics.delete") { session.expires_at = None; session.review = None; }
    let dir = directory(root)?;
    if operation == "diagnostics.delete" {
        session.expires_at = None; session.review = None;
        remove_file(&dir, "capture.json")?; remove_file(&dir, "gigi-diagnostics.json")?;
        remove_file(&dir, "capture.json.tmp")?; remove_file(&dir, "gigi-diagnostics.json.tmp")?;
        return Ok(status(&empty(), session, &dir));
    }
    let time = now();
    let mut report = read_report(&dir, time)?;
    prune(&dir, &mut report, session, time)?;
    match operation {
        "diagnostics.status" => Ok(status(&report, session, &dir)),
        "diagnostics.start" => {
            if session.expires_at.is_none() {
                if !report.events.is_empty() { return Err("Review or delete the previous diagnostic capture first".into()); }
                report = empty(); save(&dir, &report)?; remove_file(&dir, "gigi-diagnostics.json")?;
                session.expires_at = Some(time + CAPTURE_DURATION); session.review = None;
            }
            Ok(status(&report, session, &dir))
        },
        "diagnostics.stop" => { session.expires_at = None; session.review = None; Ok(status(&report, session, &dir)) },
        "diagnostics.review" => {
            let mut output = status(&report, session, &dir);
            let token = if session.expires_at.is_none() { Some(Uuid::new_v4().to_string()) } else { None };
            session.review = token.clone().map(|token| (token, report.clone()));
            output["reviewToken"] = json!(token); output["events"] = json!(report.events);
            output["content"] = json!(serde_json::to_string_pretty(&report).map_err(|_| STORAGE_ERROR)?);
            output["report"] = json!(report); Ok(output)
        },
        "diagnostics.export" => {
            if session.expires_at.is_some() { return Err("Stop diagnostic capture before reviewing and exporting".into()); }
            let (token, reviewed) = session.review.as_ref().ok_or("Review this diagnostic capture before exporting")?;
            if input.get("reviewToken").and_then(Value::as_str) != Some(token.as_str()) || reviewed != &report {
                return Err("Diagnostic capture changed. Review it again before exporting".into());
            }
            let content = serde_json::to_string_pretty(&report).map_err(|_| STORAGE_ERROR)?;
            let path = write_private(&dir, "gigi-diagnostics.json", content.as_bytes())?;
            Ok(json!({"filename":"gigi-diagnostics.json","content":content,"path":path}))
        },
        _ => Err("Unsupported diagnostic operation".into()),
    }
}

fn begin(root: &Path, operation: &str, input: &Value) -> Option<Event> {
    let stage = stage(operation)?;
    let mut all = sessions().lock().ok()?;
    let session = all.get_mut(root)?;
    let time = now();
    if session.expires_at.is_none_or(|expires| expires <= time) { session.expires_at = None; return None; }
    let dir = directory(root).ok()?;
    let mut report = read_report(&dir, time).ok()?;
    prune(&dir, &mut report, session, time).ok()?;
    let provider = match input.get("provider").and_then(Value::as_str) { Some("gmail") => "gmail", Some("googlecalendar") => "googlecalendar", _ => "gigi" };
    let event = Event { timestamp: time, correlation_id: Uuid::new_v4().to_string(), provider: provider.into(), stage: stage.into(),
        outcome: "started".into(), code: "started".into(), retry: report.events.iter().any(|e| e.provider == provider && e.stage == stage && e.outcome == "started"),
        state: None, previous_state: report.events.iter().rev().find(|e| e.provider == provider && e.state.is_some()).and_then(|e| e.state.clone()) };
    report.events.push(event.clone());
    if report.events.len() > MAX_EVENTS { report.events.remove(0); }
    session.review = None;
    save(&dir, &report).ok()?;
    Some(event)
}
fn finish(root: &Path, mut event: Event, result: &Result<Value, String>) {
    let Ok(mut all) = sessions().lock() else { return; };
    let Some(session) = all.get_mut(root) else { return; };
    let time = now();
    if session.expires_at.is_none_or(|expires| expires <= time) { session.expires_at = None; return; }
    let Ok(dir) = directory(root) else { return; };
    let Ok(mut report) = read_report(&dir, time) else { return; };
    // A stopped/deleted/new capture must never receive an old in-flight operation.
    if !report.events.iter().any(|e| e.correlation_id == event.correlation_id) { return; }
    event.timestamp = time;
    match result {
        Err(error) => { event.outcome = "failed".into(); event.code = safe_code(error).into(); },
        Ok(value) => {
            event.state = value.get("state").and_then(Value::as_str).filter(|s| valid_state(s)).map(str::to_string)
                .or_else(|| if event.stage == "consent_begin" && matches!(value.get("status").and_then(Value::as_str), Some("awaiting_consent" | "readback_required")) { Some("pending".into()) } else { None });
            let partial = value.get("failedCount").and_then(Value::as_u64).is_some_and(|n| n > 0);
            event.outcome = if partial { "partial" } else { "succeeded" }.into();
            event.code = if partial { "partial_failure" } else if value.get("recovery").and_then(Value::as_str) == Some("operator_review") { "operator_review" }
                else if value.get("reconnectable").and_then(Value::as_bool) == Some(true) { "reconnect_required" }
                else if let Some(detail) = value.get("detail").and_then(Value::as_str) { safe_code(detail) } else { "ok" }.into();
        },
    }
    report.events.push(event);
    if report.events.len() > MAX_EVENTS { report.events.remove(0); }
    session.review = None;
    let _ = prune(&dir, &mut report, session, time).and_then(|_| save(&dir, &report));
}

/// Capture errors cannot change the source operation's result.
pub fn observe<F>(root: &Path, operation: &str, input: &Value, action: F) -> Result<Value, String>
where F: FnOnce() -> Result<Value, String> {
    let event = begin(root, operation, input);
    let result = action();
    if let Some(event) = event { finish(root, event, &result); }
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    struct Fixture(PathBuf);
    impl Fixture {
        fn new() -> Self { Self(std::env::temp_dir().join(format!("gigi-diagnostics-test-{}", Uuid::new_v4()))) }
        fn call(&self, op: &str) -> Value { dispatch(&self.0, op, json!({})).unwrap() }
    }
    impl Drop for Fixture { fn drop(&mut self) { let _ = fs::remove_dir_all(&self.0); sessions().lock().unwrap().remove(&self.0); } }

    #[test]
    fn opt_in_stop_restart_and_delete_never_capture_by_default() {
        let f = Fixture::new();
        observe(&f.0, "connections.status", &json!({"provider":"gmail"}), || Ok(json!({"state":"connected"}))).unwrap();
        assert!(!f.0.exists());
        assert_eq!(f.call("diagnostics.status")["enabled"], false);
        f.call("diagnostics.start");
        observe(&f.0, "connections.status", &json!({"provider":"gmail"}), || Ok(json!({"state":"connected"}))).unwrap();
        assert_eq!(f.call("diagnostics.stop")["eventCount"], 2);
        observe(&f.0, "connections.status", &json!({}), || Err("access_denied".into())).unwrap_err();
        assert_eq!(f.call("diagnostics.status")["eventCount"], 2);
        assert!(dispatch(&f.0, "diagnostics.start", json!({})).is_err());
        sessions().lock().unwrap().remove(&f.0); // Process restart loses opt-in state.
        assert_eq!(f.call("diagnostics.status")["enabled"], false);
        assert_eq!(f.call("diagnostics.delete")["eventCount"], 0);
        assert!(!f.0.join("diagnostics/capture.json").exists());
        assert_eq!(f.call("diagnostics.start")["enabled"], true);
    }

    #[test]
    fn private_export_is_exact_reviewed_allowlist_not_raw_provider_payload() {
        let f = Fixture::new(); f.call("diagnostics.start");
        let secret = "SECRET_TOKEN patient@example.test https://provider.test/?token=secret";
        observe(&f.0, "connections.begin", &json!({"provider":"gmail","requestId":secret,"headers":secret}), || Ok(json!({"state":"pending","url":secret,"connectedAccountId":secret}))).unwrap();
        observe(&f.0, "connections.status", &json!({"provider":"gmail"}), || Err(secret.into())).unwrap_err();
        observe(&f.0, "connections.status", &json!({"provider":"gmail"}), || Ok(json!({"state":"attention","recovery":"operator_review","accountLabel":{"value":secret}}))).unwrap();
        observe(&f.0, "connections.import", &json!({"provider":"gmail","cursor":secret}), || Ok(json!({"complete":false,"failedCount":1,"failures":[{"message":secret}],"records":[{"title":secret}]}))).unwrap();
        assert!(dispatch(&f.0,"diagnostics.export",json!({})).is_err());
        assert!(f.call("diagnostics.review")["reviewToken"].is_null());
        f.call("diagnostics.stop");
        assert!(dispatch(&f.0,"diagnostics.export",json!({})).is_err());
        let review = f.call("diagnostics.review");
        let export = dispatch(&f.0,"diagnostics.export",json!({"reviewToken":review["reviewToken"]})).unwrap();
        assert_eq!(export["content"], review["content"]);
        let text = export["content"].as_str().unwrap();
        for forbidden in ["SECRET", "@", "https:", "connectedAccountId", "accountLabel", "cursor", "headers", "records", "requestId", "failures"] { assert!(!text.contains(forbidden)); }
        assert!(text.contains("unknown_error")); assert!(text.contains("operator_review")); assert!(text.contains("partial_failure"));
        assert!(text.contains("previousState")); assert!(text.contains("\"retry\": true"));
        assert_eq!(f.call("diagnostics.status")["exportExists"], true);
        for path in [f.0.join("diagnostics/capture.json"), f.0.join("diagnostics/gigi-diagnostics.json")] {
            assert_eq!(fs::metadata(path).unwrap().permissions().mode() & 0o777, 0o600);
        }
        assert_eq!(fs::metadata(f.0.join("diagnostics")).unwrap().permissions().mode() & 0o777, 0o700);
        f.call("diagnostics.delete");
        assert!(!f.0.join("diagnostics/gigi-diagnostics.json").exists());
    }

    #[test]
    fn bounded_storage_expiry_and_stale_review_fail_closed() {
        let f = Fixture::new(); f.call("diagnostics.start");
        for _ in 0..110 { observe(&f.0,"connections.status",&json!({"provider":"gmail"}),|| Err("session_expired".into())).unwrap_err(); }
        assert_eq!(f.call("diagnostics.status")["eventCount"], MAX_EVENTS);
        assert!(fs::metadata(f.0.join("diagnostics/capture.json")).unwrap().len() < MAX_BYTES);
        sessions().lock().unwrap().get_mut(&f.0).unwrap().expires_at = Some(now() - 1);
        assert_eq!(f.call("diagnostics.status")["enabled"], false);
        let review = f.call("diagnostics.review");
        let dir = directory(&f.0).unwrap();
        let mut report = read_report(&dir, now()).unwrap();
        report.events[0].timestamp = now() - RETENTION - 1; save(&dir,&report).unwrap();
        assert!(dispatch(&f.0,"diagnostics.export",json!({"reviewToken":review["reviewToken"]})).is_err());
        assert_eq!(f.call("diagnostics.status")["eventCount"], MAX_EVENTS - 1);
    }

    #[test]
    fn invalid_stored_data_and_symlinks_are_never_exported_or_overwritten() {
        let f = Fixture::new(); f.call("diagnostics.start"); f.call("diagnostics.stop");
        let dir = f.0.join("diagnostics");
        fs::write(dir.join("capture.json"), "{\"token\":\"SECRET\"}").unwrap();
        assert_eq!(dispatch(&f.0,"diagnostics.review",json!({})).unwrap_err(), STORAGE_ERROR);
        f.call("diagnostics.delete");
        let target = f.0.join("do-not-touch"); fs::write(&target,"untouched").unwrap();
        std::os::unix::fs::symlink(&target, dir.join("capture.json")).unwrap();
        assert!(dispatch(&f.0,"diagnostics.review",json!({})).is_err());
        f.call("diagnostics.delete");
        assert_eq!(fs::read_to_string(&target).unwrap(), "untouched");
        f.call("diagnostics.start"); f.call("diagnostics.stop");
        let review = f.call("diagnostics.review");
        std::os::unix::fs::symlink(&target,dir.join("gigi-diagnostics.json")).unwrap();
        assert!(dispatch(&f.0,"diagnostics.export",json!({"reviewToken":review["reviewToken"]})).is_err());
        assert_eq!(fs::read_to_string(&target).unwrap(), "untouched");
        f.call("diagnostics.delete");
        fs::write(dir.join("capture.json.tmp"), "interrupted private write").unwrap();
        assert!(dispatch(&f.0,"diagnostics.start",json!({})).is_err());
        f.call("diagnostics.delete");
        assert!(!dir.join("capture.json.tmp").exists());
        assert_eq!(f.call("diagnostics.start")["enabled"], true);
    }

    #[test]
    fn stopped_or_deleted_capture_ignores_in_flight_results_and_unrelated_operations() {
        let f = Fixture::new(); f.call("diagnostics.start");
        observe(&f.0,"records.save",&json!({"title":"private"}),|| Ok(json!({"id":"private"}))).unwrap();
        assert_eq!(f.call("diagnostics.status")["eventCount"], 0);
        let pending = begin(&f.0,"connections.import",&json!({"provider":"googlecalendar"})).unwrap();
        f.call("diagnostics.delete"); f.call("diagnostics.start");
        finish(&f.0,pending,&Ok(json!({"state":"connected"})));
        assert_eq!(f.call("diagnostics.status")["eventCount"], 0);
        let pending = begin(&f.0,"auth.login",&json!({})).unwrap();
        f.call("diagnostics.stop");
        finish(&f.0,pending,&Ok(json!({"email":"private@example.test"})));
        assert_eq!(f.call("diagnostics.status")["eventCount"], 1);
    }

    #[test]
    fn connection_failure_fixtures_keep_safe_codes_and_consent_transition() {
        let f = Fixture::new(); f.call("diagnostics.start");
        observe(&f.0,"connections.begin",&json!({"provider":"gmail"}),|| Ok(json!({"status":"awaiting_consent","url":"https://secret.example/"}))).unwrap();
        for code in ["session_expired", "access_denied", "provider_unavailable", "invalid_readback", "refresh_outcome_unknown", "browser_unavailable", "identity_contract_mismatch", "cancelled"] {
            observe(&f.0,"connections.status",&json!({"provider":"gmail"}),|| Err(code.into())).unwrap_err();
        }
        f.call("diagnostics.stop");
        let report=f.call("diagnostics.review");
        assert_eq!(report["events"][1]["state"], "pending");
        assert_eq!(report["events"][3]["code"], "session_expired");
        assert_eq!(report["events"][3]["previousState"], "pending");
        assert_eq!(report["events"][5]["code"], "access_denied");
        assert_eq!(report["events"][7]["code"], "provider_unavailable");
        assert_eq!(report["events"][9]["code"], "invalid_readback");
        assert_eq!(report["events"][11]["code"], "refresh_outcome_unknown");
        assert_eq!(report["events"][13]["code"], "browser_unavailable");
        assert!(!report["content"].as_str().unwrap().contains("https://"));
    }

    #[test]
    fn capture_storage_failure_never_changes_source_result_and_stop_still_disables() {
        let f = Fixture::new(); f.call("diagnostics.start");
        fs::write(f.0.join("diagnostics/capture.json"), "corrupt").unwrap();
        let result=observe(&f.0,"connections.status",&json!({"provider":"gmail"}),|| Ok(json!({"state":"connected"}))).unwrap();
        assert_eq!(result["state"], "connected");
        assert!(dispatch(&f.0,"diagnostics.stop",json!({})).is_err());
        assert!(sessions().lock().unwrap().get(&f.0).unwrap().expires_at.is_none());
        f.call("diagnostics.delete");
        assert_eq!(f.call("diagnostics.status")["enabled"], false);
    }
    #[test]
    fn source_recovery_codes_remain_specific_without_raw_payloads() {
        let f = Fixture::new(); f.call("diagnostics.start");
        for code in ["journal_unavailable", "link_outcome_unknown", "connection_changed", "connection_not_found"] {
            observe(&f.0,"connections.begin",&json!({"provider":"gmail"}),|| Err(code.into())).unwrap_err();
        }
        observe(&f.0,"connections.openConsent",&json!({"provider":"googlecalendar","url":"https://secret.example"}),|| Err("Browser could not open".into())).unwrap_err();
        f.call("diagnostics.stop");
        let report=f.call("diagnostics.review");
        for (index, code) in ["journal_unavailable", "link_outcome_unknown", "connection_changed", "connection_not_found", "browser_unavailable"].iter().enumerate() {
            assert_eq!(report["events"][index*2+1]["code"], *code);
        }
        assert_eq!(report["events"][9]["provider"], "googlecalendar");
        assert!(!report["content"].as_str().unwrap().contains("secret.example"));
    }

}
