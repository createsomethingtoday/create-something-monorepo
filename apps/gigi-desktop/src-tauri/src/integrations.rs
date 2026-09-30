use serde_json::Value;
use std::io::{Read, Write};
use std::os::unix::process::CommandExt;
use std::path::Path;
use std::process::{Child, Command, Stdio};
use std::collections::HashSet;
use std::sync::{Mutex, OnceLock};
use std::sync::mpsc;
use std::time::{Duration, Instant};

const MAX_RESPONSE: u64 = 1_048_576;

fn active_groups()->&'static Mutex<HashSet<i32>>{
    static GROUPS:OnceLock<Mutex<HashSet<i32>>>=OnceLock::new();
    GROUPS.get_or_init(||Mutex::new(HashSet::new()))
}

struct RegisteredGroup(i32);
impl Drop for RegisteredGroup{
    fn drop(&mut self){active_groups().lock().unwrap().remove(&self.0);}
}

pub fn cancel_all(){
    let groups:Vec<_>=active_groups().lock().unwrap().iter().copied().collect();
    for group in &groups{unsafe{libc::kill(-*group,libc::SIGTERM);}}
    if !groups.is_empty(){std::thread::sleep(Duration::from_millis(500));}
    for group in &groups{unsafe{libc::kill(-*group,libc::SIGKILL);}}
}

pub fn dispatch(resource_dir:&Path,data_dir:&Path,operation:&str,input:Value)->Result<Value,String>{
    let timeout=if operation=="auth.login"{Duration::from_secs(330)}else{Duration::from_secs(45)};
    dispatch_with_timeout(resource_dir,data_dir,operation,input,timeout)
}

fn dispatch_with_timeout(resource_dir:&Path,data_dir:&Path,operation:&str,input:Value,timeout:Duration)->Result<Value,String>{
    if !matches!(operation,"auth.login"|"context.search"|"context.sync"|"context.import"|"connections.status"|"connections.begin"|"connections.reconcile"|"connections.import"){
        return Err("Unsupported integration operation".into());
    }
    let request=serde_json::to_vec(&serde_json::json!({"operation":operation,"input":input})).map_err(|_|"Invalid integration request")?;
    if request.len()>65_536{return Err("Integration request exceeds limit".into())}
    let mut command=Command::new(resource_dir.join("gigi-integrations"));
    // The companion needs the local runtime environment, not unrelated agent/provider credentials.
    for (key, _) in std::env::vars_os() {
        let name=key.to_string_lossy().to_ascii_uppercase();
        if name.ends_with("_API_KEY") || name.ends_with("_ACCESS_TOKEN") || name.ends_with("_AUTH_TOKEN")
            || name.ends_with("_SECRET") || name.ends_with("_PASSWORD") || name.ends_with("_CREDENTIALS")
            || ["OPENAI_","ANTHROPIC_","GOOGLE_","GEMINI_","COMPOSIO_","CLOUDFLARE_","LINEAR_","INFISICAL_"].iter().any(|prefix|name.starts_with(prefix)) {
            command.env_remove(key);
        }
    }
    command.env("GIGI_DATA_DIR",data_dir).stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::null()).process_group(0);
    // Spawn and register under one lock so app exit cannot miss a new child.
    let mut groups=active_groups().lock().unwrap();
    let mut child=command.spawn().map_err(|_|"Integration companion unavailable. Reinstall the complete GiGi app.".to_string())?;
    let group=child.id() as i32;
    groups.insert(group);
    drop(groups);
    let _registration=RegisteredGroup(group);
    let deadline=Instant::now()+timeout;
    let mut stdin=match child.stdin.take(){Some(stdin)=>stdin,None=>{terminate_group(&mut child);return Err("Companion input unavailable".into())}};
    let (write_sender,write_receiver)=mpsc::sync_channel(1);
    std::thread::spawn(move || {
        let result=stdin.write_all(&request).and_then(|_|stdin.write_all(b"\n"));
        drop(stdin);
        let _=write_sender.send(result);
    });
    match write_receiver.recv_timeout(deadline.saturating_duration_since(Instant::now())) {
        Ok(Ok(()))=>{},
        Ok(Err(_))=>{terminate_group(&mut child);return Err("Integration request could not be delivered".into())},
        Err(_)=>{terminate_group(&mut child);return Err("Integration timed out. Reconcile connection status before retrying.".into())},
    }
    let stdout=match child.stdout.take(){Some(stdout)=>stdout,None=>{terminate_group(&mut child);return Err("Companion output unavailable".into())}};
    let (sender,receiver)=mpsc::sync_channel(1);
    std::thread::spawn(move ||{
        let mut bytes=Vec::new();
        let result=stdout.take(MAX_RESPONSE+1).read_to_end(&mut bytes).map(|_|bytes);
        let _=sender.send(result);
    });
    let status=loop{
        match child.try_wait(){
            Ok(Some(status))=>break status,
            Ok(None) if Instant::now()<deadline=>std::thread::sleep(Duration::from_millis(25)),
            _=>{terminate_group(&mut child);return Err("Integration timed out. Reconcile connection status before retrying.".into())}
        }
    };
    if !status.success(){
        terminate_group(&mut child);
        return Err("Integration operation failed; check connection status before retrying a change.".into());
    }
    let bytes=match receiver.recv_timeout(Duration::from_secs(2)){
        Ok(Ok(bytes))=>bytes,
        Ok(Err(_))=>return Err("Integration output unreadable".into()),
        Err(_)=>{terminate_group(&mut child);return Err("Integration output did not close; companion descendants were stopped.".into())}
    };
    if bytes.len()>MAX_RESPONSE as usize{return Err("Integration response exceeds limit".into())}
    let response:Value=serde_json::from_slice(&bytes).map_err(|_|"Integration returned invalid JSON")?;
    if response.get("ok").and_then(Value::as_bool)!=Some(true){
        return Err(response.get("error").and_then(|error|error.as_str().or_else(||error.get("reason").and_then(Value::as_str))).unwrap_or("Integration unavailable").chars().take(500).collect());
    }
    Ok(response.get("value").cloned().unwrap_or(Value::Null))
}

