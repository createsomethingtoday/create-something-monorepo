//! Explicit, device-local music indexing. No upload, original-file mutation, or ambient scan.
use rusqlite::{params, Connection, OptionalExtension};
use serde_json::{json, Value};
use std::{collections::HashMap, fs, path::{Path, PathBuf}, sync::{Arc, Mutex, OnceLock, atomic::{AtomicBool, Ordering}}, time::UNIX_EPOCH};
use std::os::unix::fs::MetadataExt;
use uuid::Uuid;
const IMPORT_LIMIT: usize = 1000;
const LIBRARY_LIMIT: i64 = 10000;
static IMPORTS: OnceLock<Mutex<HashMap<String, Arc<AtomicBool>>>> = OnceLock::new();
fn need<'a>(input: &'a Value, field: &str) -> Result<&'a str,String> { input[field].as_str().filter(|s| !s.is_empty()).ok_or_else(||format!("{field} is required")) }
fn kind(path: &Path) -> &'static str {
    match path.extension().and_then(|s|s.to_str()).unwrap_or("").to_ascii_lowercase().as_str() {
        "mp3"|"wav"|"aif"|"aiff"|"m4a"|"aac"|"flac"|"ogg" => "audio",
        "mp4"|"m4v"|"mov"|"webm"|"mkv" => "video",
        "als"|"alp"|"logicx"|"band"|"flp"|"ptx"|"rpp"|"cpr"|"song" => "project",
        _ => "other"
    }
}
fn no_symlinks(path: &Path) -> Result<(),String> {
    if !path.is_absolute() {return Err("Select an absolute local file.".into());}
    for ancestor in path.ancestors() {
        if fs::symlink_metadata(ancestor).map_err(|_|"Original unavailable. Reconnect its current location.")?.file_type().is_symlink() {
            return Err("Symbolic links are not indexed. Select the original file or folder.".into());
        }
    }
    Ok(())
}
fn fingerprint(path: &Path) -> Result<String,String> {
    no_symlinks(path)?;
    let m=fs::metadata(path).map_err(|_|"Original unavailable. Reconnect its current location.")?;
    Ok(format!("{}:{}:{}:{}",m.dev(),m.ino(),m.len(),m.modified().map_err(|e|e.to_string())?.duration_since(UNIX_EPOCH).map_err(|e|e.to_string())?.as_nanos()))
}
fn open(root:&Path,wid:&str)->Result<Connection,String> {
    // Existing domain remains the owner of workspace creation and database permissions.
    if crate::domain::dispatch(root,"workspace.get",json!({"workspaceId":wid}))?["id"].as_str()!=Some(wid) {return Err("Select an existing private workspace.".into());}
    let db=Connection::open(root.join("gigi.sqlite")).map_err(|e|e.to_string())?;
    db.execute_batch("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS music_items(workspace_id TEXT NOT NULL REFERENCES workspaces(id),id TEXT NOT NULL,path TEXT NOT NULL,fingerprint TEXT NOT NULL,metadata TEXT NOT NULL,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(workspace_id,id),UNIQUE(workspace_id,path,fingerprint));
      CREATE INDEX IF NOT EXISTS music_workspace ON music_items(workspace_id,updated_at,id);").map_err(|e|e.to_string())?;
    Ok(db)
}
fn get(db:&Connection,wid:&str,id:&str)->Result<(String,String,Value),String> {
    let row:Option<(String,String,String)>=db.query_row("SELECT path,fingerprint,metadata FROM music_items WHERE workspace_id=?1 AND id=?2",params![wid,id],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?))).optional().map_err(|e|e.to_string())?;
    let (path,fp,data)=row.ok_or("This music entry is unavailable in this workspace.")?;
    Ok((path,fp,serde_json::from_str(&data).map_err(|_|"Music metadata is invalid.")?))
}
fn metadata(path:&Path)->Result<Value,String> {
    let name=path.file_name().and_then(|s|s.to_str()).ok_or("Filename is not valid Unicode.")?;
    let m=fs::metadata(path).map_err(|e|e.to_string())?;
    if !m.is_file() && !(m.is_dir()&&kind(path)=="project") {return Err("Select a media file or recognized project bundle.".into());}
    Ok(json!({"title":path.file_stem().and_then(|s|s.to_str()).unwrap_or(name),"filename":name,"kind":kind(path),"bytes":m.len(),"modified":m.modified().ok().and_then(|t|t.duration_since(UNIX_EPOCH).ok()).map(|d|d.as_secs()),"artist":"","project":"","collection":"","version":"","tags":""}))
}
fn selected(mode:&str)->Result<Vec<PathBuf>,String> {
    let dialog=rfd::FileDialog::new().set_title("GiGi: index selected local music — nothing is uploaded");
    match mode {
        "files"=>Ok(dialog.pick_files().unwrap_or_default()),
        "folder"=>Ok(dialog.pick_folder().into_iter().collect()),
        _=>Err("Choose files or a folder.".into())
    }
}
fn import_paths(db:&mut Connection,wid:&str,roots:Vec<PathBuf>,folder:bool,cancel:&AtomicBool)->Result<Value,String> {
    let mut pending:Vec<(PathBuf,usize)>=roots.into_iter().map(|p|(p,0)).collect();
    let mut found=Vec::new(); let mut skipped=0usize; let mut visited=0usize; let mut limited=false;
    while let Some((path,depth))=pending.pop() {
        if cancel.load(Ordering::Relaxed) {return Ok(json!({"cancelled":true,"added":0}));}
        visited+=1;
        if visited>10000 || found.len()>=IMPORT_LIMIT {limited=true;break;}
        if no_symlinks(&path).is_err() {skipped+=1;continue;}
        if path.is_dir() && kind(&path)!="project" && folder {
            if depth>=16 {skipped+=1;limited=true;continue;}
            match fs::read_dir(&path) {
                Ok(entries)=>for (index,entry) in entries.enumerate() {
                    if index>=10000usize.saturating_sub(visited+pending.len()) {limited=true;break;}
                    match entry {Ok(entry)=>{if !entry.file_name().to_string_lossy().starts_with('.') {pending.push((entry.path(),depth+1));}},Err(_)=>skipped+=1}
                },
                Err(_)=>skipped+=1
            }
        } else { match (metadata(&path),fingerprint(&path)) { (Ok(meta),Ok(fp))=>found.push((path,meta,fp)),_=>skipped+=1 } }
    }
    let tx=db.transaction().map_err(|e|e.to_string())?;
    let count:i64=tx.query_row("SELECT count(*) FROM music_items WHERE workspace_id=?1",[wid],|r|r.get(0)).map_err(|e|e.to_string())?;
    let mut added=0; let mut duplicates=0;
    for (path,meta,fp) in found {
        if cancel.load(Ordering::Relaxed) {return Ok(json!({"cancelled":true,"added":0}));}
        if count+added>=LIBRARY_LIMIT {limited=true;break;}
        let n=tx.execute("INSERT OR IGNORE INTO music_items(workspace_id,id,path,fingerprint,metadata) VALUES(?1,?2,?3,?4,?5)",params![wid,Uuid::new_v4().to_string(),path.to_str().ok_or("Path is not valid Unicode.")?,fp,meta.to_string()]).map_err(|e|e.to_string())?;
        if n==0 {duplicates+=1;} else {added+=1;}
    }
    tx.commit().map_err(|e|e.to_string())?;
    Ok(json!({"added":added,"duplicates":duplicates,"skipped":skipped,"limited":limited,"cancelled":false,"originalsUnchanged":true,"uploaded":false}))
}

