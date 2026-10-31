import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('only the bundled main webview can listen for native review navigation',async()=>{
 const capability=JSON.parse(await readFile(new URL('../src-tauri/capabilities/attention.json',import.meta.url),'utf8'));
 assert.deepEqual(capability.windows,['main']);assert.equal(capability.remote,undefined);
 assert.deepEqual(capability.permissions,['core:event:allow-listen','core:event:allow-unlisten']);
});
