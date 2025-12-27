<script lang="ts">
	import CodeBlock from '$lib/canon/CodeBlock.svelte';
</script>

<!-- Page Header -->
<header class="page-header">
	<h1 class="page-title">Forms</h1>
	<p class="page-description">
		Form patterns guide users through data entry with clear feedback and minimal friction.
		Every interaction follows Canon tokens for consistent, accessible experiences.
	</p>
</header>

<!-- Problem Statement -->
<section class="section">
	<h2 class="section-title">The Problem</h2>
	<p class="section-description">
		Forms are points of friction. Users abandon forms that feel overwhelming, confusing, or
		broken. Good form design reduces cognitive load while ensuring data validity.
	</p>

	<div class="problem-grid">
		<div class="problem-item">
			<h3>Overwhelm</h3>
			<p>Too many fields visible at once causes decision fatigue.</p>
		</div>
		<div class="problem-item">
			<h3>Unclear Expectations</h3>
			<p>Missing labels, placeholders, or help text leave users guessing.</p>
		</div>
		<div class="problem-item">
			<h3>Late Validation</h3>
			<p>Discovering errors only after submission frustrates users.</p>
		</div>
		<div class="problem-item">
			<h3>Poor Error Recovery</h3>
			<p>Vague error messages don't help users fix problems.</p>
		</div>
	</div>
</section>

<!-- Form Inputs Section -->
<section class="section">
	<h2 class="section-title">Input Fields</h2>
	<p class="section-description">
		All form inputs follow a consistent structure: label, input, description, and error state.
	</p>

	<div class="example-group">
		<h3 class="example-title">TextField</h3>
		<p class="example-description">
			Standard text input with label, placeholder, and helper text.
		</p>

		<div class="preview">
			<div class="demo-form">
				<div class="demo-field">
					<label for="demo-name" class="demo-label">
						Full Name
						<span class="demo-required">*</span>
					</label>
					<input
						type="text"
						id="demo-name"
						class="demo-input"
						placeholder="Enter your full name"
					/>
					<p class="demo-description">As it appears on your ID.</p>
				</div>
			</div>
		</div>

		<CodeBlock
			code={`<script lang="ts">
  import { TextField } from '@create-something/components';

  let name = $state('');
</script>

<TextField
  bind:value={name}
  label="Full Name"
  placeholder="Enter your full name"
  description="As it appears on your ID."
  required
/>`}
			language="svelte"
		/>
	</div>

	<div class="example-group">
		<h3 class="example-title">Error State</h3>
		<p class="example-description">
			Error styling with descriptive message helps users recover.
		</p>

		<div class="preview">
			<div class="demo-form">
				<div class="demo-field demo-field-error">
					<label for="demo-email" class="demo-label">
						Email Address
						<span class="demo-required">*</span>
					</label>
					<input
						type="email"
						id="demo-email"
						class="demo-input demo-input-error"
						value="invalid-email"
						aria-invalid="true"
						aria-describedby="email-error"
					/>
					<p id="email-error" class="demo-error" role="alert">
						Please enter a valid email address.
					</p>
				</div>
			</div>
		</div>

		<CodeBlock
			code={`<TextField
  bind:value={email}
  label="Email Address"
  type="email"
  required
  error={emailError}
/>

<!-- CSS for error state -->
<style>
  .has-error .textfield-input {
    border-color: var(--color-error);
  }

  .has-error .textfield-input:focus {
    box-shadow: 0 0 0 3px var(--color-error-muted);
  }

  .textfield-error {
    font-size: var(--text-caption);
    color: var(--color-error);
  }
</style>`}
			language="svelte"
		/>
	</div>

	<div class="example-group">
		<h3 class="example-title">Size Variants</h3>
		<p class="example-description">
			Small, medium (default), and large sizes for different contexts.
		</p>

		<div class="preview">
			<div class="demo-form demo-form-horizontal">
				<div class="demo-field">
					<label for="demo-sm" class="demo-label demo-label-sm">Small</label>
					<input type="text" id="demo-sm" class="demo-input demo-input-sm" placeholder="Small input" />
				</div>
				<div class="demo-field">
					<label for="demo-md" class="demo-label">Medium</label>
					<input type="text" id="demo-md" class="demo-input" placeholder="Medium input" />
				</div>
				<div class="demo-field">
					<label for="demo-lg" class="demo-label demo-label-lg">Large</label>
					<input type="text" id="demo-lg" class="demo-input demo-input-lg" placeholder="Large input" />
				</div>
			</div>
		</div>

		<CodeBlock
			code={`<TextField label="Small" size="sm" placeholder="Small input" />
<TextField label="Medium" size="md" placeholder="Medium input" />
<TextField label="Large" size="lg" placeholder="Large input" />`}
			language="svelte"
		/>
	</div>
