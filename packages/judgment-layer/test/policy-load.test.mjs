import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { loadProjectPolicies } from '../dist/policy/load.js';

test('loadProjectPolicies loads and normalizes TOML policy packs', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'cs-judge-'));
  try {
    const dir = join(cwd, '.judgment', 'policies');
    mkdirSync(dir, { recursive: true });

    const path = join(dir, 'custom.toml');
    writeFileSync(
      path,
      `
id = "custom"
label = "Custom"
description = "Custom policy for tests"
model = "gpt-5.1-codex"
effort = "low"
summary = "concise"
approval_policy = "on-request"
non_interactive_decision = "cancel"
developer_instructions = "hello"

[sandbox_policy]
type = "workspaceWrite"
network_access = true
writable_roots = ["$CWD", "/tmp"]

[auto_approve]
command_action_types = ["read", "listFiles"]
command_regex = ["^git\\\\s+status\\\\b"]
file_path_prefixes = ["src/"]
`,
      'utf-8'
    );

    const [p] = loadProjectPolicies(cwd);
    assert.equal(p.id, 'custom');
    assert.equal(p.label, 'Custom');
    assert.equal(p.description, 'Custom policy for tests');
    assert.equal(p.model, 'gpt-5.1-codex');
    assert.equal(p.effort, 'low');
    assert.equal(p.summary, 'concise');
    assert.equal(p.approvalPolicy, 'on-request');
    assert.equal(p.nonInteractiveDecision, 'cancel');
    assert.equal(p.developerInstructions, 'hello');

    assert.deepEqual(p.sandboxPolicy, {
      type: 'workspaceWrite',
      networkAccess: true,
      writableRoots: ['$CWD', '/tmp'],
    });

    assert.deepEqual(p.autoApprove, {
      commandActionTypes: ['read', 'listFiles'],
      commandRegex: ['^git\\s+status\\b'],
      filePathPrefixes: ['src/'],
    });

    assert.equal(p.source, 'project');
    assert.equal(p.sourcePath, path);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('loadProjectPolicies fails closed on invalid sandbox_policy.type', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'cs-judge-'));
  try {
    const dir = join(cwd, '.judgment', 'policies');
    mkdirSync(dir, { recursive: true });

    writeFileSync(
      join(dir, 'bad.toml'),
      `
id = "bad"
approval_policy = "untrusted"
non_interactive_decision = "decline"

[sandbox_policy]
type = "notARealSandbox"
`,
      'utf-8'
    );

    assert.throws(() => loadProjectPolicies(cwd), /Invalid project policy files/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
