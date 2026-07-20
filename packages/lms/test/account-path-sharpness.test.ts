import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

import { performancePageRegistry } from '../../../config/performance-pages/registry.ts';

const workspaceRoot = resolve(import.meta.dirname, '../../..');
const loginSource = readFileSync(
  resolve(workspaceRoot, 'packages/lms/src/routes/login/+page.svelte'),
  'utf8'
);
const signupSource = readFileSync(
  resolve(workspaceRoot, 'packages/lms/src/routes/signup/+page.svelte'),
  'utf8'
);
const magicSource = readFileSync(
  resolve(workspaceRoot, 'packages/lms/src/routes/auth/magic/+page.svelte'),
  'utf8'
);
const accountSource = readFileSync(
  resolve(workspaceRoot, 'packages/lms/src/routes/account/+page.svelte'),
  'utf8'
);

test('returns to a local Learn destination and fails closed to the course list', async () => {
  const returnPathModule = await import(
    pathToFileURL(resolve(workspaceRoot, 'packages/lms/src/lib/auth/return-path.ts')).href
  );
  const safeLearnReturnPath = returnPathModule.safeLearnReturnPath as (
    value: string | null
  ) => string;
  const labelLearnReturnPath = returnPathModule.labelLearnReturnPath as (value: string) => string;

  assert.equal(safeLearnReturnPath('/progress'), '/progress');
  assert.equal(
    safeLearnReturnPath('/paths/codex-mcp/what-is-codex-and-mcp?from=account#practice'),
    '/paths/codex-mcp/what-is-codex-and-mcp?from=account#practice'
  );
  assert.equal(safeLearnReturnPath('//evil.example/stolen'), '/paths');
  assert.equal(safeLearnReturnPath('https://evil.example/stolen'), '/paths');
  assert.equal(safeLearnReturnPath('\\\\evil.example\\stolen'), '/paths');
  assert.equal(safeLearnReturnPath(null), '/paths');
  assert.equal(labelLearnReturnPath('/paths'), 'the course list');
  assert.equal(labelLearnReturnPath('/progress'), 'your learning progress');
  assert.equal(labelLearnReturnPath('/account'), 'your account');
  assert.equal(labelLearnReturnPath('/paths/codex-mcp/lesson-one'), 'the lesson you requested');
});

test('shares the safe destination across identity entry routes and bypasses signed-in forms', async () => {
  const loginModule = await import('../src/routes/login/+page.server.ts');
  const signupModule = await import('../src/routes/signup/+page.server.ts');
  const magicModule = await import('../src/routes/auth/magic/+page.server.ts');

  for (const [name, load] of [
    ['login', loginModule.load],
    ['signup', signupModule.load],
    ['magic', magicModule.load]
  ] as const) {
    const safe = await load({
      url: new URL(`https://learn.createsomething.space/${name}?redirect=/progress`),
      locals: { user: null }
    } as never);
    const unsafe = await load({
      url: new URL(`https://learn.createsomething.space/${name}?redirect=//evil.example`),
      locals: { user: null }
    } as never);

    assert.equal((safe as { redirectTo: string }).redirectTo, '/progress');
    assert.equal((unsafe as { redirectTo: string }).redirectTo, '/paths');
  }

  for (const load of [loginModule.load, signupModule.load]) {
    assert.throws(
      () =>
        load({
          url: new URL('https://learn.createsomething.space/login?redirect=/progress'),
          locals: { user: { id: 'learner-1' } }
        } as never),
      (error: unknown) =>
        (error as { status?: number }).status === 302 &&
        (error as { location?: string }).location === '/progress'
    );
  }
});

test('shows the learner where each identity task will return', () => {
  for (const [name, source] of [
    ['login', loginSource],
    ['signup', signupSource],
    ['magic', magicSource]
  ] as const) {
    assert.match(source, /data\.redirectTo/, `${name} does not use the server-safe destination`);
    assert.match(source, /labelLearnReturnPath/, `${name} does not label the destination`);
    assert.match(source, /After (?:signing in|creating your account|we verify the link)/i);
  }
});

