//! Explicit, device-local music indexing. No upload, original-file mutation, or ambient scan.
use rusqlite::{params, Connection, OptionalExtension, TransactionBehavior};
use serde_json::{json, Value};
use std::{collections::HashMap, fs, path::{Path, PathBuf}, sync::{Arc, Mutex, OnceLock, atomic::{AtomicBool, Ordering}}, time::UNIX_EPOCH};
use std::os::unix::fs::MetadataExt;
use uuid::Uuid;
use sha2::{Digest, Sha256};
const BUNDLE_ENTRY_LIMIT: usize = 10000;
const BUNDLE_DEPTH_LIMIT: usize = 32;
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
    if !path.is_absolute() || path.components().any(|part| matches!(part,std::path::Component::ParentDir)) {return Err("Select an absolute local file without parent traversal.".into());}
    for ancestor in path.ancestors() {
        if fs::symlink_metadata(ancestor).map_err(|_|"Original unavailable. Reconnect its current location.")?.file_type().is_symlink() {
            return Err("Symbolic links are not indexed. Select the original file or folder.".into());
        }
    }
    Ok(())
}
fn metadata_identity(m: &fs::Metadata) -> Result<String,String> {
    Ok(format!("{}:{}:{}:{}",m.dev(),m.ino(),m.len(),m.modified().map_err(|e|e.to_string())?.duration_since(UNIX_EPOCH).map_err(|e|e.to_string())?.as_nanos()))
}
fn fingerprint(path: &Path) -> Result<String,String> {
    no_symlinks(path)?;
    let m=fs::metadata(path).map_err(|_|"Original unavailable. Reconnect its current location.")?;
    let identity=metadata_identity(&m)?;
    if !m.is_dir() { return Ok(identity); }
    // Project bundles are references, but their nested files change independently of
    // the root directory. Bound traversal, never follow links, and fail closed if
    // the complete metadata manifest cannot be verified. Relative names allow moves.
    let mut pending=vec![(path.to_path_buf(),0usize)];
    let mut entries=Vec::new();
    while let Some((directory,depth))=pending.pop() {
        no_symlinks(&directory)?;
        for entry in fs::read_dir(&directory).map_err(|_|"Project bundle cannot be read.")? {
            let entry=entry.map_err(|_|"Project bundle cannot be read.")?;
            if entries.len()>=BUNDLE_ENTRY_LIMIT {return Err("Project bundle exceeds the 10,000-entry verification limit.".into());}
            let entry_path=entry.path();
            let meta=fs::symlink_metadata(&entry_path).map_err(|_|"Project bundle changed while being checked.")?;
            if meta.file_type().is_symlink() || !(meta.is_file()||meta.is_dir()) {return Err("Project bundles containing symbolic links or special files cannot be indexed.".into());}
            let relative=entry_path.strip_prefix(path).map_err(|e|e.to_string())?.to_str().ok_or("Project filename is not valid Unicode.")?.to_string();
            entries.push((relative,meta.is_dir(),metadata_identity(&meta)?));
            if meta.is_dir() {
                if depth>=BUNDLE_DEPTH_LIMIT {return Err("Project bundle exceeds the folder-depth verification limit.".into());}
                pending.push((entry_path,depth+1));
            }
        }
    }
    entries.sort_unstable_by(|a,b|a.0.cmp(&b.0));
    let manifest=serde_json::to_vec(&entries).map_err(|e|e.to_string())?;
    Ok(format!("bundle-v1:{identity}:{:x}",Sha256::digest(manifest)))
}
fn previewable(path: &Path) -> bool {
    matches!(kind(path),"audio"|"video") && !path.extension().and_then(|s|s.to_str()).is_some_and(|ext|ext.eq_ignore_ascii_case("mkv"))
}
fn bundle_entry(item: &Value, path: &Path, fp: &str) -> bool {
    item["isBundle"].as_bool().unwrap_or_else(|| fp.starts_with("bundle-v1:") || (item["kind"]=="project" && (path.is_dir() || matches!(path.extension().and_then(|e|e.to_str()).unwrap_or("").to_ascii_lowercase().as_str(),"logicx"|"band"))))
}
fn bundle_reconnect_candidate(selected: &Path, item: &Value) -> Result<PathBuf,String> {
    let filename=item["filename"].as_str().ok_or("Project bundle filename is unavailable.")?;
    if Path::new(filename).file_name().and_then(|v|v.to_str())!=Some(filename) {
        return Err("Project bundle filename is invalid.".into());
    }
    // macOS may present .logicx/.band packages as files, so folder selection asks
    // for their parent. Also accept a directly selected package when supported.
    Ok(if selected.file_name().and_then(|v|v.to_str())==Some(filename) {selected.to_path_buf()} else {selected.join(filename)})
}
fn reconnect_path(db:&Connection,wid:&str,id:&str,path:&Path)->Result<Value,String> {
    let(_,fp,item)=get(db,wid,id)?;
    if fingerprint(path)?!=fp || metadata(path)?["filename"]!=item["filename"] {return Err("The selected file or project bundle differs from this original. Add it separately and give it a version label.".into());}
    db.execute("UPDATE music_items SET path=?3 WHERE workspace_id=?1 AND id=?2",params![wid,id,path.to_str().ok_or("Invalid path")?]).map_err(|e|e.to_string())?;
    Ok(json!({"reconnected":true}))
}
fn open(root:&Path,wid:&str)->Result<Connection,String> {
    // Existing domain remains the owner of workspace creation and database permissions.
    if crate::domain::dispatch(root,"workspace.get",json!({"workspaceId":wid}))?["id"].as_str()!=Some(wid) {return Err("Select an existing private workspace.".into());}
    let db=Connection::open(root.join("gigi.sqlite")).map_err(|e|e.to_string())?;
    db.execute_batch("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS music_items(workspace_id TEXT NOT NULL REFERENCES workspaces(id),id TEXT NOT NULL,path TEXT NOT NULL,fingerprint TEXT NOT NULL,metadata TEXT NOT NULL,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(workspace_id,id),UNIQUE(workspace_id,path,fingerprint));
      CREATE INDEX IF NOT EXISTS music_workspace ON music_items(workspace_id,updated_at,id);
      CREATE TABLE IF NOT EXISTS music_import_receipts(workspace_id TEXT NOT NULL REFERENCES workspaces(id),request_id TEXT NOT NULL,mode TEXT NOT NULL,receipt TEXT NOT NULL,PRIMARY KEY(workspace_id,request_id));
      CREATE TABLE IF NOT EXISTS music_import_claims(workspace_id TEXT NOT NULL REFERENCES workspaces(id),request_id TEXT NOT NULL,mode TEXT NOT NULL,PRIMARY KEY(workspace_id,request_id));").map_err(|e|e.to_string())?;
    Ok(db)
}
fn get(db:&Connection,wid:&str,id:&str)->Result<(String,String,Value),String> {
    let row:Option<(String,String,String)>=db.query_row("SELECT path,fingerprint,metadata FROM music_items WHERE workspace_id=?1 AND id=?2",params![wid,id],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?))).optional().map_err(|e|e.to_string())?;
    let (path,fp,data)=row.ok_or("This music entry is unavailable in this workspace.")?;
    Ok((path,fp,serde_json::from_str(&data).map_err(|_|"Music metadata is invalid.")?))
}
fn organization_revision(item:&Value)->String {
    let fields:Vec<_>=["title","artist","project","collection","version","tags"].iter().map(|field|item[*field].as_str().unwrap_or("")).collect();
    format!("{:x}",Sha256::digest(serde_json::to_vec(&fields).expect("text fields serialize")))
}
fn metadata(path:&Path)->Result<Value,String> {
    let name=path.file_name().and_then(|s|s.to_str()).ok_or("Filename is not valid Unicode.")?;
    let m=fs::metadata(path).map_err(|e|e.to_string())?;
    if !m.is_file() && !(m.is_dir()&&kind(path)=="project") {return Err("Select a media file or recognized project bundle.".into());}
    if m.is_file() {fs::File::open(path).map_err(|_|"The selected file cannot be read. Check access or select a readable original.")?;}
    Ok(json!({"title":path.file_stem().and_then(|s|s.to_str()).unwrap_or(name),"filename":name,"kind":kind(path),"isBundle":m.is_dir(),"previewable":previewable(path),"bytes":m.len(),"modified":m.modified().ok().and_then(|t|t.duration_since(UNIX_EPOCH).ok()).map(|d|d.as_secs()),"artist":"","project":"","collection":"","version":"","tags":""}))
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
    let mut added=0; let mut duplicates=0;let mut added_ids=Vec::new();let mut duplicate_ids=Vec::new();
    for (path,meta,fp) in found {
        if cancel.load(Ordering::Relaxed) {return Ok(json!({"cancelled":true,"added":0}));}
        if count+added>=LIBRARY_LIMIT {limited=true;break;}
        let id=Uuid::new_v4().to_string();
        let n=tx.execute("INSERT OR IGNORE INTO music_items(workspace_id,id,path,fingerprint,metadata) VALUES(?1,?2,?3,?4,?5)",params![wid,id,path.to_str().ok_or("Path is not valid Unicode.")?,fp,meta.to_string()]).map_err(|e|e.to_string())?;
        if n==0 {duplicates+=1;let existing:String=tx.query_row("SELECT id FROM music_items WHERE workspace_id=?1 AND path=?2 AND fingerprint=?3",params![wid,path.to_str(),fp],|r|r.get(0)).map_err(|e|e.to_string())?;duplicate_ids.push(existing);} else {added+=1;added_ids.push(id);}
    }
    tx.commit().map_err(|e|e.to_string())?;
    Ok(json!({"added":added,"duplicates":duplicates,"skipped":skipped,"limited":limited,"cancelled":false,"originalsUnchanged":true,"uploaded":false,"addedIds":added_ids,"duplicateIds":duplicate_ids,"nextStep":if limited{"Select a smaller folder for the remaining files."}else if skipped>0{"Some files were unreadable, hidden, linked or unsupported as filesystem entries. Check access and select readable originals."}else{"Open Your music or use music.list to inspect and organize these entries."}}))
}