</section>

<!-- Selection Controls Section -->
<section class="section">
	<h2 class="section-title">Selection Controls</h2>
	<p class="section-description">
		Checkboxes, radio buttons, and switches for selecting options.
	</p>

	<div class="example-group">
		<h3 class="example-title">Checkbox</h3>
		<p class="example-description">
			For binary choices or selecting multiple options from a set.
		</p>

		<div class="preview">
			<div class="demo-form">
				<div class="demo-checkbox-group">
					<label class="demo-checkbox">
						<input type="checkbox" class="demo-checkbox-input" checked />
						<span class="demo-checkbox-box"></span>
						<span class="demo-checkbox-label">Email notifications</span>
					</label>
					<label class="demo-checkbox">
						<input type="checkbox" class="demo-checkbox-input" />
						<span class="demo-checkbox-box"></span>
						<span class="demo-checkbox-label">SMS notifications</span>
					</label>
					<label class="demo-checkbox">
						<input type="checkbox" class="demo-checkbox-input" disabled />
						<span class="demo-checkbox-box"></span>
						<span class="demo-checkbox-label">Push notifications (coming soon)</span>
					</label>
				</div>
			</div>
		</div>

		<CodeBlock
			code={`<script lang="ts">
  import { Checkbox, CheckboxGroup } from '@create-something/components';

  let notifications = $state(['email']);
</script>

<CheckboxGroup
  label="Notification Preferences"
  bind:value={notifications}
  options={[
    { value: 'email', label: 'Email notifications' },
    { value: 'sms', label: 'SMS notifications' },
    { value: 'push', label: 'Push notifications', disabled: true }
  ]}
/>`}
			language="svelte"
		/>
	</div>

	<div class="example-group">
		<h3 class="example-title">Radio Group</h3>
		<p class="example-description">
			For selecting exactly one option from a mutually exclusive set.
		</p>

		<div class="preview">
			<div class="demo-form">
				<fieldset class="demo-radio-group">
					<legend class="demo-legend">Subscription Plan</legend>
					<label class="demo-radio">
						<input type="radio" name="plan" class="demo-radio-input" checked />
						<span class="demo-radio-circle"></span>
						<span class="demo-radio-content">
							<span class="demo-radio-label">Free</span>
							<span class="demo-radio-description">Basic features, limited storage</span>
						</span>
					</label>
					<label class="demo-radio">
						<input type="radio" name="plan" class="demo-radio-input" />
						<span class="demo-radio-circle"></span>
						<span class="demo-radio-content">
							<span class="demo-radio-label">Pro</span>
							<span class="demo-radio-description">All features, unlimited storage</span>
						</span>
					</label>
					<label class="demo-radio">
						<input type="radio" name="plan" class="demo-radio-input" />
						<span class="demo-radio-circle"></span>
						<span class="demo-radio-content">
							<span class="demo-radio-label">Enterprise</span>
							<span class="demo-radio-description">Custom features, dedicated support</span>
						</span>
					</label>
				</fieldset>
			</div>
		</div>

		<CodeBlock
			code={`<RadioGroup
  label="Subscription Plan"
  bind:value={plan}
  options={[
    { value: 'free', label: 'Free', description: 'Basic features' },
    { value: 'pro', label: 'Pro', description: 'All features' },
    { value: 'enterprise', label: 'Enterprise', description: 'Custom' }
  ]}
/>`}
			language="svelte"
		/>
	</div>

	<div class="example-group">
		<h3 class="example-title">Switch</h3>
		<p class="example-description">
			For toggling a setting on or off with immediate effect.
		</p>

		<div class="preview">
			<div class="demo-form">
				<label class="demo-switch-container">
					<span class="demo-switch-label">Dark mode</span>
					<button type="button" class="demo-switch demo-switch-on" role="switch" aria-checked="true">
						<span class="demo-switch-thumb"></span>
					</button>
				</label>
			</div>
		</div>

		<CodeBlock
			code={`<Switch
  bind:checked={darkMode}
  label="Dark mode"
  onchange={(checked) => updateTheme(checked)}
/>`}
			language="svelte"
		/>
	</div>
