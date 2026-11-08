import React from 'react';
import {
  B,
  Field,
  Choice,
  Check,
  Panel,
  PageHeading,
  Message,
  Disclosure,
  Heading,
  Text,
  VStack,
  HStack
} from './components.jsx';
import {
  sourceView,
  sourceJourney,
  sourceSignInNeeded,
  setupSummary,
  sourceErrorMessage
} from '../web/setup-view.mjs';
import {
  sourceSessionBlocked,
  sourceNeedsOperatorReview,
  sourceCanBegin,
  pendingAccountForProvider,
  pendingConsentForProvider,
  importRunForAccount
} from '../web/model.mjs';
import { sourceImportRunning } from '../web/source-center.mjs';
import { messageBudget } from '../web/ai-connection.mjs';

const code = (value) => (typeof value === 'string' ? value : JSON.stringify(value, null, 2));
const stamp = (value) =>
  Number.isFinite(value) && Number.isFinite(new Date(value).getTime())
    ? new Date(value).toLocaleString()
    : 'Not recorded';
const quietHours = Array.from({ length: 24 }, (_, hour) => [
  String(hour),
  `${String(hour).padStart(2, '0')}:00`
]);
const muted = (children) => <Text color="secondary">{children}</Text>;

export function Onboarding({ ctx }) {
  const { state } = ctx;
  const resume = Boolean(state.workspace);
  return (
    <VStack gap={6} className="gigi-onboarding">
      <PageHeading
        title={resume ? 'Finish your profile.' : 'Your work, in one place.'}
        description={
          resume
            ? 'Your private workspace is ready. Add your profile to finish setup.'
            : 'Build a private home for gigs, shifts, contacts, money and the details that connect them. Your records live on this Mac. No login is needed to start; connect sources and your subscribed agent when ready.'
        }
      />
      <ol>
        <li>
          <strong>{resume ? 'Finish your profile' : 'Create your workspace'}</strong>
          <p>Private local records for your gigs, people and money.</p>
        </li>
        <li>
          <strong>Connect sources, if useful</strong>
          <p>Separate GiGi sign-in and Google consent; import when you choose.</p>
        </li>
        <li>
          <strong>Use your own agent</strong>
          <p>Connect Codex or Claude Code on this Mac, then test a real tool call.</p>
        </li>
      </ol>
      <Panel title={resume ? 'Your profile' : 'Make it yours'}>
        <Text>
          Choose your currency carefully: it locks after you save monetary records. Connect sources
          later.
        </Text>
        <form id="workspace-form">
          <VStack gap={4}>
            <Field
              id="owner-name"
              name="ownerName"
              label="Your name"
              required
              maxLength={80}
              autoComplete="name"
              value={state.setupDraft?.ownerName || ''}
              disabled={state.busy}
            />
            {!resume && (
              <Field
                id="workspace-name"
                name="name"
                label="Workspace name"
                required
                maxLength={80}
                autoComplete="off"
                placeholder="e.g. Danny’s work"
                value={state.setupDraft?.name || ''}
                disabled={state.busy}
              />
            )}
            <Choice
              id="currency"
              name="currency"
              label="Currency"
              required
              value={state.setupDraft?.currency || ''}
              options={[
                ['', 'Choose currency'],
                ...['USD', 'CAD', 'EUR', 'GBP'].map((v) => [v, v])
              ]}
              disabled={state.busy}
            />
            <B type="submit" primary disabled={state.busy}>
              {state.busy
                ? 'Saving workspace…'
                : resume
                  ? 'Finish setup'
                  : 'Create private workspace'}
            </B>
          </VStack>
        </form>
      </Panel>
      {muted(
        'Gmail, Calendar and agent access are optional setup steps that require separate verification.'
      )}
    </VStack>
  );
}

function NotificationSettings({ controller }) {
  const settings = controller.settings || {};
  const permission =
    {
      granted:
        controller.alertsEnabled === false
          ? 'macOS alerts are disabled. Enable GiGi alerts in System Settings → Notifications.'
          : 'macOS permission is allowed.',
      denied:
        'macOS permission is denied. Enable GiGi in System Settings → Notifications to receive alerts.',
      unknown: 'macOS permission has not been checked.',
      prompt: 'macOS will ask for permission when you enable alerts.'
    }[controller.permission] || 'macOS notification permission is unavailable.';
  return (
    <Panel title="Choose when GiGi interrupts">
      <Text>
        Attention items stay in your workspace. Desktop alerts are optional and work while GiGi is
        running on this Mac.
      </Text>
      {controller.error && <Message error>{controller.error}</Message>}
      <form id="attention-settings">
        <VStack gap={4}>
          <Check
            id="attention-enabled"
            name="enabled"
            label="Allow desktop notifications"
            value={settings.enabled}
          />
          <Text role="status" color="secondary">
            {permission}
          </Text>
          <Check
            id="attention-reminders"
            name="reminders"
            label="Include dated task and gig reminders"
            value={settings.reminders}
          />
          {muted(
            'Replies, review requests and checked results can notify you when the app is in the background. Reminders use the dates you saved.'
          )}
          <Check
            id="attention-detailedPreviews"
            name="detailedPreviews"
            label="Show record details in notification previews"
            value={settings.detailedPreviews}
          />
          {muted('Off by default to keep workspace details off your lock screen.')}
          <fieldset>
            <legend>Quiet hours · this Mac’s local time</legend>
            <HStack gap={4}>
              <Choice
                id="attention-quiet-start"
                name="quietStart"
                label="From"
                value={String(settings.quietStart ?? 22)}
                options={quietHours}
              />
              <Choice
                id="attention-quiet-end"
                name="quietEnd"
                label="Until"
                value={String(settings.quietEnd ?? 8)}
                options={quietHours}
              />
            </HStack>
            {muted('Choose the same hour for both to turn quiet hours off.')}
          </fieldset>
          <B
            type="submit"
            id="attention-settings-save"
            disabled={controller.pending || controller.requestingPermission}
          >
            {controller.requestingPermission
              ? 'Checking macOS…'
              : controller.pending
                ? 'Saving…'
                : 'Save notification settings'}
          </B>
        </VStack>
      </form>
      <B data-notification-settings="1" variant="ghost">
        Open macOS notification settings
      </B>
      {muted('Clicking an alert opens the item for review. It never approves a change.')}
    </Panel>
  );
}

