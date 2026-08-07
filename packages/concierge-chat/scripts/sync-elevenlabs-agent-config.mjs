import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const elevenlabsRoot = path.join(packageRoot, 'elevenlabs');
const configRoot = path.join(elevenlabsRoot, 'agent_configs');
const toolsRegistry = JSON.parse(await readFile(path.join(elevenlabsRoot, 'tools.json'), 'utf8'));
const applicationBriefTool = toolsRegistry.tools.find((tool) =>
  tool.config.endsWith('prepare_application_brief.json')
);

if (!applicationBriefTool?.id) {
  throw new Error(
    'prepare_application_brief has no ElevenLabs tool ID. Run `cd elevenlabs && elevenlabs tools push` first.'
  );
}

const agents = [
  {
    filename: 'Abundance-Web-Voice-Concierge.json',
    prompt: 'web.md',
    firstMessage:
      "Hi, you've reached Abundance Concierge. I'm an AI voice assistant. What kind of nursing work are you looking for?",
    requireSignedSession: true,
    toolIds: [applicationBriefTool.id]
  },
  {
    filename: 'Abundance-Examiner-Phone-Concierge.json',
    prompt: 'phone.md',
    firstMessage:
      "Thanks for calling Abundance Staffing. You're speaking with our AI concierge. Are you calling about an examiner opportunity?",
    requireSignedSession: false,
    toolIds: []
  }
];

for (const agent of agents) {
  const configPath = path.join(configRoot, agent.filename);
  const promptPath = path.join(elevenlabsRoot, 'prompts', agent.prompt);
  const config = JSON.parse(await readFile(configPath, 'utf8'));

  config.conversation_config.agent.first_message = agent.firstMessage;
  config.conversation_config.agent.prompt.prompt = (await readFile(promptPath, 'utf8')).trim();
  config.conversation_config.agent.prompt.tool_ids = agent.toolIds;
  config.conversation_config.agent.prompt.tools = [];
  config.conversation_config.turn.soft_timeout_config.message = 'One moment.';
  config.platform_settings.auth.enable_auth = agent.requireSignedSession;
  config.platform_settings.auth.allowlist = [];
  config.platform_settings.auth.require_origin_header = false;
  config.platform_settings.guardrails.focus.is_enabled = true;
  config.platform_settings.guardrails.prompt_injection.is_enabled = true;
  config.platform_settings.privacy.record_voice = false;
  config.platform_settings.privacy.retention_days = 30;
  config.platform_settings.privacy.delete_audio = true;
  config.platform_settings.privacy.apply_to_existing_conversations = false;
  config.platform_settings.call_limits.agent_concurrency_limit = 5;
  config.platform_settings.call_limits.daily_limit = 100;

  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

const registryPath = path.join(elevenlabsRoot, 'agents.json');
const registry = JSON.parse(await readFile(registryPath, 'utf8'));
for (const agent of registry.agents) {
  const filename = path.basename(agent.config);
  agent.config = `agent_configs/${filename}`;
}
await writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
