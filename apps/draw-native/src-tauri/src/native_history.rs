//! Native-only journal stored atomically with the existing pairing state.
use super::*;
use serde::{Deserialize, Serialize};
use std::ops::{Deref, DerefMut};
const MAX_BYTES: usize = 16 * 1024 * 1024;
const MAX_ENTRIES: usize = 50;

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct Entry { pub actor: String, before: Value, after: Value }
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct Journal { version: u8, past: Vec<Entry>, future: Vec<Entry> }
impl Default for Journal {
    fn default() -> Self { Self { version: 1, past: vec![], future: vec![] } }
}
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(super) struct NativeState {
    #[serde(flatten)] pub pairing: PairingHostState,
    #[serde(default)] pub native_history: Journal,
    #[serde(default)] pub document_epoch: u64,
}
impl Deref for NativeState { type Target = PairingHostState; fn deref(&self) -> &Self::Target { &self.pairing } }
impl DerefMut for NativeState { fn deref_mut(&mut self) -> &mut Self::Target { &mut self.pairing } }
impl NativeState {
    pub fn history_status(&self) -> Value {
        json!({"canUndo":!self.native_history.past.is_empty(), "canRedo":!self.native_history.future.is_empty(),
            "undoActor":self.native_history.past.last().map(|e| &e.actor), "depth":self.native_history.past.len()})
    }
    pub fn record(&mut self, before: &Value, actor: &str) -> Result<(), String> {
        if before == &self.document { return Ok(()); }
        self.native_history.future.clear();
        let actor = if actor.len()>200 {format!("legacy-client-{}",digest_capability(actor))} else {actor.into()};
        self.native_history.past.push(Entry { actor, before:before.clone(), after:self.document.clone() });
        while self.native_history.past.len() > MAX_ENTRIES || serde_json::to_vec(&self.native_history).map_err(|e|e.to_string())?.len() > MAX_BYTES {
            if self.native_history.past.len() == 1 { return Err("Document exceeds durable history capacity; export a copy".into()); }
            self.native_history.past.remove(0);
        }
        Ok(())
    }
    pub fn validate_history(&self) -> Result<(), String> {
        let h = &self.native_history;
        if h.version != 1 || h.past.len()+h.future.len() > MAX_ENTRIES || serde_json::to_vec(h).map_err(|e|e.to_string())?.len() > MAX_BYTES {
            return Err("Unsupported or oversized native history".into());
        }
        for entry in h.past.iter().chain(h.future.iter()) {
            if entry.actor.len()>200 || !valid_document(&entry.before) || !valid_document(&entry.after)
                || entry.before["id"] != self.document["id"] || entry.after["id"] != self.document["id"] {
                return Err("Invalid native history snapshot".into());
            }
        }
        let mut cursor = &self.document;
        for entry in h.past.iter().rev() {
            if &entry.after != cursor { return Err("Native undo chain mismatch".into()); }
            cursor = &entry.before;
        }
        cursor = &self.document;
        for entry in h.future.iter().rev() {
            if &entry.before != cursor { return Err("Native redo chain mismatch".into()); }
            cursor = &entry.after;
        }
        Ok(())
    }
    pub fn clear_history(&mut self) -> Result<(), String> {
        self.document_epoch = self.document_epoch.checked_add(1).ok_or("Document epoch exhausted")?;
        self.native_history = Journal::default();
        Ok(())
    }
}

pub(super) fn action(runtime: &DrawRuntime, direction: &str, expected: u64, operation_id: &str,
    actor: &str, own_only: bool, authorize: impl FnOnce(&NativeState, &Value) -> Result<(),String>) -> Result<Value,String> {
    if !matches!(direction,"undo"|"redo") || !operation_id.starts_with("mac-history-") || operation_id.len()>120
        || !operation_id.bytes().all(|b|b.is_ascii_alphanumeric()||b==b'-') { return Err("Invalid history request".into()); }
    let fingerprint = digest_capability(&format!("{direction}:{expected}:{actor}:{own_only}"));
    let mut state = runtime.host.lock().map_err(|e|e.to_string())?;
    if let Some(receipt)=state.applied.get(operation_id) {
        if receipt.client_id != actor || receipt.fingerprint != fingerprint { return Err("History operation ID reused".into()); }
        authorize(&state,&state.document)?;
        return Ok(json!({"status":"duplicate","sessionId":state.session_id,"document":state.document,"revision":state.revision,"history":state.history_status(),"receipt":receipt}));
    }
    if state.revision != expected { return Err("HOST_REVISION_CONFLICT: inspect history again".into()); }
    let mut next=state.clone();
    let entry = if direction=="undo" { next.native_history.past.pop() } else { next.native_history.future.pop() }.ok_or("No history in that direction")?;
    if own_only && entry.actor != actor { return Err("Only the latest own change may be undone".into()); }
    next.document = if direction=="undo" {entry.before.clone()} else {entry.after.clone()};
    authorize(&state,&next.document)?;
    if direction=="undo" {next.native_history.future.push(entry)} else {next.native_history.past.push(entry)};
    next.revision=state.revision.checked_add(1).ok_or("Revision exhausted")?;
    let receipt=AppliedOperation {operation_id:operation_id.into(),client_id:actor.into(),fingerprint,revision:next.revision,document_updated_at:next.document["updatedAt"].as_str().unwrap_or("").into()};
    next.applied.insert(operation_id.into(),receipt.clone());
    prune_applied_receipts(&mut next.applied);
    persist_state(&runtime.state_path,&next)?;
    *state=next;
    Ok(json!({"status":"applied","sessionId":state.session_id,"document":state.document,"revision":state.revision,"history":state.history_status(),"receipt":receipt}))
}

