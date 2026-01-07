<script lang="ts">
	import CodeBlock from '$lib/canon/CodeBlock.svelte';
</script>

<!-- Page Header -->
<header class="page-header">
	<h1 class="page-title">Navigation</h1>
	<p class="page-description">
		Help users find their way around your site. Headers show where they are, sidebars reveal
		what's available, and breadcrumbs let them retrace their steps.
	</p>
</header>

<!-- Header Navigation Section -->
<section class="section">
	<h2 class="section-title">Header Navigation</h2>
	<p class="section-description">
		The bar at the top of every page. Add your logo, main links, and a login button or user menu.
	</p>

	<div class="example-group">
		<h3 class="example-title">Basic Header</h3>
		<p class="example-description">
			Works on mobile too—links collapse into a menu on smaller screens.
		</p>

		<div class="preview preview-nav">
			<nav class="demo-nav">
				<div class="demo-nav-container">
					<a href="#" class="demo-nav-logo">
						CREATE
						<span class="demo-nav-logo-suffix">.something</span>
					</a>
					<div class="demo-nav-links">
						<a href="#" class="demo-nav-link active">Home</a>
						<a href="#" class="demo-nav-link">About</a>
						<a href="#" class="demo-nav-link">Contact</a>
					</div>
				</div>
			</nav>
		</div>

		<CodeBlock
			code={`<script lang="ts">
  import { Navigation } from '@create-something/components';

  const links = [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' }
  ];
</script>

<Navigation
  logo="CREATE"
  logoSuffix=".something"
  {links}
  currentPath={$page.url.pathname}
/>`}
			language="svelte"
		/>
	</div>

	<div class="example-group">
		<h3 class="example-title">With CTA and User Menu</h3>
		<p class="example-description">
			Add an "Upgrade" button or user avatar for logged-in visitors.
		</p>

		<div class="preview preview-nav">
			<nav class="demo-nav">
				<div class="demo-nav-container">
					<a href="#" class="demo-nav-logo">App</a>
					<div class="demo-nav-links">
						<a href="#" class="demo-nav-link">Dashboard</a>
						<a href="#" class="demo-nav-link">Settings</a>
						<a href="#" class="demo-nav-cta">Upgrade</a>
						<div class="demo-user-menu">
							<div class="demo-user-avatar">MJ</div>
						</div>
					</div>
				</div>
			</nav>
		</div>

		<CodeBlock
			code={`<Navigation
  logo="App"
  links={[
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Settings', href: '/settings' }
  ]}
  ctaLabel="Upgrade"
  ctaHref="/pricing"
  user={{ email: 'user@example.com', id: '123' }}
  onLogout={() => signOut()}
/>`}
			language="svelte"
		/>
	</div>
</section>

<!-- Sidebar Navigation Section -->
<section class="section">
	<h2 class="section-title">Sidebar Navigation</h2>
	<p class="section-description">
		Best for docs, dashboards, and apps with lots of pages. Group links into sections so users
		can scan quickly.
	</p>

	<div class="example-group">
		<h3 class="example-title">Documentation Sidebar</h3>
		<p class="example-description">
			Sections expand to show nested pages. The current page is highlighted automatically.
		</p>

		<div class="preview preview-sidebar">
			<aside class="demo-sidebar">
				<div class="demo-sidebar-header">
					<span class="demo-sidebar-logo">Canon</span>
					<span class="demo-sidebar-suffix">Design System</span>
				</div>
				<nav class="demo-sidebar-nav">
					<div class="demo-nav-section">
						<h3 class="demo-nav-section-title">Getting Started</h3>
						<ul class="demo-nav-list">
							<li><a href="#" class="demo-sidebar-link active">Introduction</a></li>
							<li><a href="#" class="demo-sidebar-link">Philosophy</a></li>
							<li><a href="#" class="demo-sidebar-link">Quick Start</a></li>
						</ul>
					</div>
					<div class="demo-nav-section">
						<h3 class="demo-nav-section-title">Components</h3>
						<ul class="demo-nav-list">
							<li><a href="#" class="demo-sidebar-link">Button</a></li>
							<li><a href="#" class="demo-sidebar-link">Card</a></li>
							<li><a href="#" class="demo-sidebar-link">Navigation</a></li>
						</ul>
					</div>
				</nav>
			</aside>
		</div>

		<CodeBlock
			code={`<script lang="ts">
  import { page } from '$app/stores';

  interface NavSection {
    title: string;
    items: { label: string; href: string; badge?: string }[];
  }

  const navigation: NavSection[] = [
    {
      title: 'Getting Started',
      items: [
        { label: 'Introduction', href: '/docs' },
        { label: 'Philosophy', href: '/docs/philosophy' },
        { label: 'Quick Start', href: '/docs/quick-start' }
      ]
    }
  ];
</script>

<aside class="sidebar">
  <nav aria-label="Documentation">
    {#each navigation as section}
      <div class="nav-section">
        <h3 class="nav-section-title">{section.title}</h3>
        <ul>
          {#each section.items as item}
            <li>
              <a
                href={item.href}
                class:active={$page.url.pathname === item.href}
              >
                {item.label}
              </a>
            </li>
          {/each}
        </ul>
      </div>
    {/each}
  </nav>
</aside>`}
			language="svelte"
		/>
	</div>
