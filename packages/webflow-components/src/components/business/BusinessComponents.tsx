import React, { FormEvent, useMemo, useState } from 'react';

type JsonList<T> = string | T[];

export type BusinessTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface LeadQualifierOption {
  label: string;
  value?: string;
  score?: number;
}

export interface LeadQualifierQuestion {
  id: string;
  label: string;
  detail?: string;
  options: LeadQualifierOption[];
}

export interface LeadQualifierOutcome {
  minScore: number;
  label: string;
  detail: string;
  ctaLabel?: string;
  ctaHref?: string;
  tone?: BusinessTone;
}

export interface LeadQualifierProps {
  eyebrow?: string;
  title?: string;
  body?: string;
  questions?: JsonList<LeadQualifierQuestion>;
  outcomes?: JsonList<LeadQualifierOutcome>;
  endpointUrl?: string;
  submitLabel?: string;
  fallbackCtaLabel?: string;
  fallbackCtaHref?: string;
}

export interface RoiMetric {
  label: string;
  value: number;
  suffix?: string;
}

export interface RoiCalculatorProps {
  eyebrow?: string;
  title?: string;
  body?: string;
  leadLabel?: string;
  conversionLabel?: string;
  dealValueLabel?: string;
  timeSavedLabel?: string;
  hourlyRateLabel?: string;
  costLabel?: string;
  defaultMonthlyLeads?: string;
  defaultConversionRate?: string;
  defaultAverageDealValue?: string;
  defaultTimeSavedHours?: string;
  defaultHourlyRate?: string;
  defaultMonthlyCost?: string;
  conversionLiftPercent?: string;
  endpointUrl?: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  price?: string;
  description: string;
  minScore?: number;
  ctaLabel?: string;
  ctaHref?: string;
  features?: string[];
}

export interface PricingRecommenderProps {
  eyebrow?: string;
  title?: string;
  body?: string;
  plans?: JsonList<PricingPlan>;
  endpointUrl?: string;
  defaultTeamSize?: string;
  defaultMonthlyVolume?: string;
  defaultWorkflowRisk?: 'low' | 'medium' | 'high';
  approvalRequired?: boolean;
}

export interface BookingRoute {
  id: string;
  label: string;
  detail: string;
  ctaLabel: string;
  ctaHref: string;
  minScore?: number;
  tone?: BusinessTone;
}

export interface BookingRouterProps {
  eyebrow?: string;
  title?: string;
  body?: string;
  routes?: JsonList<BookingRoute>;
  endpointUrl?: string;
  defaultUrgency?: 'low' | 'medium' | 'high';
  defaultSystems?: string;
  defaultRevenueImpact?: string;
  defaultApprovalComplexity?: 'low' | 'medium' | 'high';
}

type EndpointResult = {
  id?: string;
  label?: string;
  detail?: string;
  ctaLabel?: string;
  ctaHref?: string;
  planId?: string;
  routeId?: string;
  tone?: BusinessTone;
  metrics?: RoiMetric[];
};

