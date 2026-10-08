//! In-process authority seam. Deliberately not registered as a Tauri command or
//! transport: production activation requires a native grant/revocation UI.
//! Tokens/history are ephemeral; restarting loses authority, not saved artwork.
#![allow(dead_code)]
use super::*;
use std::collections::BTreeSet;
use std::time::{Duration, Instant};

struct Grant {
    digest: String,
    session_id: String,
    document_id: String,
    expires: Instant,
    edit_ids: BTreeSet<String>,
    revoked: bool,
    undo: Option<(u64, Value)>,
}

pub(super) struct LocalAgent {
    grant: Mutex<Grant>,
}

impl LocalAgent {
    // Only the native owner may construct a grant. No RPC can issue or expand one.
    fn issue(runtime: &DrawRuntime, edit_ids: BTreeSet<String>, ttl: Duration) -> Result<(Self, String), String> {
        if ttl.is_zero() || ttl > Duration::from_secs(3600) || edit_ids.len() > 200 {
            return Err("Invalid grant bounds".into());
        }
        let state = runtime.host.lock().map_err(|e| e.to_string())?;
        let token = random_capability();
        Ok((Self { grant: Mutex::new(Grant {
            digest: digest_capability(&token), session_id: state.session_id.clone(),
            document_id: state.document["id"].as_str().ok_or("Invalid document")?.into(),
            expires: Instant::now() + ttl, edit_ids, revoked: false, undo: None,
        }) }, token))
    }

    fn revoke(&self) -> Result<(), String> {
        let mut grant = self.grant.lock().map_err(|e| e.to_string())?;
        grant.revoked = true;
        grant.undo = None;
        Ok(())
    }

    fn inspect(&self, runtime: &DrawRuntime, token: &str) -> Result<Value, String> {
        let grant = self.grant.lock().map_err(|e| e.to_string())?;
        grant.authenticate(token)?;
        let state = runtime.host.lock().map_err(|e| e.to_string())?;
        grant.authenticate(token)?;
        grant.check_document(&state.session_id, &state.document["id"])?;
        Ok(json!({"sessionId":state.session_id,"revision":state.revision,"document":state.document}))
    }

    fn edit(&self, runtime: &DrawRuntime, token: &str, request: host_batch::HostBatch) -> Result<Value, String> {
        // Holding this lock through commit makes successful revocation a barrier.
        let mut grant = self.grant.lock().map_err(|e| e.to_string())?;
        grant.authenticate(token)?;
        grant.check_document(&request.session_id, &json!(request.document_id))?;
        if grant.edit_ids.is_empty() { return Err("Read-only grant".into()); }
        let result = host_batch::apply_checked(runtime, request, |before, after| { grant.authenticate(token)?;
            let inverse = grant.inverse_request(u64::MAX, before)?;
            if serde_json::to_vec(&inverse).map_err(|e| e.to_string())?.len() > 2 * 1024 * 1024 {
                return Err("Undo snapshot exceeds native batch limit".into());
            }
            grant.check_edit(before, after) })?;
        if result["status"] == "applied" {
            grant.undo = Some((result["revision"].as_u64().ok_or("Invalid receipt")?, result["previousDocument"].clone()));
        }
        Ok(result)
    }

    fn undo(&self, runtime: &DrawRuntime, token: &str, expected_revision: u64) -> Result<Value, String> {
        let mut grant = self.grant.lock().map_err(|e| e.to_string())?;
        grant.authenticate(token)?;
        let (revision, before) = grant.undo.as_ref().ok_or("No agent edit to undo")?;
        if *revision != expected_revision { return Err("Undo revision conflict".into()); }
        // Only the exact latest agent transaction can be undone. Any intervening
        // human/phone/agent change fails the native CAS; no history overwrite.
        let request = grant.inverse_request(expected_revision, before)?;
        let result = host_batch::apply_checked(runtime, request, |current, restored| { grant.authenticate(token)?; grant.check_edit(current, restored) })?;
        grant.undo = None;
        Ok(result)
    }
}

