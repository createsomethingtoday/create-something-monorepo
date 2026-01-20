/**
 * Probabilistic Data Structures for Plagiarism Detection
 * 
 * Implements Bloom Filter and HyperLogLog for:
 * - Fast "have we seen this template?" checks (Bloom)
 * - Cardinality estimation without COUNT queries (HLL)
 * 
 * Inspired by packages/ground/src/computations/bloom.rs and hll.rs
 * Adapted for Cloudflare Workers (no native modules, D1 persistence)
 * 
 * Canon: Convergence through structure, not exhaustive comparison.
 */

// =============================================================================
// BLOOM FILTER
// =============================================================================

/**
 * Space-efficient probabilistic set membership.
 * Returns "possibly in set" or "definitely not in set".
 * 
 * Use cases:
 * - Fast "have we indexed this URL?" check
 * - Quick rejection of non-matching templates
 * - Deduplication in batch indexing
 */
export class BloomFilter {
  private bits: Uint8Array;
  private numBits: number;
  private numHashes: number;
  private count: number = 0;

  /**
   * Create a Bloom filter optimized for expected item count and false positive rate.
   * 
   * @param expectedItems - Expected number of items to insert
   * @param fpRate - Desired false positive rate (e.g., 0.01 for 1%)
   */
  constructor(expectedItems: number = 10000, fpRate: number = 0.01) {
    fpRate = Math.max(0.0001, Math.min(0.5, fpRate));
    expectedItems = Math.max(1, expectedItems);

    // Optimal number of bits: m = -n * ln(p) / (ln(2)^2)
    const ln2Squared = Math.LN2 * Math.LN2;
    const numBits = Math.ceil(-expectedItems * Math.log(fpRate) / ln2Squared);
    this.numBits = Math.min(Math.max(64, numBits), 16 * 1024 * 1024); // 64 bits to 16MB

    // Optimal number of hash functions: k = (m/n) * ln(2)
    this.numHashes = Math.min(30, Math.max(1, Math.ceil((this.numBits / expectedItems) * Math.LN2)));

    // Round up to byte boundary
    const numBytes = Math.ceil(this.numBits / 8);
    this.bits = new Uint8Array(numBytes);
    this.numBits = numBytes * 8;
  }

  /**
   * Create from serialized state (for D1 persistence)
   */
  static fromBytes(bytes: Uint8Array, numHashes: number, count: number): BloomFilter {
    const bf = new BloomFilter(1, 0.5); // Placeholder params
    bf.bits = bytes;
    bf.numBits = bytes.length * 8;
    bf.numHashes = numHashes;
    bf.count = count;
    return bf;
  }

  /**
   * Insert a string into the filter.
   */
  insert(item: string): void {
    const [h1, h2] = this.hashPair(item);
    
    for (let i = 0; i < this.numHashes; i++) {
      const idx = this.getIndex(h1, h2, i);
      this.setBit(idx);
    }
    
    this.count++;
  }