const businessStyles = `
.cs-business,
.cs-business * {
  box-sizing: border-box;
}

.cs-business {
  width: 100%;
  color: #f7f8fb;
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.cs-business__surface {
  display: grid;
  gap: 1rem;
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.025)),
    #08090d;
  box-shadow:
    0 24px 72px rgba(0, 0, 0, 0.42),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.cs-business__header {
  display: grid;
  gap: 0.72rem;
  padding: clamp(1rem, 3vw, 1.35rem);
  border-bottom: 1px solid rgba(255, 255, 255, 0.09);
}

.cs-business__eyebrow,
.cs-business__meta,
.cs-business__label {
  color: rgba(247, 248, 251, 0.54);
  font-family: "JetBrains Mono", "SF Mono", Monaco, Consolas, monospace;
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.cs-business__eyebrow {
  display: inline-flex;
  gap: 0.45rem;
  align-items: center;
}

.cs-business__eyebrow::before {
  content: "";
  width: 0.42rem;
  height: 0.42rem;
  border-radius: 999px;
  background: #315cff;
  box-shadow: 0 0 18px rgba(49, 92, 255, 0.64);
}

.cs-business__title {
  margin: 0;
  max-width: 38rem;
  color: #ffffff;
  font-size: clamp(1.35rem, 1.55vw + 1rem, 2.2rem);
  line-height: 1.04;
  letter-spacing: 0;
}

.cs-business__body,
.cs-business__detail {
  margin: 0;
  color: rgba(247, 248, 251, 0.7);
  font-size: 0.96rem;
  line-height: 1.68;
}

.cs-business__content {
  display: grid;
  gap: 1rem;
  padding: clamp(1rem, 3vw, 1.35rem);
}

.cs-business__grid {
  display: grid;
  gap: 0.85rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.cs-business__field,
.cs-business__question,
.cs-business__result,
.cs-business__plan,
.cs-business__route,
.cs-business__metric {
  display: grid;
  gap: 0.55rem;
  padding: 0.9rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.045);
}

.cs-business__field input,
.cs-business__field select,
.cs-business__choice {
  width: 100%;
  min-height: 2.6rem;
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.24);
  color: #ffffff;
  font: inherit;
  outline: none;
}

.cs-business__field input,
.cs-business__field select {
  padding: 0.72rem 0.78rem;
}

.cs-business__field input:focus,
.cs-business__field select:focus,
.cs-business__choice:focus-visible,
.cs-business__button:focus-visible {
  border-color: rgba(49, 92, 255, 0.78);
  box-shadow: 0 0 0 3px rgba(49, 92, 255, 0.2);
}

.cs-business__choices {
  display: grid;
  gap: 0.55rem;
}

.cs-business__choice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.72rem 0.78rem;
  cursor: pointer;
}

.cs-business__choice[aria-pressed="true"] {
  border-color: rgba(49, 92, 255, 0.84);
  background: rgba(49, 92, 255, 0.16);
}

.cs-business__score {
  color: rgba(247, 248, 251, 0.5);
  font-family: "JetBrains Mono", "SF Mono", Monaco, Consolas, monospace;
  font-size: 0.76rem;
}

.cs-business__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.72rem;
  align-items: center;
}

.cs-business__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.65rem;
  border: 1px solid rgba(49, 92, 255, 0.7);
  border-radius: 999px;
  background: #315cff;
  color: #ffffff;
  cursor: pointer;
  font: inherit;
  font-weight: 650;
  padding: 0.72rem 1rem;
  text-decoration: none;
}

.cs-business__button:hover {
  background: #254be0;
}

.cs-business__button--secondary {
  border-color: rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.06);
}

.cs-business__result {
  border-color: rgba(49, 92, 255, 0.32);
  background: linear-gradient(135deg, rgba(49, 92, 255, 0.15), rgba(255, 255, 255, 0.04));
}

.cs-business__result[data-tone="success"] {
  border-color: rgba(68, 170, 68, 0.42);
  background: linear-gradient(135deg, rgba(68, 170, 68, 0.14), rgba(255, 255, 255, 0.04));
}

.cs-business__result[data-tone="warning"] {
  border-color: rgba(170, 136, 68, 0.46);
  background: linear-gradient(135deg, rgba(170, 136, 68, 0.15), rgba(255, 255, 255, 0.04));
}

.cs-business__result[data-tone="danger"] {
  border-color: rgba(212, 77, 77, 0.48);
  background: linear-gradient(135deg, rgba(212, 77, 77, 0.14), rgba(255, 255, 255, 0.04));
}

.cs-business__result h3,
.cs-business__plan h3,
.cs-business__route h3,
.cs-business__metric strong {
  margin: 0;
  color: #ffffff;
  font-size: 1.05rem;
  line-height: 1.2;
}

.cs-business__metrics {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.cs-business__metric strong {
  font-size: clamp(1.25rem, 1.5vw + 0.75rem, 2rem);
}

.cs-business__plan[data-selected="true"],
.cs-business__route[data-selected="true"] {
  border-color: rgba(49, 92, 255, 0.48);
  background: rgba(49, 92, 255, 0.12);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.cs-business__list {
  display: grid;
  gap: 0.35rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.cs-business__list li {
  color: rgba(247, 248, 251, 0.72);
  font-size: 0.9rem;
  line-height: 1.5;
}

.cs-business__list li::before {
  content: " ";
  display: inline-block;
  width: 0.38rem;
  height: 0.38rem;
  margin-right: 0.48rem;
  border-radius: 999px;
  background: rgba(49, 92, 255, 0.72);
  vertical-align: 0.08rem;
}

@media (max-width: 720px) {
  .cs-business__grid,
  .cs-business__metrics {
    grid-template-columns: 1fr;
  }

  .cs-business__button {
    width: 100%;
  }
}
`;

