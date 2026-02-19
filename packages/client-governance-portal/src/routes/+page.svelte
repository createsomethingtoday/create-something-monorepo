<script lang="ts">
  import {
    createRuntimeKey,
    createTenant,
    getAdminPerformance,
    getTenant,
    getTenantUsage,
    listTenants,
    updatePolicy,
    upsertCredential,
    type AdminPerformance,
    type TenantConfig,
    type TenantSummary,
    type TenantUsage,
  } from '$lib/controlApi';

  let baseUrl = '';
  let adminToken = '';

  let tenants: TenantSummary[] = [];
  let selectedTenantId = '';
  let tenantConfig: TenantConfig | null = null;
  let usage: TenantUsage | null = null;
  let adminPerformance: AdminPerformance | null = null;

  let loading = false;
  let error = '';
  let info = '';

  let newTenantName = '';
  let newTenantSlug = '';

  let runtimeKeyLabel = 'prod-codex';
  let generatedRuntimeKey = '';

  let credentialProvider = 'openai';
  let credentialMode: 'managed' | 'byok' = 'managed';
  let managedSecretName = 'OPENAI_MANAGED_KEY';
  let byokApiKey = '';

  let readOnly = false;
  let allowPromptLogging = false;
  let approvalPosture = 'operator';
  let monthlyBudget = '';
  let warnThreshold = '80';
  let hardLimit = true;
  let ratePerMinute = '120';
  let burstLimit = '180';
  let windowSeconds = '60';
  let modelAllowlistText = 'openai:gpt-4.1\nopenai:gpt-4.1-mini';

  function clearStatus() {
    error = '';
    info = '';
  }

  function requireConnection(): boolean {
    if (!baseUrl.trim() || !adminToken.trim()) {
      error = 'Set Control URL and Admin Token first.';
      return false;
    }
    return true;
  }

  function options() {
    return {
      baseUrl: baseUrl.replace(/\/$/, ''),
      adminToken,
    };
  }

  async function loadAdminPerformance() {
    if (!requireConnection()) return;
    adminPerformance = await getAdminPerformance(options(), 30);
  }

  async function connect() {
    clearStatus();
    if (!requireConnection()) return;

    loading = true;
    try {
      const result = await listTenants(options());
      tenants = result.tenants;
      await loadAdminPerformance();
      info = `Connected. Loaded ${tenants.length} tenant(s).`;
      if (!selectedTenantId && tenants[0]) {
        selectedTenantId = tenants[0].id;
        await loadTenant();
      }
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      loading = false;
    }
  }

  async function loadTenant() {
    clearStatus();
    if (!requireConnection() || !selectedTenantId) return;

    loading = true;
    try {
      tenantConfig = await getTenant(options(), selectedTenantId);
      usage = await getTenantUsage(options(), selectedTenantId);

      const budget = tenantConfig.budget;
      const rate = tenantConfig.rate_limit;
      const policy = tenantConfig.policy;

      monthlyBudget = budget?.monthly_budget_usd != null ? String(budget.monthly_budget_usd) : '';
      warnThreshold = budget?.warn_threshold_percent != null ? String(budget.warn_threshold_percent) : '80';
      hardLimit = budget?.hard_limit_enabled === 1;

      ratePerMinute = rate?.requests_per_minute != null ? String(rate.requests_per_minute) : '120';
      burstLimit = rate?.burst_limit != null ? String(rate.burst_limit) : '180';
      windowSeconds = rate?.window_seconds != null ? String(rate.window_seconds) : '60';

      readOnly = policy?.read_only === 1;
      allowPromptLogging = policy?.allow_prompt_logging === 1;
      approvalPosture = policy?.approval_posture || 'operator';

      modelAllowlistText = tenantConfig.models
        .map((m) => `${m.provider_slug}:${m.model_name}`)
        .join('\n');
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      loading = false;
    }
  }

  async function submitTenant() {
    clearStatus();
    if (!requireConnection()) return;
    if (!newTenantName.trim()) {
      error = 'Tenant name is required.';
      return;
    }

    loading = true;
    try {
      const created = await createTenant(options(), {
        name: newTenantName.trim(),
        slug: newTenantSlug.trim() || undefined,
      });

      newTenantName = '';
      newTenantSlug = '';
      info = `Created tenant ${created.slug}.`;
      await connect();
      selectedTenantId = created.id;
      await loadTenant();
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      loading = false;
    }
  }

  async function submitRuntimeKey() {
    clearStatus();
    if (!requireConnection() || !selectedTenantId) return;

    loading = true;
    try {
      const created = await createRuntimeKey(options(), selectedTenantId, runtimeKeyLabel.trim() || 'runtime-key');
      generatedRuntimeKey = created.key;
      info = `Created runtime key ${created.key_prefix}.`;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      loading = false;
    }
  }

  async function submitCredential() {
    clearStatus();
    if (!requireConnection() || !selectedTenantId) return;

    const payload: Record<string, unknown> = {
      provider_slug: credentialProvider,
      mode: credentialMode,
    };

    if (credentialMode === 'managed') {
      payload.managed_secret_name = managedSecretName;
    } else {
      payload.api_key = byokApiKey;
    }

    loading = true;
    try {
      await upsertCredential(options(), selectedTenantId, payload);
      byokApiKey = '';
      info = `Updated ${credentialProvider} credential (${credentialMode}).`;
      await loadTenant();
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      loading = false;
    }
  }

  async function submitPolicy() {
    clearStatus();
    if (!requireConnection() || !selectedTenantId) return;

    const modelAllowlist = modelAllowlistText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [provider_slug, model_name] = line.split(':');
        return { provider_slug, model_name };
      })
      .filter((entry) => entry.provider_slug && entry.model_name);

    loading = true;
    try {
      await updatePolicy(options(), selectedTenantId, {
        read_only: readOnly,
        allow_prompt_logging: allowPromptLogging,
        approval_posture: approvalPosture,
        model_allowlist: modelAllowlist,
        budget: {
          monthly_budget_usd: monthlyBudget ? Number(monthlyBudget) : null,
          warn_threshold_percent: Number(warnThreshold) || 80,
          hard_limit_enabled: hardLimit,
        },
        rate_limit: {
          requests_per_minute: Number(ratePerMinute) || 120,
          burst_limit: Number(burstLimit) || 180,
          window_seconds: Number(windowSeconds) || 60,
        },
      });
      info = 'Policy, model allowlist, budget, and rate limits updated.';
      await loadTenant();
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      loading = false;
    }
  }