  /**
   * Check if an item is possibly in the set.
   * 
   * @returns true = probably in set (may be false positive), false = definitely NOT in set
   */
  contains(item: string): boolean {
    const [h1, h2] = this.hashPair(item);
    
    for (let i = 0; i < this.numHashes; i++) {
      const idx = this.getIndex(h1, h2, i);
      if (!this.getBit(idx)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Merge another Bloom filter into this one (union).
   */
  merge(other: BloomFilter): boolean {
    if (this.numBits !== other.numBits || this.numHashes !== other.numHashes) {
      console.error('[BloomFilter] Cannot merge filters with different parameters');
      return false;
    }

    for (let i = 0; i < this.bits.length; i++) {
      this.bits[i] |= other.bits[i];
    }

    this.count += other.count;
    return true;
  }

  /**
   * Estimate current false positive rate.
   */
  estimatedFpRate(): number {
    if (this.count === 0) return 0;
    const exp = Math.exp(-this.numHashes * this.count / this.numBits);
    return Math.pow(1 - exp, this.numHashes);
  }

  /**
   * Get fill ratio (fraction of bits set).
   */
  fillRatio(): number {
    let setBits = 0;
    for (const byte of this.bits) {
      setBits += this.popCount(byte);
    }
    return setBits / this.numBits;
  }

  /**
   * Serialize for D1 storage.
   */
  toBytes(): Uint8Array {
    return this.bits;
  }

  /**
   * Get metadata for storage.
   */
  getMetadata(): { numBits: number; numHashes: number; count: number } {
    return {
      numBits: this.numBits,
      numHashes: this.numHashes,
      count: this.count
    };
  }

  /**
   * Clear the filter.
   */
  clear(): void {
    this.bits.fill(0);
    this.count = 0;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private Methods
  // ─────────────────────────────────────────────────────────────────────────

  private hashPair(item: string): [number, number] {
    // FNV-1a hash for h1
    let h1 = 2166136261;
    for (let i = 0; i < item.length; i++) {
      h1 ^= item.charCodeAt(i);
      h1 = Math.imul(h1, 16777619);
      h1 = h1 >>> 0; // Ensure unsigned
    }

    // Variant hash for h2 (XOR fold with different seed)
    let h2 = 2654435761;
    for (let i = 0; i < item.length; i++) {
      h2 = Math.imul(h2 ^ item.charCodeAt(i), 1597334677);
      h2 = h2 >>> 0;
    }

    return [h1, h2];
  }

  private getIndex(h1: number, h2: number, i: number): number {
    // Double hashing: h(i) = h1 + i*h2
    const hash = (h1 + i * h2) >>> 0;
    return hash % this.numBits;
  }

  private setBit(idx: number): void {
    const byteIdx = Math.floor(idx / 8);
    const bitIdx = idx % 8;
    this.bits[byteIdx] |= (1 << bitIdx);
  }

  private getBit(idx: number): boolean {
    const byteIdx = Math.floor(idx / 8);
    const bitIdx = idx % 8;
    return (this.bits[byteIdx] & (1 << bitIdx)) !== 0;
  }

  private popCount(n: number): number {
    let count = 0;
    while (n) {
      count += n & 1;
      n >>>= 1;
    }
    return count;
  }
}

// =============================================================================
// HYPERLOGLOG
// =============================================================================

/**
 * Probabilistic cardinality estimation.
 * Counts unique elements with sub-linear space.
 * 
 * Use cases:
 * - Count unique templates without loading all IDs
 * - Track unique colors, patterns, creators
 * - Estimate set intersection/union cardinalities
 */
export class HyperLogLog {
  private precision: number;
  private numRegisters: number;
  private registers: Uint8Array;

  /**
   * Create a HyperLogLog counter.
   * 
   * @param precision - Number of bits for register index (4-18)
   *   - 12 bits: ~1.6% error, 4KB memory
   *   - 14 bits: ~0.8% error, 16KB memory (recommended)
   *   - 16 bits: ~0.4% error, 64KB memory
   */
  constructor(precision: number = 14) {
    this.precision = Math.max(4, Math.min(18, precision));
    this.numRegisters = 1 << this.precision;
    this.registers = new Uint8Array(this.numRegisters);
  }

  /**
   * Create from serialized state.
   */
  static fromBytes(bytes: Uint8Array, precision: number): HyperLogLog {
    const hll = new HyperLogLog(precision);
    hll.registers = bytes;
    return hll;
  }

  /**
   * Add a string element.
   */
  add(item: string): void {
    const hash = this.hash64(item);
    this.addHash(hash);
  }

  /**
   * Add a pre-computed hash.
   */
  addHash(hash: bigint): void {
    // Use first `precision` bits as register index
    const registerIdx = Number(hash >> BigInt(64 - this.precision)) % this.numRegisters;
    
    // Count leading zeros in remaining bits
    const remaining = (hash << BigInt(this.precision)) | (1n << BigInt(this.precision - 1));
    const leadingZeros = this.clz64(remaining) + 1;
    
    // Store max
    if (leadingZeros > this.registers[registerIdx]) {
      this.registers[registerIdx] = leadingZeros;
    }
  }

  /**
   * Estimate cardinality (number of distinct elements).
   */
  count(): number {
    const m = this.numRegisters;
    
    // Compute harmonic mean of 2^(-register)
    let sum = 0;
    let zeros = 0;
    
    for (const register of this.registers) {
      sum += Math.pow(2, -register);
      if (register === 0) zeros++;
    }
    
    // Alpha correction factor
    const alpha = this.getAlpha();
    
    // Raw estimate
    let estimate = alpha * m * m / sum;
    
    // Small range correction (linear counting)
    if (estimate <= 2.5 * m && zeros > 0) {
      return Math.round(m * Math.log(m / zeros));
    }
    
    // Large range correction (32-bit saturation)
    const pow32 = Math.pow(2, 32);
    if (estimate > pow32 / 30) {
      return Math.round(-pow32 * Math.log(1 - estimate / pow32));
    }
    
    return Math.round(estimate);
  }

  /**
   * Get the standard error rate for this precision.
   */
  errorRate(): number {
    return 1.04 / Math.sqrt(this.numRegisters);
  }

  /**
   * Merge another HLL into this one (union).
   */
  merge(other: HyperLogLog): boolean {
    if (this.precision !== other.precision) {
      console.error('[HyperLogLog] Cannot merge HLLs with different precisions');
      return false;
    }
    
    for (let i = 0; i < this.numRegisters; i++) {
      if (other.registers[i] > this.registers[i]) {
        this.registers[i] = other.registers[i];
      }
    }
    
    return true;
  }

  /**
   * Check if HLL is empty.
   */
  isEmpty(): boolean {
    return this.registers.every(r => r === 0);
  }

  /**
   * Serialize for D1 storage.
   */
  toBytes(): Uint8Array {
    return this.registers;
  }

  /**
   * Get metadata for storage.
   */
  getMetadata(): { precision: number; count: number } {
    return {
      precision: this.precision,
      count: this.count()
    };
  }

  /**
   * Clear the HLL.
   */
  clear(): void {
    this.registers.fill(0);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private Methods
  // ─────────────────────────────────────────────────────────────────────────

  private hash64(s: string): bigint {
    // FNV-1a 64-bit hash
    let h = 14695981039346656037n;
    for (let i = 0; i < s.length; i++) {
      h ^= BigInt(s.charCodeAt(i));
      h = (h * 1099511628211n) & 0xFFFFFFFFFFFFFFFFn;
    }
    return h;
  }

  private clz64(n: bigint): number {
    if (n === 0n) return 64;
    let count = 0;
    let mask = 1n << 63n;
    while ((n & mask) === 0n && count < 64) {
      count++;
      mask >>= 1n;
    }
    return count;
  }

  private getAlpha(): number {
    switch (this.numRegisters) {
      case 16: return 0.673;
      case 32: return 0.697;
      case 64: return 0.709;
      default: return 0.7213 / (1 + 1.079 / this.numRegisters);
    }
  }
}

// =============================================================================
// SKETCH MANAGER (D1 Persistence)
// =============================================================================

/**
 * Manages sketch persistence in D1.
 * 
 * Provides:
 * - Bloom filter for URL deduplication
 * - HyperLogLog for template counting
 * - Automatic save/load from database
 */
export class SketchManager {
  private db: D1Database;
  private urlBloom: BloomFilter | null = null;
  private templateHll: HyperLogLog | null = null;
  private colorHll: HyperLogLog | null = null;
  private patternHll: HyperLogLog | null = null;
  private dirty: boolean = false;

  constructor(db: D1Database) {
    this.db = db;
  }

  /**
   * Initialize sketches from D1 or create new ones.
   */
  async init(): Promise<void> {
    // Try to load existing sketches
    const rows = await this.db.prepare(`
      SELECT name, sketch_type, data_b64, metadata_json
      FROM plagiarism_sketches
      WHERE name IN ('url_bloom', 'template_hll', 'color_hll', 'pattern_hll')
    `).all();

    for (const row of rows.results || []) {
      const r = row as { name: string; sketch_type: string; data_b64: string; metadata_json: string };
      const data = this.base64ToBytes(r.data_b64);
      const metadata = JSON.parse(r.metadata_json);

      switch (r.name) {
        case 'url_bloom':
          this.urlBloom = BloomFilter.fromBytes(data, metadata.numHashes, metadata.count);
          break;
        case 'template_hll':
          this.templateHll = HyperLogLog.fromBytes(data, metadata.precision);
          break;
        case 'color_hll':
          this.colorHll = HyperLogLog.fromBytes(data, metadata.precision);
          break;
        case 'pattern_hll':
          this.patternHll = HyperLogLog.fromBytes(data, metadata.precision);
          break;
      }
    }

    // Create new sketches if not found
    if (!this.urlBloom) {
      this.urlBloom = new BloomFilter(50000, 0.01); // 50k templates, 1% FP
      this.dirty = true;
    }
    if (!this.templateHll) {
      this.templateHll = new HyperLogLog(14);
      this.dirty = true;
    }
    if (!this.colorHll) {
      this.colorHll = new HyperLogLog(12);
      this.dirty = true;
    }
    if (!this.patternHll) {
      this.patternHll = new HyperLogLog(12);
      this.dirty = true;
    }
  }

  /**
   * Check if a URL has possibly been indexed before.
   * 
   * @returns true = maybe indexed (check DB), false = definitely NOT indexed (skip DB query)
   */
  maybeIndexed(url: string): boolean {
    return this.urlBloom?.contains(this.normalizeUrl(url)) ?? true;
  }

  /**
   * Mark a URL as indexed.
   */
  markIndexed(url: string): void {
    this.urlBloom?.insert(this.normalizeUrl(url));
    this.dirty = true;
  }

  /**
   * Track a template ID for cardinality estimation.
   */
  trackTemplate(templateId: string): void {
    this.templateHll?.add(templateId);
    this.dirty = true;
  }

  /**
   * Track colors for cardinality estimation.
   */
  trackColors(colors: string[]): void {
    for (const color of colors) {
      this.colorHll?.add(color.toLowerCase());
    }
    if (colors.length > 0) this.dirty = true;
  }

  /**
   * Track CSS patterns for cardinality estimation.
   */
  trackPatterns(patterns: string[]): void {
    for (const pattern of patterns) {
      this.patternHll?.add(pattern);
    }
    if (patterns.length > 0) this.dirty = true;
  }

  /**
   * Get cardinality estimates.
   */
  getStats(): {
    estimatedTemplates: number;
    estimatedUniqueColors: number;
    estimatedUniquePatterns: number;
    bloomFillRatio: number;
    bloomEstimatedFpRate: number;
  } {
    return {
      estimatedTemplates: this.templateHll?.count() ?? 0,
      estimatedUniqueColors: this.colorHll?.count() ?? 0,
      estimatedUniquePatterns: this.patternHll?.count() ?? 0,
      bloomFillRatio: this.urlBloom?.fillRatio() ?? 0,
      bloomEstimatedFpRate: this.urlBloom?.estimatedFpRate() ?? 0
    };
  }

  /**
   * Save dirty sketches to D1.
   */
  async save(): Promise<void> {
    if (!this.dirty) return;

    const sketches = [
      { name: 'url_bloom', type: 'bloom', sketch: this.urlBloom },
      { name: 'template_hll', type: 'hll', sketch: this.templateHll },
      { name: 'color_hll', type: 'hll', sketch: this.colorHll },
      { name: 'pattern_hll', type: 'hll', sketch: this.patternHll }
    ];

    for (const { name, type, sketch } of sketches) {
      if (!sketch) continue;
      
      const data = sketch.toBytes();
      const metadata = sketch.getMetadata();
      
      await this.db.prepare(`
        INSERT OR REPLACE INTO plagiarism_sketches (name, sketch_type, data_b64, metadata_json, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        name,
        type,
        this.bytesToBase64(data),
        JSON.stringify(metadata),
        Date.now()
      ).run();
    }

    this.dirty = false;
    console.log('[SketchManager] Saved sketches to D1');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private Methods
  // ─────────────────────────────────────────────────────────────────────────

  private normalizeUrl(url: string): string {
    // Remove protocol, www, trailing slash for consistent deduplication
    return url
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '')
      .toLowerCase();
  }

  private bytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToBytes(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Estimate Jaccard similarity from two HLLs using inclusion-exclusion.
 */
export function estimateJaccard(a: HyperLogLog, b: HyperLogLog): number {
  const countA = a.count();
  const countB = b.count();
  
  // Create union
  const union = new HyperLogLog(14);
  union.merge(a);
  union.merge(b);
  const countUnion = union.count();
  
  if (countUnion === 0) return 1; // Both empty
  
  // |A ∩ B| = |A| + |B| - |A ∪ B|
  const intersection = Math.max(0, countA + countB - countUnion);
  
  return intersection / countUnion;
}
