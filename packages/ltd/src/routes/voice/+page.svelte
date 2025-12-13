<svelte:head>
	<title>Voice — CREATE SOMETHING.ltd</title>
	<meta
		name="description"
		content="The CREATE SOMETHING voice guidelines. How we write, what we avoid, and the principles that govern all content across the ecosystem."
	/>
</svelte:head>

<!-- Header -->
<section class="header-section pt-24 pb-16 px-6">
	<div class="max-w-4xl mx-auto text-center">
		<p class="eyebrow mb-4">Writing Standards</p>
		<h1 class="mb-6">Voice</h1>
		<p class="header-description leading-relaxed">
			How we write across the CREATE SOMETHING ecosystem. Not a style guide—a philosophical
			commitment to clarity, honesty, and empirical rigor.
		</p>
	</div>
</section>

<!-- Core Principles -->
<section class="py-16 px-6">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Five Principles</h2>

		<div class="space-y-8">
			<div>
				<h3 class="mb-3">1. Clarity Over Cleverness</h3>
				<p class="principle-description leading-relaxed mb-3">
					Code is read 10x more than written. Writing is read 100x more than written. Serve the
					reader.
				</p>
				<div class="example-block pl-4 space-y-2">
					<p><strong>Yes:</strong> "Built in 6 hours vs 15-20 hours estimated (60-70% savings)"</p>
					<p><strong>No:</strong> "Significantly improved development velocity"</p>
				</div>
			</div>

			<div>
				<h3 class="mb-3">2. Specificity Over Generality</h3>
				<p class="principle-description leading-relaxed mb-3">
					Every claim must be measurable. Every metric must be precise. Vagueness is dishonest.
				</p>
				<div class="example-block pl-4 space-y-2">
					<p><strong>Yes:</strong> "26 hours actual vs 120 estimated"</p>
					<p><strong>No:</strong> "Saved significant development time"</p>
				</div>
			</div>

			<div>
				<h3 class="mb-3">3. Honesty Over Polish</h3>
				<p class="principle-description leading-relaxed mb-3">
					Document failures. Acknowledge limitations. Share what didn't work as freely as what did.
				</p>
				<div class="example-block pl-4 space-y-2">
					<p><strong>Required:</strong> "What This Proves / What This Doesn't Prove" sections</p>
					<p><strong>Required:</strong> "Where User Intervention Was Needed" documentation</p>
				</div>
			</div>

			<div>
				<h3 class="mb-3">4. Useful Over Interesting</h3>
				<p class="principle-description leading-relaxed mb-3">
					Every paper must answer: Is this useful? Not interesting, not novel—useful. Can readers
					implement this? Are prerequisites clear?
				</p>
				<div class="example-block pl-4 space-y-2">
					<p><strong>Required:</strong> Reproducibility sections with starting prompts</p>
					<p><strong>Required:</strong> Expected challenges documented</p>
				</div>
			</div>

			<div>
				<h3 class="mb-3">5. Grounded Over Trendy</h3>
				<p class="principle-description leading-relaxed mb-3">
					Connect technical decisions to timeless principles. Cite masters. Show philosophical
					lineage. Principles that withstand technological change.
				</p>
				<div class="example-block pl-4 space-y-2">
					<p><strong>Example:</strong> "Given: Rams 'Good design is unobtrusive'"</p>
					<p><strong>Example:</strong> "Context: Tufte's principle of maximizing data-ink ratio"</p>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Sentence Patterns -->
