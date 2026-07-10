import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, surfaceNote } from './prompt.js';
import { AGENT_TOOLS, TemplateToolExecutor, type SearchToolInput } from './tools.js';
import type { AgentSseEvent, ChatContext, ChatRequestMessage, Env } from './types.js';

const MAX_LOOP_ITERATIONS = 6;
const MAX_HISTORY_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 4_000;

function toAnthropicMessages(history: ChatRequestMessage[]): Anthropic.Messages.MessageParam[] {
  return history
    .slice(-MAX_HISTORY_MESSAGES)
    .filter((message) => message.content.trim().length > 0)
    .map((message) => ({
      role: message.role,
      content: message.content.slice(0, MAX_MESSAGE_CHARS),
    }));
}

// Runs the streaming tool loop for one user turn, emitting SSE events via
// `emit`. Text streams as it generates; display_results tool calls become
// `display` events with server-enriched items.
export async function runAgentTurn(
  env: Env,
  history: ChatRequestMessage[],
  emit: (event: AgentSseEvent) => void,
  context?: ChatContext,
): Promise<void> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const executor = new TemplateToolExecutor(env);
  executor.seedFromContext(context);
  const model = env.ANTHROPIC_MODEL || 'claude-opus-4-8';

  const messages: Anthropic.Messages.MessageParam[] = toAnthropicMessages(history);
  if (messages.length === 0 || messages[messages.length - 1]?.role !== 'user') {
    emit({ type: 'error', message: 'The last message must be from the user.' });
    return;
  }

  // Frozen prompt first (cache-stable prefix); per-conversation context after.
  const system: Anthropic.Messages.TextBlockParam[] = [
    { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
  ];
  const knownItemsNote = executor.describeKnownItems();
  if (knownItemsNote) system.push({ type: 'text', text: knownItemsNote });
  const surface = surfaceNote(context?.surface);
  if (surface) system.push({ type: 'text', text: surface });

  // The client renders text into one bubble per turn; separate the text blocks
  // that surround tool calls so sentences don't run together.
  let hasStreamedText = false;

  for (let iteration = 0; iteration < MAX_LOOP_ITERATIONS; iteration += 1) {
    let separatorPending = hasStreamedText;
    const stream = client.messages.stream({
      model,
      max_tokens: 4096,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'low' },
      system,
      tools: AGENT_TOOLS,
      messages,
    });

    stream.on('text', (delta) => {
      if (separatorPending) {
        emit({ type: 'text_delta', text: '\n\n' });
        separatorPending = false;
      }
      hasStreamedText = true;
      emit({ type: 'text_delta', text: delta });
    });

    const message = await stream.finalMessage();

    if (message.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: message.content });
      continue;
    }

    const toolUses = message.content.filter(
      (block): block is Anthropic.Messages.ToolUseBlock => block.type === 'tool_use',
    );

    if (message.stop_reason !== 'tool_use' || toolUses.length === 0) {
      emit({ type: 'context', payload: executor.snapshotContext() });
      emit({ type: 'done' });
      return;
    }

    messages.push({ role: 'assistant', content: message.content });

    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
    for (const toolUse of toolUses) {
      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: await executeTool(executor, toolUse, emit),
      });
    }

    messages.push({ role: 'user', content: toolResults });
  }

  emit({ type: 'context', payload: executor.snapshotContext() });
  emit({ type: 'error', message: 'The assistant took too many steps. Please rephrase your request.' });
}

async function executeTool(
  executor: TemplateToolExecutor,
  toolUse: Anthropic.Messages.ToolUseBlock,
  emit: (event: AgentSseEvent) => void,
): Promise<string> {
  try {
    switch (toolUse.name) {
      case 'search_templates':
        return await executor.searchTemplates(toolUse.input as SearchToolInput);
      case 'list_categories_and_styles':
        return await executor.listCategoriesAndStyles();
      case 'display_results': {
        const { payload, dropped } = executor.buildDisplayPayload(
          toolUse.input as Parameters<TemplateToolExecutor['buildDisplayPayload']>[0],
        );
        if (!payload) {
          return JSON.stringify({
            displayed: false,
            error: 'No valid templates to display — every slug was unknown. Only display slugs returned by search_templates in this conversation.',
            unknown_slugs: dropped,
          });
        }
        emit({ type: 'display', payload });
        return JSON.stringify({
          displayed: true,
          rendered_items: payload.items.length,
          ...(dropped.length > 0 ? { skipped_unknown_slugs: dropped } : {}),
        });
      }
      default:
        return JSON.stringify({ error: `Unknown tool: ${toolUse.name}` });
    }
  } catch (error) {
    return JSON.stringify({ error: error instanceof Error ? error.message : 'Tool execution failed.' });
  }
}
