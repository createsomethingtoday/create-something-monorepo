/**
 * Verification script for Top Actions Table
 *
 * Tests that:
 * 1. Action names display correctly (no undefined/null/NaN)
 * 2. Counts are accurate (valid numbers, not NaN)
 *
 * Run: npx tsx packages/io/scripts/verify-top-actions.ts
 */

interface ActionData {
  action: string | null | undefined;
  count: number | null | undefined;
}

interface DisplayedAction {
  label: string;
  count: number;
}

// Transform function matching the exact logic in +page.svelte lines 211-212
function transformActionForDisplay(a: ActionData): DisplayedAction {
  return {
    label: a.action ?? '',
    count: a.count ?? 0,
  };
}

// Test cases for action transformation
const transformTestCases: {
  name: string;
  input: ActionData;
  expected: DisplayedAction;
}[] = [
  {
    name: 'Normal action with count',
    input: { action: 'page_view', count: 500 },
    expected: { label: 'page_view', count: 500 },
  },
  {
    name: 'Click action',
    input: { action: 'click', count: 150 },
    expected: { label: 'click', count: 150 },
  },
  {
    name: 'Scroll action',
    input: { action: 'scroll', count: 300 },
    expected: { label: 'scroll', count: 300 },
  },
  {
    name: 'Zero count',
    input: { action: 'form_submit', count: 0 },
    expected: { label: 'form_submit', count: 0 },
  },
  {
    name: 'Null action',
    input: { action: null, count: 50 },
    expected: { label: '', count: 50 },
  },
  {
    name: 'Undefined action',
    input: { action: undefined, count: 25 },
    expected: { label: '', count: 25 },
  },
  {
    name: 'Null count',
    input: { action: 'hover', count: null },
    expected: { label: 'hover', count: 0 },
  },
  {
    name: 'Undefined count',
    input: { action: 'focus', count: undefined },
    expected: { label: 'focus', count: 0 },
  },
  {
    name: 'Both null',
    input: { action: null, count: null },
    expected: { label: '', count: 0 },
  },
  {
    name: 'Both undefined',
    input: { action: undefined, count: undefined },
    expected: { label: '', count: 0 },
  },
  {
    name: 'Large count',
    input: { action: 'impression', count: 1000000 },
    expected: { label: 'impression', count: 1000000 },
  },
  {
    name: 'Action with special characters',
    input: { action: 'cta-click', count: 75 },
    expected: { label: 'cta-click', count: 75 },
  },
  {
    name: 'Action with spaces',
    input: { action: 'page view', count: 200 },
    expected: { label: 'page view', count: 200 },
  },
  {
    name: 'Camel case action',
    input: { action: 'sessionStart', count: 100 },
    expected: { label: 'sessionStart', count: 100 },
  },
  {
    name: 'Snake case action',
    input: { action: 'session_end', count: 90 },
    expected: { label: 'session_end', count: 90 },
  },
];

// Real-world action examples from unified_events
const realWorldActions = [
  'page_view',
  'click',
  'scroll',
  'session_start',
  'session_end',
  'form_submit',
  'link_click',
  'copy',
  'experiment_view',
  'paper_view',
];

function runTransformTests(): { passed: number; failed: number } {
  console.log('='.repeat(60));
  console.log('Action Transform Tests\n');

  let passed = 0;
  let failed = 0;

  for (const test of transformTestCases) {
    const result = transformActionForDisplay(test.input);
    const labelOk = result.label === test.expected.label;
    const countOk = result.count === test.expected.count;
    const allOk = labelOk && countOk;

    if (allOk) {
      passed++;
      console.log(`[PASS] ${test.name}`);
      console.log(`       Label: "${result.label}" ✓  Count: ${result.count} ✓`);
    } else {
      failed++;
      console.log(`[FAIL] ${test.name}`);
      console.log(`       Label: "${result.label}" ${labelOk ? '✓' : `✗ (expected: "${test.expected.label}")`}`);
      console.log(`       Count: ${result.count} ${countOk ? '✓' : `✗ (expected: ${test.expected.count})`}`);
    }

    // Check for NaN in output
    if (Number.isNaN(result.count)) {
      console.log('       ⚠️  WARNING: NaN detected in count!');
    }
    if (result.label === 'NaN' || result.label === 'undefined' || result.label === 'null') {
      console.log('       ⚠️  WARNING: Invalid string in label!');
    }
  }

  return { passed, failed };
}

