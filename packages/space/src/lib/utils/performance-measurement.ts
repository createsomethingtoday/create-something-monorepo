/**
 * Performance measurement utilities for learning experiments
 * Completes the hermeneutic circle by enabling learners to verify performance claims
 */

export interface PerformanceMeasurement {
  operation: string;
  duration: number; // milliseconds
  iterations: number;
}

export interface PerformanceComparison {
  baseline: PerformanceMeasurement;
  alternative: PerformanceMeasurement;
  difference: number; // milliseconds
  percentDifference: number; // percentage
  verdict: 'negligible' | 'minor' | 'significant';
}

/**
 * Measure the execution time of an async operation
 */
export async function measureAsync(
  operation: () => Promise<any>,
  iterations: number = 1
): Promise<PerformanceMeasurement> {
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    await operation();
  }

  const end = performance.now();
  const duration = (end - start) / iterations; // Average per iteration

  return {
    operation: operation.name || 'anonymous',
    duration,
    iterations
  };
}

/**
 * Measure the execution time of a sync operation
 */
export function measureSync(
  operation: () => any,
  iterations: number = 1
): PerformanceMeasurement {
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    operation();
  }

  const end = performance.now();
  const duration = (end - start) / iterations;

  return {
    operation: operation.name || 'anonymous',
    duration,
    iterations
  };
}

/**
 * Compare two operations and determine significance
 */
export function comparePerformance(
  baseline: PerformanceMeasurement,
  alternative: PerformanceMeasurement
): PerformanceComparison {
  const difference = Math.abs(alternative.duration - baseline.duration);
  const percentDifference = (difference / baseline.duration) * 100;

  let verdict: 'negligible' | 'minor' | 'significant';

  if (difference < 0.1) {
    verdict = 'negligible'; // < 0.1ms difference
  } else if (difference < 1) {
    verdict = 'minor'; // 0.1-1ms difference
  } else {
    verdict = 'significant'; // > 1ms difference
  }

  return {
    baseline,
    alternative,
    difference,
    percentDifference,
    verdict
  };
}

/**
 * Format performance measurement for display
 */
export function formatMeasurement(measurement: PerformanceMeasurement): string {
  return `${measurement.duration.toFixed(3)}ms`;
}

/**
 * Format performance comparison for display
 */
export function formatComparison(comparison: PerformanceComparison): string {
  const { baseline, alternative, difference, percentDifference, verdict } = comparison;

  let verdictEmoji = '';
  let verdictText = '';

  switch (verdict) {
    case 'negligible':
      verdictEmoji = '≈';
      verdictText = 'Negligible difference - choose based on readability';
      break;
    case 'minor':
      verdictEmoji = '⚡';
      verdictText = 'Minor difference - only matters at high scale';
      break;
    case 'significant':
      verdictEmoji = '🔥';
      verdictText = 'Significant difference - consider for production';
      break;
  }

  return `
${verdictEmoji} Performance Comparison

Baseline:    ${formatMeasurement(baseline)}
Alternative: ${formatMeasurement(alternative)}
Difference:  ${difference.toFixed(3)}ms (${percentDifference.toFixed(1)}%)

${verdictText}
  `.trim();
}

/**
 * Example usage templates for learners
 */
export const examples = {
  basic: `
// Measure a single operation
const measure = async (fn) => {
  const start = performance.now();
  await fn();
  return (performance.now() - start).toFixed(3) + 'ms';
};

console.log(await measure(() => env.CACHE.get('key')));
  `.trim(),

  comparison: `
// Compare two approaches
const baseline = await measureAsync(() => JSON.parse(stored));
const alternative = await measureAsync(() => { const {name, score} = JSON.parse(stored); });

const comparison = comparePerformance(baseline, alternative);
console.log(formatComparison(comparison));
  `.trim(),

  iterations: `
// Measure with multiple iterations for accuracy
const result = await measureAsync(
  () => env.CACHE.put('key', 'value'),
  1000 // Run 1000 times and average
);

console.log(\`Average: \${formatMeasurement(result)}\`);
  `.trim()
};
