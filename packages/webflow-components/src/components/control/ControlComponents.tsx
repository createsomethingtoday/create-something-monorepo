import React, { CSSProperties, FormEvent, useMemo, useState } from 'react';
import { tokens } from '../../styles/tokens';

export type TriadTier = 'Database' | 'Automation' | 'Judgment';
export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
export type CheckStatus = 'ok' | 'warning' | 'blocked' | 'idle';
export type ApprovalState = 'review' | 'approved' | 'blocked';
export type ActionStatus = 'draft' | 'requires_approval' | 'allowed' | 'blocked';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface EvidenceItem {
  id?: string;
  label: string;
  detail?: string;
  source?: string;
  href?: string;
  tone?: StatusTone;
  timestamp?: string;
}

export interface OperatingLayer {
  tier: TriadTier;
  title: string;
  status: string;
  description: string;
  evidence?: string[];
  tone?: StatusTone;
}

export interface ArtifactItem {
  title: string;
  type?: string;
  description?: string;
  href?: string;
  visibility?: 'public' | 'private' | 'internal';
  tone?: StatusTone;
}

export interface DecisionItem {
  id?: string;
  title: string;
  description?: string;
  owner?: string;
  due?: string;
  state?: ApprovalState | 'open' | 'ready';
  tier?: TriadTier;
}

export interface ActionPreviewItem {
  id: string;
  label: string;
  description: string;
  status?: ActionStatus;
  risk?: RiskLevel;
  policyChecks?: string[];
  evidence?: string[];
}

export interface AgentMessage {
  role: 'agent' | 'operator';
  body: string;
  grounding?: string[];
}

export interface SuggestedPrompt {
  label: string;
  prompt: string;
}

export interface RuntimeCheck {
  label: string;
  status?: CheckStatus;
  detail?: string;
}

type JsonList<T> = string | T[];

type ActionPreviewResponse = {
  status?: string;
  summary?: string;
  policyChecks?: string[];
  evidence?: string[];
  allowedNextActions?: string[];
};

type AgentResponse = {
  answer?: string;
  grounding?: string[];
  followUps?: string[];
  followUpQuestions?: string[];
  restricted?: boolean;
  actions?: string[];
};

const defaultLayers: OperatingLayer[] = [
  {
    tier: 'Database',
    title: 'Operational Memory',
    status: 'Structured',
    description: 'The surface separates authoritative records, review state, and evidence so every action can be traced.',
    evidence: ['Source records', 'Review state', 'Evidence IDs'],
    tone: 'info',
  },
  {
    tier: 'Automation',
    title: 'Callable Runtime',
    status: 'Cloudflare-ready',
    description: 'Actions are prepared as previews before they reach workflow tools, MCP servers, or external systems.',
    evidence: ['API route', 'Action contract', 'Runtime checks'],
    tone: 'success',
  },
  {
    tier: 'Judgment',
    title: 'Approval Boundary',
    status: 'Human-gated',
    description: 'Policy checks and operator approval determine whether a recommendation can become an executed action.',
    evidence: ['Policy checks', 'Approval owner', 'Decision log'],
    tone: 'warning',
  },
];

const defaultEvidence: EvidenceItem[] = [
  {
    label: 'Workflow map',
    detail: 'Current workflow, owner, and decision states are captured before automation.',
    source: 'Delivery artifact',
    tone: 'info',
  },
  {
    label: 'Action contract',
    detail: 'Every action has a preview, policy checks, and a human approval state.',
    source: 'Cloudflare route',
    tone: 'success',
  },
  {
    label: 'Private boundary',
    detail: 'Source data, credentials, and raw client records stay outside the public surface.',
    source: 'Governance rule',
    tone: 'warning',
  },
];

const defaultArtifacts: ArtifactItem[] = [
  {
    title: 'Operator Brief',
    type: 'Review Packet',
    description: 'A concise handoff that explains the workflow, risks, and next decision.',
    visibility: 'public',
    tone: 'info',
  },
  {
    title: 'Policy Rules',
    type: 'Governance',
    description: 'Rules that decide when an action can be drafted, previewed, approved, or blocked.',
    visibility: 'internal',
    tone: 'warning',
  },
  {
    title: 'Runtime Contract',
    type: 'Cloudflare API',
    description: 'Endpoint shape for bounded agent answers and action previews.',
    visibility: 'public',
    tone: 'success',
  },
];

const defaultDecisions: DecisionItem[] = [
  {
    title: 'Confirm authoritative data',
    description: 'Name the source of truth before automation reads or writes records.',
    owner: 'Operator',
    state: 'open',
    tier: 'Database',
  },
  {
    title: 'Approve action boundary',
    description: 'Decide which actions can be drafted and which require manual approval.',
    owner: 'Delivery lead',
    state: 'review',
    tier: 'Judgment',
  },
  {
    title: 'Enable runtime smoke',
    description: 'Verify the Cloudflare endpoint and fallback behavior before publishing.',
    owner: 'Engineer',
    state: 'ready',
    tier: 'Automation',
  },
];

