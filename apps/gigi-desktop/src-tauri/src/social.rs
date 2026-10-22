//! Local Instagram drafts. Saving is local; publishing is an explicit, durable
//! transition of one exact revision. An uncertain request is never replayed.
use rusqlite::{params, Connection, OptionalExtension, TransactionBehavior};
use serde_json::{json, Value};
use std::path::Path;
use uuid::Uuid;

fn text<'a>(value: &'a Value,key:&str)->Result<&'a str,String>{value[key].as_str().filter(|s|!s.trim().is_empty()).ok_or_else(||format!("{key} is required"))}
fn open(root:&Path)->Result<Connection,String>{
    let db=crate::domain::open(root)?;
    db.execute_batch("CREATE TABLE IF NOT EXISTS instagram_drafts (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id), revision INTEGER NOT NULL, body_json TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'draft', request_id TEXT, receipt_json TEXT, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP); CREATE INDEX IF NOT EXISTS idx_instagram_drafts_workspace ON instagram_drafts(workspace_id,updated_at,id);
CREATE TABLE IF NOT EXISTS instagram_approval_requests (id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id),draft_id TEXT NOT NULL REFERENCES instagram_drafts(id),revision INTEGER NOT NULL,body_json TEXT NOT NULL,instagram_account_id TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_instagram_approval_draft ON instagram_approval_requests(workspace_id,draft_id,created_at);").map_err(|e|e.to_string())?;
    Ok(db)
}
fn workspace(db:&Connection,input:&Value)->Result<String,String>{let id=text(input,"workspaceId")?; if db.query_row("SELECT 1 FROM workspaces WHERE id=?1",[id],|r|r.get::<_,i32>(0)).optional().map_err(|e|e.to_string())?.is_none(){return Err("Select an existing workspace".into())}Ok(id.into())}
fn get(db:&Connection,workspace:&str,id:&str)->Result<Value,String>{
    let mut draft=db.query_row("SELECT revision,body_json,state,request_id,receipt_json,updated_at FROM instagram_drafts WHERE workspace_id=?1 AND id=?2",params![workspace,id],|r|Ok((r.get::<_,i64>(0)?,r.get::<_,String>(1)?,r.get::<_,String>(2)?,r.get::<_,Option<String>>(3)?,r.get::<_,Option<String>>(4)?,r.get::<_,String>(5)?)))
        .optional().map_err(|e|e.to_string())?.map(|(revision,body,state,request,receipt,updated)|json!({"id":id,"revision":revision,"body":serde_json::from_str::<Value>(&body).unwrap_or(Value::Null),"state":state,"requestId":request,"receipt":receipt.and_then(|r|serde_json::from_str::<Value>(&r).ok()),"updatedAt":updated})).ok_or_else(||"Draft not found in this workspace".to_string())?;
    if let Some(snapshot)=draft["body"].as_object_mut().and_then(|body|body.remove("imageSnapshot")){draft["imageSnapshot"]=snapshot;draft["mediaState"]=json!("local_preview_only");}
    let request:Option<(String,i64,String)>=db.query_row("SELECT id,revision,instagram_account_id FROM instagram_approval_requests WHERE workspace_id=?1 AND draft_id=?2 ORDER BY rowid DESC LIMIT 1",params![workspace,id],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?))).optional().map_err(|e|e.to_string())?;
    draft["approvalRequest"]=request.map(|(id,revision,account)|json!({"id":id,"revision":revision,"instagramAccountId":account,"state":if draft["revision"]!=revision{"stale"}else if draft["state"]=="draft"{"pending_user_approval"}else{"publication_attempted"}})).unwrap_or(Value::Null);
    Ok(draft)
}
fn body(db:&Connection,workspace:&str,input:&Value)->Result<Value,String>{
    let title=input["title"].as_str().unwrap_or("").trim(); let caption=input["caption"].as_str().unwrap_or("");
    let image=input["imageUrl"].as_str().unwrap_or("").trim();
    if title.is_empty() || title.chars().count()>200{return Err("Use a draft title of 1–200 characters".into())}
    if caption.encode_utf16().count()>2200{return Err("Caption exceeds 2,200 characters".into())}
    if image.len()>2048{return Err("Image URL is too long".into())}
    let account=input["connectedAccountId"].as_str().unwrap_or("");
    if account.len()>200{return Err("Invalid account".into())}
    let digest=input["expectedImageSha256"].as_str().unwrap_or("");
    if !digest.is_empty() && (digest.len()!=64 || !digest.bytes().all(|c|c.is_ascii_hexdigit()&&!c.is_ascii_uppercase())){return Err("Invalid image verification".into())}
    let mut result=json!({"title":title,"caption":caption,"imageUrl":image,"connectedAccountId":account,"expectedImageSha256":digest});
    if let Some(id)=input["imageAssetId"].as_str().filter(|s|!s.is_empty()) {
        if !image.is_empty()||!digest.is_empty(){return Err("Choose local artwork or a public JPEG URL for this draft".into())}
        let alt=text(input,"imageAlt")?;if alt.chars().count()>500{return Err("Describe local artwork in at most 500 characters".into())}
        let mut snapshot=crate::artwork::asset(db,workspace,id)?;
        snapshot["alt"]=json!(alt);result["imageAssetId"]=json!(id);result["imageAlt"]=json!(alt);result["imageSnapshot"]=snapshot;
    }
    Ok(result)
}
/// Broker validates DNS/private destinations and JPEG requirements again.
fn publishable(body:&Value)->Result<(),String>{
    if body["imageAssetId"].as_str().is_some_and(|s|!s.is_empty()){return Err("This local artwork is saved for draft preview only and is not available for publishing".into())}
    let image=text(body,"imageUrl")?;
    if !image.starts_with("https://") || image.contains('@') || image.chars().any(char::is_whitespace){return Err("Publishing needs a public HTTPS JPEG image URL".into())}
    text(body,"connectedAccountId")?;
    if text(body,"expectedImageSha256")?.len()!=64{return Err("Load and save the verified JPEG preview before publishing".into())}
    Ok(())
}

