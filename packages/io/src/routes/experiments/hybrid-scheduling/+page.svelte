<script lang="ts">
	/**
	 * Hybrid Scheduling Experiment
	 *
	 * Explores how Cloudflare Workers Cron Triggers can complement Modal's
	 * scheduled jobs to overcome free tier limitations.
	 *
	 * Key insight: Cloudflare handles scheduling (unlimited on paid plans),
	 * Modal handles compute (pay-per-use). Best of both worlds.
	 */

	import { SEO } from '@create-something/canon';

	// Cost comparison data
	const modalLimitations = {
		freeTierCronJobs: 5,
		freeTierComputeSeconds: 3600, // per month
		costPerGBSecond: 0.000016,
	};

	const cloudflarePricing = {
		freeRequests: 100000, // per day
		paidCronsUnlimited: true,
		cronMinGranularity: '1 minute',
		workersCostPerMillion: 0.30,
	};

	// Example schedules demonstrating the hybrid approach
	const exampleSchedules = [
		{ name: 'Daily analytics sync', cron: '0 6 * * *', desc: 'Every day at 6am UTC' },
		{ name: 'Hourly health check', cron: '0 * * * *', desc: 'Every hour on the hour' },
		{ name: 'Weekly report', cron: '0 9 * * 1', desc: 'Every Monday at 9am UTC' },
		{ name: 'Every 5 minutes', cron: '*/5 * * * *', desc: 'High-frequency monitoring' },
		{ name: 'Bi-hourly sync', cron: '0 */2 * * *', desc: 'Every 2 hours' },
		{ name: 'Nightly cleanup', cron: '0 3 * * *', desc: 'Every day at 3am UTC' },
	];
</script>

<SEO
	title="Hybrid Scheduling: Modal + Cloudflare"
	description="Exploring how Cloudflare Workers Cron Triggers can complement Modal's scheduled jobs to overcome free tier limitations while maintaining cost efficiency."
	keywords="hybrid scheduling, modal, cloudflare workers, cron triggers, serverless, scheduling architecture"
	propertyName="io"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.io' },
		{ name: 'Experiments', url: 'https://createsomething.io/experiments' },
		{ name: 'Hybrid Scheduling', url: 'https://createsomething.io/experiments/hybrid-scheduling' }
	]}
/>

