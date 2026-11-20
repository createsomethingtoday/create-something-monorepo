import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLifecycle, saveLifecycle } from './state-store.mjs';
import { definitionDigest } from './lifecycle.mjs';
const sha = 'a'.repeat(40),
  ref = 'automation/workflow-discovery-state';
const body = { schema: 'workflow-discovery-lifecycle@1', entries: [] };
const ledger = { ...body, digest: definitionDigest(body) };
const envelope = { schema: 'workflow-discovery-state@1', lifecycle: ledger, runs: [] };
test('fixed state branch CAS persists lifecycle and run evidence with independent readback', async () => {
  const calls = [];
  let content = JSON.stringify(envelope);
  const api = async (method, path, body) => {
    calls.push({ method, path, body });
    if (method === 'GET')
      return {
        sha: calls.length > 2 ? 'c'.repeat(40) : sha,
        encoding: 'base64',
        content: Buffer.from(content).toString('base64')
      };
    content = Buffer.from(body.content, 'base64').toString('utf8');
    return { content: { sha: 'c'.repeat(40) } };
  };
  const previous = await loadLifecycle({ api });
  assert.deepEqual(previous, { ledger, sha, runs: [] });
  await saveLifecycle({ api, ledger, sha: previous.sha, runs: [] });
  assert.equal(calls[1].body.sha, sha);
  assert.equal(calls[1].body.branch, ref);
  assert.equal(
    calls[1].path,
    'repos/createsomethingtoday/create-something-monorepo/contents/data/workflow-discovery/lifecycle.json'
  );
});
test('only missing state ref initializes; auth, missing file on existing branch and malformed content hold', async () => {
  const missing = async () => {
    const e = new Error('missing');
    e.status = 404;
    throw e;
  };
  assert.deepEqual(await loadLifecycle({ api: missing }), { ledger: null, sha: null, runs: [] });
  await assert.rejects(
    loadLifecycle({
      api: async () => {
        const e = new Error('denied');
        e.status = 403;
        throw e;
      }
    })
  );
  await assert.rejects(
    loadLifecycle({
      api: async (method, path) => {
        if (path.includes('/contents/')) return missing();
        return { object: { sha } };
      }
    }),
    /state_file_missing_existing_branch/
  );
  await assert.rejects(
    loadLifecycle({
      api: async () => ({
        sha,
        encoding: 'base64',
        content: Buffer.from('secret invalid JSON').toString('base64')
      })
    }),
    /state_invalid/
  );
});
test('conflicts are not retried and changed readback is not accepted', async () => {
  let calls = 0;
  await assert.rejects(
    saveLifecycle({
      ledger,
      sha,
      runs: [],
      api: async () => {
        calls++;
        throw new Error('conflict');
      }
    }),
    /conflict/
  );
  assert.equal(calls, 1);
  await assert.rejects(
    saveLifecycle({
      ledger,
      sha,
      runs: [],
      api: async (method) =>
        method === 'PUT'
          ? { content: { sha } }
          : {
              sha,
              encoding: 'base64',
              content: Buffer.from(JSON.stringify({ ...envelope, runs: [{}] })).toString('base64')
            }
    }),
    /state_invalid|state_readback_mismatch/
  );
});
