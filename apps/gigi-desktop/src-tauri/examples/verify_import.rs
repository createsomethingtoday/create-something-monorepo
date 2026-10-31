//! Consumes the actual TypeScript runner output, using a new synthetic database.
use gigi_desktop_lib::{domain,source_import};
use serde_json::{json,Value};
fn main()->Result<(),String>{
 let path=std::env::args().nth(1).ok_or("Pass canonical runner response file")?;
 let page:Value=serde_json::from_slice(&std::fs::read(path).map_err(|e|e.to_string())?).map_err(|e|e.to_string())?;
 let root=std::env::temp_dir().join(format!("gigi-import-contract-{}",uuid::Uuid::new_v4()));
 let result=(||->Result<(),String>{
  let workspace=domain::dispatch(&root,"workspace.create",json!({"name":"Import contract"}))?;
  let input=json!({"workspaceId":workspace["id"],"provider":page["provider"],"connectedAccountId":page["connectedAccountId"]});
  let first=source_import::persist_page(&root,&input,page.clone())?;
  if first["complete"]!=true||first["processedCount"]!=1{return Err(format!("Incomplete import: {first}"));}
  let again=source_import::persist_page(&root,&input,page)?;
  if first["records"][0]["id"]!=again["records"][0]["id"]{return Err("Duplicate source import".into());}
  let record=domain::dispatch(&root,"records.get",json!({"workspaceId":workspace["id"],"entity":first["records"][0]["entity"],"id":first["records"][0]["id"],"detail":"full"}))?;
  if record["source"]["kind"]!="import"||record["source"]["connectedAccountId"]!=input["connectedAccountId"]{return Err("Source provenance missing".into());}
  println!("{}",json!({"passed":true,"provider":input["provider"],"checks":["actual TS runner projection","Rust catalog validation","SQLite persistence","dedupe","source readback"]}));Ok(())
 })();
 std::fs::remove_dir_all(root).map_err(|e|e.to_string())?;result
}