function BuiltInChat({ state }) {
  const status = state.setupChatStatus,
    failed = state.setupChatFailed,
    ready = status?.available === true && status?.authenticated === true;
  const label = failed
    ? 'Check unavailable'
    : !status
      ? 'Not checked'
      : !status.available
        ? 'Codex unavailable'
        : !status.authenticated
          ? 'Sign in needed'
          : 'Codex signed in';
  const next = failed
    ? 'Could not check Codex on this Mac. Check again or open the setup guide.'
    : !status
      ? 'Check the Codex status on this Mac.'
      : !status.available
        ? 'Install the Codex CLI and sign in on this Mac, then check again.'
        : !status.authenticated
          ? 'Sign in to the Codex CLI with your ChatGPT account, then check again.'
          : 'Open Ask GiGi to start a conversation. Changes still require your review.';
  return (
    <Panel id="built-in-chat" title="Ask GiGi · built-in chat">
      <Text role="status">{label}</Text>
      <Text>{next}</Text>
      {muted(
        'Uses your Codex subscription on this Mac. External-agent registration below is separate; local records need neither connection.'
      )}
      <HStack gap={2} wrap="wrap">
        <B primary={ready} data-chat-open="1">
          Open Ask GiGi
        </B>
        <B data-setup-chat-refresh="1">Check chat status</B>
        {!ready && (
          <B variant="ghost" data-help="codex-setup">
            Codex setup guide ↗
          </B>
        )}
      </HStack>
    </Panel>
  );
}

function AiConnectionSettings({ controller: c }) {
  const s = c?.status,
    busy = Boolean(c?.busy || s?.busy),
    available = s?.available === true,
    accounts = Array.isArray(s?.accounts) ? s.accounts : [],
    active = accounts.find((a) => a.clientId === s?.activeClientId),
    plan = Boolean(active?.connected && active?.planEnabled),
    budget = messageBudget(c?.draft || '');
  const action = (kind, label, client, disabled = false) => (
    <B
      key={`${kind}:${client || ''}`}
      data-ai-action={kind}
      data-ai-client={client}
      disabled={disabled}
    >
      {label}
    </B>
  );
  return (
    <Panel title="Optional ChatGPT connection">
      <Text>{available ? 'Free open-source local app' : 'Connection unavailable'}</Text>
      <Text>
        Ask GiGi continues to use installed Codex. This separate text-only connection sends only the
        message you type below to OpenAI. It cannot read records, use local tools or approve
        changes.
      </Text>
      {muted(
        'GiGi source sign-in and Google or Instagram permissions stay separate. Eligible ChatGPT plan usage has limits; there is no automatic API billing fallback.'
      )}
      <HStack gap={2} wrap="wrap">
        {action('connect', 'Continue with ChatGPT', undefined, !available || busy)}
        {action('refresh', 'Check status', undefined, Boolean(c?.busy))}
        {c?.busy &&
          c.operation &&
          c.operation !== 'disconnect' &&
          action('cancel', 'Cancel request')}
        {action('usage', 'Manage ChatGPT usage and access', undefined, busy || !available)}
      </HStack>
      <VStack gap={2} aria-live="polite">
        {busy && <Text>Request in progress…</Text>}
        {c?.error && (
          <Message error>
            <Text id="ai-connection-error">{c.error}</Text>
          </Message>
        )}
        {c?.disconnectNotice && <Message>{c.disconnectNotice}</Message>}
        {c?.safetyWarning && (
          <Message error>
            <Text id="ai-connection-safety-warning">{c.safetyWarning}</Text>
          </Message>
        )}
      </VStack>
      {accounts.map((a) => (
        <VStack gap={2} key={a.clientId}>
          <Heading level={3}>{a.email || 'ChatGPT account'}</Heading>
          <Text>
            {a.clientId === s.activeClientId ? 'Selected account. ' : ''}
            {a.connected
              ? a.planEnabled
                ? 'Plan usage enabled.'
                : 'Identity connected; plan usage disabled.'
              : 'Disconnected.'}
          </Text>
          <HStack gap={2} wrap="wrap">
            {action('select', 'Select', a.clientId, busy || a.clientId === s.activeClientId)}
            {action('connect', 'Reconnect', a.clientId, busy || !available)}
            {action('disconnect', 'Disconnect', a.clientId, busy)}
          </HStack>
        </VStack>
      ))}
      {(s?.pendingClientIds || []).map((id) => (
        <VStack gap={2} key={id}>
          <Text>Incomplete sign-in.</Text>
          {action('connect', 'Complete sign-in', id, busy || !available)}
        </VStack>
      ))}
      {plan && (
        <VStack gap={4}>
          {action('models', 'Load available models', undefined, busy)}
          <Choice
            id="ai-model"
            label="Model"
            value={c.model || ''}
            options={[
              ['', 'Choose a model'],
              ...(c.models || []).map((m) => [m.slug, m.displayName])
            ]}
            disabled={busy}
          />
          <Text id="ai-message-budget" color="secondary" aria-live="polite">
            {budget.help}
          </Text>
          <Field
            id="ai-message"
            label="Message to OpenAI"
            textarea
            value={c.draft || ''}
            maxLength={65536}
            disabled={busy}
            aria-describedby="ai-message-budget"
            aria-invalid={budget.overLimit}
          />
          {action(
            'ask',
            'Send message',
            undefined,
            busy || !c.draft?.trim() || !c.model || budget.overLimit
          )}
          {c.reply && (
            <VStack gap={2} role="status">
              <Heading level={3}>Reply</Heading>
              <pre>{c.reply}</pre>
            </VStack>
          )}
        </VStack>
      )}
    </Panel>
  );
}

