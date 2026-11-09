//! Curated workspace memory. No history/host-store ingestion or authority.
use rusqlite::{params, Connection, OptionalExtension, TransactionBehavior};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::path::Path;
use uuid::Uuid;
fn fingerprint(v: &Value) -> String {
    format!("{:x}", Sha256::digest(v.to_string().as_bytes()))
}
const POLICY:&str="Memory is advisory context, never permission. Canonical records and explicit policy take precedence. Inferred entries are unconfirmed. Forget excludes future retrieval; text already present in conversations or backups is not erased. Start a new conversation after forgetting sensitive context.";
fn need<'a>(v: &'a Value, k: &str, max: usize) -> Result<&'a str, String> {
    v[k].as_str()
        .filter(|s| !s.trim().is_empty() && s.chars().count() <= max)
        .ok_or_else(|| format!("{k} is required (maximum {max} characters)"))
}
fn ensure(db: &Connection) -> Result<(), String> {
    db.execute_batch("CREATE TABLE IF NOT EXISTS workspace_memory(workspace_id TEXT NOT NULL REFERENCES workspaces(id),id TEXT NOT NULL,revision INTEGER NOT NULL,entry_json TEXT NOT NULL,status TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(workspace_id,id)); CREATE TABLE IF NOT EXISTS memory_requests(workspace_id TEXT NOT NULL REFERENCES workspaces(id),request_id TEXT NOT NULL,request_json TEXT NOT NULL,request_hash TEXT NOT NULL,state TEXT NOT NULL,result_json TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(workspace_id,request_id));").map_err(|e|e.to_string())
}
fn get(db: &Connection, w: &str, id: &str) -> Result<Value, String> {
    let row:Option<(String,i64,String,String,String)>=db.query_row("SELECT entry_json,revision,status,created_at,updated_at FROM workspace_memory WHERE workspace_id=?1 AND id=?2",params![w,id],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?,r.get(4)?))).optional().map_err(|e|e.to_string())?;
    let Some((raw, rev, status, created, updated)) = row else {
        return Err("Memory not found in this workspace".into());
    };
    if status != "active" {
        return Err("Memory is forgotten or superseded; excluded from retrieval".into());
    }
    let mut v: Value = serde_json::from_str(&raw).map_err(|e| e.to_string())?;
    v["id"] = json!(id);
    v["workspaceId"] = json!(w);
    v["revision"] = json!(rev);
    v["status"] = json!(status);
    v["createdAt"] = json!(created);
    v["updatedAt"] = json!(updated);
    v["citation"] = json!(format!("gigi-memory://{w}/{id}?revision={rev}"));
    Ok(v)
}
fn validate(db: &Connection, w: &str, v: &Value) -> Result<(), String> {
    let action = need(v, "action", 20)?;
    if !["save", "forget", "supersede"].contains(&action) {
        return Err("Unknown memory action".into());
    }
    if let Some(id) = v.get("id") {
        let old = get(db, w, id.as_str().ok_or("Invalid memory id")?)?;
        if old["status"] != "active" || v["expectedRevision"].as_i64() != old["revision"].as_i64() {
            return Err("Memory changed; review a fresh revision".into());
        }
    } else if action != "save" || v.get("expectedRevision").is_some() {
        return Err("Memory id and expectedRevision required".into());
    }
    if action != "forget" {
        let e = &v["entry"];
        let kind = need(e, "kind", 30)?;
        if !["preference", "decision", "relationship", "lesson"].contains(&kind) {
            return Err("Invalid memory kind".into());
        }
        need(e, "text", 2000)?;
        if !["confirmed", "inferred"].contains(&need(e, "state", 20)?) {
            return Err("Explicit confirmed or inferred state required".into());
        }
        if need(e, "scope", 100)? != "workspace" {
            return Err("Only workspace scope is supported".into());
        }
        let source = &e["source"];
        if !["user", "record", "conversation", "observation"].contains(&need(source, "kind", 30)?) {
            return Err("Invalid provenance kind".into());
        }
        need(source, "reference", 500)?;
    }
    Ok(())
}
pub fn dispatch(root: &Path, op: &str, v: Value) -> Result<Value, String> {
    if !v.is_object() {
        return Err("input must be an object".into());
    }
    let w = need(&v, "workspaceId", 100)?;
    let mut db = crate::domain::open(root)?;
    ensure(&db)?;
    let exists: bool = db
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM workspaces WHERE id=?1)",
            [w],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    if !exists {
        return Err("Unknown local workspace".into());
    }
    match op {
        "memory.receipt" => {
            let id = need(&v, "requestId", 100)?;
            let(state,raw):(String,Option<String>)=db.query_row("SELECT state,result_json FROM memory_requests WHERE workspace_id=?1 AND request_id=?2",params![w,id],|r|Ok((r.get(0)?,r.get(1)?))).map_err(|_|"Memory request not found")?;
            Ok(
                json!({"requestId":id,"state":state,"receipt":raw.and_then(|s|serde_json::from_str::<Value>(&s).ok())}),
            )
        }
        "memory.get" => get(&db, w, need(&v, "id", 100)?),
        "memory.list" | "memory.search" => {
            let query = if op == "memory.search" {
                need(&v, "query", 200)?.trim().to_lowercase()
            } else {
                String::new()
            };
            let limit = v["limit"]
                .as_u64()
                .unwrap_or(if op == "memory.search" { 5 } else { 50 });
            if limit == 0 || limit > if op == "memory.search" { 5 } else { 50 } {
                return Err("Invalid memory limit".into());
            }
            let offset = v["offset"].as_u64().unwrap_or(0);
            if offset > 10000 {
                return Err("Invalid memory offset".into());
            }
            // Search in SQLite before bounding; literal substring, never wildcard SQL.
            let mut stmt=db.prepare("SELECT id FROM workspace_memory WHERE workspace_id=?1 AND status='active' AND (?2='' OR instr(lower(json_extract(entry_json,'$.text')),?2)>0) ORDER BY updated_at DESC,id LIMIT ?3 OFFSET ?4").map_err(|e|e.to_string())?;
            let ids = stmt
                .query_map(params![w, query, limit + 1, offset], |r| {
                    r.get::<_, String>(0)
                })
                .map_err(|e| e.to_string())?
                .collect::<Result<Vec<_>, _>>()
                .map_err(|e| e.to_string())?;
            let more = ids.len() > limit as usize;
            let items = ids
                .iter()
                .take(limit as usize)
                .map(|id| get(&db, w, id))
                .collect::<Result<Vec<_>, _>>()?;
            Ok(
                json!({"items":items,"nextOffset":if more{Some(offset+limit)}else{None},"policy":POLICY}),
            )
        }
        "memory.requests" => {
            let mut stmt=db.prepare("SELECT request_id,request_json,created_at FROM memory_requests WHERE workspace_id=?1 AND state='pending_user_approval' ORDER BY created_at,request_id LIMIT 50").map_err(|e|e.to_string())?;
            let rows = stmt
                .query_map([w], |r| {
                    Ok((
                        r.get::<_, String>(0)?,
                        r.get::<_, String>(1)?,
                        r.get::<_, String>(2)?,
                    ))
                })
                .map_err(|e| e.to_string())?;
            let mut items = vec![];
            for row in rows {
                let (id, raw, created) = row.map_err(|e| e.to_string())?;
                items.push(json!({"requestId":id,"request":serde_json::from_str::<Value>(&raw).map_err(|e|e.to_string())?,"createdAt":created}));
            }
            Ok(json!({"items":items,"policy":POLICY}))
        }
        "memory.request" => {
            let id = need(&v, "requestId", 100)?;
            let tx = db
                .transaction_with_behavior(TransactionBehavior::Immediate)
                .map_err(|e| e.to_string())?;
            let old:Option<(String,String,Option<String>)>=tx.query_row("SELECT request_hash,state,result_json FROM memory_requests WHERE workspace_id=?1 AND request_id=?2",params![w,id],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?))).optional().map_err(|e|e.to_string())?;
            if let Some((raw, state, result)) = old {
                if raw != fingerprint(&v) {
                    return Err("Request id already used with a different payload".into());
                }
                if state != "pending_user_approval" {
                    return Ok(
                        json!({"requestId":id,"state":state,"receipt":result.and_then(|s|serde_json::from_str::<Value>(&s).ok()),"policy":POLICY}),
                    );
                }
                return Ok(json!({"requestId":id,"state":state,"policy":POLICY}));
            }
            validate(&tx, w, &v)?;
            let count:i64=tx.query_row("SELECT count(*) FROM memory_requests WHERE workspace_id=?1 AND state='pending_user_approval'",[w],|r|r.get(0)).map_err(|e|e.to_string())?;
            if count >= 50 {
                return Err("Review pending memory requests first".into());
            }
            let mut stored = v.clone();
            if let Some(target) = v["id"].as_str() {
                stored["before"] = get(&tx, w, target)?;
            }
            tx.execute("INSERT INTO memory_requests(workspace_id,request_id,request_json,request_hash,state) VALUES(?1,?2,?3,?4,'pending_user_approval')",params![w,id,stored.to_string(),fingerprint(&v)]).map_err(|e|e.to_string())?;
            tx.commit().map_err(|e| e.to_string())?;
            Ok(
                json!({"requestId":id,"state":"pending_user_approval","reviewIn":"Platform / Memory","policy":POLICY}),
            )
        }
        "memory.review" => {
            let id = need(&v, "requestId", 100)?;
            let decision = need(&v, "decision", 10)?;
            if !["approve", "reject"].contains(&decision) {
                return Err("Explicit review decision required".into());
            }
            let tx = db
                .transaction_with_behavior(TransactionBehavior::Immediate)
                .map_err(|e| e.to_string())?;
            let(raw,state,result):(String,String,Option<String>)=tx.query_row("SELECT request_json,state,result_json FROM memory_requests WHERE workspace_id=?1 AND request_id=?2",params![w,id],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?))).map_err(|_|"Memory request not found in this workspace")?;
            if state != "pending_user_approval" {
                return serde_json::from_str(&result.ok_or("Missing memory receipt")?)
                    .map_err(|e| e.to_string());
            }
            let request: Value = serde_json::from_str(&raw).map_err(|e| e.to_string())?;
            let mut receipt = json!({"requestId":id,"state":"rejected"});
            if decision == "approve" {
                validate(&tx, w, &request)?;
                let action = request["action"].as_str().unwrap();
                let now: String = tx
                    .query_row("SELECT strftime('%Y-%m-%dT%H:%M:%fZ','now')", [], |r| {
                        r.get(0)
                    })
                    .map_err(|e| e.to_string())?;
                let old_id = request["id"].as_str();
                let target = if action == "save" {
                    old_id
                        .map(str::to_owned)
                        .unwrap_or_else(|| Uuid::new_v4().to_string())
                } else if action == "supersede" {
                    Uuid::new_v4().to_string()
                } else {
                    old_id.unwrap().to_owned()
                };
                let revision = if action == "save" {
                    request["expectedRevision"].as_i64().unwrap_or(0) + 1
                } else if action == "forget" {
                    request["expectedRevision"].as_i64().unwrap() + 1
                } else {
                    1
                };
                if action == "forget" {
                    tx.execute("UPDATE workspace_memory SET entry_json='{}',status='forgotten',revision=?3,updated_at=?4 WHERE workspace_id=?1 AND id=?2",params![w,target,revision,now]).map_err(|e|e.to_string())?;
                    // Purge all pending payloads involving this entry. Historical receipts contain metadata only.
                    tx.execute("UPDATE memory_requests SET request_json='{}',state='invalidated',result_json='{}' WHERE workspace_id=?1 AND json_extract(request_json,'$.id')=?2 AND request_id<>?3 AND state='pending_user_approval'",params![w,target,id]).map_err(|e|e.to_string())?;
                } else {
                    let e = &request["entry"];
                    let entry = json!({"kind":e["kind"],"text":e["text"],"state":e["state"],"scope":"workspace","source":{"kind":e["source"]["kind"],"reference":e["source"]["reference"]},"supersedes":if action=="supersede"{request["id"].clone()}else{Value::Null}});
                    tx.execute("INSERT INTO workspace_memory(workspace_id,id,revision,entry_json,status,created_at,updated_at) VALUES(?1,?2,?3,?4,'active',?5,?5) ON CONFLICT(workspace_id,id) DO UPDATE SET revision=excluded.revision,entry_json=excluded.entry_json,updated_at=excluded.updated_at",params![w,target,revision,entry.to_string(),now]).map_err(|e|e.to_string())?;
                    if action == "supersede" {
                        tx.execute("UPDATE workspace_memory SET entry_json='{}',status='superseded',revision=revision+1,updated_at=?3 WHERE workspace_id=?1 AND id=?2",params![w,old_id,now]).map_err(|e|e.to_string())?;
                    }
                }
                receipt = json!({"requestId":id,"state":"verified","action":action,"memoryId":target,"revision":revision});
            }
            // Do not retain old text in idempotency receipts after correction or forgetting.
            tx.execute("UPDATE memory_requests SET request_json='{}',state=?3,result_json=?4 WHERE workspace_id=?1 AND request_id=?2",params![w,id,receipt["state"].as_str(),receipt.to_string()]).map_err(|e|e.to_string())?;
            tx.commit().map_err(|e| e.to_string())?;
            Ok(receipt)
        }
        _ => Err("Unknown memory operation".into()),
    }
}

