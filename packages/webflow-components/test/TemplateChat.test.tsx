import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TemplateChat } from '../src/index';
import {
  buildMessageSentAnalytics,
  getTemplateChatStorageKey,
  limitTemplateChatInput,
} from '../src/components/chat/TemplateChat';
import { MAX_REQUEST_MESSAGE_CHARS } from '../src/components/chat/templateAgentSession';
import {
  createHighlightMissState,
  createTextDeltaBatcher,
  discoverOpenRoots,
  isHostOverlayBlocking,
  queryDiscoveredRoots,
} from '../src/components/chat/templateChatRuntime';

test('TemplateChat is available from the current main lineage as a floating Template Finder', () => {
  const html = renderToStaticMarkup(<TemplateChat defaultOpen enableAnalytics={false} />);

  assert.match(html, /Template finder/);
  assert.match(html, /class="tmchat-panel/);
  assert.match(html, /class="tmchat-turnstile"/);
});

test('host overlays gate chat only when they actually own a mobile interaction point', () => {
  const hostOverlay = {
    contains(node: unknown) {
      return node === coveredControl;
    },
  } as unknown as Element;
  const coveredControl = {} as Element;
  const pageContent = {} as Element;
  const fakeDocument = {
    querySelectorAll(selector: string) {
      return selector === '#consent' ? [hostOverlay] : [];
    },
    elementFromPoint(x: number) {
      return x === 195 ? coveredControl : pageContent;
    },
  };

  assert.equal(isHostOverlayBlocking(fakeDocument, '#consent', 390, 844), true);
  assert.equal(isHostOverlayBlocking(fakeDocument, '#missing', 390, 844), false);
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

test('TemplateChat exposes the worker prompt limit before submission', () => {
  const html = renderToStaticMarkup(<TemplateChat defaultOpen enableAnalytics={false} />);

  assert.equal(MAX_REQUEST_MESSAGE_CHARS, 4_000);
  assert.match(html, /maxLength="4000"/);
  assert.match(html, /aria-describedby="tmchat-input-limit-/);
  assert.match(html, /4,000 character limit/);
});

test('the React input boundary truncates autofill and host-script values to the worker limit', () => {
  assert.equal(limitTemplateChatInput('x'.repeat(4_001)).length, 4_000);
});
