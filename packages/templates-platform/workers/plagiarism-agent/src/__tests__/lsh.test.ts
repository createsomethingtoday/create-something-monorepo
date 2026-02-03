/**
 * LSH (Locality-Sensitive Hashing) Tests
 * 
 * Tests for O(1) candidate lookup via LSH banding.
 */

import { describe, it, expect } from 'vitest';
import {
  computeLSHBandHashes,
  computeSuperMinHash
} from '../minhash';

// computeLSHBands returns string[], but we use computeLSHBandHashes for numeric hashes
const computeLSHBands = computeLSHBandHashes;

describe('LSH Banding', () => {
  describe('computeLSHBands', () => {
    it('should return 16 band hashes', () => {
      const shingles = new Set(['a', 'b', 'c', 'd', 'e']);
      const sig = computeSuperMinHash(shingles);
      
      const bands = computeLSHBands(sig.signature);
      
      expect(bands.length).toBe(16);
    });

    it('should produce identical bands for identical signatures', () => {
      const shingles = new Set(['hello', 'world', 'test']);
      const sig1 = computeSuperMinHash(shingles);
      const sig2 = computeSuperMinHash(shingles);
      
      const bands1 = computeLSHBands(sig1.signature);
      const bands2 = computeLSHBands(sig2.signature);
      
      expect(bands1).toEqual(bands2);
    });

    it('should have at least some matching bands for similar signatures', () => {
      // Create two similar shingle sets (80% overlap)
      const common = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      const shingles1 = new Set([...common, 'i', 'j']);
      const shingles2 = new Set([...common, 'k', 'l']);
      
      const sig1 = computeSuperMinHash(shingles1);
      const sig2 = computeSuperMinHash(shingles2);
      
      const bands1 = computeLSHBands(sig1.signature);
      const bands2 = computeLSHBands(sig2.signature);
      
      // Count matching bands
      const matching = bands1.filter((b, i) => b === bands2[i]).length;
      
      // With 80% similarity and 16 bands of 8 rows each,
      // probability of at least one match is very high
      expect(matching).toBeGreaterThan(0);
    });

    it('should have no matching bands for very different signatures', () => {
      // Create completely different shingle sets
      const shingles1 = new Set(Array.from({ length: 50 }, (_, i) => `aaa${i}`));
      const shingles2 = new Set(Array.from({ length: 50 }, (_, i) => `zzz${i}`));
      
      const sig1 = computeSuperMinHash(shingles1);
      const sig2 = computeSuperMinHash(shingles2);
      
      const bands1 = computeLSHBands(sig1.signature);
      const bands2 = computeLSHBands(sig2.signature);
      
      // Count matching bands
      const matching = bands1.filter((b, i) => b === bands2[i]).length;
      
      // Should have very few or no matching bands
      expect(matching).toBeLessThan(3);
    });
  });

  describe('computeLSHBandHashes', () => {
    it('should return 16 numeric band hashes', () => {
      const shingles = new Set(['a', 'b', 'c', 'd', 'e']);
      const sig = computeSuperMinHash(shingles);
      
      const hashes = computeLSHBandHashes(sig.signature);
      
      expect(hashes.length).toBe(16);
      hashes.forEach(h => {
        expect(typeof h).toBe('number');
        expect(Number.isInteger(h)).toBe(true);
      });
    });

    it('should produce deterministic hashes', () => {
      const shingles = new Set(['hello', 'world']);
      const sig = computeSuperMinHash(shingles);
      
      const hashes1 = computeLSHBandHashes(sig.signature);
      const hashes2 = computeLSHBandHashes(sig.signature);
      
      expect(hashes1).toEqual(hashes2);
    });
  });

  describe('LSH Collision Probability', () => {
    // Test that LSH collision probability matches theory
    // For b=16 bands, r=8 rows: P(collision) = 1 - (1 - s^8)^16
    
    it('should have high collision rate for 80%+ similar documents', () => {
      // Run multiple trials to estimate collision probability
      const trials = 50;
      let collisions = 0;
      
      for (let t = 0; t < trials; t++) {
        // Create two sets with ~80% overlap
        const baseSet = Array.from({ length: 100 }, (_, i) => `item${i}`);
        const shingles1 = new Set(baseSet);
        const shingles2 = new Set([
          ...baseSet.slice(0, 80), // 80 common items
          ...Array.from({ length: 20 }, (_, i) => `diff${t}_${i}`) // 20 different
        ]);
        
        const sig1 = computeSuperMinHash(shingles1);
        const sig2 = computeSuperMinHash(shingles2);
        
        const bands1 = computeLSHBandHashes(sig1.signature);
        const bands2 = computeLSHBandHashes(sig2.signature);
        
        // Check if at least one band matches
        const hasCollision = bands1.some((b, i) => b === bands2[i]);
        if (hasCollision) collisions++;
      }
      
      const collisionRate = collisions / trials;
      
      // Theoretical: ~99.97% for s=0.8
      // Allow some variance
      expect(collisionRate).toBeGreaterThan(0.8);
    });

    it('should have low collision rate for 20%- similar documents', () => {
      const trials = 50;
      let collisions = 0;
      
      for (let t = 0; t < trials; t++) {
        // Create two sets with ~20% overlap
        const shingles1 = new Set(Array.from({ length: 100 }, (_, i) => `set1_${t}_${i}`));
        const shingles2 = new Set([
          ...Array.from({ length: 20 }, (_, i) => `set1_${t}_${i}`), // 20% common
          ...Array.from({ length: 80 }, (_, i) => `set2_${t}_${i}`) // 80% different
        ]);
        
        const sig1 = computeSuperMinHash(shingles1);
        const sig2 = computeSuperMinHash(shingles2);
        
        const bands1 = computeLSHBandHashes(sig1.signature);
        const bands2 = computeLSHBandHashes(sig2.signature);
        
        const hasCollision = bands1.some((b, i) => b === bands2[i]);
        if (hasCollision) collisions++;
      }
      
      const collisionRate = collisions / trials;
      
      // Theoretical: ~6% for s=0.2
      // Allow some variance
      expect(collisionRate).toBeLessThan(0.3);
    });
  });
});
