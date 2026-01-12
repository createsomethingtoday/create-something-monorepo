---
category: "Canon"
section: "Guidelines"
title: "Responsive Design"
description: "Mobile-first responsive design patterns, breakpoints, and fluid typography for the Canon design system."
lead: "Design for the smallest screen first, then enhance. Canon's responsive
		approach ensures content works everywhere, from phones to large displays."
publishedAt: "2026-01-08"
published: true
---


<h2>Philosophy</h2>
<p>
		Mobile-first is not just a technique—it's a mindset. By starting with constraints,
		we identify what truly matters. What survives the smallest screen is essential;
		everything else is enhancement.
	</p>
<blockquote class="philosophy-quote">
		"The absence of limitations is the enemy of art."
		<cite>— Orson Welles</cite>
</blockquote>



<h2>Breakpoints</h2>
<p class="section-description">
		Canon uses five breakpoints aligned with common device widths. Always use
		<code>min-width</code> queries for mobile-first progressive enhancement.
	</p>
<div class="breakpoint-table-wrapper">
<table class="breakpoint-table">
<thead>
<tr>
<th>Breakpoint</th>
<th>Width</th>
<th>Typical Use</th>
<th>Columns</th>
</tr>
</thead>
<tbody>
				{#each breakpoints as bp}
					<tr>
<td><code>{bp.name}</code></td>
<td>{bp.width}</td>
<td>{bp.use}</td>
<td>{bp.columns}</td>
</tr>
				{/each}
			</tbody>
</table>
</div>
<codeblock code="{breakpointsExample}" language="css" title="breakpoints.css"></codeblock>



<h2>Mobile-First Pattern</h2>
<p class="section-description">
		Start with styles for the smallest screen, then add complexity
		as viewport size increases.
	</p>
<codeblock code="{mobileFirstExample}" language="css" title="mobile-first.css"></codeblock>
<div class="pattern-demo">
<div class="demo-card">
<div class="demo-icon"></div>
<div class="demo-content">
<div class="demo-title"></div>
<div class="demo-text"></div>
</div>
</div>
<p class="demo-label">Resize browser to see layout change</p>
</div>



<h2>Grid Patterns</h2>
<p class="section-description">
		CSS Grid enables powerful responsive layouts with minimal code.
	</p>
<codeblock code="{gridExample}" language="css" title="grids.css"></codeblock>
<div class="grid-demo">
<div class="grid-item"></div>
<div class="grid-item"></div>
<div class="grid-item"></div>
<div class="grid-item"></div>
<div class="grid-item"></div>
<div class="grid-item"></div>
</div>
<p class="demo-label">Fluid grid with auto-fit</p>



<h2>Fluid Typography</h2>
<p class="section-description">
		Canon's typography tokens use <code>clamp()</code> for smooth scaling
		between breakpoints—no media queries needed.
	</p>
<codeblock code="{typographyExample}" language="css" title="typography.css"></codeblock>
<div class="typography-demo">
<h2 class="fluid-heading">Heading scales smoothly</h2>
<p class="fluid-body">
			Body text maintains optimal line length regardless of viewport width.
			The 65-character limit ensures comfortable reading on any device.
		</p>
</div>



<h2>Containers</h2>
<p class="section-description">
		Containers center content and apply responsive horizontal padding.
	</p>
<codeblock code="{containerExample}" language="css" title="container.css"></codeblock>
<div class="container-demo">
<div class="container-box">
<span>max-width: 1200px</span>
</div>
</div>



<h2>Best Practices</h2>
<div class="practices-grid">
<div class="practice-card do">
<h3>Do</h3>
<ul>
<li>Start with mobile layout, enhance upward</li>
<li>Use relative units (rem, em, %) for sizing</li>
<li>Test on real devices, not just resized browser</li>
<li>Use fluid typography with clamp()</li>
<li>Set touch targets to at least 44x44px</li>
<li>Consider thumb zones for mobile interaction</li>
</ul>
</div>
<div class="practice-card dont">
<h3>Don't</h3>
<ul>
<li>Use max-width queries (desktop-first)</li>
<li>Hide content on mobile that exists on desktop</li>
<li>Rely on hover states for critical interactions</li>
<li>Use fixed pixel widths for containers</li>
<li>Assume landscape orientation</li>
<li>Ignore high-density displays</li>
</ul>
</div>
</div>



<h2>Touch Considerations</h2>
<p class="section-description">
		Mobile interfaces require special attention to touch interaction.
	</p>
<div class="touch-grid">
<div class="touch-card">
<h3>Target Size</h3>
<p>
				Minimum 44x44px for tap targets. Smaller targets cause
				frustration and errors on touch devices.
			</p>
<div class="target-demo">
<div class="target small">Too small</div>
<div class="target good">44px minimum</div>
</div>
</div>
<div class="touch-card">
<h3>Spacing</h3>
<p>
				Add adequate spacing between interactive elements to
				prevent accidental taps.
			</p>
<div class="spacing-demo">
<button class="spacing-btn">Action 1</button>
<button class="spacing-btn">Action 2</button>
</div>
</div>
<div class="touch-card">
<h3>Thumb Zone</h3>
<p>
				Place primary actions within easy thumb reach. The bottom
				of the screen is most accessible for one-handed use.
			</p>
<div class="thumb-demo">
<div class="phone-outline">
<div class="thumb-zone easy">Easy</div>
<div class="thumb-zone ok">Stretch</div>
<div class="thumb-zone hard">Hard</div>
</div>
</div>
</div>
</div>



<h2>Testing Checklist</h2>
<p class="section-description">
		Verify responsive behavior across devices and contexts.
	</p>
<ul class="checklist">
<li>Content readable at 320px width (iPhone SE)</li>
<li>No horizontal scrolling at any breakpoint</li>
<li>Touch targets at least 44x44px</li>
<li>Forms usable on mobile (appropriate keyboards)</li>
<li>Images scale without breaking layout</li>
<li>Text remains readable (16px minimum)</li>
<li>Contrast maintained in all lighting conditions</li>
<li>Landscape orientation works correctly</li>
<li>High-density displays show crisp graphics</li>
</ul>

