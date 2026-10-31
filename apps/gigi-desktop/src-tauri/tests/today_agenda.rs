use gigi_desktop_lib::domain;
use serde_json::json;
#[test]
fn classification_filters_before_limits_preserves_legacy_and_keeps_calendar_when_representing_gig_is_excluded() {
    let root=std::env::temp_dir().join(format!("gigi-classification-{}",uuid::Uuid::new_v4()));
    let w=domain::dispatch(&root,"workspace.create",json!({"name":"Synthetic classified agenda"})).unwrap()["id"].clone();
    for n in 0..7 {domain::dispatch(&root,"records.save",json!({"workspaceId":w,"entity":"gigs","title":format!("Unclassified {n}"),"fields":{"Date":"2026-11-01","Type":"Custom concert label"}})).unwrap();}
    let performance=domain::dispatch(&root,"records.save",json!({"workspaceId":w,"entity":"gigs","title":"Classified performance beyond first five","fields":{"Date":"2026-11-04","Work kind":"Performance","Type":"Custom original"}})).unwrap();
    let calendar=domain::dispatch(&root,"records.save",json!({"workspaceId":w,"entity":"schedule","title":"Calendar commitment","fields":{"Date":"2026-11-02"},"source":{"kind":"import","provider":"googlecalendar","connectedAccountId":"ca_one","collectionId":"primary","externalId":"stable"}})).unwrap();
    let crew=domain::dispatch(&root,"records.save",json!({"workspaceId":w,"entity":"gigs","title":"Crew commitment","fields":{"Date":"2026-11-02","Work kind":"Crew / work"},"idempotencyKey":"derive","sourceRecord":{"entity":"schedule","id":calendar["id"],"connectedAccountId":"ca_one","expectedRecord":{"title":calendar["title"],"fields":calendar["fields"],"source":calendar["source"]}}})).unwrap();
    let read=|kind:Option<&str>,offset:u32,limit:u32| {let mut input=json!({"workspaceId":w,"today":"2026-10-22","timeZone":"America/Los_Angeles","offset":offset,"limit":limit});if let Some(k)=kind{input["recordKind"]=json!(k)}domain::dispatch(&root,"agenda.list",input).unwrap()};
    let all=read(None,0,5);assert_eq!(all["count"],9);assert_eq!(all["nextOffset"],5);assert_eq!(all["items"][0]["identity"]["recordKind"],"unclassified");
    let filtered=read(Some("performance"),0,1);assert_eq!(filtered["count"],1);assert_eq!(filtered["items"][0]["id"],performance["id"]);assert!(filtered["nextOffset"].is_null());
    assert_eq!(read(Some("calendar_event"),0,1)["items"][0]["id"],calendar["id"]);
    assert_eq!(read(Some("crew_work"),0,1)["items"][0]["id"],crew["id"]);
    let backup=domain::dispatch(&root,"backup.create",json!({"workspaceId":w})).unwrap();
    domain::dispatch(&root,"backup.restore",json!({"backupId":backup["backupId"]})).unwrap();
    let restored=domain::dispatch(&root,"records.get",json!({"workspaceId":w,"entity":"gigs","id":performance["id"],"detail":"full"})).unwrap();assert_eq!(restored["fields"]["Type"],"Custom original");assert_eq!(restored["fields"]["Work kind"],"Performance");
    let legacy=read(Some("unclassified"),0,1);assert_eq!(legacy["items"][0]["identity"]["rawType"],"Custom concert label");
    assert!(domain::dispatch(&root,"agenda.list",json!({"workspaceId":"other","today":"2026-10-22","timeZone":"UTC"})).is_err());
    assert!(domain::dispatch(&root,"agenda.list",json!({"workspaceId":w,"today":"2026-10-22","timeZone":"UTC","limit":1000})).is_err());
    assert!(domain::dispatch(&root,"records.save",json!({"workspaceId":w,"entity":"gigs","title":"Do not infer","fields":{"Work kind":"Jazz stage"}})).is_err());
    std::fs::remove_dir_all(root).unwrap();
}
#[test]
fn identity_summaries_bound_custom_type_without_changing_original_or_source_ids() {
    let root=std::env::temp_dir().join(format!("gigi-identity-budget-{}",uuid::Uuid::new_v4()));
    let w=domain::dispatch(&root,"workspace.create",json!({"name":"Synthetic legacy type budget"})).unwrap()["id"].clone();
    let custom="X".repeat(24000);
    let record=domain::dispatch(&root,"records.save",json!({"workspaceId":w,"entity":"gigs","title":"Legacy","fields":{"Date":"2026-11-01","Type":custom}})).unwrap();
    let read=|detail:&str|domain::dispatch(&root,"records.get",json!({"workspaceId":w,"entity":"gigs","id":record["id"],"detail":detail})).unwrap();
    let summary=read("summary");assert_eq!(summary["identity"]["rawType"].as_str().unwrap().len(),160);assert_eq!(summary["identity"]["rawTypeTruncated"],true);
    assert_eq!(read("full")["fields"]["Type"],custom);
    let agenda=domain::dispatch(&root,"agenda.list",json!({"workspaceId":w,"today":"2026-10-22","timeZone":"UTC"})).unwrap();assert!(agenda.to_string().len()<2500);
    let backup=domain::dispatch(&root,"backup.create",json!({"workspaceId":w})).unwrap();domain::dispatch(&root,"backup.restore",json!({"backupId":backup["backupId"]})).unwrap();assert_eq!(read("full")["fields"]["Type"],custom);
    std::fs::remove_dir_all(root).unwrap();
}
#[test]
fn today_orders_both_complete_collections_and_keeps_ongoing_events() {
    let root = std::env::temp_dir().join(format!("gigi-today-{}", uuid::Uuid::new_v4()));
    let w = domain::dispatch(
        &root,
        "workspace.create",
        json!({"name":"Synthetic agenda"}),
    )
    .unwrap()["id"]
        .clone();
    let save = |entity: &str, title: &str, date: &str, all_day: bool| {
        let mut fields = json!({"Date":date});
        if entity == "schedule" {
            fields["All Day"] = json!(all_day);
        }
        domain::dispatch(
            &root,
            "records.save",
            json!({"workspaceId":w,"entity":entity,"title":title,"fields":fields}),
        )
        .unwrap()
    };
    for n in 0..55 {
        save("gigs", &format!("Later {n}"), "2026-12-01", false);
    }
    save("schedule", "Already ended", "2026-10-20/2026-10-22", true);
    save(
        "schedule",
        "Ended at midnight",
        "2026-10-21T23:00:00Z/2026-10-22T00:00:00Z",
        false,
    );
    save(
        "schedule",
        "Ended at midnight with minute precision",
        "2026-10-21T23:00Z/2026-10-22T00:00Z",
        false,
    );
    save("schedule", "Ongoing", "2026-10-21/2026-10-23", true);
    save("schedule", "All day", "2026-10-22/2026-10-23", true);
    save(
        "schedule",
        "Earlier instant",
        "2026-10-23T00:15:00Z/2026-10-23T01:00:00Z",
        false,
    );
    save(
        "gigs",
        "Later instant",
        "2026-10-22T18:00:00-07:00/2026-10-22T19:00:00-07:00",
        false,
    );
    domain::dispatch(&root,"records.save",json!({"workspaceId":w,"entity":"gigs","title":"Known call times","fields":{"Date":"2026-10-22","Call Time":"10:00","Set Time":"11:00"}})).unwrap();
    let result = domain::dispatch(
        &root,
        "workspace.overview",
        json!({"workspaceId":w,"today":"2026-10-22","timeZone":"America/Los_Angeles"}),
    )
    .unwrap();
    let events = &result["events"];
    assert_eq!(events["count"], 60);
    let titles = events["items"]
        .as_array()
        .unwrap()
        .iter()
        .map(|e| e["title"].as_str().unwrap())
        .collect::<Vec<_>>();
    assert_eq!(
        &titles[..4],
        ["Ongoing", "All day", "Earlier instant", "Later instant"]
    );
    assert_eq!(events["items"].as_array().unwrap().len(), 5);
    assert_eq!(events["items"][2]["date"], "2026-10-22");
    assert_eq!(events["items"][0]["entity"], "schedule");
    assert_eq!(events["items"][4]["fields"]["Call Time"], "10:00");
    assert_eq!(events["items"][4]["fields"]["Set Time"], "11:00");
    assert!(domain::dispatch(
        &root,
        "workspace.overview",
        json!({"workspaceId":w,"today":"2026-10-22","timeZone":"made/up"})
    )
    .is_err());
    std::fs::remove_dir_all(root).unwrap();
}

