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
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Divider } from '@astryxdesign/core/Divider';
import { Section } from '@astryxdesign/core/Section';
import { Button } from '@astryxdesign/core/Button';
import { Banner } from '@astryxdesign/core/Banner';
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
  TriangleAlert
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
import type { HistoryItem, NpgBootstrap } from './types';

const endpoint = '/delivery/abundance/healthcare-analyst/api';
const examples = [
  'Find FNP and adult-gerontology NP candidates in Springfield, MO, with a complete sourcing CSV.',
  'Find NPs within 25 miles of a clinic street address. Ask me for the address first.',
  'Show coverage freshness, taxonomy scope, and unresolved records for the nationwide snapshot.'
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
function Prose({ text }: { text: string }) {
  return (
    <Text as="p" size="lg" wordBreak="break-word" className="npg-prose whitespace-pre-wrap">
      {linkParts(text).map((part, index) =>
        part.href ? (
          <Link key={index} href={part.href} isExternalLink hasUnderline>
            {part.text}
          </Link>
        ) : (
          <React.Fragment key={index}>{part.text}</React.Fragment>
        )
      )}
    </Text>
  );
}
function Fields({ fields }: { fields: Array<{ label: string; value: string }> }) {
  return (
    <MetadataList label={{ position: 'top' }} columns="single">
      {fields.map((field, index) => (
        <MetadataListItem key={index} label={field.label}>
          <Text wordBreak="break-word" className="whitespace-pre-wrap">
            {field.value}
          </Text>
        </MetadataListItem>
      ))}
    </MetadataList>
  );
}
function Evidence({ sources }: { sources: NpgView['sources'] }) {
  return (
    <VStack gap={6} className="npg-evidence-content min-w-0">
      <VStack gap={2}>
        <Heading level={2}>Results &amp; exports</Heading>
        <Text type="supporting" color="secondary">
          Saved with this conversation. CSV downloads require NPG sign-in.
        </Text>
      </VStack>
      {sources.length ? (
        sources.map((source, index) => {
          const artifact = sourceArtifact(source.data);
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
                    <Text type="large" weight="semibold">
                      {artifact.total === null
                        ? 'Total not supplied'
                        : artifact.total.toLocaleString() + ' total'}
                    </Text>
                    <Text type="supporting" color="secondary">
                      {artifact.shown === null
                        ? 'Shown count not supplied'
                        : artifact.shown.toLocaleString() + ' shown in response'}
                    </Text>
                  </VStack>
                )}
                {artifact.links.map((href) => (
                  <VStack key={href} gap={1}>
                    <Link className="source-link" href={href} hasUnderline isExternalLink>
                      <HStack as="span" gap={2}>
                        {href.startsWith('/delivery/') && <Icon icon={Download} size="sm" />}
                        {href.startsWith('/delivery/') ? 'Download complete CSV' : 'Open source'}
                      </HStack>
                    </Link>
                    <Text type="supporting" color="secondary" wordBreak="break-all">
                      {href}
                    </Text>
                  </VStack>
                ))}
                {artifact.fields.length > 0 && <Fields fields={artifact.fields} />}
                {artifact.sections.map((section, i) => (
                  <Collapsible key={i} trigger={section.title} defaultIsOpen={false}>
                    <VStack paddingBlock={3}>
                      <Fields fields={section.fields} />
                    </VStack>
                  </Collapsible>
                ))}
                {artifact.records.length > 0 && (
                  <Collapsible
                    trigger={
                      'Returned records · preview ' +
                      artifact.previewCount +
                      ' of ' +
                      (artifact.shown ?? 'unknown')
                    }
                    defaultIsOpen={false}
                  >
                    <VStack gap={4} paddingBlock={3}>
                      {artifact.records.map((fields, i) => (
                        <VStack key={i} gap={2}>
                          <Heading level={4}>Record {i + 1}</Heading>
                          <Fields fields={fields} />
                        </VStack>
                      ))}
                      <Text type="supporting" color="secondary">
                        This preview includes up to five returned source records.
                      </Text>
                    </VStack>
                  </Collapsible>
                )}
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
    if (resultsOpen && narrow)
      inlineResults.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, [resultsOpen, narrow]);
  const expired = Boolean(conversation?.pending && conversation.pending.expiresAt <= clock);
  const canSend =
    !busy &&
    !needsRefresh &&
    Boolean(draft.trim()) &&
    (!conversation || conversation.status === 'idle');
  const title =
    conversations.find((item) => item.id === conversation?.id)?.title ?? 'New conversation';
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
      maxLines={2}
      wordBreak="break-word"
      className="npg-thread-title min-w-0"
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
      label={'Results & evidence (' + (conversation?.sources.length ?? 0) + ')'}
      variant="secondary"
      className="npg-results-toggle"
      aria-expanded={resultsOpen}
      aria-controls="npg-inline-results"
      onClick={() => setResultsOpen(!resultsOpen)}
    />
  );
  const composer = (
    <Section className="npg-composer-surface" variant="section" padding={2}>
      <VStack gap={2}>
        <Text type="supporting" color="secondary">
          {instruction}
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
              placeholder="Ask the NPG analyst…"
              handleRef={input}
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
              Ctrl / ⌘ + Enter · {draft.length}/6,000
            </Text>
          }
          sendButton={
            <Button
              icon={<Icon icon={ArrowUp} />}
              label={busy && submitted ? 'Working…' : 'Send question'}
              isDisabled={!canSend}
              onClick={() => void send()}
            />
          }
        />
      </VStack>
    </Section>
  );
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
            <Text type="supporting" color="secondary">
              Your account only. Registry evidence first.
            </Text>
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
          <Section padding={4} dividers={['bottom']}>
            {narrow ? (
              <VStack gap={3}>
                {titleHeading}
                <HStack gap={3} justify="between" wrap="wrap">
                  {statusContent}
                  {evidenceToggle}
                </HStack>
              </VStack>
            ) : (
              <HStack gap={3} justify="between" wrap="wrap">
                {titleHeading}
                {statusContent}
              </HStack>
            )}
          </Section>
          <ChatLayout
            className="npg-thread min-w-0 min-h-0"
            ref={thread}
            density="compact"
            scrollButton={null}
            composer={composer}
          >
            <ChatMessageList
              align="top"
              density="compact"
              className="npg-messages"
              isStreaming={false}
            >
              {!conversation?.messages.length && !submitted && (
                <VStack gap={4} width="100%" className="npg-welcome max-w-screen-sm mx-auto">
                  <Heading level={2}>Start with the people you need to find.</Heading>
                  <Text color="secondary">
                    Ask about a location, taxonomy, or candidate. Keep the complete sourcing list
                    and inspect what the registry can—and cannot—tell you.
                  </Text>
                  <VStack gap={2}>
                    {examples.map((text) => (
                      <Button
                        key={text}
                        variant="secondary"
                        label={text}
                        onClick={() => {
                          changeDraft(text);
                          input.current?.focus();
                        }}
                      />
                    ))}
                  </VStack>
                </VStack>
              )}
              {conversation?.messages.map((message, index) => (
                <ChatMessage key={index} sender={message.role}>
                  <ChatMessageBubble
                    name={message.role === 'user' ? 'You' : 'NPG analyst'}
                    variant={message.role === 'user' ? 'filled' : 'ghost'}
                    width="100%"
                  >
                    <Prose text={message.text} />
                  </ChatMessageBubble>
                </ChatMessage>
              ))}
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
                  padding={4}
                  dividers={['top', 'bottom', 'start', 'end']}
                  aria-labelledby="npg-review-title"
                >
                  <VStack gap={4}>
                    <Heading id="npg-review-title" level={2} tabIndex={-1}>
                      Review the exact action
                    </Heading>
                    <Text>
                      Approval sends this one request as shown. Contact details do not establish
                      permission to contact someone.
                    </Text>
                    <Heading level={3}>{actionLabel(conversation.pending.tool)}</Heading>
                    <Fields fields={reviewFields(conversation.pending.review)} />
                    <Heading level={3}>Request to approve</Heading>
                    <Fields fields={reviewFields(conversation.pending.arguments)} />
                    <Collapsible trigger="Inspect exact request" defaultIsOpen={false}>
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
                    <Text role="status" type="supporting" color="secondary">
                      {expired
                        ? 'This review has expired. Approval is unavailable.'
                        : 'Review expires ' +
                          new Date(conversation.pending.expiresAt).toLocaleTimeString() +
                          '. A later change needs a new review.'}
                    </Text>
                    <HStack gap={3} wrap="wrap">
                      <Button
                        icon={<Icon icon={ClipboardCheck} />}
                        label="Approve this action"
                        isDisabled={busy || needsRefresh || expired}
                        onClick={() => void decide('approve')}
                      />
                      <Button
                        label="Reject action"
                        variant="secondary"
                        isDisabled={busy || needsRefresh}
                        onClick={() => void decide('reject')}
                      />
                    </HStack>
                  </VStack>
                </Section>
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
              {narrow && (
                <Section
                  ref={inlineResults}
                  id="npg-inline-results"
                  hidden={!resultsOpen}
                  padding={4}
                  className="npg-inline-results max-md:px-0"
                >
                  <Evidence sources={conversation?.sources ?? []} />
                </Section>
              )}
            </ChatMessageList>
          </ChatLayout>
        </VStack>
        {!narrow && (
          <Section
            className="npg-evidence w-80 shrink-0 overflow-auto min-w-0"
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
