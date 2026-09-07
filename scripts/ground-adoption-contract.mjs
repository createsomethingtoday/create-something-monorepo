import assert from 'node:assert/strict';

export function verifyCheckout({ sourceSha, status }) {
  assert.match(sourceSha, /^[a-f0-9]{40}$/);
  assert.equal(status.trim(), '', 'Production adoption verification requires a clean checkout; use pnpm ground for development review.');
  return { source_sha: sourceSha, dirty: false };
}

export function verifyAdjudicatedExports({ modules, adjudication, publicIndex, packageExports }) {
  assert.equal(packageExports['.'].default, './dist/index.js');
  const detected = modules.flatMap(module => module.dead_exports.map(item => module.module + ':' + item.name)).sort();
  const reviewed = adjudication.modules.flatMap(module => module.symbols.map(name => module.module + ':' + name)).sort();
  assert.deepEqual(detected, reviewed, 'Detected and adjudicated export sets differ; review additions, omissions, and duplicates before promotion.');
  const publicExports = new Map();
  for (const match of publicIndex.matchAll(/export\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"]\.\/([^'"]+)\.js['"]/g)) {
    const module = 'packages/mcp-core/src/' + match[2] + '.ts';
    publicExports.set(module, [...(publicExports.get(module) || []),
      ...match[1].split(',').map(name => name.trim()).filter(Boolean)]);
  }
  for (const module of modules) {
    const reviewed = adjudication.modules.find(item => item.module === module.module);
    for (const item of module.dead_exports) {
      assert(reviewed?.symbols.includes(item.name), 'Unreviewed dead-export finding: ' + module.module + ':' + item.name);
      assert(publicExports.get(module.module)?.includes(item.name), 'Retained symbol is no longer in the reviewed public API: ' + item.name);
    }
  }
  return modules.reduce((sum, item) => sum + item.dead_exports.length, 0);
}