pub fn dispatch(root:&Path,op:&str,input:Value)->Result<Value,String> {
    let wid=need(&input,"workspaceId")?;
    let mut db=open(root,wid)?;
    match op {
        "music.list"=>{
            let query=input["query"].as_str().unwrap_or("").trim().to_lowercase();
            let filter=input["kind"].as_str().unwrap_or("");
            let offset=input["offset"].as_u64().unwrap_or(0).min(10000);
            let sql="FROM music_items WHERE workspace_id=?1 AND (?2='' OR instr(lower(metadata),?2)>0) AND (?3='' OR json_extract(metadata,'$.kind')=?3)";
            let total:i64=db.query_row(&format!("SELECT count(*) {sql}"),params![wid,query,filter],|r|r.get(0)).map_err(|e|e.to_string())?;
            let mut statement=db.prepare(&format!("SELECT id,path,fingerprint,metadata {sql} ORDER BY updated_at DESC,id LIMIT 100 OFFSET ?4")).map_err(|e|e.to_string())?;
            let rows=statement.query_map(params![wid,query,filter,offset],|r|Ok((r.get::<_,String>(0)?,r.get::<_,String>(1)?,r.get::<_,String>(2)?,r.get::<_,String>(3)?))).map_err(|e|e.to_string())?;
            let mut items=Vec::new();
            for row in rows {
                let(id,path,fp,data)=row.map_err(|e|e.to_string())?; let mut item:Value=serde_json::from_str(&data).map_err(|e|e.to_string())?;
                item["id"]=json!(id);
                item["availability"]=json!(match fingerprint(Path::new(&path)) {Ok(current) if current==fp=>"available",Ok(_)=>"changed",Err(_)=>"missing"});
                items.push(item);
            }
            Ok(json!({"items":items,"total":total,"offset":offset,"hasMore":offset+100<(total as u64)}))
        },
        "music.import"=>{
            let request=need(&input,"requestId")?;
            if Uuid::parse_str(request).is_err() {return Err("Invalid import request.".into());}
            let key=format!("{}:{wid}:{request}",root.display());
            let cancel=Arc::new(AtomicBool::new(false));
            {let mut active=IMPORTS.get_or_init(Default::default).lock().map_err(|_|"Import state unavailable")?;if active.contains_key(&key){return Err("This import is already running.".into());}active.insert(key.clone(),cancel.clone());}
            let result=(||{let mode=input["mode"].as_str().unwrap_or("files");let paths=selected(mode)?;if paths.is_empty(){return Ok(json!({"cancelled":true,"added":0}));}import_paths(&mut db,wid,paths,mode=="folder",&cancel)})();
            if let Ok(mut active)=IMPORTS.get_or_init(Default::default).lock(){active.remove(&key);}
            result
        },
        "music.cancel"=>{let key=format!("{}:{wid}:{}",root.display(),need(&input,"requestId")?);if let Some(cancel)=IMPORTS.get_or_init(Default::default).lock().map_err(|_|"Import state unavailable")?.get(&key){cancel.store(true,Ordering::Relaxed);}Ok(json!({"cancelRequested":true}))},
        "music.edit"=>{
            let id=need(&input,"id")?;let(_,_,mut item)=get(&db,wid,id)?;
            for field in ["title","artist","project","collection","version","tags"] {
                let value=input[field].as_str().ok_or_else(||format!("{field} must be text"))?.trim();
                if value.len()>1000 || (field=="title"&&value.is_empty()) {return Err(format!("{field} must contain {}at most 1,000 bytes.",if field=="title"{"a title of "}else{""}));}
                item[field]=json!(value);
            }
            db.execute("UPDATE music_items SET metadata=?3,updated_at=CURRENT_TIMESTAMP WHERE workspace_id=?1 AND id=?2",params![wid,id,item.to_string()]).map_err(|e|e.to_string())?;
            Ok(json!({"saved":true,"id":id}))
        },
        "music.remove"=>{let id=need(&input,"id")?;get(&db,wid,id)?;db.execute("DELETE FROM music_items WHERE workspace_id=?1 AND id=?2",params![wid,id]).map_err(|e|e.to_string())?;Ok(json!({"removed":true,"originalUnchanged":true}))},
        "music.reconnect"=>{
            let id=need(&input,"id")?;let(_,fp,item)=get(&db,wid,id)?;
            let path=rfd::FileDialog::new().set_title("Reconnect the original file (changed files must be added separately)").pick_file();
            let Some(path)=path else{return Ok(json!({"cancelled":true}));};
            if fingerprint(&path)?!=fp || metadata(&path)?["filename"]!=item["filename"] {return Err("The selected file differs from this original. Add it separately and give it a version label.".into());}
            db.execute("UPDATE music_items SET path=?3 WHERE workspace_id=?1 AND id=?2",params![wid,id,path.to_str().ok_or("Invalid path")?]).map_err(|e|e.to_string())?;
            Ok(json!({"reconnected":true}))
        },
        "music.preview"=>{
            let(path,fp,item)=get(&db,wid,need(&input,"id")?)?;
            if !["audio","video"].contains(&item["kind"].as_str().unwrap_or("")) {return Err("Project files and unsupported formats have no in-app preview.".into());}
            if fingerprint(Path::new(&path))?!=fp {return Err("Original changed. Add the changed file as a new version.".into());}
            fs::File::open(&path).map_err(|_|"The original cannot be read. Reconnect it or check access.")?;
            Ok(json!({"path":path,"kind":item["kind"],"title":item["title"]}))
        },
        _=>Err("Unknown music operation".into())
    }
}

