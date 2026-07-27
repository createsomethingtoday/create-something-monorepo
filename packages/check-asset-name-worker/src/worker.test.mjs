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

async function checkTemplateName(templatename, env = BASE_ENV) {
  const response = await worker.fetch(
    new Request('https://worker.test/api/checkTemplatename', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://webflow.com'
      },
      body: JSON.stringify({ templatename })
    }),
    env
  );

  return {
    response,
    payload: await response.json()
  };
}

async function checkLibraryName(libraryname, env = BASE_ENV) {
  const response = await worker.fetch(
    new Request('https://worker.test/api/checkLibraryname', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://webflow.com'
      },
      body: JSON.stringify({ libraryname })
    }),
    env
  );

  return {
    response,
    payload: await response.json()
  };
}

async function checkLibraryEmail(email, env = BASE_ENV) {
  const response = await worker.fetch(
    new Request('https://worker.test/api/checkLibraryemail', {
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

async function checkLibraryUser(email, env = BASE_ENV) {
  const response = await worker.fetch(
    new Request('https://worker.test/api/checkLibraryuser', {
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

test('blocks agent-like template names before Airtable lookup', async () => {
  globalThis.fetch = async () => {
    throw new Error('Airtable should not be called for blocked names');
  };

  for (const name of [
    'Agentra0',
    'Agent Lite',
    'Neilani Agents DB',
    'Ag3n7 Studio',
    'A-g-e-n-t Studio',
    'NexAgent'
  ]) {
    const { response, payload } = await checkTemplateName(name);

    assert.equal(response.status, 400, `${name} should fail validation`);
    assert.match(payload.message, /agent/i);
  }
});

test('does not block nearby non-agent template names', async () => {
  const calls = installAirtableMock((url) => {
    if (url.pathname === '/v0/appTest/assets') {
      return { records: [] };
    }
  });

  const { response, payload } = await checkTemplateName('Magenta Studio');

  assert.equal(response.status, 200);
  assert.deepEqual(payload, { taken: false });
  assert.equal(calls.length, 1);
});

test('checks library user existence and permission against legacy library tables by default', async () => {
  const calls = installAirtableMock((url) => {
    if (url.pathname === '/v0/appTest/tbldQNGszIyOjt9a1') {
      assert.match(url.searchParams.get('filterByFormula'), /fldFNavkQ2JJ6Kxt2/);
      return {
        records: [
          {
            id: 'recLibraryUser',
            fields: {
              Name: 'Library User'
            }
          }
        ]
      };
    }

    if (url.pathname === '/v0/appTest/creators') {
      assert.match(url.searchParams.get('filterByFormula'), /fldhvneqrRuoF5grB/);
      return {
        records: [
          {
            id: 'recPermission',
            fields: {
              Name: 'Template User',
              '⚙️Can submit Libraries?': 1
            }
          }
        ]
      };
    }
  });

  const { response, payload } = await checkLibraryUser('creator@example.com');

  assert.equal(response.status, 200);
  assert.deepEqual(payload, {
    userExists: true,
    canSubmitLibraries: true,
    hasError: false,
    message: 'Creator can submit Libraries.'
  });
  assert.equal(calls.length, 2);
});

test('clarifies template name availability backend authorization errors', async () => {
  globalThis.fetch = async () =>
    jsonResponse({ error: 'You are not authorized to perform this operation' }, 403);

  const { response, payload } = await checkTemplateName('Valid Template');

  assert.equal(response.status, 503);
  assert.match(payload.message, /marketplace name lookup is not authorized/);
  assert.doesNotMatch(payload.message, /You are not authorized/);
});

test('checks library names against library assets only', async () => {
  const calls = installAirtableMock((url) => {
    if (url.pathname === '/v0/appTest/assets') {
      assert.match(url.searchParams.get('filterByFormula'), /\{🆎Type\} = 'Library📚'/);
      assert.match(url.searchParams.get('filterByFormula'), /\{⚙️🆎Type \(Text\)\} = 'Library📚'/);
      return {
        records: [
          {
            id: 'recLibrary',
            fields: {
              Name: 'Radiant UI Library',
              '🆎Type': 'Library📚',
              '⚙️🆎Type (Text)': 'Library📚'
            }
          }
        ]
      };
    }
  });

  const { response, payload } = await checkLibraryName('Radiant UI');

  assert.equal(response.status, 200);
  assert.deepEqual(payload, { taken: true });
  assert.equal(calls.length, 1);
});

test('checks library creator email with the existing creator lookup contract', async () => {
  installAirtableMock((url) => {
    if (url.pathname === '/v0/appTest/creators') {
      return { records: [creatorRecord({})] };
    }
  });

  const { response, payload } = await checkLibraryEmail('creator@example.com');

  assert.equal(response.status, 200);
  assert.deepEqual(payload, {
    emailExists: true,
    message: 'This email is already in use.'
  });
});

test('checks configured library user permission', async () => {
  const calls = installAirtableMock((url) => {
    if (url.pathname === '/v0/appTest/libraryUsers') {
      assert.match(url.searchParams.get('filterByFormula'), /REGEX_MATCH/);
      return {
        records: [
          {
            id: 'recLibraryUser',
            fields: {
              Name: 'Library Creator',
              Email: 'creator@example.com',
              'Can submit Libraries': 'Approved'
            }
          }
        ]
      };
    }
  });

  const env = {
    ...BASE_ENV,
    AIRTABLE_LIBRARY_USERS_TABLE_ID: 'libraryUsers',
    AIRTABLE_LIBRARY_USER_EMAIL_FIELDS: 'Email',
    AIRTABLE_LIBRARY_PERMISSION_FIELD: 'Can submit Libraries',
    AIRTABLE_LIBRARY_PERMISSION_ALLOWED_VALUES: 'Approved'
  };

  const { response, payload } = await checkLibraryUser('creator@example.com', env);

  assert.equal(response.status, 200);
  assert.deepEqual(payload, {
    userExists: true,
    canSubmitLibraries: true,
    hasError: false,
    message: 'Creator can submit Libraries.'
  });
  assert.equal(calls.length, 2);
});

test('blocks unapproved library users', async () => {
  installAirtableMock((url) => {
    if (url.pathname === '/v0/appTest/libraryUsers') {
      return {
        records: [
          {
            id: 'recLibraryUser',
            fields: {
              Name: 'Library Creator',
              Email: 'creator@example.com',
              'Can submit Libraries': 'No'
            }
          }
        ]
      };
    }
  });

  const env = {
    ...BASE_ENV,
    AIRTABLE_LIBRARY_USERS_TABLE_ID: 'libraryUsers',
    AIRTABLE_LIBRARY_USER_EMAIL_FIELDS: 'Email',
    AIRTABLE_LIBRARY_PERMISSION_FIELD: 'Can submit Libraries'
  };

  const { response, payload } = await checkLibraryUser('creator@example.com', env);

  assert.equal(response.status, 200);
  assert.equal(payload.userExists, true);
  assert.equal(payload.canSubmitLibraries, false);
  assert.equal(payload.hasError, true);
  assert.match(payload.message, /not approved/);
});

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

test('blocks a creator when recent submissions are beyond Airtable page one', async () => {
  const recentSubmissionDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const firstPage = Array.from({ length: 100 }, (_, index) => ({
    id: `recPublished${index}`,
    fields: {
      Name: `Published Template ${index}`,
      '🚀Marketplace Status': 'Published',
      '📅Submitted Date': '2024-01-01T00:00:00.000Z'
    }
  }));
  const secondPage = Array.from({ length: 6 }, (_, index) => ({
    id: `recRecent${index}`,
    fields: {
      Name: `Recent Template ${index}`,
      '🚀Marketplace Status': 'Submitted for review',
      '📅Submitted Date': recentSubmissionDate
    }
  }));

  const calls = installAirtableMock((url) => {
    if (url.pathname === '/v0/appTest/creators') {
      return { records: [creatorRecord({})] };
    }

    if (url.pathname === '/v0/appTest/assets') {
      return url.searchParams.get('offset') === 'page-2'
        ? { records: secondPage }
        : { records: firstPage, offset: 'page-2' };
    }
  });

  const { response, payload } = await checkTemplateUser('creator@example.com', {
    ...BASE_ENV,
    AIRTABLE_ASSETS_VIEW_ID: 'viewThatExcludesDelistedTemplates'
  });

  assert.equal(response.status, 200);
  assert.equal(payload.assetsSubmitted30, 6);
  assert.equal(payload.submittedTemplates, 106);
  assert.equal(payload.hasError, true);
  assert.match(payload.message, /past 30 days/);

  const assetCalls = calls.filter((call) => call.pathname === '/v0/appTest/assets');
  assert.equal(assetCalls.length, 2);
  assert.equal(assetCalls[0].searchParams.has('view'), false);
  assert.equal(assetCalls[1].searchParams.get('offset'), 'page-2');
});

test('uses exact asset timestamps when the creator rollup retains expired submissions', async () => {
  const recentSubmissionDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const expiredSubmissionDate = new Date(
    Date.now() - (30 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000)
  ).toISOString();

  installAirtableMock((url) => {
    if (url.pathname === '/v0/appTest/creators') {
      return {
        records: [
          creatorRecord({
            '#️⃣👛Templates Published': 310,
            '#️⃣👛Templates Submitted': 348,
            '#️⃣👛Templates Delisted': 8,
            '#️⃣Submission cap count': 7
          })
        ]
      };
    }

    if (url.pathname === '/v0/appTest/assets') {
      return {
        records: [
          {
            id: 'recRecentPublished',
            fields: {
              Name: 'Recent Published Template',
              '🚀Marketplace Status': 'Published',
              '📅Submitted Date': recentSubmissionDate
            }
          },
          {
            id: 'recRecentRejected',
            fields: {
              Name: 'Recent Rejected Template',
              '🚀Marketplace Status': 'Rejected',
              '📅Submitted Date': recentSubmissionDate
            }
          },
          {
            id: 'recRecentDelisted',
            fields: {
              Name: 'Recent Delisted Template',
              '🚀Marketplace Status': 'Delisted',
              '📅Submitted Date': recentSubmissionDate
            }
          },
          ...Array.from({ length: 2 }, (_, index) => ({
            id: `recRecent${index}`,
            fields: {
              Name: `Recent Template ${index}`,
              '🚀Marketplace Status': 'Published',
              '📅Submitted Date': recentSubmissionDate
            }
          })),
          ...Array.from({ length: 2 }, (_, index) => ({
            id: `recExpired${index}`,
            fields: {
              Name: `Expired Template ${index}`,
              '🚀Marketplace Status': index === 0 ? 'Published' : 'Rejected',
              '📅Submitted Date': expiredSubmissionDate
            }
          }))
        ]
      };
    }
  });

  const { payload } = await checkTemplateUser('creator@example.com');

  assert.equal(payload.assetsSubmitted30, 5);
  assert.equal(payload.submittedTemplates, 348);
  assert.equal(payload.publishedTemplates, 310);
  assert.equal(payload.hasError, false);
  assert.match(payload.message, /5 out of 6 templates/);
});
