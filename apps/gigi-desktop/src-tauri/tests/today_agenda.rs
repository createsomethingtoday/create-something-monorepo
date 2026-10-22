use gigi_desktop_lib::domain;
use serde_json::json;
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
