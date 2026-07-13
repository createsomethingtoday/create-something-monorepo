import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, pageGridNote, surfaceNote } from './prompt.js';
import { AGENT_TOOLS, TemplateToolExecutor, type PageActionInput, type SearchToolInput } from './tools.js';
import type { AgentSseEvent, AgentUsage, ChatContext, ChatRequestMessage, Env } from './types.js';

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
): Promise<AgentUsage> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const executor = new TemplateToolExecutor(env);
  executor.seedFromContext(context);
  const model = env.ANTHROPIC_MODEL || 'claude-opus-4-8';

  const messages: Anthropic.Messages.MessageParam[] = toAnthropicMessages(history);
  const usage: AgentUsage = {
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
  };
  if (messages.length === 0 || messages[messages.length - 1]?.role !== 'user') {
    emit({ type: 'error', message: 'The last message must be from the user.' });
    return usage;
  }

  // Frozen prompt first (cache-stable prefix); per-conversation context after.
  const system: Anthropic.Messages.TextBlockParam[] = [
    { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
  ];
  const knownItemsNote = executor.describeKnownItems();
  if (knownItemsNote) system.push({ type: 'text', text: knownItemsNote });
  const surface = surfaceNote(context?.surface);
  if (surface) system.push({ type: 'text', text: surface });
  const pageNote = pageGridNote(context?.has_page_grid);
  const missNote =
    context?.highlight_misses && context.highlight_misses.length > 0
      ? 'Last turn these templates could NOT be highlighted on the page (their cards are not rendered under its current filters): ' +
        context.highlight_misses.join(', ') +
        '. To point them out, first update the page filters/search so they appear, or present them in chat instead. Do not claim they are visible on the page.'
      : '';
  if (pageNote) system.push({ type: 'text', text: pageNote });
  if (missNote) system.push({ type: 'text', text: missNote });

  // The client renders text into one bubble per turn; separate the text blocks
  // that surround tool calls so sentences don't run together.
  let hasStreamedText = false;

  for (let iteration = 0; iteration < MAX_LOOP_ITERATIONS; iteration += 1) {
    emit({ type: 'status', label: 'thinking' });
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
    usage.inputTokens += message.usage.input_tokens;
    usage.outputTokens += message.usage.output_tokens;
    usage.cacheCreationInputTokens += message.usage.cache_creation_input_tokens ?? 0;
    usage.cacheReadInputTokens += message.usage.cache_read_input_tokens ?? 0;

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
      return usage;
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
  return usage;
}

async function executeTool(
  executor: TemplateToolExecutor,
  toolUse: Anthropic.Messages.ToolUseBlock,
  emit: (event: AgentSseEvent) => void,
): Promise<string> {
  try {
    switch (toolUse.name) {
      case 'search_templates':
        emit({ type: 'status', label: 'searching' });
        return await executor.searchTemplates(toolUse.input as SearchToolInput);
      case 'list_categories_and_styles':
        emit({ type: 'status', label: 'searching' });
        return await executor.listCategoriesAndStyles();
      case 'display_results': {
        emit({ type: 'status', label: 'curating' });
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
      case 'update_page': {
        const { payload, unknownSlugs } = executor.buildPageAction(toolUse.input as PageActionInput);
        if (!payload) {
          return JSON.stringify({
            applied: false,
            error: 'Nothing to apply — provide at least one filter change or known highlight slug.',
            ...(unknownSlugs.length > 0 ? { unknown_slugs: unknownSlugs } : {}),
          });
        }
        emit({ type: 'page_action', payload });
        return JSON.stringify({
          applied: true,
          highlight_requested: payload.highlight_slugs?.length ?? 0,
          note: 'Search/filter changes were dispatched. A highlight request is not confirmation that the browser rendered or pulsed the card.',
          ...(unknownSlugs.length > 0 ? { ignored_unknown_slugs: unknownSlugs } : {}),
        });
      }
      default:
        return JSON.stringify({ error: `Unknown tool: ${toolUse.name}` });
    }
  } catch (error) {
    return JSON.stringify({ error: error instanceof Error ? error.message : 'Tool execution failed.' });
  }
}
