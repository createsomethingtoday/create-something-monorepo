import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
const children = [];
let denied = false;
try {
  for (let i = 0; i < 40; i++) {
    const child = spawn('/bin/sleep', ['10']);
    children.push(child);
    const code = await new Promise(resolve => {
      child.once('spawn', () => resolve('spawned'));
      child.once('error', error => resolve(error.code));
    });
    if (code === 'EAGAIN') { denied = true; break; }
    assert.equal(code, 'spawned');
  }
} finally { for (const child of children) child.kill('SIGKILL'); }
assert.equal(denied, true);
console.log('pids:bounded');
