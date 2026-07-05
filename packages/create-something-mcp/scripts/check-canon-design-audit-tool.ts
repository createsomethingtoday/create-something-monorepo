#!/usr/bin/env tsx
import assert from 'node:assert/strict';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { renderCanonDesignAudit } from '@create-something/canon/design-audit';

import { registerTools } from '../src/tools.js';

type ToolResult = {
  content: Array<{
    text: string;
  }>;
  isError?: boolean;
};

type ToolInput = {
  design: string;
  section?: 'colors' | 'typography' | 'spacing' | 'motion' | 'layout' | 'all';
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

const tool = requireTool('audit_design');

assert.match(tool.description, /Canon design system principles/);
assert.match(tool.description, /color usage, typography, spacing, motion/);

const design =
  'A dense workflow review panel with a blue action button, proof rows, compact metadata, and a transition when approval state changes.';
const result = await tool.handler({ design, section: 'colors' });
const expected = renderCanonDesignAudit({ design, section: 'colors' });

assert.equal(result.isError, undefined);
assert.equal(result.content[0]!.text, expected);
assert.match(result.content[0]!.text, /## Canon Design Audit/);
assert.match(result.content[0]!.text, /\*\*Section:\*\* colors/);
assert.match(result.content[0]!.text, /--color-bg-surface/);
assert.match(result.content[0]!.text, /--color-fg-primary/);
assert.doesNotMatch(result.content[0]!.text, /--bg-primary/);
assert.doesNotMatch(result.content[0]!.text, /--fg-primary/);

const allResult = await tool.handler({ design });
assert.match(allResult.content[0]!.text, /### Layout/);
assert.match(allResult.content[0]!.text, /### Motion/);

console.log('Canon design audit MCP tool smoke passed.');

function requireTool(name: string) {
  const tool = tools.find((entry) => entry.name === name);
  assert.ok(tool, `Expected MCP tool to be registered: ${name}`);
  return tool;
}
