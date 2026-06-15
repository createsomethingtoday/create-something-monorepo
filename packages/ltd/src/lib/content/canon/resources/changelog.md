---
category: "Canon"
section: "Resources"
title: "Changelog"
description: "Version history and release notes for the Canon Design System"
lead: "A record of all notable changes to the Canon Design System.
			Following semantic versioning."
publishedAt: "2026-02-04"
published: true
---

<section class="release">
<div class="release-header">
<h2>v1.1.0</h2>
<time datetime="2026-02-04">February 4, 2026</time>
<span class="badge badge--new">Latest</span>
</div>
<p class="release-summary">
			WORKWAY alignment release. The Canon Design System is now synchronized with 
			WORKWAY's implementation, establishing a shared visual language across all 
			CREATE SOMETHING properties and the WORKWAY vertical.
		</p>
<h3>WORKWAY Alignment</h3>
<ul class="change-list">
<li class="change change--added">
<span class="change-type">Added</span>
				Infrastructure grid backgrounds (.bg-grid, .bg-grid-fade, .bg-grid-vignette)
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				WORKWAY-aligned button system with glass effects
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Interactive state utilities (.interactive, .pressable, .hover-lift)
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Scroll reveal animations (.reveal, .reveal-delay-*)
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Dim siblings pattern (.dim-siblings-on-hover)
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Skeleton loading animations
			</li>
</ul>
<h3>Glass Design System</h3>
<ul class="change-list">
<li class="change change--changed">
<span class="change-type">Changed</span>
				Glass utilities now match WORKWAY's Liquid Glass implementation
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Glass blur layer technique for button secondary variant
			</li>
</ul>
<h3>Notes</h3>
<p class="release-note">
			WORKWAY (the construction vertical) has advanced the shared Canon system with 
			Tailwind v4, shadcn/ui components, and MagicUI animations. This release begins 
			aligning CREATE SOMETHING properties (.agency first) with these updates. 
			Properties .io, .space, and .ltd will be migrated incrementally.
		</p>
<p class="release-note">
			<strong>Reference implementation:</strong> WORKWAY's <code>workway-platform/apps/web/src/styles.css</code>
			serves as the canonical source for new utility classes and patterns.
		</p>
</section>

<section class="release">
<div class="release-header">
<h2>v1.0.0</h2>
<time datetime="2024-12-27">December 27, 2024</time>
</div>
<p class="release-summary">
			Initial release of the Canon Design System. Foundations, components,
			patterns, and comprehensive documentation.
		</p>
<h3>Foundations</h3>
<ul class="change-list">
<li class="change change--added">
<span class="change-type">Added</span>
				Color tokens with WCAG AA compliance
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Typography scale using fluid sizing
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Spacing system based on golden ratio (φ = 1.618)
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Motion tokens with reduced-motion support
			</li>
</ul>
<h3>Components</h3>
<ul class="change-list">
<li class="change change--added">
<span class="change-type">Added</span>
				Button component with variants (primary, secondary, ghost, danger)
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Card component with header/footer slots
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				TextField with validation states
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				TextArea with auto-resize option
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Checkbox and Radio components
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Select dropdown
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Toggle switch
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Toast notifications
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Badge component
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Breadcrumb navigation
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Tabs component
			</li>
</ul>
<h3>Patterns</h3>
<ul class="change-list">
<li class="change change--added">
<span class="change-type">Added</span>
				FormLayout for form structure
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				FormValidation with error summary
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				MultiStepForm for wizard flows
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				EmptyState for zero-data scenarios
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				FirstTimeUser onboarding pattern
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				LoadingSkeleton and LoadingOverlay
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				InlineError and ErrorBoundary
			</li>
</ul>
<h3>Token Export</h3>
<ul class="change-list">
<li class="change change--added">
<span class="change-type">Added</span>
				CSS custom properties (tokens.css)
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				SCSS variables (tokens.scss)
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				W3C DTCG format (tokens.dtcg.json)
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Figma/Tokens Studio format (tokens.figma.json)
			</li>
</ul>
<h3>Documentation</h3>
<ul class="change-list">
<li class="change change--added">
<span class="change-type">Added</span>
				Interactive documentation site
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Component API reference pages
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Accessibility guidelines (WCAG 2.1 AA)
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Content writing guidelines
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Responsive design patterns
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Theming guide
			</li>
</ul>
</section>


<section class="versioning">
<h2>Versioning</h2>
<p>
			Canon follows <a href="https://semver.org" rel="noopener" target="_blank">Semantic Versioning</a>.
		</p>
<table class="spec-table">
<thead>
<tr>
<th>Version</th>
<th>Meaning</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>Major</strong> (1.x.x)</td>
<td>Breaking changes to component APIs or tokens</td>
</tr>
<tr>
<td><strong>Minor</strong> (x.1.x)</td>
<td>New features, backwards compatible</td>
</tr>
<tr>
<td><strong>Patch</strong> (x.x.1)</td>
<td>Bug fixes, documentation updates</td>
</tr>
</tbody>
</table>
</section>


<section class="legend">
<h2>Change Types</h2>
<div class="legend-grid">
<div class="legend-item">
<span class="change-type change-type--added">Added</span>
<span>New features</span>
</div>
<div class="legend-item">
<span class="change-type change-type--changed">Changed</span>
<span>Updates to existing features</span>
</div>
<div class="legend-item">
<span class="change-type change-type--deprecated">Deprecated</span>
<span>Features to be removed</span>
</div>
<div class="legend-item">
<span class="change-type change-type--removed">Removed</span>
<span>Deleted features</span>
</div>
<div class="legend-item">
<span class="change-type change-type--fixed">Fixed</span>
<span>Bug fixes</span>
</div>
<div class="legend-item">
<span class="change-type change-type--security">Security</span>
<span>Vulnerability fixes</span>
</div>
</div>
</section>