pub fn dispatch(resources:&Path,root:&Path,operation:&str,input:Value)->Result<Value,String>{
    dispatch_with(root,operation,input,|operation,input|crate::integrations::dispatch(resources,root,operation,input))
}
pub(crate) fn dispatch_with<F>(root:&Path,operation:&str,input:Value,broker:F)->Result<Value,String> where F:Fn(&str,Value)->Result<Value,String>{
    let mut db=open(root)?; let workspace=workspace(&db,&input)?;
    match operation{
        "social.list"=>{
            let offset=input["offset"].as_u64().unwrap_or(0).min(100000) as i64;
            let mut statement=db.prepare("SELECT id FROM instagram_drafts WHERE workspace_id=?1 ORDER BY updated_at DESC,id LIMIT 50 OFFSET ?2").map_err(|e|e.to_string())?;
            let ids=statement.query_map(params![workspace,offset],|r|r.get::<_,String>(0)).map_err(|e|e.to_string())?.collect::<Result<Vec<_>,_>>().map_err(|e|e.to_string())?;
            let items=ids.iter().map(|id|get(&db,&workspace,id)).collect::<Result<Vec<_>,_>>()?;
            let count:i64=db.query_row("SELECT COUNT(*) FROM instagram_drafts WHERE workspace_id=?1",[&workspace],|r|r.get(0)).map_err(|e|e.to_string())?;
            Ok(json!({"items":items,"total":count,"nextOffset":if offset+50<count{Some(offset+50)}else{None}}))
        },
        "social.get"=>get(&db,&workspace,text(&input,"id")?),
        "social.saveStatus"=>{
            let request_id=text(&input,"requestId")?;
            Uuid::parse_str(request_id).map_err(|_|"Invalid save request ID")?;
            let result:Option<String>=db.query_row("SELECT result_json FROM mutation_receipts WHERE workspace_id=?1 AND operation='social.save' AND idempotency_key=?2",params![workspace,request_id],|r|r.get(0)).optional().map_err(|e|e.to_string())?;
            match result {
                Some(result)=>Ok(json!({"requestId":request_id,"state":"saved","draft":serde_json::from_str::<Value>(&result).map_err(|_|"Invalid saved receipt")?})),
                None=>Ok(json!({"requestId":request_id,"state":"unknown","draft":null,"instruction":"No completed save receipt was found. This does not prove the save did not run; do not create a replacement or retry with a new request ID."}))
            }
        },
        "social.save"=>{
            let data=body(&db,&workspace,&input)?;
            let request_id=text(&input,"requestId")?;
            Uuid::parse_str(request_id).map_err(|_|"Invalid save request ID")?;
            let request_json=input.to_string();
            let tx=db.transaction_with_behavior(TransactionBehavior::Immediate).map_err(|e|e.to_string())?;
            let previous:Option<(String,String)>=tx.query_row("SELECT request_json,result_json FROM mutation_receipts WHERE workspace_id=?1 AND operation='social.save' AND idempotency_key=?2",params![workspace,request_id],|r|Ok((r.get(0)?,r.get(1)?))).optional().map_err(|e|e.to_string())?;
            if let Some((original,result))=previous {if original!=request_json{return Err("Save request changed; check the saved draft before trying again".into())}return serde_json::from_str(&result).map_err(|_|"Invalid saved receipt".into())}
            let id=input["id"].as_str().map(String::from).unwrap_or_else(||Uuid::new_v4().to_string());
            if input["id"].is_string(){
                let old=get(&tx,&workspace,&id)?;
                if old["state"]!="draft"{return Err("This draft has a publishing attempt. Duplicate it deliberately to create a new post.".into())}
                if old["revision"]!=input["expectedRevision"]{return Err("Draft changed. Reload before saving.".into())}
                tx.execute("UPDATE instagram_drafts SET body_json=?1,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=?2 AND workspace_id=?3",params![data.to_string(),id,workspace]).map_err(|e|e.to_string())?;
            }else{
                tx.execute("INSERT INTO instagram_drafts(id,workspace_id,revision,body_json) VALUES(?1,?2,1,?3)",params![id,workspace,data.to_string()]).map_err(|e|e.to_string())?;
            }
            let result=get(&tx,&workspace,&id)?;
            tx.execute("INSERT INTO mutation_receipts(workspace_id,operation,idempotency_key,request_json,result_json) VALUES(?1,'social.save',?2,?3,?4)",params![workspace,request_id,request_json,result.to_string()]).map_err(|e|e.to_string())?;
            tx.commit().map_err(|e|e.to_string())?;Ok(result)
        },
        "social.validateMedia"=>{
            let image_url=text(&input,"imageUrl")?;
            let preview=broker("instagram.preview",json!({"imageUrl":image_url}))?;
            let digest=text(&preview,"expectedImageSha256")?;
            if preview["imageUrl"]!=image_url || digest.len()!=64 || !digest.bytes().all(|c|c.is_ascii_hexdigit()&&!c.is_ascii_uppercase()){return Err("Image verification did not match this URL".into())}
            Ok(json!({"imageUrl":image_url,"expectedImageSha256":digest,"width":preview["width"],"height":preview["height"],"state":"validated","format":"image/jpeg","externalActionPerformed":false,"instruction":"Save this digest with the draft. The user must load the exact preview and approve in GiGi before publication."}))
        },
        "social.connectionStatus"=>{
            let status=broker("connections.status",json!({"provider":"instagram"}))?;
            if status["state"]=="connected"{
                let account=broker("instagram.account",json!({"connectedAccountId":text(&status,"connectedAccountId")?}))?;
                Ok(json!({"connection":status,"account":account,"externalActionPerformed":false}))
            }else{Ok(json!({"connection":status,"account":null,"externalActionPerformed":false}))}
        },
        "social.requestApproval"=>{
            let id=text(&input,"id")?;let request_id=text(&input,"requestId")?;
            Uuid::parse_str(request_id).map_err(|_|"Invalid approval request ID")?;
            let expected_account=text(&input,"expectedInstagramAccountId")?;
            let draft=get(&db,&workspace,id)?;
            if draft["revision"]!=input["expectedRevision"] {return Err("Draft changed. Read it again.".into())}
            publishable(&draft["body"])?;
            let existing:Option<(String,i64,String,String)>=db.query_row("SELECT draft_id,revision,body_json,instagram_account_id FROM instagram_approval_requests WHERE workspace_id=?1 AND id=?2",params![workspace,request_id],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?))).optional().map_err(|e|e.to_string())?;
            if let Some((old_id,revision,body,account))=existing{
                if old_id!=id || draft["revision"]!=revision || body!=draft["body"].to_string() || account!=expected_account{return Err("Approval request ID is bound to different content".into())}
                return approval_status(&db,&workspace,request_id);
            }
            if draft["state"]!="draft" {return Err("This draft already has a publish attempt. Check its receipt.".into())}
            let account=broker("instagram.account",json!({"connectedAccountId":draft["body"]["connectedAccountId"]}))?;
            if account["connectedAccountId"]!=draft["body"]["connectedAccountId"] || account["instagramAccountId"]!=expected_account || !["BUSINESS","MEDIA_CREATOR","CREATOR"].contains(&account["accountType"].as_str().unwrap_or("")){return Err("Verify the intended Business or Creator account before requesting approval".into())}
            let tx=db.transaction_with_behavior(TransactionBehavior::Immediate).map_err(|e|e.to_string())?;
            let current=get(&tx,&workspace,id)?;
            if current["revision"]!=draft["revision"] || current["state"]!="draft"{return Err("Draft changed while checking account".into())}
            tx.execute("INSERT INTO instagram_approval_requests(id,workspace_id,draft_id,revision,body_json,instagram_account_id) VALUES(?1,?2,?3,?4,?5,?6)",params![request_id,workspace,id,draft["revision"].as_i64(),draft["body"].to_string(),expected_account]).map_err(|e|e.to_string())?;
            tx.commit().map_err(|e|e.to_string())?;
            approval_status(&db,&workspace,request_id)
        },
        "social.approvalStatus"=>approval_status(&db,&workspace,text(&input,"requestId")?),
        "social.publish"=>{
            if input["confirmed"]!=true{return Err("Confirm this exact saved post before publishing".into())}
            let id=text(&input,"id")?;
            let draft=get(&db,&workspace,id)?;
            if draft["revision"]!=input["expectedRevision"]{return Err("Draft changed. Review its current version.".into())}
            if draft["state"]!="draft"{return Err("A publish attempt already exists. Check its receipt; do not publish again.".into())}
            publishable(&draft["body"])?;
            if let Some(request_id)=input["approvalRequestId"].as_str(){
                let approval=approval_status(&db,&workspace,request_id)?;
                if approval["draftId"]!=id || approval["revision"]!=draft["revision"] || approval["state"]!="pending_user_approval" || approval["instagramAccountId"]!=input["expectedInstagramAccountId"]{return Err("This approval request is stale or belongs to another post. Review the current draft.".into())}
            }
            // Verify provider account identity before claiming a publish attempt.
            // No provider mutation occurs in this read.
            let account=broker("instagram.account",json!({"connectedAccountId":draft["body"]["connectedAccountId"]}))?;
            if account["connectedAccountId"]!=draft["body"]["connectedAccountId"] || !["BUSINESS","MEDIA_CREATOR","CREATOR"].contains(&account["accountType"].as_str().unwrap_or("")){return Err("Instagram account identity could not be verified".into())}
            let account_id=text(&account,"instagramAccountId")?;
            if input["expectedInstagramAccountId"].as_str()!=Some(account_id){return Err("Instagram account changed. Check the account and review the post again.".into())}
            let tx=db.transaction_with_behavior(TransactionBehavior::Immediate).map_err(|e|e.to_string())?;
            let current=get(&tx,&workspace,id)?;
            if current["revision"]!=draft["revision"] || current["state"]!="draft" { return Err("Draft changed while checking Instagram. Review it again.".into()) }
            let request=Uuid::new_v4().to_string();
            tx.execute("UPDATE instagram_drafts SET state='publishing',request_id=?1,updated_at=CURRENT_TIMESTAMP WHERE workspace_id=?2 AND id=?3",params![request,workspace,id]).map_err(|e|e.to_string())?;
            tx.commit().map_err(|e|e.to_string())?;
            let receipt=broker("instagram.publish",json!({"requestId":request,"connectedAccountId":draft["body"]["connectedAccountId"],"instagramAccountId":account_id,"caption":draft["body"]["caption"],"imageUrl":draft["body"]["imageUrl"],"expectedImageSha256":draft["body"]["expectedImageSha256"],"confirmed":true})).unwrap_or_else(|error|failed_publish_receipt(&request,&error));
            store_receipt(&db,&workspace,id,&request,receipt)?;
            get(&db,&workspace,id)
        },
        "social.receipt"=>{
            let id=text(&input,"id")?;let draft=get(&db,&workspace,id)?;let request=text(&draft,"requestId")?;
            let resume=input["continueConfirmed"]==true && draft["state"]=="unknown" && draft["receipt"]["reason"]=="container_processing";
            let receipt=broker("instagram.receipt",json!({"requestId":request,"continueConfirmed":resume}))?;
            store_receipt(&db,&workspace,id,request,receipt)?;get(&db,&workspace,id)
        },
        _=>Err("Unsupported social operation".into())
    }
}
fn approval_status(db:&Connection,workspace:&str,request_id:&str)->Result<Value,String>{
    let request:Option<(String,i64,String,String)>=db.query_row("SELECT draft_id,revision,body_json,instagram_account_id FROM instagram_approval_requests WHERE workspace_id=?1 AND id=?2",params![workspace,request_id],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?))).optional().map_err(|e|e.to_string())?;
    let(id,revision,body,account)=request.ok_or("Approval request not found in this workspace")?;
    let draft=get(db,workspace,&id)?;
    let stale=draft["revision"]!=revision || draft["body"].to_string()!=body;
    Ok(json!({"requestId":request_id,"draftId":id,"revision":revision,"instagramAccountId":account,"state":if stale{"stale"}else if draft["state"]=="draft"{"pending_user_approval"}else{draft["state"].as_str().unwrap_or("unknown")},"publishRequestId":if stale{Value::Null}else{draft["requestId"].clone()},"receipt":if stale{Value::Null}else{draft["receipt"].clone()},"requiresUserAction":!stale&&draft["state"]=="draft","instruction":"Open Instagram drafts in GiGi, load the verified preview, and use Review & publish. An agent request is not permission to publish."}))
}