fn terminate_group(child:&mut Child){
    let group=child.id() as i32;
    unsafe{libc::kill(-group,libc::SIGTERM);}
    let deadline=Instant::now()+Duration::from_millis(500);
    while Instant::now()<deadline{
        if matches!(child.try_wait(),Ok(Some(_))){break}
        std::thread::sleep(Duration::from_millis(20));
    }
    unsafe{libc::kill(-group,libc::SIGKILL);}
    let _=child.kill();
    let _=child.wait();
}

pub fn sync_history(resource_dir:&Path,data_dir:&Path)->Result<Value,String>{
    let staged=crate::domain::export_history(data_dir)?;
    let imported=dispatch(resource_dir,data_dir,"context.sync",serde_json::json!({}))?;
    Ok(serde_json::json!({"staged":staged,"imported":imported}))
}

#[cfg(test)]
mod tests{
    use super::*;
    use std::os::unix::fs::PermissionsExt;
    fn test_lock()->std::sync::MutexGuard<'static,()>{
        static LOCK:OnceLock<Mutex<()>>=OnceLock::new();
        LOCK.get_or_init(||Mutex::new(())).lock().unwrap()
    }
    fn fixture(root:&Path,script:&str){
        std::fs::create_dir_all(root).unwrap();
        let binary=root.join("gigi-integrations");
        std::fs::write(&binary,script).unwrap();
        std::fs::set_permissions(binary,std::fs::Permissions::from_mode(0o700)).unwrap();
    }
    #[test]
    fn companion_receives_request_and_returns_bounded_json(){
        let _guard=test_lock();
        let dir=std::env::temp_dir().join(format!("gigi-bridge-{}",uuid::Uuid::new_v4()));
        fixture(&dir,"#!/bin/sh\nread request\nprintf '%s' '{\"ok\":true,\"value\":{\"state\":\"unconfigured\"}}'\n");
        let result=dispatch(&dir,&dir,"connections.status",serde_json::json!({"provider":"gmail"}));
        std::fs::remove_dir_all(&dir).unwrap();
        assert_eq!(result.unwrap()["state"],"unconfigured");
    }
    #[test]
    fn unknown_operations_are_rejected_before_process_launch(){
        let _guard=test_lock();
        assert!(dispatch(Path::new("/missing"),Path::new("/missing"),"shell.run",serde_json::json!({})).unwrap_err().contains("Unsupported integration operation"));
    }
    #[test]
    fn sync_stages_owned_history_before_invoking_fixed_import(){
        let _guard=test_lock();
        let dir=std::env::temp_dir().join(format!("gigi-ctx-sync-{}",uuid::Uuid::new_v4()));
        fixture(&dir,"#!/bin/sh\nread request\ncase \"$request\" in *context.sync*) ;; *) exit 4;; esac\ntest -f \"$GIGI_DATA_DIR/imports/gigi-history.jsonl\" || exit 5\nprintf '%s' '{\"ok\":true,\"value\":{\"imported\":true}}'\n");
        let workspace=crate::domain::dispatch(&dir,"workspace.create",serde_json::json!({"name":"Solo"})).unwrap();
        crate::domain::dispatch(&dir,"records.save",serde_json::json!({"workspaceId":workspace["id"],"entity":"gigs","title":"Friday set"})).unwrap();
        let result=sync_history(&dir,&dir).unwrap();
        assert_eq!(result["staged"]["events"],2);
        assert_eq!(result["imported"]["imported"],true);
        std::fs::remove_dir_all(dir).unwrap();
    }
    #[test]
    fn timeout_stops_descendants_without_waiting_for_inherited_stdout(){
        let _guard=test_lock();
        let dir=std::env::temp_dir().join(format!("gigi-bridge-timeout-{}",uuid::Uuid::new_v4()));
        fixture(&dir,"#!/bin/sh\n(sleep 1; touch \"$GIGI_DATA_DIR/leaked\") &\nwait\n");
        let start=Instant::now();
        let error=dispatch_with_timeout(&dir,&dir,"connections.status",serde_json::json!({"provider":"gmail"}),Duration::from_millis(100)).unwrap_err();
        assert!(error.contains("timed out"));assert!(start.elapsed()<Duration::from_secs(3));
        std::thread::sleep(Duration::from_millis(1200));
        assert!(!dir.join("leaked").exists());
        std::fs::remove_dir_all(dir).unwrap();
    }
    #[test]
    fn timeout_includes_blocked_request_write(){
        let _guard=test_lock();
        let dir=std::env::temp_dir().join(format!("gigi-bridge-write-{}",uuid::Uuid::new_v4()));
        fixture(&dir,"#!/bin/sh\nsleep 5\n");
        let start=Instant::now();
        let error=dispatch_with_timeout(&dir,&dir,"connections.status",serde_json::json!({"large":"x".repeat(60_000)}),Duration::from_millis(100)).unwrap_err();
        assert!(error.contains("timed out"));
        assert!(start.elapsed()<Duration::from_secs(3));
        std::fs::remove_dir_all(dir).unwrap();
    }
    #[test]
    fn provider_credentials_are_not_inherited_by_companion(){
        let _guard=test_lock();
        let dir=std::env::temp_dir().join(format!("gigi-bridge-env-{}",uuid::Uuid::new_v4()));
        fixture(&dir,"#!/bin/sh\nread request\ntest -z \"$GIGI_TEST_API_KEY\" || exit 9\nprintf '%s' '{\"ok\":true,\"value\":{\"clean\":true}}'\n");
        std::env::set_var("GIGI_TEST_API_KEY","test-secret-never-logged");
        let result=dispatch(&dir,&dir,"connections.status",serde_json::json!({}));
        std::env::remove_var("GIGI_TEST_API_KEY");
        assert_eq!(result.unwrap()["clean"],true);
        std::fs::remove_dir_all(dir).unwrap();
    }
    #[test]
    fn app_exit_cancels_owned_child_and_descendants(){
        let _guard=test_lock();
        let dir=std::env::temp_dir().join(format!("gigi-bridge-exit-{}",uuid::Uuid::new_v4()));
        fixture(&dir,"#!/bin/sh\n(sleep 1; touch \"$GIGI_DATA_DIR/leaked\") &\ntouch \"$GIGI_DATA_DIR/started\"\nwait\n");
        let worker_dir=dir.clone();
        let worker=std::thread::spawn(move||dispatch_with_timeout(&worker_dir,&worker_dir,"auth.login",serde_json::json!({}),Duration::from_secs(5)));
        let deadline=Instant::now()+Duration::from_secs(2);
        while !dir.join("started").exists() && Instant::now()<deadline{std::thread::sleep(Duration::from_millis(10));}
        assert!(dir.join("started").exists());
        cancel_all();
        assert!(worker.join().unwrap().is_err());
        std::thread::sleep(Duration::from_millis(1200));
        assert!(!dir.join("leaked").exists());
        std::fs::remove_dir_all(dir).unwrap();
    }
}
