#!/usr/bin/env node

/**
 * @create-something/harness
 *
 * Routing Report: View Haiku routing experiment results.
 *
 * Usage:
 *   routing-report               # Show full report
 *   routing-report --latest 10   # Show latest 10 experiments
 *   routing-report --csv         # Export to CSV
 */

import {
  generateReport,
  printLatestExperiments,
  exportToCSV,
  readExperiments,
} from '../routing-experiments.js';

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Routing Report: View Haiku routing experiment results

Usage:
  routing-report               # Show full report
  routing-report --latest 10   # Show latest N experiments
  routing-report --csv         # Export to CSV
  routing-report --count       # Show experiment count

Examples:
  routing-report
  routing-report --latest 5
  routing-report --csv > experiments.csv

The routing experiments track:
- Model selection decisions (Haiku, Sonnet, Opus)
- Success rates and quality scores
- Cost savings from optimization
- Validation of the 90% performance hypothesis
`);
    process.exit(0);
  }

  const cwd = process.cwd();

  // Handle --count
  if (args.includes('--count')) {
    const experiments = readExperiments(cwd);
    console.log(`Total routing experiments: ${experiments.length}`);
    process.exit(0);
  }

  // Handle --latest
  const latestIndex = args.indexOf('--latest');
  if (latestIndex !== -1) {
    const count = parseInt(args[latestIndex + 1], 10) || 10;
    printLatestExperiments(count, cwd);
    process.exit(0);
  }

  // Handle --csv
  if (args.includes('--csv')) {
    const csv = exportToCSV(cwd);
    console.log(csv);
    process.exit(0);
  }

  // Default: show full report
  const report = generateReport(cwd);
  console.log(report);
}

main();
