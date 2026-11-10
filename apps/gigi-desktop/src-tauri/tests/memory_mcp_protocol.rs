use gigi_desktop_lib::domain;
use serde_json::{json, Value};
use std::{
    io::{BufRead, BufReader, Write},
    process::{Command, Stdio},
};
#[test]
fn external_stdio_shares_cited_memory_but_cannot_approve_its_own_requests() {
    let root = std::env::temp_dir().join(format!("gigi-memory-mcp-{}", uuid::Uuid::new_v4()));
    let w = domain::dispatch(
        &root,
        "workspace.create",
        json!({"name":"Synthetic memory MCP"}),
    )
    .unwrap()["id"]
        .clone();
    let mut child = Command::new(env!("CARGO_BIN_EXE_gigi-mcp"))
        .env("GIGI_DATA_DIR", &root)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    let mut input = child.stdin.take().unwrap();
    let mut output = BufReader::new(child.stdout.take().unwrap());
    let mut n = 0;
    let mut rpc = |method: &str, params: Value| {
        n += 1;
        writeln!(
            input,
            "{}",
            json!({"jsonrpc":"2.0","id":n,"method":method,"params":params})
        )
        .unwrap();
        input.flush().unwrap();
        let mut line = String::new();
        output.read_line(&mut line).unwrap();
        serde_json::from_str::<Value>(&line).unwrap()
    };
    let catalog = rpc("tools/list", json!({}));
    for name in [
        "gigi_memory_search",
        "gigi_memory_get",
        "gigi_memory_request",
    ] {
        assert!(catalog["result"]["tools"]
            .as_array()
            .unwrap()
            .iter()
            .any(|t| t["name"] == name));
    }
    assert!(!catalog.to_string().contains("gigi_memory_review"));
    let request = json!({"workspaceId":w,"requestId":"external-one","action":"save","entry":{"kind":"lesson","text":"Check rehearsal dates with the organizer","state":"inferred","scope":"workspace","source":{"kind":"observation","reference":"Synthetic external agent test"}}});
    let proposed = rpc(
        "tools/call",
        json!({"name":"gigi_memory_request","arguments":request}),
    );
    assert_eq!(
        proposed["result"]["structuredContent"]["state"],
        "pending_user_approval"
    );
    let hidden = rpc(
        "tools/call",
        json!({"name":"gigi_memory_search","arguments":{"workspaceId":w,"query":"rehearsal"}}),
    );
    assert_eq!(hidden["result"]["structuredContent"]["items"], json!([]));
    assert!(rpc("tools/call",json!({"name":"gigi_memory_review","arguments":{"workspaceId":w,"requestId":"external-one","decision":"approve"}}))["error"].is_object());
    let approved = domain::dispatch(
        &root,
        "memory.review",
        json!({"workspaceId":w,"requestId":"external-one","decision":"approve"}),
    )
    .unwrap();
    let found = rpc(
        "tools/call",
        json!({"name":"gigi_memory_search","arguments":{"workspaceId":w,"query":"rehearsal","limit":1}}),
    );
    let item = &found["result"]["structuredContent"]["items"][0];
    assert_eq!(item["id"], approved["memoryId"]);
    assert_eq!(item["state"], "inferred");
    assert!(item["citation"].as_str().unwrap().contains("revision=1"));
    let foreign = rpc(
        "tools/call",
        json!({"name":"gigi_memory_get","arguments":{"workspaceId":"foreign","id":item["id"]}}),
    );
    assert_eq!(foreign["result"]["isError"], true);
    drop(rpc);
    drop(input);
    child.wait().unwrap();
    std::fs::remove_dir_all(root).unwrap();
}
