import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  loadDifyHealthRegistry,
  parseArgs,
  runDifyHealthRegistry
} from '../scripts/run-dify-health-registry.mjs';

async function writeAgentConfig(dir: string, name: string, config: Record<string, unknown>) {
  await writeFile(join(dir, `${name}.json`), JSON.stringify(config, null, 2));
}

async function createConfigDir() {
  const root = await mkdtemp(join(tmpdir(), 'dify-health-registry-'));
  const configDir = join(root, 'config', 'dify-agents');
  await mkdir(configDir, { recursive: true });
  return { root, configDir };
}

test('parses pnpm-forwarded option separator', () => {
  const args = parseArgs([
    'node',
    'run-dify-health-registry.mjs',
    '--',
    '--agent',
    'demo-agent',
    '--dry-run'
  ]);

  assert.equal(args.agent, 'demo-agent');
  assert.equal(args.dryRun, true);
});

test('loads Dify health entries and derives per-agent secret environment', async () => {
  const { root, configDir } = await createConfigDir();
  await writeAgentConfig(configDir, 'demo-agent', {
    dify_app: {
      name: 'Demo Agent',
      service_api: {
        base_url: 'https://api.dify.example/v1',
        api_key_secret: {
          environment: 'prod',
          path: '/dify/demo-agent',
          secret_key: 'DIFY_DEMO_AGENT_API_KEY'
        }
      }
    },
    health: {
      registry_id: 'dify.demo-agent',
      component: 'Dify Demo Agent',
      command: ['pnpm', 'demo:smoke'],
      env: {
        DIFY_AGENT_EVAL_USER: 'ink-health-demo-agent'
      }
    }
  });

  const entries = await loadDifyHealthRegistry({ repoRoot: root, configDir: 'config/dify-agents' });
  assert.equal(entries.length, 1);
  assert.equal(entries[0].agent_id, 'demo-agent');
  assert.equal(entries[0].registry_id, 'dify.demo-agent');
  assert.equal(entries[0].valid, true);
  assert.deepEqual(entries[0].command, ['pnpm', 'demo:smoke']);
  assert.equal(entries[0].env.DIFY_AGENT_BASE_URL, 'https://api.dify.example/v1');
  assert.equal(entries[0].env.DIFY_AGENT_INFISICAL_ENV, 'prod');
  assert.equal(entries[0].env.DIFY_AGENT_INFISICAL_PATH, '/dify/demo-agent');
  assert.equal(entries[0].env.DIFY_AGENT_API_KEY_ENV, 'DIFY_DEMO_AGENT_API_KEY');
  assert.equal(entries[0].env.DIFY_AGENT_API_KEY_SECRET_NAME, 'DIFY_DEMO_AGENT_API_KEY');
  assert.equal(entries[0].env.DIFY_AGENT_EVAL_USER, 'ink-health-demo-agent');
});

test('runs a selected registry entry through the command health wrapper', async () => {
  const { root, configDir } = await createConfigDir();
  await writeAgentConfig(configDir, 'demo-agent', {
    dify_app: {
      name: 'Demo Agent',
      service_api: {
        api_key_secret: {
          environment: 'prod',
          path: '/dify/demo-agent',
          secret_key: 'DIFY_DEMO_AGENT_API_KEY'
        }
      }
    },
    health: {
      registry_id: 'dify.demo-agent',
      component: 'Dify Demo Agent',
      command: ['node', 'demo-smoke.mjs']
    }
  });

  let captured:
    | {
        executable: string;
        args: string[];
        cwd: string;
        env: NodeJS.ProcessEnv;
      }
    | undefined;

  const result = await runDifyHealthRegistry(
    parseArgs([
      'node',
      'run-dify-health-registry.mjs',
      '--config-dir',
      configDir,
      '--agent',
      'demo-agent',
      '--dry-run'
    ]),
    {
      repoRoot: root,
      stdio: 'pipe',
      spawnSync: (
        executable: string,
        args: string[],
        options: { cwd: string; env: NodeJS.ProcessEnv }
      ) => {
        captured = { executable, args, cwd: options.cwd, env: options.env };
        return { status: 0 };
      }
    }
  );

  assert.equal(result.ok, true);
  assert.equal(result.checked, 1);
  assert.equal(result.results[0].registry_id, 'dify.demo-agent');
  assert.equal(captured?.executable, 'node');
  assert.deepEqual(captured?.args, ['demo-smoke.mjs']);
  assert.equal(captured?.cwd, root);
  assert.equal(captured?.env.DIFY_AGENT_INFISICAL_PATH, '/dify/demo-agent');
  assert.equal(captured?.env.DIFY_AGENT_API_KEY_ENV, 'DIFY_DEMO_AGENT_API_KEY');
});

test('reports invalid enabled configs without running a command', async () => {
  const { root, configDir } = await createConfigDir();
  await writeAgentConfig(configDir, 'missing-command', {
    dify_app: {
      name: 'Missing Command Agent'
    },
    health: {
      registry_id: 'dify.missing-command'
    }
  });

  let ran = false;
  const result = await runDifyHealthRegistry(
    parseArgs(['node', 'run-dify-health-registry.mjs', '--config-dir', configDir, '--dry-run']),
    {
      repoRoot: root,
      stdio: 'pipe',
      spawnSync: () => {
        ran = true;
        return { status: 0 };
      }
    }
  );

  assert.equal(ran, false);
  assert.equal(result.ok, false);
  assert.equal(result.exit_code, 1);
  assert.match(result.results[0].error ?? '', /health\.command/);
});