/// The caller supplies the native selection boundary, never paths from MCP input.
/// Tests inject synthetic selections; shipping MCP always calls the native picker.
pub fn import_with_picker(root:&Path,input:&Value,picker:impl FnOnce(&str)->Result<Vec<PathBuf>,String>)->Result<Value,String>{
    let wid=need(input,"workspaceId")?;let mut db=open(root,wid)?;
    let request=need(input,"requestId")?;if Uuid::parse_str(request).is_err(){return Err("Invalid import request. Use a new UUID for a new user selection.".into());}
    let mode=input["mode"].as_str().unwrap_or("files");if !["files","folder"].contains(&mode){return Err("Choose files or folder.".into());}
    let claim=db.transaction_with_behavior(TransactionBehavior::Immediate).map_err(|e|e.to_string())?;
    let prior:Option<(String,String)>=claim.query_row("SELECT mode,receipt FROM music_import_receipts WHERE workspace_id=?1 AND request_id=?2",params![wid,request],|r|Ok((r.get(0)?,r.get(1)?))).optional().map_err(|e|e.to_string())?;
    if let Some((old_mode,receipt))=prior{if old_mode!=mode{return Err("This import request was already used with a different selection mode. Use a new requestId.".into());}return serde_json::from_str(&receipt).map_err(|_|"The import receipt could not be read. Inspect Your music before retrying.".into());}
    let pending:Option<String>=claim.query_row("SELECT mode FROM music_import_claims WHERE workspace_id=?1 AND request_id=?2",params![wid,request],|r|r.get(0)).optional().map_err(|e|e.to_string())?;
    if pending.is_some(){return Err("This import request is in progress or its outcome is unverified. Inspect Your music before starting a new selection; retrying this request will not reopen the picker.".into());}
    claim.execute("INSERT INTO music_import_claims(workspace_id,request_id,mode) VALUES(?1,?2,?3)",params![wid,request,mode]).map_err(|e|e.to_string())?;
    claim.commit().map_err(|e|e.to_string())?;
    let key=format!("{}:{wid}:{request}",root.display());let cancel=Arc::new(AtomicBool::new(false));
    {let mut active=IMPORTS.get_or_init(Default::default).lock().map_err(|_|"Import state unavailable")?;if active.contains_key(&key){return Err("This import is already running.".into());}active.insert(key.clone(),cancel.clone());}
    let result=(||{let paths=picker(mode)?;if paths.len()>IMPORT_LIMIT{return Err("Select at most 1,000 files per import.".into());}if mode=="folder"&&paths.len()>1{return Err("Select one folder per import.".into());}
      let receipt=if paths.is_empty(){json!({"cancelled":true,"added":0,"duplicates":0,"skipped":0,"addedIds":[],"duplicateIds":[],"originalsUnchanged":true,"uploaded":false,"nextStep":"Selection cancelled. Use a new requestId to open the picker again."})}else{import_paths(&mut db,wid,paths,mode=="folder",&cancel)?};
      db.execute("INSERT INTO music_import_receipts(workspace_id,request_id,mode,receipt) VALUES(?1,?2,?3,?4)",params![wid,request,mode,receipt.to_string()]).map_err(|_|"Import may have completed but its receipt could not be saved. Inspect Your music before retrying.")?;Ok(receipt)
    })();
    if let Ok(mut active)=IMPORTS.get_or_init(Default::default).lock(){active.remove(&key);}result
}

