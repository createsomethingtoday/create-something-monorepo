import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TemplateChat } from '../src/components/chat/TemplateChat';

function renderOpenChat(): string {
  return renderToStaticMarkup(<TemplateChat defaultOpen enableAnalytics={false} />);
}

test('TemplateChat uses the dynamic viewport and safe areas as a full-screen mobile conversation', () => {
  const html = renderOpenChat();

  assert.match(
    html,
    /@media \(max-width: 560px\)[\s\S]*\.tmchat-panel \{[^}]*inset: 0[^}]*width: 100vw[^}]*height: 100dvh[^}]*border-radius: 0/s,
  );
  assert.match(html, /padding-bottom: max\([^)]*env\(safe-area-inset-bottom\)/);
});

test('TemplateChat presents multiple mobile results as a swipeable snap deck while preserving spotlight width', () => {
  const html = renderOpenChat();

  assert.match(
    html,
    /\.tmchat-grid:not\(\.single\)[^{]*\{[^}]*grid-auto-flow: column[^}]*grid-auto-columns: min\(76vw, 280px\)[^}]*overflow-x: auto[^}]*scroll-snap-type: x mandatory/s,
  );
  assert.match(html, /\.tmchat-grid:not\(\.single\) > \* \{[^}]*scroll-snap-align: start/s);
  assert.match(html, /\.tmchat-grid\.single[^}]*grid-template-columns: 1fr[^}]*overflow: visible/s);
});

test('TemplateChat keeps mobile chrome to one useful row without shrinking the remaining controls', () => {
  const html = renderOpenChat();

  assert.match(html, /class="tmchat-iconbtn tmchat-expand"/);
  assert.match(html, /\.tmchat-expand \{ display: none; \}/);
  assert.match(
    html,
    /\.tmchat-followups \{[^}]*flex-wrap: nowrap[^}]*overflow-x: auto[^}]*scroll-snap-type: x proximity/s,
  );
  assert.match(html, /\.tmchat-followups > \* \{[^}]*flex: 0 0 auto/s);
  assert.match(html, /\.tmchat-devicetoggle, \.tmchat-preview-open, \.tmchat-preview-sep \{ display: none; \}/);
  assert.match(html, /\.tmchat-preview-bar \{[^}]*flex-wrap: nowrap/s);
});

test('TemplateChat keeps the empty composer compact when auto-sizing the textarea', () => {
  const html = renderOpenChat();

  assert.match(html, /\.tmchat-input \{[^}]*box-sizing: border-box/s);
});
