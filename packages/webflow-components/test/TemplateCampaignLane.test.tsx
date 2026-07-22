import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  TemplateCampaignLane,
  TemplateCampaignVideoModal,
  templateCampaignEventData,
} from '../src/components/marketplace/TemplateCampaignLane';

test('renders the MCP 2.0 launch campaign without loading video before activation', () => {
  const html = renderToStaticMarkup(<TemplateCampaignLane enableAnalytics={false} />);

  assert.match(html, /data-campaign-id="webflow-mcp-2"/);
  assert.match(html, /New · Webflow MCP 2\.0/);
  assert.match(html, /Start with a template\. Make it yours with an AI agent\./);
  assert.match(html, /choose and install a Webflow template/i);
  assert.match(html, /Watch MCP 2\.0/);
  assert.match(html, /Get started with MCP/);
  assert.match(html, /aria-haspopup="dialog"/);
  assert.match(html, /data-video-destination="cloudflare"/);
  assert.match(html, /container-type:\s*inline-size/);
  assert.match(html, /@container tmcampaign/);
  assert.doesNotMatch(html, /i\.ytimg\.com/);
  assert.doesNotMatch(html, /<img/);
  assert.doesNotMatch(html, /<video/);
  assert.doesNotMatch(html, /<iframe/);
  assert.doesNotMatch(html, /youtu(?:be|\.be)/);
});

test('renders the Cloudflare-hosted video in an accessible native-player modal', () => {
  const html = renderToStaticMarkup(<TemplateCampaignVideoModal onClose={() => undefined} />);

  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /Introducing MCP 2\.0/);
  assert.match(html, /<video/);
  assert.match(html, /src="https:\/\/pub-fb87e05654104f5fbb33989fc4dca65b\.r2\.dev\/webflow\/mcp-2\/introducing-mcp-2-0-1080p\.mp4"/);
  assert.match(html, /controls=""/);
  assert.match(html, /playsinline=""/);
  assert.match(html, /preload="metadata"/);
  assert.doesNotMatch(html, /<iframe/);
  assert.doesNotMatch(html, /i\.ytimg\.com/);
  assert.doesNotMatch(html, /youtu(?:be|\.be)/);
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
