// Frame adapted from Astryx's MIT ai-chat template; content and policy remain NPG-owned.
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Theme } from '@astryxdesign/core/theme';
import { npgComposerTheme } from './npg-composer.js';
import './npg-composer.css';
import { AppShell } from '@astryxdesign/core/AppShell';
import { TopNav, TopNavHeading } from '@astryxdesign/core/TopNav';
import { SideNav, SideNavHeading, SideNavItem } from '@astryxdesign/core/SideNav';
import {
  ChatMessageList,
  ChatMessage,
  ChatMessageBubble,
  ChatComposer,
  ChatComposerInput,
  type ChatComposerInputHandle
} from '@astryxdesign/core/Chat';
import { List, ListItem } from '@astryxdesign/core/List';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Divider } from '@astryxdesign/core/Divider';
import { Grid } from '@astryxdesign/core/Grid';
import { Section } from '@astryxdesign/core/Section';
import { Button } from '@astryxdesign/core/Button';
import { Banner } from '@astryxdesign/core/Banner';
import { Blockquote } from '@astryxdesign/core/Blockquote';
import { Link } from '@astryxdesign/core/Link';
import { Icon } from '@astryxdesign/core/Icon';
import {
  Plus,
  MessagesSquare,
  UserRound,
  ArrowUp,
  Download,
  RefreshCw,
  ClipboardCheck,
  Clock,
  CircleCheck,
  TriangleAlert,
  MapPin,
  UsersRound,
  Database,
  ArrowRight,
  ArrowLeft,
  FileCheck2
} from 'lucide-react';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { Disclosure as Collapsible } from './Disclosure';
import { gsap, installWorkspaceMotion, moveScroll, reducedMotion, stopScroll } from './motion';
import {
  actionLabel,
  conversationStatus,
  linkParts,
  readDrafts,
  reviewFields,
  sourceArtifact,
  type NpgView
} from '../display';
import { decisionSummary, evidenceFieldLabel, evidenceGroups } from './presentation';
import type { HistoryItem, NpgBootstrap } from './types';
import npgLogo from './assets/npg-logo.png';

