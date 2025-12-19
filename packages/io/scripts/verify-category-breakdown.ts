/**
 * Verification script for Category Breakdown Table
 *
 * Tests that:
 * 1. Categories are capitalized correctly (first letter uppercase)
 * 2. Counts display properly (as numbers, not NaN/undefined)
 *
 * Run: npx tsx packages/io/scripts/verify-category-breakdown.ts
 */

interface CategoryData {
  category: string | null | undefined;
  count: number | null | undefined;
}

interface DisplayedCategory {
  label: string;
  count: number;
}

// Capitalizes the first letter of a category (matching +page.svelte logic)
function capitalizeCategory(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

// Transform function matching the exact logic in +page.svelte line 198-199
function transformCategoryForDisplay(c: CategoryData): DisplayedCategory {
  const category = c.category ?? '';
  return {
    label: category.charAt(0).toUpperCase() + category.slice(1),
    count: c.count ?? 0,
  };
}

// Test cases for category capitalization
const capitalizationTestCases: {
  name: string;
  input: string;
  expected: string;
}[] = [
  { name: 'Lowercase category', input: 'navigation', expected: 'Navigation' },
  { name: 'Already capitalized', input: 'Navigation', expected: 'Navigation' },
  { name: 'All uppercase', input: 'INTERACTION', expected: 'INTERACTION' },
  { name: 'Mixed case', input: 'pageView', expected: 'PageView' },
  { name: 'Single letter', input: 'a', expected: 'A' },
  { name: 'With underscore', input: 'page_view', expected: 'Page_view' },
  { name: 'With hyphen', input: 'user-action', expected: 'User-action' },
  { name: 'Empty string', input: '', expected: '' },
];

// Test cases for full transformation (category + count)
const transformTestCases: {
  name: string;
  input: CategoryData;
  expected: DisplayedCategory;
}[] = [
  {
    name: 'Normal category with count',
    input: { category: 'navigation', count: 150 },
    expected: { label: 'Navigation', count: 150 },
  },
  {
    name: 'Zero count',
    input: { category: 'interaction', count: 0 },
    expected: { label: 'Interaction', count: 0 },
  },
  {
    name: 'Null category',
    input: { category: null, count: 50 },
    expected: { label: '', count: 50 },
  },
  {
    name: 'Undefined category',
    input: { category: undefined, count: 25 },
    expected: { label: '', count: 25 },
  },
  {
    name: 'Null count',
    input: { category: 'system', count: null },
    expected: { label: 'System', count: 0 },
  },
  {
    name: 'Undefined count',
    input: { category: 'error', count: undefined },
    expected: { label: 'Error', count: 0 },
  },
  {
    name: 'Both null',
    input: { category: null, count: null },
    expected: { label: '', count: 0 },
  },
  {
    name: 'Both undefined',
    input: { category: undefined, count: undefined },
    expected: { label: '', count: 0 },
  },
  {
    name: 'Large count',
    input: { category: 'analytics', count: 1000000 },
    expected: { label: 'Analytics', count: 1000000 },
  },
  {
    name: 'Negative count (edge case)',
    input: { category: 'debug', count: -5 },
    expected: { label: 'Debug', count: -5 },
  },
];

// Real-world category examples from unified_events
const realWorldCategories = [
  'navigation',
  'interaction',
  'system',
  'engagement',
  'session',
  'error',
];

function runCapitalizationTests(): { passed: number; failed: number } {
  console.log('='.repeat(60));
  console.log('Category Capitalization Tests\n');

  let passed = 0;
  let failed = 0;

  for (const test of capitalizationTestCases) {
    const result = capitalizeCategory(test.input);
    const ok = result === test.expected;

    if (ok) {
      passed++;
      console.log(`[PASS] ${test.name}`);
      console.log(`       Input: "${test.input}" → "${result}"`);
    } else {
      failed++;
      console.log(`[FAIL] ${test.name}`);
      console.log(`       Input: "${test.input}"`);
      console.log(`       Expected: "${test.expected}"`);
      console.log(`       Got: "${result}"`);
    }
  }

  return { passed, failed };
}

function runTransformTests(): { passed: number; failed: number } {
  console.log('\n' + '='.repeat(60));
  console.log('Full Transform Tests (Category + Count)\n');

  let passed = 0;
  let failed = 0;

  for (const test of transformTestCases) {
    const result = transformCategoryForDisplay(test.input);
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
  console.log('Real-World Category Tests\n');

  let passed = 0;
  let failed = 0;

  for (const category of realWorldCategories) {
    const capitalized = capitalizeCategory(category);
    const expectedFirst = category.charAt(0).toUpperCase();
    const actualFirst = capitalized.charAt(0);

    const isCapitalized = actualFirst === expectedFirst;
    const isNotEmpty = capitalized.length > 0;
    const allOk = isCapitalized && isNotEmpty;

    if (allOk) {
      passed++;
      console.log(`[PASS] "${category}" → "${capitalized}"`);
    } else {
      failed++;
      console.log(`[FAIL] "${category}" → "${capitalized}"`);
      if (!isCapitalized) {
        console.log(`       First letter should be "${expectedFirst}", got "${actualFirst}"`);
      }
    }
  }

  return { passed, failed };
}

function runEdgeCaseChecks(): void {
  console.log('\n' + '='.repeat(60));
  console.log('Edge Case Checks\n');

  // Test what happens with empty array (no categories)
  const emptyBreakdown: CategoryData[] = [];
  const emptyResult = emptyBreakdown.map(transformCategoryForDisplay);
  console.log(`Empty breakdown handled: ${emptyResult.length === 0 ? '✓' : '✗'}`);

  // Test very long category name
  const longCategory = 'a'.repeat(100);
  const longResult = capitalizeCategory(longCategory);
  console.log(`Long category (100 chars) handled: ${longResult.charAt(0) === 'A' ? '✓' : '✗'}`);

  // Test special characters
  const specialCategory = '123abc';
  const specialResult = capitalizeCategory(specialCategory);
  console.log(`Numeric prefix handled: ${specialResult === '123abc' ? '✓' : '✗'} ("${specialResult}")`);

  // Test whitespace prefix
  const whitespaceCategory = ' navigation';
  const whitespaceResult = capitalizeCategory(whitespaceCategory);
  console.log(`Whitespace prefix handled: ${whitespaceResult === ' navigation' ? '✓' : '✗'} ("${whitespaceResult}")`);
}

function runDisplaySimulation(): void {
  console.log('\n' + '='.repeat(60));
  console.log('Display Simulation (Simulating HighDensityTable)\n');

  // Simulate API response
  const mockApiResponse = {
    unified: {
      categoryBreakdown: [
        { category: 'navigation', count: 150 },
        { category: 'interaction', count: 75 },
        { category: 'system', count: 30 },
        { category: 'engagement', count: 20 },
      ],
    },
  };

  // Transform exactly as +page.svelte does
  const displayItems = mockApiResponse.unified.categoryBreakdown.map((c: CategoryData) => ({
    label: (c.category ?? '').charAt(0).toUpperCase() + (c.category ?? '').slice(1),
    count: c.count ?? 0,
  }));

  console.log('Simulated table display:');
  console.log('┌────────────────────┬─────────┐');
  console.log('│ Category           │ Count   │');
  console.log('├────────────────────┼─────────┤');

  for (const item of displayItems) {
    const labelPadded = item.label.padEnd(18);
    const countPadded = String(item.count).padStart(7);
    console.log(`│ ${labelPadded} │ ${countPadded} │`);
  }

  console.log('└────────────────────┴─────────┘');

  // Verify all labels are properly capitalized
  const allCapitalized = displayItems.every((item) => {
    const firstChar = item.label.charAt(0);
    return firstChar === firstChar.toUpperCase();
  });

  // Verify all counts are valid numbers
  const allValidCounts = displayItems.every(
    (item) => typeof item.count === 'number' && !Number.isNaN(item.count)
  );

  console.log(`\nAll labels capitalized: ${allCapitalized ? '✓' : '✗'}`);
  console.log(`All counts valid numbers: ${allValidCounts ? '✓' : '✗'}`);
}

// Main
console.log('Category Breakdown Table Verification\n');

const cap = runCapitalizationTests();
const transform = runTransformTests();
const realWorld = runRealWorldTests();
runEdgeCaseChecks();
runDisplaySimulation();

const totalPassed = cap.passed + transform.passed + realWorld.passed;
const totalFailed = cap.failed + transform.failed + realWorld.failed;

console.log('\n' + '='.repeat(60));
console.log(`Final Results: ${totalPassed} passed, ${totalFailed} failed`);

if (totalFailed > 0) {
  console.log('\n⚠️  Some tests failed!');
  process.exit(1);
} else {
  console.log('\n✓ All category breakdown tests passed');
  process.exit(0);
}