</section>

<!-- Breadcrumbs Section -->
<section class="section">
	<h2 class="section-title">Breadcrumbs</h2>
	<p class="section-description">
		Show users where they are and let them jump back to parent pages with one click.
	</p>

	<div class="example-group">
		<h3 class="example-title">Basic Breadcrumbs</h3>
		<p class="example-description">
			Each step is clickable except the current page.
		</p>

		<div class="preview">
			<nav class="demo-breadcrumbs" aria-label="Breadcrumb">
				<ol class="demo-breadcrumbs-list">
					<li class="demo-breadcrumbs-item">
						<a href="#" class="demo-breadcrumbs-link">Home</a>
						<span class="demo-breadcrumbs-separator">/</span>
					</li>
					<li class="demo-breadcrumbs-item">
						<a href="#" class="demo-breadcrumbs-link">Components</a>
						<span class="demo-breadcrumbs-separator">/</span>
					</li>
					<li class="demo-breadcrumbs-item">
						<span class="demo-breadcrumbs-current">Navigation</span>
					</li>
				</ol>
			</nav>
		</div>

		<CodeBlock
			code={`<script lang="ts">
  import { Breadcrumbs } from '@create-something/components';

  const items = [
    { label: 'Home', href: '/' },
    { label: 'Components', href: '/components' },
    { label: 'Navigation' } // No href = current page
  ];
</script>

<Breadcrumbs {items} />`}
			language="svelte"
		/>
	</div>

	<div class="example-group">
		<h3 class="example-title">With Home Icon</h3>
		<p class="example-description">
			Save space by using an icon instead of "Home" text.
		</p>

		<div class="preview">
			<nav class="demo-breadcrumbs" aria-label="Breadcrumb">
				<ol class="demo-breadcrumbs-list">
					<li class="demo-breadcrumbs-item">
						<a href="#" class="demo-breadcrumbs-link">
							<svg class="demo-home-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
								<polyline points="9 22 9 12 15 12 15 22" />
							</svg>
						</a>
						<span class="demo-breadcrumbs-separator">/</span>
					</li>
					<li class="demo-breadcrumbs-item">
						<a href="#" class="demo-breadcrumbs-link">Products</a>
						<span class="demo-breadcrumbs-separator">/</span>
					</li>
					<li class="demo-breadcrumbs-item">
						<span class="demo-breadcrumbs-current">Widget Pro</span>
					</li>
				</ol>
			</nav>
		</div>

		<CodeBlock
			code={`<Breadcrumbs
  items={[
    { label: 'Home', href: '/' },
    { label: 'Products', href: '/products' },
    { label: 'Widget Pro' }
  ]}
  showHomeIcon={true}
/>`}
			language="svelte"
		/>
	</div>
</section>

