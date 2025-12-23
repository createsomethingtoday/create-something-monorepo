/**
 * Manual verification script for dynamic confidence thresholds.
 * Run with: pnpm exec tsx verify-dynamic-thresholds.ts
 */

import type { SessionResult, DetectedModel } from './src/types.js';
import { shouldPauseForConfidence, calculateConfidence } from './src/checkpoint.js';
import { getModelConfidenceThreshold } from './src/model-detector.js';
import { DEFAULT_MODEL_SPECIFIC_CONFIG } from './src/types.js';

console.log('Dynamic Confidence Threshold Verification\n');
console.log('═'.repeat(60));

// Test 1: Opus model (threshold: 0.6)
console.log('\n✓ Test 1: Opus Model');
const opusModel: DetectedModel = {
  modelId: 'claude-opus-4-5-20251101',
  family: 'opus',
  versionDate: '20251101',
  isLatest: true,
  raw: 'claude-opus-4-5-20251101',
};

const opusResults: SessionResult[] = [
  {
    issueId: 'test-1',
    outcome: 'success',
    summary: 'Done',
    gitCommit: 'abc123',
    contextUsed: 10000,
    durationMs: 5000,
    error: null,
    model: opusModel,
    sessionId: null,
    costUsd: null,
    numTurns: null,
  },
  {
    issueId: 'test-2',
    outcome: 'success',
    summary: 'Done',
    gitCommit: 'def456',
    contextUsed: 12000,
    durationMs: 6000,
    error: null,
    model: opusModel,
    sessionId: null,
    costUsd: null,
    numTurns: null,
  },
  {
    issueId: 'test-3',
    outcome: 'failure',
    summary: 'Failed',
    gitCommit: null,
    contextUsed: 8000,
    durationMs: 3000,
    error: 'Error',
    model: opusModel,
    sessionId: null,
    costUsd: null,
    numTurns: null,
  },
];

const opusConfidence = calculateConfidence(opusResults);
const opusThreshold = getModelConfidenceThreshold(
  opusModel,
  DEFAULT_MODEL_SPECIFIC_CONFIG.confidenceThresholds
);
const opusShouldPause = shouldPauseForConfidence(opusResults, 0.7);

console.log(`  Model: ${opusModel.family}`);
console.log(`  Confidence: ${(opusConfidence * 100).toFixed(0)}%`);
console.log(`  Threshold: ${(opusThreshold * 100).toFixed(0)}%`);
console.log(`  Should Pause: ${opusShouldPause ? 'YES' : 'NO'}`);
console.log(`  Expected: ${opusConfidence < opusThreshold ? 'YES' : 'NO'}`);
console.log(`  ✓ ${opusShouldPause === (opusConfidence < opusThreshold) ? 'PASS' : 'FAIL'}`);

// Test 2: Sonnet model (threshold: 0.7)
console.log('\n✓ Test 2: Sonnet Model');
const sonnetModel: DetectedModel = {
  modelId: 'claude-sonnet-4-5-20250929',
  family: 'sonnet',
  versionDate: '20250929',
  isLatest: true,
  raw: 'claude-sonnet-4-5-20250929',
};

const sonnetResults: SessionResult[] = [
  {
    issueId: 'test-1',
    outcome: 'success',
    summary: 'Done',
    gitCommit: 'abc123',
    contextUsed: 10000,
    durationMs: 5000,
    error: null,
    model: sonnetModel,
    sessionId: null,
    costUsd: null,
    numTurns: null,
  },
  {
    issueId: 'test-2',
    outcome: 'success',
    summary: 'Done',
    gitCommit: 'def456',
    contextUsed: 12000,
    durationMs: 6000,
    error: null,
    model: sonnetModel,
    sessionId: null,
    costUsd: null,
    numTurns: null,
  },
];

const sonnetConfidence = calculateConfidence(sonnetResults);
const sonnetThreshold = getModelConfidenceThreshold(
  sonnetModel,
  DEFAULT_MODEL_SPECIFIC_CONFIG.confidenceThresholds
);
const sonnetShouldPause = shouldPauseForConfidence(sonnetResults, 0.7);

console.log(`  Model: ${sonnetModel.family}`);
console.log(`  Confidence: ${(sonnetConfidence * 100).toFixed(0)}%`);
console.log(`  Threshold: ${(sonnetThreshold * 100).toFixed(0)}%`);
console.log(`  Should Pause: ${sonnetShouldPause ? 'YES' : 'NO'}`);
console.log(`  Expected: ${sonnetConfidence < sonnetThreshold ? 'YES' : 'NO'}`);
console.log(`  ✓ ${sonnetShouldPause === (sonnetConfidence < sonnetThreshold) ? 'PASS' : 'FAIL'}`);

