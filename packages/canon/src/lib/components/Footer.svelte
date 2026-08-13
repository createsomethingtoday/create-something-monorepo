<script lang="ts">
  import { onMount } from 'svelte';
  import { CubeMark } from '../brand/marks/index.js';
  import { getAnalytics } from '../analytics/client.js';
  import MeridianOfferPanel from './meridian/MeridianOfferPanel.svelte';

  interface QuickLink {
    label: string;
    href: string;
  }

  interface QuickLinkGroup {
    title: string;
    ariaLabel?: string;
    links: QuickLink[];
  }

  interface FooterCta {
    title?: string;
    label: string;
    href: string;
    description?: string;
    media?: {
      src: string;
      alt: string;
    };
  }

  interface FooterBrandAsset {
    src: string;
    /** Used for the linked home destination; the image itself is decorative there. */
    label: string;
  }

  type FooterVisualStyle = 'classic' | 'performance' | 'clear' | 'editorial';

  interface Props {
    mode?: 'ltd' | 'io' | 'space' | 'agency' | 'learn';
    aboutText?: string;
    showNewsletter?: boolean;
    newsletterTitle?: string;
    newsletterDescription?: string;
    newsletterSubmitLabel?: string;
    newsletterPendingLabel?: string;
    quickLinks?: QuickLink[];
    quickLinkGroups?: QuickLinkGroup[];
    footerCta?: FooterCta;
    showRamsQuote?: boolean;
    copyrightText?: string;
    showSocial?: boolean;
    turnstileSiteKey?: string;
    isAuthenticated?: boolean;
    /** Visual treatment. Defaults preserve existing property footers. */
    visualStyle?: FooterVisualStyle;
    /** Property-owned vector lockup for editorial footer treatments. */
    brandAsset?: FooterBrandAsset;
  }

  interface NewsletterApiResponse {
    success: boolean;
    message: string;
  }

  let {
    mode = 'ltd',
    aboutText,
    showNewsletter = false,
    newsletterTitle = 'Stay updated with new experiments',
    newsletterDescription = 'Get notified when new research is published. Real metrics, tracked experiments, honest learnings.',
    newsletterSubmitLabel = 'Get the note',
    newsletterPendingLabel = 'Sending request...',
    quickLinks = [],
    quickLinkGroups = [],
    footerCta,
    showRamsQuote = false,
    copyrightText,
    showSocial = false,
    turnstileSiteKey = '',
    isAuthenticated = false,
    visualStyle = 'classic',
    brandAsset
  }: Props = $props();

  // Map mode to target for cross-domain SSO
  const modeToTarget: Record<string, string> = {
    ltd: 'ltd',
    io: 'io',
    space: 'space',
    agency: 'agency',
    learn: 'lms'
  };

  let email = $state('');
  let honeypot = $state(''); // Hidden field - bots fill this
  let isSubmitting = $state(false);
  let message = $state<{ type: 'success' | 'error'; text: string } | null>(null);
  let turnstileToken = $state('');
  let turnstileWidgetId: string | null = null;
  let turnstileContainer = $state<HTMLDivElement>();

  // Load Turnstile script and render widget
  onMount(() => {
    if (!showNewsletter || !turnstileSiteKey) return;

    // Check if script already loaded
    if ((window as any).turnstile) {
      renderTurnstile();
      return;
    }

    // Load Turnstile script
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad';
    script.async = true;
    script.defer = true;

    // Set up callback
    (window as any).onTurnstileLoad = () => {
      renderTurnstile();
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (turnstileWidgetId && (window as any).turnstile) {
        (window as any).turnstile.remove(turnstileWidgetId);
      }
    };
  });

  function renderTurnstile() {
    if (!turnstileContainer || !(window as any).turnstile || !turnstileSiteKey) return;

    turnstileWidgetId = (window as any).turnstile.render(turnstileContainer, {
      sitekey: turnstileSiteKey,
      callback: (token: string) => {
        turnstileToken = token;
      },
      'expired-callback': () => {
        turnstileToken = '';
      },
      'error-callback': () => {
        turnstileToken = '';
      },
      theme: 'dark',
      size: 'flexible'
    });
  }

  async function handleNewsletterSubmit(e: Event) {
    e.preventDefault();

    if (isSubmitting) return;

    // Honeypot check - if filled, silently "succeed" but don't submit
    if (honeypot) {
      message = { type: 'success', text: 'Thanks for subscribing!' };
      email = '';
      return;
    }

    // Turnstile check
    if (turnstileSiteKey && !turnstileToken) {
      message = { type: 'error', text: 'Please complete the verification.' };
      return;
    }

    isSubmitting = true;
    message = null;

    try {
      const analytics = getAnalytics();
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          turnstileToken: turnstileToken || undefined,
          source: mode,
          sessionId: analytics?.getSessionId(),
          sourceProperty: analytics?.getSourceProperty() ?? undefined,
          landingUrl: typeof window !== 'undefined' ? window.location.href : undefined,
          referrer: typeof document !== 'undefined' ? document.referrer : undefined
        })
      });

      const data: NewsletterApiResponse = await response.json();

      if (data.success) {
        message = { type: 'success', text: data.message };
        analytics?.conversion('newsletter_requested', {
          source: mode,
          surface: 'footer_newsletter'
        });
        email = '';
        // Reset Turnstile for next submission
        if ((window as any).turnstile && turnstileWidgetId) {
          (window as any).turnstile.reset(turnstileWidgetId);
          turnstileToken = '';
        }
      } else {
        message = { type: 'error', text: data.message };
      }
    } catch (error) {
      message = {
        type: 'error',
        text: 'Something went wrong. Please try again.'
      };
    } finally {
      isSubmitting = false;
    }
  }

  const currentYear = new Date().getFullYear();
  const usesPerformanceStyle = $derived(
    visualStyle === 'performance' || visualStyle === 'clear' || visualStyle === 'editorial'
  );
  const usesEditorialStyle = $derived(visualStyle === 'editorial');
  const defaultCopyright = `© ${currentYear} Create Something. The canon for "less, but better."`;
  const footerLinkGroups = $derived(
    quickLinkGroups.length > 0
      ? quickLinkGroups
      : quickLinks.length > 0
        ? [{ title: 'Quick Links', ariaLabel: 'Quick links', links: quickLinks }]
        : []
  );
  const propertyDirectoryTitle = $derived(
    usesPerformanceStyle ? 'CREATE SOMETHING' : 'Modes of Being'
  );

  // Cross-property transition handler
  function handleCrossPropertyClick(
    e: MouseEvent,
    targetMode: 'ltd' | 'io' | 'space' | 'agency' | 'learn'
  ) {
    // Don't animate if staying on same property
    if (targetMode === mode) return;

    e.preventDefault();
    const originalHref = (e.currentTarget as HTMLAnchorElement).href;

    // Store transition data for entry animation on target page
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('cs-transition-from', mode);
      sessionStorage.setItem('cs-transition-to', targetMode);
      sessionStorage.setItem('cs-transition-time', Date.now().toString());
    }

    // Trigger exit animation
    document.body.classList.add('transitioning-out');

    // Determine the navigation URL
    let href = originalHref;
    if (isAuthenticated) {
      // Use cross-domain SSO flow when authenticated
      const target = modeToTarget[targetMode];
      if (target) {
        href = `/api/auth/cross-domain?target=${target}&redirect=/`;
      }
    }

    // Navigate after animation completes
    setTimeout(() => {
      window.location.href = href;
    }, 300);
  }