function SourceImport({ provider, account, draft = {}, run, busy, ctx }) {
  const current = run?.accountId === account ? run : null,
    preview = current?.preview,
    receipt = current?.receipt,
    canCommit = preview && !receipt,
    running = sourceImportRunning(current),
    next = receipt?.nextCursor || (!receipt && preview?.nextCursor);
  const dateChange = (bound) => (value) => {
    if (ctx.state.sourceBusy[provider]) return;
    ctx.state.sourceDrafts[provider] = { ...ctx.state.sourceDrafts[provider], [bound]: value };
    delete ctx.state.imports[provider];
    ctx.actions.render();
  };
  return (
    <VStack gap={4} aria-label={`${provider === 'gmail' ? 'Gmail' : 'Calendar'} read and import`}>
      <HStack gap={4}>
        <Field
          id={`source-${provider}-from`}
          label="From (UTC)"
          type="date"
          data-source-date={provider}
          data-bound="from"
          value={draft.from || ''}
          disabled={Boolean(busy || running)}
          onChange={dateChange('from')}
        />
        <Field
          id={`source-${provider}-to`}
          label="Before (UTC)"
          type="date"
          data-source-date={provider}
          data-bound="to"
          value={draft.to || ''}
          disabled={Boolean(busy || running)}
          onChange={dateChange('to')}
        />
      </HStack>
      {current?.restoredScope &&
        muted(
          `Continuing the saved selection exactly: ${current.selection?.from || 'no lower date bound'} to ${current.selection?.to || 'no upper date bound'}. Editing a date starts a new scan.`
        )}
      {muted(
        `Dates apply within scanned pages, not a complete source search. ${provider === 'googlecalendar' ? 'Primary calendar only; all-day events without a clear timezone may be excluded.' : 'Sender, subject, date and a short snippet; full email and attachments are not read.'} Each preview scans one bounded page.`
      )}
      <HStack gap={2} wrap="wrap">
        <B data-source-preview={provider} disabled={Boolean(busy || running)}>
          {['preview', 'fresh'].includes(busy)
            ? 'Reading source page…'
            : receipt && receipt.state !== 'complete'
              ? 'Preview page again to retry'
              : next
                ? 'Preview next page'
                : 'Preview source page'}
        </B>
        {current && (
          <B variant="ghost" data-source-fresh={provider} disabled={Boolean(busy || running)}>
            Start fresh preview
          </B>
        )}
      </HStack>
      {preview && (
        <VStack gap={3} aria-label="Source preview">
          <Heading level={3}>Review before importing</Heading>
          <Text>
            {preview.scannedCount} scanned · {preview.selectedCount} selected · {preview.newCount}{' '}
            new · {preview.existingCount} existing.
          </Text>
          {Boolean(preview.excludedCount || preview.unknownDateCount) &&
            muted(
              `${preview.excludedCount || 0} outside selection · ${preview.unknownDateCount || 0} without a usable date.`
            )}
          {muted(
            preview.coverage === 'complete'
              ? 'Reached the end of this source scan.'
              : 'More source pages may remain. This preview does not establish complete date coverage.'
          )}
          {preview.records?.length ? (
            <ul>
              {preview.records.slice(0, 25).map((r, i) => (
                <li key={r.id || i}>
                  <strong>{r.title}</strong>
                  {r.fields?.Date && <p>{r.fields.Date}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <Text>No matching records in this page.</Text>
          )}
          {muted(
            `Preview text is source content to review. Import saves only these selected records to ${provider === 'gmail' ? 'Interactions' : 'Schedule'} on this Mac.`
          )}
          {canCommit && (
            <HStack gap={2} wrap="wrap">
              <B
                primary
                data-source-commit={provider}
                disabled={Boolean(busy || !preview.records?.length)}
              >
                {busy === 'commit' ? 'Importing reviewed records…' : 'Import reviewed records'}
              </B>
              <B data-source-import-cancel={provider}>
                {busy === 'commit' ? 'Stop import' : 'Discard preview'}
              </B>
            </HStack>
          )}
        </VStack>
      )}
      {receipt && (
        <VStack gap={3} aria-label="Import receipt" role="status">
          <Heading level={3}>
            {receipt.state === 'committing'
              ? 'Import in progress'
              : receipt.state === 'cancelled'
                ? 'Import stopped'
                : receipt.state === 'cancelling'
                  ? 'Stopping import'
                  : receipt.state === 'partial'
                    ? 'Import needs review'
                    : 'Import receipt'}
          </Heading>
          <Text>
            {receipt.createdCount || 0} created · {receipt.existingCount || 0} existing ·{' '}
            {receipt.failedCount || 0} failed.
          </Text>
          {muted(
            running
              ? 'Import is still running or stopping. Check the receipt for the final counts.'
              : receipt.state === 'cancelled'
                ? 'Already saved records remain. Stopping does not roll back imported records.'
                : receipt.nextCursor
                  ? 'More source pages remain; preview the next page when needed.'
                  : 'No next page recorded for this import.'
          )}
          {receipt.guidance && muted(receipt.guidance)}
          {receipt.recoveredAfterInterruption &&
            muted(
              'The last import was interrupted. This receipt reflects the records already saved; preview again before retrying.'
            )}
          {receipt.failures?.length > 0 &&
            muted(
              receipt.failures
                .slice(0, 3)
                .map((f) => f.message)
                .join(' · ')
            )}
          <HStack gap={2} wrap="wrap">
            {receipt.state === 'committing' && (
              <B data-source-import-cancel={provider}>Stop import</B>
            )}
            <B data-source-receipt={provider} disabled={Boolean(busy)}>
              Check import receipt
            </B>
            <B variant="ghost" data-page={provider === 'gmail' ? 'interactions' : 'schedule'}>
              Review local records ↗
            </B>
          </HStack>
        </VStack>
      )}
    </VStack>
  );
}

function SourceCard({ ctx, provider, title }) {
  const { state } = ctx,
    source = state.sources[provider] || { state: 'unavailable' },
    connected = source.state === 'connected' && !sourceSessionBlocked(source),
    account = source.connectedAccountId || '',
    attempt = state.sourceAttempts[provider] || null,
    accountToVerify = pendingAccountForProvider(source, provider) || source.connectedAccountId,
    consentUrl = sourceSessionBlocked(source)
      ? null
      : pendingConsentForProvider(source, state.sourceAttempts, provider),
    reconnectable =
      source.state === 'attention' &&
      source.reconnectable === true &&
      !sourceSessionBlocked(source),
    operatorReview = sourceNeedsOperatorReview(source),
    pending = source.state === 'pending' && !sourceSessionBlocked(source),
    run = importRunForAccount(state.imports[provider], account),
    feedback = sourceView(source);
  return (
    <Panel title={title}>
      <Text role="status">{feedback.label}</Text>
      <Text>{feedback.description}</Text>
      {connected &&
        muted(
          source.accountLabel
            ? `${provider === 'gmail' ? 'Google-verified Gmail address' : 'Google-verified primary calendar'}: ${source.accountLabel.value}`
            : 'Google account label is unavailable. Check status again to confirm the account; your GiGi sign-in email does not identify this Google source.'
        )}
      {muted(
        `${provider === 'gmail' ? 'Turn a booking email into a follow-up task or gig. Each import reads up to 2 messages: sender, subject, date and a short snippet.' : 'Turn an event into a local gig or preparation task. Each import reads up to 10 events from the primary calendar, including dates and event details.'} Connecting does not import records.`
      )}
      <HStack gap={2} wrap="wrap">
        <B data-source-refresh={provider}>Check status</B>
        {sourceCanBegin(source) && (
          <B data-source-begin={provider}>
            {reconnectable
              ? `Reconnect ${title}`
              : state.connectionRequests[provider]
                ? 'Resume connection'
                : `Connect ${title}`}
          </B>
        )}
      </HStack>
      {consentUrl ? (
        <VStack gap={2}>
          {muted(
            'Consent is pending. Open the hosted consent page in your browser, then return here to verify.'
          )}
          <B data-open-consent={provider}>Open consent page ↗</B>
        </VStack>
      ) : attempt && pending ? (
        muted('Consent started. Check status after completing the browser step.')
      ) : null}
      {pending &&
        !operatorReview &&
        (accountToVerify ? (
          <B data-source-reconcile={provider}>Verify connection</B>
        ) : (
          muted(
            'The account ID is not available yet. Check status after consent; do not start a new connection while this attempt is pending.'
          )
        ))}
      {connected && account && (
        <Disclosure title="Account details" data-view-key={`source-${provider}-account`}>
          <Text>Connected account ID: {account}</Text>
        </Disclosure>
      )}
      {source.detail && (
        <Disclosure title="Technical details" data-view-key={`source-${provider}-technical`}>
          <Text>{sourceErrorMessage(source.detail) || source.detail}</Text>
        </Disclosure>
      )}
      {muted(
        `After importing, open a record in ${provider === 'gmail' ? 'Interactions' : 'Schedule'} and choose Create task from source or Create gig from source. Review before saving; the new record stays linked to its source.`
      )}
      {connected && account && (
        <SourceImport
          ctx={ctx}
          provider={provider}
          account={account}
          draft={state.sourceDrafts[provider]}
          run={run}
          busy={state.sourceBusy[provider]}
        />
      )}
    </Panel>
  );
}

function SourceConnections({ ctx }) {
  const { state } = ctx,
    journey = sourceJourney(state.sources, state.sourceAttempts),
    signInNeeded = sourceSignInNeeded(state.sources, state.sourceSignedOut);
  return (
    <Panel id="source-connections" title="Source connections">
      <Text>Separate consent required</Text>
      {muted(
        'Your local workspace needs no login. Sign in to GiGi, then check whether source access is enabled for this app. Google consent connects the Google account you choose; it may be different from your GiGi sign-in.'
      )}
      <Disclosure title="How source setup works" data-view-key="source-stages">
        <ol aria-label="Source setup stages">
          {journey.stages.map((title, index) => (
            <li key={title} aria-current={index === journey.current ? 'step' : undefined}>
              <strong>{title}</strong>
              {index === journey.current && <p>Current step</p>}
            </li>
          ))}
        </ol>
      </Disclosure>
      <Text role="status">{journey.next}</Text>
      {signInNeeded && (
        <B data-sign-in="1" disabled={state.signingIn}>
          {state.signingIn ? 'Waiting for browser sign-in…' : 'Sign in to GiGi sources'}
        </B>
      )}
      {state.sourceSignedOut ? (
        <Text role="status">
          Signed out of GiGi sources on this Mac. Google consent and imported records are unchanged.
        </Text>
      ) : (
        <VStack gap={2}>
          <B
            variant="ghost"
            data-source-sign-out="1"
            disabled={
              state.signingIn ||
              state.signingOut ||
              Object.keys(state.sourceBusy).length > 0 ||
              Object.values(state.imports).some(sourceImportRunning)
            }
          >
            {state.signingOut ? 'Signing out…' : 'Sign out of GiGi sources'}
          </B>
          {muted('Clears source sign-in on this Mac. Keeps Google consent and imported records.')}
        </VStack>
      )}
      <Disclosure title="What connecting and importing allow" data-view-key="source-permissions">
        <Text>
          Review the Google consent screen before continuing. The configured Google grants are
          broader than read-only. GiGi’s source workflow uses them only to read source identity and
          the bounded pages described below; it does not send email, modify calendars or invite
          anyone.
        </Text>
        <Text>
          Return here after consent, choose Check status, then Verify connection if shown. Once
          Account verified appears, review the Google identity and preview a source page. Preview
          reads a bounded selection without adding local records. Import reviewed records saves that
          selection. Your agent can use the same scoped read and import tools when you ask. You can
          skip sources and keep working with local records.
        </Text>
      </Disclosure>
      <SourceCard ctx={ctx} provider="gmail" title="Gmail" />
      <SourceCard ctx={ctx} provider="googlecalendar" title="Google Calendar" />
      {muted(
        <>
          If a connection needs operator help,{' '}
          <a href="#source-diagnostics">record local diagnostics below</a>, then review the report
          before sharing it.
        </>
      )}
    </Panel>
  );
}

function Diagnostics({ state }) {
  const { status, review, exported } = state.diagnostics || {},
    known = typeof status?.enabled === 'boolean',
    enabled = status?.enabled === true;
  const button = (action, label, disabled = false, danger = false, primary = false) => (
    <B
      data-diagnostics={action}
      disabled={state.busy || disabled}
      danger={danger}
      primary={primary}
    >
      {label}
    </B>
  );
  const stages = {
    sign_in: 'GiGi source sign-in',
    status: 'Check source status',
    consent_begin: 'Start consent',
    consent_open: 'Open consent page',
    verify: 'Verify connection',
    import: 'Import page'
  };
  return (
    <Panel id="source-diagnostics" title="Source connection support">
      <Text>Optional · Local diagnostics</Text>
      <Text>
        When a connection needs help, record the steps that fail. Start a capture, repeat the source
        action above, then stop and review the report. Do not start another Google consent attempt
        while one is pending or needs operator review.
      </Text>
      {muted(
        'Only connection stages, times, outcomes, retry indicators, random correlation IDs and GiGi build details are recorded. Email, calendar and chat content, account identities, passwords, tokens and consent links are excluded. Nothing is uploaded or sent automatically.'
      )}
      {muted(
        'Capture stops after one hour or when GiGi restarts. Up to 200 events are kept locally. Events older than 7 days are removed when diagnostics are accessed. Delete diagnostics removes this capture and GiGi’s local export; copies you deliberately share are outside GiGi.'
      )}
      <Text role="status">
        {!known
          ? 'Diagnostic status is unavailable. Check status again, or delete diagnostics to clear an unreadable capture before starting again.'
          : enabled
            ? `Capture enabled · ${status.eventCount} events at last check. Stop after reproducing the issue.`
            : `${status.eventCount} captured events · Capture stopped.`}
        {status?.expiresAt ? ` Capture stops by ${stamp(status.expiresAt)}.` : ''}
      </Text>
      <HStack gap={2} wrap="wrap">
        {button('status', 'Check capture status')}
        {known && enabled
          ? button('stop', 'Stop capture', false, false, true)
          : known && !status.eventCount
            ? button('start', 'Start local capture')
            : null}
        {known &&
          !enabled &&
          Boolean(status.eventCount) &&
          button('review', 'Review diagnostics', false, false, true)}
        {review?.reviewToken && !enabled && button('export', 'Export reviewed report')}
        {!known || status.eventCount || enabled || status?.exportExists || exported
          ? button('delete', 'Delete diagnostics', false, true)
          : null}
      </HStack>
      {review && (
        <VStack gap={3}>
          <Heading level={3}>Review before sharing</Heading>
          {muted(
            'Check these connection events and the exact report below. Export creates a local file only. Share it deliberately with your GiGi operator using a channel you trust; include the steps you took separately, without account details or source content.'
          )}
          {review.events?.length ? (
            <ol>
              {review.events.map((event, index) => (
                <li key={event.id || index}>
                  <strong>
                    {stages[event.stage] || 'Connection event'} · {event.outcome}
                  </strong>
                  <p>
                    {stamp(event.timestamp)} ·{' '}
                    {event.provider === 'googlecalendar'
                      ? 'Google Calendar'
                      : event.provider === 'gmail'
                        ? 'Gmail'
                        : 'GiGi'}{' '}
                    · {event.code}
                    {event.retry ? ' · Retry' : ''}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <Text>No connection events were captured.</Text>
          )}
          <Disclosure title="Exact diagnostic report" data-view-key="diagnostic-report">
            <pre>{review.content || code(review.report)}</pre>
          </Disclosure>
        </VStack>
      )}
      {exported && (
        <VStack gap={3}>
          <Heading level={3}>Local report exported</Heading>
          <Text>
            Nothing was sent. Copy this path, then use Finder → Go → Go to Folder to locate the
            file. Review it before choosing where to share it.
          </Text>
          <Field
            id="diagnostics-export-path"
            label="Export file on this Mac"
            value={exported.path}
            readOnly
          />
          {button('copy', 'Copy export path')}
        </VStack>
      )}
    </Panel>
  );
}

function AgentPreflight({ state }) {
  const value = state.agentPreflight;
  const button = (
    <B data-agent-preflight="1" disabled={state.busy}>
      {state.busy ? 'Checking setup…' : 'Check Codex registration & connector'}
    </B>
  );
  if (!value)
    return (
      <VStack gap={2}>
        {muted('Check that Codex points to this installed GiGi and workspace after an update.')}
        {button}
      </VStack>
    );
  if (value.error)
    return (
      <VStack gap={2}>
        <Message error>{value.error}</Message>
        {button}
      </VStack>
    );
  const registration = value.registration || {},
    connector = value.connector || {};
  return (
    <VStack gap={3} aria-label="Codex setup checks">
      <Heading level={3}>Codex setup checks</Heading>
      <Text role="status">
        Registration:{' '}
        {registration.state === 'matches' ? 'matches this GiGi and workspace' : registration.state}.
        Fresh connector: {connector.state}
        {connector.version ? ` · ${connector.version}` : ''}.
      </Text>
      {muted(
        `${registration.state === 'mismatch' ? 'The registered command, profile or options differ. Review the exact setup command below before changing Codex. ' : registration.state === 'missing' ? 'Prepare the connector, then run its setup command. ' : ''}${connector.reason ? connector.reason + '. ' : ''}Your current external agent session still needs its own gigi_connection_check and gigi_workspace_get calls. Preparing files, checking this fresh process or a past tool call cannot verify a cached session.`
      )}
      <Disclosure title="Observed paths and capabilities">
        <dl>
          {[
            ['App', value.appVersion],
            [
              'Codex CLI',
              `${value.codexCli?.state || 'Unverified'}${value.codexCli?.path ? ' · ' + value.codexCli.path : ''}${value.codexCli?.version ? ' · ' + value.codexCli.version : ''}`
            ],
            ['Expected connector', value.expectedCommand],
            ['Registered connector', registration.command || 'Not found'],
            ['Registered version', registration.registeredVersion || 'Unverified'],
            ['Expected profile', value.expectedProfile],
            ['Registered profile', registration.profile || 'Not found'],
            ['Configuration checked', registration.configPath],
            ['Missing media tools', connector.missingMediaTools?.join(', ') || 'None reported']
          ].map(([label, text]) => (
            <React.Fragment key={label}>
              <dt>{label}</dt>
              <dd>{text}</dd>
            </React.Fragment>
          ))}
        </dl>
      </Disclosure>
      {muted(
        'Configuration unchanged. Other configuration scopes and hosts need their own checks. Image generation requires a capable external host; embedded Ask GiGi cannot generate artwork.'
      )}
      {button}
    </VStack>
  );
}

function AgentSetup({ state }) {
  const claude = state.agentProvider === 'claude',
    provider = claude ? 'Claude Code' : 'Codex',
    command = claude ? state.agent?.claudeCommand : state.agent?.codexCommand;
  return (
    <Panel id="agent-setup" title="External agent connection">
      <Text>Optional</Text>
      {muted(
        'Connect this workspace to a separate Codex or Claude Code session. These steps are not required for built-in Ask GiGi. Use an eligible subscription account in the agent on this Mac. GiGi does not supply model tokens or require a model API key for this beta.'
      )}
      <Disclosure
        title="Connect an external Codex or Claude Code session"
        data-view-key="external-agent-setup"
      >
        <fieldset>
          <legend>Choose your agent</legend>
          <HStack gap={2} wrap="wrap">
            <B data-agent-provider="codex" aria-pressed={!claude}>
              Codex
            </B>
            <B data-agent-provider="claude" aria-pressed={claude}>
              Claude Code
            </B>
          </HStack>
        </fieldset>
        <Disclosure
          title={
            state.agentReceipt?.lastCall
              ? 'Review agent setup steps'
              : 'Set up and verify your agent'
          }
          data-view-key="agent-walkthrough"
          open={!state.agentReceipt?.lastCall}
        >
          <ol>
            <li>
              <strong>Sign in to {provider} on this Mac.</strong>
              <p>
                {claude
                  ? 'Have Claude Code available in Terminal and sign in with your Claude subscription account.'
                  : 'Have the Codex CLI available in Terminal and sign in with your ChatGPT account. The setup guide explains installation and sign-in.'}
              </p>
              <B variant="ghost" data-help={claude ? 'claude-setup' : 'codex-setup'}>
                Open {provider} setup guide ↗
              </B>
            </li>
            <li>
              <strong>Prepare GiGi’s connector.</strong>
              <p>
                This creates commands for this workspace; it does not install or connect the agent
                for you.
              </p>
              <B data-prepare-agent="1">
                {state.agentReceipt?.prepared || state.agent
                  ? 'Show setup commands'
                  : 'Prepare GiGi connector'}
              </B>
            </li>
            <li>
              <strong>{claude ? 'Start Claude with GiGi.' : 'Register GiGi with Codex.'}</strong>
              <p>
                {claude
                  ? 'Run the command below in Terminal. It loads GiGi for that Claude session. Use this command again for future GiGi sessions.'
                  : 'Run the command below in Terminal, then open a new local Codex session on this Mac. Restart an already-open desktop host if it has not picked up the connector.'}
              </p>
              {command ? (
                <VStack gap={2}>
                  <pre id="agent-command">{command}</pre>
                  <B data-copy-agent="command">Copy {provider} command</B>
                </VStack>
              ) : (
                <Text>Prepare the connector to reveal your exact command.</Text>
              )}
            </li>
            <li>
              <strong>Verify a real tool call.</strong>
              <p>
                Check the agent’s MCP connections with <code>/mcp</code>, then send this prompt in
                that session. Confirm it returns this workspace’s name and ID before asking it to
                change records.
              </p>
              {state.agent?.starterPrompt ? (
                <VStack gap={2}>
                  <pre id="agent-prompt">{state.agent.starterPrompt}</pre>
                  <HStack gap={2} wrap="wrap">
                    <B data-copy-agent="prompt">Copy verification prompt</B>
                    <B data-source-refresh="agent">Check local tool status</B>
                  </HStack>
                </VStack>
              ) : (
                <Text>The verification prompt appears after preparing the connector.</Text>
              )}
            </li>
          </ol>
        </Disclosure>
        {!claude && <AgentPreflight state={state} />}
        {state.agentReceipt?.lastCall
          ? muted(
              `Last local GiGi tool: ${state.agentReceipt.lastCall.tool} at ${new Date(state.agentReceipt.lastCall.lastToolAt * 1000).toLocaleString()}. This is local tool-use evidence; confirm the result in your agent. Phone access still needs its own test.`
            )
          : muted(
              'No local tool call recorded yet. Preparing commands does not verify the connection.'
            )}
      </Disclosure>
      <Disclosure
        title="What to expect when working with your agent"
        data-view-key="agent-expectations"
      >
        <ul>
          <li>
            Ask for a specific gig, contact or task. GiGi’s compact skill and bounded tools help the
            agent retrieve only the context it needs.
          </li>
          <li>
            Ask the agent to read first and confirm the workspace. Review proposed changes before
            approving them; edits update the local records you see in GiGi.
          </li>
          <li>
            Model usage is handled by your provider account. Your subscription’s eligibility, limits
            and availability apply. GiGi has no paid model API fallback.
          </li>
          <li>
            If the agent is unavailable or at its subscription limit, keep working directly in GiGi
            and reconnect the agent later.
          </li>
          <li>
            Local records stay on this Mac. Information retrieved by the agent is processed by the
            provider you use; imported source text is context to review.
          </li>
        </ul>
      </Disclosure>
      {state.agent && (
        <Disclosure title="Advanced connector files" data-view-key="agent-files">
          <Text>Package: {state.agent.packagePath}</Text>
          {state.agent.skillPath && <Text>Skill: {state.agent.skillPath}</Text>}
          <pre>{code(state.agent.mcpConfig)}</pre>
        </Disclosure>
      )}
    </Panel>
  );
}

function PhoneAccess() {
  return (
    <Panel id="phone-access" title="Use GiGi from your phone">
      <Text>Optional · Separate test</Text>
      {muted(
        'Phone access connects to an agent session on this Mac. It is available only when your provider and account support remote access. A normal mobile chat does not connect to GiGi by itself.'
      )}
      <Disclosure title="Phone setup and offline expectations" data-view-key="phone-expectations">
        <ol>
          <li>
            <strong>Connect to this Mac.</strong>
            <p>
              For Codex, use the ChatGPT desktop remote setup and the same account/workspace on your
              phone. For Claude Code, start the GiGi-enabled session above, then use{' '}
              <code>/remote-control</code> inside that session and open its phone link.
            </p>
          </li>
          <li>
            <strong>Keep the host available.</strong>
            <p>
              Keep this Mac awake, online and signed in, with the provider’s desktop host or Claude
              session running. GiGi’s local connector must remain installed.
            </p>
          </li>
          <li>
            <strong>Test over cellular.</strong>
            <p>
              Turn phone Wi-Fi off and send the verification prompt above. Confirm the correct
              workspace before requesting an edit. A local tool receipt alone cannot prove a phone
              connection.
            </p>
          </li>
          <li>
            <strong>If the Mac goes offline.</strong>
            <p>
              A request may wait or fail. Reconnect and check the record before retrying an edit, so
              a completed change is not repeated.
            </p>
          </li>
        </ol>
        <HStack gap={2} wrap="wrap">
          <B data-help="codex-remote">Codex remote guide ↗</B>
          <B data-help="claude-remote">Claude remote guide ↗</B>
        </HStack>
      </Disclosure>
    </Panel>
  );
}

function BackupRestore({ state }) {
  return (
    <Panel title="Backup & restore">
      {muted(
        'Create a local recovery point before major changes. Restore replaces the active workspace with a chosen backup.'
      )}
      <HStack gap={2} wrap="wrap">
        <B data-backup="1">Create backup</B>
        <B data-restore-toggle="1" disabled={state.busy}>
          Restore backup
        </B>
      </HStack>
      {state.backupId && <Text>Backup ID: {state.backupId}</Text>}
      {state.pendingRestoreId ? (
        <VStack gap={3} role="group" aria-label="Confirm restore">
          <Heading level={3}>Confirm restore</Heading>
          <Text>
            The current workspace will be replaced with backup {state.pendingRestoreId}. GiGi will
            save a safety backup first.
          </Text>
          <HStack gap={2} wrap="wrap">
            <B danger data-confirm-restore="1" disabled={state.busy}>
              Restore this backup
            </B>
            <B data-cancel-restore="1" disabled={state.busy}>
              Cancel
            </B>
          </HStack>
        </VStack>
      ) : (
        <form id="restore-form" hidden>
          <VStack gap={3}>
            <Field id="backup-id" name="backupId" label="Backup ID" required autoComplete="off" />
            <B danger type="submit">
              Continue to confirmation
            </B>
          </VStack>
        </form>
      )}
    </Panel>
  );
}

function SourceContext({ state }) {
  return (
    <Panel title="Source context" actions={<B data-context-sync="1">Sync local history</B>}>
      {muted(
        'Search supporting CTX history from this workspace. Current records and calculations remain in the local database. Each result shows its source session.'
      )}
      <form id="context-form">
        <HStack gap={2} wrap="wrap">
          <Field
            id="context-query"
            name="query"
            label="Search local history"
            required
            maxLength={160}
          />
          <B type="submit">Search</B>
        </HStack>
      </form>
      {state.contextQueried &&
        (state.contextHits.length ? (
          <VStack gap={3}>
            {state.contextHits.map((hit, index) => (
              <article key={hit.id || index}>
                <Text>{hit.snippet}</Text>
                {muted(`Source: ${hit.provider} · session ${hit.sessionId}`)}
              </article>
            ))}
          </VStack>
        ) : (
          muted('No matching history in this workspace.')
        ))}
    </Panel>
  );
}

export function Settings({ ctx }) {
  const { state, attention, ai } = ctx,
    summary = setupSummary(state);
  return (
    <VStack gap={6}>
      <PageHeading
        title="Setup & safety"
        description="Review what is ready, what still needs your consent, and how to protect your local data."
        actions={<B data-page="appearance">Customize appearance & views</B>}
      />
      {state.justCreated && (
        <Panel title="Your private workspace is ready.">
          <Text>
            Connect sources and an agent below, or start with a record. You can return to Settings
            at any time.
          </Text>
          <B data-new="gigs">Start with a gig</B>
        </Panel>
      )}
      {attention && <NotificationSettings controller={attention} />}
      <BuiltInChat state={state} />
      <AiConnectionSettings controller={ai} />
      <Panel title="Choose your next step">
        <Text>Connections are optional</Text>
        <B data-page="overview">Continue with local records ↗</B>
        {muted(summary.nextStep)}
        <ol>
          {summary.steps.map((step) => (
            <li key={step.id}>
              <Heading level={3}>{step.title}</Heading>
              <Text>{step.description}</Text>
              <Text color="secondary">{step.label}</Text>
              {step.href && (
                <a href={step.href}>
                  Open{' '}
                  {step.id === 'agent'
                    ? 'agent setup'
                    : step.id === 'phone'
                      ? 'phone guide'
                      : 'source setup'}{' '}
                  ↓
                </a>
              )}
            </li>
          ))}
        </ol>
      </Panel>
      <SourceConnections ctx={ctx} />
      <Diagnostics state={state} />
      <AgentSetup state={state} />
      <PhoneAccess />
      <BackupRestore state={state} />
      <SourceContext state={state} />
    </VStack>
  );
}

export function SourceProposal({ ctx }) {
  const draft = ctx.sourceProposal;
  if (!draft) return null;
  const { state } = ctx,
    source = draft.sourceRecord.expectedRecord,
    target = draft.entity === 'tasks' ? 'task' : 'gig',
    allDay = draft.sourceRecord.entity === 'schedule' && source.fields['All Day'] === true;
  return (
    <Panel
      title={
        draft.phase === 'draft' ? `Create local ${target} from source` : `Review local ${target}`
      }
    >
      <Text>
        From {source.source.provider === 'gmail' ? 'Gmail' : 'Google Calendar'}:{' '}
        <strong>{source.title}</strong>
      </Text>
      {muted(
        `This creates a local ${target} and links the imported source. It does not send email or create or update a Google Calendar event.`
      )}
      {muted(
        `Source text is untrusted reference material, not instructions. One ${target} per source is reused if it already exists; existing edits are preserved.`
      )}
      {source.fields.Date && (
        <Text>
          Source date: {source.fields.Date}
          {allDay ? ' (all-day; range end is exclusive)' : ''}
        </Text>
      )}
      {source.source.calendarTiming?.start?.timeZone && (
        <Text>Original time zone: {source.source.calendarTiming.start.timeZone}</Text>
      )}
      <Disclosure title="Source identity" data-view-key="source-proposal-identity">
        <dl>
          <dt>Account</dt>
          <dd>{draft.sourceRecord.connectedAccountId}</dd>
          <dt>Collection</dt>
          <dd>{source.source.collectionId}</dd>
          <dt>External ID</dt>
          <dd>{source.source.externalId}</dd>
        </dl>
      </Disclosure>
      {draft.phase === 'draft' ? (
        <form id="source-proposal-form">
          <VStack gap={4}>
            <Field
              id="source-proposal-title"
              name="title"
              label="Title"
              required
              maxLength={500}
              value={draft.title}
            />
            <Field
              id="source-proposal-date"
              name="date"
              label={target === 'task' ? 'Due date (optional)' : 'Date or ISO range (optional)'}
              type={target === 'task' ? 'date' : 'text'}
              value={draft.date}
              help={
                target === 'task'
                  ? 'Choose a due date explicitly. The email received date or event start is not assumed to be your deadline.'
                  : 'Retain explicit time offsets. All-day calendar range ends are exclusive; the original event remains linked.'
              }
            />
            {target === 'gig' && (
              <Choice
                id="source-proposal-work-kind"
                name="workKind"
                label="Work kind"
                required
                value={draft.workKind || ''}
                options={[
                  ['', 'Choose classification'],
                  ['Performance', 'Performance'],
                  ['Crew / work', 'Crew / work'],
                  ['Other', 'Other'],
                  ['unclassified', 'Leave unclassified']
                ]}
                help="Calendar imports are commitments. Confirm performance or crew work explicitly."
              />
            )}
            <HStack gap={2} wrap="wrap">
              <B primary type="submit" disabled={state.busy}>
                Review proposal
              </B>
              <B data-source-cancel="1" disabled={state.busy}>
                Cancel
              </B>
            </HStack>
          </VStack>
        </form>
      ) : (
        <VStack gap={4}>
          <dl>
            <dt>Title</dt>
            <dd>{draft.title}</dd>
            {target === 'gig' && (
              <>
                <dt>Work kind</dt>
                <dd>{draft.workKind === 'unclassified' ? 'Unclassified' : draft.workKind}</dd>
              </>
            )}
            <dt>{target === 'task' ? 'Due date' : 'Date'}</dt>
            <dd>{draft.date || 'Not set'}</dd>
          </dl>
          {draft.phase === 'submitted' && (
            <Message status="warning">
              GiGi has not confirmed this save. Retry the same request to recover its result or
              complete it once. Do not start a new proposal for this source. Closing this review
              does not cancel or undo the submitted save.
            </Message>
          )}
          <HStack gap={2} wrap="wrap">
            <B primary data-source-approve="1" disabled={state.busy}>
              {draft.phase === 'submitted'
                ? 'Retry exact save'
                : `Approve and create local ${target}`}
            </B>
            {draft.phase === 'review' && (
              <B data-source-edit="1" disabled={state.busy}>
                Back to edit
              </B>
            )}
            <B data-source-cancel="1" disabled={state.busy}>
              {draft.phase === 'submitted' ? 'Close review' : 'Cancel'}
            </B>
          </HStack>
        </VStack>
      )}
    </Panel>
  );
}