const defaultLeadQuestions: LeadQualifierQuestion[] = [
  {
    id: 'workflow',
    label: 'What workflow is creating the most drag?',
    detail: 'Start with the operating path that already has an owner.',
    options: [
      { label: 'Lead routing or sales handoff', value: 'sales', score: 18 },
      { label: 'Customer support or review queue', value: 'support', score: 14 },
      { label: 'Internal reporting or operations', value: 'ops', score: 10 },
    ],
  },
  {
    id: 'risk',
    label: 'What happens if the workflow fails?',
    options: [
      { label: 'Revenue, compliance, or customer trust is affected', value: 'high', score: 28 },
      { label: 'Team time is wasted but the business can recover', value: 'medium', score: 18 },
      { label: 'It is mostly an experiment', value: 'low', score: 8 },
    ],
  },
  {
    id: 'systems',
    label: 'How many systems need to stay in sync?',
    options: [
      { label: 'Four or more systems', value: 'many', score: 24 },
      { label: 'Two or three systems', value: 'some', score: 16 },
      { label: 'One primary system', value: 'one', score: 6 },
    ],
  },
];

const defaultLeadOutcomes: LeadQualifierOutcome[] = [
  {
    minScore: 58,
    label: 'Policy OS fit',
    detail: 'The workflow touches enough risk and system complexity to justify a governed workflow layer with approval and evidence states.',
    ctaLabel: 'Map the workflow',
    ctaHref: '/book',
    tone: 'success',
  },
  {
    minScore: 34,
    label: 'Workflow System fit',
    detail: 'Start with one bounded operating path, then add policy and agent behavior once the handoff is reliable.',
    ctaLabel: 'Start with one workflow',
    ctaHref: '/book',
    tone: 'info',
  },
  {
    minScore: 0,
    label: 'Discovery fit',
    detail: 'This is early enough for a lightweight audit, component demo, or read-only MCP wedge before a larger build.',
    ctaLabel: 'Book a mapping call',
    ctaHref: '/book',
    tone: 'warning',
  },
];

const defaultPlans: PricingPlan[] = [
  {
    id: 'foundation',
    name: 'Foundation Pack',
    price: '$750+',
    description: 'Install the Webflow component pack and configure a static workflow surface.',
    minScore: 0,
    ctaLabel: 'Install foundation',
    ctaHref: '/book',
    features: ['Canon/Ona visual system', 'Designer-safe props', 'Static fallback content'],
  },
  {
    id: 'workflow',
    name: 'Workflow System',
    price: '$3k+',
    description: 'Connect one workflow to a managed endpoint with routing, evidence, and fallback states.',
    minScore: 38,
    ctaLabel: 'Map one workflow',
    ctaHref: '/book',
    features: ['Cloudflare route', 'D1-backed state', 'Operator handoff'],
  },
  {
    id: 'policy-os',
    name: 'Policy OS',
    price: '$8k+',
    description: 'Add governed agent behavior, approval policy, and monthly tuning for high-stakes workflows.',
    minScore: 68,
    ctaLabel: 'Scope Policy OS',
    ctaHref: '/book',
    features: ['Dify/MCP boundary', 'Approval gates', 'Regression evidence'],
  },
];

