//! Full-workspace read-only finance segments, applied before pagination.
use rusqlite::{params, Connection};
use serde_json::{json, Value};
pub(crate) fn list(db: &Connection, wid: &str, input: &Value) -> Result<Value, String> {
    let view = input["finance"]["view"].as_str().unwrap_or("overall");
    if !["overall", "payable", "receivable", "overdue"].contains(&view) {
        return Err("Unknown money view".into());
    }
    let today = input["finance"]["today"]
        .as_str()
        .and_then(crate::gig_list::day)
        .ok_or("Money needs a valid local date")?;
    let zone: chrono_tz::Tz = input["finance"]["timeZone"]
        .as_str()
        .unwrap_or("UTC")
        .parse()
        .map_err(|_| "Invalid money timezone")?;
    let limit = input["limit"].as_u64().unwrap_or(20).clamp(1, 50) as usize;
    let offset = input["cursor"]
        .as_str()
        .and_then(|v| v.parse::<usize>().ok())
        .unwrap_or(0)
        .min(100000);
    let mut query=db.prepare("SELECT id,title,status,occurred_at,money_cents,updated_at,fields_json FROM finances WHERE workspace_id=?1 ORDER BY CASE WHEN substr(occurred_at,1,10) GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND substr(occurred_at,1,4) != '0000' AND date(julianday(substr(occurred_at,1,10))) = substr(occurred_at,1,10) AND (length(occurred_at)=10 OR (substr(occurred_at,11,1) IN ('T',' ') AND substr(occurred_at,12,5) GLOB '[0-9][0-9]:[0-9][0-9]' AND substr(occurred_at,12,2) BETWEEN '00' AND '23' AND substr(occurred_at,15,2) BETWEEN '00' AND '59')) THEN julianday(occurred_at) ELSE NULL END DESC NULLS LAST,id ASC").map_err(|e|e.to_string())?;
    let rows = query
        .query_map(params![wid], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, Option<String>>(2)?,
                row.get::<_, Option<String>>(3)?,
                row.get::<_, Option<i64>>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, String>(6)?,
            ))
        })
        .map_err(|e| e.to_string())?;
    let mut matched = Vec::new();
    let (mut total, mut payable, mut receivable, mut overdue) = (0, 0, 0, 0);
    for row in rows {
        let (id, title, status, date, money, updated, raw) = row.map_err(|e| e.to_string())?;
        let fields: Value = serde_json::from_str(&raw).map_err(|e| e.to_string())?;
        let state = status.as_deref().unwrap_or("").trim().to_lowercase();
        let direction = fields["Direction"]
            .as_str()
            .unwrap_or("")
            .trim()
            .to_lowercase();
        let unpaid = ["expected", "invoiced", "overdue"].contains(&state.as_str());
        let due = fields["Due Date"].as_str().and_then(|value| {
            crate::gig_list::day(value).or_else(|| {
                crate::gig_list::instant(value).map(|time| time.with_timezone(&zone).date_naive())
            })
        });
        let past_due = unpaid && (state == "overdue" || due.is_some_and(|day| day < today));
        let outgoing = unpaid && direction == "expense";
        let incoming = unpaid && direction == "income";
        total += 1;
        payable += i64::from(outgoing);
        receivable += i64::from(incoming);
        overdue += i64::from(past_due);
        if match view {
            "payable" => outgoing,
            "receivable" => incoming,
            "overdue" => past_due,
            _ => true,
        } {
            matched.push(json!({"id":id,"workspaceId":wid,"entity":"finances","title":title.chars().take(120).collect::<String>(),"titleTruncated":title.chars().count()>120,"status":status,"date":date,"moneyCents":money,"updatedAt":updated,"fields":{"Direction":fields["Direction"],"Due Date":fields["Due Date"]}}));
        }
    }
    let count = matched.len();
    let items: Vec<_> = matched.into_iter().skip(offset).take(limit).collect();
    Ok(
        json!({"items":items,"count":count,"total":total,"nextCursor":if offset+limit<count{Some((offset+limit).to_string())}else{None},"viewCounts":{"overall":total,"payable":payable,"receivable":receivable,"overdue":overdue}}),
    )
}
#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::dispatch;
    #[test]
    fn finance_segments_filter_complete_workspace_before_paging_without_writes() {
        let root = std::env::temp_dir().join(format!("gigi-finance-{}", uuid::Uuid::new_v4()));
        let wid = dispatch(
            &root,
            "workspace.create",
            json!({"name":"Synthetic finance segments"}),
        )
        .unwrap()["id"]
            .clone();
        let other = uuid::Uuid::new_v4().to_string();
        Connection::open(root.join("gigi.sqlite"))
            .unwrap()
            .execute(
                "INSERT INTO workspaces(id,name) VALUES(?1,?2)",
                params![other, "Other synthetic workspace"],
            )
            .unwrap();
        for index in 0..54 {
            dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":"finances","title":format!("Expense {index}"),"fields":{"Direction":"Expense","Status":"Expected"}})).unwrap();
        }
        for (name, direction, status, due) in [
            ("Unpaid income", "Income", "Invoiced", "2026-11-09"),
            ("Paid income", "Income", "Paid", "2026-11-01"),
            ("Undated expense", "Expense", "Expected", ""),
            ("Due today", "Expense", "Expected", "2026-11-10"),
        ] {
            dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":"finances","title":name,"fields":{"Direction":direction,"Status":status,"Due Date":due}})).unwrap();
        }
        dispatch(&root,"records.save",json!({"workspaceId":other,"entity":"finances","title":"Other income","fields":{"Direction":"Income","Status":"Invoiced","Due Date":"2026-11-01"}})).unwrap();
        let before = dispatch(&root, "history.list", json!({"workspaceId":wid})).unwrap();
        let read = |view: &str, cursor: Option<&str>| {
            dispatch(&root,"records.list",json!({"workspaceId":wid,"entity":"finances","cursor":cursor,"limit":1,"finance":{"view":view,"today":"2026-11-10"}})).unwrap()
        };
        let income = read("receivable", None);
        assert_eq!(income["count"], 1);
        assert_eq!(income["items"][0]["title"], "Unpaid income");
        assert_eq!(read("payable", None)["count"], 56);
        assert_eq!(read("overall", None)["count"], 58);
        let overdue = read("overdue", None);
        assert_eq!(overdue["count"], 1);
        assert_eq!(overdue["items"][0]["title"], "Unpaid income");
        assert!(
            read("payable", Some("1"))["items"]
                .as_array()
                .unwrap()
                .len()
                == 1
        );
        assert_eq!(
            before,
            dispatch(&root, "history.list", json!({"workspaceId":wid})).unwrap()
        );
        std::fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn overdue_uses_local_day_explicit_status_and_validated_criteria() {
        let root = std::env::temp_dir().join(format!("gigi-money-date-{}", uuid::Uuid::new_v4()));
        let w = dispatch(
            &root,
            "workspace.create",
            json!({"name":"Synthetic timezone"}),
        )
        .unwrap()["id"]
            .clone();
        for (title, status, due) in [
            (
                "UTC midnight crosses local day",
                "Invoiced",
                "2026-11-10T02:00:00Z",
            ),
            ("Explicit overdue", "Overdue", "2026-12-01"),
            ("Already paid", "Paid", "2026-11-01"),
            ("Invalid due date", "Expected", "2026-02-30"),
        ] {
            dispatch(&root,"records.save",json!({"workspaceId":w,"entity":"finances","title":title,"fields":{"Status":status,"Direction":"Income","Due Date":due}})).unwrap();
        }
        let read = |view: &str, today: &str, zone: &str| {
            dispatch(
                &root,
                "records.list",
                json!({"workspaceId":w,"entity":"finances","finance":{"view":view,"today":today,"timeZone":zone}}),
            )
        };
        assert_eq!(
            read("overdue", "2026-11-10", "America/New_York").unwrap()["count"],
            2
        );
        assert_eq!(read("overdue", "2026-11-10", "UTC").unwrap()["count"], 1);
        assert!(read("invalid", "2026-11-10", "UTC").is_err());
        assert!(read("overdue", "2026-02-30", "UTC").is_err());
        assert!(read("overdue", "2026-11-10", "Invalid/Zone").is_err());
        std::fs::remove_dir_all(root).unwrap();
    }
}
