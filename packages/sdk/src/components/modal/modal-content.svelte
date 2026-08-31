<script context="module" lang="ts">
  let bodyScrollLockCount = 0;
  let originalBodyOverflow = '';

  function lockBodyScroll(): void {
    if (bodyScrollLockCount === 0) originalBodyOverflow = document.body.style.overflow;
    bodyScrollLockCount += 1;
    document.body.style.overflow = 'hidden';
  }

  function unlockBodyScroll(): void {
    bodyScrollLockCount = Math.max(0, bodyScrollLockCount - 1);
    if (bodyScrollLockCount === 0) document.body.style.overflow = originalBodyOverflow;
  }
</script>

<script lang="ts">
  import { getContext, onMount, onDestroy } from 'svelte';
  import type { Writable } from 'svelte/store';

  const { open, close } = getContext<{ open: Writable<boolean>; close: () => void }>('modal');

  export let onContentReady: ((element: Element) => void) | undefined = undefined;

  let portalTarget: HTMLElement;
  let overlayElement: HTMLDivElement;
  let contentElement: HTMLDivElement;
  let closeButtonElement: HTMLButtonElement;
  let previouslyFocusedElement: HTMLElement | undefined;
  let bodyScrollLocked = false;

  onMount(() => {
    // Create portal target outside shadow DOM
    portalTarget = document.createElement('div');
    portalTarget.setAttribute('data-reservine-modal-portal', 'true');
    document.body.appendChild(portalTarget);

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && $open) {
        close();
      }
    };

    const handleFocusIn = (event: FocusEvent) => {
      if ($open && contentElement?.isConnected && !contentElement.contains(event.target as Node)) {
        closeButtonElement.focus();
      }
    };

    window.addEventListener('keydown', handleEscape);
    document.addEventListener('focusin', handleFocusIn);

    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.removeEventListener('focusin', handleFocusIn);
      if (portalTarget && portalTarget.parentNode) {
        portalTarget.parentNode.removeChild(portalTarget);
      }
    };
  });

  $: if (portalTarget) {
    if ($open) {
      const isOpening = !contentElement?.isConnected;
      if (isOpening) {
        previouslyFocusedElement = document.activeElement instanceof HTMLElement
          ? document.activeElement
          : undefined;
      }
      // Create overlay
      if (!overlayElement) {
        overlayElement = document.createElement('div');
        overlayElement.className = 'r-modal-overlay';
        overlayElement.setAttribute('data-reservine-modal-overlay', '');
        overlayElement.addEventListener('click', close);
      }

      // Create close button
      if (!closeButtonElement) {
        closeButtonElement = document.createElement('button');
        closeButtonElement.className = 'r-modal-close';
        closeButtonElement.setAttribute('aria-label', 'Close modal');
        closeButtonElement.setAttribute('data-reservine-modal-close', '');
        closeButtonElement.innerHTML = `
          <svg style="width:24px; height:24px;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        `;
        closeButtonElement.addEventListener('click', close);
      }

      // Create content container
      if (!contentElement) {
        contentElement = document.createElement('div');
        contentElement.className = 'r-modal-content';
        contentElement.setAttribute('aria-label', 'Reservine booking');
        contentElement.setAttribute('aria-modal', 'true');
        contentElement.setAttribute('data-reservine-modal-content', '');
        contentElement.setAttribute('role', 'dialog');
        contentElement.innerHTML = `<div class="r-modal-slot-content"></div>`;
      }

      // Append close button first, then content (so close button appears above)
      contentElement.appendChild(closeButtonElement);

      portalTarget.appendChild(overlayElement);
      portalTarget.appendChild(contentElement);
      const slotContent = contentElement.querySelector('.r-modal-slot-content');
      if (slotContent) onContentReady?.(slotContent);
      if (isOpening) queueMicrotask(() => closeButtonElement.focus());

      // Prevent body scroll when modal is open
      if (!bodyScrollLocked) {
        lockBodyScroll();
        bodyScrollLocked = true;
      }
    } else {
      // Clean up
      if (overlayElement && overlayElement.parentNode) {
        overlayElement.parentNode.removeChild(overlayElement);
      }
      if (closeButtonElement && closeButtonElement.parentNode) {
        closeButtonElement.parentNode.removeChild(closeButtonElement);
      }
      if (contentElement && contentElement.parentNode) {
        contentElement.parentNode.removeChild(contentElement);
      }
      if (bodyScrollLocked) {
        unlockBodyScroll();
        bodyScrollLocked = false;
      }
      previouslyFocusedElement?.focus();
      previouslyFocusedElement = undefined;
    }
  }

  onDestroy(() => {
    if (overlayElement) {
      overlayElement.removeEventListener('click', close);
    }
    if (closeButtonElement) {
      closeButtonElement.removeEventListener('click', close);
    }
    if (bodyScrollLocked) unlockBodyScroll();
  });

  export function getContentElement() {
    return contentElement?.querySelector('.r-modal-slot-content');
  }
</script>
