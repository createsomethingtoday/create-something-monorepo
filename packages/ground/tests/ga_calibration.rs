use std::fs;
use std::path::Path;

use ground::{mcp::handle_tool_call, VerifiedTriad};
use serde_json::{json, Value};
use tempfile::tempdir;

fn call(root: &Path, tool: &str, arguments: Value) -> Value {
    let mut ground = VerifiedTriad::new(&root.join("ground-calibration.db")).unwrap();
    let result = handle_tool_call(&mut ground, tool, &arguments);
    assert!(result.success, "{} failed: {:?}", tool, result.error);
    result.content
}

fn assert_duplicate(extension: &str, contents: &str, expected_function: &str) {
    let directory = tempdir().unwrap();
    fs::write(
        directory.path().join(format!("primary.{extension}")),
        contents,
    )
    .unwrap();
    fs::write(
        directory.path().join(format!("secondary.{extension}")),
        contents,
    )
    .unwrap();
    let content = call(
        directory.path(),
        "ground_analyze",
        json!({"directory": directory.path(), "checks": ["duplicates"]}),
    );
    let findings = content["findings"]["duplicates"].as_array().unwrap();
    assert_eq!(findings.len(), 1, "{content:#}");
    assert_eq!(findings[0]["function"], expected_function);
}