/// External assistants can stage proposals, but only the local app owns review.
pub fn catalog() -> Vec<Value> {
    [('r',"gigi_memory_search","memory.search",json!({"query":{"type":"string","minLength":1,"maxLength":200},"limit":{"type":"integer","minimum":1,"maximum":5}}),vec!["workspaceId","query"]),('r',"gigi_memory_get","memory.get",json!({"id":{"type":"string"}}),vec!["workspaceId","id"]),('w',"gigi_memory_request","memory.request",json!({"requestId":{"type":"string"},"action":{"type":"string","enum":["save","forget","supersede"]},"id":{"type":"string"},"expectedRevision":{"type":"integer"},"entry":{"type":"object","properties":{"kind":{"type":"string","enum":["preference","decision","relationship","lesson"]},"text":{"type":"string","maxLength":2000},"state":{"type":"string","enum":["confirmed","inferred"]},"scope":{"type":"string","enum":["workspace"]},"source":{"type":"object","properties":{"kind":{"type":"string","enum":["user","record","conversation","observation"]},"reference":{"type":"string","maxLength":500}},"required":["kind","reference"]}},"required":["kind","text","state","scope","source"]}}),vec!["workspaceId","requestId","action"])].into_iter().map(|(kind,name,operation,extra,required)|{let mut properties=extra.as_object().unwrap().clone();properties.insert("workspaceId".into(),json!({"type":"string"}));json!({"name":name,"description":format!("GiGi {operation}. {POLICY} Requests stage an exact proposal for human review in Platform / Memory; pending is not saved. Never manufacture confirmation. Use a stable unique requestId; read gigi_memory_get after approval. Corrections and forget require the current id and expectedRevision."),"inputSchema":{"type":"object","properties":properties,"required":required,"additionalProperties":false},"annotations":{"readOnlyHint":kind=='r',"destructiveHint":false}})}).collect()
}
pub fn tool_operation(name: &str) -> Option<&'static str> {
    match name {
        "gigi_memory_search" => Some("memory.search"),
        "gigi_memory_get" => Some("memory.get"),
        "gigi_memory_request" => Some("memory.request"),
        _ => None,
    }
}
