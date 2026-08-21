use std::fs;
use std::process::Command;

use serde_json::Value;
use tempfile::tempdir;

#[test]
fn find_orphans_uses_canonical_wrangler_entry_point_evidence() {
    let directory = tempdir().unwrap();
    let worker_directory = directory.path().join("apps/worker");
    fs::create_dir_all(&worker_directory).unwrap();
    fs::write(
        worker_directory.join("wrangler.json"),
        r#"{"main":"worker.mjs"}"#,
    )
    .unwrap();
    fs::write(worker_directory.join("worker.mjs"), "export default {}\n").unwrap();

    let output = Command::new(env!("CARGO_BIN_EXE_ground"))
        .arg("--db")
        .arg(directory.path().join("registry.db"))
        .arg("find")
        .arg("orphans")
        .arg(directory.path())
        .output()
        .unwrap();

    assert!(
        output.status.success(),
        "stderr: {}\nstdout: {}",
        String::from_utf8_lossy(&output.stderr),
        String::from_utf8_lossy(&output.stdout),
    );

    let report: Value = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(report["verification_status"], "PASS");
    assert_eq!(report["summary"]["total_issues"], 0);
    assert!(report["coverage"]["orphans"]["entry_point_evidence"]
        .as_array()
        .unwrap()
        .iter()
        .any(|entry| {
            entry["relative_path"] == "apps/worker/worker.mjs"
                && entry["entry_point_type"] == "Cloudflare Worker"
                && entry["source"]
                    .as_str()
                    .unwrap_or_default()
                    .contains("wrangler.json main")
        }));
}
