# Canon Form Controls

Stable form controls collect user input while preserving visible labels, descriptions, errors,
required state, touch targets, keyboard behavior, and native semantics.

## Examples

```svelte
<script lang="ts">
	import {
		Checkbox,
		CheckboxGroup,
		Radio,
		RadioGroup,
		Select,
		Switch,
		TextArea,
		TextField
	} from '@create-something/canon/components/form';

	let email = $state('');
	let notes = $state('');
	let approved = $state(false);
	let selectedPlan = $state('');
	let communicationMode = $state('email');
	let digestEnabled = $state(true);
</script>

<TextField
	id="operator-email"
	name="email"
	type="email"
	label="Operator email"
	description="Use the address that owns the handoff receipt."
	placeholder="operator@example.com"
	required
	bind:value={email}
/>

<TextArea
	id="handoff-notes"
	name="notes"
	label="Handoff notes"
	description="Summarize the decision, owner, and evidence."
	bind:value={notes}
/>

<Checkbox
	id="approved"
	name="approved"
	label="Approval recorded"
	description="Check only after the approval note is linked."
	bind:checked={approved}
/>

<CheckboxGroup legend="Included evidence" description="Choose every artifact attached to the handoff.">
	<Checkbox name="evidence" value="run-log" label="Run log" />
	<Checkbox name="evidence" value="screenshot" label="Screenshot" />
	<Checkbox name="evidence" value="rollback" label="Rollback note" />
</CheckboxGroup>

<RadioGroup legend="Communication mode" description="Choose the primary follow-up channel.">
	<Radio name="mode" value="email" label="Email" bind:group={communicationMode} />
	<Radio name="mode" value="slack" label="Slack" bind:group={communicationMode} />
	<Radio name="mode" value="meeting" label="Meeting" bind:group={communicationMode} />
</RadioGroup>

<Select
	id="plan"
	name="plan"
	label="Plan"
	placeholder="Choose a plan"
	description="Plans should map to the policy record."
	bind:value={selectedPlan}
>
	<option value="review">Review</option>
	<option value="ship">Ship</option>
	<option value="rollback">Rollback</option>
</Select>

<Switch
	id="digest"
	name="digest"
	label="Daily digest"
	description="Send a concise status summary every morning."
	bind:checked={digestEnabled}
/>
```

## Accessibility Evidence

- `TextField`, `TextArea`, and `Select` connect labels, descriptions, and errors through
  deterministic IDs and `aria-describedby`.
- `Checkbox`, `CheckboxGroup`, `Radio`, and `RadioGroup` preserve native input semantics.
- `Switch` exposes `role="switch"`, `aria-checked`, and keyboard toggling for Space and Enter.
- Controls keep visible labels and descriptions so state is not encoded by color alone.
