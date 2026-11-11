import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Dialog } from '@astryxdesign/core/Dialog';
import {
  ChatComposer,
  ChatMessageList,
  ChatMessage,
  ChatMessageBubble
} from '@astryxdesign/core/Chat';
import { Badge } from '@astryxdesign/core/Badge';
import {
  B,
  Field,
  Panel,
  Message,
  Heading,
  Text,
  VStack,
  HStack
} from './components.jsx';
import { Answer, ApprovalContent } from './chat-content.jsx';
import { chatState } from '../web/chat.mjs';
import { approvalAction, creativeReceipt } from '../web/approval-view.mjs';
import { defaults } from '../web/preferences.mjs';

const uncertainOutcomes = new Set([
  'reconciliation_required',
  'write_outcome_unknown',
  'turn_outcome_unknown'
]);
const unresolvedSave =
  'GiGi cannot yet confirm whether this save completed. Do not recreate the record or submit another change. Choose Check status to check again. If this message remains, ask for help resolving the saved request.';
const explanations = {
  codex_unavailable:
    'Codex is unavailable on this Mac. Open chat setup to check the Codex CLI installation, then choose Check status.',
  chatgpt_auth_required:
    'Sign in to your ChatGPT account in Codex on this Mac, then choose Check status.',
  provider_preflight_unavailable:
    'Your provider could not start this request. No message was sent; try again when it is available.',
  provider_preflight_rejected:
    'Your provider declined the request before a response started. Check its availability, then send again when ready.',
  provider_turn_rejected:
    'Your provider declined this request. Check its usage or availability, then send again when ready.',
  reconciliation_required:
    'The last send may have started. Choose Check status and review the latest messages before sending again.',
  write_outcome_unknown: unresolvedSave,
  turn_outcome_unknown:
    'The last send may have started. Choose Check status and review the latest messages before sending again.',
  usage_limit_reached: 'Your Codex usage limit is reached. Try again after it resets.',
  usage_limit: 'Your Codex usage limit is reached. Try again after it resets.',
  quota_exceeded: 'Your Codex usage limit is reached. Try again after it resets.',
  rate_limit_exceeded: 'Codex is at its usage limit. Try again later.',
  rate_limit: 'Codex is at its usage limit. Try again later.',
  authentication_required: 'Sign in to Codex on this Mac, then choose Check status.',
  not_authenticated: 'Sign in to Codex on this Mac, then choose Check status.',
  gigi_tools_unavailable:
    'GiGi’s local tools are unavailable. Check agent setup in Settings. If a companion is missing, reinstall the complete GiGi app.'
};
const explain = (raw, hasConversation = true) =>
  explanations[String(raw ?? '').trim()] ||
  (hasConversation
    ? 'Could not complete this request. Choose Check status before trying another change.'
    : 'Could not check Codex or load conversations. Choose Check status to try this read again.');
const needsReconciliation = (chat) =>
  chat.current?.decisionReceipt?.outcome === 'unknown' ||
  Boolean(chat.current?.cancelPending || chat.current?.recoveryPending) ||
  uncertainOutcomes.has(chat.error) ||
  uncertainOutcomes.has(chat.current?.error);

