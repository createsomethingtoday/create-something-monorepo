//! Isolated synthetic UI test bridge; refuses non-memory operations and real roots.
use serde_json::{json, Value};
use std::io::{self, Read};
fn main() {
    let root = std::path::PathBuf::from(std::env::args().nth(1).expect("synthetic root"));
    assert!(
        root.starts_with(std::env::temp_dir())
            && root
                .file_name()
                .unwrap()
                .to_string_lossy()
                .starts_with("gigi-memory-ui-")
    );
    let mut raw = String::new();
    io::stdin().read_to_string(&mut raw).unwrap();
    let v: Value = serde_json::from_str(&raw).unwrap();
    let op = v["operation"].as_str().unwrap();
    let out = if op == "workspace.create" {
        gigi_desktop_lib::domain::dispatch(&root, op, json!({"name":"Synthetic memory UI"}))
    } else {
        assert!(op.starts_with("memory."));
        gigi_desktop_lib::domain::dispatch(&root, op, v["input"].clone())
    };
    println!(
        "{}",
        match out {
            Ok(value) => json!({"value":value}),
            Err(error) => json!({"error":error}),
        }
    );
}