const defaultRoutes: BookingRoute[] = [
  {
    id: 'diagnostic',
    label: 'Diagnostic call',
    detail: 'Best when the workflow is still fuzzy or the buyer needs help naming the source of truth.',
    ctaLabel: 'Book diagnostic',
    ctaHref: '/book',
    minScore: 0,
    tone: 'info',
  },
  {
    id: 'mapping',
    label: 'Workflow mapping session',
    detail: 'Best when one owner can bring the workflow, systems, and approval boundary to the first call.',
    ctaLabel: 'Map workflow',
    ctaHref: '/book',
    minScore: 34,
    tone: 'success',
  },
  {
    id: 'policy',
    label: 'Policy OS scope review',
    detail: 'Best when failures touch revenue, customer trust, compliance, or multiple systems that need governed execution.',
    ctaLabel: 'Scope Policy OS',
    ctaHref: '/book',
    minScore: 64,
    tone: 'warning',
  },
];

function parseJsonList<T>(value: JsonList<T> | undefined, fallback: T[]): T[] {
  if (Array.isArray(value)) return value;
  if (!value) return fallback;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as T[] : fallback;
  } catch {
    return fallback;
  }
}

function toNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    currency: 'USD',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);
}

function pickByScore<T extends { minScore?: number }>(items: T[], score: number): T {
  const sorted = [...items].sort((a, b) => (b.minScore ?? 0) - (a.minScore ?? 0));
  return sorted.find((item) => score >= (item.minScore ?? 0)) ?? sorted[sorted.length - 1] ?? items[0];
}

