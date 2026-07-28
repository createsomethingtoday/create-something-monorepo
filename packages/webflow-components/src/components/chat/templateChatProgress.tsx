import React from 'react';
import { UiIcon } from '../primitives/UiIcon';
import type { AgentStatus, PageActionPayload } from './templateChatProtocol';
import {
  DEFAULT_TEMPLATE_CHAT_STRINGS,
  type TemplateChatStrings,
} from './templateChatStrings';

// ── Turn progress model ──────────────────────────────────────────────────────
// A monotonic phase machine over the agent protocol: the visible narration can
// only move forward, so a worker that returns to `thinking` after searching
// never rewinds the story the reader is following.
export type AgentProgressPhase = 'preparing' | 'understanding' | 'searching' | 'curating' | 'presenting';
export type AgentProgressOutcome = 'active' | 'completed' | 'stopped' | 'failed';

export interface AgentProgressState {
  phase: AgentProgressPhase;
  outcome: AgentProgressOutcome;
  slow: boolean;
  pageAction: PageActionPayload | null;
  resultCount: number;
}

export type AgentProgressEvent =
  | { type: 'connected' }
  | { type: 'agent_status'; status: AgentStatus }
  | { type: 'text' }
  | { type: 'page_action'; payload: PageActionPayload }
  | { type: 'display'; resultCount: number }
  | { type: 'slow' }
  | { type: 'done' }
  | { type: 'stop' }
  | { type: 'fail' }
  | { type: 'retry' };

const AGENT_PROGRESS_RANK: Record<AgentProgressPhase, number> = {
  preparing: 0,
  understanding: 1,
  searching: 2,
  curating: 3,
  presenting: 4,
};

export function createAgentProgressState(): AgentProgressState {
  return {
    phase: 'preparing',
    outcome: 'active',
    slow: false,
    pageAction: null,
    resultCount: 0,
  };
}

function advanceAgentProgressPhase(
  state: AgentProgressState,
  nextPhase: AgentProgressPhase,
): AgentProgressState {
  return AGENT_PROGRESS_RANK[nextPhase] > AGENT_PROGRESS_RANK[state.phase]
    ? { ...state, phase: nextPhase }
    : state;
}

export function reduceAgentProgress(
  state: AgentProgressState,
  event: AgentProgressEvent,
): AgentProgressState {
  switch (event.type) {
    case 'connected':
      return advanceAgentProgressPhase(state, 'understanding');
    case 'agent_status':
      return advanceAgentProgressPhase(
        state,
        event.status === 'thinking' ? 'understanding' : event.status,
      );
    case 'page_action':
      return { ...state, pageAction: event.payload };
    case 'display':
      return {
        ...advanceAgentProgressPhase(state, 'presenting'),
        resultCount: state.resultCount + Math.max(0, event.resultCount),
      };
    case 'slow':
      return state.outcome === 'active' ? { ...state, slow: true } : state;
    case 'done':
      return state.outcome === 'active' ? { ...state, outcome: 'completed', slow: false } : state;
    case 'stop':
      return state.outcome === 'active' ? { ...state, outcome: 'stopped', slow: false } : state;
    case 'fail':
      return state.outcome === 'active' ? { ...state, outcome: 'failed', slow: false } : state;
    case 'retry':
      return createAgentProgressState();
    case 'text':
    default:
      return state;
  }
}

export interface AgentProgressView {
  activeIndex: number;
  title: string;
  detail: string;
  receipt: string | null;
  announcement: string;
}

function humanizeAgentValue(value: string): string {
  return value
    .trim()
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace(/\bAnd\b/g, '&');
}

export function summarizePageAction(
  payload: PageActionPayload | null,
  strings: TemplateChatStrings = DEFAULT_TEMPLATE_CHAT_STRINGS,
): string | null {
  if (!payload) return null;
  const details: string[] = [];

  if (payload.category_group_slug) {
    details.push(humanizeAgentValue(payload.category_group_slug).replace(/\s+Websites$/, ''));
  }
  for (const style of payload.styles ?? []) details.push(humanizeAgentValue(style));
  for (const type of payload.types ?? []) details.push(humanizeAgentValue(type));
  if (payload.free_only === true) details.push(strings.receiptFreeOnly);
  if (payload.sort) details.push(strings.receiptSortedBy(humanizeAgentValue(payload.sort)));
  const highlightCount = payload.highlight_slugs?.length ?? 0;
  if (highlightCount > 0) {
    details.push(strings.receiptHighlights(highlightCount));
  }

  if (details.length > 0) return strings.receiptPageUpdate(details.join(' · '));
  if (payload.clear_filters) return strings.receiptFilterReset;
  if (payload.q != null) return strings.receiptSearchUpdate;
  return null;
}

