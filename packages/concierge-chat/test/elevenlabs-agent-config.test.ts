import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

interface AgentConfig {
  name: string;
  conversation_config: {
    agent: {
      first_message: string;
      prompt: {
        prompt: string;
        tool_ids: string[];
        tools: unknown[];
      };
    };
    turn: {
      soft_timeout_config: {
        message: string;
      };
    };
  };
  platform_settings: {
    auth: {
      enable_auth: boolean;
      allowlist: unknown[];
    };
    privacy: {
      record_voice: boolean;
      retention_days: number;
      delete_audio: boolean;
    };
    call_limits: {
      agent_concurrency_limit: number;
      daily_limit: number;
    };
  };
}

const configDirectory = path.resolve('elevenlabs/agent_configs');

async function readConfig(filename: string): Promise<AgentConfig> {
  return JSON.parse(await readFile(path.join(configDirectory, filename), 'utf8')) as AgentConfig;
}

test('web voice agent has a complete candidate-controlled workflow', async () => {
  const config = await readConfig('Abundance-Web-Voice-Concierge.json');
  const prompt = config.conversation_config.agent.prompt.prompt;

  assert.match(prompt, /Respect any request to speak with a person\./);
  assert.match(prompt, /Do not say that a transfer or callback has been arranged/);
  assert.match(prompt, /prepare_application_brief/);
  assert.equal(config.conversation_config.agent.prompt.tool_ids.length, 1);
  assert.match(config.conversation_config.agent.prompt.tool_ids[0], /^tool_/);
  assert.equal(config.platform_settings.auth.enable_auth, true);
  assert.deepEqual(config.platform_settings.auth.allowlist, []);
});

test('phone voice agent stays focused on examiner opportunities', async () => {
  const config = await readConfig('Abundance-Examiner-Phone-Concierge.json');
  const prompt = config.conversation_config.agent.prompt.prompt;

  assert.match(prompt, /examiner opportunities/i);
  assert.match(prompt, /Do not describe or recommend nursing jobs outside approved examiner opportunities\./);
  assert.doesNotMatch(prompt, /Healthcare facilities requesting staffing coverage/);
  assert.doesNotMatch(prompt, /Current Assignment Support/);
});

test('voice agents use a neutral latency message', async () => {
  for (const filename of [
    'Abundance-Web-Voice-Concierge.json',
    'Abundance-Examiner-Phone-Concierge.json'
  ]) {
    const config = await readConfig(filename);
    assert.equal(config.conversation_config.turn.soft_timeout_config.message, 'One moment.');
    assert.equal(config.platform_settings.privacy.record_voice, false);
    assert.equal(config.platform_settings.privacy.delete_audio, true);
    assert.equal(config.platform_settings.privacy.retention_days, 30);
    assert.equal(config.platform_settings.call_limits.agent_concurrency_limit, 5);
    assert.equal(config.platform_settings.call_limits.daily_limit, 100);
  }
});
