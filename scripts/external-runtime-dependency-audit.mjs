import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

const ROOT = resolve(import.meta.dirname, '..');
const POLICY_PATH = resolve(ROOT, 'config/external-runtime-dependency-policy.json');
const INVENTORY_PATH = resolve(
  ROOT,
  'docs/internal/EXTERNAL_RUNTIME_DEPENDENCY_INVENTORY.generated.json'
);
const EXCLUDED = new Set([
  'config/external-runtime-dependency-policy.json',
  'docs/internal/EXTERNAL_RUNTIME_DEPENDENCY_INVENTORY.generated.json',
  'scripts/external-runtime-dependency-audit.mjs',
  'scripts/test/external-runtime-dependency-audit.test.mjs'
]);
const TERMS = /\b(dify|notion)\b/gi;
const FAILING_CATEGORIES = new Set(['current_stack', 'active_runtime', 'unclassified']);

function readPolicy() {
  return JSON.parse(readFileSync(POLICY_PATH, 'utf8'));
}

function trackedFiles() {
  return execFileSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], {
    cwd: ROOT,
    encoding: 'utf8'
  })
    .split('\0')
    .filter(Boolean)
    .filter((path) => !EXCLUDED.has(path))
    .sort((a, b) => a.localeCompare(b));
}

function classify(policy, path, term) {
  for (const rule of policy.rules) {
    if (!rule.terms.includes(term)) continue;
    if (new RegExp(rule.path).test(path)) return rule;
  }
  return {
    id: 'unclassified',
    category: 'unclassified',
    owner: 'unassigned',
    reason: 'No explicit dependency classification rule matched this reference.'
  };
}

function currentStackFindings(policy, path, content) {
  if (!policy.currentStackPaths.some((pattern) => new RegExp(pattern).test(path))) return [];
  return policy.prohibitedCurrentStackPatterns.flatMap((pattern) => {
    const match = new RegExp(pattern, 'i').exec(content);
    if (!match) return [];
    const line = content.slice(0, match.index).split('\n').length;
    return [{ pattern, line, excerpt: match[0].replace(/\s+/g, ' ').slice(0, 240) }];
  });
}

function activeRuntimeFindings(policy, path, content) {
  if (!policy.activeRuntimePaths.some((pattern) => new RegExp(pattern).test(path))) return [];
  return policy.prohibitedActiveRuntimePatterns.flatMap((pattern) => {
    const match = new RegExp(pattern, 'i').exec(content);
    if (!match) return [];
    const line = content.slice(0, match.index).split('\n').length;
    return [{ pattern, line, excerpt: match[0].replace(/\s+/g, ' ').slice(0, 240) }];
  });
}

export function buildInventory(policy = readPolicy()) {
  const references = [];
  const blockers = [];
  const requiredCanonical = [];

  for (const path of trackedFiles()) {
    let content;
    try {
      content = readFileSync(resolve(ROOT, path), 'utf8');
    } catch {
      continue;
    }
    if (content.includes('\0')) continue;

    for (const finding of currentStackFindings(policy, path, content)) {
      blockers.push({ path, category: 'current_stack', ...finding });
    }
    for (const finding of activeRuntimeFindings(policy, path, content)) {
      blockers.push({ path, category: 'active_runtime', ...finding });
    }
    if (policy.requiredCanonicalPaths.includes(path)) {
      requiredCanonical.push({
        path,
        present: content.replace(/\s+/g, ' ').includes(policy.canonicalStatement)
      });
    }

    content.split('\n').forEach((text, index) => {
      const terms = [...new Set([...text.matchAll(TERMS)].map((match) => match[1].toLowerCase()))];
      for (const term of terms) {
        const rule = classify(policy, path, term);
        references.push({
          path,
          line: index + 1,
          term,
          category: rule.category,
          rule: rule.id,
          owner: rule.owner
        });
        if (rule.category === 'unclassified') {
          blockers.push({
            path,
            line: index + 1,
            category: 'unclassified',
            excerpt: text.trim().slice(0, 240)
          });
        }
      }
    });
  }

  for (const requirement of requiredCanonical) {
    if (!requirement.present) {
      blockers.push({
        path: requirement.path,
        line: 1,
        category: 'current_stack',
        excerpt: 'Canonical Cloudflare/OpenAI ownership statement is missing.'
      });
    }
  }

  const grouped = new Map();
  for (const reference of references) {
    const key = [reference.path, reference.term, reference.category, reference.rule].join('\0');
    const existing = grouped.get(key) ?? { ...reference, lines: [] };
    existing.lines.push(reference.line);
    delete existing.line;
    grouped.set(key, existing);
  }
  const entries = [...grouped.values()].sort((a, b) =>
    `${a.path}:${a.term}:${a.category}`.localeCompare(`${b.path}:${b.term}:${b.category}`)
  );
  const unsortedCounts = references.reduce((result, reference) => {
    result[reference.category] = (result[reference.category] ?? 0) + 1;
    return result;
  }, {});
  const counts = Object.fromEntries(
    Object.entries(unsortedCounts).sort(([left], [right]) => left.localeCompare(right))
  );

  return {
    policyVersion: policy.version,
    canonicalStatement: policy.canonicalStatement,
    summary: {
      trackedReferenceCount: references.length,
      trackedFileCount: new Set(references.map((reference) => reference.path)).size,
      counts,
      blockerCount: blockers.length
    },
    requiredCanonical,
    blockers: blockers.sort((a, b) => `${a.path}:${a.line}`.localeCompare(`${b.path}:${b.line}`)),
    entries
  };
}

function serializedInventory() {
  return `${JSON.stringify(buildInventory(), null, 2)}\n`;
}

function main() {
  const command = process.argv[2] ?? 'check';
  const next = serializedInventory();
  if (command === 'generate') {
    writeFileSync(INVENTORY_PATH, next);
  } else if (command === 'check') {
    const existing = readFileSync(INVENTORY_PATH, 'utf8');
    if (existing !== next) {
      console.error('External runtime dependency inventory is stale. Run the generate command.');
      process.exitCode = 1;
      return;
    }
  } else {
    throw new Error(`Unknown command: ${command}`);
  }

  const inventory = JSON.parse(next);
  console.log(JSON.stringify(inventory.summary));
  if (inventory.blockers.some((blocker) => FAILING_CATEGORIES.has(blocker.category))) {
    for (const blocker of inventory.blockers.slice(0, 30)) {
      console.error(`${blocker.category}: ${blocker.path}:${blocker.line} ${blocker.excerpt}`);
    }
    process.exitCode = 1;
  }
}

if (process.argv[1] === new URL(import.meta.url).pathname) main();
