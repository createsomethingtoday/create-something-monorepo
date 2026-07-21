import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  TemplateCampaignLane,
  TemplateCampaignVideoModal,
  templateCampaignEventData,
} from '../src/components/marketplace/TemplateCampaignLane';

test('renders the MCP 2.0 launch campaign without loading YouTube before activation', () => {
  const html = renderToStaticMarkup(<TemplateCampaignLane enableAnalytics={false} />);

  assert.match(html, /data-campaign-id="webflow-mcp-2"/);
  assert.match(html, /New · Webflow MCP 2\.0/);
  assert.match(html, /Start with a template\. Make it yours with an AI agent\./);
  assert.match(html, /choose and install a Webflow template/i);
  assert.match(html, /Watch MCP 2\.0/);
  assert.match(html, /Get started with MCP/);
  assert.match(html, /i\.ytimg\.com\/vi\/04xmzvomt2I\/hqdefault\.jpg/);
  assert.doesNotMatch(html, /<iframe/);
  assert.doesNotMatch(html, /youtube-nocookie\.com\/embed/);
});

test('renders the official video in an accessible privacy-enhanced modal', () => {
  const html = renderToStaticMarkup(<TemplateCampaignVideoModal onClose={() => undefined} />);

  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /Introducing MCP 2\.0/);
  assert.match(html, /src="https:\/\/www\.youtube-nocookie\.com\/embed\/04xmzvomt2I\?/);
  assert.match(html, /autoplay=1/);
  assert.match(html, /allowfullscreen/);
  assert.match(html, /Close video/);
  assert.match(html, /Get started with MCP/);
});

test('emits a stable campaign-only analytics payload', () => {
  assert.deepEqual(templateCampaignEventData('campaign_video_opened'), {
    component: 'TemplateCampaignLane',
    scope: 'campaign_video_opened',
    campaign_id: 'webflow-mcp-2',
    placement: 'template_grid',
    video_id: '04xmzvomt2I',
  });
});
