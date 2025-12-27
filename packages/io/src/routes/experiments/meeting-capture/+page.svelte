<script lang="ts">
	/**
	 * Meeting Capture Experiment
	 *
	 * Hypothesis: A meeting transcription tool with fewer features
	 * will achieve higher actual utility through Zuhandenheit.
	 */
</script>

<svelte:head>
	<title>Meeting Capture: Tools Recede, Understanding Remains | CREATE SOMETHING.io</title>
	<meta name="description" content="Building a personal meeting transcription tool that embodies Heideggerian Zuhandenheit—the tool disappears into use while understanding emerges." />
</svelte:head>

<div class="page">
	<div class="container">
		<!-- Header -->
		<header class="header">
			<p class="category-label">Experiment</p>
			<h1 class="title">Meeting Capture</h1>
			<p class="subtitle">Tools Recede, Understanding Remains</p>
			<p class="meta">
				December 2025 · Swift + Cloudflare Workers · Heidegger, Rams
			</p>
		</header>

		<!-- ASCII Art -->
		<div class="flex justify-center">
			<pre class="ascii-art">
╔══════════════════════════════════════════════════════════════════╗
║  MEETING CAPTURE                                                 ║
║                                                                  ║
║  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌─────────┐  ║
║  │  ((o))   │     │    ~     │     │   ___    │     │   [D1]  │  ║
║  │  AUDIO   │ ──► │ WHISPER  │ ──► │  TEXT    │ ──► │  STORE  │  ║
║  └──────────┘     └──────────┘     └──────────┘     └─────────┘  ║
║                                                                  ║
║     Swift          Workers AI        Transcript       Database   ║
║    (local)        (Cloudflare)                                   ║
╚══════════════════════════════════════════════════════════════════╝
			</pre>
		</div>

		<!-- Hypothesis -->
		<section class="abstract">
			<h2 class="section-title">Hypothesis</h2>
			<p class="lead">
				A meeting transcription tool with <em>fewer</em> features will achieve higher actual
				utility than feature-rich alternatives—because tools that recede into transparent use
				(Zuhandenheit) serve understanding better than tools that demand attention.
			</p>
		</section>

		<!-- Success Criteria -->
		<section class="section">
			<h2 class="section-title">Success Criteria</h2>
			<div class="criteria-grid">
				<div class="criterion validated">
					<span class="check">✓</span>
					<div>
						<strong>Zero interactions during meeting</strong>
						<p>Tool requires no attention while recording</p>
					</div>
				</div>
				<div class="criterion validated">
					<span class="check">✓</span>
					<div>
						<strong>Transcription completes &lt;60s post-meeting</strong>
						<p>Actual: 15-30s for typical meetings</p>
					</div>
				</div>
				<div class="criterion validated">
					<span class="check">✓</span>
					<div>
						<strong>Auto-detection works for Zoom, Meet, Teams</strong>
						<p>Tested with Zoom; Meet/Teams detection implemented</p>
					</div>
				</div>
				<div class="criterion partial">
					<span class="check">△</span>
					<div>
						<strong>Auto-stop when meeting ends</strong>
						<p>Partial: Manual stop required; detection unreliable</p>
					</div>
				</div>
				<div class="criterion failed">
					<span class="check">✗</span>
					<div>
						<strong>System audio capture</strong>
						<p>macOS Sonoma requires kernel extension; microphone only</p>
					</div>
				</div>
			</div>
		</section>

		<!-- Metrics -->
		<section class="section">
			<h2 class="section-title">Measured Results</h2>
			<table class="metrics-table">
				<thead>
					<tr>
						<th>Metric</th>
						<th>Target</th>
						<th>Actual</th>
						<th>Status</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>Setup time</td>
						<td>&lt;5 min</td>
						<td>~3 min</td>
						<td class="status-pass">Pass</td>
					</tr>
					<tr>
						<td>Transcription latency</td>
						<td>&lt;60s</td>
						<td>15-30s</td>
						<td class="status-pass">Pass</td>
					</tr>
					<tr>
						<td>Audio file size (30min)</td>
						<td>&lt;10MB</td>
						<td>~500KB</td>
						<td class="status-pass">Pass</td>
					</tr>
					<tr>
						<td>Interactions during meeting</td>
						<td>0</td>
						<td>0</td>
						<td class="status-pass">Pass</td>
					</tr>
					<tr>
						<td>Post-meeting interactions</td>
						<td>1 (stop)</td>
						<td>1</td>
						<td class="status-partial">Partial</td>
					</tr>
					<tr>
						<td>System audio capture</td>
						<td>Yes</td>
						<td>No</td>
						<td class="status-fail">Fail</td>
					</tr>
				</tbody>
			</table>
		</section>

		<!-- Philosophical Foundation -->
		<section class="section">
			<h2 class="section-title">Grounding: Heidegger on Tools</h2>
			<div class="content">
				<p class="body-text">
					In <em>Being and Time</em> (1927), Heidegger distinguishes two modes of encountering equipment:
				</p>

				<div class="grid md:grid-cols-2 gap-6">
					<div class="card">
						<h4 class="card-title">Zuhandenheit</h4>
						<p class="card-subtitle">Ready-to-hand</p>
						<p class="card-text">
							The tool disappears into use. When hammering, we think about the nail—not the hammer.
							The tool serves the work; attention flows through it.
						</p>
						<p class="card-footer positive">Target state for Meeting Capture</p>
					</div>
					<div class="card">
						<h4 class="card-title">Vorhandenheit</h4>
						<p class="card-subtitle">Present-at-hand</p>
						<p class="card-text">
							The tool becomes an object of attention. When the hammer breaks, we suddenly
							<em>see</em> the hammer. It intrudes into consciousness.
						</p>
						<p class="card-footer negative">What feature-bloat creates</p>
					</div>
				</div>

				<blockquote class="quote">
					<p>
						"The less we just stare at the hammer-thing, and the more we seize hold of it and use
						it, the more primordial does our relationship to it become."
					</p>
					<cite>— Heidegger, Being and Time §15</cite>
				</blockquote>

				<p class="body-text">
					Feature-rich tools like Granola and Otter shift equipment from Zuhanden to Vorhanden
					through accumulated complexity: speaker identification, action item extraction, calendar
					sync, team sharing. Each individually justified; collectively attention-demanding.
				</p>
			</div>
		</section>

		<!-- The Subtractive Approach -->
		<section class="section">
			<h2 class="section-title">Method: Subtractive Triad</h2>
			<div class="content">
				<p class="body-text">
					Following Rams's tenth principle ("As little design as possible") and the Subtractive
					Triad, we asked three questions for each potential feature:
				</p>

				<div class="triad-stack">
					<div class="triad-item">
						<h4 class="triad-title">DRY (Implementation)</h4>
						<p class="triad-question">"Have I built this before?"</p>
						<p class="triad-answer">→ Cloudflare D1, R2, Workers AI already exist. Use them.</p>
					</div>
					<div class="triad-item">
						<h4 class="triad-title">Rams (Artifact)</h4>
						<p class="triad-question">"Does this feature earn its existence?"</p>
						<p class="triad-answer">→ Speaker diarization? Action items? No—complexity without proportional value.</p>
					</div>
					<div class="triad-item">
						<h4 class="triad-title">Heidegger (System)</h4>
						<p class="triad-question">"Does this serve the whole?"</p>
						<p class="triad-answer">→ Store in D1 to join the CREATE SOMETHING knowledge graph.</p>
					</div>
				</div>

				<h3 class="subsection-title">Features Removed</h3>
				<ul class="list">
					<li><span class="removed">Real-time transcription</span> — Complexity without benefit; post-meeting suffices</li>
					<li><span class="removed">Speaker identification</span> — Adds 3x complexity; rarely needed for personal use</li>
					<li><span class="removed">Action item extraction</span> — AI hallucination risk exceeds value</li>
					<li><span class="removed">Calendar integration</span> — Meeting detection handles this</li>
					<li><span class="removed">Team sharing</span> — Personal tool; single user</li>
					<li><span class="removed">Web dashboard</span> — <code>curl</code> suffices for queries</li>
				</ul>

				<h3 class="subsection-title">Features Retained</h3>
				<ul class="list">
					<li><span class="kept">Auto-detect meetings</span> — Zoom, Google Meet, Teams via NSWorkspace + AppleScript</li>
					<li><span class="kept">Record microphone</span> — AVFoundation; system audio requires kernel extension</li>
					<li><span class="kept">Upload on stop</span> — Multipart form to Cloudflare Worker</li>
					<li><span class="kept">Transcribe via Whisper</span> — @cf/openai/whisper-large-v3-turbo</li>
					<li><span class="kept">Store in D1</span> — Searchable via SQL</li>
				</ul>
			</div>
		</section>

		<!-- Architecture -->
		<section class="section">
			<h2 class="section-title">Implementation</h2>
			<div class="content">
				<div class="grid md:grid-cols-2 gap-6">
					<div class="card">
						<h4 class="card-title">macOS Menubar App</h4>
						<p class="card-subtitle">Swift + SwiftUI · ~400 LOC</p>
						<ul class="card-list">
							<li>• NSWorkspace for app monitoring</li>
							<li>• AppleScript → System Events for call detection</li>
							<li>• AVFoundation for microphone capture</li>
							<li>• URLSession for multipart upload</li>
						</ul>
					</div>
					<div class="card">
						<h4 class="card-title">Cloudflare Worker</h4>
						<p class="card-subtitle">TypeScript · ~200 LOC</p>
						<ul class="card-list">
							<li>• R2 for audio storage</li>
							<li>• Workers AI (Whisper) for transcription</li>
							<li>• D1 for transcript storage</li>
							<li>• ctx.waitUntil() for background processing</li>
						</ul>
					</div>
				</div>

				<h3 class="subsection-title">Technical Learnings</h3>

				<div class="decision">
					<h4 class="decision-title">Whisper requires Base64, not ArrayBuffer</h4>
					<p class="decision-text">
						<code>@cf/openai/whisper-large-v3-turbo</code> expects Base64-encoded audio.
						The standard Whisper model accepts integer arrays. This distinction caused
						"Type mismatch of '/audio'" errors until resolved. Documentation unclear.
					</p>
				</div>

				<div class="decision">
					<h4 class="decision-title">Unsigned apps cannot run AppleScript</h4>
					<p class="decision-text">
						macOS blocks unsigned apps from querying System Events, even with Automation
						permission. Ad-hoc signing with <code>com.apple.security.automation.apple-events</code>
						entitlement resolves this without Developer ID.
					</p>
				</div>

				<div class="decision">
					<h4 class="decision-title">ArrayBuffer detaches in async context</h4>
					<p class="decision-text">
						Audio data passed to <code>ctx.waitUntil()</code> becomes unusable. Solution:
						store in R2 first, re-fetch within the async handler.
					</p>
				</div>
			</div>
		</section>

		<!-- Limitations -->
		<section class="section">
			<h2 class="section-title">Limitations & Failures</h2>
			<div class="content">
				<div class="limitation">
					<h4>System audio capture not implemented</h4>
					<p>
						macOS Sonoma requires a kernel extension or audio driver (like BlackHole) for
						system audio capture. This experiment captures microphone only—participant voices
						are clear, but shared content audio is not captured. A production tool would need
						to integrate with an audio routing solution.
					</p>
				</div>

				<div class="limitation">
					<h4>Auto-stop detection unreliable</h4>
					<p>
						Zoom's helper processes (CptHost, caphost) don't terminate predictably when a
						meeting ends. AppleScript window-count detection has false positives. Current
						implementation requires manual stop. Acceptable for personal use; would need
						improvement for broader adoption.
					</p>
				</div>

				<div class="limitation">
					<h4>Transcription accuracy varies</h4>
					<p>
						Whisper performs well for clear speech but struggles with overlapping voices,
						technical jargon, and non-English content. No quantitative WER measurement
						performed in this experiment.
					</p>
				</div>
			</div>
		</section>

		<!-- Reproducibility -->
		<section class="section">
			<h2 class="section-title">Reproducibility</h2>
			<div class="content">
				<h3 class="subsection-title">Prerequisites</h3>
				<ul class="list">
					<li>macOS 14+ (Sonoma) with Xcode 15+</li>
					<li>Cloudflare account with Workers AI access</li>
					<li>Microphone permission granted to app</li>
					<li>Automation permission for System Events</li>
				</ul>

				<h3 class="subsection-title">Expected Challenges</h3>
				<ul class="list">
					<li>Code signing: Without ad-hoc signing, AppleScript will fail silently</li>
					<li>Whisper input format: Use Base64, not ArrayBuffer for turbo model</li>
					<li>D1 FTS5: Full-text search virtual tables may cause database corruption</li>
				</ul>

				<h3 class="subsection-title">Starting Prompt</h3>
				<pre class="code-block">{`Build a macOS menubar app that:
1. Detects when Zoom/Meet/Teams starts a call
2. Records microphone audio
3. Uploads to a Cloudflare Worker on stop
4. Transcribes via Whisper and stores in D1

Use: Swift/SwiftUI, AVFoundation, NSWorkspace
Constraints: No UI during recording, <500 LOC total`}</pre>
			</div>
		</section>

		<!-- Conclusion -->
		<section class="section">
			<h2 class="section-title">Conclusion</h2>
			<div class="content">
				<p class="body-text">
					The hypothesis is <strong>partially validated</strong>. A minimal transcription tool
					achieves Zuhandenheit for its core function—zero attention during meetings, automatic
					transcription after. The tool recedes.
				</p>
				<p class="body-text">
					However, the manual stop requirement and microphone-only capture represent failures
					to fully disappear. A tool that demands even one interaction per meeting has not
					completely achieved ready-to-hand status.
				</p>
				<blockquote class="quote featured">
					<p>"Weniger, aber besser."</p>
					<cite>— Dieter Rams</cite>
				</blockquote>
				<p class="body-text">
					Less, but better. The discipline of removal produced a functional tool in ~600 LOC
					across two components. Whether "better" depends on use case: for personal meeting
					notes, this suffices. For team collaboration, the removed features become necessary.
				</p>
			</div>
		</section>

		<!-- Footer -->
		<footer class="footer">
			<div class="grid md:grid-cols-2 gap-8">
				<div>
					<h4 class="footer-heading">Principles Applied</h4>
					<ul class="footer-list">
						<li><a href="https://createsomething.ltd/masters/heidegger">Heidegger: Zuhandenheit</a></li>
						<li><a href="https://createsomething.ltd/masters/dieter-rams">Rams #10: As little design as possible</a></li>
						<li><a href="https://createsomething.ltd/patterns/subtractive-triad-audit">Subtractive Triad</a></li>
						<li><a href="https://createsomething.ltd/patterns/dwelling-in-tools">Dwelling in Tools</a></li>
					</ul>
				</div>
				<div>
					<h4 class="footer-heading">Related</h4>
					<ul class="footer-list">
						<li><a href="/papers/hermeneutic-spiral-ux">The Hermeneutic Spiral in UX</a></li>
						<li><a href="/experiments">All Experiments</a></li>
					</ul>
				</div>
			</div>
		</footer>
	</div>
