import assert from 'node:assert/strict';
import { openSync, writeSync, closeSync } from 'node:fs';
const file = openSync('/tmp/capacity', 'w');
let error;
try { for (let i = 0; i < 20; i++) writeSync(file, Buffer.alloc(1048576, 1)); }
catch (e) { error = e.code; }
finally { closeSync(file); }
assert.equal(error, 'ENOSPC');
console.log('scratch:bounded');