/** Which of the four visible steps each phase is working on. */
const PHASE_STEP_INDEX: Record<AgentProgressPhase, number> = {
  preparing: 0,
  understanding: 0,
  searching: 1,
  curating: 2,
  presenting: 3,
};

export function getAgentProgressView(
  state: AgentProgressState,
  strings: TemplateChatStrings = DEFAULT_TEMPLATE_CHAT_STRINGS,
): AgentProgressView {
  const phase = strings.progressPhases[state.phase];
  const detail = state.slow ? strings.progressSlowDetail : phase.detail;
  const receipt = summarizePageAction(state.pageAction, strings);

  return {
    activeIndex: PHASE_STEP_INDEX[state.phase],
    title: phase.title,
    detail,
    receipt,
    announcement: [
      `${phase.title}.`,
      state.slow ? strings.progressSlowAnnouncement : '',
      receipt ? `${receipt}.` : '',
    ].filter(Boolean).join(' '),
  };
}

export function getAgentOutcomeReceipt(
  state: AgentProgressState,
  strings: TemplateChatStrings = DEFAULT_TEMPLATE_CHAT_STRINGS,
): string | null {
  if (state.outcome === 'active') return null;
  if (state.outcome === 'stopped') return strings.receiptStopped;
  if (state.outcome === 'failed') return strings.receiptFailed;

  const receipt = summarizePageAction(state.pageAction, strings);
  const result = state.resultCount > 0
    ? strings.receiptRecommendations(state.resultCount)
    : strings.receiptReady;
  return [result, receipt].filter(Boolean).join(' · ');
}

/**
 * The loading surface yields to the content it stands in for: once the turn has
 * displays on screen the whole progress card retires (real cards are the
 * presentation), and once any text or display has landed the skeleton preview
 * retires — placeholders must never coexist with the response they preview.
 */
export function getAgentProgressVisibility(options: {
  streaming: boolean;
  turnHasContent: boolean;
  turnHasDisplays: boolean;
}): { showProgress: boolean; hideSkeletons: boolean } {
  return {
    showProgress: options.streaming && !options.turnHasDisplays,
    hideSkeletons: options.turnHasContent,
  };
}

export function AgentProgress({
  progress,
  strings = DEFAULT_TEMPLATE_CHAT_STRINGS,
  hideSkeletons = false,
}: {
  progress: AgentProgressState;
  strings?: TemplateChatStrings;
  hideSkeletons?: boolean;
}): React.ReactElement {
  const view = getAgentProgressView(progress, strings);
  const steps = strings.progressSteps;

  return (
    <div
      className="tmchat-progress"
      data-phase={progress.phase}
      data-slow={progress.slow || undefined}
      aria-label="Template search activity"
    >
      <span className="tmchat-sr-only" role="status" aria-live="polite" aria-atomic="true">
        {view.announcement}
      </span>
      <div className="tmchat-progress-current">
        <span className="tmchat-progress-mark" aria-hidden="true"><UiIcon name="sparkles" size={15} /></span>
        <span>
          <strong>{view.title}</strong>
          <span className="tmchat-progress-detail">{view.detail}</span>
        </span>
        <span className="tmchat-dots" aria-hidden="true"><span /><span /><span /></span>
      </div>
      <ol className="tmchat-progress-steps" aria-hidden="true">
        {steps.map((label, index) => {
          const state = index < view.activeIndex ? 'complete' : index === view.activeIndex ? 'current' : 'upcoming';
          return (
            <li key={label} data-state={state}>
              <span>{label}</span>
              <span className="tmchat-progress-stepmark" aria-hidden="true">{state === 'complete' ? '✓' : ''}</span>
            </li>
          );
        })}
      </ol>
      {view.receipt ? <div className="tmchat-progress-receipt">{view.receipt}</div> : null}
      {!hideSkeletons ? (
        <div className="tmchat-progress-preview" aria-hidden="true">
          {/* Three spans; CSS shows two docked and all three on wide surfaces,
              matching the result grid's card geometry. */}
          {[0, 1, 2].map((index) => <span key={index} className="tmchat-progress-skeleton-card" />)}
        </div>
      ) : null}
    </div>
  );
}
