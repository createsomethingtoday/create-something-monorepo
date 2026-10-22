//! Read-only Gigs collection. Every criterion and count applies to one complete
//! workspace snapshot before paging. No business fields or dates are rewritten.
use chrono::{DateTime, NaiveDate, TimeZone};
use chrono_tz::Tz;
use rusqlite::Connection;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::collections::{BTreeSet, HashMap};

fn day(value: &str) -> Option<NaiveDate> {
    if value.len() != 10
        || value.as_bytes()[4] != b'-'
        || value.as_bytes()[7] != b'-'
        || !value
            .bytes()
            .enumerate()
            .all(|(i, b)| [4, 7].contains(&i) || b.is_ascii_digit())
        || value.starts_with("0000")
    {
        return None;
    }
    NaiveDate::parse_from_str(value, "%Y-%m-%d").ok()
}
fn point(value: &str, zone: Tz) -> Option<(NaiveDate, Option<i64>)> {
    if let Some(date) = day(value) {
        return Some((date, None));
    }
    // Same strict Date contract as Schedule: date-only or an offset-bearing ISO timestamp.
    if value.len() < 17
        || value.as_bytes().get(10) != Some(&b'T')
        || day(value.get(..10)?).is_none()
    {
        return None;
    }
    let clock = |part: Option<&str>, max: u8| {
        part.filter(|v| v.len() == 2 && v.bytes().all(|b| b.is_ascii_digit()))
            .and_then(|v| v.parse::<u8>().ok())
            .filter(|v| *v <= max)
    };
    clock(value.get(11..13), 23)?;
    if value.as_bytes().get(13) != Some(&b':') {
        return None;
    }
    clock(value.get(14..16), 59)?;
    let normalized;
    let value = if value.as_bytes().get(16) == Some(&b':') {
        clock(value.get(17..19), 59)?;
        value
    } else {
        normalized = format!("{}:00{}", value.get(..16)?, value.get(16..)?);
        &normalized
    };
    let value = DateTime::parse_from_rfc3339(value).ok()?;
    Some((
        value.with_timezone(&zone).date_naive(),
        Some(value.timestamp_millis()),
    ))
}
#[derive(Clone)]
struct Timing {
    start: NaiveDate,
    end: NaiveDate,
    order: i64,
}
fn timing(value: &str, all_day: bool, zone: Tz) -> Option<Timing> {
    let mut parts = value.split('/');
    let (start, instant) = point(parts.next()?, zone)?;
    let end = parts.next().map(|v| point(v, zone));
    if parts.next().is_some() {
        return None;
    }
    let mut last = start;
    if let Some(end) = end {
        let (end_date, end_instant) = end?;
        let comparable = |date: NaiveDate, instant: Option<i64>| {
            instant.or_else(|| {
                zone.from_local_datetime(&date.and_hms_opt(12, 0, 0)?)
                    .earliest()
                    .map(|v| v.timestamp_millis())
            })
        };
        if end_date < start || comparable(end_date, end_instant)? < comparable(start, instant)? {
            return None;
        }
        last = if (all_day || (instant.is_none() && end_instant.is_none())) && end_date > start {
            end_date.pred_opt()?
        } else {
            end_date
        };
    }
    Some(Timing {
        start,
        end: last,
        order: if all_day {
            i64::MIN
        } else {
            instant.unwrap_or(i64::MAX)
        },
    })
}
fn digest(value: &[u8]) -> String {
    format!("{:x}", Sha256::digest(value))
}
fn criterion(value: Option<&Value>, stored: &str) -> bool {
    match value {
        None => true,
        Some(Value::Null) => stored.trim().is_empty(),
        Some(Value::String(want)) => stored == want,
        _ => false,
    }
}