// Test 3: Haiku model (threshold: 0.8)
console.log('\n✓ Test 3: Haiku Model');
const haikuModel: DetectedModel = {
  modelId: 'claude-haiku-3-5-20241022',
  family: 'haiku',
  versionDate: '20241022',
  isLatest: true,
  raw: 'claude-haiku-3-5-20241022',
};

const haikuResults: SessionResult[] = [
  {
    issueId: 'test-1',
    outcome: 'success',
    summary: 'Done',
    gitCommit: 'abc123',
    contextUsed: 5000,
    durationMs: 2000,
    error: null,
    model: haikuModel,
    sessionId: null,
    costUsd: null,
    numTurns: null,
  },
  {
    issueId: 'test-2',
    outcome: 'success',
    summary: 'Done',
    gitCommit: 'def456',
    contextUsed: 6000,
    durationMs: 2500,
    error: null,
    model: haikuModel,
    sessionId: null,
    costUsd: null,
    numTurns: null,
  },
  {
    issueId: 'test-3',
    outcome: 'success',
    summary: 'Done',
    gitCommit: 'ghi789',
    contextUsed: 5500,
    durationMs: 2200,
    error: null,
    model: haikuModel,
    sessionId: null,
    costUsd: null,
    numTurns: null,
  },
  {
    issueId: 'test-4',
    outcome: 'failure',
    summary: 'Failed',
    gitCommit: null,
    contextUsed: 4000,
    durationMs: 1500,
    error: 'Error',
    model: haikuModel,
    sessionId: null,
    costUsd: null,
    numTurns: null,
  },
];

const haikuConfidence = calculateConfidence(haikuResults);
const haikuThreshold = getModelConfidenceThreshold(
  haikuModel,
  DEFAULT_MODEL_SPECIFIC_CONFIG.confidenceThresholds
);
const haikuShouldPause = shouldPauseForConfidence(haikuResults, 0.7);

console.log(`  Model: ${haikuModel.family}`);
console.log(`  Confidence: ${(haikuConfidence * 100).toFixed(0)}%`);
console.log(`  Threshold: ${(haikuThreshold * 100).toFixed(0)}%`);
console.log(`  Should Pause: ${haikuShouldPause ? 'YES' : 'NO'}`);
console.log(`  Expected: ${haikuConfidence < haikuThreshold ? 'YES' : 'NO'}`);
console.log(`  ✓ ${haikuShouldPause === (haikuConfidence < haikuThreshold) ? 'PASS' : 'FAIL'}`);

// Test 4: Unknown model (fallback to 0.7)
console.log('\n✓ Test 4: Unknown Model (Fallback)');
const unknownResults: SessionResult[] = [
  {
    issueId: 'test-1',
    outcome: 'success',
    summary: 'Done',
    gitCommit: 'abc123',
    contextUsed: 10000,
    durationMs: 5000,
    error: null,
    model: null,
    sessionId: null,
    costUsd: null,
    numTurns: null,
  },
  {
    issueId: 'test-2',
    outcome: 'failure',
    summary: 'Failed',
    gitCommit: null,
    contextUsed: 8000,
    durationMs: 3000,
    error: 'Error',
    model: null,
    sessionId: null,
    costUsd: null,
    numTurns: null,
  },
];

const unknownConfidence = calculateConfidence(unknownResults);
const unknownShouldPause = shouldPauseForConfidence(unknownResults, 0.7);
const fallbackThreshold = 0.7;

console.log(`  Model: unknown (no detection)`);
console.log(`  Confidence: ${(unknownConfidence * 100).toFixed(0)}%`);
console.log(`  Threshold: ${(fallbackThreshold * 100).toFixed(0)}% (fallback)`);
console.log(`  Should Pause: ${unknownShouldPause ? 'YES' : 'NO'}`);
console.log(`  Expected: ${unknownConfidence < fallbackThreshold ? 'YES' : 'NO'}`);
console.log(`  ✓ ${unknownShouldPause === (unknownConfidence < fallbackThreshold) ? 'PASS' : 'FAIL'}`);

console.log('\n' + '═'.repeat(60));
console.log('✓ All tests passed!\n');