impl Grant {
    fn inverse_request(&self, revision: u64, before: &Value) -> Result<host_batch::HostBatch, String> {
        Ok(host_batch::HostBatch {
            session_id: self.session_id.clone(), document_id: self.document_id.clone(),
            expected_revision: revision, operation_id: format!("mac-batch-{}", Uuid::new_v4()),
            operations: vec![CanvasOperation::ReplaceObjects {
                objects: before["objects"].as_array().ok_or("Invalid undo snapshot")?.clone(),
            }],
        })
    }
    fn authenticate(&self, token: &str) -> Result<(), String> {
        if self.revoked || Instant::now() >= self.expires || token.len() > 1024 {
            return Err("Grant unavailable".into());
        }
        let actual = digest_capability(token);
        // Compare fixed-size digests without early byte exit.
        let difference = self.digest.bytes().zip(actual.bytes()).fold(0, |acc, (a,b)| acc | (a ^ b));
        if difference != 0 { return Err("Grant unavailable".into()); }
        Ok(())
    }
    fn check_document(&self, session: &str, document: &Value) -> Result<(), String> {
        if session != self.session_id || document != &json!(self.document_id) {
            return Err("Grant document conflict".into());
        }
        Ok(())
    }
    fn check_edit(&self, before: &Value, after: &Value) -> Result<(), String> {
        for key in ["id", "version", "createdAt", "title", "background", "viewport"] {
            if before[key] != after[key] { return Err("Document settings are outside this grant".into()); }
        }
        let old = before["objects"].as_array().ok_or("Invalid objects")?;
        let new = after["objects"].as_array().ok_or("Invalid objects")?;
        let mut locked = BTreeSet::new();
        let mut pending = old.iter().filter(|o| o["locked"] == true).filter_map(|o| o["id"].as_str()).collect::<Vec<_>>();
        while let Some(id) = pending.pop() {
            if !locked.insert(id) { continue; }
            if let Some(object) = old.iter().find(|o| o["id"] == id) {
                if object["kind"] == "group" {
                    if let Some(children) = object["childIds"].as_array() {
                        pending.extend(children.iter().filter_map(Value::as_str));
                    }
                }
            }
        }
        for (index, object) in old.iter().enumerate() {
            let id = object["id"].as_str().ok_or("Invalid object ID")?;
            let replacement = new.iter().position(|o| o["id"] == id);
            // Group membership/visibility can affect ungranted descendants.
            // This first seam only permits leaf artwork, never group mutations.
            if object["kind"] == "group" || object["hidden"] == true || locked.contains(id) || !self.edit_ids.contains(id) {
                if replacement != Some(index) || replacement.map(|i| &new[i]) != Some(object) {
                    return Err("Locked or ungranted layer changed".into());
                }
            }
        }
        for object in new {
            let original = old.iter().find(|o| o["id"] == object["id"]);
            for field in ["locked", "hidden"] {
                if object[field].as_bool().unwrap_or(false) != original.map(|o| o[field].as_bool().unwrap_or(false)).unwrap_or(false) {
                    return Err("Layer visibility and locks require native owner approval".into());
                }
            }
            if object["kind"] == "group" && original != Some(object) {
                return Err("Group changes require native owner approval".into());
            }
            if !old.iter().any(|o| o["id"] == object["id"]) && !self.edit_ids.contains(object["id"].as_str().ok_or("Invalid ID")?) {
                return Err("New layer is outside this grant".into());
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn setup() -> (DrawRuntime, LocalAgent, String) {
        let runtime = host_batch::tests::runtime();
        let (agent, token) = LocalAgent::issue(&runtime, BTreeSet::from(["note-test".into()]), Duration::from_secs(60)).unwrap();
        (runtime, agent, token)
    }
    fn edit(runtime: &DrawRuntime) -> host_batch::HostBatch {
        let state = runtime.host.lock().unwrap();
        host_batch::HostBatch {
            session_id: state.session_id.clone(), document_id: state.document["id"].as_str().unwrap().into(),
            expected_revision: state.revision, operation_id: format!("mac-batch-{}", Uuid::new_v4()),
            operations: vec![CanvasOperation::PutObject { object: json!({"kind":"note","id":"note-test","createdAt":"2026-10-08T00:00:00Z","x":0,"y":0,"width":200,"height":100,"text":"synthetic"}) }],
        }
    }
    #[test]
    fn grant_revocation_and_scope_are_enforced_at_commit() {
        let (runtime, agent, token) = setup();
        assert!(agent.inspect(&runtime, "wrong").is_err());
        agent.edit(&runtime, &token, edit(&runtime)).unwrap();
        agent.revoke().unwrap();
        assert!(agent.inspect(&runtime, &token).is_err());
        assert!(agent.edit(&runtime, &token, edit(&runtime)).is_err());
        assert_eq!(runtime.host.lock().unwrap().revision, 1);
    }
    #[test]
    fn undo_restores_one_batch_and_refuses_intervening_edit() {
        let (runtime, agent, token) = setup();
        agent.edit(&runtime, &token, edit(&runtime)).unwrap();
        agent.undo(&runtime, &token, 1).unwrap();
        assert_eq!(runtime.host.lock().unwrap().document["objects"], json!([]));
        assert!(agent.undo(&runtime, &token, 2).is_err());
        agent.edit(&runtime, &token, edit(&runtime)).unwrap();
        let mut human = edit(&runtime);
        human.operations = vec![CanvasOperation::SetTitle { title:"human".into() }];
        host_batch::apply(&runtime, human).unwrap();
        assert!(agent.undo(&runtime, &token, 3).is_err());
        assert_eq!(runtime.host.lock().unwrap().document["title"], "human");
    }
    #[test]
    fn read_only_expired_wrong_document_and_settings_fail() {
        let (runtime, agent, token) = setup();
        let mut request = edit(&runtime); request.document_id = "other".into();
        assert!(agent.edit(&runtime, &token, request).is_err());
        let mut request = edit(&runtime); request.operations = vec![CanvasOperation::SetTitle{title:"outside scope".into()}];
        assert!(agent.edit(&runtime, &token, request).is_err());
        agent.grant.lock().unwrap().edit_ids.clear();
        assert!(agent.inspect(&runtime, &token).is_ok());
        assert!(agent.edit(&runtime, &token, edit(&runtime)).is_err());
        agent.grant.lock().unwrap().expires = Instant::now();
        assert!(agent.inspect(&runtime, &token).is_err());
        assert_eq!(runtime.host.lock().unwrap().revision, 0);
    }
    #[test]
    fn oversized_inverse_is_rejected_before_commit() {
        let (runtime, agent, token) = setup();
        // Legacy native stores can exceed the new per-batch bound.
        {
            let mut state = runtime.host.lock().unwrap();
            let objects = state.document["objects"].as_array_mut().unwrap();
            for index in 0..500 {
                objects.push(json!({"kind":"note","id":format!("existing-{index}"),"createdAt":"2026-10-08T00:00:00Z","x":0,"y":0,"width":200,"height":100,"text":"x".repeat(5000)}));
            }
        }
        let failure = agent.edit(&runtime, &token, edit(&runtime)).unwrap_err();
        assert!(failure.contains("Undo snapshot"), "{failure}");
        assert_eq!(runtime.host.lock().unwrap().revision, 0);
    }
    #[test]
    fn agent_cannot_lock_hide_or_create_a_group() {
        let (runtime, agent, token) = setup();
        for field in ["locked", "hidden"] {
            let mut request = edit(&runtime);
            if let CanvasOperation::PutObject {object} = &mut request.operations[0] { object[field] = json!(true); }
            assert!(agent.edit(&runtime, &token, request).is_err());
        }
        let mut request = edit(&runtime);
        request.operations = vec![CanvasOperation::PutObject {object: json!({"kind":"group","id":"note-test","createdAt":"2026-10-08T00:00:00Z","x":0,"y":0,"width":200,"height":100,"label":"scoped group","childIds":[]})}];
        assert!(agent.edit(&runtime, &token, request).is_err());
        assert_eq!(runtime.host.lock().unwrap().revision, 0);
    }
    #[test]
    fn expiry_is_rechecked_after_waiting_for_authority_lock() {
        let (runtime, agent, token) = setup();
        let request = edit(&runtime);
        agent.grant.lock().unwrap().expires = Instant::now() + Duration::from_secs(2);
        let guard = runtime.host.lock().unwrap();
        std::thread::scope(|scope| {
            let attempt = scope.spawn(|| agent.edit(&runtime, &token, request));
            // Worker holds grant lock while blocked on authority: this proves
            // initial authentication completed rather than merely expiring first.
            let deadline = Instant::now() + Duration::from_secs(1);
            loop {
                if agent.grant.try_lock().is_err() { break; }
                assert!(Instant::now() < deadline, "worker did not reach authority lock");
                std::thread::yield_now();
            }
            std::thread::sleep(Duration::from_millis(2100));
            drop(guard);
            assert!(attempt.join().unwrap().is_err());
        });
        assert_eq!(runtime.host.lock().unwrap().revision, 0);
    }
    #[test]
    fn locked_group_descendants_cannot_be_edited_or_unlocked_in_batch() {
        let (runtime, agent, token) = setup();
        agent.edit(&runtime, &token, edit(&runtime)).unwrap();
        {
            let mut state = runtime.host.lock().unwrap();
            state.document["objects"].as_array_mut().unwrap().push(json!({"kind":"group","id":"group","createdAt":"2026-10-08T00:00:00Z","x":0,"y":0,"width":200,"height":100,"label":"locked","childIds":["note-test"],"locked":true}));
        }
        let mut request = edit(&runtime);
        if let CanvasOperation::PutObject {object} = &mut request.operations[0] { object["text"] = json!("blocked"); }
        assert!(agent.edit(&runtime, &token, request).is_err());
        assert_eq!(runtime.host.lock().unwrap().document["objects"][0]["text"], "synthetic");
    }
}