async function postEndpoint(endpointUrl: string, payload: unknown): Promise<EndpointResult | null> {
  if (!endpointUrl) return null;
  const response = await fetch(endpointUrl, {
    body: JSON.stringify(payload),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  if (!response.ok) throw new Error(`Endpoint returned ${response.status}`);
  const data = await response.json();
  return data as EndpointResult;
}

function Shell({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow: string;
  title: string;
  body?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="cs-business">
      <style>{businessStyles}</style>
      <div className="cs-business__surface">
        <header className="cs-business__header">
          <span className="cs-business__eyebrow">{eyebrow}</span>
          <h2 className="cs-business__title">{title}</h2>
          {body ? <p className="cs-business__body">{body}</p> : null}
        </header>
        <div className="cs-business__content">{children}</div>
      </div>
    </section>
  );
}

export function LeadQualifier({
  eyebrow = 'Business logic component',
  title = 'Qualify the workflow before the sales call.',
  body = 'Designer-safe questions score the buyer path locally. Add a managed endpoint when the recommendation should come from Dify, MCP, or Cloudflare.',
  questions,
  outcomes,
  endpointUrl = '',
  submitLabel = 'Calculate fit',
  fallbackCtaLabel = 'Book mapping session',
  fallbackCtaHref = '/book',
}: LeadQualifierProps) {
  const parsedQuestions = useMemo(() => parseJsonList(questions, defaultLeadQuestions), [questions]);
  const parsedOutcomes = useMemo(() => parseJsonList(outcomes, defaultLeadOutcomes), [outcomes]);
  const [answers, setAnswers] = useState<Record<string, LeadQualifierOption>>({});
  const [endpointResult, setEndpointResult] = useState<EndpointResult | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  const score = useMemo(
    () => Object.values(answers).reduce((total, option) => total + (option.score ?? 0), 0),
    [answers]
  );
  const localOutcome = useMemo(() => pickByScore(parsedOutcomes, score), [parsedOutcomes, score]);
  const result = endpointResult ?? localOutcome;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!endpointUrl) return;
    setStatus('loading');
    try {
      const remote = await postEndpoint(endpointUrl, {
        answers,
        component: 'LeadQualifier',
        score,
      });
      setEndpointResult(remote);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }

  return (
    <Shell eyebrow={eyebrow} title={title} body={body}>
      <form className="cs-business__grid" onSubmit={handleSubmit}>
        {parsedQuestions.map((question) => (
          <fieldset className="cs-business__question" key={question.id}>
            <legend className="cs-business__label">{question.label}</legend>
            {question.detail ? <p className="cs-business__detail">{question.detail}</p> : null}
            <div className="cs-business__choices">
              {question.options.map((option) => {
                const value = option.value ?? option.label;
                const selected = answers[question.id]?.value === value || answers[question.id]?.label === option.label;
                return (
                  <button
                    aria-pressed={selected}
                    className="cs-business__choice"
                    key={value}
                    onClick={() => setAnswers((current) => ({ ...current, [question.id]: { ...option, value } }))}
                    type="button"
                  >
                    <span>{option.label}</span>
                    <span className="cs-business__score">+{option.score ?? 0}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
        <div className="cs-business__result" data-tone={result?.tone ?? 'info'}>
          <span className="cs-business__meta">Score {score}</span>
          <h3>{result?.label ?? 'Recommendation ready'}</h3>
          <p className="cs-business__detail">{result?.detail ?? 'The selected answers are ready for review.'}</p>
          <div className="cs-business__actions">
            <button className="cs-business__button" disabled={!endpointUrl || status === 'loading'} type="submit">
              {endpointUrl ? submitLabel : 'Local recommendation'}
            </button>
            <a className="cs-business__button cs-business__button--secondary" href={result?.ctaHref ?? fallbackCtaHref}>
              {result?.ctaLabel ?? fallbackCtaLabel}
            </a>
          </div>
          {status === 'error' ? <p className="cs-business__detail">The managed endpoint was unavailable, so the local recommendation remains visible.</p> : null}
        </div>
      </form>
    </Shell>
  );
}

export function RoiCalculator({
  eyebrow = 'Revenue model',
  title = 'Estimate the value of fixing one workflow.',
  body = 'Use this as a buyer-facing calculator for workflow systems, Dify automations, or agent-backed handoffs.',
  leadLabel = 'Monthly qualified leads',
  conversionLabel = 'Current conversion rate (%)',
  dealValueLabel = 'Average deal value',
  timeSavedLabel = 'Hours saved per month',
  hourlyRateLabel = 'Loaded hourly rate',
  costLabel = 'Monthly platform/service cost',
  defaultMonthlyLeads = '120',
  defaultConversionRate = '8',
  defaultAverageDealValue = '1800',
  defaultTimeSavedHours = '32',
  defaultHourlyRate = '95',
  defaultMonthlyCost = '1500',
  conversionLiftPercent = '18',
  endpointUrl = '',
}: RoiCalculatorProps) {
  const [monthlyLeads, setMonthlyLeads] = useState(defaultMonthlyLeads);
  const [conversionRate, setConversionRate] = useState(defaultConversionRate);
  const [averageDealValue, setAverageDealValue] = useState(defaultAverageDealValue);
  const [timeSavedHours, setTimeSavedHours] = useState(defaultTimeSavedHours);
  const [hourlyRate, setHourlyRate] = useState(defaultHourlyRate);
  const [monthlyCost, setMonthlyCost] = useState(defaultMonthlyCost);
  const [endpointResult, setEndpointResult] = useState<EndpointResult | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  const localMetrics = useMemo(() => {
    const leads = toNumber(monthlyLeads, 0);
    const conversion = toNumber(conversionRate, 0) / 100;
    const dealValue = toNumber(averageDealValue, 0);
    const hours = toNumber(timeSavedHours, 0);
    const rate = toNumber(hourlyRate, 0);
    const cost = toNumber(monthlyCost, 0);
    const lift = toNumber(conversionLiftPercent, 0) / 100;
    const incrementalRevenue = leads * conversion * lift * dealValue;
    const laborValue = hours * rate;
    const monthlyImpact = incrementalRevenue + laborValue - cost;
    const annualImpact = monthlyImpact * 12;
    return [
      { label: 'Monthly impact', value: monthlyImpact },
      { label: 'Annualized impact', value: annualImpact },
      { label: 'Payback multiple', value: cost > 0 ? (incrementalRevenue + laborValue) / cost : 0, suffix: 'x' },
    ];
  }, [averageDealValue, conversionLiftPercent, conversionRate, hourlyRate, monthlyCost, monthlyLeads, timeSavedHours]);
  const metrics = endpointResult?.metrics?.length ? endpointResult.metrics : localMetrics;

  async function handleManagedModel() {
    if (!endpointUrl) return;
    setStatus('loading');
    try {
      const remote = await postEndpoint(endpointUrl, {
        averageDealValue,
        component: 'RoiCalculator',
        conversionLiftPercent,
        conversionRate,
        hourlyRate,
        monthlyCost,
        monthlyLeads,
        timeSavedHours,
      });
      setEndpointResult(remote);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }

  return (
    <Shell eyebrow={eyebrow} title={title} body={body}>
      <div className="cs-business__grid">
        {[
          [leadLabel, monthlyLeads, setMonthlyLeads],
          [conversionLabel, conversionRate, setConversionRate],
          [dealValueLabel, averageDealValue, setAverageDealValue],
          [timeSavedLabel, timeSavedHours, setTimeSavedHours],
          [hourlyRateLabel, hourlyRate, setHourlyRate],
          [costLabel, monthlyCost, setMonthlyCost],
        ].map(([label, value, setter]) => (
          <label className="cs-business__field" key={label as string}>
            <span className="cs-business__label">{label as string}</span>
            <input inputMode="decimal" onChange={(event) => (setter as (next: string) => void)(event.target.value)} value={value as string} />
          </label>
        ))}
      </div>
      <div className="cs-business__metrics">
        {metrics.map((metric) => (
          <div className="cs-business__metric" key={metric.label}>
            <span className="cs-business__meta">{metric.label}</span>
            <strong>{metric.suffix ? `${metric.value.toFixed(1)}${metric.suffix}` : formatCurrency(metric.value)}</strong>
          </div>
        ))}
      </div>
      {endpointUrl ? (
        <div className="cs-business__actions">
          <button className="cs-business__button" disabled={status === 'loading'} onClick={handleManagedModel} type="button">
            {status === 'loading' ? 'Calculating...' : 'Run managed model'}
          </button>
          {status === 'error' ? <p className="cs-business__detail">The managed model was unavailable, so the local estimate remains visible.</p> : null}
        </div>
      ) : null}
      <p className="cs-business__detail">
        Assumes a {conversionLiftPercent}% lift from clearer routing, faster handoff, or governed automation.
      </p>
    </Shell>
  );
}

export function PricingRecommender({
  eyebrow = 'Offer router',
  title = 'Recommend the right implementation tier.',
  body = 'Translate team size, workflow volume, approval needs, and risk into a simple offer recommendation.',
  plans,
  endpointUrl = '',
  defaultTeamSize = '6',
  defaultMonthlyVolume = '250',
  defaultWorkflowRisk = 'medium',
  approvalRequired = true,
}: PricingRecommenderProps) {
  const parsedPlans = useMemo(() => parseJsonList(plans, defaultPlans), [plans]);
  const [teamSize, setTeamSize] = useState(defaultTeamSize);
  const [volume, setVolume] = useState(defaultMonthlyVolume);
  const [risk, setRisk] = useState<'low' | 'medium' | 'high'>(defaultWorkflowRisk);
  const [needsApproval, setNeedsApproval] = useState(approvalRequired);
  const [endpointResult, setEndpointResult] = useState<EndpointResult | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const score = toNumber(teamSize, 0) * 2 + Math.min(toNumber(volume, 0) / 10, 40) + (risk === 'high' ? 30 : risk === 'medium' ? 16 : 5) + (needsApproval ? 18 : 0);
  const localSelected = pickByScore(parsedPlans, score);
  const selected = endpointResult?.planId
    ? parsedPlans.find((plan) => plan.id === endpointResult.planId) ?? localSelected
    : localSelected;

  async function handleManagedRecommendation() {
    if (!endpointUrl) return;
    setStatus('loading');
    try {
      const remote = await postEndpoint(endpointUrl, {
        approvalRequired: needsApproval,
        component: 'PricingRecommender',
        monthlyVolume: volume,
        score,
        teamSize,
        workflowRisk: risk,
      });
      setEndpointResult(remote);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }

  return (
    <Shell eyebrow={eyebrow} title={title} body={body}>
      <div className="cs-business__grid">
        <label className="cs-business__field">
          <span className="cs-business__label">Team size</span>
          <input inputMode="numeric" onChange={(event) => setTeamSize(event.target.value)} value={teamSize} />
        </label>
        <label className="cs-business__field">
          <span className="cs-business__label">Monthly workflow volume</span>
          <input inputMode="numeric" onChange={(event) => setVolume(event.target.value)} value={volume} />
        </label>
        <label className="cs-business__field">
          <span className="cs-business__label">Workflow risk</span>
          <select onChange={(event) => setRisk(event.target.value as 'low' | 'medium' | 'high')} value={risk}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label className="cs-business__field">
          <span className="cs-business__label">Approval boundary</span>
          <select onChange={(event) => setNeedsApproval(event.target.value === 'yes')} value={needsApproval ? 'yes' : 'no'}>
            <option value="yes">Human approval required</option>
            <option value="no">Preview or read-only</option>
          </select>
        </label>
      </div>
      <div className="cs-business__grid">
        {parsedPlans.map((plan) => (
          <article className="cs-business__plan" data-selected={plan.id === selected.id} key={plan.id}>
            <span className="cs-business__meta">{plan.price ?? `Score ${plan.minScore ?? 0}+`}</span>
            <h3>{plan.name}</h3>
            <p className="cs-business__detail">{plan.description}</p>
            {plan.features?.length ? (
              <ul className="cs-business__list">
                {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
              </ul>
            ) : null}
            {plan.id === selected.id ? (
              <a className="cs-business__button" href={plan.ctaHref ?? '/book'}>{plan.ctaLabel ?? 'Start here'}</a>
            ) : null}
          </article>
        ))}
      </div>
      {endpointUrl ? (
        <div className="cs-business__result" data-tone={endpointResult?.tone ?? 'info'}>
          <span className="cs-business__meta">Managed endpoint</span>
          <h3>{endpointResult?.label ?? selected.name}</h3>
          <p className="cs-business__detail">{endpointResult?.detail ?? 'Run the managed endpoint when Dify, MCP, or a Cloudflare route should decide the recommendation.'}</p>
          <div className="cs-business__actions">
            <button className="cs-business__button" disabled={status === 'loading'} onClick={handleManagedRecommendation} type="button">
              {status === 'loading' ? 'Routing...' : 'Run managed recommendation'}
            </button>
            {status === 'error' ? <p className="cs-business__detail">The managed endpoint was unavailable, so the local recommendation remains visible.</p> : null}
          </div>
        </div>
      ) : null}
    </Shell>
  );
}

export function BookingRouter({
  eyebrow = 'Booking router',
  title = 'Route the buyer to the right next step.',
  body = 'Use a few operational signals to decide whether the visitor should book discovery, mapping, or a Policy OS scope review.',
  routes,
  endpointUrl = '',
  defaultUrgency = 'medium',
  defaultSystems = '3',
  defaultRevenueImpact = '25000',
  defaultApprovalComplexity = 'medium',
}: BookingRouterProps) {
  const parsedRoutes = useMemo(() => parseJsonList(routes, defaultRoutes), [routes]);
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high'>(defaultUrgency);
  const [systems, setSystems] = useState(defaultSystems);
  const [revenueImpact, setRevenueImpact] = useState(defaultRevenueImpact);
  const [approvalComplexity, setApprovalComplexity] = useState<'low' | 'medium' | 'high'>(defaultApprovalComplexity);
  const [endpointResult, setEndpointResult] = useState<EndpointResult | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const score =
    (urgency === 'high' ? 26 : urgency === 'medium' ? 14 : 5) +
    Math.min(toNumber(systems, 0) * 8, 32) +
    Math.min(toNumber(revenueImpact, 0) / 2000, 30) +
    (approvalComplexity === 'high' ? 24 : approvalComplexity === 'medium' ? 12 : 3);
  const localSelected = pickByScore(parsedRoutes, score);
  const selected = endpointResult?.routeId
    ? parsedRoutes.find((route) => route.id === endpointResult.routeId) ?? localSelected
    : localSelected;

  async function handleManagedRoute() {
    if (!endpointUrl) return;
    setStatus('loading');
    try {
      const remote = await postEndpoint(endpointUrl, {
        approvalComplexity,
        component: 'BookingRouter',
        revenueImpact,
        score,
        systems,
        urgency,
      });
      setEndpointResult(remote);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }

  return (
    <Shell eyebrow={eyebrow} title={title} body={body}>
      <div className="cs-business__grid">
        <label className="cs-business__field">
          <span className="cs-business__label">Urgency</span>
          <select onChange={(event) => setUrgency(event.target.value as 'low' | 'medium' | 'high')} value={urgency}>
            <option value="low">This quarter</option>
            <option value="medium">This month</option>
            <option value="high">This week</option>
          </select>
        </label>
        <label className="cs-business__field">
          <span className="cs-business__label">Connected systems</span>
          <input inputMode="numeric" onChange={(event) => setSystems(event.target.value)} value={systems} />
        </label>
        <label className="cs-business__field">
          <span className="cs-business__label">Monthly revenue at risk</span>
          <input inputMode="numeric" onChange={(event) => setRevenueImpact(event.target.value)} value={revenueImpact} />
        </label>
        <label className="cs-business__field">
          <span className="cs-business__label">Approval complexity</span>
          <select onChange={(event) => setApprovalComplexity(event.target.value as 'low' | 'medium' | 'high')} value={approvalComplexity}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
      </div>
      <div className="cs-business__grid">
        {parsedRoutes.map((route) => (
          <article className="cs-business__route" data-selected={route.id === selected.id} key={route.id}>
            <span className="cs-business__meta">{route.minScore ?? 0}+ score</span>
            <h3>{route.label}</h3>
            <p className="cs-business__detail">{route.detail}</p>
            {route.id === selected.id ? (
              <a className="cs-business__button" href={route.ctaHref}>{route.ctaLabel}</a>
            ) : null}
          </article>
        ))}
      </div>
      {endpointUrl ? (
        <div className="cs-business__result" data-tone={endpointResult?.tone ?? selected.tone ?? 'info'}>
          <span className="cs-business__meta">Managed endpoint</span>
          <h3>{endpointResult?.label ?? selected.label}</h3>
          <p className="cs-business__detail">{endpointResult?.detail ?? 'Run the managed endpoint when the route should account for private context or live workflow state.'}</p>
          <div className="cs-business__actions">
            <button className="cs-business__button" disabled={status === 'loading'} onClick={handleManagedRoute} type="button">
              {status === 'loading' ? 'Routing...' : 'Run managed route'}
            </button>
            <a className="cs-business__button cs-business__button--secondary" href={endpointResult?.ctaHref ?? selected.ctaHref}>
              {endpointResult?.ctaLabel ?? selected.ctaLabel}
            </a>
            {status === 'error' ? <p className="cs-business__detail">The managed endpoint was unavailable, so the local route remains visible.</p> : null}
          </div>
        </div>
      ) : null}
    </Shell>
  );
}
