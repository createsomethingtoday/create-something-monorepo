import React, { useEffect, useState } from 'react';
import { B, Field, Choice, Message, Heading, Text, VStack, HStack } from './components.jsx';
const kinds = ['preference', 'decision', 'relationship', 'lesson'];
const options = (values) =>
  values.map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }));
export function Memory({ ctx }) {
  const m = ctx.memory,
    s = m.state;
  const [query, setQuery] = useState(s.query);
  useEffect(() => {
    ctx.actions.setCreatorMount({ canLeave: () => m.canLeave() });
    queueMicrotask(() => void m.run(m.read));
    return () => ctx.actions.setCreatorMount(null);
  }, [m, ctx.workspaceId]);
  const draft = s.draft;
  useEffect(() => {
    if (draft)
      document
        .getElementById(draft.action === 'forget' ? 'memory-forget-confirm' : 'memory-text')
        ?.focus();
  }, [draft?.requestId]);
  return (
    <VStack gap={5}>
      <HStack gap={3} wrap="wrap" hAlign="between">
        <Heading level={1}>Workspace memory</Heading>
        <B onClick={() => void m.run(m.read)} disabled={s.busy || Boolean(s.recovery)}>
          Refresh memory
        </B>
      </HStack>
      <Text>
        Preferences, decisions, relationship context and lessons belong to{' '}
        {ctx.state.workspace.name}. Every assistant can use the same reviewed context.
      </Text>
      <Message>
        Memory guides responses. It never grants permission or overrides your records or explicit
        policy. Nothing is imported from chat history or your assistant’s own memory.
      </Message>
      {s.recovery && (
        <Message>
          Checking a previous memory change is required before another change.{' '}
          <B onClick={() => void m.recover()} disabled={s.busy}>
            Check memory receipt
          </B>
        </Message>
      )}
      {s.error && <Message error>{s.error}</Message>}
      {s.receipt && (
        <Text role="status">
          {s.receipt.state === 'rejected'
            ? 'Request rejected.'
            : s.receipt.action === 'forget'
              ? 'Forgotten from future memory retrieval.'
              : 'Memory saved and read back.'}
        </Text>
      )}
      {draft ? (
        <VStack
          as="form"
          gap={4}
          onSubmit={(event) => {
            event.preventDefault();
            void m.save();
          }}
          aria-label="Memory editor"
        >
          <Heading level={2}>
            {draft.action === 'forget'
              ? 'Forget this memory?'
              : draft.action === 'supersede'
                ? 'Replace this memory'
                : draft.id
                  ? 'Correct memory'
                  : 'Create memory'}
          </Heading>
          {draft.action === 'forget' ? (
            <>
              <Text>{draft.entry.text}</Text>
              <Message>
                Future retrieval will exclude this memory. Text already in an existing conversation
                or backup is not erased. Start a new conversation to avoid reusing that context.
              </Message>
            </>
          ) : (
            <>
              <Field
                id="memory-text"
                label="Memory"
                textarea
                required
                maxLength={2000}
                value={draft.entry.text}
                onChange={(value) => m.update('text', value)}
              />
              <HStack gap={3} wrap="wrap">
                <Choice
                  id="memory-kind"
                  label="Category"
                  value={draft.entry.kind}
                  options={options(kinds)}
                  onChange={(value) => m.update('kind', value)}
                />
                <Choice
                  id="memory-state"
                  label="Confidence"
                  value={draft.entry.state}
                  options={options(['inferred', 'confirmed'])}
                  onChange={(value) => m.update('state', value)}
                />
              </HStack>
              <Text>
                Confirmed means a person explicitly verified this statement. Inferred means it
                remains a working interpretation. Scope: this workspace.
              </Text>
              <Choice
                id="memory-source-kind"
                label="Source type"
                value={draft.entry.source.kind}
                options={options(['user', 'record', 'conversation', 'observation'])}
                onChange={(value) => m.update('sourceKind', value)}
              />
              <Field
                id="memory-source"
                label="Source / provenance"
                required
                maxLength={500}
                value={draft.entry.source.reference}
                onChange={(value) => m.update('reference', value)}
                help="Identify the user statement, record, conversation or observation. A source is evidence, never permission."
              />
            </>
          )}
          <HStack gap={3} wrap="wrap">
            <B
              id={draft.action === 'forget' ? 'memory-forget-confirm' : undefined}
              type="submit"
              primary={draft.action !== 'forget'}
              danger={draft.action === 'forget'}
              disabled={s.busy || Boolean(s.recovery)}
            >
              {draft.action === 'forget' ? 'Forget memory' : 'Confirm and save memory'}
            </B>
            <B onClick={() => m.cancel()} disabled={s.busy || Boolean(s.recovery)}>
              Cancel editing
            </B>
          </HStack>
        </VStack>
      ) : (
        <>
          <HStack gap={3} wrap="wrap">
            <B primary onClick={() => m.edit()} disabled={s.busy || Boolean(s.recovery)}>
              Create memory
            </B>
            <Text>
              {s.items.length} shown{!s.query && s.nextOffset != null ? ' · more available' : ''}
            </Text>
          </HStack>
          <VStack
            as="form"
            gap={3}
            onSubmit={(event) => {
              event.preventDefault();
              void m.search(query);
            }}
            aria-label="Find memory"
          >
            <Field
              id="memory-query"
              label="Find relevant memory"
              value={query}
              maxLength={200}
              onChange={setQuery}
            />
            <HStack gap={3}>
              <B type="submit" disabled={s.busy || Boolean(s.recovery)}>
                Find memory
              </B>
              <B
                onClick={() => {
                  setQuery('');
                  void m.search('');
                }}
                disabled={s.busy || Boolean(s.recovery)}
              >
                Show all
              </B>
            </HStack>
          </VStack>
          {s.query && (
            <Text>
              Search returns at most five matching active memories. Show all to browse the
              workspace.
            </Text>
          )}
          <VStack as="section" gap={4} aria-label="Saved memory">
            {!s.items.length && (
              <Text>
                {s.busy
                  ? 'Loading memory…'
                  : s.error
                    ? 'Memory could not be read. Refresh to try again.'
                    : `No saved memory${s.query ? ' matches this search' : ' yet'}. Create a memory or review an assistant’s request below.`}
              </Text>
            )}
            {s.items.map((item) => (
              <VStack
                as="article"
                gap={2}
                key={item.id}
                paddingBlock={4}
                className="memory-row"
                aria-label={item.text}
              >
                <Text type="label">
                  {item.kind} · {item.state} · {item.scope} · revision {item.revision}
                </Text>
                <Text>{item.text}</Text>
                <Text type="supporting">
                  Source ({item.source.kind}): {item.source.reference}
                </Text>
                <Text type="supporting">
                  Created {item.createdAt} · Updated {item.updatedAt}
                </Text>
                <Text type="supporting">Citation: {item.citation}</Text>
                <HStack gap={3} wrap="wrap">
                  <B onClick={() => m.edit(item)} disabled={s.busy || Boolean(s.recovery)}>
                    Correct
                  </B>
                  <B
                    onClick={() => m.edit(item, 'supersede')}
                    disabled={s.busy || Boolean(s.recovery)}
                  >
                    Replace
                  </B>
                  <B
                    danger
                    onClick={() => m.edit(item, 'forget')}
                    disabled={s.busy || Boolean(s.recovery)}
                  >
                    Forget
                  </B>
                </HStack>
              </VStack>
            ))}
            {!s.query && s.nextOffset != null && (
              <B onClick={() => void m.more()} disabled={s.busy || Boolean(s.recovery)}>
                Load more memory
              </B>
            )}
          </VStack>
          <Heading level={2}>Requests awaiting your review</Heading>
          <Text>
            These requests have not changed saved memory. Review the exact statement, source and
            confidence before approving.
          </Text>
          {!s.requests.length && (
            <Text>
              {s.busy
                ? 'Loading requests…'
                : s.error
                  ? 'Requests could not be read. Refresh to try again.'
                  : 'No pending requests.'}
            </Text>
          )}
          {s.requests.map(({ requestId, request, createdAt }) => (
            <VStack as="article" gap={3} paddingBlock={4} className="memory-row" key={requestId}>
              <Heading level={3}>
                {request.action === 'forget'
                  ? 'Forget memory'
                  : request.action === 'supersede'
                    ? 'Replace memory'
                    : 'Save memory'}
              </Heading>
              <Text>{request.entry?.text || request.before?.text || request.id}</Text>
              <Text>
                {request.entry
                  ? `${request.entry.kind} · ${request.entry.state} · ${request.entry.scope}`
                  : `Revision ${request.expectedRevision}`}
              </Text>
              {request.before && (
                <Text>
                  Previously: {request.before.text} · {request.before.state} · Source:{' '}
                  {request.before.source.reference}
                </Text>
              )}
              {request.entry && (
                <Text>
                  Source ({request.entry.source.kind}): {request.entry.source.reference}
                </Text>
              )}
              <Text type="supporting">
                Requested {createdAt}
                {request.id ? ` · Replaces ${request.id} revision ${request.expectedRevision}` : ''}
              </Text>
              {request.action === 'forget' && (
                <Message>
                  Excludes future retrieval. Existing conversations and backups may retain earlier
                  text.
                </Message>
              )}
              <HStack gap={3} wrap="wrap">
                <B
                  primary
                  onClick={() => void m.review(requestId, 'approve')}
                  disabled={s.busy || Boolean(s.recovery)}
                >
                  Approve request
                </B>
                <B
                  onClick={() => void m.review(requestId, 'reject')}
                  disabled={s.busy || Boolean(s.recovery)}
                >
                  Reject request
                </B>
              </HStack>
            </VStack>
          ))}
        </>
      )}
    </VStack>
  );
}