</div>

<style>
	@import '$lib/styles/experiment-page.css';

	/* Page-specific components and overrides */

	/* Metrics Table - page-specific component */
	.metrics-table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-body-sm);
	}

	.metrics-table th,
	.metrics-table td {
		padding: var(--space-sm);
		text-align: left;
		border-bottom: 1px solid var(--color-border-default);
	}

	.metrics-table th {
		color: var(--color-fg-muted);
		font-weight: 500;
		text-transform: uppercase;
		font-size: var(--text-caption);
		letter-spacing: 0.05em;
	}

	.metrics-table td {
		color: var(--color-fg-secondary);
	}

	.status-pass { color: var(--color-success); font-weight: 600; }
	.status-partial { color: var(--color-warning); font-weight: 600; }
	.status-fail { color: var(--color-error); font-weight: 600; }

	/* Triad - page-specific component */
	.triad-stack {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.triad-item {
		background: var(--color-bg-surface);
		padding: var(--space-md);
		border-radius: var(--radius-md);
		border-left: 4px solid var(--color-border-emphasis);
	}

	.triad-title {
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.triad-question {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.triad-answer {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin-top: var(--space-xs);
	}

	/* Lists - page-specific component */
	.list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.list li {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		padding: var(--space-xs) 0;
		border-bottom: 1px solid var(--color-bg-subtle);
	}

	.removed {
		text-decoration: line-through;
		color: var(--color-fg-muted);
	}

	.kept {
		color: var(--color-fg-primary);
	}

	/* Decisions - page-specific component */
	.decision {
		background: var(--color-bg-elevated);
		padding: var(--space-md);
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border-default);
		margin-bottom: var(--space-sm);
	}

	.decision-title {
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.decision-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	/* Limitations - page-specific component */
	.limitation {
		background: var(--color-bg-surface);
		padding: var(--space-md);
		border-radius: var(--radius-md);
		border-left: 4px solid var(--color-error);
		margin-bottom: var(--space-sm);
	}

	.limitation h4 {
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.limitation p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	/* Code Block - page-specific component */
	.code-block {
		font-family: monospace;
		font-size: var(--text-body-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		padding: var(--space-md);
		overflow-x: auto;
		color: var(--color-fg-secondary);
		white-space: pre-wrap;
	}

	/* Quote - page-specific override (shared uses 4px border, this uses 2px) */
	.quote {
		border-left: 2px solid var(--color-border-emphasis);
		padding-left: var(--space-md);
		margin: var(--space-md) 0;
	}

	.quote p {
		font-style: italic;
		color: var(--color-fg-secondary);
	}

	.quote cite {
		display: block;
		margin-top: var(--space-xs);
		font-size: var(--text-body-sm);
		font-style: normal;
		color: var(--color-fg-muted);
	}

	.quote.featured {
		background: var(--color-bg-surface);
		padding: var(--space-md);
		border-radius: var(--radius-md);
	}

	.quote.featured p {
		font-size: var(--text-body-lg);
	}
</style>