const defaultActions: ActionPreviewItem[] = [
  {
    id: 'draft-operator-brief',
    label: 'Draft operator brief',
    description: 'Prepare a client-safe workflow brief from approved evidence and decisions.',
    status: 'allowed',
    risk: 'low',
    policyChecks: ['Uses public evidence only', 'No credentials or private source data', 'Operator can edit before sharing'],
    evidence: ['Workflow map', 'Decision queue', 'Runtime contract'],
  },
  {
    id: 'request-approval',
    label: 'Request approval',
    description: 'Prepare an approval request that lists the action, owner, and policy checks.',
    status: 'requires_approval',
    risk: 'medium',
    policyChecks: ['Requires named approval owner', 'Records decision state', 'Does not execute external writes'],
    evidence: ['Approval boundary', 'Policy rules'],
  },
  {
    id: 'execute-external-action',
    label: 'Execute external action',
    description: 'Blocked in this demo because v1 only previews governed actions.',
    status: 'blocked',
    risk: 'high',
    policyChecks: ['External mutation disabled', 'Production connector not configured', 'Human approval required'],
    evidence: ['Governance rule'],
  },
];

const defaultPrompts: SuggestedPrompt[] = [
  { label: 'Explain the workflow', prompt: 'Explain how the database, automation, and judgment layers work together.' },
  { label: 'What needs approval?', prompt: 'What decision needs approval before this action can run?' },
  { label: 'What is private?', prompt: 'What should stay out of the public surface?' },
];

const defaultMessages: AgentMessage[] = [
  {
    role: 'agent',
    body: 'I can answer from the approved Canon control context and keep private source material out of the response.',
    grounding: ['Governance rule', 'Evidence trail'],
  },
];

const defaultChecks: RuntimeCheck[] = [
  { label: 'Cloudflare route', status: 'ok', detail: 'Ready for preview calls' },
  { label: 'Action execution', status: 'idle', detail: 'Preview-only in v1' },
  { label: 'Policy boundary', status: 'ok', detail: 'Human approval required for mutations' },
];

function parseJsonList<T>(value: JsonList<T> | undefined, fallback: T[]): T[] {
  if (Array.isArray(value)) return value;
  if (!value || !value.trim()) return fallback;

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function asTextList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

function toneStyles(tone: StatusTone = 'neutral') {
  switch (tone) {
    case 'success':
      return {
        color: tokens.colors.success,
        background: tokens.colors.successMuted,
        border: tokens.colors.successBorder,
      };
    case 'warning':
      return {
        color: tokens.colors.warning,
        background: tokens.colors.warningMuted,
        border: tokens.colors.warningBorder,
      };
    case 'danger':
      return {
        color: tokens.colors.error,
        background: tokens.colors.errorMuted,
        border: tokens.colors.errorBorder,
      };
    case 'info':
      return {
        color: tokens.colors.info,
        background: tokens.colors.infoMuted,
        border: tokens.colors.infoBorder,
      };
    case 'neutral':
    default:
      return {
        color: tokens.colors.fgSecondary,
        background: tokens.colors.bgSubtle,
        border: tokens.colors.borderDefault,
      };
  }
}

function statusToTone(status: CheckStatus | ApprovalState | ActionStatus | string | undefined): StatusTone {
  switch (status) {
    case 'ok':
    case 'approved':
    case 'allowed':
      return 'success';
    case 'warning':
    case 'review':
    case 'requires_approval':
    case 'ready':
      return 'warning';
    case 'blocked':
      return 'danger';
    case 'draft':
    case 'idle':
    case 'open':
      return 'neutral';
    default:
      return 'info';
  }
}

function riskToTone(risk: RiskLevel | undefined): StatusTone {
  if (risk === 'high') return 'danger';
  if (risk === 'medium') return 'warning';
  if (risk === 'low') return 'success';
  return 'neutral';
}

function readableStatus(status: string | undefined) {
  return status ? status.replace(/_/g, ' ') : 'ready';
}

const surfaceStyles: CSSProperties = {
  background: tokens.colors.bgSurface,
  border: `1px solid ${tokens.colors.borderDefault}`,
  borderRadius: tokens.radii.md,
  color: tokens.colors.fgPrimary,
};

const compactLabelStyles: CSSProperties = {
  color: tokens.colors.fgMuted,
  fontFamily: tokens.typography.fontFamily.sans,
  fontSize: tokens.typography.fontSize.caption,
  fontWeight: tokens.typography.fontWeight.semibold,
  letterSpacing: 0,
  textTransform: 'uppercase',
};

const controlCss = `
  .cs-control-root,
  .cs-control-root * {
    box-sizing: border-box;
  }

  .cs-control-root {
    width: 100%;
    color: ${tokens.colors.fgPrimary};
    font-family: ${tokens.typography.fontFamily.sans};
  }

  .cs-control-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
  }

  .cs-control-grid--two {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .cs-control-grid--four {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .cs-control-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .cs-control-button {
    min-height: 2.75rem;
    border: 1px solid ${tokens.colors.borderEmphasis};
    border-radius: ${tokens.radii.md};
    background: ${tokens.colors.fgPrimary};
    color: ${tokens.colors.bgPure};
    cursor: pointer;
    font: inherit;
    font-weight: ${tokens.typography.fontWeight.semibold};
    padding: 0.75rem 1rem;
    transition: border-color ${tokens.animation.duration.micro} ${tokens.animation.easing.standard},
      background ${tokens.animation.duration.micro} ${tokens.animation.easing.standard},
      transform ${tokens.animation.duration.micro} ${tokens.animation.easing.standard};
  }

  .cs-control-button:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  .cs-control-button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .cs-control-button--ghost {
    background: transparent;
    color: ${tokens.colors.fgPrimary};
  }

  .cs-control-button:focus-visible,
  .cs-control-input:focus-visible,
  .cs-control-select:focus-visible {
    outline: 2px solid ${tokens.colors.focus};
    outline-offset: 2px;
  }

  .cs-control-input,
  .cs-control-select {
    width: 100%;
    border: 1px solid ${tokens.colors.borderDefault};
    border-radius: ${tokens.radii.md};
    background: ${tokens.colors.bgPure};
    color: ${tokens.colors.fgPrimary};
    font: inherit;
    min-height: 2.75rem;
    padding: 0.75rem 0.875rem;
  }

  .cs-control-input::placeholder {
    color: ${tokens.colors.fgMuted};
  }

  .cs-agent-scroll {
    max-height: 22rem;
    overflow: auto;
    padding-right: 0.25rem;
  }

  .cs-control-hero-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.3fr) minmax(18rem, 0.7fr);
    gap: ${tokens.spacing.md};
    align-items: start;
  }

  .cs-agent-form {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.75rem;
    margin-top: ${tokens.spacing.md};
  }

  @media (max-width: ${tokens.breakpoints.lg}) {
    .cs-control-grid,
    .cs-control-grid--four {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: ${tokens.breakpoints.md}) {
    .cs-control-grid,
    .cs-control-grid--two,
    .cs-control-grid--four,
    .cs-control-hero-grid,
    .cs-agent-form {
      grid-template-columns: 1fr;
    }
  }
`;

function ComponentShell({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`cs-control-root ${className}`.trim()}>
      <style>{controlCss}</style>
      {children}
    </div>
  );
}

