use crate::domain;
use serde_json::{json, Value};
use std::path::Path;

/// Each record is a domain transaction. A failed page returns its retry cursor,
/// and source uniqueness makes retry safe without overwriting local corrections.
pub fn persist_page(root: &Path, input: &Value, page: Value) -> Result<Value,String> {
 let wid=input.get("workspaceId").and_then(Value::as_str).filter(|x|!x.is_empty()).ok_or("workspaceId is required")?;
 let workspace=domain::dispatch(root,"workspace.get",json!({"workspaceId":wid}))?;
 if workspace.is_null(){return Err("Unknown local workspace".into());}
 let provider=input.get("provider").and_then(Value::as_str).ok_or("provider is required")?;
 let entity=match provider {"gmail"=>"interactions","googlecalendar"=>"schedule",_=>return Err("Unsupported source provider".into())};
 let account=input.get("connectedAccountId").and_then(Value::as_str).filter(|x|!x.is_empty()).ok_or("connectedAccountId is required")?;
 if page["provider"]!=provider || page["connectedAccountId"]!=account {return Err("Source account readback mismatch".into());}
 let rows=page.get("records").and_then(Value::as_array).filter(|x|x.len()<=25).ok_or("Invalid source page")?;
 let next=page.get("nextCursor").cloned().unwrap_or(Value::Null);
 if !next.is_null() && !next.as_str().is_some_and(|x|!x.is_empty()&&x.len()<=512) {return Err("Invalid source cursor".into());}
 for row in rows {
  let source=&row["source"];
  if row["entity"]!=entity || !row["title"].as_str().is_some_and(|x|!x.trim().is_empty()&&x.len()<=2000) || !row["fields"].is_object()
   || source["kind"]!="import" || source["provider"]!=provider || source["connectedAccountId"]!=account
   || !source["externalId"].as_str().is_some_and(|x|!x.is_empty()&&x.len()<=320)
   || source.to_string().len()>2000 {
   return Err("Invalid source record or provenance".into());
  }
 }
 let mut saved=Vec::new();let mut failures=Vec::new();
 for (index,row) in rows.iter().enumerate() {
  let result=domain::dispatch(root,"records.save",json!({"workspaceId":wid,"entity":entity,"title":row["title"],"fields":row["fields"],"source":row["source"]}));
  match result {
   Ok(record)=>saved.push(json!({"id":record["id"],"entity":entity,"title":record["title"]})),
   Err(message)=>failures.push(json!({"index":index,"message":message.chars().take(200).collect::<String>()})),
  }
 }
 let complete=failures.is_empty();
 Ok(json!({"provider":provider,"connectedAccountId":account,"processedCount":saved.len(),"failedCount":failures.len(),
  "records":saved,"failures":failures,"complete":complete,"nextCursor":if complete {next} else {Value::Null},
  "retryCursor":if complete {Value::Null} else {input.get("cursor").cloned().unwrap_or(Value::Null)}}))
}

#[cfg(test)]
mod tests {
 use super::*;
 #[test]
 fn failed_records_return_retry_cursor_without_advancing_page() {
  let root=std::env::temp_dir().join(format!("gigi-import-partial-{}",uuid::Uuid::new_v4()));
  let workspace=domain::dispatch(&root,"workspace.create",json!({"name":"Partial test"})).unwrap();
  let input=json!({"workspaceId":workspace["id"],"provider":"gmail","connectedAccountId":"ca_test","cursor":"current-page"});
  let row=|external:&str,fields:Value|json!({"entity":"interactions","title":"Email","fields":fields,"source":{"kind":"import","provider":"gmail","connectedAccountId":"ca_test","externalId":external}});
  let mut page=json!({"provider":"gmail","connectedAccountId":"ca_test","records":[row("one",json!({})),row("two",json!({"invented":"bad"}))],"nextCursor":"next-page"});
  let result=persist_page(&root,&input,page.clone()).unwrap();
  assert_eq!(result["processedCount"],1);assert_eq!(result["failedCount"],1);
  assert_eq!(result["retryCursor"],"current-page");assert!(result["nextCursor"].is_null());
  page["records"][1]["fields"]=json!({});
  let retry=persist_page(&root,&input,page).unwrap();
  assert_eq!(retry["nextCursor"],"next-page");assert_eq!(retry["failedCount"],0);
  let list=domain::dispatch(&root,"records.list",json!({"workspaceId":workspace["id"],"entity":"interactions"})).unwrap();
  assert_eq!(list["count"],2);std::fs::remove_dir_all(root).unwrap();
 }
 #[test]
 fn imports_are_persisted_deduplicated_and_keep_user_corrections() {
  let root=std::env::temp_dir().join(format!("gigi-import-{}",uuid::Uuid::new_v4()));
  let workspace=domain::dispatch(&root,"workspace.create",json!({"name":"Import test"})).unwrap();
  let input=json!({"workspaceId":workspace["id"],"provider":"gmail","connectedAccountId":"ca_test"});
  let page=json!({"provider":"gmail","connectedAccountId":"ca_test","records":[{"entity":"interactions","title":"Friday show","fields":{"Thread ID":"thread-1"},"source":{"kind":"import","provider":"gmail","connectedAccountId":"ca_test","externalId":"message-1"}}],"nextCursor":null});
  let first=persist_page(&root,&input,page.clone()).unwrap();
  assert_eq!(first["processedCount"],1);
  let id=first["records"][0]["id"].clone();
  domain::dispatch(&root,"records.save",json!({"workspaceId":workspace["id"],"entity":"interactions","id":id,"title":"Corrected Friday show","fields":{"Thread ID":"thread-1"},"source":{"kind":"manual"}})).unwrap();
  let repeated=persist_page(&root,&input,page).unwrap();
  assert_eq!(repeated["records"][0]["id"],id);
  let list=domain::dispatch(&root,"records.list",json!({"workspaceId":workspace["id"],"entity":"interactions"})).unwrap();
  assert_eq!(list["count"],1);
  let record=domain::dispatch(&root,"records.get",json!({"workspaceId":workspace["id"],"entity":"interactions","id":id})).unwrap();
  assert_eq!(record["title"],"Corrected Friday show");
  let mismatched=persist_page(&root,&input,json!({"provider":"gmail","connectedAccountId":"ca_other","records":[],"nextCursor":null}));
  assert!(mismatched.is_err());
  std::fs::remove_dir_all(root).unwrap();
 }
}