</section>

<!-- Form Layout Section -->
<section class="section">
	<h2 class="section-title">Form Layout</h2>
	<p class="section-description">
		Layout patterns organize form fields for clarity and flow.
	</p>

	<div class="example-group">
		<h3 class="example-title">Stacked Layout</h3>
		<p class="example-description">
			Default vertical layout. Each field gets full width.
		</p>

		<div class="preview">
			<form class="demo-form-layout">
				<header class="demo-form-header">
					<h2 class="demo-form-title">Contact Information</h2>
					<p class="demo-form-description">We'll use this to get in touch.</p>
				</header>
				<div class="demo-form-content">
					<div class="demo-field">
						<label for="layout-name" class="demo-label">Name</label>
						<input type="text" id="layout-name" class="demo-input" />
					</div>
					<div class="demo-field">
						<label for="layout-email" class="demo-label">Email</label>
						<input type="email" id="layout-email" class="demo-input" />
					</div>
					<div class="demo-field">
						<label for="layout-message" class="demo-label">Message</label>
						<textarea id="layout-message" class="demo-input demo-textarea" rows="3"></textarea>
					</div>
				</div>
				<footer class="demo-form-actions">
					<button type="button" class="demo-btn demo-btn-ghost">Cancel</button>
					<button type="submit" class="demo-btn demo-btn-primary">Submit</button>
				</footer>
			</form>
		</div>

		<CodeBlock
			code={`<FormLayout
  title="Contact Information"
  description="We'll use this to get in touch."
  onsubmit={handleSubmit}
>
  <TextField label="Name" name="name" />
  <TextField label="Email" name="email" type="email" />
  <TextArea label="Message" name="message" rows={3} />

  {#snippet actions()}
    <Button variant="ghost">Cancel</Button>
    <Button type="submit">Submit</Button>
  {/snippet}
</FormLayout>`}
			language="svelte"
		/>
	</div>

	<div class="example-group">
		<h3 class="example-title">Two-Column Layout</h3>
		<p class="example-description">
			For forms with many short fields. Collapses to single column on mobile.
		</p>

		<div class="preview">
			<form class="demo-form-layout">
				<div class="demo-form-content demo-form-two-column">
					<div class="demo-field">
						<label for="col-first" class="demo-label">First Name</label>
						<input type="text" id="col-first" class="demo-input" />
					</div>
					<div class="demo-field">
						<label for="col-last" class="demo-label">Last Name</label>
						<input type="text" id="col-last" class="demo-input" />
					</div>
					<div class="demo-field">
						<label for="col-city" class="demo-label">City</label>
						<input type="text" id="col-city" class="demo-input" />
					</div>
					<div class="demo-field">
						<label for="col-postal" class="demo-label">Postal Code</label>
						<input type="text" id="col-postal" class="demo-input" />
					</div>
				</div>
			</form>
		</div>

		<CodeBlock
			code={`<FormLayout variant="two-column">
  <TextField label="First Name" name="firstName" />
  <TextField label="Last Name" name="lastName" />
  <TextField label="City" name="city" />
  <TextField label="Postal Code" name="postal" />
</FormLayout>`}
			language="svelte"
		/>
	</div>
