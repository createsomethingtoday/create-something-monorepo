use gigi_desktop_lib::domain;
use serde_json::{json, Value};
#[test]
fn curated_memory_requires_review_and_survives_reopen_with_citations() {
    let root = std::env::temp_dir().join(format!("gigi-memory-{}", uuid::Uuid::new_v4()));
    let w = domain::dispatch(
        &root,
        "workspace.create",
        json!({"name":"Synthetic memory"}),
    )
    .unwrap()["id"]
        .clone();
    let call = |op: &str, mut v: Value| {
        v["workspaceId"] = w.clone();
        domain::dispatch(&root, op, v)
    };
    let proposal=call("memory.request",json!({"requestId":"request-one","action":"save","entry":{"kind":"preference","text":"Prefer morning rehearsals","state":"confirmed","scope":"workspace","source":{"kind":"user","reference":"User statement at rehearsal"}}})).unwrap();
    assert_eq!(
        call("memory.search", json!({"query":"rehearsals"})).unwrap()["items"],
        json!([])
    );
    let receipt = call(
        "memory.review",
        json!({"requestId":proposal["requestId"],"decision":"approve"}),
    )
    .unwrap();
    let id = receipt["memoryId"].clone();
    let found = call("memory.search", json!({"query":"morning","limit":1})).unwrap();
    assert_eq!(found["items"][0]["id"], id);
    assert!(found["items"][0]["citation"]
        .as_str()
        .unwrap()
        .starts_with("gigi-memory://"));
    assert_eq!(call("memory.get", json!({"id":id})).unwrap()["revision"], 1);
    assert_eq!(
        call(
            "memory.review",
            json!({"requestId":"request-one","decision":"approve"})
        )
        .unwrap(),
        receipt
    );
    assert!(call(
        "memory.request",
        json!({"requestId":"request-one","action":"forget","id":id,"expectedRevision":1})
    )
    .is_err());
    let stale = json!({"requestId":"stale","action":"forget","id":id,"expectedRevision":0});
    assert!(call("memory.request", stale).is_err());
    call(
        "memory.request",
        json!({"requestId":"forget","action":"forget","id":id,"expectedRevision":1}),
    )
    .unwrap();
    call(
        "memory.review",
        json!({"requestId":"forget","decision":"approve"}),
    )
    .unwrap();
    assert_eq!(
        call("memory.search", json!({"query":"morning"})).unwrap()["items"],
        json!([])
    );
    assert!(call("memory.get", json!({"id":id})).is_err());
    assert!(domain::dispatch(
        &root,
        "memory.search",
        json!({"workspaceId":"foreign","query":"morning"})
    )
    .is_err());
    std::fs::remove_dir_all(root).unwrap();
}

