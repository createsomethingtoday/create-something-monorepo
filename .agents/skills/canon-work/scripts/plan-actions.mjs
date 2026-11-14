import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';

const addition = {
  name: 'Check workspace',
  command: 'node .agents/skills/canon-work/scripts/workspace-check.mjs',
  icon: 'test',
};

// Action constraints from https://t3.codes/schema/t3.json, checked 2026-11-14.
// This is a bounded planner, not validation of every root-level schema field.
const actionLimit = 50;
const icons = new Set(['play', 'test', 'lint', 'configure', 'build', 'debug']);
const booleans = ['runOnWorktreeCreate', 'runOnSettle', 'stopOnSettle', 'async', 'autoOpenPreview'];

function checkActions(actions) {
  const names = new Set();
  for (const [index, action] of actions.entries()) {
    const label = `scripts[${index}]`;
    if (!action || typeof action !== 'object' || Array.isArray(action)) {
      throw new Error(`${label} must be an action object`);
    }
    for (const key of ['name', 'command']) {
      if (typeof action[key] !== 'string' || !action[key].length) {
        throw new Error(`${label}.${key} must be a nonempty string`);
      }
    }
    if (names.has(action.name)) throw new Error(`Duplicate action name: ${action.name}`);
    names.add(action.name);
    if (action.icon !== undefined && !icons.has(action.icon)) {
      throw new Error(`${label}.icon is not a supported action icon`);
    }
    for (const key of booleans) {
      if (action[key] !== undefined && typeof action[key] !== 'boolean') {
        throw new Error(`${label}.${key} must be a boolean`);
      }
    }
    if (action.previewUrl !== undefined && (typeof action.previewUrl !== 'string' || !action.previewUrl.length)) {
      throw new Error(`${label}.previewUrl must be a nonempty string`);
    }
  }
}

try {
  if (process.argv.length !== 3) throw new Error('Usage: plan-actions.mjs current-t3.json');
  const current = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  if (!current || Array.isArray(current) || typeof current !== 'object') {
    throw new Error('Expected configuration object');
  }
  if (current.scripts !== undefined && !Array.isArray(current.scripts)) {
    throw new Error('scripts must be an array');
  }
  const actions = current.scripts ?? [];
  checkActions(actions);
  const same = actions.find(action => action.name === addition.name);
  if (same && !isDeepStrictEqual(same, addition)) {
    throw new Error('Action name conflict: Check workspace');
  }
  const proposed = same ? actions : [...actions, addition];
  if (proposed.length > actionLimit) {
    throw new Error(`T3 supports at most ${actionLimit} actions; this proposal would contain ${proposed.length}. Keep the current configuration and review an action to remove.`);
  }
  console.log(JSON.stringify({ ...current, scripts: proposed }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
