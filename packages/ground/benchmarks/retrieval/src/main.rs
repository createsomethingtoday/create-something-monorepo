//! Supporting benchmark only. Never used to decide verified absence.
use ground::computations::{
    function_dry::{compare_functions, extract_functions, ExtractedFunction},
    SymbolGraph,
};
use rayon::prelude::*;
use serde_json::json;
use sha2::{Digest, Sha256};
use std::{
    collections::{BTreeMap, HashMap},
    fs,
    path::{Path, PathBuf},
    time::Instant,
};
use tantivy::{
    collector::{Count, TopDocs},
    doc,
    query::TermQuery,
    schema::{IndexRecordOption, Schema, STORED, STRING, TEXT},
    Index, Term,
};
fn elapsed(t: Instant) -> f64 {
    t.elapsed().as_secs_f64() * 1000.0
}
fn files(p: &Path, out: &mut Vec<PathBuf>) -> anyhow::Result<()> {
    for e in fs::read_dir(p)? {
        let e = e?;
        let p = e.path();
        if e.file_type()?.is_symlink() {
            continue;
        }
        if p.is_dir() {
            if !matches!(
                e.file_name().to_str(),
                Some("node_modules" | "target" | "dist" | ".git" | ".svelte-kit")
            ) {
                files(&p, out)?;
            }
        } else if matches!(
            p.extension().and_then(|s| s.to_str()),
            Some("ts" | "tsx" | "js" | "jsx" | "svelte")
        ) {
            out.push(p);
        }
    }
    Ok(())
}
fn signature(v: &[(usize, ExtractedFunction)]) -> Vec<(usize, String, String)> {
    v.iter()
        .map(|(i, f)| (*i, f.name.clone(), f.normalized_body.clone()))
        .collect()
}
// Benchmark-only content-hash cache. Config-dependent graph state is not cached.
type ParseCache = HashMap<PathBuf, (Vec<u8>, Vec<ExtractedFunction>)>;
fn cached_parse(
    paths: &[PathBuf],
    cache: &mut ParseCache,
) -> anyhow::Result<(Vec<(usize, ExtractedFunction)>, usize)> {
    cache.retain(|path, _| paths.contains(path));
    let mut out = vec![];
    let mut reparsed = 0;
    for (i, path) in paths.iter().enumerate() {
        let hash = Sha256::digest(fs::read(path)?).to_vec();
        if cache.get(path).is_none_or(|(old, _)| *old != hash) {
            cache.insert(path.clone(), (hash, extract_functions(path)?));
            reparsed += 1;
        }
        out.extend(cache[path].1.iter().cloned().map(|f| (i, f)));
    }
    Ok((out, reparsed))
}
fn main() -> anyhow::Result<()> {
    ground::computations::derived_cache::set_enabled(false);
    let root =
        PathBuf::from(std::env::args().nth(1).expect("pass source directory")).canonicalize()?;
    let mut paths = vec![];
    files(&root, &mut paths)?;
    paths.sort();
    anyhow::ensure!(!paths.is_empty(), "empty corpus");
    let mut digest = Sha256::new();
    let mut bytes = 0;
    for p in &paths {
        let b = fs::read(p)?;
        bytes += b.len();
        digest.update(p.strip_prefix(&root)?.to_string_lossy().as_bytes());
        digest.update([0]);
        digest.update(&b);
        digest.update([0]);
    }
    let corpus_hash = format!("{:x}", digest.finalize());
    let mut runs = vec![];
    for _ in 0..3 {
        let t = Instant::now();
        let mut serial = vec![];
        let mut errors = vec![];
        for (i, p) in paths.iter().enumerate() {
            match extract_functions(p) {
                Ok(fs) => serial.extend(fs.into_iter().map(|f| (i, f))),
                Err(e) => errors.push(json!({"path":p.strip_prefix(&root)?,"error":e.to_string()})),
            }
        }
        let serial_ms = elapsed(t);
        let mut parallel = vec![];
        for workers in [2, 4] {
            let t = Instant::now();
            let pool = rayon::ThreadPoolBuilder::new()
                .num_threads(workers)
                .build()?;
            let results: Vec<_> =
                pool.install(|| paths.par_iter().map(|p| extract_functions(p)).collect());
            let mut parsed = vec![];
            let mut errs = 0;
            for (i, r) in results.into_iter().enumerate() {
                match r {
                    Ok(fs) => parsed.extend(fs.into_iter().map(|f| (i, f))),
                    Err(_) => errs += 1,
                }
            }
            let ms = elapsed(t);
            anyhow::ensure!(
                signature(&parsed) == signature(&serial) && errs == errors.len(),
                "parallel mismatch"
            );
            parallel.push(json!({"workers":workers,"ms_including_pool_start":ms,"parity":true}));
        }
        // Real parsed-output reuse prototype over an isolated copy. Every hit
        // reads/hashes bytes and clones output; no source checkout is modified.
        let cache_dir = tempfile::tempdir()?;
        let mut cache_paths = vec![];
        for p in &paths {
            let copy = cache_dir.path().join(p.strip_prefix(&root)?);
            fs::create_dir_all(copy.parent().unwrap())?;
            fs::copy(p, &copy)?;
            cache_paths.push(copy);
        }
        let mut cache = ParseCache::new();
        let t = Instant::now();
        let (cold, cold_parsed) = cached_parse(&cache_paths, &mut cache)?;
        let cache_cold_ms = elapsed(t);
        anyhow::ensure!(
            signature(&cold) == signature(&serial),
            "cache cold mismatch"
        );
        let t = Instant::now();
        let (warm, warm_parsed) = cached_parse(&cache_paths, &mut cache)?;
        let cache_warm_ms = elapsed(t);
        anyhow::ensure!(
            warm_parsed == 0 && signature(&warm) == signature(&serial),
            "cache warm mismatch"
        );
        let first = cache_paths[0].clone();
        let original = fs::read_to_string(&first)?;
        let suffix = if first.extension().is_some_and(|e| e == "svelte") {
            "\n<!-- cache revision a -->\n"
        } else {
            "\n// cache revision a\n"
        };
        fs::write(&first, format!("{original}{suffix}"))?;
        let t = Instant::now();
        let (_, edited_parsed) = cached_parse(&cache_paths, &mut cache)?;
        let cache_one_edit_ms = elapsed(t);
        anyhow::ensure!(edited_parsed == 1, "edit not invalidated");
        fs::write(
            &first,
            format!("{original}{}", suffix.replace("revision a", "revision b")),
        )?;
        let (_, replaced_parsed) = cached_parse(&cache_paths, &mut cache)?;
        anyhow::ensure!(
            replaced_parsed == 1,
            "same-size revision replacement not invalidated"
        );
        cache_paths.remove(0);
        fs::remove_file(&first)?;
        let _ = cached_parse(&cache_paths, &mut cache)?;
        anyhow::ensure!(!cache.contains_key(&first), "deleted path retained");
        // The original checkout is another worktree: path-keyed entries must miss.
        let (_, isolated_parsed) = cached_parse(&paths, &mut cache)?;
        anyhow::ensure!(
            isolated_parsed == paths.len(),
            "worktree paths shared cache entries"
        );
        let t = Instant::now();
        let mut baseline = vec![];
        for i in 0..serial.len() {
            for j in i + 1..serial.len() {
                if serial[i].0 != serial[j].0
                    && serial[i].1.name == serial[j].1.name
                    && compare_functions(&serial[i].1, &serial[j].1) >= 0.8
                {
                    baseline.push((i, j));
                }
            }
        }
        let all_pairs_ms = elapsed(t);
        let t = Instant::now();
        let mut groups: HashMap<&str, Vec<usize>> = HashMap::new();
        for (i, (_, f)) in serial.iter().enumerate() {
            groups.entry(&f.name).or_default().push(i);
        }
        let mut exact = vec![];
        for ids in groups.values() {
            for (n, &i) in ids.iter().enumerate() {
                for &j in &ids[n + 1..] {
                    if serial[i].0 != serial[j].0
                        && compare_functions(&serial[i].1, &serial[j].1) >= 0.8
                    {
                        exact.push((i, j));
                    }
                }
            }
        }
        exact.sort();
        let exact_bucket_ms = elapsed(t);
        anyhow::ensure!(exact == baseline, "exact buckets changed truth");
        let mut production = vec![];
        for workers in [1, 4] {
            let t = Instant::now();
            let options = ground::computations::FunctionDryOptions {
                max_workers: workers,
                ..Default::default()
            };
            let report =
                ground::computations::analyze_function_dry_with_options(&paths, 0.8, &options)?;
            let ms = elapsed(t);
            let mut actual = vec![];
            for d in report.duplicates {
                let i = serial
                    .iter()
                    .position(|(p, f)| {
                        paths[*p] == d.file_a
                            && f.start_line == d.function_a.start_line
                            && f.name == d.function_name
                    })
                    .unwrap();
                let j = serial
                    .iter()
                    .position(|(p, f)| {
                        paths[*p] == d.file_b
                            && f.start_line == d.function_b.start_line
                            && f.name == d.function_name
                    })
                    .unwrap();
                actual.push((i, j));
            }
            actual.sort();
            anyhow::ensure!(
                actual == baseline,
                "production differs from exhaustive reference"
            );
            production.push(
                json!({"workers":workers,"parse_and_compare_ms":ms,"exhaustive_parity":true}),
            );
        }
        let t = Instant::now();
        let graph = SymbolGraph::build(&root, None).map_err(anyhow::Error::msg)?;
        let graph_build_ms = elapsed(t);
        let t = Instant::now();
        let dead = graph.find_dead_exports();
        let graph_query_ms = elapsed(t);
        std::hint::black_box(dead);
        let tmp = tempfile::tempdir()?;
        let t = Instant::now();
        let mut schema = Schema::builder();
        let name = schema.add_text_field("name", STRING | STORED);
        let body = schema.add_text_field("body", TEXT);
        let schema = schema.build();
        let index = Index::create_in_dir(tmp.path(), schema)?;
        let mut writer = index.writer_with_num_threads(2, 30_000_000)?;
        for (_, f) in &serial {
            writer.add_document(doc!(name=>f.name.as_str(),body=>f.normalized_body.as_str()))?;
        }
        writer.commit()?;
        let reader = index.reader()?;
        let index_ms = elapsed(t);
        let searcher = reader.searcher();
        let t = Instant::now();
        let mut candidates = 0;
        let mut top10_omissions = 0;
        for (s, ids) in &groups {
            let q = TermQuery::new(Term::from_field_text(name, s), IndexRecordOption::Basic);
            let count = searcher.search(&q, &Count)?;
            anyhow::ensure!(count == ids.len(), "Tantivy exact candidate mismatch");
            candidates += count;
            let top = searcher.search(&q, &TopDocs::with_limit(10).order_by_score())?;
            top10_omissions += count - top.len();
        }
        let query_ms = elapsed(t);
        let t = Instant::now();
        writer.add_document(doc!(name=>"__ground_benchmark_update__",body=>"changed document"))?;
        writer.commit()?;
        reader.reload()?;
        let add_ms = elapsed(t);
        let q = TermQuery::new(
            Term::from_field_text(name, "__ground_benchmark_update__"),
            IndexRecordOption::Basic,
        );
        anyhow::ensure!(reader.searcher().search(&q, &Count)? == 1, "update missing");
        let t = Instant::now();
        writer.delete_term(Term::from_field_text(name, "__ground_benchmark_update__"));
        writer.commit()?;
        reader.reload()?;
        let delete_ms = elapsed(t);
        anyhow::ensure!(reader.searcher().search(&q, &Count)? == 0, "delete stale");
        let mut index_bytes = 0u64;
        for e in fs::read_dir(tmp.path())? {
            index_bytes += e?.metadata()?.len();
        }
        let db = tempfile::tempdir()?;
        let t = Instant::now();
        let mut registry = ground::VerificationRegistry::new(db.path().join("evidence.db"))?;
        let registry_open_ms = elapsed(t);
        let evidence = ground::computations::compute_similarity(&paths[0], &paths[0])?;
        let t = Instant::now();
        for _ in 0..100 {
            registry.record_similarity(&evidence)?;
            std::hint::black_box(registry.get_similarity(&paths[0], &paths[0])?);
        }
        let registry_100_write_read_ms = elapsed(t);
        runs.push(json!({"production":production,"serial_parse_ms":serial_ms,"parallel_parse":parallel,"parse_errors":errors,"functions":serial.len(),"all_pairs_ms":all_pairs_ms,"exact_bucket_ms":exact_bucket_ms,"duplicate_pairs":baseline.len(),"exact_parity":true,"graph_build_ms":graph_build_ms,"graph_query_ms":graph_query_ms,"graph_parse_errors":graph.parse_errors,"cache_prototype":{"cold_parse_hash_ms":cache_cold_ms,"warm_validate_clone_ms":cache_warm_ms,"one_file_edit_ms":cache_one_edit_ms,"cold_parsed":cold_parsed,"warm_parsed":warm_parsed,"edited_parsed":edited_parsed,"replacement_parsed":replaced_parsed,"isolated_parsed":isolated_parsed,"deletion_evicted":true},"tantivy":{"index_ms":index_ms,"query_all_names_ms":query_ms,"exact_candidate_count":candidates,"top10_omitted_candidates":top10_omissions,"add_commit_reload_ms":add_ms,"delete_commit_reload_ms":delete_ms,"index_bytes":index_bytes},"registry_open_ms":registry_open_ms,"registry_100_write_read_ms":registry_100_write_read_ms}));
    }
    let metadata: BTreeMap<_, _> = [
        ("os", std::env::consts::OS),
        ("arch", std::env::consts::ARCH),
    ]
    .into();
    println!(
        "{}",
        serde_json::to_string_pretty(
            &json!({"schema":"ground-performance-benchmark.v1","source_root":root,"corpus_sha256":corpus_hash,"files":paths.len(),"source_bytes":bytes,"build":ground::build_info(),"machine":metadata,"tantivy_version":"0.26.1","runs":runs,"limits":["No OS page-cache eviction; first run is process-cold only","Cache is parsed-output prototype with byte hashing and output cloning, not an incremental dependency graph","Registry is 100 repeated upsert/read operations, not a production workload","Tantivy queries measure exact name candidate retrieval, not structural verification","Parse failures remain explicit; benchmark is not a clean verification receipt"]})
        )?
    );
    Ok(())
}