<!-- Tabs Section -->
<section class="section">
	<h2 class="section-title">Tabs</h2>
	<p class="section-description">
		Tabs organize content into separate views where only one is visible at a time. Full keyboard
		navigation with arrow keys.
	</p>

	<div class="example-group">
		<h3 class="example-title">Default Tabs</h3>
		<p class="example-description">
			Underline indicator shows the active tab. Use arrow keys to navigate.
		</p>

		<div class="preview">
			<div class="demo-tabs">
				<div class="demo-tabs-list" role="tablist">
					<button class="demo-tab active" role="tab" aria-selected="true">Overview</button>
					<button class="demo-tab" role="tab" aria-selected="false">Features</button>
					<button class="demo-tab" role="tab" aria-selected="false">Pricing</button>
				</div>
				<div class="demo-tab-panel">
					<p>Tab panel content appears here.</p>
				</div>
			</div>
		</div>

		<CodeBlock
			code={`<script lang="ts">
  import { Tabs } from '@create-something/components';

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'features', label: 'Features' },
    { id: 'pricing', label: 'Pricing' }
  ];

  let activeTab = 'overview';
</script>

<Tabs {tabs} bind:activeTab>
  {#snippet children(tabId)}
    {#if tabId === 'overview'}
      <p>Overview content here.</p>
    {:else if tabId === 'features'}
      <p>Features content here.</p>
    {:else}
      <p>Pricing content here.</p>
    {/if}
  {/snippet}
</Tabs>`}
			language="svelte"
		/>
	</div>

	<div class="example-group">
		<h3 class="example-title">Pills Variant</h3>
		<p class="example-description">
			Pill-shaped tabs with elevated active state.
		</p>

		<div class="preview">
			<div class="demo-tabs demo-tabs-pills">
				<div class="demo-tabs-list-pills" role="tablist">
					<button class="demo-tab-pill active" role="tab" aria-selected="true">All</button>
					<button class="demo-tab-pill" role="tab" aria-selected="false">Active</button>
					<button class="demo-tab-pill" role="tab" aria-selected="false">Archived</button>
				</div>
			</div>
		</div>

		<CodeBlock
			code={`<Tabs
  tabs={[
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'archived', label: 'Archived' }
  ]}
  variant="pills"
>
  <!-- content -->
</Tabs>`}
			language="svelte"
		/>
	</div>
</section>

<!-- Mobile Navigation Section -->
<section class="section">
	<h2 class="section-title">Mobile Navigation</h2>
	<p class="section-description">
		Mobile navigation patterns ensure touch-friendly interaction with 44px minimum touch targets.
	</p>

	<div class="example-group">
		<h3 class="example-title">Mobile Menu Button</h3>
		<p class="example-description">
			Hamburger icon toggles to close icon when open. Slide-down animation respects reduced motion.
		</p>

		<div class="preview">
			<div class="demo-mobile-menu">
				<button class="demo-menu-button" aria-label="Open menu" aria-expanded="false">
					<svg class="demo-menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
					</svg>
				</button>
			</div>
		</div>

		<CodeBlock
			code={`<button
  onclick={toggleMobileMenu}
  class="nav-menu-button"
  aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
  aria-expanded={mobileMenuOpen}
>
  {#if mobileMenuOpen}
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M6 18L18 6M6 6l12 12" />
    </svg>
  {:else}
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  {/if}
</button>

<style>
  .nav-menu-button {
    width: 44px;
    height: 44px; /* WCAG minimum touch target */
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>`}
			language="svelte"
		/>
	</div>

	<div class="example-group">
		<h3 class="example-title">Drawer Navigation</h3>
		<p class="example-description">
			Full-height drawer slides in from the left with overlay backdrop.
		</p>

		<CodeBlock
			code={`<script lang="ts">
  import { Drawer } from '@create-something/components';

  let open = $state(false);
</script>

<Drawer bind:open position="left">
  <nav class="drawer-nav">
    <a href="/">Home</a>
    <a href="/about">About</a>
    <a href="/contact">Contact</a>
  </nav>
</Drawer>

<style>
  .drawer-nav {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    padding: var(--space-lg);
  }
</style>`}
			language="svelte"
		/>
	</div>
