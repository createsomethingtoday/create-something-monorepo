import { sourceNeedsOperatorReview, pendingConsentForProvider } from './model.mjs';

/** Plain-language feedback for a connector status receipt. UI callers escape the strings. */
export function sourceView(source) {
  if (source?.state === 'connected') return {
    label: 'Account verified',
    description: 'Account verified. Import records when you are ready.',
  };
  if (source?.state === 'checking') return {
    label: 'Checking status',
    description: 'Checking the source account. Your local records are ready to use.',
  };
  if (sourceNeedsOperatorReview(source)) return {
    label: 'Review needed',
    description: 'The connection outcome is uncertain. Ask the GiGi operator to review this attempt before connecting again.',
  };
  if (source?.state === 'attention' && source.reconnectable === true) return {
    label: 'Reconnect needed',
    description: 'The previous connection ended. Connect again with fresh consent.',
  };
  if (source?.state === 'pending') return {
    label: 'Consent pending',
    description: 'Finish consent in your browser, then check status and verify the account.',
  };
  if (source?.detail === 'refresh_in_progress') return {
    label: 'Checking session',
    description: 'The connector is refreshing your session. Wait a moment, then check status again.',
  };
  if (source?.detail === 'refresh_outcome_unknown') return {
    label: 'Check status',
    description: 'The session refresh outcome is uncertain. Check status before trying to connect again.',
  };
  if (source?.detail === 'access_denied') return {
    label: 'Access not enabled',
    description: 'This GiGi sign-in is not permitted to use sources. Ask the GiGi operator to check access for this app; repeating Google consent will not resolve it.',
  };
  if (source?.detail === 'provider_unavailable') return {
    label: 'Service unavailable',
    description: 'The connection service could not complete this check. Try Check status later. Do not start another consent attempt.',
  };
  if (source?.detail === 'session_expired' || source?.detail === 'reauthentication_required') return {
    label: 'Sign in again',
    description: 'Your connector session expired. Sign in again, then check source status.',
  };
  if (source?.detail === 'unauthorized') return {
    label: 'Sign in needed',
    description: 'Sign in to the source account, then check status before retrying.',
  };
  if (source?.state === 'attention') return {
    label: 'Needs attention',
    description: 'Check status before starting another connection attempt.',
  };
  if (source?.state === 'unconfigured') return {
    label: 'Needs setup',
    description: 'Source connections need developer configuration on this build.',
  };
  if (source?.state === 'unavailable') return {
    label: 'Unavailable',
    description: 'The source is unavailable. Check status again later; your local records are unchanged.',
  };
  return {
    label: 'Not connected',
    description: 'Connect with your own account consent, or continue with manual records.',
  };
}

