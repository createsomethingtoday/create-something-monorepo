---
slug: "the-stack"
category: "Work"
title: "The Stack"
description: "24/7 booking replaced phone calls. 8 courts across 4 locations fill themselves. Zero staff involvement required."
industry: "Pickleball Facility"
subtitle: "24/7 booking replaced phone calls. 8 courts across 4 locations fill themselves while staff focus on facilities."
metrics:
  - "24/7 automated booking"
  - "8 courts, 4 locations"
  - "Zero staff involvement"
  - "Prepaid eliminates no-shows"
publishedAt: "2026-01-08"
published: true
---


<div class="max-w-3xl mx-auto">
<h2 class="mb-8">The Challenge</h2>
<div class="space-y-6 body-lg leading-relaxed">
<p>
					The Stack runs multiple indoor pickleball facilities across the region. Each location manages court bookings for walk-ins, members, and drop-in sessions. Before CLEARWAY, the team juggled phone reservations, manual calendars, and payment processing across locations.
				</p>
<p><strong>Problems with the old system:</strong></p>
<ul class="space-y-3 body body-tertiary pl-6">
<li class="flex items-start gap-3">
<span class="body-subtle mt-1">—</span>
<span>Staff spent hours answering booking calls instead of managing facilities</span>
</li>
<li class="flex items-start gap-3">
<span class="body-subtle mt-1">—</span>
<span>No real-time visibility into court availability across locations</span>
</li>
<li class="flex items-start gap-3">
<span class="body-subtle mt-1">—</span>
<span>Payment collection happened on-site, creating friction and no-shows</span>
</li>
<li class="flex items-start gap-3">
<span class="body-subtle mt-1">—</span>
<span>Website visitors had no way to book directly—only contact forms</span>
</li>
</ul>
<p class="italic body-tertiary pt-4">
					The ask: "Can people just book courts from our website?"
				</p>
</div>
</div>



<div class="max-w-3xl mx-auto">
<h2 class="mb-8">The Solution</h2>
<div class="space-y-6 body-lg leading-relaxed">
<p>
					We embedded CLEARWAY directly into The Stack's website. Players see real-time court availability, select a time slot, pay with Stripe, and receive instant confirmation—all without leaving the site.
				</p>
<p><strong>What we built:</strong></p>
<ul class="space-y-3 body body-tertiary pl-6">
<li class="flex items-start gap-3">
<span class="body-subtle mt-1">✓</span>
<span>Single-line embed integration (no backend required for The Stack)</span>
</li>
<li class="flex items-start gap-3">
<span class="body-subtle mt-1">✓</span>
<span>In-widget Stripe checkout with instant payment confirmation</span>
</li>
<li class="flex items-start gap-3">
<span class="body-subtle mt-1">✓</span>
<span>Real-time court availability across all 4 locations (8 courts total)</span>
</li>
<li class="flex items-start gap-3">
<span class="body-subtle mt-1">✓</span>
<span>Dark theme widget matching The Stack's branding</span>
</li>
<li class="flex items-start gap-3">
<span class="body-subtle mt-1">✓</span>
<span>WORKWAY notifications for booking confirmations and updates</span>
</li>
</ul>
<div class="my-8 p-8 card-surface">
<p class="body-sm font-mono body-tertiary mb-4">The entire integration:</p>
<pre class="body-sm body-tertiary font-mono leading-loose overflow-x-auto">
&lt;iframe
  src="https://clearway.pages.dev/embed?facility=thestack&amp;theme=dark"
  title="Book a Court"
  frameborder="0"
&gt;&lt;/iframe&gt;
					</pre>
<p class="body-xs body-muted mt-4">
						One iframe. Zero backend complexity for the client.
					</p>
</div>
</div>
</div>



<div class="max-w-3xl mx-auto">
<h2 class="mb-8">How It Works</h2>
<div class="space-y-8">
<div>
<h3 class="heading-3 mb-3">1. Player visits the booking page</h3>
<p class="body body-tertiary">
						The CLEARWAY widget loads instantly, showing all available courts across locations with real-time slot availability.
					</p>
</div>
<div>
<h3 class="heading-3 mb-3">2. Select court and time</h3>
<p class="body body-tertiary">
						Players choose their preferred location, date, and time slot. Pricing is transparent: $40/hour off-peak, $50/hour during evening rush (5-8pm weekdays).
					</p>
</div>
<div>
<h3 class="heading-3 mb-3">3. Pay with Stripe</h3>
<p class="body body-tertiary">
						Stripe checkout opens directly in the widget. No redirects, no separate payment pages. Card gets charged, court gets booked.
					</p>
</div>
<div>
<h3 class="heading-3 mb-3">4. Confirmation and notifications</h3>
<p class="body body-tertiary">
						Instant confirmation email with booking details. WORKWAY handles reminder notifications and any booking changes.
					</p>
</div>
</div>
</div>



