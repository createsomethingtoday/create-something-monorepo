//! Workspace-owned static images. Bytes stay in SQLite and its existing backups.
//! The only filesystem input is a native picker or an expiring, exact import slot.
use image::{DynamicImage, ImageDecoder, ImageFormat, ImageReader, Limits};
use rusqlite::{params, Connection, OptionalExtension, TransactionBehavior};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    fs,
    io::{Cursor, Read},
    os::unix::fs::{MetadataExt, OpenOptionsExt, PermissionsExt},
    path::{Path, PathBuf},
};
use uuid::Uuid;

pub const INPUT_LIMIT: u64 = 8 * 1024 * 1024;
const WORKSPACE_LIMIT: i64 = 128 * 1024 * 1024;
fn err(e: impl std::fmt::Display) -> String {
    e.to_string()
}
fn need<'a>(v: &'a Value, key: &str) -> Result<&'a str, String> {
    v[key]
        .as_str()
        .filter(|s| !s.is_empty())
        .ok_or_else(|| format!("{key} is required"))
}
fn uuid(v: &Value, key: &str) -> Result<String, String> {
    let s = need(v, key)?;
    Uuid::parse_str(s).map_err(err)?;
    Ok(s.into())
}
fn hash(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}
fn now() -> i64 {
    chrono::Utc::now().timestamp()
}
pub(crate) fn ensure(db: &Connection) -> Result<(), String> {
    db.execute_batch("CREATE TABLE IF NOT EXISTS image_assets(workspace_id TEXT NOT NULL REFERENCES workspaces(id),id TEXT NOT NULL,sha256 TEXT NOT NULL,mime TEXT NOT NULL,width INTEGER NOT NULL,height INTEGER NOT NULL,original BLOB NOT NULL,thumbnail BLOB NOT NULL,metadata_json TEXT NOT NULL,PRIMARY KEY(workspace_id,id),UNIQUE(workspace_id,sha256));
    CREATE TABLE IF NOT EXISTS image_covers(workspace_id TEXT NOT NULL REFERENCES workspaces(id),entity TEXT NOT NULL,record_id TEXT NOT NULL,asset_id TEXT,alt TEXT NOT NULL,revision INTEGER NOT NULL,PRIMARY KEY(workspace_id,entity,record_id),FOREIGN KEY(workspace_id,asset_id) REFERENCES image_assets(workspace_id,id));
    CREATE TABLE IF NOT EXISTS image_import_slots(workspace_id TEXT NOT NULL REFERENCES workspaces(id),request_id TEXT NOT NULL,format TEXT NOT NULL,expires_at INTEGER NOT NULL,result_json TEXT NOT NULL,PRIMARY KEY(workspace_id,request_id));
    CREATE TABLE IF NOT EXISTS image_import_claims(workspace_id TEXT NOT NULL REFERENCES workspaces(id),request_id TEXT NOT NULL,input_json TEXT NOT NULL,PRIMARY KEY(workspace_id,request_id));").map_err(err)
}
fn workspace(db: &Connection, wid: &str) -> Result<(), String> {
    if db
        .query_row("SELECT 1 FROM workspaces WHERE id=?1", [wid], |r| {
            r.get::<_, i32>(0)
        })
        .optional()
        .map_err(err)?
        .is_none()
    {
        return Err("Unknown private workspace".into());
    }
    Ok(())
}
fn target(db: &Connection, wid: &str, input: &Value) -> Result<(String, String), String> {
    let entity = need(input, "entity")?;
    if !["gigs", "schedule", "music"].contains(&entity) {
        return Err("Images attach to gigs, schedule entries or music entries".into());
    }
    let id = uuid(input, "id")?;
    let table = if entity == "music" {
        "music_items"
    } else {
        entity
    };
    if db
        .query_row(
            &format!("SELECT 1 FROM {table} WHERE workspace_id=?1 AND id=?2"),
            params![wid, id],
            |r| r.get::<_, i32>(0),
        )
        .optional()
        .map_err(|_| "Image target is unavailable".to_string())?
        .is_none()
    {
        return Err("Image target is unavailable in this workspace".into());
    }
    Ok((entity.into(), id))
}
pub(crate) fn revision(db: &Connection, wid: &str, entity: &str, id: &str) -> Result<i64, String> {
    Ok(db.query_row("SELECT revision FROM image_covers WHERE workspace_id=?1 AND entity=?2 AND record_id=?3",params![wid,entity,id],|r|r.get(0)).optional().map_err(err)?.unwrap_or(0))
}
pub(crate) fn asset(db: &Connection, wid: &str, id: &str) -> Result<Value, String> {
    db.query_row("SELECT sha256,mime,width,height,length(original),metadata_json FROM image_assets WHERE workspace_id=?1 AND id=?2",params![wid,id],|r|Ok((r.get::<_,String>(0)?,r.get::<_,String>(1)?,r.get::<_,i64>(2)?,r.get::<_,i64>(3)?,r.get::<_,i64>(4)?,r.get::<_,String>(5)?))).optional().map_err(err)?.map(|(sha,mime,width,height,bytes,meta)|Ok(json!({"assetId":id,"workspaceId":wid,"sha256":sha,"mime":mime,"width":width,"height":height,"bytes":bytes,"provenance":serde_json::from_str::<Value>(&meta).map_err(err)?,"uploaded":false}))).unwrap_or_else(||Err("Image is unavailable in this workspace".into()))
}
pub(crate) fn cover(db: &Connection, wid: &str, entity: &str, id: &str) -> Result<Value, String> {
    let row:Option<(Option<String>,String)>=db.query_row("SELECT asset_id,alt FROM image_covers WHERE workspace_id=?1 AND entity=?2 AND record_id=?3",params![wid,entity,id],|r|Ok((r.get(0)?,r.get(1)?))).optional().map_err(err)?;
    if let Some((Some(asset_id), alt)) = row {
        let mut result = asset(db, wid, &asset_id)?;
        result["alt"] = json!(alt);
        return Ok(result);
    }
    Ok(Value::Null)
}
pub(crate) fn resolved_cover(
    db: &Connection,
    wid: &str,
    entity: &str,
    id: &str,
) -> Result<Value, String> {
    let own = cover(db, wid, entity, id)?;
    if entity == "gigs" && own.is_null() && revision(db, wid, entity, id)? == 0 {
        if let Some(source) = crate::agenda::verified_source(db, wid, id)? {
            let mut inherited = cover(db, wid, "schedule", &source)?;
            if inherited.is_object() {
                inherited["inheritedFrom"] = json!({"entity":"schedule","id":source});
            }
            return Ok(inherited);
        }
    }
    Ok(own)
}
fn alt(input: &Value) -> Result<String, String> {
    let text = need(input, "alt")?.trim();
    if text.is_empty() || text.chars().count() > 500 {
        return Err("Describe the image in 1–500 characters".into());
    }
    Ok(text.into())
}
fn provenance(input: &Value) -> Result<Value, String> {
    let value = &input["provenance"];
    let map = value.as_object().ok_or("Image provenance is required")?;
    if map.keys().any(|k| {
        ![
            "origin",
            "purpose",
            "rights",
            "sourceUrl",
            "creator",
            "generator",
            "prompt",
        ]
        .contains(&k.as_str())
    }) || value.to_string().len() > 5000
    {
        return Err("Invalid image provenance".into());
    }
    let origin = need(value, "origin")?;
    let purpose = need(value, "purpose")?;
    if !["supplied", "generated"].contains(&origin)
        || !["artwork", "illustration", "official_flyer"].contains(&purpose)
        || !["unknown", "owned", "licensed", "permission"].contains(&need(value, "rights")?)
    {
        return Err("Invalid image provenance".into());
    }
    for (key, item) in map {
        let s = item.as_str().ok_or("Provenance must contain text")?;
        if s.chars().count() > if key == "prompt" { 2000 } else { 1000 } {
            return Err("Image provenance is too long".into());
        }
    }
    if origin == "generated"
        && (purpose == "official_flyer"
            || value["generator"]
                .as_str()
                .is_none_or(|s| s.trim().is_empty()))
    {
        return Err(
            "Generated artwork must name its generator and cannot be an official flyer".into(),
        );
    }
    if let Some(source) = value["sourceUrl"].as_str().filter(|s| !s.is_empty()) {
        let url = tauri::Url::parse(source).map_err(|_| "Invalid attribution URL")?;
        if url.scheme() != "https"
            || !url.username().is_empty()
            || url.password().is_some()
            || url.port().is_some()
            || url.fragment().is_some()
            || url.host_str().is_none()
        {
            return Err("Use an HTTPS attribution URL without credentials or fragments".into());
        }
    }
    if purpose == "official_flyer" && value["sourceUrl"].as_str().is_none_or(|s| s.is_empty()) {
        return Err("A supplied official flyer needs its source URL; this is user attribution, not issuer verification".into());
    }
    Ok(value.clone())
}
fn receipt(
    db: &Connection,
    wid: &str,
    op: &str,
    request: &str,
    input: &Value,
) -> Result<Option<Value>, String> {
    let row:Option<(String,String)>=db.query_row("SELECT request_json,result_json FROM mutation_receipts WHERE workspace_id=?1 AND operation=?2 AND idempotency_key=?3",params![wid,op,request],|r|Ok((r.get(0)?,r.get(1)?))).optional().map_err(err)?;
    row.map(|(prior, result)| {
        if prior != input.to_string() {
            return Err("Image request ID is bound to different input".into());
        }
        serde_json::from_str(&result).map_err(err)
    })
    .transpose()
}
fn remember(
    db: &Connection,
    wid: &str,
    op: &str,
    request: &str,
    input: &Value,
    result: &Value,
) -> Result<(), String> {
    db.execute("INSERT INTO mutation_receipts(workspace_id,operation,idempotency_key,request_json,result_json) VALUES(?1,?2,?3,?4,?5)",params![wid,op,request,input.to_string(),result.to_string()]).map_err(err)?;
    Ok(())
}
fn attach(
    db: &Connection,
    wid: &str,
    input: &Value,
    asset_id: Option<&str>,
) -> Result<Value, String> {
    let (entity, id) = target(db, wid, input)?;
    let current = revision(db, wid, &entity, &id)?;
    if input["expectedRevision"].as_i64() != Some(current) {
        return Err("Image changed elsewhere. Reload the record before attaching".into());
    }
    let description = if let Some(asset_id) = asset_id {
        asset(db, wid, asset_id)?;
        alt(input)?
    } else {
        String::new()
    };
    db.execute("INSERT INTO image_covers(workspace_id,entity,record_id,asset_id,alt,revision) VALUES(?1,?2,?3,?4,?5,?6) ON CONFLICT(workspace_id,entity,record_id) DO UPDATE SET asset_id=excluded.asset_id,alt=excluded.alt,revision=excluded.revision",params![wid,entity,id,asset_id,description,current+1]).map_err(err)?;
    Ok(
        json!({"saved":true,"entity":entity,"id":id,"cover":cover(db,wid,&entity,&id)?,"coverRevision":current+1,"uploaded":false}),
    )
}
fn no_links(path: &Path) -> Result<(), String> {
    if !path.is_absolute()
        || path
            .components()
            .any(|p| matches!(p, std::path::Component::ParentDir))
    {
        return Err("Unsafe image input".into());
    }
    for part in path.ancestors() {
        if fs::symlink_metadata(part)
            .map_err(err)?
            .file_type()
            .is_symlink()
        {
            return Err("Symbolic links are not accepted for images".into());
        }
    }
    Ok(())
}
fn read_file(path: &Path) -> Result<Vec<u8>, String> {
    no_links(path)?;
    let file = fs::OpenOptions::new()
        .read(true)
        .custom_flags(libc::O_NOFOLLOW | libc::O_NONBLOCK)
        .open(path)
        .map_err(err)?;
    let before = file.metadata().map_err(err)?;
    if !before.is_file() || before.len() == 0 || before.len() > INPUT_LIMIT {
        return Err("Choose a static JPEG or PNG no larger than 8 MiB".into());
    }
    let mut bytes = Vec::new();
    file.take(INPUT_LIMIT + 1)
        .read_to_end(&mut bytes)
        .map_err(err)?;
    let after = fs::symlink_metadata(path).map_err(err)?;
    if after.file_type().is_symlink()
        || before.dev() != after.dev()
        || before.ino() != after.ino()
        || before.len() != after.len()
        || before.mtime() != after.mtime()
        || before.mtime_nsec() != after.mtime_nsec()
        || bytes.len() as u64 != before.len()
    {
        return Err("Image changed while being read".into());
    }
    Ok(bytes)
}
fn decode(bytes: &[u8]) -> Result<(String, u32, u32, Vec<u8>), String> {
    let format = image::guess_format(bytes).map_err(|_| "Choose a valid static JPEG or PNG")?;
    if ![ImageFormat::Png, ImageFormat::Jpeg].contains(&format) {
        return Err("Only static JPEG and PNG images are supported".into());
    }
    // PNG animation control is a real chunk, not a text substring in image data.
    if format == ImageFormat::Png {
        let mut pos = 8usize;
        while pos + 12 <= bytes.len() {
            let len = u32::from_be_bytes(bytes[pos..pos + 4].try_into().unwrap()) as usize;
            if bytes[pos + 4..pos + 8] == *b"acTL" {
                return Err("Animated PNG images are unsupported".into());
            }
            pos = pos
                .checked_add(len)
                .and_then(|v| v.checked_add(12))
                .ok_or("Invalid PNG")?;
        }
    }
    let mut reader = ImageReader::with_format(Cursor::new(bytes), format);
    let mut limits = Limits::default();
    limits.max_image_width = Some(8192);
    limits.max_image_height = Some(8192);
    limits.max_alloc = Some(128 * 1024 * 1024);
    reader.limits(limits);
    let mut decoder = reader
        .into_decoder()
        .map_err(|_| "Image could not be decoded within its limits")?;
    let (w, h) = decoder.dimensions();
    if w == 0
        || h == 0
        || u64::from(w) * u64::from(h) > 24_000_000
        || decoder.total_bytes() > 96 * 1024 * 1024
    {
        return Err("Image exceeds 24 megapixels or the decoded image limit".into());
    }
    let orientation = decoder.orientation().map_err(err)?;
    let mut decoded =
        DynamicImage::from_decoder(decoder).map_err(|_| "Image is damaged or unsupported")?;
    decoded.apply_orientation(orientation);
    let (width, height) = (decoded.width(), decoded.height());
    let mut thumb = Cursor::new(Vec::new());
    decoded
        .thumbnail(width.min(512), height.min(512))
        .to_rgba8()
        .write_to(&mut thumb, ImageFormat::Png)
        .map_err(err)?;
    Ok((
        if format == ImageFormat::Png {
            "image/png"
        } else {
            "image/jpeg"
        }
        .into(),
        width,
        height,
        thumb.into_inner(),
    ))
}
fn slot_path(root: &Path, wid: &str, request: &str, format: &str) -> Result<PathBuf, String> {
    Uuid::parse_str(wid).map_err(err)?;
    Uuid::parse_str(request).map_err(err)?;
    if !["png", "jpeg"].contains(&format) {
        return Err("Choose png or jpeg".into());
    }
    Ok(fs::canonicalize(root)
        .map_err(err)?
        .join("image-inbox")
        .join(wid)
        .join(request)
        .join(format!("asset.{format}")))
}
fn prune_slots(root: &Path, db: &Connection, wid: &str) -> Result<(), String> {
    let mut statement=db.prepare("SELECT request_id,format FROM image_import_slots WHERE workspace_id=?1 AND expires_at>0 AND expires_at<?2 LIMIT 100").map_err(err)?;
    let expired = statement
        .query_map(params![wid, now()], |r| {
            Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?))
        })
        .map_err(err)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(err)?;
    for (request, format) in expired {
        let path = slot_path(root, wid, &request, &format)?;
        if path.exists() {
            no_links(&path)?;
            fs::remove_file(&path).map_err(err)?;
        }
        let _ = fs::remove_dir(path.parent().unwrap());
        db.execute(
            "UPDATE image_import_slots SET expires_at=0 WHERE workspace_id=?1 AND request_id=?2",
            params![wid, request],
        )
        .map_err(err)?;
    }
    Ok(())
}
fn prepare(root: &Path, db: &mut Connection, wid: &str, input: &Value) -> Result<Value, String> {
    prune_slots(root, db, wid)?;
    let request = uuid(input, "requestId")?;
    let format = need(input, "format")?;
    let tx = db
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(err)?;
    if let Some((old,expires,result))=tx.query_row("SELECT format,expires_at,result_json FROM image_import_slots WHERE workspace_id=?1 AND request_id=?2",params![wid,request],|r|Ok((r.get::<_,String>(0)?,r.get::<_,i64>(1)?,r.get::<_,String>(2)?))).optional().map_err(err)? {if old!=format{return Err("Import preparation is bound to another format".into())}if expires<now(){return Err("Image import slot expired. Prepare a new request".into())}return serde_json::from_str(&result).map_err(err)}
    let count: i64 = tx
        .query_row(
            "SELECT count(*) FROM image_import_slots WHERE workspace_id=?1 AND expires_at>=?2",
            params![wid, now()],
            |r| r.get(0),
        )
        .map_err(err)?;
    if count >= 20 {
        return Err(
            "Twenty image slots are pending. Finish an import or wait fifteen minutes".into(),
        );
    }
    let path = slot_path(root, wid, &request, format)?;
    let parent = path.parent().unwrap();
    fs::create_dir_all(parent).map_err(err)?;
    no_links(parent)?;
    for part in parent.ancestors().take(3) {
        fs::set_permissions(part, fs::Permissions::from_mode(0o700)).map_err(err)?;
    }
    fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .mode(0o600)
        .custom_flags(libc::O_NOFOLLOW)
        .open(&path)
        .map_err(err)?;
    let expires = now() + 900;
    let result = json!({"requestId":request,"path":path,"format":format,"expiresAt":expires,"maximumBytes":INPUT_LIMIT,"uploaded":false,"instruction":"Copy one authorized image into this exact slot, then import using its SHA-256. No arbitrary input paths are accepted."});
    tx.execute(
        "INSERT INTO image_import_slots VALUES(?1,?2,?3,?4,?5)",
        params![wid, request, format, expires, result.to_string()],
    )
    .map_err(err)?;
    tx.commit().map_err(err)?;
    Ok(result)
}
pub fn import_with_picker(
    root: &Path,
    input: Value,
    picker: impl FnOnce() -> Option<PathBuf>,
) -> Result<Value, String> {
    validate("media.import", &input)?;
    let wid = uuid(&input, "workspaceId")?;
    let request = uuid(&input, "requestId")?;
    let mut db = crate::domain::open(root)?;
    workspace(&db, &wid)?;
    if let Some(result) = receipt(&db, &wid, "media.import", &request, &input)? {
        return Ok(result);
    }
    target(&db, &wid, &input)?;
    alt(&input)?;
    let metadata = provenance(&input)?;
    let mut slot = None;
    let path = if input["mode"] == "picker" {
        let tx = db
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(err)?;
        if let Some(result) = receipt(&tx, &wid, "media.import", &request, &input)? {
            return Ok(result);
        }
        if tx
            .query_row(
                "SELECT 1 FROM image_import_claims WHERE workspace_id=?1 AND request_id=?2",
                params![wid, request],
                |r| r.get::<_, i32>(0),
            )
            .optional()
            .map_err(err)?
            .is_some()
        {
            return Err("Image selection may be in progress or interrupted. Check the original operation receipt".into());
        }
        tx.execute(
            "INSERT INTO image_import_claims VALUES(?1,?2,?3)",
            params![wid, request, input.to_string()],
        )
        .map_err(err)?;
        tx.commit().map_err(err)?;
        let Some(path) = picker() else {
            let result = json!({"cancelled":true,"saved":false,"uploaded":false});
            remember(&db, &wid, "media.import", &request, &input, &result)?;
            return Ok(result);
        };
        path
    } else {
        if input.get("mode").is_some() {
            return Err("Use the native picker or a prepared image slot".into());
        }
        let slot_request = uuid(&input, "slotRequestId")?;
        let (format,expires):(String,i64)=db.query_row("SELECT format,expires_at FROM image_import_slots WHERE workspace_id=?1 AND request_id=?2",params![wid,slot_request],|r|Ok((r.get(0)?,r.get(1)?))).optional().map_err(err)?.ok_or("Image slot not found in this workspace")?;
        if expires < now() {
            return Err("Image import slot expired. Prepare a new request".into());
        }
        let path = slot_path(root, &wid, &slot_request, &format)?;
        slot = Some((slot_request, path.clone()));
        path
    };
    let original = read_file(&path)?;
    let digest = hash(&original);
    if input["mode"] != "picker" && input["expectedSha256"].as_str() != Some(&digest) {
        return Err("Image bytes differ from the reviewed SHA-256".into());
    }
    let (mime, width, height, thumbnail) = decode(&original)?;
    let tx = db
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(err)?;
    if let Some(result) = receipt(&tx, &wid, "media.import", &request, &input)? {
        return Ok(result);
    }
    let existing: Option<String> = tx
        .query_row(
            "SELECT id FROM image_assets WHERE workspace_id=?1 AND sha256=?2",
            params![wid, digest],
            |r| r.get(0),
        )
        .optional()
        .map_err(err)?;
    let asset_id = if let Some(id) = existing {
        if asset(&tx, &wid, &id)?["provenance"] != metadata {
            return Err("These image bytes already have different immutable provenance. Review and reuse the saved artwork explicitly; the new metadata was not saved".into());
        }
        id
    } else {
        let (count,used):(i64,i64)=tx.query_row("SELECT count(*),coalesce(sum(length(original)+length(thumbnail)),0) FROM image_assets WHERE workspace_id=?1",[&wid],|r|Ok((r.get(0)?,r.get(1)?))).map_err(err)?;
        if count >= 100 || used + original.len() as i64 + thumbnail.len() as i64 > WORKSPACE_LIMIT {
            return Err("Image storage limit reached (100 images or 128 MiB). Remove unused artwork before importing".into());
        }
        let id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO image_assets VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9)",
            params![
                wid,
                id,
                digest,
                mime,
                width,
                height,
                original,
                thumbnail,
                metadata.to_string()
            ],
        )
        .map_err(err)?;
        id
    };
    let result = attach(&tx, &wid, &input, Some(&asset_id))?;
    remember(&tx, &wid, "media.import", &request, &input, &result)?;
    if let Some((request, _)) = &slot {
        tx.execute(
            "UPDATE image_import_slots SET expires_at=0 WHERE workspace_id=?1 AND request_id=?2",
            params![wid, request],
        )
        .map_err(err)?;
    }
    tx.commit().map_err(err)?;
    if let Some((_, path)) = slot {
        let _ = fs::remove_file(&path);
        let _ = fs::remove_dir(path.parent().unwrap());
    }
    Ok(result)
}
pub fn dispatch(root: &Path, op: &str, input: Value) -> Result<Value, String> {
    validate(op, &input)?;
    if op == "media.import" {
        return import_with_picker(root, input, || {
            rfd::FileDialog::new()
                .set_title("GiGi: add one local image — nothing is uploaded")
                .add_filter("Static images", &["png", "jpg", "jpeg"])
                .pick_file()
        });
    }
    let wid = uuid(&input, "workspaceId")?;
    let mut db = crate::domain::open(root)?;
    workspace(&db, &wid)?;
    match op {
        "media.importPrepare" => prepare(root, &mut db, &wid, &input),
        "media.get" => asset(&db, &wid, &uuid(&input, "assetId")?),
        "media.list" => {
            let offset = input["offset"].as_u64().unwrap_or(0);
            let mut stmt=db.prepare("SELECT id FROM image_assets WHERE workspace_id=?1 ORDER BY id LIMIT 20 OFFSET ?2").map_err(err)?;
            let ids = stmt
                .query_map(params![wid, offset], |r| r.get::<_, String>(0))
                .map_err(err)?
                .collect::<Result<Vec<_>, _>>()
                .map_err(err)?;
            let items = ids
                .iter()
                .map(|id| asset(&db, &wid, id))
                .collect::<Result<Vec<_>, _>>()?;
            let count: i64 = db
                .query_row(
                    "SELECT count(*) FROM image_assets WHERE workspace_id=?1",
                    [&wid],
                    |r| r.get(0),
                )
                .map_err(err)?;
            Ok(
                json!({"items":items,"count":count,"nextOffset":if offset+20<count as u64{Some(offset+20)}else{None}}),
            )
        }
        "media.attach" => {
            let request = uuid(&input, "requestId")?;
            let tx = db
                .transaction_with_behavior(TransactionBehavior::Immediate)
                .map_err(err)?;
            if let Some(result) = receipt(&tx, &wid, op, &request, &input)? {
                return Ok(result);
            }
            let asset_id = if input["assetId"].is_null() {
                None
            } else {
                Some(uuid(&input, "assetId")?)
            };
            let result = attach(&tx, &wid, &input, asset_id.as_deref())?;
            remember(&tx, &wid, op, &request, &input, &result)?;
            tx.commit().map_err(err)?;
            Ok(result)
        }
        "media.removeUnused" => {
            let id = uuid(&input, "assetId")?;
            asset(&db, &wid, &id)?;
            let tx = db
                .transaction_with_behavior(TransactionBehavior::Immediate)
                .map_err(err)?;
            let refs: i64 = tx
                .query_row(
                    "SELECT count(*) FROM image_covers WHERE workspace_id=?1 AND asset_id=?2",
                    params![wid, id],
                    |r| r.get(0),
                )
                .map_err(err)?;
            let drafts = if table_exists(&tx, "instagram_drafts")? {
                tx.query_row("SELECT count(*) FROM instagram_drafts WHERE workspace_id=?1 AND json_extract(body_json,'$.imageAssetId')=?2",params![wid,id],|r|r.get::<_,i64>(0)).map_err(err)?
            } else {
                0
            };
            if refs + drafts > 0 {
                return Err("This image is used by a record or saved draft. Remove those associations first".into());
            }
            tx.execute(
                "DELETE FROM image_assets WHERE workspace_id=?1 AND id=?2",
                params![wid, id],
            )
            .map_err(err)?;
            tx.commit().map_err(err)?;
            Ok(json!({"removed":true,"originalFileUnchanged":true}))
        }
        "media.operationStatus" => {
            let request = uuid(&input, "requestId")?;
            let op = format!("media.{}", need(&input, "operation")?);
            let result:Option<String>=db.query_row("SELECT result_json FROM mutation_receipts WHERE workspace_id=?1 AND operation=?2 AND idempotency_key=?3",params![wid,op,request],|r|r.get(0)).optional().map_err(err)?;
            if let Some(result) = result {
                return Ok(
                    json!({"state":"completed","receipt":serde_json::from_str::<Value>(&result).map_err(err)?}),
                );
            }
            Ok(
                json!({"state":"unknown","instruction":"No completion receipt was found. Inspect the target before any new mutation; do not treat this as proof of failure."}),
            )
        }
        _ => Err("Unknown image operation".into()),
    }
}
fn table_exists(db: &Connection, name: &str) -> Result<bool, String> {
    Ok(db
        .query_row(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?1",
            [name],
            |r| r.get::<_, i32>(0),
        )
        .optional()
        .map_err(err)?
        .is_some())
}
pub fn bytes(
    root: &Path,
    wid: &str,
    id: &str,
    thumbnail: bool,
) -> Result<(Vec<u8>, String), String> {
    Uuid::parse_str(wid).map_err(err)?;
    Uuid::parse_str(id).map_err(err)?;
    let db = Connection::open_with_flags(
        root.join("gigi.sqlite"),
        rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY,
    )
    .map_err(err)?;
    db.query_row(
        if thumbnail {
            "SELECT thumbnail,'image/png' FROM image_assets WHERE workspace_id=?1 AND id=?2"
        } else {
            "SELECT original,mime FROM image_assets WHERE workspace_id=?1 AND id=?2"
        },
        params![wid, id],
        |r| Ok((r.get(0)?, r.get(1)?)),
    )
    .optional()
    .map_err(err)?
    .ok_or("Image unavailable".into())
}
pub(crate) fn validate(op: &str, input: &Value) -> Result<(), String> {
    let (required, optional): (&[&str], &[&str]) = match op {
        "media.importPrepare" => (&["workspaceId", "requestId", "format"], &[]),
        "media.import" => (
            &[
                "workspaceId",
                "requestId",
                "entity",
                "id",
                "expectedRevision",
                "alt",
                "provenance",
            ],
            &["mode", "slotRequestId", "expectedSha256"],
        ),
        "media.get" | "media.removeUnused" => (&["workspaceId", "assetId"], &[]),
        "media.list" => (&["workspaceId"], &["offset"]),
        "media.attach" => (
            &[
                "workspaceId",
                "requestId",
                "entity",
                "id",
                "expectedRevision",
                "assetId",
            ],
            &["alt"],
        ),
        "media.operationStatus" => (&["workspaceId", "requestId", "operation"], &[]),
        _ => return Err("Unknown image operation".into()),
    };
    let map = input
        .as_object()
        .ok_or("Image arguments must be an object")?;
    if required.iter().any(|k| !map.contains_key(*k))
        || map
            .keys()
            .any(|k| !required.contains(&k.as_str()) && !optional.contains(&k.as_str()))
    {
        return Err(
            "Unsupported or missing image argument; paths and remote URL imports are not accepted"
                .into(),
        );
    }
    for (key, value) in map {
        if ["expectedRevision", "offset"].contains(&key.as_str()) {
            if value.as_u64().is_none_or(|n| n > 100000) {
                return Err("Invalid image revision or offset".into());
            }
        } else if key == "provenance" {
            if !value.is_object() {
                return Err("Invalid image provenance".into());
            }
        } else if key == "assetId" && value.is_null() {
        } else if value.as_str().is_none_or(|s| s.len() > 5000) {
            return Err("Invalid image argument".into());
        }
    }
    if op == "media.import" {
        if input["mode"] == "picker" {
            if input.get("slotRequestId").is_some() || input.get("expectedSha256").is_some() {
                return Err("Choose one image input method".into());
            }
        } else {
            uuid(input, "slotRequestId")?;
            let digest = need(input, "expectedSha256")?;
            if digest.len() != 64
                || !digest
                    .bytes()
                    .all(|b| b.is_ascii_hexdigit() && !b.is_ascii_uppercase())
            {
                return Err("Supply the exact lowercase SHA-256".into());
            }
        }
    }
    if op == "media.operationStatus" && !["import", "attach"].contains(&need(input, "operation")?) {
        return Err("Unknown image receipt operation".into());
    }
    Ok(())
}
