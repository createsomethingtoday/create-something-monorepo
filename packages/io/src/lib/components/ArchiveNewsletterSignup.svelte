<script lang="ts">
  import { NewsletterSignup } from '@create-something/canon';
  let { turnstileSiteKey = '' } = $props();
</script>

<NewsletterSignup
  turnstileSiteKey={turnstileSiteKey}
  eyebrow="Operator edition"
  headline="Get the next field note first."
  description="The concise edition, practical links, and one clear next move—sent when the work is ready. The full argument remains available in the public archive."
  actionLabel="Request the next edition"
  submitLabel="Subscribe"
  note="Double opt-in. Occasional field notes. Unsubscribe whenever it stops being useful."
  source="io-newsletter-archive"
/>