/// Receipt recovery must not create tables, update claims, or open a native picker.
fn import_status(root:&Path,input:&Value)->Result<Value,String>{
    let wid=need(input,"workspaceId")?;let request=need(input,"requestId")?;
    Uuid::parse_str(request).map_err(|_|"requestId must be a UUID.")?;
    let db=Connection::open_with_flags(root.join("gigi.sqlite"),rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY).map_err(|_|"Local workspace is unavailable.")?;
    if db.query_row("SELECT 1 FROM workspaces WHERE id=?1",[wid],|r|r.get::<_,i32>(0)).optional().map_err(|e|e.to_string())?.is_none(){return Err("Select an existing private workspace.".into());}
    let exists=|name:&str|->Result<bool,String>{Ok(db.query_row("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?1",[name],|r|r.get::<_,i32>(0)).optional().map_err(|e|e.to_string())?.is_some())};
    if exists("music_import_receipts")?{
        let receipt:Option<(String,String)>=db.query_row("SELECT receipt,mode FROM music_import_receipts WHERE workspace_id=?1 AND request_id=?2",params![wid,request],|r|Ok((r.get(0)?,r.get(1)?))).optional().map_err(|e|e.to_string())?;
        if let Some((receipt,mode))=receipt{let receipt:Value=serde_json::from_str(&receipt).map_err(|_|"Import receipt is unreadable. Inspect Your music before another selection.")?;return Ok(json!({"state":"completed","workspaceId":wid,"requestId":request,"mode":mode,"receipt":receipt}));}
    }
    if exists("music_import_claims")?&&db.query_row("SELECT 1 FROM music_import_claims WHERE workspace_id=?1 AND request_id=?2",params![wid,request],|r|r.get::<_,i32>(0)).optional().map_err(|e|e.to_string())?.is_some(){return Ok(json!({"state":"unknown","requestId":request,"reason":"in_progress_or_interrupted","nextStep":"The picker may still be open or the process may have stopped. Inspect Your music; do not start another selection automatically."}));}
    Ok(json!({"state":"not_started","requestId":request}))
}

