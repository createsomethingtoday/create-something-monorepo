import { afterEach, describe, expect, it, vi } from 'vitest';

import { issueContext, issueSession, verifyContext, verifySession, verifyTurnstile } from '../src/security.js';
import type { Env, TemplateSearchItem } from '../src/types.js';

function env(overrides: Partial<Env> = {}): Env {
  return {
    ANTHROPIC_API_KEY: 'test-key',
    SEARCH_API_BASE: 'https://search.test',
    CONTEXT_SIGNING_SECRET: 'context-secret',
    SESSION_SIGNING_SECRET: 'session-secret',
    TURNSTILE_EXPECTED_HOSTNAME: 'webflow.com',
    TURNSTILE_SECRET_KEY: 'turnstile-secret',
    ...overrides,
  };
}

function template(): TemplateSearchItem {
  return {
    id: 'template-1',
    template_slug: 'notate-website-template',
    name: 'Notate',
    url: 'https://webflow.com/templates/html/notate-website-template',
    preview_url: null,
    website_url: null,
    creator_name: null,
    creator_profile_url: null,
    creator_avatar_url: null,
    creator_avatar_alt: null,
    thumbnail_image_url: null,
    price: 79,
    is_free: false,
    features: [],
    has_cms: true,
    has_ecommerce: false,
    has_membership: false,
    has_multiple_layouts: false,
    is_ui_kit: false,
    template_type: 'Multi Page',
    popularity_score: 10,
    cumulative_purchases: 20,
    published_date: null,
    category_groups: [],
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('signed Template Finder security tokens', () => {
  it('accepts issued sessions and rejects tampering and expiry', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-10T20:00:00Z'));
    const issued = await issueSession(env());
    expect(await verifySession(env(), issued.token)).toMatchObject({ sessionId: expect.any(String) });
    expect(await verifySession(env(), `${issued.token}tampered`)).toBeNull();

    vi.setSystemTime(new Date('2026-07-10T20:16:00Z'));
    expect(await verifySession(env(), issued.token)).toBeNull();
  });

  it('accepts issued continuity and rejects tampering and expiry', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-10T20:00:00Z'));
    const token = await issueContext(env(), { known_templates: [template()] });
    expect(await verifyContext(env(), token)).toEqual({ known_templates: [template()] });
    expect(await verifyContext(env(), `${token}tampered`)).toBeNull();

    vi.setSystemTime(new Date('2026-07-10T20:16:00Z'));
    expect(await verifyContext(env(), token)).toBeNull();
  });

  it.each([
    { label: 'failed challenge', payload: { success: false }, expected: 'Bot verification failed.' },
    {
      label: 'wrong action',
      payload: { success: true, action: 'other-action', hostname: 'webflow.com' },
      expected: 'Bot verification action mismatch.',
    },
    {
      label: 'wrong hostname',
      payload: { success: true, action: 'template-agent-session', hostname: 'evil.example' },
      expected: 'Bot verification hostname mismatch.',
    },
  ])('rejects Turnstile $label', async ({ payload, expected }) => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(payload)));
    expect(await verifyTurnstile(env(), 'challenge', { origin: 'https://webflow.com' })).toEqual({
      success: false,
      reason: expected,
    });
  });

  it('accepts Turnstile only for the configured action and hostname', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ success: true, action: 'template-agent-session', hostname: 'webflow.com' }),
      ),
    );
    expect(await verifyTurnstile(env(), 'challenge', { origin: 'https://webflow.com' })).toEqual({ success: true });
  });
});