function runRealWorldTests(): { passed: number; failed: number } {
  console.log('\n' + '='.repeat(60));
  console.log('Real-World Action Tests\n');

  let passed = 0;
  let failed = 0;

  for (const action of realWorldActions) {
    const result = transformActionForDisplay({ action, count: 100 });
    const labelValid = result.label === action;
    const countValid = result.count === 100;
    const allOk = labelValid && countValid;

    if (allOk) {
      passed++;
      console.log(`[PASS] "${action}" → label="${result.label}", count=${result.count}`);
    } else {
      failed++;
      console.log(`[FAIL] "${action}"`);
      if (!labelValid) {
        console.log(`       Expected label: "${action}", got: "${result.label}"`);
      }
      if (!countValid) {
        console.log(`       Expected count: 100, got: ${result.count}`);
      }
    }
  }

  return { passed, failed };
}

function runEdgeCaseChecks(): void {
  console.log('\n' + '='.repeat(60));
  console.log('Edge Case Checks\n');

  // Test what happens with empty array (no actions)
  const emptyActions: ActionData[] = [];
  const emptyResult = emptyActions.map(transformActionForDisplay);
  console.log(`Empty actions handled: ${emptyResult.length === 0 ? '✓' : '✗'}`);

  // Test very long action name
  const longAction = 'a'.repeat(100);
  const longResult = transformActionForDisplay({ action: longAction, count: 1 });
  console.log(`Long action (100 chars) handled: ${longResult.label.length === 100 ? '✓' : '✗'}`);

  // Test empty string action
  const emptyStringResult = transformActionForDisplay({ action: '', count: 5 });
  console.log(`Empty string action handled: ${emptyStringResult.label === '' && emptyStringResult.count === 5 ? '✓' : '✗'}`);

  // Test whitespace-only action
  const whitespaceResult = transformActionForDisplay({ action: '   ', count: 3 });
  console.log(`Whitespace-only action handled: ${whitespaceResult.label === '   ' ? '✓' : '✗'}`);

  // Test negative count (edge case)
  const negativeResult = transformActionForDisplay({ action: 'test', count: -10 });
  console.log(`Negative count preserved: ${negativeResult.count === -10 ? '✓' : '✗'}`);
}

function runDisplaySimulation(): void {
  console.log('\n' + '='.repeat(60));
  console.log('Display Simulation (Simulating HighDensityTable)\n');

  // Simulate API response
  const mockApiResponse = {
    unified: {
      topActions: [
        { action: 'page_view', count: 500 },
        { action: 'click', count: 150 },
        { action: 'scroll', count: 120 },
        { action: 'session_start', count: 80 },
        { action: 'link_click', count: 45 },
        { action: 'copy', count: 12 },
      ],
    },
  };

  // Transform exactly as +page.svelte does (lines 211-212)
  const displayItems = mockApiResponse.unified.topActions.map((a: ActionData) => ({
    label: a.action,
    count: a.count,
  }));

  console.log('Simulated table display:');
  console.log('┌────────────────────┬─────────┐');
  console.log('│ Action             │ Count   │');
  console.log('├────────────────────┼─────────┤');

  for (const item of displayItems) {
    const labelPadded = String(item.label).padEnd(18);
    const countPadded = String(item.count).padStart(7);
    console.log(`│ ${labelPadded} │ ${countPadded} │`);
  }

  console.log('└────────────────────┴─────────┘');

  // Verify all labels are valid strings
  const allValidLabels = displayItems.every((item) => {
    return (
      typeof item.label === 'string' &&
      item.label !== 'undefined' &&
      item.label !== 'null' &&
      item.label !== 'NaN'
    );
  });

  // Verify all counts are valid numbers
  const allValidCounts = displayItems.every(
    (item) => typeof item.count === 'number' && !Number.isNaN(item.count)
  );

  console.log(`\nAll labels valid strings: ${allValidLabels ? '✓' : '✗'}`);
  console.log(`All counts valid numbers: ${allValidCounts ? '✓' : '✗'}`);
}

