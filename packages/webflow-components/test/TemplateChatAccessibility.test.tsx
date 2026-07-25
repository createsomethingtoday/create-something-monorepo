import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TemplateChat } from '../src/components/chat/TemplateChat';
import { applyHostInert, type InertTarget } from '../src/components/chat/templateChatRuntime';

test('the panel is labelled by a real heading rather than a duplicated string', () => {
  const html = renderToStaticMarkup(<TemplateChat defaultOpen enableAnalytics={false} title="Template finder" />);

  const heading = html.match(/<h2 class="tmchat-header-title" id="(tmchat-title-[^"]+)">Template finder<\/h2>/);
  assert.ok(heading, 'the visible title is a heading, so it appears in the document outline');
  assert.match(html, new RegExp(`aria-labelledby="${heading[1]}"`));
  assert.doesNotMatch(html, /class="tmchat-panel[^"]*"[^>]*aria-label="Template finder"/);
});

test('the challenge mount is not announced as a status region', () => {
  const html = renderToStaticMarkup(<TemplateChat defaultOpen enableAnalytics={false} />);
  assert.match(html, /<div class="tmchat-turnstile"><\/div>/);
});

test('progress steps and the disabled composer meet AA contrast', () => {
  const html = renderToStaticMarkup(<TemplateChat defaultOpen enableAnalytics={false} />);

  // 11px text at 58% opacity measured under 3:1.
  assert.doesNotMatch(html, /data-state="upcoming"\] \{ opacity/);
  assert.match(html, /li\[data-state="upcoming"\] \{ color: #6e6e6e; \}/);
  // White on #a9c6f7 measured ~1.7:1 and read as broken rather than unavailable.
  assert.doesNotMatch(html, /\.tmchat-send:disabled \{ background: #a9c6f7/);
  assert.match(html, /\.tmchat-send:disabled \{ background: #ececec; color: #5b5b5b/);
});

test('scrollable result decks show their overflow', () => {
  const html = renderToStaticMarkup(<TemplateChat defaultOpen enableAnalytics={false} />);
  assert.equal((html.match(/scrollbar-width: thin/g) ?? []).length, 2, 'the carousel strip and the mobile deck');
});

test('a multi-card result set is announced as one labelled group', () => {
  const originalWindow = globalThis.window;
  const items = [1, 2, 3].map((n) => ({
    template_slug: `t-${n}`,
    reason: 'Fits the brief.',
    item: {
      template_slug: `t-${n}`,
      name: `Template ${n}`,
      url: `https://webflow.com/templates/t-${n}`,
      creator_name: 'Studio One',
      creator_profile_url: null,
      creator_avatar_url: null,
      creator_avatar_alt: null,
      thumbnail_image_url: null,
      price: 49,
      is_free: false,
      features: ['CMS'],
      cumulative_purchases: 3,
    },
  }));

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: {
      sessionStorage: {
        getItem: () =>
          JSON.stringify({
            messages: [
              { role: 'user', content: 'A restaurant site', displays: [] },
              {
                role: 'assistant',
                content: 'These fit.',
                displays: [{ layout: 'gallery', title: 'Restaurant picks', items }],
              },
            ],
            followups: [],
            known: [],
            open: true,
          }),
      },
    },
  });

  try {
    const html = renderToStaticMarkup(<TemplateChat defaultOpen enableAnalytics={false} />);
    assert.match(html, /role="group" aria-label="Restaurant picks — 3 templates"/);
  } finally {
    if (originalWindow === undefined) delete (globalThis as { window?: Window }).window;
    else globalThis.window = originalWindow;
  }
});

test('a settled reply is announced exactly once', () => {
  const originalWindow = globalThis.window;
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: {
      sessionStorage: {
        getItem: () =>
          JSON.stringify({
            messages: [
              { role: 'user', content: 'A restaurant site', displays: [] },
              { role: 'assistant', content: 'These three fit your brief.', displays: [] },
            ],
            followups: [],
            known: [],
            open: true,
          }),
      },
    },
  });

  try {
    const html = renderToStaticMarkup(<TemplateChat defaultOpen enableAnalytics={false} />);

    // The reply appears twice in the DOM — once visibly, once in the sr-only
    // status — which is only safe because the visible copy is not itself a live
    // region. If it ever becomes one, a screen reader reads the answer twice.
    const visibleBubble = html.match(/<div class="tmchat-msg assistant">[^<]*/g) ?? [];
    assert.ok(visibleBubble.length >= 1, 'the reply is rendered visibly');
    assert.doesNotMatch(
      html,
      /<div class="tmchat-msg assistant"[^>]*(aria-live|role="status")/,
      'the visible reply must not announce itself',
    );

    const liveRegions = html.match(/aria-live="polite"/g) ?? [];
    assert.equal(liveRegions.length, 1, 'exactly one live region is mounted for a settled turn');
    assert.match(
      html,
      /class="tmchat-outcome-announcement tmchat-sr-only" role="status" aria-live="polite" aria-atomic="true">These three fit your brief\./,
      'and it carries the reply plus its receipt',
    );

    // The streaming narration and the settled receipt are mutually exclusive, so
    // two regions never compete for the same announcement.
    assert.doesNotMatch(html, /class="tmchat-progress"/, 'no progress surface once the turn settled');
  } finally {
    if (originalWindow === undefined) delete (globalThis as { window?: Window }).window;
    else globalThis.window = originalWindow;
  }
});

// ── host page inerting ───────────────────────────────────────────────────────

function inertTarget(options: { holdsPanel?: boolean; preInert?: boolean; preHidden?: boolean } = {}) {
  const attributes = new Map<string, string>();
  if (options.preHidden) attributes.set('aria-hidden', 'true');
  return {
    inert: options.preInert ?? false,
    setAttribute(name: string, value: string) {
      attributes.set(name, value);
    },
    removeAttribute(name: string) {
      attributes.delete(name);
    },
    hasAttribute(name: string) {
      return attributes.has(name);
    },
    contains(node: unknown) {
      return Boolean(options.holdsPanel) && node === 'panel';
    },
    attributes,
  } satisfies InertTarget & { attributes: Map<string, string> };
}

test('a modal conversation makes the rest of the page unreachable, then restores it', () => {
  const nav = inertTarget();
  const main = inertTarget();
  const ourBranch = inertTarget({ holdsPanel: true });

  const restore = applyHostInert([nav, main, ourBranch], 'panel');

  assert.equal(nav.inert, true);
  assert.equal(nav.attributes.get('aria-hidden'), 'true');
  assert.equal(main.inert, true);
  assert.equal(ourBranch.inert, false, 'the branch holding the panel stays reachable');
  assert.equal(ourBranch.attributes.has('aria-hidden'), false);

  restore();
  assert.equal(nav.inert, false);
  assert.equal(nav.attributes.has('aria-hidden'), false);
  assert.equal(main.inert, false);
});

test('state the host page already owns is never restored on our behalf', () => {
  const alreadyInert = inertTarget({ preInert: true });
  const alreadyHidden = inertTarget({ preHidden: true });

  const restore = applyHostInert([alreadyInert, alreadyHidden], 'panel');
  restore();

  assert.equal(alreadyInert.inert, true, 'left as the host set it');
  assert.equal(alreadyHidden.attributes.get('aria-hidden'), 'true', 'left as the host set it');
});
