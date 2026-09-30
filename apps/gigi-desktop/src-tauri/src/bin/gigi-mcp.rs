use gigi_desktop_lib::domain;
use serde_json::{json, Value};
use std::fs;
use std::io::{self, BufRead, Read, Write};
use std::path::PathBuf;

const TOOLS: [(&str, &str, bool); 11] = [
    ("gigi_workspace_get", "workspace.get", true),
    ("gigi_schema_describe", "schema.describe", true),
    ("gigi_workspace_create", "workspace.create", false),
    ("gigi_records_list", "records.list", true),
    ("gigi_records_get", "records.get", true),
    ("gigi_records_save", "records.save", false),
    ("gigi_relations_link", "relations.link", false),
    ("gigi_gigs_summary", "gigs.summary", true),
    ("gigi_history_list", "history.list", true),
    ("gigi_backup_create", "backup.create", false),
    ("gigi_context_search", "context.search", true),
];

fn data_dir() -> Result<PathBuf, String> {
    if let Some(path) = std::env::var_os("GIGI_DATA_DIR") {
        if path.is_empty() {
            return Err("GIGI_DATA_DIR is empty".into());
        }
        return Ok(PathBuf::from(path));
    }
    let home = std::env::var_os("HOME").ok_or("HOME is unavailable")?;
    Ok(PathBuf::from(home).join("Library/Application Support/agency.createsomething.gigi"))
}

fn required_keys(operation: &str) -> &'static [&'static str] {
    match operation {
        "schema.describe" => &["entity"],
        "context.search" => &["workspaceId", "query"],
        "workspace.create" => &["name"],
        "records.list" => &["workspaceId", "entity"],
        "records.get" => &["workspaceId", "entity", "id"],
        "records.save" => &["workspaceId", "entity", "title"],
        "relations.link" => &["workspaceId", "fromEntity", "fromId", "toEntity", "toId"],
        "gigs.summary" => &["workspaceId", "gigId"],
        "history.list" | "backup.create" => &["workspaceId"],
        _ => &[],
    }
}

fn schema(operation: &str) -> Value {
    let mut properties = serde_json::Map::new();
    for key in required_keys(operation) {
        properties.insert((*key).to_string(), json!({"type":"string"}));
    }
    let required = required_keys(operation);
    let optional: &[(&str, &str)] = match operation {
        "workspace.get" => &[("workspaceId", "string")],
        "records.list" => &[("limit", "integer"), ("cursor", "string")],
        "records.save" => &[
            ("id", "string"),
            ("fields", "object"),
            ("source", "object"),
            ("idempotencyKey", "string"),
        ],
        "relations.link" => &[("role", "string"), ("idempotencyKey", "string")],
        "history.list" => &[("limit", "integer")],
        "context.search" => &[("limit", "integer")],
        _ => &[],
    };
    for (key, kind) in optional {
        properties.insert((*key).to_string(), json!({"type":kind}));
    }
    if operation == "records.get" {
        properties.insert("detail".into(), json!({"type":"string","enum":["summary","full"]}));
    }
    json!({"type":"object","properties":properties,"required":required,"additionalProperties":false})
}

fn tool_catalog() -> Value {
    let tools: Vec<_> = TOOLS.iter().map(|(name, operation, read_only)| {
        json!({
            "name":name,
            "description":format!("GiGi {}. Local private workspace only; results are bounded.", operation),
            "inputSchema":schema(operation),
            "annotations":{"readOnlyHint":read_only,"destructiveHint":operation == &"backup.restore"}
        })
    }).collect();
    json!({"tools":tools})
}

fn record_tool_use(root: &std::path::Path, name: &str) -> Result<(), String> {
    fs::create_dir_all(root).map_err(|e| e.to_string())?;
    let seconds = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs();
    let target = root.join("agent-last-call.json");
    let temporary = root.join(format!(".agent-last-call-{}.tmp", std::process::id()));
    fs::write(
        &temporary,
        format!("{}\n", json!({"lastToolAt":seconds,"tool":name})),
    )
    .map_err(|e| e.to_string())?;
    fs::rename(&temporary, &target).map_err(|e| e.to_string())?;
    Ok(())
}

fn reply(root: &std::path::Path, request: &Value) -> Option<Value> {
    let id = request.get("id")?.clone();
    let method = request.get("method").and_then(Value::as_str).unwrap_or("");
    let result = match method {
        "initialize" => {
            json!({"protocolVersion":"2025-06-18","capabilities":{"tools":{"listChanged":false}},"serverInfo":{"name":"gigi-local","version":"0.1.0"}})
        }
        "ping" => json!({}),
        "tools/list" => tool_catalog(),
        "tools/call" => {
            let params = request.get("params").unwrap_or(&Value::Null);
            let name = params.get("name").and_then(Value::as_str).unwrap_or("");
            let Some((_, operation, _)) = TOOLS.iter().find(|(candidate, _, _)| *candidate == name)
            else {
                return Some(
                    json!({"jsonrpc":"2.0","id":id,"error":{"code":-32602,"message":"unknown GiGi tool"}}),
                );
            };
            let arguments = params
                .get("arguments")
                .cloned()
                .unwrap_or_else(|| json!({}));
            if !arguments.is_object() {
                return Some(
                    json!({"jsonrpc":"2.0","id":id,"error":{"code":-32602,"message":"arguments must be an object"}}),
                );
            }
            let outcome = if *operation == "context.search" {
                let resource_dir = std::env::current_exe()
                    .ok()
                    .and_then(|p| p.parent().map(std::path::Path::to_path_buf));
                let requested_workspace = arguments.get("workspaceId").and_then(Value::as_str);
                let local_workspace = domain::dispatch(root,"workspace.get",json!({}));
                let valid_workspace = local_workspace.as_ref().ok()
                    .and_then(|workspace|workspace.get("id")).and_then(Value::as_str)
                    .zip(requested_workspace).is_some_and(|(local,requested)|local==requested);
                match resource_dir {
                    _ if !valid_workspace => Err("Unknown local workspace".into()),
                    Some(path) => {
                        gigi_desktop_lib::integrations::dispatch(&path, root, operation, arguments)
                    }
                    None => Err("MCP resource directory unavailable".into()),
                }
            } else {
                domain::dispatch(root, operation, arguments)
            };
            match outcome {
                Ok(value) => {
                    if let Err(error) = record_tool_use(root, name) {
                        eprintln!("GiGi tool receipt unavailable: {error}");
                    }
                    let mut result = json!({"content":[{"type":"text","text":value.to_string()}],"isError":false});
                    // MCP structuredContent must be an object; empty workspaces return null.
                    if value.is_object() { result["structuredContent"] = value; }
                    result
                }
                Err(message) => json!({"content":[{"type":"text","text":message}],"isError":true}),
            }
        }
        _ => {
            return Some(
                json!({"jsonrpc":"2.0","id":id,"error":{"code":-32601,"message":"method not found"}}),
            )
        }
    };
    Some(json!({"jsonrpc":"2.0","id":id,"result":result}))
}

