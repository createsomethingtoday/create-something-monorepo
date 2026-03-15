---
category: "Canon"
section: "Patterns"
title: "Patterns"
publishedAt: "2026-01-08"
published: true
---

<section class="philosophy">
<h2 class="section-title">Components vs Patterns</h2>
<p class="section-description">
		Components are atomic building blocks. Patterns are molecular compositions that solve
		specific user problems.
	</p>
<div class="comparison-grid">
<div class="comparison-item">
<h3>Components</h3>
<ul>
<li>Single responsibility</li>
<li>Stateless or minimal state</li>
<li>Context-agnostic</li>
<li>Building blocks</li>
</ul>
<p class="comparison-example">Button, TextField, Card, Spinner</p>
</div>
<div class="comparison-item">
<h3>Patterns</h3>
<ul>
<li>Composed solutions</li>
<li>Handle user flows</li>
<li>Context-aware</li>
<li>Complete experiences</li>
</ul>
<p class="comparison-example">FormLayout, LoadingSkeleton, ErrorBoundary</p>
</div>
</div>


<section class="pattern-grid-section">
<h2 class="section-title">Available Patterns</h2>
<p class="section-description">
		Each pattern documents the problem it solves, shows implementation examples, and explains
		when to use it.
	</p>
<div class="pattern-grid">
<a class="pattern-card" href="/canon/patterns/forms">
<div class="card-icon">
<svg fill="none" height="24" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="24">
<rect height="18" rx="2" width="18" x="3" y="3"></rect>
<path d="M9 9h6M9 13h6M9 17h4"></path>
</svg>
</div>
<div class="card-content">
<h3 class="card-title">Forms</h3>
<p class="card-description">
					Input layouts, validation feedback, multi-step flows, and error states. Accessible
					form patterns that guide users through data entry.
				</p>
</div>
<div class="card-arrow">
<svg fill="none" height="16" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="16">
<path d="M5 12h14M12 5l7 7-7 7"></path>
</svg>
</div>
</a>
<a class="pattern-card" href="/canon/patterns/loading">
<div class="card-icon">
<svg fill="none" height="24" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="24">
<circle cx="12" cy="12" r="10"></circle>
<path d="M12 6v6l4 2"></path>
</svg>
</div>
<div class="card-content">
<h3 class="card-title">Loading</h3>
<p class="card-description">
					Skeleton screens, spinners, progress indicators, and content placeholders.
					Patterns that communicate system status during async operations.
				</p>
</div>
<div class="card-arrow">
<svg fill="none" height="16" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="16">
<path d="M5 12h14M12 5l7 7-7 7"></path>
</svg>
</div>
</a>
<!-- Planned Patterns -->
<div class="pattern-card pattern-card-planned">
<div class="card-icon">
<svg fill="none" height="24" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="24">
<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path>
<line x1="12" x2="12" y1="9" y2="13"></line>
<line x1="12" x2="12.01" y1="17" y2="17"></line>
</svg>
</div>
<div class="card-content">
<h3 class="card-title">Error Handling</h3>
<p class="card-description">
					Error boundaries, inline errors, toast notifications, and recovery flows.
					Graceful degradation when things go wrong.
				</p>
</div>
<span class="badge">Planned</span>
</div>
<div class="pattern-card pattern-card-planned">
<div class="card-icon">
<svg fill="none" height="24" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="24">
<rect height="18" rx="2" width="18" x="3" y="3"></rect>
<circle cx="12" cy="12" r="3"></circle>
<path d="M3 3l18 18"></path>
</svg>
</div>
<div class="card-content">
<h3 class="card-title">Empty States</h3>
<p class="card-description">
					Zero-data views, first-time user experiences, and call-to-action placeholders.
					Making "nothing" helpful.
				</p>
</div>
<span class="badge">Planned</span>
</div>
</div>


<section class="structure-section">
<h2 class="section-title">Pattern Documentation Structure</h2>
<p class="section-description">
		Each pattern follows a consistent documentation format.
	</p>
<div class="structure-grid">
<div class="structure-item">
<h3>Problem</h3>
<p>What user need does this pattern address? When should you reach for it?</p>
</div>
<div class="structure-item">
<h3>Solution</h3>
<p>Visual examples and interactive demos showing the pattern in action.</p>
</div>
<div class="structure-item">
<h3>Implementation</h3>
<p>Code examples using Canon components and tokens. Copy-paste ready.</p>
</div>
<div class="structure-item">
<h3>Accessibility</h3>
<p>Keyboard navigation, screen reader considerations, and reduced motion support.</p>
</div>
<div class="structure-item">
<h3>Variants</h3>
<p>Alternative approaches for different contexts or requirements.</p>
</div>
<div class="structure-item">
<h3>Anti-patterns</h3>
<p>Common mistakes to avoid and why they cause problems.</p>
</div>
</div>


<section class="triad-section">
<h2 class="section-title">Pattern Philosophy</h2>
<p class="section-description">
		Every Canon pattern follows the Subtractive Triad.
	</p>
<div class="triad-grid">
<div class="triad-item">
<h3>DRY (Implementation)</h3>
<p>
				Patterns unify repeated solutions. If you find yourself composing the same components
				the same way, it becomes a pattern.
			</p>
</div>
<div class="triad-item">
<h3>Rams (Artifact)</h3>
<p>
				Every pattern must earn its existence. If a pattern doesn't solve a real,
				recurring problem, it doesn't belong.
			</p>
</div>
<div class="triad-item">
<h3>Heidegger (System)</h3>
<p>
				Patterns serve the whole. They should feel invisible when used correctly, the
				infrastructure receding into the experience.
			</p>
</div>
</div>


<section class="canon-section">
<blockquote class="canon-quote">
<p>"Weniger, aber besser."</p>
<cite>Less, but better. - Dieter Rams</cite>
</blockquote>
<p class="canon-explanation">
		Patterns reduce cognitive load by providing proven solutions. A well-designed pattern is
		one you never think about because it simply works.
	</p>

