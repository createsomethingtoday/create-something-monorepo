//! Read-only, workspace-owned search. Return bounded titles, never full records.
use rusqlite::{params, Connection};
use serde_json::{json, Value};
use crate::domain::{search_contacts, search_fold};

const GROUPS: [(&str, &str); 4] = [
    ("contacts", "People"), ("gigs", "Gigs"),
    ("finances", "Finances"), ("tasks", "Tasks"),
];

pub fn search(db: &Connection, wid: &str, input: &Value) -> Result<Value, String> {
    let query = input.get("query").and_then(Value::as_str).ok_or("Search query is required")?.trim();
    if query.chars().count() > 160 { return Err("Search query is too long".into()); }
    let limit = input.get("limit").and_then(Value::as_u64).unwrap_or(6);
    if !(1..=20).contains(&limit) { return Err("Invalid search limit".into()); }
    let entity = input.get("entity").map(|v| v.as_str().ok_or("Invalid search category")).transpose()?;
    if entity.is_some_and(|e| !GROUPS.iter().any(|(id, _)| *id == e)) { return Err("Invalid search category".into()); }
    let offset = match input.get("cursor") {
        None | Some(Value::Null) => 0,
        Some(Value::String(cursor)) => cursor.parse::<u64>().map_err(|_| "Invalid search cursor")?,
        _ => return Err("Invalid search cursor".into()),
    };
    if offset > 100_000 || offset > 0 && entity.is_none() { return Err("Invalid search cursor".into()); }
    let folded = search_fold(query);
    let tokens: Vec<&str> = folded.split_whitespace().collect();
    let mut groups = Vec::new();
    for (id, label) in GROUPS {
        if entity.is_some_and(|e| e != id) { continue; }
        let page = if tokens.is_empty() {
            json!({"items":[], "count":0, "nextCursor":null})
        } else if id == "contacts" {
            search_contacts(db, wid, query, offset as i64, limit as i64)?
        } else {
            // id comes only from GROUPS; wid remains a bound SQL parameter.
            let mut stmt = db.prepare(&format!(
                "SELECT id,title,status FROM {id} WHERE workspace_id=?1 ORDER BY updated_at DESC,id"
            )).map_err(|e| e.to_string())?;
            let rows = stmt.query_map(params![wid], |r| Ok((r.get::<_,String>(0)?,r.get::<_,String>(1)?,r.get::<_,Option<String>>(2)?))).map_err(|e|e.to_string())?;
            let mut items = Vec::new();
            let mut count = 0u64;
            for row in rows {
                let (record_id, title, status) = row.map_err(|e| e.to_string())?;
                let text = search_fold(&title);
                if !tokens.iter().all(|token| text.contains(token)) { continue; }
                if count >= offset && count < offset + limit {
                    items.push(json!({"id":record_id, "entity":id, "title":title.chars().take(120).collect::<String>(), "titleTruncated":title.chars().count()>120, "status":status}));
                }
                count += 1;
            }
            json!({"items":items,"count":count,"nextCursor":if offset+limit<count {Some((offset+limit).to_string())} else {None}})
        };
        groups.push(json!({"entity":id,"label":label,"items":page["items"],"count":page["count"],"nextCursor":page["nextCursor"]}));
    }
    Ok(json!({"groups":groups}))
}