#[test]
fn only_verified_source_derivations_collapse_duplicate_events() {
    let root = std::env::temp_dir().join(format!("gigi-today-{}", uuid::Uuid::new_v4()));
    let w = domain::dispatch(
        &root,
        "workspace.create",
        json!({"name":"Synthetic source agenda"}),
    )
    .unwrap()["id"]
        .clone();
    let source=domain::dispatch(&root,"records.save",json!({"workspaceId":w,"entity":"schedule","title":"Same title","fields":{"Date":"2026-10-24/2026-10-25","All Day":true},"source":{"kind":"import","provider":"googlecalendar","connectedAccountId":"ca_one","collectionId":"primary","externalId":"stable-id"}})).unwrap();
    let gig=domain::dispatch(&root,"records.save",json!({"workspaceId":w,"entity":"gigs","title":"Derived gig","fields":{"Date":source["fields"]["Date"]},"idempotencyKey":"derive","sourceRecord":{"entity":"schedule","id":source["id"],"connectedAccountId":"ca_one","expectedRecord":{"title":source["title"],"fields":source["fields"],"source":source["source"]}}})).unwrap();
    domain::dispatch(&root,"records.save",json!({"workspaceId":w,"entity":"gigs","title":"Same title","fields":{"Date":"2026-10-24"}})).unwrap();
    let result = domain::dispatch(
        &root,
        "workspace.overview",
        json!({"workspaceId":w,"today":"2026-10-22","timeZone":"UTC"}),
    )
    .unwrap();
    assert_eq!(result["events"]["count"], 2);
    assert!(result["events"]["items"]
        .as_array()
        .unwrap()
        .iter()
        .any(|i| i["id"] == gig["id"]));
    assert_eq!(
        result["events"]["items"]
            .as_array()
            .unwrap()
            .iter()
            .find(|i| i["id"] == gig["id"])
            .unwrap()["allDay"],
        true
    );
    let source_after = domain::dispatch(
        &root,
        "records.get",
        json!({"workspaceId":w,"entity":"schedule","id":source["id"],"detail":"full"}),
    )
    .unwrap();
    assert_eq!(source_after["source"], source["source"]);
    assert_eq!(source_after["fields"], source["fields"]);
    std::fs::remove_dir_all(root).unwrap();
}

