//! Native-owner approval broker. No socket method can commit, approve, or issue grants.
use super::*;
use serde::Deserialize;
use std::collections::BTreeSet;
use std::io::{BufRead, BufReader};
use std::os::unix::fs::{DirBuilderExt, PermissionsExt};
use std::os::unix::net::UnixListener;
#[cfg(test)] use std::os::unix::net::UnixStream;
use std::sync::{Weak, atomic::{AtomicBool, Ordering}};

#[derive(Default)]
pub(super) struct Access { session: Option<Session> }
struct Session {
    agent: local_agent::LocalAgent, token: String, ids: Vec<String>, expires_at:String,
    server: Server, pending: BTreeMap<String,Proposal>, outcomes:BTreeMap<String,Value>, fingerprints:BTreeMap<String,String>,
}
#[derive(Clone)]
struct Proposal { request:host_batch::HostBatch, preview:Value }
struct Server { path:PathBuf, stop:Arc<AtomicBool> }
impl Drop for Server {
    fn drop(&mut self) { self.stop.store(true,Ordering::Release); let _=fs::remove_file(&self.path); if let Some(parent)=self.path.parent(){let _=fs::remove_dir(parent);} }
}
#[derive(Clone, Deserialize)]
#[serde(tag="method",rename_all="snake_case",deny_unknown_fields)]
pub(super) enum Request {
    Inspect { token:String },
    Propose { token:String, request:host_batch::HostBatch },
    ProposalStatus { token:String, operation_id:String },
}
impl Request { fn token(&self)->&str {match self {Self::Inspect{token}|Self::Propose{token,..}|Self::ProposalStatus{token,..}=>token}} }

impl Server {
    fn start(runtime:Weak<DrawRuntime>)->Result<Self,String> {
        let directory=PathBuf::from("/tmp").join(format!("draw-agent-{}",Uuid::new_v4()));
        fs::DirBuilder::new().mode(0o700).create(&directory).map_err(|e|e.to_string())?;
        let path=directory.join("agent.sock");
        let listener=match UnixListener::bind(&path){Ok(v)=>v,Err(e)=>{let _=fs::remove_dir(&directory);return Err(e.to_string());}};
        fs::set_permissions(&path,fs::Permissions::from_mode(0o600)).map_err(|e|e.to_string())?;
        listener.set_nonblocking(true).map_err(|e|e.to_string())?;
        let stop=Arc::new(AtomicBool::new(false));let stopping=stop.clone();
        std::thread::spawn(move || {
            while !stopping.load(Ordering::Acquire) {
                match listener.accept() {
                    Ok((mut stream,_)) => {
                        let _=stream.set_read_timeout(Some(Duration::from_secs(2)));
                        let _=stream.set_write_timeout(Some(Duration::from_secs(2)));
                        let result=(||->Result<Value,String>{
                            let mut line=Vec::new();
                            // One bounded newline-delimited request per connection.
                            use std::io::Read;
                            BufReader::new((&mut stream).take(2*1024*1024+1)).read_until(b'\n',&mut line).map_err(|_|"Incomplete local request")?;
                            if line.len()>2*1024*1024 || line.last()!=Some(&b'\n'){return Err("Invalid local request size or framing".into());}
                            let request:Request=serde_json::from_slice(&line).map_err(|_|"Invalid local request")?;
                            let runtime=runtime.upgrade().ok_or("Native authority closed")?;
                            dispatch(&runtime,request)
                        })();
                        let response=match result {Ok(value)=>json!({"result":value}),Err(error)=>json!({"error":error})};
                        if let Ok(mut bytes)=serde_json::to_vec(&response) {bytes.push(b'\n');let _=stream.write_all(&bytes);}
                    },
                    Err(error) if error.kind()==std::io::ErrorKind::WouldBlock=>std::thread::sleep(Duration::from_millis(25)),
                    Err(_)=>break,
                }
            }
        });
        Ok(Self{path,stop})
    }
}

