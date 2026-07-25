import React from 'react';
import { UiIcon } from '../primitives/UiIcon';
import type { AgentStatus, PageActionPayload } from './templateChatProtocol';

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

export function summarizePageAction(payload: PageActionPayload | null): string | null {
  if (!payload) return null;
  const details: string[] = [];

  if (payload.category_group_slug) {
    details.push(humanizeAgentValue(payload.category_group_slug).replace(/\s+Websites$/, ''));
  }
  for (const style of payload.styles ?? []) details.push(humanizeAgentValue(style));
  for (const type of payload.types ?? []) details.push(humanizeAgentValue(type));
  if (payload.free_only === true) details.push('Free only');
  if (payload.sort) details.push(`Sorted by ${humanizeAgentValue(payload.sort)}`);
  const highlightCount = payload.highlight_slugs?.length ?? 0;
  if (highlightCount > 0) {
    details.push(highlightCount === 1 ? 'Highlight requested' : `${highlightCount} highlights requested`);
  }

  if (details.length > 0) return `Page update requested · ${details.join(' · ')}`;
  if (payload.clear_filters) return 'Page filter reset requested';
  if (payload.q != null) return 'Page search update requested';
  return null;
}

export function getAgentProgressView(state: AgentProgressState): AgentProgressView {
  const progress: Record<AgentProgressPhase, Omit<AgentProgressView, 'receipt' | 'announcement'>> = {
    preparing: {
      activeIndex: 0,
      title: 'Preparing a secure search',
      detail: 'Connecting securely to the template catalog.',
    },
    understanding: {
      activeIndex: 0,
      title: 'Understanding your request',
      detail: 'Identifying the requirements that matter most.',
    },
    searching: {
      activeIndex: 1,
      title: 'Searching the template catalog',
      detail: 'Checking the template catalog for strong matches.',
    },
    curating: {
      activeIndex: 2,
      title: 'Curating the strongest matches',
      detail: 'Comparing fit, style, and useful features.',
    },
    presenting: {
      activeIndex: 3,
      title: 'Preparing your recommendations',
      detail: 'Organizing the strongest matches for review.',
    },
  };

  const current = progress[state.phase];
  const detail = state.slow
    ? 'Still working — this is taking a little longer than usual.'
    : current.detail;

  const receipt = summarizePageAction(state.pageAction);

  return {
    ...current,
    detail,
    receipt,
    announcement: [
      `${current.title}.`,
      state.slow ? 'This is taking longer than usual.' : '',
      receipt ? `${receipt}.` : '',
    ].filter(Boolean).join(' '),
  };
}

export function getAgentOutcomeReceipt(state: AgentProgressState): string | null {
  if (state.outcome === 'active') return null;
  if (state.outcome === 'stopped') return 'Search stopped';
  if (state.outcome === 'failed') return 'Search interrupted';

  const receipt = summarizePageAction(state.pageAction);
  const result = state.resultCount > 0
    ? `${state.resultCount} template ${state.resultCount === 1 ? 'recommendation' : 'recommendations'} ready`
    : 'Response ready';
  return [result, receipt].filter(Boolean).join(' · ');
}

export function AgentProgress({
  progress,
}: {
  progress: AgentProgressState;
}): React.ReactElement {
  const view = getAgentProgressView(progress);
  const steps = [
    'Preparing search',
    'Searching catalog',
    'Comparing matches',
    'Presenting results',
  ];

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
      <div className="tmchat-progress-preview" aria-hidden="true">
        {steps.map((label) => <span key={label} className="tmchat-progress-skeleton-card" />)}
      </div>
    </div>
  );
}
