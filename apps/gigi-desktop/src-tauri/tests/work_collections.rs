use gigi_desktop_lib::domain;
use serde_json::{json, Value};

struct Fixture {
    root: std::path::PathBuf,
    workspace: Value,
}

impl Fixture {
    fn new() -> Self {
        let root = std::env::temp_dir().join(format!("gigi-work-collections-{}", uuid::Uuid::new_v4()));
        let workspace = domain::dispatch(&root, "workspace.create", json!({"name":"Synthetic collections"})).unwrap()["id"].clone();
        Self { root, workspace }
    }
    fn call(&self, op: &str, mut input: Value) -> Result<Value, String> {
        input["workspaceId"] = self.workspace.clone();
        domain::dispatch(&self.root, op, input)
    }
    fn save(&self, entity: &str, title: &str, fields: Value) -> Value {
        self.call("records.save", json!({"entity":entity,"title":title,"fields":fields})).unwrap()
    }
}

impl Drop for Fixture {
    fn drop(&mut self) { let _ = std::fs::remove_dir_all(&self.root); }
}

#[test]
fn task_search_filters_the_complete_workspace_without_changing_saved_records() {
    let f = Fixture::new();
    for i in 0..25 {
        f.save("tasks", &format!("Unrelated {i}"), json!({"Due Date":"2026-11-01"}));
    }
    let saved = f.save("tasks", "Café follow-up", json!({"Status":"Waiting on venue","Priority":"Custom priority","Due Date":"2026-11-07","Estimated Time":2}));
    f.save("tasks", "Café archived", json!({"Status":"Archived","Due Date":"2026-11-01"}));
    let before = f.call("history.list", json!({"limit":50})).unwrap();
    let result = f.call("records.list", json!({"entity":"tasks","limit":1,"tasks":{"view":"soon","query":"CAFE follow","today":"2026-11-06","timeZone":"UTC"}})).unwrap();
    assert_eq!(result["count"], 1);
    assert_eq!(result["items"][0]["id"], saved["id"]);
    assert_eq!(result["items"][0]["status"], "Waiting on venue");
    assert_eq!(result["items"][0]["priority"], "Custom priority");
    assert_eq!(result["items"][0]["dateSource"], "due");
    assert!(result["nextCursor"].is_null());
    let after = f.call("records.get", json!({"entity":"tasks","id":saved["id"],"detail":"full"})).unwrap();
    assert_eq!(after["fields"], saved["fields"]);
    assert_eq!(after["source"], saved["source"]);
    assert_eq!(f.call("history.list", json!({"limit":50})).unwrap(), before);
}

#[test]
fn gig_location_summaries_are_bounded_and_cursor_rejects_a_changed_location() {
    let f = Fixture::new();
    let first = f.save("gigs", "First date", json!({"Date":"2026-11-06"}));
    f.save("gigs", "Second date", json!({"Date":"2026-11-07"}));
    let mut locations = Vec::new();
    for i in 0..6 {
        let location = f.save("locations", &format!("Venue {i}"), json!({}));
        f.call("relations.link", json!({"fromEntity":"gigs","fromId":first["id"],"toEntity":"locations","toId":location["id"],"role":"Location"})).unwrap();
        locations.push(location);
    }
    let request = json!({"entity":"gigs","limit":1,"gigs":{"view":"all","today":"2026-11-06","timeZone":"UTC"}});
    let result = f.call("records.list", request.clone()).unwrap();
    assert_eq!(result["items"][0]["id"], first["id"]);
    assert_eq!(result["items"][0]["locationCount"], 6);
    assert_eq!(result["items"][0]["locationNames"], json!(["Venue 0","Venue 1","Venue 2","Venue 3"]));
    assert!(result["nextCursor"].is_string());
    f.call("records.save", json!({"entity":"locations","id":locations[0]["id"],"title":"Renamed venue"})).unwrap();
    let mut next = request;
    next["cursor"] = result["nextCursor"].clone();
    assert!(f.call("records.list", next).unwrap_err().contains("changed"));
}
