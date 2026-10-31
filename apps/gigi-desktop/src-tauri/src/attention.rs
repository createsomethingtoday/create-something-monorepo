//! Durable, workspace-scoped attention. Notifications never grant mutation authority.
use chrono::{Duration, NaiveDate};
use rusqlite::{params, Connection, OptionalExtension, TransactionBehavior};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::path::Path;

fn fail(error: impl std::fmt::Display) -> String {
    error.to_string()
}
fn text<'a>(value: &'a Value, key: &str) -> Result<&'a str, String> {
    value
        .get(key)
        .and_then(Value::as_str)
        .filter(|s| !s.is_empty() && s.len() <= 256)
        .ok_or_else(|| format!("Invalid attention {key}"))
}
fn hash(value: &Value) -> String {
    format!("{:x}", Sha256::digest(value.to_string().as_bytes()))
}
fn day(value: &str) -> Option<NaiveDate> {
    if value.len() != 10 {
        return None;
    }
    NaiveDate::parse_from_str(value, "%Y-%m-%d")
        .ok()
        .filter(|d| d.format("%Y-%m-%d").to_string() == value)
}
fn clock(input: &Value) -> Result<(String, i64, i64), String> {
    let today = text(input, "today")?;
    day(today).ok_or("today must be a valid YYYY-MM-DD date")?;
    let now = input["now"]
        .as_i64()
        .filter(|n| *n > 0 && *n < 253402300800000)
        .ok_or("Invalid attention now")?;
    let hour = input["localHour"]
        .as_i64()
        .filter(|n| (0..24).contains(n))
        .ok_or("Invalid attention localHour")?;
    Ok((today.into(), now, hour))
}
fn defaults() -> Value {
    json!({"enabled":false,"detailedPreviews":false,"reminders":false,"quietStart":22,"quietEnd":8})
}
fn ensure(db: &Connection) -> Result<(), String> {
    db.execute_batch("CREATE TABLE IF NOT EXISTS attention_items(
 workspace_id TEXT NOT NULL REFERENCES workspaces(id), id TEXT NOT NULL, kind TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL,
 entity TEXT,record_id TEXT,session_id TEXT,revision TEXT NOT NULL,source_json TEXT NOT NULL,created_at INTEGER NOT NULL,
 active INTEGER NOT NULL DEFAULT 1,unread INTEGER NOT NULL DEFAULT 1,dismissed INTEGER NOT NULL DEFAULT 0,snoozed_until INTEGER,
 delivery_token TEXT,delivery_state TEXT,PRIMARY KEY(workspace_id,id));
 CREATE INDEX IF NOT EXISTS idx_attention_active ON attention_items(workspace_id,active,dismissed,created_at);
 CREATE TABLE IF NOT EXISTS attention_settings(workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id),settings_json TEXT NOT NULL,enabled_since INTEGER NOT NULL DEFAULT 0,last_claim INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS attention_observations(workspace_id TEXT NOT NULL REFERENCES workspaces(id),session_id TEXT NOT NULL,state TEXT NOT NULL,response_id TEXT,receipt_id TEXT,PRIMARY KEY(workspace_id,session_id));") .map_err(fail)
}
fn settings(db: &Connection, wid: &str) -> Result<Value, String> {
    let raw: Option<String> = db
        .query_row(
            "SELECT settings_json FROM attention_settings WHERE workspace_id=?1",
            [wid],
            |r| r.get(0),
        )
        .optional()
        .map_err(fail)?;
    raw.map(|v| serde_json::from_str(&v).map_err(fail))
        .unwrap_or_else(|| Ok(defaults()))
}
fn workspace(db: &Connection, wid: &str) -> Result<(), String> {
    let yes: bool = db
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM workspaces WHERE id=?1)",
            [wid],
            |r| r.get(0),
        )
        .map_err(fail)?;
    if yes {
        Ok(())
    } else {
        Err("workspace not found".into())
    }
}
struct Signal {
    id: String,
    kind: &'static str,
    title: String,
    body: String,
    entity: Option<String>,
    record_id: Option<String>,
    session_id: Option<String>,
    source: Value,
}
fn put(db: &Connection, wid: &str, signal: Signal, now: i64) -> Result<(), String> {
    let revision = hash(
        &json!({"kind":signal.kind,"title":signal.title,"body":signal.body,"source":signal.source}),
    );
    db.execute("INSERT INTO attention_items(workspace_id,id,kind,title,body,entity,record_id,session_id,revision,source_json,created_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)
 ON CONFLICT(workspace_id,id) DO UPDATE SET kind=excluded.kind,title=excluded.title,body=excluded.body,entity=excluded.entity,record_id=excluded.record_id,session_id=excluded.session_id,source_json=excluded.source_json,active=1,
 unread=CASE WHEN attention_items.revision!=excluded.revision THEN 1 ELSE attention_items.unread END,
 dismissed=CASE WHEN attention_items.revision!=excluded.revision THEN 0 ELSE attention_items.dismissed END,
 snoozed_until=CASE WHEN attention_items.revision!=excluded.revision THEN NULL ELSE attention_items.snoozed_until END,
 delivery_token=CASE WHEN attention_items.revision!=excluded.revision THEN NULL ELSE attention_items.delivery_token END,
 delivery_state=CASE WHEN attention_items.revision!=excluded.revision THEN NULL ELSE attention_items.delivery_state END,
 created_at=CASE WHEN attention_items.revision!=excluded.revision THEN excluded.created_at ELSE attention_items.created_at END,revision=excluded.revision",
 params![wid,signal.id,signal.kind,signal.title,signal.body,signal.entity,signal.record_id,signal.session_id,revision,signal.source.to_string(),now]).map_err(fail)?;
    Ok(())
}
fn date_field<'a>(fields: &'a Value, name: &str) -> Option<&'a str> {
    fields[name]
        .as_str()
        .and_then(|s| s.get(..10))
        .filter(|s| day(s).is_some())
}
fn refresh_records(db: &Connection, wid: &str, today: &str, now: i64) -> Result<(), String> {
    db.execute(
        "UPDATE attention_items SET active=0 WHERE workspace_id=?1 AND kind='reminder'",
        [wid],
    )
    .map_err(fail)?;
    let tomorrow = (day(today).unwrap() + Duration::days(1))
        .format("%Y-%m-%d")
        .to_string();
    for entity in ["tasks", "gigs"] {
        let mut statement=db.prepare(&format!("SELECT id,title,fields_json,occurred_at FROM {entity} WHERE workspace_id=?1 AND lower(trim(coalesce(status,''))) NOT IN ('done','complete','completed','cancelled','canceled') ORDER BY id")).map_err(fail)?;
        let rows = statement
            .query_map([wid], |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, String>(1)?,
                    r.get::<_, String>(2)?,
                    r.get::<_, Option<String>>(3)?,
                ))
            })
            .map_err(fail)?;
        for row in rows {
            let (id, title, raw, occurred) = row.map_err(fail)?;
            let fields: Value = serde_json::from_str(&raw).map_err(fail)?;
            let date = if entity == "tasks" {
                date_field(&fields, "Due Date").or_else(|| date_field(&fields, "Do Date"))
            } else {
                occurred
                    .as_deref()
                    .and_then(|s| s.get(..10))
                    .filter(|s| day(s).is_some())
            };
            let Some(date) = date else { continue };
            if (entity == "tasks" && date > today)
                || (entity == "gigs" && (date < today || date > tomorrow.as_str()))
            {
                continue;
            }
            let label = if entity == "tasks" {
                match (date_field(&fields,"Due Date").is_some(),date<today) {
                    (true,true)=>"Task is overdue",(true,false)=>"Task is due today",
                    (false,true)=>"Planned task date has passed",(false,false)=>"Task planned for today",
                }
            } else if date == today {
                "Gig is today"
            } else {
                "Gig is tomorrow"
            };
            let title = title.chars().take(160).collect::<String>();
            put(
                db,
                wid,
                Signal {
                    id: format!("record:{entity}:{id}"),
                    kind: "reminder",
                    title: title.clone(),
                    body: format!("{label} · {date}. Review the record or ask GiGi to help."),
                    entity: Some(entity.into()),
                    record_id: Some(id),
                    session_id: None,
                    source: json!({"date":date,"fields":fields,"title":title}),
                },
                now,
            )?;
        }
    }
    Ok(())
}
fn session_updates(db: &Connection, wid: &str, input: &Value, now: i64) -> Result<(), String> {
    let Some(value) = input.get("sessions") else {
        return Ok(());
    };
    let sessions = value
        .as_array()
        .filter(|s| s.len() <= 100)
        .ok_or("Invalid attention sessions")?;
    for session in sessions {
        let sid = text(session, "sessionId")?;
        let state = text(session, "state")?;
        if !["idle", "running", "approval", "interrupted", "failed"].contains(&state) {
            return Err("Invalid attention session state".into());
        }
        let prior:Option<(String,Option<String>,Option<String>)>=db.query_row("SELECT state,response_id,receipt_id FROM attention_observations WHERE workspace_id=?1 AND session_id=?2",params![wid,sid],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?))).optional().map_err(fail)?;
        let response_id=if session.get("responseId").is_some(){Some(text(session,"responseId")?)}else{None};
        let receipt_id=session.get("decisionReceipt").and_then(|r|r["approvalId"].as_str());
        // Only exact read-backed identifiers and outcome words become notices; model prose is never a notification payload.
        if state != "approval" {
            db.execute("UPDATE attention_items SET active=0 WHERE workspace_id=?1 AND session_id=?2 AND kind='approval'",params![wid,sid]).map_err(fail)?;
        }
        let mut linked: Option<(String, String)> = None;
        if let Some(links) = session.get("recordLinks") {
            let links = links
                .as_array()
                .filter(|a| a.len() <= 100)
                .ok_or("Invalid record links")?;
            for link in links {
                let entity = text(link, "entity")?;
                let rid = text(link, "id")?;
                if ![
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
                ]
                .contains(&entity)
                {
                    return Err("Invalid record link entity".into());
                }
                let exists:bool=db.query_row("SELECT EXISTS(SELECT 1 FROM record_index WHERE workspace_id=?1 AND entity=?2 AND id=?3)",params![wid,entity,rid],|r|r.get(0)).map_err(fail)?;
                if exists && linked.is_none() {
                    linked = Some((entity.into(), rid.into()));
                }
            }
        }
        let (entity, record_id) = linked
            .map(|(e, r)| (Some(e), Some(r)))
            .unwrap_or((None, None));
        if state == "approval" {
            let approvals = session["approvals"]
                .as_array()
                .filter(|a| !a.is_empty() && a.len() <= 100)
                .ok_or("Approval notices need current approvals")?;
            let mut ids = approvals
                .iter()
                .map(|a| text(a, "id").map(str::to_owned))
                .collect::<Result<Vec<_>, _>>()?;
            ids.sort();
            put(
                db,
                wid,
                Signal {
                    id: format!("session:{sid}:approval"),
                    kind: "approval",
                    title: "GiGi needs your review".into(),
                    body: "Review the proposed changes before GiGi can continue.".into(),
                    entity: entity.clone(),
                    record_id: record_id.clone(),
                    session_id: Some(sid.into()),
                    source: json!({"approvals":ids}),
                },
                now,
            )?;
        }
        let fresh_verified=session["decisionReceipt"]["outcome"]=="verified" && receipt_id!=prior.as_ref().and_then(|p|p.2.as_deref());
        if state=="idle" && !fresh_verified && response_id.is_some() && prior.as_ref().is_some_and(|p|p.1.as_deref()!=response_id) {
            put(db,wid,Signal{id:format!("session:{sid}:response"),kind:"completion",title:"Your answer is ready".into(),body:"GiGi finished responding. Open the conversation to review the answer and its sources.".into(),entity:entity.clone(),record_id:record_id.clone(),session_id:Some(sid.into()),source:json!({"responseId":response_id})},now)?;
        }
        db.execute("INSERT INTO attention_observations(workspace_id,session_id,state,response_id,receipt_id) VALUES(?1,?2,?3,?4,?5) ON CONFLICT(workspace_id,session_id) DO UPDATE SET state=excluded.state,response_id=coalesce(excluded.response_id,attention_observations.response_id),receipt_id=coalesce(excluded.receipt_id,attention_observations.receipt_id)",params![wid,sid,state,response_id,receipt_id]).map_err(fail)?;
        if let Some(receipt) = session.get("decisionReceipt") {
            let outcome = text(receipt, "outcome")?;
            if ![
                "verified",
                "rejected",
                "failed",
                "unknown",
                "cancelled",
                "existing",
            ]
            .contains(&outcome)
            {
                return Err("Invalid decision receipt".into());
            }
            let aid = text(receipt, "approvalId")?;
            if outcome == "verified" {
                put(
                    db,
                    wid,
                    Signal {
                        id: format!("session:{sid}:receipt:{aid}"),
                        kind: "completion",
                        title: "Result checked".into(),
                        body: "GiGi checked the outcome of your approved request. Open the conversation for the exact result.".into(),
                        entity: entity.clone(),
                        record_id: record_id.clone(),
                        session_id: Some(sid.into()),
                        source: json!({"approvalId":aid,"outcome":"verified"}),
                    },
                    now,
                )?;
            }
            let recovery_id = format!("session:{sid}:recovery");
            if outcome == "unknown" {
                put(db,wid,Signal{id:recovery_id,kind:"recovery",title:"A change needs checking".into(),body:"GiGi cannot confirm this action. Check the conversation before requesting another change.".into(),entity:entity.clone(),record_id:record_id.clone(),session_id:Some(sid.into()),source:json!({"approvalId":aid,"outcome":"unknown"})},now)?;
            } else {
                db.execute(
                    "UPDATE attention_items SET active=0 WHERE workspace_id=?1 AND id=?2",
                    params![wid, recovery_id],
                )
                .map_err(fail)?;
            }
        }
    }
    Ok(())
}
fn row_item(row: &rusqlite::Row<'_>) -> rusqlite::Result<Value> {
    Ok(
        json!({"id":row.get::<_,String>(0)?,"kind":row.get::<_,String>(1)?,"title":row.get::<_,String>(2)?,"body":row.get::<_,String>(3)?,"entity":row.get::<_,Option<String>>(4)?,"recordId":row.get::<_,Option<String>>(5)?,"sessionId":row.get::<_,Option<String>>(6)?,"revision":row.get::<_,String>(7)?,"createdAt":row.get::<_,i64>(8)?,"unread":row.get::<_,bool>(9)?,"snoozedUntil":row.get::<_,Option<i64>>(10)?}),
    )
}
const COLUMNS: &str =
    "id,kind,title,body,entity,record_id,session_id,revision,created_at,unread,snoozed_until";
