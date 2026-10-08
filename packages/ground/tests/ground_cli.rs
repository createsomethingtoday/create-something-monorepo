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

#[test]
fn doctor_reports_policy_and_workspace_provenance() {
    let directory = tempdir().unwrap();
    fs::write(directory.path().join("pnpm-workspace.yaml"), "packages:\n  - 'packages/*'\n").unwrap();
    fs::write(directory.path().join("package.json"), r#"{"name":"@create-something/monorepo"}"#).unwrap();
    fs::write(directory.path().join(".ground.yml"), "version: '1'\n").unwrap();
    fs::create_dir_all(directory.path().join("packages/example")).unwrap();
    fs::write(directory.path().join("packages/example/package.json"), r#"{"name":"@create-something/example"}"#).unwrap();

    let output = Command::new(env!("CARGO_BIN_EXE_ground"))
        .arg("doctor")
        .arg(directory.path())
        .arg("--json")
        .output()
        .unwrap();
    assert!(output.status.success(), "{}", String::from_utf8_lossy(&output.stderr));
    let report: Value = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(report["verification_status"], "PASS");
    assert_eq!(report["workspace"]["packages"], 1);
    assert_eq!(report["workspace"]["is_create_something"], true);
    assert_eq!(report["policy"]["sha256"].as_str().unwrap().len(), 64);
}

#[test]
fn doctor_fails_when_repository_policy_is_invalid() {
    let directory = tempdir().unwrap();
    fs::write(directory.path().join(".ground.yml"), "thresholds: [broken\n").unwrap();
    let output = Command::new(env!("CARGO_BIN_EXE_ground"))
        .arg("doctor")
        .arg(directory.path())
        .arg("--json")
        .output()
        .unwrap();
    assert!(!output.status.success());
    assert!(String::from_utf8_lossy(&output.stderr).contains("Parse error"));
}

#[test]
fn bounded_worker_option_reaches_duplicate_analysis() {
    let dir = tempdir().unwrap();
    fs::write(dir.path().join("a.ts"), "export function shared(x: number) {\n const value = x + 1;\n return value;\n}\n").unwrap();
    let run = |workers: &str| Command::new(env!("CARGO_BIN_EXE_ground"))
        .args(["--db"]).arg(dir.path().join("registry.db"))
        .arg("analyze").arg(dir.path())
        .args(["--checks", "duplicates", "--workers", workers]).output().unwrap();
    for workers in ["0", "1", "4"] {
        let output = run(workers);
        assert!(output.status.success(), "{}", String::from_utf8_lossy(&output.stderr));
        let value: Value = serde_json::from_slice(&output.stdout).unwrap();
        assert_eq!(value["coverage"]["duplicates"]["status"], "PASS");
    }
    assert!(!run("5").status.success());
}

fn run_analysis(directory: &std::path::Path, flags: &[&str]) -> std::process::Output {
    Command::new(env!("CARGO_BIN_EXE_ground"))
        .arg("--db").arg(directory.join("registry.db"))
        .arg("analyze").arg(directory).args(flags).output().unwrap()
}

#[test]
fn omitted_checks_run_defaults_and_unknown_or_empty_checks_fail() {
    let dir = tempdir().unwrap();
    fs::write(dir.path().join("a.ts"), "export const value = 1;\n").unwrap();
    let output = run_analysis(dir.path(), &[]);
    let report: Value = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(report["checks_run"], serde_json::json!(["duplicates", "orphans"]));
    assert!(report["coverage"]["duplicates"].is_object());
    for flags in [vec!["--checks", "typo"], vec!["--checks", ""], vec!["--checks", "typo", "--advisory"]] {
        let output = run_analysis(dir.path(), &flags);
        assert!(!output.status.success(), "invalid check accepted: {:?}", flags);
    }
}

#[test]
fn json_outcomes_have_distinct_exits_and_advisory_never_hides_invalid_checks() {
    let dir = tempdir().unwrap();
    let body = "export function same(x: number) {\n const a = x + 1;\n const b = a * 2;\n return b;\n}\n";
    fs::write(dir.path().join("a.ts"), body).unwrap();
    let assert_result = |flags: &[&str], exit, outcome| {
        let output = run_analysis(dir.path(), flags);
        let report: Value = serde_json::from_slice(&output.stdout).unwrap();
        assert_eq!(report["outcome"], outcome, "{}", report);
        assert_eq!(output.status.code(), Some(exit), "{}", report);
    };
    assert_result(&["--checks", "duplicates"], 0, "CLEAN");
    fs::write(dir.path().join("b.ts"), body).unwrap();
    assert_result(&["--checks", "duplicates"], 1, "FINDINGS");
    assert_result(&["--checks", "duplicates", "--advisory"], 0, "FINDINGS");
    fs::write(dir.path().join("bad.ts"), "export function broken( {").unwrap();
    assert_result(&["--checks", "duplicates"], 2, "INCOMPLETE");
    assert_result(&["--checks", "duplicates", "--advisory"], 0, "INCOMPLETE");
    fs::remove_file(dir.path().join("bad.ts")).unwrap();
    assert_result(&["--checks", "duplicates", "--timeout-ms", "0"], 2, "INCOMPLETE");
    assert_result(&["--checks", "duplicates,environment"], 2, "INCOMPLETE");
    assert_result(&["--checks", "dead_exports"], 2, "INCOMPLETE");
    fs::remove_file(dir.path().join("a.ts")).unwrap();
    fs::remove_file(dir.path().join("b.ts")).unwrap();
    assert_result(&["--checks", "duplicates"], 3, "NOT_APPLICABLE");
    assert!(!run_analysis(dir.path(), &["--checks", "typo", "--advisory"]).status.success());
}
