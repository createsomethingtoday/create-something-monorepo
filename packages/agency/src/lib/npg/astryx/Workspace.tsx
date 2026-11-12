// Frame adapted from Astryx's MIT ai-chat template; content and policy remain NPG-owned.
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AppShell } from '@astryxdesign/core/AppShell';
import { TopNav, TopNavHeading } from '@astryxdesign/core/TopNav';
import { SideNav, SideNavHeading, SideNavItem } from '@astryxdesign/core/SideNav';
import {
  ChatLayout,
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
import { Collapsible } from '@astryxdesign/core/Collapsible';
import {
  actionLabel,
  conversationStatus,
  linkParts,
  readDrafts,
  reviewFields,
  sourceArtifact,
  type NpgView
} from '../display';
import { decisionSummary } from './presentation';
import type { HistoryItem, NpgBootstrap } from './types';

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
function useNarrow() {
  const [narrow, setNarrow] = useState(() => matchMedia('(max-width: 1024px)').matches);
  useEffect(() => {
    const query = matchMedia('(max-width: 1024px)');
    const update = () => setNarrow(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return narrow;
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
  evidence = false
}: {
  fields: Array<{ label: string; value: string }>;
  compact?: boolean;
  review?: boolean;
  evidence?: boolean;
}) {
  const currency = fields.find((field) => field.label === 'Currency')?.value;
  const rows = fields.flatMap((field) =>
    review && field.label === 'Limits' ? (knownLimitGroups(field.value) ?? [field]) : [field]
  );

  return (
    <MetadataList
      label={{
        position: compact ? 'start' : 'top',
        width: compact ? 'calc(var(--spacing-10) * 3)' : undefined
      }}
      columns="single"
    >
      {rows.map((field, index) => (
        <MetadataListItem
          key={index}
          label={field.label.charAt(0).toUpperCase() + field.label.slice(1)}
        >
          {review && ['Limits', 'Run limits', 'Access and sharing'].includes(field.label) ? (
            <ReviewLimits
              text={field.value}
              warning={'warning' in field ? String(field.warning) : undefined}
              explanation={'explanation' in field ? String(field.explanation) : undefined}
            />
          ) : (
            <Text
              size={evidence ? 'lg' : undefined}
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
function Evidence({ sources }: { sources: NpgView['sources'] }) {
  return (
    <VStack gap={6} className="npg-evidence-content min-w-0">
      <VStack gap={2}>
        <HStack gap={2}>
          <Icon icon={FileCheck2} />
          <Heading id="npg-evidence-title" level={2} tabIndex={-1}>
            Results &amp; evidence
          </Heading>
        </HStack>
        <Text color="secondary">
          Saved with this conversation. CSV downloads require NPG sign-in.
        </Text>
      </VStack>
      {sources.length ? (
        sources.map((source, index) => {
          const artifact = sourceArtifact(source.data);
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
                gap={4}
                className="npg-source min-w-0"
                aria-labelledby={'source-' + index}
              >
                <VStack gap={1}>
                  <Text type="supporting" color="secondary">
                    Source {index + 1}
                  </Text>
                  <Heading id={'source-' + index} level={3}>
                    {actionLabel(source.tool)}
                  </Heading>
                </VStack>
                {(artifact.total !== null || artifact.shown !== null) && (
                  <VStack gap={1}>
                    <Text type="large" size="2xl" weight="semibold" hasTabularNumbers>
                      {artifact.total === null
                        ? 'Total not supplied'
                        : artifact.total.toLocaleString() +
                          (source.tool === 'search_registry_sourcing' ? ' records' : ' total')}
                    </Text>
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
                    {[
                      {
                        title: 'Source facts',
                        fields: artifact.fields.filter((field) =>
                          [
                            'Source published',
                            'Source fetched',
                            'Taxonomy scope',
                            'source',
                            'retrieved at',
                            'Snapshot',
                            'Snapshot ID',
                            'Snapshot taxonomy scope',
                            'Snapshot published'
                          ].includes(field.label)
                        )
                      },
                      {
                        title: 'Coverage & limitations',
                        fields: artifact.fields.filter(
                          (field) =>
                            ![
                              'Source run',
                              'limit',
                              'offset',
                              'Source published',
                              'Source fetched',
                              'Taxonomy scope',
                              'source',
                              'retrieved at',
                              'Snapshot',
                              'Snapshot ID',
                              'Snapshot taxonomy scope',
                              'Snapshot published'
                            ].includes(field.label)
                        )
                      }
                    ]
                      .filter((group) => group.fields.length)
                      .map((group) => (
                        <VStack gap={3} key={group.title}>
                          <Heading level={4}>{group.title}</Heading>
                          <Fields evidence fields={group.fields} />
                        </VStack>
                      ))}
                    {(artifact.links.length > 0 ||
                      artifact.fields.some((field) =>
                        ['Source run', 'limit', 'offset'].includes(field.label)
                      )) && (
                      <Collapsible trigger="Source details & provenance" defaultIsOpen={false}>
                        <VStack paddingBlock={3} gap={3}>
                          {artifact.links.map((href) => (
                            <VStack key={href} gap={1}>
                              <Text type="supporting">Download address</Text>
                              <Text size="sm" wordBreak="break-all">
                                {href}
                              </Text>
                            </VStack>
                          ))}
                          <Fields
                            evidence
                            fields={artifact.fields.filter((field) =>
                              ['Source run', 'limit', 'offset'].includes(field.label)
                            )}
                          />
                        </VStack>
                      </Collapsible>
                    )}
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
  const [clock, setClock] = useState(Date.now());
  const [reveal, setReveal] = useState(0);
  const narrow = useNarrow();
  const input = useRef<ChatComposerInputHandle | null>(null);
  const thread = useRef<HTMLDivElement | null>(null);
  const review = useRef<HTMLElement | null>(null);
  const inlineResults = useRef<HTMLElement | null>(null);
  const didRestore = useRef(false);
  const focusIntent = useRef<'review' | 'composer' | null>(null);
  function setView(view: NpgView | null) {
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
  function focusAfterNavigation(hasReview = false) {
    const focus = () =>
      requestAnimationFrame(() => {
        // A frame can precede React's commit for substantial saved evidence.
        // Consume the intent in the layout effect once the returned view exists.
        focusIntent.current = hasReview ? 'review' : 'composer';
        setReveal((n) => n + 1);
      });
    const dialog = document.querySelector<HTMLDialogElement>('dialog[open]');
    if (dialog) dialog.addEventListener('close', focus, { once: true });
    else focus();
  }
  async function open(id: string, moveFocus = false) {
    if (!begin('Loading conversation')) return;
    try {
      const view = await api<NpgView>(undefined, id);
      setView(view);
      changeDraft(drafts.current[id] ?? '');
      setNeedsRefresh(view.status === 'running');
      if (moveFocus) setResultsOpen(false);
      if (moveFocus) focusAfterNavigation(Boolean(view.pending));
      setNavOpen(false);
      rememberCurrent(id);
      if (!moveFocus) setReveal((n) => n + 1);
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
      focusAfterNavigation();
      setNavOpen(false);
      rememberCurrent(view.id);
      await refreshList();
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
      setView(result);
      await refreshList();
      if (result.pending) focusAfterNavigation(true);
      else setReveal((n) => n + 1);
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
      await refreshList();
      if (result.pending) focusAfterNavigation(true);
      else setReveal((n) => n + 1);
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
    if (!reveal || !thread.current) return;
    if (focusIntent.current === 'review') {
      const heading = document.getElementById('npg-review-title');
      if (!heading) return;
      heading.focus({ preventScroll: true });
      focusIntent.current = null;
    } else if (focusIntent.current === 'composer' && input.current) {
      input.current.focus();
      focusIntent.current = null;
    }
    let settle = 0;
    const frame = requestAnimationFrame(() => {
      settle = requestAnimationFrame(() => {
        const region = thread.current;
        if (!region) return;
        if (review.current)
          region.scrollTo({
            top:
              review.current.getBoundingClientRect().top -
              region.getBoundingClientRect().top +
              region.scrollTop,
            behavior: 'instant'
          });
        else region.scrollTo({ top: region.scrollHeight, behavior: 'instant' });
      });
    });
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(settle);
    };
  }, [reveal, conversation?.pending?.id]);
  useLayoutEffect(() => {
    if (resultsOpen && narrow) {
      document.getElementById('npg-evidence-title')?.focus({ preventScroll: true });
      inlineResults.current?.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [resultsOpen, narrow]);
  function closeResults() {
    setResultsOpen(false);
    focusAfterNavigation(Boolean(conversationRef.current?.pending));
  }
  const expired = Boolean(conversation?.pending && conversation.pending.expiresAt <= clock);
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
      ? 'Readback required'
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
      ? 'Check the saved conversation before another request. Uncertain outcomes need reconciliation.'
      : 'Registry evidence first. Paid actions need your review.';
  const titleHeading = (
    <Heading
      level={3}
      accessibilityLevel={1}
      maxLines={narrow ? 1 : 2}
      wordBreak="break-word"
      className={
        narrow && conversation?.pending ? 'npg-thread-title sr-only' : 'npg-thread-title min-w-0'
      }
    >
      {title}
    </Heading>
  );
  const statusContent = (
    <HStack gap={1} className="npg-state shrink-0" role="status">
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
      <Text type="supporting" color="secondary" textWrap="nowrap">
        {status}
      </Text>
    </HStack>
  );
  const evidenceToggle = (
    <Button
      label={
        'Results & evidence · ' +
        (conversation?.sources.length ?? 0) +
        ((conversation?.sources.length ?? 0) === 1 ? ' source' : ' sources')
      }
      variant="secondary"
      size="sm"
      className="npg-results-toggle"
      aria-expanded={resultsOpen}
      aria-controls={narrow ? 'npg-inline-results' : 'npg-desktop-results'}
      onClick={() => (resultsOpen ? closeResults() : setResultsOpen(true))}
    >
      Evidence · {conversation?.sources.length ?? 0}{' '}
      {(conversation?.sources.length ?? 0) === 1 ? 'source' : 'sources'}
    </Button>
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
            variant="primary"
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
        <ChatComposer
          value={draft}
          onChange={changeDraft}
          onSubmit={(value) => void send(value)}
          elevation="none"
          density="compact"
          input={
            <ChatComposerInput
              label="Your question"
              value={draft}
              onChange={changeDraft}
              hasHistory={false}
              pasteAsToken={false}
              maxRows={3}
              enterKeyHint="enter"
              placeholder={
                empty
                  ? 'Example: family NPs near Springfield, MO'
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
            <Text type="supporting" color="secondary">
              {!narrow && 'Ctrl / ⌘ + Enter'}
              {draft.length > 0 && (!narrow ? ' · ' : '') + draft.length + '/6,000'}
            </Text>
          }
          sendButton={
            <Button
              icon={<Icon icon={ArrowUp} />}
              label={busy && submitted ? 'Working…' : 'Send question'}
              className="min-h-control"
              variant="primary"
              isDisabled={!canSend}
              onClick={() => void send()}
            />
          }
        />
      </VStack>
    </Section>
  );
  const savedMessages = conversation?.messages.map((message, index) => (
    <ChatMessage key={index} sender={message.role}>
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
      mobileNav={{ isOpen: navOpen, onOpenChange: setNavOpen, breakpoint: 'md' }}
      topNav={
        <TopNav
          label="NPG workspace"
          heading={
            <TopNavHeading heading="Healthcare analyst" superheading="NPG · Private workspace" />
          }
          endContent={
            <HStack gap={3} wrap="wrap">
              <Link href="/account" hasUnderline>
                <HStack as="span" gap={2}>
                  <Icon icon={UserRound} size="sm" />
                  Account
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
            {narrow ? (
              empty ? (
                <HStack gap={2} justify="between">
                  {titleHeading}
                  {statusContent}
                </HStack>
              ) : (
                <VStack gap={conversation?.pending ? 0 : 1}>
                  {titleHeading}
                  <HStack gap={3} justify="between" wrap="wrap">
                    {statusContent}
                    {evidenceToggle}
                  </HStack>
                </VStack>
              )
            ) : (
              <HStack gap={3} justify="between" wrap="wrap">
                {titleHeading}
                <HStack gap={3}>
                  {statusContent}
                  {conversation?.pending && evidenceToggle}
                </HStack>
              </HStack>
            )}
          </Section>
          <VStack
            gap={0}
            minHeight={0}
            className={narrow && resultsOpen ? 'hidden' : 'flex flex-col flex-1 min-h-0'}
          >
            <ChatLayout
              className="npg-thread min-w-0 min-h-0"
              ref={thread}
              density="compact"
              scrollButton={null}
              composer={empty ? null : composer}
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
                      <ChatMessage sender="user">
                        <ChatMessageBubble name="You" width="100%">
                          <Prose text={submitted} />
                        </ChatMessageBubble>
                      </ChatMessage>
                    )}
                    {busy && submitted && (
                      <Banner
                        status="info"
                        title="Working on your question"
                        description="The response arrives together after the model and permitted tools finish."
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
                            fields={terms.filter((field) => field.label === 'Scope')}
                          />
                          <Text>
                            Approve only this request. Contact consent remains unverified.
                          </Text>
                          <Divider />
                          <Fields
                            review
                            compact={!narrow}
                            fields={terms.filter((field) => field.label !== 'Scope')}
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
                        variant="secondary"
                        isDisabled={busy}
                        onClick={() => void refresh()}
                      />
                    )}
                  </VStack>
                </Section>
              </ChatMessageList>
            </ChatLayout>
          </VStack>
          {narrow && resultsOpen && (
            <VStack gap={0} minHeight={0} className="flex-1 min-w-0">
              <VStack
                ref={inlineResults}
                id="npg-inline-results"
                isScrollable
                minHeight={0}
                padding={4}
                className="npg-inline-results flex-1 min-w-0"
              >
                <Evidence sources={conversation?.sources ?? []} />
              </VStack>
              <Section padding={2} dividers={['top']} variant="section">
                <Button
                  icon={<Icon icon={ArrowLeft} />}
                  label="Back to conversation"
                  className="min-h-control"
                  onClick={closeResults}
                />
              </Section>
            </VStack>
          )}
        </VStack>
        {!narrow &&
          (conversation?.pending ? resultsOpen : Boolean(conversation?.sources.length)) && (
            <Section
              id="npg-desktop-results"
              className="npg-evidence w-80 xl:w-evidence shrink-0 overflow-auto min-w-0"
              height="100%"
              padding={6}
              dividers={['start']}
              aria-label="Results and evidence"
            >
              <Evidence sources={conversation?.sources ?? []} />
            </Section>
          )}
      </HStack>
    </AppShell>
  );
}
