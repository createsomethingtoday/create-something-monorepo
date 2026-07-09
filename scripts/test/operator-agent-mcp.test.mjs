import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const repoRoot = new URL('../..', import.meta.url).pathname;
const mcpPath = new URL('../operator-agent-mcp.mjs', import.meta.url).pathname;

function startMcp() {
  const child = spawn(process.execPath, [mcpPath], {
    cwd: repoRoot,
    env: {
      ...process.env,
      NO_COLOR: '1',
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  return child;
}

function createRpc(child) {
  let buffer = '';
  const pending = new Map();
  child.stdout.on('data', (chunk) => {
    buffer += chunk;
    let newline = buffer.indexOf('\n');
    while (newline >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) {
        const message = JSON.parse(line);
        if (message.id !== undefined && pending.has(message.id)) {
          pending.get(message.id)(message);
          pending.delete(message.id);
        }
      }
      newline = buffer.indexOf('\n');
    }
  });
  return (id, method, params = {}) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`timed out waiting for ${method}`));
      }, 20_000);
      pending.set(id, (message) => {
        clearTimeout(timer);
        resolve(message);
      });
      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
    });
}

test('operator-agent MCP exposes read-only local tools and runs readiness', async () => {
  const child = startMcp();
  const call = createRpc(child);

  try {
    const initialized = await call(1, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'operator-agent-mcp-test', version: '0.0.0' },
    });
    assert.equal(initialized.error, undefined);

    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} })}\n`);

    const listed = await call(2, 'tools/list');
    assert.equal(listed.error, undefined);
    const toolNames = listed.result.tools.map((tool) => tool.name);
    assert.ok(toolNames.includes('operator_agent_readiness'));
    assert.ok(toolNames.includes('operator_agent_doctor'));
    assert.ok(toolNames.includes('operator_agent_completion_audit'));
    assert.ok(toolNames.includes('operator_agent_model_probe'));
    assert.ok(toolNames.includes('operator_agent_model_benchmark'));
    assert.ok(toolNames.includes('operator_agent_memory_proposal'));
    assert.ok(toolNames.includes('operator_agent_schedule_once'));
    assert.ok(toolNames.includes('operator_agent_latest_receipt'));
    assert.equal(toolNames.includes('operator_agent_patch'), false);
    assert.equal(toolNames.includes('operator_agent_revise'), false);

    const scheduleTool = listed.result.tools.find((tool) => tool.name === 'operator_agent_schedule_once');
    assert.equal(scheduleTool.annotations.destructiveHint, false);
    const doctorTool = listed.result.tools.find((tool) => tool.name === 'operator_agent_doctor');
    assert.equal(doctorTool.annotations.destructiveHint, false);
    const auditTool = listed.result.tools.find((tool) => tool.name === 'operator_agent_completion_audit');
    assert.equal(auditTool.annotations.readOnlyHint, true);
    assert.equal(auditTool.annotations.destructiveHint, false);
    const memoryTool = listed.result.tools.find((tool) => tool.name === 'operator_agent_memory_proposal');
    assert.equal(memoryTool.annotations.readOnlyHint, true);
    assert.equal(memoryTool.annotations.destructiveHint, false);

    const readiness = await call(3, 'tools/call', {
      name: 'operator_agent_readiness',
      arguments: {},
    });
    assert.equal(readiness.error, undefined);
    const payload = JSON.parse(readiness.result.content[0].text);
    assert.equal(payload.mode, 'readiness');
    assert.equal(payload.passed, true);

    const audit = await call(4, 'tools/call', {
      name: 'operator_agent_completion_audit',
      arguments: {},
    });
    assert.equal(audit.error, undefined);
    const auditPayload = JSON.parse(audit.result.content[0].text);
    assert.equal(auditPayload.mode, 'doctor');
    assert.ok(auditPayload.evidence.completionAudit);
    assert.ok(['blocked-external', 'incomplete', 'complete', 'local-deterministic-ready'].includes(auditPayload.summary.completionVerdict));
  } finally {
    child.kill('SIGTERM');
  }
});

test('operator-agent MCP reads latest schedule receipt without running a new heartbeat', async () => {
  const receiptDir = path.join(repoRoot, '.cache/operator-agent-schedule');
  mkdirSync(receiptDir, { recursive: true });
  const receiptPath = path.join(receiptDir, '9999-01-01T00-00-00-000Z-test-schedule-once-local.json');
  writeFileSync(
    receiptPath,
    `${JSON.stringify(
      {
        generatedAt: '9999-01-01T00:00:00.000Z',
        mode: 'schedule-once',
        outcome: 'schedule-complete',
        passed: true,
        modelBacked: true,
        patternModelBacked: false,
        patternScope: 'all',
        evalSurface: 'docs/guides',
        evalLimit: 1,
        scorecard: {
          modelHealth: 'degraded',
          modelIssues: ['model scout failed or fell back during batch-eval'],
          batchEvalWritesPerformed: 0,
        },
        runs: [],
        nextDecision: 'compare repeated schedule receipts before widening local model authority',
        nextRecommendedRun: '9999-01-01T06:00:00.000Z',
      },
      null,
      2
    )}\n`
  );
  const child = startMcp();
  const call = createRpc(child);

  try {
    await call(1, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'operator-agent-mcp-test', version: '0.0.0' },
    });
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} })}\n`);
    const latest = await call(2, 'tools/call', {
      name: 'operator_agent_latest_receipt',
      arguments: { includeRuns: false },
    });
    assert.equal(latest.error, undefined);
    const payload = JSON.parse(latest.result.content[0].text);
    assert.equal(payload.mode, 'latest-receipt');
    assert.equal(payload.receiptPath, '.cache/operator-agent-schedule/9999-01-01T00-00-00-000Z-test-schedule-once-local.json');
    assert.equal(payload.scorecard.modelHealth, 'degraded');
    assert.equal(payload.scorecard.batchEvalWritesPerformed, 0);
    assert.equal(payload.runs, undefined);
  } finally {
    child.kill('SIGTERM');
    try {
      unlinkSync(receiptPath);
    } catch {}
  }
});
