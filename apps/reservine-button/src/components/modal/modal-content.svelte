<script lang="ts">
  import { getContext, onMount, onDestroy } from 'svelte';
  import type { Writable } from 'svelte/store';

  const { open, close } = getContext<{ open: Writable<boolean>; close: () => void }>('modal');

  let portalTarget: HTMLElement;
  let overlayElement: HTMLDivElement;
  let contentElement: HTMLDivElement;
  let closeButtonElement: HTMLButtonElement;

  // The modal scroll-locks the HOST page's <body>. Snapshot the exact inline
  // declaration (value + priority) so we can put it back byte-for-byte instead of
  // blanking a value the host page set itself.
  let previousBodyOverflow: { value: string; priority: string } | null = null;

  const lockBodyScroll = () => {
    if (previousBodyOverflow !== null) return;
    previousBodyOverflow = {
      value: document.body.style.getPropertyValue('overflow'),
      priority: document.body.style.getPropertyPriority('overflow'),
    };
    document.body.style.setProperty('overflow', 'hidden');
  };

  const unlockBodyScroll = () => {
    if (previousBodyOverflow === null) return;
    const { value, priority } = previousBodyOverflow;
    previousBodyOverflow = null;

    if (value) {
      document.body.style.setProperty('overflow', value, priority);
    } else {
      document.body.style.removeProperty('overflow');
    }
  };

  onMount(() => {
    // Create portal target outside shadow DOM
    portalTarget = document.createElement('div');
    portalTarget.setAttribute('data-reservine-modal-portal', 'true');
    // `display: contents` keeps this container out of the host page's layout.
    // It lives in <body> for the whole lifetime of the widget, and as a plain
    // block it would be a stray flex/grid item (and an extra `gap`) on any host
    // whose <body> is a flex or grid container. Its children are all
    // position: fixed, so they are unaffected.
    portalTarget.style.display = 'contents';
    document.body.appendChild(portalTarget);

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && $open) {
        close();
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('keydown', handleEscape);
      if (portalTarget && portalTarget.parentNode) {
        portalTarget.parentNode.removeChild(portalTarget);
      }
    };
  });

  $: if (portalTarget) {
    if ($open) {
      // Create overlay
      if (!overlayElement) {
        overlayElement = document.createElement('div');
        overlayElement.className = 'r-modal-overlay';
        overlayElement.addEventListener('click', close);
      }

      // Create close button
      if (!closeButtonElement) {
        closeButtonElement = document.createElement('button');
        closeButtonElement.className = 'r-modal-close';
        closeButtonElement.setAttribute('aria-label', 'Close modal');
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
        contentElement.innerHTML = `<div class="r-modal-slot-content"></div>`;
      }

      // Append close button first, then content (so close button appears above)
      contentElement.appendChild(closeButtonElement);

      portalTarget.appendChild(overlayElement);
      portalTarget.appendChild(contentElement);

      // Prevent body scroll when modal is open
      lockBodyScroll();
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
      unlockBodyScroll();
    }
  }

  onDestroy(() => {
    if (overlayElement) {
      overlayElement.removeEventListener('click', close);
    }
    if (closeButtonElement) {
      closeButtonElement.removeEventListener('click', close);
    }
    unlockBodyScroll();
  });

  export function getContentElement() {
    return contentElement?.querySelector('.r-modal-slot-content');
  }
</script>
