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
      silence_end_call_timeout: number;
      soft_timeout_config: {
        message: string;
      };
    };
    conversation: {
      file_input: {
        enabled: boolean;
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
    widget: {
      terms_text: string;
    };
    evaluation: {
      criteria: Array<{
        id: string;
        name: string;
        type: string;
        conversation_goal_prompt: string;
        scope: string;
        scoring_mode: string;
      }>;
    };
    testing: {
      attached_tests: Array<{
        test_id: string;
      }>;
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
  assert.match(
    prompt,
    /Do not describe or recommend nursing jobs outside approved examiner opportunities\./
  );
  assert.doesNotMatch(prompt, /Healthcare facilities requesting staffing coverage/);
  assert.doesNotMatch(prompt, /Current Assignment Support/);
});

test('NPG client service is the main phone entry point with bounded routing', async () => {
  const config = await readConfig('NPG-Client-Service-Phone-Concierge.json');
  const prompt = config.conversation_config.agent.prompt.prompt;
  const transfer = config.conversation_config.agent.prompt.built_in_tools.transfer_to_agent as {
    type?: string;
    name?: string;
    params?: {
      system_tool_type?: string;
      transfers?: Array<{ agent_id?: string; condition?: string }>;
    };
  };

  assert.match(config.name, /NPG Client Service Phone Concierge/);
  assert.match(config.conversation_config.agent.first_message, /The Nurse Practitioner Group/i);
  assert.match(config.conversation_config.agent.first_message, /appointment location/i);
  assert.match(config.conversation_config.agent.first_message, /late arrival or cancellation/i);
  assert.match(config.conversation_config.agent.first_message, /examiner work/i);

  assert.match(prompt, /veterans, Loyal Source representatives, and other authorized callers/i);
  assert.match(prompt, /lookup_npg_location/);
  assert.match(
    prompt,
    /Never guess or infer an address, floor, suite, office, or access instruction/
  );
  assert.match(
    prompt,
    /Do not say that the provider was notified unless an approved tool returns a successful receipt/
  );
  assert.match(prompt, /Do not complete, confirm, or promise a formal cancellation or reschedule/);
  assert.match(prompt, /Do not disclose Regus or HQ account numbers/i);

  assert.equal(config.conversation_config.agent.prompt.tool_ids.length, 1);
  assert.match(config.conversation_config.agent.prompt.tool_ids[0], /^tool_/);

  assert.ok(transfer);
  assert.equal(transfer.params?.system_tool_type, 'transfer_to_agent');
  assert.equal(transfer.params?.transfers?.length, 1);
  assert.equal(transfer.params?.transfers?.[0]?.agent_id, 'agent_5501kz9wx04yewdapr01g7v82np7');
  assert.match(transfer.params?.transfers?.[0]?.condition ?? '', /examiner opportunity/i);
});

test('voice agents use a neutral latency message', async () => {
  for (const filename of [
    'Abundance-Web-Voice-Concierge.json',
    'Abundance-Examiner-Phone-Concierge.json',
    'NPG-Client-Service-Phone-Concierge.json'
  ]) {
    const config = await readConfig(filename);
    assert.equal(config.conversation_config.turn.soft_timeout_config.message, 'One moment.');
    assert.equal(config.conversation_config.turn.silence_end_call_timeout, 45);
    assert.equal(config.conversation_config.conversation.file_input.enabled, false);
    assert.equal(config.platform_settings.privacy.record_voice, false);
    assert.equal(config.platform_settings.privacy.delete_audio, true);
    assert.equal(config.platform_settings.privacy.retention_days, 30);
    assert.equal(config.platform_settings.call_limits.agent_concurrency_limit, 5);
    assert.equal(config.platform_settings.call_limits.daily_limit, 100);
    assert.match(
      config.platform_settings.widget.terms_text,
      /Audio is processed live and is not retained/i
    );
    assert.match(
      config.platform_settings.widget.terms_text,
      /transcript may be retained for up to 30 days/i
    );
    assert.doesNotMatch(config.platform_settings.widget.terms_text, /consent to the recording/i);
  }
});

test('voice agents publish measurable privacy, truthfulness, scope, and conversation criteria', async () => {
  const web = await readConfig('Abundance-Web-Voice-Concierge.json');
  const phone = await readConfig('Abundance-Examiner-Phone-Concierge.json');
  const npgPhone = await readConfig('NPG-Client-Service-Phone-Concierge.json');

  for (const config of [web, phone, npgPhone]) {
    assert.ok(config.platform_settings.evaluation.criteria.length >= 3);
    for (const criterion of config.platform_settings.evaluation.criteria) {
      assert.match(criterion.id, /^[a-z][a-z0-9_]+$/);
      assert.equal(criterion.type, 'prompt');
      assert.equal(criterion.scope, 'agent');
      assert.equal(criterion.scoring_mode, 'binary');
      assert.match(criterion.conversation_goal_prompt, /Mark success/i);
      assert.match(criterion.conversation_goal_prompt, /Mark failure/i);
    }
  }

  assert.ok(
    phone.platform_settings.evaluation.criteria.some(
      (criterion) => criterion.id === 'examiner_scope'
    )
  );
  assert.ok(
    web.platform_settings.evaluation.criteria.some(
      (criterion) => criterion.id === 'truthful_handoff'
    )
  );
  assert.ok(
    npgPhone.platform_settings.evaluation.criteria.some(
      (criterion) => criterion.id === 'caller_safe_location'
    )
  );
  assert.ok(
    npgPhone.platform_settings.evaluation.criteria.some(
      (criterion) => criterion.id === 'attendance_notice_truthfulness'
    )
  );
  assert.ok(
    npgPhone.platform_settings.evaluation.criteria.some(
      (criterion) => criterion.id === 'examiner_transfer'
    )
  );
});

test('NPG location lookup tool exposes only caller-safe query input', async () => {
  const tool = JSON.parse(
    await readFile(path.resolve('elevenlabs/tool_configs/lookup_npg_location.json'), 'utf8')
  ) as {
    api_schema: {
      url: string;
      method: string;
      request_body_schema: { properties: Record<string, unknown>; required: string[] };
    };
  };
  const schema = tool.api_schema;

  assert.equal(schema.url, 'https://abundance-concierge-chat.pages.dev/api/npg/locations/lookup');
  assert.equal(schema.method, 'POST');
  assert.deepEqual(Object.keys(schema.request_body_schema.properties), ['query']);
  assert.deepEqual(schema.request_body_schema.required, ['query']);
});

test('acceptance scenarios cover required web and phone negative paths', async () => {
  const scenarios = JSON.parse(
    await readFile(path.resolve('elevenlabs/acceptance-scenarios.json'), 'utf8')
  ) as {
    web: Array<{ id: string; pass: string }>;
    phone: Array<{ id: string; pass: string }>;
    npgPhone: Array<{ id: string; pass: string }>;
  };

  assert.ok(scenarios.web.length >= 5);
  assert.ok(scenarios.phone.length >= 6);
  assert.ok(scenarios.npgPhone.length >= 7);
  assert.ok(scenarios.web.some((scenario) => /pii/i.test(scenario.id)));
  assert.ok(scenarios.web.some((scenario) => /injection/i.test(scenario.id)));
  assert.ok(scenarios.phone.some((scenario) => /non-examiner/i.test(scenario.id)));
  assert.ok(scenarios.phone.some((scenario) => /emergency/i.test(scenario.id)));
  assert.ok(scenarios.phone.some((scenario) => /injection/i.test(scenario.id)));
  assert.ok(scenarios.npgPhone.some((scenario) => /location/i.test(scenario.id)));
  assert.ok(scenarios.npgPhone.some((scenario) => /locked-door/i.test(scenario.id)));
  assert.ok(scenarios.npgPhone.some((scenario) => /attendance/i.test(scenario.id)));
  assert.ok(scenarios.npgPhone.some((scenario) => /examiner/i.test(scenario.id)));
  assert.ok(scenarios.npgPhone.some((scenario) => /emergency/i.test(scenario.id)));
  assert.ok(scenarios.npgPhone.some((scenario) => /injection/i.test(scenario.id)));
  assert.ok(
    [...scenarios.web, ...scenarios.phone, ...scenarios.npgPhone].every(
      (scenario) => scenario.pass.length >= 60
    )
  );
});

test('provider regression tests are versioned and attached to the correct agent', async () => {
  const web = await readConfig('Abundance-Web-Voice-Concierge.json');
  const phone = await readConfig('Abundance-Examiner-Phone-Concierge.json');
  const npgPhone = await readConfig('NPG-Client-Service-Phone-Concierge.json');
  const testIndex = JSON.parse(await readFile(path.resolve('elevenlabs/tests.json'), 'utf8')) as {
    tests: Array<{ config: string; id: string }>;
  };

  const indexedIds = new Set(testIndex.tests.map((entry) => entry.id));
  const webIds = web.platform_settings.testing.attached_tests.map((entry) => entry.test_id);
  const phoneIds = phone.platform_settings.testing.attached_tests.map((entry) => entry.test_id);
  const npgPhoneIds = npgPhone.platform_settings.testing.attached_tests.map(
    (entry) => entry.test_id
  );

  assert.equal(webIds.length, 3);
  assert.equal(phoneIds.length, 4);
  assert.equal(npgPhoneIds.length, 4);
  assert.ok(
    [...webIds, ...phoneIds, ...npgPhoneIds].every((id) => /^test_/.test(id) && indexedIds.has(id))
  );
  assert.equal(new Set([...webIds, ...phoneIds, ...npgPhoneIds]).size, 11);
  assert.ok(testIndex.tests.every((entry) => entry.config.startsWith('test_configs/')));
});
