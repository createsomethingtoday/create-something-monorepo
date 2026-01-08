---
category: "Canon"
section: "Guidelines"
title: "Accessibility"
description: "WCAG 2.1 AA accessibility guidelines for the Canon Design System"
lead: "Accessibility is not a feature—it's a foundation. Every component in Canon
			is built to WCAG 2.1 AA standards, ensuring all users can interact with
			your interfaces."
publishedAt: "2026-01-08"
published: true
---


<h2>Color Contrast</h2>
<p>
			All text in the Canon system meets WCAG AA contrast requirements.
			The minimum ratio is 4.5:1 for normal text and 3:1 for large text.
		</p>
<div class="contrast-grid">
<div class="contrast-item">
<div class="contrast-sample sample-primary">Aa</div>
<div class="contrast-details">
<span class="contrast-name">Primary Text</span>
<span class="contrast-ratio">21:1</span>
<code>--color-fg-primary</code>
</div>
</div>
<div class="contrast-item">
<div class="contrast-sample sample-secondary">Aa</div>
<div class="contrast-details">
<span class="contrast-name">Secondary Text</span>
<span class="contrast-ratio">13.7:1</span>
<code>--color-fg-secondary</code>
</div>
</div>
<div class="contrast-item">
<div class="contrast-sample sample-muted">Aa</div>
<div class="contrast-details">
<span class="contrast-name">Muted Text</span>
<span class="contrast-ratio">4.56:1</span>
<code>--color-fg-muted</code>
</div>
</div>
</div>
<div class="note">
<strong>Note:</strong> <code>--color-fg-subtle</code> (0.2 opacity) does not meet
			AA contrast and should only be used for decorative elements, never for
			informational content.
		</div>



<h2>Focus Management</h2>
<p>
			All interactive elements must have visible focus indicators. Canon uses
			a consistent focus ring system.
		</p>
<div class="code-block">
<pre><code>{`/* Standard focus pattern */
.interactive:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

/* High contrast mode enhancement */
@media (prefers-contrast: more) {
  .interactive:focus-visible {
    outline: 3px solid var(--color-focus);
    outline-offset: 3px;
  }
}`}</code></pre>
</div>
<h3>Focus Order</h3>
<ul class="guidelines-list">
<li>Focus order must follow visual reading order</li>
<li>Never use <code>tabindex</code> greater than 0</li>
<li>Modal dialogs must trap focus within the modal</li>
<li>Skip links should be provided for complex layouts</li>
</ul>



<h2>Semantic HTML</h2>
<p>
			Use the correct HTML elements for their intended purpose.
			Semantic markup provides meaning to assistive technologies.
		</p>
<div class="do-dont-grid">
<div class="do-item">
<span class="label do-label">Do</span>
<code>&lt;button&gt;Submit&lt;/button&gt;</code>
</div>
<div class="dont-item">
<span class="label dont-label">Don't</span>
<code>&lt;div onclick="..."&gt;Submit&lt;/div&gt;</code>
</div>
</div>
<div class="do-dont-grid">
<div class="do-item">
<span class="label do-label">Do</span>
<code>&lt;nav aria-label="Main"&gt;</code>
</div>
<div class="dont-item">
<span class="label dont-label">Don't</span>
<code>&lt;div class="nav"&gt;</code>
</div>
</div>
<h3>Landmark Regions</h3>
<ul class="guidelines-list">
<li><code>&lt;header&gt;</code> or <code>role="banner"</code> for page header</li>
<li><code>&lt;nav&gt;</code> or <code>role="navigation"</code> for navigation</li>
<li><code>&lt;main&gt;</code> or <code>role="main"</code> for main content</li>
<li><code>&lt;footer&gt;</code> or <code>role="contentinfo"</code> for page footer</li>
</ul>



<h2>ARIA Patterns</h2>
<p>
			Use ARIA attributes to enhance accessibility, but remember:
			<strong>no ARIA is better than bad ARIA</strong>.
		</p>
<h3>Live Regions</h3>
<p>
			Use live regions to announce dynamic content changes to screen readers.
		</p>
<div class="code-block">
<pre><code>{`<!-- For important updates -->
<div aria-live="polite" role="status">
  {statusMessage}
</div>

<!-- For urgent alerts -->
<div aria-live="assertive" role="alert">
  {errorMessage}
</div>`}</code></pre>
</div>
<h3>Common ARIA Patterns</h3>
<table class="spec-table">
<thead>
<tr>
<th>Pattern</th>
<th>Attributes</th>
<th>Use Case</th>
</tr>
</thead>
<tbody>
<tr>
<td>Disclosure</td>
<td><code>aria-expanded</code>, <code>aria-controls</code></td>
<td>Accordion, dropdown</td>
</tr>
<tr>
<td>Modal</td>
<td><code>role="dialog"</code>, <code>aria-modal</code></td>
<td>Dialog boxes</td>
</tr>
<tr>
<td>Tabs</td>
<td><code>role="tablist"</code>, <code>aria-selected</code></td>
<td>Tab interfaces</td>
</tr>
<tr>
<td>Loading</td>
<td><code>aria-busy</code>, <code>aria-describedby</code></td>
<td>Loading states</td>
</tr>
</tbody>
</table>



<h2>Reduced Motion</h2>
<p>
			Respect users who prefer reduced motion. All animations in Canon
			include reduced motion alternatives.
		</p>
<div class="code-block">
<pre><code>{`@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}`}</code></pre>
</div>
<div class="note">
<strong>Tip:</strong> Use <code>transition</code> instead of <code>animation</code>
			when possible—transitions are easier to disable and more performant.
		</div>



<h2>High Contrast Mode</h2>
<p>
			Canon supports <code>prefers-contrast: more</code> with enhanced
			visibility tokens.
		</p>
<table class="spec-table">
<thead>
<tr>
<th>Token</th>
<th>Standard</th>
<th>High Contrast</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>--color-fg-muted</code></td>
<td>0.46 opacity</td>
<td>0.75 opacity</td>
</tr>
<tr>
<td><code>--color-border-default</code></td>
<td>0.1 opacity</td>
<td>0.3 opacity</td>
</tr>
<tr>
<td><code>--color-focus</code></td>
<td>0.5 opacity</td>
<td>0.9 opacity</td>
</tr>
</tbody>
</table>



<h2>Checklist</h2>
<p>Use this checklist when building with Canon components.</p>
<div class="checklist">
<div class="checklist-category">
<h3>Perceivable</h3>
<ul>
<li>All images have descriptive alt text</li>
<li>Color is not the only way to convey information</li>
<li>Text contrast meets 4.5:1 minimum</li>
<li>Content is readable at 200% zoom</li>
</ul>
</div>
<div class="checklist-category">
<h3>Operable</h3>
<ul>
<li>All functionality available via keyboard</li>
<li>Focus indicators are visible</li>
<li>No keyboard traps exist</li>
<li>Users can pause/stop animations</li>
</ul>
</div>
<div class="checklist-category">
<h3>Understandable</h3>
<ul>
<li>Language is declared on the page</li>
<li>Navigation is consistent</li>
<li>Error messages are descriptive</li>
<li>Labels are associated with inputs</li>
</ul>
</div>
<div class="checklist-category">
<h3>Robust</h3>
<ul>
<li>Valid HTML structure</li>
<li>ARIA attributes used correctly</li>
<li>Works with assistive technologies</li>
<li>Tested with screen readers</li>
</ul>
</div>
</div>

