import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  safeImageUrl,
  safeMarketplaceUrl,
  safePreviewUrl,
} from '../src/components/chat/templateChatSafety';
import {
  loadPersistedSession,
  MAX_PERSISTED_SESSION_CHARS,
  PERSISTED_SESSION_TTL_MS,
  serializePersistedSession,
  type PersistedSession,
} from '../src/components/chat/templateChatPersistence';
import type { AgentTemplateItem, ChatMessage } from '../src/components/chat/templateChatProtocol';

test('only published template sites may be framed', () => {
  assert.equal(safePreviewUrl('https://my-template.webflow.io'), 'https://my-template.webflow.io/');
  assert.equal(safePreviewUrl('https://my-template.webflow.io/pricing'), 'https://my-template.webflow.io/pricing');

  assert.equal(safePreviewUrl('https://evil.example.com'), null);
  assert.equal(safePreviewUrl('https://webflow.io.evil.example.com'), null, 'suffix must be a real label boundary');
  assert.equal(safePreviewUrl('https://webflow.com/templates/x'), null, 'marketplace pages are not preview targets');
  assert.equal(safePreviewUrl(null), null);
  assert.equal(safePreviewUrl(''), null);
});

test('non-https schemes never reach a src or href', () => {
  for (const value of [
    'javascript:alert(1)',
    // eslint-disable-next-line no-script-url
    'JavaScript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'blob:https://x.webflow.io/abc',
    'http://my-template.webflow.io',
    'file:///etc/passwd',
  ]) {
    assert.equal(safePreviewUrl(value), null, `${value} must be rejected for the frame`);
    assert.equal(safeMarketplaceUrl(value), null, `${value} must be rejected for links`);
    assert.equal(safeImageUrl(value), null, `${value} must be rejected for images`);
  }
});

test('a loopback preview works on a dev origin and is refused in production', () => {
  // The local harness cannot own a *.webflow.io hostname.
  assert.equal(
    safePreviewUrl('/preview/flowguide', 'http://127.0.0.1:4179'),
    'http://127.0.0.1:4179/preview/flowguide',
  );
  assert.equal(safePreviewUrl('http://localhost:4179/preview/x', 'http://localhost:4179'), 'http://localhost:4179/preview/x');

  // The same payload on a production page is refused, so index data can never
  // aim the frame at a developer's machine.
  assert.equal(safePreviewUrl('/preview/flowguide', 'https://webflow.com'), null);
  assert.equal(safePreviewUrl('http://127.0.0.1:4179/preview/x', 'https://webflow.com'), null);
  assert.equal(safePreviewUrl('http://localhost:4179/preview/x', 'https://webflow.com'), null);
});

test('a dev origin still cannot frame an arbitrary remote host', () => {
  assert.equal(safePreviewUrl('https://evil.example.com', 'http://127.0.0.1:4179'), null);
  assert.equal(safePreviewUrl('javascript:alert(1)', 'http://127.0.0.1:4179'), null);
});

test('marketplace links accept webflow.com and its subdomains only', () => {
  assert.equal(safeMarketplaceUrl('https://webflow.com/templates/x'), 'https://webflow.com/templates/x');
  assert.equal(safeMarketplaceUrl('https://templates.webflow.com/x'), 'https://templates.webflow.com/x');
  assert.equal(safeMarketplaceUrl('https://notwebflow.com/x'), null);
});

test('a relative template path resolves against the marketplace origin', () => {
  assert.equal(safeMarketplaceUrl('/template/gallery'), 'https://webflow.com/template/gallery');
});

test('images may come from any https host but never another scheme', () => {
  assert.equal(safeImageUrl('https://cdn.prod.website-files.com/a.jpg'), 'https://cdn.prod.website-files.com/a.jpg');
  assert.equal(safeImageUrl('https://assets.example.com/a.png'), 'https://assets.example.com/a.png');
  assert.equal(safeImageUrl('http://127.0.0.1:8787/private.png'), null);
  assert.equal(safeImageUrl('http://localhost:8787/private.png'), null);
  assert.equal(safeImageUrl(undefined), null);
});

// ── persistence budget ───────────────────────────────────────────────────────

function templateItem(slug: string): AgentTemplateItem {
  return {
    template_slug: slug,
    name: `${slug} template`.padEnd(400, '·'),
    url: `https://webflow.com/templates/${slug}`,
    website_url: `https://${slug}.webflow.io`,
    creator_name: 'Studio One',
    creator_profile_url: null,
    creator_avatar_url: null,
    creator_avatar_alt: null,
    thumbnail_image_url: null,
    price: 49,
    is_free: false,
    features: ['CMS', 'Ecommerce'],
    cumulative_purchases: 12,
  };
}

