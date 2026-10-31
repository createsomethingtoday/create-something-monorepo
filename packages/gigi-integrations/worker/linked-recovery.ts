import { createHash } from 'node:crypto';

export interface LinkedAttempt {
  subject: string; provider: 'gmail' | 'googlecalendar'; request_id: string; status: string;
  connected_account_id: string | null; reconnectable: number; redirect_url: string | null;
  expires_at: string | null; created_at: string;
}
export interface AccountRecord { id: string; user_id: string; auth_config: { id: string } }
export interface ConfigRecord {
  status: number; id?: string; toolkitSlug?: string; authScheme?: string;
  isComposioManaged?: boolean; state?: string; scopes?: string[];
}
export interface DeploymentReceipt {
  accountId: string; deploymentId: string; deployedAt: string; versionId: string;
  percentage: number; gmailConfigId: string; gmailScopes: string; databaseId: string;
  completeHistory: boolean; coversAttemptCreation: boolean;
}
export interface AccountScan { status: number; items: AccountRecord[]; complete: boolean; pages: number }
export type ScanKind = 'owner' | 'old_config' | 'combined' | 'project';
export interface RecoveryPorts {
  now(): number; wait(milliseconds: number): Promise<void>;
  readRecoveryFence?(): Promise<boolean>;
  readInsertFence?(): Promise<boolean>;
  readAttemptHistory?(subject: string, provider: LinkedAttempt['provider']): Promise<LinkedAttempt[]>;
  /** Operator CLI convenience: discover only the single hard-pinned target row. */
  readReviewedTarget?(accountId: string): Promise<LinkedAttempt | null>;
  readAttempt(subject: string, provider: LinkedAttempt['provider'], requestId: string): Promise<LinkedAttempt | null>;
  getAccount(accountId: string): Promise<{ status: number; account?: AccountRecord }>;
  getAuthConfig(authConfigId: string): Promise<ConfigRecord>;
  scanAccounts(kind: ScanKind, ownerUserId: string, oldAuthConfigId: string): Promise<AccountScan>;
  readDeployment(attemptCreatedAt: string): Promise<DeploymentReceipt>;
  conditionalUpdate(sql: string, values: readonly (string | number)[]): Promise<{ changes: number }>;
  beforeWrite?(evidence: RecoveryEvidence): Promise<void>;
}
export interface RecoveryInput {
  subject: string; provider: LinkedAttempt['provider']; requestId: string; accountId: string;
  oldAuthConfigId: string; operator: string; reason: string; apply?: boolean;
}
export interface RecoveryEvidence {
  procedure: 'gigi-removed-gmail-config-recovery-v3'; operator: string; reason: string;
  observedAt: string; subject: string; provider: 'gmail'; requestId: string; accountId: string;
  ownerUserId: string; oldAuthConfigId: string; oldAuthConfigStatus: 404;
  currentAuthConfigId: string; positiveControlAccountId: string; sourceCommit: string;
  deployment: DeploymentReceipt; ownerAttemptCount: number; createdAt: string; consentExpiredAt: string;
  checks: { at: string; exactGetStatus: 404; scans: Record<ScanKind, { pages: number; count: number; complete: true }> }[];
  preWriteReadback: 'exact_match'; recoveryFence: 'exact_definitions_verified'; insertFence: 'selected_gmail_verified'; writeChanges?: number;
}
export type RecoveryResult = { outcome: 'blocked' | 'eligible_preview' | 'released'; reason?: string; evidence?: RecoveryEvidence };
const TEN_MINUTES = 600_000;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/u;
const ACCOUNT_ID = /^ca_[A-Za-z0-9_-]{1,128}$/u;
const OLD = 'ac_s2YEkh21bMT8';
const CURRENT = 'ac_qXoEQURadG-h';
const CONTROL = 'ca_BlstebUrbBn_';
const TARGET_ACCOUNT = 'ca_lb1WbyU07_b-';
const TARGET_CREATED = '2026-09-30T14:51:57.225Z';
const SOURCE_COMMIT = '1e0decc916';
const VERSION = 'e6c10c86-94ae-44ae-9a2d-7fdd8fc9fc90';
const DEPLOYMENT = '2c9066a0-b7a5-4f1d-a7c7-d1c3b420f027';
const DEPLOYED_AT = '2026-09-30T12:33:59.563454Z';
const DATABASE = 'bcefe77e-d4b7-4d70-9002-1f969eef3457';
const ACCOUNT = '9645bd52e640b8a4f40a3a55ff1dd75a';
const OLD_SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';
const CURRENT_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/contacts.other.readonly',
  'https://www.googleapis.com/auth/profile.language.read',
  'https://www.googleapis.com/auth/user.addresses.read',
  'https://www.googleapis.com/auth/user.birthday.read',
  'https://www.googleapis.com/auth/user.emails.read',
  'https://www.googleapis.com/auth/user.phonenumbers.read',
  'https://www.googleapis.com/auth/profile.emails.read',
  'https://mail.google.com/',
];
const blocked = (reason: string): RecoveryResult => ({ outcome: 'blocked', reason });
function sameRow(a: LinkedAttempt, b: LinkedAttempt): boolean {
  return a.subject === b.subject && a.provider === b.provider && a.request_id === b.request_id &&
    a.status === b.status && a.connected_account_id === b.connected_account_id &&
    a.reconnectable === b.reconnectable && a.redirect_url === b.redirect_url &&
    a.expires_at === b.expires_at && a.created_at === b.created_at;
}
function validDeployment(value: DeploymentReceipt, created: number): boolean {
  return value.accountId === ACCOUNT && value.deploymentId === DEPLOYMENT &&
    value.deployedAt === DEPLOYED_AT && value.versionId === VERSION &&
    value.percentage === 100 && value.gmailConfigId === OLD &&
    value.gmailScopes === OLD_SCOPES && value.databaseId === DATABASE &&
    value.completeHistory === true && value.coversAttemptCreation === true &&
    Date.parse(value.deployedAt) <= created;
}
function validCurrent(config: ConfigRecord): boolean {
  return config.status === 200 && config.id === CURRENT && config.toolkitSlug === 'gmail' &&
    config.authScheme === 'OAUTH2' && config.isComposioManaged === true &&
    config.state === 'ENABLED' && Array.isArray(config.scopes) &&
    config.scopes.length === CURRENT_SCOPES.length &&
    new Set(config.scopes).size === CURRENT_SCOPES.length &&
    CURRENT_SCOPES.every((scope) => config.scopes!.includes(scope));
}
function validScan(scan: AccountScan, kind: ScanKind, owner: string, accountId: string): boolean {
  if (scan.status !== 200 || scan.complete !== true || !Number.isSafeInteger(scan.pages) ||
    scan.pages < 1 || !Array.isArray(scan.items)) return false;
  for (const item of scan.items) {
    if (!item || !ACCOUNT_ID.test(item.id) || typeof item.user_id !== 'string' ||
      !item.auth_config || !ID.test(item.auth_config.id)) return false;
    if (kind === 'owner' && item.user_id !== owner) return false;
    if (kind === 'old_config' && item.auth_config.id !== OLD) return false;
    if (kind === 'combined' && (item.user_id !== owner || item.auth_config.id !== OLD)) return false;
    if (item.id === accountId || (item.user_id === owner && item.auth_config.id === OLD)) return false;
  }
  return true;
}
export async function recoverStaleLinked(input: RecoveryInput, ports: RecoveryPorts): Promise<RecoveryResult> {
  if (!input.subject || !ID.test(input.requestId) || !ACCOUNT_ID.test(input.accountId) ||
    !input.operator.trim() || !input.reason.trim() ||
    input.provider !== 'gmail' || input.oldAuthConfigId !== OLD ||
    input.accountId !== TARGET_ACCOUNT) return blocked('invalid_or_unreviewed_input');
  const first = await ports.readAttempt(input.subject, input.provider, input.requestId);
  if (!first || first.subject !== input.subject || first.provider !== input.provider ||
    first.request_id !== input.requestId || first.status !== 'linked' ||
    first.connected_account_id !== input.accountId || first.reconnectable !== 0 ||
    first.created_at !== TARGET_CREATED)
    return blocked('d1_not_exact_linked');
  const now = ports.now();
  const created = Date.parse(first.created_at);
  const expires = Date.parse(first.expires_at ?? '');
  if (!Number.isFinite(created) || created > now) return blocked('attempt_time_invalid');
  if (!first.redirect_url || !Number.isFinite(expires) || expires > now) return blocked('consent_not_expired');
  let consent: URL;
  try { consent = new URL(first.redirect_url); } catch { return blocked('invalid_consent_url'); }
  if (consent.protocol !== 'https:' || consent.hostname !== 'connect.composio.dev' || consent.port ||
    consent.username || consent.password || consent.hash) return blocked('invalid_consent_url');
  const deployment = await ports.readDeployment(first.created_at);
  if (!validDeployment(deployment, created)) return blocked('historical_deployment_unverified');
  if (!ports.readRecoveryFence || !(await ports.readRecoveryFence())) return blocked('recovery_fence_unverified');
  if (!ports.readInsertFence || !(await ports.readInsertFence())) return blocked('legacy_insert_fence_unverified');
  if (!ports.readAttemptHistory) return blocked('owner_attempt_history_unverified');
  const history = await ports.readAttemptHistory(input.subject, input.provider);
  const validHistory = (rows: LinkedAttempt[]) => rows.length > 0 && rows.length <= 1000 &&
    rows.filter((entry) => sameRow(entry, first)).length === 1 &&
    new Set(rows.map((entry) => entry.request_id)).size === rows.length &&
    rows.every((entry) => entry.subject === input.subject && entry.provider === 'gmail' &&
      (sameRow(entry, first) || (entry.status === 'attention' && entry.reconnectable === 1 &&
        typeof entry.connected_account_id === 'string' && ACCOUNT_ID.test(entry.connected_account_id))));
  if (!validHistory(history)) return blocked('owner_attempt_history_ambiguous');
  const oldConfig = await ports.getAuthConfig(OLD);
  if (oldConfig.status !== 404) return blocked('old_config_not_removed');
  if (!validCurrent(await ports.getAuthConfig(CURRENT))) return blocked('current_project_control_invalid');
  const control = await ports.getAccount(CONTROL);
  if (control.status !== 200 || control.account?.id !== CONTROL ||
    control.account.auth_config.id !== CURRENT || !control.account.user_id)
    return blocked('known_account_control_invalid');
  const ownerUserId = 'gigi_' + createHash('sha256').update(input.subject).digest('hex').slice(0, 32);
  const checks: RecoveryEvidence['checks'] = [];
  for (let pass = 0; pass < 2; pass++) {
    const checkedAt = ports.now();
    if ((await ports.getAccount(input.accountId)).status !== 404) return blocked('exact_get_not_404');
    const scans = {} as RecoveryEvidence['checks'][number]['scans'];
    for (const kind of ['owner', 'old_config', 'combined', 'project'] as const) {
      const scan = await ports.scanAccounts(kind, ownerUserId, OLD);
      if (!validScan(scan, kind, ownerUserId, input.accountId)) return blocked(kind + '_scan_invalid_or_account_present');
      scans[kind] = { pages: scan.pages, count: scan.items.length, complete: true };
    }
    checks.push({ at: new Date(checkedAt).toISOString(), exactGetStatus: 404, scans });
    if (pass === 0) await ports.wait(TEN_MINUTES);
  }
  if (Date.parse(checks[1]!.at) - Date.parse(checks[0]!.at) < TEN_MINUTES) return blocked('checks_too_close');
  const current = await ports.readAttempt(input.subject, input.provider, input.requestId);
  if (!current || !sameRow(first, current)) return blocked('d1_changed');
  if (input.apply === true && !validDeployment(await ports.readDeployment(first.created_at), created))
    return blocked('historical_deployment_changed');
  if (input.apply === true && !(await ports.readRecoveryFence())) return blocked('recovery_fence_changed');
  if (input.apply === true && !(await ports.readInsertFence())) return blocked('legacy_insert_fence_changed');
  if (input.apply === true && !validHistory(await ports.readAttemptHistory(input.subject, input.provider)))
    return blocked('owner_attempt_history_changed');
  const evidence: RecoveryEvidence = {
    procedure: 'gigi-removed-gmail-config-recovery-v3', operator: input.operator.trim(),
    reason: input.reason.trim(), observedAt: new Date(ports.now()).toISOString(),
    subject: input.subject, provider: 'gmail', requestId: input.requestId, accountId: input.accountId,
    ownerUserId, oldAuthConfigId: OLD, oldAuthConfigStatus: 404,
    currentAuthConfigId: CURRENT, positiveControlAccountId: CONTROL, sourceCommit: SOURCE_COMMIT,
    deployment, ownerAttemptCount: history.length, createdAt: first.created_at, consentExpiredAt: first.expires_at!,
    checks, preWriteReadback: 'exact_match', recoveryFence: 'exact_definitions_verified', insertFence: 'selected_gmail_verified',
  };
  if (input.apply !== true) return { outcome: 'eligible_preview', evidence };
  if (!ports.beforeWrite) return blocked('prewrite_receipt_required');
  await ports.beforeWrite(evidence);
  const sql = "UPDATE gigi_connection_attempts SET status = 'attention', reconnectable = 1 WHERE subject = ? AND provider = ? AND request_id = ? AND status = 'linked' AND connected_account_id = ? AND reconnectable = 0 AND created_at = ? AND redirect_url = ? AND expires_at = ?";
  const update = await ports.conditionalUpdate(sql, [input.subject, input.provider, input.requestId,
    input.accountId, first.created_at, first.redirect_url, first.expires_at!]);
  evidence.writeChanges = update.changes;
  if (update.changes !== 1) return { outcome: 'blocked', reason: 'write_not_exactly_one', evidence };
  return { outcome: 'released', evidence };
}
