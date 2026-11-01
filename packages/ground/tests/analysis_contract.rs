use ground::{VerifiedTriad, mcp::{handle_tool_call, analysis_outcome}};
use serde_json::{json, Value};
use std::{fs, process::Command};
use tempfile::tempdir;

#[test]
fn mcp_validates_every_requested_check_before_running() {
    let dir = tempdir().unwrap();
    let mut triad = VerifiedTriad::new(dir.path().join("db")).unwrap();
    for tool in ["ground_analyze", "ground_diff"] {
        for checks in [json!([]), json!(null), json!("duplicates"), json!([42]), json!(["typo"]), json!(["duplicates", "typo"])] {
            let result = handle_tool_call(&mut triad, tool, &json!({"directory": dir.path(), "checks": checks}));
            assert!(!result.success, "accepted {tool}: {checks}");
            assert!(result.error.unwrap().contains("check"));
        }
    }
    let report = handle_tool_call(&mut triad, "ground_analyze", &json!({"directory":dir.path()}));
    assert!(report.success);
    assert_eq!(report.content["checks_run"], json!(["duplicates", "orphans"]));
}

#[test]
fn mixed_findings_and_execution_failure_remain_incomplete() {
    let dir = tempdir().unwrap();
    let source = "export function same(input: number) {\n const a = input + 1;\n const b = a * 2;\n return b;\n}\n";
    fs::write(dir.path().join("a.ts"), source).unwrap();
    fs::write(dir.path().join("b.ts"), source).unwrap();
    let mut triad = VerifiedTriad::new(dir.path().join("db")).unwrap();
    let report = handle_tool_call(&mut triad, "ground_analyze", &json!({
        "directory": dir.path(), "checks": ["duplicates", "environment"], "entry_points": ["missing.ts"]
    })).content;
    assert_eq!(report["coverage"]["duplicates"]["scan_complete"], true);
    assert!(!report["findings"]["duplicates"].as_array().unwrap().is_empty());
    assert_eq!(report["outcome"], "INCOMPLETE");
    assert_eq!(report["coverage"]["environment"]["scan_complete"], false);
    for report in [json!({}), json!({"checks_run":["duplicates"],"coverage":{}}),
        json!({"checks_run":["duplicates"],"coverage":{"duplicates":{"status":"PASS"}}})] {
        assert_eq!(analysis_outcome(&report), "INCOMPLETE");
    }
}

#[test]
fn diff_defaults_and_no_change_outcome_agree_across_cli_and_mcp() {
    let dir = tempdir().unwrap();
    let git = |args: &[&str]| {
        let output = Command::new("git").args(args).current_dir(dir.path())
            .env("GIT_AUTHOR_NAME", "Ground Test").env("GIT_AUTHOR_EMAIL", "ground@example.test")
            .env("GIT_COMMITTER_NAME", "Ground Test").env("GIT_COMMITTER_EMAIL", "ground@example.test")
            .output().unwrap();
        assert!(output.status.success(), "{}", String::from_utf8_lossy(&output.stderr));
    };
    git(&["init", "-q"]);
    fs::write(dir.path().join("a.ts"), "export const value = 1;\n").unwrap();
    git(&["add", "."]); git(&["-c", "core.hooksPath=/dev/null", "commit", "-qm", "fixture"]);
    let db_dir = tempdir().unwrap();
    let mut triad = VerifiedTriad::new(db_dir.path().join("db")).unwrap();
    let mcp = handle_tool_call(&mut triad, "ground_diff", &json!({"directory":dir.path(), "base":"HEAD"}));
    assert_eq!(mcp.content["checks_run"], json!(["duplicates"]));
    assert_eq!(mcp.content["outcome"], "NOT_APPLICABLE");
    let cli = |extra: &[&str]| Command::new(env!("CARGO_BIN_EXE_ground"))
        .arg("--db").arg(db_dir.path().join("cli.db")).arg("diff").arg(dir.path())
        .args(["--base", "HEAD"]).args(extra).output().unwrap();
    let output = cli(&[]);
    assert_eq!(output.status.code(), Some(3));
    let report: Value = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(report["outcome"], mcp.content["outcome"]);
    fs::write(dir.path().join("a.ts"), "export const value = 2;\n").unwrap();
    let output = cli(&["--checks", "duplicates,orphans"]);
    assert_eq!(output.status.code(), Some(0));
    let report: Value = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(report["check_coverage"]["orphans"]["status"], "NOT_APPLICABLE");
    assert_eq!(report["outcome"], "CLEAN");
    fs::write(dir.path().join("broken.ts"), "export function broken( {").unwrap();
    assert_eq!(cli(&[]).status.code(), Some(2));
    assert!(!cli(&["--checks", "environment", "--advisory"]).status.success());
    fs::remove_file(dir.path().join("broken.ts")).unwrap();
    let duplicate = "export function same(x: number) {\n const a = x + 1;\n const b = a * 2;\n return b;\n}\n";
    fs::write(dir.path().join("a.ts"), duplicate).unwrap();
    fs::write(dir.path().join("b.ts"), duplicate).unwrap();
    fs::write(dir.path().join("new.py"), "def f(): return 1\n").unwrap();
    let output = cli(&[]);
    let report: Value = serde_json::from_slice(&output.stdout).unwrap();
    assert!(report["total_new_issues"].as_u64().unwrap() > 0);
    assert_eq!(report["outcome"], "INCOMPLETE");
    assert_eq!(output.status.code(), Some(2));
}

