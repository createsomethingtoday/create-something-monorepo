//! Discoverable Instagram tools. Agents can prepare and request; only the app's
//! human review surface may publish or continue a prepared publication.
use serde_json::{json, Value};
use std::path::Path;

const TOOLS: [(&str,&str,bool,&str);10]=[
    ("gigi_instagram_drafts_list","social.list",true,"List up to 50 local Instagram drafts, including revision, pending approval and publish state. Use nextOffset for more."),
    ("gigi_instagram_draft_get","social.get",true,"Read one local Instagram draft and its exact revision, content, approval request and publish receipt."),
    ("gigi_instagram_draft_create","social.save",false,"Create an incomplete or complete local draft. Saving never publishes. Keep requestId unchanged when retrying identical content after a lost response."),
    ("gigi_instagram_draft_save_status","social.saveStatus",true,"Read the durable receipt for an exact local draft save request UUID. Returns saved plus the original draft result, or unknown if no completed receipt exists. Never retries or writes. Absence is not proof the save did not run."),
    ("gigi_instagram_draft_update","social.save",false,"Replace the editable fields of a saved local draft using its exact expectedRevision. Send the complete body from draft_get with your changes. Publishing attempts cannot be edited. Retry only the identical requestId and payload."),
    ("gigi_instagram_media_validate","social.validateMedia",true,"Read and validate one public HTTPS JPEG from the configured approved host. Returns its SHA-256 and dimensions, not image bytes. No local upload or publication. Save the digest with the draft; the user must review the exact image in GiGi."),
    ("gigi_instagram_connection_status","social.connectionStatus",true,"Read existing Instagram connection and Business/Creator identity. Does not sign in, start OAuth, grant permissions or prove publishing permission. May refresh the existing GiGi source session. A blocked or unavailable result is not a disconnected account."),
    ("gigi_instagram_request_publication_approval","social.requestApproval",false,"Record a request for the user to review an exact saved draft revision and verified Instagram account in GiGi. This NEVER publishes or approves. The user must open Instagram drafts, load its verified image, then confirm Review & publish. Reuse requestId for exact retries."),
    ("gigi_instagram_approval_status","social.approvalStatus",true,"Read the requested approval: pending_user_approval, stale, publishing, unknown, not_published, published_unverified or published. Only published is provider-verified success. Polling never executes or continues a publication."),
    ("gigi_instagram_publish_receipt","social.receipt",true,"Read/reconcile an existing publication attempt by draft ID. Does not retry or continue publishing. Unknown is not success or permission to create another attempt. Only published confirms provider readback."),
];
pub fn handles(name:&str)->bool{TOOLS.iter().any(|tool|tool.0==name)}
fn fields(name:&str)->(&'static[&'static str],&'static[&'static str]){
    match name{
        "gigi_instagram_drafts_list"=>(&["workspaceId"],&["offset"]),
        "gigi_instagram_draft_get"|"gigi_instagram_publish_receipt"=>(&["workspaceId","id"],&[]),
        "gigi_instagram_draft_create"=>(&["workspaceId","requestId","title"],&["caption","imageUrl","connectedAccountId","expectedImageSha256"]),
        "gigi_instagram_draft_update"=>(&["workspaceId","requestId","id","expectedRevision","title","caption","imageUrl","connectedAccountId","expectedImageSha256"],&[]),
        "gigi_instagram_media_validate"=>(&["workspaceId","imageUrl"],&[]),
        "gigi_instagram_connection_status"=>(&["workspaceId"],&[]),
        "gigi_instagram_request_publication_approval"=>(&["workspaceId","requestId","id","expectedRevision","expectedInstagramAccountId"],&[]),
        "gigi_instagram_approval_status"|"gigi_instagram_draft_save_status"=>(&["workspaceId","requestId"],&[]),
        _=>(&[],&[])
    }
}
fn schema(name:&str)->Value{
    let(required,optional)=fields(name);let mut properties=serde_json::Map::new();
    for key in required.iter().chain(optional){
        let value=match *key{
            "offset"=>json!({"type":"integer","minimum":0,"maximum":100000}),
            "expectedRevision"=>json!({"type":"integer","minimum":1}),
            "requestId"=>json!({"type":"string","format":"uuid","description":"Stable UUID for this exact request. Reuse only for an identical retry."}),
            "expectedImageSha256"=>json!({"type":"string","description":"SHA-256 returned by media_validate for this exact URL; empty for an incomplete draft. Any URL change requires fresh validation."}),
            "title"=>json!({"type":"string","minLength":1,"maxLength":200}),
            "caption"=>json!({"type":"string","maxLength":2200}),
            "connectedAccountId"=>json!({"type":"string","maxLength":200,"description":"Existing verified connection ID, or empty for an incomplete local draft."}),
            "imageUrl"=>json!({"type":"string","maxLength":2048}),
            _=>json!({"type":"string","minLength":1,"maxLength":512})
        };properties.insert((*key).into(),value);
    }
    json!({"type":"object","properties":properties,"required":required,"additionalProperties":false})
}
pub fn catalog()->Vec<Value>{TOOLS.iter().map(|(name,_,read,description)|json!({"name":name,"description":description,"inputSchema":schema(name),"annotations":{"readOnlyHint":*read&&!name.contains("connection")&&!name.contains("media_validate")&&!name.contains("receipt"),"destructiveHint":false,"openWorldHint":name.contains("connection")||name.contains("media_validate")||name.contains("publication")||name.contains("receipt")}})).collect()}
pub fn dispatch(resources:&Path,root:&Path,name:&str,input:Value)->Result<Value,String>{
    dispatch_with(root,name,input,|operation,input|crate::integrations::dispatch(resources,root,operation,input))
}
fn dispatch_with<F>(root:&Path,name:&str,input:Value,broker:F)->Result<Value,String> where F:Fn(&str,Value)->Result<Value,String>{
    let(_,operation,_,_)=TOOLS.iter().find(|tool|tool.0==name).ok_or("Unknown Instagram tool")?;
    let(required,optional)=fields(name);let object=input.as_object().ok_or("Arguments must be an object")?;
    for key in object.keys(){if !required.contains(&key.as_str())&&!optional.contains(&key.as_str()){return Err(format!("Unsupported argument: {key}"))}}
    for key in required{if !object.contains_key(*key){return Err(format!("{key} is required"))}}
    for(key,value)in object{
        if ["offset","expectedRevision"].contains(&key.as_str()){
            let n=value.as_u64().ok_or_else(||format!("{key} must be a nonnegative integer"))?;
            if key=="expectedRevision"&&n==0||key=="offset"&&n>100000{return Err(format!("{key} is out of range"))}
        }else if !value.is_string(){return Err(format!("{key} must be a string"))}
    }
    crate::social::dispatch_with(root,operation,input,broker)
}