pub(super) fn start(runtime:&Arc<DrawRuntime>, ids:Vec<String>, document_id:&str, expected_revision:u64)->Result<Value,String> {
    if cfg!(mobile) {return Err("Local agents require the Mac authority".into());}
    let mut access=runtime.agent_access.lock().map_err(|e|e.to_string())?;
    if access.session.is_some(){return Err("Revoke the current local session first".into());}
    if ids.len()>200 || ids.iter().any(|id| id.is_empty() || id.len()>200) || ids.iter().collect::<BTreeSet<_>>().len()!=ids.len(){return Err("Invalid selected layer scope".into());}
    let (agent,token)=local_agent::LocalAgent::issue(runtime,ids.iter().cloned().collect(),Duration::from_secs(600))?;
    let snapshot=agent.inspect(runtime,&token)?;
    if snapshot["document"]["id"]!=document_id || snapshot["revision"]!=expected_revision {return Err("Canvas changed; review scope again".into());}
    let objects=snapshot["document"]["objects"].as_array().ok_or("Invalid document")?;
    if ids.iter().any(|id|!objects.iter().any(|o|o["id"]==*id)){return Err("Selected layer is missing".into());}
    let server=Server::start(Arc::downgrade(runtime))?;
    let expires_at=rfc3339(now()+Duration::from_secs(600))?;
    let result=json!({"socketPath":server.path,"token":token,"expiresAt":expires_at,"editIds":ids,"mode":if ids.is_empty(){"read-only"}else{"reviewed-proposals"}});
    access.session=Some(Session{agent,token,ids,expires_at,server,pending:BTreeMap::new(),outcomes:BTreeMap::new(),fingerprints:BTreeMap::new()});
    Ok(result)
}

pub(super) fn status(runtime:&DrawRuntime)->Result<Value,String> {
    let access=runtime.agent_access.lock().map_err(|e|e.to_string())?;
    Ok(match access.session.as_ref(){None=>json!({"active":false}),Some(session)=>{
        let active=session.agent.inspect(runtime,&session.token).is_ok();
        json!({"active":active,"exists":true,"expiresAt":session.expires_at,"editIds":session.ids,"socketPath":session.server.path,
            "pending":session.pending.iter().map(|(id,p)|json!({"operationId":id,"expectedRevision":p.request.expected_revision,"operations":p.request.operations,"preview":p.preview})).collect::<Vec<_>>()})
    }})
}

pub(super) fn revoke(runtime:&DrawRuntime)->Result<Value,String> {
    let mut access=runtime.agent_access.lock().map_err(|e|e.to_string())?;
    if let Some(session)=access.session.take(){session.agent.revoke()?;drop(session);}
    Ok(json!({"active":false}))
}

pub(super) fn dispatch(runtime:&DrawRuntime, request:Request)->Result<Value,String> {
    let mut access=runtime.agent_access.lock().map_err(|e|e.to_string())?;
    let session=access.session.as_mut().ok_or("No local grant")?;
    // All methods, including retry/status, authenticate the grant against its epoch.
    let snapshot=session.agent.inspect(runtime,request.token())?;
    match request {
        Request::Inspect{..}=>Ok(snapshot),
        Request::ProposalStatus{operation_id,..}=>{
            if let Some(outcome)=session.outcomes.get(&operation_id){return Ok(outcome.clone());}
            if session.pending.contains_key(&operation_id){return Ok(json!({"status":"pending-owner-review","operationId":operation_id}));}
            // Durable native receipts permit inspection after an uncertain response.
            let state=runtime.host.lock().map_err(|e|e.to_string())?;
            if let Some(receipt)=state.applied.get(&operation_id){return Ok(json!({"status":"committed","receipt":receipt}));}
            Ok(json!({"status":"unknown","operationId":operation_id}))
        },
        Request::Propose{token,request}=>{
            let fingerprint=digest_capability(&String::from_utf8(host_batch::validate(&request)?).map_err(|e|e.to_string())?);
            if session.fingerprints.get(&request.operation_id).is_some_and(|saved|saved!=&fingerprint){return Err("Proposal ID reused with different content".into());}
            if session.outcomes.contains_key(&request.operation_id){return Ok(session.outcomes[&request.operation_id].clone());}
            if let Some(existing)=session.pending.get(&request.operation_id){
                if serde_json::to_value(&existing.request).unwrap()!=serde_json::to_value(&request).unwrap(){return Err("Proposal ID reused with different content".into());}
                return Ok(json!({"status":"pending-owner-review","operationId":request.operation_id}));
            }
            if session.pending.len()>=10 || session.outcomes.len()+session.pending.len()>=100 {return Err("Local review queue is full; revoke and start a new session".into());}
            let preview=session.agent.preview(runtime,&token,&request)?;
            let id=request.operation_id.clone();
            session.fingerprints.insert(id.clone(),fingerprint);
            session.pending.insert(id.clone(),Proposal{request,preview});
            Ok(json!({"status":"pending-owner-review","operationId":id}))
        }
    }
}

