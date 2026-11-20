//! Read-only Tasks views. Filter and order the whole workspace before paging.
use chrono::{Duration, NaiveDate};
use rusqlite::Connection;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};

fn day(value: &Value, zone: chrono_tz::Tz) -> Option<NaiveDate> {
    let value = value.as_str()?;
    crate::gig_list::day(value).or_else(|| {
        crate::gig_list::instant(value).map(|date| date.with_timezone(&zone).date_naive())
    })
}
pub(crate) fn finished(status: &str) -> bool {
    ["done", "complete", "completed", "cancelled", "canceled", "archive", "archived"]
        .contains(&status.trim().to_lowercase().as_str())
}
fn digest(value: &Value) -> String {
    format!("{:x}", Sha256::digest(serde_json::to_vec(value).unwrap()))
}

pub(crate) fn list(db: &Connection, wid: &str, input: &Value) -> Result<Value, String> {
    let options = input["tasks"].as_object().ok_or("Invalid Tasks view")?;
    if options.keys().any(|key| !["view", "query", "today", "timeZone"].contains(&key.as_str())) {
        return Err("Unknown Tasks filter".into());
    }
    let text = |key: &str, default: &str| -> Result<String, String> {
        match options.get(key) {
            None => Ok(default.into()),
            Some(Value::String(value)) => Ok(value.clone()),
            _ => Err(format!("Invalid Tasks {key}")),
        }
    };
    let view = text("view", "soon")?;
    if !["soon", "all", "done"].contains(&view.as_str()) { return Err("Invalid Tasks view".into()); }
    let today = crate::gig_list::day(&text("today", "")?).ok_or("Tasks needs today's local date")?;
    let tomorrow = today.checked_add_signed(Duration::days(1)).ok_or("Tasks date is out of range")?;
    let zone: chrono_tz::Tz = text("timeZone", "UTC")?.parse().map_err(|_| "Tasks timezone is not recognized")?;
    let query = text("query", "")?;
    if query.chars().count() > 160 { return Err("Task search must be at most 160 characters".into()); }
    let query = crate::domain::search_fold(query.trim());
    let tokens: Vec<_> = query.split_whitespace().collect();
    let limit = input["limit"].as_u64().unwrap_or(20).clamp(1, 50) as usize;
    let scope = digest(&json!([wid, options, limit]));
    let snapshot = db.unchecked_transaction().map_err(|error| error.to_string())?;
    let mut statement = snapshot.prepare("SELECT id,title,status,fields_json,updated_at FROM tasks WHERE workspace_id=?1 ORDER BY id").map_err(|error| error.to_string())?;
    let raw = statement.query_map([wid], |row| Ok((row.get::<_,String>(0)?,row.get::<_,String>(1)?,row.get::<_,Option<String>>(2)?,row.get::<_,String>(3)?,row.get::<_,String>(4)?)))
        .map_err(|error| error.to_string())?.collect::<Result<Vec<_>,_>>().map_err(|error| error.to_string())?;
    let revision = digest(&json!(raw));
    let offset = if let Some(cursor) = input.get("cursor").filter(|value| !value.is_null()) {
        let cursor: Value = serde_json::from_str(cursor.as_str().filter(|value| value.len() <= 512).ok_or("Invalid Tasks cursor")?).map_err(|_| "Invalid Tasks cursor")?;
        if cursor["scope"] != scope || cursor["revision"] != revision { return Err("Tasks changed. Refresh the list to continue.".into()); }
        cursor["offset"].as_u64().filter(|value| *value <= 100_000).ok_or("Invalid Tasks cursor")? as usize
    } else { 0 };
    let total = raw.len();
    let mut counts = json!({"soon":0,"all":0,"done":0});
    let mut items = Vec::new();
    for (id,title,status,raw,updated) in raw {
        let fields: Value = serde_json::from_str(&raw).map_err(|_| "Task details could not be read")?;
        let searchable = crate::domain::search_fold(&title);
        if (!query.is_empty() && tokens.is_empty()) || !tokens.iter().all(|token| searchable.contains(token)) { continue; }
        let due = day(&fields["Due Date"], zone);
        let planned = day(&fields["Do Date"], zone);
        let date = due.or(planned);
        let done = finished(status.as_deref().unwrap_or(""));
        let soon = !done && date.is_some_and(|date| date <= tomorrow);
        for (key, include) in [("soon",soon),("all",!done),("done",done)] {
            if include { counts[key] = json!(counts[key].as_u64().unwrap() + 1); }
        }
        if !match view.as_str() { "soon" => soon, "all" => !done, _ => done } { continue; }
        let item = json!({"id":id,"workspaceId":wid,"entity":"tasks","title":title.chars().take(120).collect::<String>(),"titleTruncated":title.chars().count()>120,"status":status.map(|value|value.chars().take(160).collect::<String>()),"date":date.map(|date|date.to_string()),"dateSource":if due.is_some(){Some("due")}else if planned.is_some(){Some("planned")}else{None},"priority":fields["Priority"].as_str().map(|value|value.chars().take(80).collect::<String>()),"updatedAt":updated});
        items.push((date,id,item));
    }
    items.sort_by(|left,right| left.0.is_none().cmp(&right.0.is_none()).then(left.0.cmp(&right.0)).then(left.1.cmp(&right.1)));
    let count = items.len();
    let next = (offset + limit < count).then(|| json!({"scope":scope,"revision":revision,"offset":offset+limit}).to_string());
    let items: Vec<_> = items.into_iter().skip(offset).take(limit).map(|item|item.2).collect();
    Ok(json!({"items":items,"count":count,"total":total,"nextCursor":next,"viewCounts":counts,"today":today.to_string(),"tomorrow":tomorrow.to_string()}))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::dispatch;
    #[test]
    fn complete_workspace_date_filtering_scoped_paging_and_stale_rejection() {
        let root = std::env::temp_dir().join(format!("gigi-calm-tasks-{}",uuid::Uuid::new_v4()));
        let wid = dispatch(&root,"workspace.create",json!({"name":"Synthetic tasks"})).unwrap()["id"].clone();
        for (id,fields) in [
            ("late",json!({"Due Date":"2026-12-01"})),
            ("overdue",json!({"Due Date":"2026-11-01","Priority":"High"})),
            ("planned",json!({"Due Date":"invalid","Do Date":"2026-11-07"})),
            ("undated",json!({"Due Date":"2026-02-30"})),
            ("done",json!({"Due Date":"2026-11-01","Status":"Done"})),
            ("offset",json!({"Due Date":"2026-11-08T01:00:00Z"})),
        ] { dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":"tasks","id":id,"title":id,"fields":fields})).unwrap(); }
        let mut request=json!({"workspaceId":wid,"entity":"tasks","limit":1,"tasks":{"view":"soon","today":"2026-11-06","timeZone":"America/New_York"}});
        let first=dispatch(&root,"records.list",request.clone()).unwrap();
        assert_eq!(first["items"][0]["id"],"overdue");assert_eq!(first["count"],3);assert_eq!(first["viewCounts"],json!({"soon":3,"all":5,"done":1}));
        request["cursor"]=first["nextCursor"].clone();
        let second=dispatch(&root,"records.list",request.clone()).unwrap();assert_eq!(second["items"][0]["date"],"2026-11-07");
        dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":"tasks","id":"overdue","title":"changed","fields":{"Due Date":"2026-11-01"}})).unwrap();
        assert!(dispatch(&root,"records.list",request.clone()).unwrap_err().contains("changed"));
        request["cursor"]=Value::Null;request["tasks"]["view"]=json!("all");request["limit"]=json!(50);
        let all=dispatch(&root,"records.list",request.clone()).unwrap();assert_eq!(all["items"].as_array().unwrap().last().unwrap()["id"],"undated");
        request["workspaceId"]=json!("other-workspace");
        assert!(dispatch(&root,"records.list",request).is_err());
        std::fs::remove_dir_all(root).unwrap();
    }
}