fn organize_status(root:&Path,input:&Value)->Result<Value,String>{
 let wid=need(input,"workspaceId")?;let request=need(input,"requestId")?;Uuid::parse_str(request).map_err(|_|"requestId must be a UUID.")?;
 let db=Connection::open_with_flags(root.join("gigi.sqlite"),rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY).map_err(|_|"Local workspace is unavailable.")?;
 if db.query_row("SELECT 1 FROM workspaces WHERE id=?1",[wid],|r|r.get::<_,i32>(0)).optional().map_err(|e|e.to_string())?.is_none(){return Err("Select an existing private workspace.".into());}
 let found:Option<(String,String)>=db.query_row("SELECT request_json,result_json FROM mutation_receipts WHERE workspace_id=?1 AND operation='music.organize' AND idempotency_key=?2",params![wid,request],|r|Ok((r.get(0)?,r.get(1)?))).optional().map_err(|e|e.to_string())?;
 match found{Some((input,result))=>Ok(json!({"state":"completed","workspaceId":wid,"requestId":request,"input":serde_json::from_str::<Value>(&input).map_err(|e|e.to_string())?,"receipt":serde_json::from_str::<Value>(&result).map_err(|e|e.to_string())?})),None=>Ok(json!({"state":"unknown","workspaceId":wid,"requestId":request}))}
}
pub fn dispatch(root:&Path,op:&str,input:Value)->Result<Value,String> {
    if op=="music.importStatus"{return import_status(root,&input);}
    if op=="music.organizeStatus"{return organize_status(root,&input);}
    let wid=need(&input,"workspaceId")?;
    let mut db=open(root,wid)?;
    match op {
        "music.list"=>{
            let query=input["query"].as_str().unwrap_or("").trim().to_lowercase();
            let filter=input["kind"].as_str().unwrap_or("");
            let offset=input["offset"].as_u64().unwrap_or(0).min(10000);
            let limit=input["limit"].as_u64().unwrap_or(100).clamp(1,100);
            let sql="FROM music_items WHERE workspace_id=?1 AND (?2='' OR instr(lower(metadata),?2)>0) AND (?3='' OR json_extract(metadata,'$.kind')=?3)";
            let total:i64=db.query_row(&format!("SELECT count(*) {sql}"),params![wid,query,filter],|r|r.get(0)).map_err(|e|e.to_string())?;
            let mut statement=db.prepare(&format!("SELECT id,path,fingerprint,metadata {sql} ORDER BY updated_at DESC,id LIMIT ?5 OFFSET ?4")).map_err(|e|e.to_string())?;
            let rows=statement.query_map(params![wid,query,filter,offset,limit],|r|Ok((r.get::<_,String>(0)?,r.get::<_,String>(1)?,r.get::<_,String>(2)?,r.get::<_,String>(3)?))).map_err(|e|e.to_string())?;
            let mut items=Vec::new();
            for row in rows {
                let(id,path,fp,data)=row.map_err(|e|e.to_string())?; let mut item:Value=serde_json::from_str(&data).map_err(|e|e.to_string())?;
                item["id"]=json!(id);
                item["previewable"]=json!(previewable(Path::new(&path)));
                item["organizationRevision"]=json!(organization_revision(&item));
                item["availability"]=json!(match fingerprint(Path::new(&path)) {Ok(current) if current==fp=>"available",Ok(_)=>"changed",Err(_)=>"missing"});
                items.push(item);
            }
            Ok(json!({"items":items,"total":total,"offset":offset,"limit":limit,"hasMore":offset+limit<(total as u64)}))
        },
        "music.import"=>import_with_picker(root,&input,selected),
        "music.cancel"=>{let key=format!("{}:{wid}:{}",root.display(),need(&input,"requestId")?);if let Some(cancel)=IMPORTS.get_or_init(Default::default).lock().map_err(|_|"Import state unavailable")?.get(&key){cancel.store(true,Ordering::Relaxed);}Ok(json!({"cancelRequested":true}))},
        "music.get"=>{let id=need(&input,"id")?;let(path,fp,mut item)=get(&db,wid,id)?;item["id"]=json!(id);item["previewable"]=json!(previewable(Path::new(&path)));item["organizationRevision"]=json!(organization_revision(&item));
                item["availability"]=json!(match fingerprint(Path::new(&path)){Ok(current)if current==fp=>"available",Ok(_)=>"changed",Err(_)=>"missing"});Ok(item)},
        "music.organize"|"music.edit"=>{
            let id=need(&input,"id")?;let expected=need(&input,"expectedRevision")?;
            let tx=db.transaction_with_behavior(TransactionBehavior::Immediate).map_err(|e|e.to_string())?;
            let request=if op=="music.organize"{let request=need(&input,"requestId")?;Uuid::parse_str(request).map_err(|_|"requestId must be a UUID.")?;Some(request)}else{None};
            if let Some(request)=request{let prior:Option<(String,String)>=tx.query_row("SELECT request_json,result_json FROM mutation_receipts WHERE workspace_id=?1 AND operation='music.organize' AND idempotency_key=?2",params![wid,request],|r|Ok((r.get(0)?,r.get(1)?))).optional().map_err(|e|e.to_string())?;if let Some((original,result))=prior{if original!=input.to_string(){return Err("Organization request ID is bound to different input.".into());}return serde_json::from_str(&result).map_err(|e|e.to_string());}}
            let(path,fp,mut item)=get(&tx,wid,id)?;
            if expected!=organization_revision(&item){return Err("This music entry changed elsewhere. Your edits have not been saved. Copy any changes you want to keep, cancel this editor, then reopen the entry to review its latest organization.".into());}
            let fields=if op=="music.organize"{input["fields"].as_object().filter(|f|!f.is_empty()).ok_or("Supply at least one organization field.")?.clone()}else{["title","artist","project","collection","version","tags"].into_iter().map(|f|(f.to_string(),input[f].clone())).collect()};
            for(field,value)in fields{if !["title","artist","project","collection","version","tags"].contains(&field.as_str()){return Err(format!("Unknown music organization field: {field}"));}let value=value.as_str().ok_or("Music organization values must be text.")?.trim();if value.len()>1000||(field=="title"&&value.is_empty()){return Err("Use a nonempty title and text of at most 1,000 bytes per field.".into());}item[&field]=json!(value);}
            tx.execute("UPDATE music_items SET metadata=?3,updated_at=CURRENT_TIMESTAMP WHERE workspace_id=?1 AND id=?2",params![wid,id,item.to_string()]).map_err(|e|e.to_string())?;
            item["id"]=json!(id);item["organizationRevision"]=json!(organization_revision(&item));item["previewable"]=json!(previewable(Path::new(&path)));item["availability"]=json!(match fingerprint(Path::new(&path)){Ok(current)if current==fp=>"available",Ok(_)=>"changed",Err(_)=>"missing"});
            let result=json!({"saved":true,"id":id,"item":item,"originalsUnchanged":true,"uploaded":false});
            if let Some(request)=request{tx.execute("INSERT INTO mutation_receipts(workspace_id,operation,idempotency_key,request_json,result_json) VALUES(?1,'music.organize',?2,?3,?4)",params![wid,request,input.to_string(),result.to_string()]).map_err(|e|e.to_string())?;}
            tx.commit().map_err(|e|e.to_string())?;Ok(result)
        },
        "music.remove"=>{let id=need(&input,"id")?;get(&db,wid,id)?;db.execute("DELETE FROM music_items WHERE workspace_id=?1 AND id=?2",params![wid,id]).map_err(|e|e.to_string())?;Ok(json!({"removed":true,"originalUnchanged":true}))},
        "music.reconnect"=>{
            let id=need(&input,"id")?;let(original,fp,item)=get(&db,wid,id)?;
            let is_bundle=bundle_entry(&item,Path::new(&original),&fp);
            let title=if is_bundle {format!("Select the folder containing {}",item["filename"].as_str().unwrap_or("the original project bundle"))} else {"Reconnect the original file (changed versions must be added separately)".into()};
            let dialog=rfd::FileDialog::new().set_title(title);
            let selection=if is_bundle {dialog.pick_folder()} else {dialog.pick_file()};
            let Some(selection)=selection else{return Ok(json!({"cancelled":true}));};
            let path=if is_bundle {bundle_reconnect_candidate(&selection,&item)?} else {selection};
            reconnect_path(&db,wid,id,&path)
        },
        "music.preview"=>{
            let(path,fp,item)=get(&db,wid,need(&input,"id")?)?;
            if !previewable(Path::new(&path)) {return Err("Project files and unsupported formats have no in-app preview.".into());}
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
    #[test]fn organization_receipt_is_atomic_exact_and_survives_later_edit_and_removal(){
      let(root,wid,file)=fixture();let imported=import_with_picker(&root,&json!({"workspaceId":wid,"requestId":Uuid::new_v4().to_string()}),|_|Ok(vec![file])).unwrap();let id=&imported["addedIds"][0];
      let old=dispatch(&root,"music.get",json!({"workspaceId":wid,"id":id})).unwrap();let request=Uuid::new_v4().to_string();let input=json!({"workspaceId":wid,"requestId":request,"id":id,"expectedRevision":old["organizationRevision"],"fields":{"title":" New title "}});let lookup=json!({"workspaceId":wid,"requestId":request});
      open(&root,&wid).unwrap().execute_batch("CREATE TRIGGER fail_organization_receipt BEFORE INSERT ON mutation_receipts WHEN NEW.operation='music.organize' BEGIN SELECT RAISE(ABORT,'synthetic receipt failure'); END;").unwrap();
      assert!(dispatch(&root,"music.organize",input.clone()).is_err());assert_eq!(dispatch(&root,"music.get",json!({"workspaceId":wid,"id":id})).unwrap()["title"],old["title"]);assert_eq!(dispatch(&root,"music.organizeStatus",lookup.clone()).unwrap()["state"],"unknown");
      open(&root,&wid).unwrap().execute_batch("DROP TRIGGER fail_organization_receipt;").unwrap();
      let saved=dispatch(&root,"music.organize",input.clone()).unwrap();assert_eq!(saved["item"]["title"],"New title");assert_eq!(dispatch(&root,"music.organize",input.clone()).unwrap(),saved);
      let mut changed=input.clone();changed["fields"]["title"]=json!("Different");assert!(dispatch(&root,"music.organize",changed).is_err());
      dispatch(&root,"music.organize",json!({"workspaceId":wid,"requestId":Uuid::new_v4().to_string(),"id":id,"expectedRevision":saved["item"]["organizationRevision"],"fields":{"title":"Later"}})).unwrap();
      dispatch(&root,"music.remove",json!({"workspaceId":wid,"id":id})).unwrap();assert_eq!(dispatch(&root,"music.organize",input.clone()).unwrap(),saved);
      let before=fs::read(root.join("gigi.sqlite")).unwrap();let status=dispatch(&root,"music.organizeStatus",lookup).unwrap();assert_eq!(status["input"],input);assert_eq!(status["receipt"],saved);assert_eq!(before,fs::read(root.join("gigi.sqlite")).unwrap());
      let foreign=Uuid::new_v4().to_string();crate::domain::open(&root).unwrap().execute("INSERT INTO workspaces(id,name) VALUES(?1,'Other')",[&foreign]).unwrap();assert_eq!(dispatch(&root,"music.organizeStatus",json!({"workspaceId":foreign,"requestId":request})).unwrap()["state"],"unknown");
      let failed=Uuid::new_v4().to_string();assert!(dispatch(&root,"music.organize",json!({"workspaceId":wid,"requestId":failed,"id":id,"expectedRevision":"stale","fields":{"title":"Rejected"}})).is_err());assert_eq!(dispatch(&root,"music.organizeStatus",json!({"workspaceId":wid,"requestId":failed})).unwrap()["state"],"unknown");fs::remove_dir_all(root).unwrap();
    }
    #[test]fn failed_import_receipt_is_explicitly_uncertain_and_never_reopens_picker(){
      let(root,wid,file)=fixture();let input=json!({"workspaceId":wid,"requestId":Uuid::new_v4().to_string()});
      open(&root,&wid).unwrap().execute_batch("CREATE TRIGGER fail_import_receipt BEFORE INSERT ON music_import_receipts BEGIN SELECT RAISE(ABORT,'synthetic receipt failure'); END;").unwrap();
      let error=import_with_picker(&root,&input,|_|Ok(vec![file])).unwrap_err();assert!(error.contains("Import may have completed but its receipt could not be saved."));
      assert_eq!(dispatch(&root,"music.list",json!({"workspaceId":wid})).unwrap()["total"],1);assert_eq!(dispatch(&root,"music.importStatus",input.clone()).unwrap()["state"],"unknown");
      assert!(import_with_picker(&root,&input,|_|panic!("never retry unknown import")).is_err());fs::remove_dir_all(root).unwrap();
    }
    #[test]fn import_status_is_read_only_and_distinguishes_receipt_claim_and_absence(){
        let(root,wid,file)=fixture();let request=Uuid::new_v4().to_string();let input=json!({"workspaceId":wid,"requestId":request});
        let before=fs::read(root.join("gigi.sqlite")).unwrap();
        assert_eq!(dispatch(&root,"music.importStatus",input.clone()).unwrap()["state"],"not_started");
        assert_eq!(fs::read(root.join("gigi.sqlite")).unwrap(),before,"status must not even initialize music tables");
        assert!(dispatch(&root,"music.importStatus",json!({"workspaceId":"foreign","requestId":request})).is_err());
        let receipt=import_with_picker(&root,&input,|_|{assert_eq!(dispatch(&root,"music.importStatus",input.clone()).unwrap()["state"],"unknown");Ok(vec![file])}).unwrap();
        let before=fs::read(root.join("gigi.sqlite")).unwrap();let status=dispatch(&root,"music.importStatus",input).unwrap();assert_eq!(status["state"],"completed");assert_eq!(status["receipt"],receipt);assert_eq!(status["mode"],"files");assert_eq!(status["workspaceId"],wid);assert_eq!(fs::read(root.join("gigi.sqlite")).unwrap(),before);
        let cancel_id=Uuid::new_v4().to_string();let cancel=json!({"workspaceId":wid,"requestId":cancel_id});import_with_picker(&root,&cancel,|_|Ok(vec![])).unwrap();assert_eq!(dispatch(&root,"music.importStatus",cancel).unwrap()["receipt"]["cancelled"],true);
        fs::remove_dir_all(root).unwrap();
    }
    #[test]fn stale_ui_and_agent_organization_cannot_overwrite_newer_metadata(){
        let(root,wid,file)=fixture();let imported=import_with_picker(&root,&json!({"workspaceId":wid,"requestId":Uuid::new_v4().to_string()}),|_|Ok(vec![file])).unwrap();let id=&imported["addedIds"][0];
        let original=dispatch(&root,"music.get",json!({"workspaceId":wid,"id":id})).unwrap();
        dispatch(&root,"music.organize",json!({"requestId":Uuid::new_v4().to_string(),"workspaceId":wid,"id":id,"expectedRevision":original["organizationRevision"],"fields":{"collection":"Agent collection"}})).unwrap();
        let mut stale=original.clone();stale["workspaceId"]=json!(wid);stale["expectedRevision"]=original["organizationRevision"].clone();stale["title"]=json!("Unsaved UI title");
        assert!(dispatch(&root,"music.edit",stale).unwrap_err().contains("changed elsewhere"));
        assert!(dispatch(&root,"music.organize",json!({"requestId":Uuid::new_v4().to_string(),"workspaceId":wid,"id":id,"expectedRevision":original["organizationRevision"],"fields":{"tags":"stale agent tags"}})).unwrap_err().contains("changed elsewhere"));
        let fresh=dispatch(&root,"music.get",json!({"workspaceId":wid,"id":id})).unwrap();assert_eq!(fresh["collection"],"Agent collection");assert_eq!(fresh["title"],original["title"]);
        dispatch(&root,"music.organize",json!({"requestId":Uuid::new_v4().to_string(),"workspaceId":wid,"id":id,"expectedRevision":fresh["organizationRevision"],"fields":{"title":"Reviewed new title"}})).unwrap();
        assert_eq!(dispatch(&root,"music.get",json!({"workspaceId":wid,"id":id})).unwrap()["collection"],"Agent collection");fs::remove_dir_all(root).unwrap();
    }
    #[test]fn import_claim_is_persisted_before_picker_and_survives_restart(){
        let(root,wid,_)=fixture();let request=Uuid::new_v4().to_string();let input=json!({"workspaceId":wid,"requestId":request});
        let first=import_with_picker(&root,&input,|_|{
            // A fresh independent DB connection observes the claim before any selection.
            let db=open(&root,&wid).unwrap();let claims:i64=db.query_row("SELECT count(*) FROM music_import_claims WHERE workspace_id=?1 AND request_id=?2",params![wid,request],|r|r.get(0)).unwrap();assert_eq!(claims,1);
            Err("Synthetic interruption after claim".into())
        });assert!(first.is_err());
        // Clear in-process state to model restart. The durable claim must still block the picker.
        IMPORTS.get_or_init(Default::default).lock().unwrap().remove(&format!("{}:{wid}:{request}",root.display()));
        assert!(import_with_picker(&root,&input,|_|panic!("must not repeat uncertain picker")).unwrap_err().contains("unverified"));
        let completed=Uuid::new_v4().to_string();let receipt=json!({"added":1,"originalsUnchanged":true});
        open(&root,&wid).unwrap().execute("INSERT INTO music_import_receipts(workspace_id,request_id,mode,receipt) VALUES(?1,?2,'files',?3)",params![wid,completed,receipt.to_string()]).unwrap();
        assert_eq!(import_with_picker(&root,&json!({"workspaceId":wid,"requestId":completed}),|_|panic!("legacy receipt must not open picker")).unwrap(),receipt);
        fs::remove_dir_all(root).unwrap();
    }
    #[test]fn import_is_local_deduplicated_and_workspace_bound(){let(root,wid,file)=fixture();let mut db=open(&root,&wid).unwrap();let cancel=AtomicBool::new(false);assert_eq!(import_paths(&mut db,&wid,vec![file.clone()],false,&cancel).unwrap()["added"],1);assert_eq!(import_paths(&mut db,&wid,vec![file.clone()],false,&cancel).unwrap()["duplicates"],1);let result=dispatch(&root,"music.list",json!({"workspaceId":wid})).unwrap();assert_eq!(result["items"][0]["kind"],"video");assert_eq!(result["items"][0]["availability"],"available");let id=&result["items"][0]["id"];assert!(dispatch(&root,"music.preview",json!({"workspaceId":"wrong","id":id})).is_err());dispatch(&root,"music.remove",json!({"workspaceId":wid,"id":id})).unwrap();assert!(file.exists());fs::remove_dir_all(root).unwrap();}
    #[test]fn changed_files_and_symlinks_are_not_previewed(){let(root,wid,file)=fixture();let mut db=open(&root,&wid).unwrap();import_paths(&mut db,&wid,vec![file.clone()],false,&AtomicBool::new(false)).unwrap();let listed=dispatch(&root,"music.list",json!({"workspaceId":wid})).unwrap();fs::write(&file,b"changed").unwrap();assert!(dispatch(&root,"music.preview",json!({"workspaceId":wid,"id":listed["items"][0]["id"]})).is_err());let link=root.join("alias.mp4");std::os::unix::fs::symlink(&file,&link).unwrap();assert!(fingerprint(&link).is_err());fs::remove_dir_all(root).unwrap();}
    #[test]fn cancelled_import_does_not_save_entries(){let(root,wid,file)=fixture();let mut db=open(&root,&wid).unwrap();assert_eq!(import_paths(&mut db,&wid,vec![file],false,&AtomicBool::new(true)).unwrap()["cancelled"],true);assert_eq!(dispatch(&root,"music.list",json!({"workspaceId":wid})).unwrap()["total"],0);fs::remove_dir_all(root).unwrap();}
    #[test]fn organization_survives_reopen_and_backup_without_media_copy(){
        let(root,wid,file)=fixture();
        let mut db=open(&root,&wid).unwrap();
        import_paths(&mut db,&wid,vec![file.clone()],false,&AtomicBool::new(false)).unwrap();drop(db);
        let listed=dispatch(&root,"music.list",json!({"workspaceId":wid})).unwrap();let id=listed["items"][0]["id"].clone();
        dispatch(&root,"music.edit",json!({"workspaceId":wid,"id":id,"expectedRevision":listed["items"][0]["organizationRevision"],"title":"First bounce","artist":"Fixture","project":"Night Drive","collection":"References","version":"Mix 03","tags":"ambient"})).unwrap();
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
    #[test]fn bundle_nested_edits_are_new_versions_and_moved_original_reconnects(){
        let(root,wid,_)=fixture();let bundle=root.join("Song.logicx");let nested=bundle.join("Alternatives/000");fs::create_dir_all(&nested).unwrap();
        let session=nested.join("ProjectData");fs::write(&session,b"first").unwrap();let mut db=open(&root,&wid).unwrap();let cancel=AtomicBool::new(false);
        assert_eq!(import_paths(&mut db,&wid,vec![bundle.clone()],false,&cancel).unwrap()["added"],1);
        let first=dispatch(&root,"music.list",json!({"workspaceId":wid})).unwrap();let id=first["items"][0]["id"].as_str().unwrap();
        assert!(bundle_entry(&first["items"][0],&bundle,""));assert_eq!(first["items"][0]["previewable"],false);
        let root_identity=metadata_identity(&fs::metadata(&bundle).unwrap()).unwrap();
        fs::write(&session,b"second revision").unwrap();
        assert_eq!(metadata_identity(&fs::metadata(&bundle).unwrap()).unwrap(),root_identity);
        assert_eq!(dispatch(&root,"music.list",json!({"workspaceId":wid})).unwrap()["items"][0]["availability"],"changed");
        assert!(reconnect_path(&db,&wid,id,&bundle).is_err());
        assert_eq!(import_paths(&mut db,&wid,vec![bundle.clone()],false,&cancel).unwrap()["added"],1);
        let current=dispatch(&root,"music.list",json!({"workspaceId":wid})).unwrap();
        let item=current["items"].as_array().unwrap().iter().find(|v|v["availability"]=="available").unwrap();let current_id=item["id"].as_str().unwrap();
        let moved_parent=root.join("relocated");fs::create_dir(&moved_parent).unwrap();let moved=moved_parent.join("Song.logicx");fs::rename(&bundle,&moved).unwrap();
        assert!(bundle_entry(item,&bundle,""));
        let candidate=bundle_reconnect_candidate(&moved_parent,item).unwrap();assert_eq!(candidate,moved);
        assert_eq!(bundle_reconnect_candidate(&moved,item).unwrap(),moved);
        assert_eq!(reconnect_path(&db,&wid,current_id,&candidate).unwrap()["reconnected"],true);
        assert_eq!(get(&db,&wid,current_id).unwrap().0,moved.to_str().unwrap());fs::remove_dir_all(root).unwrap();
    }
    #[test]fn bundle_verification_rejects_links_and_excessive_depth(){
        let(root,_,file)=fixture();let bundle=root.join("Session.band");fs::create_dir(&bundle).unwrap();let link=bundle.join("outside");std::os::unix::fs::symlink(&file,&link).unwrap();assert!(fingerprint(&bundle).is_err());fs::remove_file(link).unwrap();
        let mut deep=bundle.clone();for _ in 0..=BUNDLE_DEPTH_LIMIT {deep=deep.join("nested");fs::create_dir(&deep).unwrap();}assert!(fingerprint(&bundle).is_err());fs::remove_dir_all(root).unwrap();
    }
    #[test]fn mkv_is_organized_as_video_without_a_broken_preview(){
        let(root,wid,_)=fixture();let file=root.join("Reference.mkv");fs::write(&file,b"fixture").unwrap();let mut db=open(&root,&wid).unwrap();
        import_paths(&mut db,&wid,vec![file],false,&AtomicBool::new(false)).unwrap();let result=dispatch(&root,"music.list",json!({"workspaceId":wid})).unwrap();let item=&result["items"][0];assert_eq!(item["kind"],"video");assert_eq!(item["previewable"],false);assert!(dispatch(&root,"music.preview",json!({"workspaceId":wid,"id":item["id"]})).is_err());fs::remove_dir_all(root).unwrap();
    }

}