<div class="page-container min-h-screen p-6">
	<div class="max-w-5xl mx-auto space-y-12">
		<!-- Header -->
		<div class="header-section pb-8">
			<h1 class="page-title mb-3">Hybrid Scheduling Experiment</h1>
			<p class="text-secondary max-w-3xl">
				Exploring how Cloudflare Workers Cron Triggers can complement Modal's scheduled jobs,
				overcoming free tier limitations while maintaining cost efficiency.
			</p>
		</div>

		<!-- Abstract -->
		<section class="abstract-section pl-6 space-y-4">
			<h2 class="section-title">Abstract</h2>
			<p class="text-tertiary leading-relaxed">
				Modal's free tier limits users to 5 scheduled jobs. For systems requiring multiple
				background tasks—analytics, syncs, health checks, cleanups—this constraint forces
				premature platform commitment or awkward workarounds. This experiment proposes a
				<em>hybrid architecture</em>: Cloudflare Workers Cron Triggers handle scheduling
				(unlimited on paid plans, generous free tier), while Modal handles compute
				(pay-per-use, no idle costs). The result: unlimited schedules with Modal's
				powerful compute model, at minimal additional cost.
			</p>
		</section>

		<!-- Problem Statement -->
		<section class="space-y-6">
			<h2 class="section-title">1. The Problem: Modal's Cron Limitations</h2>

			<div class="space-y-4 text-tertiary leading-relaxed">
				<p>
					Modal provides excellent serverless compute for Python workloads. Its
					<code class="code-inline">@modal.cron()</code> decorator makes scheduled jobs trivial:
				</p>

				<div class="code-block p-4 space-y-1">
					<p class="text-muted"># Modal's native scheduling - simple but limited</p>
					<p class="text-secondary">@app.function(schedule=modal.Cron("0 6 * * *"))</p>
					<p class="text-secondary">def daily_analytics_sync():</p>
					<p class="text-secondary pl-4">"""Runs every day at 6am UTC."""</p>
					<p class="text-secondary pl-4">process_analytics()</p>
				</div>

				<p>
					<strong class="text-secondary">The limitation:</strong> Modal's free tier allows only
					<span class="metric-highlight">{modalLimitations.freeTierCronJobs} scheduled jobs</span>.
					For a typical production system, you might need:
				</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>Daily analytics sync</li>
					<li>Hourly health checks</li>
					<li>Weekly reports</li>
					<li>Nightly database cleanup</li>
					<li>Every-5-minute monitoring</li>
					<li>Bi-hourly data refresh</li>
				</ul>

				<p>
					That's already 6 jobs—one over the limit. Adding more (backup jobs, notification
					digests, cache warming) quickly exceeds what the free tier allows.
				</p>
			</div>
		</section>

		<!-- The Insight -->
		<section class="space-y-6">
			<h2 class="section-title">2. The Insight: Separate Scheduling from Compute</h2>

			<div class="space-y-4 text-tertiary leading-relaxed">
				<p>
					Modal's scheduled jobs couple two concerns:
				</p>

				<div class="grid md:grid-cols-2 gap-6 my-6">
					<div class="card p-6">
						<h3 class="card-title mb-3">Scheduling</h3>
						<p class="text-body-sm text-tertiary">
							"Run this function at 6am daily"
						</p>
						<p class="text-muted text-body-sm mt-2">
							Lightweight—just tracking time and triggering
						</p>
					</div>
					<div class="card p-6">
						<h3 class="card-title mb-3">Compute</h3>
						<p class="text-body-sm text-tertiary">
							"Execute this Python code with these dependencies"
						</p>
						<p class="text-muted text-body-sm mt-2">
							Heavyweight—containers, GPUs, memory, etc.
						</p>
					</div>
				</div>

				<p>
					<strong class="text-secondary">The hybrid approach:</strong> Use Cloudflare Workers
					for scheduling (what they're good at), and Modal for compute (what it's good at).
				</p>

				<div class="card p-6 my-6">
					<p class="text-secondary">
						Cloudflare Workers Cron Triggers: Unlimited on paid plans ($5/month base).
					</p>
					<p class="text-tertiary text-body-sm mt-2">
						Even on the free tier, you get enough requests to trigger Modal functions
						hundreds of times per day.
					</p>
				</div>
			</div>
		</section>

		<!-- Architecture -->
		<section class="space-y-6">
			<h2 class="section-title">3. Hybrid Architecture</h2>

			<div class="space-y-4 text-tertiary leading-relaxed">
				<div class="architecture-diagram p-6 my-6">
					<pre class="text-body-sm text-secondary overflow-x-auto">
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare Workers                           │
│                    (Cron Triggers)                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ 0 6 * * *   │  │ 0 * * * *   │  │ */5 * * * * │  ...        │
│  │ daily sync  │  │ hourly      │  │ monitoring  │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│         └────────────────┼────────────────┘                     │
│                          │                                      │
│                          ▼                                      │
│              ┌───────────────────────┐                          │
│              │  HTTP POST to Modal   │                          │
│              │  webhook endpoint     │                          │
│              └───────────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Modal                                    │
│                    (Compute Platform)                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  @app.function()                                         │   │
│  │  @modal.web_endpoint(method="POST")                      │   │
│  │  def trigger_job(request: Request):                      │   │
│  │      job_name = request.json()["job"]                    │   │
│  │      dispatch_to_handler(job_name)                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                      │
│         ┌────────────────┼────────────────┐                     │
│         ▼                ▼                ▼                     │
│  ┌───────────┐    ┌───────────┐    ┌───────────┐               │
│  │ analytics │    │ health    │    │ cleanup   │   ...         │
│  │ sync      │    │ check     │    │ routine   │               │
│  └───────────┘    └───────────┘    └───────────┘               │
└─────────────────────────────────────────────────────────────────┘</pre>
				</div>

				<h3 class="subsection-title mt-6">3.1 Cloudflare Worker: The Scheduler</h3>

				<div class="code-block p-4 space-y-1">
					<p class="text-muted">// wrangler.toml</p>
					<p class="text-secondary">name = "modal-scheduler"</p>
					<p class="text-secondary">main = "src/index.ts"</p>
					<p class="text-secondary">compatibility_date = "2024-01-01"</p>
					<p class="text-secondary">&nbsp;</p>
					<p class="text-secondary">[triggers]</p>
					<p class="text-secondary">crons = [</p>
					<p class="text-secondary pl-4">"0 6 * * *",    # daily-analytics-sync</p>
					<p class="text-secondary pl-4">"0 * * * *",    # hourly-health-check</p>
					<p class="text-secondary pl-4">"0 9 * * 1",    # weekly-report</p>
					<p class="text-secondary pl-4">"*/5 * * * *",  # monitoring</p>
					<p class="text-secondary pl-4">"0 */2 * * *",  # bi-hourly-sync</p>
					<p class="text-secondary pl-4">"0 3 * * *",    # nightly-cleanup</p>
					<p class="text-secondary">]</p>
				</div>

				<div class="code-block p-4 space-y-1 mt-4">
					<p class="text-muted">// src/index.ts</p>
					<p class="text-secondary">interface Env &#123;</p>
					<p class="text-secondary pl-4">MODAL_WEBHOOK_URL: string;</p>
					<p class="text-secondary pl-4">MODAL_AUTH_TOKEN: string;</p>
					<p class="text-secondary">&#125;</p>
					<p class="text-secondary">&nbsp;</p>
					<p class="text-muted">// Map cron expressions to job names</p>
					<p class="text-secondary">const CRON_TO_JOB: Record&lt;string, string&gt; = &#123;</p>
					<p class="text-secondary pl-4">"0 6 * * *": "daily-analytics-sync",</p>
					<p class="text-secondary pl-4">"0 * * * *": "hourly-health-check",</p>
					<p class="text-secondary pl-4">"0 9 * * 1": "weekly-report",</p>
					<p class="text-secondary pl-4">"*/5 * * * *": "monitoring",</p>
					<p class="text-secondary pl-4">"0 */2 * * *": "bi-hourly-sync",</p>
					<p class="text-secondary pl-4">"0 3 * * *": "nightly-cleanup",</p>
					<p class="text-secondary">&#125;;</p>
					<p class="text-secondary">&nbsp;</p>
					<p class="text-secondary">export default &#123;</p>
					<p class="text-secondary pl-4">async scheduled(</p>
					<p class="text-secondary pl-8">event: ScheduledEvent,</p>
					<p class="text-secondary pl-8">env: Env,</p>
					<p class="text-secondary pl-8">ctx: ExecutionContext</p>
					<p class="text-secondary pl-4">) &#123;</p>
					<p class="text-secondary pl-8">const jobName = CRON_TO_JOB[event.cron] || "unknown";</p>
					<p class="text-secondary">&nbsp;</p>
					<p class="text-secondary pl-8">const response = await fetch(env.MODAL_WEBHOOK_URL, &#123;</p>
					<p class="text-secondary pl-12">method: "POST",</p>
					<p class="text-secondary pl-12">headers: &#123;</p>
					<p class="text-secondary pl-16">"Content-Type": "application/json",</p>
					<p class="text-secondary pl-16">"Authorization": `Bearer $&#123;env.MODAL_AUTH_TOKEN&#125;`,</p>
					<p class="text-secondary pl-12">&#125;,</p>
					<p class="text-secondary pl-12">body: JSON.stringify(&#123;</p>
					<p class="text-secondary pl-16">job: jobName,</p>
					<p class="text-secondary pl-16">triggered_at: new Date().toISOString(),</p>
					<p class="text-secondary pl-16">cron: event.cron,</p>
					<p class="text-secondary pl-12">&#125;),</p>
					<p class="text-secondary pl-8">&#125;);</p>
					<p class="text-secondary">&nbsp;</p>
					<p class="text-secondary pl-8">console.log(`Triggered $&#123;jobName&#125;: $&#123;response.status&#125;`);</p>
					<p class="text-secondary pl-4">&#125;,</p>
					<p class="text-secondary">&#125;;</p>
				</div>

				<h3 class="subsection-title mt-6">3.2 Modal: The Compute Engine</h3>

				<div class="code-block p-4 space-y-1">
					<p class="text-muted"># modal_jobs.py</p>
					<p class="text-secondary">import modal</p>
					<p class="text-secondary">from fastapi import Request, HTTPException</p>
					<p class="text-secondary">&nbsp;</p>
					<p class="text-secondary">app = modal.App("scheduled-jobs")</p>
					<p class="text-secondary">&nbsp;</p>
					<p class="text-muted"># Job handlers</p>
					<p class="text-secondary">@app.function()</p>
					<p class="text-secondary">def daily_analytics_sync():</p>
					<p class="text-secondary pl-4">"""Process daily analytics."""</p>
					<p class="text-secondary pl-4">print("Running daily analytics sync...")</p>
					<p class="text-secondary pl-4"># Your analytics logic here</p>
					<p class="text-secondary">&nbsp;</p>
					<p class="text-secondary">@app.function()</p>
					<p class="text-secondary">def hourly_health_check():</p>
					<p class="text-secondary pl-4">"""Check system health."""</p>
					<p class="text-secondary pl-4">print("Running health check...")</p>
					<p class="text-secondary pl-4"># Your health check logic here</p>
					<p class="text-secondary">&nbsp;</p>
					<p class="text-secondary">@app.function()</p>
					<p class="text-secondary">def weekly_report():</p>
					<p class="text-secondary pl-4">"""Generate weekly report."""</p>
					<p class="text-secondary pl-4">print("Generating weekly report...")</p>
					<p class="text-secondary pl-4"># Your report logic here</p>
					<p class="text-secondary">&nbsp;</p>
					<p class="text-muted"># ... more job handlers ...</p>
					<p class="text-secondary">&nbsp;</p>
					<p class="text-muted"># Dispatcher endpoint</p>
					<p class="text-secondary">JOB_HANDLERS = &#123;</p>
					<p class="text-secondary pl-4">"daily-analytics-sync": daily_analytics_sync,</p>
					<p class="text-secondary pl-4">"hourly-health-check": hourly_health_check,</p>
					<p class="text-secondary pl-4">"weekly-report": weekly_report,</p>
					<p class="text-secondary pl-4"># ... more mappings ...</p>
					<p class="text-secondary">&#125;</p>
					<p class="text-secondary">&nbsp;</p>
					<p class="text-secondary">@app.function()</p>
					<p class="text-secondary">@modal.web_endpoint(method="POST")</p>
					<p class="text-secondary">async def trigger_job(request: Request):</p>
					<p class="text-secondary pl-4">"""Webhook endpoint for Cloudflare triggers."""</p>
					<p class="text-secondary pl-4">data = await request.json()</p>
					<p class="text-secondary pl-4">job_name = data.get("job")</p>
					<p class="text-secondary">&nbsp;</p>
					<p class="text-secondary pl-4">if job_name not in JOB_HANDLERS:</p>
					<p class="text-secondary pl-8">raise HTTPException(status_code=404, detail=f"Unknown job: &#123;job_name&#125;")</p>
					<p class="text-secondary">&nbsp;</p>
					<p class="text-secondary pl-4"># Spawn the job asynchronously</p>
					<p class="text-secondary pl-4">JOB_HANDLERS[job_name].spawn()</p>
					<p class="text-secondary">&nbsp;</p>
					<p class="text-secondary pl-4">return &#123;"status": "triggered", "job": job_name&#125;</p>
				</div>
			</div>
		</section>

		<!-- Benefits -->
		<section class="space-y-6">
			<h2 class="section-title">4. Benefits of the Hybrid Approach</h2>

			<div class="grid md:grid-cols-2 gap-6">
				<div class="card p-6">
					<h3 class="card-title mb-3">Unlimited Schedules</h3>
					<p class="text-body-sm text-tertiary">
						Cloudflare Workers paid plan ($5/month) includes unlimited cron triggers.
						Add as many schedules as your system needs without hitting Modal's limits.
					</p>
				</div>

				<div class="card p-6">
					<h3 class="card-title mb-3">Pay-Per-Use Compute</h3>
					<p class="text-body-sm text-tertiary">
						Modal's pricing remains pay-per-use. You only pay for actual compute time,
						not for scheduling infrastructure.
					</p>
				</div>

				<div class="card p-6">
					<h3 class="card-title mb-3">Reliable Triggers</h3>
					<p class="text-body-sm text-tertiary">
						Cloudflare's edge network ensures triggers fire reliably, globally, with
						sub-second latency. No cold starts for the trigger itself.
					</p>
				</div>

				<div class="card p-6">
					<h3 class="card-title mb-3">Centralized Scheduling</h3>
					<p class="text-body-sm text-tertiary">
						All schedules defined in one <code class="code-inline">wrangler.toml</code>.
						Easy to see, modify, and version control all your cron jobs.
					</p>
				</div>

				<div class="card p-6">
					<h3 class="card-title mb-3">Observability</h3>
					<p class="text-body-sm text-tertiary">
						Cloudflare logs every trigger. Modal logs every execution. Combined,
						you get end-to-end visibility into scheduled job behavior.
					</p>
				</div>

				<div class="card p-6">
					<h3 class="card-title mb-3">Separation of Concerns</h3>
					<p class="text-body-sm text-tertiary">
						Scheduling is scheduling. Compute is compute. Each platform does what
						it's best at—Zuhandenheit applied to infrastructure.
					</p>
				</div>
			</div>
		</section>

		<!-- Cost Analysis -->
		<section class="space-y-6">
			<h2 class="section-title">5. Cost Analysis</h2>

			<div class="space-y-4 text-tertiary leading-relaxed">
				<p>
					Comparing the cost of running 10 scheduled jobs under different approaches:
				</p>

				<div class="overflow-x-auto">
					<table class="comparison-table w-full text-body-sm">
						<thead>
							<tr>
								<th class="text-left p-3">Approach</th>
								<th class="text-left p-3">Scheduling Cost</th>
								<th class="text-left p-3">Compute Cost</th>
								<th class="text-left p-3">Limitation</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td class="p-3">Modal Only (Free)</td>
								<td class="p-3">$0</td>
								<td class="p-3">$0 (free tier)</td>
								<td class="p-3 text-error">Max 5 cron jobs</td>
							</tr>
							<tr>
								<td class="p-3">Modal Only (Paid)</td>
								<td class="p-3">Included</td>
								<td class="p-3">$0.000016/GB-s</td>
								<td class="p-3">Unlimited (but paying for compute)</td>
							</tr>
							<tr>
								<td class="p-3 text-secondary">Hybrid (Cloudflare + Modal)</td>
								<td class="p-3">$5/month (Workers paid)</td>
								<td class="p-3">$0.000016/GB-s</td>
								<td class="p-3 text-success">Unlimited schedules + pay-per-use compute</td>
							</tr>
						</tbody>
					</table>
				</div>

				<p class="mt-4">
					<strong class="text-secondary">Key insight:</strong> The $5/month Cloudflare Workers
					paid plan pays for itself if you need more than 5 scheduled jobs and want to stay
					on Modal's free compute tier (or minimize compute costs).
				</p>
			</div>
		</section>

		<!-- Implementation Notes -->
		<section class="space-y-6">
			<h2 class="section-title">6. Implementation Notes</h2>

			<div class="space-y-4 text-tertiary leading-relaxed">
				<h3 class="subsection-title">6.1 Authentication</h3>
				<p>
					Protect your Modal webhook endpoint. Options:
				</p>
				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>Shared secret in Authorization header (simplest)</li>
					<li>Cloudflare Access service tokens (enterprise)</li>
					<li>HMAC signature verification (most secure)</li>
				</ul>

				<h3 class="subsection-title mt-6">6.2 Error Handling</h3>
				<p>
					Cloudflare cron triggers don't retry on failure by default. Implement:
				</p>
				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>Queue failed jobs to Cloudflare Queues for retry</li>
					<li>Log failures to D1 for visibility</li>
					<li>Alert on repeated failures via Workers AI or external service</li>
				</ul>

				<h3 class="subsection-title mt-6">6.3 Idempotency</h3>
				<p>
					Design jobs to be idempotent. If a trigger fires twice (edge case), the job
					should produce the same result without side effects.
				</p>

				<div class="code-block p-4 space-y-1 mt-4">
					<p class="text-muted"># Include execution ID for idempotency checks</p>
					<p class="text-secondary">body: JSON.stringify(&#123;</p>
					<p class="text-secondary pl-4">job: jobName,</p>
					<p class="text-secondary pl-4">execution_id: crypto.randomUUID(),</p>
					<p class="text-secondary pl-4">triggered_at: new Date().toISOString(),</p>
					<p class="text-secondary">&#125;),</p>
				</div>
			</div>
		</section>

		<!-- Example Schedules -->
		<section class="space-y-6">
			<h2 class="section-title">7. Example Schedule Configuration</h2>

			<div class="space-y-4">
				<p class="text-tertiary">
					A typical production system might have the following schedules:
				</p>

				<div class="grid md:grid-cols-2 gap-4">
					{#each exampleSchedules as schedule}
						<div class="card p-4">
							<div class="flex justify-between items-start">
								<div>
									<p class="text-secondary font-medium">{schedule.name}</p>
									<p class="text-muted text-body-sm">{schedule.desc}</p>
								</div>
								<code class="code-inline text-body-sm">{schedule.cron}</code>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</section>

		<!-- Conclusion -->
		<section class="section-divider pt-8 space-y-6">
			<h2 class="section-title">8. Conclusion</h2>

			<div class="space-y-4 text-tertiary leading-relaxed">
				<p>
					The hybrid Modal + Cloudflare scheduling approach embodies the
					<strong class="text-secondary">Subtractive Triad</strong>:
				</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>
						<strong class="text-secondary">DRY:</strong> Scheduling logic lives in one place
						(wrangler.toml), not scattered across Modal decorators
					</li>
					<li>
						<strong class="text-secondary">Rams:</strong> Each platform does only what it's
						good at—no waste, no overlap
					</li>
					<li>
						<strong class="text-secondary">Heidegger:</strong> The infrastructure recedes;
						you focus on the jobs themselves, not scheduling limitations
					</li>
				</ul>

				<p>
					For systems that need more than 5 scheduled jobs, this pattern offers a pragmatic
					path forward: unlimited schedules, pay-per-use compute, and clear separation of
					concerns.
				</p>

				<div class="card p-6 mt-6">
					<p class="text-secondary">
						<strong>Next Steps:</strong>
					</p>
					<ul class="list-disc list-inside space-y-2 pl-4 mt-2 text-tertiary">
						<li>Implement a proof-of-concept with 10+ scheduled jobs</li>
						<li>Measure end-to-end latency (trigger to execution)</li>
						<li>Build retry mechanism using Cloudflare Queues</li>
						<li>Add observability dashboard with trigger/execution correlation</li>
					</ul>
				</div>
			</div>
		</section>

		<!-- Footer -->
		<div class="section-divider pt-6">
			<p class="text-body-sm text-muted">
				Part of the
				<a href="/experiments" class="link">experiments</a>
				collection. View related:
				<a href="https://modal.com/docs/guide/cron" class="link" target="_blank" rel="noopener">
					Modal Cron Documentation
				</a>
				|
				<a href="https://developers.cloudflare.com/workers/configuration/cron-triggers/" class="link" target="_blank" rel="noopener">
					Cloudflare Cron Triggers
				</a>
			</p>
		</div>
	</div>
</div>

<style>
	@import '$lib/styles/visualization-experiment.css';

	/* Additional styles for this experiment */
	.architecture-diagram {
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.metric-highlight {
		color: var(--color-fg-primary);
		font-weight: 600;
	}

	.comparison-table {
		border-collapse: collapse;
	}

	.comparison-table thead {
		background: var(--color-bg-subtle);
		border-bottom: 1px solid var(--color-border-default);
	}

	.comparison-table th {
		color: var(--color-fg-secondary);
		font-weight: 600;
	}

	.comparison-table tbody tr {
		border-bottom: 1px solid var(--color-border-default);
	}

	.comparison-table tbody tr:last-child {
		background: var(--color-bg-subtle);
	}

	.text-error {
		color: var(--color-error);
	}

	.text-success {
		color: var(--color-success);
	}
</style>
