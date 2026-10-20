//! Real stdio MCP process test with a synthetic native-picker result injected
//! only into the shared import service used to seed this disposable profile.
//! Does not claim a real Codex session or human OS-picker interaction.
use gigi_desktop_lib::{domain,music};
use serde_json::{json,Value};
use std::{fs,io::{BufRead,BufReader,Write},process::{Command,Stdio}};
#[test]
fn music_is_discoverable_and_shared_with_desktop_over_real_stdio(){
 let root=std::env::temp_dir().join(format!("gigi-music-stdio-{}",uuid::Uuid::new_v4()));fs::create_dir_all(&root).unwrap();let root=fs::canonicalize(root).unwrap();
 let workspace=domain::dispatch(&root,"workspace.create",json!({"name":"Synthetic MCP music"})).unwrap();let wid=&workspace["id"];
 let path=root.join("demo.wav");fs::write(&path,b"synthetic selected media").unwrap();
 let receipt=music::import_with_picker(&root,&json!({"workspaceId":wid,"requestId":uuid::Uuid::new_v4().to_string(),"mode":"files"}),|_|Ok(vec![path.clone()])).unwrap();let item_id=&receipt["addedIds"][0];
 let mut child=Command::new(env!("CARGO_BIN_EXE_gigi-mcp")).env("GIGI_DATA_DIR",&root).stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped()).spawn().unwrap();
 let mut input=child.stdin.take().unwrap();let mut output=BufReader::new(child.stdout.take().unwrap());let mut sequence=0;
 let mut rpc=|method:&str,params:Value|{sequence+=1;writeln!(input,"{}",json!({"jsonrpc":"2.0","id":sequence,"method":method,"params":params})).unwrap();input.flush().unwrap();let mut line=String::new();output.read_line(&mut line).unwrap();let result:Value=serde_json::from_str(&line).unwrap();assert_eq!(result["id"],sequence);result["result"].clone()};
 let init=rpc("initialize",json!({"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"synthetic-test","version":"1"}}));assert_eq!(init["serverInfo"]["name"],"gigi-local");
 let catalog=rpc("tools/list",json!({}));for name in ["gigi_music_list","gigi_music_get","gigi_music_import","gigi_music_import_status","gigi_music_organize","gigi_music_organize_status"]{assert!(catalog["tools"].as_array().unwrap().iter().any(|tool|tool["name"]==name));}
 let listed=rpc("tools/call",json!({"name":"gigi_music_list","arguments":{"workspaceId":wid,"query":"demo","kind":"audio","limit":1}}));assert_eq!(listed["isError"],false);assert_eq!(listed["structuredContent"]["items"][0]["id"],*item_id);
 let organized=rpc("tools/call",json!({"name":"gigi_music_organize","arguments":{"requestId":uuid::Uuid::new_v4().to_string(),"workspaceId":wid,"id":item_id,"expectedRevision":listed["structuredContent"]["items"][0]["organizationRevision"],"fields":{"project":"Agent sessions","collection":"Reference tracks","version":"Demo 02"}}}));assert_eq!(organized["isError"],false);assert_eq!(organized["structuredContent"]["uploaded"],false);
 let found=rpc("tools/call",json!({"name":"gigi_music_list","arguments":{"workspaceId":wid,"query":"agent sessions"}}));assert_eq!(found["structuredContent"]["total"],1);
 let read=rpc("tools/call",json!({"name":"gigi_music_get","arguments":{"workspaceId":wid,"id":item_id}}));assert_eq!(read["structuredContent"]["title"],"demo");assert_eq!(read["structuredContent"]["version"],"Demo 02");assert!(read["structuredContent"].get("path").is_none());
 let ui=music::dispatch(&root,"music.list",json!({"workspaceId":wid})).unwrap();assert_eq!(ui["items"][0],read["structuredContent"]);
 for arguments in [json!({"workspaceId":wid,"requestId":uuid::Uuid::new_v4().to_string(),"paths":[path]}),json!({"workspaceId":wid,"requestId":"bad-id"}),json!({"workspaceId":"foreign","requestId":uuid::Uuid::new_v4().to_string()})]{let denied=rpc("tools/call",json!({"name":"gigi_music_import","arguments":arguments}));assert_eq!(denied["isError"],true);}

 // An independently running MCP process honors a persisted in-flight claim and never opens a second picker.
 let pending=uuid::Uuid::new_v4().to_string();let db=rusqlite::Connection::open(root.join("gigi.sqlite")).unwrap();db.execute("INSERT INTO music_import_claims(workspace_id,request_id,mode) VALUES(?1,?2,'files')",rusqlite::params![wid.as_str().unwrap(),pending]).unwrap();drop(db);
 let pending_status=rpc("tools/call",json!({"name":"gigi_music_import_status","arguments":{"workspaceId":wid,"requestId":pending}}));assert_eq!(pending_status["structuredContent"]["state"],"unknown");
 let repeated=rpc("tools/call",json!({"name":"gigi_music_import","arguments":{"workspaceId":wid,"requestId":pending}}));assert_eq!(repeated["isError"],true);assert!(repeated["content"][0]["text"].as_str().unwrap().contains("unverified"));

 // Instagram preparation is local; incomplete publication requests fail before broker access.
 assert!(!catalog["tools"].as_array().unwrap().iter().any(|tool|["gigi_instagram_publish","social.publish"].contains(&tool["name"].as_str().unwrap_or(""))));
 let created=rpc("tools/call",json!({"name":"gigi_instagram_draft_create","arguments":{"workspaceId":wid,"requestId":uuid::Uuid::new_v4().to_string(),"title":"Synthetic studio post","caption":"Draft only"}}));assert_eq!(created["isError"],false);let draft=&created["structuredContent"];
 let drafts=rpc("tools/call",json!({"name":"gigi_instagram_drafts_list","arguments":{"workspaceId":wid}}));assert_eq!(drafts["structuredContent"]["total"],1);
 let fetched=rpc("tools/call",json!({"name":"gigi_instagram_draft_get","arguments":{"workspaceId":wid,"id":draft["id"]}}));assert_eq!(fetched["structuredContent"]["body"]["title"],"Synthetic studio post");
 let mut update=draft["body"].clone();update["workspaceId"]=wid.clone();update["id"]=draft["id"].clone();update["expectedRevision"]=draft["revision"].clone();update["requestId"]=json!(uuid::Uuid::new_v4().to_string());update["caption"]=json!("Updated locally");
 let updated=rpc("tools/call",json!({"name":"gigi_instagram_draft_update","arguments":update}));assert_eq!(updated["isError"],false);assert_eq!(updated["structuredContent"]["body"]["caption"],"Updated locally");
 let rejected=rpc("tools/call",json!({"name":"gigi_instagram_request_publication_approval","arguments":{"workspaceId":wid,"id":draft["id"],"requestId":uuid::Uuid::new_v4().to_string(),"expectedRevision":updated["structuredContent"]["revision"],"expectedInstagramAccountId":"synthetic-account"}}));assert_eq!(rejected["isError"],true);
 assert_eq!(fs::read(path).unwrap(),b"synthetic selected media");
 drop(input);assert!(child.wait().unwrap().success());fs::remove_dir_all(root).unwrap();
}