function MessageBody({ item }) {
  const ref = useRef(null),
    latest = useRef(item.text),
    [displayed, setDisplayed] = useState(item.text);
  latest.current = item.text;
  const selected = () => {
    const selection = globalThis.document?.getSelection?.();
    return selection && !selection.isCollapsed && ref.current?.contains(selection.anchorNode);
  };
  useLayoutEffect(() => {
    if (!selected()) setDisplayed(item.text);
  }, [item.text]);
  useEffect(() => {
    const reveal = () => {
      if (!selected()) setDisplayed(latest.current);
    };
    document.addEventListener('selectionchange', reveal);
    return () => document.removeEventListener('selectionchange', reveal);
  }, []);
  return (
    <VStack ref={ref} gap={2} className="chat-answer">
      {item.role === 'user' ? (
        <Text as="p" className="gigi-preserve-lines">
          {String(displayed ?? '')}
        </Text>
      ) : (
        <Answer text={displayed} />
      )}
    </VStack>
  );
}
function Suggestions({ chat, ready, uncertain }) {
  if (
    chat.pending ||
    chat.reading ||
    uncertain ||
    ['running', 'approval'].includes(chat.current?.state)
  )
    return null;
  const options = chat.record
    ? [
        [
          'Summarize this record',
          'Summarize this record and its linked work. Point out missing information without inventing details.'
        ],
        ['Review what is missing', 'Review this record for missing dates, people or details. Explain the gaps before proposing any changes.'],
        [
          'Find the next step',
          'What is the next useful step for this record? Explain what it is based on and ask before making changes.'
        ]
      ]
    : [
        [
          'Help me plan today',
          'Review my saved tasks and upcoming work. Suggest what needs my attention today, with links to the source records.'
        ],
        ['Think through an idea', 'Help me think through an idea. Ask one focused question, then suggest concrete next steps without changing records.'],
        [
          'Find unfinished work',
          'Find unfinished work in my workspace. Explain what is known, what is missing, and how you can help.'
        ]
      ];
  return (
    <section className="chat-suggestions" aria-label="Starting points">
      <VStack gap={2}>
        <Text as="p" type="supporting">
          Choose a starting point. Nothing is sent until you choose Send.
        </Text>
        <HStack gap={2} className="gigi-wrap">
          {options.map(([label, prompt]) => (
            <B key={label} data-chat-prompt={prompt} disabled={!ready}>
              {label}
            </B>
          ))}
        </HStack>
      </VStack>
    </section>
  );
}
function ChatDrawer({ ctx }) {
  const chat = ctx.chat,
    current = chat.current,
    preferences = chat.preferences || ctx.preferences || defaults;
  const ready = Boolean(chat.status?.available && chat.status?.authenticated),
    uncertain = needsReconciliation(chat);
  const transcript = useRef(null),
    stick = useRef(true),
    position = useRef(0),
    session = useRef(current?.sessionId),
    [newMessages, setNewMessages] = useState(false);
  const messages = current?.messages || [],
    signature =
      messages.map((message) => `${message.id}:${message.text}`).join('|') +
      `:${current?.state}:${current?.approvals?.length || 0}`;
  useLayoutEffect(() => {
    const node = transcript.current;
    if (!node) return;
    if (session.current !== current?.sessionId) {
      session.current = current?.sessionId;
      stick.current = true;
      position.current = 0;
    }
    const selection = document.getSelection();
    const holdingSelection =
      selection && !selection.isCollapsed && node.contains(selection.anchorNode);
    if (stick.current && !holdingSelection) {
      node.scrollTop = node.scrollHeight;
      setNewMessages(false);
    } else {
      node.scrollTop = position.current;
      setNewMessages(true);
    }
  }, [signature, current?.sessionId, preferences.chatDensity, preferences.chatTextSize]);
  const unavailable = chat.status
    ? !chat.status.available
      ? explain(chat.status.reason || 'codex_unavailable')
      : !chat.status.authenticated
        ? explain(chat.status.reason || 'chatgpt_auth_required')
        : ''
    : 'Checking Codex…';
  const observed = chatState(chat),
    blocked = chat.pending || chat.reading || chat.refreshRequired || uncertain || !ready;
  const receiptText =
    creativeReceipt(current?.decisionReceipt) ||
    {
      verified: 'Changes saved and verified in GiGi.',
      rejected: 'Changes rejected. GiGi did not execute this edit.',
      failed: 'The requested edit was not saved.',
      existing:
        'A linked record already exists. No new record was created; your existing changes were kept.',
      unknown: unresolvedSave
    }[current?.decisionReceipt?.outcome];
  const currency = typeof chat.currency === 'function' ? chat.currency() : chat.currency;
  const currencyKnown =
    typeof chat.currencyKnown === 'function' ? chat.currencyKnown() : chat.currencyKnown !== false;
  const latest = () => {
    const node = transcript.current;
    if (node) {
      stick.current = true;
      node.scrollTop = node.scrollHeight;
      position.current = node.scrollTop;
    }
    setNewMessages(false);
    document.querySelector('#chat-message')?.focus({ preventScroll: true });
  };
  return (
    <aside
      className={`chat-panel ${chat.opening ? 'chat-entering' : ''}`}
      aria-label="Ask GiGi"
      data-chat-width={preferences.chatWidth}
      data-chat-text-size={preferences.chatTextSize}
      data-chat-density={preferences.chatDensity}
    >
      <VStack gap={3} className="chat-intro">
        <HStack gap={3} className="chat-head gigi-section-head">
          <VStack gap={1}>
            <Heading level={2}>Ask GiGi</Heading>
          </VStack>
          <B variant="ghost" data-chat-close="1" aria-label="Close Ask GiGi">
            Close
          </B>
        </HStack>
        {chat.record && <Text type="supporting" className="chat-context">About {chat.record.title || chat.record.entity}</Text>}
        {(unavailable || chat.error || chat.refreshRequired || uncertain) && (
          <section className="chat-recovery" aria-label="Chat status and recovery">
            <VStack gap={2}>
              {unavailable && <Message>{unavailable}</Message>}
              <HStack gap={2} className="gigi-wrap">
                <B data-chat-refresh="1" disabled={chat.pending || chat.reading}>
                  {chat.reading ? 'Checking status…' : 'Check status'}
                </B>
                {(!ready || chat.error === 'gigi_tools_unavailable') && (
                  <B variant="ghost" data-chat-setup="1">
                    Open chat setup
                  </B>
                )}
              </HStack>
            </VStack>
          </section>
        )}
        {(current && (messages.length || current.state !== 'idle' || uncertain)) ? <VStack
          gap={1}
          className="chat-observed-state"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          data-state={current?.state || 'idle'}
        >
          <Text weight="semibold">{observed.label}</Text>
          <Text type="supporting">{observed.detail}</Text>
        </VStack> : null}
        {chat.error && (ready || uncertain) && (
          <Message error>{explain(chat.error, Boolean(current))}</Message>
        )}
        <HStack gap={3} className="chat-conversation-controls gigi-wrap">
          <B variant="ghost" data-chat-new="1" disabled={!ready || chat.pending || chat.reading}>
            New chat
          </B>
          <B variant="ghost" data-chat-history="1">Saved chats</B>
        </HStack>
      </VStack>
      <ChatMessageList
        ref={transcript}
        className="chat-transcript"
        aria-label="Conversation"
        tabIndex={0}
        data-chat-session-id={current?.sessionId || ''}
        align="top"
        density={preferences.chatDensity === 'compact' ? 'compact' : 'balanced'}
        gap={preferences.chatDensity === 'compact' ? 3 : 6}
        isStreaming={current?.state === 'running'}
        onScroll={(event) => {
          const node = event.currentTarget;
          position.current = node.scrollTop;
          stick.current = node.scrollHeight - node.scrollTop - node.clientHeight < 48;
          if (stick.current) setNewMessages(false);
        }}
      >
        {messages.length ? (
          messages.map((item) => (
            <ChatMessage
              key={item.id}
              sender={item.role === 'user' ? 'user' : 'assistant'}
              className={`chat-message ${item.role === 'user' ? 'from-user' : 'from-agent'}`}
              data-chat-message-id={item.id}
            >
              <ChatMessageBubble
                variant={item.role === 'user' ? 'filled' : 'ghost'}
                width="100%"
                name={item.role === 'user' ? 'You' : 'GiGi'}
              >
                <MessageBody item={item} />
              </ChatMessageBubble>
            </ChatMessage>
          ))
        ) : (
          <VStack gap={2} className="chat-empty"><Heading level={2}>How can I help?</Heading><Text color="secondary">Choose a starting point, or ask in your own words.</Text></VStack>
        )}
        <Suggestions chat={chat} ready={ready} uncertain={uncertain} />
        {current?.state === 'approval' &&
          (current.approvals || []).map((item) => (
            <Panel key={item.id} className="chat-approval">
              <ApprovalContent item={item} currency={currency} currencyKnown={currencyKnown} />
              <HStack gap={2} className="gigi-wrap">
                <B
                  primary
                  data-chat-approval={item.id}
                  data-chat-decision="approve"
                  disabled={blocked}
                >
                  {approvalAction(item)}
                </B>
                <B
                  danger
                  data-chat-approval={item.id}
                  data-chat-decision="reject"
                  disabled={blocked}
                >
                  Reject changes
                </B>
              </HStack>
            </Panel>
          ))}
        {receiptText && (
          <Message
            title="Last reviewed action"
            status={
              current.decisionReceipt.outcome === 'verified'
                ? 'success'
                : current.decisionReceipt.outcome === 'unknown'
                  ? 'warning'
                  : 'info'
            }
          >
            {receiptText}
          </Message>
        )}
        {(current?.recordLinks || []).map((item) => (
          <B
            key={`${item.entity}:${item.id}`}
            variant="ghost"
            className="chat-record-link"
            data-chat-link-entity={item.entity}
            data-chat-link-id={item.id}
          >{`${item.title || item.id} ↗`}</B>
        ))}
        {current?.recoveryPending ? (
          <Text as="p" role="status">
            Checking the previous response…
          </Text>
        ) : current?.state === 'running' ? (
          <Text as="p" role="status" className="chat-running">
            {current.cancelPending ? 'Stopping response…' : 'GiGi is responding…'}
          </Text>
        ) : null}
        {current?.state === 'interrupted' && !current.recoveryPending && (
          <Text as="p" role="status">
            {uncertain
              ? 'This response was interrupted. Resolve the pending outcome before sending another message.'
              : 'This response was interrupted. You can send another message.'}
          </Text>
        )}
        {current?.state === 'failed' && (
          <Message error>
            {uncertain
              ? current?.decisionReceipt?.outcome === 'unknown' ||
                current?.error === 'write_outcome_unknown' ||
                chat.error === 'write_outcome_unknown'
                ? unresolvedSave
                : 'Check the latest conversation before sending another message.'
              : 'This response failed. Choose Check status to check its state.'}
          </Message>
        )}
      </ChatMessageList>
      {newMessages && (
        <B className="chat-latest" onClick={latest}>
          Latest response ↓
        </B>
      )}
      {current ? (
        <form id="chat-form" className="chat-composer">
          <ChatComposer
            value={chat.draft}
            onSubmit={(value) => void chat.send(value)}
            onChange={(value) => {
              chat.draft = value;
            }}
            elevation="none"
            density={preferences.chatDensity === 'compact' ? 'compact' : 'balanced'}
            input={
              <Field
                id="chat-message"
                name="message"
                label="Message GiGi"
                textarea
                value={chat.draft}
                maxLength={12000}
                disabled={!ready}
                placeholder={`Ask about this ${chat.record ? 'record' : 'workspace'}…`}
              />
            }
            sendButton={
              current.state === 'running' ? (
                <B danger data-chat-stop="1" disabled={blocked}>
                  Stop response
                </B>
              ) : (
                <B primary type="submit" disabled={blocked || current.state === 'approval'}>
                  Send message
                </B>
              )
            }
          />
        </form>
      ) : (
        <Text as="p" type="supporting" className="chat-hint">
          {ready
            ? 'Choose New chat to begin.'
            : 'Chat needs a signed-in Codex CLI on this Mac. Local records need no connection.'}
        </Text>
      )}
    </aside>
  );
}
export function Chat({ ctx }) {
  return ctx.chat?.visible ? <ChatDrawer ctx={ctx} /> : null;
}

