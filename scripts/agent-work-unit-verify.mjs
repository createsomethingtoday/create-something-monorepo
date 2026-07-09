#!/usr/bin/env node
import { validate_agent_contract_file } from '../packages/symphony/src/work-unit-contract.js';

function usage() {
  console.log(`Usage:
  node scripts/agent-work-unit-verify.mjs [--json] <contract.json> [...]

Validates multi-agent work-unit and evidence receipt JSON contracts before
Symphony or an operator dispatches repo work.`);
}

const args = process.argv.slice(2);
const json = args.includes('--json');
const paths = args.filter((arg) => arg !== '--json');

if (paths.length === 0 || paths.includes('--help') || paths.includes('-h')) {
  usage();
  process.exit(paths.length === 0 ? 1 : 0);
}

const results = [];
for (const path of paths) results.push(await validate_agent_contract_file(path));

if (json) {
  console.log(JSON.stringify(results, null, 2));
} else {
  for (const result of results) {
    if (result.ok) {
      console.log(`OK ${result.path} (${result.kind})`);
      continue;
    }
    console.error(`FAIL ${result.path}`);
    for (const error of result.errors) console.error(`- ${error}`);
  }
}

process.exit(results.every((result) => result.ok) ? 0 : 1);
