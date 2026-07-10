import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TemplateCard } from '../src/components/cards/TemplateCard';
import { TemplateChat } from '../src/components/chat/TemplateChat';
import { UiIcon, type UiIconName } from '../src/components/primitives/UiIcon';

test('renders every interface icon through one current-color stroke contract', () => {
  const names: UiIconName[] = [
    'arrow-down',
    'arrow-left',
    'arrow-right',
    'check',
    'diamond',
    'external-link',
    'info',
    'maximize-2',
    'minimize-2',
    'monitor',
    'refresh-cw',
    'smartphone',
    'sparkles',
    'star',
    'tablet',
    'x',
  ];

  for (const name of names) {
    const html = renderToStaticMarkup(<UiIcon name={name} />);
    assert.match(html, new RegExp(`data-ui-icon="${name}"`));
    assert.match(html, /viewBox="0 0 24 24"/);
    assert.match(html, /fill="none"/);
    assert.match(html, /stroke="currentColor"/);
    assert.match(html, /stroke-width="2"/);
    assert.match(html, /stroke-linecap="round"/);
    assert.match(html, /stroke-linejoin="round"/);
    assert.match(html, /aria-hidden="true"/);
  }
});

test('TemplateChat controls and launcher use the shared icon contract', () => {
  const openHtml = renderToStaticMarkup(<TemplateChat defaultOpen enableAnalytics={false} />);
  assert.match(openHtml, /data-ui-icon="maximize-2"/);
  assert.match(openHtml, /data-ui-icon="x"/);

  const launcherHtml = renderToStaticMarkup(<TemplateChat enableAnalytics={false} />);
  assert.match(launcherHtml, /data-ui-icon="sparkles"/);
});

test('TemplateCard uses the shared icon contract for badges, help, and actions', () => {
  const html = renderToStaticMarkup(
    <TemplateCard
      templateName="FlowGuide"
      badgeVariant="new"
      cumulativePurchases={120}
      showMarketplaceSignals
      showPreviewLink
      previewLink={{ href: 'https://example.com/preview' }}
    />,
  );

  assert.match(html, /data-ui-icon="sparkles"/);
  assert.match(html, /data-ui-icon="info"/);
  assert.match(html, /data-ui-icon="arrow-right"/);
  assert.match(html, /data-ui-icon="monitor"/);
  assert.doesNotMatch(html, /view-details-arrow\.svg/);
  assert.doesNotMatch(html, /[✦★✓◆]/u);
});
