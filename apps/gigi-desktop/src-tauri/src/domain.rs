use rusqlite::{params, Connection, OptionalExtension};
use serde_json::{json, Value};
use std::{fs, path::Path};
use std::os::unix::fs::{OpenOptionsExt, PermissionsExt};
use std::io::Write;
use uuid::Uuid;

const CATALOG: &str = include_str!("../migrations/notion_fields.json");
const ENTITIES: [&str; 13] = [
    "tasks",
    "interactions",
    "notes",
    "gigs",
    "finances",
    "contacts",
    "companies",
    "documents",
    "locations",
    "schedule",
    "tags",
    "profile",
    "services",
];

fn need<'a>(input: &'a Value, key: &str) -> Result<&'a str, String> {
    input
        .get(key)
        .and_then(Value::as_str)
        .filter(|s| !s.trim().is_empty())
        .ok_or_else(|| format!("{key} is required"))
}
fn table<'a>(input: &'a Value, key: &str) -> Result<&'a str, String> {
    let name = need(input, key)?;
    if ENTITIES.contains(&name) {
        Ok(name)
    } else {
        Err(format!("unknown entity: {name}"))
    }
}
fn catalog() -> Value {
    serde_json::from_str(CATALOG).expect("reviewed Notion field catalog")
}
fn fields_for(entity: &str, input: &Value) -> Result<Value, String> {
    let fields = input.get("fields").cloned().unwrap_or_else(|| json!({}));
    let map = fields.as_object().ok_or("fields must be an object")?;
    let c = catalog();
    for (name, value) in map {
        let kind = c[entity]["fields"][name]
            .as_str()
            .ok_or_else(|| format!("unknown {entity} field: {name}"))?;
        if [
            "Relation",
            "Rollup",
            "Formula",
            "Created time",
            "Last edited time",
            "ID",
        ]
        .contains(&kind)
        {
            return Err(format!("{name} is relational or derived"));
        }
        let valid = if kind.contains("currency") {
            value.as_i64().is_some()
        } else if kind.starts_with("Number") {
            value.is_number()
        } else if kind == "Checkbox" {
            value.is_boolean()
        } else {
            value.is_string() || value.is_null()
        };
        if !valid {
            return Err(format!("invalid value for {name}: {kind}"));
        }
        if entity=="profile"&&name=="Currency"&&!["USD","CAD","EUR","GBP"].contains(&value.as_str().unwrap_or("")){
            return Err("unsupported currency for integer-cent beta".into());
        }
        if entity=="finances"&&name=="Direction"&&!["Income","Expense"].contains(&value.as_str().unwrap_or("")){
            return Err("invalid finance direction".into());
        }
        if entity=="finances"&&name=="Status"&&!["Expected","Invoiced","Paid","Overdue"].contains(&value.as_str().unwrap_or("")){
            return Err("invalid finance status".into());
        }
    }
    Ok(fields)
}
fn open(root: &Path) -> Result<Connection, String> {
    fs::create_dir_all(root).map_err(|e| e.to_string())?;
    private_dir(root)?;
    let path=root.join("gigi.sqlite");
    private_file(&path)?;
    let db = Connection::open(path).map_err(|e| e.to_string())?;
    db.execute_batch("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;")
        .map_err(|e| e.to_string())?;
    let version: i64 = db
        .query_row("PRAGMA user_version", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    if version > 1 {
        return Err(format!("database version {version} is newer than this app"));
    }
    if version == 0 {
        db.execute_batch("BEGIN IMMEDIATE;
            CREATE TABLE workspaces(id TEXT PRIMARY KEY,name TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
            CREATE TABLE record_index(workspace_id TEXT NOT NULL REFERENCES workspaces(id),entity TEXT NOT NULL,id TEXT NOT NULL,PRIMARY KEY(workspace_id,entity,id));
            CREATE TABLE relations(workspace_id TEXT NOT NULL,from_entity TEXT NOT NULL,from_id TEXT NOT NULL,role TEXT NOT NULL,to_entity TEXT NOT NULL,to_id TEXT NOT NULL,PRIMARY KEY(workspace_id,from_entity,from_id,role,to_entity,to_id),
                FOREIGN KEY(workspace_id,from_entity,from_id) REFERENCES record_index(workspace_id,entity,id),
                FOREIGN KEY(workspace_id,to_entity,to_id) REFERENCES record_index(workspace_id,entity,id));
            CREATE TABLE history(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id),operation TEXT NOT NULL,entity TEXT,record_id TEXT,summary TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
            CREATE TABLE mutation_receipts(workspace_id TEXT NOT NULL REFERENCES workspaces(id),operation TEXT NOT NULL,idempotency_key TEXT NOT NULL,request_json TEXT NOT NULL,result_json TEXT NOT NULL,PRIMARY KEY(workspace_id,operation,idempotency_key));").map_err(|e|e.to_string())?;
        for entity in ENTITIES {
            db.execute_batch(&format!("CREATE TABLE {entity}(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id),entity_name TEXT NOT NULL DEFAULT '{entity}' CHECK(entity_name='{entity}'),title TEXT NOT NULL,fields_json TEXT NOT NULL,source_json TEXT NOT NULL,source_key TEXT,money_cents INTEGER,status TEXT,occurred_at TEXT,rate_type TEXT,hours REAL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(workspace_id,entity_name,id) REFERENCES record_index(workspace_id,entity,id));
                CREATE INDEX idx_{entity}_workspace ON {entity}(workspace_id,updated_at,id);
                CREATE UNIQUE INDEX idx_{entity}_source ON {entity}(workspace_id,source_key) WHERE source_key IS NOT NULL;")).map_err(|e|e.to_string())?;
        }
        db.execute_batch("PRAGMA user_version=1; COMMIT;")
            .map_err(|e| e.to_string())?;
    }
    Ok(db)
}

fn private_dir(path:&Path)->Result<(),String>{
    if fs::symlink_metadata(path).map_err(|e|e.to_string())?.file_type().is_symlink(){return Err("GiGi data directory cannot be a symlink".into())}
    fs::set_permissions(path,fs::Permissions::from_mode(0o700)).map_err(|e|e.to_string())
}
fn private_file(path:&Path)->Result<(),String>{
    if path.exists(){
        if fs::symlink_metadata(path).map_err(|e|e.to_string())?.file_type().is_symlink(){return Err("GiGi database path cannot be a symlink".into())}
    }else{
        let _=fs::OpenOptions::new().write(true).create_new(true).mode(0o600).open(path).map_err(|e|e.to_string())?;
    }
    fs::set_permissions(path,fs::Permissions::from_mode(0o600)).map_err(|e|e.to_string())
}

fn rfc3339(sqlite_timestamp:&str)->Result<String,String>{
    if sqlite_timestamp.len()!=19 || sqlite_timestamp.as_bytes().get(10)!=Some(&b' '){return Err("invalid history timestamp".into())}
    Ok(format!("{}T{}Z",&sqlite_timestamp[..10],&sqlite_timestamp[11..]))
}
fn audit_summary(entity:&str,id:&str,title:&str,fields:&Value)->String{
    let mut parts=vec![format!("Saved {entity} {id}: {}",title.chars().take(120).collect::<String>())];
    for key in ["Status","Date","Due Date","Fee","Amount","Direction","Rate Type","Role"]{
        if let Some(value)=fields.get(key){
            let display=if key=="Fee"||key=="Amount"{format!("{} cents",value)}else{value.as_str().unwrap_or("").chars().take(80).collect()};
            if !display.is_empty(){parts.push(format!("{key} {display}"))}
        }
    }
    parts.join("; ")
}

/// Stage this app's private workspace history as CTX Custom History JSONL v2.
pub fn export_history(root:&Path)->Result<Value,String>{
    let db=open(root)?;
    let (wid,created):(String,String)=db.query_row("SELECT id,created_at FROM workspaces ORDER BY created_at LIMIT 1",[],|r|Ok((r.get(0)?,r.get(1)?))).map_err(|_|"workspace not found")?;
    let source_id=format!("gigi-{wid}");
    let session_id=format!("workspace-{wid}");
    let mut lines=Vec::<Value>::new();
    lines.push(json!({"record_type":"manifest","schema_version":"ctx-history-jsonl-v2","producer":"gigi-desktop"}));
    lines.push(json!({"record_type":"source","source_id":source_id,"provider_key":"gigi-local","source_format":"gigi-sqlite-history-v1","trust":"provider_export","fidelity":"summary_only"}));
    lines.push(json!({"record_type":"session","source_id":source_id,"provider_session_id":session_id,"started_at":rfc3339(&created)?,"status":"active","fidelity":"summary_only"}));
    let mut stmt=db.prepare("SELECT rowid,id,operation,entity,record_id,summary,created_at FROM history WHERE workspace_id=?1 ORDER BY rowid").map_err(|e|e.to_string())?;
    let events=stmt.query_map([&wid],|r|Ok((r.get::<_,i64>(0)?,r.get::<_,String>(1)?,r.get::<_,String>(2)?,r.get::<_,Option<String>>(3)?,r.get::<_,Option<String>>(4)?,r.get::<_,String>(5)?,r.get::<_,String>(6)?))).map_err(|e|e.to_string())?;
    let mut count=0_usize;
    for event in events{
        let (index,id,operation,entity,record_id,summary,created_at)=event.map_err(|e|e.to_string())?;
        if index<1{return Err("invalid history index".into())}
        lines.push(json!({"record_type":"event","source_id":source_id,"provider_session_id":session_id,"event_index":index-1,"event_id":id,"event_type":"message","role":"tool","occurred_at":rfc3339(&created_at)?,"fidelity":"summary_only","payload":{"text":summary,"operation":operation,"entity":entity,"recordId":record_id}}));
        count+=1;
    }
    let imports=root.join("imports");fs::create_dir_all(&imports).map_err(|e|e.to_string())?;private_dir(&imports)?;
    let temporary=imports.join(format!(".gigi-history-{}.tmp",Uuid::new_v4()));
    let target=imports.join("gigi-history.jsonl");
    let write_result=(||->Result<(),String>{
        let mut file=fs::OpenOptions::new().write(true).create_new(true).mode(0o600).open(&temporary).map_err(|e|e.to_string())?;
        for line in &lines {file.write_all(line.to_string().as_bytes()).and_then(|_|file.write_all(b"\n")).map_err(|e|e.to_string())?;}
        file.sync_all().map_err(|e|e.to_string())?;
        fs::rename(&temporary,&target).map_err(|e|e.to_string())?;
        Ok(())
    })();
    if write_result.is_err(){let _=fs::remove_file(&temporary);}
    write_result?;
    Ok(json!({"workspaceId":wid,"events":count,"format":"ctx-history-jsonl-v2","staged":true}))
}
fn workspace(db: &Connection, id: &str) -> Result<(), String> {
    let count: i64 = db
        .query_row("SELECT count(*) FROM workspaces WHERE id=?1", [id], |r| {
            r.get(0)
        })
        .map_err(|e| e.to_string())?;
    if count == 1 {
        Ok(())
    } else {
        Err("workspace not found".into())
    }
}
fn get(db: &Connection, wid: &str, entity: &str, id: &str) -> Result<Value, String> {
    let sql=format!("SELECT title,fields_json,source_json,created_at,updated_at FROM {entity} WHERE workspace_id=?1 AND id=?2");
    let row: (String, String, String, String, String) = db
        .query_row(&sql, params![wid, id], |r| {
            Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?))
        })
        .optional()
        .map_err(|e| e.to_string())?
        .ok_or("record not found")?;
    let mut stmt=db.prepare("SELECT from_entity,from_id,role,to_entity,to_id FROM relations WHERE workspace_id=?1 AND ((from_entity=?2 AND from_id=?3) OR (to_entity=?2 AND to_id=?3)) ORDER BY from_entity,from_id,role,to_entity,to_id LIMIT 100").map_err(|e|e.to_string())?;
    let mut links=stmt.query_map(params![wid,entity,id],|r|Ok(json!({"fromEntity":r.get::<_,String>(0)?,"fromId":r.get::<_,String>(1)?,"role":r.get::<_,String>(2)?,"toEntity":r.get::<_,String>(3)?,"toId":r.get::<_,String>(4)?}))).map_err(|e|e.to_string())?.collect::<Result<Vec<_>,_>>().map_err(|e|e.to_string())?;
    for link in &mut links {
        for side in ["from","to"] {
            let endpoint_entity=link[format!("{side}Entity")].as_str().ok_or("invalid relation entity")?;
            let endpoint_id=link[format!("{side}Id")].as_str().ok_or("invalid relation id")?;
            if !ENTITIES.contains(&endpoint_entity){return Err("invalid relation entity".into())}
            let title:Option<String>=db.query_row(&format!("SELECT title FROM {endpoint_entity} WHERE workspace_id=?1 AND id=?2"),params![wid,endpoint_id],|r|r.get(0)).optional().map_err(|e|e.to_string())?;
            let title=title.ok_or("relation endpoint missing")?;
            link[format!("{side}Title")]=json!(title.chars().take(120).collect::<String>());
            link[format!("{side}TitleTruncated")]=json!(title.chars().count()>120);
        }
    }
    let link_count:i64=db.query_row("SELECT count(*) FROM relations WHERE workspace_id=?1 AND ((from_entity=?2 AND from_id=?3) OR (to_entity=?2 AND to_id=?3))",params![wid,entity,id],|r|r.get(0)).map_err(|e|e.to_string())?;
    Ok(
        json!({"id":id,"workspaceId":wid,"entity":entity,"title":row.0,"fields":serde_json::from_str::<Value>(&row.1).map_err(|e|e.to_string())?,"source":serde_json::from_str::<Value>(&row.2).map_err(|e|e.to_string())?,"createdAt":row.3,"updatedAt":row.4,"relations":links,"relationCount":link_count,"relationsTruncated":link_count>100}),
    )
}
fn bounded(mut record: Value, full: bool) -> Value {
    if full {
        return record;
    }
    let mut remaining = 3500_usize;
    let mut truncated = Vec::<String>::new();
    if let Some(fields) = record.get_mut("fields").and_then(Value::as_object_mut) {
        for (key, value) in fields {
            if let Some(text) = value.as_str() {
                let allowed = remaining.min(512);
                let cut: String = text.chars().take(allowed).collect();
                let count = text.chars().count();
                remaining = remaining.saturating_sub(cut.chars().count());
                if count > cut.chars().count() {
                    truncated.push(key.clone())
                }
                *value = Value::String(cut);
            }
        }
    }
    if let Some(source) = record.get_mut("source") {
        *source = json!({"kind":source["kind"],"provider":source["provider"],"externalId":source["externalId"]});
    }
    if let Some(relations) = record.get_mut("relations").and_then(Value::as_array_mut) {
        if relations.len() > 10 {
            relations.truncate(10);
            record["relationsTruncated"] = json!(true)
        }
    }
    record["truncatedFields"] = json!(truncated);
    record
}
fn history(
    db: &Connection,
    wid: &str,
    op: &str,
    entity: Option<&str>,
    id: Option<&str>,
    summary: &str,
) -> Result<(), String> {
    db.execute("INSERT INTO history(id,workspace_id,operation,entity,record_id,summary) VALUES(?1,?2,?3,?4,?5,?6)",params![Uuid::new_v4().to_string(),wid,op,entity,id,summary]).map_err(|e|e.to_string())?;
    Ok(())
}
fn replay(db: &Connection, wid: &str, op: &str, input: &Value) -> Result<Option<Value>, String> {
    let Some(key) = input.get("idempotencyKey").and_then(Value::as_str) else {
        return Ok(None);
    };
    if key.is_empty() || key.len() > 200 {
        return Err("idempotencyKey must be 1-200 characters".into());
    }
    let prior:Option<(String,String)>=db.query_row("SELECT request_json,result_json FROM mutation_receipts WHERE workspace_id=?1 AND operation=?2 AND idempotency_key=?3",params![wid,op,key],|r|Ok((r.get(0)?,r.get(1)?))).optional().map_err(|e|e.to_string())?;
    let request_json = input.to_string();
    match prior {
        Some((request, result)) if request == request_json => Ok(Some(
            serde_json::from_str(&result).map_err(|e| e.to_string())?,
        )),
        Some(_) => Err("idempotency key reused with different input".into()),
        None => Ok(None),
    }
}
fn receipt(
    db: &Connection,
    wid: &str,
    op: &str,
    input: &Value,
    result: &Value,
) -> Result<(), String> {
    if let Some(key) = input.get("idempotencyKey").and_then(Value::as_str) {
        db.execute(
            "INSERT INTO mutation_receipts VALUES(?1,?2,?3,?4,?5)",
            params![wid, op, key, input.to_string(), result.to_string()],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}
pub fn dispatch(root: &Path, op: &str, input: Value) -> Result<Value, String> {
    if !input.is_object() {
        return Err("input must be an object".into());
    }
    let mut db = open(root)?;
    match op {
        "schema.describe" => {
            let entity = table(&input, "entity")?;
            let c = catalog();
            let relations = c[entity]["relationFields"]
                .as_object()
                .ok_or("relation catalog unavailable")?;
            let relation_fields: Vec<Value> = relations
                .iter()
                .map(|(name, target)| json!({"name":name,"targetEntity":target}))
                .collect();
            Ok(
                json!({"entity":entity,"fields":c[entity]["fields"],"relationFields":relation_fields}),
            )
        }
        "workspace.create" => {
            let name = need(&input, "name")?.trim();
            if name.len() > 200 {
                return Err("name too long".into());
            }
            let existing: Option<(String, String)> = db
                .query_row(
                    "SELECT id,name FROM workspaces ORDER BY created_at LIMIT 1",
                    [],
                    |r| Ok((r.get(0)?, r.get(1)?)),
                )
                .optional()
                .map_err(|e| e.to_string())?;
            if let Some((id, name)) = existing {
                return Ok(json!({"id":id,"name":name,"existing":true}));
            }
            let id = Uuid::new_v4().to_string();
            db.execute(
                "INSERT INTO workspaces(id,name) VALUES(?1,?2)",
                params![id, name],
            )
            .map_err(|e| e.to_string())?;
            history(&db, &id, op, None, None, "Workspace created")?;
            Ok(json!({"id":id,"name":name,"existing":false}))
        }
        "workspace.get" => {
            let row: Option<(String, String, String)> =
                if let Some(id) = input.get("workspaceId").and_then(Value::as_str) {
                    db.query_row(
                        "SELECT id,name,created_at FROM workspaces WHERE id=?1",
                        [id],
                        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
                    )
                    .optional()
                } else {
                    db.query_row(
                        "SELECT id,name,created_at FROM workspaces ORDER BY created_at LIMIT 1",
                        [],
                        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
                    )
                    .optional()
                }
                .map_err(|e| e.to_string())?;
            Ok(row
                .map(|(id, name, created)| json!({"id":id,"name":name,"createdAt":created}))
                .unwrap_or(Value::Null))
        }
        "records.save" => {
            let wid = need(&input, "workspaceId")?;
            let entity = table(&input, "entity")?;
            let title = need(&input, "title")?.trim();
            if title.len() > 500 {
                return Err("title too long".into());
            }
            let fields = fields_for(entity, &input)?;
            workspace(&db, wid)?;
            if entity=="profile" {
                let current:Option<String>=db.query_row("SELECT json_extract(fields_json,'$.Currency') FROM profile WHERE workspace_id=?1 ORDER BY updated_at DESC LIMIT 1",[wid],|r|r.get(0)).optional().map_err(|e|e.to_string())?.flatten();
                let next=fields.get("Currency").and_then(Value::as_str);
                if current.is_some() && current.as_deref()!=next {
                    let has_money:i64=db.query_row("SELECT (SELECT count(*) FROM gigs WHERE workspace_id=?1 AND money_cents IS NOT NULL)+(SELECT count(*) FROM finances WHERE workspace_id=?1 AND money_cents IS NOT NULL)+(SELECT count(*) FROM profile WHERE workspace_id=?1 AND money_cents IS NOT NULL)",[wid],|r|r.get(0)).map_err(|e|e.to_string())?;
                    if has_money>0{return Err("currency cannot change after monetary records exist; export and convert values explicitly before changing currency".into())}
                }
            }
            if let Some(previous) = replay(&db, wid, op, &input)? {
                return Ok(previous);
            }
            let id = input
                .get("id")
                .and_then(Value::as_str)
                .map(str::to_string)
                .unwrap_or_else(|| Uuid::new_v4().to_string());
            if id.is_empty() || id.len() > 200 {
                return Err("invalid id".into());
            }
            let prior:Option<(String,Option<String>)>=db.query_row(&format!("SELECT source_json,source_key FROM {entity} WHERE workspace_id=?1 AND id=?2"),params![wid,id],|r|Ok((r.get(0)?,r.get(1)?))).optional().map_err(|e|e.to_string())?;
            let prior_source = prior
                .as_ref()
                .and_then(|p| serde_json::from_str::<Value>(&p.0).ok());
            let mut source = input
                .get("source")
                .cloned()
                .or_else(|| prior_source.clone())
                .unwrap_or_else(|| json!({"kind":"manual"}));
            if source.get("kind").and_then(Value::as_str).is_none() {
                return Err("source.kind is required".into());
            }
            if source["kind"] == "manual"
                && prior_source.as_ref().is_some_and(|s| s["kind"] != "manual")
            {
                source["origin"] = prior_source.unwrap();
            }
            if fields.to_string().len() > 32_000 || source.to_string().len() > 2_000 {
                return Err("record detail exceeds local limit".into());
            }
            let source_key = if source["kind"] == "manual" {
                prior.as_ref().and_then(|p| p.1.clone())
            } else {
                let provider = source
                    .get("provider")
                    .and_then(Value::as_str)
                    .ok_or("source.provider required for import")?;
                let external_id = source
                    .get("externalId")
                    .and_then(Value::as_str)
                    .ok_or("source.externalId required for import")?;
                let connected_account=source.get("connectedAccountId").and_then(Value::as_str);
                let collection=source.get("collectionId").and_then(Value::as_str);
                Some(json!([provider,connected_account,collection,external_id]).to_string())
            };
            if let Some(ref key) = source_key {
                let prior: Option<String> = db
                    .query_row(
                        &format!("SELECT id FROM {entity} WHERE workspace_id=?1 AND source_key=?2"),
                        params![wid, key],
                        |r| r.get(0),
                    )
                    .optional()
                    .map_err(|e| e.to_string())?;
                if let Some(prior_id) = prior {
                    if prior_id != id && input.get("id").is_none() {
                        return get(&db, wid, entity, &prior_id);
                    }
                }
            }
            let money = fields
                .get(if entity == "gigs" {
                    "Fee"
                } else if entity == "finances" {
                    "Amount"
                } else {
                    "Default Day Rate"
                })
                .and_then(Value::as_i64);
            let status = fields.get("Status").and_then(Value::as_str);
            let occurred = fields.get("Date").and_then(Value::as_str);
            let rate = fields.get("Rate Type").and_then(Value::as_str);
            let hours = fields.get("Hours").and_then(Value::as_f64);
            let tx = db.transaction().map_err(|e| e.to_string())?;
            tx.execute(
                "INSERT OR IGNORE INTO record_index(workspace_id,entity,id) VALUES(?1,?2,?3)",
                params![wid, entity, id],
            )
            .map_err(|e| e.to_string())?;
            let sql=format!("INSERT INTO {entity}(id,workspace_id,title,fields_json,source_json,source_key,money_cents,status,occurred_at,rate_type,hours) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11) ON CONFLICT(id) DO UPDATE SET title=excluded.title,fields_json=excluded.fields_json,source_json=excluded.source_json,source_key=excluded.source_key,money_cents=excluded.money_cents,status=excluded.status,occurred_at=excluded.occurred_at,rate_type=excluded.rate_type,hours=excluded.hours,updated_at=CURRENT_TIMESTAMP WHERE workspace_id=excluded.workspace_id");
            tx.execute(
                &sql,
                params![
                    id,
                    wid,
                    title,
                    fields.to_string(),
                    source.to_string(),
                    source_key,
                    money,
                    status,
                    occurred,
                    rate,
                    hours
                ],
            )
            .map_err(|e| e.to_string())?;
            let result = get(&tx, wid, entity, &id)?;
            history(&tx, wid, op, Some(entity), Some(&id), &audit_summary(entity,&id,title,&fields))?;
            receipt(&tx, wid, op, &input, &result)?;
            tx.commit().map_err(|e| e.to_string())?;
            Ok(result)
        }
        "records.get" => Ok(bounded(
            get(
                &db,
                need(&input, "workspaceId")?,
                table(&input, "entity")?,
                need(&input, "id")?,
            )?,
            input["detail"] == "full",
        )),
        "records.list" => {
            let wid = need(&input, "workspaceId")?;
            let entity = table(&input, "entity")?;
            workspace(&db, wid)?;
            let limit = input
                .get("limit")
                .and_then(Value::as_u64)
                .unwrap_or(20)
                .clamp(1, 50) as i64;
            let offset = input
                .get("cursor")
                .and_then(Value::as_str)
                .and_then(|x| x.parse::<u64>().ok())
                .or_else(|| input.get("offset").and_then(Value::as_u64))
                .unwrap_or(0)
                .min(100_000) as i64;
            let sql=format!("SELECT id,title,status,occurred_at,money_cents,updated_at FROM {entity} WHERE workspace_id=?1 ORDER BY updated_at DESC,id LIMIT ?2 OFFSET ?3");
            let mut stmt = db.prepare(&sql).map_err(|e| e.to_string())?;
            let items=stmt.query_map(params![wid,limit,offset],|r|{
                let title:String=r.get(1)?;let truncated=title.chars().count()>120;let display:String=title.chars().take(120).collect();
                Ok(json!({"id":r.get::<_,String>(0)?,"workspaceId":wid,"entity":entity,"title":display,"titleTruncated":truncated,"status":r.get::<_,Option<String>>(2)?,"date":r.get::<_,Option<String>>(3)?,"moneyCents":r.get::<_,Option<i64>>(4)?,"updatedAt":r.get::<_,String>(5)?}))
            }).map_err(|e|e.to_string())?.collect::<Result<Vec<_>,_>>().map_err(|e|e.to_string())?;
            let count: i64 = db
                .query_row(
                    &format!("SELECT count(*) FROM {entity} WHERE workspace_id=?1"),
                    [wid],
                    |r| r.get(0),
                )
                .map_err(|e| e.to_string())?;
            let next = if offset + limit < count {
                Some((offset + limit).to_string())
            } else {
                None
            };
            Ok(json!({"items":items,"count":count,"limit":limit,"nextCursor":next}))
        }
        "relations.link" => {
            let wid = need(&input, "workspaceId")?;
            let from = table(&input, "fromEntity")?;
            let to = table(&input, "toEntity")?;
            let from_id = need(&input, "fromId")?;
            let to_id = need(&input, "toId")?;
            if from == to && from_id == to_id {
                return Err("self link is invalid".into());
            }
            let c = catalog();
            let roles = c[from]["relationFields"]
                .as_object()
                .ok_or("relation catalog unavailable")?;
            let matching: Vec<&str> = roles
                .iter()
                .filter_map(|(role, target)| {
                    if target.as_str() == Some(to) {
                        Some(role.as_str())
                    } else {
                        None
                    }
                })
                .collect();
            if matching.is_empty() {
                return Err(format!("{from} cannot link to {to}"));
            }
            let role = match input.get("role").and_then(Value::as_str) {
                Some(role) if matching.contains(&role) => role,
                Some(_) => return Err("role is not a valid relation property".into()),
                None if matching.len() == 1 => matching[0],
                None => return Err(format!("role required; choose {}", matching.join(" or "))),
            };
            workspace(&db, wid)?;
            let from_record=get(&db, wid, from, from_id)?;
            let to_record=get(&db, wid, to, to_id)?;
            if let Some(previous) = replay(&db, wid, op, &input)? {
                return Ok(previous);
            }
            let tx = db.transaction().map_err(|e| e.to_string())?;
            tx.execute(
                "INSERT OR IGNORE INTO relations VALUES(?1,?2,?3,?4,?5,?6)",
                params![wid, from, from_id, role, to, to_id],
            )
            .map_err(|e| e.to_string())?;
            let result = json!({"workspaceId":wid,"fromEntity":from,"fromId":from_id,"role":role,"toEntity":to,"toId":to_id,"linked":true});
            let from_title=from_record["title"].as_str().unwrap_or("").chars().take(120).collect::<String>();
            let to_title=to_record["title"].as_str().unwrap_or("").chars().take(120).collect::<String>();
            history(&tx, wid, op, Some(from), Some(from_id), &format!("Linked {from} {from_id} {from_title} via {role} to {to} {to_id} {to_title}"))?;
            receipt(&tx, wid, op, &input, &result)?;
            tx.commit().map_err(|e| e.to_string())?;
            Ok(result)
        }
        "gigs.summary" => {
            let wid = need(&input, "workspaceId")?;
            let gig_id = need(&input, "gigId")?;
            let gig = get(&db, wid, "gigs", gig_id)?;
            let fee = gig["fields"]["Fee"].as_i64();
            let mut stmt=db.prepare("SELECT DISTINCT CASE WHEN from_entity='gigs' THEN to_id ELSE from_id END FROM relations WHERE workspace_id=?1 AND ((from_entity='gigs' AND from_id=?2 AND to_entity='finances') OR (to_entity='gigs' AND to_id=?2 AND from_entity='finances'))").map_err(|e|e.to_string())?;
            let ids = stmt
                .query_map(params![wid, gig_id], |r| r.get::<_, String>(0))
                .map_err(|e| e.to_string())?
                .collect::<Result<Vec<_>, _>>()
                .map_err(|e| e.to_string())?;
            let (mut paid, mut expenses) = (Some(0_i64), Some(0_i64));
            let mut incomplete = Vec::new();
            if fee.is_none() {
                incomplete.push("gig.Fee")
            }
            for id in ids {
                let f = get(&db, wid, "finances", &id)?;
                let amount = f["fields"]["Amount"].as_i64();
                match f["fields"]["Direction"].as_str() {
                    Some("Expense") => {
                        expenses = expenses
                            .and_then(|sum| amount.and_then(|value| sum.checked_add(value)));
                        if amount.is_none() {
                            incomplete.push("finance.Amount")
                        }
                    }
                    Some("Income") => match f["fields"]["Status"].as_str() {
                        Some("Paid") => {
                            paid = paid.and_then(|sum| amount.and_then(|value| sum.checked_add(value)));
                            if amount.is_none() { incomplete.push("finance.Amount") }
                        }
                        Some("Expected"|"Invoiced"|"Overdue") => {}
                        _ => incomplete.push("finance.Status"),
                    },
                    _ => incomplete.push("finance.Direction"),
                }
            }
            let currency:Option<String>=db.query_row("SELECT json_extract(fields_json,'$.Currency') FROM profile WHERE workspace_id=?1 ORDER BY updated_at DESC LIMIT 1",[wid],|r|r.get(0)).optional().map_err(|e|e.to_string())?.flatten();
            let supported_currency=currency.as_deref().is_some_and(|c|["USD","CAD","EUR","GBP"].contains(&c));
            if !supported_currency{incomplete.push("profile.Currency")}
            Ok(
                json!({"gig":gig,"currency":currency,"feeCents":fee,"expensesCents":expenses,"netCents":fee.zip(expenses).and_then(|(a,b)|a.checked_sub(b)),"paidCents":paid,"balanceDueCents":fee.zip(paid).and_then(|(a,b)|a.checked_sub(b)),"financialsComplete":incomplete.is_empty()&&fee.is_some()&&expenses.is_some()&&paid.is_some()&&supported_currency,"incompleteFields":incomplete}),
            )
        }
        "history.list" => {
            let wid = need(&input, "workspaceId")?;
            workspace(&db, wid)?;
            let limit = input
                .get("limit")
                .and_then(Value::as_u64)
                .unwrap_or(50)
                .clamp(1, 100) as i64;
            let mut stmt=db.prepare("SELECT id,operation,entity,record_id,summary,created_at FROM history WHERE workspace_id=?1 ORDER BY created_at DESC,id DESC LIMIT ?2").map_err(|e|e.to_string())?;
            let items=stmt.query_map(params![wid,limit],|r|Ok(json!({"id":r.get::<_,String>(0)?,"operation":r.get::<_,String>(1)?,"entity":r.get::<_,Option<String>>(2)?,"recordId":r.get::<_,Option<String>>(3)?,"summary":r.get::<_,String>(4)?,"createdAt":r.get::<_,String>(5)?}))).map_err(|e|e.to_string())?.collect::<Result<Vec<_>,_>>().map_err(|e|e.to_string())?;
            Ok(json!({"items":items,"limit":limit}))
        }
        "backup.create" => {
            let wid = need(&input, "workspaceId")?;
            workspace(&db, wid)?;
            let id = Uuid::new_v4().to_string();
            let folder = root.join("backups");
            fs::create_dir_all(&folder).map_err(|e| e.to_string())?;
            private_dir(&folder)?;
            let backup_path=folder.join(format!("{id}.sqlite"));
            private_file(&backup_path)?;
            let mut target =
                Connection::open(backup_path).map_err(|e| e.to_string())?;
            rusqlite::backup::Backup::new(&db, &mut target)
                .map_err(|e| e.to_string())?
                .run_to_completion(5, std::time::Duration::from_millis(100), None)
                .map_err(|e| e.to_string())?;
            Ok(json!({"backupId":id,"workspaceId":wid,"created":true}))
        }
        "backup.restore" => {
            let id = need(&input, "backupId")?;
            Uuid::parse_str(id).map_err(|_| "invalid backupId")?;
            let source_path = root.join("backups").join(format!("{id}.sqlite"));
            if !source_path.is_file() {
                return Err("backup not found".into());
            }
            let source = Connection::open_with_flags(
                source_path,
                rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY,
            )
            .map_err(|e| e.to_string())?;
            let check: String = source
                .query_row("PRAGMA integrity_check", [], |r| r.get(0))
                .map_err(|e| e.to_string())?;
            if check != "ok" {
                return Err("backup integrity failed".into());
            }
            let version: i64 = source
                .query_row("PRAGMA user_version", [], |r| r.get(0))
                .map_err(|e| e.to_string())?;
            if version != 1 {
                return Err("backup schema version is incompatible".into());
            }
            let backup_workspace: String = source
                .query_row("SELECT id FROM workspaces LIMIT 1", [], |r| r.get(0))
                .map_err(|_| "backup has no GiGi workspace")?;
            let current_workspace: String = db
                .query_row("SELECT id FROM workspaces LIMIT 1", [], |r| r.get(0))
                .map_err(|_| "current GiGi workspace missing")?;
            if backup_workspace != current_workspace {
                return Err("backup belongs to a different workspace".into());
            }
            for entity in ENTITIES {
                let present: i64 = source
                    .query_row(
                        "SELECT count(*) FROM sqlite_master WHERE type='table' AND name=?1",
                        [entity],
                        |r| r.get(0),
                    )
                    .map_err(|e| e.to_string())?;
                if present != 1 {
                    return Err(format!("backup missing {entity} table"));
                }
            }
            let safety_id = Uuid::new_v4().to_string();
            let safety_path=root.join("backups").join(format!("{safety_id}.sqlite"));
            private_file(&safety_path)?;
            let mut safety =
                Connection::open(safety_path)
                    .map_err(|e| e.to_string())?;
            rusqlite::backup::Backup::new(&db, &mut safety)
                .map_err(|e| e.to_string())?
                .run_to_completion(5, std::time::Duration::from_millis(100), None)
                .map_err(|e| e.to_string())?;
            drop(safety);
            rusqlite::backup::Backup::new(&source, &mut db)
                .map_err(|e| e.to_string())?
                .run_to_completion(5, std::time::Duration::from_millis(100), None)
                .map_err(|e| e.to_string())?;
            Ok(json!({"restored":true,"backupId":id,"safetyBackupId":safety_id}))
        }
        _ => Err(format!("unknown operation: {op}")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn temp() -> std::path::PathBuf {
        std::env::temp_dir().join(format!("gigi-domain-test-{}", Uuid::new_v4()))
    }

    #[test]
    fn workspace_and_record_survive_reopen() {
        let root = std::env::temp_dir().join(format!("gigi-domain-test-{}", uuid::Uuid::new_v4()));
        let workspace = dispatch(
            &root,
            "workspace.create",
            serde_json::json!({"name":"Micah's Work"}),
        )
        .unwrap();
        let workspace_id = workspace["id"].as_str().unwrap();
        let gig = dispatch(&root, "records.save", serde_json::json!({"workspaceId":workspace_id,"entity":"gigs","title":"Friday set","fields":{"Fee":12500,"Status":"Confirmed"},"source":{"kind":"manual"},"idempotencyKey":"gig-1"})).unwrap();
        assert_eq!(gig["title"], "Friday set");
        let got = dispatch(
            &root,
            "records.get",
            serde_json::json!({"workspaceId":workspace_id,"entity":"gigs","id":gig["id"]}),
        )
        .unwrap();
        assert_eq!(got["fields"]["Fee"], 12500);
        let _ = std::fs::remove_dir_all(root);
    }
    #[test]
    fn typed_relations_money_and_restore() {
        let root = temp();
        let w = dispatch(&root, "workspace.create", json!({"name":"Solo"})).unwrap();
        let wid = &w["id"];
        let gig=dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":"gigs","title":"Show","fields":{"Fee":20000,"Status":"Confirmed"}})).unwrap();
        let deposit=dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":"finances","title":"Deposit","fields":{"Amount":5000,"Direction":"Income","Status":"Paid"}})).unwrap();
        let expense=dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":"finances","title":"Travel","fields":{"Amount":3000,"Direction":"Expense"}})).unwrap();
        for finance in [&deposit, &expense] {
            dispatch(&root,"relations.link",json!({"workspaceId":wid,"fromEntity":"gigs","fromId":gig["id"],"toEntity":"finances","toId":finance["id"],"role":"Finances"})).unwrap();
        }
        let summary = dispatch(
            &root,
            "gigs.summary",
            json!({"workspaceId":wid,"gigId":gig["id"]}),
        )
        .unwrap();
        assert_eq!(summary["netCents"], 17000);
        assert_eq!(summary["balanceDueCents"], 15000);
        let backup = dispatch(&root, "backup.create", json!({"workspaceId":wid})).unwrap();
        dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":"gigs","id":gig["id"],"title":"Changed","fields":{"Fee":10000}})).unwrap();
        dispatch(
            &root,
            "backup.restore",
            json!({"backupId":backup["backupId"]}),
        )
        .unwrap();
        let restored = dispatch(
            &root,
            "gigs.summary",
            json!({"workspaceId":wid,"gigId":gig["id"]}),
        )
        .unwrap();
        assert_eq!(restored["feeCents"], 20000);
        assert!(root.join("backups").read_dir().unwrap().count() >= 2);
        let _ = fs::remove_dir_all(root);
    }
    #[test]
    fn schema_rejects_cross_workspace_missing_and_ambiguous_links() {
        let root = temp();
        let w = dispatch(&root, "workspace.create", json!({"name":"Solo"})).unwrap();
        let wid = &w["id"];
        let gig = dispatch(
            &root,
            "records.save",
            json!({"workspaceId":wid,"entity":"gigs","title":"Show"}),
        )
        .unwrap();
        let contact = dispatch(
            &root,
            "records.save",
            json!({"workspaceId":wid,"entity":"contacts","title":"Agent"}),
        )
        .unwrap();
        assert!(dispatch(&root,"relations.link",json!({"workspaceId":wid,"fromEntity":"gigs","fromId":gig["id"],"toEntity":"contacts","toId":contact["id"]})).unwrap_err().contains("role required"));
        for role in ["Booked Through", "Contacts"] {
            dispatch(&root,"relations.link",json!({"workspaceId":wid,"fromEntity":"gigs","fromId":gig["id"],"toEntity":"contacts","toId":contact["id"],"role":role})).unwrap();
        }
        let got = dispatch(
            &root,
            "records.get",
            json!({"workspaceId":wid,"entity":"gigs","id":gig["id"]}),
        )
        .unwrap();
        assert_eq!(got["relations"].as_array().unwrap().len(), 2);
        assert_eq!(got["relations"][0]["fromTitle"],"Show");
        assert_eq!(got["relations"][0]["toTitle"],"Agent");
        assert!(dispatch(&root,"relations.link",json!({"workspaceId":wid,"fromEntity":"gigs","fromId":gig["id"],"toEntity":"contacts","toId":Uuid::new_v4().to_string(),"role":"Contacts"})).is_err());
        assert!(dispatch(
            &root,
            "records.get",
            json!({"workspaceId":Uuid::new_v4().to_string(),"entity":"gigs","id":gig["id"]})
        )
        .is_err());
        let _ = fs::remove_dir_all(root);
    }
    #[test]
    fn import_duplicate_preserves_correction_and_receipt_collision_fails() {
        let root = temp();
        let w = dispatch(&root, "workspace.create", json!({"name":"Solo"})).unwrap();
        let wid = &w["id"];
        let source = json!({"kind":"import","provider":"gmail","externalId":"thread-1"});
        let original=dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":"gigs","title":"Imported","fields":{"Fee":10000},"source":source,"idempotencyKey":"import-1"})).unwrap();
        let same=dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":"gigs","title":"Imported","fields":{"Fee":10000},"source":source,"idempotencyKey":"import-1"})).unwrap();
        assert_eq!(same["id"], original["id"]);
        assert!(dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":"gigs","title":"Changed key","source":source,"idempotencyKey":"import-1"})).is_err());
        dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":"gigs","id":original["id"],"title":"Manual correction","fields":{"Fee":12000},"source":{"kind":"manual"}})).unwrap();
        let duplicate=dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":"gigs","title":"Stale import","fields":{"Fee":10000},"source":source})).unwrap();
        assert_eq!(duplicate["title"], "Manual correction");
        assert_eq!(duplicate["source"]["origin"]["externalId"], "thread-1");
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn imported_ids_are_scoped_to_connected_account_and_collection() {
        let root=temp();let w=dispatch(&root,"workspace.create",json!({"name":"Solo"})).unwrap();let wid=&w["id"];
        let a=dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":"interactions","title":"Message A","source":{"kind":"import","provider":"gmail","connectedAccountId":"account-a","collectionId":"inbox","externalId":"same"}})).unwrap();
        let b=dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":"interactions","title":"Message B","source":{"kind":"import","provider":"gmail","connectedAccountId":"account-b","collectionId":"inbox","externalId":"same"}})).unwrap();
        let c=dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":"interactions","title":"Message C","source":{"kind":"import","provider":"gmail","connectedAccountId":"account-a","collectionId":"archive","externalId":"same"}})).unwrap();
        assert_ne!(a["id"],b["id"]);assert_ne!(a["id"],c["id"]);
        let replay=dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":"interactions","title":"Stale","source":{"kind":"import","provider":"gmail","connectedAccountId":"account-a","collectionId":"inbox","externalId":"same"}})).unwrap();
        assert_eq!(replay["id"],a["id"]);
        let _=fs::remove_dir_all(root);
    }

    #[test]
    fn cents_require_supported_currency_and_finance_status() {
        let root=temp();let w=dispatch(&root,"workspace.create",json!({"name":"Solo"})).unwrap();let wid=&w["id"];
        assert!(dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":"profile","title":"Operator","fields":{"Currency":"JPY"}})).is_err());
        assert!(dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":"finances","title":"Mystery","fields":{"Amount":100,"Direction":"Unknown"}})).is_err());
        let profile=dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":"profile","title":"Operator","fields":{"Currency":"USD"}})).unwrap();
        assert_eq!(profile["fields"]["Currency"],"USD");
        let _=dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":"gigs","title":"Paid set","fields":{"Fee":12000}})).unwrap();
        let changed=dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":"profile","id":profile["id"],"title":"Operator","fields":{"Currency":"EUR"}}));
        assert!(changed.unwrap_err().contains("currency cannot change"));
        let _=fs::remove_dir_all(root);
    }
    #[test]
    fn default_record_detail_is_bounded_and_full_detail_is_explicit() {
        let root = temp();
        let w = dispatch(&root, "workspace.create", json!({"name":"Solo"})).unwrap();
        let wid = &w["id"];
        let note=dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":"notes","title":"Long note","fields":{"Note Details":"x".repeat(12000)}})).unwrap();
        let request = json!({"workspaceId":wid,"entity":"notes","id":note["id"]});
        let brief = dispatch(&root, "records.get", request.clone()).unwrap();
        assert!(brief.to_string().len() < 6000);
        assert_eq!(brief["truncatedFields"][0], "Note Details");
        let full = dispatch(
            &root,
            "records.get",
            json!({"workspaceId":wid,"entity":"notes","id":note["id"],"detail":"full"}),
        )
        .unwrap();
        assert_eq!(
            full["fields"]["Note Details"].as_str().unwrap().len(),
            12000
        );
        let _ = fs::remove_dir_all(root);
    }
    #[test]
    fn default_detail_has_byte_ceiling_with_escaping_and_many_links(){
        let root=temp();let w=dispatch(&root,"workspace.create",json!({"name":"Solo"})).unwrap();let wid=&w["id"];
        let note=dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":"notes","title":"Escaped","fields":{"Note Details":"\n".repeat(12000)}})).unwrap();
        let brief=dispatch(&root,"records.get",json!({"workspaceId":wid,"entity":"notes","id":note["id"]})).unwrap();
        assert!(brief.to_string().len()<8000);
        assert_eq!(brief["truncatedFields"][0],"Note Details");
        let gig=dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":"gigs","title":"Show"})).unwrap();
        for n in 0..20 {
            let contact=dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":"contacts","title":format!("{n}{}","\n".repeat(490))})).unwrap();
            dispatch(&root,"relations.link",json!({"workspaceId":wid,"fromEntity":"gigs","fromId":gig["id"],"toEntity":"contacts","toId":contact["id"],"role":"Contacts"})).unwrap();
        }
        let linked=dispatch(&root,"records.get",json!({"workspaceId":wid,"entity":"gigs","id":gig["id"]})).unwrap();
        assert!(linked.to_string().len()<8000);
        assert_eq!(linked["relationCount"],20);
        assert_eq!(linked["relationsTruncated"],true);
        let _=fs::remove_dir_all(root);
    }
    #[test]
    fn list_is_paginated_and_unknown_fee_stays_unknown() {
        let root = temp();
        let w = dispatch(&root, "workspace.create", json!({"name":"Solo"})).unwrap();
        let wid = &w["id"];
        for i in 0..55 {
            dispatch(
                &root,
                "records.save",
                json!({"workspaceId":wid,"entity":"gigs","title":format!("Gig {i}")}),
            )
            .unwrap();
        }
        let first = dispatch(
            &root,
            "records.list",
            json!({"workspaceId":wid,"entity":"gigs","limit":100}),
        )
        .unwrap();
        assert_eq!(first["items"].as_array().unwrap().len(), 50);
        assert!(first.to_string().len() < 20000);
        let next = dispatch(
            &root,
            "records.list",
            json!({"workspaceId":wid,"entity":"gigs","cursor":first["nextCursor"]}),
        )
        .unwrap();
        assert_eq!(next["items"].as_array().unwrap().len(), 5);
        let summary = dispatch(
            &root,
            "gigs.summary",
            json!({"workspaceId":wid,"gigId":first["items"][0]["id"]}),
        )
        .unwrap();
        assert!(summary["feeCents"].is_null());
        assert_eq!(summary["financialsComplete"], false);
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn private_database_permissions() {
        use std::os::unix::fs::PermissionsExt;
        let root = temp();
        dispatch(&root, "workspace.create", json!({"name":"Solo"})).unwrap();
        assert_eq!(fs::metadata(&root).unwrap().permissions().mode() & 0o777, 0o700);
        assert_eq!(fs::metadata(root.join("gigi.sqlite")).unwrap().permissions().mode() & 0o777, 0o600);
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn history_export_uses_scoped_ctx_v2_events_and_private_file() {
        use std::os::unix::fs::PermissionsExt;
        let root=temp();let w=dispatch(&root,"workspace.create",json!({"name":"Solo"})).unwrap();let wid=&w["id"];
        dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":"gigs","title":"Friday set"})).unwrap();
        let result=export_history(&root).unwrap();assert_eq!(result["events"],2);
        let path=root.join("imports/gigi-history.jsonl");
        let content=fs::read_to_string(&path).unwrap();let lines:Vec<Value>=content.lines().map(|line|serde_json::from_str(line).unwrap()).collect();
        assert_eq!(lines[0]["schema_version"],"ctx-history-jsonl-v2");
        assert_eq!(lines[1]["provider_key"],"gigi-local");
        assert_eq!(lines[2]["source_id"],format!("gigi-{}",wid.as_str().unwrap()));
        assert_eq!(lines[4]["event_index"],1);
        assert_eq!(lines[4]["event_type"],"message");
        assert!(lines[4]["payload"]["text"].as_str().unwrap().contains("Friday set"));
        assert_eq!(fs::metadata(&path).unwrap().permissions().mode()&0o777,0o600);
        let _=fs::remove_dir_all(root);
    }
}
