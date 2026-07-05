#!/usr/bin/env tsx
import assert from 'node:assert/strict';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import {
  getCanonOverlayCandidatePromotionApprovalRecord,
  getCanonOverlayCandidatePromotionApprovalValidationReport,
  listCanonOverlayCandidatePromotionApprovalRecordIds,
  renderCanonOverlayCandidatePromotionApprovalValidationReport
} from '../src/canon-overlay-candidate-promotion-approval-record.js';
import { registerTools } from '../src/tools.js';

type ToolResult = {
  content: Array<{
    text: string;
  }>;
  isError?: boolean;
};

type RegisteredTool = {
  name: string;
  description: string;
  handler: (input: { intakeId: string }) => Promise<ToolResult>;
};

const tools: RegisteredTool[] = [];
const server = {
  tool(
    name: string,
    description: string,
    _schema: unknown,
    handler: RegisteredTool['handler']
  ) {
    tools.push({ name, description, handler });
  }
};

registerTools(server as unknown as McpServer);

const ids = listCanonOverlayCandidatePromotionApprovalRecordIds();

assert.ok(ids.length > 0, 'Expected the MCP validation-report getter to see generated records');

const record = getCanonOverlayCandidatePromotionApprovalRecord(ids[0]!);

assert.ok(record, 'Expected to resolve a generated Canon overlay candidate promotion approval record');

const report = getCanonOverlayCandidatePromotionApprovalValidationReport(record.intakeId);

assert.ok(report, 'Expected to resolve a generated Canon overlay candidate promotion approval validation report');
assert.equal(report.status, 'missing-required-fields');
assert.equal(report.summary.readyForImplementation, false);
assert.equal(report.summary.missingRequiredFields, 9);

const rendered = renderCanonOverlayCandidatePromotionApprovalValidationReport(report);

assert.match(rendered, /^# .+ approval validation/m);
assert.match(rendered, /Validation report: canon:\/\/overlays\/candidates\/.+\/approval-record\/validation/);
assert.match(rendered, /Missing required fields: 9/);
assert.match(rendered, /Ready for implementation: no/);
assert.match(rendered, /does not itself approve implementation/);
assert.match(rendered, /Stop before: automatically creating Linear work/);

const tool = requireTool('canon_overlay_candidate_promotion_approval_validation_report_get');

assert.match(tool.description, /current rendered read-only/);
assert.match(tool.description, /does not fill fields/);

const result = await tool.handler({ intakeId: record.intakeId });
const text = result.content[0]!.text;

assert.equal(result.isError, undefined);
assert.match(text, /Status: missing-required-fields/);
assert.match(text, /Validation report: canon:\/\/overlays\/candidates\/.+\/approval-record\/validation/);
assert.match(text, /Missing required fields: 9/);
assert.match(text, /Stop before: automatically creating Linear work/);

const aliasResult = await tool.handler({ intakeId: record.candidateId });

assert.equal(aliasResult.content[0]!.text, text);

const missingResult = await tool.handler({ intakeId: 'overlay.missing' });

assert.equal(missingResult.isError, true);
assert.match(
  missingResult.content[0]!.text,
  /Canon overlay candidate promotion approval validation report not found: overlay\.missing/
);
assert.match(missingResult.content[0]!.text, /Available intake ids:/);
assert.match(missingResult.content[0]!.text, new RegExp(record.intakeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

console.log('Canon overlay candidate promotion approval validation-report tool smoke passed.');

function requireTool(name: string) {
  const tool = tools.find((entry) => entry.name === name);
  assert.ok(tool, `Expected MCP tool to be registered: ${name}`);
  return tool;
}
