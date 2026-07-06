# Canon Feedback Components

Stable feedback components make system state visible without hiding the recovery path or current
owner. Use them for status, interruption, progress, loading, and transient confirmation.

## Examples

```svelte
<script lang="ts">
	import {
		Alert,
		Dialog,
		Progress,
		Skeleton,
		Spinner,
		Toast
	} from '@create-something/canon/components/feedback';

	let dialogOpen = $state(false);
</script>

<Alert variant="warning" title="Approval required" dismissible>
	This deployment needs an owner note before production promotion.
</Alert>

<button type="button" onclick={() => (dialogOpen = true)}>Review decision</button>

<Dialog
	bind:open={dialogOpen}
	title="Review decision"
	description="Confirm the evidence, owner, and rollback path before continuing."
>
	<p>The release is ready after the validation log is attached.</p>
</Dialog>

<Progress value={72} label="Evidence review" showValue />

<Spinner label="Checking policy gate" />

<Skeleton width="100%" height="3rem" ariaLabel="Loading handoff summary" />

<Toast
	variant="success"
	title="Evidence attached"
	message="The handoff now includes command output and rollback notes."
	duration={5000}
/>
```

## Accessibility Evidence

- `Alert` and `Toast` use alert/live semantics for status updates.
- `Dialog` exposes modal semantics and uses focus trapping for keyboard containment.
- `Progress` publishes current, min, and max values through `role="progressbar"`.
- `Spinner` and `Skeleton` provide accessible labels for loading and placeholder states.
- Dismissible feedback uses explicit button labels instead of icon-only state.