#[cfg(test)]
mod tests {
    use super::*;
    fn change(runtime:&DrawRuntime, title:&str) {
        let state=runtime.host.lock().unwrap();
        let request=host_batch::HostBatch{session_id:state.session_id.clone(),document_id:state.document["id"].as_str().unwrap().into(),expected_revision:state.revision,operation_id:format!("mac-batch-{}",Uuid::new_v4()),operations:vec![CanvasOperation::SetTitle{title:title.into()}]};
        drop(state);host_batch::apply(runtime,request).unwrap();
    }
    fn act(runtime:&DrawRuntime, direction:&str, revision:u64, id:&str)->Result<Value,String>{action(runtime,direction,revision,id,"native-mac",false,|_,_|Ok(()))}
    #[test]
    fn history_survives_restart_and_retry_and_new_branch_clears_redo() {
        let runtime=host_batch::tests::runtime();
        change(&runtime,"one");change(&runtime,"two");
        *runtime.host.lock().unwrap()=load_state(&runtime.state_path).unwrap();
        let result=act(&runtime,"undo",2,"mac-history-one").unwrap();
        assert_eq!(result["document"]["title"],"one");
        assert_eq!(act(&runtime,"undo",2,"mac-history-one").unwrap()["status"],"duplicate");
        *runtime.host.lock().unwrap()=load_state(&runtime.state_path).unwrap();
        assert_eq!(act(&runtime,"redo",3,"mac-history-two").unwrap()["document"]["title"],"two");
        act(&runtime,"undo",4,"mac-history-three").unwrap();change(&runtime,"branch");
        assert!(act(&runtime,"redo",6,"mac-history-four").is_err());
        assert!(act(&runtime,"undo",0,"mac-history-stale").is_err());
    }
    #[test]
    fn old_files_migrate_and_corrupt_journal_fails_closed() {
        let runtime=host_batch::tests::runtime();
        let old=serde_json::to_vec(&runtime.host.lock().unwrap().pairing).unwrap();
        fs::write(&runtime.state_path,old).unwrap();
        assert_eq!(load_state(&runtime.state_path).unwrap().history_status()["canUndo"],false);
        change(&runtime,"one");
        let mut saved:Value=serde_json::from_slice(&fs::read(&runtime.state_path).unwrap()).unwrap();
        saved["nativeHistory"]["version"]=json!(99);fs::write(&runtime.state_path,serde_json::to_vec(&saved).unwrap()).unwrap();
        assert!(load_state(&runtime.state_path).is_err());
    }
    #[test]
    fn long_legacy_phone_actor_is_normalized_before_persistence() {
        let runtime=host_batch::tests::runtime();
        let mut state=runtime.host.lock().unwrap();let before=state.document.clone();
        state.document["title"]=json!("legacy phone");state.record(&before,&"x".repeat(201)).unwrap();
        persist_state(&runtime.state_path,&state).unwrap();
        assert!(load_state(&runtime.state_path).is_ok());
    }
    #[test]
    fn ui_phone_and_agent_use_one_restartable_journal() {
        let runtime=host_batch::tests::runtime();change(&runtime,"human");
        let (agent,token)=local_agent::LocalAgent::issue(&runtime,std::collections::BTreeSet::from(["note".into()]),Duration::from_secs(60)).unwrap();
        let state=runtime.host.lock().unwrap();
        let request=host_batch::HostBatch{session_id:state.session_id.clone(),document_id:state.document["id"].as_str().unwrap().into(),expected_revision:1,operation_id:"mac-batch-agent-mixed".into(),operations:vec![CanvasOperation::PutObject{object:json!({"kind":"note","id":"note","createdAt":"2026-10-08T00:00:00Z","x":0,"y":0,"width":100,"height":100,"text":"agent"})}]};
        drop(state);agent.edit(&runtime,&token,request).unwrap();
        let mut state=runtime.host.lock().unwrap();
        state.clients.insert("phone".into(),PairedClient{capability_digest:digest_capability("synthetic"),expires_at:"2099-01-01T00:00:00Z".into(),revoked_at:None});
        let envelope=OperationEnvelope{protocol_version:PROTOCOL_VERSION.into(),document_version:DOCUMENT_VERSION.into(),session_id:state.session_id.clone(),client_id:"phone".into(),operation_id:"phone-mixed".into(),base_revision:2,sent_at:rfc3339(now()).unwrap(),capability:"synthetic".into(),operation:CanvasOperation::SetBackground{background:"#112233".into()}};
        drop(state);assert_eq!(apply_operation(&runtime,envelope).unwrap()["status"],"applied");
        assert!(agent.history(&runtime,&token,"undo",3,"mac-history-agent-wrong-owner").is_err());
        *runtime.host.lock().unwrap()=load_state(&runtime.state_path).unwrap();
        assert_eq!(runtime.host.lock().unwrap().history_status()["depth"],3);
        act(&runtime,"undo",3,"mac-history-phone").unwrap();
        agent.history(&runtime,&token,"undo",4,"mac-history-own-agent").unwrap();
        assert_eq!(runtime.host.lock().unwrap().document["objects"],json!([]));
        act(&runtime,"undo",5,"mac-history-human").unwrap();
        *runtime.host.lock().unwrap()=load_state(&runtime.state_path).unwrap();
        assert_eq!(runtime.host.lock().unwrap().history_status()["canRedo"],true);
    }
    #[test]
    fn history_persistence_failure_does_not_publish() {
        let mut runtime=host_batch::tests::runtime();change(&runtime,"one");
        runtime.state_path=runtime.state_path.join("blocked");
        assert!(act(&runtime,"undo",1,"mac-history-failure").is_err());
        assert_eq!(runtime.host.lock().unwrap().revision,1);
        assert_eq!(runtime.host.lock().unwrap().history_status()["canUndo"],true);
    }
}