</section>

<!-- Validation Patterns Section -->
<section class="section">
	<h2 class="section-title">Validation Patterns</h2>
	<p class="section-description">
		Validate early and provide clear, actionable feedback.
	</p>

	<div class="validation-grid">
		<div class="validation-item">
			<h3>Validate on Blur</h3>
			<p>
				Check field validity when the user leaves the field. Don't interrupt while typing.
			</p>
			<CodeBlock
				code={`onblur={(e) => {
  if (!e.currentTarget.validity.valid) {
    error = 'Invalid email';
  } else {
    error = null;
  }
}}`}
				language="typescript"
			/>
		</div>

		<div class="validation-item">
			<h3>Validate on Submit</h3>
			<p>
				Always validate the entire form before submission. Show all errors at once.
			</p>
			<CodeBlock
				code={`onsubmit={(e) => {
  e.preventDefault();
  const errors = validateForm(formData);
  if (Object.keys(errors).length) {
    setErrors(errors);
    return;
  }
  submit(formData);
}}`}
				language="typescript"
			/>
		</div>

		<div class="validation-item">
			<h3>Clear on Fix</h3>
			<p>
				Remove error state as soon as the user corrects the problem.
			</p>
			<CodeBlock
				code={`oninput={(e) => {
  if (error && e.currentTarget.validity.valid) {
    error = null;
  }
}}`}
				language="typescript"
			/>
		</div>
	</div>
</section>

<!-- Multi-Step Forms Section -->
<section class="section">
	<h2 class="section-title">Multi-Step Forms</h2>
	<p class="section-description">
		Break long forms into manageable steps with clear progress indication.
	</p>

	<div class="example-group">
		<h3 class="example-title">Step Indicator</h3>
		<p class="example-description">
			Shows current position and allows navigation to completed steps.
		</p>

		<div class="preview">
			<nav class="demo-steps" aria-label="Form progress">
				<ol class="demo-steps-list">
					<li class="demo-step demo-step-complete">
						<span class="demo-step-indicator">
							<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
								<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
							</svg>
						</span>
						<span class="demo-step-label">Account</span>
					</li>
					<li class="demo-step demo-step-current">
						<span class="demo-step-indicator">2</span>
						<span class="demo-step-label">Profile</span>
					</li>
					<li class="demo-step">
						<span class="demo-step-indicator">3</span>
						<span class="demo-step-label">Preferences</span>
					</li>
					<li class="demo-step">
						<span class="demo-step-indicator">4</span>
						<span class="demo-step-label">Confirm</span>
					</li>
				</ol>
			</nav>
		</div>

		<CodeBlock
			code={`<script lang="ts">
  import { MultiStepForm, FormStep } from '@create-something/components';

  let currentStep = 1;
  const steps = [
    { id: 1, label: 'Account', complete: true },
    { id: 2, label: 'Profile', complete: false },
    { id: 3, label: 'Preferences', complete: false },
    { id: 4, label: 'Confirm', complete: false }
  ];
</script>

<MultiStepForm {steps} bind:currentStep>
  <FormStep step={1}>
    <TextField label="Email" name="email" />
    <TextField label="Password" name="password" type="password" />
  </FormStep>

  <FormStep step={2}>
    <TextField label="Display Name" name="displayName" />
    <TextArea label="Bio" name="bio" />
  </FormStep>

  <!-- ... more steps ... -->
</MultiStepForm>`}
			language="svelte"
		/>
	</div>
</section>

