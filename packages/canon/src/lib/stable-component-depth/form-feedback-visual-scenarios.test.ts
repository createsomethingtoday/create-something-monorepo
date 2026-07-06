import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(process.cwd(), '..', '..');

const FORM_VISUAL_SCENARIOS = [
	{
		component: 'Checkbox',
		sourcePath: 'packages/canon/src/lib/components/form/Checkbox.svelte',
		states: ['unchecked', 'checked', 'indeterminate', 'disabled', 'focus-visible']
	},
	{
		component: 'CheckboxGroup',
		sourcePath: 'packages/canon/src/lib/components/form/CheckboxGroup.svelte',
		states: ['default', 'with-description', 'disabled-items', 'mobile-wrap']
	},
	{
		component: 'Radio',
		sourcePath: 'packages/canon/src/lib/components/form/Radio.svelte',
		states: ['unchecked', 'checked', 'disabled', 'focus-visible']
	},
	{
		component: 'RadioGroup',
		sourcePath: 'packages/canon/src/lib/components/form/RadioGroup.svelte',
		states: ['default', 'with-description', 'horizontal', 'error-prevention']
	},
	{
		component: 'Select',
		sourcePath: 'packages/canon/src/lib/components/form/Select.svelte',
		states: ['placeholder', 'selected', 'error', 'disabled', 'focus-visible']
	},
	{
		component: 'Switch',
		sourcePath: 'packages/canon/src/lib/components/form/Switch.svelte',
		states: ['off', 'on', 'disabled', 'left-label', 'focus-visible']
	},
	{
		component: 'TextArea',
		sourcePath: 'packages/canon/src/lib/components/form/TextArea.svelte',
		states: ['empty', 'filled', 'description', 'error', 'disabled', 'focus-visible']
	},
	{
		component: 'TextField',
		sourcePath: 'packages/canon/src/lib/components/form/TextField.svelte',
		states: ['empty', 'filled', 'required', 'error', 'disabled', 'focus-visible']
	}
] as const;

const FEEDBACK_VISUAL_SCENARIOS = [
	{
		component: 'Alert',
		sourcePath: 'packages/canon/src/lib/components/feedback/Alert.svelte',
		states: ['info', 'success', 'warning', 'error', 'dismissible']
	},
	{
		component: 'Dialog',
		sourcePath: 'packages/canon/src/lib/components/feedback/Dialog.svelte',
		states: ['open', 'title-description', 'footer', 'small', 'large']
	},
	{
		component: 'Progress',
		sourcePath: 'packages/canon/src/lib/components/feedback/Progress.svelte',
		states: ['empty', 'partial', 'complete', 'with-value', 'warning', 'error']
	},
	{
		component: 'Skeleton',
		sourcePath: 'packages/canon/src/lib/components/feedback/Skeleton.svelte',
		states: ['line', 'card', 'avatar', 'reduced-motion']
	},
	{
		component: 'Spinner',
		sourcePath: 'packages/canon/src/lib/components/feedback/Spinner.svelte',
		states: ['small', 'medium', 'large', 'with-label', 'reduced-motion']
	},
	{
		component: 'Toast',
		sourcePath: 'packages/canon/src/lib/components/feedback/Toast.svelte',
		states: ['info', 'success', 'warning', 'error', 'dismissed', 'progress-paused']
	}
] as const;

describe('Canon form and feedback visual regression scenarios', () => {
	it('keeps every stable form control attached to named visual states', () => {
		for (const scenario of FORM_VISUAL_SCENARIOS) {
			expect(existsSync(join(REPO_ROOT, scenario.sourcePath)), scenario.component).toBe(true);
			expect(scenario.states.length, scenario.component).toBeGreaterThanOrEqual(4);
		}
	});

	it('keeps every stable feedback component attached to named visual states', () => {
		for (const scenario of FEEDBACK_VISUAL_SCENARIOS) {
			expect(existsSync(join(REPO_ROOT, scenario.sourcePath)), scenario.component).toBe(true);
			expect(scenario.states.length, scenario.component).toBeGreaterThanOrEqual(4);
		}
	});
});
