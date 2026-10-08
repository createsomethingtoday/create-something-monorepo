//! Trusted native UI transactions. No network/agent grant is exposed by this module.
use super::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct HostBatch {
    pub session_id: String,
    pub document_id: String,
    pub expected_revision: u64,
    pub operation_id: String,
    pub operations: Vec<CanvasOperation>,
}

pub(crate) fn apply(runtime: &DrawRuntime, request: HostBatch) -> Result<Value, String> {
    apply_checked(runtime, request, |_, _| Ok(()))
}

// Authorization runs under the same authority lock as validation and commit.
pub(super) fn apply_checked(
    runtime: &DrawRuntime, request: HostBatch,
    authorize: impl FnOnce(&NativeState, &Value) -> Result<(), String>,
) -> Result<Value, String> {
    apply_as(runtime,request,"native-mac",authorize)
}

pub(super) fn apply_as(runtime: &DrawRuntime, request: HostBatch, actor: &str, authorize: impl FnOnce(&NativeState,&Value)->Result<(),String>) -> Result<Value,String> {
    if cfg!(mobile) {
        return Err("Only the Mac authority can commit local batches".into());
    }
    let bytes = validate(&request)?;
    let fingerprint = digest_capability(&String::from_utf8(bytes).map_err(|error| error.to_string())?);
    let mut state = runtime.host.lock().map_err(|error| error.to_string())?;
    if request.session_id != state.session_id || state.document["id"] != request.document_id {
        return Err("HOST_DOCUMENT_CONFLICT: inspect the current document".into());
    }
    if let Some(receipt) = state.applied.get(&request.operation_id) {
        if receipt.client_id != actor || receipt.fingerprint != fingerprint {
            return Err("HOST_OPERATION_ID_REUSED: request differs from saved receipt".into());
        }
        authorize(&state, &state.document)?;
        // Current authority may have advanced since the original commit. Never
        // return a fabricated before snapshot or install a duplicate as new history.
        return Ok(json!({"status":"duplicate", "sessionId":state.session_id,
            "revision":state.revision,"document":state.document,"receipt":receipt,"history":state.history_status()}));
    }
    if request.expected_revision != state.revision {
        return Err(format!("HOST_REVISION_CONFLICT: expected {}, current {}", request.expected_revision, state.revision));
    }
    let mut next = state.clone();
    let before = state.document.clone();
    let timestamp = rfc3339(now())?;
    next.document = project(next.document.clone(), &request.operations, &timestamp)?;
    authorize(&state, &next.document)?;
    next.revision = state.revision.checked_add(1).ok_or("Native revision exhausted")?;
    let receipt = AppliedOperation {
        operation_id: request.operation_id.clone(), client_id: actor.into(),
        fingerprint, revision: next.revision,
        document_updated_at: next.document["updatedAt"].as_str().unwrap_or("").into(),
    };
    next.applied.insert(request.operation_id, receipt.clone());
    prune_applied_receipts(&mut next.applied);
    next.record(&before, actor)?;
    persist_state(&runtime.state_path, &next)?;
    *state = next;
    Ok(json!({"status":"applied","sessionId":state.session_id,"revision":state.revision,
        "document":state.document,"previousDocument":before,"receipt":receipt,"history":state.history_status()}))
}

pub(super) fn validate(request:&HostBatch)->Result<Vec<u8>,String> {
    if request.operations.is_empty() || request.operations.len() > 100
        || !request.operation_id.starts_with("mac-batch-") || request.operation_id.len() > 120
        || !request.operation_id.bytes().all(|byte| byte.is_ascii_alphanumeric() || byte == b'-')
    {
        return Err("Invalid native batch bounds or operation ID".into());
    }
    if !request.operations.iter().all(create_something_draw_pairing_protocol::valid_canvas_operation) {
        return Err("Invalid native batch operation schema".into());
    }
    let bytes = serde_json::to_vec(&request).map_err(|error| error.to_string())?;
    if bytes.len() > 2 * 1024 * 1024 {
        return Err("Native batch exceeds 2 MiB".into());
    }
    Ok(bytes)
}

pub(super) fn project(mut document:Value, operations:&[CanvasOperation], timestamp:&str)->Result<Value,String> {
    for operation in operations {
        // Same-value scalar settings can prefix a meaningful UI edit.
        let safe_scalar_noop = matches!(operation, CanvasOperation::SetTitle { .. }
            | CanvasOperation::SetBackground { .. } | CanvasOperation::SetViewport { .. })
            && is_safe_idempotent(&document, operation);
        if safe_scalar_noop { continue; }
        document = apply_canvas_operation(&document, operation, &timestamp)
            .ok_or("Invalid native batch operation; entire batch rejected")?;
    }
    Ok(document)
}

