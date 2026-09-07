import assert from 'node:assert/strict';
import ts from 'typescript';

export function verifyCheckout({ sourceSha, status }) {
  assert.match(sourceSha, /^[a-f0-9]{40}$/);
  assert.equal(status.trim(), '', 'Production adoption verification requires a clean checkout; use pnpm ground for development review.');
  return { source_sha: sourceSha, dirty: false };
}

export function verifyModuleInventory(discovered, inventory) {
  assert(inventory.length > 0, 'The reviewed module inventory must not be empty.');
  assert.deepEqual([...discovered].sort(), inventory.map(item => item.module).sort(),
    'Source module inventory changed; review additions, removals, and duplicates before promotion.');
}

export function verifyScanCoverage(actual, expected) {
  for (const [field, count] of Object.entries(expected)) {
    assert(Number.isSafeInteger(count) && count > 0, 'Reviewed scan coverage must be positive.');
    assert.equal(actual[field], count, 'Scan coverage changed: ' + field);
  }
}

export function verifyAdjudicatedExports({ modules, adjudication, publicIndex, packageExports }) {
  assert.equal(packageExports['.'].default, './dist/index.js');
  verifyModuleInventory(modules.map(item => item.module), adjudication.inventory);
  for (const module of modules) {
    const expected = adjudication.inventory.find(item => item.module === module.module);
    assert(Number.isSafeInteger(expected.total_exports) && expected.total_exports >= 0,
      'Invalid reviewed export total for ' + module.module);
    assert.equal(module.total_exports, expected.total_exports,
      'Parsed export coverage changed for ' + module.module + '; review before promotion.');
  }
  const detected = modules.flatMap(module => module.dead_exports.map(item => module.module + ':' + item.name)).sort();
  const reviewed = adjudication.modules.flatMap(module => module.symbols.map(name => module.module + ':' + name)).sort();
  assert.deepEqual(detected, reviewed, 'Detected and adjudicated export sets differ; review additions, omissions, and duplicates before promotion.');
  const publicExports = new Map();
  const syntax = ts.createSourceFile('index.ts', publicIndex, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  assert.equal(syntax.parseDiagnostics.length, 0, 'Public entry point must parse successfully.');
  for (const statement of syntax.statements) {
    if (!ts.isExportDeclaration(statement) || !statement.moduleSpecifier ||
        !ts.isStringLiteral(statement.moduleSpecifier) || !statement.exportClause ||
        !ts.isNamedExports(statement.exportClause)) continue;
    const source = statement.moduleSpecifier.text;
    if (!source.startsWith('./') || !source.endsWith('.js')) continue;
    const module = 'packages/mcp-core/src/' + source.slice(2, -3) + '.ts';
    const exports = publicExports.get(module) || new Map();
    for (const specifier of statement.exportClause.elements) {
      // An alias does not retain the original public name.
      if (specifier.propertyName && specifier.propertyName.text !== specifier.name.text) continue;
      exports.set(specifier.name.text, statement.isTypeOnly || specifier.isTypeOnly ? 'type' : 'value');
    }
    publicExports.set(module, exports);
  }
  for (const module of modules) {
    const reviewed = adjudication.modules.find(item => item.module === module.module);
    for (const item of module.dead_exports) {
      assert(reviewed?.symbols.includes(item.name), 'Unreviewed dead-export finding: ' + module.module + ':' + item.name);
      const actualKind = publicExports.get(module.module)?.get(item.name);
      assert(actualKind, 'Retained symbol is no longer in the reviewed public API: ' + item.name);
      const expectedKind = reviewed.export_kinds?.[item.name];
      assert(['type', 'value'].includes(expectedKind), 'Retained symbol requires a reviewed export kind: ' + item.name);
      assert.equal(actualKind, expectedKind, 'Public export kind changed: ' + item.name);
    }
  }
  return modules.reduce((sum, item) => sum + item.dead_exports.length, 0);
}
