<script lang="ts">
	import { NewsletterSignup, SEO } from '@create-something/canon';
	import '$lib/styles/newsletter-editorial.css';
	import '$lib/styles/newsletter-readers.css';
	let { data } = $props();
</script>
<SEO title="Subscribe to field notes | CREATE SOMETHING.io" description="Field notes on building legible, governed AI systems. The decisions, the evidence, and what we learn along the way." propertyName="io" />
<div class="newsletter-editorial newsletter-subscribe">
  <header class="reader-masthead"><a href="/">CREATE SOMETHING</a><a href="/newsletters">The field notes archive ↗</a></header>
  <section class="subscribe-layout" aria-labelledby="subscribe-title">
    <div class="subscribe-copy"><p class="reader-eyebrow">The operator edition / By email</p><h1 id="subscribe-title">A note when there’s something to share.</h1><p class="reader-lede">Field notes on building legible, governed AI systems. The decisions, the evidence, and what we learn along the way.</p><p>New field notes, practical links, and one clear next move. Sent when the work is ready.</p><figure class="subscribe-art"><img src="/images/field-note-640.webp" srcset="/images/field-note-640.webp 640w, /images/field-note-1280.webp 1280w" sizes="(max-width: 768px) calc(100vw - 40px), 45vw" width="1280" height="721" alt="Canon places a folded paper note into an envelope." /><figcaption>A note worth sending. / Conceptual illustration</figcaption></figure></div>
    <div class="subscribe-sheet">
      <NewsletterSignup turnstileSiteKey={data.turnstileSiteKey} source="io-subscribe" eyebrow="By email" headline="Receive the field notes" description="Confirm your email to join the list." actionLabel="Receive the field notes" submitLabel="Subscribe" note="Double opt-in. Occasional field notes. Unsubscribe whenever it stops being useful." />
      <a href="/privacy">Read the privacy policy</a>
    </div>
  </section>
  <footer class="reader-footer"><p>Pages, packages, policies, and proof.</p><a href="/newsletters">Read the collected notes →</a></footer>
</div>
