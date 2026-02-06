/**
 * Tests for Notion client utilities
 * 
 * Tests the pure functions (chunking, boundary detection) without API mocking.
 */

import { describe, it, expect } from 'vitest';
import { chunkTranscript } from '../notion/client.js';

describe('chunkTranscript', () => {
  it('returns single chunk for short text', () => {
    const text = 'This is a short transcript.';
    const chunks = chunkTranscript(text, 100);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe(text);
  });

  it('splits at sentence boundaries', () => {
    const text = 'First sentence. Second sentence. Third sentence.';
    const chunks = chunkTranscript(text, 30);
    
    // Should split at sentence boundaries
    expect(chunks.length).toBeGreaterThan(1);
    // Each chunk should be trimmed
    chunks.forEach(chunk => {
      expect(chunk).toBe(chunk.trim());
    });
  });

  it('handles text exactly at max length', () => {
    const text = 'A'.repeat(100);
    const chunks = chunkTranscript(text, 100);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe(text);
  });

  it('handles text just over max length', () => {
    const text = 'A'.repeat(101);
    const chunks = chunkTranscript(text, 100);
    expect(chunks).toHaveLength(2);
    expect(chunks[0].length).toBeLessThanOrEqual(100);
    expect(chunks[0].length + chunks[1].length).toBe(101);
  });

  it('handles empty string', () => {
    const chunks = chunkTranscript('', 100);
    expect(chunks).toHaveLength(0);
  });

  it('handles whitespace-only string', () => {
    const chunks = chunkTranscript('   ', 100);
    expect(chunks).toHaveLength(0);
  });

  it('preserves all text across chunks', () => {
    const text = 'The quick brown fox jumps over the lazy dog. ' +
                 'She sells seashells by the seashore. ' +
                 'Peter Piper picked a peck of pickled peppers.';
    const chunks = chunkTranscript(text, 50);
    
    // All text should be preserved when chunks are joined
    const rejoined = chunks.join(' ');
    // Allow for minor whitespace differences
    expect(rejoined.replace(/\s+/g, ' ').trim()).toBe(text.replace(/\s+/g, ' ').trim());
  });

  it('splits at newlines when no sentence boundary found', () => {
    const text = 'Line one content here\nLine two content here\nLine three content here';
    const chunks = chunkTranscript(text, 30);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('splits at spaces as last resort', () => {
    const text = 'wordone wordtwo wordthree wordfour wordfive wordsix';
    const chunks = chunkTranscript(text, 20);
    expect(chunks.length).toBeGreaterThan(1);
    // No chunk should exceed the max length
    chunks.forEach(chunk => {
      expect(chunk.length).toBeLessThanOrEqual(20);
    });
  });

  it('respects default chunk size of 1900', () => {
    const text = 'A'.repeat(4000);
    const chunks = chunkTranscript(text);
    expect(chunks.length).toBe(3); // 1900 + 1900 + 200
    expect(chunks[0].length).toBeLessThanOrEqual(1900);
  });

  it('handles real transcript-like content', () => {
    const text = 'Welcome to the channel. Today we are going to discuss the three-tier framework. ' +
                 'The database tier handles state and persistence. ' +
                 'The automation tier handles execution and tools. ' +
                 'The judgment tier handles policy and oversight. ' +
                 'Together they form a complete system for agent architecture.';
    
    const chunks = chunkTranscript(text, 100);
    
    // Should have multiple chunks
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    
    // No chunk should exceed max length
    chunks.forEach(chunk => {
      expect(chunk.length).toBeLessThanOrEqual(100);
    });
  });
});