#[test]
fn native_path_globs_match_the_shared_wrapper_contract() {
    let fixtures: Vec<Value> = serde_json::from_str(include_str!("fixtures/path-globs.json")).unwrap();
    for fixture in fixtures {
        let pattern = glob::Pattern::new(fixture["pattern"].as_str().unwrap());
        if fixture["invalid"] == true { assert!(pattern.is_err(), "{fixture}"); }
        else { assert_eq!(pattern.unwrap().matches(fixture["path"].as_str().unwrap()), fixture["matches"].as_bool().unwrap(), "{fixture}"); }
    }
}

#[test]
fn batch_orphan_ignores_use_analysis_relative_paths_and_literal_bracket_escapes() {
    let dir = tempdir().unwrap();
    for folder in ["routes/[id]", "routes/i"] {
        fs::create_dir_all(dir.path().join(folder)).unwrap();
        fs::write(dir.path().join(folder).join("a.ts"), "export const unused = 1;\n").unwrap();
    }
    let mut triad = VerifiedTriad::new(dir.path().join("db")).unwrap();
    for (pattern, remaining) in [("routes/[[]id]/**", "routes/i/a.ts"), ("routes/[id]/**", "routes/[id]/a.ts")] {
        fs::write(dir.path().join(".ground.yml"), format!("ignore:\n  paths: ['{pattern}']\n")).unwrap();
        let result = handle_tool_call(&mut triad, "ground_analyze", &json!({"directory":dir.path(),"checks":["orphans"]}));
        assert!(result.success, "{:?}", result.error);
        let orphans = result.content["findings"]["orphans"].as_array().unwrap();
        assert_eq!(orphans.len(), 1, "{}", result.content);
        assert!(orphans[0]["path"].as_str().unwrap().ends_with(remaining));
    }
}

#[test]
fn duplicate_tool_rejects_invalid_threshold_overrides() {
    let dir = tempdir().unwrap();
    let mut triad = VerifiedTriad::new(dir.path().join("db")).unwrap();
    for field in ["threshold", "intra_file_threshold"] {
        for value in [json!(1.01), json!(-0.1), json!("0.8"), json!(null)] {
            let mut args = json!({"directory":dir.path()}); args[field] = value;
            let result = handle_tool_call(&mut triad, "ground_find_duplicate_functions", &args);
            assert!(!result.success, "accepted {args}");
            assert!(result.error.unwrap().contains(field));
        }
    }
}

#[test]
fn invalid_policy_blocks_even_an_unchanged_diff() {
    let dir = tempdir().unwrap();
    let git = |args: &[&str]| assert!(Command::new("git").args(args).current_dir(dir.path()).output().unwrap().status.success());
    git(&["init", "-q"]);
    git(&["-c", "user.name=Fixture", "-c", "user.email=fixture@example.test", "-c", "core.hooksPath=/dev/null", "commit", "--allow-empty", "-qm", "fixture"]);
    fs::write(dir.path().join(".gitignore"), "*\n").unwrap();
    fs::write(dir.path().join(".ground.yml"), "version: '999'\n").unwrap();
    let mut triad = VerifiedTriad::new(dir.path().join("db")).unwrap();
    let result = handle_tool_call(&mut triad, "ground_diff", &json!({"directory":dir.path(),"base":"HEAD"}));
    assert!(!result.success);
    assert!(result.error.unwrap().contains("version"));
}