#[cfg(test)]
pub(super) mod tests {
    use super::*;
    pub(crate) fn runtime() -> DrawRuntime {
        let directory = std::env::temp_dir().join(format!("draw-batch-{}",Uuid::new_v4()));
        let state = initial_state();
        let path = directory.join(STATE_FILE);
        persist_state(&path,&state).unwrap();
        DrawRuntime { _profile_owner:None,agent_access: Mutex::new(Default::default()), state_path:path,host:Mutex::new(state),pending:Mutex::new(HashMap::new()),
            transport:Mutex::new(None),host_capability:random_capability(),
            companion_state_path:directory.join(COMPANION_STATE_FILE),companion:Mutex::new(None),
            companion_flush:tokio::sync::Mutex::new(()) }
    }
    fn request(runtime:&DrawRuntime) -> HostBatch {
        let state=runtime.host.lock().unwrap();
        HostBatch { session_id:state.session_id.clone(),document_id:state.document["id"].as_str().unwrap().into(),
            expected_revision:state.revision,operation_id:format!("mac-batch-{}",Uuid::new_v4()),
            operations:vec![CanvasOperation::SetTitle{title:"Synthetic batch".into()},CanvasOperation::SetBackground{background:"#112233".into()}] }
    }
    #[test]
    fn one_revision_and_before_snapshot_for_whole_batch() {
        let runtime=runtime(); let before=runtime.host.lock().unwrap().document.clone();
        let result=apply(&runtime,request(&runtime)).unwrap();
        assert_eq!(result["revision"],1); assert_eq!(result["previousDocument"],before);
        assert_eq!(result["document"]["title"],"Synthetic batch");
        assert_eq!(load_state(&runtime.state_path).unwrap().document,result["document"]);
        let restored=native_history::action(&runtime,"undo",1,"mac-history-test","native-mac",false,|_,_|Ok(())).unwrap();
        assert_eq!(restored["document"],before); assert_eq!(restored["revision"],2);
    }
    #[test]
    fn invalid_tail_and_persistence_failure_leave_disk_and_memory_unchanged() {
        let runtime=runtime(); let before=fs::read(&runtime.state_path).unwrap();
        let mut batch=request(&runtime); batch.operations.push(CanvasOperation::SetBackground{background:"invalid".into()});
        assert!(apply(&runtime,batch).is_err());
        assert_eq!(runtime.host.lock().unwrap().revision,0); assert_eq!(fs::read(&runtime.state_path).unwrap(),before);
        let mut runtime=runtime;
        // A file cannot be a persistence parent. Fail before publishing in-memory state.
        runtime.state_path=runtime.state_path.join("blocked.json");
        assert!(apply(&runtime,request(&runtime)).is_err());
        assert_eq!(runtime.host.lock().unwrap().revision,0);
    }
    #[test]
    fn stale_future_and_wrong_document_fail_closed() {
        let runtime=runtime(); let batch=request(&runtime); apply(&runtime,batch.clone()).unwrap();
        let mut stale=batch.clone(); stale.operation_id="mac-batch-stale".into(); assert!(apply(&runtime,stale).unwrap_err().contains("REVISION"));
        let mut future=request(&runtime); future.expected_revision=99; assert!(apply(&runtime,future).is_err());
        let mut wrong=request(&runtime); wrong.document_id="other".into(); assert!(apply(&runtime,wrong).is_err());
        assert_eq!(runtime.host.lock().unwrap().revision,1);
    }
    #[test]
    fn exact_retry_survives_newer_commit_and_reload_but_reuse_fails() {
        let runtime=runtime(); let first=request(&runtime); apply(&runtime,first.clone()).unwrap();
        let mut second=request(&runtime); second.operations=vec![CanvasOperation::SetTitle{title:"Later human edit".into()}];
        apply(&runtime,second).unwrap();
        *runtime.host.lock().unwrap()=load_state(&runtime.state_path).unwrap();
        let duplicate=apply(&runtime,first.clone()).unwrap();
        assert_eq!(duplicate["status"],"duplicate"); assert_eq!(duplicate["revision"],2);
        assert!(duplicate.get("previousDocument").is_none()); assert_eq!(duplicate["receipt"]["revision"],1);
        let mut changed=first; changed.operations.clear(); changed.operations.push(CanvasOperation::SetTitle{title:"ID collision".into()});
        assert!(apply(&runtime,changed).unwrap_err().contains("ID_REUSED"));
    }
    #[test]
    fn concurrent_same_revision_only_one_wins() {
        let runtime=Arc::new(runtime()); let a=request(&runtime); let b=request(&runtime);
        let handles=[a,b].into_iter().map(|request|{let runtime=runtime.clone();std::thread::spawn(move || apply(&runtime,request))}).collect::<Vec<_>>();
        assert_eq!(handles.into_iter().map(|h|h.join().unwrap()).filter(Result::is_ok).count(),1);
        assert_eq!(runtime.host.lock().unwrap().revision,1);
    }
    #[test]
    fn invalid_title_and_noop_validation_match_existing_envelopes() {
        let runtime=runtime();
        for title in ["".to_string(), "é".repeat(121)] {
            let mut batch=request(&runtime); batch.operations=vec![CanvasOperation::SetTitle{title}];
            assert!(apply(&runtime,batch).is_err());
        }
        let mut batch=request(&runtime);
        batch.operations.insert(0,CanvasOperation::SetViewport{viewport:serde_json::from_value(json!({"x":0,"y":0,"zoom":1})).unwrap()});
        assert_eq!(apply(&runtime,batch).unwrap()["revision"],1);
    }
    #[test]
    fn bounds_reject_without_commit() {
        let runtime=runtime(); let mut empty=request(&runtime); empty.operations.clear(); assert!(apply(&runtime,empty).is_err());
        let mut large=request(&runtime); large.operations=vec![CanvasOperation::SetTitle{title:"x".into()};101]; assert!(apply(&runtime,large).is_err());
        let mut wrong_id=request(&runtime); wrong_id.operation_id="phone-id".into(); assert!(apply(&runtime,wrong_id).is_err());
        assert_eq!(runtime.host.lock().unwrap().revision,0);
    }
}
