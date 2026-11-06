use gigi_desktop_lib::domain::dispatch;
use serde_json::json;

#[test]
fn search_groups_complete_owned_collections_and_paginates_without_record_payloads() {
    let root=std::env::temp_dir().join(format!("gigi-global-search-{}",uuid::Uuid::new_v4()));
    let wid=dispatch(&root,"workspace.create",json!({"name":"Synthetic search"})).unwrap()["id"].clone();
    let other=json!(uuid::Uuid::new_v4().to_string());
    let db=rusqlite::Connection::open(root.join("gigi.sqlite")).unwrap();
    db.execute("INSERT INTO workspaces(id,name) VALUES(?1,'Other synthetic search')",[other.as_str().unwrap()]).unwrap();
    drop(db);
    for (entity,title) in [("contacts","Micah Johnson"),("gigs","Event with Micah Phillips"),("finances","Payment to Micah Jones"),("tasks","Call Mícah tomorrow")] {
        dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":entity,"title":title,"fields":{}})).unwrap();
        dispatch(&root,"records.save",json!({"workspaceId":other,"entity":entity,"title":"Micah private other workspace","fields":{}})).unwrap();
    }
    // A match older than a list page must still be found.
    for n in 0..25 {dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":"gigs","title":format!("Unrelated event {n}"),"fields":{}})).unwrap();}
    let read=|input| dispatch(&root,"workspace.search",input).unwrap();
    let groups=read(json!({"workspaceId":wid,"query":"MICAH"}));
    for group in groups["groups"].as_array().unwrap() {
        assert_eq!(group["count"],1);
        let item=&group["items"][0];
        assert!(!item["title"].as_str().unwrap().contains("private"));
        assert!(item.get("fields").is_none());assert!(item.get("source").is_none());assert!(item.get("moneyCents").is_none());
    }
    assert_eq!(groups["groups"][0]["items"][0]["title"],"Micah Johnson");
    assert_eq!(groups["groups"][1]["items"][0]["title"],"Event with Micah Phillips");
    for n in 0..8 {dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":"tasks","title":format!("Micah task {n}"),"fields":{}})).unwrap();}
    let page=read(json!({"workspaceId":wid,"query":"micah","entity":"tasks","limit":6}));
    assert_eq!(page["groups"][0]["count"],9);assert_eq!(page["groups"][0]["items"].as_array().unwrap().len(),6);
    let next=read(json!({"workspaceId":wid,"query":"micah","entity":"tasks","cursor":page["groups"][0]["nextCursor"],"limit":6}));
    assert_eq!(next["groups"][0]["items"].as_array().unwrap().len(),3);
    for item in next["groups"][0]["items"].as_array().unwrap() {assert!(!page["groups"][0]["items"].as_array().unwrap().iter().any(|first|first["id"]==item["id"]));}
    for query in ["", "\u{301}","%", "no match"] {
        let result=read(json!({"workspaceId":wid,"query":query}));
        assert!(result["groups"].as_array().unwrap().iter().all(|g|g["count"]==0));
    }
    for extra in [json!({"entity":"workspaces"}),json!({"limit":999}),json!({"cursor":"-1"}),json!({"query":"x".repeat(161)}),json!({"workspaceId":"missing"})] {
        let mut input=json!({"workspaceId":wid,"query":"micah"});
        input.as_object_mut().unwrap().extend(extra.as_object().unwrap().clone());
        assert!(dispatch(&root,"workspace.search",input).is_err());
    }
    std::fs::remove_dir_all(root).unwrap();
}