pub(crate) fn list(db: &Connection, wid: &str, input: &Value) -> Result<Value, String> {
    let options = input["gigs"].as_object().ok_or("Invalid Gigs criteria")?;
    if options.keys().any(|k| {
        ![
            "view", "sort", "query", "status", "type", "from", "to", "today", "timeZone",
        ]
        .contains(&k.as_str())
    }) {
        return Err("Unknown Gigs criterion".into());
    }
    let text = |key: &str, default: &str| -> Result<String, String> {
        match options.get(key) {
            None => Ok(default.into()),
            Some(Value::String(v)) => Ok(v.clone()),
            _ => Err(format!("Invalid Gigs {key}")),
        }
    };
    let view = text("view", "upcoming")?;
    let sort = text("sort", "date")?;
    if !["upcoming", "past", "all", "needs_date"].contains(&view.as_str())
        || !["date", "updated"].contains(&sort.as_str())
    {
        return Err("Invalid Gigs view or sort".into());
    }
    for key in ["status", "type"] {
        if options
            .get(key)
            .is_some_and(|v| !v.is_null() && !v.is_string())
        {
            return Err(format!("Invalid Gigs {key}"));
        }
    }
    let query = text("query", "")?;
    if query.chars().count() > 160 {
        return Err("Gigs search must be at most 160 characters".into());
    }
    let folded = super::domain::search_fold(query.trim());
    let tokens: Vec<_> = folded.split_whitespace().collect();
    let today = day(&text("today", "")?).ok_or("Gigs needs today's local date")?;
    let zone: Tz = text("timeZone", "UTC")?
        .parse()
        .map_err(|_| "Gigs timezone is not recognized")?;
    let bound = |key: &str| -> Result<Option<NaiveDate>, String> {
        let value = text(key, "")?;
        if value.is_empty() {
            Ok(None)
        } else {
            day(&value)
                .map(Some)
                .ok_or_else(|| format!("Invalid Gigs {key} date"))
        }
    };
    let from = bound("from")?;
    let to = bound("to")?;
    if from.is_some() && to.is_some() && from > to {
        return Err("Start date must be on or before end date".into());
    }
    let limit = input["limit"].as_u64().unwrap_or(20).clamp(1, 50) as usize;
    let scope = digest(
        serde_json::to_string(&json!([wid, options, limit]))
            .unwrap()
            .as_bytes(),
    );
    let snapshot = db.unchecked_transaction().map_err(|e| e.to_string())?;
    let mut statement=snapshot.prepare("SELECT id,title,status,occurred_at,fields_json,updated_at,money_cents FROM gigs WHERE workspace_id=?1 ORDER BY id").map_err(|e|e.to_string())?;
    let raw = statement
        .query_map([wid], |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, Option<String>>(2)?,
                r.get::<_, Option<String>>(3)?,
                r.get::<_, String>(4)?,
                r.get::<_, String>(5)?,
                r.get::<_, Option<i64>>(6)?,
            ))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    // One relation scan, scoped on both ends. Never multiply the result rows.
    let mut links: HashMap<String, Vec<String>> = HashMap::new();
    let mut related=snapshot.prepare("SELECT CASE WHEN from_entity='gigs' THEN from_id ELSE to_id END, CASE WHEN from_entity='gigs' THEN to_entity ELSE from_entity END, CASE WHEN from_entity='gigs' THEN to_id ELSE from_id END FROM relations WHERE workspace_id=?1 AND ((from_entity='gigs' AND to_entity IN ('contacts','locations')) OR (to_entity='gigs' AND from_entity IN ('contacts','locations')))").map_err(|e|e.to_string())?;
    let relations = related
        .query_map([wid], |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, String>(2)?,
            ))
        })
        .map_err(|e| e.to_string())?;
    let mut names = HashMap::new();
    for entity in ["contacts", "locations"] {
        let mut stmt = snapshot
            .prepare(&format!(
                "SELECT id,title FROM {entity} WHERE workspace_id=?1"
            ))
            .map_err(|e| e.to_string())?;
        for row in stmt
            .query_map([wid], |r| {
                Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?))
            })
            .map_err(|e| e.to_string())?
        {
            let (id, title) = row.map_err(|e| e.to_string())?;
            names.insert((entity.to_string(), id), title);
        }
    }
    for row in relations {
        let (id, entity, target) = row.map_err(|e| e.to_string())?;
        if let Some(name) = names.get(&(entity, target)) {
            links.entry(id).or_default().push(name.clone());
        }
    }
    for values in links.values_mut() {
        values.sort();
        values.dedup();
    }
    let mut revision = Sha256::new();
    revision.update(serde_json::to_vec(&raw).unwrap());
    // A stable serialization also notices changed linked names between pages.
    let stable_links: std::collections::BTreeMap<_, _> = links.iter().collect();
    revision.update(serde_json::to_vec(&stable_links).unwrap());
    let revision = format!("{:x}", revision.finalize());
    let offset = if let Some(cursor) = input.get("cursor").filter(|v| !v.is_null()) {
        let value = cursor
            .as_str()
            .filter(|s| s.len() <= 512)
            .ok_or("Invalid Gigs cursor")?;
        let cursor: Value = serde_json::from_str(value).map_err(|_| "Invalid Gigs cursor")?;
        if cursor["scope"] != scope || cursor["revision"] != revision {
            return Err("Gigs results changed. Refresh results to continue.".into());
        }
        cursor["offset"]
            .as_u64()
            .filter(|n| *n <= 100_000)
            .ok_or("Invalid Gigs cursor")? as usize
    } else {
        0
    };
    let total = raw.len();
    let mut status_options = BTreeSet::new();
    let mut type_options = BTreeSet::new();
    let mut counts = json!({"upcoming":0,"past":0,"all":0,"needs_date":0});
    let mut needs = 0usize;
    let mut matches = Vec::new();
    for (id, title, status, date, fields, updated, money) in raw {
        let fields: Value =
            serde_json::from_str(&fields).map_err(|_| "Gigs fields could not be read")?;
        let status = status.unwrap_or_default();
        let kind = fields["Type"].as_str().unwrap_or("");
        if !status.trim().is_empty() {
            status_options.insert(status.clone());
        }
        if !kind.trim().is_empty() {
            type_options.insert(kind.to_string());
        }
        if !criterion(options.get("status"), &status) || !criterion(options.get("type"), kind) {
            continue;
        }
        let searchable = super::domain::search_fold(&format!(
            "{} {}",
            title,
            links.get(&id).map(|v| v.join(" ")).unwrap_or_default()
        ));
        if (!query.trim().is_empty() && tokens.is_empty())
            || !tokens.iter().all(|token| searchable.contains(token))
        {
            continue;
        }
        let all_day = fields["All Day"].as_bool().unwrap_or(false);
        let when = date.as_deref().and_then(|v| timing(v, all_day, zone));
        if when.is_none() {
            needs += 1;
        }
        if from.is_some_and(|from| when.as_ref().is_none_or(|w| w.end < from))
            || to.is_some_and(|to| when.as_ref().is_none_or(|w| w.start > to))
        {
            continue;
        }
        let bucket = match &when {
            None => "needs_date",
            Some(w) if w.end < today => "past",
            _ => "upcoming",
        };
        counts["all"] = json!(counts["all"].as_u64().unwrap() + 1);
        counts[bucket] = json!(counts[bucket].as_u64().unwrap() + 1);
        if view != "all" && view != bucket {
            continue;
        }
        let item = json!({"id":id,"workspaceId":wid,"entity":"gigs","title":title.chars().take(120).collect::<String>(),"titleTruncated":title.chars().count()>120,"status":status,"type":kind,"date":date,"allDay":all_day,"callTime":fields["Call Time"],"setTime":fields["Set Time"],"updatedAt":updated,"moneyCents":money});
        matches.push((when, updated, id, item));
    }
    matches.sort_by(|a, b| match (&a.0, &b.0) {
        (None, Some(_)) => std::cmp::Ordering::Greater,
        (Some(_), None) => std::cmp::Ordering::Less,
        _ => {
            let order = if sort == "updated" {
                b.1.cmp(&a.1)
            } else {
                let order =
                    a.0.as_ref()
                        .map(|v| (v.start, v.order))
                        .cmp(&b.0.as_ref().map(|v| (v.start, v.order)));
                if view == "past" {
                    order.reverse()
                } else {
                    order
                }
            };
            order.then_with(|| a.2.cmp(&b.2))
        }
    });
    let count = matches.len();
    let next = if offset + limit < count {
        Some(json!({"scope":scope,"revision":revision,"offset":offset+limit}).to_string())
    } else {
        None
    };
    let items: Vec<_> = matches
        .into_iter()
        .skip(offset)
        .take(limit)
        .map(|v| v.3)
        .collect();
    Ok(
        json!({"items":items,"count":count,"total":total,"limit":limit,"nextCursor":next,"viewCounts":counts,"needsDateCount":needs,"statusOptions":status_options,"typeOptions":type_options}),
    )
}