/** Copy and hierarchy for Settings. Counts only status receipts, never setup intent. */
export function setupSummary({ workspace, sources = {}, agentReceipt, agent } = {}) {
  const providers = ['gmail', 'googlecalendar'];
  const verifiedCount = providers.filter((provider) => sources?.[provider]?.state === 'connected').length;
  const checkingCount = providers.filter((provider) => sources?.[provider]?.state === 'checking' || sources?.[provider]?.state !== 'connected' && sources?.[provider]?.detail === 'refresh_in_progress').length;
  const uncertainRefresh = providers.some((provider) => sources?.[provider]?.state !== 'connected' && sources?.[provider]?.detail === 'refresh_outcome_unknown');
  const prepared = agentReceipt?.prepared === true || Boolean(agent);
  const localToolUsed = Boolean(agentReceipt?.lastCall);
  const phoneVerified = agentReceipt?.phoneVerified === true;
  const steps = [
    {
      id: 'workspace', title: 'Private workspace', label: workspace ? 'Ready' : 'Needs setup',
      description: workspace ? `${workspace.name || 'Your workspace'} is stored on this desktop.` : 'Create a private workspace on this desktop.',
    },
    {
      id: 'sources', title: 'Sources', label: `${verifiedCount} of 2 verified`, href: '#source-connections',
      description: checkingCount ? `Checking ${checkingCount} ${checkingCount === 1 ? 'source' : 'sources'}. Your local records are ready to use.` : uncertainRefresh ? 'The session refresh outcome is uncertain. Check source status before trying to connect again.' : 'Each account needs its own consent. Import records after verification.',
    },
    {
      id: 'agent', title: 'Codex or Claude Code',
      label: localToolUsed ? phoneVerified ? 'Local tool used · Device test recorded' : 'Local tool used · Phone unverified' : prepared ? 'Prepared · Not verified' : 'Not verified',
      href: '#agent-setup',
      description: localToolUsed ? 'Confirm the tool result in your agent.' : prepared ? 'Run the setup command, then verify a real local tool call.' : 'Prepare the connector, then run and verify it in your agent.',
    },
    {
      id: 'phone', title: 'Phone access', label: phoneVerified ? 'Device test recorded' : 'Needs device test', href: '#phone-access',
      description: 'Test from your phone over cellular with this Mac awake and online.',
    },
  ];

  let nextStep = 'Start with a record or choose an optional connection below.';
  if (!workspace) nextStep = 'Create your private workspace.';
  else if (providers.some((provider) => sourceNeedsOperatorReview(sources?.[provider]))) nextStep = 'Ask the GiGi operator to review the uncertain source connection.';
  else if (uncertainRefresh) nextStep = 'Check source status before trying to connect again.';
  else if (checkingCount) nextStep = 'Wait for the source check, then check status again if needed.';
  else if (sources?.googlecalendar?.state === 'pending') nextStep = 'Finish Google Calendar consent, then verify the account.';
  else if (sources?.gmail?.state === 'pending') nextStep = 'Finish Gmail consent, then verify the account.';
  else if (providers.some(provider => ['access_denied', 'session_expired', 'reauthentication_required', 'provider_unavailable'].includes(sources?.[provider]?.detail))) nextStep = sourceJourney(sources).next;
  else if (prepared && !localToolUsed) nextStep = 'Run the agent setup command, then verify a real local tool call.';
  else if (localToolUsed && !phoneVerified) nextStep = 'Confirm the tool result in your agent, then test phone access separately if needed.';

  return { steps, nextStep };
}

/** Steps derive from authoritative status receipts, never from sign-in button clicks. */
export function sourceJourney(sources = {}, attempts = {}) {
  const values = ['gmail', 'googlecalendar'].map(provider => sources[provider]);
  const denied = values.some(source => source?.detail === 'access_denied');
  const signIn = values.some(source => ['session_expired', 'reauthentication_required', 'unauthorized'].includes(source?.detail));
  const service = values.some(source => ['provider_unavailable', 'unconfigured', 'refresh_outcome_unknown', 'refresh_in_progress'].includes(source?.detail));
  const connected = values.some(source => source?.state === 'connected');
  const pending = values.some(source => ['pending', 'attention'].includes(source?.state));
  const review = values.some(sourceNeedsOperatorReview);
  const reconnect = values.some(source => source?.state === 'attention' && source.reconnectable === true);
  const admitted = !denied && !signIn && !service && values.some(source => ['disconnected', 'pending', 'connected', 'attention'].includes(source?.state));
  const consent = ['gmail', 'googlecalendar'].some(provider => pendingConsentForProvider(sources[provider], attempts, provider));
  const current = !admitted ? 1 : review ? 4 : consent ? 3 : reconnect ? 2 : pending ? 4 : connected ? 5 : 2;
  const next = denied ? 'Ask the GiGi operator to check source access for this app.'
    : signIn ? 'Sign in to GiGi sources, then check status. Google consent is a separate step.'
    : service ? 'Check status again before starting or resuming consent.'
    : review ? 'Ask the GiGi operator to review the uncertain connection before connecting again.'
    : consent ? 'Resume the pending Google consent below, then check status and verify. Do not start a second attempt.'
    : reconnect ? 'The previous connection ended. Choose Reconnect below to start fresh consent.'
    : pending ? 'Check status and verify the pending connection. If no consent link is available, do not start another attempt.'
    : connected ? 'Check the verified Google identity below, then import one bounded page when ready.'
    : admitted ? 'Choose Gmail or Google Calendar below. You can connect either source independently.'
    : 'Check source status or sign in to GiGi sources. Your local workspace is ready.';
  return { current, next, stages: ['Local workspace', 'GiGi source sign-in', 'Choose a source', 'Google consent', 'Verify connection', 'Import one page'] };
}
