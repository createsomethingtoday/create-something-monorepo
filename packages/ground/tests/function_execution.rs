//! Public analysis parity and fresh-source contracts for bounded workers.
use ground::computations::{analyze_function_dry_with_options, FunctionDryOptions};
use serde_json::Value;
use std::{fs, path::PathBuf, time::Instant};
use tempfile::tempdir;

fn stable(mut value: Value) -> Value {
    match &mut value {
        Value::Object(map) => {
            map.remove("id");
            map.remove("computed_at");
            for v in map.values_mut() {
                *v = stable(v.take());
            }
        }
        Value::Array(items) => {
            for v in items {
                *v = stable(v.take());
            }
        }
        _ => {}
    }
    value
}
fn analyze(paths: &[PathBuf], workers: usize) -> Value {
    let options = FunctionDryOptions {
        max_workers: workers,
        detect_intra_file: true,
        ..Default::default()
    };
    stable(
        serde_json::to_value(analyze_function_dry_with_options(paths, 0.8, &options).unwrap())
            .unwrap(),
    )
}
#[test]
fn bounded_workers_preserve_results_and_read_current_source() {
    let dir = tempdir().unwrap();
    let other = tempdir().unwrap();
    let mut paths = vec![];
    for i in 0..40 {
        let p = dir.path().join(format!("{i}.ts"));
        fs::write(&p,format!("export function shared(x: number) {{ return x + 1; }}\nexport function unique{i}(x: number) {{ return x + 1; }}\n")).unwrap();
        paths.push(p);
    }
    let serial = analyze(&paths, 1);
    assert!(!serial["duplicates"].as_array().unwrap().is_empty());
    for workers in [2, 4, usize::MAX] {
        assert_eq!(analyze(&paths, workers), serial);
    }
    fs::write(&paths[0], "export function changed() { return false; }\n").unwrap();
    let changed = analyze(&paths, 4);
    assert_ne!(changed, serial);
    assert_eq!(changed, analyze(&paths, 1));
    // A same-size replacement models switching revisions without trusting mtime.
    fs::write(&paths[0], "export function renamed() { return false; }\n").unwrap();
    assert_eq!(analyze(&paths, 4), analyze(&paths, 1));
    let removed = paths.remove(1);
    fs::remove_file(&removed).unwrap();
    assert_eq!(analyze(&paths, 4), analyze(&paths, 1));
    let isolated = other.path().join("0.ts");
    fs::write(&isolated, "export function independent() { return true; }").unwrap();
    assert!(analyze(&[isolated], 4)["duplicates"]
        .as_array()
        .unwrap()
        .is_empty());
    fs::write(&paths[4], "export function broken( {").unwrap();
    for workers in [1, 4] {
        assert!(analyze_function_dry_with_options(
            &paths,
            0.8,
            &FunctionDryOptions {
                max_workers: workers,
                ..Default::default()
            }
        )
        .is_err());
    }
    assert!(analyze_function_dry_with_options(
        &paths,
        0.8,
        &FunctionDryOptions {
            max_workers: 4,
            deadline: Some(Instant::now()),
            ..Default::default()
        }
    )
    .is_err());
}

#[test]
fn exact_candidate_buckets_match_exhaustive_pairs_including_focus() {
    use ground::computations::{
        analyze_function_dry_focused_with_options, compare_functions, extract_functions,
    };
    use std::collections::HashSet;
    let dir = tempdir().unwrap();
    let mut paths = vec![];
    for i in 0..12 {
        let p = dir.path().join(format!("{i}.ts"));
        fs::write(&p,format!("function shared(x: number) {{ return x + {}; }}\nfunction other(x: number) {{ return x + {}; }}\nfunction unique{i}() {{ return true; }}",i%3,i%2)).unwrap();
        paths.push(p);
    }
    let all: Vec<_> = paths
        .iter()
        .flat_map(|p| {
            extract_functions(p)
                .unwrap()
                .into_iter()
                .map(move |f| (p.clone(), f))
        })
        .collect();
    for threshold in [0.0, 0.8, 0.85, 1.0] {
        for focused in [false, true] {
            let focus: HashSet<_> = [paths[2].clone(), paths[9].clone()].into();
            let options = FunctionDryOptions {
                max_workers: 4,
                detect_intra_file: true,
                intra_file_threshold: Some(threshold),
                ..Default::default()
            };
            let report = if focused {
                analyze_function_dry_focused_with_options(&paths, &focus, threshold, &options)
            } else {
                analyze_function_dry_with_options(&paths, threshold, &options)
            }
            .unwrap();
            let mut inter = vec![];
            let mut intra = vec![];
            for i in 0..all.len() {
                for j in 0..all.len() {
                    if focused {
                        if !focus.contains(&all[i].0)
                            || i == j
                            || (focus.contains(&all[j].0) && j < i)
                        {
                            continue;
                        }
                    } else if j <= i {
                        continue;
                    }
                    let (pa, a) = &all[i];
                    let (pb, b) = &all[j];
                    let score = compare_functions(a, b);
                    if score < threshold {
                        continue;
                    }
                    if pa != pb && a.name == b.name {
                        inter.push((pa.clone(), pb.clone(), a.name.clone(), score));
                    }
                    if pa == pb && a.name != b.name {
                        intra.push((pa.clone(), a.name.clone(), b.name.clone(), score));
                    }
                }
            }
            let actual: Vec<_> = report
                .duplicates
                .into_iter()
                .map(|d| (d.file_a, d.file_b, d.function_name, d.similarity))
                .collect();
            let actual_intra: Vec<_> = report
                .intra_file_duplicates
                .into_iter()
                .map(|d| (d.file, d.function_a_name, d.function_b_name, d.similarity))
                .collect();
            assert_eq!(actual, inter);
            assert_eq!(actual_intra, intra);
        }
    }
}
