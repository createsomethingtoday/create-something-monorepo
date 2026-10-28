use ground::computations::{derived_cache, find_dead_exports};
use std::{fs, path::Path};

fn dead_names(module: &Path, scope: &Path) -> Vec<String> {
    let mut names: Vec<_> = find_dead_exports(module, scope)
        .unwrap()
        .dead_exports
        .into_iter()
        .map(|export| export.name)
        .collect();
    names.sort();
    names
}

// One test owns this integration binary's process-global cache toggle. Other
// integration binaries run in separate processes and cannot race these checks.
#[test]
fn full_scope_graph_reuse_survives_at_and_above_parse_capacity() {
    for count in [511, 512, 513, 520] {
        let dir = tempfile::tempdir().unwrap();
        let module = dir.path().join("lib.ts");
        let consumer = dir.path().join("use.ts");
        fs::write(&module, "export const first = 1; export const other = 2;").unwrap();
        fs::write(&consumer, "import { first } from './lib';").unwrap();
        for i in 2..count {
            fs::write(
                dir.path().join(format!("f{i}.ts")),
                "export const filler = 1;",
            )
            .unwrap();
        }
        derived_cache::set_enabled(false);
        derived_cache::set_enabled(true);
        assert_eq!(dead_names(&module, dir.path()), vec!["other"]);
        for _ in 0..2 {
            let before = derived_cache::stats();
            assert_eq!(dead_names(&module, dir.path()), vec!["other"]);
            let after = derived_cache::stats();
            assert!(
                after.graph_hits > before.graph_hits,
                "{count}-file graph must survive post-graph parse churn"
            );
            assert!(after.entries <= after.max_entries);
            assert!(after.payload_bytes <= after.max_payload_bytes);
        }
        // A retained graph remains derived: content changes invalidate it.
        fs::write(&consumer, "import { other } from './lib';").unwrap();
        let before = derived_cache::stats().graph_hits;
        let warm = dead_names(&module, dir.path());
        assert_eq!(warm, vec!["first"]);
        assert_eq!(derived_cache::stats().graph_hits, before);
        derived_cache::set_enabled(false);
        assert_eq!(dead_names(&module, dir.path()), warm);
        let disabled = derived_cache::stats();
        assert!(!disabled.enabled);
        assert_eq!(disabled.entries, 0);
        assert_eq!(disabled.payload_bytes, 0);
        assert_eq!(disabled.graph_hits, 0);
    }
    derived_cache::set_enabled(true);
}
