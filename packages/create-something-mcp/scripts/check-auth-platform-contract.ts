#!/usr/bin/env tsx
import assert from 'node:assert/strict';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { registerResources } from '../src/resources.js';
import { registerTools } from '../src/tools.js';

type RegisteredResource = {
  uri: string;
  handler: (uri: URL) => Promise<{ contents: Array<{ text: string }> }>;
};
type ToolResult = { content: Array<{ text: string }>; isError?: boolean };
type RegisteredTool = {
  name: string;
  handler: (input: Record<string, unknown>) => Promise<ToolResult>;
};

const resources: RegisteredResource[] = [];
const tools: RegisteredTool[] = [];
const server = {
  resource(_name: string, uri: string, _metadata: unknown, handler: RegisteredResource['handler']) {
    resources.push({ uri, handler });
  },
  tool(name: string, _description: string, _schema: unknown, handler: RegisteredTool['handler']) {
    tools.push({ name, handler });
  },
};

registerResources(server as unknown as McpServer);
registerTools(server as unknown as McpServer);

const contractResource = requireResource('auth://platform/contract');
const contract = JSON.parse((await contractResource.handler(new URL(contractResource.uri))).contents[0]!.text);
assert.equal(contract.version, '1.0.0');
assert.equal(contract.issuer, 'https://id.createsomething.space');
assert.deepEqual(contract.mcp.mutations, []);

const openapiResource = requireResource('auth://platform/openapi');
const openapi = JSON.parse((await openapiResource.handler(new URL(openapiResource.uri))).contents[0]!.text);
assert.equal(openapi.openapi, '3.1.0');
assert.equal(openapi.paths['/v1/auth/login'].post.operationId, 'login');

const validate = requireTool('auth_config_validate');
const ready = parseResult(await validate.handler({
  environment: 'production',
  issuer: 'https://id.createsomething.space',
  jwksUrl: 'https://id.createsomething.space/.well-known/jwks.json',
  audiences: ['ona-agents'],
  allowEmailDomains: ['createsomething.io'],
  preview: false,
}));
assert.equal(ready.status, 'ready');
assert.deepEqual(ready.errors, []);

const incomplete = parseResult(await validate.handler({ environment: 'production' }));
assert.equal(incomplete.status, 'blocked');
assert.ok(incomplete.errors.some((error: string) => error.includes('issuer')));
assert.ok(incomplete.errors.some((error: string) => error.includes('audience')));
assert.ok(incomplete.errors.some((error: string) => error.includes('allow rule')));

const unsafePreview = parseResult(await validate.handler({
  environment: 'production',
  issuer: 'https://id.createsomething.space',
  audiences: ['ona-agents'],
  allowAnyAuthenticated: true,
  preview: true,
}));
assert.equal(unsafePreview.status, 'blocked');
assert.ok(unsafePreview.errors.some((error: string) => error.includes('preview')));

const secretBearing = parseResult(await validate.handler({
  environment: 'development',
  issuer: 'https://id.createsomething.space',
  audiences: ['ona-agents'],
  allowSubjects: ['operator'],
  preview: false,
  secret: 'do-not-send-secrets-to-this-tool',
}));
assert.equal(secretBearing.status, 'blocked');
assert.ok(secretBearing.errors.some((error: string) => error.includes('secret material')));

console.log('Auth platform API/MCP contract smoke passed.');

function requireResource(uri: string) {
  const resource = resources.find((entry) => entry.uri === uri);
  assert.ok(resource, `Expected MCP resource to be registered: ${uri}`);
  return resource;
}

function requireTool(name: string) {
  const tool = tools.find((entry) => entry.name === name);
  assert.ok(tool, `Expected MCP tool to be registered: ${name}`);
  return tool;
}

function parseResult(result: ToolResult) {
  return JSON.parse(result.content[0]!.text) as {
    status: string;
    errors: string[];
    warnings: string[];
  };
}
