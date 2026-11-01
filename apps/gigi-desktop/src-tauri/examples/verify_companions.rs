//! Real-process acceptance check; never points at an existing user's workspace.
use gigi_desktop_lib::{domain,integrations};
use serde_json::json;
fn main()->Result<(),String>{
 let resources=std::path::PathBuf::from(std::env::args().nth(1).ok_or("Pass the built app Resources directory")?).canonicalize().map_err(|e|e.to_string())?;
 let root=std::env::temp_dir().join(format!("gigi-companion-acceptance-{}",uuid::Uuid::new_v4()));
 let result=(||->Result<(),String>{
  let workspace=domain::dispatch(&root,"workspace.create",json!({"name":"Companion acceptance"}))?;
  let record=domain::dispatch(&root,"records.save",json!({"workspaceId":workspace["id"],"entity":"gigs","title":"Friday saxophone set","fields":{"Fee":25000}}))?;
  let sync=integrations::sync_history(&resources,&root)?;
  if sync["imported"]["imported"]!=true{return Err("CTX import did not confirm completion".into());}
  let hits=integrations::dispatch(&resources,&root,"context.search",json!({"query":"saxophone","limit":3}))?;
  let hits=hits.as_array().ok_or("CTX did not return an array")?;
  if hits.is_empty()||hits.len()>3||!hits.iter().any(|h|h["snippet"].as_str().is_some_and(|s|s.contains("saxophone"))){return Err("CTX did not retrieve the SQLite history title".into());}
  // A second sync must be safe and current relational facts remain owned by SQLite.
  integrations::sync_history(&resources,&root)?;
  let readback=domain::dispatch(&root,"records.get",json!({"workspaceId":workspace["id"],"entity":"gigs","id":record["id"]}))?;
  if readback["fields"]["Fee"]!=25000{return Err("SQLite authority changed after history sync".into());}
  println!("{}",json!({"passed":true,"checks":["real bundled companion","SQLite history export","real CTX import","bounded title search","repeat sync","SQLite current fact unchanged"],"hits":hits.len()}));
  Ok(())
 })();
 if result.is_ok() {std::fs::remove_dir_all(&root).map_err(|e|e.to_string())?;} else {eprintln!("Failed synthetic profile retained at {}",root.display());}
 result
}