<!-- Accessibility Section -->
<section class="section">
	<h2 class="section-title">Accessibility</h2>
	<p class="section-description">
		Forms must be usable by everyone, including keyboard and screen reader users.
	</p>

	<div class="a11y-grid">
		<div class="a11y-item">
			<h4>Labels</h4>
			<ul>
				<li>Every input needs a visible <code>&lt;label&gt;</code></li>
				<li>Use <code>for</code> attribute to associate label with input</li>
				<li>Don't rely on placeholder as the only label</li>
			</ul>
		</div>

		<div class="a11y-item">
			<h4>Error Messages</h4>
			<ul>
				<li>Use <code>aria-invalid="true"</code> on invalid inputs</li>
				<li>Link errors with <code>aria-describedby</code></li>
				<li>Use <code>role="alert"</code> for dynamic errors</li>
			</ul>
		</div>

		<div class="a11y-item">
			<h4>Required Fields</h4>
			<ul>
				<li>Use <code>aria-required="true"</code></li>
				<li>Visual indicator (asterisk) with hidden label text</li>
				<li>Explain format at form start, not per field</li>
			</ul>
		</div>

		<div class="a11y-item">
			<h4>Focus Management</h4>
			<ul>
				<li>Visible focus indicators (3px solid)</li>
				<li>Focus first error on validation failure</li>
				<li>Announce success after submission</li>
			</ul>
		</div>
	</div>
</section>

<!-- Token Reference -->
<section class="section">
	<h2 class="section-title">Token Reference</h2>
	<p class="section-description">Form patterns use these Canon design tokens.</p>

	<div class="token-table">
		<div class="token-row">
			<code>--color-bg-elevated</code>
			<span>Input background color</span>
		</div>
		<div class="token-row">
			<code>--color-border-default</code>
			<span>Default input border</span>
		</div>
		<div class="token-row">
			<code>--color-border-emphasis</code>
			<span>Hover and focus border</span>
		</div>
		<div class="token-row">
			<code>--color-focus</code>
			<span>Focus ring color (3px solid)</span>
		</div>
		<div class="token-row">
			<code>--color-error</code>
			<span>Error text and border</span>
		</div>
		<div class="token-row">
			<code>--color-error-muted</code>
			<span>Error focus ring background</span>
		</div>
		<div class="token-row">
			<code>--space-xs / --space-sm / --space-md</code>
			<span>Field spacing and padding</span>
		</div>
		<div class="token-row">
			<code>--radius-md</code>
			<span>Input border radius</span>
		</div>
		<div class="token-row">
			<code>--duration-micro</code>
			<span>Border and focus transitions (200ms)</span>
		</div>
	</div>
</section>