// Only exact broker codes known to occur before a provider mutation are safe.
// Timeouts, conflicts, readback failures and arbitrary text remain uncertain.
fn failed_publish_receipt(request:&str,error:&str)->Value{
    let definitive=matches!(error,"image_changed"|"jpeg_required"|"image_dimensions"|"media_too_large"|"media_host_not_allowed"|"media_staging_unconfigured"|"account_changed"|"account_unsupported"|"connection_unavailable"|"caption_limits"|"invalid_media_url");
    if definitive{json!({"requestId":request,"state":"not_published","reason":error})}
    else{json!({"requestId":request,"state":"unknown","reason":"connection_lost"})}
}
fn store_receipt(db:&Connection,workspace:&str,id:&str,request:&str,receipt:Value)->Result<(),String>{
    let valid=receipt["requestId"]==request && ["not_published","unknown","published_unverified","published"].contains(&receipt["state"].as_str().unwrap_or(""));
    let mut receipt=if valid{receipt}else{json!({"requestId":request,"state":"unknown","reason":"invalid_receipt"})};
    if receipt["state"]=="published" && receipt["mediaId"].as_str().filter(|s|!s.is_empty()).is_none(){receipt=json!({"requestId":request,"state":"unknown","reason":"missing_provider_id"})}
    db.execute("UPDATE instagram_drafts SET state=?1,receipt_json=?2,updated_at=CURRENT_TIMESTAMP WHERE workspace_id=?3 AND id=?4 AND request_id=?5",params![receipt["state"].as_str(),receipt.to_string(),workspace,id,request]).map_err(|e|e.to_string())?;Ok(())
}

