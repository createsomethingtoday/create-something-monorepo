//! Classification is explicit. Neither a title nor Calendar provenance proves performance work.
use serde_json::{json,Value};
pub fn kind(entity:&str,fields:&Value)-> &'static str {
    if entity=="schedule" {return "calendar_event"}
    match fields["Work kind"].as_str() {Some("Performance")=>"performance",Some("Crew / work")=>"crew_work",Some("Other")=>"other",_=>"unclassified"}
}
pub fn project(entity:&str,fields:&Value,source:&Value)->Value {
    if !["gigs","schedule"].contains(&entity) {return Value::Null;}
    let source=if source["kind"]=="manual" {&source["origin"]}else{source};
    let raw_type=fields["Type"].as_str();
    // Full fields/source remain authoritative. Never return a clipped identifier
    // that could be mistaken for a stable source ID; require the full record.
    let source_truncated=["provider","kind","collectionId","externalId"].iter().any(|key|source[*key].as_str().is_some_and(|s|s.chars().count()>512));
    let source_ref=if source["provider"].is_string() && !source_truncated {json!({"provider":source["provider"],"kind":source["kind"],"collectionId":source["collectionId"],"externalId":source["externalId"]})}else{Value::Null};
    json!({"recordKind":kind(entity,fields),"rawType":raw_type.map(|s|s.chars().take(160).collect::<String>()),"rawTypeTruncated":raw_type.is_some_and(|s|s.chars().count()>160),"classificationBasis":if entity=="schedule" {"calendar_entity"}else if fields["Work kind"].is_string(){"explicit_work_kind"}else{"unset"},"sourceRef":source_ref,"sourceRefTruncated":source_truncated})
}