// Only Tauri's trusted local UI calls this. The socket exposes no approval method.
pub(super) fn review(runtime:&DrawRuntime, id:&str, approve:bool)->Result<Value,String> {
    let mut access=runtime.agent_access.lock().map_err(|e|e.to_string())?;
    let session=access.session.as_mut().ok_or("No local grant")?;
    if let Some(outcome)=session.outcomes.get(id){return Ok(outcome.clone());}
    let proposal=session.pending.remove(id).ok_or("Proposal not found")?;
    let result=if approve {session.agent.edit(runtime,&session.token,proposal.request)}else{Ok(json!({"status":"rejected","operationId":id}))};
    let outcome=match result {Ok(value)=>json!({"status":value["status"],"operationId":id,"revision":value["revision"],"receipt":value["receipt"]}),Err(error)=>json!({"status":"conflict","operationId":id,"error":error})};
    session.outcomes.insert(id.into(),outcome.clone());
    Ok(outcome)
}

#[cfg(test)] mod tests {
    use super::*;
    fn setup()->(Arc<DrawRuntime>,String){
        let runtime=Arc::new(host_batch::tests::runtime());
        {
            let mut state=runtime.host.lock().unwrap();state.document["objects"]=json!([{"kind":"note","id":"note","createdAt":"2026-10-08T00:00:00Z","x":0,"y":0,"width":100,"height":100,"text":"before"}]);
        }
        let id=runtime.host.lock().unwrap().document["id"].as_str().unwrap().to_string();
        let result=start(&runtime,vec!["note".into()],&id,0).unwrap();(runtime,result["token"].as_str().unwrap().into())
    }
    fn proposal(runtime:&DrawRuntime,token:&str)->Request {
        let state=runtime.host.lock().unwrap();let mut object=state.document["objects"][0].clone();object["text"]=json!("proposed");
        Request::Propose{token:token.into(),request:host_batch::HostBatch{session_id:state.session_id.clone(),document_id:state.document["id"].as_str().unwrap().into(),expected_revision:state.revision,operation_id:"mac-batch-reviewed".into(),operations:vec![CanvasOperation::PutObject{object}]}}
    }
    #[test] fn proposal_cannot_commit_until_review_and_revocation_closes_authority(){
        let(runtime,token)=setup();let request=proposal(&runtime,&token);dispatch(&runtime,request.clone()).unwrap();
        assert_eq!(runtime.host.lock().unwrap().revision,0);
        assert!(dispatch(&runtime,Request::Inspect{token:"wrong".into()}).is_err());
        let result=review(&runtime,"mac-batch-reviewed",true).unwrap();assert_eq!(result["status"],"applied");
        assert_eq!(dispatch(&runtime,request).unwrap()["status"],"applied");
        assert!(dispatch(&runtime,proposal(&runtime,&token)).unwrap_err().contains("ID reused"));
        assert_eq!(runtime.host.lock().unwrap().document["objects"][0]["text"],"proposed");
        assert_eq!(runtime.host.lock().unwrap().history_status()["canUndo"],true);
        assert!(!fs::read_to_string(&runtime.state_path).unwrap().contains(&token));
        revoke(&runtime).unwrap();assert!(dispatch(&runtime,Request::Inspect{token}).is_err());
    }
    #[test] fn rejected_and_stale_proposals_do_not_write(){
        let(runtime,token)=setup();dispatch(&runtime,proposal(&runtime,&token)).unwrap();
        runtime.host.lock().unwrap().revision+=1;
        assert_eq!(review(&runtime,"mac-batch-reviewed",true).unwrap()["status"],"conflict");
        assert_eq!(runtime.host.lock().unwrap().document["objects"][0]["text"],"before");
        revoke(&runtime).unwrap();
    }
    #[test] fn denial_and_pending_limit_never_mutate_document(){
        let(runtime,token)=setup();
        for index in 0..10 {
            let Request::Propose{mut request,..}=proposal(&runtime,&token) else {panic!("fixture")};request.operation_id=format!("mac-batch-queued-{index}");
            dispatch(&runtime,Request::Propose{token:token.clone(),request}).unwrap();
        }
        assert!(dispatch(&runtime,proposal(&runtime,&token)).unwrap_err().contains("queue is full"));
        assert_eq!(review(&runtime,"mac-batch-queued-0",false).unwrap()["status"],"rejected");
        assert_eq!(runtime.host.lock().unwrap().revision,0);revoke(&runtime).unwrap();
    }
    #[test] fn replacement_rotates_epoch_even_when_canvas_id_is_unchanged(){
        let(runtime,token)=setup();let mut document=runtime.host.lock().unwrap().document.clone();document["title"]=json!("imported");
        replace_host_document(&runtime,document,"import".into(),0).unwrap();
        assert!(dispatch(&runtime,Request::Inspect{token}).unwrap_err().contains("replaced"));
        assert_eq!(status(&runtime).unwrap()["active"],false);revoke(&runtime).unwrap();
    }
    #[test] fn stdio_mcp_companion_reads_native_socket_without_provider_registration(){
        use std::process::{Command,Stdio};
        let(runtime,token)=setup();let path=status(&runtime).unwrap()["socketPath"].as_str().unwrap().to_string();
        let script=Path::new(env!("CARGO_MANIFEST_DIR")).join("../../../packages/mapping-canvas/offline-agent/native-client.mjs");
        let mut child=Command::new("node").arg(script).arg("--socket").arg(path).env("DRAW_AGENT_TOKEN",&token).stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped()).spawn().unwrap();
        let mut stdin=child.stdin.take().unwrap();
        writeln!(stdin,"{}",json!({"jsonrpc":"2.0","id":1,"method":"tools/list"})).unwrap();
        writeln!(stdin,"{}",json!({"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"draw_native_inspect","arguments":{}}})).unwrap();
        let Request::Propose{request,..}=proposal(&runtime,&token) else {panic!("invalid fixture")};
        writeln!(stdin,"{}",json!({"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"draw_native_propose","arguments":{"request":request}}})).unwrap();
        writeln!(stdin,"{}",json!({"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"draw_native_proposal_status","arguments":{"operationId":"mac-batch-reviewed"}}})).unwrap();drop(stdin);
        let output=child.wait_with_output().unwrap();assert!(output.status.success(),"{}",String::from_utf8_lossy(&output.stderr));
        let lines=String::from_utf8(output.stdout).unwrap();let responses=lines.lines().map(|l|serde_json::from_str::<Value>(l).unwrap()).collect::<Vec<_>>();
        assert_eq!(responses[0]["result"]["tools"].as_array().unwrap().len(),3);
        assert_ne!(responses[1]["result"]["isError"],true);
        let snapshot:Value=serde_json::from_str(responses[1]["result"]["content"][0]["text"].as_str().unwrap()).unwrap();
        assert_eq!(snapshot["document"]["objects"][0]["text"],"before");
        for response in &responses[2..] {assert_ne!(response["result"]["isError"],true);let value:Value=serde_json::from_str(response["result"]["content"][0]["text"].as_str().unwrap()).unwrap();assert_eq!(value["status"],"pending-owner-review");}
        assert_eq!(runtime.host.lock().unwrap().revision,0);
        assert_eq!(review(&runtime,"mac-batch-reviewed",true).unwrap()["status"],"applied");revoke(&runtime).unwrap();
    }
    #[test] fn real_unix_transport_is_private_bounded_and_proposal_only(){
        let(runtime,token)=setup();let path=status(&runtime).unwrap()["socketPath"].as_str().unwrap().to_string();
        assert_eq!(fs::metadata(&path).unwrap().permissions().mode()&0o777,0o600);
        let mut stream=UnixStream::connect(&path).unwrap();stream.set_read_timeout(Some(Duration::from_secs(3))).unwrap();
        writeln!(stream,"{}",json!({"method":"inspect","token":token})).unwrap();let mut response=String::new();BufReader::new(stream).read_line(&mut response).unwrap();
        assert_eq!(serde_json::from_str::<Value>(&response).unwrap()["result"]["revision"],0);
        let mut stream=UnixStream::connect(&path).unwrap();writeln!(stream,"{}",json!({"method":"approve","token":token})).unwrap();response.clear();BufReader::new(stream).read_line(&mut response).unwrap();
        assert!(serde_json::from_str::<Value>(&response).unwrap().get("error").is_some());
        let mut stream=UnixStream::connect(&path).unwrap();stream.set_read_timeout(Some(Duration::from_secs(3))).unwrap();
        // Darwin may close an oversized sender before write_all returns. Both
        // an explicit size error and a closed connection are fail-closed results.
        match stream.write_all(&vec![b'x';2*1024*1024+1]) {
            Ok(())=>{response.clear();match BufReader::new(stream).read_line(&mut response) {
                Ok(0)=>{},
                Ok(_)=>assert!(serde_json::from_str::<Value>(&response).unwrap()["error"].as_str().unwrap().contains("size")),
                Err(e)=>assert!(matches!(e.kind(),std::io::ErrorKind::ConnectionReset|std::io::ErrorKind::NotConnected)),
            }},
            Err(e)=>assert!(matches!(e.kind(),std::io::ErrorKind::BrokenPipe|std::io::ErrorKind::ConnectionReset|std::io::ErrorKind::NotConnected)),
        }
        assert_eq!(runtime.host.lock().unwrap().revision,0);
        revoke(&runtime).unwrap();assert!(!Path::new(&path).exists());
    }
}
