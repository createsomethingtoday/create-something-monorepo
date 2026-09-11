#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function assertion(name, run) {
  try {
    run();
    return { name, passed: true, error: null };
  } catch (error) {
    return {
      name,
      passed: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function equal(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

export async function evaluateRun(runDir) {
  const packageDir = path.resolve(runDir, 'packages/mcp-authz');
  if (!existsSync(path.join(packageDir, 'package.json'))) {
    throw new Error(`mcp-authz package is missing from fixture: ${packageDir}`);
  }

  const build = spawnSync('pnpm', ['build'], {
    cwd: packageDir,
    encoding: 'utf8',
    timeout: 180_000,
    env: process.env
  });
  const buildPassed = build.status === 0;
  const cases = [];

  if (buildPassed) {
    const moduleUrl = `${pathToFileURL(path.join(packageDir, 'dist/index.js')).href}?hidden=${Date.now()}`;
    const { buildHubAuthorizationRequest, classifyHubRoute } = await import(moduleUrl);

    cases.push(
      assertion('read description ignores control-plane prose', () => {
        const result = classifyHubRoute(
          {
            proxyToolName: 'composio-toolkit-gmail__gmail_fetch_emails',
            serverName: 'composio-toolkit-gmail',
            downstreamToolName: 'gmail_fetch_emails'
          },
          { description: 'Fetch messages. Empty results are a valid no-results state.' }
        );
        equal(result.accessType, 'read', 'accessType');
      }),
      assertion('read description ignores destructive prose', () => {
        const result = classifyHubRoute(
          {
            proxyToolName: 'composio-toolkit-gmail__gmail_fetch_message_by_message_id',
            serverName: 'composio-toolkit-gmail',
            downstreamToolName: 'gmail_fetch_message_by_message_id'
          },
          { description: 'Fetch one message. Spam and trash are excluded by default.' }
        );
        equal(result.accessType, 'read', 'accessType');
      }),
      assertion('multiplexed list invocation classifies as read', () => {
        const result = classifyHubRoute(
          {
            proxyToolName: 'operator-notion__operator_notion_sync_contracts',
            serverName: 'operator-notion',
            downstreamToolName: 'operator_notion_sync_contracts'
          },
          { description: 'Manage contracts.' },
          { invocationAction: 'list_contracts' }
        );
        equal(result.accessType, 'read', 'accessType');
      }),
      assertion('multiplexed mutation invocation classifies as write', () => {
        const result = classifyHubRoute(
          {
            proxyToolName: 'operator-notion__operator_notion_sync_contracts',
            serverName: 'operator-notion',
            downstreamToolName: 'operator_notion_sync_contracts'
          },
          { description: 'Manage contracts.' },
          { invocationAction: 'run_sync_contract' }
        );
        equal(result.accessType, 'write', 'accessType');
      }),
      assertion('destructive invocation takes precedence', () => {
        const result = classifyHubRoute(
          {
            proxyToolName: 'operator-notion__operator_notion_contracts',
            serverName: 'operator-notion',
            downstreamToolName: 'operator_notion_contracts'
          },
          undefined,
          { invocationAction: 'delete_contract' }
        );
        equal(result.accessType, 'destructive', 'accessType');
      }),
      assertion('authentication invocation takes precedence', () => {
        const result = classifyHubRoute(
          {
            proxyToolName: 'operator-notion__operator_notion_contracts',
            serverName: 'operator-notion',
            downstreamToolName: 'operator_notion_contracts'
          },
          undefined,
          { invocationAction: 'get_connect_link' }
        );
        equal(result.accessType, 'auth_admin', 'accessType');
      }),
      assertion('control-plane invocation remains control-plane', () => {
        const result = classifyHubRoute(
          {
            proxyToolName: 'operator-notion__operator_notion_contracts',
            serverName: 'operator-notion',
            downstreamToolName: 'operator_notion_contracts'
          },
          undefined,
          { invocationAction: 'inspect_policy_state' }
        );
        equal(result.accessType, 'read', 'read prefix remains authoritative');

        const control = classifyHubRoute(
          {
            proxyToolName: 'operator-notion__operator_notion_contracts',
            serverName: 'operator-notion',
            downstreamToolName: 'operator_notion_contracts'
          },
          undefined,
          { invocationAction: 'policy_state' }
        );
        equal(control.accessType, 'control_plane', 'control-plane accessType');
      }),
      assertion('authorization request retains invocation evidence', () => {
        const request = buildHubAuthorizationRequest({
          accountId: 'acct_hidden',
          proxyToolName: 'operator-notion__operator_notion_sync_contracts',
          serverName: 'operator-notion',
          downstreamToolName: 'operator_notion_sync_contracts',
          actionName: 'execute',
          invocationAction: 'list_contracts'
        });
        equal(request.resource.accessType, 'read', 'resource accessType');
        equal(request.action.writeIntent, false, 'writeIntent');
        equal(request.resource.metadata.invocationAction, 'list_contracts', 'metadata invocationAction');
      })
    );
  }

  const passedCaseCount = cases.filter((item) => item.passed).length;
  return {
    schemaVersion: 'codex-instruction-ablation-hidden-evaluation.v1',
    passed: buildPassed && cases.length === 8 && passedCaseCount === cases.length,
    build: {
      passed: buildPassed,
      exitCode: build.status,
      signal: build.signal,
      stdoutTail: (build.stdout ?? '').slice(-4000),
      stderrTail: (build.stderr ?? '').slice(-4000)
    },
    cases,
    summary: {
      passed: passedCaseCount,
      total: cases.length
    }
  };
}

function parseRunDir(argv) {
  const index = argv.indexOf('--run-dir');
  if (index === -1 || !argv[index + 1]) {
    throw new Error('Usage: hidden-evaluator.mjs --run-dir <fixture>');
  }
  return argv[index + 1];
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  try {
    const result = await evaluateRun(parseRunDir(process.argv.slice(2)));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (!result.passed) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  }
}
