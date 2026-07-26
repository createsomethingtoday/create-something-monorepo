import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseSseFrames } from '../src/components/chat/templateChatStream';
import type {
  AgentSseEvent,
  AgentTemplateItem,
  DisplayPayload,
  PageActionPayload,
} from '../src/components/chat/templateChatProtocol';

/**
 * Contract fixtures for the agent wire format.
 *
 * The producing Worker (packages/webflow-template-agent, currently only on the
 * CRE-1226 branch) declares these shapes independently, so the two copies can
 * still drift silently until the packages converge and one imports the other.
 * Until then this file is the client-side lock: every event the Worker emits is
 * pinned here as bytes, so a change to our types that stops accepting the real
 * wire format fails a test instead of failing in production.
 *
 * Each fixture below is the Worker's own emit shape:
 *   controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
 */

const TEMPLATE_ITEM: AgentTemplateItem = {
  template_slug: 'flowguide',
  name: 'FlowGuide',
  url: 'https://webflow.com/templates/flowguide',
  website_url: 'https://flowguide.webflow.io',
  purchase_url: 'https://webflow.com/templates/flowguide?checkout=1',
  creator_name: 'Studio One',
  creator_profile_url: 'https://webflow.com/@studio-one',
  creator_avatar_url: 'https://cdn.prod.website-files.com/avatar.jpg',
  creator_avatar_alt: 'Studio One',
  thumbnail_image_url: 'https://cdn.prod.website-files.com/thumb.jpg',
  price: 79,
  is_free: false,
  features: ['CMS', 'Ecommerce'],
  cumulative_purchases: 412,
};

const WIRE_EVENTS: AgentSseEvent[] = [
  { type: 'status', label: 'thinking' },
  { type: 'status', label: 'searching' },
  { type: 'status', label: 'curating' },
  { type: 'text_delta', text: 'Here are three strong fits.' },
  {
    type: 'page_action',
    payload: {
      q: 'bakery',
      category_group_slug: 'food-and-drink',
      styles: ['minimal-websites'],
      types: ['cms'],
      free_only: false,
      sort: 'popular',
      clear_filters: null,
      highlight_slugs: ['flowguide'],
    },
  },
  {
    type: 'display',
    payload: {
      layout: 'gallery',
      title: 'Popular templates',
      items: [{ template_slug: 'flowguide', reason: 'Menu-ready structure.', item: TEMPLATE_ITEM }],
      followups: ['Show free options'],
    },
  },
  { type: 'context', payload: { context_token: 'signed.continuity.token' } },
  { type: 'error', message: 'Template search is unavailable.' },
  { type: 'done' },
];

function encodeAsWorkerDoes(events: readonly AgentSseEvent[]): string {
  return events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('');
}

test('every event the Worker emits survives the client parser as its declared type', () => {
  const { events, rest } = parseSseFrames(encodeAsWorkerDoes(WIRE_EVENTS));

  assert.equal(rest, '', 'no partial frame left behind');
  assert.equal(events.length, WIRE_EVENTS.length);

  const decoded = events.map((data) => JSON.parse(data) as AgentSseEvent);
  assert.deepEqual(decoded, WIRE_EVENTS, 'round-trips without loss or coercion');
});

test('the display payload keeps every field the cards render from', () => {
  const [display] = parseSseFrames(
    encodeAsWorkerDoes([WIRE_EVENTS.find((event) => event.type === 'display')!]),
  ).events.map((data) => JSON.parse(data) as Extract<AgentSseEvent, { type: 'display' }>);

  const payload: DisplayPayload = display.payload;
  const item = payload.items[0].item;

  // Anything dropped here renders as a broken card rather than a type error.
  for (const field of [
    'template_slug',
    'name',
    'url',
    'website_url',
    'purchase_url',
    'creator_name',
    'creator_profile_url',
    'creator_avatar_url',
    'creator_avatar_alt',
    'thumbnail_image_url',
    'price',
    'is_free',
    'features',
    'cumulative_purchases',
  ] as const) {
    assert.ok(field in item, `display item retains ${field}`);
  }
  assert.equal(payload.items[0].reason, 'Menu-ready structure.');
  assert.deepEqual(payload.followups, ['Show free options']);
});

test('every display layout the Worker may choose is a declared layout', () => {
  const layouts: DisplayPayload['layout'][] = [
    'gallery',
    'carousel',
    'spotlight',
    'comparison',
    'shortlist',
  ];

  for (const layout of layouts) {
    const [event] = parseSseFrames(
      encodeAsWorkerDoes([{ type: 'display', payload: { layout, items: [] } }]),
    ).events.map((data) => JSON.parse(data) as Extract<AgentSseEvent, { type: 'display' }>);
    assert.equal(event.payload.layout, layout);
  }
});

test('a page action may null any field it is not changing', () => {
  // The Worker distinguishes "leave this alone" (absent/null) from "clear it"
  // (empty), so nulls must survive the wire rather than being dropped.
  const payload: PageActionPayload = {
    q: null,
    category_group_slug: null,
    styles: null,
    types: null,
    free_only: null,
    sort: null,
    clear_filters: null,
  };
  const [event] = parseSseFrames(encodeAsWorkerDoes([{ type: 'page_action', payload }])).events.map(
    (data) => JSON.parse(data) as Extract<AgentSseEvent, { type: 'page_action' }>,
  );

  assert.deepEqual(event.payload, payload);
});

test('an unknown event type does not break the frames around it', () => {
  // A Worker deployed ahead of this client must not take the turn down.
  const raw =
    encodeAsWorkerDoes([{ type: 'text_delta', text: 'before ' }]) +
    'data: {"type":"future_event","payload":{"whatever":true}}\n\n' +
    encodeAsWorkerDoes([{ type: 'done' }]);

  const decoded = parseSseFrames(raw).events.map((data) => JSON.parse(data) as { type: string });
  assert.deepEqual(
    decoded.map((event) => event.type),
    ['text_delta', 'future_event', 'done'],
    'the unknown frame is delivered and ignored downstream, not fatal',
  );
});