function SectionHeader({ eyebrow, title, body }: { eyebrow?: string; title?: string; body?: string }) {
  if (!eyebrow && !title && !body) return null;

  return (
    <div style={{ marginBottom: tokens.spacing.md }}>
      {eyebrow ? <div style={compactLabelStyles}>{eyebrow}</div> : null}
      {title ? (
        <h2
          style={{
            fontFamily: tokens.typography.fontFamily.tight,
            fontSize: tokens.typography.fontSize.h3,
            lineHeight: tokens.typography.lineHeight.tight,
            margin: eyebrow ? '0.35rem 0 0' : 0,
          }}
        >
          {title}
        </h2>
      ) : null}
      {body ? (
        <p
          style={{
            color: tokens.colors.fgSecondary,
            fontSize: tokens.typography.fontSize.body,
            lineHeight: tokens.typography.lineHeight.relaxed,
            margin: title ? '0.6rem 0 0' : 0,
            maxWidth: '62rem',
          }}
        >
          {body}
        </p>
      ) : null}
    </div>
  );
}

function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: StatusTone }) {
  const toneStyle = toneStyles(tone);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        border: `1px solid ${toneStyle.border}`,
        borderRadius: tokens.radii.full,
        background: toneStyle.background,
        color: toneStyle.color,
        fontSize: tokens.typography.fontSize.caption,
        fontWeight: tokens.typography.fontWeight.semibold,
        lineHeight: 1,
        minHeight: '1.625rem',
        padding: '0.35rem 0.55rem',
        textTransform: 'capitalize',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

export interface OperatingLayerCardsProps {
  layers?: JsonList<OperatingLayer>;
  title?: string;
  body?: string;
  layout?: 'three' | 'two' | 'compact';
  className?: string;
}

export function OperatingLayerCards({
  layers,
  title = 'Operating Layers',
  body,
  layout = 'three',
  className = '',
}: OperatingLayerCardsProps) {
  const parsedLayers = useMemo(() => parseJsonList(layers, defaultLayers), [layers]);
  const gridClassName = layout === 'two' ? 'cs-control-grid cs-control-grid--two' : 'cs-control-grid';

  return (
    <ComponentShell className={className}>
      <SectionHeader eyebrow="Database / Automation / Judgment" title={title} body={body} />
      <div className={layout === 'compact' ? 'cs-control-list' : gridClassName}>
        {parsedLayers.map((layer) => {
          const tone = layer.tone ?? statusToTone(layer.status);
          return (
            <article key={`${layer.tier}-${layer.title}`} style={{ ...surfaceStyles, padding: tokens.spacing.md }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div style={compactLabelStyles}>{layer.tier}</div>
                <Badge tone={tone}>{layer.status}</Badge>
              </div>
              <h3
                style={{
                  fontFamily: tokens.typography.fontFamily.tight,
                  fontSize: tokens.typography.fontSize.h4,
                  lineHeight: tokens.typography.lineHeight.tight,
                  margin: '1rem 0 0',
                }}
              >
                {layer.title}
              </h3>
              <p
                style={{
                  color: tokens.colors.fgSecondary,
                  fontSize: tokens.typography.fontSize.bodySm,
                  lineHeight: tokens.typography.lineHeight.relaxed,
                  margin: '0.75rem 0 0',
                }}
              >
                {layer.description}
              </p>
              {layer.evidence?.length ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginTop: '1rem' }}>
                  {layer.evidence.map((item) => (
                    <Badge key={item} tone="neutral">
                      {item}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </ComponentShell>
  );
}

export interface EvidenceTrailProps {
  evidence?: JsonList<EvidenceItem>;
  title?: string;
  body?: string;
  compact?: boolean;
  className?: string;
}

export function EvidenceTrail({
  evidence,
  title = 'Evidence Trail',
  body,
  compact = false,
  className = '',
}: EvidenceTrailProps) {
  const parsedEvidence = useMemo(() => parseJsonList(evidence, defaultEvidence), [evidence]);

  return (
    <ComponentShell className={className}>
      <SectionHeader eyebrow="Grounded review" title={title} body={body} />
      <div className="cs-control-list">
        {parsedEvidence.map((item, index) => {
          const tone = item.tone ?? 'info';
          const toneStyle = toneStyles(tone);
          const content = (
            <article
              style={{
                ...surfaceStyles,
                display: 'grid',
                gridTemplateColumns: compact ? 'auto 1fr' : 'auto minmax(0, 1fr) auto',
                gap: '0.85rem',
                padding: compact ? '0.875rem' : tokens.spacing.md,
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  width: '1.5rem',
                  height: '1.5rem',
                  borderRadius: tokens.radii.full,
                  border: `1px solid ${toneStyle.border}`,
                  background: toneStyle.background,
                  color: toneStyle.color,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: tokens.typography.fontSize.caption,
                  fontWeight: tokens.typography.fontWeight.semibold,
                }}
              >
                {index + 1}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h3
                    style={{
                      fontSize: tokens.typography.fontSize.body,
                      fontWeight: tokens.typography.fontWeight.semibold,
                      margin: 0,
                    }}
                  >
                    {item.label}
                  </h3>
                  {item.source ? <Badge tone="neutral">{item.source}</Badge> : null}
                </div>
                {item.detail ? (
                  <p
                    style={{
                      color: tokens.colors.fgSecondary,
                      fontSize: tokens.typography.fontSize.bodySm,
                      lineHeight: tokens.typography.lineHeight.relaxed,
                      margin: '0.4rem 0 0',
                    }}
                  >
                    {item.detail}
                  </p>
                ) : null}
              </div>
              {!compact && item.timestamp ? (
                <time style={{ ...compactLabelStyles, alignSelf: 'start' }}>{item.timestamp}</time>
              ) : null}
            </article>
          );

          return item.href ? (
            <a key={item.id ?? item.label} href={item.href} style={{ color: 'inherit', textDecoration: 'none' }}>
              {content}
            </a>
          ) : (
            <div key={item.id ?? item.label}>{content}</div>
          );
        })}
      </div>
    </ComponentShell>
  );
}

export interface ArtifactGridProps {
  artifacts?: JsonList<ArtifactItem>;
  title?: string;
  body?: string;
  columns?: 'two' | 'three' | 'four';
  className?: string;
}

export function ArtifactGrid({
  artifacts,
  title = 'Review Artifacts',
  body,
  columns = 'three',
  className = '',
}: ArtifactGridProps) {
  const parsedArtifacts = useMemo(() => parseJsonList(artifacts, defaultArtifacts), [artifacts]);
  const gridClassName =
    columns === 'two'
      ? 'cs-control-grid cs-control-grid--two'
      : columns === 'four'
        ? 'cs-control-grid cs-control-grid--four'
        : 'cs-control-grid';

  return (
    <ComponentShell className={className}>
      <SectionHeader eyebrow="Client-safe packet" title={title} body={body} />
      <div className={gridClassName}>
        {parsedArtifacts.map((artifact) => {
          const tone = artifact.tone ?? (artifact.visibility === 'private' ? 'danger' : artifact.visibility === 'internal' ? 'warning' : 'info');
          const card = (
            <article
              style={{
                ...surfaceStyles,
                minHeight: '12rem',
                padding: tokens.spacing.md,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                  {artifact.type ? <div style={compactLabelStyles}>{artifact.type}</div> : <span />}
                  {artifact.visibility ? <Badge tone={tone}>{artifact.visibility}</Badge> : null}
                </div>
                <h3
                  style={{
                    fontFamily: tokens.typography.fontFamily.tight,
                    fontSize: tokens.typography.fontSize.h4,
                    lineHeight: tokens.typography.lineHeight.tight,
                    margin: '1rem 0 0',
                  }}
                >
                  {artifact.title}
                </h3>
                {artifact.description ? (
                  <p
                    style={{
                      color: tokens.colors.fgSecondary,
                      fontSize: tokens.typography.fontSize.bodySm,
                      lineHeight: tokens.typography.lineHeight.relaxed,
                      margin: '0.65rem 0 0',
                    }}
                  >
                    {artifact.description}
                  </p>
                ) : null}
              </div>
              {artifact.href ? <div style={compactLabelStyles}>Open artifact</div> : null}
            </article>
          );

          return artifact.href ? (
            <a key={artifact.title} href={artifact.href} style={{ color: 'inherit', textDecoration: 'none' }}>
              {card}
            </a>
          ) : (
            <div key={artifact.title}>{card}</div>
          );
        })}
      </div>
    </ComponentShell>
  );
}

export interface DecisionQueueProps {
  decisions?: JsonList<DecisionItem>;
  title?: string;
  body?: string;
  className?: string;
}

export function DecisionQueue({
  decisions,
  title = 'Decisions Needed',
  body,
  className = '',
}: DecisionQueueProps) {
  const parsedDecisions = useMemo(() => parseJsonList(decisions, defaultDecisions), [decisions]);

  return (
    <ComponentShell className={className}>
      <SectionHeader eyebrow="Operator queue" title={title} body={body} />
      <div className="cs-control-list">
        {parsedDecisions.map((decision, index) => {
          const state = decision.state ?? 'open';
          return (
            <article
              key={decision.id ?? decision.title}
              style={{
                ...surfaceStyles,
                display: 'grid',
                gridTemplateColumns: 'auto minmax(0, 1fr) auto',
                gap: '1rem',
                padding: tokens.spacing.md,
                alignItems: 'start',
              }}
            >
              <div
                style={{
                  width: '2rem',
                  height: '2rem',
                  borderRadius: tokens.radii.md,
                  border: `1px solid ${tokens.colors.borderDefault}`,
                  display: 'grid',
                  placeItems: 'center',
                  color: tokens.colors.fgSecondary,
                  fontWeight: tokens.typography.fontWeight.semibold,
                }}
              >
                {index + 1}
              </div>
              <div>
                <h3 style={{ fontSize: tokens.typography.fontSize.body, margin: 0 }}>{decision.title}</h3>
                {decision.description ? (
                  <p
                    style={{
                      color: tokens.colors.fgSecondary,
                      fontSize: tokens.typography.fontSize.bodySm,
                      lineHeight: tokens.typography.lineHeight.relaxed,
                      margin: '0.4rem 0 0',
                    }}
                  >
                    {decision.description}
                  </p>
                ) : null}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginTop: '0.75rem' }}>
                  {decision.tier ? <Badge tone="info">{decision.tier}</Badge> : null}
                  {decision.owner ? <Badge tone="neutral">{decision.owner}</Badge> : null}
                  {decision.due ? <Badge tone="neutral">{decision.due}</Badge> : null}
                </div>
              </div>
              <Badge tone={statusToTone(state)}>{state}</Badge>
            </article>
          );
        })}
      </div>
    </ComponentShell>
  );
}

export interface RuntimeStatusProps {
  label?: string;
  status?: CheckStatus;
  environment?: string;
  lastChecked?: string;
  checks?: JsonList<RuntimeCheck>;
  className?: string;
}

export function RuntimeStatus({
  label = 'Canon Runtime',
  status = 'ok',
  environment = 'Cloudflare Pages',
  lastChecked = 'Preview ready',
  checks,
  className = '',
}: RuntimeStatusProps) {
  const parsedChecks = useMemo(() => parseJsonList(checks, defaultChecks), [checks]);

  return (
    <ComponentShell className={className}>
      <article style={{ ...surfaceStyles, padding: tokens.spacing.md }}>
        <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <div style={compactLabelStyles}>{environment}</div>
            <h2
              style={{
                fontFamily: tokens.typography.fontFamily.tight,
                fontSize: tokens.typography.fontSize.h3,
                lineHeight: tokens.typography.lineHeight.tight,
                margin: '0.4rem 0 0',
              }}
            >
              {label}
            </h2>
            <p style={{ color: tokens.colors.fgSecondary, margin: '0.55rem 0 0' }}>{lastChecked}</p>
          </div>
          <Badge tone={statusToTone(status)}>{status}</Badge>
        </div>
        <div className="cs-control-grid" style={{ marginTop: tokens.spacing.md }}>
          {parsedChecks.map((check) => (
            <div
              key={check.label}
              style={{
                border: `1px solid ${tokens.colors.borderDefault}`,
                borderRadius: tokens.radii.md,
                background: tokens.colors.bgPure,
                padding: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                <strong>{check.label}</strong>
                <Badge tone={statusToTone(check.status)}>{check.status ?? 'idle'}</Badge>
              </div>
              {check.detail ? (
                <p
                  style={{
                    color: tokens.colors.fgSecondary,
                    fontSize: tokens.typography.fontSize.bodySm,
                    lineHeight: tokens.typography.lineHeight.relaxed,
                    margin: '0.5rem 0 0',
                  }}
                >
                  {check.detail}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </article>
    </ComponentShell>
  );
}

export interface ActionPreviewProps {
  actions?: JsonList<ActionPreviewItem>;
  endpointUrl?: string;
  contextId?: string;
  defaultActionId?: string;
  title?: string;
  body?: string;
  className?: string;
}

export function ActionPreview({
  actions,
  endpointUrl = '',
  contextId = 'canon-control-demo',
  defaultActionId,
  title = 'Action Preview',
  body = 'Preview governed actions before anything mutates an external system.',
  className = '',
}: ActionPreviewProps) {
  const parsedActions = useMemo(() => parseJsonList(actions, defaultActions), [actions]);
  const initialAction = parsedActions.find((action) => action.id === defaultActionId) ?? parsedActions[0];
  const [selectedActionId, setSelectedActionId] = useState(initialAction?.id ?? '');
  const [remotePreview, setRemotePreview] = useState<ActionPreviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedAction = parsedActions.find((action) => action.id === selectedActionId) ?? parsedActions[0];
  const policyChecks = remotePreview?.policyChecks ?? selectedAction?.policyChecks ?? [];
  const evidence = remotePreview?.evidence ?? selectedAction?.evidence ?? [];

  async function previewAction() {
    if (!endpointUrl || !selectedAction) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          actionId: selectedAction.id,
          contextId,
          approvalState: selectedAction.status === 'allowed' ? 'approved' : 'review',
        }),
      });

      const data = (await response.json()) as ActionPreviewResponse & { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? 'Unable to preview action.');
      }
      setRemotePreview(data);
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : 'Unable to preview action.');
    } finally {
      setIsLoading(false);
    }
  }

  if (!selectedAction) return null;

  return (
    <ComponentShell className={className}>
      <SectionHeader eyebrow="Governed action" title={title} body={body} />
      <article style={{ ...surfaceStyles, padding: tokens.spacing.md }}>
        <div className="cs-control-grid cs-control-grid--two">
          <div>
            <label style={{ ...compactLabelStyles, display: 'block', marginBottom: '0.5rem' }} htmlFor="cs-action-preview-select">
              Action
            </label>
            <select
              id="cs-action-preview-select"
              className="cs-control-select"
              value={selectedAction.id}
              onChange={(event) => {
                setSelectedActionId(event.target.value);
                setRemotePreview(null);
                setError('');
              }}
            >
              {parsedActions.map((action) => (
                <option key={action.id} value={action.id}>
                  {action.label}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Badge tone={riskToTone(selectedAction.risk)}>{selectedAction.risk ?? 'standard'} risk</Badge>
            <Badge tone={statusToTone(selectedAction.status)}>{readableStatus(selectedAction.status)}</Badge>
          </div>
        </div>

        <div style={{ marginTop: tokens.spacing.md }}>
          <h3 style={{ fontFamily: tokens.typography.fontFamily.tight, fontSize: tokens.typography.fontSize.h4, margin: 0 }}>
            {selectedAction.label}
          </h3>
          <p style={{ color: tokens.colors.fgSecondary, lineHeight: tokens.typography.lineHeight.relaxed, margin: '0.65rem 0 0' }}>
            {remotePreview?.summary ?? selectedAction.description}
          </p>
        </div>

        <div className="cs-control-grid cs-control-grid--two" style={{ marginTop: tokens.spacing.md }}>
          <div>
            <div style={compactLabelStyles}>Policy checks</div>
            <ul style={{ color: tokens.colors.fgSecondary, margin: '0.75rem 0 0', paddingLeft: '1.1rem' }}>
              {policyChecks.map((check) => (
                <li key={check} style={{ marginBottom: '0.45rem' }}>
                  {check}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div style={compactLabelStyles}>Grounding</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginTop: '0.75rem' }}>
              {evidence.map((item) => (
                <Badge key={item} tone="neutral">
                  {item}
                </Badge>
              ))}
            </div>
            {remotePreview?.allowedNextActions?.length ? (
              <div style={{ marginTop: '1rem' }}>
                <div style={compactLabelStyles}>Allowed next actions</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginTop: '0.75rem' }}>
                  {remotePreview.allowedNextActions.map((item) => (
                    <Badge key={item} tone="success">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {error ? <p style={{ color: tokens.colors.error, margin: '1rem 0 0' }}>{error}</p> : null}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: tokens.spacing.md }}>
          <button className="cs-control-button" type="button" onClick={previewAction} disabled={!endpointUrl || isLoading}>
            {endpointUrl ? (isLoading ? 'Previewing...' : 'Preview with Cloudflare') : 'Static preview'}
          </button>
        </div>
      </article>
    </ComponentShell>
  );
}

export interface ApprovalGateProps {
  title?: string;
  description?: string;
  approvalState?: ApprovalState;
  requiredApprover?: string;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  className?: string;
}

export function ApprovalGate({
  title = 'Human Approval Gate',
  description = 'The system can prepare the action, but a named operator approves it before execution.',
  approvalState = 'review',
  requiredApprover = 'Named operator',
  primaryActionLabel = 'Mark approved',
  secondaryActionLabel = 'Keep in review',
  className = '',
}: ApprovalGateProps) {
  const [state, setState] = useState<ApprovalState>(approvalState);

  return (
    <ComponentShell className={className}>
      <article style={{ ...surfaceStyles, padding: tokens.spacing.md }}>
        <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <div style={compactLabelStyles}>Approval boundary</div>
            <h2
              style={{
                fontFamily: tokens.typography.fontFamily.tight,
                fontSize: tokens.typography.fontSize.h3,
                lineHeight: tokens.typography.lineHeight.tight,
                margin: '0.4rem 0 0',
              }}
            >
              {title}
            </h2>
          </div>
          <Badge tone={statusToTone(state)}>{state}</Badge>
        </div>
        <p style={{ color: tokens.colors.fgSecondary, lineHeight: tokens.typography.lineHeight.relaxed, margin: '0.8rem 0 0' }}>
          {description}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
          <Badge tone="neutral">Approver: {requiredApprover}</Badge>
          <Badge tone="warning">No external mutation in v1</Badge>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '0.75rem', marginTop: tokens.spacing.md }}>
          <button className="cs-control-button cs-control-button--ghost" type="button" onClick={() => setState('review')}>
            {secondaryActionLabel}
          </button>
          <button className="cs-control-button" type="button" onClick={() => setState('approved')}>
            {primaryActionLabel}
          </button>
        </div>
      </article>
    </ComponentShell>
  );
}

export interface AgentDockProps {
  endpointUrl?: string;
  contextId?: string;
  title?: string;
  placeholder?: string;
  suggestedPrompts?: JsonList<SuggestedPrompt>;
  initialMessages?: JsonList<AgentMessage>;
  className?: string;
}

export function AgentDock({
  endpointUrl = '',
  contextId = 'canon-control-demo',
  title = 'Ask the Control Layer',
  placeholder = 'Ask what is approved, private, or ready to preview...',
  suggestedPrompts,
  initialMessages,
  className = '',
}: AgentDockProps) {
  const prompts = useMemo(() => parseJsonList(suggestedPrompts, defaultPrompts), [suggestedPrompts]);
  const parsedInitialMessages = useMemo(() => parseJsonList(initialMessages, defaultMessages), [initialMessages]);
  const [messages, setMessages] = useState<AgentMessage[]>(parsedInitialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function sendMessage(message: string) {
    const trimmed = message.trim();
    if (!trimmed) return;

    const operatorMessage: AgentMessage = { role: 'operator', body: trimmed };
    const nextMessages = [...messages, operatorMessage];
    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);
    setError('');

    if (!endpointUrl) {
      setMessages([
        ...nextMessages,
        {
          role: 'agent',
          body: 'Static preview mode: configure a Cloudflare endpoint URL to answer from the live governance route. The local rule is to keep private data out of public responses and require approval before external actions.',
          grounding: ['Static props', 'Governance rule'],
        },
      ]);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          contextId,
          history: nextMessages.slice(-8).map((entry) => ({
            role: entry.role === 'operator' ? 'client' : 'agent',
            body: entry.body,
          })),
        }),
      });

      const data = (await response.json()) as AgentResponse & { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? 'Unable to ask the control layer.');
      }

      setMessages([
        ...nextMessages,
        {
          role: 'agent',
          body: data.answer ?? 'The control layer returned no answer.',
          grounding: data.grounding ?? data.followUps ?? data.followUpQuestions ?? [],
        },
      ]);
    } catch (askError) {
      setError(askError instanceof Error ? askError.message : 'Unable to ask the control layer.');
      setMessages(nextMessages);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <ComponentShell className={className}>
      <article style={{ ...surfaceStyles, padding: tokens.spacing.md }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'start' }}>
          <div>
            <div style={compactLabelStyles}>Bounded agent</div>
            <h2
              style={{
                fontFamily: tokens.typography.fontFamily.tight,
                fontSize: tokens.typography.fontSize.h3,
                lineHeight: tokens.typography.lineHeight.tight,
                margin: '0.4rem 0 0',
              }}
            >
              {title}
            </h2>
          </div>
          <Badge tone={endpointUrl ? 'success' : 'neutral'}>{endpointUrl ? 'Cloudflare' : 'Static'}</Badge>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: tokens.spacing.md }}>
          {prompts.map((prompt) => (
            <button
              key={prompt.label}
              className="cs-control-button cs-control-button--ghost"
              type="button"
              onClick={() => void sendMessage(prompt.prompt)}
              disabled={isLoading}
              style={{ minHeight: '2.25rem', padding: '0.5rem 0.7rem' }}
            >
              {prompt.label}
            </button>
          ))}
        </div>

        <div className="cs-agent-scroll cs-control-list" style={{ marginTop: tokens.spacing.md }}>
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}-${message.body.slice(0, 12)}`}
              style={{
                alignSelf: message.role === 'operator' ? 'flex-end' : 'stretch',
                maxWidth: message.role === 'operator' ? '82%' : '100%',
                border: `1px solid ${tokens.colors.borderDefault}`,
                borderRadius: tokens.radii.md,
                background: message.role === 'operator' ? tokens.colors.bgSubtle : tokens.colors.bgPure,
                padding: '0.9rem',
              }}
            >
              <div style={compactLabelStyles}>{message.role === 'operator' ? 'Operator' : 'Agent'}</div>
              <p style={{ color: tokens.colors.fgSecondary, lineHeight: tokens.typography.lineHeight.relaxed, margin: '0.45rem 0 0' }}>
                {message.body}
              </p>
              {message.grounding?.length ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.75rem' }}>
                  {message.grounding.map((item) => (
                    <Badge key={item} tone="neutral">
                      {item}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {error ? <p style={{ color: tokens.colors.error, margin: '1rem 0 0' }}>{error}</p> : null}

        <form onSubmit={handleSubmit} className="cs-agent-form">
          <input
            className="cs-control-input"
            value={input}
            placeholder={placeholder}
            onChange={(event) => setInput(event.target.value)}
            disabled={isLoading}
          />
          <button className="cs-control-button" type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? 'Asking...' : 'Ask'}
          </button>
        </form>
      </article>
    </ComponentShell>
  );
}

export interface CanonControlPanelProps {
  heading?: string;
  subheading?: string;
  contextId?: string;
  agentEndpointUrl?: string;
  actionEndpointUrl?: string;
  layers?: JsonList<OperatingLayer>;
  evidence?: JsonList<EvidenceItem>;
  artifacts?: JsonList<ArtifactItem>;
  decisions?: JsonList<DecisionItem>;
  actions?: JsonList<ActionPreviewItem>;
  suggestedPrompts?: JsonList<SuggestedPrompt>;
  runtimeChecks?: JsonList<RuntimeCheck>;
  className?: string;
}

export function CanonControlPanel({
  heading = 'Canon Control Panel',
  subheading = 'A Webflow interface backed by Cloudflare previews, evidence, and human approval boundaries.',
  contextId = 'canon-control-demo',
  agentEndpointUrl = '',
  actionEndpointUrl = '',
  layers,
  evidence,
  artifacts,
  decisions,
  actions,
  suggestedPrompts,
  runtimeChecks,
  className = '',
}: CanonControlPanelProps) {
  return (
    <ComponentShell className={className}>
      <section
        style={{
          background: tokens.colors.bgPure,
          border: `1px solid ${tokens.colors.borderDefault}`,
          borderRadius: tokens.radii.md,
          padding: tokens.spacing.lg,
        }}
      >
        <div className="cs-control-hero-grid">
          <div>
            <div style={compactLabelStyles}>Create Something / Webflow Code Components</div>
            <h1
              style={{
                fontFamily: tokens.typography.fontFamily.tight,
                fontSize: tokens.typography.fontSize.h1,
                lineHeight: tokens.typography.lineHeight.tight,
                margin: '0.55rem 0 0',
                maxWidth: '56rem',
              }}
            >
              {heading}
            </h1>
            <p
              style={{
                color: tokens.colors.fgSecondary,
                fontSize: tokens.typography.fontSize.bodyLg,
                lineHeight: tokens.typography.lineHeight.relaxed,
                margin: '0.85rem 0 0',
                maxWidth: '58rem',
              }}
            >
              {subheading}
            </p>
          </div>
          <RuntimeStatus
            label="Hybrid runtime"
            status={agentEndpointUrl || actionEndpointUrl ? 'ok' : 'idle'}
            environment="Webflow + Cloudflare"
            lastChecked={agentEndpointUrl || actionEndpointUrl ? 'Endpoint configured' : 'Using static Webflow props'}
            checks={runtimeChecks}
          />
        </div>

        <div style={{ marginTop: tokens.spacing.lg }}>
          <OperatingLayerCards layers={layers} body="Each feature is designed as a public surface, a callable runtime, and a policy-backed approval state." />
        </div>

        <div className="cs-control-grid cs-control-grid--two" style={{ marginTop: tokens.spacing.lg, alignItems: 'start' }}>
          <ActionPreview endpointUrl={actionEndpointUrl} contextId={contextId} actions={actions} />
          <ApprovalGate />
        </div>

        <div className="cs-control-grid cs-control-grid--two" style={{ marginTop: tokens.spacing.lg, alignItems: 'start' }}>
          <AgentDock endpointUrl={agentEndpointUrl} contextId={contextId} suggestedPrompts={suggestedPrompts} />
          <DecisionQueue decisions={decisions} />
        </div>

        <div style={{ marginTop: tokens.spacing.lg }}>
          <EvidenceTrail evidence={evidence} />
        </div>

        <div style={{ marginTop: tokens.spacing.lg }}>
          <ArtifactGrid artifacts={artifacts} />
        </div>
      </section>
    </ComponentShell>
  );
}

export const canonControlDefaults = {
  layers: defaultLayers,
  evidence: defaultEvidence,
  artifacts: defaultArtifacts,
  decisions: defaultDecisions,
  actions: defaultActions,
  suggestedPrompts: defaultPrompts,
  initialMessages: defaultMessages,
  runtimeChecks: defaultChecks,
};