<section class="section-divider py-16 px-6">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Sentence Patterns</h2>

		<div class="space-y-6">
			<div>
				<h3 class="pattern-title mb-2">Short Declarative Statements</h3>
				<div class="space-y-2 pattern-examples">
					<p>"This isn't minimalism for aesthetics. It's discipline for clarity."</p>
					<p>"Less, but better."</p>
					<p>"Decoration is dishonest."</p>
				</div>
			</div>

			<div>
				<h3 class="pattern-title mb-2">Paired Constructions (What It Is / Isn't)</h3>
				<div class="space-y-2 pattern-examples">
					<p>"Not blog posts about AI, but real data from building real systems"</p>
					<p>"Not features for features' sake"</p>
					<p>"Not interesting, not novel—useful"</p>
				</div>
			</div>

			<div>
				<h3 class="pattern-title mb-2">Em-Dash for Emphasis</h3>
				<div class="space-y-2 pattern-examples">
					<p>"Built in 6 hours — 65% faster than manual development"</p>
					<p>"These aren't experiments — they're business-critical infrastructure"</p>
					<p>"Research papers with tracked experiments — not just blog posts"</p>
				</div>
			</div>

			<div>
				<h3 class="pattern-title mb-2">Interrogative (Questions That Interrogate)</h3>
				<div class="space-y-2 pattern-examples">
					<p>"Is my design good design?"</p>
					<p>"Does this meet Rams' principles?"</p>
					<p>"What must remain?"</p>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Required Elements -->
<section class="section-divider py-16 px-6">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Required Elements for Experiments</h2>

		<div class="space-y-4 checklist-items">
			<div class="flex items-start gap-3">
				<span class="checkmark mt-1">✓</span>
				<span
					><strong>ASCII Art Header</strong> — Terminal aesthetic with key metrics displayed</span
				>
			</div>
			<div class="flex items-start gap-3">
				<span class="checkmark mt-1">✓</span>
				<span
					><strong>Hypothesis → Validation</strong> — State what you're testing, measure results</span
				>
			</div>
			<div class="flex items-start gap-3">
				<span class="checkmark mt-1">✓</span>
				<span
					><strong>Success Criteria</strong> — Checkbox format with ✅/❌ actual outcomes</span
				>
			</div>
			<div class="flex items-start gap-3">
				<span class="checkmark mt-1">✓</span>
				<span><strong>Metrics Table</strong> — Time, cost, savings, ROI calculated</span>
			</div>
			<div class="flex items-start gap-3">
				<span class="checkmark mt-1">✓</span>
				<span
					><strong>Honest Assessment</strong> — "What This Proves" AND "What This Doesn't
					Prove"</span
				>
			</div>
			<div class="flex items-start gap-3">
				<span class="checkmark mt-1">✓</span>
				<span
					><strong>Where Intervention Was Needed</strong> — Document errors, iterations,
					learnings</span
				>
			</div>
			<div class="flex items-start gap-3">
				<span class="checkmark mt-1">✓</span>
				<span
					><strong>Reproducibility</strong> — Prerequisites, starting prompt, expected
					challenges</span
				>
			</div>
			<div class="flex items-start gap-3">
				<span class="checkmark mt-1">✓</span>
				<span><strong>Master Citation</strong> — Connect to canonical principles when relevant</span
				>
			</div>
			<div class="flex items-start gap-3">
				<span class="checkmark mt-1">✓</span>
				<span
					><strong>Hypothesis Outcome</strong> — ✅ VALIDATED or ❌ INVALIDATED (be honest)</span
				>
			</div>
		</div>
	</div>
</section>

<!-- Forbidden Patterns -->
<section class="section-divider py-16 px-6">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Forbidden Patterns</h2>

		<div class="space-y-6">
			<div>
				<h3 class="forbidden-title mb-3">Marketing Jargon (Never Use)</h3>
				<div class="grid grid-cols-2 gap-3 forbidden-grid">
					<div class="line-through">Cutting-edge</div>
					<div class="line-through">Revolutionary</div>
					<div class="line-through">Game-changing</div>
					<div class="line-through">AI-powered</div>
					<div class="line-through">Leverage</div>
					<div class="line-through">Synergy</div>
					<div class="line-through">Solutions</div>
					<div class="line-through">Best-in-class</div>
				</div>
			</div>

			<div>
				<h3 class="forbidden-title mb-3">Vague Claims (Replace With Specifics)</h3>
				<div class="space-y-2 vague-examples">
					<p class="line-through vague">"Significantly improved performance"</p>
					<p class="replacement">→ "Reduced load time from 3.2s to 0.8s (75% improvement)"</p>
				</div>
				<div class="space-y-2 vague-examples mt-2">
					<p class="line-through vague">"Many users benefited"</p>
					<p class="replacement">→ "47 active users across 12 organizations"</p>
				</div>
			</div>

			<div>
				<h3 class="forbidden-title mb-3">Decoration Without Function</h3>
				<div class="space-y-2 decoration-rules">
					<p>No emoji (unless terminal aesthetic like ✅/❌ for status)</p>
					<p>No stock photos for visual interest</p>
					<p>No color accents for "brand personality"</p>
					<p>Every element must justify its existence</p>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Voice Checklist -->
<section class="section-divider py-16 px-6">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Voice Checklist</h2>

		<p class="checklist-intro mb-6">Before publishing any content, verify:</p>

		<div class="checklist-box p-8">
			<div class="space-y-4">
				<div class="flex items-start gap-3">
					<span class="checkbox">[ ]</span>
					<span>Are all claims backed by specific metrics?</span>
				</div>
				<div class="flex items-start gap-3">
					<span class="checkbox">[ ]</span>
					<span>Are time/cost comparisons included?</span>
				</div>
				<div class="flex items-start gap-3">
					<span class="checkbox">[ ]</span>
					<span>Is the methodology transparent?</span>
				</div>
				<div class="flex items-start gap-3">
					<span class="checkbox">[ ]</span>
					<span>Are failures documented?</span>
				</div>
				<div class="flex items-start gap-3">
					<span class="checkbox">[ ]</span>
					<span>Are limitations acknowledged?</span>
				</div>
				<div class="flex items-start gap-3">
					<span class="checkbox">[ ]</span>
					<span>Is this reproducible by others?</span>
				</div>
				<div class="flex items-start gap-3">
					<span class="checkbox">[ ]</span>
					<span>Does this solve a real problem?</span>
				</div>
				<div class="flex items-start gap-3">
					<span class="checkbox">[ ]</span>
					<span>Can readers implement this?</span>
				</div>
				<div class="flex items-start gap-3">
					<span class="checkbox">[ ]</span>
					<span>Are prerequisites clear?</span>
				</div>
				<div class="flex items-start gap-3">
					<span class="checkbox">[ ]</span>
					<span>Is a master/principle cited when relevant?</span>
				</div>
				<div class="flex items-start gap-3">
					<span class="checkbox">[ ]</span>
					<span>Does this connect to the canon?</span>
				</div>
				<div class="flex items-start gap-3">
					<span class="checkbox">[ ]</span>
					<span>No marketing jargon?</span>
				</div>
				<div class="flex items-start gap-3">
					<span class="checkbox">[ ]</span>
					<span>Direct, declarative sentences?</span>
				</div>
				<div class="flex items-start gap-3">
					<span class="checkbox">[ ]</span>
					<span>Specific over vague?</span>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Terminology -->
<section class="section-divider py-16 px-6">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Preferred Terminology</h2>

		<div class="space-y-8">
			<div>
				<h3 class="terminology-title mb-3">AI Development</h3>
				<div class="space-y-2 terminology-list">
					<p><strong>Use:</strong> "AI-native development" (not "AI-assisted" or "AI-powered")</p>
					<p><strong>Use:</strong> "Agentic systems" (not "AI agents" alone)</p>
					<p><strong>Use:</strong> "Claude Code" (specific tool, not generic "AI")</p>
					<p>
						<strong>Use:</strong> "Working with AI agents as development partners" (not "using AI")
					</p>
				</div>
			</div>

			<div>
				<h3 class="terminology-title mb-3">Research</h3>
				<div class="space-y-2 terminology-list">
					<p><strong>Use:</strong> "Experiments" (not "projects" or "case studies")</p>
					<p><strong>Use:</strong> "Papers" (not "blog posts" or "articles")</p>
					<p><strong>Use:</strong> "Tracked experiments" (emphasis on measurement)</p>
					<p><strong>Use:</strong> "Reproducible results" (not "findings")</p>
					<p><strong>Use:</strong> "Rigorous methodology" (not "best practices")</p>
				</div>
			</div>

			<div>
				<h3 class="terminology-title mb-3">Quality</h3>
				<div class="space-y-2 terminology-list">
					<p><strong>Use:</strong> "Production-ready" (not "functional" or "working")</p>
					<p>
						<strong>Use:</strong> "Business-critical infrastructure" (not "enterprise solution")
					</p>
					<p><strong>Use:</strong> "Systems thinking" (not "best practices")</p>
					<p><strong>Use:</strong> "Canonical standards" (not "style guide")</p>
				</div>
			</div>

			<div>
				<h3 class="terminology-title mb-3">Philosophy</h3>
				<div class="space-y-2 terminology-list">
					<p><strong>Use:</strong> "Less, but better" (always this phrase)</p>
					<p><strong>Use:</strong> "Weniger, aber besser" (German original for formal contexts)</p>
					<p><strong>Use:</strong> "Modes of Being" (not "properties" or "websites")</p>
					<p><strong>Use:</strong> "The Canon" (capitalized, sacred)</p>
					<p><strong>Use:</strong> "Masters" (not "influences" or "inspiration")</p>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- The Hermeneutic Test -->
<section class="section-divider py-16 px-6">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">The Hermeneutic Test</h2>

		<div class="space-y-6 test-description leading-relaxed">
			<p>
				Every piece of content must pass the hermeneutic circle. This is our quality control:
			</p>

			<div class="test-box p-6 space-y-4">
				<div>
					<p class="test-question mb-2">Does this part reveal the whole?</p>
					<p class="test-answer">
						Does this experiment embody "less, but better"? Can someone read this and understand
						what CREATE SOMETHING stands for?
					</p>
				</div>

				<div>
					<p class="test-question mb-2">Does the whole explain this part?</p>
					<p class="test-answer">
						Can you trace this decision to a canonical principle? Does this connect to .ltd
						standards?
					</p>
				</div>

				<div>
					<p class="test-question mb-2">Does this strengthen the circle?</p>
					<p class="test-answer">
						Does it feed back to validate or evolve the canon? Does it make the ecosystem more
						coherent?
					</p>
				</div>
			</div>

			<p class="pt-4">
				If any answer is "no," revise or reject. <strong
					>The circle is our competitive advantage.</strong
				>
			</p>
		</div>
	</div>
</section>

<!-- How the Masters Wrote -->
<section class="section-divider py-16 px-6">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">How the Masters Wrote</h2>

		<div class="space-y-6 masters-description leading-relaxed">
			<p>
				Our voice is isomorphic to our principles—the form matches the content. This is how the
				masters wrote:
			</p>

			<div class="space-y-6 mt-6">
				<div class="master-quote pl-4">
					<p class="master-name mb-1">Dieter Rams</p>
					<p class="master-approach mb-2">
						Declarative principles. No fluff. Compressed wisdom.
					</p>
					<p class="quote-text">"Good design is as little design as possible."</p>
				</div>

				<div class="master-quote pl-4">
					<p class="master-name mb-1">Ludwig Mies van der Rohe</p>
					<p class="master-approach mb-2">Aphoristic. Architectural. Essential.</p>
					<p class="quote-text">"Less is more."</p>
					<p class="quote-text">"God is in the details."</p>
				</div>

				<div class="master-quote pl-4">
					<p class="master-name mb-1">Edward Tufte</p>
					<p class="master-approach mb-2">
						Empirical descriptions paired with visual proof. High data density.
					</p>
					<p class="quote-text">"Above all else show the data."</p>
				</div>

				<div class="master-quote pl-4">
					<p class="master-name mb-1">Charles and Ray Eames</p>
					<p class="master-approach mb-2">
						Functional elegance. Every word serves the reader.
					</p>
					<p class="quote-text">"The best for the most for the least."</p>
				</div>
			</div>

			<p class="pt-6">
				We don't imitate their style. We <strong>enact the same discipline</strong> that produced
				their style. Writing that emerges from "weniger, aber besser" sounds like this because it
				must.
			</p>
		</div>
	</div>
</section>

<!-- Final Note -->
<section class="section-divider py-16 px-6">
	<div class="max-w-3xl mx-auto">
		<div class="final-note p-8">
			<p class="note-title mb-4">
				<strong>This is not a brand guideline.</strong>
			</p>
			<p class="note-description leading-relaxed">
				Brand guidelines are static rules. This is a living interpretive framework. The voice
				evolves through the hermeneutic circle—slowly, carefully, through validation in
				real-world practice.
			</p>
			<p class="note-description leading-relaxed mt-4">
				Protect the circle. Trust the circle. Let the circle refine itself.
			</p>
		</div>
	</div>
</section>

<style>
	.header-section {
		border-bottom: 1px solid var(--color-border-default);
	}

	.eyebrow {
		font-size: var(--text-body-sm);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-fg-tertiary);
	}

	.header-description {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
	}

	.principle-description {
		color: var(--color-fg-secondary);
	}

	.example-block {
		border-left: 2px solid var(--color-border-emphasis);
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.section-divider {
		border-top: 1px solid var(--color-border-default);
	}

	.pattern-title {
		font-size: var(--text-body-lg);
		font-family: monospace;
	}

	.pattern-examples {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
	}

	.checklist-items {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
	}

	.checkmark {
		color: var(--color-fg-muted);
	}

	.forbidden-title {
		font-size: var(--text-body-lg);
	}

	.forbidden-grid {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.vague-examples {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
	}

	.vague {
		color: var(--color-fg-muted);
	}

	.replacement {
		color: var(--color-fg-secondary);
	}

	.decoration-rules {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
	}

	.checklist-intro {
		color: var(--color-fg-secondary);
	}

	.checklist-box {
		border: 1px solid var(--color-border-default);
		font-family: monospace;
		font-size: var(--text-body-sm);
	}

	.checkbox {
		color: var(--color-fg-muted);
	}

	.terminology-title {
		font-size: var(--text-body-lg);
	}

	.terminology-list {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
	}

	.test-description {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
	}

	.test-box {
		border: 1px solid var(--color-border-default);
	}

	.test-question {
		font-weight: 600;
	}

	.test-answer {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.masters-description {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
	}

	.master-quote {
		border-left: 2px solid var(--color-border-emphasis);
	}

	.master-name {
		font-weight: 600;
	}

	.master-approach {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.quote-text {
		font-size: var(--text-body-sm);
		font-style: italic;
	}

	.final-note {
		border: 1px solid var(--color-border-default);
	}

	.note-title {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
	}

	.note-description {
		color: var(--color-fg-secondary);
	}
</style>