fn snapshot(db: &Connection, wid: &str, now: i64) -> Result<Value, String> {
    let mut statement=db.prepare(&format!("SELECT {COLUMNS} FROM attention_items WHERE workspace_id=?1 AND active=1 AND dismissed=0 AND (snoozed_until IS NULL OR snoozed_until<=?2) ORDER BY CASE kind WHEN 'recovery' THEN 0 WHEN 'approval' THEN 1 WHEN 'completion' THEN 2 ELSE 3 END,created_at DESC,id LIMIT 100")).map_err(fail)?;
    let items = statement
        .query_map(params![wid, now], row_item)
        .map_err(fail)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(fail)?;
    let count:i64=db.query_row("SELECT count(*) FROM attention_items WHERE workspace_id=?1 AND active=1 AND dismissed=0 AND unread=1 AND (snoozed_until IS NULL OR snoozed_until<=?2)",params![wid,now],|r|r.get(0)).map_err(fail)?;
    Ok(json!({"items":items,"unreadCount":count,"settings":settings(db,wid)?}))
}
fn quiet(settings: &Value, hour: i64) -> bool {
    let start = settings["quietStart"].as_i64().unwrap_or(22);
    let end = settings["quietEnd"].as_i64().unwrap_or(8);
    if start == end {
        false
    } else if start < end {
        hour >= start && hour < end
    } else {
        hour >= start || hour < end
    }
}

