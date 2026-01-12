---
category: "Canon"
section: "Concepts"
title: "Concepts"
description: "Canonical definitions for the philosophical vocabulary of CREATE SOMETHING's design system."
publishedAt: "2026-01-08"
published: true
---

<section class="concepts-grid">
<a class="concept-card" href="/canon/concepts/weniger-aber-besser">
<h2>Weniger, aber besser</h2>
<p class="concept-translation">"Less, but better"</p>
<p class="concept-summary">
		Quality comes from removing what doesn't belong. If it doesn't serve a purpose, it doesn't stay.
	</p>
<span class="concept-origin">Dieter Rams</span>
</a>
<a class="concept-card" href="/canon/concepts/zuhandenheit">
<h2>Zuhandenheit</h2>
<p class="concept-translation">"Ready-to-hand" — tools that disappear into use</p>
<p class="concept-summary">
		Good tools get out of your way. You don't think about the hammer—you think about the nail.
	</p>
<span class="concept-origin">Martin Heidegger</span>
</a>
<a class="concept-card" href="/canon/concepts/vorhandenheit">
<h2>Vorhandenheit</h2>
<p class="concept-translation">"Present-at-hand" — when tools demand attention</p>
<p class="concept-summary">
		When you notice the design, something's broken. Failure makes the invisible visible.
	</p>
<span class="concept-origin">Martin Heidegger</span>
</a>
<a class="concept-card" href="/canon/concepts/gestell">
<h2>Gestell</h2>
<p class="concept-translation">"Enframing" — seeing everything as a resource</p>
<p class="concept-summary">
		The trap of treating everything as raw material to optimize. Not every gap needs filling.
	</p>
<span class="concept-origin">Martin Heidegger</span>
</a>
<a class="concept-card" href="/canon/concepts/gelassenheit">
<h2>Gelassenheit</h2>
<p class="concept-translation">"Releasement" — using tools without being used by them</p>
<p class="concept-summary">
		Use technology fully, but stay free from it. The craftsman uses the hammer; the hammer doesn't use him.
	</p>
<span class="concept-origin">Martin Heidegger</span>
</a>
<a class="concept-card" href="/canon/concepts/complementarity">
<h2>Complementarity</h2>
<p class="concept-translation">"Mutual completion" — humans and AI working together</p>
<p class="concept-summary">
		Human judgment + AI execution = more than either alone. Partnership, not replacement.
	</p>
<span class="concept-origin">CREATE SOMETHING</span>
</a>
<a class="concept-card" href="/canon/concepts/hermeneutic-circle">
<h2>Hermeneutic Circle</h2>
<p class="concept-translation">"Parts and whole" — understanding through iteration</p>
<p class="concept-summary">
		You understand sentences through words, and words through sentences. Each pass deepens meaning.
	</p>
<span class="concept-origin">Hermeneutic Tradition</span>
</a>
</section>

<style>
.concepts-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
	gap: var(--space-lg);
	margin: var(--space-2xl) 0;
}

.concept-card {
	display: flex;
	flex-direction: column;
	padding: var(--space-lg);
	background: var(--color-bg-surface);
	border: 1px solid var(--color-border-default);
	border-radius: var(--radius-md);
	text-decoration: none;
	color: inherit;
	transition: all var(--duration-standard) var(--ease-standard);
}

.concept-card:hover {
	border-color: var(--color-border-strong);
	transform: translateY(-4px);
	box-shadow: var(--shadow-lg);
}

.concept-card h2 {
	margin: 0 0 var(--space-sm) 0;
	font-size: var(--text-h3);
	color: var(--color-fg-primary);
}

.concept-translation {
	font-size: var(--text-body-sm);
	color: var(--color-fg-tertiary);
	font-style: italic;
	margin: 0 0 var(--space-md) 0;
}

.concept-summary {
	flex: 1;
	line-height: var(--leading-relaxed);
	color: var(--color-fg-secondary);
	margin: 0 0 var(--space-md) 0;
}

.concept-origin {
	font-size: var(--text-caption);
	text-transform: uppercase;
	letter-spacing: var(--tracking-widest);
	color: var(--color-fg-muted);
	font-weight: var(--font-medium);
}
</style>
