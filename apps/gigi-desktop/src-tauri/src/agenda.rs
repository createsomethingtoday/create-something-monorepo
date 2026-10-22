//! Complete-collection Today agenda. Source identity and typed relations are
//! required together before a derived gig can stand in for a Calendar entry.
use crate::gig_list::{day, timing, Timing};
use rusqlite::{params, Connection};
use serde_json::{json, Value};
use std::collections::{HashMap, HashSet};
fn origin(source: &Value) -> &Value {
    if source["kind"] == "manual" {
        &source["origin"]
    } else {
        source
    }
}
fn same_source(gig: &Value, event: &Value) -> bool {
    let a = origin(gig);
    let b = origin(event);
    a["kind"] == "derived"
        && b["kind"] == "import"
        && a["provider"] == "googlecalendar"
        && [
            "provider",
            "connectedAccountId",
            "collectionId",
            "externalId",
        ]
        .iter()
        .all(|k| a[*k].as_str().is_some_and(|s| !s.is_empty()) && a[*k] == b[*k])
}
pub(crate) fn verified_source(
    db: &Connection,
    wid: &str,
    gig_id: &str,
) -> Result<Option<String>, String> {
    let mut stmt=db.prepare("SELECT s.id,g.source_json,s.source_json FROM relations r JOIN gigs g ON g.workspace_id=r.workspace_id AND g.id=r.from_id JOIN schedule s ON s.workspace_id=r.workspace_id AND s.id=r.to_id WHERE r.workspace_id=?1 AND r.from_entity='gigs' AND r.from_id=?2 AND r.role='Schedule' AND r.to_entity='schedule' ORDER BY s.id").map_err(|e|e.to_string())?;
    let rows = stmt
        .query_map(params![wid, gig_id], |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, String>(2)?,
            ))
        })
        .map_err(|e| e.to_string())?;
    let mut matches = Vec::new();
    for row in rows {
        let (id, g, e) = row.map_err(|e| e.to_string())?;
        if same_source(
            &serde_json::from_str::<Value>(&g).map_err(|e| e.to_string())?,
            &serde_json::from_str::<Value>(&e).map_err(|e| e.to_string())?,
        ) {
            matches.push(id)
        }
    }
    Ok(if matches.len() == 1 {
        matches.pop()
    } else {
        None
    })
}
pub(crate) fn overview(
    db: &Connection,
    wid: &str,
    today: &str,
    time_zone: &str,
) -> Result<Value, String> {
    let today = day(today).ok_or("Today needs a valid local date")?;
    let zone: chrono_tz::Tz = time_zone
        .parse()
        .map_err(|_| "Today timezone is not recognized")?;
    let snapshot = db.unchecked_transaction().map_err(|e| e.to_string())?;
    let mut items: Vec<(Value, Timing)> = Vec::new();
    let mut undated = 0;
    let mut sources = HashMap::new();
    for entity in ["gigs", "schedule"] {
        let mut stmt=snapshot.prepare(&format!("SELECT id,title,status,fields_json,source_json FROM {entity} WHERE workspace_id=?1 ORDER BY id")).map_err(|e|e.to_string())?;
        let rows = stmt
            .query_map([wid], |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, String>(1)?,
                    r.get::<_, Option<String>>(2)?,
                    r.get::<_, String>(3)?,
                    r.get::<_, String>(4)?,
                ))
            })
            .map_err(|e| e.to_string())?;
        for row in rows {
            let (id, title, status, fields, source) = row.map_err(|e| e.to_string())?;
            if status.as_deref().is_some_and(|s| {
                ["done", "complete", "completed", "cancelled", "canceled"]
                    .contains(&s.trim().to_lowercase().as_str())
            }) {
                continue;
            }
            let fields: Value = serde_json::from_str(&fields).map_err(|e| e.to_string())?;
            let source: Value = serde_json::from_str(&source).map_err(|e| e.to_string())?;
            let verified = if entity == "gigs" {
                verified_source(&snapshot, wid, &id)?
            } else {
                None
            };
            let source_all_day = if let Some(source) = &verified {
                let raw: String = snapshot
                    .query_row(
                        "SELECT fields_json FROM schedule WHERE workspace_id=?1 AND id=?2",
                        params![wid, source],
                        |r| r.get(0),
                    )
                    .map_err(|e| e.to_string())?;
                serde_json::from_str::<Value>(&raw).map_err(|e| e.to_string())?["All Day"] == true
            } else {
                false
            };
            if let Some(source) = verified {
                sources.insert(id.clone(), source);
            }
            let all_day = source_all_day
                || fields["All Day"] == true
                || origin(&source)["calendarTiming"]["start"]["date"].is_string()
                || (entity == "schedule"
                    && fields["Date"]
                        .as_str()
                        .is_some_and(|s| s.split('/').next().is_some_and(|s| day(s).is_some())));
            let Some(mut time) = fields["Date"]
                .as_str()
                .and_then(|s| timing(s, all_day, zone))
            else {
                undated += 1;
                continue;
            };
            // Calendar end instants are exclusive, including midnight in the viewer zone.
            if !all_day {
                if let Some(end) = fields["Date"]
                    .as_str()
                    .and_then(|s| s.split_once('/'))
                    .and_then(|(_, s)| chrono::DateTime::parse_from_rfc3339(s).ok())
                {
                    time.end = (end - chrono::Duration::milliseconds(1))
                        .with_timezone(&zone)
                        .date_naive();
                }
            }
            if time.end < today {
                continue;
            }
            items.push((json!({"workspaceId":wid,"entity":entity,"id":id,"title":title.chars().take(120).collect::<String>(),"status":status,"date":time.start.to_string(),"endDate":time.end.to_string(),"allDay":all_day,"fields":{"Date":fields["Date"],"All Day":all_day,"Call Time":fields["Call Time"].as_str().map(|s|s.chars().take(160).collect::<String>()),"Set Time":fields["Set Time"].as_str().map(|s|s.chars().take(160).collect::<String>())},"coverRevision":crate::artwork::revision(&snapshot,wid,entity,&id)?,"cover":crate::artwork::cover(&snapshot,wid,entity,&id)?}),time));
        }
    }
    let event_ids: HashSet<String> = items
        .iter()
        .filter(|(r, _)| r["entity"] == "schedule")
        .filter_map(|(r, _)| r["id"].as_str().map(String::from))
        .collect();
    let mut represented = HashSet::new();
    let mut inherited = HashMap::new();
    for (record, _) in &items {
        if record["entity"] == "gigs" {
            if let Some(source) = sources.get(record["id"].as_str().unwrap()) {
                if event_ids.contains(source) {
                    represented.insert(source.clone());
                    if record["cover"].is_null() && record["coverRevision"] == 0 {
                        inherited.insert(
                            record["id"].as_str().unwrap().to_string(),
                            crate::artwork::cover(&snapshot, wid, "schedule", source)?,
                        );
                    }
                }
            }
        }
    }
    items.retain(|(r, _)| {
        r["entity"] != "schedule" || !represented.contains(r["id"].as_str().unwrap())
    });
    items.sort_by(|(a, at), (b, bt)| {
        at.start
            .cmp(&bt.start)
            .then(at.order.cmp(&bt.order))
            .then(a["entity"].as_str().cmp(&b["entity"].as_str()))
            .then(a["id"].as_str().cmp(&b["id"].as_str()))
    });
    let count = items.len();
    let records = items
        .into_iter()
        .take(5)
        .map(|(mut r, _)| {
            if let Some(cover) = inherited.remove(r["id"].as_str().unwrap()) {
                r["cover"] = cover;
            }
            r
        })
        .collect::<Vec<_>>();
    Ok(json!({"items":records,"count":count,"undatedCount":undated,"timeZone":time_zone}))
}
