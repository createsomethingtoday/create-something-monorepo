---
category: "Canon"
section: "Guidelines"
title: "Theming"
description: "Create custom themes by extending Canon's design tokens. Dark mode, light mode, and brand customization patterns."
lead: "Canon's token architecture enables systematic theming. Override tokens
		at the root level to create consistent custom themes."
publishedAt: "2026-01-08"
published: true
---


<h2>Philosophy</h2>
<p>
		Themes should extend, not replace. Canon provides a complete token system
		that establishes relationships between colors, spacing, and typography.
		Custom themes override specific tokens while maintaining these relationships.
	</p>
<blockquote class="philosophy-quote">
		"A system is not the sum of its parts but the product of their interactions."
		<cite>— Russell Ackoff</cite>
</blockquote>



<h2>Token Categories</h2>
<p class="section-description">
		These tokens form the theming surface. Override them to create custom themes.
	</p>
<div class="token-categories">
		{#each themeTokens as category}
			<div class="category-card">
<h3>{category.category}</h3>
<ul class="token-list">
					{#each category.tokens as token}
						<li><code>{token}</code></li>
					{/each}
				</ul>
</div>
		{/each}
	</div>



<h2>Custom Theme</h2>
<p class="section-description">
		Create a custom theme by overriding Canon's color tokens at the root level.
	</p>
<codeblock code="{customThemeExample}" language="css" title="custom-theme.css"></codeblock>
<div class="theme-demo custom">
<div class="demo-surface">
<h3>Custom Theme Preview</h3>
<p>This demonstrates overriding core tokens with brand colors.</p>
<button class="demo-button accent">Brand Action</button>
</div>
</div>



<h2>Dark &amp; Light Modes</h2>
<p class="section-description">
		Canon defaults to dark mode. Add light mode with a theme attribute.
	</p>
<codeblock code="{darkLightExample}" language="css" title="light-theme.css"></codeblock>
<div class="theme-comparison">
<div class="theme-demo dark">
<div class="demo-surface">
<span class="theme-label">Dark (default)</span>
<p>Primary content</p>
<p class="secondary">Secondary content</p>
</div>
</div>
<div class="theme-demo light">
<div class="demo-surface">
<span class="theme-label">Light</span>
<p>Primary content</p>
<p class="secondary">Secondary content</p>
</div>
</div>
</div>



<h2>System Preference</h2>
<p class="section-description">
		Respect user system preferences while allowing manual override.
	</p>
<codeblock code="{systemPreferenceExample}" language="css" title="system-preference.css"></codeblock>
<div class="note">
<strong>Implementation order:</strong>
<ol>
<li>Check localStorage for saved preference</li>
<li>Fall back to system preference</li>
<li>Default to dark mode if no preference</li>
</ol>
</div>



<h2>Spacing Scale</h2>
<p class="section-description">
		Canon uses the golden ratio (1.618) for spacing. Override for different rhythms.
	</p>
<codeblock code="{spacingScaleExample}" language="css" title="spacing-scale.css"></codeblock>
<div class="scale-comparison">
<div class="scale-demo golden">
<span class="scale-label">Golden Ratio (default)</span>
<div class="scale-bars">
<div class="bar xs"></div>
<div class="bar sm"></div>
<div class="bar md"></div>
<div class="bar lg"></div>
</div>
</div>
<div class="scale-demo linear">
<span class="scale-label">Linear 8px</span>
<div class="scale-bars">
<div class="bar xs"></div>
<div class="bar sm"></div>
<div class="bar md"></div>
<div class="bar lg"></div>
</div>
</div>
</div>



<h2>Typography Scale</h2>
<p class="section-description">
		Adjust the type scale for different content densities or brand requirements.
	</p>
<codeblock code="{typographyScaleExample}" language="css" title="typography-scale.css"></codeblock>
<div class="typography-demo">
<div class="type-sample default">
<span class="type-label">Default Scale</span>
<h2 class="sample-heading">Heading</h2>
<p class="sample-body">Body text sample</p>
</div>
<div class="type-sample compact">
<span class="type-label">Compact Scale</span>
<h2 class="sample-heading">Heading</h2>
<p class="sample-body">Body text sample</p>
</div>
</div>



<h2>Best Practices</h2>
<div class="practices-grid">
<div class="practice-card do">
<h3>Do</h3>
<ul>
<li>Override tokens at :root or [data-theme]</li>
<li>Maintain WCAG contrast ratios</li>
<li>Test both dark and light themes</li>
<li>Use semantic token names</li>
<li>Persist user preference</li>
<li>Provide theme toggle UI</li>
</ul>
</div>
<div class="practice-card dont">
<h3>Don't</h3>
<ul>
<li>Override tokens inline on components</li>
<li>Create new token naming schemes</li>
<li>Mix hardcoded values with tokens</li>
<li>Forget focus states in new themes</li>
<li>Ignore system preference</li>
<li>Change semantics (success should stay green)</li>
</ul>
</div>
</div>



<h2>Theme Checklist</h2>
<p class="section-description">
		Verify your custom theme maintains Canon's quality standards.
	</p>
<ul class="checklist">
<li>Primary text has 4.5:1 contrast ratio (WCAG AA)</li>
<li>Focus indicators are visible in all states</li>
<li>Semantic colors maintain their meaning</li>
<li>Interactive states are distinguishable</li>
<li>Theme persists across page loads</li>
<li>System preference is respected on first visit</li>
<li>Theme toggle is keyboard accessible</li>
<li>Reduced motion preferences still work</li>
</ul>