test('translates provider and magic-link failures into a next step', async () => {
  const messagesModule = await import('../src/lib/auth/messages.ts');
  const friendlyIdentityError = messagesModule.friendlyIdentityError as (
    task: 'login' | 'signup',
    status: number,
    message?: string
  ) => string;
  const friendlyMagicError = messagesModule.friendlyMagicError as (
    status: number,
    message?: string
  ) => { type: 'expired' | 'used' | 'invalid' | 'network'; message: string };

  assert.equal(
    friendlyIdentityError('login', 401, 'invalid_credentials_internal'),
    'The email and password did not match. Check both and try again.'
  );
  assert.equal(
    friendlyIdentityError('signup', 409, 'duplicate_identity_internal'),
    'An account already uses this email. Sign in instead.'
  );
  assert.equal(
    friendlyIdentityError('login', 429, 'rate_limit_internal'),
    'Too many attempts. Wait a moment, then try again.'
  );
  assert.deepEqual(friendlyMagicError(500, 'Internal Error'), {
    type: 'network',
    message: 'We could not verify this link right now. Try again, or request a new link.'
  });
  assert.deepEqual(friendlyMagicError(400, 'Magic link expired'), {
    type: 'expired',
    message: 'This sign-in link has expired. Request a new one.'
  });
});

test('uses friendly failures instead of exposing provider messages', () => {
  for (const [name, source] of [
    ['login', loginSource],
    ['signup', signupSource]
  ] as const) {
    assert.match(source, /friendlyIdentityError/, `${name} does not translate provider failures`);
    assert.doesNotMatch(source, /error = data\.message/);
  }

  assert.match(magicSource, /friendlyMagicError/);
  assert.doesNotMatch(magicSource, /errorMessage = msg/);
});

test('explains the identity and account recovery path without JavaScript', () => {
  for (const [name, source] of [
    ['login', loginSource],
    ['signup', signupSource],
    ['magic', magicSource],
    ['account', accountSource]
  ] as const) {
    assert.match(source, /<noscript>/, `${name} has no no-JavaScript explanation`);
    assert.match(source, /Enable JavaScript and reload/i);
  }

  assert.match(magicSource, /request a new link/i);
  assert.match(accountSource, /You can still review your account details/i);
});

test('gives every Learn identity route three visible operator chapters and one document main', () => {
  for (const [name, source] of [
    ['login', loginSource],
    ['signup', signupSource],
    ['magic', magicSource],
    ['account', accountSource]
  ] as const) {
    assert.equal(
      (source.match(/data-performance-chapter=/g) ?? []).length,
      3,
      `${name} should expose exactly three operator chapters`
    );
    for (const chapter of ['task-state', 'workspace', 'decision-receipt']) {
      assert.match(source, new RegExp(`data-performance-chapter="${chapter}"`));
    }
    assert.doesNotMatch(source, /<main(?:\s|>)/, `${name} should use the layout main landmark`);
  }
});

test('concentrates account changes into named tasks without dropping account capabilities', () => {
  for (const task of [
    'Change your password',
    'Change your email',
    'Privacy and analytics',
    'Delete your account'
  ]) {
    assert.match(accountSource, new RegExp(`<summary>${task}</summary>`));
  }

  for (const preserved of [
    "fetch('/api/account'",
    "fetch('/api/account/password'",
    "fetch('/api/account/email'",
    "fetch('/api/account/avatar'",
    "fetch('/api/account/privacy'",
    "fetch('/api/account/delete'",
    'UserInteractionsPanel',
    'href="/progress"',
    'href="/paths"'
  ]) {
    assert.ok(accountSource.includes(preserved), `account lost ${preserved}`);
  }
});

test('names password visibility controls and exposes their pressed state', () => {
  assert.match(
    accountSource,
    /aria-label=\{showCurrentPassword\s*\?\s*'Hide current password'\s*:\s*'Show current password'\}/
  );
  assert.match(accountSource, /aria-pressed=\{showCurrentPassword\}/);
  assert.match(
    accountSource,
    /aria-label=\{showNewPassword\s*\?\s*'Hide new password'\s*:\s*'Show new password'\}/
  );
  assert.match(accountSource, /aria-pressed=\{showNewPassword\}/);
});

test('migrates the complete Learn account cohort under the tool contract', () => {
  const cohort = performancePageRegistry.find((group) => group.id === 'learn-account');

  assert.equal(cohort?.status, 'migrated');
  assert.deepEqual(cohort?.sources, [
    'packages/lms/src/routes/account/+page.svelte',
    'packages/lms/src/routes/auth/magic/+page.svelte',
    'packages/lms/src/routes/login/+page.svelte',
    'packages/lms/src/routes/signup/+page.svelte'
  ]);
  assert.deepEqual(
    cohort?.contract?.chapters.map((chapter) => chapter.id),
    ['task-state', 'workspace', 'decision-receipt']
  );
});
