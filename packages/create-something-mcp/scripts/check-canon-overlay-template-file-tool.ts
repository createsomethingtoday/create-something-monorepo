#!/usr/bin/env tsx
import assert from 'node:assert/strict';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import {
  getCanonOverlayTemplateFile,
  getCanonOverlayTemplateFilePack,
  listCanonOverlayTemplateFilePaths,
  renderCanonOverlayTemplateFile,
  renderCanonOverlayTemplateFilePack
} from '../src/canon-overlay-template-file-pack.js';
import { registerTools } from '../src/tools.js';

type ToolResult = {
  content: Array<{
    text: string;
  }>;
  isError?: boolean;
};

type ToolInput = {
  relativePath?: string;
};

type RegisteredTool = {
  name: string;
  description: string;
  handler: (input: ToolInput) => Promise<ToolResult>;
};

const tools: RegisteredTool[] = [];
const server = {
  tool(name: string, description: string, _schema: unknown, handler: RegisteredTool['handler']) {
    tools.push({ name, description, handler });
  }
};

registerTools(server as unknown as McpServer);

const pack = getCanonOverlayTemplateFilePack();

assert.equal(pack.templateId, 'overlay.project-template');
assert.equal(pack.files.length, 8);
assert.deepEqual(listCanonOverlayTemplateFilePaths(), [
  'theme.css',
  'tokens.json',
  'templates/README.md',
  'templates/surface-brief.md',
  'copy-rules.md',
  'surface-policy.md',
  'registry.json',
  'manifest.ts'
]);

const renderedPack = renderCanonOverlayTemplateFilePack(pack);

assert.match(renderedPack, /^# Canon project overlay template file pack/m);
assert.match(
  renderedPack,
  /File pack resource: canon:\/\/overlays\/overlay\.project-template\/files/
);
assert.match(renderedPack, /Primary consumers: codex, mcp, ltd-docs, project-overlays/);
assert.match(renderedPack, /Stop before:/);
assert.match(renderedPack, /### templates\/surface-brief\.md/);
assert.match(renderedPack, /```ts\nimport type \{ CanonProjectOverlayManifest \}/);

const surfaceBrief = getCanonOverlayTemplateFile('templates/surface-brief.md');
const encodedSurfaceBrief = getCanonOverlayTemplateFile('templates%2Fsurface-brief.md');

assert.ok(surfaceBrief, 'Expected to resolve nested surface brief path');
assert.equal(encodedSurfaceBrief?.relativePath, surfaceBrief.relativePath);
assert.match(renderCanonOverlayTemplateFile(surfaceBrief), /^### templates\/surface-brief\.md/m);
assert.match(renderCanonOverlayTemplateFile(surfaceBrief), /Workflow Need/);

const tool = requireTool('canon_overlay_template_file_get');

assert.match(tool.description, /rendered read-only Canon project overlay template file pack/);
assert.match(tool.description, /does not write files or mutate overlays/);

const fullResult = await tool.handler({});

assert.equal(fullResult.isError, undefined);
assert.equal(fullResult.content[0]!.text, renderedPack);

const fileResult = await tool.handler({ relativePath: 'templates/surface-brief.md' });

assert.equal(fileResult.isError, undefined);
assert.equal(fileResult.content[0]!.text, renderCanonOverlayTemplateFile(surfaceBrief));
assert.match(
  fileResult.content[0]!.text,
  /Resource: canon:\/\/overlays\/overlay\.project-template\/files\/templates%2Fsurface-brief\.md/
);

const encodedResult = await tool.handler({ relativePath: 'templates%2Fsurface-brief.md' });

assert.equal(encodedResult.content[0]!.text, fileResult.content[0]!.text);

const missingResult = await tool.handler({ relativePath: 'templates/missing.md' });

assert.equal(missingResult.isError, true);
assert.match(
  missingResult.content[0]!.text,
  /Canon overlay template file not found: templates\/missing\.md/
);
assert.match(missingResult.content[0]!.text, /Available file paths:/);
assert.match(missingResult.content[0]!.text, /surface-policy\.md/);

console.log('Canon overlay template file tool smoke passed.');

function requireTool(name: string) {
  const tool = tools.find((entry) => entry.name === name);
  assert.ok(tool, `Expected MCP tool to be registered: ${name}`);
  return tool;
}
