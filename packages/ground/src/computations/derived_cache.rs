//! Bounded process-local derived data. Source bytes/configuration are validated
//! by callers; this cache is never an authority and never writes to disk.
use serde::{de::DeserializeOwned, Serialize};
use sha2::{Digest, Sha256};
use std::collections::{HashMap, VecDeque};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Mutex, OnceLock,
};

const MAX_BYTES: usize = 16 * 1024 * 1024;
const MAX_ENTRIES: usize = 512;
static ENABLED: AtomicBool = AtomicBool::new(true);
static CACHE: OnceLock<Mutex<Cache>> = OnceLock::new();

#[derive(Clone, Debug, Serialize, Default)]
pub struct CacheStats {
    pub enabled: bool,
    pub entries: usize,
    /// Serialized payload bytes, not process RSS. Keys/bookkeeping add overhead.
    pub payload_bytes: usize,
    pub max_payload_bytes: usize,
    pub max_entries: usize,
    pub parse_hits: u64,
    pub graph_hits: u64,
    pub misses: u64,
    pub evictions: u64,
}
#[derive(Default)]
struct Cache {
    values: HashMap<[u8; 32], Vec<u8>>,
    order: VecDeque<[u8; 32]>,
    metrics: CacheStats,
}
impl Cache {
    fn insert(&mut self, key: [u8; 32], value: Vec<u8>) {
        if value.len() > MAX_BYTES {
            return;
        }
        if let Some(old) = self.values.remove(&key) {
            self.metrics.payload_bytes -= old.len();
            self.order.retain(|k| k != &key);
        }
        while self.values.len() >= MAX_ENTRIES
            || self.metrics.payload_bytes + value.len() > MAX_BYTES
        {
            if let Some(old) = self.order.pop_front() {
                if let Some(bytes) = self.values.remove(&old) {
                    self.metrics.payload_bytes -= bytes.len();
                    self.metrics.evictions += 1;
                }
            } else {
                break;
            }
        }
        self.metrics.payload_bytes += value.len();
        self.values.insert(key, value);
        self.order.push_back(key);
    }
}
/// Set once at process startup. Disabling also drops retained derived data.
pub fn set_enabled(enabled: bool) {
    ENABLED.store(enabled, Ordering::Relaxed);
    if !enabled {
        if let Some(cache) = CACHE.get() {
            if let Ok(mut cache) = cache.lock() {
                *cache = Cache::default();
            }
        }
    }
}
pub fn enabled() -> bool {
    ENABLED.load(Ordering::Relaxed)
}
pub fn stats() -> CacheStats {
    let mut metrics = CACHE
        .get()
        .and_then(|c| c.lock().ok())
        .map(|c| {
            let mut metrics = c.metrics.clone();
            metrics.entries = c.values.len();
            metrics
        })
        .unwrap_or_default();
    metrics.enabled = enabled();
    metrics.max_payload_bytes = MAX_BYTES;
    metrics.max_entries = MAX_ENTRIES;
    metrics
}
pub(crate) fn key(parts: &[&[u8]]) -> [u8; 32] {
    let mut hash = Sha256::new();
    for part in parts {
        hash.update((part.len() as u64).to_le_bytes());
        hash.update(part);
    }
    hash.finalize().into()
}
pub(crate) fn get<T: DeserializeOwned>(key: &[u8; 32], graph: bool) -> Option<T> {
    if !enabled() {
        return None;
    }
    let mut cache = CACHE
        .get_or_init(|| Mutex::new(Cache::default()))
        .lock()
        .ok()?;
    let result = cache
        .values
        .get(key)
        .and_then(|bytes| serde_json::from_slice(bytes).ok());
    if result.is_some() {
        if graph {
            cache.metrics.graph_hits += 1;
        } else {
            cache.metrics.parse_hits += 1;
        }
    } else {
        cache.metrics.misses += 1;
    }
    result
}
pub(crate) fn put<T: Serialize>(key: [u8; 32], value: &T) {
    if !enabled() {
        return;
    }
    if let Some(bytes) = serialize_bounded(value) {
        if let Ok(mut cache) = CACHE.get_or_init(|| Mutex::new(Cache::default())).lock() {
            cache.insert(key, bytes);
        }
    }
}
// Stop the serializer as soon as the retained-payload budget would be exceeded.
// This also bounds transient encoded bytes for graphs that cannot be retained.
fn serialize_bounded<T: Serialize>(value: &T) -> Option<Vec<u8>> {
    struct LimitedWriter(Vec<u8>);
    impl std::io::Write for LimitedWriter {
        fn write(&mut self, bytes: &[u8]) -> std::io::Result<usize> {
            if bytes.len() > MAX_BYTES - self.0.len() {
                return Err(std::io::Error::other("derived cache payload limit"));
            }
            self.0.extend_from_slice(bytes);
            Ok(bytes.len())
        }
        fn flush(&mut self) -> std::io::Result<()> {
            Ok(())
        }
    }
    let mut writer = LimitedWriter(Vec::new());
    serde_json::to_writer(&mut writer, value).ok()?;
    Some(writer.0)
}
/// Parse exactly the bytes read for this request. Errors are never cached.
pub(crate) fn parse<T: Serialize + DeserializeOwned>(
    path: &std::path::Path,
    source: &str,
    kind: &str,
    parse: impl FnOnce() -> Result<T, String>,
) -> Result<T, String> {
    if !enabled() {
        return parse();
    }
    let canonical = path.canonicalize().map_err(|e| e.to_string())?;
    let ext = path.extension().unwrap_or_default().as_encoded_bytes();
    let key = key(&[
        b"parse-v1",
        kind.as_bytes(),
        canonical.as_os_str().as_encoded_bytes(),
        ext,
        source.as_bytes(),
    ]);
    if let Some(value) = get(&key, false) {
        return Ok(value);
    }
    let value = parse()?;
    put(key, &value);
    Ok(value)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn serialization_stops_when_payload_budget_is_exceeded() {
        use serde::ser::SerializeSeq;
        use std::cell::Cell;
        struct Large<'a>(&'a Cell<usize>);
        impl Serialize for Large<'_> {
            fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
                let mut seq = serializer.serialize_seq(None)?;
                let chunk = "x".repeat(1024 * 1024);
                for _ in 0..64 {
                    self.0.set(self.0.get() + 1);
                    seq.serialize_element(&chunk)?;
                }
                seq.end()
            }
        }
        let count = Cell::new(0);
        assert!(serialize_bounded(&Large(&count)).is_none());
        assert!(
            count.get() <= 16,
            "serialization must stop before visiting all records"
        );
        assert_eq!(serialize_bounded(&vec![1, 2]), Some(b"[1,2]".to_vec()));
    }
    #[test]
    fn payload_and_entry_limits_evict_without_exceeding_bounds() {
        let mut cache = Cache::default();
        for i in 0..MAX_ENTRIES + 5 {
            cache.insert(key(&[&i.to_le_bytes()]), vec![0; 32]);
        }
        assert_eq!(cache.values.len(), MAX_ENTRIES);
        assert_eq!(cache.metrics.evictions, 5);
        cache.insert([255; 32], vec![1; MAX_BYTES]);
        assert_eq!(cache.values.len(), 1);
        assert_eq!(cache.metrics.payload_bytes, MAX_BYTES);
        cache.insert([254; 32], vec![1; MAX_BYTES + 1]);
        assert_eq!(cache.values.len(), 1);
    }
}
