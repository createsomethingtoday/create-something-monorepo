use ground::computations::{function_dry::extract_functions, imports::{extract_imports, extract_exports}};
use std::fs;
use tempfile::tempdir;

#[test]
fn valid_generic_import_types_preserve_functions_and_original_source() {
    let dir = tempdir().unwrap();
    for ext in ["ts", "tsx", "svelte"] {
        let source = "import { value } from './dep';\ntype Child = import('svelte').Snippet<[string]>;\ninterface Props { panel: import('svelte').Snippet<[number]>; icon?: import('svelte').Snippet<[string]>; }\nexport function useValue(input: number): import('svelte').Snippet<[string]> {\n const result = value(input);\n return result;\n}\n";
        let source = if ext == "svelte" { format!("<script module lang=\"ts\">\n{source}</script><p>ok</p>") } else { source.to_string() };
        let file = dir.path().join(format!("fixture.{ext}")); fs::write(&file, &source).unwrap();
        let functions = extract_functions(&file).unwrap();
        assert_eq!(functions.len(), 1);
        assert!(functions[0].source.contains("import('svelte').Snippet<[string]>"));
        assert_eq!(functions[0].start_line, if ext == "svelte" { 5 } else { 4 });
        assert_eq!(extract_imports(&file).unwrap()[0].source, "./dep");
        assert!(extract_exports(&file).unwrap().iter().any(|e| e.name == "useValue"));
        assert_eq!(fs::read_to_string(file).unwrap(), source);
    }
}

#[test]
fn commented_script_tags_are_not_executable_scripts() {
    let dir = tempdir().unwrap(); let file = dir.path().join("Component.svelte");
    fs::write(&file, "<!-- <script>not valid javascript !!!</script> -->\n<script module lang=\"ts\">\nimport { value } from './dep';\nexport function calculate(input: number) { return value(input); }\n</script><p>ok</p>").unwrap();
    let functions = extract_functions(&file).unwrap();
    assert_eq!(functions.len(), 1); assert_eq!(functions[0].start_line, 4);
    assert_eq!(extract_imports(&file).unwrap()[0].source, "./dep");
    assert!(extract_exports(&file).unwrap().iter().any(|e| e.name == "calculate"));
}

#[test]
fn compatibility_does_not_accept_malformed_generics_or_change_runtime_imports() {
    let dir = tempdir().unwrap(); let file = dir.path().join("fixture.ts");
    for source in ["type Bad = import('svelte').Snippet<[string];", "type Bad = import(foo).Snippet<[string]>;", "type Child = import('svelte').Snippet<[string]>;\nexport function broken( {", "type Child = import('svelte').Snippet<>;"] {
        fs::write(&file, source).unwrap();
        assert!(extract_functions(&file).is_err(), "malformed source accepted: {source}");
        assert!(extract_imports(&file).is_err());
    }
    let source = "export function calculate() { return import('svelte').Snippet<[string]>; }";
    fs::write(&file, source).unwrap();
    assert_eq!(extract_functions(&file).unwrap()[0].source, source.strip_prefix("export ").unwrap());
}

#[test]
fn script_mentions_without_a_real_script_are_not_imports() {
    let dir = tempdir().unwrap(); let file = dir.path().join("Component.svelte");
    for source in ["<!-- <script>not valid javascript !!!</script> --><p>ok</p>",
        "<p title=\"<script>\">ok</p>", "<style>p::after { content: '<script>'; }</style><p>ok</p>"] {
        fs::write(&file, source).unwrap();
        assert!(extract_functions(&file).unwrap().is_empty());
        assert!(extract_imports(&file).unwrap().is_empty());
        assert!(extract_exports(&file).unwrap().is_empty());
    }
}

#[test]
fn typeof_import_call_arguments_preserve_source_and_exports() {
    let dir = tempdir().unwrap();
    for ext in ["ts", "tsx", "svelte"] {
        let body = "import { value } from './dep';\nexport async function load(original: <T>() => Promise<T>) {\n return await original<typeof import('./module')>();\n}\n";
        let source = if ext == "svelte" { format!("<script module lang=\"ts\">\n{body}</script>") } else { body.to_string() };
        let file = dir.path().join(format!("loader.{ext}"));
        fs::write(&file, &source).unwrap();
        let functions = extract_functions(&file).unwrap();
        assert_eq!(functions.len(), 1);
        assert!(functions[0].source.contains("original<typeof import('./module')>()"));
        assert_eq!(functions[0].start_line, if ext == "svelte" { 3 } else { 2 });
        assert_eq!(extract_imports(&file).unwrap()[0].source, "./dep");
        assert!(extract_exports(&file).unwrap().iter().any(|export| export.name == "load"));
        assert_eq!(fs::read_to_string(file).unwrap(), source);
    }
}

#[test]
fn typeof_import_recovery_is_bounded_by_call_type_context() {
    let dir = tempdir().unwrap();
    let file = dir.path().join("fixture.ts");
    for body in [
        "return original<Promise<typeof import('./module')>>();",
        "return original<[typeof import('./module'), string]>();",
        "return original<typeof import('./one') | typeof import('./two')>();",
        "const query: typeof import('./module') = value; return query;",
        "return typeof import('./module');",
        "return original < typeof import('./module')();",
        "return a < typeof import('./module') > b;",
    ] {
        let source = format!("export function load() {{ {body} }}");
        fs::write(&file, &source).unwrap();
        let functions = extract_functions(&file).unwrap_or_else(|error| panic!("{source}: {error}"));
        assert_eq!(functions[0].source, source.strip_prefix("export ").unwrap());
        assert!(extract_imports(&file).is_ok());
    }
    for source in [
        "export function load() { return original<typeof import(foo)>(); }",
        "export function load() { return original<typeof import('./one', './two')>(); }",
        "export function load() { return original<typeof import('./one', { with: {} })>(); }",
        "export function load() { return original<typeof import('./one')>(); ",
        "export function load() { return original<typeof import('./one')>(; }",
        "export function load() { return typeof import('./module'); } const broken = ;",
        "export function load() { return a < typeof import('./module') > b; } const broken = ;",
    ] {
        fs::write(&file, source).unwrap();
        assert!(extract_functions(&file).is_err(), "malformed or unsupported import form accepted: {source}");
        assert!(extract_imports(&file).is_err(), "malformed or unsupported import form accepted: {source}");
    }
}
