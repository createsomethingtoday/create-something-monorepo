//! Agent access to the same local music index as Your music. Imports always use
//! the native user picker; neither paths nor persistent filesystem grants are MCP inputs.
use serde_json::{json,Value};
use std::path::Path;
const TOOLS:[(&str,&str,&str,bool);6]=[
 ("gigi_music_list","music.list","Find music in Your music by title, artist, project, collection, version or tags. Optional kind audio/video/project/other. Returns bounded local metadata and availability, never media bytes or filesystem paths. Start here before adding duplicates.",true),
 ("gigi_music_get","music.get","Read one Your music entry by its id, including organization and original-file availability. Project files are references; supported media playback remains in the desktop app.",true),
 ("gigi_music_import","music.import","Ask the user to select local files or one folder in GiGi’s native picker on this Mac. The user must complete the picker; do not pass paths. Indexes at most 1,000 selected entries, leaving originals in place and uploading nothing. Use a UUID requestId; retry the same UUID to read its receipt without opening another picker. Cancellation is not success. Receipt includes addedIds, duplicateIds, skipped counts and nextStep. No persistent folder access is granted.",false),
 ("gigi_music_import_status","music.importStatus","Read a previous native import request without opening the picker or changing local data. Completed returns its receipt (check cancelled and added); unknown means selection may be in progress or interrupted, never automatically restart it; not_started means no claim or receipt was found. Use the original UUID requestId.",true),
 ("gigi_music_organize_status","music.organizeStatus","Read the exact durable organization completion receipt by original requestId. Never edits or retries. Unknown is not proof of failure.",true),
 ("gigi_music_organize","music.organize","Update the requested title/artist/project/collection/version/tags for one Your music entry. Only supplied fields change. Use music_get first and pass its organizationRevision as expectedRevision; stale writes are rejected; reuse a project name for related bounces/session files and a collection for listening references. Version is a label on separately imported files, never a DAW edit. Originals stay untouched; no upload.",false),
];
pub fn handles(name:&str)->bool{TOOLS.iter().any(|tool|tool.0==name)}
fn schema(operation:&str)->Value{
 let mut properties=serde_json::Map::new();properties.insert("workspaceId".into(),json!({"type":"string","minLength":1}));
 let mut required=vec!["workspaceId"];
 match operation{
  "music.list"=>{properties.insert("query".into(),json!({"type":"string","maxLength":500}));properties.insert("kind".into(),json!({"type":"string","enum":["audio","video","project","other"]}));properties.insert("offset".into(),json!({"type":"integer","minimum":0,"maximum":10000}));properties.insert("limit".into(),json!({"type":"integer","minimum":1,"maximum":100,"default":50}));},
  "music.get"|"music.organize"=>{properties.insert("id".into(),json!({"type":"string","minLength":1}));required.push("id");if operation=="music.organize"{properties.insert("requestId".into(),json!({"type":"string","format":"uuid","description":"New UUID for this exact organization operation. Reuse only for an identical retry; changed input needs a new request."}));required.push("requestId");properties.insert("expectedRevision".into(),json!({"type":"string","minLength":64,"maxLength":64,"description":"organizationRevision from the latest music_get or music_list result."}));required.push("expectedRevision");let fields:serde_json::Map<String,Value>=["title","artist","project","collection","version","tags"].into_iter().map(|field|(field.into(),json!({"type":"string","maxLength":1000}))).collect();properties.insert("fields".into(),json!({"type":"object","properties":fields,"additionalProperties":false,"minProperties":1,"description":"Only these supplied organization fields change; omitted fields are preserved. Empty text clears an optional field; title cannot be empty."}));required.push("fields");}},
  "music.import"|"music.importStatus"|"music.organizeStatus"|"music.cancel"=>{properties.insert("requestId".into(),json!({"type":"string","format":"uuid","description":"Stable UUID for this operation; use the original UUID when recovering its receipt."}));required.push("requestId");if operation=="music.import"{properties.insert("mode".into(),json!({"type":"string","enum":["files","folder"],"default":"files"}));}},_=>{}
 }
 json!({"type":"object","additionalProperties":false,"properties":properties,"required":required})
}
pub fn catalog()->Vec<Value>{TOOLS.iter().map(|(name,operation,description,read_only)|json!({"name":name,"description":description,"inputSchema":schema(operation),"annotations":{"readOnlyHint":read_only,"destructiveHint":false,"openWorldHint":false}})).collect()}
fn validate(name:&str,input:&Value)->Result<&'static str,String>{
 let operation=TOOLS.iter().find(|tool|tool.0==name).map(|tool|tool.1).ok_or("Unknown music tool.")?;
 let descriptor=schema(operation);let values=input.as_object().ok_or("Tool arguments must be an object.")?;
 let props=descriptor["properties"].as_object().unwrap();
 for key in values.keys(){if !props.contains_key(key){return Err(format!("Unsupported argument {key}. Music imports require native user selection, not supplied paths."));}}
 for key in descriptor["required"].as_array().unwrap(){if !values.contains_key(key.as_str().unwrap()){return Err(format!("{} is required.",key.as_str().unwrap()));}}
 for(key,value)in values{match props[key]["type"].as_str().unwrap(){
  "string"=>{let text=value.as_str().ok_or_else(||format!("{key} must be text."))?;if props[key]["minLength"].as_u64().is_some_and(|min|text.len()<(min as usize))||props[key]["maxLength"].as_u64().is_some_and(|max|text.len()>(max as usize)){return Err(format!("{key} has an invalid length."));}if let Some(allowed)=props[key]["enum"].as_array(){if !allowed.iter().any(|v|v==value){return Err(format!("Unsupported {key}."));}}},
  "integer"=>{let number=value.as_u64().ok_or_else(||format!("{key} must be a nonnegative integer."))?;if number<props[key]["minimum"].as_u64().unwrap_or(0)||number>props[key]["maximum"].as_u64().unwrap_or(u64::MAX){return Err(format!("{key} is outside the supported range."));}},
  "object"=>{let fields=value.as_object().filter(|f|!f.is_empty()).ok_or("Supply at least one organization field.")?;for(field,text)in fields{if !props[key]["properties"].get(field).is_some()||!text.is_string(){return Err("Only typed music organization fields are allowed.".into());}}},_=>{}
 }}
 if let Some(request)=input.get("requestId"){if uuid::Uuid::parse_str(request.as_str().unwrap_or("")).is_err(){return Err("requestId must be a UUID.".into());}}
 Ok(operation)
}
pub fn dispatch(root:&Path,name:&str,mut input:Value)->Result<Value,String>{let operation=validate(name,&input)?;if operation=="music.list"&&input.get("limit").is_none(){input["limit"]=json!(50);}crate::music::dispatch(root,operation,input)}