#[cfg(test)]mod tests{
    use super::*;
    fn setup()->(std::path::PathBuf,String){let root=std::env::temp_dir().join(format!("gigi-social-test-{}",Uuid::new_v4()));let workspace=crate::domain::dispatch(&root,"workspace.create",json!({"name":"Synthetic"})).unwrap();(root,workspace["workspaceId"].as_str().or(workspace["id"].as_str()).unwrap().into())}
    #[test]fn drafts_save_locally_and_reject_stale_revision(){let(root,w)=setup();let fail=|_:&str,_:Value|->Result<Value,String>{panic!("saving must not contact provider")};let draft=dispatch_with(&root,"social.save",json!({"workspaceId":w,"requestId":Uuid::new_v4().to_string(),"title":"Studio","caption":"First idea"}),fail).unwrap();assert_eq!(draft["state"],"draft");assert!(dispatch_with(&root,"social.save",json!({"workspaceId":w,"requestId":Uuid::new_v4().to_string(),"id":draft["id"],"expectedRevision":0,"title":"Change"}),fail).is_err());std::fs::remove_dir_all(root).unwrap();}
    #[test]fn confirmation_and_unknown_outcome_block_duplicate_publish(){let(root,w)=setup();let draft=dispatch_with(&root,"social.save",json!({"workspaceId":w,"requestId":Uuid::new_v4().to_string(),"title":"Release","caption":"New work","imageUrl":"https://example.com/cover.jpg","expectedImageSha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","connectedAccountId":"ca_test"}),|_,_|panic!()).unwrap();let base=json!({"workspaceId":w,"id":draft["id"],"expectedRevision":1});assert!(dispatch_with(&root,"social.publish",base.clone(),|_,_|panic!()).is_err());let mut confirmed=base;confirmed["confirmed"]=json!(true);confirmed["expectedInstagramAccountId"]=json!("ig_test");let result=dispatch_with(&root,"social.publish",confirmed.clone(),|op,_|if op=="instagram.account"{Ok(json!({"connectedAccountId":"ca_test","instagramAccountId":"ig_test","accountType":"BUSINESS"}))}else{Err("timeout".into())}).unwrap();assert_eq!(result["state"],"unknown");assert!(dispatch_with(&root,"social.publish",confirmed,|_,_|panic!("must not replay")).is_err());std::fs::remove_dir_all(root).unwrap();}
    #[test]fn save_retry_returns_same_draft_and_rejects_changed_payload(){
        let(root,w)=setup();let input=json!({"workspaceId":w,"requestId":Uuid::new_v4().to_string(),"title":"Studio","caption":"Idea"});
        let first=dispatch_with(&root,"social.save",input.clone(),|_,_|panic!()).unwrap();
        assert_eq!(dispatch_with(&root,"social.save",input.clone(),|_,_|panic!()).unwrap(),first);
        let mut changed=input;changed["caption"]=json!("Changed");assert!(dispatch_with(&root,"social.save",changed,|_,_|panic!()).is_err());
        assert_eq!(dispatch_with(&root,"social.list",json!({"workspaceId":w}),|_,_|panic!()).unwrap()["total"],1);
        std::fs::remove_dir_all(root).unwrap();
    }
    #[test]fn changed_instagram_identity_cannot_publish(){
        let(root,w)=setup();let draft=dispatch_with(&root,"social.save",json!({"workspaceId":w,"requestId":Uuid::new_v4().to_string(),"title":"Release","imageUrl":"https://example.com/image.jpg","expectedImageSha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","connectedAccountId":"ca_test"}),|_,_|panic!()).unwrap();
        let result=dispatch_with(&root,"social.publish",json!({"workspaceId":w,"id":draft["id"],"expectedRevision":1,"confirmed":true,"expectedInstagramAccountId":"ig_expected"}),|operation,_|{assert_eq!(operation,"instagram.account");Ok(json!({"connectedAccountId":"ca_test","instagramAccountId":"ig_changed","accountType":"BUSINESS"}))});
        assert!(result.unwrap_err().contains("account changed"));
        assert_eq!(dispatch_with(&root,"social.get",json!({"workspaceId":w,"id":draft["id"]}),|_,_|panic!()).unwrap()["state"],"draft");
        std::fs::remove_dir_all(root).unwrap();
    }

    #[test]fn definitive_publish_rejections_remain_recoverable_without_unfencing_ambiguous_errors(){
        for reason in ["image_changed","jpeg_required","image_dimensions","media_too_large","media_host_not_allowed","media_staging_unconfigured","account_changed","account_unsupported","connection_unavailable","caption_limits","invalid_media_url"] {
            let(root,w)=setup();let draft=dispatch_with(&root,"social.save",json!({"workspaceId":w,"requestId":Uuid::new_v4().to_string(),"title":"Release","imageUrl":"https://example.com/image.jpg","expectedImageSha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","connectedAccountId":"ca_test"}),|_,_|panic!()).unwrap();
            let result=dispatch_with(&root,"social.publish",json!({"workspaceId":w,"id":draft["id"],"expectedRevision":1,"confirmed":true,"expectedInstagramAccountId":"1784"}),|operation,_|if operation=="instagram.account"{Ok(json!({"connectedAccountId":"ca_test","instagramAccountId":"1784","accountType":"BUSINESS"}))}else{Err(reason.into())}).unwrap();
            assert_eq!(result["state"],"not_published");assert_eq!(result["receipt"]["reason"],reason);
            std::fs::remove_dir_all(root).unwrap();
        }
        for reason in ["timeout","provider_unavailable","publication_conflict","invalid_readback","journal_unavailable","image_changed after dispatch","connection_lost"]{assert_eq!(failed_publish_receipt("attempt",reason)["state"],"unknown");}
    }

    #[test]fn continuation_requires_pending_receipt_and_fresh_explicit_action(){
        let(root,w)=setup();let draft=dispatch_with(&root,"social.save",json!({"workspaceId":w,"requestId":Uuid::new_v4().to_string(),"title":"Release"}),|_,_|panic!()).unwrap();
        let db=open(&root).unwrap();let id=draft["id"].as_str().unwrap();
        for (state,reason,confirmed,expected) in [("unknown","container_processing",true,true),("unknown","container_processing",false,false),("unknown","connection_lost",true,false),("published_unverified","container_processing",true,false)]{
            db.execute("UPDATE instagram_drafts SET state=?1,request_id='attempt',receipt_json=?2 WHERE id=?3",params![state,json!({"requestId":"attempt","state":state,"reason":reason}).to_string(),id]).unwrap();
            dispatch_with(&root,"social.receipt",json!({"workspaceId":w,"id":id,"continueConfirmed":confirmed}),|op,input|{assert_eq!(op,"instagram.receipt");assert_eq!(input["continueConfirmed"],expected);Ok(json!({"requestId":"attempt","state":"unknown","reason":reason}))}).unwrap();
        }
        drop(db);std::fs::remove_dir_all(root).unwrap();
    }

}
