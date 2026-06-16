<script lang="ts" module>
  let bodyLockCount = 0;
  let previousBodyOverflow = '';
  let previousBodyPaddingRight = '';

  function lockBodyScroll() {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    if (bodyLockCount === 0) {
      previousBodyOverflow = document.body.style.overflow;
      previousBodyPaddingRight = document.body.style.paddingRight;

      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
    }

    bodyLockCount += 1;
  }

  function unlockBodyScroll() {
    if (typeof document === 'undefined') return;

    bodyLockCount = Math.max(0, bodyLockCount - 1);
    if (bodyLockCount === 0) {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.paddingRight = previousBodyPaddingRight;
    }
  }

  // Shared across all Dialog instances so nested modals restore focus correctly.
  // Each open dialog pushes the element that had focus; closing restores it, or —
  // when that element has been unmounted (e.g. a parent modal closed underneath
  // a confirm dialog) — falls back to the deepest still-connected entry.
  const focusReturnStack: HTMLElement[] = [];

  function pushFocusReturn(el: HTMLElement | null) {
    if (el) focusReturnStack.push(el);
  }

  function popFocusReturn(el: HTMLElement | null) {
    if (el) {
      const idx = focusReturnStack.lastIndexOf(el);
      if (idx !== -1) focusReturnStack.splice(idx, 1);
    }

    if (el?.isConnected) {
      el.focus();
      return;
    }

    for (let i = focusReturnStack.length - 1; i >= 0; i--) {
      if (focusReturnStack[i].isConnected) {
        focusReturnStack[i].focus();
        return;
      }
    }
  }
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { tick } from 'svelte';
  import { X } from 'lucide-svelte';

  interface Props {
    isOpen: boolean;
    onClose: () => void;
    beforeClose?: () => boolean | Promise<boolean>;
    title?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    placement?: 'center' | 'bottom-right';
    closeOnBackdrop?: boolean;
    closeOnEscape?: boolean;
    contentPadding?: 'default' | 'none';
    children: Snippet;
  }

  let {
    isOpen,
    onClose,
    beforeClose,
    title,
    size = 'md',
    placement = 'center',
    closeOnBackdrop = true,
    closeOnEscape = true,
    contentPadding = 'default',
    children
  }: Props = $props();
  let dialogElement = $state<HTMLDivElement | null>(null);
  let lastFocusedElement = $state<HTMLElement | null>(null);
  let isRequestingClose = $state(false);

  const focusableSelector =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  async function requestClose() {
    if (isRequestingClose) return;

    isRequestingClose = true;
    try {
      const canClose = beforeClose ? await beforeClose() : true;
      if (canClose) {
        onClose();
      }
    } finally {
      isRequestingClose = false;
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      void requestClose();
    }
  }

  function getFocusableElements(): HTMLElement[] {
    if (!dialogElement) return [];
    return Array.from(dialogElement.querySelectorAll<HTMLElement>(focusableSelector)).filter(
      (el) => !el.hasAttribute('disabled') && el.tabIndex !== -1
    );
  }

  function trapFocus(event: KeyboardEvent) {
    const focusable = getFocusableElements();
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const current = document.activeElement as HTMLElement | null;

    if (event.shiftKey && current === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && current === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (closeOnEscape && e.key === 'Escape') {
      void requestClose();
      return;
    }

    if (e.key === 'Tab') {
      trapFocus(e);
    }
  }

  $effect(() => {
    if (!isOpen || typeof document === 'undefined') return;

    lastFocusedElement = document.activeElement as HTMLElement | null;
    pushFocusReturn(lastFocusedElement);
    lockBodyScroll();

    void tick().then(() => {
      const focusable = getFocusableElements();
      if (focusable.length > 0) {
        focusable[0].focus();
        return;
      }
      dialogElement?.focus();
    });

    return () => {
      unlockBodyScroll();
      popFocusReturn(lastFocusedElement);
    };
  });
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="backdrop {placement}" onclick={handleBackdropClick} onkeydown={handleKeydown}>
    <div
      class="dialog {size}"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'dialog-title' : undefined}
      tabindex="-1"
      bind:this={dialogElement}
    >
      {#if title}
        <div class="dialog-header">
          <h2 id="dialog-title" class="dialog-title">{title}</h2>
          <button class="close-button" onclick={requestClose} aria-label="Close dialog">
            <X size={20} />
          </button>
        </div>
      {:else}
        <button class="close-button standalone" onclick={requestClose} aria-label="Close dialog">
          <X size={20} />
        </button>
      {/if}

      <div class="dialog-content" class:unpadded={contentPadding === 'none'}>
        {@render children()}
      </div>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: var(--color-overlay-heavy);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-md);
    z-index: 1000;
    animation: fadeIn var(--duration-micro) var(--ease-standard);
  }

  .backdrop.bottom-right {
    align-items: flex-end;
    justify-content: flex-end;
    padding: var(--space-md) var(--space-lg) 5rem;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .dialog {
    position: relative;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-2xl);
    max-height: calc(100vh - var(--space-xl));
    overflow-y: auto;
    animation: slideIn var(--duration-standard) var(--ease-standard);
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .dialog.sm {
    width: 100%;
    max-width: 24rem;
  }

  .dialog.md {
    width: 100%;
    max-width: 32rem;
  }

  .dialog.lg {
    width: 100%;
    max-width: 48rem;
  }

  .dialog.xl {
    width: 100%;
    max-width: 64rem;
  }

  .backdrop.bottom-right .dialog {
    width: 22.5rem;
    max-width: calc(100vw - 3rem);
    max-height: calc(100vh - 6.5rem);
  }

  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-md);
    border-bottom: 1px solid var(--color-border-default);
    position: sticky;
    top: 0;
    background: var(--color-bg-surface);
    z-index: 1;
  }

  .dialog-title {
    font-size: var(--text-h3);
    font-weight: var(--font-semibold);
    color: var(--color-fg-primary);
    margin: 0;
  }

  .close-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    border-radius: var(--radius-md);
    color: var(--color-fg-secondary);
    cursor: pointer;
    transition: all var(--duration-micro) var(--ease-standard);
  }

  .close-button:hover {
    background: var(--color-hover);
    color: var(--color-fg-primary);
  }

  .close-button.standalone {
    position: absolute;
    top: var(--space-sm);
    right: var(--space-sm);
  }

  .dialog-content {
    padding: var(--space-md);
  }

  .dialog-content.unpadded {
    padding: 0;
  }

  @media (max-width: 640px) {
    .backdrop.bottom-right {
      align-items: flex-end;
      padding: var(--space-md);
    }

    .backdrop.bottom-right .dialog {
      width: 100%;
      max-width: none;
      max-height: calc(100vh - var(--space-xl));
    }
  }
</style>