function SearchDialog({ ctx }) {
  const search = ctx.workspaceSearch,
    groups = (search.groups || []).filter((group) => group.items.length),
    results = useRef(null);
  const close = () => ctx.actions.closeWorkspaceSearch();
  useLayoutEffect(() => {
    document.querySelector('#workspace-search-input')?.focus({ preventScroll: true });
  }, []);
  const previousFocus = useRef(null),
    scroll = useRef(0);
  useLayoutEffect(
    () => () => {
      scroll.current = results.current?.scrollTop || 0;
      previousFocus.current = document.activeElement;
    },
    [search.groups, search.busy]
  );
  useLayoutEffect(() => {
    if (results.current) results.current.scrollTop = scroll.current;
    const prior = previousFocus.current;
    if (prior && !prior.isConnected)
      document.querySelector('#workspace-search-input')?.focus({ preventScroll: true });
  }, [search.groups, search.busy]);
  return (
    <Dialog
      isOpen
      onOpenChange={(open) => {
        if (!open) close();
      }}
      className="workspace-search-dialog"
      aria-label="Search workspace"
      maxHeight="80dvh"
      width="min(42rem, calc(100vw - var(--spacing-8)))"
      padding={5}
      purpose="info"
    >
      <VStack gap={4}>
        <HStack gap={3} className="gigi-section-head">
          <Heading level={2}>Search workspace</Heading>
          <B variant="ghost" data-search-close="1" aria-label="Close search">
            Close
          </B>
        </HStack>
        <Field
          id="workspace-search-input"
          type="search"
          label="Search people, gigs, finances and tasks"
          placeholder="Search your workspace…"
          maxLength={160}
          autoComplete="off"
          value={search.query}
          aria-controls="workspace-search-results"
        />
        <VStack
          ref={results}
          gap={4}
          id="workspace-search-results"
          className="workspace-search-results"
          aria-busy={search.busy}
        >
          {search.error ? (
            <Message error title="Couldn’t finish this search.">
              Try again to search your local workspace.
            </Message>
          ) : search.busy ? (
            <Text as="p" role="status">
              Searching…
            </Text>
          ) : !search.query.trim() ? (
            <VStack gap={2}>
              <Heading level={3}>Find something in your workspace.</Heading>
              <Text as="p" color="secondary">
                Search people, gigs, finances and tasks.
              </Text>
            </VStack>
          ) : !groups.length ? (
            <VStack gap={2} role="status">
              <Heading level={3}>No results for “{search.query}”.</Heading>
              <Text as="p" color="secondary">
                Try another name or a few words from a title.
              </Text>
            </VStack>
          ) : null}
          {search.error && <B data-search-retry="1">Retry search</B>}
          {groups.map((group) => (
            <section
              key={group.entity}
              className="workspace-search-group"
              aria-labelledby={`search-group-${group.entity}`}
            >
              <VStack gap={2}>
                <HStack gap={2}>
                  <Heading level={3} id={`search-group-${group.entity}`}>
                    {group.label}
                  </Heading>
                  <Badge label={Number(group.count) || 0} />
                </HStack>
                {group.items.map((item) => (
                  <B
                    key={item.id}
                    variant="ghost"
                    className="workspace-search-result"
                    data-search-record={item.id}
                    data-search-entity={group.entity}
                    label={`${item.title || 'Untitled'}${item.titleTruncated ? '…' : ''} ↗`}
                  />
                ))}
                {group.nextCursor && (
                  <B
                    variant="ghost"
                    className="workspace-search-more"
                    data-search-more={group.entity}
                    aria-disabled={search.busy}
                    disabled={search.busy}
                  >{`Show more ${group.label.toLowerCase()}`}</B>
                )}
              </VStack>
            </section>
          ))}
        </VStack>
        <Text as="p" type="supporting">
          ↑ ↓ to move · ↵ to open · esc to close
        </Text>
      </VStack>
    </Dialog>
  );
}
export function WorkspaceSearch({ ctx }) {
  return ctx.workspaceSearch?.visible ? <SearchDialog ctx={ctx} /> : null;
}