#[test]
fn derived_gigs_respect_local_timing_and_keep_filtered_source_artwork() {
    for (source_date, status, edited_date, call_time) in [
        (
            "2026-10-20/2026-10-21",
            None,
            "2026-10-22T15:00:00Z/2026-10-22T17:00:00Z",
            "",
        ),
        (
            "2026-10-22/2026-10-23",
            Some("Completed"),
            "2026-10-22",
            "10:00",
        ),
        (
            "2026-10-22/2026-10-23",
            None,
            "2026-10-22/2026-10-23",
            "10:00",
        ),
    ] {
        let root =
            std::env::temp_dir().join(format!("gigi-edited-agenda-{}", uuid::Uuid::new_v4()));
        let w = domain::dispatch(
            &root,
            "workspace.create",
            json!({"name":"Synthetic edited agenda"}),
        )
        .unwrap()["id"]
            .clone();
        let source=domain::dispatch(&root,"records.save",json!({"workspaceId":w,"entity":"schedule","title":"Original Calendar event","fields":{"Date":source_date,"All Day":true},"source":{"kind":"import","provider":"googlecalendar","connectedAccountId":"ca_one","collectionId":"primary","externalId":"stable-id","calendarTiming":{"start":{"date":"2026-10-20"},"end":{"date":"2026-10-21"}}}})).unwrap();
        let gig=domain::dispatch(&root,"records.save",json!({"workspaceId":w,"entity":"gigs","title":"Derived gig","fields":{"Date":source_date},"idempotencyKey":"derive","sourceRecord":{"entity":"schedule","id":source["id"],"connectedAccountId":"ca_one","expectedRecord":{"title":source["title"],"fields":source["fields"],"source":source["source"]}}})).unwrap();
        domain::dispatch(&root,"records.save",json!({"workspaceId":w,"entity":"gigs","id":gig["id"],"title":gig["title"],"fields":{"Date":edited_date,"Call Time":call_time}})).unwrap();
        if let Some(status) = status {
            // Legacy/imported row status is not an editable Schedule field.
            rusqlite::Connection::open(root.join("gigi.sqlite"))
                .unwrap()
                .execute(
                    "UPDATE schedule SET status=?1 WHERE workspace_id=?2 AND id=?3",
                    rusqlite::params![status, w.as_str().unwrap(), source["id"].as_str().unwrap()],
                )
                .unwrap();
        }
        let root = std::fs::canonicalize(root).unwrap();
        let path = root.join("source.png");
        image::DynamicImage::new_rgb8(3, 2).save(&path).unwrap();
        let artwork=gigi_desktop_lib::artwork::import_with_picker(&root,json!({"workspaceId":w,"requestId":uuid::Uuid::new_v4().to_string(),"mode":"picker","entity":"schedule","id":source["id"],"expectedRevision":0,"alt":"Synthetic source artwork","provenance":{"origin":"supplied","purpose":"artwork","rights":"unknown"}}),||Some(path)).unwrap();
        let overview = domain::dispatch(
            &root,
            "workspace.overview",
            json!({"workspaceId":w,"today":"2026-10-22","timeZone":"UTC"}),
        )
        .unwrap();
        assert_eq!(overview["events"]["count"], 1);
        let visible = &overview["events"]["items"][0];
        assert_eq!(visible["id"], gig["id"]);
        assert_eq!(visible["allDay"], false);
        assert_eq!(visible["fields"]["Date"], edited_date);
        assert_eq!(visible["fields"]["Call Time"], call_time);
        assert_eq!(visible["cover"], artwork["cover"]);
        let detail = domain::dispatch(
            &root,
            "records.get",
            json!({"workspaceId":w,"entity":"gigs","id":gig["id"],"detail":"full"}),
        )
        .unwrap();
        assert_eq!(visible["cover"]["assetId"], detail["cover"]["assetId"]);
        gigi_desktop_lib::artwork::dispatch(&root,"media.attach",json!({"workspaceId":w,"requestId":uuid::Uuid::new_v4().to_string(),"entity":"gigs","id":gig["id"],"expectedRevision":0,"assetId":null})).unwrap();
        let cleared = domain::dispatch(
            &root,
            "workspace.overview",
            json!({"workspaceId":w,"today":"2026-10-22","timeZone":"UTC"}),
        )
        .unwrap();
        assert!(cleared["events"]["items"][0]["cover"].is_null());
        let read = domain::dispatch(
            &root,
            "records.get",
            json!({"workspaceId":w,"entity":"schedule","id":source["id"],"detail":"full"}),
        )
        .unwrap();
        assert_eq!(read["fields"]["Date"], source_date);
        assert_eq!(read["source"], source["source"]);
        std::fs::remove_dir_all(root).unwrap();
    }
}