function turn(index: number, itemCount: number): ChatMessage[] {
  return [
    { role: 'user', content: `prompt ${index}`, displays: [] },
    {
      role: 'assistant',
      content: `reply ${index}`,
      displays: [
        {
          layout: 'gallery',
          items: Array.from({ length: itemCount }, (_, n) => ({
            template_slug: `t-${index}-${n}`,
            reason: 'Fits the brief.',
            item: templateItem(`t-${index}-${n}`),
          })),
        },
      ],
    },
  ];
}

const session = (messages: ChatMessage[], known: AgentTemplateItem[] = []): PersistedSession => ({
  messages,
  followups: [],
  known,
  open: true,
  savedAt: 1_700_000_000_000,
});

test('a session inside the budget is stored whole', () => {
  const payload = serializePersistedSession(session(turn(1, 2)));
  const parsed = JSON.parse(payload) as PersistedSession;

  assert.equal(parsed.messages.length, 2);
  assert.equal(parsed.messages[1].displays[0].items.length, 2);
  assert.ok(payload.length <= MAX_PERSISTED_SESSION_CHARS);
});

test('an oversized session keeps the newest results and sheds older payloads', () => {
  const messages = [1, 2, 3, 4, 5].flatMap((index) => turn(index, 6));
  const payload = serializePersistedSession(session(messages, [templateItem('cached')]), 6_000);
  const parsed = JSON.parse(payload) as PersistedSession;

  assert.ok(payload.length <= 6_000, `stayed inside the budget (${payload.length})`);
  const withDisplays = parsed.messages.filter((message) => message.displays.length > 0);
  assert.equal(withDisplays.length, 1, 'exactly one turn keeps its cards');
  assert.equal(
    withDisplays[0].content,
    'reply 5',
    'and it is the newest turn — the one the reader is looking at',
  );
  assert.deepEqual(parsed.known, [], 'the rebuildable template cache is dropped first');
});

test('a session that cannot fit still retains the final exchange', () => {
  const payload = serializePersistedSession(session([1, 2, 3].flatMap((index) => turn(index, 8))), 200);
  const parsed = JSON.parse(payload) as PersistedSession;

  assert.equal(parsed.messages.length, 2, 'never shrinks below one exchange');
  assert.equal(parsed.messages[1].content, 'reply 3');
});

// ── persistence TTL ──────────────────────────────────────────────────────────

function withStoredSession<T>(raw: string | null, run: () => T): T {
  const original = (globalThis as { window?: unknown }).window;
  const removed: string[] = [];
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: {
      sessionStorage: {
        getItem: () => raw,
        removeItem: (key: string) => void removed.push(key),
      },
      __removed: removed,
    },
  });
  try {
    return run();
  } finally {
    if (original === undefined) delete (globalThis as { window?: unknown }).window;
    else (globalThis as { window?: unknown }).window = original;
  }
}

test('a stale conversation is dropped instead of restored', () => {
  const stale = JSON.stringify({
    messages: [{ role: 'user', content: 'older question', displays: [] }],
    open: true,
    savedAt: 1_000,
  });

  withStoredSession(stale, () => {
    const restored = loadPersistedSession('tmchat-session-v1', 1_000 + PERSISTED_SESSION_TTL_MS + 1);
    assert.equal(restored, null);
    assert.deepEqual((globalThis.window as unknown as { __removed: string[] }).__removed, [
      'tmchat-session-v1',
    ]);
  });
});

test('a conversation inside the TTL is restored with its stamp', () => {
  const fresh = JSON.stringify({
    messages: [{ role: 'user', content: 'recent question', displays: [] }],
    open: true,
    savedAt: 5_000,
  });

  withStoredSession(fresh, () => {
    const restored = loadPersistedSession('tmchat-session-v1', 5_000 + 60_000);
    assert.equal(restored?.messages.length, 1);
    assert.equal(restored?.savedAt, 5_000);
  });
});

test('a snapshot written before stamping existed is still restored once', () => {
  const legacy = JSON.stringify({
    messages: [{ role: 'assistant', content: 'in flight at upgrade', displays: [] }],
    open: true,
  });

  withStoredSession(legacy, () => {
    const restored = loadPersistedSession('tmchat-session-v1', 9_999_999);
    assert.equal(restored?.messages.length, 1, 'an in-flight conversation survives the upgrade');
    assert.equal(restored?.savedAt, undefined);
  });
});

test('a corrupt snapshot never throws into the render path', () => {
  withStoredSession('{not json', () => {
    assert.equal(loadPersistedSession('tmchat-session-v1'), null);
  });
  withStoredSession(JSON.stringify({ messages: 'nope' }), () => {
    assert.equal(loadPersistedSession('tmchat-session-v1'), null);
  });
  withStoredSession(null, () => {
    assert.equal(loadPersistedSession('tmchat-session-v1'), null);
  });
});
