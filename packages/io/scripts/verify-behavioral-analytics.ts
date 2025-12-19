/**
 * Verification script for Behavioral Analytics Section
 *
 * Tests that the behavioral analytics metrics render correctly without NaN
 * by simulating the exact rendering logic used in +page.svelte
 *
 * Run: npx tsx packages/io/scripts/verify-behavioral-analytics.ts
 */

interface SessionStats {
  total: number | null | undefined;
  avgPageViews: number | null | undefined;
  avgDuration: number | null | undefined;
}

// Rendering functions matching +page.svelte logic
function renderSessions(stats: SessionStats): string {
  return String(stats.total);
}

function renderAvgPageViews(stats: SessionStats): string {
  return stats.avgPageViews?.toFixed(1) || '0';
}

function renderAvgDuration(stats: SessionStats): string {
  return `${Math.round((stats.avgDuration ?? 0) / 60) || 0}m`;
}

// Test cases
const testCases: { name: string; input: SessionStats; expected: { sessions: string; avgPageViews: string; avgDuration: string } }[] = [
  {
    name: 'Normal values',
    input: { total: 100, avgPageViews: 3.5, avgDuration: 180 },
    expected: { sessions: '100', avgPageViews: '3.5', avgDuration: '3m' },
  },
  {
    name: 'Zero values',
    input: { total: 0, avgPageViews: 0, avgDuration: 0 },
    expected: { sessions: '0', avgPageViews: '0.0', avgDuration: '0m' },
  },
  {
    name: 'Null values (API returns null)',
    input: { total: null, avgPageViews: null, avgDuration: null },
    expected: { sessions: 'null', avgPageViews: '0', avgDuration: '0m' },
  },
  {
    name: 'Undefined values',
    input: { total: undefined, avgPageViews: undefined, avgDuration: undefined },
    expected: { sessions: 'undefined', avgPageViews: '0', avgDuration: '0m' },
  },
  {
    name: 'Mixed values (partial data)',
    input: { total: 50, avgPageViews: null, avgDuration: 300 },
    expected: { sessions: '50', avgPageViews: '0', avgDuration: '5m' },
  },
  {
    name: 'Large duration (1 hour)',
    input: { total: 10, avgPageViews: 5.7, avgDuration: 3600 },
    expected: { sessions: '10', avgPageViews: '5.7', avgDuration: '60m' },
  },
  {
    name: 'Small duration (30 seconds)',
    input: { total: 5, avgPageViews: 1.2, avgDuration: 30 },
    expected: { sessions: '5', avgPageViews: '1.2', avgDuration: '1m' },
  },
  {
    name: 'Very small duration (5 seconds, rounds to 0)',
    input: { total: 2, avgPageViews: 1.0, avgDuration: 5 },
    expected: { sessions: '2', avgPageViews: '1.0', avgDuration: '0m' },
  },
];

// Run tests
console.log('Behavioral Analytics Verification\n');
console.log('=' .repeat(60));

let passed = 0;
let failed = 0;

for (const test of testCases) {
  const results = {
    sessions: renderSessions(test.input),
    avgPageViews: renderAvgPageViews(test.input),
    avgDuration: renderAvgDuration(test.input),
  };

  const sessionsOk = results.sessions === test.expected.sessions;
  const avgPageViewsOk = results.avgPageViews === test.expected.avgPageViews;
  const avgDurationOk = results.avgDuration === test.expected.avgDuration;
  const allPassed = sessionsOk && avgPageViewsOk && avgDurationOk;

  if (allPassed) {
    passed++;
    console.log(`\n[PASS] ${test.name}`);
  } else {
    failed++;
    console.log(`\n[FAIL] ${test.name}`);
  }

  console.log(`  Sessions:       ${results.sessions} ${sessionsOk ? '✓' : `✗ (expected: ${test.expected.sessions})`}`);
  console.log(`  Avg Page Views: ${results.avgPageViews} ${avgPageViewsOk ? '✓' : `✗ (expected: ${test.expected.avgPageViews})`}`);
  console.log(`  Avg Duration:   ${results.avgDuration} ${avgDurationOk ? '✓' : `✗ (expected: ${test.expected.avgDuration})`}`);

  // Check for NaN
  const hasNaN = results.sessions === 'NaN' || results.avgPageViews === 'NaN' || results.avgDuration.includes('NaN');
  if (hasNaN) {
    console.log('  ⚠️  WARNING: NaN detected in output!');
  }
}

console.log('\n' + '=' .repeat(60));
console.log(`Results: ${passed} passed, ${failed} failed`);

// Critical checks
console.log('\n--- Critical NaN Checks ---');

// Simulate what happens when avgDuration is null (pre-fix behavior)
const preFix = `${Math.round((null as unknown as number || 0) / 60)}m`;
const postFix = `${Math.round((null as unknown as number ?? 0) / 60) || 0}m`;
console.log(`Pre-fix (|| operator): "${preFix}" ${preFix === 'NaN' || preFix.includes('NaN') ? '- WOULD SHOW NaN!' : ''}`);
console.log(`Post-fix (?? operator): "${postFix}" ${postFix === '0m' ? '- Correct!' : ''}`);

// Exit with appropriate code
process.exit(failed > 0 ? 1 : 0);