<!-- Anti-Patterns Section -->
<section class="section">
	<h2 class="section-title">Anti-Patterns</h2>
	<p class="section-description">Common form mistakes to avoid.</p>

	<div class="anti-patterns">
		<div class="anti-pattern">
			<h4>Placeholder-only Labels</h4>
			<p>
				Placeholders disappear when the user types, leaving no context. Always use visible labels.
			</p>
		</div>

		<div class="anti-pattern">
			<h4>Blocking Validation</h4>
			<p>
				Don't prevent typing while validating. Show errors after blur, not during input.
			</p>
		</div>

		<div class="anti-pattern">
			<h4>Vague Error Messages</h4>
			<p>
				"Invalid input" doesn't help. Be specific: "Password must be at least 8 characters."
			</p>
		</div>

		<div class="anti-pattern">
			<h4>Required Asterisks Only</h4>
			<p>
				Asterisks need explanation. Add "* Required" legend or use <code>aria-required</code>.
			</p>
		</div>

		<div class="anti-pattern">
			<h4>Tiny Touch Targets</h4>
			<p>
				Inputs must be at least 44px tall for mobile. Use <code>min-height: 44px</code>.
			</p>
		</div>

		<div class="anti-pattern">
			<h4>No Loading State</h4>
			<p>
				Show a spinner or disable the submit button during submission to prevent double-submit.
			</p>
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

	/* Problem Grid */
	.problem-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-md);
	}

	.problem-item {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.problem-item h3 {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.problem-item p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: 0;
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

	/* Demo Form Elements */
	.demo-form {
		max-width: 400px;
	}

	.demo-form-horizontal {
		max-width: 100%;
		display: flex;
		gap: var(--space-md);
		flex-wrap: wrap;
	}

	.demo-form-horizontal .demo-field {
		flex: 1;
		min-width: 150px;
	}

	.demo-field {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.demo-label {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-secondary);
	}

	.demo-label-sm {
		font-size: var(--text-caption);
	}

	.demo-label-lg {
		font-size: var(--text-body);
	}

	.demo-required {
		color: var(--color-error);
		margin-left: 2px;
	}

	.demo-input {
		width: 100%;
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
		font-size: var(--text-body);
		font-family: inherit;
		transition: border-color var(--duration-micro) var(--ease-standard),
			box-shadow var(--duration-micro) var(--ease-standard);
		min-height: 44px;
	}

	.demo-input::placeholder {
		color: var(--color-fg-muted);
	}

	.demo-input:hover:not(:focus) {
		border-color: var(--color-border-emphasis);
	}

	.demo-input:focus {
		outline: none;
		border-color: var(--color-border-emphasis);
		box-shadow: 0 0 0 3px var(--color-focus);
	}

	.demo-input-sm {
		padding: var(--space-xs) var(--space-sm);
		font-size: var(--text-body-sm);
		min-height: 36px;
	}

	.demo-input-lg {
		padding: var(--space-md) var(--space-lg);
		font-size: var(--text-body-lg);
		min-height: 52px;
	}

	.demo-input-error {
		border-color: var(--color-error);
	}

	.demo-input-error:focus {
		box-shadow: 0 0 0 3px var(--color-error-muted);
	}

	.demo-textarea {
		resize: vertical;
		min-height: 80px;
	}

	.demo-description {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin: 0;
	}

	.demo-error {
		font-size: var(--text-caption);
		color: var(--color-error);
		margin: 0;
	}

	/* Checkbox Styles */
	.demo-checkbox-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.demo-checkbox {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		cursor: pointer;
	}

	.demo-checkbox-input {
		position: absolute;
		opacity: 0;
		width: 0;
		height: 0;
	}

	.demo-checkbox-box {
		width: 20px;
		height: 20px;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		background: var(--color-bg-elevated);
		transition: all var(--duration-micro) var(--ease-standard);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.demo-checkbox-input:checked + .demo-checkbox-box {
		background: var(--color-fg-primary);
		border-color: var(--color-fg-primary);
	}

	.demo-checkbox-input:checked + .demo-checkbox-box::after {
		content: '';
		width: 5px;
		height: 10px;
		border: solid var(--color-bg-pure);
		border-width: 0 2px 2px 0;
		transform: rotate(45deg);
		margin-bottom: 2px;
	}

	.demo-checkbox-input:focus-visible + .demo-checkbox-box {
		box-shadow: 0 0 0 3px var(--color-focus);
	}

	.demo-checkbox-input:disabled + .demo-checkbox-box {
		opacity: 0.5;
	}

	.demo-checkbox-input:disabled ~ .demo-checkbox-label {
		opacity: 0.5;
	}

	.demo-checkbox-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	/* Radio Styles */
	.demo-radio-group {
		border: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.demo-legend {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-sm);
	}

	.demo-radio {
		display: flex;
		align-items: flex-start;
		gap: var(--space-sm);
		cursor: pointer;
		padding: var(--space-sm);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.demo-radio:hover {
		border-color: var(--color-border-emphasis);
	}

	.demo-radio-input {
		position: absolute;
		opacity: 0;
		width: 0;
		height: 0;
	}

	.demo-radio-circle {
		width: 20px;
		height: 20px;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-full);
		background: var(--color-bg-elevated);
		transition: all var(--duration-micro) var(--ease-standard);
		flex-shrink: 0;
		margin-top: 2px;
	}

	.demo-radio-input:checked + .demo-radio-circle {
		border-color: var(--color-fg-primary);
		border-width: 6px;
	}

	.demo-radio-input:focus-visible + .demo-radio-circle {
		box-shadow: 0 0 0 3px var(--color-focus);
	}

	.demo-radio-content {
		display: flex;
		flex-direction: column;
	}

	.demo-radio-label {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
	}

	.demo-radio-description {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	/* Switch Styles */
	.demo-switch-container {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-md);
	}

	.demo-switch-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.demo-switch {
		width: 44px;
		height: 24px;
		background: var(--color-bg-subtle);
		border: none;
		border-radius: var(--radius-full);
		cursor: pointer;
		position: relative;
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.demo-switch-on {
		background: var(--color-fg-primary);
	}

	.demo-switch-thumb {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 20px;
		height: 20px;
		background: var(--color-bg-pure);
		border-radius: var(--radius-full);
		transition: transform var(--duration-micro) var(--ease-standard);
		box-shadow: var(--shadow-sm);
	}

	.demo-switch-on .demo-switch-thumb {
		transform: translateX(20px);
	}

	/* Form Layout Demo */
	.demo-form-layout {
		max-width: 500px;
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.demo-form-header {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.demo-form-title {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0;
	}

	.demo-form-description {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.demo-form-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.demo-form-two-column {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-md);
	}

	.demo-form-actions {
		display: flex;
		gap: var(--space-sm);
		justify-content: flex-end;
		padding-top: var(--space-md);
		border-top: 1px solid var(--color-border-default);
	}

	.demo-btn {
		padding: var(--space-sm) var(--space-lg);
		font-size: var(--text-body);
		font-weight: var(--font-medium);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
		border: none;
	}

	.demo-btn-primary {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
	}

	.demo-btn-primary:hover {
		opacity: 0.9;
	}

	.demo-btn-ghost {
		background: transparent;
		color: var(--color-fg-secondary);
	}

	.demo-btn-ghost:hover {
		background: var(--color-hover);
		color: var(--color-fg-primary);
	}

	/* Step Indicator */
	.demo-steps {
		width: 100%;
	}

	.demo-steps-list {
		display: flex;
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.demo-step {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xs);
		position: relative;
	}

	.demo-step:not(:last-child)::after {
		content: '';
		position: absolute;
		top: 12px;
		left: 50%;
		width: 100%;
		height: 2px;
		background: var(--color-border-default);
	}

	.demo-step-complete::after {
		background: var(--color-fg-primary);
	}

	.demo-step-indicator {
		width: 24px;
		height: 24px;
		border-radius: var(--radius-full);
		background: var(--color-bg-subtle);
		border: 2px solid var(--color-border-default);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--text-caption);
		font-weight: var(--font-semibold);
		color: var(--color-fg-muted);
		position: relative;
		z-index: 1;
	}

	.demo-step-complete .demo-step-indicator {
		background: var(--color-fg-primary);
		border-color: var(--color-fg-primary);
		color: var(--color-bg-pure);
	}

	.demo-step-current .demo-step-indicator {
		border-color: var(--color-fg-primary);
		color: var(--color-fg-primary);
	}

	.demo-step-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.demo-step-current .demo-step-label {
		color: var(--color-fg-primary);
		font-weight: var(--font-medium);
	}

	/* Validation Grid */
	.validation-grid {
		display: grid;
		gap: var(--space-lg);
	}

	.validation-item {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.validation-item h3 {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.validation-item p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-md);
	}

	/* Accessibility Grid */
	.a11y-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: var(--space-md);
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

	/* Anti-Patterns */
	.anti-patterns {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: var(--space-md);
	}

	.anti-pattern {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-error-border);
		border-radius: var(--radius-lg);
	}

	.anti-pattern h4 {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-error);
		margin-bottom: var(--space-xs);
	}

	.anti-pattern p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	/* Reduced motion support */
	@media (prefers-reduced-motion: reduce) {
		.demo-input,
		.demo-checkbox-box,
		.demo-radio-circle,
		.demo-radio,
		.demo-switch,
		.demo-switch-thumb,
		.demo-btn {
			transition: none;
		}
	}
</style>
