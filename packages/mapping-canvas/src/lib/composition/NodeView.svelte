<script lang="ts">
  import Button from '../../../../canon/src/lib/components/Button.svelte';
  import TextField from '../../../../canon/src/lib/components/form/TextField.svelte';
  import TextArea from '../../../../canon/src/lib/components/form/TextArea.svelte';
  import Alert from '../../../../canon/src/lib/components/feedback/Alert.svelte';
  import NodeView from './NodeView.svelte';
  import type { Resolved, Content, Values, State } from './model';
  let {
    node,
    content,
    values = $bindable(),
    errors,
    state,
    prefix = 'live'
  }: {
    node: Resolved;
    content: Content;
    values: Values;
    errors: Values;
    state: State;
    prefix?: string;
  } = $props();
</script>

<div
  class:empty={node.kind === 'component' &&
    node.ref === 'component.feedback-alert' &&
    state === 'empty'}
  data-instance-id={node.instanceId}
  class:stack={node.kind === 'stack'}
  class:large={node.kind === 'stack' && node.gap === 'lg'}
>
  {#if node.kind === 'stack'}
    {#each node.children as child (child.instanceId)}<NodeView
        node={child}
        {content}
        bind:values
        {errors}
        {state}
        {prefix}
      />{/each}
  {:else if node.kind === 'copy'}
    <p class="eyebrow">CREATE SOMETHING / REQUEST</p>
    <h2>{content.title}</h2>
    <p class="description">{content.description}</p>
  {:else if node.kind === 'component'}
    {#if node.ref === 'component.form-text-field'}
      <TextField
        id={`${prefix}-${encodeURIComponent(node.instanceId)}`}
        label={node.props.label}
        bind:value={values.name}
        required
        error={errors.name || null}
        autocomplete="off"
      />
    {:else if node.ref === 'component.form-text-area'}
      <TextArea
        id={`${prefix}-${encodeURIComponent(node.instanceId)}`}
        label={node.props.label}
        bind:value={values.brief}
        required
        error={errors.brief || null}
        rows={3}
        resize="none"
      />
    {:else if node.ref === 'component.button'}
      <Button variant={content.variant} type="submit"
        >{state === 'error' ? 'Try again' : content.buttonLabel}</Button
      >
    {:else if node.ref === 'component.feedback-alert' && state !== 'empty'}
      <Alert
        variant={state === 'recovered' ? 'success' : 'error'}
        title={state === 'recovered'
          ? 'Ready to continue'
          : state === 'invalid'
            ? 'A little more detail'
            : 'Your request is still here'}
      >
        {state === 'recovered'
          ? 'Local demo complete. Your details have been retained.'
          : state === 'invalid'
            ? 'Complete the highlighted fields, then review again.'
            : 'The simulated service failed. Your details are safe. Try again.'}
      </Alert>
    {/if}
  {/if}
</div>

<style>
  .stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-performance-sm);
  }
  .stack.large {
    gap: var(--space-performance-md);
  }
  .empty {
    display: none;
  }
  .eyebrow {
    font-family: var(--font-performance-mono);
    font-size: 11px;
    letter-spacing: 0.09em;
    margin: 0 0 14px;
    color: var(--color-performance-muted);
  }
  h2 {
    font-family: var(--font-performance-sans);
    font-size: 32px;
    line-height: 1.12;
    letter-spacing: -0.035em;
    margin: 0;
    max-width: 18ch;
    font-weight: 600;
  }
  .description {
    font-size: 15px;
    line-height: 1.55;
    margin: 14px 0 0;
    max-width: 45ch;
    color: var(--color-performance-muted);
  }
</style>