#[test]
fn exclusive_timed_ends_keep_minute_and_submillisecond_precision() {
    for (date, zone, count) in [
        ("2026-10-22T23:00Z/2026-10-23T00:00Z", "UTC", 0),
        ("2026-10-22T23:00:00Z/2026-10-23T00:00:00Z", "UTC", 0),
        ("2026-10-22T23:00:00Z/2026-10-23T00:00:00.0005Z", "UTC", 1),
        (
            "2026-10-22T23:00:00Z/2026-10-23T00:00:00.000000001Z",
            "UTC",
            1,
        ),
        (
            "2026-10-22T23:00-04:00/2026-10-23T00:00-04:00",
            "America/New_York",
            0,
        ),
    ] {
        let root =
            std::env::temp_dir().join(format!("gigi-end-precision-{}", uuid::Uuid::new_v4()));
        let w = domain::dispatch(
            &root,
            "workspace.create",
            json!({"name":"Synthetic end precision"}),
        )
        .unwrap()["id"]
            .clone();
        domain::dispatch(&root,"records.save",json!({"workspaceId":w,"entity":"schedule","title":"Timed Calendar event","fields":{"Date":date,"All Day":false}})).unwrap();
        let got = domain::dispatch(
            &root,
            "workspace.overview",
            json!({"workspaceId":w,"today":"2026-10-23","timeZone":zone}),
        )
        .unwrap();
        assert_eq!(got["events"]["count"], count, "{date} in {zone}");
        std::fs::remove_dir_all(root).unwrap();
    }
}