</section>

<!-- Motion Tokens Section -->
<section class="section">
	<h2 class="section-title">Motion Tokens</h2>
	<p class="section-description">
		All navigation transitions use Canon motion tokens for consistent, purposeful animation.
	</p>

	<div class="motion-demo">
		<div class="motion-item">
			<h4>Link Hover</h4>
			<code>transition: color var(--duration-micro) var(--ease-standard);</code>
			<p>200ms color transition for link hover states.</p>
		</div>

		<div class="motion-item">
			<h4>Mobile Menu</h4>
			<code>animation: slide-down 0.2s cubic-bezier(0.4, 0, 0.2, 1);</code>
			<p>Slide-down animation when menu opens.</p>
		</div>

		<div class="motion-item">
			<h4>Sidebar Transform</h4>
			<code>transition: transform var(--duration-standard) var(--ease-standard);</code>
			<p>300ms transform for sidebar show/hide.</p>
		</div>
	</div>

	<CodeBlock
		title="Reduced motion support"
		code={`@media (prefers-reduced-motion: reduce) {
  .animate-slide-down {
    animation: none;
  }

  .sidebar {
    transition: none;
  }

  .nav-link {
    transition: none;
  }
}`}
		language="css"
	/>
</section>

<!-- Accessibility Section -->
<section class="section">
	<h2 class="section-title">Accessibility</h2>
	<p class="section-description">
		Navigation components follow WAI-ARIA patterns for keyboard and screen reader accessibility.
	</p>

	<div class="accessibility-grid">
		<div class="a11y-item">
			<h4>Semantic Markup</h4>
			<ul>
				<li>Use <code>&lt;nav&gt;</code> with <code>aria-label</code></li>
				<li>Breadcrumbs use <code>&lt;ol&gt;</code> for ordered lists</li>
				<li>Tabs use proper <code>role="tablist"</code> pattern</li>
			</ul>
		</div>

		<div class="a11y-item">
			<h4>Keyboard Navigation</h4>
			<ul>
				<li>Tab key navigates between interactive elements</li>
				<li>Arrow keys navigate within tab groups</li>
				<li>Escape key closes mobile menus</li>
			</ul>
		</div>

		<div class="a11y-item">
			<h4>ARIA States</h4>
			<ul>
				<li><code>aria-current="page"</code> for current link</li>
				<li><code>aria-expanded</code> for collapsible menus</li>
				<li><code>aria-selected</code> for tab selection</li>
			</ul>
		</div>

		<div class="a11y-item">
			<h4>Focus Management</h4>
			<ul>
				<li>Visible focus indicators with <code>--color-focus</code></li>
				<li>Focus trap within mobile drawers</li>
				<li>Skip-to-content link at page top</li>
			</ul>
		</div>
	</div>
</section>

<!-- Token Reference -->
<section class="section">
	<h2 class="section-title">Token Reference</h2>
	<p class="section-description">Navigation components use these Canon design tokens.</p>

	<div class="token-table">
		<div class="token-row">
			<code>--duration-micro</code>
			<span>200ms - Link hover transitions</span>
		</div>
		<div class="token-row">
			<code>--duration-standard</code>
			<span>300ms - Menu and sidebar transitions</span>
		</div>
		<div class="token-row">
			<code>--ease-standard</code>
			<span>cubic-bezier(0.4, 0.0, 0.2, 1) - All navigation motion</span>
		</div>
		<div class="token-row">
			<code>--color-fg-secondary</code>
			<span>rgba(255, 255, 255, 0.8) - Default link color</span>
		</div>
		<div class="token-row">
			<code>--color-fg-muted</code>
			<span>rgba(255, 255, 255, 0.46) - Inactive link color</span>
		</div>
		<div class="token-row">
			<code>--color-hover</code>
			<span>rgba(255, 255, 255, 0.05) - Hover background</span>
		</div>
		<div class="token-row">
			<code>--color-active</code>
			<span>rgba(255, 255, 255, 0.1) - Active background</span>
		</div>
		<div class="token-row">
			<code>--color-focus</code>
			<span>rgba(255, 255, 255, 0.5) - Focus ring color</span>
		</div>
		<div class="token-row">
			<code>--z-fixed</code>
			<span>50 - Fixed header z-index</span>
		</div>
		<div class="token-row">
			<code>--z-modal</code>
			<span>100 - Mobile overlay z-index</span>
		</div>
	</div>