#[cfg(test)]mod tests{
 use super::*;
 #[test]fn discovery_forbids_paths_and_unbounded_lists(){let tools=catalog();assert_eq!(tools.len(),6);let import=tools.iter().find(|t|t["name"]=="gigi_music_import").unwrap();assert!(import["description"].as_str().unwrap().contains("native picker"));assert!(validate("gigi_music_import",&json!({"workspaceId":"w","requestId":uuid::Uuid::new_v4().to_string(),"paths":["/private"]})).is_err());assert!(validate("gigi_music_list",&json!({"workspaceId":"w","limit":1000})).is_err());assert!(validate("gigi_music_list",&json!({"workspaceId":"w","kind":"anything"})).is_err());assert!(validate("gigi_music_organize",&json!({"workspaceId":"w","id":"i","fields":{"path":"/private"}})).is_err());}
}

#[cfg(test)]mod workflow_tests{
 use super::*;use std::fs;use std::os::unix::fs::PermissionsExt;
 #[test]fn picker_import_search_organize_matches_ui_and_rejects_unsafe_selections(){
  let root=std::env::temp_dir().join(format!("gigi-mcp-music-{}",uuid::Uuid::new_v4()));fs::create_dir_all(&root).unwrap();let root=fs::canonicalize(root).unwrap();
  let workspace=crate::domain::dispatch(&root,"workspace.create",json!({"name":"Synthetic agent music"})).unwrap();let wid=&workspace["id"];
  let selected=root.join("demo.wav");fs::write(&selected,b"synthetic selected audio").unwrap();
  let import=json!({"workspaceId":wid,"requestId":uuid::Uuid::new_v4().to_string(),"mode":"files"});validate("gigi_music_import",&import).unwrap();
  let receipt=crate::music::import_with_picker(&root,&import,|mode|{assert_eq!(mode,"files");Ok(vec![selected.clone()])}).unwrap();
  assert_eq!(receipt["added"],1);assert_eq!(receipt["uploaded"],false);let id=&receipt["addedIds"][0];
  assert_eq!(crate::music::import_with_picker(&root,&import,|_|panic!("receipt retry must not reopen picker")).unwrap(),receipt);
  let duplicate=crate::music::import_with_picker(&root,&json!({"workspaceId":wid,"requestId":uuid::Uuid::new_v4().to_string()}),|_|Ok(vec![selected.clone()])).unwrap();assert_eq!(duplicate["duplicates"],1);assert_eq!(duplicate["duplicateIds"][0],*id);
  let original=dispatch(&root,"gigi_music_get",json!({"workspaceId":wid,"id":id})).unwrap();
  dispatch(&root,"gigi_music_organize",json!({"requestId":uuid::Uuid::new_v4().to_string(),"workspaceId":wid,"id":id,"expectedRevision":original["organizationRevision"],"fields":{"project":"Night Drive","version":"Mix 01","tags":"ambient"}})).unwrap();
  let found=dispatch(&root,"gigi_music_list",json!({"workspaceId":wid,"query":"night drive","kind":"audio","limit":1})).unwrap();assert_eq!(found["items"][0]["id"],*id);assert_eq!(found["items"][0]["version"],"Mix 01");assert_eq!(found["items"][0]["title"],"demo");
  let ui=crate::music::dispatch(&root,"music.list",json!({"workspaceId":wid})).unwrap();assert_eq!(ui["items"][0],found["items"][0]);assert_eq!(fs::read(&selected).unwrap(),b"synthetic selected audio");
  assert!(dispatch(&root,"gigi_music_get",json!({"workspaceId":"foreign","id":id})).is_err());
  assert!(dispatch(&root,"gigi_music_import",json!({"workspaceId":wid,"requestId":uuid::Uuid::new_v4().to_string(),"paths":["/private"]})).is_err());
  let bad=root.join("symlink.wav");std::os::unix::fs::symlink(&selected,&bad).unwrap();
  let missing=root.join("missing.wav");let unreadable=root.join("denied.wav");fs::write(&unreadable,b"unreadable fixture").unwrap();fs::set_permissions(&unreadable,fs::Permissions::from_mode(0)).unwrap();
  let refused=crate::music::import_with_picker(&root,&json!({"workspaceId":wid,"requestId":uuid::Uuid::new_v4().to_string()}),|_|Ok(vec![bad,missing,unreadable.clone(),std::path::PathBuf::from("relative.wav")])).unwrap();assert_eq!(refused["added"],0);assert_eq!(refused["skipped"],4);
  fs::set_permissions(&unreadable,fs::Permissions::from_mode(0o600)).unwrap();
  let cancel=crate::music::import_with_picker(&root,&json!({"workspaceId":wid,"requestId":uuid::Uuid::new_v4().to_string()}),|_|Ok(vec![])).unwrap();assert_eq!(cancel["cancelled"],true);assert_eq!(cancel["added"],0);
  assert!(crate::music::import_with_picker(&root,&json!({"workspaceId":wid,"requestId":uuid::Uuid::new_v4().to_string()}),|_|Err("Native picker unavailable; open GiGi on this Mac.".into())).unwrap_err().contains("picker unavailable"));
  fs::remove_dir_all(root).unwrap();
 }
}