fn read_frame(reader: &mut impl BufRead) -> io::Result<Option<Result<Vec<u8>, ()>>> {
    const MAX: usize = 1_000_000;
    let mut bytes=Vec::new();
    let count=(&mut *reader).take((MAX+1) as u64).read_until(b'\n',&mut bytes)?;
    if count==0 {return Ok(None);}
    if bytes.len()>MAX {
        if bytes.last()!=Some(&b'\n') {reader.skip_until(b'\n')?;}
        return Ok(Some(Err(())));
    }
    Ok(Some(Ok(bytes)))
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let root = data_dir()?;
    let stdin = io::stdin();
    let mut stdout = io::stdout().lock();
    let mut reader=stdin.lock();
    while let Some(frame) = read_frame(&mut reader)? {
        let Ok(line) = frame else {
            writeln!(
                stdout,
                "{}",
                json!({"jsonrpc":"2.0","id":null,"error":{"code":-32600,"message":"request too large"}})
            )?;
            stdout.flush()?;
            continue;
        };
        let request: Value = match serde_json::from_slice(&line) {
            Ok(value) => value,
            Err(_) => {
                writeln!(
                    stdout,
                    "{}",
                    json!({"jsonrpc":"2.0","id":null,"error":{"code":-32700,"message":"invalid JSON"}})
                )?;
                stdout.flush()?;
                continue;
            }
        };
        if let Some(response) = reply(&root, &request) {
            writeln!(stdout, "{response}")?;
            stdout.flush()?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn oversized_frame_is_discarded_without_losing_next_request() {
        let mut bytes=vec![b'x';1_000_100];bytes.extend_from_slice(b"\n{}\n");
        let mut reader=std::io::Cursor::new(bytes);
        assert!(read_frame(&mut reader).unwrap().unwrap().is_err());
        assert_eq!(read_frame(&mut reader).unwrap().unwrap().unwrap(),b"{}\n");
        assert!(read_frame(&mut reader).unwrap().is_none());
    }
    #[test]
    fn exposes_bounded_tools_and_rejects_arbitrary_names() {
        let listed = reply(
            std::path::Path::new("/unused"),
            &json!({"jsonrpc":"2.0","id":1,"method":"tools/list"}),
        )
        .unwrap();
        assert_eq!(listed["result"]["tools"].as_array().unwrap().len(), 11);
        assert_eq!(
            listed["result"]["tools"][3]["inputSchema"]["properties"]["limit"]["type"],
            "integer"
        );
        let denied = reply(std::path::Path::new("/unused"), &json!({"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"run_sql","arguments":{"sql":"DROP TABLE gigs"}}})).unwrap();
        assert_eq!(denied["error"]["code"], -32602);
    }
    #[test]
    fn detail_is_discoverable_and_context_rejects_foreign_workspace() {
        assert_eq!(schema("records.get")["properties"]["detail"]["enum"], json!(["summary", "full"]));
        let root = std::env::temp_dir().join(format!("gigi-mcp-scope-{}", uuid::Uuid::new_v4()));
        domain::dispatch(&root,"workspace.create",json!({"name":"Owner"})).unwrap();
        let response=reply(&root,&json!({"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"gigi_context_search","arguments":{"workspaceId":"foreign","query":"music"}}})).unwrap();
        assert_eq!(response["result"]["isError"],true);
        assert!(response["result"]["content"][0]["text"].as_str().unwrap().contains("workspace"));
        fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn records_tool_use_only_after_successful_call() {
        let root = std::env::temp_dir().join(format!("gigi-mcp-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        reply(
            &root,
            &json!({"jsonrpc":"2.0","id":1,"method":"initialize"}),
        );
        assert!(!root.join("agent-last-call.json").exists());
        let denied=reply(&root,&json!({"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"gigi_backup_restore","arguments":{"backupId":"x"}}})).unwrap();
        assert_eq!(denied["error"]["code"], -32602);
        let created=reply(&root,&json!({"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"gigi_workspace_create","arguments":{"name":"Solo"}}})).unwrap();
        assert_eq!(created["result"]["isError"], false);
        let receipt: Value =
            serde_json::from_slice(&fs::read(root.join("agent-last-call.json")).unwrap()).unwrap();
        assert_eq!(receipt["tool"], "gigi_workspace_create");
        let _ = fs::remove_dir_all(root);
    }
}