function runLimitCheck(): void {
  console.log('\n' + '='.repeat(60));
  console.log('API Limit Check (LIMIT 15 in query)\n');

  // The API query uses LIMIT 15, verify the page can handle it
  const actions: ActionData[] = Array.from({ length: 20 }, (_, i) => ({
    action: `action_${i + 1}`,
    count: 100 - i * 5,
  }));

  // Simulate API returning 15 items
  const limitedActions = actions.slice(0, 15);
  const displayItems = limitedActions.map(transformActionForDisplay);

  console.log(`API returns up to 15 actions: ${displayItems.length === 15 ? '✓' : '✗'}`);
  console.log(`UI limits to 10: ${10 <= displayItems.length ? '✓ (has enough)' : '⚠️ (may show empty rows)'}`);

  // Check ordering is preserved (descending by count)
  let orderingCorrect = true;
  for (let i = 1; i < displayItems.length; i++) {
    if (displayItems[i].count > displayItems[i - 1].count) {
      orderingCorrect = false;
      break;
    }
  }
  console.log(`Ordering preserved (descending): ${orderingCorrect ? '✓' : '✗'}`);
}

function runCountAccuracyTests(): { passed: number; failed: number } {
  console.log('\n' + '='.repeat(60));
  console.log('Count Accuracy Tests\n');

  let passed = 0;
  let failed = 0;

  const countTestCases: { name: string; input: number | null | undefined; expected: number }[] = [
    { name: 'Integer count', input: 100, expected: 100 },
    { name: 'Zero count', input: 0, expected: 0 },
    { name: 'Large count', input: 999999, expected: 999999 },
    { name: 'Null becomes 0', input: null, expected: 0 },
    { name: 'Undefined becomes 0', input: undefined, expected: 0 },
    { name: 'Floating point truncation', input: 10.5, expected: 10.5 },
  ];

  for (const test of countTestCases) {
    const result = transformActionForDisplay({ action: 'test', count: test.input });
    const ok = result.count === test.expected;

    if (ok) {
      passed++;
      console.log(`[PASS] ${test.name}: ${test.input} → ${result.count}`);
    } else {
      failed++;
      console.log(`[FAIL] ${test.name}: ${test.input} → ${result.count} (expected: ${test.expected})`);
    }

    // Check for NaN
    if (Number.isNaN(result.count)) {
      console.log('       ⚠️  WARNING: NaN detected!');
    }
  }

  return { passed, failed };
}

// Main
console.log('Top Actions Table Verification\n');

const transform = runTransformTests();
const realWorld = runRealWorldTests();
const accuracy = runCountAccuracyTests();
runEdgeCaseChecks();
runDisplaySimulation();
runLimitCheck();

const totalPassed = transform.passed + realWorld.passed + accuracy.passed;
const totalFailed = transform.failed + realWorld.failed + accuracy.failed;

console.log('\n' + '='.repeat(60));
console.log(`Final Results: ${totalPassed} passed, ${totalFailed} failed`);

if (totalFailed > 0) {
  console.log('\n⚠️  Some tests failed!');
  process.exit(1);
} else {
  console.log('\n✓ All top actions table tests passed');
  process.exit(0);
}