</script>

<main class="page">
  <header class="hero">
    <p class="eyebrow">CREATE SOMETHING</p>
    <h1>Client Governance Portal</h1>
    <p class="lede">Tenant-isolated runtime governance, key management, model controls, and live usage intelligence.</p>
  </header>

  <section class="panel connection">
    <h2>Control Plane Connection</h2>
    <div class="fields two">
      <label>
        Control URL
        <input bind:value={baseUrl} placeholder="https://gateway-control-worker.example.workers.dev" />
      </label>
      <label>
        Admin Token
        <input bind:value={adminToken} type="password" placeholder="OPERATOR_API_TOKEN" />
      </label>
    </div>
    <button on:click={connect} disabled={loading}>Connect</button>
  </section>

  {#if error}
    <p class="status error">{error}</p>
  {/if}
  {#if info}
    <p class="status info">{info}</p>
  {/if}

  <section class="grid">
    <article class="panel">
      <h2>Tenants</h2>
      <div class="fields two">
        <label>
          Name
          <input bind:value={newTenantName} placeholder="Acme Client" />
        </label>
        <label>
          Slug (optional)
          <input bind:value={newTenantSlug} placeholder="acme" />
        </label>
      </div>
      <button on:click={submitTenant} disabled={loading}>Create Tenant</button>

      <label class="mt">
        Active Tenant
        <select bind:value={selectedTenantId} on:change={loadTenant}>
          <option value="">Select tenant</option>
          {#each tenants as tenant}
            <option value={tenant.id}>{tenant.name} ({tenant.slug})</option>
          {/each}
        </select>
      </label>

      {#if tenantConfig}
        <dl class="kv">
          <dt>Status</dt><dd>{tenantConfig.tenant.status}</dd>
          <dt>ID</dt><dd class="mono">{tenantConfig.tenant.id}</dd>
          <dt>Updated</dt><dd>{tenantConfig.tenant.updated_at}</dd>
        </dl>
      {/if}
    </article>

    <article class="panel">
      <h2>Runtime Keys</h2>
      <label>
        Label
        <input bind:value={runtimeKeyLabel} placeholder="prod-codex" />
      </label>
      <button on:click={submitRuntimeKey} disabled={loading || !selectedTenantId}>Create Runtime Key</button>

      {#if generatedRuntimeKey}
        <p class="hint warning">Shown once. Store securely.</p>
        <textarea readonly rows="4" value={generatedRuntimeKey}></textarea>
      {/if}
    </article>

    <article class="panel">
      <h2>Provider Credential</h2>
      <div class="fields two">
        <label>
          Provider
          <input bind:value={credentialProvider} placeholder="openai" />
        </label>
        <label>
          Mode
          <select bind:value={credentialMode}>
            <option value="managed">managed</option>
            <option value="byok">byok</option>
          </select>
        </label>
      </div>

      {#if credentialMode === 'managed'}
        <label>
          Managed Secret Name
          <input bind:value={managedSecretName} placeholder="OPENAI_MANAGED_KEY" />
        </label>
      {:else}
        <label>
          BYOK API Key
          <input bind:value={byokApiKey} type="password" placeholder="sk-..." />
        </label>
      {/if}

      <button on:click={submitCredential} disabled={loading || !selectedTenantId}>Save Credential</button>

      {#if tenantConfig?.credentials?.length}
        <table>
          <thead><tr><th>Provider</th><th>Mode</th><th>Status</th></tr></thead>
          <tbody>
            {#each tenantConfig.credentials as row}
              <tr>
                <td>{row.provider_slug}</td>
                <td>{row.mode}</td>
                <td>{row.status}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </article>

    <article class="panel wide">
      <h2>Policy, Model Allowlist, Budget, Rate Limits</h2>
      <div class="fields two">
        <label>
          Approval Posture
          <select bind:value={approvalPosture}>
            <option value="operator">operator</option>
            <option value="tenant">tenant</option>
            <option value="none">none</option>
          </select>
        </label>
        <label>
          Monthly Budget (USD)
          <input bind:value={monthlyBudget} placeholder="500" />
        </label>
      </div>
      <div class="checks">
        <label><input type="checkbox" bind:checked={readOnly} /> Read-only policy</label>
        <label><input type="checkbox" bind:checked={allowPromptLogging} /> Allow prompt logging</label>
        <label><input type="checkbox" bind:checked={hardLimit} /> Enforce hard budget limit</label>
      </div>

      <div class="fields three">
        <label>
          Warn Threshold %
          <input bind:value={warnThreshold} />
        </label>
        <label>
          Requests / Minute
          <input bind:value={ratePerMinute} />
        </label>
        <label>
          Burst Limit
          <input bind:value={burstLimit} />
        </label>
      </div>

      <label>
        Rate Window Seconds
        <input bind:value={windowSeconds} />
      </label>

      <label>
        Model Allowlist (`provider:model`, one per line)
        <textarea bind:value={modelAllowlistText} rows="6"></textarea>
      </label>

      <button on:click={submitPolicy} disabled={loading || !selectedTenantId}>Apply Policy</button>
    </article>

    <article class="panel wide">
      <h2>Usage + Cost</h2>
      {#if usage}
        <div class="stats">
          <div><span>Requests</span><strong>{usage.summary.requests}</strong></div>
          <div><span>Success</span><strong>{usage.summary.successful}</strong></div>
          <div><span>Failed</span><strong>{usage.summary.failed}</strong></div>
          <div><span>Tokens</span><strong>{usage.summary.tokens}</strong></div>
          <div><span>Cost (USD)</span><strong>${usage.summary.total_cost_usd?.toFixed?.(4) ?? usage.summary.total_cost_usd}</strong></div>
          <div><span>Avg Latency</span><strong>{usage.summary.avg_latency_ms} ms</strong></div>
        </div>

        <table>
          <thead><tr><th>Provider</th><th>Model</th><th>Requests</th><th>Tokens</th><th>Cost</th></tr></thead>
          <tbody>
            {#each usage.by_model as row}
              <tr>
                <td>{row.provider_slug}</td>
                <td>{row.model_name}</td>
                <td>{row.requests}</td>
                <td>{row.tokens}</td>
                <td>${row.cost_usd}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {:else}
        <p class="hint">Select a tenant to load usage.</p>
      {/if}
    </article>

    <article class="panel wide">
      <h2>Admin Fleet + Agent Performance (30d)</h2>
      <button on:click={loadAdminPerformance} disabled={loading}>Refresh Admin Performance</button>

      {#if adminPerformance}
        <h3>MCP Fleet</h3>
        <table>
          <thead><tr><th>Server</th><th>Invocations</th><th>Errors</th><th>Avg Duration (ms)</th><th>Last Seen</th></tr></thead>
          <tbody>
            {#each adminPerformance.mcpFleet as row}
              <tr>
                <td>{row.server_name}</td>
                <td>{row.invocations}</td>
                <td>{row.errors}</td>
                <td>{row.avg_duration_ms}</td>
                <td>{row.last_seen}</td>
              </tr>
            {/each}
          </tbody>
        </table>

        <h3>Agent Accounts (from MCP telemetry)</h3>
        <table>
          <thead><tr><th>Agent/Account</th><th>Invocations</th><th>Errors</th><th>Servers Touched</th><th>Last Seen</th></tr></thead>
          <tbody>
            {#each adminPerformance.agents as row}
              <tr>
                <td class="mono">{row.account_id}</td>
                <td>{row.invocations}</td>
                <td>{row.errors}</td>
                <td>{row.servers_touched}</td>
                <td>{row.last_seen}</td>
              </tr>
            {/each}
          </tbody>
        </table>

        <h3>Tenant Scorecards</h3>
        <table>
          <thead><tr><th>Tenant</th><th>Requests</th><th>Success %</th><th>Cost (USD)</th><th>Cost / 1K</th><th>Policy Risk</th></tr></thead>
          <tbody>
            {#each adminPerformance.tenantScorecards as row}
              <tr>
                <td>{row.tenantSlug}</td>
                <td>{row.adoption.requests}</td>
                <td>{row.reliability.successRatePercent}</td>
                <td>${row.costEfficiency.totalCostUsd}</td>
                <td>${row.costEfficiency.costPer1kTokensUsd}</td>
                <td>{row.policyRisk.budgetWarnEvents + row.policyRisk.budgetBlockEvents}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {:else}
        <p class="hint">Connect to load MCP and agent performance.</p>
      {/if}
    </article>
  </section>
</main>

<style>
  .page {
    max-width: 1240px;
    margin: 0 auto;
    padding: 2rem 1.25rem 3rem;
  }

  .hero {
    margin-bottom: 1.5rem;
    padding: 1.5rem;
    border: 1px solid var(--line);
    border-radius: 20px;
    background: linear-gradient(130deg, rgba(6, 22, 40, 0.88), rgba(16, 34, 61, 0.75));
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.32);
  }

  .eyebrow {
    font-size: 0.78rem;
    letter-spacing: 0.12em;
    color: var(--accent);
    margin: 0 0 0.25rem;
  }

  h1 {
    margin: 0 0 0.4rem;
    font-size: clamp(1.8rem, 3vw, 2.6rem);
  }

  .lede {
    margin: 0;
    color: var(--text-dim);
    max-width: 62ch;
  }

  .panel {
    border: 1px solid var(--line);
    border-radius: 18px;
    background: var(--panel);
    padding: 1rem;
    backdrop-filter: blur(6px);
  }

  .connection {
    margin-bottom: 1rem;
    background: var(--panel-2);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    gap: 1rem;
  }

  .grid > .panel {
    grid-column: span 4;
  }

  .grid > .panel.wide {
    grid-column: span 8;
  }

  h2 {
    margin: 0 0 0.8rem;
    font-size: 1.06rem;
    letter-spacing: 0.03em;
  }

  h3 {
    margin: 1rem 0 0.4rem;
    font-size: 0.92rem;
    color: var(--accent);
    letter-spacing: 0.03em;
  }

  .fields {
    display: grid;
    gap: 0.65rem;
  }

  .fields.two {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .fields.three {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  label {
    display: grid;
    gap: 0.35rem;
    font-size: 0.84rem;
    color: var(--text-dim);
  }

  input,
  select,
  textarea,
  button {
    width: 100%;
    border-radius: 10px;
    border: 1px solid rgba(140, 208, 255, 0.25);
    background: rgba(2, 9, 19, 0.8);
    color: var(--text);
    padding: 0.55rem 0.65rem;
    font: inherit;
  }

  button {
    cursor: pointer;
    background: linear-gradient(95deg, rgba(52, 210, 255, 0.3), rgba(125, 227, 107, 0.24));
    border-color: rgba(125, 227, 107, 0.4);
    font-weight: 700;
    letter-spacing: 0.02em;
    margin-top: 0.55rem;
  }

  button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .status {
    padding: 0.65rem 0.8rem;
    border-radius: 10px;
    margin: 0.8rem 0;
    border: 1px solid;
  }

  .status.error {
    border-color: rgba(255, 106, 106, 0.4);
    background: rgba(96, 24, 24, 0.5);
  }

  .status.info {
    border-color: rgba(52, 210, 255, 0.4);
    background: rgba(18, 58, 82, 0.45);
  }

  .hint {
    color: var(--text-dim);
    font-size: 0.86rem;
  }

  .hint.warning {
    color: var(--warning);
  }

  .checks {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin: 0.5rem 0 0.7rem;
  }

  .checks label {
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }

  .checks input {
    width: auto;
    margin: 0;
  }

  .kv {
    margin: 1rem 0 0;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.35rem 0.8rem;
    font-size: 0.88rem;
  }

  .kv dt {
    color: var(--text-dim);
  }

  .mono {
    font-family: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.79rem;
    word-break: break-all;
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.7rem;
    margin-bottom: 0.8rem;
  }

  .stats div {
    border: 1px solid rgba(140, 208, 255, 0.18);
    border-radius: 10px;
    padding: 0.5rem;
    background: rgba(1, 9, 18, 0.55);
  }

  .stats span {
    display: block;
    font-size: 0.75rem;
    color: var(--text-dim);
  }

  .stats strong {
    font-size: 1.05rem;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 0.65rem;
    font-size: 0.84rem;
  }

  th,
  td {
    border-bottom: 1px solid rgba(140, 208, 255, 0.16);
    text-align: left;
    padding: 0.45rem 0.35rem;
    vertical-align: top;
  }

  th {
    color: var(--text-dim);
    font-weight: 600;
  }

  .mt {
    margin-top: 0.8rem;
  }

  @media (max-width: 1024px) {
    .grid > .panel,
    .grid > .panel.wide {
      grid-column: span 12;
    }

    .fields.two,
    .fields.three,
    .stats {
      grid-template-columns: 1fr;
    }
  }
</style>
