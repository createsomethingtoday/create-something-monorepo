import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TemplateChat } from '../src/index';
import {
  AgentProgress,
  createAgentProgressState,
  buildMessageSentAnalytics,
  getAgentOutcomeReceipt,
  getAgentProgressView,
  getPreviewReturnImmersive,
  getTemplateChatStorageKey,
  limitTemplateChatInput,
  normalizePageActionPayload,
  reduceAgentProgress,
  summarizePageAction,
} from '../src/components/chat/TemplateChat';
import { MAX_REQUEST_MESSAGE_CHARS } from '../src/components/chat/templateAgentSession';
import {
  createHighlightMissState,
  createTextDeltaBatcher,
  discoverOpenRoots,
  getHostOverlayBottomInset,
  isHostOverlayBlocking,
  queryDiscoveredRoots,
} from '../src/components/chat/templateChatRuntime';

test('TemplateChat is available from the current main lineage as a floating Template Finder', () => {
  const html = renderToStaticMarkup(<TemplateChat defaultOpen enableAnalytics={false} />);

  assert.match(html, /Template finder/);
  assert.match(html, /class="tmchat-panel/);
  assert.match(html, /class="tmchat-turnstile"/);
});

test('every chat control uses the Webflow focus treatment and the composer has a stable accessible name', () => {
  const html = renderToStaticMarkup(<TemplateChat defaultOpen enableAnalytics={false} />);
  const focusSelectors = [
    'tmchat-launcher',
    'tmchat-iconbtn',
    'tmchat-intro-toggle',
    'tmchat-chip',
    'tmchat-jump',
    'tmchat-send',
    'tmchat-preview-back',
    'tmchat-devicebtn',
    'tmchat-preview-open',
    'tmchat-preview-cta',
    'tmchat-input',
  ];

  for (const selector of focusSelectors) {
    assert.match(html, new RegExp(`\\.${selector}:focus-visible`));
  }
  assert.match(html, /outline: 2px solid var\(--tmchat-accent, #146ef5\); outline-offset: 2px;/);
  assert.match(html, /--tmchat-accent: #146ef5;/, 'the accent is themable, defaulting to Webflow blue');
  assert.match(html, /<textarea[^>]*aria-label="Describe the site you want to build"/);
});

test('an active conversation compacts first-use guidance behind an explicit disclosure button', () => {
  const originalWindow = globalThis.window;
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: {
      sessionStorage: {
        getItem: () =>
          JSON.stringify({
            messages: [
              { role: 'user', content: 'A restaurant site with a menu', displays: [] },
              { role: 'assistant', content: 'Here are three focused options.', displays: [] },
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

    assert.match(html, /<div class="tmchat-intro"/);
    assert.match(html, /<button[^>]*class="tmchat-intro-toggle"[^>]*aria-expanded="false"[^>]*aria-controls="tmchat-intro-/);
    assert.match(html, />How Template finder works<\/button>/);
    assert.match(html, /class="tmchat-intro-copy" hidden=""/);
    assert.doesNotMatch(html, /class="tmchat-msg assistant">Hi!/);
  } finally {
    if (originalWindow === undefined) delete (globalThis as { window?: Window }).window;
    else globalThis.window = originalWindow;
  }
});

test('agent progress maps protocol status and page actions to factual user-facing work', () => {
  const action = normalizePageActionPayload({
    category_group_slug: 'portfolio-agency',
    types: ['One Page'],
    free_only: true,
    highlight_slugs: ['bistro', 'supper-club'],
  });

  let progress = createAgentProgressState();
  progress = reduceAgentProgress(progress, { type: 'connected' });
  progress = reduceAgentProgress(progress, { type: 'agent_status', status: 'searching' });
  progress = reduceAgentProgress(progress, { type: 'page_action', payload: action });

  assert.deepEqual(getAgentProgressView(progress), {
    activeIndex: 1,
    title: 'Searching the template catalog',
    detail: 'Checking the template catalog for strong matches.',
    receipt: 'Page update requested · Portfolio & Agency · One Page · Free only · 2 highlights requested',
    announcement: 'Searching the template catalog. Page update requested · Portfolio & Agency · One Page · Free only · 2 highlights requested.',
  });
  assert.equal(summarizePageAction({ q: 'private restaurant launch' }), 'Page search update requested');
  assert.equal(summarizePageAction({ q: 'private restaurant launch' })?.includes('private'), false);
  assert.deepEqual(normalizePageActionPayload({ category_group_slug: 'made-up-category', types: ['One Page'] }), {
    types: ['One Page'],
  });
  assert.deepEqual(normalizePageActionPayload({ category_group_slug: 'made-up-category' }), {});
});

test('agent progress never moves backward when the worker returns to thinking after search', () => {
  let progress = createAgentProgressState();
  progress = reduceAgentProgress(progress, { type: 'connected' });
  progress = reduceAgentProgress(progress, { type: 'agent_status', status: 'searching' });
  progress = reduceAgentProgress(progress, { type: 'agent_status', status: 'thinking' });

  assert.equal(progress.phase, 'searching');
});

test('agent progress stays stable through streamed activity and becomes a durable result receipt', () => {
  let progress = createAgentProgressState();
  progress = reduceAgentProgress(progress, { type: 'connected' });
  progress = reduceAgentProgress(progress, { type: 'agent_status', status: 'searching' });
  progress = reduceAgentProgress(progress, { type: 'text' });
  progress = reduceAgentProgress(progress, {
    type: 'page_action',
    payload: { category_group_slug: 'food-and-drink', highlight_slugs: ['bistro'] },
  });

  assert.equal(progress.phase, 'searching');
  assert.equal(progress.outcome, 'active');
  assert.equal(progress.pageAction?.category_group_slug, 'food-and-drink');

  progress = reduceAgentProgress(progress, { type: 'display', resultCount: 3 });
  progress = reduceAgentProgress(progress, { type: 'done' });

  assert.equal(progress.phase, 'presenting');
  assert.equal(progress.outcome, 'completed');
  assert.equal(progress.resultCount, 3);
});

test('slow progress stays actionable and retry starts from truthful preparation', () => {
  let progress = createAgentProgressState();
  progress = reduceAgentProgress(progress, { type: 'connected' });
  progress = reduceAgentProgress(progress, { type: 'agent_status', status: 'searching' });
  progress = reduceAgentProgress(progress, { type: 'slow' });

  assert.deepEqual(getAgentProgressView(progress), {
    activeIndex: 1,
    title: 'Searching the template catalog',
    detail: 'Still working — this is taking a little longer than usual.',
    receipt: null,
    announcement: 'Searching the template catalog. This is taking longer than usual.',
  });

  progress = reduceAgentProgress(progress, { type: 'stop' });
  assert.equal(progress.outcome, 'stopped');
  progress = reduceAgentProgress(progress, { type: 'retry' });
  assert.deepEqual(progress, createAgentProgressState());
});

test('completed, stopped, and failed turns have distinct durable receipts', () => {
  let completed = createAgentProgressState();
  completed = reduceAgentProgress(completed, {
    type: 'page_action',
    payload: { category_group_slug: 'food-and-drink' },
  });
  completed = reduceAgentProgress(completed, { type: 'display', resultCount: 3 });
  completed = reduceAgentProgress(completed, { type: 'done' });

  assert.equal(
    getAgentOutcomeReceipt(completed),
    '3 template recommendations ready · Page update requested · Food & Drink',
  );
  assert.equal(
    getAgentOutcomeReceipt(reduceAgentProgress(createAgentProgressState(), { type: 'stop' })),
    'Search stopped',
  );
  assert.equal(
    getAgentOutcomeReceipt(reduceAgentProgress(createAgentProgressState(), { type: 'fail' })),
    'Search interrupted',
  );
});

test('agent progress renders an accessible four-stage work surface with loading structure', () => {
  let progress = createAgentProgressState();
  progress = reduceAgentProgress(progress, { type: 'connected' });
  progress = reduceAgentProgress(progress, { type: 'agent_status', status: 'searching' });
  progress = reduceAgentProgress(progress, {
    type: 'page_action',
    payload: { category_group_slug: 'food-and-drink', highlight_slugs: ['bistro'] },
  });
  const html = renderToStaticMarkup(
    <AgentProgress progress={progress} />,
  );

  assert.match(html, /class="tmchat-progress"/);
  assert.match(html, /aria-label="Template search activity"/);
  assert.match(html, /class="tmchat-sr-only" role="status"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /Preparing search/);
  assert.match(html, /data-state="current"[^>]*>[^<]*<[^>]*>Searching catalog/s);
  assert.match(html, /Comparing matches/);
  assert.match(html, /Presenting results/);
  assert.match(html, /Page update requested · Food &amp; Drink · Highlight requested/);
  assert.equal((html.match(/tmchat-progress-skeleton-card/g) ?? []).length, 4);
});

test('agent progress uses Webflow-neutral surfaces with blue reserved for current state', () => {
  const html = renderToStaticMarkup(<TemplateChat defaultOpen enableAnalytics={false} />);

  assert.match(
    html,
    /\.tmchat-progress\s*\{[^}]*border: 1px solid #ececec; border-radius: 8px;[^}]*background: #fafafa;/s,
  );
  assert.match(
    html,
    /\.tmchat-progress-mark\s*\{[^}]*background: #f0f0f0; color: var\(--tmchat-accent, #146ef5\);/s,
  );
  assert.match(html, /\.tmchat-progress-steps li\s*\{[^}]*color: #6b6b6b;/s);
  assert.match(
    html,
    /\.tmchat-progress-receipt\s*\{[^}]*border-top: 1px solid #ececec;[^}]*color: #5b5b5b;/s,
  );
  assert.match(
    html,
    /\.tmchat-progress-skeleton-card\s*\{[^}]*#ececec 20%, #f5f5f5 40%, #ececec 60%/s,
  );
  assert.doesNotMatch(html, /\.tmchat-progress\s*\{[^}]*linear-gradient/s);
});

test('every recommendation layout explains fit and labels the contextual refinement handoff', () => {
  const originalWindow = globalThis.window;
  const layouts = ['gallery', 'carousel', 'shortlist', 'spotlight', 'comparison'] as const;
  const displays = layouts.map((layout, index) => ({
    layout,
    title: `${layout} recommendations`,
    items: [
      {
        template_slug: `${layout}-template`,
        reason: `Reason for ${layout}.`,
        item: {
          template_slug: `${layout}-template`,
          name: `${layout} template`,
          url: `/template/${layout}`,
          creator_name: 'Studio One',
          creator_profile_url: null,
          creator_avatar_url: null,
          creator_avatar_alt: null,
          thumbnail_image_url: null,
          price: 49 + index,
          is_free: false,
          features: ['CMS'],
          cumulative_purchases: 12,
        },
      },
    ],
  }));
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: {
      sessionStorage: {
        getItem: () =>
          JSON.stringify({
            messages: [
              { role: 'user', content: 'A restaurant site with a menu', displays: [] },
              {
                role: 'assistant',
                content: 'These are the strongest fits.',
                displays,
              },
            ],
            followups: ['Show free options', 'More upscale and minimal'],
            known: [],
            open: true,
          }),
      },
    },
  });

  try {
    const html = renderToStaticMarkup(<TemplateChat defaultOpen enableAnalytics={false} />);

    for (const layout of layouts) {
      assert.match(html, new RegExp(`Why it fits — Reason for ${layout}\\.`));
    }
    assert.equal((html.match(/class="tmchat-display"/g) ?? []).length, layouts.length);
    assert.match(html, /class="tmchat-strip"/);
    assert.match(html, /class="tmchat-refine-label">Refine these results/);
    assert.match(html, />Show free options</);
    assert.match(html, />More upscale and minimal</);
    assert.match(
      html,
      /class="tmchat-outcome-announcement tmchat-sr-only" role="status" aria-live="polite" aria-atomic="true">These are the strongest fits\. 5 template recommendations ready\./,
    );
  } finally {
    if (originalWindow === undefined) delete (globalThis as { window?: Window }).window;
    else globalThis.window = originalWindow;
  }
});

test('host overlays gate chat only when they actually own an interaction point', () => {
  const hostOverlay = {
    contains(node: unknown) {
      return node === coveredControl;
    },
    getBoundingClientRect() {
      return { top: 700, right: 1280, bottom: 844, left: 0, width: 1280, height: 144 };
    },
  } as unknown as Element;
  const coveredControl = {} as Element;
  const fakeDocument = {
    querySelectorAll(selector: string) {
      return selector === '#consent' ? [hostOverlay] : [];
    },
    elementFromPoint() {
      return coveredControl;
    },
  };

  assert.equal(isHostOverlayBlocking(fakeDocument, '#consent', 390, 844), true);
  assert.equal(isHostOverlayBlocking(fakeDocument, '#missing', 390, 844), false);
  assert.equal(getHostOverlayBottomInset(fakeDocument, '#consent', 1280, 844), 144);
  assert.equal(getHostOverlayBottomInset(fakeDocument, '#missing', 1280, 844), 0);
});

test('one bounded shadow-root discovery serves all selectors in a page-action cycle', () => {
  const calls: string[] = [];
  const card = { id: 'card' } as unknown as Element;
  const filter = { id: 'filter' } as unknown as Element;
  const shadowRoot = {
    querySelectorAll(selector: string) {
      calls.push(`shadow:${selector}`);
      if (selector === '[data-template-slug]') return [card];
      if (selector === '.tmfilter-shell') return [filter];
      return [];
    },
  } as unknown as ParentNode;
  const host = { shadowRoot };
  const documentRoot = {
    querySelectorAll(selector: string) {
      calls.push(`document:${selector}`);
      return selector === '*' ? [host] : [];
    },
  } as unknown as ParentNode;

  const roots = discoverOpenRoots(documentRoot);
  assert.deepEqual(queryDiscoveredRoots(roots, '[data-template-slug]'), [card]);
  assert.deepEqual(queryDiscoveredRoots(roots, '.tmfilter-shell'), [filter]);
  assert.equal(calls.filter((entry) => entry.endsWith(':*')).length, 2);
});

test('highlight misses are isolated per TemplateChat instance', () => {
  const first = createHighlightMissState();
  const second = createHighlightMissState();

  first.add(['portfolio-one']);
  assert.deepEqual(first.snapshot(), ['portfolio-one']);
  assert.deepEqual(second.snapshot(), []);
  first.clear();
  assert.deepEqual(first.snapshot(), []);
});

test('stream text deltas coalesce into one scheduled render flush', () => {
  const scheduled: Array<() => void> = [];
  const flushed: string[] = [];
  const batcher = createTextDeltaBatcher(
    (text) => flushed.push(text),
    (callback) => {
      scheduled.push(callback);
      return scheduled.length;
    },
    () => {},
  );

  batcher.push('One');
  batcher.push(' two');
  batcher.push(' three');

  assert.equal(scheduled.length, 1);
  assert.deepEqual(flushed, []);
  scheduled[0]?.();
  assert.deepEqual(flushed, ['One two three']);
});

test('cancelling a stream batch drops pending text and cancels its frame', () => {
  let scheduled: (() => void) | undefined;
  const cancelled: number[] = [];
  const flushed: string[] = [];
  const batcher = createTextDeltaBatcher(
    (text) => flushed.push(text),
    (callback) => {
      scheduled = callback;
      return 42;
    },
    (handle) => cancelled.push(handle),
  );

  batcher.push('never rendered');
  batcher.cancel();
  scheduled?.();

  assert.deepEqual(cancelled, [42]);
  assert.deepEqual(flushed, []);
});

test('session scopes isolate reusable TemplateChat instances while preserving the marketplace default', () => {
  assert.equal(getTemplateChatStorageKey('marketplace'), 'tmchat-session-v1');
  assert.notEqual(getTemplateChatStorageKey('pricing-assistant'), getTemplateChatStorageKey('homepage-assistant'));
  assert.match(getTemplateChatStorageKey('Pricing / Enterprise'), /^tmchat-session-v1:/);
});

test('message analytics record prompt metadata without copying prompt text', () => {
  const prompt = 'A private launch plan for Acme';
  const payload = buildMessageSentAnalytics('input', 2, prompt);

  assert.deepEqual(payload, { source: 'input', turn: 2, message_length: prompt.length });
  assert.equal('message' in payload, false);
});

test('closing preview restores the surface mode that opened it', () => {
  assert.equal(getPreviewReturnImmersive(false, true), false);
  assert.equal(getPreviewReturnImmersive(true, true), true);
  assert.equal(getPreviewReturnImmersive(null, true), true);
});

test('TemplateChat exposes the worker prompt limit before submission', () => {
  const html = renderToStaticMarkup(<TemplateChat defaultOpen enableAnalytics={false} />);

  assert.equal(MAX_REQUEST_MESSAGE_CHARS, 4_000);
  assert.match(html, /maxLength="4000"/);
  assert.match(html, /aria-describedby="tmchat-input-limit-/);
  assert.match(html, /4,000 character limit/);
});

test('a stopped turn is acknowledged and can be retried without an empty assistant artifact', () => {
  const originalWindow = globalThis.window;
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: {
      sessionStorage: {
        getItem: () =>
          JSON.stringify({
            messages: [{ role: 'user', content: 'A restaurant site with a menu', displays: [] }],
            followups: [],
            known: [],
            stoppedPrompt: 'A restaurant site with a menu',
            open: true,
          }),
      },
    },
  });

  try {
    const html = renderToStaticMarkup(<TemplateChat defaultOpen enableAnalytics={false} />);

    assert.match(html, /class="tmchat-turn-status" data-outcome="stopped">Search stopped</);
    assert.match(html, /class="tmchat-outcome-announcement tmchat-sr-only"[^>]*>Search stopped\.</);
    assert.match(html, />Try again</);
    assert.equal((html.match(/class="tmchat-msg assistant"/g) ?? []).length, 0);
  } finally {
    if (originalWindow === undefined) delete (globalThis as { window?: Window }).window;
    else globalThis.window = originalWindow;
  }
});

test('the React input boundary truncates autofill and host-script values to the worker limit', () => {
  assert.equal(limitTemplateChatInput('x'.repeat(4_001)).length, 4_000);
});