#[test]
fn corrections_supersession_and_stale_pending_approval_are_atomic() {
    let root = std::env::temp_dir().join(format!("gigi-memory-{}", uuid::Uuid::new_v4()));
    let w = domain::dispatch(
        &root,
        "workspace.create",
        json!({"name":"Synthetic lifecycle"}),
    )
    .unwrap()["id"]
        .clone();
    let call = |op: &str, mut v: Value| {
        v["workspaceId"] = w.clone();
        domain::dispatch(&root, op, v)
    };
    let entry = |text: &str, state: &str| json!({"kind":"decision","text":text,"state":state,"scope":"workspace","source":{"kind":"conversation","reference":"Synthetic conversation, 2026-11-09"}});
    let propose = |key: &str, action: &str, id: Value, revision: Value, e: Value| {
        let mut v = json!({"requestId":key,"action":action,"entry":e});
        if !id.is_null() {
            v["id"] = id;
            v["expectedRevision"] = revision;
        }
        call("memory.request", v)
    };
    let review = |key: &str| {
        call(
            "memory.review",
            json!({"requestId":key,"decision":"approve"}),
        )
    };
    propose(
        "first",
        "save",
        Value::Null,
        Value::Null,
        entry("Original inference", "inferred"),
    )
    .unwrap();
    let id = review("first").unwrap()["memoryId"].clone();
    propose("stale", "forget", id.clone(), json!(1), Value::Null).unwrap();
    propose(
        "correct",
        "save",
        id.clone(),
        json!(1),
        entry("Verified decision", "confirmed"),
    )
    .unwrap();
    review("correct").unwrap();
    assert!(review("stale").unwrap_err().contains("changed"));
    assert_eq!(
        call("memory.get", json!({"id":id})).unwrap()["state"],
        "confirmed"
    );
    propose(
        "replace",
        "supersede",
        id.clone(),
        json!(2),
        entry("Replacement decision", "confirmed"),
    )
    .unwrap();
    let replacement = review("replace").unwrap();
    assert!(call("memory.get", json!({"id":id})).is_err());
    assert_eq!(
        call("memory.search", json!({"query":"Original"})).unwrap()["items"],
        json!([])
    );
    let actual = call("memory.get", json!({"id":replacement["memoryId"]})).unwrap();
    assert_eq!(actual["supersedes"], id);
    assert_eq!(actual["revision"], 1);
    propose(
        "denied",
        "save",
        Value::Null,
        Value::Null,
        entry("Must not persist", "inferred"),
    )
    .unwrap();
    call(
        "memory.review",
        json!({"requestId":"denied","decision":"reject"}),
    )
    .unwrap();
    assert_eq!(
        call("memory.search", json!({"query":"Must not"})).unwrap()["items"],
        json!([])
    );
    assert!(propose(
        "cross",
        "save",
        json!("foreign-memory"),
        json!(1),
        entry("No", "confirmed")
    )
    .is_err());
    assert!(propose(
        "bad-state",
        "save",
        Value::Null,
        Value::Null,
        entry("No", "guessed")
    )
    .is_err());
    for n in 0..8 {
        let key = format!("bounded-{n}");
        propose(
            &key,
            "save",
            Value::Null,
            Value::Null,
            entry("Bounded memory", "inferred"),
        )
        .unwrap();
        review(&key).unwrap();
    }
    assert_eq!(
        call("memory.search", json!({"query":"Bounded","limit":5})).unwrap()["items"]
            .as_array()
            .unwrap()
            .len(),
        5
    );
    assert!(call("memory.search", json!({"query":"Bounded","limit":6})).is_err());
    std::fs::remove_dir_all(root).unwrap();
}

#[test]
fn unicode_search_matches_stored_case_and_keeps_pagination() {
    let root = std::env::temp_dir().join(format!("gigi-memory-{}", uuid::Uuid::new_v4()));
    let w = domain::dispatch(&root, "workspace.create", json!({"name":"Unicode search"})).unwrap()["id"].clone();
    let call = |op: &str, mut v: Value| { v["workspaceId"] = w.clone(); domain::dispatch(&root, op, v).unwrap() };
    for (key, text) in [("one", "Élodie prefers email"), ("two", "ÉLODIE books rehearsals"), ("other", "Other memory")] {
        call("memory.request", json!({"requestId":key,"action":"save","entry":{"kind":"preference","text":text,"state":"confirmed","scope":"workspace","source":{"kind":"user","reference":"Synthetic Unicode statement"}}}));
        call("memory.review", json!({"requestId":key,"decision":"approve"}));
    }
    for query in ["Élodie", "élodie", "ÉLODIE"] {
        let first = call("memory.search", json!({"query":query,"limit":1}));
        assert_eq!(first["items"].as_array().unwrap().len(), 1, "Unicode query {query}");
        assert_eq!(first["nextOffset"], 1);
        let second = call("memory.search", json!({"query":query,"limit":1,"offset":1}));
        assert_eq!(second["items"].as_array().unwrap().len(), 1);
        assert_ne!(first["items"][0]["id"], second["items"][0]["id"]);
        assert!(second["nextOffset"].is_null());
    }
    std::fs::remove_dir_all(root).unwrap();
}