#[cfg(test)]
mod tests {
    use crate::domain::dispatch;
    use serde_json::{json, Value};
    fn fixture() -> (std::path::PathBuf, Value) {
        let root = std::env::temp_dir().join(format!("gigi-dates-{}", uuid::Uuid::new_v4()));
        let wid = dispatch(
            &root,
            "workspace.create",
            json!({"name":"Synthetic date semantics"}),
        )
        .unwrap()["id"]
            .clone();
        (root, wid)
    }
    #[test]
    fn gigs_dates_use_viewer_days_ranges_exclusive_all_day_and_dst() {
        let (root, wid) = fixture();
        for (id, date, _all_day) in [
            ("offset", "2026-10-22T01:00:00+02:00", false),
            (
                "ongoing",
                "2026-10-21T23:00:00-05:00/2026-10-22T01:00:00-05:00",
                false,
            ),
            ("date-only", "2026-10-22", false),
            ("all-day", "2026-10-21/2026-10-23", true),
            ("invalid", "2026-02-30", false),
            ("invalid-mixed", "2026-10-22T20:00:00Z/2026-10-22", false),
            ("minute", "2026-10-22T15:30Z", false),
            ("dst-first", "2026-11-01T01:30:00-05:00", false),
            ("dst-second", "2026-11-01T01:30:00-06:00", false),
        ] {
            dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":"gigs","id":id,"title":id,"fields":{"Date":date}})).unwrap();
        }
        let request = |view: &str, today: &str| json!({"workspaceId":wid,"entity":"gigs","gigs":{"view":view,"today":today,"timeZone":"America/Chicago"}});
        let upcoming = dispatch(&root, "records.list", request("upcoming", "2026-10-22")).unwrap();
        let ids: Vec<_> = upcoming["items"]
            .as_array()
            .unwrap()
            .iter()
            .map(|v| v["id"].as_str().unwrap())
            .collect();
        assert!(
            ids.contains(&"ongoing")
                && ids.contains(&"date-only")
                && ids.contains(&"all-day")
                && ids.contains(&"minute")
        );
        assert!(!ids.contains(&"offset"));
        let needs = dispatch(&root, "records.list", request("needs_date", "2026-10-22")).unwrap();
        assert_eq!(needs["count"], 2);
        let later = dispatch(&root, "records.list", request("past", "2026-10-23")).unwrap();
        assert!(later["items"]
            .as_array()
            .unwrap()
            .iter()
            .any(|v| v["id"] == "all-day"));
        let dst = dispatch(&root, "records.list", request("upcoming", "2026-11-01")).unwrap();
        assert_eq!(dst["items"][0]["id"], "dst-first");
        assert_eq!(dst["items"][1]["id"], "dst-second");
        std::fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn gigs_filter_values_relations_workspace_boundaries_and_changed_cursor() {
        let (root, wid) = fixture();
        let (other_root, other) = fixture();
        for i in 0..23 {
            dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":"gigs","id":format!("g{i:02}"),"title":"Synthetic show","fields":{"Date":"2026-10-25","Status":"Confirmed","Type":"Shift"}})).unwrap();
        }
        let person = dispatch(
            &root,
            "records.save",
            json!({"workspaceId":wid,"entity":"contacts","title":"Renée Needle"}),
        )
        .unwrap();
        dispatch(&root,"relations.link",json!({"workspaceId":wid,"fromEntity":"gigs","fromId":"g22","toEntity":"contacts","toId":person["id"],"role":"Booked Through"})).unwrap();
        let mut request = json!({"workspaceId":wid,"entity":"gigs","gigs":{"view":"all","today":"2026-10-22","timeZone":"UTC","query":"renee needle","status":"Confirmed","type":"Shift","from":"2026-10-25","to":"2026-10-25"}});
        let found = dispatch(&root, "records.list", request.clone()).unwrap();
        assert_eq!(found["count"], 1);
        assert_eq!(found["items"][0]["id"], "g22");
        request["gigs"]["query"] = json!("");
        let first = dispatch(&root, "records.list", request.clone()).unwrap();
        request["cursor"] = first["nextCursor"].clone();
        dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":"gigs","id":"g00","title":"Edited","fields":{"Date":"2026-10-25","Status":"Confirmed","Type":"Shift"}})).unwrap();
        assert!(dispatch(&root, "records.list", request.clone())
            .unwrap_err()
            .contains("Refresh results"));
        request["workspaceId"] = other;
        assert!(dispatch(&root, "records.list", request).is_err());
        std::fs::remove_dir_all(root).unwrap();
        std::fs::remove_dir_all(other_root).unwrap();
    }
    #[test]
    fn gigs_filter_full_workspace_before_paging_and_preserve_equal_date_order() {
        let root = std::env::temp_dir().join(format!("gigi-list-{}", uuid::Uuid::new_v4()));
        let wid = dispatch(&root, "workspace.create", json!({"name":"Synthetic gigs"})).unwrap()
            ["id"]
            .clone();
        for i in 0..27 {
            dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":"gigs","id":format!("gig-{i:02}"),"title":format!("Show {i}"),"fields":{"Date":"2026-11-01","Status":"Confirmed","Type":"Show"}})).unwrap();
        }
        dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":"gigs","id":"early","title":"Café needle","fields":{"Date":"2026-10-23","Type":"Shift"}})).unwrap();
        let request = json!({"workspaceId":wid,"entity":"gigs","limit":20,"gigs":{"view":"upcoming","today":"2026-10-22","timeZone":"America/Chicago","query":"cafe needle"}});
        let result = dispatch(&root, "records.list", request.clone()).unwrap();
        assert_eq!(result["count"], 1);
        assert_eq!(result["items"][0]["id"], "early");
        assert_eq!(result["total"], 28);
        let mut all = request.clone();
        all["gigs"]["query"] = json!("");
        let first = dispatch(&root, "records.list", all.clone()).unwrap();
        assert_eq!(first["items"][0]["id"], "early");
        all["cursor"] = first["nextCursor"].clone();
        let second = dispatch(&root, "records.list", all.clone()).unwrap();
        let ids: Vec<Value> = first["items"]
            .as_array()
            .unwrap()
            .iter()
            .chain(second["items"].as_array().unwrap())
            .map(|v| v["id"].clone())
            .collect();
        assert_eq!(ids.len(), 28);
        assert_eq!(ids[1], "gig-00");
        assert_eq!(ids[27], "gig-26");
        std::fs::remove_dir_all(root).unwrap();
    }
}
