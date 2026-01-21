//! Deterministic Random Number Generator
//!
//! Uses xorshift64 for fast, reproducible random numbers.
//! Same seed = same sequence, always.

/// A simple, fast, deterministic PRNG using xorshift64
#[derive(Debug, Clone)]
pub struct Rng {
    state: u64,
}

impl Rng {
    /// Create a new RNG with the given seed
    pub fn new(seed: u64) -> Self {
        // Ensure non-zero state
        let state = if seed == 0 { 0xDEADBEEF } else { seed };
        Rng { state }
    }

    /// Create an RNG seeded from multiple values (for combining seed + time)
    pub fn seeded(seed: u64, modifier: u64) -> Self {
        let combined = seed.wrapping_mul(0x517cc1b727220a95).wrapping_add(modifier);
        Self::new(combined)
    }

    /// Get the next random u64
    pub fn next_u64(&mut self) -> u64 {
        let mut x = self.state;
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        self.state = x;
        x
    }

    /// Get a random u32
    pub fn next_u32(&mut self) -> u32 {
        self.next_u64() as u32
    }

    /// Get a random float in [0, 1)
    pub fn next_f64(&mut self) -> f64 {
        (self.next_u64() >> 11) as f64 / (1u64 << 53) as f64
    }

    /// Get a random integer in [0, max)
    pub fn next_range(&mut self, max: u64) -> u64 {
        if max == 0 {
            return 0;
        }
        self.next_u64() % max
    }

    /// Get a random integer in [min, max)
    pub fn next_range_i64(&mut self, min: i64, max: i64) -> i64 {
        if max <= min {
            return min;
        }
        let range = (max - min) as u64;
        min + (self.next_range(range) as i64)
    }

    /// Pick a random item from a slice
    pub fn pick<'a, T>(&mut self, items: &'a [T]) -> Option<&'a T> {
        if items.is_empty() {
            None
        } else {
            let idx = self.next_range(items.len() as u64) as usize;
            Some(&items[idx])
        }
    }

    /// Shuffle a vector in place (Fisher-Yates)
    pub fn shuffle<T>(&mut self, items: &mut [T]) {
        let len = items.len();
        for i in (1..len).rev() {
            let j = self.next_range((i + 1) as u64) as usize;
            items.swap(i, j);
        }
    }

    /// Generate a weighted random choice
    pub fn weighted_pick<'a, T>(&mut self, items: &'a [(T, u32)]) -> Option<&'a T> {
        if items.is_empty() {
            return None;
        }
        
        let total_weight: u32 = items.iter().map(|(_, w)| *w).sum();
        if total_weight == 0 {
            return None;
        }
        
        let mut roll = self.next_range(total_weight as u64) as u32;
        for (item, weight) in items {
            if roll < *weight {
                return Some(item);
            }
            roll -= weight;
        }
        
        Some(&items.last()?.0)
    }

    /// Generate a random string ID
    pub fn random_id(&mut self, prefix: &str) -> String {
        format!("{}-{:08x}", prefix, self.next_u32())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_determinism() {
        let mut rng1 = Rng::new(12345);
        let mut rng2 = Rng::new(12345);

        for _ in 0..100 {
            assert_eq!(rng1.next_u64(), rng2.next_u64());
        }
    }

    #[test]
    fn test_range() {
        let mut rng = Rng::new(42);
        for _ in 0..100 {
            let n = rng.next_range(10);
            assert!(n < 10);
        }
    }

    #[test]
    fn test_f64_bounds() {
        let mut rng = Rng::new(999);
        for _ in 0..100 {
            let f = rng.next_f64();
            assert!(f >= 0.0 && f < 1.0);
        }
    }
}