<div class="max-w-3xl mx-auto">
<h2 class="mb-8">Results</h2>
<div class="space-y-6 body-lg leading-relaxed">
<div class="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
<div class="text-center p-6 metric-card">
<p class="heading-2 font-bold mb-2">8</p>
<p class="body-sm metric-label">Courts online</p>
<p class="body-xs metric-sublabel mt-1">4 locations</p>
</div>
<div class="text-center p-6 metric-card">
<p class="heading-2 font-bold mb-2">24/7</p>
<p class="body-sm metric-label">Booking availability</p>
<p class="body-xs metric-sublabel mt-1">No staff required</p>
</div>
<div class="text-center p-6 metric-card">
<p class="heading-2 font-bold mb-2">Zero</p>
<p class="body-sm metric-label">Backend maintenance</p>
<p class="body-xs metric-sublabel mt-1">Embed handles it all</p>
</div>
</div>
<blockquote class="my-8 p-8 card-surface border-l-4 border-l-emphasis">
<p class="body-lg italic mb-4">
						"We stopped thinking about scheduling. Courts just... fill themselves now."
					</p>
<cite class="body-sm body-muted">— The Stack Operations Team</cite>
</blockquote>
<p><strong>Operational outcomes:</strong></p>
<ul class="space-y-3 body body-tertiary pl-6">
<li class="flex items-start gap-3">
<span class="body-subtle mt-1">✓</span>
<span>Players book courts at 2am, noon, or any time—without staff involvement</span>
</li>
<li class="flex items-start gap-3">
<span class="body-subtle mt-1">✓</span>
<span>Payment happens before the booking, eliminating no-shows and on-site friction</span>
</li>
<li class="flex items-start gap-3">
<span class="body-subtle mt-1">✓</span>
<span>Real-time availability across all locations visible on a single page</span>
</li>
<li class="flex items-start gap-3">
<span class="body-subtle mt-1">✓</span>
<span>Staff focus on facility operations instead of answering phones</span>
</li>
</ul>
</div>
</div>



<div class="max-w-3xl mx-auto">
<h2 class="mb-8">The Pattern: Zuhandenheit</h2>
<div class="space-y-6 body-lg leading-relaxed">
<p>
					CLEARWAY embodies <strong>Zuhandenheit</strong>—ready-to-hand. The booking system recedes into transparent use. Players don't think about "using court reservation software." They just book courts.
				</p>
<p>
					The Stack's team doesn't manage a booking platform. They run pickleball facilities. The technology becomes invisible, leaving only the outcome: courts that fill themselves.
				</p>
<div class="my-8 p-8 card-surface">
<p class="body-sm body-tertiary mb-4">Design principle:</p>
<p class="body-lg italic">
						"The tool recedes; the outcome remains."
					</p>
</div>
<p>
					This case study validates CLEARWAY's embeddable architecture. Facilities of any size can add professional court booking with a single iframe—no engineering team required.
				</p>
</div>
</div>



<div class="max-w-3xl mx-auto">
<h2 class="mb-8">Technical Implementation</h2>
<div class="space-y-6 body-lg leading-relaxed">
<p><strong>Stack:</strong></p>
<ul class="space-y-3 body body-tertiary pl-6">
<li class="flex items-start gap-3">
<span class="body-subtle mt-1">—</span>
<span>SvelteKit 5 for The Stack website (packages/agency/clients/the-stack)</span>
</li>
<li class="flex items-start gap-3">
<span class="body-subtle mt-1">—</span>
<span>CLEARWAY embed widget (packages/clearway/src/embed)</span>
</li>
<li class="flex items-start gap-3">
<span class="body-subtle mt-1">—</span>
<span>Cloudflare Pages deployment for both site and widget</span>
</li>
<li class="flex items-start gap-3">
<span class="body-subtle mt-1">—</span>
<span>Cloudflare D1 for court and reservation data</span>
</li>
<li class="flex items-start gap-3">
<span class="body-subtle mt-1">—</span>
<span>Stripe for payment processing with in-widget checkout</span>
</li>
<li class="flex items-start gap-3">
<span class="body-subtle mt-1">—</span>
<span>WORKWAY for booking notifications and confirmations</span>
</li>
</ul>
<p class="pt-6"><strong>Key features:</strong></p>
<ul class="space-y-3 body body-tertiary pl-6">
<li class="flex items-start gap-3">
<span class="body-subtle mt-1">→</span>
<span>Dynamic pricing: $40 off-peak, $50 peak hours</span>
</li>
<li class="flex items-start gap-3">
<span class="body-subtle mt-1">→</span>
<span>Court type filtering (Sport Court, Hardwood, Rubberized surfaces)</span>
</li>
<li class="flex items-start gap-3">
<span class="body-subtle mt-1">→</span>
<span>Location-based court display (Grandview, Oakridge, Riverview, Pinecrest)</span>
</li>
<li class="flex items-start gap-3">
<span class="body-subtle mt-1">→</span>
<span>14-day advance booking window with 24-hour cancellation policy</span>
</li>
</ul>
<p class="body-sm body-muted pt-6 italic">
					Full source code available in the create-something-monorepo. The Stack site demonstrates CLEARWAY's embeddable architecture in production.
				</p>
</div>
</div>



<div class="max-w-3xl mx-auto text-center">
<h2 class="mb-6">Need Court Booking for Your Facility?</h2>
<p class="body-lg body-tertiary mb-8 leading-relaxed">
				CLEARWAY works for pickleball, tennis, padel, or any court-based sport. Single location or multi-facility operations. Embed it in minutes.
			</p>
<a class="inline-block px-8 py-4 btn-primary" href="/contact">
				Get CLEARWAY for Your Facility
			</a>
</div>

