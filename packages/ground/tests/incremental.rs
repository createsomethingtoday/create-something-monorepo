use ground::computations::{derived_cache, find_dead_exports};
use std::fs;
#[test]
fn repeated_graph_queries_reuse_only_current_source() {
    let dir = tempfile::tempdir().unwrap();
    let module = dir.path().join("lib.ts");
    let consumer = dir.path().join("use.ts");
    fs::write(
        &module,
        "export const first = 1;\nexport const other = 2;\n",
    )
    .unwrap();
    fs::write(&consumer, "import { first } from './lib';").unwrap();
    let names = || {
        find_dead_exports(&module, dir.path())
            .unwrap()
            .dead_exports
            .into_iter()
            .map(|e| e.name)
            .collect::<Vec<_>>()
    };
    assert_eq!(names(), vec!["other"]);
    let before = derived_cache::stats();
    assert_eq!(names(), vec!["other"]);
    assert!(derived_cache::stats().graph_hits > before.graph_hits);
    fs::write(&consumer, "import { other } from './lib';").unwrap();
    assert_eq!(names(), vec!["first"]);
    fs::remove_file(&consumer).unwrap();
    assert_eq!(names(), vec!["first", "other"]);
    fs::write(&consumer, "import {").unwrap();
    assert!(find_dead_exports(&module, dir.path()).is_err());
    fs::write(&consumer, "import { first } from './lib';").unwrap();
    assert_eq!(names(), vec!["other"]);
}

#[test]
fn package_resolution_and_worktrees_are_fresh() {
    let dir = tempfile::tempdir().unwrap();
    let other = tempfile::tempdir().unwrap();
    for root in [dir.path(), other.path()] {
        fs::write(
            root.join("package.json"),
            r#"{"name":"@test/source","exports":"./lib.ts"}"#,
        )
        .unwrap();
        fs::write(root.join("lib.ts"), "export const first = 1;").unwrap();
        fs::write(root.join("else.ts"), "export const first = 2;").unwrap();
        fs::write(root.join("use.ts"), "import { first } from '@test/source';").unwrap();
    }
    let count = |root: &std::path::Path| {
        find_dead_exports(&root.join("lib.ts"), root)
            .unwrap()
            .dead_exports
            .len()
    };
    assert_eq!(count(dir.path()), 0);
    assert_eq!(count(dir.path()), 0);
    fs::write(
        dir.path().join("package.json"),
        r#"{"name":"@test/source","exports":"./else.ts"}"#,
    )
    .unwrap();
    assert_eq!(count(dir.path()), 1);
    assert_eq!(count(other.path()), 0);
}

#[test]
fn discovery_and_mid_build_changes_never_cache_a_clean_graph() {
    use ground::computations::SymbolGraph;
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("a.ts");
    fs::write(&path, "export const first = 1;").unwrap();
    let callback = |_: usize, _: usize| {
        fs::write(&path, "export const other = 2;").unwrap();
    };
    assert!(SymbolGraph::build(dir.path(), Some(&callback)).is_err());
    assert_eq!(
        find_dead_exports(&path, dir.path()).unwrap().dead_exports[0].name,
        "other"
    );
    assert!(SymbolGraph::build(&dir.path().join("missing"), None).is_err());
    #[cfg(unix)]
    {
        std::os::unix::fs::symlink(dir.path(), dir.path().join("cycle")).unwrap();
        assert!(SymbolGraph::build(dir.path(), None).is_err());
    }
}

// Linux filesystems support byte names that macOS APFS refuses to create.
#[cfg(target_os = "linux")]
#[test]
fn non_utf8_paths_do_not_make_cache_enabled_analysis_fail() {
    use std::ffi::OsString;
    use std::os::unix::ffi::OsStringExt;
    let dir = tempfile::tempdir().unwrap();
    let scope = dir.path().join(OsString::from_vec(vec![b's', 0xff]));
    fs::create_dir(&scope).unwrap();
    let module = scope.join("lib.ts");
    fs::write(&module, "export const first = 1;").unwrap();
    fs::write(
        scope.join(OsString::from_vec(vec![0xfe, b'.', b't', b's'])),
        "import { first } from './lib';",
    )
    .unwrap();
    for _ in 0..2 {
        assert!(find_dead_exports(&module, &scope)
            .unwrap()
            .dead_exports
            .is_empty());
    }
}
