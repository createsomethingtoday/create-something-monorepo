//! Read-only Today windows. Calendar navigation never shifts task/payment cutoffs.
use chrono::{Datelike, Duration, NaiveDate};
use rusqlite::Connection;
use serde_json::{json, Value};

fn calendar_day(value:&Value, zone:chrono_tz::Tz)->Option<NaiveDate>{
    let value=value.as_str()?;
    crate::gig_list::day(value).or_else(||crate::gig_list::instant(value).map(|v|v.with_timezone(&zone).date_naive()))
}
fn section(mut items:Vec<Value>)->Value{
    items.sort_by(|a,b|a["date"].as_str().cmp(&b["date"].as_str()).then(a["id"].as_str().cmp(&b["id"].as_str())));
    let count=items.len();items.truncate(500);
    json!({"count":count,"items":items})
}
pub(crate) fn read(db:&Connection,wid:&str,today:&str,time_zone:&str,week_start:Option<&str>)->Result<Value,String>{
    let today=crate::gig_list::day(today).ok_or("Today needs a valid local date")?;
    let zone:chrono_tz::Tz=time_zone.parse().map_err(|_|"Today timezone is not recognized")?;
    let current_monday=today.checked_sub_signed(Duration::days(today.weekday().num_days_from_monday() as i64)).ok_or("Today is out of range")?;
    let start=match week_start {Some(value)=>crate::gig_list::day(value).ok_or("Week needs a valid local date")?,None=>current_monday};
    if start.weekday()!=chrono::Weekday::Mon{return Err("Week must begin on Monday".into())}
    let end=start.checked_add_signed(Duration::days(6)).ok_or("Week is out of range")?;
    let tomorrow=today.checked_add_signed(Duration::days(1)).ok_or("Today is out of range")?;
    let financial_end=current_monday.checked_add_signed(Duration::days(6)).ok_or("Today is out of range")?;
    let mut tasks=Vec::new();let mut payable=Vec::new();let mut receivable=Vec::new();
    for entity in ["tasks","finances"]{
        let mut stmt=db.prepare(&format!("SELECT id,title,status,money_cents,fields_json FROM {entity} WHERE workspace_id=?1 ORDER BY id")).map_err(|e|e.to_string())?;
        let rows=stmt.query_map([wid],|r|Ok((r.get::<_,String>(0)?,r.get::<_,String>(1)?,r.get::<_,Option<String>>(2)?,r.get::<_,Option<i64>>(3)?,r.get::<_,String>(4)?))).map_err(|e|e.to_string())?;
        for row in rows{
            let(id,title,status,money,raw)=row.map_err(|e|e.to_string())?;
            let fields:Value=serde_json::from_str(&raw).map_err(|e|e.to_string())?;
            let state=status.as_deref().unwrap_or("").trim().to_lowercase();
            let due=calendar_day(&fields["Due Date"],zone);
            let date=if entity=="tasks"{due.or_else(||calendar_day(&fields["Do Date"],zone))}else{due};
            let Some(date)=date else{continue};
            if entity=="tasks"{
                if date>tomorrow || crate::task_list::finished(&state){continue}
            }else if date>financial_end || !["expected","invoiced","overdue"].contains(&state.as_str()){continue}
            let direction=fields["Direction"].as_str().unwrap_or("").trim().to_lowercase();
            if entity=="finances" && !["income","expense"].contains(&direction.as_str()){continue}
            let priority=fields["Priority"].as_str().map(|s|s.chars().take(160).collect::<String>());
            let item=json!({"id":id,"entity":entity,"title":title.chars().take(240).collect::<String>(),"date":date.to_string(),"status":status.map(|s|s.chars().take(160).collect::<String>()),"moneyCents":money,"fields":{"Priority":priority,"Direction":if entity=="finances"{Some(direction.as_str())}else{None},"Due Date":due.map(|d|d.to_string())}});
            if entity=="tasks"{tasks.push(item)}else if direction=="expense"{payable.push(item)}else{receivable.push(item)}
        }
    }
    let calendar=crate::agenda::week(db,wid,&start.to_string(),end,time_zone)?;
    Ok(json!({"today":today.to_string(),"calendar":{"weekStart":start.to_string(),"weekEnd":end.to_string(),"items":calendar["items"],"count":calendar["count"],"undatedCount":calendar["undatedCount"]},"tasks":section(tasks),"payable":section(payable),"receivable":section(receivable),"financialThrough":financial_end.to_string()}))
}
