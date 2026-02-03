/**
 * MinHash / SuperMinHash Tests
 * 
 * Tests for the core similarity detection algorithm.
 */

import { describe, it, expect } from 'vitest';
import {
  computeSuperMinHash,
  estimateSimilarity,
  computeCssMinHash,
  compareCss
} from '../minhash';

// Helper to create shingles (since it's not exported)
function createShingles(text: string, size: number = 7): Set<string> {
  const shingles = new Set<string>();
  for (let i = 0; i <= text.length - size; i++) {
    shingles.add(text.slice(i, i + size));
  }
  return shingles;
}

describe('SuperMinHash', () => {
  describe('computeSuperMinHash', () => {
    it('should return signature with 128 hash values', () => {
      const shingles = new Set(['a', 'b', 'c', 'd', 'e']);
      const signature = computeSuperMinHash(shingles);
      
      expect(signature.signature.length).toBe(128);
      expect(signature.algorithm).toBe('superminhash');
    });

    it('should produce identical signatures for identical input', () => {
      const shingles1 = new Set(['hello', 'world', 'test']);
      const shingles2 = new Set(['hello', 'world', 'test']);
      
      const sig1 = computeSuperMinHash(shingles1);
      const sig2 = computeSuperMinHash(shingles2);
      
      expect(sig1.signature).toEqual(sig2.signature);
    });

    it('should produce different signatures for different input', () => {
      const shingles1 = new Set(['hello', 'world']);
      const shingles2 = new Set(['foo', 'bar']);
      
      const sig1 = computeSuperMinHash(shingles1);
      const sig2 = computeSuperMinHash(shingles2);
      
      // Signatures should differ
      expect(sig1.signature).not.toEqual(sig2.signature);
    });

    it('should handle empty shingle set', () => {
      const shingles = new Set<string>();
      const signature = computeSuperMinHash(shingles);
      
      expect(signature.signature.length).toBe(128);
      expect(signature.numShingles).toBe(0);
    });
  });

  describe('estimateSimilarity', () => {
    it('should return 1.0 for identical signatures', () => {
      // Use more shingles for higher confidence
      const shingles = new Set(Array.from({ length: 50 }, (_, i) => `shingle_${i}`));
      const sig = computeSuperMinHash(shingles);
      
      const result = estimateSimilarity(sig, sig);
      
      expect(result.jaccardEstimate).toBe(1.0);
      // Confidence depends on shingle count
      expect(result.confidence).toBeDefined();
    });

    it('should return low value for completely different signatures', () => {
      // Create two very different shingle sets
      const shingles1 = new Set(Array.from({ length: 100 }, (_, i) => `aaa${i}`));
      const shingles2 = new Set(Array.from({ length: 100 }, (_, i) => `zzz${i}`));
      
      const sig1 = computeSuperMinHash(shingles1);
      const sig2 = computeSuperMinHash(shingles2);
      
      const result = estimateSimilarity(sig1, sig2);
      
      // Should be very low similarity
      expect(result.jaccardEstimate).toBeLessThan(0.2);
    });

    it('should estimate similarity proportional to overlap', () => {
      // 50% overlap
      const shingles1 = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']);
      const shingles2 = new Set(['a', 'b', 'c', 'd', 'e', 'k', 'l', 'm', 'n', 'o']);
      
      const sig1 = computeSuperMinHash(shingles1);
      const sig2 = computeSuperMinHash(shingles2);
      
      const result = estimateSimilarity(sig1, sig2);
      
      // Jaccard for 50% overlap = 5/15 ≈ 0.33
      // Allow some variance due to MinHash estimation
      expect(result.jaccardEstimate).toBeGreaterThan(0.15);
      expect(result.jaccardEstimate).toBeLessThan(0.6);
    });
  });

  describe('CSS Plagiarism Detection', () => {
    it('should detect high similarity for copied CSS', () => {
      const originalCSS = `
        .header { background: #fff; padding: 20px; margin: 0; }
        .nav { display: flex; justify-content: space-between; }
        .button { background: blue; color: white; padding: 10px 20px; }
      `;
      
      // Slightly modified copy (renamed classes)
      const copiedCSS = `
        .top-bar { background: #fff; padding: 20px; margin: 0; }
        .navigation { display: flex; justify-content: space-between; }
        .btn { background: blue; color: white; padding: 10px 20px; }
      `;
      
      const sig1 = computeSuperMinHash(createShingles(originalCSS, 7));
      const sig2 = computeSuperMinHash(createShingles(copiedCSS, 7));
      
      const result = estimateSimilarity(sig1, sig2);
      
      // Should detect substantial similarity despite class name changes
      expect(result.jaccardEstimate).toBeGreaterThan(0.3);
    });

    it('should show low similarity for unrelated CSS', () => {
      const css1 = `
        .header { background: #fff; padding: 20px; }
        .nav { display: flex; }
      `;
      
      const css2 = `
        .footer { border-top: 1px solid #ccc; }
        .social-links { list-style: none; }
      `;
      
      const sig1 = computeSuperMinHash(createShingles(css1, 7));
      const sig2 = computeSuperMinHash(createShingles(css2, 7));
      
      const result = estimateSimilarity(sig1, sig2);
      
      expect(result.jaccardEstimate).toBeLessThan(0.3);
    });

    it('should use compareCss for end-to-end CSS comparison', () => {
      const css1 = `.header { background: #fff; padding: 20px; }`;
      const css2 = `.header { background: #fff; padding: 20px; }`;
      
      const result = compareCss(css1, css2);
      
      expect(result.jaccardEstimate).toBe(1.0);
    });
  });
});