</script>

<footer
  class="footer"
  class:footer-clear={usesPerformanceStyle}
  class:footer-performance={usesPerformanceStyle}
  class:footer-editorial={usesEditorialStyle}
>
  <!-- Newsletter Section (Optional) -->
  {#if showNewsletter}
    <section id="newsletter" class="py-20 px-6">
      <div class="max-w-4xl mx-auto">
        <div class="text-center">
          <h2 class="newsletter-title mb-4">
            {newsletterTitle}
          </h2>
          <p class="newsletter-description mb-8 max-w-2xl mx-auto">
            {newsletterDescription}
          </p>

          <form onsubmit={handleNewsletterSubmit} class="max-w-lg mx-auto">
            <!-- Honeypot field - hidden from users, bots fill it -->
            <input
              type="text"
              bind:value={honeypot}
              name="website"
              autocomplete="off"
              tabindex="-1"
              class="honeypot"
            />

            <div class="flex flex-col sm:flex-row gap-3">
              <label for="newsletter-email" class="sr-only">Email address</label>
              <input
                id="newsletter-email"
                type="email"
                bind:value={email}
                placeholder="Enter your email address"
                class="newsletter-input flex-1 px-6 py-4"
                required
                aria-required="true"
                aria-invalid={message?.type === 'error'}
                aria-describedby={message ? 'newsletter-message' : undefined}
                disabled={isSubmitting}
              />
              <button
                type="submit"
                disabled={isSubmitting}
                class="newsletter-button group px-8 py-4 flex items-center justify-center gap-2"
              >
                <span>{isSubmitting ? newsletterPendingLabel : newsletterSubmitLabel}</span>
                {#if !isSubmitting}
                  <svg
                    class="w-4 h-4 transition-transform group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    stroke-width="2"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                {/if}
              </button>
            </div>

            <!-- Turnstile widget container -->
            {#if turnstileSiteKey}
              <div bind:this={turnstileContainer} class="turnstile-container mt-4"></div>
            {/if}

            {#if message}
              <div
                id="newsletter-message"
                class="mt-4 p-4 message-{message.type}"
                role="alert"
                aria-live="polite"
              >
                {message.text}
              </div>
            {/if}
          </form>
        </div>
      </div>
    </section>
  {/if}

  {#if usesEditorialStyle && footerCta}
    <MeridianOfferPanel
      eyebrow="Next possession"
      title={footerCta.title ?? footerCta.label}
      description={footerCta.description}
      actionLabel={footerCta.label}
      actionHref={footerCta.href}
      media={footerCta.media}
      {mode}
      headingId="footer-editorial-callout-title"
    />
  {/if}

  {#if usesEditorialStyle}
    {#if brandAsset}
      <a
        href="/"
        class="footer-editorial-identity footer-editorial-identity--link"
        aria-label={`${brandAsset.label} home`}
      >
        <img class="footer-editorial-identity__asset" src={brandAsset.src} alt="" />
        <p>Operating systems for work that has to hold up.</p>
      </a>
    {:else}
      <a
        href="/"
        class="footer-editorial-identity footer-editorial-identity--link"
        aria-label={`CREATE SOMETHING .${mode} home`}
      >
        <div>
          <span>CREATE</span>
          <span>SOMETHING</span>
        </div>
        <p>Operating systems for work that has to hold up.</p>
      </a>
    {/if}
  {/if}

  <!-- Footer Links -->
  <div class="footer-links py-12 px-6" class:with-newsletter={showNewsletter}>
    <div class="footer-inner shell-inner">
      <div class="footer-links-grid">
        <!-- About / Brand Column -->
        <div class="footer-brand-column">
          {#if usesPerformanceStyle && !usesEditorialStyle}
            <a
              href="/"
              class="footer-mark"
              class:footer-mark--asset={!!brandAsset}
              aria-label={`${brandAsset?.label ?? 'CREATE SOMETHING'} home`}
            >
              {#if brandAsset}
                <img class="footer-mark__asset" src={brandAsset.src} alt="" />
              {:else}
                <CubeMark size={44} variant="mono" />
              {/if}
            </a>
          {/if}

          {#if aboutText}
            {#if !brandAsset && !usesEditorialStyle}
              <div class="brand-title mb-4">CREATE SOMETHING</div>
            {/if}
            <p class="brand-description max-w-md mb-6">
              {aboutText}
            </p>
          {:else}
            <h4 class="section-title mb-4">About</h4>
            <p class="section-description leading-relaxed">
              The philosophical foundation for the Create Something ecosystem. Curated wisdom from
              masters who embody "less, but better."
            </p>
          {/if}

          {#if footerCta && !usesEditorialStyle}
            <a href={footerCta.href} class="footer-cta">
              <span class="footer-cta-label">{footerCta.label}</span>
              {#if footerCta.description}
                <span class="footer-cta-description">{footerCta.description}</span>
              {/if}
            </a>
          {/if}

          <!-- Social Links -->
          {#if showSocial}
            <ul class="social-list flex items-center gap-4">
              <li>
                <a
                  href="https://github.com/createsomethingtoday"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="social-link w-10 h-10 flex items-center justify-center"
                  aria-label="GitHub"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path
                      d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                    />
                  </svg>
                </a>
              </li>
              <li>
                <a
                  href="https://www.linkedin.com/in/micahryanjohnson/"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="social-link w-10 h-10 flex items-center justify-center"
                  aria-label="LinkedIn"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path
                      d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
                    />
                  </svg>
                </a>
              </li>
            </ul>
          {/if}
        </div>

        <!-- Quick Links (Optional) -->
        {#if footerLinkGroups.length > 0}
          <div class="footer-link-groups" aria-label="Footer links">
            {#each footerLinkGroups as group}
              <nav aria-label={group.ariaLabel ?? group.title}>
                <h3 class="section-title mb-4">{group.title}</h3>
                <ul class="space-y-3">
                  {#each group.links as link}
                    <li>
                      <a href={link.href} class="footer-link">
                        {link.label}
                      </a>
                    </li>
                  {/each}
                </ul>
              </nav>
            {/each}
          </div>
        {/if}

        <!-- Modes of Being (REQUIRED) - With Hermeneutic Transitions -->
        <nav aria-label="CREATE SOMETHING properties">
          <h3 class="section-title mb-4">{propertyDirectoryTitle}</h3>
          <ul class="space-y-3">
            <li>
              <a
                href="https://createsomething.space"
                class="footer-link block"
                class:active={mode === 'space'}
                onclick={(e) => handleCrossPropertyClick(e, 'space')}
              >
                <div>.space <span class="link-label">— Explore</span></div>
                <div class="link-description">Experiments, practice, learning by doing</div>
              </a>
            </li>
            <li>
              <a
                href="https://learn.createsomething.space"
                class="footer-link block"
                class:active={mode === 'learn'}
                onclick={(e) => handleCrossPropertyClick(e, 'learn')}
              >
                <div>.learn <span class="link-label">— Study</span></div>
                <div class="link-description">Structured courses and educational content</div>
              </a>
            </li>
            <li>
              <a
                href="https://createsomething.io"
                class="footer-link block"
                class:active={mode === 'io'}
                onclick={(e) => handleCrossPropertyClick(e, 'io')}
              >
                <div>.io <span class="link-label">— Research</span></div>
                <div class="link-description">Papers, tools, documented discoveries</div>
              </a>
            </li>
            <li>
              <a
                href="https://createsomething.agency"
                class="footer-link block"
                class:active={mode === 'agency'}
                onclick={(e) => handleCrossPropertyClick(e, 'agency')}
              >
                <div>.agency <span class="link-label">— Build</span></div>
                <div class="link-description">Client services, commercial work</div>
              </a>
            </li>
            <li>
              <a
                href="https://createsomething.ltd"
                class="footer-link block"
                class:active={mode === 'ltd'}
                onclick={(e) => handleCrossPropertyClick(e, 'ltd')}
              >
                <div>.ltd <span class="link-label">— Canon</span></div>
                <div class="link-description">Philosophy, patterns, the source of truth</div>
              </a>
            </li>
            <li>
              <a
                href="https://github.com/createsomethingtoday"
                target="_blank"
                rel="noopener"
                class="footer-link block"
              >
                <div>GitHub <span class="link-label">— Source</span></div>
                <div class="link-description">Open development, version control</div>
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  </div>

  <!-- Copyright & Legal -->
  <div class="footer-copyright py-6 px-6">
    <div
      class="footer-inner shell-inner flex flex-col sm:flex-row items-center justify-between gap-4"
    >
      <p class="copyright-text">
        {copyrightText || defaultCopyright}
      </p>
      <nav class="legal-links flex items-center gap-4" aria-label="Legal">
        <a href="/privacy" class="legal-link">Privacy</a>
        <span class="legal-separator">·</span>
        <a href="/terms" class="legal-link">Terms</a>
      </nav>
    </div>
  </div>

  <!-- Standards (Optional) -->
  {#if showRamsQuote}
    <div class="footer-quote py-8 px-6">
      <div class="footer-inner shell-inner text-center">
        <p class="quote-text leading-relaxed">
          Less, but better. · Weniger, aber besser. · — Dieter Rams
        </p>
      </div>
    </div>
  {/if}
</footer>

<style>
  /* Footer Container */
  .footer {
    background: transparent;
  }

  /* Newsletter Section */
  .newsletter-title {
    font-size: clamp(1.875rem, 3vw, 2.25rem);
    font-weight: var(--font-performance-bold);
    color: var(--color-performance-fg-primary);
  }

  .newsletter-description {
    color: var(--color-performance-fg-tertiary);
  }

  .newsletter-input {
    background: transparent;
    border: 1px solid var(--color-performance-border-default);
    border-radius: var(--radius-performance-scale-lg);
    color: var(--color-performance-fg-primary);
    transition:
      border-color var(--duration-performance-micro) var(--ease-performance-standard),
      background var(--duration-performance-micro) var(--ease-performance-standard);
  }

  .newsletter-input::placeholder {
    color: var(--color-performance-fg-muted);
  }

  .newsletter-input:focus {
    outline: 2px solid var(--color-performance-focus);
    outline-offset: 2px;
    border-color: var(--color-performance-shell-border-strong);
    background: transparent;
  }

  .newsletter-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .newsletter-button {
    background: var(--color-performance-fg-primary);
    color: var(--color-performance-bg-pure);
    font-weight: var(--font-performance-semibold);
    border-radius: var(--radius-performance-scale-lg);
    border: 1px solid transparent;
    transition:
      opacity var(--duration-performance-micro) var(--ease-performance-standard),
      transform var(--duration-performance-micro) var(--ease-performance-standard);
  }

  .newsletter-button:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  .newsletter-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .newsletter-button:focus-visible {
    outline: 2px solid var(--color-performance-focus);
    outline-offset: 2px;
  }

  /* Message States */
  .message-success {
    font-size: var(--text-performance-body-sm);
    background: var(--color-performance-success-muted);
    color: var(--color-performance-success);
    border: 1px solid var(--color-performance-success);
    border-radius: var(--radius-performance-scale-lg);
  }

  .message-error {
    font-size: var(--text-performance-body-sm);
    background: var(--color-performance-error-muted);
    color: var(--color-performance-error);
    border: 1px solid var(--color-performance-error);
    border-radius: var(--radius-performance-scale-lg);
  }

  /* Footer Links Section */

  /* Brand */
  .brand-title {
    font-size: 1.5rem;
    font-weight: var(--font-performance-bold);
    color: var(--color-performance-fg-primary);
  }

  .brand-description {
    font-size: var(--text-performance-body-sm);
    color: var(--color-performance-fg-tertiary);
  }

  .footer-links-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 3rem;
  }

  .footer-link-groups {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    gap: 2rem 2.5rem;
  }

  .footer-cta {
    display: inline-flex;
    flex-direction: column;
    gap: 0.35rem;
    max-width: 22rem;
    margin-bottom: 1.5rem;
    padding: 0.85rem 1rem;
    border: 1px solid var(--color-performance-border-emphasis);
    border-radius: var(--radius-performance-scale-md);
    color: var(--color-performance-fg-primary);
    text-decoration: none;
    transition:
      border-color var(--duration-performance-micro) var(--ease-performance-standard),
      transform var(--duration-performance-micro) var(--ease-performance-standard);
  }

  .footer-cta:hover {
    border-color: var(--color-performance-shell-border-strong);
    text-decoration: none;
    transform: translateY(-1px);
  }

  .footer-cta:focus-visible {
    outline: 2px solid var(--color-performance-focus);
    outline-offset: 2px;
  }

  .footer-cta-label {
    font-size: var(--text-performance-body-sm);
    font-weight: var(--font-performance-semibold);
  }

  .footer-cta-description {
    font-size: var(--text-performance-caption);
    color: var(--color-performance-fg-tertiary);
  }

  /* Section Titles */
  .section-title {
    font-size: var(--text-performance-body-sm);
    font-weight: var(--font-performance-bold);
    color: var(--color-performance-fg-primary);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .section-description {
    font-size: var(--text-performance-body-sm);
    color: var(--color-performance-fg-tertiary);
  }

  /* Social Links */
  .social-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .social-link {
    min-width: var(--height-performance-control-min, 2.75rem);
    min-height: var(--height-performance-control-min, 2.75rem);
    background: transparent;
    border: 1px solid var(--color-performance-border-default);
    border-radius: var(--radius-performance-scale-md);
    color: var(--color-performance-fg-tertiary);
    text-decoration: none;
    transition:
      all var(--duration-performance-micro) var(--ease-performance-standard),
      transform var(--duration-performance-micro) var(--ease-performance-standard);
  }

  .social-link:hover {
    background: transparent;
    border-color: var(--color-performance-border-emphasis);
    color: var(--color-performance-fg-primary);
    text-decoration: none;
    transform: translateY(-1px);
  }

  .social-link:focus-visible,
  .footer-link:focus-visible,
  .legal-link:focus-visible {
    outline: 2px solid var(--color-performance-focus);
    outline-offset: 2px;
  }

  /* Footer Links */
  .footer-link {
    font-size: var(--text-performance-body-sm);
    color: var(--color-performance-fg-tertiary);
    text-decoration: none;
    transition:
      color var(--duration-performance-micro) var(--ease-performance-standard),
      background var(--duration-performance-micro) var(--ease-performance-standard);
    border-radius: var(--radius-performance-scale-sm);
    padding: 0.12rem 0.25rem;
  }

  .footer-link:hover,
  .footer-link.active {
    color: var(--color-performance-fg-primary);
    text-decoration: none;
  }

  .link-label {
    color: var(--color-performance-fg-muted);
  }

  .link-description {
    font-size: var(--text-performance-caption);
    color: var(--color-performance-fg-subtle);
    margin-top: 0.25rem;
  }

  /* Copyright & Legal */

  .copyright-text {
    font-size: var(--text-performance-caption);
    color: var(--color-performance-fg-muted);
  }

  .legal-links {
    font-size: var(--text-performance-caption);
  }

  .legal-link {
    display: inline-flex;
    min-height: 1.5rem;
    align-items: center;
    color: var(--color-performance-fg-muted);
    text-decoration: none;
    transition: color var(--duration-performance-micro) var(--ease-performance-standard);
  }

  .legal-link:hover {
    color: var(--color-performance-fg-primary);
    text-decoration: none;
  }

  .legal-separator {
    color: var(--color-performance-fg-subtle);
  }

  /* Quote */

  .quote-text {
    font-size: var(--text-performance-caption);
    color: var(--color-performance-fg-muted);
  }

  /* Honeypot - hidden from users */
  .honeypot {
    position: absolute;
    left: -9999px;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }

  /* Screen reader only - visually hidden but accessible */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  /* Turnstile container */
  .turnstile-container {
    display: flex;
    justify-content: center;
  }

  @media (min-width: 768px) {
    .footer-links-grid {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
    }
  }

  @media (min-width: 1024px) {
    .footer-links-grid {
      grid-template-columns: minmax(0, 1.1fr) minmax(0, 1.55fr) minmax(0, 1.1fr);
    }
  }

  .footer-clear {
    background: var(--color-performance-paper, #f3f3f0);
    color: var(--color-performance-ink, #090909);
    border-top: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .footer-clear #newsletter {
    padding-top: clamp(4rem, 8vw, 5rem);
    padding-bottom: clamp(3.25rem, 7vw, 5rem);
    padding-inline: 1.5rem;
  }

  .footer-clear .newsletter-title {
    max-width: 38rem;
    margin-inline: auto;
    color: var(--color-performance-ink, #090909);
    line-height: 1.08;
  }

  .footer-clear .newsletter-description {
    color: var(--color-performance-muted, #5e6268);
    font-size: 1rem;
    line-height: 1.55;
  }

  .footer-clear .newsletter-input,
  .footer-clear .newsletter-button {
    min-height: 3.35rem;
    border-radius: var(--radius-performance-sm, 4px);
  }

  .footer-clear .newsletter-input {
    background: var(--color-performance-panel, #ffffff);
  }

  .footer-clear .newsletter-button {
    background: var(--color-performance-ink, #090909);
    color: #ffffff;
  }

  .footer-clear .footer-links {
    padding-top: 5rem;
    padding-bottom: 1.25rem;
    padding-inline: 0;
    background: var(--color-performance-paper, #f3f3f0);
  }

  .footer-clear .footer-inner {
    width: min(var(--content-width-performance, 85rem), calc(100% - 2.5rem));
    max-width: none;
  }

  .footer-clear .footer-links-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 2rem 2.5rem;
    align-items: start;
    padding: clamp(1.5rem, 3vw, 2rem);
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: 8px;
    background: var(--color-performance-panel, #ffffff);
    box-shadow: 0 12px 48px rgba(10, 14, 25, 0.08);
  }

  .footer-clear .footer-brand-column {
    display: grid;
    gap: 1rem;
    align-content: space-between;
    min-height: 100%;
  }

  .footer-clear .footer-mark {
    --color-performance-fg-primary: var(--color-performance-ink, #090909);
    display: inline-grid;
    place-items: center;
    width: 3rem;
    height: 3rem;
    margin-bottom: 1.75rem;
    color: var(--color-performance-ink, #090909);
    text-decoration: none;
  }

  .footer-clear .footer-mark.footer-mark--asset {
    display: block;
    width: min(13.5rem, 100%);
    height: auto;
    min-height: 3rem;
  }

  .footer-mark__asset {
    display: block;
    width: auto;
    max-width: min(13.5rem, 100%);
    height: 3rem;
  }

  .footer-clear .brand-title {
    color: var(--color-performance-ink, #090909);
    font-family: var(--font-performance-mono);
    font-size: 0.86rem;
    font-weight: var(--font-performance-medium);
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .footer-clear .brand-description {
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.95rem;
    line-height: 1.55;
  }

  .footer-clear .footer-cta {
    width: min(100%, 17.5rem);
    border-color: var(--color-performance-ink, #090909);
    border-radius: var(--radius-performance-sm, 4px);
    background: var(--color-performance-ink, #090909);
    color: #ffffff;
    box-shadow: none;
  }

  .footer-clear .footer-cta:hover {
    border-color: #1a2030;
    background: #1a2030;
    opacity: 1;
    transform: none;
  }

  .footer-clear .footer-cta-description {
    color: rgba(255, 255, 255, 0.72);
  }

  .footer-clear .section-title {
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-performance-mono);
    font-size: 0.74rem;
    font-weight: var(--font-performance-medium);
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .footer-clear .section-description {
    color: var(--color-performance-muted, #5e6268);
  }

  .footer-clear .footer-link {
    display: block;
    width: fit-content;
    max-width: 100%;
    color: var(--color-performance-ink, #090909);
    border-radius: var(--radius-performance-sm, 4px);
    padding: 0.1rem 0;
    font-size: 0.96rem;
    line-height: 1.35;
  }

  .footer-clear .footer-link:hover,
  .footer-clear .footer-link.active {
    color: var(--color-performance-ink, #090909);
    opacity: 1;
  }

  .footer-clear .link-label,
  .footer-clear .link-description,
  .footer-clear .copyright-text,
  .footer-clear .legal-link,
  .footer-clear .legal-separator,
  .footer-clear .quote-text {
    color: var(--color-performance-muted, #5e6268);
  }

  .footer-clear .link-description {
    max-width: 18rem;
    line-height: 1.45;
  }

  .footer-clear .social-link {
    border-color: var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-sm, 4px);
    background: var(--color-performance-panel, #ffffff);
    color: var(--color-performance-ink, #090909);
  }

  .footer-clear .social-link:hover {
    border-color: var(--color-performance-line-strong, #9c9c96);
    background: var(--color-performance-court, #e6e6e0);
    color: var(--color-performance-ink, #090909);
  }

  .footer-clear .footer-copyright,
  .footer-clear .footer-quote {
    padding-inline: 0;
    border-top: 0;
    background: var(--color-performance-paper, #f3f3f0);
  }

  .footer-clear .footer-copyright .footer-inner {
    padding: 0.35rem 0 1.4rem;
  }

  @media (min-width: 1024px) {
    .footer-clear .footer-links-grid {
      grid-template-columns: minmax(14rem, 0.82fr) minmax(24rem, 1.12fr) minmax(17rem, 0.9fr);
    }

    .footer-clear .footer-link-groups {
      grid-template-columns: repeat(2, minmax(10rem, 1fr));
      gap: 2rem 2.4rem;
    }
  }

  @media (max-width: 640px) {
    .footer-clear #newsletter {
      padding-top: 3rem;
      padding-bottom: 2.25rem;
      padding-inline: 1.25rem;
    }

    .footer-clear .newsletter-title {
      max-width: 21rem;
      font-size: clamp(1.9rem, 9vw, 2.35rem);
      line-height: 1.1;
    }

    .footer-clear .newsletter-description {
      max-width: 18rem;
      margin-bottom: 1.25rem;
      font-size: 0.98rem;
      line-height: 1.5;
    }

    .footer-clear #newsletter form {
      max-width: 100%;
    }

    .footer-clear .newsletter-input,
    .footer-clear .newsletter-button {
      min-height: 3.25rem;
      padding-block: 0.86rem;
      padding-inline: 1rem;
      font-size: 1rem;
    }

    .footer-clear .footer-links {
      padding-top: 2.4rem;
      padding-bottom: 1rem;
    }

    .footer-clear .footer-inner {
      width: min(100% - 1.5rem, var(--content-width-performance, 85rem));
    }

    .footer-clear .footer-links-grid {
      gap: 1.45rem;
      padding: 1.2rem;
    }

    .footer-clear .footer-brand-column {
      padding-bottom: 1.1rem;
      border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
    }

    .footer-clear .footer-mark {
      margin-bottom: 0.35rem;
    }
  }

  /* Owned editorial ending: warm dark field, large brand gesture, quiet directory. */
  .footer-editorial {
    border-top: 0;
    background: var(--color-performance-editorial-dark, #181312);
    color: var(--color-performance-editorial-light, #f3ebe4);
  }

  .footer-editorial #newsletter {
    border-bottom: 1px solid
      color-mix(in srgb, var(--color-performance-editorial-dark) 18%, transparent);
    background: var(--color-performance-editorial-light-secondary, #d8cdbc);
    color: var(--color-performance-editorial-dark, #181312);
  }

  .footer-editorial .newsletter-title {
    font-family: var(--font-performance-editorial);
    font-size: clamp(2.6rem, 5vw, 5rem);
    font-weight: 400;
    letter-spacing: -0.05em;
    line-height: 0.94;
  }

  .footer-editorial .newsletter-description {
    color: color-mix(in srgb, var(--color-performance-editorial-dark) 76%, transparent);
  }

  .footer-editorial .newsletter-input {
    border: 1px solid color-mix(in srgb, var(--color-performance-editorial-dark) 32%, transparent);
    border-radius: 0;
    background: var(--color-performance-editorial-light, #f3ebe4);
    color: var(--color-performance-editorial-dark, #181312);
  }

  .footer-editorial .newsletter-button {
    border: 1px solid var(--color-performance-editorial-brand, #fcaa2d);
    border-radius: 0;
    background: var(--color-performance-editorial-brand, #fcaa2d);
    color: var(--color-performance-editorial-dark, #181312);
  }

  .footer-editorial-identity {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 2rem;
    align-items: end;
    width: min(var(--content-width-performance-editorial, 90rem), calc(100% - 2rem));
    margin-inline: auto;
    padding: clamp(4rem, 9vw, 8rem) 0 0;
    color: var(--color-performance-editorial-light, #f3ebe4);
  }

  .footer-editorial-identity--link {
    color: inherit;
    text-decoration: none;
  }

  .footer-editorial-identity--link:focus-visible {
    outline: 2px solid var(--color-performance-editorial-brand, #fcaa2d);
    outline-offset: 0.5rem;
  }

  .footer-editorial-identity div {
    display: grid;
    font-family: var(--font-performance-editorial);
    font-size: clamp(4.1rem, 12.1vw, 12.75rem);
    font-weight: 400;
    letter-spacing: -0.075em;
    line-height: 0.7;
  }

  .footer-editorial-identity div span:last-child {
    margin-left: clamp(1rem, 8vw, 9rem);
    color: var(--color-performance-editorial-brand, #fcaa2d);
  }

  .footer-editorial-identity__asset {
    display: block;
    width: min(100%, 46rem);
    height: auto;
    max-height: 14rem;
  }

  .footer-editorial-identity p {
    max-width: 15rem;
    margin: 0 0 0.25rem;
    color: color-mix(in srgb, var(--color-performance-editorial-light) 62%, transparent);
    font-family: var(--font-performance-mono);
    font-size: 0.68rem;
    font-weight: var(--font-performance-semibold);
    letter-spacing: 0.065em;
    line-height: 1.45;
    text-transform: uppercase;
  }

  .footer-editorial .footer-links {
    padding-top: clamp(2.5rem, 5vw, 4rem);
    background: var(--color-performance-editorial-dark, #181312);
  }

  .footer-editorial .footer-inner {
    width: min(var(--content-width-performance-editorial, 90rem), calc(100% - 2rem));
  }

  .footer-editorial .footer-links-grid {
    padding: clamp(1.5rem, 4vw, 3.5rem);
    border-color: color-mix(in srgb, var(--color-performance-editorial-light) 22%, transparent);
    border-radius: var(--radius-performance-editorial, 0.375rem);
    background: var(--color-performance-editorial-dark-secondary, #2e2927);
    box-shadow: none;
  }

  .footer-editorial .brand-title {
    color: var(--color-performance-editorial-light, #f3ebe4);
  }

  .footer-editorial .brand-description {
    max-width: 34rem;
    color: color-mix(in srgb, var(--color-performance-editorial-light) 72%, transparent);
    font-size: clamp(1rem, 1.5vw, 1.2rem);
  }

  .footer-editorial .footer-cta {
    width: min(100%, 24rem);
    border-color: var(--color-performance-editorial-brand, #fcaa2d);
    border-radius: var(--radius-performance-editorial, 0.375rem);
    background: var(--color-performance-editorial-brand, #fcaa2d);
    color: var(--color-performance-editorial-dark, #181312);
  }

  .footer-editorial .footer-cta:hover {
    border-color: color-mix(in srgb, var(--color-performance-editorial-brand) 88%, white);
    background: color-mix(in srgb, var(--color-performance-editorial-brand) 88%, white);
  }

  .footer-editorial .footer-cta-description {
    color: color-mix(in srgb, var(--color-performance-editorial-dark) 72%, transparent);
  }

  .footer-editorial .section-title,
  .footer-editorial .footer-link,
  .footer-editorial .footer-link:hover,
  .footer-editorial .footer-link.active {
    color: var(--color-performance-editorial-light, #f3ebe4);
  }

  .footer-editorial .link-label,
  .footer-editorial .link-description,
  .footer-editorial .copyright-text,
  .footer-editorial .legal-link,
  .footer-editorial .legal-separator {
    color: color-mix(in srgb, var(--color-performance-editorial-light) 58%, transparent);
  }

  .footer-editorial .social-link {
    border-color: color-mix(in srgb, var(--color-performance-editorial-light) 24%, transparent);
    background: transparent;
    color: var(--color-performance-editorial-light, #f3ebe4);
  }

  .footer-editorial .footer-copyright,
  .footer-editorial .footer-quote {
    background: var(--color-performance-editorial-dark, #181312);
  }

  @media (max-width: 640px) {
    .footer-editorial-identity {
      grid-template-columns: 1fr;
      gap: 1.5rem;
      width: min(100% - 1.5rem, var(--content-width-performance-editorial, 90rem));
      padding-top: 4rem;
    }

    .footer-editorial-identity div {
      font-size: clamp(3.55rem, 18vw, 6.5rem);
      line-height: 0.75;
    }

    .footer-editorial-identity__asset {
      width: min(100%, 24rem);
      max-height: none;
    }

    .footer-editorial .footer-inner {
      width: min(100% - 1rem, var(--content-width-performance-editorial, 90rem));
    }

    .footer-editorial .footer-brand-column {
      border-color: color-mix(in srgb, var(--color-performance-editorial-light) 18%, transparent);
    }
  }
</style>