</section>

<style>
	/* Page Header */
	.page-header {
		margin-bottom: var(--space-2xl);
		padding-bottom: var(--space-xl);
		border-bottom: 1px solid var(--color-border-default);
	}

	.page-title {
		font-size: var(--text-display);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
		letter-spacing: var(--tracking-tight);
	}

	.page-description {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		max-width: 700px;
		margin: 0;
	}

	/* Sections */
	.section {
		margin-bottom: var(--space-2xl);
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.section-description {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-lg);
		line-height: var(--leading-relaxed);
	}

	/* Example Groups */
	.example-group {
		margin-bottom: var(--space-xl);
	}

	.example-title {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.example-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-md);
	}

	/* Preview Area */
	.preview {
		padding: var(--space-xl);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		margin-bottom: var(--space-md);
	}

	.preview-nav {
		padding: 0;
		overflow: hidden;
	}

	.preview-sidebar {
		padding: 0;
		height: 300px;
		overflow: hidden;
	}

	/* Demo Navigation */
	.demo-nav {
		background: var(--color-bg-pure);
		border-bottom: 1px solid var(--color-border-default);
	}

	.demo-nav-container {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-md) var(--space-lg);
	}

	.demo-nav-logo {
		font-size: 1.25rem;
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		text-decoration: none;
	}

	.demo-nav-logo-suffix {
		font-weight: var(--font-regular);
		color: var(--color-fg-tertiary);
	}

	.demo-nav-links {
		display: flex;
		align-items: center;
		gap: var(--space-lg);
	}

	.demo-nav-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.demo-nav-link:hover,
	.demo-nav-link.active {
		color: var(--color-fg-primary);
	}

	.demo-nav-cta {
		padding: var(--space-xs) var(--space-md);
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		border-radius: var(--radius-full);
		text-decoration: none;
	}

	.demo-user-menu {
		display: flex;
		align-items: center;
	}

	.demo-user-avatar {
		width: 32px;
		height: 32px;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-full);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	/* Demo Sidebar */
	.demo-sidebar {
		width: 100%;
		height: 100%;
		background: var(--color-bg-elevated);
		border-right: 1px solid var(--color-border-default);
		display: flex;
		flex-direction: column;
	}

	.demo-sidebar-header {
		display: flex;
		flex-direction: column;
		padding: var(--space-md);
		border-bottom: 1px solid var(--color-border-default);
	}

	.demo-sidebar-logo {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.demo-sidebar-suffix {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wider);
	}

	.demo-sidebar-nav {
		flex: 1;
		padding: var(--space-md);
		overflow-y: auto;
	}

	.demo-nav-section {
		margin-bottom: var(--space-lg);
	}

	.demo-nav-section-title {
		font-size: var(--text-caption);
		font-weight: var(--font-semibold);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wider);
		margin-bottom: var(--space-xs);
		padding: 0 var(--space-xs);
	}

	.demo-nav-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.demo-sidebar-link {
		display: block;
		padding: var(--space-xs);
		border-radius: var(--radius-md);
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.demo-sidebar-link:hover {
		background: var(--color-hover);
		color: var(--color-fg-primary);
	}

	.demo-sidebar-link.active {
		background: var(--color-active);
		color: var(--color-fg-primary);
		font-weight: var(--font-medium);
	}

	/* Demo Breadcrumbs */
	.demo-breadcrumbs {
		font-size: var(--text-body-sm);
	}

	.demo-breadcrumbs-list {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-xs);
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.demo-breadcrumbs-item {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.demo-breadcrumbs-link {
		color: var(--color-fg-muted);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
		display: flex;
		align-items: center;
	}

	.demo-breadcrumbs-link:hover {
		color: var(--color-fg-primary);
	}

	.demo-home-icon {
		width: 16px;
		height: 16px;
	}

	.demo-breadcrumbs-current {
		color: var(--color-fg-primary);
		font-weight: var(--font-medium);
	}

	.demo-breadcrumbs-separator {
		color: var(--color-fg-subtle);
	}

	/* Demo Tabs */
	.demo-tabs {
		width: 100%;
	}

	.demo-tabs-list {
		display: flex;
		gap: 2px;
		border-bottom: 1px solid var(--color-border-default);
	}

	.demo-tab {
		position: relative;
		padding: var(--space-sm) var(--space-md);
		background: none;
		border: none;
		color: var(--color-fg-muted);
		font-size: var(--text-body);
		font-weight: var(--font-medium);
		cursor: pointer;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.demo-tab:hover {
		color: var(--color-fg-primary);
	}

	.demo-tab.active {
		color: var(--color-fg-primary);
	}

	.demo-tab::after {
		content: '';
		position: absolute;
		bottom: -1px;
		left: 0;
		right: 0;
		height: 2px;
		background: transparent;
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.demo-tab.active::after {
		background: var(--color-fg-primary);
	}

	.demo-tab-panel {
		padding: var(--space-md) 0;
		color: var(--color-fg-secondary);
	}

	/* Pills variant */
	.demo-tabs-list-pills {
		display: flex;
		gap: var(--space-xs);
		background: var(--color-bg-subtle);
		padding: 4px;
		border-radius: var(--radius-md);
		width: fit-content;
	}

	.demo-tab-pill {
		padding: var(--space-xs) var(--space-sm);
		background: none;
		border: none;
		border-radius: var(--radius-sm);
		color: var(--color-fg-muted);
		font-size: var(--text-body);
		font-weight: var(--font-medium);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.demo-tab-pill:hover {
		color: var(--color-fg-primary);
	}

	.demo-tab-pill.active {
		background: var(--color-bg-elevated);
		color: var(--color-fg-primary);
		box-shadow: var(--shadow-sm);
	}

	/* Demo Mobile Menu */
	.demo-mobile-menu {
		display: flex;
		justify-content: center;
	}

	.demo-menu-button {
		width: 44px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.demo-menu-button:hover {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
	}

	.demo-menu-icon {
		width: 24px;
		height: 24px;
	}

	/* Motion Demo */
	.motion-demo {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: var(--space-md);
		margin-bottom: var(--space-lg);
	}

	.motion-item {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.motion-item h4 {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.motion-item code {
		display: block;
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		background: var(--color-bg-subtle);
		padding: var(--space-xs);
		border-radius: var(--radius-sm);
		margin: var(--space-xs) 0;
		word-break: break-all;
	}

	.motion-item p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin: 0;
	}

	/* Accessibility Grid */
	.accessibility-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: var(--space-md);
		margin-bottom: var(--space-lg);
	}

	.a11y-item {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.a11y-item h4 {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.a11y-item ul {
		margin: 0;
		padding-left: var(--space-md);
	}

	.a11y-item li {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xs);
	}

	.a11y-item li:last-child {
		margin-bottom: 0;
	}

	.a11y-item code {
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		background: var(--color-bg-subtle);
		padding: 2px 4px;
		border-radius: var(--radius-sm);
	}

	/* Token Table */
	.token-table {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.token-row {
		display: grid;
		grid-template-columns: 1fr 2fr;
		gap: var(--space-md);
		padding: var(--space-md);
		border-bottom: 1px solid var(--color-border-default);
	}

	.token-row:last-child {
		border-bottom: none;
	}

	.token-row code {
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		font-weight: var(--font-medium);
	}

	.token-row span {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	/* Reduced motion support */
	@media (prefers-reduced-motion: reduce) {
		.demo-nav-link,
		.demo-sidebar-link,
		.demo-breadcrumbs-link,
		.demo-tab,
		.demo-tab-pill,
		.demo-menu-button {
			transition: none;
		}
	}
</style>
