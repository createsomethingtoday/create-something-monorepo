import { OpenAIAgentExecutor } from './openai.js';
import { D1AgentStore } from './store.js';
import { createOwnedAgentWorker } from './worker.js';

export type { AgentExecutor, AgentStore } from './types.js';
export { createOwnedAgentWorker } from './worker.js';

export type Env = {
  AGENT_RUNTIME_DB: D1Database;
  OPENAI_API_KEY: string;
  CREATE_SOMETHING_MCP: Fetcher;
  THREE_TIER_FRAMEWORK_MCP: Fetcher;
  PLAYBOOK_MCP: Fetcher;
};

function serviceFetch(binding: Fetcher): typeof fetch {
  return ((input: RequestInfo | URL, init?: RequestInit) =>
    binding.fetch(input, init)) as typeof fetch;
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    if (!env.OPENAI_API_KEY)
      return Promise.resolve(Response.json({ error: 'runtime_not_configured' }, { status: 503 }));
    return createOwnedAgentWorker({
      store: new D1AgentStore(env.AGENT_RUNTIME_DB),
      executor: new OpenAIAgentExecutor(env.OPENAI_API_KEY, {
        'create-something': serviceFetch(env.CREATE_SOMETHING_MCP),
        'three-tier-framework': serviceFetch(env.THREE_TIER_FRAMEWORK_MCP),
        playbook: serviceFetch(env.PLAYBOOK_MCP)
      })
    }).fetch(request);
  }
};
