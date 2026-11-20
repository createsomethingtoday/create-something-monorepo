//! Disposable native search acceptance profile. Refuses an existing path.
use gigi_desktop_lib::domain::dispatch;
use serde_json::json;

fn main() {
    let root = std::path::PathBuf::from(std::env::args().nth(1).expect("new absolute synthetic profile path"));
    assert!(root.is_absolute() && !root.exists(), "Refusing an existing or relative profile");
    let wid = dispatch(&root, "workspace.create", json!({"name":"Synthetic search acceptance"})).unwrap()["id"].clone();
    dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":"profile","title":"Synthetic owner","fields":{"Currency":"USD"}})).unwrap();
    for (entity, id, title) in [
        ("contacts", "search-person", "Micah Johnson (synthetic)"),
        ("gigs", "search-gig", "Event with Micah Phillips (synthetic)"),
        ("finances", "search-finance", "Payment to Micah Jones (synthetic)"),
    ] {
        dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":entity,"id":id,"title":title,"fields":{}})).unwrap();
    }
    for index in 0..9 {
        dispatch(&root,"records.save",json!({"workspaceId":wid,"entity":"tasks","id":format!("search-task-{index}"),"title":format!("Micah synthetic task {index}"),"fields":{"Status":"To do"}})).unwrap();
    }
    let other = uuid::Uuid::new_v4().to_string();
    let db = rusqlite::Connection::open(root.join("gigi.sqlite")).unwrap();
    db.execute("INSERT INTO workspaces(id,name) VALUES(?1,'Other synthetic workspace')",[&other]).unwrap();
    drop(db);
    dispatch(&root,"records.save",json!({"workspaceId":other,"entity":"tasks","title":"Micah OTHER WORKSPACE MUST NOT APPEAR","fields":{}})).unwrap();
    println!("{}", json!({"workspaceId":wid,"profile":root,"matchingCounts":[1,1,1,9]}));
}