fn assert_orphan(extension: &str, entry_contents: &str, orphan_contents: &str) {
    let directory = tempdir().unwrap();
    let source = directory.path().join("src");
    fs::create_dir_all(&source).unwrap();
    fs::write(
        directory.path().join("package.json"),
        format!(r#"{{"main":"src/index.{extension}"}}"#),
    )
    .unwrap();
    fs::write(source.join(format!("index.{extension}")), entry_contents).unwrap();
    fs::write(source.join(format!("unused.{extension}")), orphan_contents).unwrap();
    let content = call(
        directory.path(),
        "ground_find_orphans",
        json!({"directory": directory.path()}),
    );
    let orphans = content["orphans"].as_array().unwrap();
    assert_eq!(orphans.len(), 1, "{content:#}");
    assert!(orphans[0]["path"]
        .as_str()
        .unwrap()
        .ends_with(&format!("src/unused.{extension}")));
}

fn assert_dead_export(extension: &str, contents: &str, expected_export: &str) {
    let directory = tempdir().unwrap();
    let source = directory.path().join("src");
    fs::create_dir_all(&source).unwrap();
    let module = source.join(format!("library.{extension}"));
    fs::write(&module, contents).unwrap();
    let content = call(
        directory.path(),
        "ground_find_dead_exports",
        json!({"module_path": module, "search_scope": directory.path()}),
    );
    let dead = content["dead_exports"].as_array().unwrap();
    assert_eq!(dead.len(), 1, "{content:#}");
    assert_eq!(dead[0]["name"], expected_export);
}

#[test]
fn ga_duplicate_typescript_function_is_confirmed() {
    assert_duplicate(
        "ts",
        "export function normalizeLabel(value: string) {\n  const trimmed = value.trim();\n  if (!trimmed) return 'Unknown';\n  return trimmed.toUpperCase();\n}\n",
        "normalizeLabel",
    );
}

#[test]
fn ga_duplicate_tsx_function_is_confirmed() {
    assert_duplicate(
        "tsx",
        "export function renderLabel(value: string) {\n  const trimmed = value.trim();\n  if (!trimmed) return 'Unknown';\n  return trimmed.toUpperCase();\n}\n",
        "renderLabel",
    );
}

#[test]
fn ga_duplicate_javascript_function_is_confirmed() {
    assert_duplicate(
        "js",
        "export function normalizeSlug(value) {\n  const trimmed = value.trim();\n  if (!trimmed) return 'unknown';\n  return trimmed.toLowerCase();\n}\n",
        "normalizeSlug",
    );
}

#[test]
fn ga_duplicate_svelte_component_script_is_confirmed() {
    assert_duplicate(
        "svelte",
        "<script lang=\"ts\">\n  export function normalizeTitle(value: string) {\n    const trimmed = value.trim();\n    if (!trimmed) return 'Untitled';\n    return trimmed.toUpperCase();\n  }\n</script>\n<p>{normalizeTitle('ground')}</p>\n",
        "normalizeTitle",
    );
}

#[test]
fn ga_orphan_typescript_module_is_confirmed() {
    assert_orphan(
        "ts",
        "export const entry = 'ground';\n",
        "export const unused = 'orphan';\n",
    );
}

#[test]
fn ga_orphan_javascript_module_is_confirmed() {
    assert_orphan(
        "js",
        "export const entry = 'ground';\n",
        "export const unused = 'orphan';\n",
    );
}

#[test]
fn ga_orphan_svelte_component_is_confirmed() {
    let directory = tempdir().unwrap();
    let routes = directory.path().join("src/routes");
    let library = directory.path().join("src/lib");
    fs::create_dir_all(&routes).unwrap();
    fs::create_dir_all(&library).unwrap();
    fs::write(
        directory.path().join("svelte.config.js"),
        "export default {};\n",
    )
    .unwrap();
    fs::write(routes.join("+page.svelte"), "<h1>Ground</h1>\n").unwrap();
    fs::write(library.join("Unused.svelte"), "<p>Orphan</p>\n").unwrap();
    let content = call(
        directory.path(),
        "ground_find_orphans",
        json!({"directory": directory.path()}),
    );
    let orphans = content["orphans"].as_array().unwrap();
    assert_eq!(orphans.len(), 1, "{content:#}");
    assert!(orphans[0]["path"]
        .as_str()
        .unwrap()
        .ends_with("src/lib/Unused.svelte"));
}

#[test]
fn ga_dead_typescript_export_is_confirmed() {
    assert_dead_export(
        "ts",
        "export function unusedParser(value: string) { return value.trim(); }\n",
        "unusedParser",
    );
}

#[test]
fn ga_dead_javascript_export_is_confirmed() {
    assert_dead_export(
        "js",
        "export function unusedFormatter(value) { return value.trim(); }\n",
        "unusedFormatter",
    );
}

#[test]
fn ga_dead_svelte_module_export_is_confirmed() {
    assert_dead_export(
        "svelte",
        "<script context=\"module\" lang=\"ts\">\n  export function unusedLoader(value: string) { return value.trim(); }\n</script>\n<p>Ground</p>\n",
        "unusedLoader",
    );
}

#[test]
fn ga_svelte_instance_prop_is_not_a_dead_module_export() {
    let directory = tempdir().unwrap();
    let source = directory.path().join("src");
    fs::create_dir_all(&source).unwrap();
    let component = source.join("Card.svelte");
    fs::write(
        &component,
        "<script lang=\"ts\">\n  export let title: string;\n</script>\n<h2>{title}</h2>\n",
    )
    .unwrap();
    let content = call(
        directory.path(),
        "ground_find_dead_exports",
        json!({"module_path": component, "search_scope": directory.path()}),
    );
    assert_eq!(content["total_exports"], 0, "{content:#}");
    assert_eq!(
        content["dead_exports"].as_array().unwrap().len(),
        0,
        "{content:#}"
    );
}

#[test]
fn ga_used_typescript_export_is_not_dead() {
    let directory = tempdir().unwrap();
    let source = directory.path().join("src");
    fs::create_dir_all(&source).unwrap();
    let library = source.join("library.ts");
    fs::write(
        &library,
        "export function normalize(value: string) { return value.trim(); }\n",
    )
    .unwrap();
    fs::write(
        source.join("consumer.ts"),
        "import { normalize } from './library';\nconsole.log(normalize(' ground '));\n",
    )
    .unwrap();
    let content = call(
        directory.path(),
        "ground_find_dead_exports",
        json!({"module_path": library, "search_scope": directory.path()}),
    );
    assert_eq!(content["total_exports"], 1, "{content:#}");
    assert_eq!(
        content["dead_exports"].as_array().unwrap().len(),
        0,
        "{content:#}"
    );
}