const endpoint = '/delivery/abundance/healthcare-analyst/api';
const examples = [
  {
    label: 'Find candidates by city',
    detail: 'Family and adult-gerontology NPs in Springfield, MO',
    icon: UsersRound,
    prompt:
      'Find FNP and adult-gerontology NP candidates in Springfield, MO, with a complete sourcing CSV.'
  },
  {
    label: 'Search around a clinic',
    detail: 'NPs within 25 miles of your clinic',
    icon: MapPin,
    prompt: 'Find NPs within 25 miles of a clinic street address. Ask me for the address first.'
  },
  {
    label: 'Check registry coverage',
    detail: 'Freshness, scope, and unresolved records',
    icon: Database,
    prompt:
      'Show coverage freshness, taxonomy scope, and unresolved records for the nationwide snapshot.'
  }
];
function readStorage(key: string, session = false) {
  try {
    return (session ? sessionStorage : localStorage).getItem(key);
  } catch {
    return null;
  }
}
function writeStorage(key: string, value: string, session = false) {
  try {
    (session ? sessionStorage : localStorage).setItem(key, value);
  } catch {
    /* Keep this tab's state. */
  }
}
function useMediaQuery(media: string) {
  const [matches, setMatches] = useState(() => matchMedia(media).matches);
  useEffect(() => {
    const query = matchMedia(media);
    const update = () => setMatches(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, [media]);
  return matches;
}
async function api<T>(body?: unknown, id?: string): Promise<T> {
  const response = await fetch(
    endpoint + (id ? '?id=' + encodeURIComponent(id) : ''),
    body
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }
      : { headers: { Accept: 'application/json' } }
  );
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
    let message = 'Access may have expired. Refresh this page and sign in again.';
    try {
      message = ((await response.json()) as { error?: string }).error || message;
    } catch {
      /* Non-JSON response. */
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}
// Present plain-text paragraphs and supplied bullet lines without interpreting HTML or Markdown.
function Prose({ text, assistant = false }: { text: string; assistant?: boolean }) {
  function literal(value: string) {
    return linkParts(value).map((part, index) =>
      part.href ? (
        <Link key={index} href={part.href} isExternalLink hasUnderline>
          {part.text}
        </Link>
      ) : (
        <React.Fragment key={index}>{part.text}</React.Fragment>
      )
    );
  }
  return (
    <VStack gap={4} className="npg-prose min-w-0">
      {text.split(/\n\s*\n/).map((paragraph, paragraphIndex) => {
        const lines = paragraph.split('\n');
        const hasHeading =
          assistant &&
          lines.length > 1 &&
          lines[0].trim().length > 0 &&
          lines[0].length <= 64 &&
          !/^[-*•\d]/.test(lines[0]) &&
          !/[.!?]$/.test(lines[0].trim());
        return (
          <VStack key={paragraphIndex} gap={2}>
            {hasHeading && (
              <Text as="p" weight="semibold" size="lg" wordBreak="break-word">
                {literal(lines[0])}
              </Text>
            )}
            <Text
              as="p"
              type="body"
              weight={
                assistant && paragraphIndex === 0 && paragraph.length <= 240 ? 'medium' : 'normal'
              }
              size="lg"
              wordBreak="break-word"
              className="whitespace-pre-wrap"
            >
              {literal(hasHeading ? lines.slice(1).join('\n') : paragraph)}
            </Text>
          </VStack>
        );
      })}
    </VStack>
  );
}
function readableFieldValue(field: { label: string; value: string }, currency?: string) {
  if (field.label.toLowerCase() === 'completeness' && field.value === 'incomplete_geocoding')
    return 'Location coverage incomplete';
  if (
    currency &&
    /^[A-Z]{3}$/.test(currency) &&
    [
      'Maximum cost',
      'One-time shared allowance',
      'Recorded spending',
      'Remaining allowance'
    ].includes(field.label) &&
    /^\d+(?:\.\d+)?$/.test(field.value) &&
    Number.isFinite(Number(field.value))
  ) {
    try {
      return (
        new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 20
        }).format(Number(field.value)) +
        ' ' +
        currency
      );
    } catch {
      /* Preserve the supplied value for unsupported currencies. */
    }
  }
  const normalizedLabel = field.label.toLowerCase().replaceAll('_', ' ').trim();
  const finalLabel = normalizedLabel.split(' · ').at(-1) ?? normalizedLabel;
  if (
    ([
      'status',
      'completeness',
      'clinical verification status',
      'direct outreach status',
      'outreach authority status',
      'personal contact access',
      'contact availability',
      'contact route status',
      'failure kind',
      'snapshot status'
    ].includes(normalizedLabel) ||
      ['stage', 'consent basis', 'geography'].includes(finalLabel)) &&
    /^[a-z]+(?:_[a-z]+)+$/.test(field.value)
  ) {
    const words = field.value.replaceAll('_', ' ');
    return words.charAt(0).toUpperCase() + words.slice(1);
  }
  return field.value;
}
function knownLimitGroups(text: string) {
  const repeated = text.indexOf(' Repeated identical input ');
  const ownership = text.indexOf(' Account ownership ');
  const restriction = text.indexOf(' Account restriction ');
  const known =
    text.startsWith('One pinned run, ten-cent cap, shared daily reservations.') &&
    text.includes('Repeated identical input reconciles the same run.') &&
    repeated > 0 &&
    ownership > repeated &&
    restriction > ownership &&
    [repeated, ownership, restriction].every((index) => text[index - 1] === '.') &&
    text.includes('these checks cannot exclude explicit grants or Actor-creator sharing.') &&
    text.endsWith('Account restriction and sharing setup require operator review.');
  return known
    ? [
        {
          label: 'Run limits',
          value: text.slice(0, ownership + 1),
          explanation:
            'In practice: identical requests check the saved run. Reservations share the daily budget.'
        },
        {
          label: 'Access and sharing',
          value: text.slice(ownership + 1),
          warning: 'These checks cannot confirm that access is limited to your account.'
        }
      ]
    : null;
}
function ReviewLimits({
  text,
  warning,
  explanation
}: {
  text: string;
  warning?: string;
  explanation?: string;
}) {
  const original = (
    <VStack gap={2}>
      {text.split(/(?<=\.) (?=[A-Z])/).map((sentence, i, sentences) => (
        <Text
          key={i}
          as="p"
          color={warning || explanation ? 'secondary' : 'primary'}
          wordBreak="break-word"
        >
          {sentence}
          {i < sentences.length - 1 ? ' ' : ''}
        </Text>
      ))}
    </VStack>
  );
  return (
    <VStack gap={3}>
      {warning && <Text weight="semibold">{warning}</Text>}
      {explanation && <Text weight="medium">{explanation}</Text>}
      {warning || explanation ? (
        <Blockquote aria-label="Exact conditions">{original}</Blockquote>
      ) : (
        original
      )}
    </VStack>
  );
}
function Fields({
  fields,
  compact = false,
  review = false,
  evidence = false,
  wideLabels = false
}: {
  fields: Array<{ label: string; value: string }>;
  compact?: boolean;
  review?: boolean;
  evidence?: boolean;
  wideLabels?: boolean;
}) {
  const currency = fields.find((field) => field.label === 'Currency')?.value;
  const rows = fields.flatMap((field) =>
    review && field.label === 'Limits' ? (knownLimitGroups(field.value) ?? [field]) : [field]
  );

  return (
    <MetadataList
      label={{
        position: compact ? 'start' : 'top',
        width: compact
          ? evidence && wideLabels
            ? 'calc(var(--spacing-10) * 3 + var(--spacing-5))'
            : 'calc(var(--spacing-10) * 3)'
          : undefined
      }}
      columns="single"
    >
      {rows.map((field, index) => (
        <MetadataListItem
          key={index}
          label={
            evidence
              ? evidenceFieldLabel(field.label)
              : field.label.charAt(0).toUpperCase() + field.label.slice(1)
          }
        >
          {review && ['Limits', 'Run limits', 'Access and sharing'].includes(field.label) ? (
            <ReviewLimits
              text={field.value}
              warning={'warning' in field ? String(field.warning) : undefined}
              explanation={'explanation' in field ? String(field.explanation) : undefined}
            />
          ) : (
            <Text
              wordBreak="break-word"
              className="whitespace-pre-wrap"
            >
              {readableFieldValue(field, currency)}
            </Text>
          )}
        </MetadataListItem>
      ))}
    </MetadataList>
  );
}
function Evidence({
  sources,
  conversationTitle
}: {
  sources: NpgView['sources'];
  conversationTitle: string;
}) {
  const wideEvidence = useMediaQuery('(min-width: 640px) and (max-width: 1279px)');
  const shortPhone = useMediaQuery('(max-width: 479px) and (max-height: 700px)');
  return (
    <VStack gap={3} className="npg-evidence-content max-w-reading mx-auto w-full min-w-0">
      <VStack gap={1}>
        <HStack gap={2}>
          <Icon icon={FileCheck2} />
          <Heading
            id="npg-evidence-title"
            level={2}
            tabIndex={-1}
            className="min-w-0 flex-1"
          >
            Results &amp; evidence
          </Heading>
        </HStack>
        {shortPhone ? (
          <Text
            type="supporting"
            color="secondary"
            maxLines={1}
            className="npg-evidence-context"
          >
            {conversationTitle}
          </Text>
        ) : (
          <Text type="supporting" color="secondary">
            Saved with this conversation.
          </Text>
        )}
      </VStack>
      {sources.length ? (
        sources.map((source, index) => {
          const artifact = sourceArtifact(source.data);
          const groups = evidenceGroups(artifact.fields);
          const incomplete = artifact.fields.some(
            (field) => field.value === 'incomplete_geocoding'
          );
          const unresolved = artifact.fields.find(
            (field) =>
              ['Unresolved records', 'Unresolved addresses'].includes(field.label) &&
              /^\d+$/.test(field.value)
          );
          return (
            <React.Fragment key={index}>
              {index > 0 && <Divider />}
              <VStack
                as="section"
                gap={2}
                className="npg-source min-w-0"
                aria-labelledby={'source-' + index}
              >
                <HStack gap={3} align="start" justify="between">
                  <Heading id={'source-' + index} level={3}>
                    {actionLabel(source.tool)}
                  </Heading>
                  <Text type="supporting" color="secondary" className="shrink-0">
                    Source {index + 1}
                  </Text>
                </HStack>
                {(artifact.total !== null || artifact.shown !== null) && (
                  <VStack gap={1}>
                    <HStack gap={2} align="center">
                      <Text type="large" size="2xl" weight="semibold" hasTabularNumbers>
                        {artifact.total === null
                          ? 'Total not supplied'
                          : artifact.total.toLocaleString() +
                            (source.tool === 'search_registry_sourcing' ? ' records' : ' total')}
                      </Text>
                      <Text type="supporting" color="secondary">
                        in this source
                      </Text>
                    </HStack>
                    <Text type="supporting" size="base" color="secondary">
                      {artifact.shown === null
                        ? 'Shown count not supplied'
                        : artifact.shown.toLocaleString() +
                          (artifact.shown === 1 ? ' preview record' : ' preview records') +
                          (artifact.links.some((href) => href.startsWith('/delivery/'))
                            ? '; full CSV available'
                            : ' shown in response')}
                    </Text>
                  </VStack>
                )}
                {groups.warnings.length > 0 && (
                  <Banner
                    status="warning"
                    title={
                      'Source flags · ' +
                      groups.warnings
                        .map((warning) => warning.replace('Source reports ', ''))
                        .join(' · ')
                    }
                  />
                )}
                {incomplete && (
                  <Banner
                    status="warning"
                    title={
                      unresolved
                        ? Number(unresolved.value).toLocaleString() + ' unresolved locations'
                        : 'Location coverage is incomplete'
                    }
                    description={
                      <Text size="base">
                        Some addresses could not be located. Review the source limits before using
                        geographic results.
                      </Text>
                    }
                  />
                )}
                {artifact.links.map((href) => (
                  <VStack key={href} gap={1}>
                    <Button
                      className="source-link min-h-control"
                      href={href}
                      target="_blank"
                      variant="primary"
                      icon={<Icon icon={Download} />}
                      label={
                        href.startsWith('/delivery/') ? 'Download complete CSV' : 'Open source'
                      }
                    />
                    {href.startsWith('/delivery/') && (
                      <Text type="supporting" color="secondary">
                        NPG sign-in required.
                      </Text>
                    )}
                  </VStack>
                ))}
                {artifact.records.length > 0 && (
                  <Collapsible
                    trigger={
                      'Preview ' +
                      artifact.previewCount +
                      (artifact.previewCount === 1 ? ' returned record' : ' returned records')
                    }
                    defaultIsOpen={false}
                  >
                    <VStack gap={4} paddingBlock={3}>
                      {artifact.records.map((fields, i) => (
                        <VStack key={i} gap={2}>
                          <Heading level={4}>Record {i + 1}</Heading>
                          <Fields evidence fields={fields} />
                        </VStack>
                      ))}
                      <Text type="supporting" color="secondary">
                        This preview includes up to five returned source records.
                      </Text>
                    </VStack>
                  </Collapsible>
                )}
                {(artifact.fields.length > 0 || artifact.links.length > 0) && (
                  <VStack gap={4}>
                    {artifact.records.length > 0 && <Divider />}
                    {(() => {
                      const { summary: coverage, dates, details } = groups;
                      return (
                        <>
                          <Grid
                            columns={
                              wideEvidence && coverage.length > 0 && dates.length > 0 ? 2 : 1
                            }
                            gap={3}
                            className="min-w-0"
                          >
                            {coverage.length > 0 && (
                              <VStack gap={2}>
                                <Heading level={4}>Coverage &amp; limitations</Heading>
                                <Fields
                                  evidence
                                  compact
                                  wideLabels={wideEvidence}
                                  fields={coverage}
                                />
                              </VStack>
                            )}
                            {dates.length > 0 && (
                              <VStack gap={2}>
                                <Heading level={4}>Source freshness</Heading>
                                <Fields evidence compact wideLabels={wideEvidence} fields={dates} />
                              </VStack>
                            )}
                          </Grid>
                          {(details.length > 0 || artifact.links.length > 0) && (
                            <Collapsible
                              trigger="Source details & provenance"
                              defaultIsOpen={false}
                            >
                              <VStack paddingBlock={3} gap={3}>
                                <Fields
                                  evidence
                                  compact
                                  wideLabels={wideEvidence}
                                  fields={details}
                                />
                                {artifact.links.map((href) => (
                                  <VStack key={href} gap={1}>
                                    <Text type="supporting">Download address</Text>
                                    <Text size="sm" wordBreak="break-all">
                                      {href}
                                    </Text>
                                  </VStack>
                                ))}
                              </VStack>
                            </Collapsible>
                          )}
                        </>
                      );
                    })()}
                  </VStack>
                )}
                {artifact.sections.map((section, i) => (
                  <Collapsible
                    key={i}
                    trigger={section.title}
                    defaultIsOpen={section.title === 'Recruiting readiness and unknowns'}
                  >
                    <VStack paddingBlock={3}>
                      <Fields evidence fields={section.fields} />
                    </VStack>
                  </Collapsible>
                ))}
                <Collapsible trigger="Inspect original source data" defaultIsOpen={false}>
                  <Text
                    as="p"
                    type="code"
                    display="block"
                    wordBreak="break-word"
                    className="npg-json whitespace-pre-wrap max-w-full overflow-auto"
                  >
                    {JSON.stringify(source.data, null, 2)}
                  </Text>
                </Collapsible>
              </VStack>
            </React.Fragment>
          );
        })
      ) : (
        <Text color="secondary">
          Source evidence and complete exports will appear here after a lookup.
        </Text>
      )}
    </VStack>
  );
}
// The application owns transcript navigation; no library spring auto-follow.
function ThreadSurface({
  welcome,
  reviewing,
  thread,
  composer,
  children,
  onScroll
}: {
  welcome: boolean;
  reviewing: boolean;
  thread: React.RefObject<HTMLDivElement | null>;
  composer: React.ReactNode;
  children: React.ReactNode;
  onScroll: React.UIEventHandler<HTMLDivElement>;
}) {
  return (
    <VStack
      gap={0}
      minHeight={0}
      className={(reviewing ? 'npg-review-surface ' : '') + 'npg-thread-surface flex-1 min-w-0'}
    >
      <VStack
        ref={thread}
        onScroll={onScroll}
        gap={0}
        minHeight={0}
        className="npg-thread min-w-0 flex-1 overflow-y-auto overflow-x-hidden"
      >
        {children}
      </VStack>
      {!welcome && (
        <VStack
          gap={0}
          paddingInline={reviewing ? 2 : 4}
          paddingBlockEnd={reviewing ? 2 : 4}
          className="shrink-0"
        >
          {composer}
        </VStack>
      )}
    </VStack>
  );
}
export function Workspace({ bootstrap }: { bootstrap: NpgBootstrap }) {
  const storageKey = 'npg-drafts:' + bootstrap.owner;
  const currentKey = 'npg-current-conversation:' + bootstrap.owner;
  const drafts = useRef(readDrafts(readStorage(storageKey, true)));
  const [draft, setDraft] = useState(drafts.current.new ?? '');
  const draftRef = useRef(draft);
  const [conversations, setConversations] = useState(bootstrap.conversations);
  const [conversation, setConversation] = useState<NpgView | null>(null);
  const conversationRef = useRef<NpgView | null>(null);
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const [operation, setOperation] = useState('');
  const [notice, setNotice] = useState('');
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [submitted, setSubmitted] = useState('');
  const [navOpen, setNavOpen] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const resultsPreference = useRef<boolean | null>(
    readStorage('npg-evidence:' + bootstrap.owner) === 'open'
      ? true
      : readStorage('npg-evidence:' + bootstrap.owner) === 'closed'
        ? false
        : null
  );
  const positions = useRef(new Map<string, { thread: number; evidence: number }>());
  const navigation = useRef<'restore' | 'latest' | 'review'>('restore');
  const [atLatest, setAtLatest] = useState(true);
  const [evidenceAtTop, setEvidenceAtTop] = useState(true);
  const [clock, setClock] = useState(Date.now());
  const [reveal, setReveal] = useState(0);
  const narrow = useMediaQuery('(max-width: 1279px)');
  const tabletToolbar = useMediaQuery('(min-width: 640px) and (max-width: 1279px)');
  const smallPhone = useMediaQuery('(max-width: 479px)');
  const shortViewport = useMediaQuery('(max-height: 700px)');
  const input = useRef<ChatComposerInputHandle | null>(null);
  const [inputRoot, setInputRoot] = useState<HTMLDivElement | null>(null);
  const [draftOverflows, setDraftOverflows] = useState(false);
  const [draftScrolledDown, setDraftScrolledDown] = useState(false);
  const thread = useRef<HTMLDivElement | null>(null);
  const review = useRef<HTMLElement | null>(null);
  const inlineResults = useRef<HTMLElement | null>(null);
  const didRestore = useRef(false);
  const focusIntent = useRef<'review' | 'composer' | null>(null);
  const priorFeedback = useRef({ id: '', count: 0, submitted: '', notice: '', pending: '' });
  const pendingFocusCleanup = useRef<(() => void) | null>(null);
  const paneReturnFocus = useRef(false);
  useEffect(() => () => pendingFocusCleanup.current?.(), []);
  const evidenceToggleRef = useRef<HTMLButtonElement | null>(null);
  function rememberPosition() {
    const id = conversationRef.current?.id;
    if (!id) return;
    const saved = positions.current.get(id) ?? { thread: 0, evidence: 0 };
    if (thread.current && !(narrow && resultsOpen)) saved.thread = thread.current.scrollTop;
    if (inlineResults.current) saved.evidence = inlineResults.current.scrollTop;
    positions.current.set(id, saved);
  }
  function recordScroll(pane: 'thread' | 'evidence', element: HTMLElement) {
    const id = conversationRef.current?.id;
    if (id) {
      const saved = positions.current.get(id) ?? { thread: 0, evidence: 0 };
      saved[pane] = element.scrollTop;
      positions.current.set(id, saved);
    }
    if (pane === 'thread')
      setAtLatest(element.scrollHeight - element.clientHeight - element.scrollTop <= 8);
    else setEvidenceAtTop(element.scrollTop <= 8);
  }
  useLayoutEffect(() => {
    const context = gsap.context(() => {
      const latest = document.querySelectorAll('.npg-latest-affordance');
      const evidence = document.querySelectorAll('.npg-evidence-scroll-affordance');
      if (latest.length)
        gsap.to(latest, {
          opacity: atLatest ? 0.6 : 1,
          duration: reducedMotion() ? 0 : 0.12,
          overwrite: true
        });
      if (evidence.length)
        gsap.to(evidence, {
          opacity: evidenceAtTop ? 0.6 : 1,
          duration: reducedMotion() ? 0 : 0.12,
          overwrite: true
        });
    });
    return () => context.revert();
  }, [atLatest, evidenceAtTop, resultsOpen]);
  function toggleResults() {
    rememberPosition();
    const next = !resultsOpen;
    resultsPreference.current = next;
    writeStorage('npg-evidence:' + bootstrap.owner, next ? 'open' : 'closed');
    setResultsOpen(next);
    if (!next) paneReturnFocus.current = true;
  }
  useLayoutEffect(() => installWorkspaceMotion(document.body), []);
  useLayoutEffect(() => {
    const region = thread.current;
    if (!region) return;
    const context = gsap.context(() => {
      gsap.fromTo(
        region,
        { opacity: reducedMotion() ? 1 : 0, y: reducedMotion() ? 0 : 6 },
        {
          opacity: 1,
          y: 0,
          duration: reducedMotion() ? 0 : 0.2,
          clearProps: 'opacity,transform',
          overwrite: true
        }
      );
    });
    return () => context.revert();
  }, [conversation?.id]);
  function setView(view: NpgView | null) {
    if (conversationRef.current?.id !== view?.id) rememberPosition();
    conversationRef.current = view;
    setConversation(view);
  }
  function changeDraft(value: string) {
    const next = value.slice(0, 6000);
    draftRef.current = next;
    setDraft(next);
    drafts.current[conversationRef.current?.id ?? 'new'] = next;
    writeStorage(storageKey, JSON.stringify(drafts.current), true);
  }
  function begin(label: string) {
    if (running.current) return false;
    running.current = true;
    setBusy(true);
    setOperation(label);
    setNotice('');
    return true;
  }
  function finish() {
    running.current = false;
    setBusy(false);
  }
  async function refreshList() {
    const result = await api<{ conversations: HistoryItem[] }>();
    setConversations(result.conversations);
  }
  function rememberCurrent(id: string) {
    writeStorage(currentKey, id);
  }
  function focusAfterNavigation(
    hasReview = false,
    intent: 'restore' | 'latest' | 'review' = hasReview ? 'review' : 'latest'
  ) {
    pendingFocusCleanup.current?.();
    const focus = () => {
      pendingFocusCleanup.current = null;
      focusIntent.current = hasReview ? 'review' : 'composer';
      navigation.current = intent;
      setReveal((n) => n + 1);
    };
    // Native modal focus cannot leave the drawer until its close event. Wait
    // for that semantic event, then consume intent after React commits content.
    const dialog = document.querySelector<HTMLDialogElement>('dialog[open]');
    if (dialog) {
      dialog.addEventListener('close', focus, { once: true });
      pendingFocusCleanup.current = () => dialog.removeEventListener('close', focus);
    } else focus();
  }
  async function open(id: string, moveFocus = false) {
    if (!begin('Loading conversation')) return;
    rememberPosition();
    try {
      const view = await api<NpgView>(undefined, id);
      setView(view);
      changeDraft(drafts.current[id] ?? '');
      setNeedsRefresh(view.status === 'running');
      setResultsOpen(
        !narrow && (resultsPreference.current ?? !view.pending) && Boolean(view.sources.length)
      );
      if (moveFocus)
        focusAfterNavigation(
          Boolean(view.pending),
          positions.current.has(id) ? 'restore' : view.pending ? 'review' : 'latest'
        );
      setNavOpen(false);
      rememberCurrent(id);
      if (!moveFocus) {
        const saved = positions.current.has(id);
        navigation.current = saved ? 'restore' : view.pending ? 'review' : 'latest';
        if (view.pending && !saved) focusIntent.current = 'review';
        setReveal((n) => n + 1);
      }
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      finish();
    }
  }
  async function create() {
    if (!begin('Creating conversation')) return;
    try {
      const view = await api<NpgView>({ type: 'create' });
      setView(view);
      changeDraft(drafts.current[view.id] ?? '');
      setNeedsRefresh(false);
      setResultsOpen(false);
      setNavOpen(false);
      rememberCurrent(view.id);
      await refreshList();
      focusAfterNavigation();
    } catch (error) {
      setNotice((error as Error).message);
      setNeedsRefresh(true);
    } finally {
      finish();
    }
  }
  async function refresh() {
    if (conversationRef.current) return open(conversationRef.current.id);
    if (!begin('Checking conversation history')) return;
    try {
      await refreshList();
      setNeedsRefresh(false);
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      finish();
    }
  }
  async function send(value = draftRef.current) {
    if (
      !value.trim() ||
      needsRefresh ||
      (conversationRef.current && conversationRef.current.status !== 'idle') ||
      !begin('Working on your question')
    )
      return;
    setSubmitted(value);
    navigation.current = 'latest';
    setReveal((n) => n + 1);
    changeDraft('');
    try {
      let view = conversationRef.current;
      if (!view) {
        view = await api<NpgView>({ type: 'create' });
        // Any next question typed during creation follows the newly created conversation.
        const nextDraft = draftRef.current;
        setView(view);
        changeDraft(nextDraft);
        drafts.current.new = '';
        rememberCurrent(view.id);
        setNavOpen(false);
      }
      const result = await api<NpgView>({
        type: 'message',
        id: view.id,
        version: view.version,
        text: value
      });
      const region = thread.current;
      const followReply =
        !region || region.scrollHeight - region.clientHeight - region.scrollTop <= 8;
      rememberPosition();
      setView(result);
      if (!narrow)
        setResultsOpen(
          (resultsPreference.current ?? !result.pending) && Boolean(result.sources.length)
        );
      if (result.pending) focusAfterNavigation(true);
      else {
        navigation.current = followReply ? 'latest' : 'restore';
        setReveal((n) => n + 1);
      }
      await refreshList();
    } catch (error) {
      if (!draftRef.current) changeDraft(value);
      setNotice((error as Error).message);
      setNeedsRefresh(true);
    } finally {
      setSubmitted('');
      finish();
    }
  }
  async function decide(type: 'approve' | 'reject') {
    const view = conversationRef.current;
    if (
      !view?.pending ||
      needsRefresh ||
      (type === 'approve' && view.pending.expiresAt <= Date.now()) ||
      !begin(type === 'reject' ? 'Recording rejection' : 'Submitting approved request')
    )
      return;
    try {
      const result = await api<NpgView>({
        type,
        id: view.id,
        version: view.version,
        actionId: view.pending.id
      });
      setView(result);
      if (!narrow)
        setResultsOpen(
          (resultsPreference.current ?? !result.pending) && Boolean(result.sources.length)
        );
      await refreshList();
      if (result.pending) focusAfterNavigation(true);
      else {
        navigation.current = 'latest';
        setReveal((n) => n + 1);
      }
    } catch (error) {
      setNotice((error as Error).message);
      setNeedsRefresh(true);
    } finally {
      finish();
    }
  }
  useEffect(() => {
    if (didRestore.current) return;
    didRestore.current = true;
    const id = readStorage(currentKey);
    if (id && bootstrap.conversations.some((item) => item.id === id)) void open(id);
  }, []);
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useLayoutEffect(() => {
    const editor = inputRoot?.querySelector<HTMLElement>('[contenteditable]');
    if (!editor) {
      setDraftOverflows(false);
      setDraftScrolledDown(false);
      return;
    }
    const measure = () => {
      setDraftOverflows(editor.scrollHeight > editor.clientHeight + 1);
      setDraftScrolledDown(editor.scrollTop > 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(editor);
    editor.addEventListener('scroll', measure, { passive: true });
    return () => {
      observer.disconnect();
      editor.removeEventListener('scroll', measure);
    };
  }, [inputRoot, draft, narrow]);
  useLayoutEffect(() => {
    if (!reveal || !thread.current) return;
    const region = thread.current;
    if (focusIntent.current === 'review') {
      const heading = document.getElementById('npg-review-title');
      if (!heading) return;
      heading.focus({ preventScroll: true });
    } else if (focusIntent.current === 'composer') input.current?.focus();
    focusIntent.current = null;
    const saved = positions.current.get(conversationRef.current?.id ?? '');
    const isWelcome =
      !conversationRef.current?.messages.length && !submitted && !conversationRef.current?.pending;
    const top =
      navigation.current === 'restore' && saved
        ? saved.thread
        : navigation.current === 'review' && review.current
          ? review.current.getBoundingClientRect().top -
            region.getBoundingClientRect().top +
            region.scrollTop
          : isWelcome
            ? 0
            : region.scrollHeight;
    return moveScroll(region, top, navigation.current === 'restore');
  }, [reveal, conversation?.pending?.id]);
  useLayoutEffect(() => {
    const region = inlineResults.current;
    if (!resultsOpen) {
      if (paneReturnFocus.current) {
        paneReturnFocus.current = false;
        if (conversationRef.current?.pending)
          document.getElementById('npg-review-title')?.focus({ preventScroll: true });
        else evidenceToggleRef.current?.focus({ preventScroll: true });
      }
      return;
    }
    if (!region) return;
    moveScroll(region, positions.current.get(conversation?.id ?? '')?.evidence ?? 0, true);
    if (narrow) document.getElementById('npg-evidence-title')?.focus({ preventScroll: true });
    const context = gsap.context(() => {
      gsap.fromTo(
        region,
        { opacity: reducedMotion() ? 1 : 0, x: reducedMotion() ? 0 : 6 },
        {
          opacity: 1,
          x: 0,
          duration: reducedMotion() ? 0 : 0.2,
          clearProps: 'opacity,transform',
          overwrite: true
        }
      );
    });
    return () => {
      stopScroll(region);
      context.revert();
    };
  }, [resultsOpen, narrow, conversation?.id]);
  function closeResults() {
    rememberPosition();
    resultsPreference.current = false;
    writeStorage('npg-evidence:' + bootstrap.owner, 'closed');
    setResultsOpen(false);
    paneReturnFocus.current = true;
  }
  const expired = Boolean(conversation?.pending && conversation.pending.expiresAt <= clock);
  const navigating = busy && (operation === 'Creating conversation' || operation === 'Loading conversation');
  const canSend =
    !busy &&
    !needsRefresh &&
    Boolean(draft.trim()) &&
    (!conversation || conversation.status === 'idle');
  const title =
    conversations.find((item) => item.id === conversation?.id)?.title ?? 'Candidate research';
  const status = busy
    ? operation
    : needsRefresh
      ? 'Check saved conversation'
      : expired
        ? 'Review expired'
        : conversation
          ? conversationStatus(conversation.status)
          : 'Ready';
  const blocked =
    needsRefresh ||
    conversation?.status === 'running' ||
    conversation?.status === 'ambiguous' ||
    conversation?.status === 'interrupted';
  const instruction = conversation?.pending
    ? 'Review or reject the action above before sending another question.'
    : blocked
      ? 'Refresh the conversation to check what was saved before sending again.'
      : 'Registry evidence first. Paid actions need your review.';
  const titleHeading = (
    <Heading
      level={3}
      accessibilityLevel={1}
      maxLines={1}
      wordBreak="break-word"
      className={
        narrow && (conversation?.pending || (resultsOpen && smallPhone && shortViewport))
          ? 'npg-thread-title sr-only'
          : 'npg-thread-title flex-1 min-w-0'
      }
    >
      {title}
    </Heading>
  );
  const statusContent = (
    <HStack
      gap={1}
      className={
        'npg-state shrink-0 ' +
        (busy
          ? 'text-state-info'
          : conversation?.pending
            ? 'text-state-review'
            : blocked
              ? 'text-state-error'
              : 'text-state-neutral')
      }
      role="status"
    >
      <Icon
        icon={
          busy
            ? Clock
            : conversation?.pending
              ? ClipboardCheck
              : blocked
                ? TriangleAlert
                : CircleCheck
        }
        size="sm"
      />
      <Text type="supporting" color="inherit" textWrap="nowrap">
        {status}
      </Text>
    </HStack>
  );
  useLayoutEffect(() => {
    const context = gsap.context(() => {
      gsap.fromTo(
        '.npg-state',
        { opacity: reducedMotion() ? 1 : 0.45 },
        {
          opacity: 1,
          duration: reducedMotion() ? 0 : 0.16,
          overwrite: true,
          clearProps: 'opacity'
        }
      );
    }, document.getElementById('npg-app')!);
    return () => context.revert();
  }, [status, notice]);
  const evidenceToggle = (
    <Button
      label={
        'Results & evidence · ' +
        (conversation?.sources.length ?? 0) +
        ((conversation?.sources.length ?? 0) === 1 ? ' source' : ' sources')
      }
      variant="secondary"
      ref={evidenceToggleRef}
      className="npg-results-toggle min-h-control"
      aria-expanded={resultsOpen}
      aria-controls={narrow ? 'npg-inline-results' : 'npg-desktop-results'}
      onClick={toggleResults}
    >
      Evidence · {conversation?.sources.length ?? 0}{' '}
      {(conversation?.sources.length ?? 0) === 1 ? 'source' : 'sources'}
    </Button>
  );
  const latestToggle = !conversation?.pending && !(narrow && resultsOpen) && (
    <VStack gap={0} className="npg-latest-affordance">
      <Button
        label="Latest message"
        variant="ghost"
        className="min-h-control"
        isDisabled={atLatest}
        onClick={() => {
          navigation.current = 'latest';
          setReveal((n) => n + 1);
        }}
      >
        Latest
      </Button>
    </VStack>
  );
  const evidenceTop = (
    <VStack gap={0} className="npg-evidence-scroll-affordance">
      <Button
        label="Top of evidence"
        variant="ghost"
        className="min-h-control"
        isDisabled={evidenceAtTop}
        icon={<Icon icon={ArrowUp} size="sm" />}
        onClick={() => {
          if (inlineResults.current) moveScroll(inlineResults.current, 0);
        }}
      >
        Top
      </Button>
    </VStack>
  );
  const empty = !conversation?.messages.length && !submitted && !conversation?.pending;
  const summary = conversation?.pending
    ? decisionSummary(conversation.pending, conversation.sources)
    : null;
  const terms = conversation?.pending ? reviewFields(conversation.pending.review) : [];
  const argumentFields = conversation?.pending ? reviewFields(conversation.pending.arguments) : [];
  const duplicateTargetOnly =
    argumentFields.length === 1 &&
    argumentFields[0].label === 'Candidate NPI' &&
    summary?.target === 'NPI ' + argumentFields[0].value;
  const composer = conversation?.pending ? (
    <Section
      padding={1}
      paddingInline={2}
      variant="section"
      dividers={['top']}
      className="npg-review-decision-bar max-w-reading mx-auto w-full"
    >
      <VStack gap={1}>
        <VStack gap={0.5} className="npg-review-summary" id="npg-decision-context">
          <HStack gap={2} justify="between" wrap="wrap">
            <Text weight="semibold">{summary?.title}</Text>
            <Text>
              <Text type="supporting">
                {summary?.priceLabel === 'Maximum' ? 'Max' : summary?.priceLabel}{' '}
              </Text>
              <Text weight="semibold">{summary?.price}</Text>
            </Text>
          </HStack>
          {summary?.name && (
            <HStack gap={1} className="min-w-0">
              <Text type="supporting" size="base" maxLines={1} className="min-w-0">
                {summary.name}
              </Text>
              <Text type="supporting" size="base" color="secondary" className="shrink-0">
                (unverified)
              </Text>
            </HStack>
          )}
          <HStack gap={2} justify="between" wrap="wrap">
            <Text wordBreak="break-word" className="min-w-0">
              {summary?.target}
            </Text>
            <Text type="body" color="primary" weight="semibold" role="status">
              {expired
                ? 'Review expired'
                : 'Expires ' +
                  new Date(conversation!.pending!.expiresAt).toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
            </Text>
          </HStack>
        </VStack>
        <HStack gap={2} wrap="wrap">
          <Button
            variant={expired ? 'secondary' : 'primary'}
            icon={narrow ? undefined : <Icon icon={ClipboardCheck} />}
            label="Approve this action"
            className="min-h-control"
            aria-describedby="npg-decision-context"
            isDisabled={busy || needsRefresh || expired}
            onClick={() => void decide('approve')}
          >
            Approve
          </Button>
          <Button
            label="Reject action"
            className="min-h-control"
            variant="secondary"
            isDisabled={busy || needsRefresh}
            onClick={() => void decide('reject')}
          >
            Reject
          </Button>
          <Button
            variant="ghost"
            label="Read terms"
            tooltip="Back to request"
            className="min-h-control"
            onClick={() => focusAfterNavigation(true)}
          >
            Read terms
          </Button>
        </HStack>
      </VStack>
    </Section>
  ) : (
    <Section
      className="npg-composer-surface max-w-reading mx-auto w-full"
      variant="section"
      padding={empty ? 0 : 3}
    >
      <VStack gap={2}>
        <Text color={empty ? 'primary' : 'secondary'} weight={empty ? 'medium' : 'normal'}>
          {empty ? 'Your question' : instruction}
        </Text>
        <Theme theme={npgComposerTheme} mode="light">
          <ChatComposer
            isDisabled={navigating}
            aria-busy={navigating}
            value={draft}
            onChange={changeDraft}
            onSubmit={(value) => void send(value)}
            elevation="none"
            density="balanced"
            input={
              <ChatComposerInput
                label="Your question"
                ref={setInputRoot}
                aria-describedby={draftOverflows ? 'npg-draft-scroll-hint' : undefined}
                value={draft}
                onChange={changeDraft}
                hasHistory={false}
                pasteAsToken={false}
                maxRows={narrow ? (empty && !shortViewport ? 6 : 3) : 5}
                className="min-h-control"
                enterKeyHint="enter"
                placeholder={
                  empty
                    ? 'Describe the specialty and location…'
                    : 'Ask a follow-up about these results…'
                }
                handleRef={input}
                onFocus={(event) => {
                  // Astryx 0.7.14 can remount an empty editable without a line box
                  // when a mobile history dialog closes. Preserve an empty line,
                  // not a draft character, so pointer and keyboard editing agree.
                  const editor = event.target;
                  if (
                    editor instanceof HTMLElement &&
                    editor.isContentEditable &&
                    !editor.hasChildNodes()
                  )
                    editor.append(document.createElement('br'));
                }}
                onKeyDown={(event) => {
                  if (
                    event.key !== 'Enter' ||
                    event.nativeEvent.isComposing ||
                    event.nativeEvent.keyCode === 229
                  )
                    return;
                  event.preventDefault();
                  if (event.metaKey || event.ctrlKey) void send();
                  else document.execCommand('insertLineBreak');
                }}
              />
            }
            footerActions={
              <VStack gap={0}>
                <Text type="supporting" color="secondary" hasTabularNumbers>
                  {!narrow && 'Ctrl / ⌘ + Enter'}
                  {draft.length > 0 && (!narrow ? ' · ' : '') + draft.length + '/6,000'}
                </Text>
                {draftOverflows && (
                  <Text id="npg-draft-scroll-hint" type="supporting" color="secondary">
                    {draftScrolledDown ? 'Scroll up to review' : 'Scroll down to review'}
                  </Text>
                )}
              </VStack>
            }
            sendButton={
              <Button
                icon={<Icon icon={ArrowUp} />}
                label={busy && submitted ? 'Working…' : 'Send question'}
                className="min-h-control"
                variant={canSend ? 'primary' : 'secondary'}
                isDisabled={!canSend}
                onClick={() => void send()}
              />
            }
          />
        </Theme>
      </VStack>
    </Section>
  );
  useLayoutEffect(() => {
    const region = thread.current;
    if (!region) return;
    const prior = priorFeedback.current;
    const id = conversation?.id ?? '';
    const count = conversation?.messages.length ?? 0;
    const pending = conversation?.pending?.id ?? '';
    const targets: Element[] = [];
    if (prior.id === id && count > prior.count)
      targets.push(...Array.from(region.querySelectorAll('.npg-saved-message')).slice(prior.count));
    if (submitted && submitted !== prior.submitted)
      targets.push(...region.querySelectorAll('.npg-submitted-message,.npg-working-feedback'));
    if (notice && notice !== prior.notice)
      targets.push(...region.querySelectorAll('.npg-error-feedback'));
    if (pending && pending !== prior.pending)
      targets.push(...region.querySelectorAll('.npg-review'));
    priorFeedback.current = { id, count, submitted, notice, pending };
    if (!targets.length) return;
    const context = gsap.context(() => {
      gsap.fromTo(
        targets,
        { opacity: reducedMotion() ? 1 : 0.65 },
        {
          opacity: 1,
          duration: reducedMotion() ? 0 : 0.16,
          clearProps: 'opacity'
        }
      );
    });
    return () => context.revert();
  }, [
    conversation?.id,
    conversation?.messages.length,
    conversation?.pending?.id,
    submitted,
    notice
  ]);
  const savedMessages = conversation?.messages.map((message, index) => (
    <ChatMessage key={index} sender={message.role} className="npg-saved-message">
      <ChatMessageBubble
        name={message.role === 'user' ? 'You' : 'NPG analyst'}
        variant={message.role === 'user' ? 'filled' : 'ghost'}
        width="100%"
      >
        <Prose text={message.text} assistant={message.role === 'assistant'} />
      </ChatMessageBubble>
    </ChatMessage>
  ));
  return (
    <AppShell
      className="npg-shell"
      variant="section"
      contentPadding={0}
      mobileNav={{ isOpen: navOpen, onOpenChange: setNavOpen, breakpoint: 'xl' }}
      topNav={
        <TopNav
          label="NPG workspace"
          heading={
            <TopNavHeading
              logo={
                <img
                  src={npgLogo}
                  alt="The Nurse Practitioner Group"
                  width={441}
                  height={288}
                  className="w-12 lg:w-20 h-auto object-contain"
                />
              }
              heading={smallPhone ? 'Analyst' : 'Healthcare analyst'}
              superheading={smallPhone ? 'NPG · Private' : 'NPG · Private workspace'}
            />
          }
          endContent={
            <HStack gap={3} wrap="wrap">
              <Link
                href="/account"
                aria-label="Account"
                className="min-h-control min-w-control inline-flex items-center justify-center"
                hasUnderline
              >
                <HStack as="span" gap={2}>
                  <Icon icon={UserRound} size="sm" />
                  {!smallPhone && 'Account'}
                </HStack>
              </Link>
            </HStack>
          }
        />
      }
      sideNav={
        <SideNav
          aria-label="Your conversations"
          header={<SideNavHeading icon={<Icon icon={MessagesSquare} />} heading="Conversations" />}
          topContent={
            <Button
              icon={<Icon icon={Plus} />}
              label="New chat"
              isDisabled={busy}
              onClick={() => void create()}
            />
          }
          footer={
            conversations.length ? (
              <Text type="supporting" color="secondary">
                Only your account can open these conversations.
              </Text>
            ) : null
          }
        >
          {conversations.length ? (
            conversations.map((item) => (
              <SideNavItem
                key={item.id}
                className="history-item"
                label={item.title}
                aria-label={
                  item.title +
                  ' · ' +
                  conversationStatus(item.status) +
                  ' · ' +
                  new Date(item.updated_at).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric'
                  })
                }
                endContent={
                  <VStack as="span" gap={0} align="end">
                    <Text type="supporting" color="secondary">
                      {new Date(item.updated_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </Text>
                    {item.status !== 'idle' && (
                      <Text
                        type="supporting"
                        color={
                          ['running', 'review'].includes(item.status) ? 'primary' : 'secondary'
                        }
                      >
                        {conversationStatus(item.status)}
                      </Text>
                    )}
                  </VStack>
                }
                isSelected={item.id === conversation?.id}
                isDisabled={busy}
                onClick={() => void open(item.id, true)}
              />
            ))
          ) : (
            <Section padding={4} variant="transparent">
              <Text type="supporting" color="secondary">
                Your conversations will stay here. Only your signed-in account can open them.
              </Text>
            </Section>
          )}
        </SideNav>
      }
    >
      <HStack gap={0} height="100%" minHeight={0} className="npg-workspace min-w-0" align="stretch">
        <VStack gap={0} minHeight={0} className="npg-chat-column flex-1 min-w-0">
          <Section padding={narrow ? 2 : 4} dividers={['bottom']}>
            {narrow && (!tabletToolbar || empty) ? (
              empty ? (
                <HStack gap={2} justify="between">
                  {titleHeading}
                  {statusContent}
                </HStack>
              ) : (
                <VStack
                  gap={
                    conversation?.pending || (resultsOpen && smallPhone && shortViewport) ? 0 : 1
                  }
                >
                  {titleHeading}
                  <HStack gap={3} justify="between" wrap="wrap">
                    {statusContent}
                    {latestToggle}
                    {evidenceToggle}
                  </HStack>
                </VStack>
              )
            ) : (
              <HStack gap={3} justify="between" align={tabletToolbar ? 'center' : undefined}>
                {titleHeading}
                <HStack gap={3} align={tabletToolbar ? 'center' : undefined} className="shrink-0">
                  {statusContent}
                  {!empty && latestToggle}
                  {evidenceToggle}
                </HStack>
              </HStack>
            )}
          </Section>
          <VStack
            gap={0}
            minHeight={0}
            className={narrow && resultsOpen ? 'hidden' : 'flex flex-col flex-1 min-h-0'}
          >
            <ThreadSurface
              welcome={empty}
              reviewing={Boolean(conversation?.pending)}
              thread={thread}
              onScroll={(event) => recordScroll('thread', event.currentTarget)}
              composer={composer}
            >
              <ChatMessageList
                align="top"
                density="balanced"
                className="npg-messages max-w-reading mx-auto w-full"
                isStreaming={false}
              >
                <Section hidden={narrow && resultsOpen} padding={0} variant="transparent">
                  <VStack gap={6}>
                    {empty && (
                      <VStack
                        gap={4}
                        paddingBlock={narrow ? 3 : 6}
                        width="100%"
                        className="npg-welcome max-w-screen-sm mx-auto"
                      >
                        <VStack gap={3}>
                          <Heading level={1} accessibilityLevel={2}>
                            Who are you looking for?
                          </Heading>
                          <Text type="body" size="lg" color="secondary">
                            Start with a specialty and location. Find candidates, keep the complete
                            sourcing list, and check the evidence behind it.
                          </Text>
                        </VStack>
                        {composer}
                        <List
                          density="spacious"
                          hasDividers
                          edge="flush"
                          header={
                            <Text color="secondary">Try a preset, then edit before sending.</Text>
                          }
                        >
                          {examples.map((example) => (
                            <ListItem
                              key={example.label}
                              label={<Text weight="semibold">{example.label}</Text>}
                              description={<Text color="secondary">{example.detail}</Text>}
                              startContent={<Icon icon={example.icon} />}
                              endContent={<Icon icon={ArrowRight} size="sm" />}
                              align="first-line"
                              onClick={() => {
                                changeDraft(example.prompt);
                                input.current?.focus();
                              }}
                            />
                          ))}
                        </List>
                      </VStack>
                    )}
                    {!conversation?.pending && savedMessages}
                    {submitted && (
                      <ChatMessage sender="user" className="npg-submitted-message">
                        <ChatMessageBubble name="You" width="100%">
                          <Prose text={submitted} />
                        </ChatMessageBubble>
                      </ChatMessage>
                    )}
                    {busy && submitted && (
                      <Banner
                        className="npg-working-feedback"
                        status="info"
                        title="Working on your question"
                        description="Your answer will appear here when it is ready."
                      />
                    )}
                    {conversation?.pending && (
                      <Section
                        ref={review}
                        className="npg-review scroll-mt-4"
                        padding={narrow ? 0 : 4}
                        dividers={narrow ? [] : ['top', 'bottom', 'start', 'end']}
                        aria-labelledby="npg-review-title"
                      >
                        <VStack gap={3}>
                          <Heading id="npg-review-title" level={2} tabIndex={-1}>
                            Review: {summary?.title}
                          </Heading>
                          <VStack gap={1}>
                            {summary?.name && (
                              <Text weight="semibold" wordBreak="break-word">
                                {summary.name}{' '}
                                <Text weight="normal" color="secondary">
                                  (registry, unverified)
                                </Text>
                              </Text>
                            )}
                            <Text wordBreak="break-word">{summary?.target}</Text>
                          </VStack>
                          <Fields
                            compact={!narrow}
                            fields={terms.filter((field) => field.label === 'Provider')}
                          />
                          <Text>
                            Approve only this request. Contact consent remains unverified.
                          </Text>
                          <Fields
                            compact={!narrow}
                            fields={terms.filter((field) => field.label === 'Scope')}
                          />
                          <Divider />
                          <Fields
                            review
                            compact={!narrow}
                            fields={terms.filter(
                              (field) => !['Provider', 'Scope'].includes(field.label)
                            )}
                          />
                          {!duplicateTargetOnly && (
                            <>
                              <Divider />
                              <Heading level={3}>Request details</Heading>
                              <Fields compact={!narrow} fields={argumentFields} />
                            </>
                          )}
                          <Collapsible trigger="Exact request data" defaultIsOpen={false}>
                            <Text
                              as="p"
                              type="code"
                              display="block"
                              wordBreak="break-word"
                              className="npg-json whitespace-pre-wrap max-w-full overflow-auto"
                            >
                              {JSON.stringify(conversation.pending.arguments, null, 2)}
                            </Text>
                          </Collapsible>
                          <Divider />
                          {expired && (
                            <Text role="status" color="secondary">
                              This review has expired. Approval is unavailable.
                            </Text>
                          )}
                        </VStack>
                      </Section>
                    )}
                    {conversation?.pending && Boolean(conversation.messages.length) && (
                      <Collapsible trigger="Conversation context" defaultIsOpen={false}>
                        <VStack gap={6} paddingBlock={3}>
                          {savedMessages}
                        </VStack>
                      </Collapsible>
                    )}
                    {notice && (
                      <Banner
                        className="npg-error-feedback"
                        status="error"
                        title="Could not complete the request"
                        description={notice}
                        role="alert"
                      />
                    )}
                    {(notice || blocked) && (
                      <Button
                        icon={<Icon icon={RefreshCw} />}
                        label="Refresh history"
                        className="min-h-control"
                        variant={needsRefresh ? 'primary' : 'secondary'}
                        isDisabled={busy}
                        onClick={() => void refresh()}
                      />
                    )}
                  </VStack>
                </Section>
              </ChatMessageList>
            </ThreadSurface>
          </VStack>
          {narrow && resultsOpen && (
            <VStack gap={0} minHeight={0} className="flex-1 min-w-0">
              <VStack
                ref={inlineResults}
                onScroll={(event) => recordScroll('evidence', event.currentTarget)}
                id="npg-inline-results"
                isScrollable
                minHeight={0}
                padding={4}
                className="npg-inline-results flex-1 min-w-0"
              >
                <Evidence
                  key={conversation?.id ?? 'new'}
                  sources={conversation?.sources ?? []}
                  conversationTitle={title}
                />
              </VStack>
              <Section padding={2} dividers={['top']} variant="section">
                <HStack gap={2} justify="between">
                  <Button
                    icon={<Icon icon={ArrowLeft} />}
                    label="Back to conversation"
                    className="min-h-control"
                    onClick={closeResults}
                  />
                  {evidenceTop}
                </HStack>
              </Section>
            </VStack>
          )}
        </VStack>
        {!narrow && resultsOpen && (
          <Section
            height="100%"
            padding={0}
            dividers={['start']}
            className="w-evidence shrink-0 min-w-0"
          >
            <VStack gap={0} height="100%" minHeight={0}>
              <Section
                ref={inlineResults}
                onScroll={(event) => recordScroll('evidence', event.currentTarget)}
                id="npg-desktop-results"
                className="npg-evidence flex-1 overflow-auto min-w-0 min-h-0"
                padding={6}
                aria-label="Results and evidence"
              >
                <Evidence
                  key={conversation?.id ?? 'new'}
                  sources={conversation?.sources ?? []}
                  conversationTitle={title}
                />
              </Section>
              <Section padding={2} dividers={['top']} variant="section">
                {evidenceTop}
              </Section>
            </VStack>
          </Section>
        )}
      </HStack>
    </AppShell>
  );
}