#[cfg(test)] mod tests {
    use super::*;
    fn fixture()->(PathBuf,String,PathBuf){let root=std::env::temp_dir().join(format!("gigi-music-{}",Uuid::new_v4()));fs::create_dir_all(&root).unwrap();let root=fs::canonicalize(root).unwrap();let w=crate::domain::dispatch(&root,"workspace.create",json!({"name":"Synthetic music"})).unwrap();let wid=w["id"].as_str().or_else(||w["workspace"]["id"].as_str()).unwrap().to_string();let file=root.join("test.mp4");fs::write(&file,b"synthetic media").unwrap();(root,wid,file)}
    #[test]fn import_is_local_deduplicated_and_workspace_bound(){let(root,wid,file)=fixture();let mut db=open(&root,&wid).unwrap();let cancel=AtomicBool::new(false);assert_eq!(import_paths(&mut db,&wid,vec![file.clone()],false,&cancel).unwrap()["added"],1);assert_eq!(import_paths(&mut db,&wid,vec![file.clone()],false,&cancel).unwrap()["duplicates"],1);let result=dispatch(&root,"music.list",json!({"workspaceId":wid})).unwrap();assert_eq!(result["items"][0]["kind"],"video");assert_eq!(result["items"][0]["availability"],"available");let id=&result["items"][0]["id"];assert!(dispatch(&root,"music.preview",json!({"workspaceId":"wrong","id":id})).is_err());dispatch(&root,"music.remove",json!({"workspaceId":wid,"id":id})).unwrap();assert!(file.exists());fs::remove_dir_all(root).unwrap();}
    #[test]fn changed_files_and_symlinks_are_not_previewed(){let(root,wid,file)=fixture();let mut db=open(&root,&wid).unwrap();import_paths(&mut db,&wid,vec![file.clone()],false,&AtomicBool::new(false)).unwrap();let listed=dispatch(&root,"music.list",json!({"workspaceId":wid})).unwrap();fs::write(&file,b"changed").unwrap();assert!(dispatch(&root,"music.preview",json!({"workspaceId":wid,"id":listed["items"][0]["id"]})).is_err());let link=root.join("alias.mp4");std::os::unix::fs::symlink(&file,&link).unwrap();assert!(fingerprint(&link).is_err());fs::remove_dir_all(root).unwrap();}
    #[test]fn cancelled_import_does_not_save_entries(){let(root,wid,file)=fixture();let mut db=open(&root,&wid).unwrap();assert_eq!(import_paths(&mut db,&wid,vec![file],false,&AtomicBool::new(true)).unwrap()["cancelled"],true);assert_eq!(dispatch(&root,"music.list",json!({"workspaceId":wid})).unwrap()["total"],0);fs::remove_dir_all(root).unwrap();}
    #[test]fn organization_survives_reopen_and_backup_without_media_copy(){
        let(root,wid,file)=fixture();
        let mut db=open(&root,&wid).unwrap();
        import_paths(&mut db,&wid,vec![file.clone()],false,&AtomicBool::new(false)).unwrap();drop(db);
        let listed=dispatch(&root,"music.list",json!({"workspaceId":wid})).unwrap();let id=listed["items"][0]["id"].clone();
        dispatch(&root,"music.edit",json!({"workspaceId":wid,"id":id,"title":"First bounce","artist":"Fixture","project":"Night Drive","collection":"References","version":"Mix 03","tags":"ambient"})).unwrap();
        let searched=dispatch(&root,"music.list",json!({"workspaceId":wid,"query":"Night Drive"})).unwrap();assert_eq!(searched["total"],1);assert_eq!(searched["items"][0]["version"],"Mix 03");
        let(other_root,other_id,_)=fixture();
        assert!(dispatch(&other_root,"music.preview",json!({"workspaceId":other_id,"id":id})).is_err());
        fs::remove_dir_all(other_root).unwrap();
        let backup=crate::domain::dispatch(&root,"backup.create",json!({"workspaceId":wid})).unwrap();
        dispatch(&root,"music.remove",json!({"workspaceId":wid,"id":id})).unwrap();
        crate::domain::dispatch(&root,"backup.restore",json!({"backupId":backup["backupId"]})).unwrap();
        assert_eq!(dispatch(&root,"music.list",json!({"workspaceId":wid})).unwrap()["total"],1);
        assert_eq!(fs::read(&file).unwrap(),b"synthetic media");fs::remove_dir_all(root).unwrap();
    }
    #[test]fn changed_file_can_be_added_as_an_explicit_new_version(){
        let(root,wid,file)=fixture();let mut db=open(&root,&wid).unwrap();let cancel=AtomicBool::new(false);
        import_paths(&mut db,&wid,vec![file.clone()],false,&cancel).unwrap();
        fs::write(&file,b"new version of the synthetic media").unwrap();
        assert_eq!(import_paths(&mut db,&wid,vec![file.clone()],false,&cancel).unwrap()["added"],1);
        let result=dispatch(&root,"music.list",json!({"workspaceId":wid})).unwrap();
        assert_eq!(result["total"],2);let states:Vec<&str>=result["items"].as_array().unwrap().iter().map(|v|v["availability"].as_str().unwrap()).collect();
        assert!(states.contains(&"changed"));assert!(states.contains(&"available"));fs::remove_dir_all(root).unwrap();
    }
    #[test]fn folder_import_skips_hidden_and_symbolic_links(){
        let(root,wid,_)=fixture();let folder=root.join("selected");fs::create_dir(&folder).unwrap();
        fs::write(folder.join("demo.wav"),b"fixture").unwrap();fs::write(folder.join(".hidden.mp4"),b"hidden fixture").unwrap();
        let outside=root.join("outside");fs::create_dir(&outside).unwrap();fs::write(outside.join("private.mp4"),b"outside fixture").unwrap();
        std::os::unix::fs::symlink(&outside,folder.join("linked-folder")).unwrap();
        let result=import_paths(&mut open(&root,&wid).unwrap(),&wid,vec![folder],true,&AtomicBool::new(false)).unwrap();assert_eq!(result["added"],1);assert_eq!(result["skipped"],1);
        fs::remove_dir_all(root).unwrap();
    }
}
