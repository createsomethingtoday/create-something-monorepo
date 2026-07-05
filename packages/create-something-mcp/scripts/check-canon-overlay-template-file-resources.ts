#!/usr/bin/env tsx
import assert from 'node:assert/strict';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import {
  buildCanonProjectOverlayTemplateFilePack
} from '../../canon/src/lib/overlays/project-template/index.js';
import { CANON_OVERLAY_TEMPLATE_FILE_PACK } from '../src/content/generated/canon-overlay-template-files.js';
import { CANON_PAGES } from '../src/content/generated/canon.js';
import { registerResources } from '../src/resources.js';
import { search } from '../src/search.js';

type RegisteredResource = {
  name: string;
  uri: string;
  metadata: {
    description?: string;
    mimeType?: string;
  };
  handler: (uri: URL) => Promise<{
    contents: Array<{
      mimeType?: string;
      text: string;
    }>;
  }>;
};

const resources: RegisteredResource[] = [];
const server = {
  resource(
    name: string,
    uri: string,
    metadata: RegisteredResource['metadata'],
    handler: RegisteredResource['handler']
  ) {
    resources.push({ name, uri, metadata, handler });
  }
};

registerResources(server as unknown as McpServer);

const canonFilePack = buildCanonProjectOverlayTemplateFilePack();

assert.equal(CANON_OVERLAY_TEMPLATE_FILE_PACK.templateId, 'overlay.project-template');
assert.equal(CANON_OVERLAY_TEMPLATE_FILE_PACK.filesUri, 'canon://overlays/overlay.project-template/files');
assert.equal(CANON_OVERLAY_TEMPLATE_FILE_PACK.files.length, 8);
assert.deepEqual(
  CANON_OVERLAY_TEMPLATE_FILE_PACK,
  canonFilePack,
  'Generated MCP overlay template file pack must match the Canon source helper'
);

const listResource = requireResource('canon://overlays/list');
const listPayload = JSON.parse(
  (await listResource.handler(new URL(listResource.uri))).contents[0]!.text
) as Array<{ id: string; templateFilesUri?: string }>;

assert.equal(
  listPayload.find((template) => template.id === 'overlay.project-template')?.templateFilesUri,
  CANON_OVERLAY_TEMPLATE_FILE_PACK.filesUri
);

const templateResource = requireResource('canon://overlays/overlay.project-template');
const templatePayload = JSON.parse(
  (await templateResource.handler(new URL(templateResource.uri))).contents[0]!.text
) as { templateFilesUri?: string };

assert.equal(templatePayload.templateFilesUri, CANON_OVERLAY_TEMPLATE_FILE_PACK.filesUri);

const collectionResource = requireResource(CANON_OVERLAY_TEMPLATE_FILE_PACK.filesUri);
const collectionPayload = JSON.parse(
  (await collectionResource.handler(new URL(collectionResource.uri))).contents[0]!.text
) as typeof CANON_OVERLAY_TEMPLATE_FILE_PACK;

assert.equal(collectionPayload.summary.totalFiles, 8);
assert.match(collectionPayload.description, /web, chat, app, voice, and glasses/);
assert.match(collectionPayload.agentContract.stopBefore.join('\n'), /writing template files/);

const surfacePolicy = collectionPayload.files.find((file) => file.relativePath === 'surface-policy.md');
const surfaceBrief = collectionPayload.files.find((file) => file.relativePath === 'templates/surface-brief.md');
const manifest = collectionPayload.files.find((file) => file.relativePath === 'manifest.ts');

assert.ok(surfacePolicy, 'Expected surface-policy.md in the template file pack');
assert.ok(surfaceBrief, 'Expected templates/surface-brief.md in the template file pack');
assert.ok(manifest, 'Expected manifest.ts in the template file pack');
assert.equal(surfacePolicy.mimeType, 'text/markdown');
assert.match(surfacePolicy.content, /## Glasses/);
assert.match(surfaceBrief.uri, /templates%2Fsurface-brief\.md$/);
assert.match(manifest.content, /CANON_PROJECT_OVERLAY_MANIFEST/);

const surfacePolicyResource = requireResource(surfacePolicy.uri);
const surfacePolicyPayload = await surfacePolicyResource.handler(new URL(surfacePolicyResource.uri));

assert.equal(surfacePolicyPayload.contents[0]!.mimeType, 'text/markdown');
assert.equal(surfacePolicyPayload.contents[0]!.text, surfacePolicy.content);
assert.match(surfacePolicyPayload.contents[0]!.text, /Promotion Boundary/);

const searchResults = search('overlay template surface-policy glasses manifest.ts theme.css tokens.json', {
  type: 'canon-registry',
  property: 'ltd',
  limit: 20
});

assert.ok(
  searchResults.some((result) =>
    result.item.id === 'canon-overlay-template-file-pack:overlay.project-template'
  ),
  'Expected search to include the overlay template file pack'
);
assert.ok(
  searchResults.some((result) =>
    result.item.id === 'canon-overlay-template-file:overlay.project-template:surface-policy.md'
  ),
  'Expected search to include the surface-policy.md file resource'
);

const overlaysPage = CANON_PAGES.find((page) => page.slug === 'resources/overlays');

assert.ok(overlaysPage, 'Expected generated Canon overlay docs page');
assert.match(overlaysPage.content, /canon:\/\/overlays\/overlay\.project-template\/files/);
assert.match(overlaysPage.content, /Template file resource/);

console.log('Canon overlay template file resources smoke passed.');

function requireResource(uri: string) {
  const resource = resources.find((entry) => entry.uri === uri);
  assert.ok(resource, `Expected MCP resource to be registered: ${uri}`);
  return resource;
}