pub fn dispatch(root: &Path, op: &str, input: Value) -> Result<Value, String> {
    if !input.is_object() {
        return Err("input must be an object".into());
    }
    let wid = text(&input, "workspaceId")?;
    let mut connection = crate::domain::open(root)?;
    workspace(&connection, wid)?;
    ensure(&connection)?;
    let db = connection
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(fail)?;
    let result = if op == "attention.settings" {
        let mut current = settings(&db, wid)?;
        if let Some(patch) = input.get("patch") {
            let patch = patch
                .as_object()
                .ok_or("Invalid attention settings patch")?;
            if patch.len() > 5 {
                return Err("Invalid attention settings".into());
            }
            for (key, value) in patch {
                match key.as_str() {
                    "enabled" | "detailedPreviews" | "reminders" => {
                        if !value.is_boolean() {
                            return Err(format!("{key} must be boolean"));
                        }
                    }
                    "quietStart" | "quietEnd" => {
                        if !value.as_i64().is_some_and(|v| (0..24).contains(&v)) {
                            return Err(format!("{key} must be an hour"));
                        }
                    }
                    _ => return Err(format!("Unknown attention setting {key}")),
                };
                current[key] = value.clone();
            }
            let now = input["now"].as_i64().filter(|n| *n > 0).unwrap_or_else(|| {
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis() as i64
            });
            let was_enabled = settings(&db, wid)?["enabled"].as_bool().unwrap_or(false);
            db.execute("INSERT INTO attention_settings(workspace_id,settings_json,enabled_since) VALUES(?1,?2,?3) ON CONFLICT(workspace_id) DO UPDATE SET settings_json=excluded.settings_json,enabled_since=CASE WHEN ?4 THEN excluded.enabled_since ELSE attention_settings.enabled_since END",params![wid,current.to_string(),now,!was_enabled&&current["enabled"]==true]).map_err(fail)?;
            if !was_enabled && current["enabled"] == true {
                db.execute("UPDATE attention_items SET delivery_state='suppressed' WHERE workspace_id=?1 AND delivery_state IS NULL",[wid]).map_err(fail)?;
            }
        }
        json!({"settings":current})
    } else if op == "attention.recordDelivery" {
        let id = text(&input, "id")?;
        let revision = text(&input, "revision")?;
        let token = text(&input, "deliveryToken")?;
        let outcome = text(&input, "outcome")?;
        if !["submitted", "failed"].contains(&outcome) {
            return Err("Invalid delivery outcome".into());
        }
        let affected=db.execute("UPDATE attention_items SET delivery_state=?5 WHERE workspace_id=?1 AND id=?2 AND revision=?3 AND delivery_token=?4 AND delivery_state IN ('claimed',?5)",params![wid,id,revision,token,outcome]).map_err(fail)?;
        if affected != 1 {
            return Err("Delivery claim no longer matches".into());
        }
        json!({"recorded":true})
    } else {
        let (today, now, hour) = clock(&input)?;
        refresh_records(&db, wid, &today, now)?;
        match op {
            "attention.refresh" => {
                session_updates(&db, wid, &input, now)?;
                snapshot(&db, wid, now)?
            }
            "attention.list" => snapshot(&db, wid, now)?,
            "attention.update" => {
                let id = text(&input, "id")?;
                let revision = text(&input, "expectedRevision")?;
                let action = text(&input, "action")?;
                let found:Option<String>=db.query_row("SELECT revision FROM attention_items WHERE workspace_id=?1 AND id=?2 AND active=1 AND dismissed=0",params![wid,id],|r|r.get(0)).optional().map_err(fail)?;
                if found.as_deref() != Some(revision) {
                    return Err(
                        "Attention item changed or is no longer relevant. Refresh the feed.".into(),
                    );
                }
                match action {
                    "read" => {
                        db.execute(
                            "UPDATE attention_items SET unread=0 WHERE workspace_id=?1 AND id=?2",
                            params![wid, id],
                        )
                        .map_err(fail)?;
                    }
                    "dismiss" => {
                        db.execute("UPDATE attention_items SET dismissed=1,unread=0 WHERE workspace_id=?1 AND id=?2",params![wid,id]).map_err(fail)?;
                    }
                    "snooze" => {
                        let until = input["snoozedUntil"]
                            .as_i64()
                            .filter(|n| *n > now && *n <= now + 31 * 86400000)
                            .ok_or("Snooze must end within 31 days")?;
                        db.execute("UPDATE attention_items SET snoozed_until=?3 WHERE workspace_id=?1 AND id=?2",params![wid,id,until]).map_err(fail)?;
                    }
                    _ => return Err("Unknown attention action".into()),
                };
                snapshot(&db, wid, now)?
            }
            "attention.claimDelivery" => {
                let config = settings(&db, wid)?;
                let since: i64 = db
                    .query_row(
                        "SELECT enabled_since FROM attention_settings WHERE workspace_id=?1",
                        [wid],
                        |r| r.get(0),
                    )
                    .optional()
                    .map_err(fail)?
                    .unwrap_or(0);
                let last: i64 = db
                    .query_row(
                        "SELECT last_claim FROM attention_settings WHERE workspace_id=?1",
                        [wid],
                        |r| r.get(0),
                    )
                    .optional()
                    .map_err(fail)?
                    .unwrap_or(0);
                if config["enabled"] != true || quiet(&config, hour) || now - last < 30000 {
                    json!({"item":null,"settings":config})
                } else {
                    let reminders = config["reminders"] == true;
                    let found:Option<Value>=db.query_row(&format!("SELECT {COLUMNS} FROM attention_items WHERE workspace_id=?1 AND active=1 AND dismissed=0 AND unread=1 AND delivery_state IS NULL AND created_at>=?2 AND (snoozed_until IS NULL OR snoozed_until<=?3) AND (kind!='reminder' OR ?4) ORDER BY CASE kind WHEN 'recovery' THEN 0 WHEN 'approval' THEN 1 WHEN 'completion' THEN 2 ELSE 3 END,created_at DESC,id LIMIT 1"),params![wid,since,now,reminders],row_item).optional().map_err(fail)?;
                    if let Some(mut item) = found {
                        let token = uuid::Uuid::new_v4().to_string();
                        db.execute("UPDATE attention_items SET delivery_state='claimed',delivery_token=?3 WHERE workspace_id=?1 AND id=?2 AND delivery_state IS NULL",params![wid,item["id"].as_str(),token]).map_err(fail)?;
                        // Coalesce the backlog into this one invitation; every item remains in the feed.
                        db.execute("UPDATE attention_items SET delivery_state='suppressed' WHERE workspace_id=?1 AND active=1 AND dismissed=0 AND unread=1 AND delivery_state IS NULL AND created_at<=?2 AND (snoozed_until IS NULL OR snoozed_until<=?2) AND (kind!='reminder' OR ?3)",params![wid,now,reminders]).map_err(fail)?;
                        db.execute(
                            "UPDATE attention_settings SET last_claim=?2 WHERE workspace_id=?1",
                            params![wid, now],
                        )
                        .map_err(fail)?;
                        item["deliveryToken"] = json!(token);
                        json!({"item":item,"settings":config})
                    } else {
                        json!({"item":null,"settings":config})
                    }
                }
            }
            _ => return Err("Unknown attention operation".into()),
        }
    };
    db.commit().map_err(fail)?;
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    fn profile() -> (std::path::PathBuf, String) {
        let root = std::env::temp_dir().join(format!("gigi-attention-{}", uuid::Uuid::new_v4()));
        let workspace =
            crate::domain::dispatch(&root, "workspace.create", json!({"name":"Attention tests"}))
                .unwrap();
        (root, workspace["id"].as_str().unwrap().into())
    }
    fn clock(wid: &str) -> Value {
        json!({"workspaceId":wid,"today":"2026-10-30","now":1793390400000_i64,"localHour":12})
    }
    fn task(root: &Path, wid: &str, title: &str) -> Value {
        crate::domain::dispatch(root,"records.save",json!({"workspaceId":wid,"entity":"tasks","title":title,"fields":{"Due Date":"2026-10-30","Status":"Todo"},"idempotencyKey":uuid::Uuid::new_v4().to_string()})).unwrap()
    }
    #[test]
    fn due_task_is_durable_deduplicated_and_workspace_scoped() {
        let (root, wid) = profile();
        task(&root, &wid, "Confirm rehearsal");
        let first = dispatch(&root, "attention.refresh", clock(&wid)).unwrap();
        assert_eq!(first["items"].as_array().unwrap().len(), 1);
        assert_eq!(first["items"][0]["kind"], "reminder");
        let again = dispatch(&root, "attention.refresh", clock(&wid)).unwrap();
        assert_eq!(first["items"], again["items"]);
        let mut wrong = clock("other");
        wrong["id"] = first["items"][0]["id"].clone();
        assert!(dispatch(&root, "attention.list", wrong).is_err());
        std::fs::remove_dir_all(root).unwrap();
    }
    fn request(base: &Value, extra: Value) -> Value {
        let mut value = base.clone();
        for (key, item) in extra.as_object().unwrap() {
            value[key] = item.clone();
        }
        value
    }
    fn first(root: &Path, base: &Value) -> Value {
        dispatch(root, "attention.refresh", base.clone()).unwrap()["items"][0].clone()
    }
    #[test]
    fn dismiss_snooze_read_and_restart_preserve_operator_state() {
        let (root, wid) = profile();
        task(&root, &wid, "Call venue");
        let base = clock(&wid);
        let item = first(&root, &base);
        let action = |action: &str| {
            request(
                &base,
                json!({"id":item["id"],"expectedRevision":item["revision"],"action":action}),
            )
        };
        assert_eq!(
            dispatch(&root, "attention.update", action("read")).unwrap()["unreadCount"],
            0
        );
        let mut snooze = action("snooze");
        snooze["snoozedUntil"] = json!(base["now"].as_i64().unwrap() + 60000);
        assert!(
            dispatch(&root, "attention.update", snooze).unwrap()["items"]
                .as_array()
                .unwrap()
                .is_empty()
        );
        let later = request(&base, json!({"now":base["now"].as_i64().unwrap()+60001}));
        assert_eq!(
            dispatch(&root, "attention.list", later).unwrap()["items"]
                .as_array()
                .unwrap()
                .len(),
            1
        );
        dispatch(&root, "attention.update", action("dismiss")).unwrap();
        assert!(dispatch(&root, "attention.refresh", base).unwrap()["items"]
            .as_array()
            .unwrap()
            .is_empty());
        std::fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn completed_changed_and_deleted_records_do_not_leave_stale_actions() {
        let (root, wid) = profile();
        let saved = task(&root, &wid, "Call venue");
        let base = clock(&wid);
        let item = first(&root, &base);
        crate::domain::dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":"tasks","id":saved["id"],"title":"Corrected venue call","fields":{"Status":"Todo"}})).unwrap();
        let changed = first(&root, &base);
        assert_ne!(item["revision"], changed["revision"]);
        assert!(dispatch(
            &root,
            "attention.update",
            request(
                &base,
                json!({"id":item["id"],"expectedRevision":item["revision"],"action":"read"})
            )
        )
        .is_err());
        crate::domain::dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":"tasks","id":saved["id"],"title":"Corrected venue call","fields":{"Status":"Done"}})).unwrap();
        assert!(
            dispatch(&root, "attention.list", base.clone()).unwrap()["items"]
                .as_array()
                .unwrap()
                .is_empty()
        );
        let saved = task(&root, &wid, "A different task");
        let other = first(&root, &base);
        let db = crate::domain::open(&root).unwrap();
        db.execute(
            "DELETE FROM tasks WHERE id=?1",
            [saved["id"].as_str().unwrap()],
        )
        .unwrap();
        drop(db);
        assert!(dispatch(
            &root,
            "attention.update",
            request(
                &base,
                json!({"id":other["id"],"expectedRevision":other["revision"],"action":"read"})
            )
        )
        .is_err());
        assert!(dispatch(&root, "attention.list", base).unwrap()["items"]
            .as_array()
            .unwrap()
            .is_empty());
        std::fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn malformed_dates_undated_records_and_future_tasks_do_not_invent_urgency() {
        let (root, wid) = profile();
        for date in ["2026-02-30", "not-a-date", "2026-11-03", ""] {
            crate::domain::dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":"tasks","title":"Do not infer","fields":{"Due Date":date}})).unwrap();
        }
        assert!(
            dispatch(&root, "attention.refresh", clock(&wid)).unwrap()["items"]
                .as_array()
                .unwrap()
                .is_empty()
        );
        crate::domain::dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":"gigs","title":"Tomorrow's set","fields":{"Date":"2026-10-31"}})).unwrap();
        let item = first(&root, &clock(&wid));
        assert_eq!(item["entity"], "gigs");
        assert!(item["body"].as_str().unwrap().contains("tomorrow"));
        std::fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn notification_claim_is_opt_in_quiet_deduplicated_and_token_bound() {
        let (root, wid) = profile();
        let base = clock(&wid);
        task(&root, &wid, "Existing task");
        first(&root, &base);
        assert!(
            dispatch(&root, "attention.claimDelivery", base.clone()).unwrap()["item"].is_null()
        );
        dispatch(
            &root,
            "attention.settings",
            request(&base, json!({"patch":{"enabled":true,"reminders":true}})),
        )
        .unwrap();
        assert!(
            dispatch(&root, "attention.claimDelivery", base.clone()).unwrap()["item"].is_null(),
            "enabling must not burst old alerts"
        );
        task(&root, &wid, "New task");
        let quiet = request(
            &base,
            json!({"localHour":23,"now":base["now"].as_i64().unwrap()+1000}),
        );
        assert!(dispatch(&root, "attention.claimDelivery", quiet).unwrap()["item"].is_null());
        let claim = dispatch(
            &root,
            "attention.claimDelivery",
            request(&base, json!({"now":base["now"].as_i64().unwrap()+2000})),
        )
        .unwrap()["item"]
            .clone();
        assert!(!claim.is_null());
        let recorded = request(
            &base,
            json!({"id":claim["id"],"revision":claim["revision"],"deliveryToken":claim["deliveryToken"],"outcome":"submitted"}),
        );
        assert!(dispatch(
            &root,
            "attention.recordDelivery",
            request(&recorded, json!({"deliveryToken":"wrong"}))
        )
        .is_err());
        assert_eq!(
            dispatch(&root, "attention.recordDelivery", recorded).unwrap()["recorded"],
            true
        );
        let restarted = request(&base, json!({"now":base["now"].as_i64().unwrap()+60000}));
        assert!(dispatch(&root, "attention.claimDelivery", restarted).unwrap()["item"].is_null());
        std::fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn claimed_but_uncertain_delivery_is_never_replayed() {
        let (root, wid) = profile();
        let base = clock(&wid);
        dispatch(
            &root,
            "attention.settings",
            request(&base, json!({"patch":{"enabled":true,"reminders":true}})),
        )
        .unwrap();
        task(&root, &wid, "First new task");
        task(&root, &wid, "Second new task");
        let claim = dispatch(&root, "attention.claimDelivery", base.clone()).unwrap();
        assert!(!claim["item"].is_null());
        assert_eq!(
            dispatch(&root, "attention.list", base.clone()).unwrap()["items"]
                .as_array()
                .unwrap()
                .len(),
            2
        );
        let restarted = request(&base, json!({"now":base["now"].as_i64().unwrap()+120000}));
        assert!(dispatch(&root, "attention.claimDelivery", restarted).unwrap()["item"].is_null());
        std::fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn only_verified_receipts_claim_saved_changes_and_session_state_clears_approval() {
        let (root, wid) = profile();
        let base = clock(&wid);
        let approval =
            json!({"sessionId":"session-a","state":"approval","approvals":[{"id":"approval-a"}]});
        let view = dispatch(
            &root,
            "attention.refresh",
            request(&base, json!({"sessions":[approval]})),
        )
        .unwrap();
        assert_eq!(view["items"][0]["kind"], "approval");
        let failed = json!({"sessionId":"session-a","state":"failed","decisionReceipt":{"approvalId":"approval-a","outcome":"unknown"}});
        let view = dispatch(
            &root,
            "attention.refresh",
            request(&base, json!({"sessions":[failed]})),
        )
        .unwrap();
        assert_eq!(view["items"].as_array().unwrap().len(), 1);
        assert_eq!(view["items"][0]["kind"], "recovery");
        let verified = json!({"sessionId":"session-a","state":"idle","decisionReceipt":{"approvalId":"approval-a","outcome":"verified"}});
        let view = dispatch(
            &root,
            "attention.refresh",
            request(&base, json!({"sessions":[verified]})),
        )
        .unwrap();
        assert_eq!(view["items"].as_array().unwrap().len(), 1);
        assert_eq!(view["items"][0]["kind"], "completion");
        let view = dispatch(
            &root,
            "attention.refresh",
            request(
                &base,
                json!({"sessions":[{"sessionId":"session-a","state":"idle"}]}),
            ),
        )
        .unwrap();
        assert_eq!(
            view["items"][0]["kind"], "completion",
            "idle listing placeholders must not discard saved receipts"
        );
        std::fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn settings_reject_authority_and_invalid_values_atomically() {
        let (root, wid) = profile();
        let base = clock(&wid);
        for patch in [
            json!({"enabled":true,"autoApprove":true}),
            json!({"quietStart":24}),
            json!({"reminders":"true"}),
        ] {
            assert!(dispatch(
                &root,
                "attention.settings",
                request(&base, json!({"patch":patch}))
            )
            .is_err());
        }
        assert_eq!(
            dispatch(&root, "attention.settings", json!({"workspaceId":wid})).unwrap()["settings"],
            defaults()
        );
        assert!(dispatch(
            &root,
            "attention.refresh",
            request(&base, json!({"today":"2026-02-30"}))
        )
        .is_err());
        std::fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn read_only_reply_survives_hidden_drawer_and_restart_without_replaying_history() {
        let (root,wid)=profile();let base=clock(&wid);
        let update=|state:&str,response:Option<&str>| {let mut session=json!({"sessionId":"synthetic-conversation","state":state});if let Some(id)=response{session["responseId"]=json!(id);}request(&base,json!({"sessions":[session]}))};
        assert_eq!(dispatch(&root,"attention.refresh",update("idle",Some("old-answer"))).unwrap()["items"].as_array().unwrap().len(),0);
        dispatch(&root,"attention.refresh",update("running",None)).unwrap();
        let ready=dispatch(&root,"attention.refresh",update("idle",Some("new-answer"))).unwrap();
        assert_eq!(ready["items"][0]["title"],"Your answer is ready");
        assert_eq!(ready["items"][0]["sessionId"],"synthetic-conversation");
        assert_eq!(dispatch(&root,"attention.refresh",update("idle",Some("new-answer"))).unwrap()["items"].as_array().unwrap().len(),1);
        std::fs::remove_dir_all(root).unwrap();
    }

}