#[cfg(test)]mod tests{
    use super::*;use uuid::Uuid;
    fn setup()->(std::path::PathBuf,String){let root=std::env::temp_dir().join(format!("gigi-instagram-mcp-{}",Uuid::new_v4()));let workspace=crate::domain::dispatch(&root,"workspace.create",json!({"name":"Synthetic"})).unwrap();(root,workspace["id"].as_str().unwrap().into())}
    fn account()->Value{json!({"connectedAccountId":"ca_synthetic","instagramAccountId":"1784","username":"synthetic","accountType":"BUSINESS","publishingPermission":"not_verified"})}
    fn fixture()->impl Fn(&str,Value)->Result<Value,String>{|operation,input|match operation{
        "instagram.preview"=>Ok(json!({"imageUrl":input["imageUrl"],"expectedImageSha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","width":1080,"height":1080,"dataUrl":"data:image/jpeg;base64,/9j/"})),
        "connections.status"=>Ok(json!({"provider":"instagram","state":"connected","connectedAccountId":"ca_synthetic"})),
        "instagram.account"=>Ok(account()),
        "instagram.publish"=>Ok(json!({"requestId":input["requestId"],"state":"published","mediaId":"synthetic-post","permalink":"https://www.instagram.com/p/synthetic/"})),
        _=>Err("unavailable".into())}}
    fn create(root:&Path,w:&str)->Value{dispatch_with(root,"gigi_instagram_draft_create",json!({"workspaceId":w,"requestId":Uuid::new_v4().to_string(),"title":"Studio release","caption":"A new work","imageUrl":"https://media.createsomething.io/synthetic.jpg","connectedAccountId":"ca_synthetic","expectedImageSha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}),|_,_|panic!("local draft must not contact provider")).unwrap()}
    #[test]fn catalog_is_typed_and_exposes_no_publish_or_consent_bypass(){
        assert_eq!(catalog().len(),10);for tool in catalog(){assert_eq!(tool["inputSchema"]["additionalProperties"],false);assert!(tool["inputSchema"]["required"].as_array().unwrap().contains(&json!("workspaceId")));}
        let(root,w)=setup();assert!(dispatch_with(&root,"social.publish",json!({"workspaceId":w}),|_,_|panic!()).is_err());
        assert!(dispatch_with(&root,"gigi_instagram_request_publication_approval",json!({"workspaceId":w,"confirmed":true}),|_,_|panic!()).is_err());
        assert!(dispatch_with(&root,"gigi_instagram_publish_receipt",json!({"workspaceId":w,"id":"x","continueConfirmed":true}),|_,_|panic!()).is_err());
        std::fs::remove_dir_all(root).unwrap();
    }
    #[test]fn full_prepare_request_human_approval_result_and_idempotency(){
        let(root,w)=setup();let draft=create(&root,&w);
        let validation=dispatch_with(&root,"gigi_instagram_media_validate",json!({"workspaceId":w,"imageUrl":draft["body"]["imageUrl"]}),fixture()).unwrap();assert_eq!(validation["state"],"validated");assert!(validation.get("dataUrl").is_none());
        let connection=dispatch_with(&root,"gigi_instagram_connection_status",json!({"workspaceId":w}),fixture()).unwrap();assert_eq!(connection["account"]["instagramAccountId"],"1784");
        let request=json!({"workspaceId":w,"id":draft["id"],"requestId":Uuid::new_v4().to_string(),"expectedRevision":1,"expectedInstagramAccountId":"1784"});
        let pending=dispatch_with(&root,"gigi_instagram_request_publication_approval",request.clone(),fixture()).unwrap();assert_eq!(pending["state"],"pending_user_approval");assert!(pending["receipt"].is_null());
        assert_eq!(dispatch_with(&root,"gigi_instagram_request_publication_approval",request.clone(),|_,_|panic!("duplicate request must remain local")).unwrap(),pending);
        let publication=crate::social::dispatch_with(&root,"social.publish",json!({"workspaceId":w,"id":draft["id"],"expectedRevision":1,"expectedInstagramAccountId":"1784","approvalRequestId":request["requestId"],"confirmed":true}),fixture()).unwrap();assert_eq!(publication["state"],"published");
        let receipt=dispatch_with(&root,"gigi_instagram_approval_status",json!({"workspaceId":w,"requestId":request["requestId"]}),|_,_|panic!()).unwrap();assert_eq!(receipt["state"],"published");assert_eq!(receipt["receipt"]["mediaId"],"synthetic-post");
        assert_eq!(dispatch_with(&root,"gigi_instagram_request_publication_approval",request,|_,_|panic!("retry must not publish")).unwrap()["state"],"published");
        std::fs::remove_dir_all(root).unwrap();
    }
    #[test]fn changed_draft_invalidates_pending_approval_before_provider_write(){
        let(root,w)=setup();let draft=create(&root,&w);let request=json!({"workspaceId":w,"id":draft["id"],"requestId":Uuid::new_v4().to_string(),"expectedRevision":1,"expectedInstagramAccountId":"1784"});
        dispatch_with(&root,"gigi_instagram_request_publication_approval",request.clone(),fixture()).unwrap();
        let mut update=draft["body"].clone();update["workspaceId"]=json!(w);update["id"]=draft["id"].clone();update["requestId"]=json!(Uuid::new_v4().to_string());update["expectedRevision"]=json!(1);update["caption"]=json!("Changed caption");
        dispatch_with(&root,"gigi_instagram_draft_update",update.clone(),|_,_|panic!()).unwrap();assert!(dispatch_with(&root,"gigi_instagram_draft_update",{update["requestId"]=json!(Uuid::new_v4().to_string());update},|_,_|panic!()).is_err());
        assert_eq!(dispatch_with(&root,"gigi_instagram_approval_status",json!({"workspaceId":w,"requestId":request["requestId"]}),|_,_|panic!()).unwrap()["state"],"stale");
        assert!(crate::social::dispatch_with(&root,"social.publish",json!({"workspaceId":w,"id":draft["id"],"expectedRevision":2,"expectedInstagramAccountId":"1784","approvalRequestId":request["requestId"],"confirmed":true}),|_,_|panic!("stale approval must not contact provider")).is_err());
        std::fs::remove_dir_all(root).unwrap();
    }
    #[test]fn unknown_receipt_is_truthful_and_polling_never_continues_publication(){
        let(root,w)=setup();let draft=create(&root,&w);let request=json!({"workspaceId":w,"id":draft["id"],"requestId":Uuid::new_v4().to_string(),"expectedRevision":1,"expectedInstagramAccountId":"1784"});
        dispatch_with(&root,"gigi_instagram_request_publication_approval",request.clone(),fixture()).unwrap();
        let publication=crate::social::dispatch_with(&root,"social.publish",json!({"workspaceId":w,"id":draft["id"],"expectedRevision":1,"expectedInstagramAccountId":"1784","approvalRequestId":request["requestId"],"confirmed":true}),|operation,_|if operation=="instagram.account"{Ok(account())}else{Err("timeout".into())}).unwrap();assert_eq!(publication["state"],"unknown");
        let receipt=dispatch_with(&root,"gigi_instagram_publish_receipt",json!({"workspaceId":w,"id":draft["id"]}),|operation,input|{assert_eq!(operation,"instagram.receipt");assert_eq!(input["continueConfirmed"],false);Ok(json!({"requestId":input["requestId"],"state":"unknown","reason":"container_processing"}))}).unwrap();assert_eq!(receipt["state"],"unknown");
        assert_eq!(dispatch_with(&root,"gigi_instagram_approval_status",json!({"workspaceId":w,"requestId":request["requestId"]}),|_,_|panic!()).unwrap()["state"],"unknown");
        assert!(crate::social::dispatch_with(&root,"social.publish",json!({"workspaceId":w,"id":draft["id"],"expectedRevision":1,"expectedInstagramAccountId":"1784","confirmed":true}),|_,_|panic!("must not retry")).is_err());
        let incomplete=dispatch_with(&root,"gigi_instagram_draft_create",json!({"workspaceId":w,"requestId":Uuid::new_v4().to_string(),"title":"Idea"}),|_,_|panic!()).unwrap();
        assert!(dispatch_with(&root,"gigi_instagram_request_publication_approval",json!({"workspaceId":w,"id":incomplete["id"],"expectedRevision":1,"requestId":Uuid::new_v4().to_string(),"expectedInstagramAccountId":"1784"}),|_,_|panic!("incomplete draft must be rejected locally")).is_err());
        std::fs::remove_dir_all(root).unwrap();
    }
    #[test]fn save_status_reads_exact_receipt_without_mutation_and_is_workspace_scoped(){
        let(root,w)=setup();let request=json!({"workspaceId":w,"requestId":Uuid::new_v4().to_string(),"title":"Original title"});
        let read=|workspace:&str|json!({"workspaceId":workspace,"requestId":request["requestId"]});
        assert_eq!(dispatch_with(&root,"gigi_instagram_draft_save_status",read(&w),|_,_|panic!("lookup must be local")).unwrap()["state"],"unknown");
        assert_eq!(dispatch_with(&root,"gigi_instagram_drafts_list",json!({"workspaceId":w}),|_,_|panic!()).unwrap()["total"],0);
        let saved=dispatch_with(&root,"gigi_instagram_draft_create",request.clone(),|_,_|panic!()).unwrap();
        let mut update=saved["body"].clone();update["workspaceId"]=json!(w);update["id"]=saved["id"].clone();update["expectedRevision"]=json!(1);update["requestId"]=json!(Uuid::new_v4().to_string());update["title"]=json!("Later title");
        let newer=dispatch_with(&root,"gigi_instagram_draft_update",update.clone(),|_,_|panic!()).unwrap();
        assert_eq!(dispatch_with(&root,"gigi_instagram_draft_save_status",read(&w),|_,_|panic!()).unwrap()["draft"],saved);
        assert_eq!(dispatch_with(&root,"gigi_instagram_draft_save_status",json!({"workspaceId":w,"requestId":update["requestId"]}),|_,_|panic!()).unwrap()["draft"],newer);
        let other=Uuid::new_v4().to_string();crate::domain::open(&root).unwrap().execute("INSERT INTO workspaces(id,name) VALUES(?1,'Other')",[&other]).unwrap();
        assert_eq!(dispatch_with(&root,"gigi_instagram_draft_save_status",read(&other),|_,_|panic!()).unwrap()["state"],"unknown");
        assert!(dispatch_with(&root,"gigi_instagram_draft_save_status",json!({"workspaceId":w,"requestId":"invalid"}),|_,_|panic!()).is_err());
        assert!(dispatch_with(&root,"gigi_instagram_draft_save_status",json!({"workspaceId":"missing","requestId":request["requestId"]}),|_,_|panic!()).is_err());
        std::fs::remove_dir_all(root).unwrap();
    }
    #[test]fn failed_connection_is_error_not_false_disconnected_success(){let(root,w)=setup();assert_eq!(dispatch_with(&root,"gigi_instagram_connection_status",json!({"workspaceId":w}),|_,_|Err("reauthentication_required".into())).unwrap_err(),"reauthentication_required");std::fs::remove_dir_all(root).unwrap();}
}
