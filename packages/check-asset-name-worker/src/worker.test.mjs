import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import workerModule from './worker.ts';

const worker = workerModule.default ?? workerModule;

const originalFetch = globalThis.fetch;

const BASE_ENV = {
  AIRTABLE_API_KEY: 'test-key',
  AIRTABLE_BASE_ID: 'appTest',
  AIRTABLE_ASSETS_TABLE_ID: 'assets',
  AIRTABLE_CREATORS_TABLE_ID: 'creators',
  AIRTABLE_BANNED_INSTANCES_TABLE_ID: 'bans',
  ALLOWED_ORIGINS: 'https://webflow.com'
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function installAirtableMock(handler) {
  const calls = [];

  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    calls.push(url);
    const body = handler(url);

    if (!body) {
      return jsonResponse({ error: `Unexpected Airtable call: ${url.pathname}` }, 500);
    }

    return jsonResponse(body);
  };

  return calls;
}

async function checkTemplateUser(email, env = BASE_ENV) {
  const response = await worker.fetch(
    new Request('https://worker.test/api/checkTemplateuser', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://webflow.com'
      },
      body: JSON.stringify({ email })
    }),
    env
  );

  return {
    response,
    payload: await response.json()
  };
}

function creatorRecord(fields) {
  return {
    id: 'recCreator',
    fields: {
      Name: 'Template Creator',
      '📧Email': 'creator@example.com',
      '#️⃣👛Templates Published': 0,
      '#️⃣👛Templates Rejected': 0,
      '#️⃣👛Templates Submitted': 0,
      '#️⃣👛Templates Delisted': 0,
      '#️⃣Submission cap count': 0,
      ...fields
    }
  };
}

test('blocks creators with an active banned instance before eligibility checks', async () => {
  const calls = installAirtableMock((url) => {
    if (url.pathname === '/v0/appTest/creators') {
      return {
        records: [
          creatorRecord({
            '❌Banned Instance': ['recBan']
          })
        ]
      };
    }

    if (url.pathname === '/v0/appTest/bans/recBan') {
      return {
        id: 'recBan',
        fields: {
          Name: 'Policy violation',
          'Ban Status': 'Active',
          'Start Date': '2026-01-01',
          'End Date': '2026-02-01',
          Creator: 'Template Creator'
        }
      };
    }
  });

  const { response, payload } = await checkTemplateUser('creator@example.com');

  assert.equal(response.status, 200);
  assert.equal(payload.userExists, true);
  assert.equal(payload.isBanned, true);
  assert.equal(payload.hasError, true);
  assert.match(payload.message, /banned from submitting templates/);
  assert.deepEqual(payload.banDetails, {
    reason: 'Policy violation',
    startDate: '2026-01-01',
    endDate: '2026-02-01',
    creator: 'Template Creator',
    status: 'Active'
  });
  assert.deepEqual(
    calls.map((call) => call.pathname),
    ['/v0/appTest/creators', '/v0/appTest/bans/recBan']
  );
});

test('lets whitelisted creators have concurrent submitted templates', async () => {
  installAirtableMock((url) => {
    if (url.pathname === '/v0/appTest/creators') {
      return {
        records: [
          creatorRecord({
            '📧Email': 'hello@zealousweb.com'
          })
        ]
      };
    }

    if (url.pathname === '/v0/appTest/assets') {
      return {
        records: [
          {
            id: 'recAsset',
            fields: {
              Name: 'Submitted Template',
              '🚀Marketplace Status': 'Submitted for review',
              '📅Submitted Date': '2026-05-01T00:00:00.000Z'
            }
          }
        ]
      };
    }
  });

  const { response, payload } = await checkTemplateUser('Hello@ZealousWeb.com');

  assert.equal(response.status, 200);
  assert.equal(payload.userExists, true);
  assert.equal(payload.hasError, false);
  assert.equal(payload.isWhitelisted, true);
  assert.match(payload.message, /unlimited concurrent submissions/);
});

test('blocks non-whitelisted creators with an active review in progress', async () => {
  installAirtableMock((url) => {
    if (url.pathname === '/v0/appTest/creators') {
      return {
        records: [creatorRecord({})]
      };
    }

    if (url.pathname === '/v0/appTest/assets') {
      return {
        records: [
          {
            id: 'recActiveReview',
            fields: {
              Name: 'Active Review',
              '🚀Marketplace Status': 'Submitted for review',
              '📅Submitted Date': '2026-05-01T00:00:00.000Z'
            }
          }
        ]
      };
    }
  });

  const { response, payload } = await checkTemplateUser('creator@example.com');

  assert.equal(response.status, 200);
  assert.equal(payload.userExists, true);
  assert.equal(payload.hasError, true);
  assert.equal(payload.isWhitelisted, false);
  assert.match(payload.message, /active review in progress/);
});
